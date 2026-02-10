/**
 * Unit tests for RedisLockManager
 */

import { RedisLockManager, ILogger } from '../../../../../src/platform/scheduling/infrastructure/locking/RedisLockManager';
import { ILockRepository } from '../../../../../src/platform/scheduling/domain/repositories/ILockRepository';
import { LockConfig } from '../../../../../src/platform/scheduling/domain/value-objects/LockConfig';
import { LockStatus } from '../../../../../src/platform/scheduling/domain/value-objects/LockResult';

// Mock logger
const createMockLogger = (): jest.Mocked<ILogger> => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

// Mock repository
const createMockRepository = (): jest.Mocked<ILockRepository> => ({
  acquire: jest.fn(),
  release: jest.fn(),
  extend: jest.fn(),
  exists: jest.fn(),
  getInfo: jest.fn(),
  forceRelease: jest.fn(),
  ping: jest.fn(),
});

describe('RedisLockManager', () => {
  let mockRepo: jest.Mocked<ILockRepository>;
  let mockLogger: jest.Mocked<ILogger>;
  let manager: RedisLockManager;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockLogger = createMockLogger();
    mockRepo.ping.mockResolvedValue(true);

    manager = new RedisLockManager({
      repository: mockRepo,
      logger: mockLogger,
      defaultConfig: LockConfig.default(),
      gracefulDegradation: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquire', () => {
    it('should acquire lock successfully on first attempt', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');

      const result = await manager.acquire(
        'agent:agent-1',
        'project:proj-1',
        LockConfig.forShortOperation()
      );

      expect(result.isAcquired()).toBe(true);
      expect(result.lockId).toBe('lock-123');
      expect(result.resourceKey).toBe('agent:agent-1');
      expect(result.holderId).toBe('project:proj-1');
      expect(result.retries).toBe(0);
      expect(mockRepo.acquire).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      mockRepo.acquire
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('lock-123');

      mockRepo.getInfo.mockResolvedValue({
        resourceKey: 'agent:agent-1',
        lockId: 'other-lock',
        holderId: 'project:proj-2',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const config = new LockConfig({
        ttlMs: 10000,
        retryDelayMs: 10, // Fast retries for testing
        maxRetries: 3,
        retryStrategy: 'constant',
      });

      const result = await manager.acquire('agent:agent-1', 'project:proj-1', config);

      expect(result.isAcquired()).toBe(true);
      expect(result.lockId).toBe('lock-123');
      expect(result.retries).toBe(2);
      expect(mockRepo.acquire).toHaveBeenCalledTimes(3);
    });

    it('should timeout after max retries', async () => {
      mockRepo.acquire.mockResolvedValue(null);
      mockRepo.getInfo.mockResolvedValue({
        resourceKey: 'agent:agent-1',
        lockId: 'other-lock',
        holderId: 'project:proj-2',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const config = new LockConfig({
        ttlMs: 10000,
        retryDelayMs: 10,
        maxRetries: 3,
        retryStrategy: 'constant',
      });

      const result = await manager.acquire('agent:agent-1', 'project:proj-1', config);

      expect(result.status).toBe(LockStatus.TIMEOUT);
      expect(result.lockId).toBeNull();
      expect(result.retries).toBe(3);
      expect(mockRepo.acquire).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Lock acquisition timed out',
        expect.any(Object)
      );
    });

    it('should detect already held by same holder', async () => {
      mockRepo.acquire.mockResolvedValue(null);
      mockRepo.getInfo.mockResolvedValue({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const result = await manager.acquire('agent:agent-1', 'project:proj-1');

      expect(result.status).toBe(LockStatus.ALREADY_HELD);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Lock already held by same holder',
        expect.any(Object)
      );
    });

    it('should handle Redis errors with graceful degradation', async () => {
      mockRepo.acquire.mockRejectedValue(new Error('Redis connection error'));

      const managerWithGraceful = new RedisLockManager({
        repository: mockRepo,
        logger: mockLogger,
        gracefulDegradation: true,
      });

      const result = await managerWithGraceful.acquire('agent:agent-1', 'project:proj-1');

      expect(result.status).toBe(LockStatus.FAILED);
      expect(result.error).toContain('Redis error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should continue retrying on Redis errors without graceful degradation', async () => {
      mockRepo.acquire
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockResolvedValueOnce('lock-123');

      const config = new LockConfig({
        ttlMs: 10000,
        retryDelayMs: 10,
        maxRetries: 3,
        retryStrategy: 'constant',
      });

      const result = await manager.acquire('agent:agent-1', 'project:proj-1', config);

      expect(result.isAcquired()).toBe(true);
      expect(result.lockId).toBe('lock-123');
      expect(result.retries).toBe(2);
    });

    it('should use exponential backoff correctly', async () => {
      mockRepo.acquire.mockResolvedValue(null);
      mockRepo.getInfo.mockResolvedValue({
        resourceKey: 'agent:agent-1',
        lockId: 'other-lock',
        holderId: 'project:proj-2',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const config = new LockConfig({
        ttlMs: 10000,
        retryDelayMs: 50,
        maxRetries: 3,
        retryStrategy: 'exponential',
        backoffMultiplier: 2,
      });

      const startTime = Date.now();
      await manager.acquire('agent:agent-1', 'project:proj-1', config);
      const duration = Date.now() - startTime;

      // Expected delays: 50 + 100 = 150ms minimum
      expect(duration).toBeGreaterThanOrEqual(140); // Account for execution time
    });
  });

  describe('release', () => {
    it('should release lock successfully', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.release.mockResolvedValue(true);

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1');
      const released = await manager.release(lockResult);

      expect(released).toBe(true);
      expect(mockRepo.release).toHaveBeenCalledWith({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Lock released', expect.any(Object));
    });

    it('should handle release failure', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.release.mockResolvedValue(false);

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1');
      const released = await manager.release(lockResult);

      expect(released).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Lock release failed - may have expired',
        expect.any(Object)
      );
    });

    it('should not release non-acquired lock', async () => {
      mockRepo.acquire.mockResolvedValue(null);
      mockRepo.getInfo.mockResolvedValue({
        resourceKey: 'agent:agent-1',
        lockId: 'other-lock',
        holderId: 'project:proj-2',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1', {
        ...LockConfig.default(),
        maxRetries: 1,
      } as any);

      const released = await manager.release(lockResult);

      expect(released).toBe(false);
      expect(mockRepo.release).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Attempted to release non-acquired lock',
        expect.any(Object)
      );
    });

    it('should handle Redis errors during release', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.release.mockRejectedValue(new Error('Redis connection error'));

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1');
      const released = await manager.release(lockResult);

      expect(released).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Lock release error', expect.any(Object));
    });
  });

  describe('extend', () => {
    it('should extend lock successfully', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.extend.mockResolvedValue(true);

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1');
      const extended = await manager.extend(lockResult, 30000);

      expect(extended).toBe(true);
      expect(mockRepo.extend).toHaveBeenCalledWith({
        resourceKey: 'agent:agent-1',
        lockId: 'lock-123',
        holderId: 'project:proj-1',
        additionalTtlMs: 30000,
      });
    });

    it('should not extend non-acquired lock', async () => {
      mockRepo.acquire.mockResolvedValue(null);
      mockRepo.getInfo.mockResolvedValue(null);

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1', {
        ...LockConfig.default(),
        maxRetries: 1,
      } as any);

      const extended = await manager.extend(lockResult, 30000);

      expect(extended).toBe(false);
      expect(mockRepo.extend).not.toHaveBeenCalled();
    });

    it('should handle extension failure', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.extend.mockResolvedValue(false);

      const lockResult = await manager.acquire('agent:agent-1', 'project:proj-1');
      const extended = await manager.extend(lockResult, 30000);

      expect(extended).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Lock extension failed',
        expect.any(Object)
      );
    });
  });

  describe('withLock', () => {
    it('should execute function with lock', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.release.mockResolvedValue(true);

      const fn = jest.fn().mockResolvedValue('result');

      const { result, lockResult } = await manager.withLock(
        'agent:agent-1',
        'project:proj-1',
        fn
      );

      expect(result).toBe('result');
      expect(lockResult.isAcquired()).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockRepo.release).toHaveBeenCalled();
    });

    it('should not execute function if lock not acquired', async () => {
      mockRepo.acquire.mockResolvedValue(null);
      mockRepo.getInfo.mockResolvedValue(null);

      const fn = jest.fn().mockResolvedValue('result');
      const config = new LockConfig({ maxRetries: 1, retryDelayMs: 10 });

      const { result, lockResult } = await manager.withLock(
        'agent:agent-1',
        'project:proj-1',
        fn,
        config
      );

      expect(result).toBeNull();
      expect(lockResult.isFailed()).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should release lock even if function throws', async () => {
      mockRepo.acquire.mockResolvedValue('lock-123');
      mockRepo.release.mockResolvedValue(true);

      const fn = jest.fn().mockRejectedValue(new Error('Function error'));

      await expect(
        manager.withLock('agent:agent-1', 'project:proj-1', fn)
      ).rejects.toThrow('Function error');

      expect(mockRepo.release).toHaveBeenCalled();
    });
  });

  describe('checkHealth', () => {
    it('should check Redis health', async () => {
      mockRepo.ping.mockResolvedValue(true);

      const healthy = await manager.checkHealth();

      expect(healthy).toBe(true);
      expect(mockRepo.ping).toHaveBeenCalled();
    });

    it('should handle health check failure', async () => {
      mockRepo.ping.mockResolvedValue(false);

      const healthy = await manager.checkHealth();

      expect(healthy).toBe(false);
    });

    it('should log health check errors', async () => {
      mockRepo.ping.mockRejectedValue(new Error('Connection failed'));

      const healthy = await manager.checkHealth();

      expect(healthy).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis health check failed',
        expect.any(Object)
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      const status = manager.getHealthStatus();

      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('gracefulDegradation', false);
    });

    it('should reflect graceful degradation setting', () => {
      const managerWithGraceful = new RedisLockManager({
        repository: mockRepo,
        gracefulDegradation: true,
      });

      const status = managerWithGraceful.getHealthStatus();

      expect(status.gracefulDegradation).toBe(true);
    });
  });

  describe('forceRelease', () => {
    it('should force release lock', async () => {
      mockRepo.forceRelease.mockResolvedValue(true);

      const released = await manager.forceRelease('agent:agent-1');

      expect(released).toBe(true);
      expect(mockRepo.forceRelease).toHaveBeenCalledWith('agent:agent-1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Force releasing lock',
        expect.any(Object)
      );
    });

    it('should handle force release failure', async () => {
      mockRepo.forceRelease.mockRejectedValue(new Error('Redis error'));

      const released = await manager.forceRelease('agent:agent-1');

      expect(released).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Force release failed',
        expect.any(Object)
      );
    });
  });
});
