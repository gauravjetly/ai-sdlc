/**
 * Architect Agent Worker
 * Real architecture reviews and technical decisions - NO MOCK DATA
 */

import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { prisma } from '../../../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../../../infrastructure/websocket/server.js';
import { createLogger } from '../../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('ArchitectWorker');

export class ArchitectWorker {
  constructor(private websocket?: WebSocketServer) {}

  /**
   * Main worker process handler
   */
  async process(job: Job): Promise<any> {
    const { executionId, taskType, taskParams } = job.data;

    await this.log(executionId, `Starting architecture task: ${taskType}`);
    logger.info('Processing architecture task', { executionId, taskType, jobId: job.id });

    try {
      switch (taskType) {
        case 'design_review':
          return await this.designReview(job);
        case 'dependency_analysis':
          return await this.dependencyAnalysis(job);
        case 'architecture_diagram':
          return await this.generateArchitectureDiagram(job);
        case 'tech_decision':
          return await this.techDecisionReview(job);
        case 'scalability_assessment':
          return await this.scalabilityAssessment(job);
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }
    } catch (error: any) {
      await this.log(executionId, `Task failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Perform design review
   */
  private async designReview(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, focus = 'all' } = taskParams;

    if (!projectPath) {
      throw new Error('projectPath is required for design review');
    }

    job.updateProgress(10);
    await this.log(executionId, `Performing design review of: ${projectPath}`);

    try {
      const findings: any[] = [];

      // Analyze project structure
      job.updateProgress(30);
      await this.log(executionId, 'Analyzing project structure...');

      const { stdout: structure } = await execAsync(`cd "${projectPath}" && find . -type f -name "*.ts" -o -name "*.js" | head -100`);
      const files = structure.trim().split('\n').filter(f => f);

      // Check for common anti-patterns
      const srcFiles = files.filter(f => f.includes('/src/'));
      const testFiles = files.filter(f => f.includes('.test.') || f.includes('.spec.'));

      if (testFiles.length < srcFiles.length * 0.5) {
        findings.push({
          category: 'testing',
          severity: 'medium',
          title: 'Insufficient test coverage',
          description: `Found ${testFiles.length} test files for ${srcFiles.length} source files`,
          recommendation: 'Aim for at least 1 test file per source file',
        });
      }

      // Check for layered architecture
      job.updateProgress(50);
      await this.log(executionId, 'Checking architectural patterns...');

      const hasLayers = {
        presentation: files.some(f => f.includes('/presentation/') || f.includes('/controllers/')),
        application: files.some(f => f.includes('/application/') || f.includes('/services/')),
        domain: files.some(f => f.includes('/domain/') || f.includes('/models/')),
        infrastructure: files.some(f => f.includes('/infrastructure/') || f.includes('/repositories/')),
      };

      if (!hasLayers.domain) {
        findings.push({
          category: 'architecture',
          severity: 'high',
          title: 'Missing domain layer',
          description: 'No clear domain layer detected',
          recommendation: 'Implement domain-driven design with a dedicated domain layer',
        });
      }

      // Check for config files
      job.updateProgress(70);
      await this.log(executionId, 'Checking configuration management...');

      const { stdout: configFiles } = await execAsync(
        `cd "${projectPath}" && find . -maxdepth 2 -name "*.json" -o -name "*.yaml" -o -name "*.env*" | head -20`
      );

      const hasConfigManagement = configFiles.includes('config') || configFiles.includes('.env');

      if (!hasConfigManagement) {
        findings.push({
          category: 'configuration',
          severity: 'medium',
          title: 'No configuration management detected',
          description: 'Could not find dedicated configuration files',
          recommendation: 'Implement environment-based configuration management',
        });
      }

      // Analyze dependencies
      job.updateProgress(85);
      try {
        const packageJson = await readFile(`${projectPath}/package.json`, 'utf-8');
        const pkg = JSON.parse(packageJson);

        const depCount = Object.keys(pkg.dependencies || {}).length;
        const devDepCount = Object.keys(pkg.devDependencies || {}).length;

        if (depCount > 50) {
          findings.push({
            category: 'dependencies',
            severity: 'low',
            title: 'High dependency count',
            description: `Project has ${depCount} dependencies`,
            recommendation: 'Review dependencies and remove unused packages',
          });
        }
      } catch (error) {
        // package.json not found or not parseable
      }

      const summary = {
        total: findings.length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
      };

      job.updateProgress(100);
      await this.log(
        executionId,
        `Design review complete. Found ${findings.length} findings`
      );

      return {
        projectPath,
        summary,
        findings,
        architecturePatterns: hasLayers,
      };
    } catch (error: any) {
      await this.log(executionId, `Design review failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Analyze dependencies and relationships
   */
  private async dependencyAnalysis(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, depth = 2 } = taskParams;

    if (!projectPath) {
      throw new Error('projectPath is required for dependency analysis');
    }

    job.updateProgress(10);
    await this.log(executionId, 'Analyzing project dependencies...');

    try {
      // Analyze npm dependencies
      job.updateProgress(30);
      const packageJson = await readFile(`${projectPath}/package.json`, 'utf-8');
      const pkg = JSON.parse(packageJson);

      const dependencies = pkg.dependencies || {};
      const devDependencies = pkg.devDependencies || {};

      // Check for outdated dependencies
      job.updateProgress(50);
      await this.log(executionId, 'Checking for outdated packages...');

      let outdatedPackages: any[] = [];
      try {
        const { stdout } = await execAsync(`cd "${projectPath}" && npm outdated --json`);
        const outdated = JSON.parse(stdout);

        outdatedPackages = Object.entries(outdated).map(([name, info]: [string, any]) => ({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          type: info.type,
        }));
      } catch (error) {
        // npm outdated returns non-zero when packages are outdated
      }

      // Detect circular dependencies
      job.updateProgress(70);
      await this.log(executionId, 'Detecting circular dependencies...');

      let circularDeps: any[] = [];
      try {
        const { stdout } = await execAsync(
          `cd "${projectPath}" && npx madge --circular --json src/`,
          { maxBuffer: 5 * 1024 * 1024 }
        );

        circularDeps = JSON.parse(stdout);
      } catch (error) {
        // madge not installed or no circular deps found
      }

      const analysis = {
        totalDependencies: Object.keys(dependencies).length,
        totalDevDependencies: Object.keys(devDependencies).length,
        outdatedCount: outdatedPackages.length,
        outdatedPackages: outdatedPackages.slice(0, 20),
        circularDependencies: circularDeps.length,
        circularDependencyPaths: circularDeps.slice(0, 10),
        recommendations: [],
      };

      // Generate recommendations
      if (outdatedPackages.length > 10) {
        analysis.recommendations.push({
          priority: 'medium',
          message: `${outdatedPackages.length} packages are outdated`,
          action: 'Review and update dependencies regularly',
        });
      }

      if (circularDeps.length > 0) {
        analysis.recommendations.push({
          priority: 'high',
          message: `Found ${circularDeps.length} circular dependencies`,
          action: 'Refactor code to eliminate circular dependencies',
        });
      }

      job.updateProgress(100);
      await this.log(executionId, 'Dependency analysis complete');

      return analysis;
    } catch (error: any) {
      await this.log(executionId, `Dependency analysis failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Generate architecture diagram
   */
  private async generateArchitectureDiagram(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { projectPath, outputFormat = 'mermaid' } = taskParams;

    job.updateProgress(10);
    await this.log(executionId, 'Generating architecture diagram...');

    try {
      // Analyze project structure
      const { stdout } = await execAsync(
        `cd "${projectPath}" && find src -type d -maxdepth 2 | sort`
      );

      const directories = stdout.trim().split('\n').filter(d => d);

      job.updateProgress(50);
      await this.log(executionId, 'Creating diagram from project structure...');

      // Generate Mermaid diagram
      let diagram = 'graph TD\n';

      // Add main layers
      const layers = {
        presentation: directories.filter(d => d.includes('presentation') || d.includes('api') || d.includes('controllers')),
        application: directories.filter(d => d.includes('application') || d.includes('services') || d.includes('use-cases')),
        domain: directories.filter(d => d.includes('domain') || d.includes('entities') || d.includes('models')),
        infrastructure: directories.filter(d => d.includes('infrastructure') || d.includes('repositories') || d.includes('database')),
      };

      if (layers.presentation.length > 0) {
        diagram += '  Presentation[Presentation Layer]\n';
      }
      if (layers.application.length > 0) {
        diagram += '  Application[Application Layer]\n';
      }
      if (layers.domain.length > 0) {
        diagram += '  Domain[Domain Layer]\n';
      }
      if (layers.infrastructure.length > 0) {
        diagram += '  Infrastructure[Infrastructure Layer]\n';
      }

      // Add relationships
      if (layers.presentation.length > 0 && layers.application.length > 0) {
        diagram += '  Presentation --> Application\n';
      }
      if (layers.application.length > 0 && layers.domain.length > 0) {
        diagram += '  Application --> Domain\n';
      }
      if (layers.application.length > 0 && layers.infrastructure.length > 0) {
        diagram += '  Application --> Infrastructure\n';
      }
      if (layers.infrastructure.length > 0 && layers.domain.length > 0) {
        diagram += '  Infrastructure --> Domain\n';
      }

      job.updateProgress(90);

      const result = {
        format: outputFormat,
        diagram,
        layers: {
          presentation: layers.presentation.length,
          application: layers.application.length,
          domain: layers.domain.length,
          infrastructure: layers.infrastructure.length,
        },
      };

      job.updateProgress(100);
      await this.log(executionId, 'Architecture diagram generated');

      return result;
    } catch (error: any) {
      await this.log(executionId, `Diagram generation failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Review technical decision
   */
  private async techDecisionReview(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const {
      decision,
      context,
      alternatives = [],
    } = taskParams;

    if (!decision) {
      throw new Error('decision is required');
    }

    job.updateProgress(30);
    await this.log(executionId, `Reviewing technical decision: ${decision}`);

    const review = {
      decision,
      context: context || 'No context provided',
      alternatives,
      assessment: {
        pros: [],
        cons: [],
        risks: [],
      },
      recommendation: '',
      confidence: 0,
    };

    // Simple rule-based assessment
    if (decision.toLowerCase().includes('microservice')) {
      review.assessment.pros.push('Independent deployability');
      review.assessment.pros.push('Technology flexibility');
      review.assessment.cons.push('Increased operational complexity');
      review.assessment.cons.push('Distributed system challenges');
      review.assessment.risks.push('Network latency');
      review.confidence = 0.7;
    } else if (decision.toLowerCase().includes('monolith')) {
      review.assessment.pros.push('Simpler deployment');
      review.assessment.pros.push('Easier debugging');
      review.assessment.cons.push('Tighter coupling');
      review.assessment.cons.push('Harder to scale specific components');
      review.confidence = 0.8;
    }

    review.recommendation = review.assessment.pros.length > review.assessment.cons.length
      ? 'Decision appears sound with manageable trade-offs'
      : 'Consider exploring alternatives or mitigation strategies';

    job.updateProgress(100);
    await this.log(executionId, 'Technical decision review complete');

    return review;
  }

  /**
   * Assess system scalability
   */
  private async scalabilityAssessment(job: Job): Promise<any> {
    const { executionId, taskParams } = job.data;
    const { environment = 'production', targetRPS = 1000 } = taskParams;

    job.updateProgress(10);
    await this.log(executionId, `Assessing scalability for ${environment} environment`);

    try {
      // Analyze current deployment capacity
      job.updateProgress(30);
      const deployments = await prisma.deployment.findMany({
        where: {
          environment: environment as any,
          status: 'running',
        },
      });

      const totalReplicas = deployments.reduce((sum, d) => sum + d.replicas, 0);
      const avgReplicasPerService = deployments.length > 0 ? totalReplicas / deployments.length : 0;

      // Estimate capacity (rough calculation)
      const estimatedCurrentRPS = totalReplicas * 50; // Assume 50 RPS per replica
      const capacityUtilization = (targetRPS / estimatedCurrentRPS) * 100;

      job.updateProgress(60);
      await this.log(executionId, 'Calculating scaling recommendations...');

      const assessment = {
        environment,
        currentDeployments: deployments.length,
        totalReplicas,
        avgReplicasPerService: Math.round(avgReplicasPerService),
        estimatedCurrentRPS,
        targetRPS,
        capacityUtilization: Math.round(capacityUtilization),
        scalingNeeded: capacityUtilization > 80,
        recommendations: [],
      };

      if (capacityUtilization > 80) {
        const additionalReplicas = Math.ceil((targetRPS - estimatedCurrentRPS) / 50);
        assessment.recommendations.push({
          type: 'horizontal_scaling',
          priority: 'high',
          message: `Increase total replicas by ${additionalReplicas} to meet target RPS`,
        });
      }

      if (avgReplicasPerService < 2) {
        assessment.recommendations.push({
          type: 'high_availability',
          priority: 'high',
          message: 'Increase minimum replicas to 2 for high availability',
        });
      }

      if (deployments.length > 20) {
        assessment.recommendations.push({
          type: 'consolidation',
          priority: 'medium',
          message: 'Consider consolidating services to reduce operational overhead',
        });
      }

      job.updateProgress(100);
      await this.log(executionId, 'Scalability assessment complete');

      return assessment;
    } catch (error: any) {
      await this.log(executionId, `Scalability assessment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private async log(executionId: string, message: string, level: string = 'INFO'): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        logs: {
          push: logEntry,
        },
      },
    });

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

export default ArchitectWorker;
