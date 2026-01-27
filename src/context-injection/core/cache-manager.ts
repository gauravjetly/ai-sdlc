/**
 * Cache Manager
 *
 * Manages in-memory caching of context with TTL support.
 */

export interface CacheEntry<T> {
  data: T;
  expires: number;
  hits: number;
  created: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0
  };

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + ttlMs,
      hits: 0,
      created: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Get value or fetch if not cached
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Invalidate all keys matching pattern
   */
  invalidate(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const total = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.created)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.created)) : 0
    };
  }

  /**
   * Get entry metadata
   */
  getEntryInfo(key: string): Omit<CacheEntry<any>, 'data'> | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    return {
      expires: entry.expires,
      hits: entry.hits,
      created: entry.created
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getSize(): number {
    let size = 0;

    for (const [key, entry] of this.cache.entries()) {
      size += key.length;
      size += JSON.stringify(entry.data).length;
    }

    return size;
  }

  /**
   * Set automatic cleanup interval
   */
  startAutoCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(timer: NodeJS.Timeout): void {
    clearInterval(timer);
  }
}

/**
 * Pre-configured cache TTLs for different context types
 */
export const CACHE_TTL = {
  ORG_CONTEXT: 24 * 60 * 60 * 1000,    // 24 hours
  PROJECT_CONTEXT: 60 * 60 * 1000,     // 1 hour
  HISTORICAL_CONTEXT: 5 * 60 * 1000,   // 5 minutes
  LIVE_CONTEXT: 30 * 1000,             // 30 seconds
  FULL_CONTEXT: 5 * 60 * 1000          // 5 minutes
};
