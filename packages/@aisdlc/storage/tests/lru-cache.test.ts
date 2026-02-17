/**
 * LRU Cache Tests
 *
 * Tests the in-memory LRU cache that replaces Redis for local production.
 */

import { LRUCache } from '../src/memory-cache/lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({ maxSize: 5, defaultTTL: 60, cleanupInterval: 60000 });
  });

  afterEach(() => {
    cache.shutdown();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should respect TTL expiration', () => {
      cache.set('key1', 'value1', 0); // Expire immediately (0 seconds)

      // Need a small delay for expiration
      const result = cache.get('key1');
      expect(result).toBeNull();
    });

    it('should handle different value types', () => {
      const numberCache = new LRUCache<number>({ maxSize: 10 });
      numberCache.set('num', 42);
      expect(numberCache.get('num')).toBe(42);
      numberCache.shutdown();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.set('key1', 'value1', 0);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove a key', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should return false for non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });

    it('should reset statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('miss'); // miss
      cache.clear();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      // Max size is 5
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4');
      cache.set('e', '5');

      // Access 'a' to make it recently used
      cache.get('a');

      // This should evict 'b' (LRU)
      cache.set('f', '6');

      expect(cache.get('a')).toBe('1'); // Was accessed, should survive
      expect(cache.get('b')).toBeNull(); // Should be evicted
      expect(cache.get('f')).toBe('6'); // New entry
    });

    it('should call onEvict callback', () => {
      const evicted: string[] = [];
      const evictCache = new LRUCache<string>({
        maxSize: 2,
        onEvict: (key) => evicted.push(key),
      });

      evictCache.set('a', '1');
      evictCache.set('b', '2');
      evictCache.set('c', '3'); // Should evict 'a'

      expect(evicted).toContain('a');
      evictCache.shutdown();
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('miss'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should report size and maxSize', () => {
      cache.set('a', '1');
      cache.set('b', '2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });

    it('should track eviction count', () => {
      // Fill cache
      for (let i = 0; i < 7; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2); // 7 - 5 = 2 evictions
    });

    it('should estimate memory usage', () => {
      cache.set('key1', 'some longer string value for testing');
      const stats = cache.getStats();
      expect(stats.memoryEstimate).toBeGreaterThan(0);
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      const keys = cache.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });
  });

  describe('size', () => {
    it('should return current entry count', () => {
      expect(cache.size).toBe(0);
      cache.set('a', '1');
      expect(cache.size).toBe(1);
      cache.set('b', '2');
      expect(cache.size).toBe(2);
      cache.delete('a');
      expect(cache.size).toBe(1);
    });
  });

  describe('shutdown', () => {
    it('should clear cache and stop cleanup timer', () => {
      cache.set('a', '1');
      cache.shutdown();
      expect(cache.size).toBe(0);
    });
  });

  describe('concurrent access simulation', () => {
    it('should handle rapid set/get operations', () => {
      const bigCache = new LRUCache<number>({ maxSize: 1000 });

      for (let i = 0; i < 1000; i++) {
        bigCache.set(`key-${i}`, i);
      }

      for (let i = 0; i < 1000; i++) {
        expect(bigCache.get(`key-${i}`)).toBe(i);
      }

      const stats = bigCache.getStats();
      expect(stats.size).toBe(1000);
      expect(stats.hits).toBe(1000);
      expect(stats.misses).toBe(0);
      bigCache.shutdown();
    });
  });
});
