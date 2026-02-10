/**
 * Canary Deployment Strategy
 * Progressive rollout with metric-based auto-promotion or rollback
 */

import { BaseDeploymentStrategy } from './base-strategy.js';
import {
  DeploymentConfig,
  DeploymentResult,
  CanaryDeploymentOptions,
  CanaryStage,
  PodInfo,
  RollbackConfig
} from '../types.js';

/**
 * Canary deployment strategy implementation
 *
 * Features:
 * - Progressive traffic rollout (5% → 25% → 50% → 100%)
 * - Metric-based validation at each stage
 * - Automatic promotion if metrics are within SLO
 * - Automatic rollback if metrics exceed threshold
 * - Configurable stages and thresholds
 *
 * Best for: High-risk deployments, user-facing services, A/B testing
 */
export class CanaryDeploymentStrategy extends BaseDeploymentStrategy {
  readonly name = 'canary' as const;

  /**
   * Deploy application using canary strategy
   *
   * Process:
   * 1. Deploy canary version alongside stable
   * 2. Route small % of traffic to canary
   * 3. Monitor metrics (error rate, latency, success rate)
   * 4. If metrics OK, increase traffic percentage
   * 5. If metrics bad, rollback immediately
   * 6. Repeat until 100% or rollback
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = this.generateDeploymentId(config.application, config.version);
    const options = config.strategy.options as CanaryDeploymentOptions;

    console.log(`\n=== Canary Deployment Started ===`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Application: ${config.application}`);
    console.log(`Version: ${config.version}`);
    console.log(`Replicas: ${config.replicas}`);
    console.log(`Stages: ${options.stages.map(s => `${s.traffic_percent}%`).join(' → ')}`);
    console.log(`Auto Promotion: ${options.auto_promotion}`);
    console.log(`Auto Rollback: ${options.auto_rollback}`);
    console.log(`==================================\n`);

    // Initialize deployment status
    this.initializeDeploymentStatus(deploymentId, config);

    try {
      // Phase 1: Deploy canary pods
      console.log(`Phase 1: Deploying canary pods...`);
      this.updateDeploymentStatus(deploymentId, {
        status: 'in-progress',
        current_stage: 'deploying_canary',
        progress_percent: 5
      });

      const canaryPods = await this.deployCanaryPods(config, deploymentId);
      console.log(`Canary pods deployed and ready\n`);

      // Phase 2: Progressive rollout through stages
      console.log(`Phase 2: Progressive traffic rollout...`);

      for (let i = 0; i < options.stages.length; i++) {
        const stage = options.stages[i];
        const stageNumber = i + 1;

        console.log(`\n  Stage ${stageNumber}/${options.stages.length}: ${stage.traffic_percent}% traffic to canary`);

        this.updateDeploymentStatus(deploymentId, {
          current_stage: `canary_stage_${stageNumber}_${stage.traffic_percent}pct`,
          progress_percent: 5 + Math.round((i / options.stages.length) * 90)
        });

        // Route traffic to canary
        await this.routeTrafficToCanary(stage.traffic_percent, config, deploymentId);

        // Monitor metrics for stage duration
        const metricsOk = await this.monitorCanaryMetrics(
          stage,
          options.metrics,
          config,
          deploymentId,
          stageNumber
        );

        if (!metricsOk) {
          if (options.auto_rollback) {
            console.error(`\n  Metrics threshold exceeded at stage ${stageNumber}`);
            console.error(`  Automatic rollback initiated...`);
            await this.rollbackCanary(config, deploymentId);
            throw new Error(`Canary failed at ${stage.traffic_percent}% traffic`);
          } else {
            console.warn(`\n  Metrics threshold exceeded at stage ${stageNumber}`);
            console.warn(`  Pausing deployment for manual intervention...`);
            await this.pause(deploymentId);
            // Wait for manual resume
            await this.checkPaused(deploymentId);
          }
        }

        if (options.auto_promotion && metricsOk) {
          console.log(`    ✓ Metrics within SLO, auto-promoting to next stage`);
        }

        // Check if paused between stages
        await this.checkPaused(deploymentId);
      }

      // Phase 3: Finalize deployment (replace stable with canary)
      console.log(`\nPhase 3: Finalizing deployment...`);
      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'finalizing',
        progress_percent: 95
      });

      await this.finalizeCanaryDeployment(config, canaryPods, deploymentId);

      const duration = Date.now() - startTime;
      console.log(`\n=== Canary Deployment Completed ===`);
      console.log(`Duration: ${Math.round(duration / 1000)}s`);
      console.log(`All traffic now routed to new version`);
      console.log(`====================================\n`);

      return this.markDeploymentSucceeded(deploymentId, duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`\n=== Canary Deployment Failed ===`);
      console.error(`Error: ${error.message}`);
      console.error(`Duration: ${Math.round(duration / 1000)}s`);
      console.error(`================================\n`);

      return this.markDeploymentFailed(deploymentId, error.message, duration);
    }
  }

  /**
   * Deploy initial canary pods
   */
  private async deployCanaryPods(
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<PodInfo[]> {
    // Start with small number of canary pods (20% of total)
    const canaryCount = Math.max(1, Math.ceil(config.replicas * 0.2));
    console.log(`  Deploying ${canaryCount} canary pods...`);

    const canaryPods: PodInfo[] = [];

    for (let i = 0; i < canaryCount; i++) {
      const podName = `${config.application}-canary-${i}`;
      const pod = await this.updatePod(podName, config, deploymentId);

      const ready = await this.waitForPodReady(pod, config, deploymentId);
      if (!ready) {
        throw new Error(`Canary pod ${podName} failed to become ready`);
      }

      canaryPods.push(pod);
    }

    console.log(`  ${canaryPods.length} canary pods ready`);
    return canaryPods;
  }

  /**
   * Route specified percentage of traffic to canary
   */
  private async routeTrafficToCanary(
    percent: number,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<void> {
    console.log(`    Routing ${percent}% of traffic to canary...`);

    this.addEvent(
      deploymentId,
      'Normal',
      'TrafficRouting',
      `Routing ${percent}% traffic to canary`
    );

    // Simulate traffic routing configuration
    // In real implementation, this would update:
    // - Istio VirtualService weights
    // - AWS App Mesh routes
    // - NGINX Ingress canary annotations
    // - etc.

    await this.sleep(1000);

    console.log(`    Traffic routing updated`);
  }

  /**
   * Monitor canary metrics for a stage
   */
  private async monitorCanaryMetrics(
    stage: CanaryStage,
    metricsConfig: any,
    config: DeploymentConfig,
    deploymentId: string,
    stageNumber: number
  ): Promise<boolean> {
    console.log(`    Monitoring canary for ${stage.duration_seconds} seconds...`);

    const checkInterval = 10000; // Check every 10 seconds
    const checks = Math.floor(stage.duration_seconds / (checkInterval / 1000));

    let failureCount = 0;
    const maxFailures = 3; // Allow 3 failures before rollback

    for (let i = 0; i < checks; i++) {
      await this.sleep(checkInterval);

      // Check if paused
      await this.checkPaused(deploymentId);

      // Collect metrics
      const metrics = await this.collectCanaryMetrics(config.application);

      const errorRatePercent = (metrics.errorRate * 100).toFixed(2);
      const successRatePercent = (metrics.successRate * 100).toFixed(2);

      console.log(
        `      Check ${i + 1}/${checks}: ` +
        `Error: ${errorRatePercent}% (limit: ${(metricsConfig.error_rate_threshold * 100).toFixed(2)}%), ` +
        `Latency P99: ${metrics.latencyP99}ms (limit: ${metricsConfig.latency_p99_threshold_ms}ms), ` +
        `Success: ${successRatePercent}% (limit: ${(metricsConfig.success_rate_threshold * 100).toFixed(2)}%)`
      );

      // Validate metrics against thresholds
      const violations: string[] = [];

      if (metrics.errorRate > metricsConfig.error_rate_threshold) {
        violations.push(`Error rate: ${errorRatePercent}%`);
      }

      if (metrics.latencyP99 > metricsConfig.latency_p99_threshold_ms) {
        violations.push(`Latency P99: ${metrics.latencyP99}ms`);
      }

      if (metrics.successRate < metricsConfig.success_rate_threshold) {
        violations.push(`Success rate: ${successRatePercent}%`);
      }

      if (violations.length > 0) {
        failureCount++;
        console.warn(`        ⚠ Threshold violations: ${violations.join(', ')}`);

        this.addEvent(
          deploymentId,
          'Warning',
          'MetricsThresholdExceeded',
          `Stage ${stageNumber}: ${violations.join(', ')}`
        );

        if (failureCount >= maxFailures) {
          console.error(`        ✗ Too many failures (${failureCount}/${maxFailures})`);
          return false;
        }
      } else {
        // Reset failure count on success
        failureCount = 0;
      }
    }

    if (failureCount > 0) {
      console.warn(`    Stage completed with ${failureCount} metric violations`);
      return false;
    }

    console.log(`    ✓ All metrics within acceptable range`);
    return true;
  }

  /**
   * Collect canary metrics
   */
  private async collectCanaryMetrics(application: string): Promise<{
    errorRate: number;
    latencyP99: number;
    successRate: number;
    requestsPerSecond: number;
  }> {
    // Simulate metric collection from monitoring system
    // In real implementation, query Prometheus, CloudWatch, Datadog, etc.

    // Simulate realistic metrics with some variance
    const baseErrorRate = 0.005; // 0.5% base error rate
    const variance = (Math.random() - 0.5) * 0.01; // ±0.5% variance

    return {
      errorRate: Math.max(0, baseErrorRate + variance), // 0-1%
      latencyP99: 150 + Math.random() * 100, // 150-250ms
      successRate: 0.995 + Math.random() * 0.005, // 99.5-100%
      requestsPerSecond: 100 + Math.random() * 50 // 100-150 rps
    };
  }

  /**
   * Rollback canary deployment
   */
  private async rollbackCanary(
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<void> {
    console.log(`\n  Rolling back canary deployment...`);

    // Route all traffic back to stable version
    await this.routeTrafficToCanary(0, config, deploymentId);

    // Remove canary pods
    console.log(`  Removing canary pods...`);
    await this.sleep(2000);

    this.addEvent(
      deploymentId,
      'Warning',
      'CanaryRolledBack',
      'Canary deployment rolled back due to metrics threshold violations'
    );

    console.log(`  Canary rollback completed\n`);
  }

  /**
   * Finalize canary deployment by replacing stable pods
   */
  private async finalizeCanaryDeployment(
    config: DeploymentConfig,
    canaryPods: PodInfo[],
    deploymentId: string
  ): Promise<void> {
    console.log(`  Replacing stable pods with canary version...`);

    // Calculate remaining pods to update
    const remainingPods = config.replicas - canaryPods.length;

    for (let i = 0; i < remainingPods; i++) {
      const podName = `${config.application}-stable-${i}`;
      const pod = await this.updatePod(podName, config, deploymentId);

      const ready = await this.waitForPodReady(pod, config, deploymentId);
      if (!ready) {
        throw new Error(`Pod ${podName} failed to become ready during finalization`);
      }

      // Update progress
      const progress = 95 + Math.round(((i + 1) / remainingPods) * 5);
      this.updateDeploymentStatus(deploymentId, {
        progress_percent: progress
      });
    }

    // Remove canary label/pods
    console.log(`  Removing canary designation...`);
    await this.sleep(1000);

    console.log(`  Finalization completed`);
  }

  /**
   * Rollback canary deployment
   */
  async rollback(deploymentId: string, config?: RollbackConfig): Promise<void> {
    console.log(`\n=== Canary Deployment Rollback ===`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Reason: ${config?.reason || 'Manual rollback'}`);
    console.log(`===================================\n`);

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

    // Route all traffic to stable version
    console.log(`Routing 100% traffic to stable version...`);
    await this.sleep(2000);

    // Remove canary pods
    console.log(`Removing canary pods...`);
    await this.sleep(2000);

    this.addEvent(
      deploymentId,
      'Normal',
      'RollbackCompleted',
      'All traffic routed to stable version, canary pods removed'
    );

    console.log(`\nCanary rollback completed`);
    console.log(`===================================\n`);
  }
}
