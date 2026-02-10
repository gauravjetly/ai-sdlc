/**
 * LockConfig Value Object
 *
 * Configuration for distributed lock acquisition and management.
 * Immutable value object following DDD principles.
 */

export interface LockConfigProps {
  ttlMs?: number;                  // Lock time-to-live in milliseconds
  retryDelayMs?: number;            // Initial retry delay
  maxRetries?: number;              // Maximum retry attempts
  retryStrategy?: 'exponential' | 'linear' | 'constant';
  backoffMultiplier?: number;       // For exponential backoff
}

export class LockConfig {
  readonly ttlMs: number;
  readonly retryDelayMs: number;
  readonly maxRetries: number;
  readonly retryStrategy: 'exponential' | 'linear' | 'constant';
  readonly backoffMultiplier: number;

  // Default values based on Redlock algorithm recommendations
  private static readonly DEFAULT_TTL_MS = 30000;           // 30 seconds
  private static readonly DEFAULT_RETRY_DELAY_MS = 100;     // 100ms
  private static readonly DEFAULT_MAX_RETRIES = 4;          // 4 retries
  private static readonly DEFAULT_STRATEGY = 'exponential';
  private static readonly DEFAULT_BACKOFF_MULTIPLIER = 2;

  constructor(props: LockConfigProps = {}) {
    this.ttlMs = props.ttlMs ?? LockConfig.DEFAULT_TTL_MS;
    this.retryDelayMs = props.retryDelayMs ?? LockConfig.DEFAULT_RETRY_DELAY_MS;
    this.maxRetries = props.maxRetries ?? LockConfig.DEFAULT_MAX_RETRIES;
    this.retryStrategy = props.retryStrategy ?? LockConfig.DEFAULT_STRATEGY;
    this.backoffMultiplier = props.backoffMultiplier ?? LockConfig.DEFAULT_BACKOFF_MULTIPLIER;

    this.validate();
  }

  private validate(): void {
    if (this.ttlMs <= 0) {
      throw new Error('TTL must be positive');
    }
    if (this.ttlMs > 300000) { // 5 minutes max
      throw new Error('TTL cannot exceed 5 minutes');
    }
    if (this.retryDelayMs < 0) {
      throw new Error('Retry delay cannot be negative');
    }
    if (this.maxRetries < 0) {
      throw new Error('Max retries cannot be negative');
    }
    if (this.backoffMultiplier < 1) {
      throw new Error('Backoff multiplier must be >= 1');
    }
  }

  /**
   * Calculate the delay for a given retry attempt
   */
  calculateRetryDelay(attempt: number): number {
    if (attempt < 0 || attempt >= this.maxRetries) {
      throw new Error(`Invalid retry attempt: ${attempt}`);
    }

    switch (this.retryStrategy) {
      case 'exponential':
        return this.retryDelayMs * Math.pow(this.backoffMultiplier, attempt);
      case 'linear':
        return this.retryDelayMs * (attempt + 1);
      case 'constant':
        return this.retryDelayMs;
      default:
        throw new Error(`Unknown retry strategy: ${this.retryStrategy}`);
    }
  }

  /**
   * Get total maximum wait time across all retries
   */
  getTotalMaxWaitTime(): number {
    let total = 0;
    for (let i = 0; i < this.maxRetries; i++) {
      total += this.calculateRetryDelay(i);
    }
    return total;
  }

  /**
   * Create a config optimized for short-lived operations
   */
  static forShortOperation(): LockConfig {
    return new LockConfig({
      ttlMs: 10000,           // 10 seconds
      retryDelayMs: 50,       // 50ms
      maxRetries: 3,
      retryStrategy: 'exponential',
    });
  }

  /**
   * Create a config optimized for long-running operations
   */
  static forLongOperation(): LockConfig {
    return new LockConfig({
      ttlMs: 120000,          // 2 minutes
      retryDelayMs: 200,      // 200ms
      maxRetries: 5,
      retryStrategy: 'exponential',
    });
  }

  /**
   * Create default configuration
   */
  static default(): LockConfig {
    return new LockConfig();
  }
}
