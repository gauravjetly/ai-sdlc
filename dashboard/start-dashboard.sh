#!/bin/bash

#===============================================================================
# AI-SDLC Control Center - Start Script
# Launches the web-based dashboard with auto-refresh
#===============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_SCRIPT="${SCRIPT_DIR}/server.js"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         AI-SDLC Control Center - Starting...                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js is not installed"
    echo ""
    echo "  Please install Node.js from: https://nodejs.org"
    echo "  Or use: brew install node"
    echo ""
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 12 ]; then
    echo -e "${YELLOW}⚠${NC}  Node.js version is old ($(node -v))"
    echo "  Recommended: v14 or higher"
    echo ""
fi

# Check if registry is initialized
REGISTRY_FILE="${HOME}/.claude/sdlc-registry/registry.json"
if [ ! -f "$REGISTRY_FILE" ]; then
    echo -e "${YELLOW}⚠${NC}  Registry not initialized yet"
    echo "  The dashboard will work, but no data will be shown until you:"
    echo "    1. Run: ~/.claude/bin-sdlc-registry init"
    echo "    2. Or start a workflow: /sdlc-start"
    echo ""
fi

# Start the server
echo -e "${GREEN}✓${NC} Starting Control Center..."
echo ""

exec node "$SERVER_SCRIPT"
