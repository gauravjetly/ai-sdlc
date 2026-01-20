#!/bin/bash
# Custom Agent Builder
# Create and manage custom AI-SDLC agents

AGENTS_DIR="$HOME/.claude/custom-agents"
TEMPLATES_DIR="$(dirname "$0")/../agents/agent-builder/templates"
REGISTRY_FILE="$HOME/.claude/agent-registry.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$AGENTS_DIR"

usage() {
    echo "Custom Agent Builder"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <name>              Create new custom agent"
    echo "  configure <name>           Configure agent interactively"
    echo "  edit <name>                Edit agent configuration"
    echo "  test <name>                Run agent tests"
    echo "  deploy <name>              Deploy agent to registry"
    echo "  undeploy <name>            Remove agent from registry"
    echo "  list                       List all custom agents"
    echo "  info <name>                Show agent information"
    echo "  export <name> <file>       Export agent to file"
    echo "  import <file>              Import agent from file"
    echo ""
    echo "Examples:"
    echo "  $0 create api-docs-agent"
    echo "  $0 configure api-docs-agent"
    echo "  $0 deploy api-docs-agent"
    echo "  $0 list"
}

# Initialize registry
init_registry() {
    if [ ! -f "$REGISTRY_FILE" ]; then
        cat > "$REGISTRY_FILE" <<EOF
{
  "version": "1.0",
  "builtin_agents": [
    "ba-agent",
    "architect-jets",
    "software-engineer",
    "security-agent",
    "qa-agent",
    "atlas-agent",
    "customer-agent",
    "conductor",
    "finops-agent",
    "tracker-agent"
  ],
  "custom_agents": []
}
EOF
    fi
}

# Create new agent
create_agent() {
    local name=$1

    if [ -z "$name" ]; then
        echo -e "${RED}✗${NC} Agent name required"
        return 1
    fi

    local agent_dir="$AGENTS_DIR/$name"

    if [ -d "$agent_dir" ]; then
        echo -e "${YELLOW}⚠${NC} Agent already exists: $name"
        return 1
    fi

    echo -e "${CYAN}Creating agent: $name${NC}"
    echo ""

    # Create directory structure
    mkdir -p "$agent_dir"/{tools,patterns,examples,tests,memory}

    # Create agent.yaml
    cat > "$agent_dir/agent.yaml" <<EOF
# Custom Agent Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

name: $name
version: 1.0.0
description: "Custom agent for [describe purpose]"

# Agent identity
identity:
  role: "Specialist"
  expertise:
    - "Domain expertise 1"
    - "Domain expertise 2"
  personality: "Professional, thorough, helpful"

# Integration with SDLC
integration:
  phases:
    - implementation
    - review
  consults:
    - security-agent
    - architect-agent
  triggers:
    - manual: true

# Tool access
tools:
  builtin:
    - read
    - write
    - bash
    - glob
    - grep
  custom: []

# Memory settings
memory:
  enabled: true
  categories:
    - patterns
    - solutions
    - learnings
  retention_days: 90

# Resource limits
limits:
  max_tokens: 100000
  max_tool_calls: 50
  timeout_minutes: 30
EOF

    # Create system prompt
    cat > "$agent_dir/system-prompt.md" <<EOF
# $name

You are a specialized AI agent for [describe domain/purpose].

## Your Responsibilities

1. [Primary responsibility]
2. [Secondary responsibility]
3. [Tertiary responsibility]

## Your Expertise

- [Area of expertise 1]
- [Area of expertise 2]
- [Area of expertise 3]

## How You Work

When given a task:

1. **Understand**: First, fully understand the context and requirements
2. **Analyze**: Analyze the relevant files and information
3. **Plan**: Create a clear plan of action
4. **Execute**: Carry out the plan step by step
5. **Verify**: Verify the results meet requirements

## Output Format

Structure your responses as:

### Summary
Brief overview of what was done

### Details
Detailed explanation of changes or findings

### Recommendations
Suggestions for improvements or next steps

### Questions
Any clarifying questions if needed

## Important Rules

- ALWAYS verify your work before marking complete
- NEVER make changes outside your domain
- ASK for clarification when requirements are unclear
- DOCUMENT your decisions and reasoning
EOF

    # Create empty patterns file
    cat > "$agent_dir/patterns/patterns.json" <<EOF
{
  "patterns": []
}
EOF

    # Create empty examples file
    cat > "$agent_dir/examples/examples.json" <<EOF
{
  "examples": []
}
EOF

    # Create test template
    cat > "$agent_dir/tests/test-cases.yaml" <<EOF
# Test cases for $name
test_cases:
  - name: "Basic functionality"
    description: "Test basic agent functionality"
    input:
      task: "Sample task description"
    expected:
      behavior: "completes_successfully"
EOF

    echo -e "  ${GREEN}✓${NC} Created agent.yaml"
    echo -e "  ${GREEN}✓${NC} Created system-prompt.md"
    echo -e "  ${GREEN}✓${NC} Created patterns/patterns.json"
    echo -e "  ${GREEN}✓${NC} Created examples/examples.json"
    echo -e "  ${GREEN}✓${NC} Created tests/test-cases.yaml"
    echo ""
    echo -e "${GREEN}✓${NC} Agent created: $agent_dir"
    echo ""
    echo "Next steps:"
    echo "  1. Edit $agent_dir/agent.yaml"
    echo "  2. Edit $agent_dir/system-prompt.md"
    echo "  3. Add patterns and examples"
    echo "  4. Run: $0 test $name"
    echo "  5. Run: $0 deploy $name"
}

# Configure agent interactively
configure_agent() {
    local name=$1
    local agent_dir="$AGENTS_DIR/$name"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $name"
        return 1
    fi

    echo -e "${CYAN}Configuring agent: $name${NC}"
    echo ""

    # Read current config
    echo "Current configuration:"
    echo "─────────────────────────────────────────────────────────────"
    cat "$agent_dir/agent.yaml"
    echo "─────────────────────────────────────────────────────────────"
    echo ""

    read -p "Open in editor? (y/N): " open_editor
    if [[ "$open_editor" =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} "$agent_dir/agent.yaml"
    fi
}

# Edit agent
edit_agent() {
    local name=$1
    local agent_dir="$AGENTS_DIR/$name"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $name"
        return 1
    fi

    echo "Which file to edit?"
    echo "  1. agent.yaml (configuration)"
    echo "  2. system-prompt.md (personality)"
    echo "  3. patterns/patterns.json"
    echo "  4. examples/examples.json"
    echo ""
    read -p "Selection (1-4): " selection

    case $selection in
        1) ${EDITOR:-nano} "$agent_dir/agent.yaml" ;;
        2) ${EDITOR:-nano} "$agent_dir/system-prompt.md" ;;
        3) ${EDITOR:-nano} "$agent_dir/patterns/patterns.json" ;;
        4) ${EDITOR:-nano} "$agent_dir/examples/examples.json" ;;
        *) echo "Invalid selection" ;;
    esac
}

# Test agent
test_agent() {
    local name=$1
    local agent_dir="$AGENTS_DIR/$name"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $name"
        return 1
    fi

    echo -e "${CYAN}Testing agent: $name${NC}"
    echo ""

    # Validate YAML syntax
    echo -n "  Validating agent.yaml... "
    if python3 -c "import yaml; yaml.safe_load(open('$agent_dir/agent.yaml'))" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} Invalid YAML"
        return 1
    fi

    # Validate JSON files
    echo -n "  Validating patterns.json... "
    if python3 -c "import json; json.load(open('$agent_dir/patterns/patterns.json'))" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} Invalid JSON"
        return 1
    fi

    echo -n "  Validating examples.json... "
    if python3 -c "import json; json.load(open('$agent_dir/examples/examples.json'))" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} Invalid JSON"
        return 1
    fi

    # Check required files
    echo -n "  Checking system-prompt.md... "
    if [ -f "$agent_dir/system-prompt.md" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} Missing"
        return 1
    fi

    echo ""
    echo -e "${GREEN}✓${NC} All tests passed"
}

# Deploy agent
deploy_agent() {
    local name=$1
    local agent_dir="$AGENTS_DIR/$name"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $name"
        return 1
    fi

    # Test first
    if ! test_agent "$name"; then
        echo -e "${RED}✗${NC} Cannot deploy: tests failed"
        return 1
    fi

    init_registry

    echo ""
    echo -e "${CYAN}Deploying agent: $name${NC}"

    python3 -c "
import json
with open('$REGISTRY_FILE', 'r') as f:
    registry = json.load(f)

if '$name' not in registry['custom_agents']:
    registry['custom_agents'].append('$name')
    with open('$REGISTRY_FILE', 'w') as f:
        json.dump(registry, f, indent=2)
    print('Agent registered successfully')
else:
    print('Agent already registered')
"

    echo -e "${GREEN}✓${NC} Agent deployed: $name"
}

# Undeploy agent
undeploy_agent() {
    local name=$1

    init_registry

    python3 -c "
import json
with open('$REGISTRY_FILE', 'r') as f:
    registry = json.load(f)

if '$name' in registry['custom_agents']:
    registry['custom_agents'].remove('$name')
    with open('$REGISTRY_FILE', 'w') as f:
        json.dump(registry, f, indent=2)
    print('Agent unregistered')
else:
    print('Agent not found in registry')
"

    echo -e "${GREEN}✓${NC} Agent undeployed: $name"
}

# List agents
list_agents() {
    init_registry

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                     Agent Registry                             ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${YELLOW}Built-in Agents:${NC}"
    python3 -c "
import json
with open('$REGISTRY_FILE', 'r') as f:
    registry = json.load(f)
for agent in registry['builtin_agents']:
    print(f'  ✓ {agent}')
"

    echo ""
    echo -e "${YELLOW}Custom Agents:${NC}"

    if [ -d "$AGENTS_DIR" ] && [ "$(ls -A "$AGENTS_DIR" 2>/dev/null)" ]; then
        for agent_dir in "$AGENTS_DIR"/*; do
            if [ -d "$agent_dir" ]; then
                local agent_name=$(basename "$agent_dir")

                # Check if deployed
                local deployed=$(python3 -c "
import json
with open('$REGISTRY_FILE', 'r') as f:
    registry = json.load(f)
print('✓' if '$agent_name' in registry['custom_agents'] else '○')
" 2>/dev/null)

                # Get version
                local version=$(grep "^version:" "$agent_dir/agent.yaml" 2>/dev/null | awk '{print $2}')

                echo "  $deployed $agent_name (v$version)"
            fi
        done
    else
        echo "  (no custom agents)"
    fi
}

# Show agent info
show_info() {
    local name=$1
    local agent_dir="$AGENTS_DIR/$name"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $name"
        return 1
    fi

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                     Agent: $name                               ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    python3 -c "
import yaml
with open('$agent_dir/agent.yaml', 'r') as f:
    config = yaml.safe_load(f)

print(f\"Name:        {config.get('name', 'N/A')}\")
print(f\"Version:     {config.get('version', 'N/A')}\")
print(f\"Description: {config.get('description', 'N/A')}\")
print()

identity = config.get('identity', {})
print(f\"Role:        {identity.get('role', 'N/A')}\")
print('Expertise:')
for exp in identity.get('expertise', []):
    print(f'  - {exp}')
print()

integration = config.get('integration', {})
print('Phases:', ', '.join(integration.get('phases', [])))
print('Consults:', ', '.join(integration.get('consults', [])))
print()

tools = config.get('tools', {})
print('Tools:')
print('  Built-in:', ', '.join(tools.get('builtin', [])))
print('  Custom:', ', '.join(tools.get('custom', [])))
" 2>/dev/null

    echo ""
    echo "Files:"
    ls -la "$agent_dir"
}

# Export agent
export_agent() {
    local name=$1
    local output_file=$2
    local agent_dir="$AGENTS_DIR/$name"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $name"
        return 1
    fi

    tar -czf "$output_file" -C "$AGENTS_DIR" "$name"
    echo -e "${GREEN}✓${NC} Agent exported to: $output_file"
}

# Import agent
import_agent() {
    local input_file=$1

    if [ ! -f "$input_file" ]; then
        echo -e "${RED}✗${NC} File not found: $input_file"
        return 1
    fi

    tar -xzf "$input_file" -C "$AGENTS_DIR"
    echo -e "${GREEN}✓${NC} Agent imported from: $input_file"
}

# Main
case "$1" in
    create)
        create_agent "$2"
        ;;
    configure)
        configure_agent "$2"
        ;;
    edit)
        edit_agent "$2"
        ;;
    test)
        test_agent "$2"
        ;;
    deploy)
        deploy_agent "$2"
        ;;
    undeploy)
        undeploy_agent "$2"
        ;;
    list)
        list_agents
        ;;
    info)
        show_info "$2"
        ;;
    export)
        export_agent "$2" "$3"
        ;;
    import)
        import_agent "$2"
        ;;
    *)
        usage
        ;;
esac
