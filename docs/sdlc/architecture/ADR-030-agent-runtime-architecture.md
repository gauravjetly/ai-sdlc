# ADR-030: Agent Runtime Architecture

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Conductor (Orchestrator)
**Context**: Agentic AI Platform Transformation

---

## Context

The current agent runtime is the Claude Code `Task` tool, which spawns a sub-agent in a subprocess that shares the filesystem with the parent process. This is single-threaded, serialized, and ephemeral -- the agent runs, produces output, and terminates. There is no persistent process, no concurrent execution, and no lifecycle management.

For a true agentic platform, we need agents that can:
- Execute concurrently (parallel task execution)
- Run reasoning loops (multi-step think-act-observe-reflect)
- Be monitored and controlled at runtime
- Have isolated execution contexts (sandboxing)
- Be scaled horizontally (multiple worker processes)

## Decision

**Adopt a worker-based agent execution model using BullMQ with Node.js worker processes.**

### Architecture

```
                    AGENT RUNTIME ARCHITECTURE
                    ═══════════════════════════

    [Dynamic Planner]
          │
          ▼
    [BullMQ Task Queue]
          │
    ┌─────┼─────┬─────────┐
    │     │     │         │
    ▼     ▼     ▼         ▼
  [Worker 1] [Worker 2] [Worker N]
    │           │           │
    ▼           ▼           ▼
  [Agent      [Agent      [Agent
   Sandbox]    Sandbox]    Sandbox]
    │           │           │
    ▼           ▼           ▼
  [Reasoning  [Reasoning  [Reasoning
   Engine]     Engine]     Engine]
    │           │           │
    ▼           ▼           ▼
  [Claude API][Claude API][Claude API]
```

Each worker:
1. Pulls tasks from the BullMQ queue
2. Creates an agent sandbox with the appropriate agent profile
3. Wraps the agent invocation in the Reasoning Engine
4. Reports results back through the event bus
5. Handles timeouts, retries, and error reporting

### Agent Sandbox

Each agent execution is isolated:
- Working directory scoped to the task
- Environment variables set per task
- Token budget enforced by the sandbox
- Timeout enforcement
- Tool access controlled by policy

### Reasoning Engine Integration

The Reasoning Engine wraps every agent invocation:
```typescript
class AgentSandbox {
  async execute(task: TaskNode, config: ReasoningConfig): Promise<TaskResult> {
    const context = await this.loadContext(task);
    const reasoning = new ReasoningEngine(config);

    return reasoning.run({
      agent: task.agentId,
      task: task.description,
      inputs: task.inputs,
      context,
      tools: await this.getTools(task.agentId),
      successCriteria: task.successCriteria,
    });
  }
}
```

## Alternatives Considered

### 1. Continue with Claude Code Task Tool
- **Pro**: Works today, no changes needed
- **Con**: No concurrency, no lifecycle management, no horizontal scaling
- **Rejected**: Cannot achieve Level 4+ agentic maturity

### 2. Kubernetes Job per Agent
- **Pro**: Full isolation, horizontal scaling, resource limits
- **Con**: High overhead per task (pod startup time), complex infrastructure
- **Rejected**: Over-engineered for most use cases; latency too high

### 3. AWS Lambda per Agent
- **Pro**: Serverless, automatic scaling, pay-per-use
- **Con**: Cold start latency, 15-minute timeout limit, vendor lock-in
- **Rejected**: LLM reasoning loops can exceed Lambda timeout

### 4. LangGraph-style Graph Runner
- **Pro**: Proven pattern, conditional routing, checkpointing
- **Con**: Different programming model, additional dependency
- **Rejected**: We can implement the core concepts (DAG execution, state checkpointing) natively

## Consequences

### Positive
- Concurrent agent execution (parallel tasks)
- Horizontal scaling via worker processes
- Resource isolation per task
- Fault tolerance (worker crash does not affect other tasks)
- Observable agent lifecycle

### Negative
- Increased infrastructure complexity (Redis required for BullMQ)
- Need to manage worker pool sizing
- Agent prompts must work outside Claude Code context

### Neutral
- Existing `/sdlc-*` commands remain as a synchronous entry point that enqueues work
- File-based agent mesh retained as development/debugging mode

## Migration Path

1. Phase 1: Implement BullMQ task queue alongside existing Task tool
2. Phase 2: Create worker process with agent sandbox and reasoning engine
3. Phase 3: Route new workflows through workers; retain Task tool for interactive use
4. Phase 4: Scale workers based on queue depth

---

**Related ADRs**: ADR-023 (BullMQ), ADR-031 (Communication Protocol), ADR-032 (Memory Architecture)
