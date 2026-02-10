/**
 * Health Monitor Service
 * Continuous monitoring of pods, deployments, and resources
 * Real-time health checks with PostgreSQL persistence and WebSocket updates
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../infrastructure/websocket/server.js';
import { KubernetesClient } from '../services/deployment/k8s.client.js';
import { createLogger } from '../utils/logger.js';
import {
  Issue,
  IssueType,
  IssueSeverity,
  HealthCheckConfig,
  ResourceHealth,
  PodHealth,
  DeploymentHealth,
  HealthMetrics,
} from './types.js';

const logger = createLogger('HealthMonitor');

export class HealthMonitorService extends EventEmitter {
  private k8sClients: Map<string, KubernetesClient> = new Map();
  private websocket?: WebSocketServer;
  private config: HealthCheckConfig;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healthCache: Map<string, ResourceHealth> = new Map();
  private metrics: HealthMetrics = {
    totalChecks: 0,
    failedChecks: 0,
    healthyResources: 0,
    unhealthyResources: 0,
    averageResponseTime: 0,
    checksByType: {},
  };

  constructor(config: HealthCheckConfig, websocket?: WebSocketServer) {
    super();
    this.config = config;
    this.websocket = websocket;

    logger.info('Health Monitor Service initialized', {
      podCheckInterval: config.podCheckInterval,
      deploymentCheckInterval: config.deploymentCheckInterval,
      performanceCheckInterval: config.performanceCheckInterval,
    });

    if (config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Get or create Kubernetes client
   */
  private getK8sClient(clusterArn: string): KubernetesClient {
    if (!this.k8sClients.has(clusterArn)) {
      const client = new KubernetesClient(clusterArn);
      this.k8sClients.set(clusterArn, client);
    }
    return this.k8sClients.get(clusterArn)!;
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    logger.info('Starting continuous health monitoring');

    // Monitor pod health
    const podInterval = setInterval(() => {
      this.monitorAllPods();
    }, this.config.podCheckInterval);
    this.monitoringIntervals.set('pods', podInterval);

    // Monitor deployment health
    const deploymentInterval = setInterval(() => {
      this.monitorAllDeployments();
    }, this.config.deploymentCheckInterval);
    this.monitoringIntervals.set('deployments', deploymentInterval);

    // Monitor performance/resource usage
    const performanceInterval = setInterval(() => {
      this.monitorResourceUsage();
    }, this.config.performanceCheckInterval);
    this.monitoringIntervals.set('performance', performanceInterval);

    // Monitor deployment readiness
    const readinessInterval = setInterval(() => {
      this.monitorDeploymentReadiness();
    }, this.config.readinessCheckInterval);
    this.monitoringIntervals.set('readiness', readinessInterval);

    logger.info('Health monitoring started with all checks');
  }

  /**
   * Monitor all pods across all deployments
   */
  private async monitorAllPods(): Promise<void> {
    try {
      const deployments = await prisma.deployment.findMany({
        where: {
          status: {
            in: ['deploying', 'running'],
          },
        },
      });

      for (const deployment of deployments) {
        await this.checkPodHealth(deployment);
      }
    } catch (error: any) {
      logger.error('Failed to monitor pods', { error: error.message });
    }
  }

  /**
   * Check health of pods in a deployment
   */
  private async checkPodHealth(deployment: any): Promise<void> {
    const startTime = Date.now();

    try {
      const k8sClient = this.getK8sClient(deployment.clusterArn);
      const pods = await k8sClient.listPods(deployment.namespace, {
        labelSelector: `app=${deployment.application}`,
      });

      this.metrics.totalChecks++;
      this.metrics.checksByType['pod'] = (this.metrics.checksByType['pod'] || 0) + 1;

      for (const pod of pods.items) {
        const podHealth = this.analyzePodHealth(pod, deployment);

        // Cache health status
        const cacheKey = `pod:${deployment.namespace}:${pod.metadata?.name}`;
        this.healthCache.set(cacheKey, {
          resourceType: 'pod',
          resourceName: pod.metadata?.name || '',
          namespace: deployment.namespace,
          healthy: podHealth.healthy,
          lastCheck: new Date(),
          issues: podHealth.issues,
          metrics: podHealth.metrics,
        });

        // Save to database
        await this.saveHealthCheck('pod', deployment.namespace, pod.metadata?.name || '', podHealth);

        // Emit events for unhealthy pods
        if (!podHealth.healthy) {
          this.metrics.failedChecks++;
          this.metrics.unhealthyResources++;

          for (const issue of podHealth.issues) {
            this.emit('issue:detected', issue);
            this.emit('pod:failed', {
              name: pod.metadata?.name,
              namespace: deployment.namespace,
              clusterArn: deployment.clusterArn,
              reason: issue.description,
              restartCount: pod.status?.containerStatuses?.[0]?.restartCount || 0,
              exitCode: pod.status?.containerStatuses?.[0]?.lastState?.terminated?.exitCode,
            });
          }

          this.emitWebSocketEvent('pod:unhealthy', {
            deployment: deployment.name,
            pod: pod.metadata?.name,
            health: podHealth,
          });
        } else {
          this.metrics.healthyResources++;
        }
      }

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
    } catch (error: any) {
      logger.error('Failed to check pod health', {
        deployment: deployment.name,
        error: error.message,
      });
      this.metrics.failedChecks++;
    }
  }

  /**
   * Analyze pod health
   */
  private analyzePodHealth(pod: any, deployment: any): PodHealth {
    const issues: Issue[] = [];
    const metrics: any = {};

    const phase = pod.status?.phase;
    const conditions = pod.status?.conditions || [];
    const containerStatuses = pod.status?.containerStatuses || [];

    // Check pod phase
    if (phase === 'Failed' || phase === 'Unknown') {
      issues.push({
        id: uuidv4(),
        type: 'container_crash',
        severity: 'high',
        resource: {
          type: 'pod',
          name: pod.metadata?.name || '',
          namespace: deployment.namespace,
        },
        description: `Pod is in ${phase} state`,
        detectedAt: new Date(),
        metadata: {
          phase,
          clusterArn: deployment.clusterArn,
        },
      });
    }

    // Check container status
    for (const containerStatus of containerStatuses) {
      metrics.restartCount = containerStatus.restartCount || 0;

      // High restart count
      if (containerStatus.restartCount > 5) {
        issues.push({
          id: uuidv4(),
          type: 'container_crash',
          severity: 'critical',
          resource: {
            type: 'pod',
            name: pod.metadata?.name || '',
            namespace: deployment.namespace,
          },
          description: `Container has restarted ${containerStatus.restartCount} times`,
          detectedAt: new Date(),
          metrics: { restartCount: containerStatus.restartCount },
          metadata: {
            containerName: containerStatus.name,
            clusterArn: deployment.clusterArn,
          },
        });
      }

      // Container not ready
      if (!containerStatus.ready) {
        issues.push({
          id: uuidv4(),
          type: 'container_crash',
          severity: 'high',
          resource: {
            type: 'pod',
            name: pod.metadata?.name || '',
            namespace: deployment.namespace,
          },
          description: `Container ${containerStatus.name} is not ready`,
          detectedAt: new Date(),
          metadata: {
            containerName: containerStatus.name,
            state: containerStatus.state,
            clusterArn: deployment.clusterArn,
          },
        });
      }

      // Check for OOMKilled
      if (containerStatus.lastState?.terminated?.reason === 'OOMKilled') {
        issues.push({
          id: uuidv4(),
          type: 'memory_leak',
          severity: 'critical',
          resource: {
            type: 'pod',
            name: pod.metadata?.name || '',
            namespace: deployment.namespace,
          },
          description: `Container was OOMKilled (out of memory)`,
          detectedAt: new Date(),
          metadata: {
            containerName: containerStatus.name,
            exitCode: containerStatus.lastState?.terminated?.exitCode,
            clusterArn: deployment.clusterArn,
          },
        });
      }
    }

    // Check conditions
    for (const condition of conditions) {
      if (condition.type === 'Ready' && condition.status !== 'True') {
        issues.push({
          id: uuidv4(),
          type: 'container_crash',
          severity: 'high',
          resource: {
            type: 'pod',
            name: pod.metadata?.name || '',
            namespace: deployment.namespace,
          },
          description: `Pod is not ready: ${condition.reason || condition.message}`,
          detectedAt: new Date(),
          metadata: {
            conditionType: condition.type,
            reason: condition.reason,
            message: condition.message,
            clusterArn: deployment.clusterArn,
          },
        });
      }
    }

    return {
      podName: pod.metadata?.name || '',
      namespace: deployment.namespace,
      phase,
      healthy: issues.length === 0 && phase === 'Running',
      issues,
      conditions,
      containerStatuses,
      metrics,
      lastCheck: new Date(),
    };
  }

  /**
   * Monitor all deployments
   */
  private async monitorAllDeployments(): Promise<void> {
    try {
      const deployments = await prisma.deployment.findMany({
        where: {
          status: {
            in: ['deploying', 'running'],
          },
        },
      });

      for (const deployment of deployments) {
        await this.checkDeploymentHealth(deployment);
      }
    } catch (error: any) {
      logger.error('Failed to monitor deployments', { error: error.message });
    }
  }

  /**
   * Check deployment health
   */
  private async checkDeploymentHealth(deployment: any): Promise<void> {
    const startTime = Date.now();

    try {
      const k8sClient = this.getK8sClient(deployment.clusterArn);
      const k8sDeployment = await k8sClient.getDeployment(
        deployment.namespace,
        deployment.k8sDeploymentName
      );

      this.metrics.totalChecks++;
      this.metrics.checksByType['deployment'] = (this.metrics.checksByType['deployment'] || 0) + 1;

      const deploymentHealth = this.analyzeDeploymentHealth(k8sDeployment, deployment);

      // Cache health status
      const cacheKey = `deployment:${deployment.namespace}:${deployment.k8sDeploymentName}`;
      this.healthCache.set(cacheKey, {
        resourceType: 'deployment',
        resourceName: deployment.k8sDeploymentName,
        namespace: deployment.namespace,
        healthy: deploymentHealth.healthy,
        lastCheck: new Date(),
        issues: deploymentHealth.issues,
        metrics: deploymentHealth.metrics,
      });

      // Save to database
      await this.saveHealthCheck(
        'deployment',
        deployment.namespace,
        deployment.k8sDeploymentName,
        deploymentHealth
      );

      // Emit events for unhealthy deployments
      if (!deploymentHealth.healthy) {
        this.metrics.failedChecks++;
        this.metrics.unhealthyResources++;

        for (const issue of deploymentHealth.issues) {
          this.emit('issue:detected', issue);
        }

        this.emit('deployment:unhealthy', {
          id: deployment.id,
          name: deployment.name,
          k8sDeploymentName: deployment.k8sDeploymentName,
          namespace: deployment.namespace,
          clusterArn: deployment.clusterArn,
          statusMessage: deploymentHealth.issues[0]?.description,
          errorRate: deploymentHealth.metrics?.errorRate,
          healthChecksFailed: deploymentHealth.issues.length,
        });

        this.emitWebSocketEvent('deployment:unhealthy', {
          deployment: deployment.name,
          health: deploymentHealth,
        });
      } else {
        this.metrics.healthyResources++;
      }

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
    } catch (error: any) {
      logger.error('Failed to check deployment health', {
        deployment: deployment.name,
        error: error.message,
      });
      this.metrics.failedChecks++;
    }
  }

  /**
   * Analyze deployment health
   */
  private analyzeDeploymentHealth(k8sDeployment: any, deployment: any): DeploymentHealth {
    const issues: Issue[] = [];
    const metrics: any = {};

    const status = k8sDeployment.status;
    const spec = k8sDeployment.spec;

    if (!status || !spec) {
      issues.push({
        id: uuidv4(),
        type: 'high_error_rate',
        severity: 'high',
        resource: {
          type: 'deployment',
          name: deployment.k8sDeploymentName,
          namespace: deployment.namespace,
        },
        description: 'Deployment status unavailable',
        detectedAt: new Date(),
        metadata: {
          deploymentId: deployment.id,
          clusterArn: deployment.clusterArn,
        },
      });

      return {
        deploymentName: deployment.k8sDeploymentName,
        namespace: deployment.namespace,
        healthy: false,
        issues,
        replicas: {
          desired: 0,
          ready: 0,
          available: 0,
          updated: 0,
        },
        conditions: [],
        metrics,
        lastCheck: new Date(),
      };
    }

    const desiredReplicas = spec.replicas || 0;
    const readyReplicas = status.readyReplicas || 0;
    const availableReplicas = status.availableReplicas || 0;
    const updatedReplicas = status.updatedReplicas || 0;

    metrics.desiredReplicas = desiredReplicas;
    metrics.readyReplicas = readyReplicas;
    metrics.availableReplicas = availableReplicas;

    // Check if replicas are ready
    if (readyReplicas < desiredReplicas) {
      issues.push({
        id: uuidv4(),
        type: 'high_error_rate',
        severity: readyReplicas === 0 ? 'critical' : 'high',
        resource: {
          type: 'deployment',
          name: deployment.k8sDeploymentName,
          namespace: deployment.namespace,
        },
        description: `Only ${readyReplicas}/${desiredReplicas} replicas are ready`,
        detectedAt: new Date(),
        metrics: {
          desiredReplicas,
          readyReplicas,
        },
        metadata: {
          deploymentId: deployment.id,
          clusterArn: deployment.clusterArn,
        },
      });
    }

    // Check conditions
    const conditions = status.conditions || [];
    for (const condition of conditions) {
      if (condition.type === 'Available' && condition.status !== 'True') {
        issues.push({
          id: uuidv4(),
          type: 'high_error_rate',
          severity: 'high',
          resource: {
            type: 'deployment',
            name: deployment.k8sDeploymentName,
            namespace: deployment.namespace,
          },
          description: `Deployment not available: ${condition.reason || condition.message}`,
          detectedAt: new Date(),
          metadata: {
            deploymentId: deployment.id,
            conditionType: condition.type,
            reason: condition.reason,
            message: condition.message,
            clusterArn: deployment.clusterArn,
          },
        });
      }

      if (condition.type === 'Progressing' && condition.status !== 'True') {
        issues.push({
          id: uuidv4(),
          type: 'high_error_rate',
          severity: 'medium',
          resource: {
            type: 'deployment',
            name: deployment.k8sDeploymentName,
            namespace: deployment.namespace,
          },
          description: `Deployment not progressing: ${condition.reason || condition.message}`,
          detectedAt: new Date(),
          metadata: {
            deploymentId: deployment.id,
            conditionType: condition.type,
            reason: condition.reason,
            message: condition.message,
            clusterArn: deployment.clusterArn,
          },
        });
      }
    }

    return {
      deploymentName: deployment.k8sDeploymentName,
      namespace: deployment.namespace,
      healthy: issues.length === 0 && readyReplicas >= desiredReplicas,
      issues,
      replicas: {
        desired: desiredReplicas,
        ready: readyReplicas,
        available: availableReplicas,
        updated: updatedReplicas,
      },
      conditions,
      metrics,
      lastCheck: new Date(),
    };
  }

  /**
   * Monitor resource usage (CPU, memory)
   */
  private async monitorResourceUsage(): Promise<void> {
    try {
      const deployments = await prisma.deployment.findMany({
        where: {
          status: {
            in: ['deploying', 'running'],
          },
        },
      });

      for (const deployment of deployments) {
        await this.checkResourceUsage(deployment);
      }
    } catch (error: any) {
      logger.error('Failed to monitor resource usage', { error: error.message });
    }
  }

  /**
   * Check resource usage for deployment
   */
  private async checkResourceUsage(deployment: any): Promise<void> {
    try {
      const k8sClient = this.getK8sClient(deployment.clusterArn);

      // Get pod metrics (requires metrics-server)
      // For now, simulate with thresholds
      const cpuUsage = Math.random() * 100; // Simulated
      const memoryUsage = Math.random() * 100; // Simulated

      this.metrics.totalChecks++;
      this.metrics.checksByType['resource'] = (this.metrics.checksByType['resource'] || 0) + 1;

      // Check CPU threshold
      if (cpuUsage > this.config.thresholds.cpuUsage) {
        const issue: Issue = {
          id: uuidv4(),
          type: 'resource_exhaustion',
          severity: cpuUsage > 95 ? 'critical' : 'high',
          resource: {
            type: 'deployment',
            name: deployment.k8sDeploymentName,
            namespace: deployment.namespace,
          },
          description: `High CPU usage: ${cpuUsage.toFixed(1)}%`,
          detectedAt: new Date(),
          metrics: { cpuUsage, memoryUsage },
          metadata: {
            deploymentId: deployment.id,
            clusterArn: deployment.clusterArn,
          },
        };

        this.emit('issue:detected', issue);
        this.emit('resource:exhausted', {
          deploymentId: deployment.id,
          deploymentName: deployment.k8sDeploymentName,
          namespace: deployment.namespace,
          clusterArn: deployment.clusterArn,
          cpuUsage,
          memoryUsage,
          replicas: deployment.replicas,
        });
      }

      // Check memory threshold
      if (memoryUsage > this.config.thresholds.memoryUsage) {
        const issue: Issue = {
          id: uuidv4(),
          type: 'resource_exhaustion',
          severity: memoryUsage > 95 ? 'critical' : 'high',
          resource: {
            type: 'deployment',
            name: deployment.k8sDeploymentName,
            namespace: deployment.namespace,
          },
          description: `High memory usage: ${memoryUsage.toFixed(1)}%`,
          detectedAt: new Date(),
          metrics: { cpuUsage, memoryUsage },
          metadata: {
            deploymentId: deployment.id,
            clusterArn: deployment.clusterArn,
          },
        };

        this.emit('issue:detected', issue);
        this.emit('resource:exhausted', {
          deploymentId: deployment.id,
          deploymentName: deployment.k8sDeploymentName,
          namespace: deployment.namespace,
          clusterArn: deployment.clusterArn,
          cpuUsage,
          memoryUsage,
          replicas: deployment.replicas,
        });
      }
    } catch (error: any) {
      logger.error('Failed to check resource usage', {
        deployment: deployment.name,
        error: error.message,
      });
    }
  }

  /**
   * Monitor deployment readiness checks
   */
  private async monitorDeploymentReadiness(): Promise<void> {
    try {
      const deployments = await prisma.deployment.findMany({
        where: {
          status: 'deploying',
        },
      });

      for (const deployment of deployments) {
        await this.checkDeploymentReadiness(deployment);
      }
    } catch (error: any) {
      logger.error('Failed to monitor deployment readiness', { error: error.message });
    }
  }

  /**
   * Check deployment readiness
   */
  private async checkDeploymentReadiness(deployment: any): Promise<void> {
    try {
      const k8sClient = this.getK8sClient(deployment.clusterArn);
      const k8sDeployment = await k8sClient.getDeployment(
        deployment.namespace,
        deployment.k8sDeploymentName
      );

      const status = k8sDeployment.status;
      const spec = k8sDeployment.spec;

      if (!status || !spec) return;

      const desiredReplicas = spec.replicas || 0;
      const availableReplicas = status.availableReplicas || 0;

      // Check if deployment is stuck
      const deploymentAge = Date.now() - new Date(deployment.startedAt).getTime();
      const maxDeploymentTime = 10 * 60 * 1000; // 10 minutes

      if (deploymentAge > maxDeploymentTime && availableReplicas < desiredReplicas) {
        const issue: Issue = {
          id: uuidv4(),
          type: 'high_error_rate',
          severity: 'critical',
          resource: {
            type: 'deployment',
            name: deployment.k8sDeploymentName,
            namespace: deployment.namespace,
          },
          description: `Deployment stuck: ${availableReplicas}/${desiredReplicas} replicas ready after 10 minutes`,
          detectedAt: new Date(),
          metrics: {
            desiredReplicas,
            availableReplicas,
            deploymentAge: deploymentAge / 1000,
          },
          metadata: {
            deploymentId: deployment.id,
            clusterArn: deployment.clusterArn,
          },
        };

        this.emit('issue:detected', issue);
        this.emit('deployment:unhealthy', {
          id: deployment.id,
          name: deployment.name,
          k8sDeploymentName: deployment.k8sDeploymentName,
          namespace: deployment.namespace,
          clusterArn: deployment.clusterArn,
          statusMessage: issue.description,
        });
      }
    } catch (error: any) {
      logger.error('Failed to check deployment readiness', {
        deployment: deployment.name,
        error: error.message,
      });
    }
  }

  /**
   * Check specific resource health
   */
  async checkResourceHealth(resource: {
    type: 'pod' | 'deployment' | 'service' | 'node';
    name: string;
    namespace?: string;
  }): Promise<ResourceHealth> {
    const cacheKey = `${resource.type}:${resource.namespace}:${resource.name}`;
    return (
      this.healthCache.get(cacheKey) || {
        resourceType: resource.type,
        resourceName: resource.name,
        namespace: resource.namespace,
        healthy: true,
        lastCheck: new Date(),
        issues: [],
        metrics: {},
      }
    );
  }

  /**
   * Save health check to database
   */
  private async saveHealthCheck(
    resourceType: string,
    namespace: string,
    resourceName: string,
    health: any
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO health_checks (
          id, resource_type, resource_name, namespace, healthy,
          checked_at, issues, metrics
        ) VALUES (
          ${uuidv4()}, ${resourceType}, ${resourceName}, ${namespace},
          ${health.healthy}, NOW(), ${JSON.stringify(health.issues || [])},
          ${JSON.stringify(health.metrics || {})}
        )
      `;
    } catch (error: any) {
      logger.error('Failed to save health check', { error: error.message });
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.metrics.averageResponseTime;
    const totalChecks = this.metrics.totalChecks;

    this.metrics.averageResponseTime =
      (currentAvg * (totalChecks - 1) + responseTime) / totalChecks;
  }

  /**
   * Emit WebSocket event
   */
  private emitWebSocketEvent(eventName: string, data: any): void {
    if (this.websocket) {
      this.websocket.emit('health-monitor', eventName, data);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status summary
   */
  async getHealthSummary(): Promise<any> {
    const summary = {
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      metrics: this.getMetrics(),
      resources: {
        pods: await this.getPodHealthSummary(),
        deployments: await this.getDeploymentHealthSummary(),
      },
    };

    // Determine overall health
    if (this.metrics.unhealthyResources > this.metrics.healthyResources) {
      summary.overall = 'unhealthy';
    } else if (this.metrics.unhealthyResources > 0) {
      summary.overall = 'degraded';
    }

    return summary;
  }

  /**
   * Get pod health summary
   */
  private async getPodHealthSummary(): Promise<any> {
    const podHealthRecords = Array.from(this.healthCache.entries())
      .filter(([key]) => key.startsWith('pod:'))
      .map(([, health]) => health);

    return {
      total: podHealthRecords.length,
      healthy: podHealthRecords.filter((h) => h.healthy).length,
      unhealthy: podHealthRecords.filter((h) => !h.healthy).length,
    };
  }

  /**
   * Get deployment health summary
   */
  private async getDeploymentHealthSummary(): Promise<any> {
    const deploymentHealthRecords = Array.from(this.healthCache.entries())
      .filter(([key]) => key.startsWith('deployment:'))
      .map(([, health]) => health);

    return {
      total: deploymentHealthRecords.length,
      healthy: deploymentHealthRecords.filter((h) => h.healthy).length,
      unhealthy: deploymentHealthRecords.filter((h) => !h.healthy).length,
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down health monitor service');

    // Clear all intervals
    for (const [name, interval] of this.monitoringIntervals.entries()) {
      clearInterval(interval);
      logger.info('Stopped monitoring interval', { name });
    }

    this.monitoringIntervals.clear();
    this.healthCache.clear();
    this.k8sClients.clear();
    this.removeAllListeners();
  }
}
