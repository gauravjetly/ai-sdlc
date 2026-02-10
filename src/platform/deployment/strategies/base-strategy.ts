/**
 * Base Deployment Strategy
 * Abstract base class for all deployment strategies
 */

import {
  IDeploymentStrategy,
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatusResult,
  DeploymentStatus,
  DeploymentStrategyType,
  RollbackConfig,
  PodInfo,
  HealthCheckResult,
  DeploymentEvent
} from '../types.js';

/**
 * Abstract base class providing common functionality for all deployment strategies
 */
export abstract class BaseDeploymentStrategy implements IDeploymentStrategy {
  abstract readonly name: DeploymentStrategyType;

  // In-memory storage for deployment state (should be replaced with persistent storage)
  protected deployments: Map<string, DeploymentStatusResult> = new Map();
  protected deploymentHistory: Map<string, string[]> = new Map(); // app -> deployment IDs

  /**
   * Execute deployment - must be implemented by subclasses
   */
  abstract deploy(config: DeploymentConfig): Promise<DeploymentResult>;

  /**
   * Rollback deployment - must be implemented by subclasses
   */
  abstract rollback(deploymentId: string, config?: RollbackConfig): Promise<void>;

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeploymentStatusResult> {
    const status = this.deployments.get(deploymentId);

    if (!status) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    return status;
  }

  /**
   * Pause deployment
   */
  async pause(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status !== 'in-progress') {
      throw new Error(`Cannot pause deployment in status: ${deployment.status}`);
    }

    deployment.status = 'paused';
    this.addEvent(deploymentId, 'Normal', 'Paused', 'Deployment paused by user');

    console.log(`Deployment ${deploymentId} paused`);
  }

  /**
   * Resume deployment
   */
  async resume(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status !== 'paused') {
      throw new Error(`Cannot resume deployment in status: ${deployment.status}`);
    }

    deployment.status = 'in-progress';
    this.addEvent(deploymentId, 'Normal', 'Resumed', 'Deployment resumed by user');

    console.log(`Deployment ${deploymentId} resumed`);
  }

  /**
   * Generate unique deployment ID
   */
  protected generateDeploymentId(application: string, version: string): string {
    const timestamp = Date.now();
    return `${application}-${version}-${timestamp}`;
  }

  /**
   * Initialize deployment status
   */
  protected initializeDeploymentStatus(
    deploymentId: string,
    config: DeploymentConfig
  ): DeploymentStatusResult {
    const status: DeploymentStatusResult = {
      deploymentId,
      application: config.application,
      version: config.version,
      status: 'pending',
      strategy: this.name,
      started_at: new Date().toISOString(),
      progress_percent: 0,
      replicas: {
        desired: config.replicas,
        current: 0,
        ready: 0,
        updated: 0
      },
      conditions: [],
      events: []
    };

    this.deployments.set(deploymentId, status);

    // Track deployment history
    const history = this.deploymentHistory.get(config.application) || [];
    history.push(deploymentId);
    this.deploymentHistory.set(config.application, history);

    return status;
  }

  /**
   * Update deployment status
   */
  protected updateDeploymentStatus(
    deploymentId: string,
    updates: Partial<DeploymentStatusResult>
  ): void {
    const status = this.deployments.get(deploymentId);
    if (!status) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    Object.assign(status, updates);
  }

  /**
   * Add event to deployment
   */
  protected addEvent(
    deploymentId: string,
    type: 'Normal' | 'Warning' | 'Error',
    reason: string,
    message: string
  ): void {
    const status = this.deployments.get(deploymentId);
    if (!status) return;

    const event: DeploymentEvent = {
      timestamp: new Date().toISOString(),
      type,
      reason,
      message
    };

    status.events.unshift(event); // Add to beginning

    // Keep only last 50 events
    if (status.events.length > 50) {
      status.events = status.events.slice(0, 50);
    }
  }

  /**
   * Check if deployment is paused
   */
  protected async checkPaused(deploymentId: string): Promise<void> {
    while (true) {
      const status = this.deployments.get(deploymentId);
      if (!status || status.status !== 'paused') {
        break;
      }
      // Wait 1 second and check again
      await this.sleep(1000);
    }
  }

  /**
   * Simulate pod update (in real implementation, this would use kubectl/k8s API)
   */
  protected async updatePod(
    podName: string,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<PodInfo> {
    console.log(`  Updating pod: ${podName}`);

    this.addEvent(deploymentId, 'Normal', 'PodUpdating', `Updating pod ${podName}`);

    // Simulate pod update time
    await this.sleep(2000);

    const pod: PodInfo = {
      name: podName,
      ready: false,
      status: 'ContainerCreating',
      restarts: 0,
      age: '0s'
    };

    return pod;
  }

  /**
   * Wait for pod to be ready with health checks
   */
  protected async waitForPodReady(
    pod: PodInfo,
    config: DeploymentConfig,
    deploymentId: string,
    timeout: number = 300000 // 5 minutes default
  ): Promise<boolean> {
    console.log(`  Waiting for pod ${pod.name} to be ready...`);

    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < timeout) {
      // Check if deployment is paused
      await this.checkPaused(deploymentId);

      // Simulate health check
      const healthCheck = await this.performHealthCheck(pod, config.healthCheck);

      if (healthCheck.healthy) {
        pod.ready = true;
        pod.status = 'Running';
        console.log(`    Pod ${pod.name} is ready`);
        this.addEvent(deploymentId, 'Normal', 'PodReady', `Pod ${pod.name} is ready`);
        return true;
      }

      console.log(`    Pod ${pod.name} health check: ${healthCheck.message}`);
      await this.sleep(checkInterval);
    }

    console.error(`    Pod ${pod.name} failed to become ready within timeout`);
    this.addEvent(deploymentId, 'Error', 'PodNotReady', `Pod ${pod.name} failed to become ready`);
    return false;
  }

  /**
   * Perform health check on pod
   */
  protected async performHealthCheck(
    pod: PodInfo,
    healthCheckConfig: any
  ): Promise<HealthCheckResult> {
    // Simulate health check (in real implementation, would make actual HTTP/TCP requests)
    const simulatedHealthy = Math.random() > 0.1; // 90% success rate for simulation

    return {
      healthy: simulatedHealthy,
      checks: {
        readiness: simulatedHealthy,
        liveness: simulatedHealthy,
        startup: simulatedHealthy
      },
      message: simulatedHealthy ? 'All checks passed' : 'Health check failed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate percentage value (e.g., "20%" or 2 from total of 10)
   */
  protected calculatePercentage(value: string | number, total: number): number {
    if (typeof value === 'string' && value.endsWith('%')) {
      const percent = parseInt(value.slice(0, -1));
      return Math.ceil((total * percent) / 100);
    }
    return Math.min(value as number, total);
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate deployment progress percentage
   */
  protected calculateProgress(current: number, total: number): number {
    return Math.round((current / total) * 100);
  }

  /**
   * Mark deployment as succeeded
   */
  protected markDeploymentSucceeded(
    deploymentId: string,
    duration: number
  ): DeploymentResult {
    this.updateDeploymentStatus(deploymentId, {
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      progress_percent: 100
    });

    this.addEvent(deploymentId, 'Normal', 'DeploymentSucceeded', 'Deployment completed successfully');

    const status = this.deployments.get(deploymentId)!;

    return {
      deploymentId,
      status: 'succeeded',
      version: status.version,
      message: 'Deployment completed successfully',
      timestamp: new Date().toISOString(),
      metrics: {
        duration_seconds: Math.round(duration / 1000),
        replicas_updated: status.replicas.updated,
        replicas_total: status.replicas.desired,
        error_count: 0,
        success_rate: 1.0
      },
      rollback_available: true
    };
  }

  /**
   * Mark deployment as failed
   */
  protected markDeploymentFailed(
    deploymentId: string,
    error: string,
    duration: number
  ): DeploymentResult {
    this.updateDeploymentStatus(deploymentId, {
      status: 'failed',
      completed_at: new Date().toISOString()
    });

    this.addEvent(deploymentId, 'Error', 'DeploymentFailed', error);

    const status = this.deployments.get(deploymentId)!;

    return {
      deploymentId,
      status: 'failed',
      version: status.version,
      message: error,
      timestamp: new Date().toISOString(),
      metrics: {
        duration_seconds: Math.round(duration / 1000),
        replicas_updated: status.replicas.updated,
        replicas_total: status.replicas.desired,
        error_count: 1,
        success_rate: 0
      },
      rollback_available: true
    };
  }

  /**
   * Get previous deployment for rollback
   */
  protected getPreviousDeployment(application: string): string | null {
    const history = this.deploymentHistory.get(application);
    if (!history || history.length < 2) {
      return null;
    }
    // Return second to last (last is current)
    return history[history.length - 2];
  }
}
