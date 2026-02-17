# ADR-031: Communication Protocol - Event-Driven with File Fallback

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Atlas (DevOps/SRE)
**Context**: Agentic AI Platform Transformation

---

## Context

The current communication layer is entirely file-based. Messages are written as JSON files to agent inbox directories. Agents discover messages by listing directory contents. This design was intentionally chosen for durability, debuggability, and zero external dependencies.

However, file-based communication has fundamental limitations:
- **No real-time delivery** -- agents must poll their inbox
- **No pub/sub** -- cannot subscribe to topics or event patterns
- **No ordering guarantees** -- filesystem does not guarantee read order
- **No backpressure** -- a fast producer can overwhelm a slow consumer
- **No concurrent access safety** -- race conditions on file read/write
- **No distribution** -- only works on a single machine

## Decision

**Adopt a hybrid communication architecture: BullMQ (Redis-backed) as the primary event bus with file-based communication retained as a development/debug fallback.**

### Event Bus Architecture

```
    AGENT                                         AGENT
      │                                             ▲
      │ publish("task.completed", payload)          │ subscribe("task.*")
      │                                             │
      ▼                                             │
  ┌───────────────────────────────────────────────────┐
  │                 EVENT BUS ADAPTER                  │
  │                                                    │
  │  ┌──────────────────┐  ┌─────────────────────┐   │
  │  │  BullMQ Provider │  │  File-Based Provider│   │
  │  │  (Production)    │  │  (Development)      │   │
  │  └──────────────────┘  └─────────────────────┘   │
  │                                                    │
  │  Provider selected by configuration:               │
  │  EVENT_BUS=bullmq  or  EVENT_BUS=file             │
  └───────────────────────────────────────────────────┘
```

### Topic Hierarchy

```
events/
├── task/
│   ├── task.created          - New task added to DAG
│   ├── task.ready            - Dependencies satisfied
│   ├── task.started          - Agent began execution
│   ├── task.progress         - Intermediate update
│   ├── task.completed        - Successfully completed
│   ├── task.failed           - Failed after retries
│   └── task.replanned        - Plan was modified
├── workflow/
│   ├── workflow.created      - New workflow initiated
│   ├── workflow.started      - Execution began
│   ├── workflow.replanned    - DAG was modified
│   ├── workflow.completed    - All tasks done
│   └── workflow.failed       - Workflow failed
├── learning/
│   ├── learning.discovered   - New learning extracted
│   ├── learning.stored       - Stored in semantic memory
│   └── learning.applied      - Agent used a learning
├── conflict/
│   ├── conflict.raised       - Agents disagree
│   └── conflict.resolved     - Resolution reached
├── agent/
│   ├── agent.started         - Agent began reasoning
│   ├── agent.reasoning       - Reasoning step completed
│   ├── agent.tool-use        - Tool invocation
│   └── agent.completed       - Agent finished
└── system/
    ├── system.health         - Health check
    ├── system.budget.warning - Budget threshold
    └── system.error          - System error
```

### Interface

```typescript
interface EventBus {
  publish(topic: string, payload: any, metadata?: EventMetadata): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): Promise<Subscription>;
  unsubscribe(subscription: Subscription): Promise<void>;
  replay(topic: string, from: Date, to: Date): Promise<Event[]>;
  getHistory(traceId: string): Promise<Event[]>;
}

interface EventMetadata {
  traceId?: string;
  sourceAgent?: AgentId;
  workflowId?: string;
  taskId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}
```

## Alternatives Considered

### 1. Keep File-Based Only
- **Pro**: Simple, no dependencies, debuggable
- **Con**: No real-time, no pub/sub, no scaling
- **Rejected**: Cannot support concurrent agent execution or event-driven triggers

### 2. Apache Kafka
- **Pro**: Industry standard, incredible throughput, replay, exactly-once
- **Con**: Enormous operational overhead, requires JVM, overkill for our scale
- **Rejected**: Complexity far exceeds our needs (we are not processing millions of events/sec)

### 3. NATS
- **Pro**: Lightweight, fast, built-in pub/sub
- **Con**: Less ecosystem support, requires separate process
- **Rejected**: BullMQ already aligns with our Redis dependency and Node.js stack

### 4. Redis Pub/Sub (raw)
- **Pro**: Simple, built into Redis
- **Con**: No persistence (missed messages are lost), no retry, no queue semantics
- **Rejected**: Need message persistence and retry guarantees

## Consequences

### Positive
- Real-time event delivery to subscribers
- Topic-based routing for selective agent notifications
- Event replay for debugging and observability
- Backpressure handling via BullMQ queue semantics
- File-based fallback preserves single-machine development experience

### Negative
- Redis becomes a required dependency for production
- Need to manage two communication providers
- Additional operational complexity

### Neutral
- Existing message format (AgentMessage) is retained as the payload structure
- Circuit breaker logic moves from message bus to event bus adapter

---

**Related ADRs**: ADR-030 (Agent Runtime), ADR-023 (BullMQ), ADR-025 (Event-Driven Triggers)
