# ADR-002: Use PostgreSQL as Primary Database

## Status

**ACCEPTED** - 2026-01-15

## Context

We need to select a database for the Task Management API. Requirements include:
- Reliable data persistence
- Support for complex queries (filtering, sorting, pagination)
- ACID compliance for data integrity
- Scalability for 10,000+ tasks per user
- Open source (cost constraint)

### Options Considered

1. **PostgreSQL**
2. MySQL/MariaDB
3. MongoDB
4. SQLite

## Decision

We will use **PostgreSQL 15+** with **Prisma ORM**.

## Rationale

### Why PostgreSQL

| Factor | Assessment |
|--------|------------|
| **ACID Compliance** | Full ACID support for data integrity |
| **JSON Support** | Native JSONB for flexible data if needed |
| **Performance** | Excellent query optimizer, advanced indexing |
| **Reliability** | Battle-tested, used by major companies |
| **Scalability** | Connection pooling, read replicas, partitioning |
| **Features** | Full-text search, CTEs, window functions |
| **Community** | Large, active community, extensive documentation |

### Why Prisma ORM

| Factor | Assessment |
|--------|------------|
| **Type Safety** | End-to-end TypeScript types from schema |
| **Migrations** | Declarative schema, automatic migrations |
| **Query Builder** | Intuitive, type-safe query API |
| **Performance** | Efficient query generation, connection pooling |
| **Developer Experience** | Excellent documentation, Prisma Studio |

### Comparison Matrix

| Criterion | PostgreSQL | MySQL | MongoDB | SQLite |
|-----------|------------|-------|---------|--------|
| ACID | Full | Full | Partial | Full |
| Scalability | Excellent | Excellent | Excellent | Limited |
| Complex Queries | Excellent | Good | Limited | Good |
| JSON Support | Excellent | Good | Native | Limited |
| Type Safety (Prisma) | Full | Full | Partial | Full |
| Operational Cost | Medium | Medium | Medium | Very Low |
| Replication | Excellent | Excellent | Excellent | N/A |

## Schema Design

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    status task_status DEFAULT 'todo',
    priority priority_level DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);

-- Enum types
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
```

## Consequences

### Positive

- **Data integrity** guaranteed through ACID transactions
- **Type safety** with Prisma-generated types
- **Efficient queries** with proper indexing
- **Flexible schema** evolution with migrations
- **Production-ready** for enterprise workloads

### Negative

- **Operational overhead** compared to SQLite
- **Connection management** required (pooling)
- **Schema migrations** need careful planning

### Mitigation

- Use managed PostgreSQL (AWS RDS, CloudSQL) for reduced ops
- Implement connection pooling with Prisma or PgBouncer
- Test migrations in staging before production

## Related Decisions

- ADR-001: Node.js + TypeScript (Prisma compatibility)
- ADR-004: Layered Architecture (Repository pattern)

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
