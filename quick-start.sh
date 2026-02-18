#!/bin/bash
################################################################################
# AI-SDLC Quick Start Script
# One-command installation for local developer setup
################################################################################

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              AI-SDLC Quick Start Installer                     ║"
echo "║        Local Developer Edition - Zero Infrastructure           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check requirements
echo "Checking system requirements..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found"
    echo "Please install Node.js (v16 or higher): https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version must be 16 or higher (found: $(node --version))"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_warning "Python3 not found - Exec Agent will have limited functionality"
    SKIP_PYTHON=1
else
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
    print_success "Python $PYTHON_VERSION found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Step 1: Setting up directories"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create memory directories
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR/sdlc-registry"
mkdir -p "$CLAUDE_DIR/sdlc-registry/projects"
mkdir -p "$CLAUDE_DIR/sdlc-registry/events"/{inbox,outbox,archive}/{exec,ba,jets,engineer,security,qa,atlas,customer,tracker}
mkdir -p "$CLAUDE_DIR/exec-agent-memory/presentations"
mkdir -p "$CLAUDE_DIR/finops-registry"
mkdir -p "$CLAUDE_DIR/skills"

print_success "Memory directories created in ~/.claude/"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Step 2: Installing Node.js dependencies"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if dashboard has node_modules
if [ -d "dashboard/node_modules" ]; then
    print_info "Node modules already installed"
else
    cd dashboard
    if [ -f "package.json" ]; then
        print_info "Installing dashboard dependencies..."
        npm install --silent
        print_success "Dashboard dependencies installed"
    fi
    cd ..
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Step 3: Setting up Exec Agent (Optional)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -z "$SKIP_PYTHON" ]; then
    cd src/agents/exec-agent

    if [ -d "venv" ]; then
        print_info "Virtual environment already exists"
    else
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    fi

    print_info "Installing Python dependencies..."
    source venv/bin/activate
    pip install --quiet --upgrade pip
    pip install --quiet -r requirements.txt
    deactivate
    print_success "Exec Agent dependencies installed"

    cd ../../..
else
    print_warning "Skipping Exec Agent setup (Python not available)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Step 4: Installing Claude Code Skills"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Copy skills to ~/.claude/skills/
if [ ! -d "$CLAUDE_DIR/skills/exec-agent" ]; then
    print_info "Installing exec-agent skill..."
    cp -r ~/.claude/skills/exec-agent "$CLAUDE_DIR/skills/" 2>/dev/null || print_info "Skill will be available after first use"
fi

print_success "Skills configured"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Step 5: Starting Dashboard"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if port 3030 is in use
if lsof -Pi :3030 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 3030 is already in use"
    print_info "Dashboard may already be running"
    print_info "Check: http://localhost:3030"
else
    print_info "Starting dashboard server..."
    cd dashboard

    # Start server in background
    nohup node server.js > /dev/null 2>&1 &
    SERVER_PID=$!

    # Wait for server to start
    sleep 2

    if ps -p $SERVER_PID > /dev/null; then
        print_success "Dashboard started (PID: $SERVER_PID)"
    else
        print_error "Dashboard failed to start"
        print_info "Try manually: cd dashboard && node server.js"
        exit 1
    fi

    cd ..
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  ✓ INSTALLATION COMPLETE!                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 AI-SDLC is now running on your machine!"
echo ""
echo "📍 Access Points:"
echo "   Dashboard:  http://localhost:3030"
echo "   Data:       ~/.claude/"
echo ""
echo "🚀 Quick Start:"
echo "   1. Open: http://localhost:3030"
echo "   2. Or use Claude Code:"
echo "      /sdlc-start Build a REST API"
echo "      /exec-agent list"
echo ""
echo "📚 Documentation:"
echo "   - README.md (getting started)"
echo "   - docs/sdlc/ (detailed guides)"
echo "   - src/agents/exec-agent/HOW-IT-WORKS.md (Exec Agent)"
echo ""
echo "🛠️  Useful Commands:"
echo "   Stop dashboard:  pkill -f 'node server.js'"
echo "   View logs:       tail -f dashboard/dashboard.log"
echo "   Status:          curl http://localhost:3030/api/registry"
echo ""
echo "💡 Optional Setup:"
echo "   Set Claude API key for Exec Agent:"
echo "   export ANTHROPIC_API_KEY=\"your-key-here\""
echo ""
echo "✨ You're all set! Happy coding with AI agents! ✨"
echo ""

# Try to open browser (optional)
if command -v open &> /dev/null; then
    print_info "Opening dashboard in browser..."
    sleep 1
    open http://localhost:3030 2>/dev/null || true
elif command -v xdg-open &> /dev/null; then
    print_info "Opening dashboard in browser..."
    sleep 1
    xdg-open http://localhost:3030 2>/dev/null || true
fi

exit 0
