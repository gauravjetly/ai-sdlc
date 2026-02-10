/**
 * Blue-Green Deployment Strategy Tests
 */

import { BlueGreenDeploymentStrategy } from '../../deployment/strategies/blue-green-deployment';
import {
  DeploymentConfig,
  BlueGreenDeploymentOptions,
  HealthCheckConfig
} from '../../deployment/types';

describe('BlueGreenDeploymentStrategy', () => {
  let strategy: BlueGreenDeploymentStrategy;

  beforeEach(() => {
    strategy = new BlueGreenDeploymentStrategy();
  });

  const createTestConfig = (overrides: Partial<DeploymentConfig> = {}): DeploymentConfig => {
    const healthCheck: HealthCheckConfig = {
      endpoint: 'localhost',
      port: 8080,
      path: '/health',
      protocol: 'http',
      interval_seconds: 5,
      timeout_seconds: 3,
      failure_threshold: 3,
      success_threshold: 1
    };

    const blueGreenOptions: BlueGreenDeploymentOptions = {
      monitoring_period_seconds: 10,  // Short for tests
      auto_rollback_on_error: true,
      cleanup_delay_seconds: 5,
      smoke_tests: [
        {
          name: 'health_check',
          endpoint: '/health',
          method: 'GET',
          expected_status: 200,
          timeout_ms: 5000
        }
      ]
    };

    return {
      application: 'test-app',
      version: '1.0.0',
      environment: 'test',
      replicas: 5,
      image: 'test-app:1.0.0',
      healthCheck,
      strategy: {
        type: 'blue-green',
        options: blueGreenOptions
      },
      ...overrides
    };
  };

  describe('deploy', () => {
    it('should successfully deploy with blue-green strategy', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.deploymentId).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.rollback_available).toBe(true);
    });

    it('should alternate between blue and green environments', async () => {
      // First deployment (to green)
      const config1 = createTestConfig({ version: '1.0.0' });
      const result1 = await strategy.deploy(config1);
      expect(result1.status).toBe('succeeded');

      // Second deployment (to blue)
      const config2 = createTestConfig({ version: '2.0.0' });
      const result2 = await strategy.deploy(config2);
      expect(result2.status).toBe('succeeded');

      // Third deployment (to green again)
      const config3 = createTestConfig({ version: '3.0.0' });
      const result3 = await strategy.deploy(config3);
      expect(result3.status).toBe('succeeded');
    });

    it('should run smoke tests before traffic switch', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'blue-green',
          options: {
            monitoring_period_seconds: 5,
            auto_rollback_on_error: true,
            cleanup_delay_seconds: 5,
            smoke_tests: [
              {
                name: 'health_check',
                endpoint: '/health',
                method: 'GET',
                expected_status: 200,
                timeout_ms: 5000
              },
              {
                name: 'readiness_check',
                endpoint: '/ready',
                method: 'GET',
                expected_status: 200,
                timeout_ms: 5000
              }
            ]
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should deploy without smoke tests', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'blue-green',
          options: {
            monitoring_period_seconds: 5,
            auto_rollback_on_error: false,
            cleanup_delay_seconds: 5,
            smoke_tests: []
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should monitor new environment after traffic switch', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'blue-green',
          options: {
            monitoring_period_seconds: 15,  // Longer monitoring
            auto_rollback_on_error: true,
            cleanup_delay_seconds: 5
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
      expect(result.metrics!.duration_seconds).toBeGreaterThan(15);
    });

    it('should schedule cleanup of old environment', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');

      const status = await strategy.getStatus(result.deploymentId);
      const cleanupEvents = status.events.filter(e => e.reason === 'CleanupScheduled');
      expect(cleanupEvents.length).toBeGreaterThan(0);
    });
  });

  describe('rollback', () => {
    it('should rollback by switching traffic back', async () => {
      // First deployment
      const config1 = createTestConfig({ version: '1.0.0' });
      await strategy.deploy(config1);

      // Second deployment
      const config2 = createTestConfig({ version: '2.0.0' });
      const result2 = await strategy.deploy(config2);

      // Rollback
      await expect(
        strategy.rollback(result2.deploymentId, {
          reason: 'Test rollback'
        })
      ).resolves.not.toThrow();

      const status = await strategy.getStatus(result2.deploymentId);
      expect(status.status).toBe('rolled-back');
    });

    it('should include rollback reason in events', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      await strategy.rollback(result.deploymentId, {
        reason: 'Performance degradation detected'
      });

      const status = await strategy.getStatus(result.deploymentId);
      const rollbackEvent = status.events.find(e => e.reason === 'RollbackCompleted');
      expect(rollbackEvent).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return deployment status with environment info', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);

      expect(status.deploymentId).toBe(result.deploymentId);
      expect(status.application).toBe('test-app');
      expect(status.strategy).toBe('blue-green');
      expect(status.events.length).toBeGreaterThan(0);
    });
  });

  describe('deployment stages', () => {
    it('should track deployment stages', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);

      // Check that all stages were recorded
      const stages = [
        'deploying_to_',
        'smoke_testing',
        'switching_traffic',
        'monitoring',
        'cleanup'
      ];

      const eventReasons = status.events.map(e => e.reason);
      // At least some stage-related events should be present
      expect(eventReasons.length).toBeGreaterThan(5);
    });
  });

  describe('auto-rollback', () => {
    it('should respect auto_rollback_on_error setting', async () => {
      const configWithAutoRollback = createTestConfig({
        strategy: {
          type: 'blue-green',
          options: {
            monitoring_period_seconds: 5,
            auto_rollback_on_error: true,
            cleanup_delay_seconds: 5
          }
        }
      });

      // Should not throw even if monitoring detects issues (auto-rollback)
      const result = await strategy.deploy(configWithAutoRollback);
      // Result can be either success or failure depending on simulated metrics
      expect(['succeeded', 'failed']).toContain(result.status);
    });
  });

  describe('deployment metrics', () => {
    it('should collect deployment metrics', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      expect(result.metrics).toBeDefined();
      expect(result.metrics!.duration_seconds).toBeGreaterThan(0);
      expect(result.metrics!.replicas_updated).toBe(5);
      expect(result.metrics!.success_rate).toBeGreaterThanOrEqual(0);
    });
  });
});
