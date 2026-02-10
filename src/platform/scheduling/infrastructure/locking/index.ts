/**
 * Distributed Locking Infrastructure
 *
 * Redis-based distributed locking for preventing race conditions
 * in agent allocation across multiple scheduler instances.
 */

// Domain
export { LockConfig } from '../../domain/value-objects/LockConfig.js';
export { LockResult, LockStatus } from '../../domain/value-objects/LockResult.js';
export type {
  ILockRepository,
  AcquireLockParams,
  ReleaseLockParams,
  ExtendLockParams,
  LockInfo,
} from '../../domain/repositories/ILockRepository.js';

// Infrastructure
export { RedisLockRepository } from './RedisLockRepository.js';
export type { RedisLockRepositoryConfig } from './RedisLockRepository.js';

export { RedisLockManager, ILogger } from './RedisLockManager.js';
export type { RedisLockManagerConfig } from './RedisLockManager.js';

export { LockManagerFactory } from './LockManagerFactory.js';
export type { LockManagerFactoryConfig } from './LockManagerFactory.js';
