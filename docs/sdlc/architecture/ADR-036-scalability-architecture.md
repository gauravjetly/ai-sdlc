# ADR-036: Scalability Architecture - Horizontal Worker Pools

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Atlas (DevOps/SRE)
**Context**: Agentic AI Platform Transformation

---

## Context

The current system runs all agents within a single Claude Code session. This limits concurrency to one agent at a time and ties the platform to a single machine. The target is to support 100+ concurrent agent workflows.

## Decision

**Adopt a horizontal worker pool architecture where agent execution is distributed across multiple worker processes, coordinated by BullMQ queues and backed by PostgreSQL and Redis.**

### Architecture

```
                    SCALABILITY ARCHITECTURE
                    ═══════════════════════

    [API Gateway / CLI]
          │
          ▼
    [Orchestration Service]  ◄──► [PostgreSQL]
          │                           │
          │ Enqueue tasks             │ Store state
          ▼                           │
    [BullMQ Queues (Redis)]          │
          │                           │
    ┌─────┼─────┬─────────┐          │
    │     │     │         │          │
    ▼     ▼     ▼         ▼          │
  [Worker Pool 1]  ...  [Worker Pool N]
  (3 workers)          (3 workers)    │
    │                      │          │
    ▼                      ▼          │
  [Claude API]          [Claude API]  │
    │                      │          │
    └──────────┬───────────┘          │
               │                      │
               ▼                      │
    [Event Bus (Redis Streams)] ─────►│
               │
               ▼
    [Observability (OpenTelemetry)]
```

### Queue Design

```
QUEUES:
──────
tasks:critical    - Security findings, production issues
tasks:high        - Active workflow tasks
tasks:normal      - Standard workflow tasks
tasks:low         - Background learning, maintenance
tasks:scheduled   - Cron-triggered tasks

WORKER ALLOCATION:
──────────────────
Worker Pool 1 (3 workers):  tasks:critical, tasks:high
Worker Pool 2 (5 workers):  tasks:normal
Worker Pool 3 (2 workers):  tasks:low, tasks:scheduled

SCALING RULES:
──────────────
If tasks:high queue depth > 10 for 2 minutes:  scale up Worker Pool 1 by 2
If tasks:normal queue depth > 50 for 5 minutes: scale up Worker Pool 2 by 3
If all workers idle for 15 minutes:             scale down to minimum
```

### Concurrency Limits

```typescript
interface ConcurrencyConfig {
  maxWorkflowsConcurrent: number;        // Max parallel workflows: 100
  maxTasksPerWorkflow: number;           // Max parallel tasks in one workflow: 5
  maxTasksPerAgent: number;              // Max concurrent tasks for one agent type: 10
  maxTotalWorkers: number;               // Max total worker processes: 30

  // Resource limits per task
  taskLimits: {
    maxTokens: number;                   // Default: 100,000
    maxDuration: number;                 // Default: 300 seconds
    maxReasoningIterations: number;      // Default: 5
    maxToolCalls: number;                // Default: 50
  };
}
```

### State Management

All state is externalized to PostgreSQL and Redis:
- **Workflow state**: PostgreSQL `workflows` and `tasks` tables
- **Queue state**: Redis (managed by BullMQ)
- **Working memory**: Redis (per-task TTL keys)
- **Agent state**: PostgreSQL `agents` table
- **Event history**: PostgreSQL `events` table

This means workers are stateless and can be added or removed without data loss.

## Alternatives Considered

### 1. Single-Process Event Loop
- **Pro**: Simple, no distributed systems complexity
- **Con**: Limited to one workflow at a time, no fault isolation
- **Rejected**: Cannot achieve 100+ concurrent workflows

### 2. Kubernetes Job per Task
- **Pro**: Full isolation, auto-scaling, resource limits
- **Con**: 5-30 second pod startup time, high overhead per task
- **Rejected**: Latency too high for reasoning loops (each iteration would pay startup cost)

### 3. Serverless Functions (Lambda/Cloud Functions)
- **Pro**: Zero infrastructure, auto-scaling, pay-per-use
- **Con**: 15-minute timeout, cold starts, vendor lock-in
- **Rejected**: Reasoning loops with multiple LLM calls can exceed timeout

## Consequences

### Positive
- Horizontal scaling to 100+ concurrent workflows
- Fault isolation (worker crash does not affect other tasks)
- Priority-based scheduling (critical tasks processed first)
- Stateless workers enable zero-downtime deployments
- Resource limits prevent runaway tasks

### Negative
- Distributed systems complexity (network failures, state inconsistency)
- Redis becomes a critical dependency (needs HA configuration)
- Debugging distributed workflows is harder than single-process

### Mitigations
- Redis Sentinel or Cluster for high availability
- Distributed tracing (OpenTelemetry) for debugging
- Dead letter queues for failed tasks
- Health checks and automatic worker restart

---

**Related ADRs**: ADR-030 (Agent Runtime), ADR-031 (Communication Protocol), ADR-023 (BullMQ)
