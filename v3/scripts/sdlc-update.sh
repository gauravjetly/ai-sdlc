#!/bin/bash

#===============================================================================
# AI-SDLC Update Manager
# Seamlessly update the framework while preserving customizations
#===============================================================================

set -e

VERSION="2.1.0"
CLAUDE_DIR="${HOME}/.claude"
BACKUP_DIR="${CLAUDE_DIR}/backups"
UPDATE_SOURCE="${1:-}"  # Path to new package or GitHub URL

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          AI-SDLC Update Manager v${VERSION}                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

#-------------------------------------------------------------------------------
# Check current version
#-------------------------------------------------------------------------------
get_current_version() {
    if [ -f "${CLAUDE_DIR}/aisdlc-version" ]; then
        cat "${CLAUDE_DIR}/aisdlc-version"
    else
        echo "1.0.0"
    fi
}

CURRENT_VERSION=$(get_current_version)
echo -e "${BLUE}Current version:${NC} $CURRENT_VERSION"

#-------------------------------------------------------------------------------
# Backup current installation
#-------------------------------------------------------------------------------
backup_current() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="${BACKUP_DIR}/${timestamp}"
    
    echo ""
    echo -e "${YELLOW}📦 Backing up current installation...${NC}"
    
    mkdir -p "$backup_path"
    
    # Backup agents
    if [ -d "${CLAUDE_DIR}/agents" ]; then
        cp -r "${CLAUDE_DIR}/agents" "$backup_path/"
        echo -e "   ${GREEN}✓${NC} Agents backed up"
    fi
    
    # Backup commands
    if [ -d "${CLAUDE_DIR}/commands" ]; then
        cp -r "${CLAUDE_DIR}/commands" "$backup_path/"
        echo -e "   ${GREEN}✓${NC} Commands backed up"
    fi
    
    # Backup registry (preserve data!)
    if [ -d "${CLAUDE_DIR}/sdlc-registry" ]; then
        cp -r "${CLAUDE_DIR}/sdlc-registry" "$backup_path/"
        echo -e "   ${GREEN}✓${NC} Registry data backed up"
    fi
    
    # Save version info
    echo "$CURRENT_VERSION" > "$backup_path/version"
    
    echo -e "   ${GREEN}✓${NC} Backup saved to: $backup_path"
    echo "$backup_path"
}

#-------------------------------------------------------------------------------
# Detect customizations
#-------------------------------------------------------------------------------
detect_customizations() {
    echo ""
    echo -e "${YELLOW}🔍 Detecting customizations...${NC}"
    
    local custom_agents=()
    local modified_agents=()
    
    # Core agents that ship with the package
    local core_agents=(
        "conductor.md"
        "ba-agent.md"
        "architect-jets.md"
        "software-engineer.md"
        "security-agent.md"
        "qa-agent.md"
        "atlas-agent.md"
        "customer-agent.md"
        "tracker-agent.md"
    )
    
    # Find custom agents (not in core list)
    if [ -d "${CLAUDE_DIR}/agents" ]; then
        for agent in "${CLAUDE_DIR}/agents"/*.md; do
            if [ -f "$agent" ]; then
                local basename=$(basename "$agent")
                local is_core=false
                
                for core in "${core_agents[@]}"; do
                    if [ "$basename" == "$core" ]; then
                        is_core=true
                        break
                    fi
                done
                
                if [ "$is_core" == "false" ]; then
                    custom_agents+=("$basename")
                    echo -e "   ${BLUE}+${NC} Custom agent: $basename"
                fi
            fi
        done
    fi
    
    # Find custom commands
    local core_commands=(
        "sdlc-start.md"
        "sdlc-status.md"
        "sdlc-review.md"
        "sdlc-deploy.md"
        "sdlc-requirements.md"
        "sdlc-architecture.md"
        "sdlc-security.md"
    )
    
    if [ -d "${CLAUDE_DIR}/commands" ]; then
        for cmd in "${CLAUDE_DIR}/commands"/*.md; do
            if [ -f "$cmd" ]; then
                local basename=$(basename "$cmd")
                local is_core=false
                
                for core in "${core_commands[@]}"; do
                    if [ "$basename" == "$core" ]; then
                        is_core=true
                        break
                    fi
                done
                
                if [ "$is_core" == "false" ]; then
                    echo -e "   ${BLUE}+${NC} Custom command: $basename"
                fi
            fi
        done
    fi
    
    if [ ${#custom_agents[@]} -eq 0 ]; then
        echo -e "   ${GREEN}✓${NC} No custom agents detected"
    fi
}

#-------------------------------------------------------------------------------
# Update from source
#-------------------------------------------------------------------------------
update_from_source() {
    local source="$1"
    
    echo ""
    echo -e "${YELLOW}📥 Updating from: $source${NC}"
    
    # If it's a zip file
    if [[ "$source" == *.zip ]]; then
        local temp_dir=$(mktemp -d)
        unzip -q "$source" -d "$temp_dir"
        
        # Find the extracted directory
        local pkg_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "aisdlc*" | head -1)
        
        if [ -z "$pkg_dir" ]; then
            pkg_dir="$temp_dir"
        fi
        
        # Read deprecated files from manifest.json in the NEW package
        echo -e "   ${BLUE}↻${NC} Cleaning deprecated files..."
        
        if [ -f "$pkg_dir/manifest.json" ]; then
            # Extract deprecated items from new package's manifest
            DEPRECATED_AGENTS=$(python3 -c "
import json
with open('$pkg_dir/manifest.json') as f:
    m = json.load(f)
for d in m.get('agents', {}).get('deprecated', []):
    print(d['file'])
" 2>/dev/null || echo "")

            DEPRECATED_COMMANDS=$(python3 -c "
import json
with open('$pkg_dir/manifest.json') as f:
    m = json.load(f)
for d in m.get('commands', {}).get('deprecated', []):
    print(d['file'])
" 2>/dev/null || echo "")

            DEPRECATED_SCRIPTS=$(python3 -c "
import json
with open('$pkg_dir/manifest.json') as f:
    m = json.load(f)
for d in m.get('scripts', {}).get('deprecated', []):
    print(d['file'])
" 2>/dev/null || echo "")
        else
            DEPRECATED_AGENTS="devops-sre-agent.md deployment-agent.md"
            DEPRECATED_COMMANDS=""
            DEPRECATED_SCRIPTS=""
        fi
        
        # Clean deprecated agents
        for old_agent in $DEPRECATED_AGENTS; do
            if [ -f "${CLAUDE_DIR}/agents/$old_agent" ]; then
                rm "${CLAUDE_DIR}/agents/$old_agent"
                echo -e "   ${GREEN}✓${NC} Removed deprecated agent: $old_agent"
            fi
        done
        
        # Clean deprecated commands
        for old_cmd in $DEPRECATED_COMMANDS; do
            if [ -f "${CLAUDE_DIR}/commands/$old_cmd" ]; then
                rm "${CLAUDE_DIR}/commands/$old_cmd"
                echo -e "   ${GREEN}✓${NC} Removed deprecated command: $old_cmd"
            fi
        done
        
        # Clean deprecated scripts
        for old_script in $DEPRECATED_SCRIPTS; do
            if [ -f "${CLAUDE_DIR}/$old_script" ]; then
                rm "${CLAUDE_DIR}/$old_script"
                echo -e "   ${GREEN}✓${NC} Removed deprecated script: $old_script"
            fi
        done
        
        # Update agents (preserve custom ones)
        if [ -d "$pkg_dir/agents" ]; then
            echo -e "   ${BLUE}↻${NC} Updating agents..."
            cp "$pkg_dir/agents"/*.md "${CLAUDE_DIR}/agents/"
        fi
        
        # Update commands (preserve custom ones)
        if [ -d "$pkg_dir/commands" ]; then
            echo -e "   ${BLUE}↻${NC} Updating commands..."
            cp "$pkg_dir/commands"/*.md "${CLAUDE_DIR}/commands/"
        fi
        
        # Update scripts
        if [ -d "$pkg_dir/scripts" ]; then
            echo -e "   ${BLUE}↻${NC} Updating scripts..."
            cp "$pkg_dir/scripts/sdlc-registry.sh" "${CLAUDE_DIR}/sdlc-registry" 2>/dev/null || true
            chmod +x "${CLAUDE_DIR}/sdlc-registry" 2>/dev/null || true
        fi
        
        # Update version file
        if [ -f "$pkg_dir/VERSION" ]; then
            cp "$pkg_dir/VERSION" "${CLAUDE_DIR}/aisdlc-version"
        else
            # Extract version from README or set manually
            echo "$VERSION" > "${CLAUDE_DIR}/aisdlc-version"
        fi
        
        # Cleanup
        rm -rf "$temp_dir"
        
        echo -e "   ${GREEN}✓${NC} Update complete"
        
        # Offer to clean up old version directories
        echo ""
        echo -e "${YELLOW}🧹 Checking for old versions...${NC}"
        
        # Find old aisdlc directories in parent of source
        local source_parent=$(dirname "$source")
        local old_versions=$(find "$source_parent" -maxdepth 1 -type d -name "aisdlc-*" 2>/dev/null | grep -v "$(basename ${source%.zip})" || true)
        
        if [ -n "$old_versions" ]; then
            echo -e "   Found old versions:"
            echo "$old_versions" | while read old_dir; do
                echo -e "   - $old_dir"
            done
            echo ""
            read -p "   Remove old versions? [y/N]: " remove_old
            if [[ "$remove_old" =~ ^[Yy]$ ]]; then
                echo "$old_versions" | while read old_dir; do
                    rm -rf "$old_dir"
                    echo -e "   ${GREEN}✓${NC} Removed $old_dir"
                done
            fi
        else
            echo -e "   ${GREEN}✓${NC} No old versions found"
        fi
    fi
}

#-------------------------------------------------------------------------------
# Show changelog
#-------------------------------------------------------------------------------
show_changelog() {
    echo ""
    echo -e "${BLUE}📋 Changelog:${NC}"
    echo ""
    echo "  v2.1.0 - Control Center & Registry"
    echo "    + Added SDLC Control Center dashboard"
    echo "    + Added sdlc-registry CLI for activity tracking"
    echo "    + Agents now log to central registry"
    echo ""
    echo "  v2.0.0 - Atlas & Workflow Restructure"
    echo "    + Added Atlas agent (DevOps/SRE)"
    echo "    + Security Agent now review-only"
    echo "    + Customer Agent now post-deployment UAT"
    echo "    + 7-phase workflow"
    echo ""
    echo "  v1.0.0 - Initial Release"
    echo "    + 8 SDLC agents"
    echo "    + 6 slash commands"
    echo "    + A2A Protocol"
    echo ""
}

#-------------------------------------------------------------------------------
# Rollback to backup
#-------------------------------------------------------------------------------
rollback() {
    echo ""
    echo -e "${YELLOW}Available backups:${NC}"
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -1 "$BACKUP_DIR" | while read backup; do
            local ver=$(cat "${BACKUP_DIR}/${backup}/version" 2>/dev/null || echo "unknown")
            echo "  - $backup (v$ver)"
        done
    else
        echo "  No backups found"
        return 1
    fi
    
    echo ""
    read -p "Enter backup name to restore: " backup_name
    
    if [ -d "${BACKUP_DIR}/${backup_name}" ]; then
        echo -e "${YELLOW}Restoring from $backup_name...${NC}"
        
        # Restore agents
        if [ -d "${BACKUP_DIR}/${backup_name}/agents" ]; then
            rm -rf "${CLAUDE_DIR}/agents"
            cp -r "${BACKUP_DIR}/${backup_name}/agents" "${CLAUDE_DIR}/"
            echo -e "   ${GREEN}✓${NC} Agents restored"
        fi
        
        # Restore commands
        if [ -d "${BACKUP_DIR}/${backup_name}/commands" ]; then
            rm -rf "${CLAUDE_DIR}/commands"
            cp -r "${BACKUP_DIR}/${backup_name}/commands" "${CLAUDE_DIR}/"
            echo -e "   ${GREEN}✓${NC} Commands restored"
        fi
        
        # Restore registry
        if [ -d "${BACKUP_DIR}/${backup_name}/sdlc-registry" ]; then
            rm -rf "${CLAUDE_DIR}/sdlc-registry"
            cp -r "${BACKUP_DIR}/${backup_name}/sdlc-registry" "${CLAUDE_DIR}/"
            echo -e "   ${GREEN}✓${NC} Registry restored"
        fi
        
        echo -e "${GREEN}✅ Rollback complete${NC}"
    else
        echo -e "${RED}Backup not found: $backup_name${NC}"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Main command handler
#-------------------------------------------------------------------------------
case "${1:-}" in
    --check)
        echo -e "${BLUE}Checking for updates...${NC}"
        detect_customizations
        ;;
    --backup)
        backup_current
        ;;
    --rollback)
        rollback
        ;;
    --changelog)
        show_changelog
        ;;
    --help|-h)
        echo "Usage: sdlc-update [options] [source]"
        echo ""
        echo "Options:"
        echo "  --check       Check current installation and customizations"
        echo "  --backup      Create backup of current installation"
        echo "  --rollback    Restore from a previous backup"
        echo "  --changelog   Show version changelog"
        echo "  --help        Show this help"
        echo ""
        echo "Update from source:"
        echo "  sdlc-update /path/to/aisdlc-complete.zip"
        echo "  sdlc-update https://github.com/user/aisdlc/releases/latest"
        echo ""
        ;;
    "")
        echo "Usage: sdlc-update [--check|--backup|--rollback|--changelog] [source.zip]"
        echo ""
        echo "Run 'sdlc-update --help' for more information"
        ;;
    *)
        if [ -f "$1" ]; then
            backup_current
            detect_customizations
            update_from_source "$1"
            show_changelog
        else
            echo -e "${RED}File not found: $1${NC}"
            exit 1
        fi
        ;;
esac

echo ""
