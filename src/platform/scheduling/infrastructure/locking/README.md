# Distributed Locking Infrastructure

Redis-based distributed locking implementation using the Redlock algorithm for preventing race conditions in agent allocation.

## Overview

This module provides a robust distributed locking mechanism to ensure that multiple scheduler instances don't allocate the same agent to different projects simultaneously.

## Components

### Domain Layer

- **LockConfig** (`domain/value-objects/LockConfig.ts`): Immutable configuration for lock behavior
- **LockResult** (`domain/value-objects/LockResult.ts`): Result object with explicit success/failure status
- **ILockRepository** (`domain/repositories/ILockRepository.ts`): Repository interface for lock operations

### Infrastructure Layer

- **RedisLockRepository** (`infrastructure/locking/RedisLockRepository.ts`): Redis implementation using Lua scripts
- **RedisLockManager** (`infrastructure/locking/RedisLockManager.ts`): High-level service with retry logic and error handling

## Features

- **Atomic Operations**: Uses Lua scripts for atomic check-and-set operations
- **Automatic Expiration**: Locks automatically expire after TTL to prevent deadlocks
- **Retry with Backoff**: Configurable retry strategies (exponential, linear, constant)
- **Lock Extension**: Support for long-running operations
- **Graceful Degradation**: Optional mode to continue without locking if Redis is unavailable
- **Health Monitoring**: Built-in health checks for Redis connectivity

## Usage

### Basic Example

```typescript
import Redis from 'ioredis';
import { RedisLockRepository } from './infrastructure/locking/RedisLockRepository';
import { RedisLockManager } from './infrastructure/locking/RedisLockManager';
import { LockConfig } from './domain/value-objects/LockConfig';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create repository
const repository = new RedisLockRepository({
  redis,
  keyPrefix: 'lock:',
});

// Create manager
const lockManager = new RedisLockManager({
  repository,
  defaultConfig: LockConfig.default(),
  gracefulDegradation: false,
});

// Acquire lock
const result = await lockManager.acquire(
  'agent:agent-1',
  'project:proj-1',
  LockConfig.forShortOperation()
);

if (result.isAcquired()) {
  try {
    // Perform agent allocation
    await allocateAgent();
  } finally {
    // Always release lock
    await lockManager.release(result);
  }
}
```

### Using withLock Helper

```typescript
const { result, lockResult } = await lockManager.withLock(
  'agent:agent-1',
  'project:proj-1',
  async () => {
    // This function runs with lock held
    return await allocateAgent();
  },
  LockConfig.forShortOperation()
);

if (result !== null) {
  console.log('Agent allocated successfully');
}
```

### Lock Configuration

```typescript
// Short operation (10 seconds, 3 retries)
const shortConfig = LockConfig.forShortOperation();

// Long operation (2 minutes, 5 retries)
const longConfig = LockConfig.forLongOperation();

// Custom configuration
const customConfig = new LockConfig({
  ttlMs: 30000,              // 30 seconds
  retryDelayMs: 100,         // 100ms initial delay
  maxRetries: 4,             // 4 retry attempts
  retryStrategy: 'exponential', // exponential backoff
  backoffMultiplier: 2,      // double delay each retry
});
```

## Integration with ProjectOrchestrationService

The `ProjectOrchestrationService` uses distributed locking to prevent race conditions during agent allocation:

```typescript
const service = new ProjectOrchestrationService(
  projectRepo,
  agentPool,
  lockManager,  // Optional: pass lock manager
  logger        // Optional: pass logger
);

// Lock is automatically used during agent allocation
const allocated = await service.processReadyProjects();
```

## Lock Key Format

Locks use the following key format:

```
lock:agent:{agentId}
```

Example: `lock:agent:ba_agent_1`

This ensures that each agent can only be allocated to one project at a time.

## Retry Strategies

### Exponential Backoff (Default)

```
Attempt 0: 100ms
Attempt 1: 200ms
Attempt 2: 400ms
Attempt 3: 800ms
```

### Linear Backoff

```
Attempt 0: 100ms
Attempt 1: 200ms
Attempt 2: 300ms
Attempt 3: 400ms
```

### Constant Backoff

```
Attempt 0: 100ms
Attempt 1: 100ms
Attempt 2: 100ms
Attempt 3: 100ms
```

## Error Handling

The lock manager follows the Result pattern and never throws on lock acquisition failure:

```typescript
const result = await lockManager.acquire('agent:agent-1', 'project:proj-1');

if (!result.isAcquired()) {
  console.log(`Lock acquisition failed: ${result.error}`);
  console.log(`Status: ${result.status}`);
  console.log(`Retries: ${result.retries}`);
  return;
}

// Proceed with locked operation
```

## Graceful Degradation

In development mode or when Redis is temporarily unavailable, you can enable graceful degradation:

```typescript
const lockManager = new RedisLockManager({
  repository,
  gracefulDegradation: true, // Continue without locking if Redis fails
  logger,
});
```

**Warning**: Use graceful degradation only in development or when race conditions are acceptable.

## Monitoring

### Health Checks

```typescript
// Check Redis connectivity
const healthy = await lockManager.checkHealth();

// Get health status
const status = lockManager.getHealthStatus();
console.log(`Healthy: ${status.healthy}`);
console.log(`Graceful degradation: ${status.gracefulDegradation}`);
```

### Logging

The lock manager logs important events:

- **debug**: Lock acquired/released/extended
- **warn**: Lock acquisition timeout, already held
- **error**: Redis errors, operation failures

## Testing

### Unit Tests

```bash
npm run test:unit -- tests/unit/scheduling/infrastructure/locking
```

### Integration Tests

Requires running Redis instance:

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
REDIS_URL=redis://localhost:6379 npm run test:integration -- tests/integration/scheduling/locking
```

## Performance Considerations

- Lock operations are typically < 5ms with local Redis
- Network latency affects acquisition time
- Use short TTLs for fast operations (10-30 seconds)
- Use longer TTLs for slow operations (1-2 minutes)
- Consider lock extension for operations that may exceed TTL

## Security

- Locks use UUID-based identifiers to prevent guessing
- Lua scripts ensure atomic operations
- Lock values include instance ID for debugging
- Automatic expiration prevents permanent locks

## Troubleshooting

### Lock Not Acquired

1. Check Redis connectivity: `await lockManager.checkHealth()`
2. Verify another process isn't holding the lock
3. Check lock TTL isn't too long
4. Increase retry count or delay

### Lock Released Prematurely

1. Increase TTL for long operations
2. Use lock extension for operations > 30 seconds
3. Check for errors in operation code

### High Lock Contention

1. Reduce lock scope (use more specific keys)
2. Implement work queue to serialize operations
3. Scale Redis if needed (Redis Cluster)

## References

- [Redlock Algorithm](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Redis SET NX PX](https://redis.io/commands/set/)
- [Lua Scripting in Redis](https://redis.io/docs/manual/programmability/eval-intro/)
