/**
 * Retry Logic with Exponential Backoff
 * Handles transient failures with configurable retry policies
 */

import { createLogger } from '../utils/logger.js';
import { RetryConfig, RetryResult } from './types.js';

const logger = createLogger('RetryLogic');

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2, // Exponential backoff
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'],
};

/**
 * Execute function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const errors: Error[] = [];
  const startTime = Date.now();

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      logger.debug('Executing with retry', { attempt, maxAttempts: finalConfig.maxAttempts });

      const result = await fn();

      const totalDuration = Date.now() - startTime;

      logger.info('Function succeeded', { attempt, totalDuration });

      return {
        success: true,
        result,
        attempts: attempt,
        totalDuration,
        errors,
      };
    } catch (error: any) {
      errors.push(error);

      logger.warn('Function failed, checking if retryable', {
        attempt,
        error: error.message,
        code: error.code,
      });

      // Check if error is retryable
      const isRetryable = isErrorRetryable(error, finalConfig);

      if (!isRetryable) {
        logger.error('Error is not retryable, giving up', {
          error: error.message,
          code: error.code,
        });

        return {
          success: false,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          errors,
        };
      }

      // If this was the last attempt, give up
      if (attempt === finalConfig.maxAttempts) {
        logger.error('Max retry attempts reached, giving up', {
          maxAttempts: finalConfig.maxAttempts,
          errors: errors.map((e) => e.message),
        });

        return {
          success: false,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          errors,
        };
      }

      // Calculate delay with exponential backoff
      const delay = calculateBackoffDelay(attempt, finalConfig);

      logger.info('Retrying after delay', { attempt, delay, nextAttempt: attempt + 1 });

      // Call onRetry callback if provided
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, error);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    attempts: finalConfig.maxAttempts,
    totalDuration: Date.now() - startTime,
    errors,
  };
}

/**
 * Check if error is retryable
 */
function isErrorRetryable(error: any, config: RetryConfig): boolean {
  // Check error code
  if (error.code && config.retryableErrors?.includes(error.code)) {
    return true;
  }

  // Check error message
  if (error.message && config.retryableErrors) {
    for (const retryableError of config.retryableErrors) {
      if (error.message.includes(retryableError)) {
        return true;
      }
    }
  }

  // Check HTTP status codes (if applicable)
  if (error.statusCode) {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    if (retryableStatusCodes.includes(error.statusCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate backoff delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  // Base delay with exponential backoff
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

  // Apply max delay cap
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (random factor) to prevent thundering herd
  const jitter = Math.random() * 0.3 * cappedDelay; // ±30% jitter
  const finalDelay = cappedDelay + jitter;

  return Math.floor(finalDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await withRetry(
        () => originalMethod.apply(this, args),
        config
      );

      if (result.success) {
        return result.result;
      } else {
        throw result.errors[result.errors.length - 1];
      }
    };

    return descriptor;
  };
}

/**
 * Circuit breaker state for retry logic
 */
export class RetryCircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}

  /**
   * Check if operation should be attempted
   */
  canAttempt(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.resetTimeout) {
        logger.info('Circuit breaker transitioning to HALF_OPEN');
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow one attempt
    return true;
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      logger.info('Circuit breaker transitioning to CLOSED');
      this.state = 'CLOSED';
      this.failureCount = 0;
    }
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      logger.warn('Circuit breaker transitioning to OPEN (failure in HALF_OPEN)');
      this.state = 'OPEN';
    } else if (this.failureCount >= this.failureThreshold) {
      logger.warn('Circuit breaker transitioning to OPEN (threshold exceeded)', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });
      this.state = 'OPEN';
    }
  }

  /**
   * Get current state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * Execute with retry and circuit breaker
 */
export async function withRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: RetryCircuitBreaker,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  if (!circuitBreaker.canAttempt()) {
    throw new Error('Circuit breaker is OPEN, request blocked');
  }

  try {
    const result = await withRetry(fn, retryConfig);

    if (result.success) {
      circuitBreaker.recordSuccess();
      return result.result!;
    } else {
      circuitBreaker.recordFailure();
      throw result.errors[result.errors.length - 1];
    }
  } catch (error) {
    circuitBreaker.recordFailure();
    throw error;
  }
}
