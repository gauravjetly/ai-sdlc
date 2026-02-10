/**
 * Kubernetes Client Wrapper
 * Real K8s API interactions - NO MOCK DATA
 */

import * as k8s from '@kubernetes/client-node';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('K8sClient');

export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private batchApi: k8s.BatchV1Api;

  constructor(clusterArn?: string) {
    this.kc = new k8s.KubeConfig();

    // Load config from default location or AWS EKS
    if (clusterArn && clusterArn.includes('eks')) {
      // For EKS clusters, use AWS credentials
      this.loadEKSConfig(clusterArn);
    } else {
      // Load from kubeconfig file
      this.kc.loadFromDefault();
    }

    // Initialize API clients
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);

    logger.info('Kubernetes client initialized', {
      currentContext: this.kc.getCurrentContext(),
    });
  }

  private loadEKSConfig(clusterArn: string): void {
    // For EKS, we'll need to get cluster info from AWS and configure
    // This is a placeholder - full implementation would use AWS SDK
    try {
      this.kc.loadFromDefault();
      logger.info('Loaded kubeconfig from default location');
    } catch (error) {
      logger.error('Failed to load kubeconfig', { error });
      throw error;
    }
  }

  /**
   * Create a deployment in Kubernetes
   */
  async createDeployment(
    namespace: string,
    deployment: k8s.V1Deployment
  ): Promise<k8s.V1Deployment> {
    try {
      logger.info('Creating deployment', {
        name: deployment.metadata?.name,
        namespace,
      });

      const response = await this.appsApi.createNamespacedDeployment(
        namespace,
        deployment
      );

      logger.info('Deployment created successfully', {
        name: response.body.metadata?.name,
        uid: response.body.metadata?.uid,
      });

      return response.body;
    } catch (error: any) {
      logger.error('Failed to create deployment', {
        error: error.message,
        namespace,
        deployment: deployment.metadata?.name,
      });
      throw new Error(`K8s deployment failed: ${error.message}`);
    }
  }

  /**
   * Get deployment status
   */
  async getDeployment(
    namespace: string,
    name: string
  ): Promise<k8s.V1Deployment> {
    try {
      const response = await this.appsApi.readNamespacedDeployment(name, namespace);
      return response.body;
    } catch (error: any) {
      logger.error('Failed to get deployment', {
        error: error.message,
        namespace,
        name,
      });
      throw new Error(`Failed to get deployment: ${error.message}`);
    }
  }

  /**
   * Update deployment (for scaling, rolling updates)
   */
  async updateDeployment(
    namespace: string,
    name: string,
    deployment: k8s.V1Deployment
  ): Promise<k8s.V1Deployment> {
    try {
      const response = await this.appsApi.replaceNamespacedDeployment(
        name,
        namespace,
        deployment
      );
      return response.body;
    } catch (error: any) {
      logger.error('Failed to update deployment', {
        error: error.message,
        namespace,
        name,
      });
      throw new Error(`Failed to update deployment: ${error.message}`);
    }
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(namespace: string, name: string): Promise<void> {
    try {
      await this.appsApi.deleteNamespacedDeployment(name, namespace);
      logger.info('Deployment deleted', { namespace, name });
    } catch (error: any) {
      logger.error('Failed to delete deployment', {
        error: error.message,
        namespace,
        name,
      });
      throw new Error(`Failed to delete deployment: ${error.message}`);
    }
  }

  /**
   * Scale deployment
   */
  async scaleDeployment(
    namespace: string,
    name: string,
    replicas: number
  ): Promise<void> {
    try {
      const deployment = await this.getDeployment(namespace, name);
      if (deployment.spec) {
        deployment.spec.replicas = replicas;
        await this.updateDeployment(namespace, name, deployment);
        logger.info('Deployment scaled', { namespace, name, replicas });
      }
    } catch (error: any) {
      logger.error('Failed to scale deployment', {
        error: error.message,
        namespace,
        name,
        replicas,
      });
      throw new Error(`Failed to scale deployment: ${error.message}`);
    }
  }

  /**
   * Get pod logs for a deployment
   */
  async getPodLogs(
    namespace: string,
    podName: string,
    containerName?: string
  ): Promise<string> {
    try {
      const response = await this.k8sApi.readNamespacedPodLog(
        podName,
        namespace,
        containerName,
        false, // follow
        undefined, // insecureSkipTLSVerifyBackend
        undefined, // limitBytes
        undefined, // pretty
        undefined, // previous
        undefined, // sinceSeconds
        100 // tailLines
      );
      return response.body;
    } catch (error: any) {
      logger.error('Failed to get pod logs', {
        error: error.message,
        namespace,
        podName,
      });
      throw new Error(`Failed to get pod logs: ${error.message}`);
    }
  }

  /**
   * List pods for a deployment
   */
  async listPods(namespace: string, labelSelector: string): Promise<k8s.V1Pod[]> {
    try {
      const response = await this.k8sApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector
      );
      return response.body.items;
    } catch (error: any) {
      logger.error('Failed to list pods', {
        error: error.message,
        namespace,
        labelSelector,
      });
      throw new Error(`Failed to list pods: ${error.message}`);
    }
  }

  /**
   * Create or ensure namespace exists
   */
  async ensureNamespace(namespace: string): Promise<void> {
    try {
      // Try to get the namespace first
      await this.k8sApi.readNamespace(namespace);
      logger.debug('Namespace already exists', { namespace });
    } catch (error: any) {
      // If namespace doesn't exist, create it
      if (error.statusCode === 404) {
        const ns: k8s.V1Namespace = {
          metadata: {
            name: namespace,
            labels: {
              'managed-by': 'deltek-catalyst',
            },
          },
        };
        await this.k8sApi.createNamespace(ns);
        logger.info('Namespace created', { namespace });
      } else {
        throw error;
      }
    }
  }
}
