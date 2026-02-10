# Zero-Downtime Deployment Strategies

Comprehensive deployment strategies for zero-downtime releases with database migration support.

## Quick Start

```typescript
import { DeploymentOrchestrator } from './deployment-orchestrator.js';

const orchestrator = new DeploymentOrchestrator();

// Rolling deployment
const result = await orchestrator.deploy({
  application: 'my-service',
  version: '1.0.0',
  environment: 'production',
  replicas: 10,
  image: 'my-service:1.0.0',
  healthCheck: {
    endpoint: 'localhost',
    port: 8080,
    path: '/health',
    protocol: 'http',
    interval_seconds: 10,
    timeout_seconds: 5,
    failure_threshold: 3,
    success_threshold: 1
  },
  strategy: {
    type: 'rolling',
    options: {
      max_unavailable: '20%',
      max_surge: '20%',
      progress_deadline_seconds: 600
    }
  }
});

console.log(`Deployment ${result.status}: ${result.deploymentId}`);
```

## Deployment Strategies

### 1. Rolling Deployment

**Best for**: General-purpose deployments, stateless applications

**How it works**:
- Updates pods in batches
- Waits for health checks before proceeding
- Configurable batch size and surge capacity

```typescript
strategy: {
  type: 'rolling',
  options: {
    max_unavailable: '20%',  // 20% of pods can be down during update
    max_surge: '20%',        // 20% additional pods during rollout
    progress_deadline_seconds: 600
  }
}
```

**Pros**:
- Resource efficient (no duplication)
- Simple and reliable
- Works for most applications

**Cons**:
- Rollback takes time
- Brief unavailability possible

### 2. Blue-Green Deployment

**Best for**: Critical production systems, instant rollback needed

**How it works**:
- Maintains two identical environments (blue and green)
- Deploys to inactive environment
- Runs smoke tests
- Switches traffic atomically
- Quick rollback by switching back

```typescript
strategy: {
  type: 'blue-green',
  options: {
    monitoring_period_seconds: 300,
    auto_rollback_on_error: true,
    cleanup_delay_seconds: 3600,
    smoke_tests: [
      {
        name: 'health_check',
        endpoint: '/health',
        method: 'GET',
        expected_status: 200,
        timeout_ms: 5000
      }
    ]
  }
}
```

**Pros**:
- Instant rollback
- No partial state
- Smoke testing before production traffic

**Cons**:
- Requires 2x resources temporarily
- More complex setup

### 3. Canary Deployment

**Best for**: High-risk deployments, gradual rollout with monitoring

**How it works**:
- Deploys new version alongside stable
- Routes small % of traffic to canary
- Monitors metrics (error rate, latency, success rate)
- Gradually increases traffic if metrics OK
- Automatic rollback if metrics fail

```typescript
strategy: {
  type: 'canary',
  options: {
    stages: [
      { traffic_percent: 5, duration_seconds: 600 },
      { traffic_percent: 25, duration_seconds: 600 },
      { traffic_percent: 50, duration_seconds: 600 },
      { traffic_percent: 100, duration_seconds: 0 }
    ],
    metrics: {
      error_rate_threshold: 0.01,       // 1%
      latency_p99_threshold_ms: 500,    // 500ms
      success_rate_threshold: 0.999     // 99.9%
    },
    auto_promotion: true,
    auto_rollback: true
  }
}
```

**Pros**:
- Risk mitigation through gradual rollout
- Metric-based validation
- Automatic rollback on issues
- Perfect for A/B testing

**Cons**:
- Longer deployment time
- More complex monitoring setup

## Database Migrations

### Expand-Contract Pattern

Zero-downtime schema changes using the expand-contract pattern:

```typescript
import { MigrationExamples } from './migrations/migration-manager.js';

const migrations = [
  MigrationExamples.addEmailColumn(),      // EXPAND
  MigrationExamples.backfillEmailData(),   // MIGRATE
  MigrationExamples.removeUserContactsTable() // CONTRACT
];

const result = await orchestrator.deployWithMigration(config, migrations);
```

**Three Phases**:

1. **EXPAND**: Add new schema elements
   - Add new columns (nullable or with defaults)
   - Create new tables
   - Add indexes
   - **Always rollback-safe**

2. **MIGRATE**: Backfill data
   - Enable dual writes (old + new schema)
   - Backfill existing data
   - Verify consistency
   - **Rollback-safe**

3. **CONTRACT**: Remove old schema
   - Remove old columns/tables
   - **NOT rollback-safe**

### Custom Migrations

```typescript
const customMigration: Migration = {
  id: 'add_user_preferences_001',
  version: '2.0.0',
  phase: 'expand',
  description: 'Add user preferences table',
  up_script: `
    CREATE TABLE user_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      theme VARCHAR(50),
      language VARCHAR(10)
    );
    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
  `,
  down_script: `
    DROP INDEX idx_user_preferences_user_id;
    DROP TABLE user_preferences;
  `,
  created_at: new Date().toISOString()
};

await migrationManager.executeMigration(customMigration);
```

## Operations

### Rollback

```typescript
// Rollback deployment
await orchestrator.rollback(deploymentId, 'rolling', {
  reason: 'High error rate detected'
});
```

### Pause/Resume

```typescript
// Pause deployment
await orchestrator.pauseDeployment(deploymentId, 'rolling');

// Resume deployment
await orchestrator.resumeDeployment(deploymentId, 'rolling');
```

### Status Check

```typescript
const status = await orchestrator.getDeploymentStatus(deploymentId, 'rolling');
console.log(`Status: ${status.status}`);
console.log(`Progress: ${status.progress_percent}%`);
console.log(`Replicas: ${status.replicas.ready}/${status.replicas.desired}`);
```

## Configuration

Configuration file: `/config/deployment-strategies.yaml`

Environment-specific overrides:

```yaml
environments:
  dev:
    rolling:
      max_unavailable: 50%
      max_surge: 50%

  prod:
    rolling:
      max_unavailable: 10%  # More conservative
      max_surge: 20%

    canary:
      stages:
        - traffic_percent: 1   # Start with 1%
          duration_seconds: 600
        - traffic_percent: 5
          duration_seconds: 900
        # ... more stages
```

## Health Checks

```typescript
healthCheck: {
  endpoint: 'api.example.com',
  port: 8080,
  path: '/health',
  protocol: 'http',
  interval_seconds: 10,
  timeout_seconds: 5,
  failure_threshold: 3,
  success_threshold: 1,
  initial_delay_seconds: 15
}
```

**Probe Types**:
- **Readiness**: Is pod ready for traffic?
- **Liveness**: Is pod still alive?
- **Startup**: Has pod finished initialization?

## Examples

See `/examples/deployment-example.ts` for complete working examples of all deployment strategies.

Run the example:

```bash
tsx examples/deployment-example.ts
```

## Testing

```bash
# Run all deployment tests
npm test -- tests/deployment

# Run specific test
npm test -- tests/deployment/rolling-deployment.test.ts

# Run with coverage
npm run test:coverage -- tests/deployment
```

## API Reference

### DeploymentOrchestrator

Main coordinator for all deployments.

```typescript
class DeploymentOrchestrator {
  deploy(config: DeploymentConfig): Promise<DeploymentResult>
  deployWithMigration(config: DeploymentConfig, migrations: Migration[]): Promise<DeploymentResult>
  rollback(deploymentId: string, strategyType: DeploymentStrategyType, config?: RollbackConfig): Promise<void>
  getDeploymentStatus(deploymentId: string, strategyType: DeploymentStrategyType): Promise<DeploymentStatusResult>
  pauseDeployment(deploymentId: string, strategyType: DeploymentStrategyType): Promise<void>
  resumeDeployment(deploymentId: string, strategyType: DeploymentStrategyType): Promise<void>
  getMigrationManager(): DatabaseMigrationManager
}
```

### DatabaseMigrationManager

Manages database schema migrations.

```typescript
class DatabaseMigrationManager {
  executeMigration(migration: Migration): Promise<MigrationResult>
  rollbackMigration(migrationId: string): Promise<MigrationResult>
  registerSchemaVersion(version: SchemaVersion): void
  isVersionCompatible(currentVersion: string, targetVersion: string): boolean
  getCurrentVersion(): string
  setCurrentVersion(version: string): void
  getMigrationHistory(): Migration[]
}
```

## Architecture

```
deployment/
├── strategies/
│   ├── base-strategy.ts          # Abstract base class
│   ├── rolling-deployment.ts     # Rolling updates
│   ├── blue-green-deployment.ts  # Dual environment
│   └── canary-deployment.ts      # Progressive rollout
├── migrations/
│   └── migration-manager.ts      # Database migrations
├── deployment-orchestrator.ts    # Main coordinator
├── types.ts                      # TypeScript types
└── index.ts                      # Public API
```

## Best Practices

1. **Choose the Right Strategy**
   - Use **rolling** for general deployments
   - Use **blue-green** for critical systems
   - Use **canary** for high-risk changes

2. **Health Checks**
   - Always configure proper health checks
   - Set realistic timeouts
   - Test health check endpoints

3. **Monitoring**
   - Watch deployment progress
   - Monitor application metrics during deployment
   - Set up alerts for failed deployments

4. **Rollback Plan**
   - Test rollback procedures
   - Keep previous version deployable
   - Document rollback steps

5. **Database Migrations**
   - Always use expand-contract pattern
   - Test migrations in staging first
   - Keep migrations small and focused
   - Never combine multiple changes in one migration

6. **Resource Planning**
   - Blue-green requires 2x resources temporarily
   - Plan for surge capacity in rolling deployments
   - Monitor resource usage during deployments

## Troubleshooting

### Deployment Stuck

```typescript
// Check status
const status = await orchestrator.getDeploymentStatus(deploymentId, 'rolling');
console.log('Current stage:', status.current_stage);
console.log('Events:', status.events);

// Pause to investigate
await orchestrator.pauseDeployment(deploymentId, 'rolling');
```

### Health Checks Failing

- Verify health check endpoint is accessible
- Check timeout settings
- Review application logs
- Ensure pods have enough resources

### Rollback Not Working

- Check deployment history
- Verify previous version is available
- Review rollback logs
- Ensure sufficient resources for rollback

## License

Part of AI-Native Multi-Cloud DevOps Platform.

## Support

For issues or questions, refer to the main platform documentation.
