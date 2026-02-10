/**
 * Integration tests for Redis-based distributed locking
 *
 * These tests require a running Redis instance.
 * Set REDIS_URL environment variable or use default: redis://localhost:6379
 */

import Redis from 'ioredis';
import { RedisLockRepository } from '../../../../src/platform/scheduling/infrastructure/locking/RedisLockRepository';
import { RedisLockManager } from '../../../../src/platform/scheduling/infrastructure/locking/RedisLockManager';
import { LockConfig } from '../../../../src/platform/scheduling/domain/value-objects/LockConfig';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

describe('Redis Lock Integration', () => {
  let redis: Redis;
  let repository: RedisLockRepository;
  let manager: RedisLockManager;

  beforeAll(async () => {
    redis = new Redis(REDIS_URL);

    // Wait for connection
    await redis.ping();
  });

  beforeEach(async () => {
    // Clean up any existing locks
    const keys = await redis.keys('lock:test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    repository = new RedisLockRepository({
      redis,
      keyPrefix: 'lock:test:',
    });

    manager = new RedisLockManager({
      repository,
      defaultConfig: LockConfig.forShortOperation(),
    });
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('Basic lock operations', () => {
    it('should acquire and release lock', async () => {
      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 5000,
      });

      expect(lockId).toBeDefined();
      expect(lockId).not.toBeNull();

      const released = await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lockId!,
        holderId: 'project:proj-1',
      });

      expect(released).toBe(true);
    });

    it('should prevent concurrent lock acquisition', async () => {
      const lock1 = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 5000,
      });

      expect(lock1).not.toBeNull();

      const lock2 = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-2',
        ttlMs: 5000,
      });

      expect(lock2).toBeNull();

      // Release first lock
      await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lock1!,
        holderId: 'project:proj-1',
      });

      // Now second project can acquire
      const lock3 = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-2',
        ttlMs: 5000,
      });

      expect(lock3).not.toBeNull();

      await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lock3!,
        holderId: 'project:proj-2',
      });
    });

    it('should auto-expire locks after TTL', async () => {
      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 100, // 100ms
      });

      expect(lockId).not.toBeNull();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be able to acquire now
      const lock2 = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-2',
        ttlMs: 5000,
      });

      expect(lock2).not.toBeNull();

      await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lock2!,
        holderId: 'project:proj-2',
      });
    });

    it('should extend lock TTL', async () => {
      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 200, // 200ms
      });

      expect(lockId).not.toBeNull();

      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));

      // Extend by another 200ms
      const extended = await repository.extend({
        resourceKey: 'agent:agent-1',
        lockId: lockId!,
        holderId: 'project:proj-1',
        additionalTtlMs: 200,
      });

      expect(extended).toBe(true);

      // Wait another 100ms (total 200ms, should still be locked)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Lock should still exist
      const exists = await repository.exists('agent:agent-1');
      expect(exists).toBe(true);

      await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lockId!,
        holderId: 'project:proj-1',
      });
    });

    it('should get lock info', async () => {
      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 5000,
      });

      const info = await repository.getInfo('agent:agent-1');

      expect(info).toBeDefined();
      expect(info!.lockId).toBe(lockId);
      expect(info!.holderId).toBe('project:proj-1');
      expect(info!.resourceKey).toBe('agent:agent-1');
      expect(info!.acquiredAt).toBeInstanceOf(Date);
      expect(info!.expiresAt).toBeInstanceOf(Date);

      await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lockId!,
        holderId: 'project:proj-1',
      });
    });

    it('should force release lock', async () => {
      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 5000,
      });

      expect(lockId).not.toBeNull();

      const forced = await repository.forceRelease('agent:agent-1');
      expect(forced).toBe(true);

      // Should be able to acquire now
      const lock2 = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-2',
        ttlMs: 5000,
      });

      expect(lock2).not.toBeNull();

      await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: lock2!,
        holderId: 'project:proj-2',
      });
    });
  });

  describe('RedisLockManager integration', () => {
    it('should acquire and release with manager', async () => {
      const result = await manager.acquire('agent:agent-1', 'project:proj-1');

      expect(result.isAcquired()).toBe(true);
      expect(result.lockId).toBeDefined();

      const released = await manager.release(result);
      expect(released).toBe(true);
    });

    it('should retry until lock becomes available', async () => {
      // Acquire lock with short TTL
      const result1 = await manager.acquire(
        'agent:agent-1',
        'project:proj-1',
        new LockConfig({ ttlMs: 200, retryDelayMs: 50, maxRetries: 1 })
      );

      expect(result1.isAcquired()).toBe(true);

      // Try to acquire same lock with retry - should wait and succeed
      const result2Promise = manager.acquire(
        'agent:agent-1',
        'project:proj-2',
        new LockConfig({ ttlMs: 5000, retryDelayMs: 50, maxRetries: 5 })
      );

      // Wait for first lock to expire
      await new Promise(resolve => setTimeout(resolve, 250));

      const result2 = await result2Promise;

      expect(result2.isAcquired()).toBe(true);

      await manager.release(result2);
    });

    it('should execute function with lock using withLock', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const { result, lockResult } = await manager.withLock(
        'agent:agent-1',
        'project:proj-1',
        mockFn
      );

      expect(result).toBe('success');
      expect(lockResult.isAcquired()).toBe(true);
      expect(mockFn).toHaveBeenCalled();

      // Lock should be released
      const exists = await repository.exists('agent:agent-1');
      expect(exists).toBe(false);
    });

    it('should release lock even if function throws', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        manager.withLock('agent:agent-1', 'project:proj-1', mockFn)
      ).rejects.toThrow('Test error');

      // Lock should still be released
      const exists = await repository.exists('agent:agent-1');
      expect(exists).toBe(false);
    });
  });

  describe('Concurrent operations simulation', () => {
    it('should handle multiple concurrent lock attempts', async () => {
      const concurrency = 10;
      const resourceKey = 'agent:agent-1';

      // Try to acquire same lock from multiple "projects"
      const promises = Array.from({ length: concurrency }, (_, i) =>
        manager.acquire(
          resourceKey,
          `project:proj-${i}`,
          new LockConfig({ ttlMs: 1000, retryDelayMs: 20, maxRetries: 3 })
        )
      );

      const results = await Promise.all(promises);

      // Only one should succeed
      const acquired = results.filter(r => r.isAcquired());
      expect(acquired.length).toBe(1);

      // Others should have timed out
      const failed = results.filter(r => r.isFailed());
      expect(failed.length).toBe(concurrency - 1);

      // Clean up
      for (const result of acquired) {
        await manager.release(result);
      }
    });

    it('should handle sequential acquisitions correctly', async () => {
      const iterations = 5;
      const resourceKey = 'agent:agent-1';

      for (let i = 0; i < iterations; i++) {
        const result = await manager.acquire(
          resourceKey,
          `project:proj-${i}`,
          LockConfig.forShortOperation()
        );

        expect(result.isAcquired()).toBe(true);

        await manager.release(result);
      }
    });
  });

  describe('Health checks', () => {
    it('should check Redis health', async () => {
      const healthy = await manager.checkHealth();
      expect(healthy).toBe(true);
    });

    it('should return health status', () => {
      const status = manager.getHealthStatus();
      expect(status.healthy).toBe(true);
      expect(status.gracefulDegradation).toBe(false);
    });
  });
});
