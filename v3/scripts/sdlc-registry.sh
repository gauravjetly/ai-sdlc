#!/bin/bash

#===============================================================================
# SDLC Registry CLI
# Tracks agent activity across projects for the Control Center dashboard
#===============================================================================

REGISTRY_DIR="${HOME}/.claude/sdlc-registry"
REGISTRY_FILE="${REGISTRY_DIR}/registry.json"
PROJECTS_DIR="${REGISTRY_DIR}/projects"
ACTIVITY_LOG="${REGISTRY_DIR}/activity.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Initialize registry if needed
init_registry() {
    mkdir -p "$REGISTRY_DIR" "$PROJECTS_DIR"
    
    if [ ! -f "$REGISTRY_FILE" ]; then
        cat > "$REGISTRY_FILE" << 'EOF'
{
  "version": "2.0.0",
  "lastUpdated": "",
  "stats": {
    "totalProjects": 0,
    "completedProjects": 0,
    "activeProjects": 0,
    "blockedProjects": 0,
    "totalInvocations": 0
  },
  "agents": {
    "conductor": { "invocations": 0, "totalDuration": 0 },
    "ba": { "invocations": 0, "totalDuration": 0 },
    "jets": { "invocations": 0, "totalDuration": 0 },
    "engineer": { "invocations": 0, "totalDuration": 0 },
    "security": { "invocations": 0, "totalDuration": 0, "blocked": 0 },
    "qa": { "invocations": 0, "totalDuration": 0, "failed": 0 },
    "atlas": { "invocations": 0, "totalDuration": 0, "rollbacks": 0 },
    "customer": { "invocations": 0, "totalDuration": 0, "rejected": 0 },
    "tracker": { "invocations": 0, "totalDuration": 0 }
  },
  "projects": []
}
EOF
        echo -e "${GREEN}✓${NC} Registry initialized at $REGISTRY_DIR"
    fi
    
    touch "$ACTIVITY_LOG"
}

# Get current timestamp
timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Log activity
log_activity() {
    local project="$1"
    local agent="$2"
    local action="$3"
    local type="$4"
    
    echo "{\"timestamp\":\"$(timestamp)\",\"project\":\"$project\",\"agent\":\"$agent\",\"action\":\"$action\",\"type\":\"$type\"}" >> "$ACTIVITY_LOG"
}

# Create new project
create_project() {
    local project_id="$1"
    local name="$2"
    local description="$3"
    
    local project_file="${PROJECTS_DIR}/${project_id}.json"
    
    cat > "$project_file" << EOF
{
  "id": "$project_id",
  "name": "$name",
  "description": "$description",
  "status": "in_progress",
  "createdAt": "$(timestamp)",
  "updatedAt": "$(timestamp)",
  "currentPhase": "conductor",
  "phases": [],
  "activity": []
}
EOF
    
    # Update registry
    python3 << PYTHON
import json

with open('$REGISTRY_FILE', 'r') as f:
    reg = json.load(f)

reg['stats']['totalProjects'] += 1
reg['stats']['activeProjects'] += 1
reg['lastUpdated'] = '$(timestamp)'
if '$project_id' not in reg['projects']:
    reg['projects'].append('$project_id')

with open('$REGISTRY_FILE', 'w') as f:
    json.dump(reg, f, indent=2)
PYTHON

    log_activity "$project_id" "conductor" "Project created: $name" "create"
    echo -e "${GREEN}✓${NC} Project $project_id created"
}

# Start phase
start_phase() {
    local project_id="$1"
    local agent="$2"
    
    local project_file="${PROJECTS_DIR}/${project_id}.json"
    
    if [ ! -f "$project_file" ]; then
        echo -e "${RED}✗${NC} Project not found: $project_id"
        return 1
    fi
    
    python3 << PYTHON
import json

with open('$project_file', 'r') as f:
    proj = json.load(f)

# Add new phase
proj['phases'].append({
    'agent': '$agent',
    'status': 'in_progress',
    'startedAt': '$(timestamp)',
    'completedAt': None,
    'duration': None,
    'outputs': []
})
proj['currentPhase'] = '$agent'
proj['updatedAt'] = '$(timestamp)'

with open('$project_file', 'w') as f:
    json.dump(proj, f, indent=2)

# Update registry invocation count
with open('$REGISTRY_FILE', 'r') as f:
    reg = json.load(f)

reg['agents']['$agent']['invocations'] += 1
reg['stats']['totalInvocations'] += 1
reg['lastUpdated'] = '$(timestamp)'

with open('$REGISTRY_FILE', 'w') as f:
    json.dump(reg, f, indent=2)
PYTHON

    log_activity "$project_id" "$agent" "Phase started" "start"
    echo -e "${BLUE}▶${NC} $agent phase started for $project_id"
}

# Complete phase
complete_phase() {
    local project_id="$1"
    local agent="$2"
    local outputs="$3"
    local metrics="$4"
    
    local project_file="${PROJECTS_DIR}/${project_id}.json"
    
    python3 << PYTHON
import json
from datetime import datetime

with open('$project_file', 'r') as f:
    proj = json.load(f)

# Find and update the phase
for phase in proj['phases']:
    if phase['agent'] == '$agent' and phase['status'] == 'in_progress':
        phase['status'] = 'complete'
        phase['completedAt'] = '$(timestamp)'
        
        # Calculate duration
        start = datetime.fromisoformat(phase['startedAt'].replace('Z', '+00:00'))
        end = datetime.fromisoformat('$(timestamp)'.replace('Z', '+00:00'))
        duration_mins = int((end - start).total_seconds() / 60)
        if duration_mins < 60:
            phase['duration'] = f'{duration_mins}m'
        else:
            phase['duration'] = f'{duration_mins // 60}h {duration_mins % 60}m'
        
        if '$outputs':
            phase['outputs'] = '$outputs'.split(',')
        if '$metrics':
            phase['metrics'] = json.loads('$metrics') if '$metrics' != '' else {}
        break

proj['updatedAt'] = '$(timestamp)'

with open('$project_file', 'w') as f:
    json.dump(proj, f, indent=2)
PYTHON

    log_activity "$project_id" "$agent" "Phase completed" "complete"
    echo -e "${GREEN}✓${NC} $agent phase completed for $project_id"
}

# Block project
block_project() {
    local project_id="$1"
    local agent="$2"
    local reason="$3"
    
    local project_file="${PROJECTS_DIR}/${project_id}.json"
    
    python3 << PYTHON
import json

with open('$project_file', 'r') as f:
    proj = json.load(f)

proj['status'] = 'blocked'
for phase in proj['phases']:
    if phase['agent'] == '$agent' and phase['status'] == 'in_progress':
        phase['status'] = 'blocked'
        phase['reason'] = '$reason'
        break

proj['updatedAt'] = '$(timestamp)'

with open('$project_file', 'w') as f:
    json.dump(proj, f, indent=2)

# Update registry
with open('$REGISTRY_FILE', 'r') as f:
    reg = json.load(f)

reg['stats']['activeProjects'] -= 1
reg['stats']['blockedProjects'] += 1
if 'blocked' in reg['agents']['$agent']:
    reg['agents']['$agent']['blocked'] += 1
reg['lastUpdated'] = '$(timestamp)'

with open('$REGISTRY_FILE', 'w') as f:
    json.dump(reg, f, indent=2)
PYTHON

    log_activity "$project_id" "$agent" "BLOCKED: $reason" "blocked"
    echo -e "${RED}⛔${NC} Project $project_id blocked by $agent: $reason"
}

# Complete project
complete_project() {
    local project_id="$1"
    
    local project_file="${PROJECTS_DIR}/${project_id}.json"
    
    python3 << PYTHON
import json

with open('$project_file', 'r') as f:
    proj = json.load(f)

proj['status'] = 'complete'
proj['currentPhase'] = 'complete'
proj['completedAt'] = '$(timestamp)'
proj['updatedAt'] = '$(timestamp)'

with open('$project_file', 'w') as f:
    json.dump(proj, f, indent=2)

# Update registry
with open('$REGISTRY_FILE', 'r') as f:
    reg = json.load(f)

reg['stats']['activeProjects'] -= 1
reg['stats']['completedProjects'] += 1
reg['lastUpdated'] = '$(timestamp)'

with open('$REGISTRY_FILE', 'w') as f:
    json.dump(reg, f, indent=2)
PYTHON

    log_activity "$project_id" "conductor" "Project completed" "complete"
    echo -e "${GREEN}✅${NC} Project $project_id completed"
}

# Log progress
log_progress() {
    local project_id="$1"
    local agent="$2"
    local action="$3"
    
    log_activity "$project_id" "$agent" "$action" "progress"
    echo -e "${BLUE}📝${NC} [$agent] $action"
}

# Show status
show_status() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              AI-SDLC Registry Status                         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ -f "$REGISTRY_FILE" ]; then
        python3 << 'PYTHON'
import json

with open('${REGISTRY_FILE}', 'r') as f:
    reg = json.load(f)

stats = reg['stats']
print(f"  Total Projects:     {stats['totalProjects']}")
print(f"  ├── Completed:      {stats['completedProjects']}")
print(f"  ├── Active:         {stats['activeProjects']}")
print(f"  └── Blocked:        {stats['blockedProjects']}")
print(f"")
print(f"  Total Invocations:  {stats['totalInvocations']}")
print(f"")
print(f"  Agent Activity:")
for agent, data in reg['agents'].items():
    inv = data.get('invocations', 0)
    if inv > 0:
        print(f"    {agent:12} {inv:4} invocations")
PYTHON
    else
        echo "  No registry found. Run: sdlc-registry init"
    fi
    echo ""
}

# Show recent activity
show_activity() {
    local lines="${1:-10}"
    
    echo ""
    echo -e "${BLUE}Recent Activity (last $lines):${NC}"
    echo ""
    
    if [ -f "$ACTIVITY_LOG" ]; then
        tail -n "$lines" "$ACTIVITY_LOG" | while read line; do
            echo "$line" | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    ts = data['timestamp'][11:19]
    print(f\"  {ts} [{data['agent']:10}] {data['action']}\")
except:
    pass
"
        done
    else
        echo "  No activity logged yet."
    fi
    echo ""
}

# Main command handler
case "$1" in
    init)
        init_registry
        ;;
    create)
        init_registry
        create_project "$2" "$3" "$4"
        ;;
    start)
        start_phase "$2" "$3"
        ;;
    complete)
        complete_phase "$2" "$3" "$4" "$5"
        ;;
    block)
        block_project "$2" "$3" "$4"
        ;;
    finish)
        complete_project "$2"
        ;;
    log)
        log_progress "$2" "$3" "$4"
        ;;
    status)
        show_status
        ;;
    activity)
        show_activity "$2"
        ;;
    export)
        # Export registry as JSON for the Control Center
        if [ -f "$REGISTRY_FILE" ]; then
            cat "$REGISTRY_FILE"
        fi
        ;;
    projects)
        # List all projects
        ls -1 "$PROJECTS_DIR" 2>/dev/null | sed 's/.json$//'
        ;;
    project)
        # Show single project
        if [ -f "${PROJECTS_DIR}/$2.json" ]; then
            cat "${PROJECTS_DIR}/$2.json"
        fi
        ;;
    help|--help|-h|"")
        echo ""
        echo "SDLC Registry CLI - Track agent activity"
        echo ""
        echo "Usage: sdlc-registry <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init                          Initialize registry"
        echo "  create <id> <name> <desc>     Create new project"
        echo "  start <project> <agent>       Start agent phase"
        echo "  complete <project> <agent>    Complete agent phase"
        echo "  block <project> <agent> <msg> Block project"
        echo "  finish <project>              Mark project complete"
        echo "  log <project> <agent> <msg>   Log progress"
        echo "  status                        Show registry status"
        echo "  activity [n]                  Show recent activity"
        echo "  export                        Export registry JSON"
        echo "  projects                      List all projects"
        echo "  project <id>                  Show project details"
        echo ""
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'sdlc-registry help' for usage"
        exit 1
        ;;
esac
