/**
 * Fallback Strategies
 * Predefined fallback strategies for circuit breaker pattern
 */

import { createLogger } from '../../utils/logger.js';
import { FallbackFunction } from '../types.js';

const logger = createLogger('FallbackStrategies');

/**
 * Common fallback strategies for circuit breaker
 */
export class FallbackStrategies {
  /**
   * Return a default value
   */
  static returnDefault<T>(defaultValue: T): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Returning default value', {
        error: error.message
      });
      return defaultValue;
    };
  }

  /**
   * Return cached value
   */
  static returnCached<T>(cache: Map<string, T>, cacheKey: string): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Attempting to return cached value', {
        cacheKey,
        error: error.message
      });

      const cachedValue = cache.get(cacheKey);
      if (cachedValue !== undefined) {
        logger.info('Fallback: Cached value found', { cacheKey });
        return cachedValue;
      }

      logger.warn('Fallback: No cached value available', { cacheKey });
      throw new Error(`No cached value available for key: ${cacheKey}`);
    };
  }

  /**
   * Retry with exponential backoff
   */
  static retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Retry with exponential backoff', {
        maxRetries,
        initialDelayMs,
        error: error.message
      });

      let lastError = error;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);

          logger.debug('Retry attempt', {
            attempt,
            maxRetries,
            delay
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          return await fn();
        } catch (retryError) {
          lastError = retryError as Error;

          logger.warn('Retry attempt failed', {
            attempt,
            maxRetries,
            error: (retryError as Error).message
          });
        }
      }

      logger.error('All retry attempts exhausted', {
        maxRetries,
        lastError: lastError.message
      });

      throw lastError;
    };
  }

  /**
   * Fallback to alternative service
   */
  static fallbackToAlternative<T>(alternativeFn: () => Promise<T>): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Using alternative service', {
        error: error.message
      });

      try {
        return await alternativeFn();
      } catch (alternativeError) {
        logger.error('Alternative service also failed', {
          originalError: error.message,
          alternativeError: (alternativeError as Error).message
        });

        throw alternativeError;
      }
    };
  }

  /**
   * Return degraded response
   */
  static returnDegraded<T>(
    degradedFn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Returning degraded response', {
        error: error.message,
        metadata
      });

      try {
        const result = await degradedFn();
        return result;
      } catch (degradedError) {
        logger.error('Degraded response generation failed', {
          error: (degradedError as Error).message
        });

        throw degradedError;
      }
    };
  }

  /**
   * Log and rethrow (for observability)
   */
  static logAndRethrow<T>(
    context: Record<string, any>
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.error('Circuit breaker fallback triggered', {
        error: error.message,
        stack: error.stack,
        context
      });

      throw error;
    };
  }

  /**
   * Return empty collection
   */
  static returnEmpty<T extends any[]>(): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Returning empty collection', {
        error: error.message
      });

      return [] as T;
    };
  }

  /**
   * Return error response
   */
  static returnError<T>(
    errorMessage: string,
    errorCode?: string
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Returning error response', {
        originalError: error.message,
        errorMessage,
        errorCode
      });

      const errorResponse = {
        error: {
          message: errorMessage,
          code: errorCode || 'SERVICE_UNAVAILABLE',
          originalError: error.message
        }
      };

      return errorResponse as T;
    };
  }

  /**
   * Chain multiple fallback strategies
   */
  static chain<T>(...strategies: FallbackFunction<T>[]): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Executing chain of strategies', {
        count: strategies.length,
        error: error.message
      });

      let lastError = error;

      for (let i = 0; i < strategies.length; i++) {
        try {
          logger.debug('Trying fallback strategy', {
            index: i + 1,
            total: strategies.length
          });

          return await strategies[i](lastError);
        } catch (strategyError) {
          lastError = strategyError as Error;

          logger.warn('Fallback strategy failed', {
            index: i + 1,
            total: strategies.length,
            error: (strategyError as Error).message
          });
        }
      }

      logger.error('All fallback strategies exhausted', {
        count: strategies.length,
        lastError: lastError.message
      });

      throw lastError;
    };
  }

  /**
   * Fallback with timeout
   */
  static withTimeout<T>(
    fallbackFn: FallbackFunction<T>,
    timeoutMs: number
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Executing with timeout', {
        timeoutMs,
        error: error.message
      });

      return Promise.race([
        fallbackFn(error),
        new Promise<T>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Fallback timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        })
      ]);
    };
  }

  /**
   * Fallback with circuit breaker (nested)
   */
  static withCircuitBreaker<T>(
    fallbackFn: FallbackFunction<T>,
    circuitBreaker: any
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Executing with nested circuit breaker', {
        error: error.message
      });

      return circuitBreaker.execute(() => fallbackFn(error));
    };
  }

  /**
   * Rate-limited fallback
   */
  static rateLimit<T>(
    fallbackFn: FallbackFunction<T>,
    maxCallsPerSecond: number
  ): FallbackFunction<T> {
    let lastCallTime = 0;
    const minInterval = 1000 / maxCallsPerSecond;

    return async (error: Error) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      if (timeSinceLastCall < minInterval) {
        const waitTime = minInterval - timeSinceLastCall;

        logger.debug('Rate limiting fallback', {
          waitTime,
          maxCallsPerSecond
        });

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      lastCallTime = Date.now();
      return fallbackFn(error);
    };
  }

  /**
   * Conditional fallback
   */
  static conditional<T>(
    condition: (error: Error) => boolean,
    onTrue: FallbackFunction<T>,
    onFalse: FallbackFunction<T>
  ): FallbackFunction<T> {
    return async (error: Error) => {
      logger.info('Fallback: Evaluating condition', {
        error: error.message
      });

      const shouldUseTrueBranch = condition(error);

      logger.debug('Condition evaluated', {
        result: shouldUseTrueBranch
      });

      return shouldUseTrueBranch ? onTrue(error) : onFalse(error);
    };
  }
}
