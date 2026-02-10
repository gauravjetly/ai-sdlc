#!/bin/bash

# AI-SDLC Integrated Dashboard Startup Script
# Starts all three services in the correct order with health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID file locations
DASHBOARD_PID_FILE="dashboard/dashboard.pid"
API_PID_FILE=".platform-state/api.pid"
WEBAPP_PID_FILE=".platform-state/webapp.pid"

# Log file locations
LOG_DIR=".platform-state/logs"
mkdir -p "$LOG_DIR"
DASHBOARD_LOG="$LOG_DIR/dashboard.log"
API_LOG="$LOG_DIR/api.log"
WEBAPP_LOG="$LOG_DIR/webapp.log"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local name=$2
    local max_wait=30
    local count=0

    print_status "$YELLOW" "Waiting for $name on port $port..."

    while [ $count -lt $max_wait ]; do
        if check_port $port; then
            print_status "$GREEN" "$name is ready!"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    print_status "$RED" "$name failed to start on port $port"
    return 1
}

# Function to cleanup on exit
cleanup() {
    print_status "$YELLOW" "\nStopping all services..."

    # Stop dashboard
    if [ -f "$DASHBOARD_PID_FILE" ]; then
        local pid=$(cat "$DASHBOARD_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            rm -f "$DASHBOARD_PID_FILE"
        fi
    fi

    # Stop API
    if [ -f "$API_PID_FILE" ]; then
        local pid=$(cat "$API_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            rm -f "$API_PID_FILE"
        fi
    fi

    # Stop webapp
    if [ -f "$WEBAPP_PID_FILE" ]; then
        local pid=$(cat "$WEBAPP_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            rm -f "$WEBAPP_PID_FILE"
        fi
    fi

    print_status "$GREEN" "All services stopped"
}

# Trap SIGINT and SIGTERM
trap cleanup EXIT INT TERM

# Main startup sequence
print_status "$BLUE" "=========================================="
print_status "$BLUE" "  AI-SDLC Integrated Dashboard"
print_status "$BLUE" "=========================================="
echo ""

# Check prerequisites
print_status "$YELLOW" "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_status "$RED" "Error: Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_status "$RED" "Error: npm is not installed"
    exit 1
fi

print_status "$GREEN" "Prerequisites OK"
echo ""

# Start Dashboard Server (Port 3030)
print_status "$BLUE" "1. Starting Dashboard Server (port 3030)..."

if check_port 3030; then
    print_status "$YELLOW" "Port 3030 is already in use. Skipping dashboard start."
else
    cd dashboard
    node server.js > "../$DASHBOARD_LOG" 2>&1 &
    DASH_PID=$!
    echo $DASH_PID > dashboard.pid
    cd ..

    if wait_for_service 3030 "Dashboard"; then
        print_status "$GREEN" "Dashboard started (PID: $DASH_PID)"
    else
        print_status "$RED" "Dashboard failed to start. Check logs: $DASHBOARD_LOG"
        exit 1
    fi
fi

echo ""

# Start Platform API (Port 3000)
print_status "$BLUE" "2. Starting Platform API (port 3000)..."

if check_port 3000; then
    print_status "$YELLOW" "Port 3000 is already in use. Skipping API start."
else
    cd src/platform

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "$YELLOW" "Installing API dependencies..."
        npm install > /dev/null 2>&1
    fi

    npm run api:dev > "../../$API_LOG" 2>&1 &
    API_PID=$!
    mkdir -p ../../.platform-state
    echo $API_PID > "../../$API_PID_FILE"
    cd ../..

    if wait_for_service 3000 "Platform API"; then
        print_status "$GREEN" "Platform API started (PID: $API_PID)"
    else
        print_status "$RED" "Platform API failed to start. Check logs: $API_LOG"
        exit 1
    fi
fi

echo ""

# Start Platform Webapp (Port 3001)
print_status "$BLUE" "3. Starting Platform Webapp (port 3001)..."

if check_port 3001; then
    print_status "$YELLOW" "Port 3001 is already in use. Skipping webapp start."
else
    cd src/platform/webapp

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "$YELLOW" "Installing webapp dependencies..."
        npm install > /dev/null 2>&1
    fi

    npm run dev > "../../../$WEBAPP_LOG" 2>&1 &
    WEBAPP_PID=$!
    mkdir -p ../../../.platform-state
    echo $WEBAPP_PID > "../../../$WEBAPP_PID_FILE"
    cd ../../..

    if wait_for_service 3001 "Platform Webapp"; then
        print_status "$GREEN" "Platform Webapp started (PID: $WEBAPP_PID)"
    else
        print_status "$RED" "Platform Webapp failed to start. Check logs: $WEBAPP_LOG"
        exit 1
    fi
fi

echo ""
print_status "$GREEN" "=========================================="
print_status "$GREEN" "  All Services Started Successfully!"
print_status "$GREEN" "=========================================="
echo ""
print_status "$BLUE" "Access Points:"
echo "  Main Dashboard:  http://localhost:3030"
echo "  Platform API:    http://localhost:3000"
echo "  Platform Webapp: http://localhost:3001"
echo ""
print_status "$BLUE" "Logs:"
echo "  Dashboard: $DASHBOARD_LOG"
echo "  API:       $API_LOG"
echo "  Webapp:    $WEBAPP_LOG"
echo ""
print_status "$YELLOW" "Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait
