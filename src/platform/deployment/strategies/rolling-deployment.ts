/**
 * Rolling Deployment Strategy
 * Updates pods in batches with configurable max unavailable and max surge
 */

import { BaseDeploymentStrategy } from './base-strategy.js';
import {
  DeploymentConfig,
  DeploymentResult,
  RollingDeploymentOptions,
  PodInfo,
  RollbackConfig
} from '../types.js';

/**
 * Rolling deployment strategy implementation
 *
 * Features:
 * - Configurable batch size (maxUnavailable)
 * - Configurable surge capacity (maxSurge)
 * - Health checks before proceeding to next batch
 * - Automatic rollback on failure
 * - Progress tracking
 *
 * Best for: General-purpose deployments, stateless applications
 */
export class RollingDeploymentStrategy extends BaseDeploymentStrategy {
  readonly name = 'rolling' as const;

  /**
   * Deploy application using rolling update strategy
   *
   * Process:
   * 1. Calculate batch size based on maxUnavailable
   * 2. Update pods in batches
   * 3. Wait for each batch to pass health checks
   * 4. Proceed to next batch or rollback on failure
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = this.generateDeploymentId(config.application, config.version);
    const options = config.strategy.options as RollingDeploymentOptions;

    console.log(`\n=== Rolling Deployment Started ===`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Application: ${config.application}`);
    console.log(`Version: ${config.version}`);
    console.log(`Replicas: ${config.replicas}`);
    console.log(`Max Unavailable: ${options.max_unavailable}`);
    console.log(`Max Surge: ${options.max_surge}`);
    console.log(`=====================================\n`);

    // Initialize deployment status
    this.initializeDeploymentStatus(deploymentId, config);

    try {
      // Calculate batch sizes
      const maxUnavailable = this.calculatePercentage(options.max_unavailable, config.replicas);
      const maxSurge = this.calculatePercentage(options.max_surge, config.replicas);

      console.log(`Calculated batch size: ${maxUnavailable} pods at a time`);
      console.log(`Surge capacity: ${maxSurge} additional pods\n`);

      this.updateDeploymentStatus(deploymentId, {
        status: 'in-progress',
        current_stage: 'creating_surge_pods'
      });

      // Phase 1: Create surge pods first (if maxSurge > 0)
      let surgePods: PodInfo[] = [];
      if (maxSurge > 0) {
        console.log(`Phase 1: Creating ${maxSurge} surge pods...`);
        surgePods = await this.createSurgePods(maxSurge, config, deploymentId);
        console.log(`Surge pods created and ready\n`);
      }

      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'rolling_update'
      });

      // Phase 2: Rolling update of existing pods
      console.log(`Phase 2: Rolling update of ${config.replicas} pods...`);
      const updatedPods = await this.rollingUpdate(
        config,
        maxUnavailable,
        deploymentId
      );

      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'removing_old_pods'
      });

      // Phase 3: Remove surge pods
      if (surgePods.length > 0) {
        console.log(`\nPhase 3: Removing ${surgePods.length} surge pods...`);
        await this.removeSurgePods(surgePods, deploymentId);
      }

      // Phase 4: Final verification
      console.log(`\nPhase 4: Final verification...`);
      await this.verifyDeployment(updatedPods, config, deploymentId);

      const duration = Date.now() - startTime;
      console.log(`\n=== Rolling Deployment Completed ===`);
      console.log(`Duration: ${Math.round(duration / 1000)}s`);
      console.log(`All ${config.replicas} pods updated successfully`);
      console.log(`=====================================\n`);

      return this.markDeploymentSucceeded(deploymentId, duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`\n=== Rolling Deployment Failed ===`);
      console.error(`Error: ${error.message}`);
      console.error(`Duration: ${Math.round(duration / 1000)}s`);
      console.error(`Initiating automatic rollback...`);
      console.error(`=================================\n`);

      // Attempt automatic rollback
      try {
        await this.rollback(deploymentId, {
          reason: `Automatic rollback due to deployment failure: ${error.message}`
        });
      } catch (rollbackError: any) {
        console.error(`Rollback failed: ${rollbackError.message}`);
      }

      return this.markDeploymentFailed(deploymentId, error.message, duration);
    }
  }

  /**
   * Create surge pods for zero-downtime deployment
   */
  private async createSurgePods(
    count: number,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<PodInfo[]> {
    const surgePods: PodInfo[] = [];

    for (let i = 0; i < count; i++) {
      const podName = `${config.application}-surge-${i}`;
      const pod = await this.updatePod(podName, config, deploymentId);

      const ready = await this.waitForPodReady(pod, config, deploymentId);
      if (!ready) {
        throw new Error(`Surge pod ${podName} failed to become ready`);
      }

      surgePods.push(pod);
    }

    return surgePods;
  }

  /**
   * Perform rolling update on existing pods
   */
  private async rollingUpdate(
    config: DeploymentConfig,
    batchSize: number,
    deploymentId: string
  ): Promise<PodInfo[]> {
    const updatedPods: PodInfo[] = [];
    let batch = 0;

    for (let i = 0; i < config.replicas; i += batchSize) {
      batch++;
      const batchStart = i;
      const batchEnd = Math.min(i + batchSize, config.replicas);
      const actualBatchSize = batchEnd - batchStart;

      console.log(`\n  Batch ${batch}: Updating pods ${batchStart + 1}-${batchEnd}...`);

      // Update batch of pods
      const batchPods: PodInfo[] = [];
      for (let j = batchStart; j < batchEnd; j++) {
        const podName = `${config.application}-${j}`;
        const pod = await this.updatePod(podName, config, deploymentId);
        batchPods.push(pod);
      }

      // Wait for all pods in batch to be ready
      console.log(`  Waiting for batch ${batch} to be ready...`);
      const allReady = await this.waitForBatchReady(
        batchPods,
        config,
        deploymentId
      );

      if (!allReady) {
        throw new Error(`Batch ${batch} failed health checks`);
      }

      updatedPods.push(...batchPods);

      // Update progress
      const progress = this.calculateProgress(updatedPods.length, config.replicas);
      this.updateDeploymentStatus(deploymentId, {
        progress_percent: progress,
        replicas: {
          desired: config.replicas,
          current: updatedPods.length,
          ready: updatedPods.filter(p => p.ready).length,
          updated: updatedPods.length
        }
      });

      console.log(`  Batch ${batch} completed successfully (${progress}% complete)`);

      // Check if paused between batches
      await this.checkPaused(deploymentId);
    }

    return updatedPods;
  }

  /**
   * Wait for all pods in batch to be ready
   */
  private async waitForBatchReady(
    pods: PodInfo[],
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<boolean> {
    const readyPromises = pods.map(pod =>
      this.waitForPodReady(pod, config, deploymentId)
    );

    const results = await Promise.all(readyPromises);
    return results.every(ready => ready);
  }

  /**
   * Remove surge pods after deployment
   */
  private async removeSurgePods(
    surgePods: PodInfo[],
    deploymentId: string
  ): Promise<void> {
    for (const pod of surgePods) {
      console.log(`  Removing surge pod: ${pod.name}`);
      this.addEvent(deploymentId, 'Normal', 'PodTerminating', `Removing surge pod ${pod.name}`);
      await this.sleep(500); // Simulate pod removal
    }
  }

  /**
   * Verify all pods are healthy after deployment
   */
  private async verifyDeployment(
    pods: PodInfo[],
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<void> {
    console.log(`Verifying all ${pods.length} pods...`);

    for (const pod of pods) {
      const healthCheck = await this.performHealthCheck(pod, config.healthCheck);
      if (!healthCheck.healthy) {
        throw new Error(`Final verification failed for pod ${pod.name}`);
      }
    }

    console.log(`All pods verified successfully`);
  }

  /**
   * Rollback to previous version
   */
  async rollback(deploymentId: string, config?: RollbackConfig): Promise<void> {
    console.log(`\n=== Rolling Deployment Rollback ===`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Reason: ${config?.reason || 'Manual rollback'}`);
    console.log(`====================================\n`);

    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    this.updateDeploymentStatus(deploymentId, {
      status: 'rolled-back'
    });

    this.addEvent(
      deploymentId,
      'Warning',
      'RollbackInitiated',
      config?.reason || 'Manual rollback'
    );

    // Get previous deployment
    const previousDeploymentId = this.getPreviousDeployment(deployment.application);
    if (!previousDeploymentId) {
      throw new Error('No previous deployment found for rollback');
    }

    const previousDeployment = this.deployments.get(previousDeploymentId);
    if (!previousDeployment) {
      throw new Error(`Previous deployment ${previousDeploymentId} not found`);
    }

    console.log(`Rolling back to version: ${previousDeployment.version}`);

    // Simulate rollback (in real implementation, would trigger actual rollback)
    await this.sleep(5000);

    this.addEvent(
      deploymentId,
      'Normal',
      'RollbackCompleted',
      `Rolled back to version ${previousDeployment.version}`
    );

    console.log(`\nRollback completed successfully`);
    console.log(`====================================\n`);
  }
}
