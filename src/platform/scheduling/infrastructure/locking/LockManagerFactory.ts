/**
 * LockManagerFactory
 *
 * Factory for creating configured lock manager instances.
 * Simplifies setup and provides sensible defaults.
 */

import type Redis from 'ioredis';
import { RedisLockRepository } from './RedisLockRepository.js';
import { RedisLockManager, ILogger } from './RedisLockManager.js';
import { LockConfig } from '../../domain/value-objects/LockConfig.js';

export interface LockManagerFactoryConfig {
  redis: Redis;
  keyPrefix?: string;
  instanceId?: string;
  logger?: ILogger;
  gracefulDegradation?: boolean;
  defaultConfig?: LockConfig;
}

/**
 * Factory for creating lock manager instances with sensible defaults
 */
export class LockManagerFactory {
  /**
   * Create a production-ready lock manager
   */
  static createProduction(config: LockManagerFactoryConfig): RedisLockManager {
    const repository = new RedisLockRepository({
      redis: config.redis,
      keyPrefix: config.keyPrefix ?? 'lock:',
      instanceId: config.instanceId,
    });

    return new RedisLockManager({
      repository,
      logger: config.logger,
      defaultConfig: config.defaultConfig ?? LockConfig.default(),
      gracefulDegradation: false, // Strict mode in production
    });
  }

  /**
   * Create a development lock manager with graceful degradation
   */
  static createDevelopment(config: LockManagerFactoryConfig): RedisLockManager {
    const repository = new RedisLockRepository({
      redis: config.redis,
      keyPrefix: config.keyPrefix ?? 'lock:dev:',
      instanceId: config.instanceId,
    });

    return new RedisLockManager({
      repository,
      logger: config.logger,
      defaultConfig: config.defaultConfig ?? LockConfig.forShortOperation(),
      gracefulDegradation: true, // Allow operation without Redis in dev
    });
  }

  /**
   * Create a lock manager for testing
   */
  static createTest(config: LockManagerFactoryConfig): RedisLockManager {
    const repository = new RedisLockRepository({
      redis: config.redis,
      keyPrefix: config.keyPrefix ?? 'lock:test:',
      instanceId: config.instanceId ?? 'test-instance',
    });

    return new RedisLockManager({
      repository,
      logger: config.logger,
      defaultConfig: new LockConfig({
        ttlMs: 5000,
        retryDelayMs: 50,
        maxRetries: 3,
        retryStrategy: 'constant',
      }),
      gracefulDegradation: false,
    });
  }

  /**
   * Create a lock manager from environment variables
   */
  static createFromEnv(redis: Redis, logger?: ILogger): RedisLockManager {
    const environment = process.env.NODE_ENV || 'development';
    const gracefulDegradation = process.env.LOCK_GRACEFUL_DEGRADATION === 'true';

    const config: LockManagerFactoryConfig = {
      redis,
      keyPrefix: process.env.LOCK_KEY_PREFIX ?? 'lock:',
      logger,
      gracefulDegradation,
    };

    if (environment === 'production') {
      return this.createProduction(config);
    } else if (environment === 'test') {
      return this.createTest(config);
    } else {
      return this.createDevelopment(config);
    }
  }
}
