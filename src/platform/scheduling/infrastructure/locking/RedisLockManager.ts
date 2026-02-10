/**
 * RedisLockManager
 *
 * Domain service for distributed lock management with retry logic.
 * Implements Redlock algorithm patterns with exponential backoff.
 * Follows Single Responsibility Principle - manages lock lifecycle.
 */

import { ILockRepository } from '../../domain/repositories/ILockRepository.js';
import { LockConfig } from '../../domain/value-objects/LockConfig.js';
import { LockResult, LockStatus } from '../../domain/value-objects/LockResult.js';

export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface RedisLockManagerConfig {
  repository: ILockRepository;
  logger?: ILogger;
  defaultConfig?: LockConfig;
  gracefulDegradation?: boolean; // Continue without locking if Redis unavailable
}

/**
 * Lock manager with automatic retry and backoff
 */
export class RedisLockManager {
  private readonly repository: ILockRepository;
  private readonly logger?: ILogger;
  private readonly defaultConfig: LockConfig;
  private readonly gracefulDegradation: boolean;
  private isHealthy: boolean = true;

  constructor(config: RedisLockManagerConfig) {
    this.repository = config.repository;
    this.logger = config.logger;
    this.defaultConfig = config.defaultConfig ?? LockConfig.default();
    this.gracefulDegradation = config.gracefulDegradation ?? false;

    // Initialize health check
    this.checkHealth().catch(() => {
      this.logger?.warn('Initial Redis health check failed');
    });
  }

  /**
   * Acquire a distributed lock with automatic retry
   */
  async acquire(
    resourceKey: string,
    holderId: string,
    config: LockConfig = this.defaultConfig
  ): Promise<LockResult> {
    // Check if Redis is healthy
    if (!this.isHealthy && this.gracefulDegradation) {
      this.logger?.warn('Redis unhealthy - lock acquisition skipped (graceful degradation)', {
        resourceKey,
        holderId,
      });
      return LockResult.failure(
        resourceKey,
        holderId,
        'Redis unavailable - graceful degradation enabled',
        0
      );
    }

    let lastError: Error | null = null;

    // Try to acquire lock with retries
    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      try {
        const lockId = await this.repository.acquire({
          resourceKey,
          holderId,
          ttlMs: config.ttlMs,
        });

        if (lockId) {
          this.logger?.debug('Lock acquired', {
            resourceKey,
            holderId,
            lockId,
            attempt,
            ttlMs: config.ttlMs,
          });

          return LockResult.success(
            lockId,
            resourceKey,
            holderId,
            config.ttlMs,
            attempt
          );
        }

        // Lock already held - check who owns it
        const info = await this.repository.getInfo(resourceKey);
        if (info && info.holderId === holderId) {
          this.logger?.warn('Lock already held by same holder', {
            resourceKey,
            holderId,
            lockId: info.lockId,
          });
          return LockResult.alreadyHeld(resourceKey, holderId, info.holderId);
        }

        // Lock held by another process - retry
        this.logger?.debug('Lock held by another process - retrying', {
          resourceKey,
          holderId,
          attempt,
          currentHolder: info?.holderId ?? 'unknown',
        });

        // Wait before retry (except on last attempt)
        if (attempt < config.maxRetries - 1) {
          const delay = config.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger?.error('Lock acquisition attempt failed', {
          resourceKey,
          holderId,
          attempt,
          error: lastError.message,
        });

        // Mark as unhealthy
        this.isHealthy = false;

        // If graceful degradation enabled, return failure
        if (this.gracefulDegradation) {
          return LockResult.failure(
            resourceKey,
            holderId,
            `Redis error: ${lastError.message}`,
            attempt
          );
        }

        // Wait before retry
        if (attempt < config.maxRetries - 1) {
          const delay = config.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.logger?.warn('Lock acquisition timed out', {
      resourceKey,
      holderId,
      retries: config.maxRetries,
      lastError: lastError?.message,
    });

    return LockResult.timeout(resourceKey, holderId, config.maxRetries);
  }

  /**
   * Release a distributed lock
   */
  async release(lockResult: LockResult): Promise<boolean> {
    if (!lockResult.isAcquired() || !lockResult.lockId) {
      this.logger?.warn('Attempted to release non-acquired lock', {
        resourceKey: lockResult.resourceKey,
        holderId: lockResult.holderId,
        status: lockResult.status,
      });
      return false;
    }

    try {
      const released = await this.repository.release({
        resourceKey: lockResult.resourceKey,
        lockId: lockResult.lockId,
        holderId: lockResult.holderId,
      });

      if (released) {
        this.logger?.debug('Lock released', {
          resourceKey: lockResult.resourceKey,
          holderId: lockResult.holderId,
          lockId: lockResult.lockId,
        });
      } else {
        this.logger?.warn('Lock release failed - may have expired', {
          resourceKey: lockResult.resourceKey,
          holderId: lockResult.holderId,
          lockId: lockResult.lockId,
        });
      }

      return released;
    } catch (error) {
      this.logger?.error('Lock release error', {
        resourceKey: lockResult.resourceKey,
        holderId: lockResult.holderId,
        lockId: lockResult.lockId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Mark as unhealthy
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Extend lock TTL for long-running operations
   */
  async extend(
    lockResult: LockResult,
    additionalTtlMs: number
  ): Promise<boolean> {
    if (!lockResult.isAcquired() || !lockResult.lockId) {
      this.logger?.warn('Attempted to extend non-acquired lock', {
        resourceKey: lockResult.resourceKey,
        holderId: lockResult.holderId,
      });
      return false;
    }

    try {
      const extended = await this.repository.extend({
        resourceKey: lockResult.resourceKey,
        lockId: lockResult.lockId,
        holderId: lockResult.holderId,
        additionalTtlMs,
      });

      if (extended) {
        this.logger?.debug('Lock extended', {
          resourceKey: lockResult.resourceKey,
          holderId: lockResult.holderId,
          lockId: lockResult.lockId,
          additionalTtlMs,
        });
      } else {
        this.logger?.warn('Lock extension failed', {
          resourceKey: lockResult.resourceKey,
          holderId: lockResult.holderId,
        });
      }

      return extended;
    } catch (error) {
      this.logger?.error('Lock extension error', {
        resourceKey: lockResult.resourceKey,
        holderId: lockResult.holderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Execute a function with automatic lock acquisition and release
   */
  async withLock<T>(
    resourceKey: string,
    holderId: string,
    fn: () => Promise<T>,
    config: LockConfig = this.defaultConfig
  ): Promise<{ result: T | null; lockResult: LockResult }> {
    const lockResult = await this.acquire(resourceKey, holderId, config);

    if (!lockResult.isAcquired()) {
      return { result: null, lockResult };
    }

    try {
      const result = await fn();
      return { result, lockResult };
    } finally {
      await this.release(lockResult);
    }
  }

  /**
   * Check if Redis connection is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const healthy = await this.repository.ping();
      this.isHealthy = healthy;
      return healthy;
    } catch (error) {
      this.isHealthy = false;
      this.logger?.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): { healthy: boolean; gracefulDegradation: boolean } {
    return {
      healthy: this.isHealthy,
      gracefulDegradation: this.gracefulDegradation,
    };
  }

  /**
   * Force release a lock (admin operation)
   */
  async forceRelease(resourceKey: string): Promise<boolean> {
    this.logger?.warn('Force releasing lock', { resourceKey });

    try {
      return await this.repository.forceRelease(resourceKey);
    } catch (error) {
      this.logger?.error('Force release failed', {
        resourceKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // --- Private Helpers ---

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
