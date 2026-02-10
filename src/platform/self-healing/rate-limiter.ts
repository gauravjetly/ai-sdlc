/**
 * Rate Limiter
 * Protect services from overload with sliding window rate limiting
 */

import { createLogger } from '../utils/logger.js';
import { RateLimitConfig, RateLimitInfo } from './types.js';

const logger = createLogger('RateLimiter');

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
};

/**
 * Request record for tracking
 */
interface RequestRecord {
  timestamp: number;
  success: boolean;
}

/**
 * Rate Limiter using sliding window algorithm
 */
export class RateLimiter {
  private requests: Map<string, RequestRecord[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };

    logger.info('Rate Limiter initialized', {
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
    });

    // Clean up old records periodically
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(key: string, success: boolean = true): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request history for key
    let requestHistory = this.requests.get(key) || [];

    // Remove old requests outside the window
    requestHistory = requestHistory.filter((req) => req.timestamp >= windowStart);

    // Filter based on config
    let relevantRequests = requestHistory;

    if (this.config.skipSuccessfulRequests) {
      relevantRequests = relevantRequests.filter((req) => !req.success);
    }

    if (this.config.skipFailedRequests) {
      relevantRequests = relevantRequests.filter((req) => req.success);
    }

    // Check if limit exceeded
    const isAllowed = relevantRequests.length < this.config.maxRequests;

    // Record this request
    requestHistory.push({
      timestamp: now,
      success,
    });

    this.requests.set(key, requestHistory);

    if (!isAllowed) {
      logger.warn('Rate limit exceeded', {
        key,
        current: relevantRequests.length,
        limit: this.config.maxRequests,
        window: this.config.windowMs,
      });
    }

    return isAllowed;
  }

  /**
   * Get rate limit info for a key
   */
  getInfo(key: string): RateLimitInfo {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const requestHistory = this.requests.get(key) || [];
    const recentRequests = requestHistory.filter((req) => req.timestamp >= windowStart);

    let relevantRequests = recentRequests;

    if (this.config.skipSuccessfulRequests) {
      relevantRequests = relevantRequests.filter((req) => !req.success);
    }

    if (this.config.skipFailedRequests) {
      relevantRequests = relevantRequests.filter((req) => req.success);
    }

    const current = relevantRequests.length;
    const remaining = Math.max(0, this.config.maxRequests - current);
    const resetTime = new Date(now + this.config.windowMs);

    return {
      limit: this.config.maxRequests,
      current,
      remaining,
      resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
    logger.info('Rate limit reset', { key });
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.requests.clear();
    logger.info('All rate limits reset');
  }

  /**
   * Clean up old request records
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, requestHistory] of this.requests.entries()) {
      const recentRequests = requestHistory.filter((req) => req.timestamp >= windowStart);

      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }

    logger.debug('Rate limiter cleanup completed', {
      activeKeys: this.requests.size,
    });
  }

  /**
   * Get current statistics
   */
  getStats(): {
    activeKeys: number;
    totalRequests: number;
    averageRequestsPerKey: number;
  } {
    const activeKeys = this.requests.size;
    const totalRequests = Array.from(this.requests.values()).reduce(
      (sum, history) => sum + history.length,
      0
    );
    const averageRequestsPerKey = activeKeys > 0 ? totalRequests / activeKeys : 0;

    return {
      activeKeys,
      totalRequests,
      averageRequestsPerKey,
    };
  }
}

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const limiter = new RateLimiter(config);
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;

  return async (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    const isAllowed = await limiter.isAllowed(key);

    if (!isAllowed) {
      const info = limiter.getInfo(key);

      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
      res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

      return res.status(429).json({
        error: 'Too Many Requests',
        message: config.message || DEFAULT_RATE_LIMIT_CONFIG.message,
        retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000),
      });
    }

    const info = limiter.getInfo(key);
    res.setHeader('X-RateLimit-Limit', info.limit.toString());
    res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
    res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

    next();
  };
}

/**
 * Default key generator (uses IP address)
 */
function defaultKeyGenerator(req: any): string {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * Token bucket rate limiter (alternative algorithm)
 */
export class TokenBucketRateLimiter {
  private buckets: Map<
    string,
    {
      tokens: number;
      lastRefill: number;
    }
  > = new Map();

  constructor(
    private maxTokens: number = 100,
    private refillRate: number = 10, // tokens per second
    private refillInterval: number = 1000 // milliseconds
  ) {
    logger.info('Token Bucket Rate Limiter initialized', {
      maxTokens,
      refillRate,
      refillInterval,
    });
  }

  /**
   * Try to consume tokens
   */
  async tryConsume(key: string, tokens: number = 1): Promise<boolean> {
    const now = Date.now();

    // Get or create bucket
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillIntervals = Math.floor(timeSinceLastRefill / this.refillInterval);

    if (refillIntervals > 0) {
      const tokensToAdd = refillIntervals * this.refillRate;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Try to consume tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    logger.warn('Token bucket exhausted', {
      key,
      requested: tokens,
      available: bucket.tokens,
    });

    return false;
  }

  /**
   * Get tokens available for key
   */
  getAvailableTokens(key: string): number {
    const bucket = this.buckets.get(key);
    return bucket ? bucket.tokens : this.maxTokens;
  }

  /**
   * Reset tokens for key
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Reset all buckets
   */
  resetAll(): void {
    this.buckets.clear();
  }
}

/**
 * Rate limiter decorator for class methods
 */
export function RateLimit(config: Partial<RateLimitConfig> = {}) {
  const limiter = new RateLimiter(config);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}`;
      const isAllowed = await limiter.isAllowed(key);

      if (!isAllowed) {
        throw new Error(
          config.message || DEFAULT_RATE_LIMIT_CONFIG.message || 'Rate limit exceeded'
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Adaptive rate limiter (adjusts limits based on system load)
 */
export class AdaptiveRateLimiter extends RateLimiter {
  private systemLoad: number = 0;
  private baseMaxRequests: number;

  constructor(config: Partial<RateLimitConfig> = {}) {
    super(config);
    this.baseMaxRequests = this.config.maxRequests;

    // Monitor system load
    this.startLoadMonitoring();
  }

  /**
   * Start monitoring system load
   */
  private startLoadMonitoring(): void {
    setInterval(() => {
      // Simulate system load monitoring
      // In production, this would check CPU, memory, etc.
      this.updateSystemLoad();
      this.adjustRateLimit();
    }, 5000);
  }

  /**
   * Update system load metrics
   */
  private updateSystemLoad(): void {
    // Simulate load (0-1 range)
    // In production, calculate from actual metrics
    this.systemLoad = Math.random() * 0.5; // 0-50% load
  }

  /**
   * Adjust rate limit based on system load
   */
  private adjustRateLimit(): void {
    // Reduce limit when load is high
    const loadFactor = 1 - this.systemLoad;
    this.config.maxRequests = Math.floor(this.baseMaxRequests * loadFactor);

    logger.debug('Rate limit adjusted', {
      systemLoad: (this.systemLoad * 100).toFixed(1) + '%',
      baseLimit: this.baseMaxRequests,
      adjustedLimit: this.config.maxRequests,
    });
  }
}
