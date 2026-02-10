/**
 * Unit tests for LockConfig value object
 */

import { LockConfig } from '../LockConfig';

describe('LockConfig', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const config = new LockConfig();

      expect(config.ttlMs).toBe(30000);
      expect(config.retryDelayMs).toBe(100);
      expect(config.maxRetries).toBe(4);
      expect(config.retryStrategy).toBe('exponential');
      expect(config.backoffMultiplier).toBe(2);
    });

    it('should create with custom values', () => {
      const config = new LockConfig({
        ttlMs: 60000,
        retryDelayMs: 200,
        maxRetries: 5,
        retryStrategy: 'linear',
        backoffMultiplier: 3,
      });

      expect(config.ttlMs).toBe(60000);
      expect(config.retryDelayMs).toBe(200);
      expect(config.maxRetries).toBe(5);
      expect(config.retryStrategy).toBe('linear');
      expect(config.backoffMultiplier).toBe(3);
    });

    it('should reject negative TTL', () => {
      expect(() => new LockConfig({ ttlMs: -1 })).toThrow('TTL must be positive');
    });

    it('should reject zero TTL', () => {
      expect(() => new LockConfig({ ttlMs: 0 })).toThrow('TTL must be positive');
    });

    it('should reject TTL exceeding 5 minutes', () => {
      expect(() => new LockConfig({ ttlMs: 301000 })).toThrow('TTL cannot exceed 5 minutes');
    });

    it('should reject negative retry delay', () => {
      expect(() => new LockConfig({ retryDelayMs: -1 })).toThrow(
        'Retry delay cannot be negative'
      );
    });

    it('should reject negative max retries', () => {
      expect(() => new LockConfig({ maxRetries: -1 })).toThrow(
        'Max retries cannot be negative'
      );
    });

    it('should reject backoff multiplier less than 1', () => {
      expect(() => new LockConfig({ backoffMultiplier: 0.5 })).toThrow(
        'Backoff multiplier must be >= 1'
      );
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const config = new LockConfig({
        retryDelayMs: 100,
        maxRetries: 4,
        retryStrategy: 'exponential',
        backoffMultiplier: 2,
      });

      expect(config.calculateRetryDelay(0)).toBe(100);  // 100 * 2^0
      expect(config.calculateRetryDelay(1)).toBe(200);  // 100 * 2^1
      expect(config.calculateRetryDelay(2)).toBe(400);  // 100 * 2^2
      expect(config.calculateRetryDelay(3)).toBe(800);  // 100 * 2^3
    });

    it('should calculate linear backoff correctly', () => {
      const config = new LockConfig({
        retryDelayMs: 100,
        maxRetries: 4,
        retryStrategy: 'linear',
      });

      expect(config.calculateRetryDelay(0)).toBe(100);  // 100 * 1
      expect(config.calculateRetryDelay(1)).toBe(200);  // 100 * 2
      expect(config.calculateRetryDelay(2)).toBe(300);  // 100 * 3
      expect(config.calculateRetryDelay(3)).toBe(400);  // 100 * 4
    });

    it('should calculate constant backoff correctly', () => {
      const config = new LockConfig({
        retryDelayMs: 100,
        maxRetries: 4,
        retryStrategy: 'constant',
      });

      expect(config.calculateRetryDelay(0)).toBe(100);
      expect(config.calculateRetryDelay(1)).toBe(100);
      expect(config.calculateRetryDelay(2)).toBe(100);
      expect(config.calculateRetryDelay(3)).toBe(100);
    });

    it('should reject negative attempt', () => {
      const config = new LockConfig();
      expect(() => config.calculateRetryDelay(-1)).toThrow('Invalid retry attempt: -1');
    });

    it('should reject attempt exceeding max retries', () => {
      const config = new LockConfig({ maxRetries: 4 });
      expect(() => config.calculateRetryDelay(4)).toThrow('Invalid retry attempt: 4');
    });
  });

  describe('getTotalMaxWaitTime', () => {
    it('should calculate total wait time for exponential backoff', () => {
      const config = new LockConfig({
        retryDelayMs: 100,
        maxRetries: 4,
        retryStrategy: 'exponential',
        backoffMultiplier: 2,
      });

      // 100 + 200 + 400 + 800 = 1500ms
      expect(config.getTotalMaxWaitTime()).toBe(1500);
    });

    it('should calculate total wait time for linear backoff', () => {
      const config = new LockConfig({
        retryDelayMs: 100,
        maxRetries: 4,
        retryStrategy: 'linear',
      });

      // 100 + 200 + 300 + 400 = 1000ms
      expect(config.getTotalMaxWaitTime()).toBe(1000);
    });

    it('should calculate total wait time for constant backoff', () => {
      const config = new LockConfig({
        retryDelayMs: 100,
        maxRetries: 4,
        retryStrategy: 'constant',
      });

      // 100 + 100 + 100 + 100 = 400ms
      expect(config.getTotalMaxWaitTime()).toBe(400);
    });
  });

  describe('factory methods', () => {
    it('should create config for short operations', () => {
      const config = LockConfig.forShortOperation();

      expect(config.ttlMs).toBe(10000);
      expect(config.retryDelayMs).toBe(50);
      expect(config.maxRetries).toBe(3);
      expect(config.retryStrategy).toBe('exponential');
    });

    it('should create config for long operations', () => {
      const config = LockConfig.forLongOperation();

      expect(config.ttlMs).toBe(120000);
      expect(config.retryDelayMs).toBe(200);
      expect(config.maxRetries).toBe(5);
      expect(config.retryStrategy).toBe('exponential');
    });

    it('should create default config', () => {
      const config = LockConfig.default();

      expect(config.ttlMs).toBe(30000);
      expect(config.retryDelayMs).toBe(100);
      expect(config.maxRetries).toBe(4);
    });
  });
});
