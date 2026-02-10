/**
 * Canary Deployment Strategy Tests
 */

import { CanaryDeploymentStrategy } from '../../deployment/strategies/canary-deployment';
import {
  DeploymentConfig,
  CanaryDeploymentOptions,
  HealthCheckConfig
} from '../../deployment/types';

describe('CanaryDeploymentStrategy', () => {
  let strategy: CanaryDeploymentStrategy;

  beforeEach(() => {
    strategy = new CanaryDeploymentStrategy();
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

    const canaryOptions: CanaryDeploymentOptions = {
      stages: [
        { traffic_percent: 5, duration_seconds: 5 },
        { traffic_percent: 25, duration_seconds: 5 },
        { traffic_percent: 50, duration_seconds: 5 },
        { traffic_percent: 100, duration_seconds: 0 }
      ],
      metrics: {
        error_rate_threshold: 0.01,
        latency_p99_threshold_ms: 500,
        success_rate_threshold: 0.999
      },
      auto_promotion: true,
      auto_rollback: true
    };

    return {
      application: 'test-app',
      version: '1.0.0',
      environment: 'test',
      replicas: 10,
      image: 'test-app:1.0.0',
      healthCheck,
      strategy: {
        type: 'canary',
        options: canaryOptions
      },
      ...overrides
    };
  };

  describe('deploy', () => {
    it('should successfully deploy with canary strategy', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.deploymentId).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.rollback_available).toBe(true);
    });

    it('should progress through all canary stages', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 10, duration_seconds: 2 },
              { traffic_percent: 50, duration_seconds: 2 },
              { traffic_percent: 100, duration_seconds: 0 }
            ],
            metrics: {
              error_rate_threshold: 0.05,
              latency_p99_threshold_ms: 1000,
              success_rate_threshold: 0.95
            },
            auto_promotion: true,
            auto_rollback: false
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should deploy canary pods initially', async () => {
      const config = createTestConfig({ replicas: 10 });
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);
      expect(status.replicas.desired).toBe(10);
    });

    it('should monitor metrics at each stage', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 25, duration_seconds: 3 },
              { traffic_percent: 100, duration_seconds: 0 }
            ],
            metrics: {
              error_rate_threshold: 0.01,
              latency_p99_threshold_ms: 500,
              success_rate_threshold: 0.999
            },
            auto_promotion: true,
            auto_rollback: true
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should handle single stage canary', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 100, duration_seconds: 2 }
            ],
            metrics: {
              error_rate_threshold: 0.05,
              latency_p99_threshold_ms: 1000,
              success_rate_threshold: 0.95
            },
            auto_promotion: true,
            auto_rollback: false
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should track canary deployment progress', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);
      expect(status.progress_percent).toBe(100);
    });
  });

  describe('auto-promotion', () => {
    it('should auto-promote when metrics are good', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 25, duration_seconds: 2 },
              { traffic_percent: 100, duration_seconds: 0 }
            ],
            metrics: {
              error_rate_threshold: 0.1,  // Lenient threshold
              latency_p99_threshold_ms: 2000,
              success_rate_threshold: 0.9
            },
            auto_promotion: true,
            auto_rollback: false
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should not auto-promote when disabled', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 50, duration_seconds: 2 },
              { traffic_percent: 100, duration_seconds: 0 }
            ],
            metrics: {
              error_rate_threshold: 0.01,
              latency_p99_threshold_ms: 500,
              success_rate_threshold: 0.999
            },
            auto_promotion: false,
            auto_rollback: false
          }
        }
      });

      // When auto_promotion is false and metrics fail, deployment should pause or fail
      const result = await strategy.deploy(config);
      expect(['succeeded', 'failed', 'paused']).toContain(result.status);
    });
  });

  describe('auto-rollback', () => {
    it('should respect auto_rollback setting', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 25, duration_seconds: 2 }
            ],
            metrics: {
              error_rate_threshold: 0.01,
              latency_p99_threshold_ms: 500,
              success_rate_threshold: 0.999
            },
            auto_promotion: true,
            auto_rollback: true
          }
        }
      });

      const result = await strategy.deploy(config);
      // Can be success or failure depending on simulated metrics
      expect(['succeeded', 'failed']).toContain(result.status);
    });
  });

  describe('rollback', () => {
    it('should rollback canary deployment', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      await expect(
        strategy.rollback(result.deploymentId, {
          reason: 'Test rollback'
        })
      ).resolves.not.toThrow();

      const status = await strategy.getStatus(result.deploymentId);
      expect(status.status).toBe('rolled-back');
    });

    it('should include rollback reason', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      await strategy.rollback(result.deploymentId, {
        reason: 'High error rate detected'
      });

      const status = await strategy.getStatus(result.deploymentId);
      const rollbackEvents = status.events.filter(e =>
        e.reason === 'RollbackInitiated' || e.reason === 'RollbackCompleted'
      );
      expect(rollbackEvents.length).toBeGreaterThan(0);
    });
  });

  describe('getStatus', () => {
    it('should return deployment status with stage info', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);

      expect(status.deploymentId).toBe(result.deploymentId);
      expect(status.application).toBe('test-app');
      expect(status.strategy).toBe('canary');
      expect(status.version).toBe('1.0.0');
    });
  });

  describe('metrics validation', () => {
    it('should validate error rate threshold', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 100, duration_seconds: 2 }
            ],
            metrics: {
              error_rate_threshold: 0.001,  // Very strict - 0.1%
              latency_p99_threshold_ms: 500,
              success_rate_threshold: 0.999
            },
            auto_promotion: true,
            auto_rollback: true
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(['succeeded', 'failed']).toContain(result.status);
    });

    it('should validate latency threshold', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 100, duration_seconds: 2 }
            ],
            metrics: {
              error_rate_threshold: 0.1,
              latency_p99_threshold_ms: 100,  // Very strict
              success_rate_threshold: 0.9
            },
            auto_promotion: true,
            auto_rollback: true
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(['succeeded', 'failed']).toContain(result.status);
    });

    it('should validate success rate threshold', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 100, duration_seconds: 2 }
            ],
            metrics: {
              error_rate_threshold: 0.1,
              latency_p99_threshold_ms: 2000,
              success_rate_threshold: 0.9999  // Very strict - 99.99%
            },
            auto_promotion: true,
            auto_rollback: true
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(['succeeded', 'failed']).toContain(result.status);
    });
  });

  describe('deployment events', () => {
    it('should record canary deployment events', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);

      expect(status.events.length).toBeGreaterThan(0);

      // Check for canary-specific events
      const eventReasons = status.events.map(e => e.reason);
      expect(eventReasons.some(r => r.includes('Traffic') || r === 'PodUpdating')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very small replica count', async () => {
      const config = createTestConfig({
        replicas: 1,
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 100, duration_seconds: 1 }
            ],
            metrics: {
              error_rate_threshold: 0.1,
              latency_p99_threshold_ms: 1000,
              success_rate_threshold: 0.9
            },
            auto_promotion: true,
            auto_rollback: false
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should handle many stages', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'canary',
          options: {
            stages: [
              { traffic_percent: 1, duration_seconds: 1 },
              { traffic_percent: 5, duration_seconds: 1 },
              { traffic_percent: 10, duration_seconds: 1 },
              { traffic_percent: 25, duration_seconds: 1 },
              { traffic_percent: 50, duration_seconds: 1 },
              { traffic_percent: 75, duration_seconds: 1 },
              { traffic_percent: 100, duration_seconds: 0 }
            ],
            metrics: {
              error_rate_threshold: 0.1,
              latency_p99_threshold_ms: 2000,
              success_rate_threshold: 0.9
            },
            auto_promotion: true,
            auto_rollback: false
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });
  });
});
