#!/bin/bash
# ============================================================
# Agent Mesh Integration Hooks
#
# These hooks are called by individual agents to integrate
# with the agent mesh at key lifecycle points.
#
# Usage:
#   source agent-hooks.sh
#   mesh_agent_start "engineer" "SDLC-20260217-001"
#   ... agent work ...
#   mesh_agent_finish "engineer" "SDLC-20260217-001" "success"
#
# Or standalone:
#   agent-hooks.sh start <agent-id> [project-id]
#   agent-hooks.sh finish <agent-id> [project-id] [status]
#   agent-hooks.sh emit <agent-id> <event-type> [payload-json]
#   agent-hooks.sh briefing <agent-id>
#   agent-hooks.sh check-inbox <agent-id>
# ============================================================

MESH_BASE="${HOME}/.claude/agent-mesh"
MESH_CLI="${HOME}/.claude/agent-mesh/mesh-cli.sh"
ORCHESTRATOR="${MESH_BASE}/orchestrator"

# ============================================================
# Agent Lifecycle Hooks
# ============================================================

mesh_agent_start() {
  local agent_id="$1"
  local project_id="${2:-}"

  echo ""
  echo "=== Agent Mesh: ${agent_id} starting ==="

  # 1. Check inbox for pending messages
  echo ""
  echo "[Mesh] Checking inbox..."
  local inbox_path="${MESH_BASE}/bus/inboxes/${agent_id}"
  if [ -d "$inbox_path" ]; then
    local msg_count
    msg_count=$(find "$inbox_path" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$msg_count" -gt 0 ]; then
      echo "[Mesh] ${msg_count} messages in inbox:"
      echo ""

      # Show critical first, then high, then normal
      for priority in critical high normal low; do
        for msg_file in "$inbox_path"/${priority}-*.json; do
          [ -f "$msg_file" ] || continue
          local sender subject type
          sender=$(python3 -c "import json; print(json.load(open('${msg_file}')).get('sender','?'))" 2>/dev/null || echo "?")
          subject=$(python3 -c "import json; print(json.load(open('${msg_file}')).get('subject','?'))" 2>/dev/null || echo "?")
          type=$(python3 -c "import json; print(json.load(open('${msg_file}')).get('type','?'))" 2>/dev/null || echo "?")
          echo "  [${priority}] From: ${sender} | ${type}: ${subject}"
        done
      done
      echo ""
    else
      echo "[Mesh] Inbox empty - no pending messages."
    fi
  fi

  # 2. Load collective intelligence briefing
  echo "[Mesh] Loading collective intelligence..."
  local knowledge_count=0
  local relevant_knowledge=""

  for dir in "${MESH_BASE}/collective-memory/knowledge"/*/; do
    [ -d "$dir" ] || continue
    for k_file in "$dir"*.json; do
      [ -f "$k_file" ] || continue

      local applicable
      applicable=$(python3 -c "
import json
data = json.load(open('${k_file}'))
agents = data.get('applicableAgents', [])
if '${agent_id}' in agents or len(agents) == 0:
    print('yes')
else:
    print('no')
" 2>/dev/null || echo "no")

      if [ "$applicable" = "yes" ]; then
        local title confidence category
        title=$(python3 -c "import json; print(json.load(open('${k_file}')).get('title','?'))" 2>/dev/null || echo "?")
        confidence=$(python3 -c "import json; print(json.load(open('${k_file}')).get('confidence','?'))" 2>/dev/null || echo "?")
        category=$(python3 -c "import json; print(json.load(open('${k_file}')).get('category','?'))" 2>/dev/null || echo "?")
        relevant_knowledge="${relevant_knowledge}\n  [${confidence}] ${category}: ${title}"
        knowledge_count=$((knowledge_count + 1))
      fi
    done
  done

  if [ "$knowledge_count" -gt 0 ]; then
    echo "[Mesh] ${knowledge_count} relevant knowledge items:"
    echo -e "$relevant_knowledge"
    echo ""
  else
    echo "[Mesh] No relevant knowledge found."
  fi

  # 3. Emit agent.started event
  if [ -n "$project_id" ]; then
    mesh_emit_event "$agent_id" "agent.started" "{\"agent\": \"${agent_id}\", \"project_id\": \"${project_id}\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
  fi

  echo "=== Mesh integration complete ==="
  echo ""
}

mesh_agent_finish() {
  local agent_id="$1"
  local project_id="${2:-}"
  local status="${3:-success}"

  echo ""
  echo "=== Agent Mesh: ${agent_id} finishing ==="

  # 1. Emit agent.completed event
  if [ -n "$project_id" ]; then
    mesh_emit_event "$agent_id" "agent.completed" "{\"agent\": \"${agent_id}\", \"project_id\": \"${project_id}\", \"status\": \"${status}\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
  fi

  # 2. Process inbox (acknowledge handled messages)
  echo "[Mesh] Checking for messages to acknowledge..."
  local inbox_path="${MESH_BASE}/bus/inboxes/${agent_id}"
  if [ -d "$inbox_path" ]; then
    local remaining
    remaining=$(find "$inbox_path" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$remaining" -gt 0 ]; then
      echo "[Mesh] ${remaining} unprocessed messages remain in inbox."
    fi
  fi

  echo "=== Agent finish recorded ==="
  echo ""
}

mesh_emit_event() {
  local agent_id="$1"
  local event_type="$2"
  local payload="${3:-\{\}}"

  local event_id
  event_id=$(python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "$(date +%s)-${RANDOM}")

  local ts
  ts=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  local ts_safe
  ts_safe=$(date -u +"%Y-%m-%dT%H-%M-%S-000Z")

  # Write payload to temp file to avoid quoting issues
  local tmp_payload="/tmp/mesh-event-payload-$$.json"
  echo "$payload" > "$tmp_payload"

  local event_data
  event_data=$(python3 << PYEOF
import json, sys

# Read payload from temp file
try:
    with open("$tmp_payload", "r") as f:
        payload_data = json.load(f)
except:
    payload_data = {}

event = {
    "id": "$event_id",
    "event_type": "$event_type",
    "source_agent": "$agent_id",
    "target_agents": [],
    "timestamp": "$ts",
    "payload": payload_data,
    "correlation_id": "$event_id",
    "metadata": {"emitted_by": "agent-hooks"}
}
print(json.dumps(event, indent=2))
PYEOF
  )

  # Clean up temp file
  rm -f "$tmp_payload"

  if [ -n "$event_data" ]; then
    # Write to SDLC events outbox for the orchestrator to pick up
    local outbox="${HOME}/.claude/sdlc-registry/events/outbox/${agent_id}"
    mkdir -p "$outbox"
    echo "$event_data" > "${outbox}/${ts_safe}-${event_type//\./-}-${event_id}.json"

    # Also write to agent mesh bus log
    local log_dir="${MESH_BASE}/bus/log"
    mkdir -p "$log_dir"
    echo "$event_data" > "${log_dir}/${ts_safe}-event-${event_id}.json"

    echo "[Mesh] Event emitted: ${event_type} from ${agent_id}"
  else
    echo "[Mesh] ERROR: Failed to create event JSON" >&2
  fi
}

mesh_report_learning() {
  local agent_id="$1"
  local title="$2"
  local description="$3"
  local category="${4:-best-practice}"
  local confidence="${5:-emerging}"

  if [ -f "$MESH_CLI" ]; then
    "$MESH_CLI" learn \
      --agent "$agent_id" \
      --title "$title" \
      --description "$description" \
      --category "$category" \
      --confidence "$confidence"
  fi
}

mesh_send_message() {
  local from="$1"
  local to="$2"
  local subject="$3"
  local content="${4:-}"
  local type="${5:-notification}"
  local priority="${6:-normal}"

  if [ -f "$MESH_CLI" ]; then
    "$MESH_CLI" send \
      --from "$from" \
      --to "$to" \
      --type "$type" \
      --priority "$priority" \
      --subject "$subject" \
      --content "$content"
  fi
}

mesh_check_inbox() {
  local agent_id="$1"
  local limit="${2:-all}"

  if [ -f "$MESH_CLI" ]; then
    "$MESH_CLI" inbox "$agent_id" "$limit"
  fi
}

mesh_get_briefing() {
  local agent_id="$1"

  if [ -f "$MESH_CLI" ]; then
    "$MESH_CLI" briefing "$agent_id"
  fi
}

# ============================================================
# Standalone CLI Mode
# ============================================================

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  case "${1:-help}" in
    start)
      shift
      mesh_agent_start "$@"
      ;;
    finish)
      shift
      mesh_agent_finish "$@"
      ;;
    emit)
      shift
      mesh_emit_event "$@"
      ;;
    briefing)
      shift
      mesh_get_briefing "$@"
      ;;
    check-inbox)
      shift
      mesh_check_inbox "$@"
      ;;
    learn)
      shift
      mesh_report_learning "$@"
      ;;
    send)
      shift
      mesh_send_message "$@"
      ;;
    help|*)
      echo "Agent Mesh Integration Hooks"
      echo ""
      echo "Usage: agent-hooks.sh <command> [options]"
      echo ""
      echo "Commands:"
      echo "  start <agent-id> [project-id]              - Agent startup hook"
      echo "  finish <agent-id> [project-id] [status]    - Agent finish hook"
      echo "  emit <agent-id> <event-type> [payload]     - Emit an event"
      echo "  briefing <agent-id>                        - Get intelligence briefing"
      echo "  check-inbox <agent-id> [limit]             - Check inbox"
      echo "  learn <agent-id> <title> <desc> [cat] [conf] - Report a learning"
      echo "  send <from> <to> <subject> [content] [type] [priority] - Send message"
      echo ""
      echo "Source mode: source agent-hooks.sh && mesh_agent_start engineer PROJ-001"
      ;;
  esac
fi
