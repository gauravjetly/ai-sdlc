# Agent Mesh Operations Guide

## Architecture Overview

The Agent Mesh is the communication backbone of the AI-SDLC platform, enabling 12 specialized agents to communicate, coordinate, and learn from each other autonomously.

```
                         AGENT MESH ARCHITECTURE

   +-----------+  +-----------+  +-----------+  +-----------+
   |    BA     |  |   Jets    |  | Engineer  |  | Security  |
   +-----+-----+  +-----+-----+  +-----+-----+  +-----+-----+
         |              |              |              |
   +-----v--------------v--------------v--------------v-----+
   |                   MESH ORCHESTRATOR                     |
   |  - Event Routing (14 coordination rules)                |
   |  - Learning Sync (auto-propagation)                     |
   |  - Health Monitoring                                    |
   |  - SDLC Event Bridge                                    |
   +----+----------------+----------------+----------------+-+
        |                |                |                |
   +----v----+    +------v------+   +-----v------+   +----v-----+
   | Message  |    | Collective  |   | Learning   |   | Audit    |
   |   Bus    |    |   Memory    |   |  Engine    |   |  Log     |
   +---------+    +-------------+   +------------+   +----------+
```

## Components

### 1. Mesh Orchestrator (`mesh-orchestrator.sh`)
**Location:** `~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh`

The central daemon that:
- Bridges events between `~/.claude/sdlc-registry/events/` and `~/.claude/agent-mesh/bus/`
- Routes events through coordination rules
- Propagates unpropagated learning events to all agents
- Monitors inbox health and expires stale messages
- Maintains operational state

**Commands:**
```bash
# Start background daemon (polls every 2 seconds)
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh start

# Stop daemon
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh stop

# Check status
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh status

# Run single processing cycle (no daemon)
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh process

# Route pending events manually
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh route

# Sync learnings across all agents
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh sync

# Show real-time dashboard
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh dashboard
```

### 2. Mesh CLI (`mesh-cli.sh`)
**Location:** `~/.claude/agent-mesh/mesh-cli.sh`

The command-line interface for agent-to-agent communication:

```bash
# Initialize mesh (creates directories and registry)
~/.claude/agent-mesh/mesh-cli.sh init

# Send message between agents
~/.claude/agent-mesh/mesh-cli.sh send \
  --from "engineer" \
  --to "security" \
  --type "request" \
  --priority "high" \
  --subject "Security review needed" \
  --content "Please review src/auth/"

# Read agent inbox
~/.claude/agent-mesh/mesh-cli.sh inbox engineer

# Acknowledge a message
~/.claude/agent-mesh/mesh-cli.sh ack engineer <message-id>

# Report a learning to collective memory
~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent "security" \
  --title "JWT Best Practice" \
  --description "Always use RS256 for JWT signing" \
  --category "security-insight" \
  --confidence "proven"

# Search collective knowledge
~/.claude/agent-mesh/mesh-cli.sh search --query "authentication"

# Get intelligence briefing for an agent
~/.claude/agent-mesh/mesh-cli.sh briefing engineer

# Check mesh health
~/.claude/agent-mesh/mesh-cli.sh health

# View audit report
~/.claude/agent-mesh/mesh-cli.sh audit --days 7
```

### 3. Agent Hooks (`agent-hooks.sh`)
**Location:** `~/.claude/agent-mesh/agent-hooks.sh`

Lifecycle hooks that agents use to integrate with the mesh:

```bash
# Source the hooks (for use within agent scripts)
source ~/.claude/agent-mesh/agent-hooks.sh

# Agent startup - loads inbox, collective intelligence, emits event
mesh_agent_start "engineer" "SDLC-20260217-001"

# Agent finish - emits completion event
mesh_agent_finish "engineer" "SDLC-20260217-001" "success"

# Emit an event (routed by orchestrator)
mesh_emit_event "engineer" "code.committed" '{"project_id":"PROJ-001","files":5}'

# Report a learning
mesh_report_learning "security" "Title" "Description" "security-insight" "proven"

# Send a message
mesh_send_message "engineer" "security" "Review needed" "Please review auth code"

# Or use standalone mode:
~/.claude/agent-mesh/agent-hooks.sh start engineer SDLC-20260217-001
~/.claude/agent-mesh/agent-hooks.sh finish engineer SDLC-20260217-001 success
~/.claude/agent-mesh/agent-hooks.sh emit engineer code.committed '{"files":5}'
```

## Coordination Rules

The orchestrator routes events based on 14 coordination rules defined in
`~/.claude/agent-mesh/orchestrator/coordination-rules.json`.

### Workflow Rules

| Rule | Trigger | Actions |
|------|---------|---------|
| RULE-001 | BA completes requirements | Notify Jets (high), Notify Tracker |
| RULE-002 | Jets completes architecture | Notify Engineer (high), Security (high), UX, Tracker |
| RULE-003 | Engineer commits code | Notify Security (high), QA (high), Tracker |
| RULE-004 | Security review complete | Notify QA (high), Engineer, Tracker |
| RULE-005 | Tests pass | Notify Atlas (high), Tracker |
| RULE-006 | Deployment complete | Notify Customer (high), FinOps, Tracker |

### Alert Rules

| Rule | Trigger | Actions |
|------|---------|---------|
| RULE-007 | Security vulnerability found | Notify Engineer (critical), Ask Tom (high), Tracker |
| RULE-010 | Build failed | Notify Ask Tom (critical), Tracker |
| RULE-011 | Tests failed | Notify Engineer (high), Ask Tom (high), Tracker |
| RULE-014 | Cost alert | Notify Conductor (high), Atlas |

### Learning Rules

| Rule | Trigger | Actions |
|------|---------|---------|
| RULE-008 | Problem solved (Ask Tom) | Auto-learn + Broadcast |
| RULE-009 | Customer feedback | Notify BA (high), Engineer, Tracker |
| RULE-012 | Learning discovered (any agent) | Propagate to all agents |
| RULE-013 | Conflict detected | Notify Conductor (high) |

## Collective Memory

Knowledge is stored in categories under `~/.claude/agent-mesh/collective-memory/knowledge/`:

| Category | Description |
|----------|-------------|
| `cross-agent-learning` | Learnings spanning multiple agents |
| `error-pattern` | Recognized error patterns and solutions |
| `best-practice` | Proven best practices |
| `anti-pattern` | Things to avoid |
| `architecture-decision` | Architecture decisions (ADRs) |
| `security-insight` | Security learnings |
| `performance-insight` | Performance learnings |
| `process-improvement` | Process improvements |
| `conflict-resolution` | How conflicts were resolved |
| `integration-pattern` | Integration patterns |

### Confidence Levels

- **speculative** - Unverified hypothesis
- **emerging** - Seen once, needs more evidence
- **established** - Seen multiple times, consistent results
- **proven** - Extensively validated, highly reliable

## Directory Structure

```
~/.claude/agent-mesh/
|-- agent-hooks.sh                    # Agent lifecycle hooks
|-- mesh-cli.sh                       # CLI for agent communication
|-- orchestrator/
|   |-- mesh-orchestrator.sh          # Central orchestrator daemon
|   |-- coordination-rules.json       # Event routing rules
|   |-- state.json                    # Orchestrator state
|   |-- orchestrator.log              # Orchestrator log
|   |-- orchestrator.pid              # PID file (when running)
|   |-- processed/                    # Processed events
|   |-- dead-letter/                  # Expired messages
|-- registry/
|   |-- agents.json                   # Agent registry (12 agents)
|-- bus/
|   |-- inboxes/{agent}/              # Per-agent message inboxes
|   |-- outboxes/{agent}/             # Per-agent sent messages
|   |-- processed/                    # Completed messages
|   |-- failed/                       # Failed messages
|   |-- log/                          # All messages (audit trail)
|-- collective-memory/
|   |-- knowledge/{category}/         # Knowledge items by category
|   |-- index.json                    # Knowledge index
|-- learning/
|   |-- events/                       # Learning events
|   |-- patterns/                     # Recognized patterns
|-- conflicts/                        # Conflict records
|-- audit/
|   |-- {YYYY-MM-DD}/                # Date-partitioned audit entries
```

## Agent Integration Guide

### For Agent Developers

Every agent should integrate with the mesh at 3 points:

1. **On Start** - Check inbox and load collective intelligence
2. **During Work** - Send messages, emit events, report learnings
3. **On Finish** - Emit completion event, acknowledge messages

```bash
# Minimal integration pattern:
source ~/.claude/agent-mesh/agent-hooks.sh

# 1. Start
mesh_agent_start "my-agent" "$PROJECT_ID"

# 2. Work (emit events as needed)
mesh_emit_event "my-agent" "phase.completed" '{"project_id":"'$PROJECT_ID'"}'
mesh_report_learning "my-agent" "What I learned" "Details..." "best-practice" "emerging"

# 3. Finish
mesh_agent_finish "my-agent" "$PROJECT_ID" "success"
```

### Message Types

| Type | Use Case |
|------|----------|
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

### Priority Levels

| Priority | Use Case | Auto-routing |
|----------|----------|-------------|
| `critical` | Security vulnerabilities, build failures | Yes (RULE-007, RULE-010) |
| `high` | Phase completions, review requests | Yes (RULE-001 through RULE-006) |
| `normal` | Status updates, informational | Default |
| `low` | Learnings, non-urgent | Learning propagation |

## Monitoring

### Health Check
```bash
~/.claude/agent-mesh/mesh-cli.sh health
```

### Dashboard
```bash
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh dashboard
```

### Orchestrator Status
```bash
~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh status
```

### Audit Trail
```bash
~/.claude/agent-mesh/mesh-cli.sh audit --days 7
```

## Troubleshooting

### Messages not being routed
1. Check if orchestrator is running: `mesh-orchestrator.sh status`
2. Run manual route: `mesh-orchestrator.sh route`
3. Check coordination rules match the event type
4. Check orchestrator log: `cat ~/.claude/agent-mesh/orchestrator/orchestrator.log`

### Learnings not propagating
1. Run sync: `mesh-orchestrator.sh sync`
2. Check learning events: `ls ~/.claude/agent-mesh/learning/events/`
3. Verify `propagated: false` in learning event files

### Agent not receiving messages
1. Check inbox exists: `ls ~/.claude/agent-mesh/bus/inboxes/{agent}/`
2. Run `mesh-cli.sh init` to create missing directories
3. Verify agent is in registry: `cat ~/.claude/agent-mesh/registry/agents.json`

### Variable scope bug (fixed)
The `ensure_dirs` function previously used `agent` as a loop variable, which clobbered the calling function's `agent` local variable. This was fixed by renaming the loop variable to `_agent`.

## Source Code Locations

| Component | Source | Runtime |
|-----------|--------|---------|
| Orchestrator | `src/agent-mesh/orchestrator/mesh-orchestrator.sh` | `~/.claude/agent-mesh/orchestrator/` |
| Agent Hooks | `src/agent-mesh/orchestrator/agent-hooks.sh` | `~/.claude/agent-mesh/agent-hooks.sh` |
| Deploy Script | `src/agent-mesh/orchestrator/deploy-mesh.sh` | N/A (run to deploy) |
| TypeScript API | `src/agent-mesh/index.ts` | `src/agent-mesh/dist/` |
| File Event Bus | `src/agent-mesh/bus/providers/file-event-bus-provider.ts` | TypeScript runtime |
| Exec Agent Event Bus | `src/agents/exec-agent/infrastructure/event_bus/file_event_bus.py` | Python runtime |
| Protocol Doc | `src/agent-mesh/protocols/agent-mesh-protocol.md` | Reference |
| Event Catalog | `src/agents/exec-agent/EVENT-CATALOG.md` | Reference |

---

*Last Updated: 2026-02-18*
*Maintained By: Ask Tom*
