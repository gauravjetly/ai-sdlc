/**
 * Deployment Orchestrator Tests
 */

import { DeploymentOrchestrator } from '../../deployment/deployment-orchestrator';
import {
  DeploymentConfig,
  HealthCheckConfig,
  RollingDeploymentOptions,
  BlueGreenDeploymentOptions,
  CanaryDeploymentOptions
} from '../../deployment/types';
import { MigrationExamples } from '../../deployment/migrations/migration-manager';

describe('DeploymentOrchestrator', () => {
  let orchestrator: DeploymentOrchestrator;

  beforeEach(() => {
    orchestrator = new DeploymentOrchestrator();
  });

  const createHealthCheck = (): HealthCheckConfig => ({
    endpoint: 'localhost',
    port: 8080,
    path: '/health',
    protocol: 'http',
    interval_seconds: 5,
    timeout_seconds: 3,
    failure_threshold: 3,
    success_threshold: 1
  });

  describe('deploy with rolling strategy', () => {
    it('should deploy with rolling strategy', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: '20%',
            progress_deadline_seconds: 600
          } as RollingDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('deploy with blue-green strategy', () => {
    it('should deploy with blue-green strategy', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'blue-green',
          options: {
            monitoring_period_seconds: 5,
            auto_rollback_on_error: true,
            cleanup_delay_seconds: 5
          } as BlueGreenDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      expect(result.status).toBe('succeeded');
    });
  });

  describe('deploy with canary strategy', () => {
    it('should deploy with canary strategy', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 10,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 25, duration_seconds: 2 },
              { traffic_percent: 100, duration_seconds: 0 }
            ],
            metrics: {
              error_rate_threshold: 0.05,
              latency_p99_threshold_ms: 1000,
              success_rate_threshold: 0.95
            },
            auto_promotion: true,
            auto_rollback: false
          } as CanaryDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      expect(result.status).toBe('succeeded');
    });
  });

  describe('deployWithMigration', () => {
    it('should deploy with database migrations', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.1.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.1.0',
        healthCheck: createHealthCheck(),
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
        MigrationExamples.backfillEmailData()
      ];

      const result = await orchestrator.deployWithMigration(config, migrations);

      expect(result.status).toBe('succeeded');
    });

    it('should execute migrations in correct order', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.2.0',
        environment: 'test',
        replicas: 3,
        image: 'test-app:1.2.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: 1,
            max_surge: 1,
            progress_deadline_seconds: 600
          } as RollingDeploymentOptions
        }
      };

      const migrations = [
        MigrationExamples.addEmailColumn(),
        MigrationExamples.backfillEmailData(),
        MigrationExamples.removeUserContactsTable()
      ];

      const result = await orchestrator.deployWithMigration(config, migrations);

      expect(result.status).toBe('succeeded');

      // Verify migration history
      const migrationManager = orchestrator.getMigrationManager();
      const history = migrationManager.getMigrationHistory();
      expect(history.length).toBe(3);
    });
  });

  describe('rollback', () => {
    it('should rollback rolling deployment', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: '20%',
            progress_deadline_seconds: 600
          } as RollingDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      await expect(
        orchestrator.rollback(result.deploymentId, 'rolling', {
          reason: 'Test rollback'
        })
      ).resolves.not.toThrow();
    });

    it('should rollback blue-green deployment', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'blue-green',
          options: {
            monitoring_period_seconds: 5,
            auto_rollback_on_error: true,
            cleanup_delay_seconds: 5
          } as BlueGreenDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      await expect(
        orchestrator.rollback(result.deploymentId, 'blue-green', {
          reason: 'Test rollback'
        })
      ).resolves.not.toThrow();
    });

    it('should rollback canary deployment', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 10,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 25, duration_seconds: 2 }
            ],
            metrics: {
              error_rate_threshold: 0.05,
              latency_p99_threshold_ms: 1000,
              success_rate_threshold: 0.95
            },
            auto_promotion: false,
            auto_rollback: false
          } as CanaryDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      await expect(
        orchestrator.rollback(result.deploymentId, 'canary', {
          reason: 'Test rollback'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getDeploymentStatus', () => {
    it('should get deployment status', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: '20%',
            progress_deadline_seconds: 600
          } as RollingDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      const status = await orchestrator.getDeploymentStatus(result.deploymentId, 'rolling');

      expect(status.deploymentId).toBe(result.deploymentId);
      expect(status.application).toBe('test-app');
      expect(status.version).toBe('1.0.0');
      expect(status.strategy).toBe('rolling');
    });
  });

  describe('pause and resume', () => {
    it('should pause deployment', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 20,  // Larger for longer deployment
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: 1,
            max_surge: 1,
            progress_deadline_seconds: 600
          } as RollingDeploymentOptions
        }
      };

      const deployPromise = orchestrator.deploy(config);
      const result = await deployPromise;

      await expect(
        orchestrator.pauseDeployment(result.deploymentId, 'rolling')
      ).resolves.not.toThrow();
    });

    it('should resume deployment', async () => {
      const config: DeploymentConfig = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 20,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: 1,
            max_surge: 1,
            progress_deadline_seconds: 600
          } as RollingDeploymentOptions
        }
      };

      const result = await orchestrator.deploy(config);

      // Can't pause completed deployment, but should not throw for resume
      await expect(
        orchestrator.resumeDeployment(result.deploymentId, 'rolling')
      ).rejects.toThrow();
    });
  });

  describe('validation', () => {
    it('should validate required configuration', async () => {
      const invalidConfig = {
        application: '',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: createHealthCheck(),
        strategy: {
          type: 'rolling' as const,
          options: {
            max_unavailable: '20%',
            max_surge: '20%',
            progress_deadline_seconds: 600
          }
        }
      };

      await expect(
        orchestrator.deploy(invalidConfig as DeploymentConfig)
      ).rejects.toThrow('Application name is required');
    });

    it('should validate health check configuration', async () => {
      const config: any = {
        application: 'test-app',
        version: '1.0.0',
        environment: 'test',
        replicas: 5,
        image: 'test-app:1.0.0',
        healthCheck: {
          endpoint: '',
          port: 8080,
          path: '/health',
          protocol: 'http',
          interval_seconds: 0,
          timeout_seconds: 3,
          failure_threshold: 3,
          success_threshold: 1
        },
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: '20%',
            progress_deadline_seconds: 600
          }
        }
      };

      await expect(
        orchestrator.deploy(config)
      ).rejects.toThrow();
    });
  });

  describe('getMigrationManager', () => {
    it('should return migration manager', () => {
      const migrationManager = orchestrator.getMigrationManager();
      expect(migrationManager).toBeDefined();
    });
  });
});
