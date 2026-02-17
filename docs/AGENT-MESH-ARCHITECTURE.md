# Agent Mesh Architecture

## Inter-Agent Communication & Collective Learning System

**Version**: 1.0.0
**Date**: 2026-02-15
**Status**: Implemented

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Components](#components)
4. [Communication Patterns](#communication-patterns)
5. [Collective Memory](#collective-memory)
6. [Learning Engine](#learning-engine)
7. [Conflict Resolution](#conflict-resolution)
8. [Safety Mechanisms](#safety-mechanisms)
9. [Integration Guide](#integration-guide)
10. [File System Layout](#file-system-layout)
11. [Architecture Decision Records](#architecture-decision-records)

---

## Executive Summary

The Agent Mesh transforms the AI-SDLC framework from isolated agent silos into a true Agentic AI platform where:

- **Agents discover each other** through the Agent Registry
- **Agents communicate directly** through the file-based Message Bus
- **Knowledge propagates automatically** through the Learning Engine
- **Collective intelligence grows** through Collective Memory
- **Disagreements are resolved systematically** through the Conflict Resolution Protocol
- **Everything is auditable** through the Audit Log

### Key Design Decisions

1. **File-based communication** -- Works within Claude Code's Task tool architecture without external dependencies
2. **Filesystem as message bus** -- Durable, observable, debuggable
3. **JSON files as messages** -- Human-readable, easily inspectable
4. **No external services required** -- No Redis, no database, no message queue needed
5. **Progressive learning** -- Knowledge confidence grows with evidence

---

## Architecture Overview

```
   +------------------------------------------------------------------+
   |                         USER / CLI                                  |
   +------------------------------------------------------------------+
                                  |
   +------------------------------------------------------------------+
   |                      AGENT MESH LAYER                              |
   |                                                                    |
   |  +------------+  +-------------+  +------------------+            |
   |  |   Agent    |  |  Message    |  |   Collective     |            |
   |  |  Registry  |  |    Bus      |  |    Memory        |            |
   |  +-----+------+  +------+------+  +--------+---------+            |
   |        |                |                   |                      |
   |  +-----+------+  +------+------+  +--------+---------+            |
   |  |  Learning  |  |  Conflict   |  |    Audit         |            |
   |  |  Engine    |  | Resolution  |  |     Log          |            |
   |  +------------+  +-------------+  +------------------+            |
   +------------------------------------------------------------------+
                                  |
   +------------------------------------------------------------------+
   |                       AGENT LAYER                                  |
   |                                                                    |
   |  +---------+ +------+ +----+ +--------+ +----------+ +--------+  |
   |  |Conductor| |  BA  | |Jets| |Engineer| | Security | |   QA   |  |
   |  +---------+ +------+ +----+ +--------+ +----------+ +--------+  |
   |  +------+ +--------+ +----------+ +---------+ +--------+         |
   |  | UX   | | Atlas  | | Customer | | Ask Tom | |Tracker |         |
   |  +------+ +--------+ +----------+ +---------+ +--------+         |
   +------------------------------------------------------------------+
                                  |
   +------------------------------------------------------------------+
   |                    INDIVIDUAL AGENT MEMORY                         |
   |    ~/.claude/agent-memory/{agent}/                                 |
   +------------------------------------------------------------------+
```

---

## Components

### 1. Agent Registry (`src/agent-mesh/registry/`)

**Purpose**: Central directory of all agents, their capabilities, and communication rules.

**Key Features**:
- Dynamic agent registration and discovery
- Capability-based agent lookup
- Expertise-based routing
- Communication permission matrix
- Status tracking (available/busy/offline)

**File**: `~/.claude/agent-mesh/registry/agents.json`

**API**:
- `register(profile)` -- Register or update an agent
- `findByCapability(cap)` -- Find agents with specific capability
- `findByExpertise(keyword)` -- Find agents by expertise area
- `findBestAgentForTopic(topic)` -- Ranked agent recommendations
- `canCommunicate(sender, receiver)` -- Check communication permission
- `getCommunicationMatrix()` -- Full communication matrix

### 2. Message Bus (`src/agent-mesh/bus/`)

**Purpose**: File-based message delivery system for inter-agent communication.

**Key Features**:
- Priority-based message ordering (critical > high > normal > low)
- Message threading via correlation IDs
- Automatic TTL expiry (default 24 hours)
- Retry mechanism with configurable max retries
- Circuit breaker protection per agent
- Loop detection to prevent infinite message chains

**Directories**:
- `~/.claude/agent-mesh/bus/inboxes/{agent}/` -- Pending messages
- `~/.claude/agent-mesh/bus/outboxes/{agent}/` -- Sent messages
- `~/.claude/agent-mesh/bus/processed/` -- Completed messages
- `~/.claude/agent-mesh/bus/failed/` -- Failed/expired messages
- `~/.claude/agent-mesh/bus/log/` -- All messages (audit trail)

**Message Types**:
| Type | Description |
|------|-------------|
| `request` | Ask another agent for help |
| `response` | Reply to a request |
| `notification` | Inform agents of something |
| `learning` | Share a learning/insight |
| `consultation` | Formal expertise consultation |
| `escalation` | Escalate an issue |
| `broadcast` | Message to all agents |
| `knowledge-update` | Update shared knowledge |
| `conflict` | Report a disagreement |
| `resolution` | Resolve a conflict |

### 3. Collective Memory (`src/agent-mesh/memory/`)

**Purpose**: Shared knowledge base that all agents contribute to and read from.

**Key Features**:
- Category-organized knowledge storage
- Evidence-based confidence tracking
- Automatic duplicate detection and merging
- Relevance-scored search
- Knowledge versioning
- Access tracking for popularity metrics

**Confidence Levels**:
| Level | Evidence Count | Meaning |
|-------|---------------|---------|
| `speculative` | 0 | Hypothesis, unverified |
| `emerging` | 1 | Single data point |
| `established` | 3+ | Multiple confirmations |
| `proven` | 5+ | Widely confirmed |

**Categories**:
- `cross-agent-learning` -- Learnings spanning multiple agent domains
- `error-pattern` -- Recognized error signatures and solutions
- `best-practice` -- Proven approaches that work well
- `anti-pattern` -- Approaches to avoid
- `architecture-decision` -- Architecture choices and rationale
- `security-insight` -- Security-related discoveries
- `performance-insight` -- Performance-related discoveries
- `process-improvement` -- Workflow improvements
- `conflict-resolution` -- How past conflicts were resolved
- `integration-pattern` -- Working integration approaches

### 4. Learning Engine (`src/agent-mesh/learning/`)

**Purpose**: Automatic learning detection, extraction, and propagation.

**Key Features**:
- Trigger-based learning capture
- Relevance-based propagation to target agents
- Automatic pattern detection (errors, best practices, security)
- Agent intelligence briefing generation
- Learning event tracking and history

**Learning Triggers**:
| Trigger | Description |
|---------|-------------|
| `problem-solved` | A problem was successfully resolved |
| `error-encountered` | An error pattern was detected |
| `pattern-recognized` | A reusable pattern was identified |
| `consultation-completed` | Cross-agent consultation finished |
| `conflict-resolved` | Agent conflict was resolved |
| `performance-anomaly` | Unusual performance detected |
| `security-finding` | Security issue found |
| `process-deviation` | Workflow deviated from expected |
| `manual` | Manually created learning |

**Propagation Map**: Learnings are automatically routed to agents based on category relevance. For example:
- `security-insight` --> security, engineer, qa, atlas
- `error-pattern` --> engineer, qa, ask-tom, atlas
- `architecture-decision` --> jets, engineer, security, atlas

### 5. Conflict Resolution (`src/agent-mesh/protocols/`)

**Purpose**: Systematic resolution when agents disagree on technical decisions.

**Resolution Priority Chain**:
1. **Consensus** -- All agents agree (best outcome)
2. **Expertise-Weighted Vote** -- Domain expert opinion carries more weight
3. **Majority Vote** -- Simple majority decides
4. **Conductor Decision** -- Conductor breaks the tie
5. **User Decision** -- Escalate to human (last resort)

**Expertise Weights** (example for security domain):
| Agent | Weight |
|-------|--------|
| Security | 5 |
| Architect | 3 |
| Engineer | 2 |
| QA | 2 |

All conflict resolutions are recorded as collective learnings to prevent re-litigation.

### 6. Audit Log (`src/agent-mesh/audit/`)

**Purpose**: Complete audit trail for observability and debugging.

**Key Features**:
- Date-partitioned storage for efficient queries
- Event-type based searching
- Agent-specific filtering
- Communication graph generation
- Statistics and reporting
- Configurable retention (default 30 days)

**Event Types Tracked**:
- Message sent/received/processed/failed
- Learning created/propagated
- Knowledge updated
- Conflict detected/resolved
- Agent registered/deregistered
- Circuit breaker state changes

---

## Communication Patterns

### Pattern 1: Direct Request/Response

```
Engineer                          Security
  |                                  |
  |-- REQUEST: "Review auth code" -->|
  |                                  |-- Processes request
  |<-- RESPONSE: "Found 3 issues" --|
  |                                  |
  |-- ACK ------------------------->|
```

### Pattern 2: Learning Propagation

```
Security          Learning Engine        Engineer, QA, Atlas
  |                     |                      |
  |-- LEARNING -------->|                      |
  |  "JWT best         |-- Analyze relevance  |
  |   practice"        |                      |
  |                     |-- NOTIFICATION ----->| (auto-propagated)
  |                     |                      |
  |                     |-- Store in           |
  |                     |   collective memory  |
```

### Pattern 3: Conflict Resolution

```
Engineer    Security    Conflict Resolver   Conductor
  |           |              |                 |
  |-- POSITION: "Use        |                 |
  |   localStorage" ------->|                 |
  |           |              |                 |
  |           |-- POSITION: |                 |
  |           |  "Use       |                 |
  |           |  httpOnly   |                 |
  |           |  cookies"-->|                 |
  |           |              |-- Expertise    |
  |           |              |   weighted     |
  |           |              |   vote:        |
  |           |              |   Security     |
  |           |              |   wins (5x     |
  |           |              |   weight)      |
  |<-- RESOLUTION -----------|                |
  |           |<- RESOLUTION-|                |
```

### Pattern 4: Escalation to Ask Tom

```
Engineer                Conductor             Ask Tom
  |                        |                     |
  |-- ESCALATION:          |                     |
  |  "Build failure" ----->|                     |
  |                        |-- Check mesh for    |
  |                        |   similar problems  |
  |                        |                     |
  |                        |-- ESCALATION ------>|
  |                        |  "Need root cause"  |
  |                        |                     |-- Investigate
  |                        |                     |
  |                        |<-- RESOLUTION ------|
  |                        |  "Found: missing    |
  |                        |   env variable"     |
  |<-- NOTIFICATION -------|                     |
  |  "Fix: set DATABASE_URL"                     |
```

---

## Safety Mechanisms

### Loop Detection

Each message carries a `correlationId`. The system tracks the number of messages in each correlation chain. If the chain exceeds the configured depth (default: 10), the message is rejected.

```
Message 1 (depth 1) --> Message 2 (depth 2) --> ... --> Message 10 (depth 10)
                                                              |
                                                              v
                                                     Message 11 REJECTED
                                                     "Loop detected"
```

### Circuit Breakers

Each agent has an independent circuit breaker:

```
CLOSED (normal) --[failure]--> counting
                                  |
                          [threshold reached]
                                  |
                                  v
                              OPEN (blocking)
                                  |
                          [timeout elapsed]
                                  |
                                  v
                          HALF-OPEN (testing)
                            /           \
                      [success]      [failure]
                         /               \
                        v                 v
                    CLOSED             OPEN
```

**Default Configuration**:
- Failure threshold: 5 consecutive failures
- Reset timeout: 60 seconds
- When open: All messages to that agent are rejected

### Message TTL

Messages expire after 24 hours by default. Expired messages are moved to the `failed/` directory with an "expired" reason tag.

### Communication ACLs

The Agent Registry defines which agents can send to which other agents. Unauthorized communication attempts are rejected.

---

## Integration Guide

### For New Agents

1. Add agent profile to `src/agent-mesh/registry/agent-registry.ts`
2. Create inbox directory: `~/.claude/agent-mesh/bus/inboxes/{agent-id}/`
3. Add mesh integration instructions to agent's system prompt
4. Reference `agents/agent-mesh-integration.md` for protocol details

### For Existing Agents

All existing agents should add this to their startup routine:

```bash
# Initialize mesh (idempotent)
~/.claude/agent-mesh/mesh-cli.sh init 2>/dev/null || true

# Check inbox
~/.claude/agent-mesh/mesh-cli.sh inbox {agent-id}

# Get briefing
~/.claude/agent-mesh/mesh-cli.sh briefing {agent-id}
```

And this to their completion routine:

```bash
# Report learning
~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent {agent-id} \
  --title "{learning title}" \
  --description "{learning details}" \
  --category "{category}"
```

---

## File System Layout

```
~/.claude/agent-mesh/
|
+-- registry/
|   +-- agents.json                         # Agent profiles and capabilities
|
+-- bus/
|   +-- inboxes/
|   |   +-- conductor/                      # One directory per agent
|   |   +-- ba/
|   |   +-- jets/
|   |   +-- ux/
|   |   +-- engineer/
|   |   |   +-- high-2026-02-15T...-uuid.json   # Message files
|   |   +-- security/
|   |   +-- qa/
|   |   +-- atlas/
|   |   +-- customer/
|   |   +-- ask-tom/
|   |   +-- tracker/
|   |   +-- finops/
|   +-- outboxes/{agent}/                   # Sent message copies
|   +-- processed/                          # Acknowledged messages
|   +-- failed/                             # Failed/expired messages
|   +-- log/                                # All messages (audit)
|
+-- collective-memory/
|   +-- knowledge/
|   |   +-- cross-agent-learning/           # Multi-agent learnings
|   |   +-- error-pattern/                  # Error signatures
|   |   +-- best-practice/                  # Best practices
|   |   +-- anti-pattern/                   # Things to avoid
|   |   +-- architecture-decision/          # ADRs
|   |   +-- security-insight/               # Security learnings
|   |   +-- performance-insight/            # Performance learnings
|   |   +-- process-improvement/            # Process improvements
|   |   +-- conflict-resolution/            # Conflict resolutions
|   |   +-- integration-pattern/            # Integration patterns
|   +-- index.json                          # Knowledge index
|
+-- learning/
|   +-- events/                             # Learning event records
|   +-- patterns/                           # Recognized patterns
|
+-- conflicts/                              # Conflict records
|
+-- audit/
|   +-- 2026-02-15/                         # Date-partitioned
|   |   +-- {uuid}.json                     # Audit entries
|   +-- 2026-02-16/
|
+-- mesh-cli.sh                             # CLI interface
```

---

## Architecture Decision Records

### ADR-001: File-Based Message Bus

**Context**: Need a communication mechanism that works within Claude Code's Task tool architecture where agents are spawned as subprocesses.

**Decision**: Use the filesystem as the message bus. Each agent has an inbox directory. Messages are JSON files written to the receiver's inbox.

**Consequences**:
- (+) Works within Claude Code without modifications
- (+) No external services needed (Redis, RabbitMQ, etc.)
- (+) All state is human-readable and inspectable
- (+) Durable -- survives process restarts
- (-) Higher latency than in-memory message queues
- (-) No real-time push notifications (poll-based)

### ADR-002: Collective Memory over Individual Memory

**Context**: Each agent had its own memory system. Knowledge was siloed.

**Decision**: Create a shared Collective Memory layer that all agents can read from and contribute to, while keeping individual agent memory for agent-specific data.

**Consequences**:
- (+) Knowledge discovered by one agent benefits all
- (+) Reduces duplicate problem solving
- (+) Evidence-based confidence prevents misinformation
- (-) Requires discipline in knowledge categorization
- (-) Potential for knowledge conflicts (resolved by Conflict Resolution)

### ADR-003: Expertise-Weighted Conflict Resolution

**Context**: When agents disagree (e.g., engineer wants localStorage, security wants httpOnly cookies), need a fair resolution mechanism.

**Decision**: Multi-stage resolution: consensus, expertise-weighted vote, majority vote, conductor decision, user decision.

**Consequences**:
- (+) Domain experts have more influence in their domain
- (+) Multiple fallback mechanisms ensure resolution
- (+) All resolutions are recorded as learnings
- (-) Expertise weights need tuning over time

### ADR-004: Learning Propagation Map

**Context**: Not all learnings are relevant to all agents. Need targeted propagation.

**Decision**: Maintain a static propagation map that defines which agents receive learnings from which categories. Combined with agent interest profiles.

**Consequences**:
- (+) Agents only receive relevant learnings
- (+) Reduces noise and information overload
- (-) Requires manual updates when agent responsibilities change
- (-) May miss edge cases where unexpected agents would benefit

---

## Source Code Locations

| Component | Source Path |
|-----------|------------|
| Types | `src/agent-mesh/types/index.ts` |
| Agent Registry | `src/agent-mesh/registry/agent-registry.ts` |
| Message Bus | `src/agent-mesh/bus/message-bus.ts` |
| Collective Memory | `src/agent-mesh/memory/collective-memory.ts` |
| Learning Engine | `src/agent-mesh/learning/learning-engine.ts` |
| Conflict Resolution | `src/agent-mesh/protocols/conflict-resolution.ts` |
| Audit Log | `src/agent-mesh/audit/audit-log.ts` |
| Main Facade | `src/agent-mesh/index.ts` |
| Shell CLI | `scripts/mesh-cli.sh` |
| Protocol Docs | `src/agent-mesh/protocols/agent-mesh-protocol.md` |
| Integration Guide | `agents/agent-mesh-integration.md` |
| Tests | `src/agent-mesh/tests/agent-mesh.test.ts` |

---

*This architecture was designed by Ask Tom using the systematic E.L.I.M.I.N.A.T.E. methodology, analyzing the constraints of the Claude Code architecture and designing a solution that enables true agentic collaboration.*
