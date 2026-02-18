# Agent Mesh Deployment Summary

**Deployed:** 2026-02-18
**Status:** RUNNING

---

## What Is Running

### 1. Mesh Orchestrator Daemon

The orchestrator is the central nervous system of the agent mesh. It runs as a persistent background process and handles event routing, learning propagation, inbox housekeeping, and health monitoring.

- **Binary:** `~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh`
- **PID file:** `~/.claude/agent-mesh/orchestrator/orchestrator.pid`
- **Log file:** `~/.claude/agent-mesh/orchestrator/orchestrator.log`
- **State file:** `~/.claude/agent-mesh/orchestrator/state.json`
- **Poll interval:** 2 seconds per cycle

### 2. Agent Hooks

Shell functions that individual agents source to integrate with the mesh at lifecycle points.

- **File:** `~/.claude/agent-mesh/agent-hooks.sh`

### 3. Mesh CLI

Command-line tool for sending messages, recording learnings, and querying collective intelligence.

- **File:** `~/.claude/agent-mesh/mesh-cli.sh`

### 4. Dashboard Mesh API

Three new REST endpoints on the dashboard server (port 3030) for observing the mesh.

- `GET /api/mesh/status` — Orchestrator state, inbox depths, knowledge counts, recent logs
- `GET /api/mesh/events` — Last 20 learning events with propagation status
- `GET /api/mesh/knowledge` — All collective knowledge items from all categories

---

## How to Check Status

```bash
# Orchestrator daemon status
bash ~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh status

# Dashboard API (returns JSON)
curl http://localhost:3030/api/mesh/status | python3 -m json.tool

# Orchestrator log (live tail)
tail -f ~/.claude/agent-mesh/orchestrator/orchestrator.log

# Check a specific agent inbox
ls ~/.claude/agent-mesh/bus/inboxes/engineer/
```

---

## How Agents Use the Mesh

### Start of agent session (check inbox + load intelligence briefing)

```bash
source ~/.claude/agent-mesh/agent-hooks.sh
mesh_agent_start "engineer" "SDLC-20260218-001"
```

### Send a message to another agent

```bash
# Via hooks (sourced)
mesh_send_message "ba" "jets" "Requirements ready for architecture review"

# Via CLI
bash ~/.claude/agent-mesh/mesh-cli.sh send \
  --from ba \
  --to jets \
  --subject "Requirements ready for architecture review" \
  --content "See REQ-20260218-001.md for full details"
```

### Emit an event (triggers coordination rules → automatic routing)

```bash
# Via hooks (sourced)
mesh_emit_event "engineer" "code.committed" '{"project_id":"SDLC-20260218-001","branch":"feature/auth"}'

# This will automatically notify: security, qa, tracker (per RULE-003)
```

### Record a learning to collective memory

```bash
bash ~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent engineer \
  --title "TypeScript strict mode catches 30% more bugs at compile time" \
  --description "Enabling strict mode in tsconfig.json caught null-reference bugs before runtime" \
  --category "best-practice"
```

### End of agent session (emit completion event)

```bash
mesh_agent_finish "engineer" "SDLC-20260218-001" "success"
```

---

## Coordination Rules (Event Routing)

The orchestrator automatically routes events to relevant agents based on 14 coordination rules:

| Rule | Trigger Event | Notifies |
|------|---------------|----------|
| RULE-001 | `phase.requirements.completed` | jets, tracker |
| RULE-002 | `phase.architecture.completed` | engineer, security, ux, tracker |
| RULE-003 | `code.committed` | security, qa, tracker |
| RULE-004 | `security.review.completed` | qa, engineer, tracker |
| RULE-005 | `tests.completed` | atlas, tracker |
| RULE-006 | `deployment.completed` | customer, finops, tracker |
| RULE-007 | `security.vulnerability.found` | engineer, ask-tom, tracker |
| RULE-008 | `problem.solved` | (captures learning) |
| RULE-009 | `customer.feedback` | ba, engineer, tracker |
| RULE-010 | `build.failed` | ask-tom, tracker |
| RULE-011 | `tests.failed` | engineer, ask-tom, tracker |
| RULE-012 | `learning.discovered` | (propagates to all agents) |
| RULE-013 | `conflict.raised` | conductor |
| RULE-014 | `cost.alert` | conductor, atlas |

---

## Collective Intelligence

Knowledge is stored in categorized directories under `~/.claude/agent-mesh/collective-memory/knowledge/`:

| Category | Purpose |
|----------|---------|
| `best-practice` | Proven approaches that worked |
| `anti-pattern` | Approaches that failed |
| `architecture-decision` | Key design decisions |
| `security-insight` | Security learnings |
| `performance-insight` | Performance optimizations |
| `integration-pattern` | API/service integration patterns |
| `error-pattern` | Bug patterns and fixes |
| `process-improvement` | Workflow improvements |
| `cross-agent-learning` | General cross-agent learnings |
| `conflict-resolution` | How conflicts were resolved |

---

## Log File Locations

| Log | Path |
|-----|------|
| Orchestrator | `~/.claude/agent-mesh/orchestrator/orchestrator.log` |
| Dashboard server | `/Users/gauravjetly/aisdlc-2.1.0/dashboard/dashboard-server.log` |
| Mesh bus (message log) | `~/.claude/agent-mesh/bus/log/` |
| Audit trail | `~/.claude/agent-mesh/audit/` |
| Dead-letter queue | `~/.claude/agent-mesh/orchestrator/dead-letter/` |

---

## Starting the Orchestrator After a Reboot

```bash
# Start the orchestrator in the background
nohup bash ~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh start \
  > /tmp/mesh-orchestrator-startup.log 2>&1 &

# Fix the PID file (known issue: inner subshell writes its PID first)
sleep 2
ACTUAL_PID=$(pgrep -f "mesh-orchestrator.sh start" | head -1)
echo "$ACTUAL_PID" > ~/.claude/agent-mesh/orchestrator/orchestrator.pid

# Verify
bash ~/.claude/agent-mesh/orchestrator/mesh-orchestrator.sh status
```

---

## Source Files (Version Controlled)

The canonical source lives in the project repository:

| File | Path |
|------|------|
| Orchestrator | `src/agent-mesh/orchestrator/mesh-orchestrator.sh` |
| Agent hooks | `src/agent-mesh/orchestrator/agent-hooks.sh` |
| Deploy script | `src/agent-mesh/orchestrator/deploy-mesh.sh` |
| Operations guide | `src/agent-mesh/orchestrator/AGENT-MESH-OPERATIONS.md` |
| Dashboard server | `dashboard/server.js` (includes `/api/mesh/*` endpoints) |

To redeploy after changes to the source files:

```bash
bash src/agent-mesh/orchestrator/deploy-mesh.sh
```
