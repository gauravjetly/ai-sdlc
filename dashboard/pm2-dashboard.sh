#!/bin/bash

#===============================================================================
# AI-SDLC Control Center - PM2 Management Script
# Manages the dashboard with auto-restart using PM2 process manager
#===============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="sdlc-dashboard"

#===============================================================================
# Functions
#===============================================================================

print_banner() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     AI-SDLC Control Center - PM2 Management                  ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

check_pm2() {
  if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  PM2 is not installed"
    echo ""
    echo "  Installing PM2 globally..."
    echo ""

    if npm install -g pm2; then
      echo ""
      echo -e "${GREEN}✓${NC} PM2 installed successfully"
      return 0
    else
      echo ""
      echo -e "${RED}✗${NC} Failed to install PM2"
      echo ""
      echo "  Please install manually:"
      echo "    npm install -g pm2"
      echo ""
      exit 1
    fi
  fi

  echo -e "${GREEN}✓${NC} PM2 is installed ($(pm2 --version))"
}

start_dashboard() {
  echo ""
  echo -e "${BLUE}Starting dashboard with PM2...${NC}"
  echo ""

  # Check if already running
  if pm2 describe "$APP_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Dashboard is already running"
    echo ""
    echo "  Use './pm2-dashboard.sh restart' to restart"
    echo "  Use './pm2-dashboard.sh stop' to stop"
    echo ""
    show_status
    return 0
  fi

  # Start with PM2
  if pm2 start server.js --name "$APP_NAME" \
    --max-memory-restart 512M \
    --restart-delay 3000 \
    --exp-backoff-restart-delay=100; then

    echo ""
    echo -e "${GREEN}✓${NC} Dashboard started successfully"
    echo ""
    echo -e "  ${GREEN}Dashboard URL:${NC} http://localhost:3030"
    echo ""
    echo -e "  ${BLUE}Status:${NC}   ./pm2-dashboard.sh status"
    echo -e "  ${BLUE}Logs:${NC}     ./pm2-dashboard.sh logs"
    echo -e "  ${BLUE}Stop:${NC}     ./pm2-dashboard.sh stop"
    echo -e "  ${BLUE}Restart:${NC}  ./pm2-dashboard.sh restart"
    echo ""
    echo -e "${GREEN}Features:${NC}"
    echo -e "  ✓ Auto-restart on crash"
    echo -e "  ✓ Memory limit: 512MB (auto-restart if exceeded)"
    echo -e "  ✓ 3 second delay between restarts"
    echo -e "  ✓ Exponential backoff for repeated crashes"
    echo ""

    # Open browser
    sleep 2
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open "http://localhost:3030" 2>/dev/null || true
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      xdg-open "http://localhost:3030" 2>/dev/null || true
    fi

    return 0
  else
    echo ""
    echo -e "${RED}✗${NC} Failed to start dashboard"
    return 1
  fi
}

stop_dashboard() {
  echo ""
  echo -e "${BLUE}Stopping dashboard...${NC}"
  echo ""

  if pm2 describe "$APP_NAME" &> /dev/null; then
    if pm2 stop "$APP_NAME" && pm2 delete "$APP_NAME"; then
      echo -e "${GREEN}✓${NC} Dashboard stopped"
      return 0
    else
      echo -e "${RED}✗${NC} Failed to stop dashboard"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠${NC}  Dashboard is not running"
    return 0
  fi
}

restart_dashboard() {
  echo ""
  echo -e "${BLUE}Restarting dashboard...${NC}"
  echo ""

  if pm2 describe "$APP_NAME" &> /dev/null; then
    if pm2 restart "$APP_NAME"; then
      echo ""
      echo -e "${GREEN}✓${NC} Dashboard restarted"
      echo ""
      echo -e "  ${GREEN}Dashboard URL:${NC} http://localhost:3030"
      echo ""
      return 0
    else
      echo ""
      echo -e "${RED}✗${NC} Failed to restart dashboard"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠${NC}  Dashboard is not running"
    echo ""
    echo "  Starting instead..."
    start_dashboard
  fi
}

show_status() {
  echo ""
  echo -e "${BLUE}Dashboard Status${NC}"
  echo -e "${BLUE}════════════════${NC}"
  echo ""

  if pm2 describe "$APP_NAME" &> /dev/null; then
    pm2 describe "$APP_NAME"
    echo ""
    echo -e "  ${BLUE}Dashboard:${NC} http://localhost:3030"
    echo -e "  ${BLUE}Logs:${NC}      ./pm2-dashboard.sh logs"
    echo ""
  else
    echo -e "${YELLOW}⚠${NC}  Dashboard is not running"
    echo ""
    echo "  Start with: ./pm2-dashboard.sh start"
    echo ""
  fi
}

show_logs() {
  echo ""
  echo -e "${BLUE}Dashboard Logs (Ctrl+C to exit)${NC}"
  echo -e "${BLUE}═══════════════════════════════${NC}"
  echo ""

  if pm2 describe "$APP_NAME" &> /dev/null; then
    pm2 logs "$APP_NAME"
  else
    echo -e "${YELLOW}⚠${NC}  Dashboard is not running"
    echo ""
  fi
}

setup_startup() {
  echo ""
  echo -e "${BLUE}Setting up auto-start on system boot...${NC}"
  echo ""

  if pm2 startup | grep -q "sudo"; then
    echo -e "${YELLOW}⚠${NC}  PM2 startup requires sudo"
    echo ""
    echo "  Run the command shown below, then run:"
    echo "    ./pm2-dashboard.sh save"
    echo ""
    pm2 startup
  else
    pm2 startup
    pm2 save
    echo ""
    echo -e "${GREEN}✓${NC} Auto-start configured"
    echo ""
    echo "  Dashboard will start automatically on system boot"
    echo ""
  fi
}

save_config() {
  echo ""
  echo -e "${BLUE}Saving PM2 configuration...${NC}"
  echo ""

  if pm2 save; then
    echo ""
    echo -e "${GREEN}✓${NC} Configuration saved"
    echo ""
    echo "  Current processes will start on system boot"
    echo ""
    return 0
  else
    echo ""
    echo -e "${RED}✗${NC} Failed to save configuration"
    return 1
  fi
}

monitor_dashboard() {
  echo ""
  echo -e "${BLUE}Dashboard Monitor (Press Ctrl+C to exit)${NC}"
  echo -e "${BLUE}═════════════════════════════════════${NC}"
  echo ""

  pm2 monit
}

show_help() {
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start       Start the dashboard with PM2"
  echo "  stop        Stop the dashboard"
  echo "  restart     Restart the dashboard"
  echo "  status      Show dashboard status"
  echo "  logs        Show dashboard logs (follow mode)"
  echo "  monitor     Open PM2 monitoring interface"
  echo "  startup     Configure auto-start on system boot"
  echo "  save        Save current PM2 configuration"
  echo "  help        Show this help message"
  echo ""
  echo "Features:"
  echo "  ✓ Auto-restart on crash"
  echo "  ✓ Memory limit (512MB)"
  echo "  ✓ Exponential backoff on repeated failures"
  echo "  ✓ 3 second delay between restarts"
  echo "  ✓ Log management and rotation"
  echo "  ✓ Optional auto-start on boot"
  echo ""
  echo "Examples:"
  echo "  $0 start              # Start dashboard"
  echo "  $0 logs               # View logs"
  echo "  $0 monitor            # Open monitoring UI"
  echo "  $0 startup            # Configure boot auto-start"
  echo ""
  echo "PM2 Commands (direct):"
  echo "  pm2 list              # List all processes"
  echo "  pm2 logs $APP_NAME     # View logs"
  echo "  pm2 monit             # Monitoring UI"
  echo "  pm2 restart $APP_NAME  # Restart"
  echo ""
}

#===============================================================================
# Main
#===============================================================================

print_banner

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
  start)
    check_pm2
    start_dashboard
    ;;

  stop)
    check_pm2
    stop_dashboard
    ;;

  restart)
    check_pm2
    restart_dashboard
    ;;

  status)
    check_pm2
    show_status
    ;;

  logs)
    check_pm2
    show_logs
    ;;

  monitor)
    check_pm2
    monitor_dashboard
    ;;

  startup)
    check_pm2
    setup_startup
    ;;

  save)
    check_pm2
    save_config
    ;;

  help|--help|-h)
    show_help
    ;;

  *)
    echo -e "${RED}✗${NC} Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac

exit 0
