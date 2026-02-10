#!/bin/bash

# AI-SDLC Stop All Services Script
# Cleanly stops all running services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# PID file locations
DASHBOARD_PID_FILE="dashboard/dashboard.pid"
API_PID_FILE=".platform-state/api.pid"
WEBAPP_PID_FILE=".platform-state/webapp.pid"

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status "$BLUE" "=========================================="
print_status "$BLUE" "  Stopping AI-SDLC Services"
print_status "$BLUE" "=========================================="
echo ""

stopped_count=0
failed_count=0

# Stop dashboard
if [ -f "$DASHBOARD_PID_FILE" ]; then
    pid=$(cat "$DASHBOARD_PID_FILE")
    if ps -p $pid > /dev/null 2>&1; then
        print_status "$YELLOW" "Stopping Dashboard (PID: $pid)..."
        kill $pid 2>/dev/null && stopped_count=$((stopped_count + 1)) || failed_count=$((failed_count + 1))
        rm -f "$DASHBOARD_PID_FILE"
        print_status "$GREEN" "Dashboard stopped"
    else
        print_status "$YELLOW" "Dashboard not running (stale PID file)"
        rm -f "$DASHBOARD_PID_FILE"
    fi
else
    # Try to find by port
    pid=$(lsof -ti :3030 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_status "$YELLOW" "Stopping Dashboard (found on port 3030)..."
        kill $pid 2>/dev/null && stopped_count=$((stopped_count + 1)) || failed_count=$((failed_count + 1))
        print_status "$GREEN" "Dashboard stopped"
    else
        print_status "$YELLOW" "Dashboard not running"
    fi
fi

echo ""

# Stop API
if [ -f "$API_PID_FILE" ]; then
    pid=$(cat "$API_PID_FILE")
    if ps -p $pid > /dev/null 2>&1; then
        print_status "$YELLOW" "Stopping Platform API (PID: $pid)..."
        kill $pid 2>/dev/null && stopped_count=$((stopped_count + 1)) || failed_count=$((failed_count + 1))
        rm -f "$API_PID_FILE"
        print_status "$GREEN" "Platform API stopped"
    else
        print_status "$YELLOW" "Platform API not running (stale PID file)"
        rm -f "$API_PID_FILE"
    fi
else
    # Try to find by port
    pid=$(lsof -ti :3000 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_status "$YELLOW" "Stopping Platform API (found on port 3000)..."
        kill $pid 2>/dev/null && stopped_count=$((stopped_count + 1)) || failed_count=$((failed_count + 1))
        print_status "$GREEN" "Platform API stopped"
    else
        print_status "$YELLOW" "Platform API not running"
    fi
fi

echo ""

# Stop webapp
if [ -f "$WEBAPP_PID_FILE" ]; then
    pid=$(cat "$WEBAPP_PID_FILE")
    if ps -p $pid > /dev/null 2>&1; then
        print_status "$YELLOW" "Stopping Platform Webapp (PID: $pid)..."
        kill $pid 2>/dev/null && stopped_count=$((stopped_count + 1)) || failed_count=$((failed_count + 1))
        rm -f "$WEBAPP_PID_FILE"
        print_status "$GREEN" "Platform Webapp stopped"
    else
        print_status "$YELLOW" "Platform Webapp not running (stale PID file)"
        rm -f "$WEBAPP_PID_FILE"
    fi
else
    # Try to find by port
    pid=$(lsof -ti :3001 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_status "$YELLOW" "Stopping Platform Webapp (found on port 3001)..."
        kill $pid 2>/dev/null && stopped_count=$((stopped_count + 1)) || failed_count=$((failed_count + 1))
        print_status "$GREEN" "Platform Webapp stopped"
    else
        print_status "$YELLOW" "Platform Webapp not running"
    fi
fi

echo ""

# Wait a moment for processes to terminate
sleep 1

# Verify all ports are free
still_running=0
for port in 3030 3000 3001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_status "$RED" "Warning: Port $port still in use"
        still_running=1
    fi
done

print_status "$BLUE" "=========================================="
if [ $still_running -eq 0 ]; then
    print_status "$GREEN" "All services stopped successfully"
    print_status "$GREEN" "Stopped: $stopped_count services"
else
    print_status "$YELLOW" "Some services may still be running"
    print_status "$YELLOW" "Use 'lsof -i :3030,3000,3001' to check"
    print_status "$YELLOW" "Use 'kill -9 <PID>' to force stop if needed"
fi
print_status "$BLUE" "=========================================="
echo ""
