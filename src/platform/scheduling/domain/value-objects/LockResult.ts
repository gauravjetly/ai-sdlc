/**
 * LockResult Value Object
 *
 * Represents the result of a lock acquisition attempt.
 * Follows Result pattern for explicit error handling.
 */

export enum LockStatus {
  ACQUIRED = 'acquired',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  ALREADY_HELD = 'already_held',
}

export interface LockResultProps {
  status: LockStatus;
  lockId: string | null;
  resourceKey: string;
  holderId: string;
  acquiredAt?: Date;
  expiresAt?: Date;
  error?: string;
  retries?: number;
}

export class LockResult {
  readonly status: LockStatus;
  readonly lockId: string | null;
  readonly resourceKey: string;
  readonly holderId: string;
  readonly acquiredAt: Date | null;
  readonly expiresAt: Date | null;
  readonly error: string | null;
  readonly retries: number;

  constructor(props: LockResultProps) {
    this.status = props.status;
    this.lockId = props.lockId;
    this.resourceKey = props.resourceKey;
    this.holderId = props.holderId;
    this.acquiredAt = props.acquiredAt ?? null;
    this.expiresAt = props.expiresAt ?? null;
    this.error = props.error ?? null;
    this.retries = props.retries ?? 0;
  }

  /**
   * Check if lock was successfully acquired
   */
  isAcquired(): boolean {
    return this.status === LockStatus.ACQUIRED;
  }

  /**
   * Check if lock acquisition failed
   */
  isFailed(): boolean {
    return this.status === LockStatus.FAILED ||
           this.status === LockStatus.TIMEOUT ||
           this.status === LockStatus.ALREADY_HELD;
  }

  /**
   * Get time remaining until lock expires (in milliseconds)
   */
  getTimeRemaining(): number {
    if (!this.expiresAt) return 0;
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }

  /**
   * Create a successful lock acquisition result
   */
  static success(
    lockId: string,
    resourceKey: string,
    holderId: string,
    ttlMs: number,
    retries: number = 0
  ): LockResult {
    const acquiredAt = new Date();
    const expiresAt = new Date(acquiredAt.getTime() + ttlMs);

    return new LockResult({
      status: LockStatus.ACQUIRED,
      lockId,
      resourceKey,
      holderId,
      acquiredAt,
      expiresAt,
      retries,
    });
  }

  /**
   * Create a failed lock acquisition result
   */
  static failure(
    resourceKey: string,
    holderId: string,
    error: string,
    retries: number = 0
  ): LockResult {
    return new LockResult({
      status: LockStatus.FAILED,
      lockId: null,
      resourceKey,
      holderId,
      error,
      retries,
    });
  }

  /**
   * Create a timeout result
   */
  static timeout(
    resourceKey: string,
    holderId: string,
    retries: number
  ): LockResult {
    return new LockResult({
      status: LockStatus.TIMEOUT,
      lockId: null,
      resourceKey,
      holderId,
      error: `Lock acquisition timed out after ${retries} retries`,
      retries,
    });
  }

  /**
   * Create an already-held result
   */
  static alreadyHeld(
    resourceKey: string,
    holderId: string,
    currentHolder: string
  ): LockResult {
    return new LockResult({
      status: LockStatus.ALREADY_HELD,
      lockId: null,
      resourceKey,
      holderId,
      error: `Lock already held by: ${currentHolder}`,
      retries: 0,
    });
  }

  /**
   * Convert to JSON for logging/debugging
   */
  toJSON(): Record<string, unknown> {
    return {
      status: this.status,
      lockId: this.lockId,
      resourceKey: this.resourceKey,
      holderId: this.holderId,
      acquiredAt: this.acquiredAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      error: this.error,
      retries: this.retries,
      isAcquired: this.isAcquired(),
      timeRemaining: this.getTimeRemaining(),
    };
  }
}
