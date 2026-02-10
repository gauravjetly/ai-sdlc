/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when service is unavailable
 */

import { createLogger } from '../../utils/logger.js';
import {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  FallbackFunction
} from '../types.js';
import { CircuitStateMachine } from './circuit-state-machine.js';

const logger = createLogger('CircuitBreaker');

/**
 * Circuit breaker implementation with three states: CLOSED, OPEN, HALF_OPEN
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stateMachine: CircuitStateMachine;
  private failureCount: number = 0;
  private successCount: number = 0;
  private consecutiveSuccesses: number = 0;
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private lastStateChange: number;
  private halfOpenCalls: number = 0;
  private rollingWindow: Array<{ success: boolean; timestamp: number }> = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      halfOpenMaxCalls: 3,
      errorRateThreshold: 50,
      volumeThreshold: 10,
      rollingWindowSize: 60000, // 60 seconds
      ...config
    };

    this.stateMachine = new CircuitStateMachine();
    this.lastStateChange = Date.now();

    logger.info('Circuit Breaker initialized', {
      name: this.config.name,
      failureThreshold: this.config.failureThreshold,
      successThreshold: this.config.successThreshold,
      timeout: this.config.timeout
    });
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: FallbackFunction<T>
  ): Promise<T> {
    const state = this.stateMachine.getState();

    logger.debug('Executing with circuit breaker', {
      name: this.config.name,
      state,
      failureCount: this.failureCount
    });

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (state === 'OPEN' && this.shouldAttemptReset()) {
      this.stateMachine.attemptReset();
      logger.info('Circuit transitioning to HALF_OPEN', {
        name: this.config.name
      });
    }

    const currentState = this.stateMachine.getState();

    // If circuit is OPEN, fail fast
    if (currentState === 'OPEN') {
      logger.warn('Circuit is OPEN, failing fast', {
        name: this.config.name
      });

      if (fallback) {
        return await this.executeFallback(fallback, new Error('Circuit breaker is OPEN'));
      }

      throw new Error(`Circuit breaker '${this.config.name}' is OPEN`);
    }

    // If in HALF_OPEN, limit concurrent calls
    if (currentState === 'HALF_OPEN') {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        logger.warn('Max concurrent calls reached in HALF_OPEN', {
          name: this.config.name,
          halfOpenCalls: this.halfOpenCalls
        });

        if (fallback) {
          return await this.executeFallback(fallback, new Error('Circuit breaker at capacity'));
        }

        throw new Error(`Circuit breaker '${this.config.name}' at capacity`);
      }

      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);

      if (fallback) {
        return await this.executeFallback(fallback, error as Error);
      }

      throw error;
    } finally {
      if (currentState === 'HALF_OPEN') {
        this.halfOpenCalls--;
      }
    }
  }

  /**
   * Execute fallback function with error handling
   */
  private async executeFallback<T>(
    fallback: FallbackFunction<T>,
    error: Error
  ): Promise<T> {
    try {
      logger.info('Executing fallback', {
        name: this.config.name
      });

      return await fallback(error);
    } catch (fallbackError) {
      logger.error('Fallback execution failed', {
        name: this.config.name,
        error: fallbackError
      });

      throw fallbackError;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    const state = this.stateMachine.getState();

    this.totalCalls++;
    this.totalSuccesses++;
    this.successCount++;
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();

    // Add to rolling window
    this.addToRollingWindow(true);

    if (state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;

      logger.debug('Success in HALF_OPEN', {
        name: this.config.name,
        consecutiveSuccesses: this.consecutiveSuccesses,
        threshold: this.config.successThreshold
      });

      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.stateMachine.close();
        this.consecutiveSuccesses = 0;
        this.lastStateChange = Date.now();

        logger.info('Circuit CLOSED', {
          name: this.config.name,
          reason: 'Success threshold reached'
        });
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    const state = this.stateMachine.getState();

    this.totalCalls++;
    this.totalFailures++;
    this.failureCount++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    // Add to rolling window
    this.addToRollingWindow(false);

    logger.warn('Execution failed', {
      name: this.config.name,
      state,
      failureCount: this.failureCount,
      error: error.message
    });

    // Check if should open circuit
    if (this.shouldOpenCircuit()) {
      this.stateMachine.open();
      this.lastStateChange = Date.now();

      logger.error('Circuit OPENED', {
        name: this.config.name,
        failureCount: this.failureCount,
        errorRate: this.calculateErrorRate()
      });
    }

    // If in HALF_OPEN, any failure opens the circuit
    if (state === 'HALF_OPEN') {
      this.stateMachine.open();
      this.lastStateChange = Date.now();

      logger.error('Circuit OPENED from HALF_OPEN', {
        name: this.config.name,
        reason: 'Failure during test'
      });
    }
  }

  /**
   * Check if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    const state = this.stateMachine.getState();

    // Don't re-open if already open or half-open
    if (state !== 'CLOSED') {
      return false;
    }

    // Check consecutive failures
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check error rate if configured
    if (this.config.errorRateThreshold && this.config.volumeThreshold) {
      if (this.totalCalls >= this.config.volumeThreshold) {
        const errorRate = this.calculateErrorRate();
        return errorRate >= this.config.errorRateThreshold;
      }
    }

    return false;
  }

  /**
   * Check if should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.timeout;
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    if (this.totalCalls === 0) return 0;

    // Calculate from rolling window if configured
    if (this.config.rollingWindowSize) {
      const now = Date.now();
      const windowStart = now - this.config.rollingWindowSize;

      const windowCalls = this.rollingWindow.filter(c => c.timestamp >= windowStart);
      if (windowCalls.length === 0) return 0;

      const windowFailures = windowCalls.filter(c => !c.success).length;
      return (windowFailures / windowCalls.length) * 100;
    }

    // Fallback to total stats
    return (this.totalFailures / this.totalCalls) * 100;
  }

  /**
   * Add call result to rolling window
   */
  private addToRollingWindow(success: boolean): void {
    if (!this.config.rollingWindowSize) return;

    const now = Date.now();
    this.rollingWindow.push({ success, timestamp: now });

    // Clean old entries
    const windowStart = now - this.config.rollingWindowSize;
    this.rollingWindow = this.rollingWindow.filter(c => c.timestamp >= windowStart);
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.stateMachine.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      errorRate: this.calculateErrorRate(),
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
      halfOpenCalls: this.halfOpenCalls
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.stateMachine.getState();
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    logger.info('Circuit breaker reset', {
      name: this.config.name
    });

    this.stateMachine.close();
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenCalls = 0;
    this.lastStateChange = Date.now();
  }

  /**
   * Force open the circuit (for testing or manual intervention)
   */
  forceOpen(): void {
    logger.warn('Circuit breaker forced open', {
      name: this.config.name
    });

    this.stateMachine.open();
    this.lastStateChange = Date.now();
  }

  /**
   * Get configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }
}
