/**
 * Rolling Deployment Strategy Tests
 */

import { RollingDeploymentStrategy } from '../../deployment/strategies/rolling-deployment';
import {
  DeploymentConfig,
  RollingDeploymentOptions,
  HealthCheckConfig
} from '../../deployment/types';

describe('RollingDeploymentStrategy', () => {
  let strategy: RollingDeploymentStrategy;

  beforeEach(() => {
    strategy = new RollingDeploymentStrategy();
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

    const rollingOptions: RollingDeploymentOptions = {
      max_unavailable: '20%',
      max_surge: '20%',
      progress_deadline_seconds: 600,
      min_ready_seconds: 10
    };

    return {
      application: 'test-app',
      version: '1.0.0',
      environment: 'test',
      replicas: 10,
      image: 'test-app:1.0.0',
      healthCheck,
      strategy: {
        type: 'rolling',
        options: rollingOptions
      },
      ...overrides
    };
  };

  describe('deploy', () => {
    it('should successfully deploy with rolling strategy', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.deploymentId).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.metrics).toBeDefined();
      expect(result.metrics!.replicas_updated).toBe(10);
      expect(result.rollback_available).toBe(true);
    });

    it('should deploy with percentage-based max unavailable', async () => {
      const config = createTestConfig({
        replicas: 10,
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: '20%',
            progress_deadline_seconds: 600
          }
        }
      });

      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.metrics!.replicas_total).toBe(10);
    });

    it('should deploy with numeric max unavailable', async () => {
      const config = createTestConfig({
        replicas: 10,
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: 2,
            max_surge: 2,
            progress_deadline_seconds: 600
          }
        }
      });

      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.metrics!.replicas_updated).toBe(10);
    });

    it('should deploy single replica', async () => {
      const config = createTestConfig({
        replicas: 1
      });

      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.metrics!.replicas_updated).toBe(1);
    });

    it('should handle large replica count', async () => {
      const config = createTestConfig({
        replicas: 50
      });

      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
      expect(result.metrics!.replicas_updated).toBe(50);
    });

    it('should track deployment progress', async () => {
      const config = createTestConfig();
      const deployPromise = strategy.deploy(config);

      // Allow some time for deployment to progress
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await deployPromise;

      expect(result.status).toBe('succeeded');
      expect(result.metrics!.duration_seconds).toBeGreaterThan(0);
    });

    it('should create surge pods when maxSurge > 0', async () => {
      const config = createTestConfig({
        replicas: 5,
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: '40%',
            progress_deadline_seconds: 600
          }
        }
      });

      const result = await strategy.deploy(config);

      expect(result.status).toBe('succeeded');
    });
  });

  describe('rollback', () => {
    it('should rollback deployment', async () => {
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

    it('should fail rollback for non-existent deployment', async () => {
      await expect(
        strategy.rollback('non-existent-deployment')
      ).rejects.toThrow('Deployment non-existent-deployment not found');
    });
  });

  describe('getStatus', () => {
    it('should return deployment status', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);

      expect(status.deploymentId).toBe(result.deploymentId);
      expect(status.application).toBe('test-app');
      expect(status.version).toBe('1.0.0');
      expect(status.strategy).toBe('rolling');
      expect(status.replicas.desired).toBe(10);
    });

    it('should fail for non-existent deployment', async () => {
      await expect(
        strategy.getStatus('non-existent')
      ).rejects.toThrow('Deployment non-existent not found');
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume deployment', async () => {
      const config = createTestConfig({
        replicas: 20  // Larger replica count for longer deployment
      });

      // Start deployment (don't await)
      const deployPromise = strategy.deploy(config);

      // Wait a bit for deployment to start
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get deployment ID from promise
      const result = await deployPromise;

      // Pause
      await strategy.pause(result.deploymentId);
      const pausedStatus = await strategy.getStatus(result.deploymentId);
      expect(pausedStatus.status).toBe('paused');

      // Resume
      await strategy.resume(result.deploymentId);
      const resumedStatus = await strategy.getStatus(result.deploymentId);
      expect(resumedStatus.status).toBe('in-progress');
    });

    it('should fail to pause completed deployment', async () => {
      const config = createTestConfig({ replicas: 1 });
      const result = await strategy.deploy(config);

      await expect(
        strategy.pause(result.deploymentId)
      ).rejects.toThrow('Cannot pause deployment in status: succeeded');
    });
  });

  describe('edge cases', () => {
    it('should handle zero surge pods', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '20%',
            max_surge: 0,
            progress_deadline_seconds: 600
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should handle 100% max unavailable', async () => {
      const config = createTestConfig({
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '100%',
            max_surge: 0,
            progress_deadline_seconds: 600
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });

    it('should handle very small replica count with percentages', async () => {
      const config = createTestConfig({
        replicas: 2,
        strategy: {
          type: 'rolling',
          options: {
            max_unavailable: '10%',  // Would be 0.2, should round up to 1
            max_surge: '10%',
            progress_deadline_seconds: 600
          }
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });
  });

  describe('deployment events', () => {
    it('should record deployment events', async () => {
      const config = createTestConfig();
      const result = await strategy.deploy(config);

      const status = await strategy.getStatus(result.deploymentId);

      expect(status.events).toBeDefined();
      expect(status.events.length).toBeGreaterThan(0);

      // Check for key events
      const eventReasons = status.events.map(e => e.reason);
      expect(eventReasons).toContain('DeploymentSucceeded');
    });
  });

  describe('health checks', () => {
    it('should respect health check configuration', async () => {
      const config = createTestConfig({
        healthCheck: {
          endpoint: 'localhost',
          port: 8080,
          path: '/health',
          protocol: 'http',
          interval_seconds: 1,
          timeout_seconds: 1,
          failure_threshold: 1,
          success_threshold: 1
        }
      });

      const result = await strategy.deploy(config);
      expect(result.status).toBe('succeeded');
    });
  });
});
