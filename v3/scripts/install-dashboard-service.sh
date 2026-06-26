#!/bin/bash

#
# AI-SDLC Dashboard Service Installer
# Installs the dashboard as an always-running background service
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARD_SOURCE="$SOURCE_DIR/dashboard"
INSTALL_DIR="$HOME/.claude/sdlc-dashboard"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.aisdlc.dashboard.plist"
PORT="${PORT:-3030}"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AI-SDLC Dashboard Service Installer                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

NODE_PATH=$(which node)
echo -e "${GREEN}✓${NC} Node.js found: $NODE_PATH"

# Create install directory
echo -e "${YELLOW}→${NC} Creating install directory..."
mkdir -p "$INSTALL_DIR" 2>/dev/null || true

# Copy dashboard files
echo -e "${YELLOW}→${NC} Installing dashboard files..."
cp "$DASHBOARD_SOURCE/server.js" "$INSTALL_DIR/"
cp "$DASHBOARD_SOURCE/index.html" "$INSTALL_DIR/"

# Create the plist with correct paths
echo -e "${YELLOW}→${NC} Creating launch agent configuration..."
mkdir -p "$LAUNCH_AGENTS_DIR"

cat > "$LAUNCH_AGENTS_DIR/$PLIST_NAME" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aisdlc.dashboard</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$INSTALL_DIR/server.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>$PORT</string>
        <key>HOME</key>
        <string>$HOME</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>StandardOutPath</key>
    <string>$INSTALL_DIR/dashboard.log</string>

    <key>StandardErrorPath</key>
    <string>$INSTALL_DIR/dashboard.error.log</string>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF

echo -e "${GREEN}✓${NC} Launch agent created at: $LAUNCH_AGENTS_DIR/$PLIST_NAME"

# Stop existing service if running
echo -e "${YELLOW}→${NC} Stopping existing service (if any)..."
launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_NAME" 2>/dev/null || true

# Start the service
echo -e "${YELLOW}→${NC} Starting dashboard service..."
launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_NAME"

# Wait for startup
sleep 2

# Verify it's running
if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dashboard service is running!"
else
    echo -e "${YELLOW}⚠${NC} Service started but not responding yet. Check logs:"
    echo "    cat $INSTALL_DIR/dashboard.log"
    echo "    cat $INSTALL_DIR/dashboard.error.log"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Dashboard Service Installed Successfully!          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Dashboard URL:${NC}  http://localhost:$PORT"
echo ""
echo -e "  ${YELLOW}Service Commands:${NC}"
echo "    Start:   launchctl load ~/Library/LaunchAgents/$PLIST_NAME"
echo "    Stop:    launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
echo "    Status:  launchctl list | grep aisdlc"
echo "    Logs:    tail -f $INSTALL_DIR/dashboard.log"
echo ""
echo -e "  ${YELLOW}Features:${NC}"
echo "    ✓ Starts automatically on login"
echo "    ✓ Restarts automatically if it crashes"
echo "    ✓ Runs in background (no terminal needed)"
echo "    ✓ Auto-picks up registry changes (3s refresh)"
echo ""
