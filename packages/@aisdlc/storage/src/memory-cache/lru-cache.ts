/**
 * In-Memory LRU Cache
 *
 * Production-grade in-memory cache with LRU eviction and TTL support.
 * Replaces Redis for local production deployments.
 *
 * Features:
 * - LRU eviction when cache is full
 * - Per-entry TTL (time-to-live)
 * - Automatic cleanup of expired entries
 * - Statistics tracking
 * - Thread-safe (single-threaded Node.js)
 */

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  memoryEstimate: number;
}

export interface LRUCacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
  onEvict?: (key: string, value: unknown) => void;
}

export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private onEvict?: (key: string, value: unknown) => void;

  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(options: LRUCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 10000;
    this.defaultTTL = options.defaultTTL ?? 3600; // 1 hour default
    this.onEvict = options.onEvict;

    // Start cleanup timer
    const interval = options.cleanupInterval ?? 60000; // 1 minute
    this.cleanupTimer = setInterval(() => this.cleanup(), interval);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref(); // Don't prevent process exit
    }
  }

  /**
   * Get a value from the cache.
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration (>= to handle TTL=0 as "expire immediately")
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access time (LRU tracking)
    entry.lastAccessed = Date.now();
    this.hits++;

    // Move to end of Map (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache.
   */
  set(key: string, value: T, ttl?: number): void {
    const ttlSeconds = ttl ?? this.defaultTTL;

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccessed: Date.now(),
      size: this.estimateSize(value),
    };

    // Delete first to move to end of Map
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists (without updating access time).
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from the cache.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    let memoryEstimate = 0;

    for (const entry of this.cache.values()) {
      memoryEstimate += entry.size;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      memoryEstimate,
    };
  }

  /**
   * Get all keys (for debugging/monitoring).
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get number of entries.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Shutdown the cache (stop cleanup timer).
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }

  // ============================================================
  // Private methods
  // ============================================================

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    // Map iterates in insertion order - first entry is LRU
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.cache.get(firstKey);
      this.cache.delete(firstKey);
      this.evictions++;
      if (this.onEvict && entry) {
        this.onEvict(firstKey, entry.value);
      }
    }
  }

  /**
   * Clean up expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      const entry = this.cache.get(key);
      this.cache.delete(key);
      if (this.onEvict && entry) {
        this.onEvict(key, entry.value);
      }
    }
  }

  /**
   * Estimate the memory size of a value in bytes.
   */
  private estimateSize(value: T): number {
    if (value === null || value === undefined) return 8;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;

    // For objects, estimate via JSON serialization length
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default estimate for non-serializable objects
    }
  }
}
