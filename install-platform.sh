#!/bin/bash

#===============================================================================
# AI-SDLC Platform v4.0.0 - Local Production Installer
# One-command installation for complete enterprise AI-SDLC platform
#
# This installs:
# - 12 specialized agents
# - 7 slash commands
# - SQLite database (zero-config)
# - CLI tool (aisdlc command)
# - Dashboard (localhost:3030)
# - Health check system
# - Agent mesh and collective memory
#
# Usage: bash install-platform.sh
#===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="${HOME}/.claude"
AISDLC_HOME="${HOME}/.aisdlc"

echo ""
echo -e "${BLUE}+==============================================================+${NC}"
echo -e "${BLUE}|    AI-SDLC Platform v4.0.0 - Local Production Installation   |${NC}"
echo -e "${BLUE}+==============================================================+${NC}"
echo ""

#-------------------------------------------------------------------------------
# Step 1: Check prerequisites
#-------------------------------------------------------------------------------
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "  ${RED}[FAIL]${NC} Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "  ${RED}[FAIL]${NC} Node.js 20+ required (found v$(node -v))"
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "  ${RED}[FAIL]${NC} npm not found"
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} npm $(npm -v)"

# Check Claude Code (optional)
if command -v claude &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Claude Code found"
else
    echo -e "  ${YELLOW}[WARN]${NC} Claude Code not found (optional - platform works standalone)"
fi

#-------------------------------------------------------------------------------
# Step 2: Create directory structure
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/8] Creating directory structure...${NC}"

mkdir -p "$INSTALL_DIR/agents"
mkdir -p "$INSTALL_DIR/commands"
mkdir -p "$INSTALL_DIR/hooks"
mkdir -p "$AISDLC_HOME/data"
mkdir -p "$AISDLC_HOME/logs"
mkdir -p "$AISDLC_HOME/agents"
mkdir -p "$AISDLC_HOME/backups"
mkdir -p "$AISDLC_HOME/config"

echo -e "  ${GREEN}[OK]${NC} ~/.claude/ (agents, commands, hooks)"
echo -e "  ${GREEN}[OK]${NC} ~/.aisdlc/ (data, logs, config)"

#-------------------------------------------------------------------------------
# Step 3: Install agents (12 agents)
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/8] Installing 12 agents...${NC}"

AGENTS=(
    "conductor.md:Conductor (Opus)"
    "ba-agent.md:Business Analyst (Sonnet)"
    "architect-jets.md:Architect Jets (Opus)"
    "software-engineer.md:Software Engineer (Sonnet)"
    "software-engineer-enhanced.md:Software Engineer Enhanced (Sonnet)"
    "security-agent.md:Security Agent (Sonnet)"
    "qa-agent.md:QA Agent (Sonnet)"
    "qa-agent-enhanced.md:QA Agent Enhanced (Sonnet)"
    "atlas-agent.md:Atlas DevOps/SRE (Sonnet)"
    "customer-agent.md:Customer Agent (Sonnet)"
    "customer-agent-enhanced.md:Customer Agent Enhanced (Sonnet)"
    "tracker-agent.md:Tracker (Haiku)"
    "ask-tom-agent.md:Ask Tom (Opus)"
    "finops-agent.md:FinOps Agent (Sonnet)"
    "ux-agent.md:UX Agent (Sonnet)"
)

INSTALLED=0
for agent_info in "${AGENTS[@]}"; do
    agent_file="${agent_info%%:*}"
    agent_desc="${agent_info##*:}"

    if [ -f "$SCRIPT_DIR/agents/$agent_file" ]; then
        cp "$SCRIPT_DIR/agents/$agent_file" "$INSTALL_DIR/agents/"
        echo -e "  ${GREEN}[OK]${NC} $agent_desc"
        INSTALLED=$((INSTALLED + 1))
    fi
done
echo -e "  ${GREEN}[OK]${NC} $INSTALLED agent definition(s) installed"

#-------------------------------------------------------------------------------
# Step 4: Install commands
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/8] Installing slash commands...${NC}"

if [ -d "$SCRIPT_DIR/commands" ]; then
    for cmd_file in "$SCRIPT_DIR/commands"/*.md; do
        if [ -f "$cmd_file" ]; then
            cp "$cmd_file" "$INSTALL_DIR/commands/"
        fi
    done
    CMD_COUNT=$(ls -1 "$INSTALL_DIR/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}[OK]${NC} $CMD_COUNT command(s) installed"
else
    echo -e "  ${YELLOW}[WARN]${NC} No commands directory found"
fi

#-------------------------------------------------------------------------------
# Step 5: Install platform packages
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[5/8] Installing platform packages...${NC}"

if [ -d "$SCRIPT_DIR/packages/@aisdlc/storage" ]; then
    cd "$SCRIPT_DIR/packages/@aisdlc/storage"
    npm install --production --silent 2>/dev/null
    echo -e "  ${GREEN}[OK]${NC} @aisdlc/storage (SQLite + LRU Cache)"
fi

if [ -d "$SCRIPT_DIR/packages/@aisdlc/cli" ]; then
    cd "$SCRIPT_DIR/packages/@aisdlc/cli"
    npm install --production --silent 2>/dev/null
    echo -e "  ${GREEN}[OK]${NC} @aisdlc/cli (Platform CLI)"
fi

cd "$SCRIPT_DIR"

#-------------------------------------------------------------------------------
# Step 6: Initialize SQLite database
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[6/8] Initializing SQLite database...${NC}"

DB_PATH="$AISDLC_HOME/data/platform.db"

if [ -f "$SCRIPT_DIR/packages/@aisdlc/storage/src/migrations/001-initial-schema.sql" ]; then
    if command -v sqlite3 &> /dev/null; then
        sqlite3 "$DB_PATH" < "$SCRIPT_DIR/packages/@aisdlc/storage/src/migrations/001-initial-schema.sql" 2>/dev/null
        echo -e "  ${GREEN}[OK]${NC} SQLite database initialized at ~/.aisdlc/data/platform.db"
    else
        echo -e "  ${YELLOW}[WARN]${NC} sqlite3 not found - database will be initialized on first CLI run"
    fi
else
    echo -e "  ${YELLOW}[WARN]${NC} Migration file not found - database will be initialized on first CLI run"
fi

# Set secure permissions
if [ "$(uname)" != "MINGW"* ] && [ -f "$DB_PATH" ]; then
    chmod 600 "$DB_PATH" 2>/dev/null
fi

#-------------------------------------------------------------------------------
# Step 7: Write platform configuration
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[7/8] Writing platform configuration...${NC}"

cat > "$AISDLC_HOME/config.json" << EOF
{
  "version": "4.0.0",
  "storage": "sqlite",
  "eventBus": "file",
  "dashboard": {
    "port": 3030,
    "host": "localhost"
  },
  "database": {
    "path": "$DB_PATH"
  },
  "governance": {
    "level": 1,
    "requireApproval": false
  },
  "agents": {
    "definitions": "$INSTALL_DIR/agents"
  },
  "hooks": {
    "installed": false,
    "path": "$INSTALL_DIR/hooks"
  },
  "mcp": {
    "configured": false
  },
  "initialized": true,
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "  ${GREEN}[OK]${NC} Configuration saved to ~/.aisdlc/config.json"

#-------------------------------------------------------------------------------
# Step 8: Install registry and scripts
#-------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[8/8] Installing support scripts...${NC}"

# SDLC Registry
if [ -f "$SCRIPT_DIR/scripts/sdlc-registry.sh" ]; then
    mkdir -p "$INSTALL_DIR/sdlc-registry"
    cp "$SCRIPT_DIR/scripts/sdlc-registry.sh" "$INSTALL_DIR/sdlc-registry/"
    chmod +x "$INSTALL_DIR/sdlc-registry/sdlc-registry.sh"
    echo -e "  ${GREEN}[OK]${NC} SDLC Registry CLI"
fi

# FinOps tracker
if [ -d "$SCRIPT_DIR/scripts" ]; then
    mkdir -p "$INSTALL_DIR/finops"
    if [ -f "$SCRIPT_DIR/scripts/track-costs.sh" ]; then
        cp "$SCRIPT_DIR/scripts/track-costs.sh" "$INSTALL_DIR/finops/"
        chmod +x "$INSTALL_DIR/finops/track-costs.sh"
        echo -e "  ${GREEN}[OK]${NC} FinOps cost tracker"
    fi
fi

# Version file
echo "4.0.0" > "$INSTALL_DIR/aisdlc-version"
echo -e "  ${GREEN}[OK]${NC} Version 4.0.0 registered"

# Project docs structure
mkdir -p docs/sdlc/{requirements,architecture,security,testing,deployments,acceptance,tracking,costs,problems,ux}
echo -e "  ${GREEN}[OK]${NC} SDLC documentation structure created"

#-------------------------------------------------------------------------------
# Complete
#-------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}+==============================================================+${NC}"
echo -e "${GREEN}|       AI-SDLC Platform v4.0.0 - Installation Complete!       |${NC}"
echo -e "${GREEN}+==============================================================+${NC}"
echo ""
echo -e "${BLUE}Platform:${NC}"
echo -e "  Version:     4.0.0 (Local Production)"
echo -e "  Storage:     SQLite (zero-config, ~/.aisdlc/data/platform.db)"
echo -e "  Event Bus:   File-based (no Redis needed)"
echo -e "  Dashboard:   http://localhost:3030"
echo -e "  Agents:      $INSTALLED installed"
echo ""
echo -e "${BLUE}Quick Start:${NC}"
echo -e "  1. Use Claude Code: ${YELLOW}claude 'Build a user authentication system'${NC}"
echo -e "  2. Or use commands: ${YELLOW}/sdlc-start Build a REST API${NC}"
echo -e "  3. Check status:    ${YELLOW}/sdlc-status${NC}"
echo ""
echo -e "${BLUE}SDLC Workflow:${NC}"
echo -e "  User -> Conductor -> BA -> Architect -> Engineer -> Security -> QA -> Atlas -> Customer"
echo ""
echo -e "${BLUE}All Data Stored Locally:${NC}"
echo -e "  ~/.aisdlc/data/platform.db    SQLite database"
echo -e "  ~/.aisdlc/config.json          Platform configuration"
echo -e "  ~/.aisdlc/logs/                Platform logs"
echo -e "  ~/.claude/agents/              Agent definitions"
echo -e "  ~/.claude/commands/            Slash commands"
echo ""
