#!/bin/bash

#
# AI-SDLC Dashboard Control Script
# Manage the dashboard background service
#

PLIST_NAME="com.aisdlc.dashboard.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"
INSTALL_DIR="$HOME/.claude/sdlc-dashboard"
PORT="${PORT:-3030}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

case "$1" in
    start)
        echo -e "${YELLOW}→${NC} Starting dashboard service..."
        if [ -f "$PLIST_PATH" ]; then
            launchctl load "$PLIST_PATH" 2>/dev/null
            sleep 2
            if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} Dashboard running at http://localhost:$PORT"
            else
                echo -e "${YELLOW}⚠${NC} Service started. Check logs: tail -f $INSTALL_DIR/dashboard.log"
            fi
        else
            echo -e "${RED}✗${NC} Service not installed. Run install-dashboard-service.sh first."
            exit 1
        fi
        ;;

    stop)
        echo -e "${YELLOW}→${NC} Stopping dashboard service..."
        launchctl unload "$PLIST_PATH" 2>/dev/null
        echo -e "${GREEN}✓${NC} Dashboard service stopped"
        ;;

    restart)
        echo -e "${YELLOW}→${NC} Restarting dashboard service..."
        launchctl unload "$PLIST_PATH" 2>/dev/null
        sleep 1
        launchctl load "$PLIST_PATH" 2>/dev/null
        sleep 2
        if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Dashboard restarted at http://localhost:$PORT"
        else
            echo -e "${YELLOW}⚠${NC} Service restarted. Check logs if issues persist."
        fi
        ;;

    status)
        echo -e "${BLUE}Dashboard Service Status${NC}"
        echo ""
        if launchctl list | grep -q "com.aisdlc.dashboard"; then
            echo -e "  Service: ${GREEN}Running${NC}"
            PID=$(launchctl list | grep "com.aisdlc.dashboard" | awk '{print $1}')
            echo -e "  PID:     $PID"
        else
            echo -e "  Service: ${RED}Not Running${NC}"
        fi

        if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
            echo -e "  HTTP:    ${GREEN}Responding${NC} on port $PORT"
        else
            echo -e "  HTTP:    ${RED}Not Responding${NC}"
        fi

        echo ""
        echo -e "  URL:     http://localhost:$PORT"
        echo -e "  Logs:    $INSTALL_DIR/dashboard.log"
        echo ""
        ;;

    logs)
        if [ -f "$INSTALL_DIR/dashboard.log" ]; then
            tail -f "$INSTALL_DIR/dashboard.log"
        else
            echo -e "${RED}✗${NC} No log file found"
        fi
        ;;

    errors)
        if [ -f "$INSTALL_DIR/dashboard.error.log" ]; then
            tail -f "$INSTALL_DIR/dashboard.error.log"
        else
            echo -e "${RED}✗${NC} No error log file found"
        fi
        ;;

    open)
        echo -e "${YELLOW}→${NC} Opening dashboard in browser..."
        open "http://localhost:$PORT"
        ;;

    uninstall)
        echo -e "${YELLOW}→${NC} Uninstalling dashboard service..."
        launchctl unload "$PLIST_PATH" 2>/dev/null
        rm -f "$PLIST_PATH"
        rm -rf "$INSTALL_DIR"
        echo -e "${GREEN}✓${NC} Dashboard service uninstalled"
        ;;

    *)
        echo ""
        echo -e "${BLUE}AI-SDLC Dashboard Control${NC}"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|errors|open|uninstall}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the dashboard service"
        echo "  stop      - Stop the dashboard service"
        echo "  restart   - Restart the dashboard service"
        echo "  status    - Show service status"
        echo "  logs      - Tail the dashboard logs"
        echo "  errors    - Tail the error logs"
        echo "  open      - Open dashboard in browser"
        echo "  uninstall - Remove the dashboard service"
        echo ""
        exit 1
        ;;
esac
