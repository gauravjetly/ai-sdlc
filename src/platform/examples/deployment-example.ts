/**
 * Deployment Strategies Example
 * Demonstrates rolling, blue-green, and canary deployments with database migrations
 */

import {
  DeploymentOrchestrator,
  DeploymentConfig,
  RollingDeploymentOptions,
  BlueGreenDeploymentOptions,
  CanaryDeploymentOptions,
  HealthCheckConfig
} from '../deployment/index.js';
import { MigrationExamples } from '../deployment/migrations/migration-manager.js';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Zero-Downtime Deployment Strategies Example              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const orchestrator = new DeploymentOrchestrator();

  // Common health check configuration
  const healthCheck: HealthCheckConfig = {
    endpoint: 'api.example.com',
    port: 8080,
    path: '/health',
    protocol: 'http',
    interval_seconds: 10,
    timeout_seconds: 5,
    failure_threshold: 3,
    success_threshold: 1,
    initial_delay_seconds: 15
  };

  // ==================== Example 1: Rolling Deployment ====================
  console.log('\n📦 Example 1: Rolling Deployment');
  console.log('─'.repeat(60));
  console.log('Best for: General-purpose deployments, stateless applications');
  console.log('Strategy: Update pods in batches with health checks\n');

  const rollingConfig: DeploymentConfig = {
    application: 'user-service',
    version: '1.2.0',
    environment: 'production',
    replicas: 10,
    image: 'user-service:1.2.0',
    namespace: 'production',
    healthCheck,
    resources: {
      requests: {
        cpu: '250m',
        memory: '256Mi'
      },
      limits: {
        cpu: '1',
        memory: '1Gi'
      }
    },
    strategy: {
      type: 'rolling',
      options: {
        max_unavailable: '20%',  // 2 pods at a time
        max_surge: '20%',        // 2 extra pods during rollout
        progress_deadline_seconds: 600,
        min_ready_seconds: 10
      } as RollingDeploymentOptions
    },
    environmentVariables: {
      'NODE_ENV': 'production',
      'LOG_LEVEL': 'info',
      'DB_POOL_SIZE': '20'
    }
  };

  try {
    const rollingResult = await orchestrator.deploy(rollingConfig);
    console.log(`\n✅ Rolling deployment ${rollingResult.status}`);
    console.log(`   Deployment ID: ${rollingResult.deploymentId}`);
    console.log(`   Duration: ${rollingResult.metrics?.duration_seconds}s`);
    console.log(`   Replicas updated: ${rollingResult.metrics?.replicas_updated}/${rollingResult.metrics?.replicas_total}`);
  } catch (error: any) {
    console.error(`\n❌ Rolling deployment failed: ${error.message}`);
  }

  // ==================== Example 2: Blue-Green Deployment ====================
  console.log('\n\n🔵🟢 Example 2: Blue-Green Deployment');
  console.log('─'.repeat(60));
  console.log('Best for: Critical production deployments, quick rollback needed');
  console.log('Strategy: Maintain two environments, atomic traffic switch\n');

  const blueGreenConfig: DeploymentConfig = {
    application: 'payment-service',
    version: '2.1.0',
    environment: 'production',
    replicas: 8,
    image: 'payment-service:2.1.0',
    namespace: 'production',
    healthCheck,
    resources: {
      requests: {
        cpu: '500m',
        memory: '512Mi'
      },
      limits: {
        cpu: '2',
        memory: '2Gi'
      }
    },
    strategy: {
      type: 'blue-green',
      options: {
        monitoring_period_seconds: 300,  // 5 minutes
        auto_rollback_on_error: true,
        cleanup_delay_seconds: 3600,     // 1 hour
        smoke_tests: [
          {
            name: 'health_check',
            endpoint: '/health',
            method: 'GET',
            expected_status: 200,
            timeout_ms: 5000
          },
          {
            name: 'payment_processing',
            endpoint: '/api/v1/payments/test',
            method: 'POST',
            expected_status: 200,
            timeout_ms: 10000,
            body: { amount: 1, currency: 'USD', test: true }
          }
        ]
      } as BlueGreenDeploymentOptions
    },
    environmentVariables: {
      'NODE_ENV': 'production',
      'PAYMENT_GATEWAY_URL': 'https://gateway.example.com'
    }
  };

  try {
    const blueGreenResult = await orchestrator.deploy(blueGreenConfig);
    console.log(`\n✅ Blue-green deployment ${blueGreenResult.status}`);
    console.log(`   Deployment ID: ${blueGreenResult.deploymentId}`);
    console.log(`   Duration: ${blueGreenResult.metrics?.duration_seconds}s`);
  } catch (error: any) {
    console.error(`\n❌ Blue-green deployment failed: ${error.message}`);
  }

  // ==================== Example 3: Canary Deployment ====================
  console.log('\n\n🐤 Example 3: Canary Deployment');
  console.log('─'.repeat(60));
  console.log('Best for: High-risk deployments, gradual rollout with monitoring');
  console.log('Strategy: Progressive traffic rollout with metric validation\n');

  const canaryConfig: DeploymentConfig = {
    application: 'recommendation-service',
    version: '3.0.0',
    environment: 'production',
    replicas: 20,
    image: 'recommendation-service:3.0.0',
    namespace: 'production',
    healthCheck,
    resources: {
      requests: {
        cpu: '250m',
        memory: '512Mi'
      },
      limits: {
        cpu: '1',
        memory: '2Gi'
      }
    },
    strategy: {
      type: 'canary',
      options: {
        stages: [
          { traffic_percent: 5, duration_seconds: 600 },    // 5% for 10 min
          { traffic_percent: 25, duration_seconds: 600 },   // 25% for 10 min
          { traffic_percent: 50, duration_seconds: 600 },   // 50% for 10 min
          { traffic_percent: 100, duration_seconds: 0 }     // 100%
        ],
        metrics: {
          error_rate_threshold: 0.01,        // 1% error rate
          latency_p99_threshold_ms: 500,     // 500ms P99 latency
          success_rate_threshold: 0.999,     // 99.9% success rate
          request_duration_seconds: 60
        },
        auto_promotion: true,
        auto_rollback: true
      } as CanaryDeploymentOptions
    },
    environmentVariables: {
      'NODE_ENV': 'production',
      'ML_MODEL_VERSION': 'v3.0'
    }
  };

  try {
    const canaryResult = await orchestrator.deploy(canaryConfig);
    console.log(`\n✅ Canary deployment ${canaryResult.status}`);
    console.log(`   Deployment ID: ${canaryResult.deploymentId}`);
    console.log(`   Duration: ${canaryResult.metrics?.duration_seconds}s`);
    console.log(`   Success rate: ${(canaryResult.metrics?.success_rate! * 100).toFixed(2)}%`);
  } catch (error: any) {
    console.error(`\n❌ Canary deployment failed: ${error.message}`);
  }

  // ==================== Example 4: Deployment with Database Migration ====================
  console.log('\n\n💾 Example 4: Deployment with Database Migration');
  console.log('─'.repeat(60));
  console.log('Best for: Deployments requiring schema changes');
  console.log('Strategy: Expand-contract pattern for zero-downtime migrations\n');

  const migrationConfig: DeploymentConfig = {
    application: 'user-service',
    version: '1.3.0',
    environment: 'production',
    replicas: 10,
    image: 'user-service:1.3.0',
    namespace: 'production',
    healthCheck,
    resources: {
      requests: {
        cpu: '250m',
        memory: '256Mi'
      },
      limits: {
        cpu: '1',
        memory: '1Gi'
      }
    },
    strategy: {
      type: 'rolling',
      options: {
        max_unavailable: '20%',
        max_surge: '20%',
        progress_deadline_seconds: 600
      } as RollingDeploymentOptions
    }
  };

  const migrations = [
    MigrationExamples.addEmailColumn(),
    MigrationExamples.backfillEmailData(),
    MigrationExamples.removeUserContactsTable()
  ];

  try {
    const migrationResult = await orchestrator.deployWithMigration(migrationConfig, migrations);
    console.log(`\n✅ Deployment with migration ${migrationResult.status}`);
    console.log(`   Deployment ID: ${migrationResult.deploymentId}`);
    console.log(`   Migrations executed: ${migrations.length}`);
    console.log(`   Duration: ${migrationResult.metrics?.duration_seconds}s`);
  } catch (error: any) {
    console.error(`\n❌ Deployment with migration failed: ${error.message}`);
  }

  // ==================== Example 5: Rollback ====================
  console.log('\n\n⏪ Example 5: Rollback Demonstration');
  console.log('─'.repeat(60));
  console.log('Demonstrating rollback capability\n');

  // Deploy version 1.0.0
  const v1Config: DeploymentConfig = {
    application: 'api-gateway',
    version: '1.0.0',
    environment: 'production',
    replicas: 5,
    image: 'api-gateway:1.0.0',
    healthCheck,
    strategy: {
      type: 'rolling',
      options: {
        max_unavailable: '20%',
        max_surge: '20%',
        progress_deadline_seconds: 600
      } as RollingDeploymentOptions
    }
  };

  // Deploy version 2.0.0
  const v2Config: DeploymentConfig = {
    ...v1Config,
    version: '2.0.0',
    image: 'api-gateway:2.0.0'
  };

  try {
    console.log('Deploying v1.0.0...');
    await orchestrator.deploy(v1Config);

    console.log('Deploying v2.0.0...');
    const v2Result = await orchestrator.deploy(v2Config);

    console.log(`\nSimulating issue with v2.0.0, rolling back...`);
    await orchestrator.rollback(v2Result.deploymentId, 'rolling', {
      reason: 'High error rate detected in production'
    });

    console.log(`\n✅ Rollback completed successfully`);
  } catch (error: any) {
    console.error(`\n❌ Rollback demonstration failed: ${error.message}`);
  }

  // ==================== Summary ====================
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Deployment Strategy Recommendations                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Choose the right strategy:');
  console.log('');
  console.log('  ROLLING:');
  console.log('    ✓ General-purpose deployments');
  console.log('    ✓ Stateless applications');
  console.log('    ✓ Resource-efficient (no duplication)');
  console.log('    ✗ Rollback takes time');
  console.log('');
  console.log('  BLUE-GREEN:');
  console.log('    ✓ Critical production systems');
  console.log('    ✓ Instant rollback capability');
  console.log('    ✓ Database-dependent applications');
  console.log('    ✗ Requires 2x resources temporarily');
  console.log('');
  console.log('  CANARY:');
  console.log('    ✓ High-risk deployments');
  console.log('    ✓ User-facing services');
  console.log('    ✓ A/B testing scenarios');
  console.log('    ✓ Progressive rollout with validation');
  console.log('    ✗ Longer deployment time');
  console.log('');
  console.log('  WITH MIGRATION:');
  console.log('    ✓ Schema changes required');
  console.log('    ✓ Zero-downtime migrations');
  console.log('    ✓ Supports N and N-1 compatibility');
  console.log('    ✗ Requires careful planning');
  console.log('');
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runDeploymentExamples };
