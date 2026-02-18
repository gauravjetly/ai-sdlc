#!/bin/bash
# ============================================================
# Agent Mesh Orchestrator
#
# The central nervous system of the AI-SDLC agent mesh.
# Polls for events, routes messages, triggers agent coordination,
# syncs learning across agents, and maintains mesh health.
#
# Usage:
#   mesh-orchestrator.sh start     - Start the orchestrator daemon
#   mesh-orchestrator.sh stop      - Stop the orchestrator
#   mesh-orchestrator.sh status    - Check orchestrator status
#   mesh-orchestrator.sh process   - Run one processing cycle (no daemon)
#   mesh-orchestrator.sh route     - Route pending events manually
#   mesh-orchestrator.sh sync      - Sync learning across all agents
#   mesh-orchestrator.sh dashboard - Show real-time mesh dashboard
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

MESH_BASE="${HOME}/.claude/agent-mesh"
SDLC_EVENTS="${HOME}/.claude/sdlc-registry/events"
ORCHESTRATOR_DIR="${MESH_BASE}/orchestrator"
PID_FILE="${ORCHESTRATOR_DIR}/orchestrator.pid"
LOG_FILE="${ORCHESTRATOR_DIR}/orchestrator.log"
STATE_FILE="${ORCHESTRATOR_DIR}/state.json"
COORDINATION_RULES="${ORCHESTRATOR_DIR}/coordination-rules.json"
POLL_INTERVAL=2  # seconds
MESH_CLI="${HOME}/.claude/agent-mesh/mesh-cli.sh"

ALL_AGENTS=("conductor" "ba" "jets" "ux" "engineer" "security" "qa" "atlas" "customer" "ask-tom" "tracker" "finops")

# ============================================================
# Utility Functions
# ============================================================

generate_uuid() {
  if command -v uuidgen &>/dev/null; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    python3 -c "import uuid; print(uuid.uuid4())"
  fi
}

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%S.000Z"
}

log() {
  local level="$1"
  shift
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${level}] $*" >> "${LOG_FILE}"
  if [ "$level" = "ERROR" ]; then
    echo "[MESH-ORCH] [${level}] $*" >&2
  fi
}

log_info()  { log "INFO" "$@"; }
log_warn()  { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_debug() { log "DEBUG" "$@"; }

ensure_dirs() {
  mkdir -p "${ORCHESTRATOR_DIR}"
  mkdir -p "${ORCHESTRATOR_DIR}/processed"
  mkdir -p "${ORCHESTRATOR_DIR}/dead-letter"
  mkdir -p "${MESH_BASE}/bus/inboxes"
  mkdir -p "${MESH_BASE}/bus/outboxes"
  mkdir -p "${MESH_BASE}/bus/processed"
  mkdir -p "${MESH_BASE}/bus/log"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge"
  mkdir -p "${MESH_BASE}/learning/events"
  mkdir -p "${MESH_BASE}/learning/patterns"
  mkdir -p "${MESH_BASE}/conflicts"

  for agent in "${ALL_AGENTS[@]}"; do
    mkdir -p "${MESH_BASE}/bus/inboxes/${agent}"
    mkdir -p "${MESH_BASE}/bus/outboxes/${agent}"
  done

  # Ensure SDLC event directories exist
  mkdir -p "${SDLC_EVENTS}/inbox" "${SDLC_EVENTS}/outbox" "${SDLC_EVENTS}/archive"
  for agent in ba jets engineer security qa atlas customer exec tracker; do
    mkdir -p "${SDLC_EVENTS}/inbox/${agent}"
    mkdir -p "${SDLC_EVENTS}/outbox/${agent}"
    mkdir -p "${SDLC_EVENTS}/archive/${agent}"
  done
}

# ============================================================
# Coordination Rules Engine
# ============================================================

init_coordination_rules() {
  if [ -f "${COORDINATION_RULES}" ]; then
    return
  fi

  cat > "${COORDINATION_RULES}" << 'RULES_EOF'
{
  "version": "1.0.0",
  "description": "Agent coordination rules - defines what happens when events occur",
  "rules": [
    {
      "id": "RULE-001",
      "name": "Requirements Complete -> Architecture",
      "trigger": {"event": "phase.requirements.completed", "source": "ba"},
      "actions": [
        {"type": "notify", "target": "jets", "subject": "Requirements ready for architecture design", "priority": "high"},
        {"type": "notify", "target": "tracker", "subject": "Requirements phase completed", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-002",
      "name": "Architecture Complete -> Engineering + Security",
      "trigger": {"event": "phase.architecture.completed", "source": "jets"},
      "actions": [
        {"type": "notify", "target": "engineer", "subject": "Architecture ready for implementation", "priority": "high"},
        {"type": "notify", "target": "security", "subject": "Architecture ready for security review", "priority": "high"},
        {"type": "notify", "target": "ux", "subject": "Architecture ready for UX review", "priority": "normal"},
        {"type": "notify", "target": "tracker", "subject": "Architecture phase completed", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-003",
      "name": "Code Committed -> Security + QA",
      "trigger": {"event": "code.committed", "source": "engineer"},
      "actions": [
        {"type": "notify", "target": "security", "subject": "New code ready for security review", "priority": "high"},
        {"type": "notify", "target": "qa", "subject": "New code ready for testing", "priority": "high"},
        {"type": "notify", "target": "tracker", "subject": "Code committed", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-004",
      "name": "Security Review Complete -> QA Gate Check",
      "trigger": {"event": "security.review.completed", "source": "security"},
      "actions": [
        {"type": "notify", "target": "qa", "subject": "Security review complete - check quality gate", "priority": "high"},
        {"type": "notify", "target": "engineer", "subject": "Security review results available", "priority": "normal"},
        {"type": "notify", "target": "tracker", "subject": "Security review completed", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-005",
      "name": "Tests Passed -> Deployment",
      "trigger": {"event": "tests.completed", "source": "qa"},
      "actions": [
        {"type": "notify", "target": "atlas", "subject": "Tests passed - ready for deployment", "priority": "high"},
        {"type": "notify", "target": "tracker", "subject": "Testing phase completed", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-006",
      "name": "Deployment Complete -> Customer Acceptance",
      "trigger": {"event": "deployment.completed", "source": "atlas"},
      "actions": [
        {"type": "notify", "target": "customer", "subject": "Deployment complete - ready for UAT", "priority": "high"},
        {"type": "notify", "target": "finops", "subject": "Deployment complete - check costs", "priority": "normal"},
        {"type": "notify", "target": "tracker", "subject": "Deployment completed", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-007",
      "name": "Security Vulnerability Found -> Engineer + Ask Tom",
      "trigger": {"event": "security.vulnerability.found", "source": "security"},
      "actions": [
        {"type": "notify", "target": "engineer", "subject": "Security vulnerability requires fix", "priority": "critical"},
        {"type": "notify", "target": "ask-tom", "subject": "Security vulnerability needs investigation", "priority": "high"},
        {"type": "notify", "target": "tracker", "subject": "Security vulnerability detected", "priority": "high"}
      ]
    },
    {
      "id": "RULE-008",
      "name": "Problem Solved -> Share Learning",
      "trigger": {"event": "problem.solved", "source": "ask-tom"},
      "actions": [
        {"type": "learn", "category": "cross-agent-learning", "broadcast": true},
        {"type": "notify", "target": "tracker", "subject": "Problem resolved - learning captured", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-009",
      "name": "Customer Feedback -> BA + Engineer",
      "trigger": {"event": "customer.feedback", "source": "customer"},
      "actions": [
        {"type": "notify", "target": "ba", "subject": "Customer feedback received", "priority": "high"},
        {"type": "notify", "target": "engineer", "subject": "Customer feedback on implementation", "priority": "normal"},
        {"type": "notify", "target": "tracker", "subject": "Customer feedback received", "priority": "normal"}
      ]
    },
    {
      "id": "RULE-010",
      "name": "Build Failed -> Engineer + Ask Tom",
      "trigger": {"event": "build.failed", "source": "engineer"},
      "actions": [
        {"type": "notify", "target": "ask-tom", "subject": "Build failure needs investigation", "priority": "critical"},
        {"type": "notify", "target": "tracker", "subject": "Build failure detected", "priority": "high"}
      ]
    },
    {
      "id": "RULE-011",
      "name": "Tests Failed -> Engineer + Ask Tom",
      "trigger": {"event": "tests.failed", "source": "qa"},
      "actions": [
        {"type": "notify", "target": "engineer", "subject": "Test failures need attention", "priority": "high"},
        {"type": "notify", "target": "ask-tom", "subject": "Test failures need root cause analysis", "priority": "high"},
        {"type": "notify", "target": "tracker", "subject": "Test failures detected", "priority": "high"}
      ]
    },
    {
      "id": "RULE-012",
      "name": "Learning Discovered -> Propagate to Relevant Agents",
      "trigger": {"event": "learning.discovered", "source": "*"},
      "actions": [
        {"type": "propagate-learning", "broadcast": true}
      ]
    },
    {
      "id": "RULE-013",
      "name": "Conflict Detected -> Resolution",
      "trigger": {"event": "conflict.raised", "source": "*"},
      "actions": [
        {"type": "notify", "target": "conductor", "subject": "Agent conflict needs resolution", "priority": "high"}
      ]
    },
    {
      "id": "RULE-014",
      "name": "Cost Alert -> FinOps + Conductor",
      "trigger": {"event": "cost.alert", "source": "finops"},
      "actions": [
        {"type": "notify", "target": "conductor", "subject": "Cost alert from FinOps", "priority": "high"},
        {"type": "notify", "target": "atlas", "subject": "Cost alert - review resource usage", "priority": "normal"}
      ]
    }
  ]
}
RULES_EOF

  log_info "Initialized coordination rules with 14 rules"
}

# ============================================================
# State Management
# ============================================================

init_state() {
  if [ -f "${STATE_FILE}" ]; then
    return
  fi

  cat > "${STATE_FILE}" << EOF
{
  "version": "1.0.0",
  "started_at": "$(timestamp)",
  "last_cycle": null,
  "cycles_completed": 0,
  "events_processed": 0,
  "messages_routed": 0,
  "learnings_synced": 0,
  "errors": 0,
  "last_error": null,
  "agents_last_active": {},
  "event_counts_by_type": {},
  "health": "starting"
}
EOF
}

update_state() {
  local key="$1"
  local value="$2"

  if [ -f "${STATE_FILE}" ]; then
    python3 -c "
import json, sys
with open('${STATE_FILE}', 'r') as f:
    state = json.load(f)
key = sys.argv[1]
value = sys.argv[2]
# Handle numeric values
try:
    if key in ('cycles_completed', 'events_processed', 'messages_routed', 'learnings_synced', 'errors'):
        state[key] = int(value)
    else:
        state[key] = value
except:
    state[key] = value
with open('${STATE_FILE}', 'w') as f:
    json.dump(state, f, indent=2)
" "$key" "$value" 2>/dev/null || true
  fi
}

increment_state() {
  local key="$1"

  if [ -f "${STATE_FILE}" ]; then
    python3 -c "
import json
with open('${STATE_FILE}', 'r') as f:
    state = json.load(f)
state['${key}'] = state.get('${key}', 0) + 1
with open('${STATE_FILE}', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null || true
  fi
}

# ============================================================
# Event Bridge: SDLC Registry <-> Agent Mesh
# ============================================================

bridge_sdlc_events() {
  # Bridge events from ~/.claude/sdlc-registry/events/ to ~/.claude/agent-mesh/bus/
  # This connects the exec-agent's event system to the agent mesh

  local bridged=0

  for agent_dir in "${SDLC_EVENTS}/outbox"/*/; do
    [ -d "$agent_dir" ] || continue
    local source_agent
    source_agent=$(basename "$agent_dir")

    for event_file in "$agent_dir"/*.json; do
      [ -f "$event_file" ] || continue

      # Read the event
      local event_type target_agents payload
      event_type=$(python3 -c "import json; print(json.load(open('${event_file}')).get('event_type', 'unknown'))" 2>/dev/null || echo "unknown")

      if [ "$event_type" = "unknown" ]; then
        continue
      fi

      # Map SDLC event to mesh message
      local subject="[SDLC Event] ${event_type} from ${source_agent}"

      # Route based on event type using coordination rules
      route_event_by_rules "$source_agent" "$event_type" "$event_file"

      # Archive the SDLC event
      local archive_agent_dir="${SDLC_EVENTS}/archive/${source_agent}"
      mkdir -p "$archive_agent_dir"
      mv "$event_file" "${archive_agent_dir}/" 2>/dev/null || true

      bridged=$((bridged + 1))
    done
  done

  if [ "$bridged" -gt 0 ]; then
    log_info "Bridged ${bridged} SDLC events to agent mesh"
  fi
}

# ============================================================
# Event Routing
# ============================================================

route_event_by_rules() {
  local source_agent="$1"
  local event_type="$2"
  local event_file="$3"

  if [ ! -f "${COORDINATION_RULES}" ]; then
    return
  fi

  # Find matching rules and execute actions
  python3 << PYEOF
import json, os, sys, uuid
from datetime import datetime

rules_file = "${COORDINATION_RULES}"
event_type = "${event_type}"
source_agent = "${source_agent}"
event_file = "${event_file}"
mesh_base = "${MESH_BASE}"

with open(rules_file, 'r') as f:
    rules_data = json.load(f)

# Read event payload
event_payload = {}
try:
    with open(event_file, 'r') as f:
        event_payload = json.load(f)
except:
    pass

for rule in rules_data.get('rules', []):
    trigger = rule.get('trigger', {})
    rule_event = trigger.get('event', '')
    rule_source = trigger.get('source', '*')

    # Match event type (support wildcard and prefix matching)
    event_match = False
    if rule_event == event_type:
        event_match = True
    elif rule_event.endswith('*') and event_type.startswith(rule_event[:-1]):
        event_match = True
    elif event_type.startswith(rule_event.replace('.', '.')):
        event_match = True

    # Match source
    source_match = (rule_source == '*' or rule_source == source_agent)

    if event_match and source_match:
        # Execute actions
        for action in rule.get('actions', []):
            action_type = action.get('type')

            if action_type == 'notify':
                target = action.get('target')
                subject = action.get('subject', f'Event: {event_type}')
                priority = action.get('priority', 'normal')

                # Create message file
                msg_id = str(uuid.uuid4())
                ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
                ts_safe = datetime.utcnow().strftime('%Y-%m-%dT%H-%M-%S-000Z')

                message = {
                    "id": msg_id,
                    "correlationId": event_payload.get('correlation_id', str(uuid.uuid4())),
                    "timestamp": ts,
                    "type": "notification",
                    "priority": priority,
                    "status": "delivered",
                    "sender": source_agent,
                    "receiver": target,
                    "subject": subject,
                    "content": json.dumps(event_payload.get('payload', {})),
                    "context": {
                        "sdlcPhase": event_payload.get('payload', {}).get('phase', ''),
                        "projectId": event_payload.get('payload', {}).get('project_id', ''),
                        "tags": ["auto-routed", f"rule:{rule['id']}", event_type]
                    },
                    "metadata": {
                        "traceId": event_payload.get('id', str(uuid.uuid4())),
                        "spanId": str(uuid.uuid4()),
                        "routedByRule": rule['id'],
                        "originalEvent": event_type,
                        "learningGenerated": False,
                        "conflictDetected": False
                    },
                    "ttl": 86400,
                    "requiresAck": False,
                    "retryCount": 0,
                    "maxRetries": 3
                }

                inbox_path = os.path.join(mesh_base, 'bus', 'inboxes', target)
                os.makedirs(inbox_path, exist_ok=True)
                filename = f"{priority}-{ts_safe}-{msg_id}.json"
                filepath = os.path.join(inbox_path, filename)

                with open(filepath, 'w') as f:
                    json.dump(message, f, indent=2)

                print(f"ROUTED: {source_agent} -> {target} [{priority}] {subject} (rule: {rule['id']})")

            elif action_type == 'learn':
                category = action.get('category', 'cross-agent-learning')
                # Create a learning event from the event
                learn_id = f"CK-{str(uuid.uuid4())[:8]}"
                ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')

                knowledge_dir = os.path.join(mesh_base, 'collective-memory', 'knowledge', category)
                os.makedirs(knowledge_dir, exist_ok=True)

                knowledge = {
                    "id": learn_id,
                    "category": category,
                    "title": f"Auto-captured from {event_type}",
                    "content": json.dumps(event_payload.get('payload', {})),
                    "confidence": "emerging",
                    "sourceAgents": [source_agent],
                    "applicableAgents": [],
                    "evidenceCount": 1,
                    "evidence": [{
                        "agentId": source_agent,
                        "timestamp": ts,
                        "description": f"Auto-captured from event {event_type}",
                        "outcome": "success"
                    }],
                    "tags": ["auto-captured", event_type],
                    "createdAt": ts,
                    "updatedAt": ts,
                    "lastAccessedAt": ts,
                    "accessCount": 0,
                    "version": 1,
                    "status": "active"
                }

                with open(os.path.join(knowledge_dir, f"{learn_id}.json"), 'w') as f:
                    json.dump(knowledge, f, indent=2)

                print(f"LEARNED: {learn_id} from {event_type} [{category}]")

            elif action_type == 'propagate-learning':
                # Broadcast the learning to all agents
                broadcast = action.get('broadcast', False)
                if broadcast:
                    for agent in ["conductor", "ba", "jets", "ux", "engineer", "security", "qa", "atlas", "customer", "ask-tom", "tracker", "finops"]:
                        if agent != source_agent:
                            msg_id = str(uuid.uuid4())
                            ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
                            ts_safe = datetime.utcnow().strftime('%Y-%m-%dT%H-%M-%S-000Z')

                            message = {
                                "id": msg_id,
                                "correlationId": str(uuid.uuid4()),
                                "timestamp": ts,
                                "type": "learning",
                                "priority": "low",
                                "status": "delivered",
                                "sender": source_agent,
                                "receiver": agent,
                                "subject": f"New learning from {source_agent}: {event_type}",
                                "content": json.dumps(event_payload.get('payload', {})),
                                "context": {"tags": ["learning-propagation", event_type]},
                                "metadata": {
                                    "traceId": str(uuid.uuid4()),
                                    "spanId": str(uuid.uuid4()),
                                    "learningGenerated": True,
                                    "conflictDetected": False
                                },
                                "ttl": 86400,
                                "requiresAck": False,
                                "retryCount": 0,
                                "maxRetries": 3
                            }

                            inbox_path = os.path.join(mesh_base, 'bus', 'inboxes', agent)
                            os.makedirs(inbox_path, exist_ok=True)
                            filename = f"low-{ts_safe}-{msg_id}.json"
                            with open(os.path.join(inbox_path, filename), 'w') as f:
                                json.dump(message, f, indent=2)

                    print(f"PROPAGATED: Learning from {source_agent} to all agents")

PYEOF
}

# ============================================================
# Learning Sync
# ============================================================

sync_learnings() {
  # Ensure all agents have access to recent learnings
  local synced=0

  # Check for unpropagated learning events
  for event_file in "${MESH_BASE}/learning/events"/*.json; do
    [ -f "$event_file" ] || continue

    local propagated
    propagated=$(python3 -c "import json; print(json.load(open('${event_file}')).get('propagated', False))" 2>/dev/null || echo "True")

    if [ "$propagated" = "False" ]; then
      local source_agent title category
      source_agent=$(python3 -c "import json; print(json.load(open('${event_file}')).get('sourceAgent', 'unknown'))" 2>/dev/null || echo "unknown")
      title=$(python3 -c "import json; print(json.load(open('${event_file}')).get('learning', {}).get('title', 'Unknown'))" 2>/dev/null || echo "Unknown")
      category=$(python3 -c "import json; print(json.load(open('${event_file}')).get('learning', {}).get('category', 'cross-agent-learning'))" 2>/dev/null || echo "cross-agent-learning")

      # Send learning notification to all agents
      for agent in "${ALL_AGENTS[@]}"; do
        if [ "$agent" != "$source_agent" ]; then
          "${MESH_CLI}" send \
            --from "$source_agent" \
            --to "$agent" \
            --type "learning" \
            --priority "low" \
            --subject "Learning: ${title}" \
            --content "New ${category} learning from ${source_agent}: ${title}" 2>/dev/null || true
        fi
      done

      # Mark as propagated
      python3 -c "
import json
with open('${event_file}', 'r') as f:
    data = json.load(f)
data['propagated'] = True
data['propagatedTo'] = [a for a in ['conductor','ba','jets','ux','engineer','security','qa','atlas','customer','ask-tom','tracker','finops'] if a != data.get('sourceAgent')]
from datetime import datetime
data['propagatedAt'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
with open('${event_file}', 'w') as f:
    json.dump(data, f, indent=2)
" 2>/dev/null || true

      synced=$((synced + 1))
      log_info "Propagated learning: ${title} from ${source_agent}"
    fi
  done

  if [ "$synced" -gt 0 ]; then
    log_info "Synced ${synced} learning events"
    increment_state "learnings_synced"
  fi
}

# ============================================================
# Inbox Processing (Expired Messages, Retries)
# ============================================================

process_inboxes() {
  local processed=0
  local now_epoch
  now_epoch=$(date +%s)

  for agent in "${ALL_AGENTS[@]}"; do
    local inbox="${MESH_BASE}/bus/inboxes/${agent}"
    [ -d "$inbox" ] || continue

    for msg_file in "$inbox"/*.json; do
      [ -f "$msg_file" ] || continue

      # Check TTL
      local msg_ts ttl
      msg_ts=$(python3 -c "
import json
from datetime import datetime
msg = json.load(open('${msg_file}'))
ts = msg.get('timestamp', '')
try:
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    print(int(dt.timestamp()))
except:
    print(0)
" 2>/dev/null || echo "0")

      ttl=$(python3 -c "import json; print(json.load(open('${msg_file}')).get('ttl', 86400))" 2>/dev/null || echo "86400")

      if [ "$msg_ts" -gt 0 ]; then
        local expiry=$((msg_ts + ttl))
        if [ "$now_epoch" -gt "$expiry" ]; then
          # Message expired - move to dead letter
          mv "$msg_file" "${ORCHESTRATOR_DIR}/dead-letter/" 2>/dev/null || true
          log_warn "Message expired for ${agent}: $(basename "$msg_file")"
          processed=$((processed + 1))
        fi
      fi
    done
  done

  if [ "$processed" -gt 0 ]; then
    log_info "Processed ${processed} expired messages"
  fi
}

# ============================================================
# Health Monitoring
# ============================================================

check_health() {
  local total_messages=0
  local critical_count=0
  local stale_agents=""

  for agent in "${ALL_AGENTS[@]}"; do
    local inbox="${MESH_BASE}/bus/inboxes/${agent}"
    [ -d "$inbox" ] || continue

    local count
    count=$(find "$inbox" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    total_messages=$((total_messages + count))

    # Check for critical messages
    local critical
    critical=$(find "$inbox" -maxdepth 1 -name "critical-*.json" 2>/dev/null | wc -l | tr -d ' ')
    critical_count=$((critical_count + critical))

    # Check if inbox is backed up (more than 50 messages)
    if [ "$count" -gt 50 ]; then
      stale_agents="${stale_agents} ${agent}(${count})"
    fi
  done

  # Update state
  update_state "health" "healthy"

  if [ "$critical_count" -gt 0 ]; then
    update_state "health" "attention"
    log_warn "Critical messages pending: ${critical_count}"
  fi

  if [ -n "$stale_agents" ]; then
    update_state "health" "degraded"
    log_warn "Backed up inboxes:${stale_agents}"
  fi
}

# ============================================================
# Main Processing Cycle
# ============================================================

run_cycle() {
  local cycle_start
  cycle_start=$(date +%s)

  # Step 1: Bridge SDLC events to agent mesh
  bridge_sdlc_events

  # Step 2: Sync unpropagated learnings
  sync_learnings

  # Step 3: Process expired messages
  process_inboxes

  # Step 4: Check health
  check_health

  # Update state
  update_state "last_cycle" "$(timestamp)"
  increment_state "cycles_completed"

  local cycle_end
  cycle_end=$(date +%s)
  local cycle_duration=$((cycle_end - cycle_start))

  if [ "$cycle_duration" -gt 5 ]; then
    log_warn "Cycle took ${cycle_duration}s (slow)"
  fi
}

# ============================================================
# Daemon Management
# ============================================================

cmd_start() {
  ensure_dirs
  init_coordination_rules
  init_state

  if [ -f "${PID_FILE}" ]; then
    local existing_pid
    existing_pid=$(cat "${PID_FILE}")
    if kill -0 "$existing_pid" 2>/dev/null; then
      echo "Orchestrator already running (PID: ${existing_pid})"
      return 0
    else
      rm -f "${PID_FILE}"
    fi
  fi

  echo "Starting Agent Mesh Orchestrator..."
  log_info "Starting orchestrator"
  update_state "health" "starting"

  # Start daemon
  (
    echo $$ > "${PID_FILE}"
    update_state "started_at" "$(timestamp)"

    while true; do
      run_cycle 2>> "${LOG_FILE}" || {
        log_error "Cycle failed"
        increment_state "errors"
      }
      sleep "${POLL_INTERVAL}"
    done
  ) &

  local daemon_pid=$!
  echo "$daemon_pid" > "${PID_FILE}"
  update_state "health" "healthy"

  echo "Orchestrator started (PID: ${daemon_pid})"
  echo "Log: ${LOG_FILE}"
  echo "State: ${STATE_FILE}"
  log_info "Orchestrator started (PID: ${daemon_pid})"
}

cmd_stop() {
  if [ ! -f "${PID_FILE}" ]; then
    echo "Orchestrator not running"
    return 0
  fi

  local pid
  pid=$(cat "${PID_FILE}")

  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping orchestrator (PID: ${pid})..."
    kill "$pid" 2>/dev/null || true
    sleep 1

    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "${PID_FILE}"
    update_state "health" "stopped"
    log_info "Orchestrator stopped"
    echo "Orchestrator stopped"
  else
    rm -f "${PID_FILE}"
    echo "Orchestrator was not running (stale PID file removed)"
  fi
}

cmd_status() {
  echo "=== Agent Mesh Orchestrator Status ==="
  echo ""

  # Daemon status
  if [ -f "${PID_FILE}" ]; then
    local pid
    pid=$(cat "${PID_FILE}")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Status: RUNNING (PID: ${pid})"
    else
      echo "Status: STOPPED (stale PID)"
    fi
  else
    echo "Status: STOPPED"
  fi

  # State
  if [ -f "${STATE_FILE}" ]; then
    echo ""
    python3 -c "
import json
with open('${STATE_FILE}', 'r') as f:
    state = json.load(f)
print(f\"  Health: {state.get('health', 'unknown')}\")
print(f\"  Cycles completed: {state.get('cycles_completed', 0)}\")
print(f\"  Events processed: {state.get('events_processed', 0)}\")
print(f\"  Messages routed: {state.get('messages_routed', 0)}\")
print(f\"  Learnings synced: {state.get('learnings_synced', 0)}\")
print(f\"  Errors: {state.get('errors', 0)}\")
print(f\"  Last cycle: {state.get('last_cycle', 'never')}\")
print(f\"  Started at: {state.get('started_at', 'never')}\")
" 2>/dev/null || echo "  (state unavailable)"
  fi

  echo ""

  # Inbox summary
  echo "Agent Inbox Summary:"
  local total=0
  for agent in "${ALL_AGENTS[@]}"; do
    local inbox="${MESH_BASE}/bus/inboxes/${agent}"
    if [ -d "$inbox" ]; then
      local count
      count=$(find "$inbox" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
      if [ "$count" -gt 0 ]; then
        echo "  ${agent}: ${count} messages"
        total=$((total + count))
      fi
    fi
  done
  echo "  Total pending: ${total}"

  echo ""

  # Knowledge summary
  echo "Collective Memory:"
  local knowledge_total=0
  for dir in "${MESH_BASE}/collective-memory/knowledge"/*/; do
    [ -d "$dir" ] || continue
    local cat_name
    cat_name=$(basename "$dir")
    local count
    count=$(find "$dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      echo "  ${cat_name}: ${count} items"
      knowledge_total=$((knowledge_total + count))
    fi
  done
  echo "  Total: ${knowledge_total} knowledge items"

  echo ""

  # Learning events
  local learning_count
  learning_count=$(find "${MESH_BASE}/learning/events/" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "Learning Events: ${learning_count}"

  # Coordination rules
  if [ -f "${COORDINATION_RULES}" ]; then
    local rule_count
    rule_count=$(python3 -c "import json; print(len(json.load(open('${COORDINATION_RULES}')).get('rules', [])))" 2>/dev/null || echo "0")
    echo "Coordination Rules: ${rule_count}"
  fi

  echo ""
  echo "=== End Status ==="
}

cmd_process() {
  ensure_dirs
  init_coordination_rules
  init_state

  echo "Running single processing cycle..."
  run_cycle
  echo "Cycle complete."
  cmd_status
}

cmd_route() {
  ensure_dirs
  init_coordination_rules

  echo "Routing pending events..."
  bridge_sdlc_events
  echo "Routing complete."
}

cmd_sync() {
  ensure_dirs
  echo "Syncing learnings across agents..."
  sync_learnings
  echo "Sync complete."
}

cmd_dashboard() {
  ensure_dirs

  echo ""
  echo "================================================================"
  echo "            AGENT MESH COMMUNICATION DASHBOARD"
  echo "================================================================"
  echo "  Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""

  # Orchestrator status
  local orch_status="STOPPED"
  if [ -f "${PID_FILE}" ]; then
    local pid
    pid=$(cat "${PID_FILE}")
    if kill -0 "$pid" 2>/dev/null; then
      orch_status="RUNNING (PID: ${pid})"
    fi
  fi
  echo "  Orchestrator: ${orch_status}"
  echo ""

  # Agent status grid
  echo "  +--------------+--------+----------+---------+"
  echo "  | Agent        | Inbox  | Outbox   | Status  |"
  echo "  +--------------+--------+----------+---------+"

  for agent in "${ALL_AGENTS[@]}"; do
    local inbox_count=0
    local outbox_count=0

    if [ -d "${MESH_BASE}/bus/inboxes/${agent}" ]; then
      inbox_count=$(find "${MESH_BASE}/bus/inboxes/${agent}" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    fi
    if [ -d "${MESH_BASE}/bus/outboxes/${agent}" ]; then
      outbox_count=$(find "${MESH_BASE}/bus/outboxes/${agent}" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    fi

    local status="idle"
    if [ "$inbox_count" -gt 0 ]; then
      status="pending"
    fi

    printf "  | %-12s | %-6s | %-8s | %-7s |\n" "$agent" "$inbox_count" "$outbox_count" "$status"
  done

  echo "  +--------------+--------+----------+---------+"
  echo ""

  # Recent messages
  echo "  Recent Messages (last 5):"
  local msg_count=0
  for log_file in $(ls -t "${MESH_BASE}/bus/log"/*.json 2>/dev/null | head -5); do
    [ -f "$log_file" ] || continue
    local sender receiver subject ts
    sender=$(python3 -c "import json; print(json.load(open('${log_file}')).get('sender','?'))" 2>/dev/null || echo "?")
    receiver=$(python3 -c "import json; print(json.load(open('${log_file}')).get('receiver','?'))" 2>/dev/null || echo "?")
    subject=$(python3 -c "import json; print(json.load(open('${log_file}')).get('subject','?')[:50])" 2>/dev/null || echo "?")
    ts=$(python3 -c "import json; print(json.load(open('${log_file}')).get('timestamp','?')[:19])" 2>/dev/null || echo "?")
    echo "    ${ts} | ${sender} -> ${receiver}: ${subject}"
    msg_count=$((msg_count + 1))
  done
  if [ "$msg_count" -eq 0 ]; then
    echo "    (no recent messages)"
  fi

  echo ""

  # Knowledge summary
  echo "  Collective Memory:"
  local total_knowledge=0
  for dir in "${MESH_BASE}/collective-memory/knowledge"/*/; do
    [ -d "$dir" ] || continue
    local cat_name
    cat_name=$(basename "$dir")
    local count
    count=$(find "$dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    total_knowledge=$((total_knowledge + count))
    if [ "$count" -gt 0 ]; then
      echo "    ${cat_name}: ${count}"
    fi
  done
  echo "    Total: ${total_knowledge} items"

  echo ""

  # Learning events
  local learning_total
  learning_total=$(find "${MESH_BASE}/learning/events/" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  local learning_propagated
  learning_propagated=$(python3 -c "
import json, os
from glob import glob
count = 0
for f in glob('${MESH_BASE}/learning/events/*.json'):
    try:
        if json.load(open(f)).get('propagated', False):
            count += 1
    except:
        pass
print(count)
" 2>/dev/null || echo "0")

  echo "  Learning: ${learning_total} events (${learning_propagated} propagated)"

  echo ""
  echo "================================================================"
}

# ============================================================
# Main
# ============================================================

case "${1:-help}" in
  start)      cmd_start ;;
  stop)       cmd_stop ;;
  status)     cmd_status ;;
  process)    cmd_process ;;
  route)      cmd_route ;;
  sync)       cmd_sync ;;
  dashboard)  cmd_dashboard ;;
  help|*)
    echo "Agent Mesh Orchestrator - Central coordination for AI-SDLC agents"
    echo ""
    echo "Usage: mesh-orchestrator.sh <command>"
    echo ""
    echo "Commands:"
    echo "  start      Start the orchestrator daemon"
    echo "  stop       Stop the orchestrator"
    echo "  status     Check orchestrator status"
    echo "  process    Run one processing cycle (no daemon)"
    echo "  route      Route pending events manually"
    echo "  sync       Sync learnings across agents"
    echo "  dashboard  Show real-time mesh dashboard"
    ;;
esac
