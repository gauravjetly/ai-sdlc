/**
 * Unit tests for RedisLockRepository
 */

import { RedisLockRepository } from '../../../../../src/platform/scheduling/infrastructure/locking/RedisLockRepository';
import type Redis from 'ioredis';

// Mock Redis
const createMockRedis = (): jest.Mocked<Redis> => {
  return {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    pttl: jest.fn(),
    eval: jest.fn(),
    pipeline: jest.fn(),
    ping: jest.fn(),
  } as unknown as jest.Mocked<Redis>;
};

describe('RedisLockRepository', () => {
  let mockRedis: jest.Mocked<Redis>;
  let repository: RedisLockRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    repository = new RedisLockRepository({
      redis: mockRedis,
      keyPrefix: 'lock:',
      instanceId: 'test-instance-123',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquire', () => {
    it('should acquire lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 30000,
      });

      expect(lockId).toBeDefined();
      expect(lockId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:agent:agent-1',
        expect.any(String),
        'PX',
        30000,
        'NX'
      );
    });

    it('should return null when lock already held', async () => {
      mockRedis.set.mockResolvedValue(null);

      const lockId = await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 30000,
      });

      expect(lockId).toBeNull();
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'));

      await expect(
        repository.acquire({
          resourceKey: 'agent:agent-1',
          holderId: 'project:proj-1',
          ttlMs: 30000,
        })
      ).rejects.toThrow('Failed to acquire lock for agent:agent-1: Redis connection error');
    });

    it('should use correct key prefix', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 30000,
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:agent:agent-1',
        expect.any(String),
        'PX',
        30000,
        'NX'
      );
    });

    it('should include holder and instance info in lock value', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await repository.acquire({
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        ttlMs: 30000,
      });

      const callArgs = mockRedis.set.mock.calls[0];
      const lockValue = JSON.parse(callArgs[1] as string);

      expect(lockValue).toHaveProperty('lockId');
      expect(lockValue).toHaveProperty('holderId', 'project:proj-1');
      expect(lockValue).toHaveProperty('instanceId', 'test-instance-123');
      expect(lockValue).toHaveProperty('timestamp');
    });
  });

  describe('release', () => {
    it('should release lock successfully', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const released = await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
      });

      expect(released).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get"'),
        1,
        'lock:agent:agent-1',
        expect.any(String)
      );
    });

    it('should return false when lock not owned', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const released = await repository.release({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
      });

      expect(released).toBe(false);
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Redis connection error'));

      await expect(
        repository.release({
          resourceKey: 'agent:agent-1',
          lockId: 'lock-123',
          holderId: 'project:proj-1',
        })
      ).rejects.toThrow('Failed to release lock for agent:agent-1: Redis connection error');
    });
  });

  describe('extend', () => {
    it('should extend lock successfully', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const extended = await repository.extend({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
        additionalTtlMs: 30000,
      });

      expect(extended).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('pexpire'),
        1,
        'lock:agent:agent-1',
        expect.any(String),
        '30000'
      );
    });

    it('should return false when lock not owned', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const extended = await repository.extend({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
        additionalTtlMs: 30000,
      });

      expect(extended).toBe(false);
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Redis connection error'));

      await expect(
        repository.extend({
          resourceKey: 'agent:agent-1',
          lockId: 'lock-123',
          holderId: 'project:proj-1',
          additionalTtlMs: 30000,
        })
      ).rejects.toThrow('Failed to extend lock for agent:agent-1: Redis connection error');
    });
  });

  describe('exists', () => {
    it('should return true when lock exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const exists = await repository.exists('agent:agent-1');

      expect(exists).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('lock:agent:agent-1');
    });

    it('should return false when lock does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const exists = await repository.exists('agent:agent-1');

      expect(exists).toBe(false);
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis connection error'));

      await expect(repository.exists('agent:agent-1')).rejects.toThrow(
        'Failed to check lock existence for agent:agent-1: Redis connection error'
      );
    });
  });

  describe('getInfo', () => {
    it('should return lock info', async () => {
      const lockValue = JSON.stringify({
        lockId: 'lock-123',
        holderId: 'project:proj-1',
        instanceId: 'test-instance-123',
        timestamp: Date.now(),
      });

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, lockValue],
          [null, 25000],
        ]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const info = await repository.getInfo('agent:agent-1');

      expect(info).toBeDefined();
      expect(info!.resourceKey).toBe('agent:agent-1');
      expect(info!.lockId).toBe('lock-123');
      expect(info!.holderId).toBe('project:proj-1');
      expect(info!.acquiredAt).toBeInstanceOf(Date);
      expect(info!.expiresAt).toBeInstanceOf(Date);
    });

    it('should return null when lock does not exist', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, null],
          [null, -2],
        ]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const info = await repository.getInfo('agent:agent-1');

      expect(info).toBeNull();
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.pipeline.mockImplementation(() => {
        throw new Error('Redis connection error');
      });

      await expect(repository.getInfo('agent:agent-1')).rejects.toThrow(
        'Failed to get lock info for agent:agent-1'
      );
    });
  });

  describe('forceRelease', () => {
    it('should force release lock', async () => {
      mockRedis.del.mockResolvedValue(1);

      const released = await repository.forceRelease('agent:agent-1');

      expect(released).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('lock:agent:agent-1');
    });

    it('should return false when lock does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const released = await repository.forceRelease('agent:agent-1');

      expect(released).toBe(false);
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection error'));

      await expect(repository.forceRelease('agent:agent-1')).rejects.toThrow(
        'Failed to force release lock for agent:agent-1: Redis connection error'
      );
    });
  });

  describe('ping', () => {
    it('should return true when Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const healthy = await repository.ping();

      expect(healthy).toBe(true);
    });

    it('should return false when Redis is unhealthy', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const healthy = await repository.ping();

      expect(healthy).toBe(false);
    });
  });
});
