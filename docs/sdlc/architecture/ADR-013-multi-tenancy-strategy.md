# ADR-013: Multi-Tenancy Strategy

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Data Architecture

---

## Context

The Deltek Catalyst platform needs to support multiple enterprise customers (tenants) with:

- Complete data isolation between tenants
- Independent scaling per tenant
- Tenant-specific customization
- Compliance with data residency requirements (GDPR, data sovereignty)
- Support for 1000+ tenants with varying sizes
- Different pricing tiers with resource quotas
- Audit logging per tenant

The current implementation is single-tenant with no isolation.

## Decision

**We will implement Schema-per-Tenant multi-tenancy** with the following design:

### 1. Isolation Model: Schema-per-Tenant

**Chosen**: PostgreSQL schemas with shared database cluster

```
Database Cluster
├── Database: catalyst_platform
│   ├── Schema: public (shared metadata)
│   │   ├── tenants
│   │   ├── global_config
│   │   └── subscription_plans
│   │
│   ├── Schema: tenant_acme_corp
│   │   ├── users
│   │   ├── deployments
│   │   ├── cloud_resources
│   │   └── audit_logs
│   │
│   ├── Schema: tenant_initech
│   │   ├── users
│   │   ├── deployments
│   │   └── ...
│   │
│   └── Schema: tenant_globex
│       └── ...
```

**Rationale**:
- Strong isolation with PostgreSQL row-level security
- Efficient resource utilization (shared indexes, connection pool)
- Easy backup/restore per tenant
- Supports tenant-specific migrations
- Cost-effective for small/medium tenants

### 2. Tenant Identification

**Chosen**: Subdomain + JWT claim + Database schema

```
Request: https://acme.catalyst.deltek.com/api/v1/deployments
         ^^^^
         Subdomain identifies tenant

JWT Token:
{
  "sub": "user-123",
  "tenant_id": "tenant_acme_corp",
  "tenant_subdomain": "acme",
  ...
}
```

### 3. Query Isolation: PostgreSQL RLS + Connection Context

**Chosen**: Row-Level Security with session context

```sql
-- Set tenant context on each request
SET app.current_tenant = 'tenant_acme_corp';
SET search_path TO tenant_acme_corp, public;

-- RLS policy enforces isolation
CREATE POLICY tenant_isolation ON deployments
  USING (tenant_id = current_setting('app.current_tenant')::TEXT);
```

### 4. Large Tenant Handling: Dedicated Database Option

**Chosen**: Hybrid approach - shared for standard, dedicated for enterprise

| Tier | Isolation Level | Database |
|------|----------------|----------|
| Starter | Schema | Shared |
| Professional | Schema | Shared |
| Enterprise | Database | Dedicated |
| Enterprise+ | Database | Dedicated + Region |

## Alternatives Considered

### Multi-Tenancy Models

| Model | Isolation | Cost | Complexity | Decision |
|-------|-----------|------|------------|----------|
| Row-Level (tenant_id column) | Low | Lowest | Low | Rejected - insufficient isolation |
| **Schema-per-Tenant** | High | Medium | Medium | **Selected** |
| Database-per-Tenant | Highest | High | High | Optional for Enterprise |
| Instance-per-Tenant | Maximum | Highest | Highest | Rejected - not cost-effective |

### Why Not Row-Level Only?

Row-level multi-tenancy (single table with `tenant_id`) was rejected because:

1. **Compliance Risk**: Accidental data leakage with missing WHERE clauses
2. **Performance**: Index bloat with large tenant variations
3. **Backup Complexity**: Cannot backup single tenant easily
4. **Noisy Neighbor**: Large tenants impact small tenants
5. **Customization**: Cannot have tenant-specific schema changes

### Why Not Database-per-Tenant for All?

1. **Connection Overhead**: Each database requires separate connection pool
2. **Operational Cost**: Managing 1000+ databases is complex
3. **Cost**: Dedicated RDS instances are expensive
4. **Most Tenants Are Small**: Don't need dedicated resources

## Consequences

### Positive

1. **Strong Isolation**: Schema-level separation prevents data leakage
2. **Compliance**: Meets GDPR, SOC2, HIPAA isolation requirements
3. **Flexible Scaling**: Large tenants can be migrated to dedicated DB
4. **Easy Operations**: Backup, restore, migrate per tenant
5. **Cost Efficiency**: Shared infrastructure for small tenants

### Negative

1. **Schema Management**: Must manage 1000+ schemas
2. **Migration Complexity**: Migrations must run per-schema
3. **Connection Pooling**: Need tenant-aware connection management

### Mitigations

1. **Automated Schema Management**: Terraform/Flyway for schema provisioning
2. **Connection Pooling**: PgBouncer with tenant-aware routing
3. **Monitoring**: Per-tenant resource usage dashboards

## Implementation Details

### Tenant Provisioning Flow

```
1. New Tenant Signup
   └── Create tenant record in public.tenants

2. Schema Creation (async)
   └── CREATE SCHEMA tenant_{subdomain}
   └── Run migrations in new schema
   └── Apply RLS policies
   └── Create initial admin user

3. DNS/Routing Setup
   └── Create subdomain record
   └── Configure API Gateway routing

4. Welcome Email
   └── Send admin credentials
   └── Getting started guide
```

### Middleware Implementation

```typescript
// Tenant context middleware
export const tenantMiddleware = async (req, res, next) => {
  // Extract tenant from subdomain or JWT
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant not identified' });
  }

  // Validate tenant exists and is active
  const tenant = await getTenant(tenantId);
  if (!tenant || tenant.status !== 'active') {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  // Set database context
  await setTenantContext(req.db, tenantId);

  // Attach to request
  req.tenant = tenant;

  next();
};

// Database context setter
const setTenantContext = async (db, tenantId) => {
  await db.query(`SET app.current_tenant = $1`, [tenantId]);
  await db.query(`SET search_path TO ${tenantId}, public`);
};
```

### Resource Quotas

```typescript
interface TenantQuotas {
  maxDeployments: number;        // Per month
  maxCloudResources: number;     // Active resources
  maxUsers: number;              // Team members
  maxAgentExecutions: number;    // Per month
  maxStorageGB: number;          // Total storage
  apiRateLimit: number;          // Requests per minute
}

const TIER_QUOTAS: Record<string, TenantQuotas> = {
  starter: {
    maxDeployments: 100,
    maxCloudResources: 10,
    maxUsers: 5,
    maxAgentExecutions: 500,
    maxStorageGB: 10,
    apiRateLimit: 100
  },
  professional: {
    maxDeployments: 1000,
    maxCloudResources: 50,
    maxUsers: 25,
    maxAgentExecutions: 5000,
    maxStorageGB: 100,
    apiRateLimit: 500
  },
  enterprise: {
    maxDeployments: -1,  // Unlimited
    maxCloudResources: -1,
    maxUsers: -1,
    maxAgentExecutions: -1,
    maxStorageGB: 1000,
    apiRateLimit: 2000
  }
};
```

### Tenant Data Model

```sql
-- Public schema (shared)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'provisioning',
  tier VARCHAR(50) DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  quotas JSONB DEFAULT '{}',

  -- Data residency
  primary_region VARCHAR(50) DEFAULT 'us-east-1',
  data_residency VARCHAR(10) DEFAULT 'US',  -- US, EU, APAC

  -- Billing
  stripe_customer_id VARCHAR(255),
  billing_email VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX idx_tenants_status ON public.tenants(status);
```

## References

- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant SaaS Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
- [Citus Multi-Tenant Guide](https://docs.citusdata.com/en/stable/use_cases/multi_tenant.html)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
