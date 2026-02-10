# ADR-019: Data Persistence Strategy

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Data Architecture

---

## Context

The Deltek Catalyst platform requires persistent data storage for:

- **Relational Data**: Users, tenants, deployments, cloud resources
- **Time-Series Data**: Metrics, costs, audit logs
- **Document Data**: Agent outputs, configurations, JSON payloads
- **Cache Data**: Session data, API responses, real-time state
- **Search Data**: Full-text search across logs, configurations
- **Vector Data**: AI embeddings for semantic search

The current implementation uses in-memory storage with no persistence.

## Decision

**We will implement a polyglot persistence strategy** with specialized databases for each workload:

### Database Selection Matrix

| Data Type | Database | Rationale |
|-----------|----------|-----------|
| Core relational | PostgreSQL 15 | ACID, JSON support, mature |
| Time-series | TimescaleDB (PostgreSQL extension) | Native time partitioning |
| Caching | Redis 7 Cluster | Low latency, pub/sub |
| Search | Elasticsearch 8 | Full-text, analytics |
| Object storage | S3 / Azure Blob | Logs, artifacts, backups |
| Vector | pgvector (PostgreSQL extension) | AI embeddings, similarity search |

### Architecture

```
+------------------------------------------------------------------+
|                    DATA PERSISTENCE ARCHITECTURE                  |
+------------------------------------------------------------------+
|                                                                   |
|  APPLICATION LAYER                                                |
|  +------------------------------------------------------------+  |
|  |                  Repository Interfaces                      |  |
|  |  IDeploymentRepository | IUserRepository | ICostRepository  |  |
|  +------------------------------------------------------------+  |
|                              |                                    |
|                              v                                    |
|  +------------------------------------------------------------+  |
|  |                 Repository Implementations                  |  |
|  +------------------------------------------------------------+  |
|       |           |           |           |           |           |
|       v           v           v           v           v           |
|  +--------+  +--------+  +--------+  +--------+  +--------+      |
|  |Postgres|  |Timescale|  | Redis |  |Elastic |  | S3/Blob|      |
|  +--------+  +--------+  +--------+  +--------+  +--------+      |
|       |           |           |           |           |           |
|       v           v           v           v           v           |
|  Core Data   Time-Series   Cache      Search      Objects        |
|  - Users     - Metrics     - Sessions - Logs      - Artifacts    |
|  - Tenants   - Costs       - API Cache- Configs   - Backups      |
|  - Deploys   - Audit       - Real-time- Search    - Reports      |
|  - Resources - Events      - Pub/Sub  - Analytics - Large files  |
|                                                                   |
+------------------------------------------------------------------+
```

### PostgreSQL Schema Design

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";   -- Range types
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector for embeddings

-- Partitioning strategy for large tables
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    trace_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- Auto-create future partitions via pg_partman
```

### Caching Strategy (Redis)

```typescript
// Cache key namespacing
const CACHE_KEYS = {
  user: (tenantId: string, userId: string) =>
    `tenant:${tenantId}:user:${userId}`,

  userPermissions: (tenantId: string, userId: string) =>
    `tenant:${tenantId}:user:${userId}:permissions`,

  deployment: (tenantId: string, deploymentId: string) =>
    `tenant:${tenantId}:deployment:${deploymentId}`,

  deploymentStatus: (deploymentId: string) =>
    `deployment:${deploymentId}:status`,

  apiResponse: (tenantId: string, hash: string) =>
    `tenant:${tenantId}:api:${hash}`,
};

// TTL configuration
const CACHE_TTL = {
  user: 300,              // 5 minutes
  userPermissions: 60,    // 1 minute
  deployment: 30,         // 30 seconds
  deploymentStatus: 5,    // 5 seconds (frequently updated)
  apiResponse: 60,        // 1 minute
};
```

## Alternatives Considered

### Primary Database

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **PostgreSQL** | ACID, JSON, extensions | Scaling complexity | **Selected** |
| MySQL | Popular, simple | Less feature-rich | Rejected |
| MongoDB | Document-native | Consistency concerns | Rejected |
| CockroachDB | Distributed PostgreSQL | Cost, complexity | Future consideration |

### Time-Series Database

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **TimescaleDB** | PostgreSQL-compatible | Extension dependency | **Selected** |
| InfluxDB | Purpose-built | Different query language | Rejected |
| Prometheus | Metrics-native | Not for business data | Used for infra metrics |

### Search Engine

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Elasticsearch** | Feature-rich, mature | Resource intensive | **Selected** |
| OpenSearch | OSS fork | Less ecosystem | Alternative |
| Meilisearch | Simple, fast | Less analytics | Rejected |
| PostgreSQL FTS | No extra system | Limited features | Rejected for search |

## Consequences

### Positive

1. **Right Tool for Job**: Each database optimized for its workload
2. **Scalability**: Independent scaling per data type
3. **Performance**: Specialized indexes and query engines
4. **Flexibility**: Easy to add new data stores

### Negative

1. **Complexity**: Multiple systems to manage
2. **Consistency**: Eventual consistency between stores
3. **Operations**: More operational overhead

### Mitigations

1. **Managed Services**: Use RDS, ElastiCache, OpenSearch Service
2. **Saga Pattern**: For cross-store transactions
3. **Monitoring**: Unified observability across stores

## Implementation Details

### Repository Pattern

```typescript
// src/domain/repositories/IDeploymentRepository.ts
export interface IDeploymentRepository {
  // CRUD
  create(deployment: Deployment): Promise<Deployment>;
  findById(id: string): Promise<Deployment | null>;
  update(id: string, data: Partial<Deployment>): Promise<Deployment>;
  delete(id: string): Promise<void>;

  // Queries
  findByTenant(tenantId: string, options: QueryOptions): Promise<PaginatedResult<Deployment>>;
  findByEnvironment(tenantId: string, env: Environment): Promise<Deployment[]>;
  findActive(tenantId: string): Promise<Deployment[]>;

  // Aggregations
  countByStatus(tenantId: string): Promise<Record<string, number>>;
}

// src/infrastructure/persistence/PostgresDeploymentRepository.ts
export class PostgresDeploymentRepository implements IDeploymentRepository {
  constructor(
    private db: Pool,
    private cache: RedisCache,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<Deployment | null> {
    // Try cache first
    const cached = await this.cache.get(`deployment:${id}`);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.db.query(
      'SELECT * FROM deployments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const deployment = this.mapToEntity(result.rows[0]);

    // Cache for future requests
    await this.cache.set(`deployment:${id}`, deployment, CACHE_TTL.deployment);

    return deployment;
  }

  async create(deployment: Deployment): Promise<Deployment> {
    const result = await this.db.query(
      `INSERT INTO deployments
        (id, tenant_id, name, version, environment, cloud_provider, status, configuration, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        deployment.id,
        deployment.tenantId,
        deployment.name,
        deployment.version,
        deployment.environment,
        deployment.cloudProvider,
        deployment.status,
        JSON.stringify(deployment.configuration),
        deployment.createdBy,
      ]
    );

    const created = this.mapToEntity(result.rows[0]);

    // Invalidate list caches
    await this.cache.deletePattern(`tenant:${deployment.tenantId}:deployments:*`);

    return created;
  }

  async findByTenant(
    tenantId: string,
    options: QueryOptions
  ): Promise<PaginatedResult<Deployment>> {
    const { page = 1, limit = 20, filter, sort } = options;
    const offset = (page - 1) * limit;

    // Build query
    let query = 'SELECT * FROM deployments WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filter?.environment) {
      query += ` AND environment = $${paramIndex++}`;
      params.push(filter.environment);
    }

    if (filter?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filter.status);
    }

    // Add sorting
    const sortColumn = sort?.field || 'created_at';
    const sortOrder = sort?.order || 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    // Execute
    const [dataResult, countResult] = await Promise.all([
      this.db.query(query, params),
      this.db.query(
        'SELECT COUNT(*) FROM deployments WHERE tenant_id = $1',
        [tenantId]
      ),
    ]);

    return {
      data: dataResult.rows.map(this.mapToEntity),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      hasMore: offset + dataResult.rows.length < parseInt(countResult.rows[0].count),
    };
  }
}
```

### Time-Series Data (TimescaleDB)

```sql
-- Create hypertable for metrics
CREATE TABLE deployment_metrics (
    time TIMESTAMPTZ NOT NULL,
    deployment_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    cpu_usage DOUBLE PRECISION,
    memory_usage DOUBLE PRECISION,
    request_count INTEGER,
    error_count INTEGER,
    latency_p50 DOUBLE PRECISION,
    latency_p99 DOUBLE PRECISION
);

SELECT create_hypertable('deployment_metrics', 'time');

-- Create continuous aggregates for dashboards
CREATE MATERIALIZED VIEW deployment_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS hour,
    deployment_id,
    tenant_id,
    AVG(cpu_usage) AS avg_cpu,
    AVG(memory_usage) AS avg_memory,
    SUM(request_count) AS total_requests,
    SUM(error_count) AS total_errors,
    AVG(latency_p50) AS avg_latency_p50,
    AVG(latency_p99) AS avg_latency_p99
FROM deployment_metrics
GROUP BY hour, deployment_id, tenant_id;
```

### Search (Elasticsearch)

```typescript
// Elasticsearch index mappings
const INDICES = {
  'catalyst-logs': {
    settings: {
      number_of_shards: 3,
      number_of_replicas: 1,
    },
    mappings: {
      properties: {
        timestamp: { type: 'date' },
        tenant_id: { type: 'keyword' },
        deployment_id: { type: 'keyword' },
        level: { type: 'keyword' },
        message: { type: 'text', analyzer: 'standard' },
        context: { type: 'object', enabled: false },
        trace_id: { type: 'keyword' },
      },
    },
  },
  'catalyst-configs': {
    mappings: {
      properties: {
        tenant_id: { type: 'keyword' },
        type: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        content: { type: 'text' },
        updated_at: { type: 'date' },
      },
    },
  },
};

// Search service
export class SearchService {
  constructor(private elastic: ElasticsearchClient) {}

  async searchLogs(params: LogSearchParams): Promise<SearchResult<Log>> {
    const { tenantId, query, deploymentId, level, from, to, page, limit } = params;

    const response = await this.elastic.search({
      index: 'catalyst-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { tenant_id: tenantId } },
              query ? { match: { message: query } } : null,
              deploymentId ? { term: { deployment_id: deploymentId } } : null,
              level ? { term: { level } } : null,
              {
                range: {
                  timestamp: {
                    gte: from,
                    lte: to,
                  },
                },
              },
            ].filter(Boolean),
          },
        },
        sort: [{ timestamp: 'desc' }],
        from: (page - 1) * limit,
        size: limit,
        highlight: {
          fields: { message: {} },
        },
      },
    });

    return {
      data: response.hits.hits.map(hit => ({
        ...hit._source,
        highlights: hit.highlight,
      })),
      total: response.hits.total.value,
      page,
      limit,
    };
  }
}
```

### Connection Management

```typescript
// src/infrastructure/persistence/ConnectionManager.ts
export class ConnectionManager {
  private pgPool: Pool;
  private redis: Redis.Cluster;
  private elastic: Client;

  async initialize(): Promise<void> {
    // PostgreSQL with connection pooling
    this.pgPool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,                    // Max connections per pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: config.postgres.ssl ? { rejectUnauthorized: false } : undefined,
    });

    // Redis Cluster
    this.redis = new Redis.Cluster([
      { host: config.redis.host, port: config.redis.port },
    ], {
      redisOptions: {
        password: config.redis.password,
        tls: config.redis.tls ? {} : undefined,
      },
      scaleReads: 'slave',
    });

    // Elasticsearch
    this.elastic = new Client({
      node: config.elastic.node,
      auth: {
        username: config.elastic.username,
        password: config.elastic.password,
      },
      tls: config.elastic.tls ? { rejectUnauthorized: false } : undefined,
    });

    // Health check
    await this.healthCheck();
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.pgPool.query('SELECT 1'),
      this.redis.ping(),
      this.elastic.ping(),
    ]);

    return {
      postgres: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      elasticsearch: checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
    };
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.pgPool.end(),
      this.redis.quit(),
      this.elastic.close(),
    ]);
  }
}
```

## Data Retention Policy

| Data Type | Retention | Archive Strategy |
|-----------|-----------|------------------|
| Transactional data | Indefinite | N/A |
| Audit logs | 7 years | S3 Glacier after 1 year |
| Deployment metrics | 90 days | Aggregated to daily after 30 days |
| Application logs | 30 days | S3 Standard-IA after 7 days |
| Cost data | 5 years | Archive after 2 years |
| Agent execution logs | 90 days | S3 after 30 days |

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TimescaleDB](https://docs.timescale.com/)
- [Redis Cluster](https://redis.io/docs/management/scaling/)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [pgvector](https://github.com/pgvector/pgvector)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
