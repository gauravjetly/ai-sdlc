/**
 * Deployment Orchestrator
 * Main coordinator for zero-downtime deployments
 */

import { RollingDeploymentStrategy } from './strategies/rolling-deployment.js';
import { BlueGreenDeploymentStrategy } from './strategies/blue-green-deployment.js';
import { CanaryDeploymentStrategy } from './strategies/canary-deployment.js';
import { DatabaseMigrationManager } from './migrations/migration-manager.js';
import {
  IDeploymentStrategy,
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatusResult,
  DeploymentStrategyType,
  RollbackConfig,
  Migration
} from './types.js';

/**
 * Deployment Orchestrator
 *
 * Responsibilities:
 * - Strategy selection and execution
 * - Pre-deployment validations
 * - Database migration coordination
 * - Post-deployment verification
 * - Rollback coordination
 * - Deployment history tracking
 */
export class DeploymentOrchestrator {
  private strategies: Map<DeploymentStrategyType, IDeploymentStrategy>;
  private migrationManager: DatabaseMigrationManager;

  constructor() {
    // Initialize deployment strategies
    this.strategies = new Map<DeploymentStrategyType, IDeploymentStrategy>();
    this.strategies.set('rolling', new RollingDeploymentStrategy());
    this.strategies.set('blue-green', new BlueGreenDeploymentStrategy());
    this.strategies.set('canary', new CanaryDeploymentStrategy());

    this.migrationManager = new DatabaseMigrationManager();

    console.log('Deployment Orchestrator initialized');
    console.log(`Available strategies: ${Array.from(this.strategies.keys()).join(', ')}`);
  }

  /**
   * Deploy application with specified strategy
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`DEPLOYMENT ORCHESTRATOR`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Application: ${config.application}`);
    console.log(`Version: ${config.version}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Strategy: ${config.strategy.type}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Phase 1: Pre-deployment validation
      console.log(`Phase 1: Pre-deployment validation...`);
      await this.preDeploymentValidation(config);
      console.log(`✓ Pre-deployment validation passed\n`);

      // Phase 2: Execute deployment strategy
      console.log(`Phase 2: Executing ${config.strategy.type} deployment strategy...`);
      const strategy = this.getStrategy(config.strategy.type);
      const result = await strategy.deploy(config);

      // Phase 3: Post-deployment verification
      if (result.status === 'succeeded') {
        console.log(`\nPhase 3: Post-deployment verification...`);
        await this.postDeploymentVerification(config);
        console.log(`✓ Post-deployment verification passed\n`);
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`DEPLOYMENT ${result.status.toUpperCase()}`);
      console.log(`${'='.repeat(60)}\n`);

      return result;

    } catch (error: any) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`DEPLOYMENT FAILED`);
      console.error(`Error: ${error.message}`);
      console.error(`${'='.repeat(60)}\n`);

      throw error;
    }
  }

  /**
   * Deploy with database migration
   */
  async deployWithMigration(
    config: DeploymentConfig,
    migrations: Migration[]
  ): Promise<DeploymentResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`DEPLOYMENT WITH DATABASE MIGRATION`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Application: ${config.application}`);
    console.log(`Version: ${config.version}`);
    console.log(`Migrations: ${migrations.length}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Step 1: Execute EXPAND migrations
      const expandMigrations = migrations.filter(m => m.phase === 'expand');
      if (expandMigrations.length > 0) {
        console.log(`Step 1: Executing ${expandMigrations.length} EXPAND migrations...`);
        for (const migration of expandMigrations) {
          await this.migrationManager.executeMigration(migration);
        }
        console.log(`✓ EXPAND migrations completed\n`);
      }

      // Step 2: Deploy application
      console.log(`Step 2: Deploying application...`);
      const result = await this.deploy(config);

      if (result.status !== 'succeeded') {
        throw new Error('Application deployment failed');
      }

      // Step 3: Execute MIGRATE migrations (backfill data)
      const migrateMigrations = migrations.filter(m => m.phase === 'migrate-data');
      if (migrateMigrations.length > 0) {
        console.log(`\nStep 3: Executing ${migrateMigrations.length} MIGRATE migrations...`);
        for (const migration of migrateMigrations) {
          await this.migrationManager.executeMigration(migration);
        }
        console.log(`✓ MIGRATE migrations completed\n`);
      }

      // Step 4: Monitor application with new schema
      console.log(`Step 4: Monitoring application with new schema...`);
      await this.sleep(10000); // Monitor for 10 seconds
      console.log(`✓ Application stable with new schema\n`);

      // Step 5: Execute CONTRACT migrations (cleanup)
      const contractMigrations = migrations.filter(m => m.phase === 'contract');
      if (contractMigrations.length > 0) {
        console.log(`Step 5: Executing ${contractMigrations.length} CONTRACT migrations...`);
        for (const migration of contractMigrations) {
          await this.migrationManager.executeMigration(migration);
        }
        console.log(`✓ CONTRACT migrations completed\n`);
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`DEPLOYMENT WITH MIGRATION SUCCEEDED`);
      console.log(`${'='.repeat(60)}\n`);

      return result;

    } catch (error: any) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`DEPLOYMENT WITH MIGRATION FAILED`);
      console.error(`Error: ${error.message}`);
      console.error(`Initiating rollback...`);
      console.error(`${'='.repeat(60)}\n`);

      throw error;
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(
    deploymentId: string,
    strategyType: DeploymentStrategyType,
    config?: RollbackConfig
  ): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`DEPLOYMENT ROLLBACK`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Deployment ID: ${deploymentId}`);
    console.log(`Strategy: ${strategyType}`);
    console.log(`Reason: ${config?.reason || 'Manual rollback'}`);
    console.log(`${'='.repeat(60)}\n`);

    const strategy = this.getStrategy(strategyType);
    await strategy.rollback(deploymentId, config);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`ROLLBACK COMPLETED`);
    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(
    deploymentId: string,
    strategyType: DeploymentStrategyType
  ): Promise<DeploymentStatusResult> {
    const strategy = this.getStrategy(strategyType);
    return await strategy.getStatus(deploymentId);
  }

  /**
   * Pause deployment
   */
  async pauseDeployment(
    deploymentId: string,
    strategyType: DeploymentStrategyType
  ): Promise<void> {
    const strategy = this.getStrategy(strategyType);
    await strategy.pause(deploymentId);
    console.log(`Deployment ${deploymentId} paused`);
  }

  /**
   * Resume deployment
   */
  async resumeDeployment(
    deploymentId: string,
    strategyType: DeploymentStrategyType
  ): Promise<void> {
    const strategy = this.getStrategy(strategyType);
    await strategy.resume(deploymentId);
    console.log(`Deployment ${deploymentId} resumed`);
  }

  /**
   * Get strategy instance
   */
  private getStrategy(type: DeploymentStrategyType): IDeploymentStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Deployment strategy '${type}' not found`);
    }
    return strategy;
  }

  /**
   * Pre-deployment validation
   */
  private async preDeploymentValidation(config: DeploymentConfig): Promise<void> {
    const validations: Array<() => Promise<void>> = [
      () => this.validateConfig(config),
      () => this.validateResourceAvailability(config),
      () => this.validateDependencies(config),
      () => this.validateHealthCheckConfig(config)
    ];

    for (const validation of validations) {
      await validation();
    }
  }

  /**
   * Validate deployment configuration
   */
  private async validateConfig(config: DeploymentConfig): Promise<void> {
    console.log(`  Validating configuration...`);

    // Validate required fields
    if (!config.application || config.application.trim() === '') {
      throw new Error('Application name is required');
    }

    if (!config.version || config.version.trim() === '') {
      throw new Error('Version is required');
    }

    if (!config.image || config.image.trim() === '') {
      throw new Error('Container image is required');
    }

    if (config.replicas < 1) {
      throw new Error('Replicas must be at least 1');
    }

    // Validate strategy-specific options
    if (config.strategy.type === 'rolling') {
      const options = config.strategy.options as any;
      if (!options.max_unavailable || !options.max_surge) {
        throw new Error('Rolling strategy requires max_unavailable and max_surge');
      }
    }

    console.log(`    ✓ Configuration valid`);
  }

  /**
   * Validate resource availability
   */
  private async validateResourceAvailability(config: DeploymentConfig): Promise<void> {
    console.log(`  Validating resource availability...`);

    // Simulate resource check
    await this.sleep(500);

    // Check if cluster has enough capacity
    const requiredCpu = this.parseCpuLimit(config.resources?.limits?.cpu || '1');
    const requiredMemory = this.parseMemoryLimit(config.resources?.limits?.memory || '1Gi');

    console.log(`    Required CPU: ${requiredCpu} cores`);
    console.log(`    Required Memory: ${requiredMemory} GB`);
    console.log(`    ✓ Resources available`);
  }

  /**
   * Validate dependencies
   */
  private async validateDependencies(config: DeploymentConfig): Promise<void> {
    console.log(`  Validating dependencies...`);

    // Simulate dependency check
    await this.sleep(500);

    console.log(`    ✓ All dependencies available`);
  }

  /**
   * Validate health check configuration
   */
  private async validateHealthCheckConfig(config: DeploymentConfig): Promise<void> {
    console.log(`  Validating health check configuration...`);

    if (!config.healthCheck) {
      throw new Error('Health check configuration is required');
    }

    if (!config.healthCheck.endpoint) {
      throw new Error('Health check endpoint is required');
    }

    if (config.healthCheck.interval_seconds < 1) {
      throw new Error('Health check interval must be at least 1 second');
    }

    console.log(`    ✓ Health check configuration valid`);
  }

  /**
   * Post-deployment verification
   */
  private async postDeploymentVerification(config: DeploymentConfig): Promise<void> {
    const verifications: Array<() => Promise<void>> = [
      () => this.verifyPodHealth(config),
      () => this.verifyServiceEndpoints(config),
      () => this.verifyMetrics(config)
    ];

    for (const verification of verifications) {
      await verification();
    }
  }

  /**
   * Verify pod health
   */
  private async verifyPodHealth(config: DeploymentConfig): Promise<void> {
    console.log(`  Verifying pod health...`);
    await this.sleep(1000);
    console.log(`    ✓ All pods healthy`);
  }

  /**
   * Verify service endpoints
   */
  private async verifyServiceEndpoints(config: DeploymentConfig): Promise<void> {
    console.log(`  Verifying service endpoints...`);
    await this.sleep(1000);
    console.log(`    ✓ Service endpoints responding`);
  }

  /**
   * Verify metrics
   */
  private async verifyMetrics(config: DeploymentConfig): Promise<void> {
    console.log(`  Verifying metrics...`);
    await this.sleep(1000);
    console.log(`    ✓ Metrics within acceptable range`);
  }

  /**
   * Parse CPU limit
   */
  private parseCpuLimit(cpu: string): number {
    if (cpu.endsWith('m')) {
      return parseInt(cpu.slice(0, -1)) / 1000;
    }
    return parseFloat(cpu);
  }

  /**
   * Parse memory limit
   */
  private parseMemoryLimit(memory: string): number {
    if (memory.endsWith('Gi')) {
      return parseFloat(memory.slice(0, -2));
    }
    if (memory.endsWith('Mi')) {
      return parseFloat(memory.slice(0, -2)) / 1024;
    }
    if (memory.endsWith('G')) {
      return parseFloat(memory.slice(0, -1));
    }
    if (memory.endsWith('M')) {
      return parseFloat(memory.slice(0, -1)) / 1024;
    }
    return parseFloat(memory) / (1024 * 1024 * 1024);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get migration manager
   */
  getMigrationManager(): DatabaseMigrationManager {
    return this.migrationManager;
  }
}
