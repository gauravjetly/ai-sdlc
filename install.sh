#!/bin/bash

#===============================================================================
# AI-SDLC Complete Installation Script v2.1.0
# Installs 9 agents, 7 commands, and sets up project structure
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Parse arguments
CLEANUP=false
PROJECT_INSTALL=false

for arg in "$@"; do
    case $arg in
        --cleanup)
            CLEANUP=true
            ;;
        --project)
            PROJECT_INSTALL=true
            ;;
    esac
done

# Set install target
if [ "$PROJECT_INSTALL" = true ]; then
    INSTALL_DIR="./.claude"
    echo -e "${YELLOW}Installing to project directory: $INSTALL_DIR${NC}"
else
    INSTALL_DIR="${HOME}/.claude"
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AI-SDLC Framework v2.1.0 - Complete Installation       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

#-------------------------------------------------------------------------------
# Step 1: Create directories
#-------------------------------------------------------------------------------
echo -e "${YELLOW}📁 Creating directories...${NC}"

mkdir -p "$INSTALL_DIR/agents"
mkdir -p "$INSTALL_DIR/commands"

echo -e "   ${GREEN}✓${NC} $INSTALL_DIR/agents/"
echo -e "   ${GREEN}✓${NC} $INSTALL_DIR/commands/"

#-------------------------------------------------------------------------------
# Step 2: Clean up deprecated files from previous versions
#-------------------------------------------------------------------------------
echo -e "${YELLOW}🧹 Cleaning up deprecated files...${NC}"

# Read deprecated files from manifest.json
if [ -f "$SCRIPT_DIR/manifest.json" ]; then
    # Extract deprecated agents using Python (more reliable JSON parsing)
    DEPRECATED_AGENTS=$(python3 -c "
import json
with open('$SCRIPT_DIR/manifest.json') as f:
    m = json.load(f)
for d in m.get('agents', {}).get('deprecated', []):
    print(d['file'])
" 2>/dev/null || echo "")

    DEPRECATED_COMMANDS=$(python3 -c "
import json
with open('$SCRIPT_DIR/manifest.json') as f:
    m = json.load(f)
for d in m.get('commands', {}).get('deprecated', []):
    print(d['file'])
" 2>/dev/null || echo "")

    DEPRECATED_SCRIPTS=$(python3 -c "
import json
with open('$SCRIPT_DIR/manifest.json') as f:
    m = json.load(f)
for d in m.get('scripts', {}).get('deprecated', []):
    print(d['file'])
" 2>/dev/null || echo "")
else
    # Fallback if manifest not found
    DEPRECATED_AGENTS="devops-sre-agent.md deployment-agent.md"
    DEPRECATED_COMMANDS=""
    DEPRECATED_SCRIPTS=""
fi

# Clean deprecated agents
for old_agent in $DEPRECATED_AGENTS; do
    if [ -f "$INSTALL_DIR/agents/$old_agent" ]; then
        rm "$INSTALL_DIR/agents/$old_agent"
        echo -e "   ${GREEN}✓${NC} Removed deprecated agent: $old_agent"
    fi
done

# Clean deprecated commands
for old_cmd in $DEPRECATED_COMMANDS; do
    if [ -f "$INSTALL_DIR/commands/$old_cmd" ]; then
        rm "$INSTALL_DIR/commands/$old_cmd"
        echo -e "   ${GREEN}✓${NC} Removed deprecated command: $old_cmd"
    fi
done

# Clean deprecated scripts
for old_script in $DEPRECATED_SCRIPTS; do
    if [ -f "$INSTALL_DIR/$old_script" ]; then
        rm "$INSTALL_DIR/$old_script"
        echo -e "   ${GREEN}✓${NC} Removed deprecated script: $old_script"
    fi
done

echo -e "   ${GREEN}✓${NC} Cleanup complete"

#-------------------------------------------------------------------------------
# Step 3: Install agents
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}🤖 Installing 9 agents...${NC}"

AGENTS=(
    "conductor.md:Meta-orchestrator (Opus)"
    "ba-agent.md:Business Analyst (Sonnet)"
    "architect-jets.md:AI-Native Architect (Opus)"
    "software-engineer.md:Developer (Sonnet)"
    "security-agent.md:Security Review (Sonnet)"
    "qa-agent.md:Quality Assurance (Sonnet)"
    "atlas-agent.md:Atlas - Deployment/SRE (Sonnet)"
    "customer-agent.md:Post-Deploy UAT (Sonnet)"
    "tracker-agent.md:Progress Tracking (Haiku)"
)

for agent_info in "${AGENTS[@]}"; do
    agent_file="${agent_info%%:*}"
    agent_desc="${agent_info##*:}"
    
    if [ -f "$SCRIPT_DIR/agents/$agent_file" ]; then
        cp "$SCRIPT_DIR/agents/$agent_file" "$INSTALL_DIR/agents/"
        echo -e "   ${GREEN}✓${NC} $agent_file - $agent_desc"
    else
        echo -e "   ${RED}✗${NC} $agent_file - NOT FOUND"
    fi
done

#-------------------------------------------------------------------------------
# Step 4: Install commands
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}⚡ Installing 7 slash commands...${NC}"

COMMANDS=(
    "sdlc-start.md:/sdlc-start - Full SDLC workflow"
    "sdlc-status.md:/sdlc-status - Check progress"
    "sdlc-review.md:/sdlc-review - Code review"
    "sdlc-deploy.md:/sdlc-deploy - Deployment"
    "sdlc-requirements.md:/sdlc-requirements - Requirements only"
    "sdlc-architecture.md:/sdlc-architecture - Architecture only"
    "sdlc-security.md:/sdlc-security - Security review only"
)

for cmd_info in "${COMMANDS[@]}"; do
    cmd_file="${cmd_info%%:*}"
    cmd_desc="${cmd_info##*:}"
    
    if [ -f "$SCRIPT_DIR/commands/$cmd_file" ]; then
        cp "$SCRIPT_DIR/commands/$cmd_file" "$INSTALL_DIR/commands/"
        echo -e "   ${GREEN}✓${NC} $cmd_file - $cmd_desc"
    else
        echo -e "   ${RED}✗${NC} $cmd_file - NOT FOUND"
    fi
done

#-------------------------------------------------------------------------------
# Step 5: Set up project structure
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}📂 Setting up project structure...${NC}"

mkdir -p docs/sdlc/requirements
mkdir -p docs/sdlc/architecture
mkdir -p docs/sdlc/security
mkdir -p docs/sdlc/testing
mkdir -p docs/sdlc/deployments
mkdir -p docs/sdlc/acceptance
mkdir -p docs/sdlc/tracking

echo -e "   ${GREEN}✓${NC} docs/sdlc/requirements/"
echo -e "   ${GREEN}✓${NC} docs/sdlc/architecture/"
echo -e "   ${GREEN}✓${NC} docs/sdlc/security/"
echo -e "   ${GREEN}✓${NC} docs/sdlc/testing/"
echo -e "   ${GREEN}✓${NC} docs/sdlc/deployments/"
echo -e "   ${GREEN}✓${NC} docs/sdlc/acceptance/"
echo -e "   ${GREEN}✓${NC} docs/sdlc/tracking/"

#-------------------------------------------------------------------------------
# Step 6: Create CLAUDE.md if not exists
#-------------------------------------------------------------------------------
echo ""
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${YELLOW}📝 Creating CLAUDE.md...${NC}"
    cp "$SCRIPT_DIR/project-template/CLAUDE.md" ./CLAUDE.md
    echo -e "   ${GREEN}✓${NC} CLAUDE.md created"
    echo -e "   ${YELLOW}⚠${NC}  Please edit CLAUDE.md with your project details"
else
    echo -e "${YELLOW}📝 CLAUDE.md already exists${NC}"
    echo -e "   ${BLUE}ℹ${NC}  Keeping existing file"
fi

#-------------------------------------------------------------------------------
# Step 7: Install registry CLI (user-level only)
#-------------------------------------------------------------------------------
if [ "$PROJECT_INSTALL" = false ]; then
    echo ""
    echo -e "${YELLOW}📊 Installing SDLC Registry...${NC}"

    cp "$SCRIPT_DIR/scripts/sdlc-registry.sh" "$INSTALL_DIR/sdlc-registry"
    chmod +x "$INSTALL_DIR/sdlc-registry"
    echo -e "   ${GREEN}✓${NC} Registry CLI installed"

    # Initialize registry
    "$INSTALL_DIR/sdlc-registry" init
    echo -e "   ${GREEN}✓${NC} Registry initialized"
fi

#-------------------------------------------------------------------------------
# Step 8: Install update manager (user-level only)
#-------------------------------------------------------------------------------
if [ "$PROJECT_INSTALL" = false ]; then
    echo ""
    echo -e "${YELLOW}🔄 Installing Update Manager...${NC}"

    cp "$SCRIPT_DIR/scripts/sdlc-update.sh" "$INSTALL_DIR/sdlc-update"
    chmod +x "$INSTALL_DIR/sdlc-update"
    echo -e "   ${GREEN}✓${NC} Update manager installed"

    # Save version
    cp "$SCRIPT_DIR/VERSION" "$INSTALL_DIR/aisdlc-version"
    echo -e "   ${GREEN}✓${NC} Version $(cat $INSTALL_DIR/aisdlc-version) registered"
fi

#-------------------------------------------------------------------------------
# Step 9: Copy documentation (optional)
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}📖 Installing documentation...${NC}"

if [ -d "$SCRIPT_DIR/docs" ]; then
    mkdir -p docs/aisdlc-reference
    cp "$SCRIPT_DIR/docs/"*.md docs/aisdlc-reference/ 2>/dev/null || true
    echo -e "   ${GREEN}✓${NC} Documentation copied to docs/aisdlc-reference/"
fi

#-------------------------------------------------------------------------------
# Complete
#-------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Installation Complete!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Agents installed:${NC}"
echo -e "  Conductor, BA, Architect (Jets), Engineer, Security, QA, Atlas, Customer, Tracker"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. ${YELLOW}Edit CLAUDE.md${NC} with your project details"
echo -e "  2. ${YELLOW}Restart Claude Code${NC} to load new agents"
echo -e "  3. ${YELLOW}Try it:${NC} /sdlc-start Build a hello world API"
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo -e "  /sdlc-start [description]     Start full 7-phase SDLC workflow"
echo -e "  /sdlc-status                  Check all work status"
echo -e "  /sdlc-review [path]           Multi-agent code review"
echo -e "  /sdlc-deploy [env]            Deploy to staging/production"
echo -e "  /sdlc-requirements [desc]     Requirements only"
echo -e "  /sdlc-architecture [desc]     Architecture only"
echo -e "  /sdlc-security [path]         Security review only"
echo ""
echo -e "${BLUE}Registry commands:${NC}"
echo -e "  sdlc-registry status          View agent activity stats"
echo -e "  sdlc-registry activity        View recent activity log"
echo -e "  sdlc-registry projects        List all tracked projects"
echo ""
echo -e "${BLUE}Update commands:${NC}"
echo -e "  sdlc-update --check           Check installation & customizations"
echo -e "  sdlc-update --backup          Backup current installation"
echo -e "  sdlc-update [file.zip]        Update from new package"
echo -e "  sdlc-update --rollback        Restore from backup"
echo ""
echo -e "${BLUE}Dashboard:${NC}"
echo -e "  Open dashboard/sdlc-control-center.jsx in Claude.ai as an artifact"
echo ""
echo -e "${BLUE}Workflow:${NC}"
echo -e "  User → Conductor → BA → Architect → Engineer → Security → QA → Atlas → Customer → ✅"
echo ""

#-------------------------------------------------------------------------------
# Step 10: Cleanup source directory
#-------------------------------------------------------------------------------
if [ "$CLEANUP" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning up source directory...${NC}"
    rm -rf "$SCRIPT_DIR"
    echo -e "   ${GREEN}✓${NC} Removed $SCRIPT_DIR"
    echo ""
elif [ "$PROJECT_INSTALL" = false ]; then
    # Prompt for cleanup
    echo -e "${YELLOW}Would you like to remove the source directory?${NC}"
    echo -e "   $SCRIPT_DIR"
    read -p "   Remove? [y/N]: " cleanup_response
    if [[ "$cleanup_response" =~ ^[Yy]$ ]]; then
        rm -rf "$SCRIPT_DIR"
        echo -e "   ${GREEN}✓${NC} Source directory removed"
    else
        echo -e "   ${BLUE}ℹ${NC}  Keeping source directory"
    fi
    echo ""
fi
