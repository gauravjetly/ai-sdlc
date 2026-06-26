#!/bin/bash
# Agent Consultation Manager
# Enables formal knowledge sharing between AI-SDLC agents

CONSULTATION_DIR="$HOME/.claude/consultations"
CONSULTATION_DB="$CONSULTATION_DIR/consultations.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure directory exists
mkdir -p "$CONSULTATION_DIR"

usage() {
    echo "Agent Consultation Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create                     Create new consultation"
    echo "  list [--status <status>]   List consultations"
    echo "  view <id>                  View consultation details"
    echo "  respond <id>               Respond to consultation"
    echo "  close <id>                 Close consultation"
    echo "  history [--agent <name>]   View consultation history"
    echo "  stats                      Show consultation statistics"
    echo ""
    echo "Options:"
    echo "  --from <agent>             Requesting agent"
    echo "  --to <agent>               Consulted agent"
    echo "  --type <type>              expertise|review|validation|escalation"
    echo "  --topic <topic>            Consultation topic"
    echo "  --priority <level>         low|medium|high|critical"
    echo ""
    echo "Examples:"
    echo "  $0 create --from engineer --to security --type expertise --topic 'Auth design'"
    echo "  $0 list --status pending"
    echo "  $0 respond CONS-001 --answer 'Use JWT with short expiry'"
    echo "  $0 history --agent security"
}

# Initialize database
init_db() {
    if [ ! -f "$CONSULTATION_DB" ]; then
        cat > "$CONSULTATION_DB" <<EOF
{
  "version": "1.0",
  "consultations": [],
  "sequence": 0
}
EOF
    fi
}

# Generate consultation ID
generate_id() {
    init_db
    local seq=$(python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)
seq = db.get('sequence', 0) + 1
db['sequence'] = seq
with open('$CONSULTATION_DB', 'w') as f:
    json.dump(db, f, indent=2)
print(f'CONS-{seq:04d}')
" 2>/dev/null)
    echo "$seq"
}

# Create consultation
create_consultation() {
    local from_agent=""
    local to_agent=""
    local type="expertise"
    local topic=""
    local priority="medium"
    local questions=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --from) from_agent="$2"; shift 2 ;;
            --to) to_agent="$2"; shift 2 ;;
            --type) type="$2"; shift 2 ;;
            --topic) topic="$2"; shift 2 ;;
            --priority) priority="$2"; shift 2 ;;
            --question) questions="$questions$2|"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [ -z "$from_agent" ] || [ -z "$to_agent" ] || [ -z "$topic" ]; then
        echo -e "${RED}✗${NC} Required: --from, --to, --topic"
        return 1
    fi

    init_db
    local cons_id=$(generate_id)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

consultation = {
    'id': '$cons_id',
    'timestamp': '$timestamp',
    'type': '$type',
    'priority': '$priority',
    'from': '$from_agent',
    'to': '$to_agent',
    'topic': '$topic',
    'questions': [q for q in '$questions'.split('|') if q],
    'status': 'pending',
    'response': None
}

db['consultations'].append(consultation)
with open('$CONSULTATION_DB', 'w') as f:
    json.dump(db, f, indent=2)
"

    echo -e "${GREEN}✓${NC} Consultation created: $cons_id"
    echo ""
    echo -e "  From:     ${CYAN}$from_agent${NC}"
    echo -e "  To:       ${CYAN}$to_agent${NC}"
    echo -e "  Type:     $type"
    echo -e "  Priority: $priority"
    echo -e "  Topic:    $topic"
}

# List consultations
list_consultations() {
    local status_filter=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --status) status_filter="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    init_db

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                      Consultations                             ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

status_filter = '$status_filter'
consultations = db.get('consultations', [])

if status_filter:
    consultations = [c for c in consultations if c['status'] == status_filter]

if not consultations:
    print('  No consultations found')
else:
    for c in consultations:
        status_color = {
            'pending': '\033[1;33m',    # Yellow
            'in_progress': '\033[0;34m', # Blue
            'completed': '\033[0;32m',   # Green
            'declined': '\033[0;31m'     # Red
        }.get(c['status'], '')

        priority_indicator = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        }.get(c['priority'], '⚪')

        print(f\"  {priority_indicator} {c['id']:12} {status_color}{c['status']:12}\033[0m {c['from']:10} → {c['to']:10} {c['topic'][:30]}\")
"
}

# View consultation details
view_consultation() {
    local cons_id=$1

    init_db

    python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

cons = next((c for c in db['consultations'] if c['id'] == '$cons_id'), None)

if not cons:
    print('Consultation not found: $cons_id')
else:
    print('═' * 60)
    print(f\"Consultation: {cons['id']}\")
    print('═' * 60)
    print()
    print(f\"Status:    {cons['status']}\")
    print(f\"Type:      {cons['type']}\")
    print(f\"Priority:  {cons['priority']}\")
    print(f\"Created:   {cons['timestamp']}\")
    print()
    print(f\"From:      {cons['from']}-agent\")
    print(f\"To:        {cons['to']}-agent\")
    print()
    print(f\"Topic:     {cons['topic']}\")
    print()

    if cons.get('questions'):
        print('Questions:')
        for i, q in enumerate(cons['questions'], 1):
            print(f'  {i}. {q}')
        print()

    if cons.get('response'):
        print('Response:')
        print(f\"  {cons['response']}\")
        print()
"
}

# Respond to consultation
respond_consultation() {
    local cons_id=$1
    shift
    local answer=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --answer) answer="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [ -z "$answer" ]; then
        echo -e "${RED}✗${NC} Required: --answer"
        return 1
    fi

    init_db

    python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

for c in db['consultations']:
    if c['id'] == '$cons_id':
        c['status'] = 'completed'
        c['response'] = '$answer'
        c['response_timestamp'] = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")'
        break

with open('$CONSULTATION_DB', 'w') as f:
    json.dump(db, f, indent=2)
"

    echo -e "${GREEN}✓${NC} Response recorded for $cons_id"
}

# Close consultation
close_consultation() {
    local cons_id=$1

    init_db

    python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

for c in db['consultations']:
    if c['id'] == '$cons_id':
        c['status'] = 'completed'
        break

with open('$CONSULTATION_DB', 'w') as f:
    json.dump(db, f, indent=2)
"

    echo -e "${GREEN}✓${NC} Consultation closed: $cons_id"
}

# View history
view_history() {
    local agent_filter=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --agent) agent_filter="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    init_db

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                  Consultation History                          ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    python3 -c "
import json
with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

agent_filter = '$agent_filter'
consultations = db.get('consultations', [])

if agent_filter:
    consultations = [c for c in consultations if c['from'] == agent_filter or c['to'] == agent_filter]

# Group by status
completed = [c for c in consultations if c['status'] == 'completed']
pending = [c for c in consultations if c['status'] == 'pending']

print(f'Completed: {len(completed)}')
print(f'Pending:   {len(pending)}')
print()

print('Recent Completed:')
for c in completed[-5:]:
    print(f\"  {c['timestamp'][:10]} {c['id']} {c['from']} → {c['to']}: {c['topic'][:40]}\")
"
}

# Show statistics
show_stats() {
    init_db

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                Consultation Statistics                         ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    python3 -c "
import json
from collections import Counter

with open('$CONSULTATION_DB', 'r') as f:
    db = json.load(f)

consultations = db.get('consultations', [])

if not consultations:
    print('No consultations recorded yet')
else:
    print(f'Total Consultations: {len(consultations)}')
    print()

    # By status
    status_counts = Counter(c['status'] for c in consultations)
    print('By Status:')
    for status, count in status_counts.items():
        bar = '█' * min(count, 20)
        print(f'  {status:15} {bar} {count}')
    print()

    # By type
    type_counts = Counter(c['type'] for c in consultations)
    print('By Type:')
    for t, count in type_counts.items():
        bar = '█' * min(count, 20)
        print(f'  {t:15} {bar} {count}')
    print()

    # By agent (as requester)
    from_counts = Counter(c['from'] for c in consultations)
    print('Most Active Requesters:')
    for agent, count in from_counts.most_common(5):
        print(f'  {agent:15} {count}')
    print()

    # By agent (as responder)
    to_counts = Counter(c['to'] for c in consultations)
    print('Most Consulted Agents:')
    for agent, count in to_counts.most_common(5):
        print(f'  {agent:15} {count}')
"
}

# Main
case "$1" in
    create)
        shift
        create_consultation "$@"
        ;;
    list)
        shift
        list_consultations "$@"
        ;;
    view)
        view_consultation "$2"
        ;;
    respond)
        shift
        respond_consultation "$@"
        ;;
    close)
        close_consultation "$2"
        ;;
    history)
        shift
        view_history "$@"
        ;;
    stats)
        show_stats
        ;;
    *)
        usage
        ;;
esac
