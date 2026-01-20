#!/bin/bash
# Cross-Agent Learning Management Script
# Manages shared learnings between AI-SDLC agents

MEMORY_DIR="$HOME/.claude/agent-memory"
SHARED_DIR="$MEMORY_DIR/shared"
LEARNING_FILE="$SHARED_DIR/cross-agent-learnings.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$SHARED_DIR"

usage() {
    echo "Cross-Agent Learning Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  add <from> <to> <finding> <learning>  Add new cross-agent learning"
    echo "  list [flow]                            List learnings (optionally filter by flow)"
    echo "  search <keyword>                       Search learnings"
    echo "  stats                                  Show learning statistics"
    echo "  export <file>                          Export learnings to file"
    echo "  import <file>                          Import learnings from file"
    echo ""
    echo "Flows:"
    echo "  security_to_engineer    Security findings → Engineering patterns"
    echo "  qa_to_architect         QA bugs → Architecture improvements"
    echo "  customer_to_ba          Acceptance feedback → Requirements"
    echo "  atlas_to_engineer       Deployment issues → Coding practices"
    echo "  engineer_to_qa          Implementation details → Test cases"
    echo "  finops_to_architect     Cost data → Architecture decisions"
    echo ""
    echo "Examples:"
    echo "  $0 add security engineer 'XSS in output' 'Always encode HTML output'"
    echo "  $0 list security_to_engineer"
    echo "  $0 search 'injection'"
    echo "  $0 stats"
}

add_learning() {
    local from_agent=$1
    local to_agent=$2
    local finding=$3
    local learning=$4
    local flow="${from_agent}_to_${to_agent}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    if [ ! -f "$LEARNING_FILE" ]; then
        echo '{"learning_flows":{}}' > "$LEARNING_FILE"
    fi

    # Create learning entry
    local entry=$(cat <<EOF
{
  "source": "$from_agent-agent",
  "finding": "$finding",
  "learning": {
    "pattern": "$learning"
  },
  "timestamp": "$timestamp"
}
EOF
)

    echo -e "${GREEN}✓${NC} Added learning: $from_agent → $to_agent"
    echo -e "  Finding: $finding"
    echo -e "  Learning: $learning"

    # Log to file
    echo "[$(date)] $flow: $finding -> $learning" >> "$SHARED_DIR/learning-log.txt"
}

list_learnings() {
    local flow=$1

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    Cross-Agent Learnings                       ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ -f "$LEARNING_FILE" ]; then
        if [ -n "$flow" ]; then
            echo -e "${YELLOW}Flow: $flow${NC}"
            echo ""
            cat "$LEARNING_FILE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
flow = '$flow'
if flow in data.get('learning_flows', {}):
    for ex in data['learning_flows'][flow].get('examples', []):
        print(f\"  Source: {ex.get('source', 'N/A')}\")
        print(f\"  Finding: {ex.get('finding', 'N/A')}\")
        print(f\"  Pattern: {ex.get('learning', {}).get('pattern', 'N/A')}\")
        print()
else:
    print('  No learnings in this flow yet')
" 2>/dev/null || echo "  No learnings found"
        else
            cat "$LEARNING_FILE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for flow, info in data.get('learning_flows', {}).items():
    print(f\"\\033[1;33m{flow}\\033[0m\")
    print(f\"  {info.get('description', 'No description')}\")
    count = len(info.get('examples', []))
    print(f\"  Examples: {count}\")
    print()
" 2>/dev/null || echo "No learnings found"
        fi
    else
        echo "No learnings file found"
    fi
}

search_learnings() {
    local keyword=$1

    echo -e "${CYAN}Searching for: ${YELLOW}$keyword${NC}"
    echo ""

    if [ -f "$LEARNING_FILE" ]; then
        grep -i "$keyword" "$LEARNING_FILE" | head -20
    fi

    if [ -f "$SHARED_DIR/learning-log.txt" ]; then
        echo ""
        echo -e "${YELLOW}From log:${NC}"
        grep -i "$keyword" "$SHARED_DIR/learning-log.txt" | tail -10
    fi
}

show_stats() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                 Cross-Agent Learning Statistics                ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ -f "$LEARNING_FILE" ]; then
        cat "$LEARNING_FILE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
total = 0
print('Learning Flows:')
print('─' * 50)
for flow, info in data.get('learning_flows', {}).items():
    count = len(info.get('examples', []))
    total += count
    bar = '█' * min(count, 20)
    print(f'  {flow:25} {bar} {count}')
print('─' * 50)
print(f'  {\"TOTAL\":25} {total}')
print()
print('Shared Patterns:', len(data.get('shared_patterns', {})))
" 2>/dev/null || echo "Unable to parse learnings file"
    else
        echo "No learnings file found"
    fi

    if [ -f "$SHARED_DIR/learning-log.txt" ]; then
        echo ""
        echo -e "${YELLOW}Recent Activity:${NC}"
        tail -5 "$SHARED_DIR/learning-log.txt"
    fi
}

export_learnings() {
    local output_file=$1

    if [ -f "$LEARNING_FILE" ]; then
        cp "$LEARNING_FILE" "$output_file"
        echo -e "${GREEN}✓${NC} Exported learnings to: $output_file"
    else
        echo -e "${RED}✗${NC} No learnings file found"
    fi
}

import_learnings() {
    local input_file=$1

    if [ -f "$input_file" ]; then
        # Merge learnings (simple copy for now)
        cp "$input_file" "$LEARNING_FILE"
        echo -e "${GREEN}✓${NC} Imported learnings from: $input_file"
    else
        echo -e "${RED}✗${NC} File not found: $input_file"
    fi
}

# Main
case "$1" in
    add)
        add_learning "$2" "$3" "$4" "$5"
        ;;
    list)
        list_learnings "$2"
        ;;
    search)
        search_learnings "$2"
        ;;
    stats)
        show_stats
        ;;
    export)
        export_learnings "$2"
        ;;
    import)
        import_learnings "$2"
        ;;
    *)
        usage
        ;;
esac
