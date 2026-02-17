/**
 * Classification Cache
 *
 * In-memory LRU cache for classification results with TTL-based expiration.
 * Uses SHA-256 message hashing for cache keys.
 *
 * In production, this can be backed by Redis for cross-process caching.
 * For Phase 3, we implement an in-memory cache that provides the same
 * interface and can be swapped for Redis later.
 *
 * Part of Phase 3: Performance Optimization.
 *
 * @module performance/classification-cache
 */

import { createHash } from 'crypto';

/**
 * A cached classification entry.
 */
interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** When the entry was created */
  createdAt: number;
  /** When the entry expires (epoch ms) */
  expiresAt: number;
  /** Number of times this entry has been accessed */
  hitCount: number;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  /** Total number of entries in the cache */
  size: number;
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate (0 to 1) */
  hitRate: number;
  /** Number of evictions */
  evictions: number;
  /** Maximum cache size */
  maxSize: number;
  /** TTL in milliseconds */
  ttlMs: number;
}

/**
 * Configuration for the classification cache.
 */
export interface ClassificationCacheConfig {
  /** Maximum number of entries. Default: 500 */
  maxSize?: number;
  /** TTL in milliseconds. Default: 3600000 (1 hour) */
  ttlMs?: number;
  /** Enable cache. Default: true */
  enabled?: boolean;
}

const DEFAULT_MAX_SIZE = 500;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * ClassificationCache provides fast, in-memory caching for classification results.
 *
 * Features:
 * - SHA-256 message hashing for consistent cache keys
 * - TTL-based expiration
 * - LRU eviction when cache is full
 * - Hit/miss statistics for monitoring
 * - Disable/enable toggle
 */
export class ClassificationCache<T = unknown> {
  private readonly cache: Map<string, CacheEntry<T>> = new Map();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private enabled: boolean;

  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(config: ClassificationCacheConfig = {}) {
    this.maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.enabled = config.enabled ?? true;
  }

  /**
   * Get a cached classification result by message.
   *
   * @param message - The user message to look up
   * @returns The cached classification or null if not found
   */
  get(message: string): T | null {
    if (!this.enabled) return null;

    const key = this.hashMessage(message);
    return this.getByKey(key);
  }

  /**
   * Get a cached value by pre-computed hash key.
   *
   * @param key - The cache key (message hash)
   * @returns The cached value or null
   */
  getByKey(key: string): T | null {
    if (!this.enabled) return null;

    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Cache hit
    entry.hitCount++;
    this.hits++;

    // Move to end for LRU (Map preserves insertion order)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Store a classification result in the cache.
   *
   * @param message - The user message
   * @param value - The classification result to cache
   * @param ttlMs - Optional TTL override in milliseconds
   */
  set(message: string, value: T, ttlMs?: number): void {
    if (!this.enabled) return;

    const key = this.hashMessage(message);
    this.setByKey(key, value, ttlMs);
  }

  /**
   * Store a value by pre-computed hash key.
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlMs - Optional TTL override
   */
  setByKey(key: string, value: T, ttlMs?: number): void {
    if (!this.enabled) return;

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.ttlMs;

    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt: now + effectiveTtl,
      hitCount: 0,
    });
  }

  /**
   * Check if a message has a cached classification.
   *
   * @param message - The user message
   * @returns True if a valid cached entry exists
   */
  has(message: string): boolean {
    if (!this.enabled) return false;

    const key = this.hashMessage(message);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate a cached entry.
   *
   * @param message - The user message to invalidate
   * @returns True if an entry was removed
   */
  invalidate(message: string): boolean {
    const key = this.hashMessage(message);
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Enable or disable the cache.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Check if the cache is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Remove expired entries from the cache.
   *
   * @returns Number of expired entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Hash a message using SHA-256 for consistent cache keys.
   *
   * @param message - The message to hash
   * @returns The hex-encoded hash
   */
  hashMessage(message: string): string {
    return createHash('sha256').update(message).digest('hex');
  }

  /**
   * Evict the oldest entry (LRU eviction).
   */
  private evictOldest(): void {
    // Map iteration order is insertion order; first key is oldest
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
      this.evictions++;
    }
  }
}
