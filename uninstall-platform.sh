#!/bin/bash

#===============================================================================
# AI-SDLC Platform v4.0.0 - Uninstaller
# Cleanly removes all platform components
#
# Usage: bash uninstall-platform.sh [--keep-data] [--confirm]
#===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="${HOME}/.claude"
AISDLC_HOME="${HOME}/.aisdlc"

KEEP_DATA=false
CONFIRMED=false

for arg in "$@"; do
    case "$arg" in
        --keep-data) KEEP_DATA=true ;;
        --confirm) CONFIRMED=true ;;
        --help|-h)
            echo "Usage: bash uninstall-platform.sh [--keep-data] [--confirm]"
            echo ""
            echo "Options:"
            echo "  --keep-data   Keep database and logs (remove only platform code)"
            echo "  --confirm     Skip confirmation prompt"
            echo "  --help        Show this help message"
            exit 0
            ;;
    esac
done

echo ""
echo -e "${RED}+==============================================================+${NC}"
echo -e "${RED}|    AI-SDLC Platform v4.0.0 - Uninstaller                     |${NC}"
echo -e "${RED}+==============================================================+${NC}"
echo ""

if [ "$CONFIRMED" != "true" ]; then
    echo -e "${YELLOW}This will remove the AI-SDLC Platform from your system.${NC}"
    echo ""
    echo "  Components to remove:"
    echo "    - Agent definitions (~/.claude/agents/)"
    echo "    - Slash commands (~/.claude/commands/)"
    echo "    - SDLC registry (~/.claude/sdlc-registry/)"
    echo "    - FinOps tracker (~/.claude/finops/)"
    echo "    - Version file (~/.claude/aisdlc-version)"
    if [ "$KEEP_DATA" = "true" ]; then
        echo ""
        echo -e "  ${GREEN}Keeping:${NC}"
        echo "    - Database (~/.aisdlc/data/)"
        echo "    - Logs (~/.aisdlc/logs/)"
        echo "    - Configuration (~/.aisdlc/config.json)"
    else
        echo "    - Database (~/.aisdlc/data/platform.db)"
        echo "    - Logs (~/.aisdlc/logs/)"
        echo "    - Configuration (~/.aisdlc/config.json)"
        echo "    - All data (~/.aisdlc/)"
    fi
    echo ""
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Uninstall cancelled.${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}[1/5] Stopping dashboard server...${NC}"
PID_FILE="$AISDLC_HOME/dashboard.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null
        echo -e "  ${GREEN}[OK]${NC} Dashboard server stopped (PID $PID)"
    else
        echo -e "  ${YELLOW}[SKIP]${NC} Dashboard server not running"
    fi
    rm -f "$PID_FILE"
else
    echo -e "  ${YELLOW}[SKIP]${NC} No dashboard PID file found"
fi

echo ""
echo -e "${YELLOW}[2/5] Removing agent definitions...${NC}"
if [ -d "$INSTALL_DIR/agents" ]; then
    AGENT_COUNT=$(ls -1 "$INSTALL_DIR/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
    rm -f "$INSTALL_DIR/agents/"*.md
    echo -e "  ${GREEN}[OK]${NC} Removed $AGENT_COUNT agent definition(s)"
else
    echo -e "  ${YELLOW}[SKIP]${NC} No agents directory"
fi

echo ""
echo -e "${YELLOW}[3/5] Removing commands and scripts...${NC}"
if [ -d "$INSTALL_DIR/commands" ]; then
    rm -f "$INSTALL_DIR/commands/"*.md
    echo -e "  ${GREEN}[OK]${NC} Slash commands removed"
fi

if [ -d "$INSTALL_DIR/sdlc-registry" ]; then
    rm -rf "$INSTALL_DIR/sdlc-registry"
    echo -e "  ${GREEN}[OK]${NC} SDLC registry removed"
fi

if [ -d "$INSTALL_DIR/finops" ]; then
    rm -rf "$INSTALL_DIR/finops"
    echo -e "  ${GREEN}[OK]${NC} FinOps tracker removed"
fi

if [ -f "$INSTALL_DIR/aisdlc-version" ]; then
    rm -f "$INSTALL_DIR/aisdlc-version"
    echo -e "  ${GREEN}[OK]${NC} Version file removed"
fi

echo ""
echo -e "${YELLOW}[4/5] Removing hooks...${NC}"
if [ -d "$INSTALL_DIR/hooks" ]; then
    rm -rf "$INSTALL_DIR/hooks"
    echo -e "  ${GREEN}[OK]${NC} Hooks directory removed"
else
    echo -e "  ${YELLOW}[SKIP]${NC} No hooks directory"
fi

echo ""
echo -e "${YELLOW}[5/5] Removing platform data...${NC}"
if [ "$KEEP_DATA" = "true" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} Keeping data (--keep-data flag)"
else
    if [ -d "$AISDLC_HOME" ]; then
        # Backup database before removal
        if [ -f "$AISDLC_HOME/data/platform.db" ]; then
            BACKUP_PATH="/tmp/aisdlc-backup-$(date +%Y%m%d-%H%M%S).db"
            cp "$AISDLC_HOME/data/platform.db" "$BACKUP_PATH"
            echo -e "  ${BLUE}[INFO]${NC} Database backed up to $BACKUP_PATH"
        fi
        rm -rf "$AISDLC_HOME"
        echo -e "  ${GREEN}[OK]${NC} All platform data removed (~/.aisdlc/)"
    else
        echo -e "  ${YELLOW}[SKIP]${NC} No platform data directory"
    fi
fi

echo ""
echo -e "${GREEN}+==============================================================+${NC}"
echo -e "${GREEN}|       AI-SDLC Platform - Uninstallation Complete             |${NC}"
echo -e "${GREEN}+==============================================================+${NC}"
echo ""
echo -e "${BLUE}What was removed:${NC}"
echo "  - Agent definitions from ~/.claude/agents/"
echo "  - Slash commands from ~/.claude/commands/"
echo "  - Support scripts (registry, finops)"
echo "  - Hooks"
if [ "$KEEP_DATA" != "true" ]; then
    echo "  - Platform data (~/.aisdlc/)"
    echo ""
    echo -e "${BLUE}Database backup:${NC}"
    if [ -n "$BACKUP_PATH" ]; then
        echo "  $BACKUP_PATH"
    else
        echo "  No database was found to backup"
    fi
fi
echo ""
echo -e "${BLUE}To reinstall:${NC}"
echo "  bash install-platform.sh"
echo ""
