/**
 * Unit tests for LockResult value object
 */

import { LockResult, LockStatus } from '../../../../../src/platform/scheduling/domain/value-objects/LockResult';

describe('LockResult', () => {
  describe('constructor', () => {
    it('should create lock result with all properties', () => {
      const acquiredAt = new Date();
      const expiresAt = new Date(acquiredAt.getTime() + 30000);

      const result = new LockResult({
        status: LockStatus.ACQUIRED,
        lockId: 'lock-123',
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        acquiredAt,
        expiresAt,
        retries: 2,
      });

      expect(result.status).toBe(LockStatus.ACQUIRED);
      expect(result.lockId).toBe('lock-123');
      expect(result.resourceKey).toBe('agent:agent-1');
      expect(result.holderId).toBe('project:proj-1');
      expect(result.acquiredAt).toEqual(acquiredAt);
      expect(result.expiresAt).toEqual(expiresAt);
      expect(result.error).toBeNull();
      expect(result.retries).toBe(2);
    });

    it('should create failed lock result with error', () => {
      const result = new LockResult({
        status: LockStatus.FAILED,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        error: 'Redis connection failed',
        retries: 3,
      });

      expect(result.status).toBe(LockStatus.FAILED);
      expect(result.lockId).toBeNull();
      expect(result.error).toBe('Redis connection failed');
      expect(result.acquiredAt).toBeNull();
      expect(result.expiresAt).toBeNull();
    });
  });

  describe('isAcquired', () => {
    it('should return true for acquired lock', () => {
      const result = new LockResult({
        status: LockStatus.ACQUIRED,
        lockId: 'lock-123',
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isAcquired()).toBe(true);
    });

    it('should return false for failed lock', () => {
      const result = new LockResult({
        status: LockStatus.FAILED,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isAcquired()).toBe(false);
    });

    it('should return false for timeout', () => {
      const result = new LockResult({
        status: LockStatus.TIMEOUT,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isAcquired()).toBe(false);
    });
  });

  describe('isFailed', () => {
    it('should return true for failed status', () => {
      const result = new LockResult({
        status: LockStatus.FAILED,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isFailed()).toBe(true);
    });

    it('should return true for timeout status', () => {
      const result = new LockResult({
        status: LockStatus.TIMEOUT,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isFailed()).toBe(true);
    });

    it('should return true for already held status', () => {
      const result = new LockResult({
        status: LockStatus.ALREADY_HELD,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isFailed()).toBe(true);
    });

    it('should return false for acquired status', () => {
      const result = new LockResult({
        status: LockStatus.ACQUIRED,
        lockId: 'lock-123',
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.isFailed()).toBe(false);
    });
  });

  describe('getTimeRemaining', () => {
    it('should calculate time remaining correctly', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 15000); // 15 seconds from now

      const result = new LockResult({
        status: LockStatus.ACQUIRED,
        lockId: 'lock-123',
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        expiresAt,
      });

      const remaining = result.getTimeRemaining();
      expect(remaining).toBeGreaterThan(14000);
      expect(remaining).toBeLessThanOrEqual(15000);
    });

    it('should return 0 for expired lock', () => {
      const expiresAt = new Date(Date.now() - 5000); // 5 seconds ago

      const result = new LockResult({
        status: LockStatus.ACQUIRED,
        lockId: 'lock-123',
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        expiresAt,
      });

      expect(result.getTimeRemaining()).toBe(0);
    });

    it('should return 0 when no expiration set', () => {
      const result = new LockResult({
        status: LockStatus.FAILED,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
      });

      expect(result.getTimeRemaining()).toBe(0);
    });
  });

  describe('factory methods', () => {
    describe('success', () => {
      it('should create successful result', () => {
        const result = LockResult.success(
          'lock-123',
          'agent:agent-1',
          'project:proj-1',
          30000,
          2
        );

        expect(result.status).toBe(LockStatus.ACQUIRED);
        expect(result.lockId).toBe('lock-123');
        expect(result.resourceKey).toBe('agent:agent-1');
        expect(result.holderId).toBe('project:proj-1');
        expect(result.retries).toBe(2);
        expect(result.isAcquired()).toBe(true);
        expect(result.acquiredAt).toBeDefined();
        expect(result.expiresAt).toBeDefined();
      });

      it('should set expiration 30 seconds from acquired time', () => {
        const beforeCreate = Date.now();
        const result = LockResult.success(
          'lock-123',
          'agent:agent-1',
          'project:proj-1',
          30000
        );
        const afterCreate = Date.now();

        expect(result.acquiredAt!.getTime()).toBeGreaterThanOrEqual(beforeCreate);
        expect(result.acquiredAt!.getTime()).toBeLessThanOrEqual(afterCreate);

        const expectedExpiration = result.acquiredAt!.getTime() + 30000;
        expect(result.expiresAt!.getTime()).toBe(expectedExpiration);
      });
    });

    describe('failure', () => {
      it('should create failed result', () => {
        const result = LockResult.failure(
          'agent:agent-1',
          'project:proj-1',
          'Connection error',
          3
        );

        expect(result.status).toBe(LockStatus.FAILED);
        expect(result.lockId).toBeNull();
        expect(result.error).toBe('Connection error');
        expect(result.retries).toBe(3);
        expect(result.isFailed()).toBe(true);
      });
    });

    describe('timeout', () => {
      it('should create timeout result', () => {
        const result = LockResult.timeout(
          'agent:agent-1',
          'project:proj-1',
          4
        );

        expect(result.status).toBe(LockStatus.TIMEOUT);
        expect(result.lockId).toBeNull();
        expect(result.error).toContain('timed out after 4 retries');
        expect(result.retries).toBe(4);
        expect(result.isFailed()).toBe(true);
      });
    });

    describe('alreadyHeld', () => {
      it('should create already held result', () => {
        const result = LockResult.alreadyHeld(
          'agent:agent-1',
          'project:proj-1',
          'project:proj-2'
        );

        expect(result.status).toBe(LockStatus.ALREADY_HELD);
        expect(result.lockId).toBeNull();
        expect(result.error).toContain('project:proj-2');
        expect(result.isFailed()).toBe(true);
      });
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const acquiredAt = new Date('2024-01-15T10:00:00Z');
      const expiresAt = new Date('2024-01-15T10:00:30Z');

      const result = new LockResult({
        status: LockStatus.ACQUIRED,
        lockId: 'lock-123',
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        acquiredAt,
        expiresAt,
        retries: 2,
      });

      const json = result.toJSON();

      expect(json.status).toBe(LockStatus.ACQUIRED);
      expect(json.lockId).toBe('lock-123');
      expect(json.resourceKey).toBe('agent:agent-1');
      expect(json.holderId).toBe('project:proj-1');
      expect(json.acquiredAt).toBe('2024-01-15T10:00:00.000Z');
      expect(json.expiresAt).toBe('2024-01-15T10:00:30.000Z');
      expect(json.retries).toBe(2);
      expect(json.isAcquired).toBe(true);
      expect(json.timeRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle null dates', () => {
      const result = new LockResult({
        status: LockStatus.FAILED,
        lockId: null,
        resourceKey: 'agent:agent-1',
        holderId: 'project:proj-1',
        error: 'Test error',
      });

      const json = result.toJSON();

      expect(json.acquiredAt).toBeNull();
      expect(json.expiresAt).toBeNull();
      expect(json.isAcquired).toBe(false);
    });
  });
});
