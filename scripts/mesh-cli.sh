#!/bin/bash
# ============================================================
# Agent Mesh CLI
#
# Shell interface for the inter-agent communication system.
# Designed to be called from within Claude Code's Bash tool
# by any agent that needs to communicate with other agents.
#
# Usage: mesh-cli.sh <command> [options]
# ============================================================

set -euo pipefail

MESH_BASE="${HOME}/.claude/agent-mesh"

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

timestamp_safe() {
  date -u +"%Y-%m-%dT%H-%M-%S-000Z"
}

ensure_dirs() {
  local agents=("conductor" "ba" "jets" "ux" "engineer" "security" "qa" "atlas" "customer" "ask-tom" "tracker" "finops")

  mkdir -p "${MESH_BASE}/registry"
  mkdir -p "${MESH_BASE}/bus/processed"
  mkdir -p "${MESH_BASE}/bus/failed"
  mkdir -p "${MESH_BASE}/bus/log"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/cross-agent-learning"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/error-pattern"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/best-practice"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/anti-pattern"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/architecture-decision"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/security-insight"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/performance-insight"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/process-improvement"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/conflict-resolution"
  mkdir -p "${MESH_BASE}/collective-memory/knowledge/integration-pattern"
  mkdir -p "${MESH_BASE}/learning/events"
  mkdir -p "${MESH_BASE}/learning/patterns"
  mkdir -p "${MESH_BASE}/conflicts"
  mkdir -p "${MESH_BASE}/audit/$(date -u +%Y-%m-%d)"

  for agent in "${agents[@]}"; do
    mkdir -p "${MESH_BASE}/bus/inboxes/${agent}"
    mkdir -p "${MESH_BASE}/bus/outboxes/${agent}"
  done
}

# ============================================================
# Commands
# ============================================================

cmd_init() {
  echo "Initializing Agent Mesh..."
  ensure_dirs

  # Create default registry if not exists
  if [ ! -f "${MESH_BASE}/registry/agents.json" ]; then
    cat > "${MESH_BASE}/registry/agents.json" << 'REGISTRY_EOF'
[
  {"id":"conductor","name":"Conductor","status":"available","capabilities":["orchestration"]},
  {"id":"ba","name":"BA Agent","status":"available","capabilities":["requirements"]},
  {"id":"jets","name":"Architect Jets","status":"available","capabilities":["architecture"]},
  {"id":"ux","name":"UX Agent","status":"available","capabilities":["ux-design"]},
  {"id":"engineer","name":"Software Engineer","status":"available","capabilities":["implementation"]},
  {"id":"security","name":"Security Agent","status":"available","capabilities":["security-review"]},
  {"id":"qa","name":"QA Agent","status":"available","capabilities":["testing"]},
  {"id":"atlas","name":"Atlas Agent","status":"available","capabilities":["deployment"]},
  {"id":"customer","name":"Customer Agent","status":"available","capabilities":["acceptance"]},
  {"id":"ask-tom","name":"Ask Tom","status":"available","capabilities":["problem-solving"]},
  {"id":"tracker","name":"Tracker Agent","status":"available","capabilities":["tracking"]},
  {"id":"finops","name":"FinOps Agent","status":"available","capabilities":["cost-analysis"]}
]
REGISTRY_EOF
    echo "Created agent registry with 12 agents"
  fi

  # Create collective memory index if not exists
  if [ ! -f "${MESH_BASE}/collective-memory/index.json" ]; then
    cat > "${MESH_BASE}/collective-memory/index.json" << 'INDEX_EOF'
{
  "lastUpdated": "",
  "totalItems": 0,
  "categories": {},
  "agentContributions": {},
  "topTags": []
}
INDEX_EOF
    echo "Created collective memory index"
  fi

  echo "Agent Mesh initialized at ${MESH_BASE}"
  echo ""
  echo "Available commands:"
  echo "  mesh-cli.sh send      - Send a message to another agent"
  echo "  mesh-cli.sh inbox     - Read an agent's inbox"
  echo "  mesh-cli.sh learn     - Report a learning"
  echo "  mesh-cli.sh search    - Search collective knowledge"
  echo "  mesh-cli.sh briefing  - Get agent intelligence briefing"
  echo "  mesh-cli.sh health    - Check mesh health"
  echo "  mesh-cli.sh audit     - View audit report"
  echo "  mesh-cli.sh conflicts - View conflicts"
}

cmd_send() {
  local from="" to="" type="notification" priority="normal" subject="" content="" correlation_id=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      --from) from="$2"; shift 2 ;;
      --to) to="$2"; shift 2 ;;
      --type) type="$2"; shift 2 ;;
      --priority) priority="$2"; shift 2 ;;
      --subject) subject="$2"; shift 2 ;;
      --content) content="$2"; shift 2 ;;
      --correlation) correlation_id="$2"; shift 2 ;;
      *) echo "Unknown option: $1"; exit 1 ;;
    esac
  done

  if [ -z "$from" ] || [ -z "$to" ] || [ -z "$subject" ]; then
    echo "Usage: mesh-cli.sh send --from <agent> --to <agent> --subject <text> [--content <text>] [--type <type>] [--priority <priority>]"
    exit 1
  fi

  ensure_dirs

  local msg_id
  msg_id=$(generate_uuid)
  local ts
  ts=$(timestamp)
  local ts_safe
  ts_safe=$(timestamp_safe)

  if [ -z "$correlation_id" ]; then
    correlation_id=$(generate_uuid)
  fi

  local message
  message=$(cat << EOF
{
  "id": "${msg_id}",
  "correlationId": "${correlation_id}",
  "timestamp": "${ts}",
  "type": "${type}",
  "priority": "${priority}",
  "status": "delivered",
  "sender": "${from}",
  "receiver": "${to}",
  "subject": "${subject}",
  "content": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "${content}"),
  "context": {
    "tags": []
  },
  "metadata": {
    "traceId": "$(generate_uuid)",
    "spanId": "$(generate_uuid)",
    "learningGenerated": false,
    "conflictDetected": false
  },
  "ttl": 86400,
  "requiresAck": false,
  "retryCount": 0,
  "maxRetries": 3
}
EOF
  )

  if [ "$to" = "all" ]; then
    # Broadcast
    local agents=("conductor" "ba" "jets" "ux" "engineer" "security" "qa" "atlas" "customer" "ask-tom" "tracker" "finops")
    for agent in "${agents[@]}"; do
      if [ "$agent" != "$from" ]; then
        local broadcast_id
        broadcast_id=$(generate_uuid)
        local broadcast_msg
        broadcast_msg=$(echo "$message" | python3 -c "
import sys, json
msg = json.load(sys.stdin)
msg['id'] = '${broadcast_id}'
msg['receiver'] = '${agent}'
print(json.dumps(msg, indent=2))
")
        echo "$broadcast_msg" > "${MESH_BASE}/bus/inboxes/${agent}/${priority}-${ts_safe}-${broadcast_id}.json"
      fi
    done
    echo "Broadcast from ${from}: ${subject} (to all agents)"
  else
    # Direct message
    echo "$message" > "${MESH_BASE}/bus/inboxes/${to}/${priority}-${ts_safe}-${msg_id}.json"
    echo "$message" > "${MESH_BASE}/bus/outboxes/${from}/${ts_safe}-${msg_id}.json"
    echo "Message sent: ${from} -> ${to}: ${subject} [${type}/${priority}]"
  fi

  # Log
  echo "$message" > "${MESH_BASE}/bus/log/${ts_safe}-${msg_id}.json"

  # Audit
  local audit_id
  audit_id=$(generate_uuid)
  cat > "${MESH_BASE}/audit/$(date -u +%Y-%m-%d)/${audit_id}.json" << EOF
{
  "id": "${audit_id}",
  "timestamp": "${ts}",
  "eventType": "message-sent",
  "agentId": "${from}",
  "targetAgentId": "${to}",
  "messageId": "${msg_id}",
  "details": {"subject": "${subject}", "type": "${type}"},
  "success": true
}
EOF

  echo "$msg_id"
}

cmd_inbox() {
  local agent_id="${1:-}"
  local show_count="${2:-all}"

  if [ -z "$agent_id" ]; then
    echo "Usage: mesh-cli.sh inbox <agent-id> [limit]"
    exit 1
  fi

  local inbox_path="${MESH_BASE}/bus/inboxes/${agent_id}"

  if [ ! -d "$inbox_path" ]; then
    echo "No inbox found for agent: ${agent_id}"
    exit 1
  fi

  local files
  files=$(ls -1 "${inbox_path}"/*.json 2>/dev/null | sort)
  local count
  count=$(echo "$files" | grep -c '.json$' 2>/dev/null || echo 0)

  echo "=== Inbox for ${agent_id} (${count} messages) ==="
  echo ""

  if [ "$count" -eq 0 ]; then
    echo "  (empty)"
    return
  fi

  local displayed=0
  for file in $files; do
    if [ "$show_count" != "all" ] && [ "$displayed" -ge "$show_count" ]; then
      break
    fi

    local msg
    msg=$(cat "$file")
    local sender subject type priority ts
    sender=$(echo "$msg" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sender','?'))")
    subject=$(echo "$msg" | python3 -c "import sys,json; print(json.load(sys.stdin).get('subject','?'))")
    type=$(echo "$msg" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type','?'))")
    priority=$(echo "$msg" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','?'))")
    ts=$(echo "$msg" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timestamp','?'))")
    local msg_id
    msg_id=$(echo "$msg" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','?'))")

    echo "  [${priority}] ${ts} | From: ${sender} | Type: ${type}"
    echo "         Subject: ${subject}"
    echo "         ID: ${msg_id}"
    echo ""

    displayed=$((displayed + 1))
  done
}

cmd_ack() {
  local agent_id="${1:-}"
  local message_id="${2:-}"

  if [ -z "$agent_id" ] || [ -z "$message_id" ]; then
    echo "Usage: mesh-cli.sh ack <agent-id> <message-id>"
    exit 1
  fi

  local inbox_path="${MESH_BASE}/bus/inboxes/${agent_id}"
  local processed_path="${MESH_BASE}/bus/processed"

  for file in "${inbox_path}"/*"${message_id}"*.json; do
    if [ -f "$file" ]; then
      mv "$file" "${processed_path}/"
      echo "Message ${message_id} acknowledged by ${agent_id}"
      return
    fi
  done

  echo "Message ${message_id} not found in ${agent_id}'s inbox"
}

cmd_learn() {
  local agent="" title="" description="" category="best-practice" confidence="emerging"

  while [[ $# -gt 0 ]]; do
    case $1 in
      --agent) agent="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      --description) description="$2"; shift 2 ;;
      --category) category="$2"; shift 2 ;;
      --confidence) confidence="$2"; shift 2 ;;
      *) echo "Unknown option: $1"; exit 1 ;;
    esac
  done

  if [ -z "$agent" ] || [ -z "$title" ] || [ -z "$description" ]; then
    echo "Usage: mesh-cli.sh learn --agent <id> --title <text> --description <text> [--category <cat>] [--confidence <level>]"
    exit 1
  fi

  ensure_dirs

  local knowledge_id="CK-$(generate_uuid | cut -d- -f1)"
  local ts
  ts=$(timestamp)

  # Create knowledge item
  cat > "${MESH_BASE}/collective-memory/knowledge/${category}/${knowledge_id}.json" << EOF
{
  "id": "${knowledge_id}",
  "category": "${category}",
  "title": "${title}",
  "content": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "${description}"),
  "confidence": "${confidence}",
  "sourceAgents": ["${agent}"],
  "applicableAgents": [],
  "evidenceCount": 1,
  "evidence": [{"agentId":"${agent}","timestamp":"${ts}","description":"Initial learning","outcome":"success"}],
  "tags": [],
  "createdAt": "${ts}",
  "updatedAt": "${ts}",
  "lastAccessedAt": "${ts}",
  "accessCount": 0,
  "version": 1,
  "status": "active"
}
EOF

  # Create learning event
  local event_id="LE-$(generate_uuid | cut -d- -f1)"
  cat > "${MESH_BASE}/learning/events/${event_id}.json" << EOF
{
  "id": "${event_id}",
  "trigger": "manual",
  "timestamp": "${ts}",
  "sourceAgent": "${agent}",
  "targetAgents": [],
  "learning": {
    "title": "${title}",
    "description": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "${description}"),
    "category": "${category}",
    "confidence": "${confidence}",
    "applicability": "general"
  },
  "context": {},
  "propagated": false,
  "propagatedTo": []
}
EOF

  echo "Learning recorded: ${knowledge_id} - ${title}"
  echo "Event: ${event_id}"
  echo "Category: ${category}, Confidence: ${confidence}"
}

cmd_search() {
  local query="" category="" agent="" limit=10

  while [[ $# -gt 0 ]]; do
    case $1 in
      --query) query="$2"; shift 2 ;;
      --category) category="$2"; shift 2 ;;
      --agent) agent="$2"; shift 2 ;;
      --limit) limit="$2"; shift 2 ;;
      *) echo "Unknown option: $1"; exit 1 ;;
    esac
  done

  echo "=== Collective Knowledge Search ==="
  echo ""

  local search_path="${MESH_BASE}/collective-memory/knowledge"
  local found=0

  if [ -n "$category" ]; then
    search_path="${search_path}/${category}"
  fi

  for file in $(find "$search_path" -name "*.json" 2>/dev/null | head -n "$limit"); do
    local content
    content=$(cat "$file")
    local item_title item_category item_confidence item_sources
    item_title=$(echo "$content" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','?'))")
    item_category=$(echo "$content" | python3 -c "import sys,json; print(json.load(sys.stdin).get('category','?'))")
    item_confidence=$(echo "$content" | python3 -c "import sys,json; print(json.load(sys.stdin).get('confidence','?'))")
    item_sources=$(echo "$content" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin).get('sourceAgents',[])))")

    # Query filter
    if [ -n "$query" ]; then
      if ! echo "$item_title $content" | grep -qi "$query"; then
        continue
      fi
    fi

    echo "  [$item_confidence] ${item_title}"
    echo "    Category: ${item_category} | Sources: ${item_sources}"
    echo ""
    found=$((found + 1))
  done

  echo "Found ${found} items"
}

cmd_briefing() {
  local agent_id="${1:-}"

  if [ -z "$agent_id" ]; then
    echo "Usage: mesh-cli.sh briefing <agent-id>"
    exit 1
  fi

  echo "## Collective Intelligence Briefing for ${agent_id}"
  echo ""
  echo "*Auto-generated from cross-agent learnings*"
  echo ""

  # Show relevant knowledge
  local search_path="${MESH_BASE}/collective-memory/knowledge"
  local has_knowledge=false

  echo "### Relevant Knowledge"
  echo ""

  for dir in "$search_path"/*/; do
    [ -d "$dir" ] || continue
    for file in "$dir"*.json; do
      [ -f "$file" ] || continue
      local applicable
      applicable=$(python3 -c "
import sys, json
with open('${file}') as f:
    data = json.load(f)
agents = data.get('applicableAgents', [])
if '${agent_id}' in agents or len(agents) == 0:
    print('yes')
else:
    print('no')
")
      if [ "$applicable" = "yes" ]; then
        local title confidence sources
        title=$(python3 -c "import json; print(json.load(open('${file}')).get('title','?'))")
        confidence=$(python3 -c "import json; print(json.load(open('${file}')).get('confidence','?'))")
        sources=$(python3 -c "import json; print(','.join(json.load(open('${file}')).get('sourceAgents',[])))")
        echo "- **${title}** (${confidence}, from: ${sources})"
        has_knowledge=true
      fi
    done
  done

  if [ "$has_knowledge" = false ]; then
    echo "  (No knowledge items found for this agent)"
  fi

  # Show inbox summary
  echo ""
  echo "### Pending Messages"
  echo ""
  local inbox_path="${MESH_BASE}/bus/inboxes/${agent_id}"
  local msg_count
  msg_count=$(find "${inbox_path}" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "  ${msg_count} messages in inbox"

  echo ""
  echo "---"
}

cmd_health() {
  echo "=== Agent Mesh Health Check ==="
  echo ""

  # Registry
  local agent_count
  agent_count=$(python3 -c "import json; print(len(json.load(open('${MESH_BASE}/registry/agents.json'))))" 2>/dev/null || echo 0)
  echo "Registry: ${agent_count} agents registered"

  # Inboxes
  echo ""
  echo "Agent Inboxes:"
  for dir in "${MESH_BASE}/bus/inboxes"/*/; do
    [ -d "$dir" ] || continue
    local agent
    agent=$(basename "$dir")
    local count
    count=$(find "$dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      echo "  ${agent}: ${count} messages"
    fi
  done

  # Collective Memory
  echo ""
  local total_knowledge=0
  echo "Collective Memory:"
  for dir in "${MESH_BASE}/collective-memory/knowledge"/*/; do
    [ -d "$dir" ] || continue
    local cat_name
    cat_name=$(basename "$dir")
    local count
    count=$(find "$dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      echo "  ${cat_name}: ${count} items"
      total_knowledge=$((total_knowledge + count))
    fi
  done
  echo "  Total: ${total_knowledge} knowledge items"

  # Learning Events
  echo ""
  local event_count
  event_count=$(find "${MESH_BASE}/learning/events/" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "Learning Events: ${event_count}"

  # Conflicts
  local conflict_count
  conflict_count=$(find "${MESH_BASE}/conflicts/" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "Conflicts: ${conflict_count}"

  # Audit
  local today
  today=$(date -u +%Y-%m-%d)
  local audit_today
  audit_today=$(find "${MESH_BASE}/audit/${today}/" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "Audit Events (today): ${audit_today}"

  echo ""
  echo "Status: HEALTHY"
}

cmd_audit() {
  local days=7

  while [[ $# -gt 0 ]]; do
    case $1 in
      --days) days="$2"; shift 2 ;;
      *) echo "Unknown option: $1"; exit 1 ;;
    esac
  done

  echo "=== Agent Mesh Audit Report (Last ${days} days) ==="
  echo ""

  local total=0
  local by_type=""
  local by_agent=""

  for i in $(seq 0 "$days"); do
    local check_date
    check_date=$(date -u -v-"${i}d" +%Y-%m-%d 2>/dev/null || date -u -d "-${i} days" +%Y-%m-%d 2>/dev/null || continue)
    local dir="${MESH_BASE}/audit/${check_date}"

    if [ -d "$dir" ]; then
      local day_count
      day_count=$(find "$dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
      total=$((total + day_count))

      if [ "$day_count" -gt 0 ]; then
        echo "  ${check_date}: ${day_count} events"
      fi
    fi
  done

  echo ""
  echo "Total events: ${total}"
}

cmd_conflicts() {
  echo "=== Open Conflicts ==="
  echo ""

  local found=0
  for file in "${MESH_BASE}/conflicts"/*.json; do
    [ -f "$file" ] || continue
    local status
    status=$(python3 -c "import json; print(json.load(open('${file}')).get('status','?'))")

    if [ "$status" = "open" ] || [ "$status" = "voting" ] || [ "$status" = "escalated" ]; then
      local id subject agents
      id=$(python3 -c "import json; print(json.load(open('${file}')).get('id','?'))")
      subject=$(python3 -c "import json; print(json.load(open('${file}')).get('subject','?'))")
      agents=$(python3 -c "import json; print(','.join(json.load(open('${file}')).get('agents',[])))")

      echo "  [${status}] ${id}: ${subject}"
      echo "    Agents: ${agents}"
      echo ""
      found=$((found + 1))
    fi
  done

  if [ "$found" -eq 0 ]; then
    echo "  No open conflicts"
  fi
}

# ============================================================
# Main
# ============================================================

case "${1:-help}" in
  init)      shift; cmd_init "$@" ;;
  send)      shift; cmd_send "$@" ;;
  inbox)     shift; cmd_inbox "$@" ;;
  ack)       shift; cmd_ack "$@" ;;
  learn)     shift; cmd_learn "$@" ;;
  search)    shift; cmd_search "$@" ;;
  briefing)  shift; cmd_briefing "$@" ;;
  health)    shift; cmd_health "$@" ;;
  audit)     shift; cmd_audit "$@" ;;
  conflicts) shift; cmd_conflicts "$@" ;;
  help|*)
    echo "Agent Mesh CLI - Inter-agent communication system"
    echo ""
    echo "Usage: mesh-cli.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  init       Initialize the agent mesh"
    echo "  send       Send a message to another agent"
    echo "  inbox      Read an agent's inbox"
    echo "  ack        Acknowledge a message"
    echo "  learn      Report a learning to collective memory"
    echo "  search     Search collective knowledge"
    echo "  briefing   Get intelligence briefing for an agent"
    echo "  health     Check mesh health"
    echo "  audit      View audit report"
    echo "  conflicts  View open conflicts"
    echo ""
    echo "Examples:"
    echo "  mesh-cli.sh init"
    echo "  mesh-cli.sh send --from engineer --to security --subject 'Review auth code' --content 'Please review src/auth/'"
    echo "  mesh-cli.sh inbox engineer"
    echo "  mesh-cli.sh learn --agent security --title 'JWT Best Practice' --description 'Always use RS256'"
    echo "  mesh-cli.sh search --query 'authentication' --agent engineer"
    echo "  mesh-cli.sh briefing engineer"
    ;;
esac
