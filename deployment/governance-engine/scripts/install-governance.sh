#!/bin/bash
# =============================================================================
# Vintiq Governance Engine - One-Command Installation Script
# =============================================================================
# Usage: curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/install.sh | bash
# Or:    ./install-governance.sh
#
# This script will:
# 1. Verify Node.js is installed (>= 18.0.0)
# 2. Install the governance engine package
# 3. Download the Vintiq Engineering policy
# 4. Set up git hooks for pre-commit validation
# 5. Verify installation
#
# =============================================================================

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="@vintiq/governance-engine"
POLICY_URL="https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/policies/vintiq-engineering.yaml"
MIN_NODE_VERSION="18.0.0"
GOVERNANCE_DIR=".governance"
POLICY_FILE="${GOVERNANCE_DIR}/policy.yaml"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

version_gte() {
    # Compare versions: returns 0 if $1 >= $2
    printf '%s\n%s' "$2" "$1" | sort -V -C
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

log_info "Starting Vintiq Governance Engine installation..."
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    log_warning "Not in a git repository. Governance engine works best with git."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Installation cancelled."
        exit 1
    fi
fi

# Check Node.js
log_info "Checking Node.js installation..."
if ! check_command node; then
    log_error "Node.js not found. Please install Node.js ${MIN_NODE_VERSION} or higher."
    log_info "Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
log_info "Found Node.js version: ${NODE_VERSION}"

if ! version_gte "$NODE_VERSION" "$MIN_NODE_VERSION"; then
    log_error "Node.js version ${NODE_VERSION} is too old. Minimum required: ${MIN_NODE_VERSION}"
    log_info "Please upgrade Node.js from: https://nodejs.org/"
    exit 1
fi

log_success "Node.js version is compatible"

# Check npm
log_info "Checking npm installation..."
if ! check_command npm; then
    log_error "npm not found. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm --version)
log_success "Found npm version: ${NPM_VERSION}"

# Check if package.json exists
if [ ! -f package.json ]; then
    log_warning "No package.json found."
    read -p "Initialize a new Node.js project? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Initializing new Node.js project..."
        npm init -y
        log_success "Created package.json"
    else
        log_error "package.json required for installation. Run 'npm init' first."
        exit 1
    fi
fi

echo ""

# =============================================================================
# Installation
# =============================================================================

log_info "Installing ${PACKAGE_NAME}..."
if npm list "$PACKAGE_NAME" &>/dev/null; then
    log_warning "Package already installed. Updating to latest version..."
    npm update "$PACKAGE_NAME" --save-dev
else
    npm install --save-dev "$PACKAGE_NAME"
fi

log_success "Governance engine installed"
echo ""

# =============================================================================
# Policy Setup
# =============================================================================

log_info "Setting up governance policy..."

# Create governance directory
if [ ! -d "$GOVERNANCE_DIR" ]; then
    mkdir -p "$GOVERNANCE_DIR"
    log_success "Created ${GOVERNANCE_DIR}/ directory"
fi

# Download or copy policy file
if [ -f "$POLICY_FILE" ]; then
    log_warning "Policy file already exists at ${POLICY_FILE}"
    read -p "Overwrite with latest Vintiq policy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Keeping existing policy file"
    else
        log_info "Downloading latest Vintiq Engineering policy..."
        if check_command curl; then
            curl -fsSL "$POLICY_URL" > "$POLICY_FILE" 2>/dev/null || {
                log_warning "Could not download policy. Using local template."
                cp "$(dirname "$0")/../policies/vintiq-engineering.yaml" "$POLICY_FILE" 2>/dev/null || {
                    log_error "Could not find policy template."
                    exit 1
                }
            }
        else
            log_warning "curl not found. Copying local template..."
            cp "$(dirname "$0")/../policies/vintiq-engineering.yaml" "$POLICY_FILE" 2>/dev/null || {
                log_error "Could not find policy template."
                exit 1
            }
        fi
        log_success "Policy file updated"
    fi
else
    log_info "Downloading Vintiq Engineering policy..."
    if check_command curl; then
        curl -fsSL "$POLICY_URL" > "$POLICY_FILE" 2>/dev/null || {
            log_warning "Could not download policy. Using local template."
            cp "$(dirname "$0")/../policies/vintiq-engineering.yaml" "$POLICY_FILE" 2>/dev/null || {
                log_error "Could not find policy template."
                exit 1
            }
        }
    else
        log_warning "curl not found. Copying local template..."
        cp "$(dirname "$0")/../policies/vintiq-engineering.yaml" "$POLICY_FILE" 2>/dev/null || {
            log_error "Could not find policy template."
            exit 1
        }
    fi
    log_success "Policy file created at ${POLICY_FILE}"
fi

# Validate policy
log_info "Validating policy..."
if npx governance validate "$POLICY_FILE" &>/dev/null; then
    log_success "Policy validation passed"
else
    log_error "Policy validation failed. Please check ${POLICY_FILE}"
    exit 1
fi

echo ""

# =============================================================================
# Git Hooks Setup
# =============================================================================

if [ -d .git ]; then
    log_info "Setting up git hooks..."

    # Check if husky is installed
    if ! npm list husky &>/dev/null; then
        log_info "Installing husky for git hooks..."
        npm install --save-dev husky
    fi

    # Initialize husky
    npx husky init 2>/dev/null || log_warning "Husky already initialized"

    # Create pre-commit hook
    HOOK_FILE=".husky/pre-commit"
    cat > "$HOOK_FILE" << 'EOF'
#!/bin/sh
# Vintiq Governance Engine - Pre-commit Hook
# This hook validates code against governance policies before commit

echo "Running governance checks..."

npx governance check || {
  echo ""
  echo "❌ Governance check failed!"
  echo ""
  echo "Your commit violates one or more governance policies."
  echo "Please fix the violations above and try again."
  echo ""
  echo "Emergency bypass (use with caution):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
}

echo "✅ Governance checks passed"
EOF

    chmod +x "$HOOK_FILE"
    log_success "Git pre-commit hook installed"
else
    log_warning "Not a git repository. Skipping git hooks setup."
    log_info "You can run governance checks manually with: npx governance check"
fi

echo ""

# =============================================================================
# Verification
# =============================================================================

log_info "Verifying installation..."

# Check if governance CLI is available
if ! npx governance --version &>/dev/null; then
    log_error "Governance CLI not working. Installation may be incomplete."
    exit 1
fi

GOVERNANCE_VERSION=$(npx governance --version 2>/dev/null || echo "unknown")
log_success "Governance engine version: ${GOVERNANCE_VERSION}"

# Test policy validation
if npx governance validate "$POLICY_FILE" &>/dev/null; then
    log_success "Policy file is valid"
else
    log_warning "Policy file validation failed (non-fatal)"
fi

echo ""

# =============================================================================
# Success Message
# =============================================================================

cat << EOF
${GREEN}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║  ✅  Vintiq Governance Engine Installed Successfully!             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${NC}

${BLUE}Installation Summary:${NC}
  📦 Package: ${PACKAGE_NAME} (v${GOVERNANCE_VERSION})
  📝 Policy: ${POLICY_FILE}
  🔒 Git Hook: .husky/pre-commit

${BLUE}Next Steps:${NC}
  1. Review and customize your policy:
     ${YELLOW}editor ${POLICY_FILE}${NC}

  2. Run a governance check:
     ${YELLOW}npx governance check${NC}

  3. Validate a specific file:
     ${YELLOW}npx governance check path/to/file.ts${NC}

  4. View available commands:
     ${YELLOW}npx governance --help${NC}

${BLUE}Git Integration:${NC}
  The governance engine will automatically check your code before each commit.
  To bypass checks (emergency only): ${YELLOW}git commit --no-verify${NC}

${BLUE}Documentation:${NC}
  Full documentation: https://github.com/DLTKEngineering/governance-engine

${GREEN}Happy coding with confidence!${NC} 🚀

EOF

exit 0
