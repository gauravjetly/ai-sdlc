/**
 * ILockRepository Interface
 *
 * Repository abstraction for distributed lock operations.
 * Follows Repository pattern and Dependency Inversion Principle.
 * Infrastructure implementations must satisfy this contract.
 */

export interface AcquireLockParams {
  resourceKey: string;
  holderId: string;
  ttlMs: number;
}

export interface ReleaseLockParams {
  resourceKey: string;
  lockId: string;
  holderId: string;
}

export interface ExtendLockParams {
  resourceKey: string;
  lockId: string;
  holderId: string;
  additionalTtlMs: number;
}

export interface LockInfo {
  resourceKey: string;
  lockId: string;
  holderId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

/**
 * Repository interface for distributed lock management.
 * Implementations should use Redis or similar distributed store.
 */
export interface ILockRepository {
  /**
   * Attempt to acquire a lock on a resource
   *
   * @returns lockId if successful, null if lock is already held
   */
  acquire(params: AcquireLockParams): Promise<string | null>;

  /**
   * Release a lock on a resource
   *
   * @returns true if lock was released, false if lock not found or not owned
   */
  release(params: ReleaseLockParams): Promise<boolean>;

  /**
   * Extend the TTL of an existing lock
   *
   * @returns true if extended, false if lock not found or not owned
   */
  extend(params: ExtendLockParams): Promise<boolean>;

  /**
   * Check if a lock exists for a resource
   */
  exists(resourceKey: string): Promise<boolean>;

  /**
   * Get information about a lock
   *
   * @returns lock info if exists, null otherwise
   */
  getInfo(resourceKey: string): Promise<LockInfo | null>;

  /**
   * Force release a lock (admin operation)
   * Use with caution - can break distributed guarantees
   */
  forceRelease(resourceKey: string): Promise<boolean>;

  /**
   * Check connection health
   */
  ping(): Promise<boolean>;
}
