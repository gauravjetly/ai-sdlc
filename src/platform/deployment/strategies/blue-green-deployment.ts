/**
 * Blue-Green Deployment Strategy
 * Maintains two identical environments (blue and green) with atomic traffic switching
 */

import { BaseDeploymentStrategy } from './base-strategy.js';
import {
  DeploymentConfig,
  DeploymentResult,
  BlueGreenDeploymentOptions,
  PodInfo,
  RollbackConfig,
  Environment,
  SmokeTest
} from '../types.js';

/**
 * Blue-Green deployment strategy implementation
 *
 * Features:
 * - Dual environment (blue = current, green = new)
 * - Atomic traffic cutover via load balancer
 * - Quick rollback capability (switch back to blue)
 * - Smoke tests before traffic switch
 * - Resource efficient cleanup after stabilization
 *
 * Best for: Critical production deployments, database-dependent apps
 */
export class BlueGreenDeploymentStrategy extends BaseDeploymentStrategy {
  readonly name = 'blue-green' as const;

  // Track active environments
  private activeEnvironments: Map<string, Environment> = new Map(); // app -> environment

  /**
   * Deploy application using blue-green strategy
   *
   * Process:
   * 1. Identify current environment (blue)
   * 2. Deploy to green environment
   * 3. Run smoke tests on green
   * 4. Switch traffic atomically to green
   * 5. Monitor green environment
   * 6. Cleanup blue environment (after stabilization)
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = this.generateDeploymentId(config.application, config.version);
    const options = config.strategy.options as BlueGreenDeploymentOptions;

    // Determine current and target environments
    const currentEnv = this.activeEnvironments.get(config.application) || 'blue';
    const targetEnv: Environment = currentEnv === 'blue' ? 'green' : 'blue';

    console.log(`\n=== Blue-Green Deployment Started ===`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Application: ${config.application}`);
    console.log(`Version: ${config.version}`);
    console.log(`Current Environment: ${currentEnv}`);
    console.log(`Target Environment: ${targetEnv}`);
    console.log(`Replicas: ${config.replicas}`);
    console.log(`=======================================\n`);

    // Initialize deployment status
    this.initializeDeploymentStatus(deploymentId, config);

    try {
      // Phase 1: Deploy to target environment (green)
      console.log(`Phase 1: Deploying to ${targetEnv} environment...`);
      this.updateDeploymentStatus(deploymentId, {
        status: 'in-progress',
        current_stage: `deploying_to_${targetEnv}`,
        progress_percent: 10
      });

      const targetPods = await this.deployToEnvironment(
        targetEnv,
        config,
        deploymentId
      );

      console.log(`${targetEnv} environment deployed successfully\n`);

      // Phase 2: Run smoke tests
      console.log(`Phase 2: Running smoke tests on ${targetEnv}...`);
      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'smoke_testing',
        progress_percent: 40
      });

      await this.runSmokeTests(targetEnv, options.smoke_tests, deploymentId);
      console.log(`Smoke tests passed\n`);

      // Phase 3: Switch traffic atomically
      console.log(`Phase 3: Switching traffic to ${targetEnv}...`);
      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'switching_traffic',
        progress_percent: 60
      });

      await this.switchTraffic(currentEnv, targetEnv, config, deploymentId);
      console.log(`Traffic switched to ${targetEnv}\n`);

      // Update active environment
      this.activeEnvironments.set(config.application, targetEnv);

      // Phase 4: Monitor new environment
      console.log(`Phase 4: Monitoring ${targetEnv} environment...`);
      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'monitoring',
        progress_percent: 80
      });

      const monitoringSuccess = await this.monitorEnvironment(
        targetEnv,
        options.monitoring_period_seconds,
        config,
        deploymentId
      );

      if (!monitoringSuccess && options.auto_rollback_on_error) {
        console.error(`Monitoring detected issues, rolling back...`);
        await this.switchTraffic(targetEnv, currentEnv, config, deploymentId);
        this.activeEnvironments.set(config.application, currentEnv);
        throw new Error('Monitoring metrics exceeded thresholds');
      }

      console.log(`Monitoring completed successfully\n`);

      // Phase 5: Cleanup old environment
      console.log(`Phase 5: Scheduling cleanup of ${currentEnv} environment...`);
      this.updateDeploymentStatus(deploymentId, {
        current_stage: 'cleanup',
        progress_percent: 90
      });

      await this.scheduleCleanup(
        currentEnv,
        options.cleanup_delay_seconds,
        config,
        deploymentId
      );

      const duration = Date.now() - startTime;
      console.log(`\n=== Blue-Green Deployment Completed ===`);
      console.log(`Duration: ${Math.round(duration / 1000)}s`);
      console.log(`Active Environment: ${targetEnv}`);
      console.log(`=====================================\n`);

      return this.markDeploymentSucceeded(deploymentId, duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`\n=== Blue-Green Deployment Failed ===`);
      console.error(`Error: ${error.message}`);
      console.error(`Duration: ${Math.round(duration / 1000)}s`);
      console.error(`Active Environment: ${currentEnv}`);
      console.error(`=====================================\n`);

      return this.markDeploymentFailed(deploymentId, error.message, duration);
    }
  }

  /**
   * Deploy application to specific environment
   */
  private async deployToEnvironment(
    environment: Environment,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<PodInfo[]> {
    console.log(`  Creating ${config.replicas} pods in ${environment} environment...`);

    const pods: PodInfo[] = [];

    for (let i = 0; i < config.replicas; i++) {
      const podName = `${config.application}-${environment}-${i}`;
      const pod = await this.updatePod(podName, config, deploymentId);

      const ready = await this.waitForPodReady(pod, config, deploymentId);
      if (!ready) {
        throw new Error(`Pod ${podName} in ${environment} failed to become ready`);
      }

      pods.push(pod);

      // Update progress
      const progress = 10 + Math.round((i + 1) / config.replicas * 30);
      this.updateDeploymentStatus(deploymentId, {
        progress_percent: progress,
        replicas: {
          desired: config.replicas,
          current: i + 1,
          ready: i + 1,
          updated: i + 1
        }
      });
    }

    console.log(`  All ${pods.length} pods deployed and ready in ${environment}`);
    return pods;
  }

  /**
   * Run smoke tests on target environment
   */
  private async runSmokeTests(
    environment: Environment,
    smokeTests: SmokeTest[] | undefined,
    deploymentId: string
  ): Promise<void> {
    if (!smokeTests || smokeTests.length === 0) {
      console.log(`  No smoke tests configured, skipping...`);
      return;
    }

    console.log(`  Running ${smokeTests.length} smoke tests...`);

    for (const test of smokeTests) {
      console.log(`    Running test: ${test.name}`);
      this.addEvent(deploymentId, 'Normal', 'SmokeTestRunning', `Running smoke test: ${test.name}`);

      // Simulate smoke test execution
      await this.sleep(1000);

      // Simulate 95% success rate
      const success = Math.random() > 0.05;

      if (!success) {
        this.addEvent(deploymentId, 'Error', 'SmokeTestFailed', `Smoke test failed: ${test.name}`);
        throw new Error(`Smoke test failed: ${test.name}`);
      }

      console.log(`      ✓ ${test.name} passed`);
      this.addEvent(deploymentId, 'Normal', 'SmokeTestPassed', `Smoke test passed: ${test.name}`);
    }

    console.log(`  All smoke tests passed`);
  }

  /**
   * Switch traffic from one environment to another atomically
   */
  private async switchTraffic(
    from: Environment,
    to: Environment,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<void> {
    console.log(`  Switching traffic: ${from} -> ${to}`);

    this.addEvent(
      deploymentId,
      'Normal',
      'TrafficSwitching',
      `Switching traffic from ${from} to ${to}`
    );

    // Simulate atomic traffic switch via load balancer/service mesh
    // In real implementation, this would update:
    // - Kubernetes Service selector
    // - AWS ALB target group
    // - Istio VirtualService
    // - etc.

    await this.sleep(2000); // Simulate switch time

    console.log(`  Traffic switched successfully`);

    this.addEvent(
      deploymentId,
      'Normal',
      'TrafficSwitched',
      `Traffic now directed to ${to} environment`
    );
  }

  /**
   * Monitor environment after traffic switch
   */
  private async monitorEnvironment(
    environment: Environment,
    durationSeconds: number,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<boolean> {
    console.log(`  Monitoring ${environment} for ${durationSeconds} seconds...`);

    const checkInterval = 10000; // Check every 10 seconds
    const checks = Math.floor(durationSeconds / (checkInterval / 1000));

    for (let i = 0; i < checks; i++) {
      await this.sleep(checkInterval);

      // Check if paused
      await this.checkPaused(deploymentId);

      // Simulate metric collection
      const metrics = await this.collectMetrics(environment);

      console.log(`    Check ${i + 1}/${checks}: Error rate: ${(metrics.errorRate * 100).toFixed(2)}%, ` +
        `Latency P99: ${metrics.latencyP99}ms, Success rate: ${(metrics.successRate * 100).toFixed(2)}%`);

      // Check thresholds
      if (metrics.errorRate > 0.05) { // 5% error rate threshold
        console.error(`    Error rate exceeded threshold: ${(metrics.errorRate * 100).toFixed(2)}%`);
        this.addEvent(
          deploymentId,
          'Error',
          'MetricsThresholdExceeded',
          `Error rate exceeded threshold: ${(metrics.errorRate * 100).toFixed(2)}%`
        );
        return false;
      }

      if (metrics.latencyP99 > 1000) { // 1000ms threshold
        console.error(`    Latency exceeded threshold: ${metrics.latencyP99}ms`);
        this.addEvent(
          deploymentId,
          'Error',
          'MetricsThresholdExceeded',
          `Latency P99 exceeded threshold: ${metrics.latencyP99}ms`
        );
        return false;
      }

      if (metrics.successRate < 0.99) { // 99% success rate threshold
        console.error(`    Success rate below threshold: ${(metrics.successRate * 100).toFixed(2)}%`);
        this.addEvent(
          deploymentId,
          'Error',
          'MetricsThresholdExceeded',
          `Success rate below threshold: ${(metrics.successRate * 100).toFixed(2)}%`
        );
        return false;
      }
    }

    console.log(`  Monitoring completed: All metrics within acceptable range`);
    return true;
  }

  /**
   * Collect metrics from environment
   */
  private async collectMetrics(environment: Environment): Promise<{
    errorRate: number;
    latencyP99: number;
    successRate: number;
  }> {
    // Simulate metric collection (in real implementation, query Prometheus/CloudWatch/etc.)
    return {
      errorRate: Math.random() * 0.02, // 0-2%
      latencyP99: 200 + Math.random() * 200, // 200-400ms
      successRate: 0.99 + Math.random() * 0.01 // 99-100%
    };
  }

  /**
   * Schedule cleanup of old environment
   */
  private async scheduleCleanup(
    environment: Environment,
    delaySeconds: number,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<void> {
    console.log(`  ${environment} environment will be cleaned up in ${delaySeconds} seconds`);

    this.addEvent(
      deploymentId,
      'Normal',
      'CleanupScheduled',
      `${environment} environment cleanup scheduled`
    );

    // In real implementation, this would schedule a cleanup job
    // For now, we'll simulate immediate cleanup after a short delay
    setTimeout(async () => {
      console.log(`  Cleaning up ${environment} environment...`);
      await this.cleanupEnvironment(environment, config, deploymentId);
    }, Math.min(delaySeconds * 1000, 5000)); // Cap at 5 seconds for demo
  }

  /**
   * Cleanup old environment
   */
  private async cleanupEnvironment(
    environment: Environment,
    config: DeploymentConfig,
    deploymentId: string
  ): Promise<void> {
    console.log(`  Removing ${config.replicas} pods from ${environment} environment...`);

    for (let i = 0; i < config.replicas; i++) {
      const podName = `${config.application}-${environment}-${i}`;
      console.log(`    Removing pod: ${podName}`);
      await this.sleep(100);
    }

    this.addEvent(
      deploymentId,
      'Normal',
      'CleanupCompleted',
      `${environment} environment cleaned up`
    );

    console.log(`  ${environment} environment cleaned up`);
  }

  /**
   * Rollback by switching traffic back to previous environment
   */
  async rollback(deploymentId: string, config?: RollbackConfig): Promise<void> {
    console.log(`\n=== Blue-Green Rollback ===`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Reason: ${config?.reason || 'Manual rollback'}`);
    console.log(`============================\n`);

    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const currentEnv = this.activeEnvironments.get(deployment.application);
    if (!currentEnv) {
      throw new Error('No active environment found');
    }

    const previousEnv: Environment = currentEnv === 'blue' ? 'green' : 'blue';

    console.log(`Switching traffic back: ${currentEnv} -> ${previousEnv}`);

    // Simulate traffic switch
    await this.sleep(2000);

    this.activeEnvironments.set(deployment.application, previousEnv);

    this.updateDeploymentStatus(deploymentId, {
      status: 'rolled-back'
    });

    this.addEvent(
      deploymentId,
      'Warning',
      'RollbackCompleted',
      `Traffic switched back to ${previousEnv} environment`
    );

    console.log(`\nRollback completed: Now serving from ${previousEnv} environment`);
    console.log(`============================\n`);
  }
}
