/**
 * Developer Agent Worker
 * Real deployment and testing operations - NO MOCK DATA
 */

import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as k8s from '@kubernetes/client-node';
import { prisma } from '../../../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../../../infrastructure/websocket/server.js';
import { createLogger } from '../../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('DeveloperWorker');

export class DeveloperWorker {
  private kc: k8s.KubeConfig;
  private k8sAppsApi: k8s.AppsV1Api;
  private k8sCoreApi: k8s.CoreV1Api;

  constructor(private websocket?: WebSocketServer) {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.k8sCoreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Main worker process handler
   */
  async process(job: Job): Promise<any> {
    const { executionId, taskType, taskParams } = job.data;

    await this.log(executionId, `Starting developer task: ${taskType}`);
    logger.info('Processing developer task', { executionId, taskType, jobId: job.id });

    try {
      switch (taskType) {
        case 'deploy_application':
          return await this.deployApplication(job);
        case 'run_tests':
          return await this.runTests(job);
        case 'build_container':
          return await this.buildContainer(job);
        case 'rollback_deployment':
          return await this.rollbackDeployment(job);
        case 'scale_deployment':
          return await this.scaleDeployment(job);
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }
    } catch (error: any) {
      await this.log(executionId, `Task failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Deploy application to Kubernetes
   */
  private async deployApplication(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const {
      application,
      version,
      environment,
      namespace = 'default',
      imageUri,
      replicas = 2,
      containerPort = 8080,
      strategy = 'rolling',
    } = taskParams;

    if (!application || !version || !imageUri) {
      throw new Error('application, version, and imageUri are required');
    }

    job.updateProgress(10);
    await this.log(executionId, `Deploying ${application}:${version} to ${environment}`);

    const deploymentName = `${application}-${environment}`;

    try {
      // Create deployment manifest
      const deployment: k8s.V1Deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: deploymentName,
          namespace,
          labels: {
            app: application,
            version,
            environment,
            'managed-by': 'catalyst-platform',
          },
        },
        spec: {
          replicas,
          strategy:
            strategy === 'rolling'
              ? {
                  type: 'RollingUpdate',
                  rollingUpdate: {
                    maxSurge: 1,
                    maxUnavailable: 0,
                  },
                }
              : { type: 'Recreate' },
          selector: {
            matchLabels: {
              app: application,
              environment,
            },
          },
          template: {
            metadata: {
              labels: {
                app: application,
                version,
                environment,
              },
            },
            spec: {
              containers: [
                {
                  name: application,
                  image: imageUri,
                  ports: [{ containerPort }],
                  resources: {
                    requests: {
                      cpu: '100m',
                      memory: '128Mi',
                    },
                    limits: {
                      cpu: '500m',
                      memory: '512Mi',
                    },
                  },
                  livenessProbe: {
                    httpGet: {
                      path: '/health',
                      port: containerPort,
                    },
                    initialDelaySeconds: 30,
                    periodSeconds: 10,
                  },
                  readinessProbe: {
                    httpGet: {
                      path: '/ready',
                      port: containerPort,
                    },
                    initialDelaySeconds: 10,
                    periodSeconds: 5,
                  },
                },
              ],
            },
          },
        },
      };

      job.updateProgress(30);
      await this.log(executionId, 'Creating Kubernetes deployment...');

      // Check if deployment exists
      let deploymentExists = false;
      try {
        await this.k8sAppsApi.readNamespacedDeployment(deploymentName, namespace);
        deploymentExists = true;
      } catch (error: any) {
        if (error.response?.statusCode !== 404) {
          throw error;
        }
      }

      let k8sDeployment: any;
      if (deploymentExists) {
        // Update existing deployment
        await this.log(executionId, 'Updating existing deployment...');
        const response = await this.k8sAppsApi.replaceNamespacedDeployment(
          deploymentName,
          namespace,
          deployment
        );
        k8sDeployment = response.body;
      } else {
        // Create new deployment
        await this.log(executionId, 'Creating new deployment...');
        const response = await this.k8sAppsApi.createNamespacedDeployment(namespace, deployment);
        k8sDeployment = response.body;
      }

      job.updateProgress(60);

      // Store deployment in database
      const dbDeployment = await prisma.deployment.create({
        data: {
          name: deploymentName,
          application,
          version,
          environment: environment as any,
          cloud: 'aws',
          clusterArn: 'local-cluster',
          namespace,
          status: 'deploying',
          strategy: strategy as any,
          replicas,
          k8sDeploymentName: deploymentName,
          k8sDeploymentUid: k8sDeployment.metadata?.uid,
          imageRegistry: imageUri,
          containerPort,
        },
      });

      // Wait for deployment to be ready
      await this.log(executionId, 'Waiting for deployment to be ready...');
      job.updateProgress(80);

      const isReady = await this.waitForDeploymentReady(deploymentName, namespace, 300);

      if (isReady) {
        await prisma.deployment.update({
          where: { id: dbDeployment.id },
          data: {
            status: 'running',
            completedAt: new Date(),
          },
        });
        await this.log(executionId, 'Deployment completed successfully');
      } else {
        await prisma.deployment.update({
          where: { id: dbDeployment.id },
          data: {
            status: 'failed',
            statusMessage: 'Deployment did not become ready within timeout',
          },
        });
        throw new Error('Deployment did not become ready within timeout');
      }

      job.updateProgress(100);

      return {
        deploymentId: dbDeployment.id,
        deploymentName,
        namespace,
        status: 'running',
        replicas,
      };
    } catch (error: any) {
      await this.log(executionId, `Deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Run automated tests
   */
  private async runTests(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, testType = 'unit', testCommand } = taskParams;

    if (!projectPath) {
      throw new Error('projectPath is required for running tests');
    }

    job.updateProgress(10);
    await this.log(executionId, `Running ${testType} tests in: ${projectPath}`);

    try {
      let command = testCommand;

      if (!command) {
        switch (testType) {
          case 'unit':
            command = 'npm test';
            break;
          case 'integration':
            command = 'npm run test:integration';
            break;
          case 'e2e':
            command = 'npm run test:e2e';
            break;
          default:
            throw new Error(`Unknown test type: ${testType}`);
        }
      }

      job.updateProgress(30);
      await this.log(executionId, `Executing: ${command}`);

      const { stdout, stderr } = await execAsync(`cd "${projectPath}" && ${command}`, {
        maxBuffer: 10 * 1024 * 1024,
      });

      job.updateProgress(90);

      // Parse test results (assuming Jest/Mocha format)
      const output = stdout + stderr;
      const passed = output.match(/(\d+) passing/)?.[1] || '0';
      const failed = output.match(/(\d+) failing/)?.[1] || '0';

      job.updateProgress(100);
      await this.log(executionId, `Tests completed. Passed: ${passed}, Failed: ${failed}`);

      return {
        testType,
        projectPath,
        passed: parseInt(passed),
        failed: parseInt(failed),
        output: output.substring(0, 5000), // First 5000 chars
      };
    } catch (error: any) {
      // Tests can fail with non-zero exit code
      const output = (error.stdout || '') + (error.stderr || '');
      const passed = output.match(/(\d+) passing/)?.[1] || '0';
      const failed = output.match(/(\d+) failing/)?.[1] || '0';

      await this.log(executionId, `Tests completed with failures. Passed: ${passed}, Failed: ${failed}`);

      return {
        testType,
        projectPath,
        passed: parseInt(passed),
        failed: parseInt(failed),
        output: output.substring(0, 5000),
      };
    }
  }

  /**
   * Build container image
   */
  private async buildContainer(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, imageName, imageTag = 'latest', dockerfile = 'Dockerfile' } = taskParams;

    if (!projectPath || !imageName) {
      throw new Error('projectPath and imageName are required');
    }

    job.updateProgress(10);
    await this.log(executionId, `Building container image: ${imageName}:${imageTag}`);

    try {
      const fullImageName = `${imageName}:${imageTag}`;

      job.updateProgress(20);
      await this.log(executionId, `Building from ${dockerfile}...`);

      const { stdout, stderr } = await execAsync(
        `cd "${projectPath}" && docker build -t ${fullImageName} -f ${dockerfile} .`,
        { maxBuffer: 50 * 1024 * 1024 }
      );

      job.updateProgress(80);
      await this.log(executionId, 'Image built successfully');

      // Get image ID
      const { stdout: imageId } = await execAsync(`docker images -q ${fullImageName}`);

      job.updateProgress(100);
      await this.log(executionId, `Container image ready: ${fullImageName}`);

      return {
        imageName,
        imageTag,
        fullImageName,
        imageId: imageId.trim(),
        buildLog: (stdout + stderr).substring(0, 5000),
      };
    } catch (error: any) {
      await this.log(executionId, `Build failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Rollback deployment to previous version
   */
  private async rollbackDeployment(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { deploymentId, revision } = taskParams;

    if (!deploymentId) {
      throw new Error('deploymentId is required for rollback');
    }

    job.updateProgress(10);
    await this.log(executionId, `Rolling back deployment: ${deploymentId}`);

    try {
      // Get deployment from database
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
      });

      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      job.updateProgress(30);
      await this.log(executionId, `Rolling back ${deployment.k8sDeploymentName}...`);

      // Execute kubectl rollout undo
      const revisionFlag = revision ? `--to-revision=${revision}` : '';
      const { stdout } = await execAsync(
        `kubectl rollout undo deployment/${deployment.k8sDeploymentName} -n ${deployment.namespace} ${revisionFlag}`
      );

      job.updateProgress(60);
      await this.log(executionId, 'Waiting for rollback to complete...');

      // Wait for rollback to complete
      await execAsync(
        `kubectl rollout status deployment/${deployment.k8sDeploymentName} -n ${deployment.namespace} --timeout=300s`
      );

      // Update database
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'rolled_back',
          statusMessage: revision ? `Rolled back to revision ${revision}` : 'Rolled back to previous version',
        },
      });

      job.updateProgress(100);
      await this.log(executionId, 'Rollback completed successfully');

      return {
        deploymentId,
        deploymentName: deployment.k8sDeploymentName,
        status: 'rolled_back',
        message: stdout,
      };
    } catch (error: any) {
      await this.log(executionId, `Rollback failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Scale deployment replicas
   */
  private async scaleDeployment(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { deploymentId, replicas } = taskParams;

    if (!deploymentId || replicas === undefined) {
      throw new Error('deploymentId and replicas are required');
    }

    job.updateProgress(10);
    await this.log(executionId, `Scaling deployment to ${replicas} replicas`);

    try {
      // Get deployment from database
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
      });

      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      job.updateProgress(30);

      // Scale using kubectl
      await execAsync(
        `kubectl scale deployment/${deployment.k8sDeploymentName} -n ${deployment.namespace} --replicas=${replicas}`
      );

      job.updateProgress(60);
      await this.log(executionId, 'Waiting for scaling to complete...');

      // Wait for deployment to stabilize
      await this.waitForDeploymentReady(deployment.k8sDeploymentName, deployment.namespace, 180);

      // Update database
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          replicas,
          statusMessage: `Scaled to ${replicas} replicas`,
        },
      });

      job.updateProgress(100);
      await this.log(executionId, `Scaling completed. Now running ${replicas} replicas`);

      return {
        deploymentId,
        deploymentName: deployment.k8sDeploymentName,
        replicas,
        status: 'running',
      };
    } catch (error: any) {
      await this.log(executionId, `Scaling failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  // Helper methods

  private async waitForDeploymentReady(
    deploymentName: string,
    namespace: string,
    timeoutSeconds: number
  ): Promise<boolean> {
    const startTime = Date.now();
    const timeout = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.k8sAppsApi.readNamespacedDeployment(deploymentName, namespace);
        const deployment = response.body;

        const status = deployment.status;
        if (
          status?.availableReplicas === status?.replicas &&
          status?.readyReplicas === status?.replicas &&
          status?.updatedReplicas === status?.replicas
        ) {
          return true;
        }
      } catch (error) {
        logger.debug('Error checking deployment status', { error });
      }

      // Wait 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return false;
  }

  private async log(executionId: string, message: string, level: string = 'INFO'): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    // Update database logs
    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        logs: {
          push: logEntry,
        },
      },
    });

    // Send to WebSocket
    if (this.websocket) {
      this.websocket.emit(`execution:${executionId}`, 'log', {
        timestamp,
        level,
        message,
      });
    }

    logger.info(message, { executionId, level });
  }
}

export default DeveloperWorker;
