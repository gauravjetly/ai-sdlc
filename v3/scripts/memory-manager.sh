#!/bin/bash
# SDLC Memory Manager
# Export, import, backup, and manage agent memory across environments

MEMORY_BASE="$HOME/.claude/agent-memory"
ARCHITECT_MEMORY="$HOME/.claude/architect-memory"
BACKUP_DIR="$HOME/.claude/memory-backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# All agents
AGENTS=(ba engineer security qa atlas customer conductor finops tracker)

usage() {
    echo "SDLC Memory Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  export <file>              Export all memory to archive"
    echo "  export-agent <agent> <file> Export specific agent memory"
    echo "  import <file>              Import memory from archive"
    echo "  backup [name]              Create timestamped backup"
    echo "  restore <backup>           Restore from backup"
    echo "  list-backups               List available backups"
    echo "  sync <remote>              Sync memory to remote location"
    echo "  stats                      Show memory statistics"
    echo "  clean [days]               Remove memory older than N days"
    echo "  migrate <version>          Migrate memory to new version"
    echo ""
    echo "Agents: ${AGENTS[*]}"
    echo ""
    echo "Examples:"
    echo "  $0 export /tmp/memory-export.tar.gz"
    echo "  $0 export-agent engineer /tmp/engineer-memory.tar.gz"
    echo "  $0 backup pre-release-2.2"
    echo "  $0 sync s3://bucket/memory/"
    echo "  $0 clean 30"
}

# Export all memory
export_memory() {
    local output_file=$1
    local temp_dir=$(mktemp -d)

    echo -e "${CYAN}Exporting SDLC Memory...${NC}"
    echo ""

    # Create manifest
    cat > "$temp_dir/manifest.json" <<EOF
{
  "version": "2.2",
  "exported_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "exported_by": "$(whoami)",
  "hostname": "$(hostname)",
  "agents": $(printf '%s\n' "${AGENTS[@]}" | jq -R . | jq -s .),
  "includes_architect": true
}
EOF

    # Copy agent memory
    for agent in "${AGENTS[@]}"; do
        local agent_dir="$MEMORY_BASE/$agent"
        if [ -d "$agent_dir" ]; then
            mkdir -p "$temp_dir/agents/$agent"
            cp -r "$agent_dir"/* "$temp_dir/agents/$agent/" 2>/dev/null
            local count=$(find "$agent_dir" -name "*.json" | wc -l | tr -d ' ')
            echo -e "  ${GREEN}✓${NC} $agent: $count files"
        fi
    done

    # Copy shared memory
    if [ -d "$MEMORY_BASE/shared" ]; then
        mkdir -p "$temp_dir/shared"
        cp -r "$MEMORY_BASE/shared"/* "$temp_dir/shared/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} shared: cross-agent learnings"
    fi

    # Copy architect memory
    if [ -d "$ARCHITECT_MEMORY" ]; then
        mkdir -p "$temp_dir/architect"
        cp -r "$ARCHITECT_MEMORY"/* "$temp_dir/architect/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} architect: Vintiq knowledge"
    fi

    # Create archive
    tar -czf "$output_file" -C "$temp_dir" .
    rm -rf "$temp_dir"

    local size=$(ls -lh "$output_file" | awk '{print $5}')
    echo ""
    echo -e "${GREEN}✓${NC} Memory exported to: $output_file ($size)"
}

# Export single agent
export_agent() {
    local agent=$1
    local output_file=$2
    local agent_dir="$MEMORY_BASE/$agent"

    if [ ! -d "$agent_dir" ]; then
        echo -e "${RED}✗${NC} Agent not found: $agent"
        return 1
    fi

    local temp_dir=$(mktemp -d)

    # Create manifest
    cat > "$temp_dir/manifest.json" <<EOF
{
  "version": "2.2",
  "exported_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "agent": "$agent",
  "type": "single_agent"
}
EOF

    # Copy agent data
    cp -r "$agent_dir"/* "$temp_dir/" 2>/dev/null

    # Create archive
    tar -czf "$output_file" -C "$temp_dir" .
    rm -rf "$temp_dir"

    local size=$(ls -lh "$output_file" | awk '{print $5}')
    echo -e "${GREEN}✓${NC} Agent '$agent' exported to: $output_file ($size)"
}

# Import memory
import_memory() {
    local input_file=$1

    if [ ! -f "$input_file" ]; then
        echo -e "${RED}✗${NC} File not found: $input_file"
        return 1
    fi

    local temp_dir=$(mktemp -d)

    echo -e "${CYAN}Importing SDLC Memory...${NC}"
    echo ""

    # Extract archive
    tar -xzf "$input_file" -C "$temp_dir"

    # Check manifest
    if [ -f "$temp_dir/manifest.json" ]; then
        echo "Manifest:"
        cat "$temp_dir/manifest.json" | python3 -c "
import json, sys
m = json.load(sys.stdin)
print(f\"  Version: {m.get('version', 'unknown')}\")
print(f\"  Exported: {m.get('exported_at', 'unknown')}\")
print(f\"  By: {m.get('exported_by', 'unknown')}\")
" 2>/dev/null
        echo ""
    fi

    # Import agent memory
    if [ -d "$temp_dir/agents" ]; then
        for agent_dir in "$temp_dir/agents"/*; do
            local agent=$(basename "$agent_dir")
            mkdir -p "$MEMORY_BASE/$agent"
            cp -r "$agent_dir"/* "$MEMORY_BASE/$agent/" 2>/dev/null
            echo -e "  ${GREEN}✓${NC} Imported: $agent"
        done
    fi

    # Import shared memory
    if [ -d "$temp_dir/shared" ]; then
        mkdir -p "$MEMORY_BASE/shared"
        cp -r "$temp_dir/shared"/* "$MEMORY_BASE/shared/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} Imported: shared learnings"
    fi

    # Import architect memory
    if [ -d "$temp_dir/architect" ]; then
        mkdir -p "$ARCHITECT_MEMORY"
        cp -r "$temp_dir/architect"/* "$ARCHITECT_MEMORY/" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} Imported: architect knowledge"
    fi

    rm -rf "$temp_dir"

    echo ""
    echo -e "${GREEN}✓${NC} Memory import complete"
}

# Create backup
create_backup() {
    local name=${1:-"backup"}
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${name}_${timestamp}.tar.gz"

    mkdir -p "$BACKUP_DIR"

    export_memory "$backup_file"

    echo ""
    echo "Backup saved as: $backup_file"
}

# Restore from backup
restore_backup() {
    local backup_file=$1

    # Check if it's a full path or just a name
    if [[ ! "$backup_file" == /* ]]; then
        backup_file="$BACKUP_DIR/$backup_file"
    fi

    if [ ! -f "$backup_file" ]; then
        # Try with .tar.gz extension
        if [ -f "${backup_file}.tar.gz" ]; then
            backup_file="${backup_file}.tar.gz"
        else
            echo -e "${RED}✗${NC} Backup not found: $backup_file"
            echo ""
            echo "Available backups:"
            list_backups
            return 1
        fi
    fi

    echo -e "${YELLOW}Warning: This will overwrite existing memory!${NC}"
    read -p "Continue? (y/N): " confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        import_memory "$backup_file"
    else
        echo "Restore cancelled"
    fi
}

# List backups
list_backups() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    Available Backups                           ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | while read line; do
            echo "  $line"
        done
    else
        echo "  No backups found in $BACKUP_DIR"
    fi
}

# Sync to remote
sync_memory() {
    local remote=$1
    local temp_file=$(mktemp).tar.gz

    echo -e "${CYAN}Syncing memory to: $remote${NC}"

    export_memory "$temp_file"

    if [[ "$remote" == s3://* ]]; then
        # AWS S3 sync
        aws s3 cp "$temp_file" "$remote/memory_$(date +%Y%m%d_%H%M%S).tar.gz"
    elif [[ "$remote" == gs://* ]]; then
        # Google Cloud Storage
        gsutil cp "$temp_file" "$remote/memory_$(date +%Y%m%d_%H%M%S).tar.gz"
    elif [[ "$remote" == *:* ]]; then
        # SCP to remote server
        scp "$temp_file" "$remote/memory_$(date +%Y%m%d_%H%M%S).tar.gz"
    else
        # Local directory
        mkdir -p "$remote"
        cp "$temp_file" "$remote/memory_$(date +%Y%m%d_%H%M%S).tar.gz"
    fi

    rm -f "$temp_file"

    echo -e "${GREEN}✓${NC} Memory synced to: $remote"
}

# Show statistics
show_stats() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                   Memory Statistics                            ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    local total_files=0
    local total_size=0

    echo "Agent Memory:"
    echo "─────────────────────────────────────────────────────────────"

    for agent in "${AGENTS[@]}"; do
        local agent_dir="$MEMORY_BASE/$agent"
        if [ -d "$agent_dir" ]; then
            local files=$(find "$agent_dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
            local size=$(du -sh "$agent_dir" 2>/dev/null | cut -f1)
            total_files=$((total_files + files))
            printf "  %-15s %5s files  %8s\n" "$agent" "$files" "$size"
        fi
    done

    echo "─────────────────────────────────────────────────────────────"

    # Shared memory
    if [ -d "$MEMORY_BASE/shared" ]; then
        local shared_files=$(find "$MEMORY_BASE/shared" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        local shared_size=$(du -sh "$MEMORY_BASE/shared" 2>/dev/null | cut -f1)
        printf "  %-15s %5s files  %8s\n" "shared" "$shared_files" "$shared_size"
    fi

    echo ""
    echo "Architect Memory:"
    echo "─────────────────────────────────────────────────────────────"

    if [ -d "$ARCHITECT_MEMORY" ]; then
        local arch_files=$(find "$ARCHITECT_MEMORY" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        local arch_size=$(du -sh "$ARCHITECT_MEMORY" 2>/dev/null | cut -f1)
        printf "  %-15s %5s files  %8s\n" "architect" "$arch_files" "$arch_size"

        # List subdirectories
        for subdir in "$ARCHITECT_MEMORY"/*; do
            if [ -d "$subdir" ]; then
                local sub_name=$(basename "$subdir")
                local sub_files=$(find "$subdir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
                printf "    └─ %-12s %5s files\n" "$sub_name" "$sub_files"
            fi
        done
    fi

    echo ""
    echo "Backups:"
    echo "─────────────────────────────────────────────────────────────"

    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
        local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        printf "  %-15s %5s files  %8s\n" "backups" "$backup_count" "$backup_size"
    fi
}

# Clean old memory
clean_memory() {
    local days=${1:-30}

    echo -e "${CYAN}Cleaning memory older than $days days...${NC}"
    echo ""

    local count=0

    for agent in "${AGENTS[@]}"; do
        local agent_dir="$MEMORY_BASE/$agent"
        if [ -d "$agent_dir" ]; then
            local old_files=$(find "$agent_dir" -name "*.json" -mtime +$days 2>/dev/null)
            if [ -n "$old_files" ]; then
                local agent_count=$(echo "$old_files" | wc -l | tr -d ' ')
                count=$((count + agent_count))
                echo -e "  $agent: $agent_count old files"
            fi
        fi
    done

    if [ $count -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Found $count files older than $days days${NC}"
        read -p "Delete these files? (y/N): " confirm

        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            for agent in "${AGENTS[@]}"; do
                local agent_dir="$MEMORY_BASE/$agent"
                if [ -d "$agent_dir" ]; then
                    find "$agent_dir" -name "*.json" -mtime +$days -delete 2>/dev/null
                fi
            done
            echo -e "${GREEN}✓${NC} Old memory files deleted"
        else
            echo "Cleanup cancelled"
        fi
    else
        echo "No files older than $days days found"
    fi
}

# Migrate memory
migrate_memory() {
    local target_version=$1

    echo -e "${CYAN}Migrating memory to version $target_version...${NC}"
    echo ""

    # Create backup first
    create_backup "pre_migration_${target_version}"

    # Version-specific migrations would go here
    case $target_version in
        "2.3")
            echo "  - Updating schema to v2.3 format..."
            # Migration logic
            ;;
        *)
            echo -e "${YELLOW}No migration needed for version $target_version${NC}"
            ;;
    esac

    echo ""
    echo -e "${GREEN}✓${NC} Migration complete"
}

# Main
case "$1" in
    export)
        export_memory "$2"
        ;;
    export-agent)
        export_agent "$2" "$3"
        ;;
    import)
        import_memory "$2"
        ;;
    backup)
        create_backup "$2"
        ;;
    restore)
        restore_backup "$2"
        ;;
    list-backups)
        list_backups
        ;;
    sync)
        sync_memory "$2"
        ;;
    stats)
        show_stats
        ;;
    clean)
        clean_memory "$2"
        ;;
    migrate)
        migrate_memory "$2"
        ;;
    *)
        usage
        ;;
esac
