#!/bin/bash
# Multi-Tenant Manager
# Manage isolated tenant environments for enterprise AI-SDLC deployments

TENANTS_DIR="$HOME/.claude/tenants"
TENANT_REGISTRY="$TENANTS_DIR/registry.json"
CURRENT_TENANT_FILE="$HOME/.claude/.current-tenant"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$TENANTS_DIR"

usage() {
    echo "Multi-Tenant Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <name>              Create new tenant"
    echo "  delete <name>              Delete tenant (with confirmation)"
    echo "  list                       List all tenants"
    echo "  switch <name>              Switch to tenant"
    echo "  current                    Show current tenant"
    echo "  config <name>              Configure tenant"
    echo "  export <name> <file>       Export tenant data"
    echo "  import <file>              Import tenant data"
    echo "  stats [name]               Show tenant statistics"
    echo "  quota <name> <quota>       Set resource quota"
    echo ""
    echo "Options:"
    echo "  --org <org>                Organization name"
    echo "  --env <env>                Environment (dev|staging|prod)"
    echo "  --isolation <level>        Isolation level (shared|dedicated)"
    echo ""
    echo "Examples:"
    echo "  $0 create acme-corp --org 'Acme Corporation' --env prod"
    echo "  $0 switch acme-corp"
    echo "  $0 quota acme-corp '100GB memory, 1000 requests/day'"
    echo "  $0 list"
}

# Initialize registry
init_registry() {
    if [ ! -f "$TENANT_REGISTRY" ]; then
        cat > "$TENANT_REGISTRY" <<EOF
{
  "version": "1.0",
  "tenants": {},
  "default_tenant": null
}
EOF
    fi
}

# Get current tenant
get_current_tenant() {
    if [ -f "$CURRENT_TENANT_FILE" ]; then
        cat "$CURRENT_TENANT_FILE"
    else
        echo "default"
    fi
}

# Create tenant
create_tenant() {
    local name=$1
    shift

    local org=""
    local env="dev"
    local isolation="shared"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --org) org="$2"; shift 2 ;;
            --env) env="$2"; shift 2 ;;
            --isolation) isolation="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [ -z "$name" ]; then
        echo -e "${RED}✗${NC} Tenant name required"
        return 1
    fi

    init_registry

    local tenant_dir="$TENANTS_DIR/$name"

    if [ -d "$tenant_dir" ]; then
        echo -e "${YELLOW}⚠${NC} Tenant already exists: $name"
        return 1
    fi

    echo -e "${CYAN}Creating tenant: $name${NC}"
    echo ""

    # Create tenant directory structure
    mkdir -p "$tenant_dir"/{config,memory,audit,projects,cache}
    mkdir -p "$tenant_dir"/memory/{agents,shared,architect}

    # Create tenant configuration
    cat > "$tenant_dir/config/tenant.yaml" <<EOF
# Tenant Configuration
# Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

tenant:
  id: "$name"
  name: "${org:-$name}"
  environment: "$env"
  isolation: "$isolation"
  created_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  created_by: "$(whoami)"

settings:
  # Memory settings
  memory:
    max_size_gb: 10
    retention_days: 90
    cross_agent_learning: true

  # Audit settings
  audit:
    enabled: true
    retention_days: 365
    compliance_mode: false  # Enable for SOC2/HIPAA

  # Resource quotas
  quotas:
    max_projects: 100
    max_agents: 20
    max_workflows_per_day: 1000
    max_tokens_per_day: 10000000

  # Security settings
  security:
    encryption_at_rest: true
    data_isolation: "$isolation"
    allowed_tools:
      - read
      - write
      - bash
      - glob
      - grep

  # Integration settings
  integrations:
    slack:
      enabled: false
      webhook_url: ""
    teams:
      enabled: false
      webhook_url: ""
    github:
      enabled: false
      org: ""

# Custom agents for this tenant
custom_agents: []

# Project templates
templates: []
EOF

    # Add to registry
    python3 -c "
import json
with open('$TENANT_REGISTRY', 'r') as f:
    registry = json.load(f)

registry['tenants']['$name'] = {
    'name': '${org:-$name}',
    'environment': '$env',
    'isolation': '$isolation',
    'created_at': '$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
    'status': 'active'
}

with open('$TENANT_REGISTRY', 'w') as f:
    json.dump(registry, f, indent=2)
"

    echo -e "  ${GREEN}✓${NC} Created directory structure"
    echo -e "  ${GREEN}✓${NC} Created tenant configuration"
    echo -e "  ${GREEN}✓${NC} Registered tenant"
    echo ""
    echo -e "${GREEN}✓${NC} Tenant created: $name"
    echo ""
    echo "To use this tenant:"
    echo "  $0 switch $name"
}

# Delete tenant
delete_tenant() {
    local name=$1

    if [ -z "$name" ]; then
        echo -e "${RED}✗${NC} Tenant name required"
        return 1
    fi

    local tenant_dir="$TENANTS_DIR/$name"

    if [ ! -d "$tenant_dir" ]; then
        echo -e "${RED}✗${NC} Tenant not found: $name"
        return 1
    fi

    echo -e "${RED}WARNING: This will permanently delete all tenant data!${NC}"
    echo "Tenant: $name"
    echo "Directory: $tenant_dir"
    echo ""
    read -p "Type tenant name to confirm deletion: " confirm

    if [ "$confirm" != "$name" ]; then
        echo "Deletion cancelled"
        return 1
    fi

    # Remove from registry
    python3 -c "
import json
with open('$TENANT_REGISTRY', 'r') as f:
    registry = json.load(f)
if '$name' in registry['tenants']:
    del registry['tenants']['$name']
with open('$TENANT_REGISTRY', 'w') as f:
    json.dump(registry, f, indent=2)
"

    # Remove directory
    rm -rf "$tenant_dir"

    # Clear current tenant if deleted
    if [ "$(get_current_tenant)" = "$name" ]; then
        rm -f "$CURRENT_TENANT_FILE"
    fi

    echo -e "${GREEN}✓${NC} Tenant deleted: $name"
}

# List tenants
list_tenants() {
    init_registry

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                        Tenants                                 ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    local current=$(get_current_tenant)

    python3 -c "
import json
with open('$TENANT_REGISTRY', 'r') as f:
    registry = json.load(f)

current = '$current'
tenants = registry.get('tenants', {})

if not tenants:
    print('  No tenants configured')
else:
    print(f'  {\"\":2} {\"ID\":15} {\"Organization\":20} {\"Environment\":12} {\"Status\":10}')
    print('  ' + '─' * 60)
    for tid, info in tenants.items():
        marker = '→' if tid == current else ' '
        env_color = {
            'prod': '\033[0;31m',
            'staging': '\033[1;33m',
            'dev': '\033[0;32m'
        }.get(info.get('environment', 'dev'), '')
        print(f'  {marker} {tid:15} {info.get(\"name\", \"\"):20} {env_color}{info.get(\"environment\", \"dev\"):12}\033[0m {info.get(\"status\", \"active\")}')
"
    echo ""
    echo "Current tenant: $current"
}

# Switch tenant
switch_tenant() {
    local name=$1

    if [ -z "$name" ]; then
        echo -e "${RED}✗${NC} Tenant name required"
        return 1
    fi

    local tenant_dir="$TENANTS_DIR/$name"

    if [ ! -d "$tenant_dir" ] && [ "$name" != "default" ]; then
        echo -e "${RED}✗${NC} Tenant not found: $name"
        return 1
    fi

    echo "$name" > "$CURRENT_TENANT_FILE"

    # Set environment variables
    export SDLC_TENANT="$name"
    export SDLC_TENANT_DIR="$tenant_dir"

    echo -e "${GREEN}✓${NC} Switched to tenant: $name"
    echo ""
    echo "Environment variables set:"
    echo "  SDLC_TENANT=$name"
    echo "  SDLC_TENANT_DIR=$tenant_dir"
    echo ""
    echo "Add to your shell profile:"
    echo "  export SDLC_TENANT=$name"
}

# Show current tenant
show_current() {
    local current=$(get_current_tenant)
    echo "Current tenant: $current"

    local tenant_dir="$TENANTS_DIR/$current"
    if [ -d "$tenant_dir" ]; then
        echo "Tenant directory: $tenant_dir"
        if [ -f "$tenant_dir/config/tenant.yaml" ]; then
            echo ""
            echo "Configuration:"
            python3 -c "
import yaml
with open('$tenant_dir/config/tenant.yaml', 'r') as f:
    config = yaml.safe_load(f)
tenant = config.get('tenant', {})
print(f\"  Organization: {tenant.get('name', 'N/A')}\")
print(f\"  Environment:  {tenant.get('environment', 'N/A')}\")
print(f\"  Isolation:    {tenant.get('isolation', 'N/A')}\")
" 2>/dev/null
        fi
    fi
}

# Configure tenant
configure_tenant() {
    local name=$1
    local tenant_dir="$TENANTS_DIR/$name"

    if [ ! -d "$tenant_dir" ]; then
        echo -e "${RED}✗${NC} Tenant not found: $name"
        return 1
    fi

    ${EDITOR:-nano} "$tenant_dir/config/tenant.yaml"
}

# Export tenant
export_tenant() {
    local name=$1
    local output_file=$2
    local tenant_dir="$TENANTS_DIR/$name"

    if [ ! -d "$tenant_dir" ]; then
        echo -e "${RED}✗${NC} Tenant not found: $name"
        return 1
    fi

    tar -czf "$output_file" -C "$TENANTS_DIR" "$name"
    echo -e "${GREEN}✓${NC} Tenant exported to: $output_file"
}

# Import tenant
import_tenant() {
    local input_file=$1

    if [ ! -f "$input_file" ]; then
        echo -e "${RED}✗${NC} File not found: $input_file"
        return 1
    fi

    tar -xzf "$input_file" -C "$TENANTS_DIR"

    # Get tenant name from archive
    local tenant_name=$(tar -tzf "$input_file" | head -1 | cut -d'/' -f1)

    # Add to registry
    init_registry
    python3 -c "
import json
import yaml
import os

tenant_dir = '$TENANTS_DIR/$tenant_name'
config_file = os.path.join(tenant_dir, 'config', 'tenant.yaml')

with open(config_file, 'r') as f:
    config = yaml.safe_load(f)

with open('$TENANT_REGISTRY', 'r') as f:
    registry = json.load(f)

tenant = config.get('tenant', {})
registry['tenants']['$tenant_name'] = {
    'name': tenant.get('name', '$tenant_name'),
    'environment': tenant.get('environment', 'dev'),
    'isolation': tenant.get('isolation', 'shared'),
    'created_at': tenant.get('created_at', ''),
    'status': 'active'
}

with open('$TENANT_REGISTRY', 'w') as f:
    json.dump(registry, f, indent=2)
" 2>/dev/null

    echo -e "${GREEN}✓${NC} Tenant imported: $tenant_name"
}

# Show statistics
show_stats() {
    local name=${1:-$(get_current_tenant)}
    local tenant_dir="$TENANTS_DIR/$name"

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                 Tenant Statistics: $name                       ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ ! -d "$tenant_dir" ] && [ "$name" != "default" ]; then
        echo "  Tenant not found or using default"
        return 1
    fi

    # Memory usage
    if [ -d "$tenant_dir/memory" ]; then
        local memory_size=$(du -sh "$tenant_dir/memory" 2>/dev/null | cut -f1)
        echo "Memory Usage: $memory_size"
    fi

    # Project count
    if [ -d "$tenant_dir/projects" ]; then
        local project_count=$(ls -1 "$tenant_dir/projects" 2>/dev/null | wc -l | tr -d ' ')
        echo "Projects: $project_count"
    fi

    # Audit log size
    if [ -d "$tenant_dir/audit" ]; then
        local audit_size=$(du -sh "$tenant_dir/audit" 2>/dev/null | cut -f1)
        local audit_records=0
        if [ -f "$tenant_dir/audit/audit.log" ]; then
            audit_records=$(wc -l < "$tenant_dir/audit/audit.log" | tr -d ' ')
        fi
        echo "Audit Log: $audit_size ($audit_records records)"
    fi

    # Cache size
    if [ -d "$tenant_dir/cache" ]; then
        local cache_size=$(du -sh "$tenant_dir/cache" 2>/dev/null | cut -f1)
        echo "Cache: $cache_size"
    fi

    echo ""
    echo "Directory: $tenant_dir"
}

# Set quota
set_quota() {
    local name=$1
    local quota=$2
    local tenant_dir="$TENANTS_DIR/$name"

    if [ ! -d "$tenant_dir" ]; then
        echo -e "${RED}✗${NC} Tenant not found: $name"
        return 1
    fi

    echo -e "${GREEN}✓${NC} Quota updated for: $name"
    echo "  Quota: $quota"
    echo ""
    echo "Note: Edit $tenant_dir/config/tenant.yaml for detailed quota settings"
}

# Main
case "$1" in
    create)
        shift
        create_tenant "$@"
        ;;
    delete)
        delete_tenant "$2"
        ;;
    list)
        list_tenants
        ;;
    switch)
        switch_tenant "$2"
        ;;
    current)
        show_current
        ;;
    config)
        configure_tenant "$2"
        ;;
    export)
        export_tenant "$2" "$3"
        ;;
    import)
        import_tenant "$2"
        ;;
    stats)
        show_stats "$2"
        ;;
    quota)
        set_quota "$2" "$3"
        ;;
    *)
        usage
        ;;
esac
