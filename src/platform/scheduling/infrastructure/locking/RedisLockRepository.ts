/**
 * RedisLockRepository
 *
 * Redis-based implementation of distributed locking using Redlock algorithm.
 * Uses Redis SET with NX (only set if not exists) and PX (expiration) options.
 */

import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ILockRepository,
  AcquireLockParams,
  ReleaseLockParams,
  ExtendLockParams,
  LockInfo,
} from '../../domain/repositories/ILockRepository.js';

/**
 * Lua script for safe lock release (atomic check-and-delete)
 * Only releases if the lock value matches the holder's lockId
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Lua script for safe lock extension (atomic check-and-extend)
 * Only extends if the lock value matches the holder's lockId
 */
const EXTEND_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`;

export interface RedisLockRepositoryConfig {
  redis: Redis;
  keyPrefix?: string;
  instanceId?: string;
}

export class RedisLockRepository implements ILockRepository {
  private readonly redis: Redis;
  private readonly keyPrefix: string;
  private readonly instanceId: string;

  constructor(config: RedisLockRepositoryConfig) {
    this.redis = config.redis;
    this.keyPrefix = config.keyPrefix ?? 'lock:';
    this.instanceId = config.instanceId ?? this.generateInstanceId();
  }

  /**
   * Acquire a lock using Redis SET NX PX
   */
  async acquire(params: AcquireLockParams): Promise<string | null> {
    const { resourceKey, holderId, ttlMs } = params;
    const key = this.buildKey(resourceKey);
    const lockId = this.generateLockId();
    const lockValue = this.buildLockValue(lockId, holderId);

    try {
      // SET key value NX PX milliseconds
      // NX: Only set if key does not exist
      // PX: Set expiration in milliseconds
      const result = await this.redis.set(key, lockValue, 'PX', ttlMs, 'NX');

      if (result === 'OK') {
        return lockId;
      }

      return null; // Lock already held by another process
    } catch (error) {
      throw new Error(
        `Failed to acquire lock for ${resourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Release a lock using Lua script for atomicity
   */
  async release(params: ReleaseLockParams): Promise<boolean> {
    const { resourceKey, lockId, holderId } = params;
    const key = this.buildKey(resourceKey);
    const lockValue = this.buildLockValue(lockId, holderId);

    try {
      // Execute Lua script to atomically check and delete
      const result = await this.redis.eval(
        RELEASE_SCRIPT,
        1,
        key,
        lockValue
      );

      return result === 1;
    } catch (error) {
      throw new Error(
        `Failed to release lock for ${resourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extend lock TTL using Lua script for atomicity
   */
  async extend(params: ExtendLockParams): Promise<boolean> {
    const { resourceKey, lockId, holderId, additionalTtlMs } = params;
    const key = this.buildKey(resourceKey);
    const lockValue = this.buildLockValue(lockId, holderId);

    try {
      // Execute Lua script to atomically check and extend
      const result = await this.redis.eval(
        EXTEND_SCRIPT,
        1,
        key,
        lockValue,
        additionalTtlMs.toString()
      );

      return result === 1;
    } catch (error) {
      throw new Error(
        `Failed to extend lock for ${resourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a lock exists
   */
  async exists(resourceKey: string): Promise<boolean> {
    const key = this.buildKey(resourceKey);
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      throw new Error(
        `Failed to check lock existence for ${resourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get lock information
   */
  async getInfo(resourceKey: string): Promise<LockInfo | null> {
    const key = this.buildKey(resourceKey);

    try {
      // Get lock value and TTL atomically using pipeline
      const pipeline = this.redis.pipeline();
      pipeline.get(key);
      pipeline.pttl(key);

      const results = await pipeline.exec();

      if (!results || results.length !== 2) {
        return null;
      }

      const [getErr, lockValue] = results[0];
      const [ttlErr, ttl] = results[1];

      if (getErr || ttlErr || !lockValue || ttl === -2) {
        return null; // Lock doesn't exist
      }

      const { lockId, holderId } = this.parseLockValue(lockValue as string);
      const now = new Date();
      const ttlMs = typeof ttl === 'number' ? ttl : 0;

      return {
        resourceKey,
        lockId,
        holderId,
        acquiredAt: new Date(now.getTime() - ttlMs), // Approximation
        expiresAt: new Date(now.getTime() + ttlMs),
      };
    } catch (error) {
      throw new Error(
        `Failed to get lock info for ${resourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Force release a lock (admin operation)
   */
  async forceRelease(resourceKey: string): Promise<boolean> {
    const key = this.buildKey(resourceKey);
    try {
      const result = await this.redis.del(key);
      return result === 1;
    } catch (error) {
      throw new Error(
        `Failed to force release lock for ${resourceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // --- Private Helpers ---

  private buildKey(resourceKey: string): string {
    return `${this.keyPrefix}${resourceKey}`;
  }

  private generateLockId(): string {
    return uuidv4();
  }

  private generateInstanceId(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private buildLockValue(lockId: string, holderId: string): string {
    return JSON.stringify({
      lockId,
      holderId,
      instanceId: this.instanceId,
      timestamp: Date.now(),
    });
  }

  private parseLockValue(value: string): { lockId: string; holderId: string } {
    try {
      const parsed = JSON.parse(value);
      return {
        lockId: parsed.lockId,
        holderId: parsed.holderId,
      };
    } catch (error) {
      throw new Error('Invalid lock value format');
    }
  }
}
