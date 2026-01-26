#!/bin/bash

#===============================================================================
# AI-SDLC Control Center - Docker Management Script
# Manages the containerized dashboard with auto-restart capabilities
#===============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Container and image names
CONTAINER_NAME="sdlc-control-center"
IMAGE_NAME="aisdlc-dashboard:2.4.0"

#===============================================================================
# Functions
#===============================================================================

print_banner() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     AI-SDLC Control Center - Docker Management              ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

check_docker() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker is not installed"
    echo ""
    echo "  Please install Docker:"
    echo "    macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "    Linux: https://docs.docker.com/engine/install/"
    echo "    Windows: https://docs.docker.com/desktop/install/windows-install/"
    echo ""
    exit 1
  fi

  if ! docker info &> /dev/null; then
    echo -e "${RED}✗${NC} Docker daemon is not running"
    echo ""
    echo "  Please start Docker Desktop or the Docker daemon"
    echo ""
    exit 1
  fi

  echo -e "${GREEN}✓${NC} Docker is running"
}

check_compose() {
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  docker-compose not found, using 'docker compose' instead"
    COMPOSE_CMD="docker compose"
  else
    if docker compose version &> /dev/null 2>&1; then
      COMPOSE_CMD="docker compose"
    else
      COMPOSE_CMD="docker-compose"
    fi
  fi
  echo -e "${GREEN}✓${NC} Docker Compose available: $COMPOSE_CMD"
}

build_image() {
  echo ""
  echo -e "${BLUE}Building dashboard image...${NC}"
  echo ""

  if $COMPOSE_CMD build; then
    echo ""
    echo -e "${GREEN}✓${NC} Image built successfully"
    return 0
  else
    echo ""
    echo -e "${RED}✗${NC} Failed to build image"
    return 1
  fi
}

start_dashboard() {
  echo ""
  echo -e "${BLUE}Starting dashboard container...${NC}"
  echo ""

  # Stop existing container if running
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}⚠${NC}  Stopping existing container..."
    docker stop "$CONTAINER_NAME" &> /dev/null
    docker rm "$CONTAINER_NAME" &> /dev/null
  fi

  # Start container
  if $COMPOSE_CMD up -d; then
    echo ""
    echo -e "${GREEN}✓${NC} Dashboard started successfully"
    echo ""
    echo -e "  ${GREEN}Dashboard URL:${NC} http://localhost:3030"
    echo ""
    echo -e "  ${BLUE}Status:${NC}       docker ps -f name=$CONTAINER_NAME"
    echo -e "  ${BLUE}Logs:${NC}         docker logs -f $CONTAINER_NAME"
    echo -e "  ${BLUE}Stop:${NC}         ./docker-dashboard.sh stop"
    echo -e "  ${BLUE}Restart:${NC}      ./docker-dashboard.sh restart"
    echo ""

    # Open browser
    sleep 2
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open "http://localhost:3030"
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
  echo -e "${BLUE}Stopping dashboard container...${NC}"
  echo ""

  if $COMPOSE_CMD down; then
    echo -e "${GREEN}✓${NC} Dashboard stopped"
    return 0
  else
    echo -e "${RED}✗${NC} Failed to stop dashboard"
    return 1
  fi
}

restart_dashboard() {
  stop_dashboard
  start_dashboard
}

show_status() {
  echo ""
  echo -e "${BLUE}Dashboard Status${NC}"
  echo -e "${BLUE}════════════════${NC}"
  echo ""

  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✓${NC} Container: Running"
    echo ""
    docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # Show health status
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)
    if [ -n "$HEALTH" ]; then
      if [ "$HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✓${NC} Health: $HEALTH"
      else
        echo -e "${YELLOW}⚠${NC}  Health: $HEALTH"
      fi
    fi

    echo ""
    echo -e "  ${BLUE}Dashboard:${NC} http://localhost:3030"
    echo -e "  ${BLUE}Logs:${NC}      docker logs -f $CONTAINER_NAME"
    echo ""
  else
    echo -e "${YELLOW}⚠${NC}  Container: Not running"
    echo ""
    echo "  Start with: ./docker-dashboard.sh start"
    echo ""
  fi
}

show_logs() {
  echo ""
  echo -e "${BLUE}Dashboard Logs (Ctrl+C to exit)${NC}"
  echo -e "${BLUE}═══════════════════════════════${NC}"
  echo ""

  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker logs -f "$CONTAINER_NAME"
  else
    echo -e "${YELLOW}⚠${NC}  Container is not running"
    echo ""
  fi
}

show_help() {
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start       Build and start the dashboard container"
  echo "  stop        Stop the dashboard container"
  echo "  restart     Restart the dashboard container"
  echo "  status      Show container status"
  echo "  logs        Show container logs (follow mode)"
  echo "  build       Build the Docker image"
  echo "  rebuild     Rebuild image and restart container"
  echo "  help        Show this help message"
  echo ""
  echo "Features:"
  echo "  ✓ Auto-restart on crash (restart: unless-stopped)"
  echo "  ✓ Health checks every 30s"
  echo "  ✓ Resource limits (512MB RAM, 0.5 CPU)"
  echo "  ✓ Persistent logs with rotation"
  echo "  ✓ Read-only access to ~/.claude directory"
  echo ""
  echo "Examples:"
  echo "  $0 start              # Start dashboard"
  echo "  $0 logs               # View logs"
  echo "  $0 status             # Check if running"
  echo "  $0 rebuild            # Rebuild after code changes"
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
    check_docker
    check_compose
    build_image && start_dashboard
    ;;

  stop)
    check_docker
    check_compose
    stop_dashboard
    ;;

  restart)
    check_docker
    check_compose
    restart_dashboard
    ;;

  status)
    check_docker
    show_status
    ;;

  logs)
    check_docker
    show_logs
    ;;

  build)
    check_docker
    check_compose
    build_image
    ;;

  rebuild)
    check_docker
    check_compose
    echo -e "${BLUE}Rebuilding image and restarting...${NC}"
    build_image && restart_dashboard
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
