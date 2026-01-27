#!/bin/bash
# =============================================================================
# Deltek Governance Engine - Configuration Validator
# =============================================================================
# This script verifies that the governance engine is correctly installed
# and configured. Use it to troubleshoot issues or verify deployment.
#
# Usage: ./validate-config.sh [--verbose] [--policy=path/to/policy.yaml]
#
# Exit codes:
#   0 - All validations passed
#   1 - Critical validation failed
#   2 - Warning (non-critical issue detected)
#
# =============================================================================

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
VERBOSE=false
POLICY_FILE=".governance/policy.yaml"
EXIT_CODE=0
WARNINGS=0
ERRORS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --policy=*)
            POLICY_FILE="${1#*=}"
            shift
            ;;
        --help|-h)
            cat << EOF
Deltek Governance Engine - Configuration Validator

Usage: ./validate-config.sh [options]

Options:
  --verbose, -v           Show detailed output
  --policy=PATH           Path to policy file (default: .governance/policy.yaml)
  --help, -h              Show this help message

Examples:
  ./validate-config.sh                        # Quick validation
  ./validate-config.sh --verbose              # Detailed validation
  ./validate-config.sh --policy=custom.yaml   # Validate custom policy

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}    ↳${NC} $1"
    fi
}

run_check() {
    local check_name=$1
    local check_cmd=$2

    if [ "$VERBOSE" = true ]; then
        log_info "Running: $check_name"
    fi

    if eval "$check_cmd" &>/dev/null; then
        log_success "$check_name"
        return 0
    else
        log_error "$check_name"
        return 1
    fi
}

# =============================================================================
# Validation Header
# =============================================================================

cat << EOF
${BLUE}${BOLD}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║  Deltek Governance Engine - Configuration Validator              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${NC}

Starting validation...
EOF

echo ""

# =============================================================================
# Environment Checks
# =============================================================================

echo "${BOLD}Environment Checks${NC}"
echo "─────────────────────────────────────────────────────"

# Check Node.js
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js installed: ${NODE_VERSION}"
    log_verbose "Path: $(which node)"

    # Check version requirement
    MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        log_verbose "Version meets requirement (>= 18.0.0)"
    else
        log_error "Node.js version too old (need >= 18.0.0)"
    fi
else
    log_error "Node.js not found"
fi

# Check npm
if command -v npm &>/dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "npm installed: v${NPM_VERSION}"
    log_verbose "Path: $(which npm)"
else
    log_error "npm not found"
fi

# Check npx
if command -v npx &>/dev/null; then
    log_success "npx available"
    log_verbose "Path: $(which npx)"
else
    log_error "npx not found"
fi

echo ""

# =============================================================================
# Git Checks
# =============================================================================

echo "${BOLD}Git Repository Checks${NC}"
echo "─────────────────────────────────────────────────────"

if [ -d .git ]; then
    log_success "Git repository initialized"

    # Check git version
    if command -v git &>/dev/null; then
        GIT_VERSION=$(git --version | sed 's/git version //')
        log_verbose "Git version: ${GIT_VERSION}"
    fi

    # Check if on a branch
    if git rev-parse --abbrev-ref HEAD &>/dev/null; then
        BRANCH=$(git rev-parse --abbrev-ref HEAD)
        log_success "On branch: ${BRANCH}"
    else
        log_warning "Not on a branch"
    fi

    # Check for remote
    if git remote -v | grep -q origin; then
        ORIGIN=$(git remote get-url origin 2>/dev/null || echo "unknown")
        log_success "Remote origin configured"
        log_verbose "Origin: ${ORIGIN}"
    else
        log_warning "No remote origin configured"
    fi
else
    log_warning "Not a git repository"
    log_verbose "Git features will be limited"
fi

echo ""

# =============================================================================
# Package Checks
# =============================================================================

echo "${BOLD}Package Installation Checks${NC}"
echo "─────────────────────────────────────────────────────"

# Check package.json
if [ -f package.json ]; then
    log_success "package.json exists"
    log_verbose "Location: $(pwd)/package.json"
else
    log_error "package.json not found"
fi

# Check if governance engine is installed
if npm list @deltek/governance-engine &>/dev/null; then
    PACKAGE_VERSION=$(npm list @deltek/governance-engine | grep @deltek/governance-engine | head -1 | sed 's/.*@//' | sed 's/ .*//')
    log_success "Governance engine installed: v${PACKAGE_VERSION}"
    log_verbose "Package: @deltek/governance-engine"
else
    log_error "Governance engine not installed"
    log_verbose "Install with: npm install --save-dev @deltek/governance-engine"
fi

# Check if husky is installed
if npm list husky &>/dev/null; then
    HUSKY_VERSION=$(npm list husky | grep husky | head -1 | sed 's/.*@//' | sed 's/ .*//')
    log_success "Husky installed: v${HUSKY_VERSION}"
else
    log_warning "Husky not installed (git hooks won't work)"
    log_verbose "Install with: npm install --save-dev husky"
fi

# Check node_modules
if [ -d node_modules ]; then
    log_success "node_modules directory exists"
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    log_verbose "Modules installed: ${MODULE_COUNT}"
else
    log_error "node_modules not found"
    log_verbose "Run: npm install"
fi

echo ""

# =============================================================================
# CLI Checks
# =============================================================================

echo "${BOLD}CLI Functionality Checks${NC}"
echo "─────────────────────────────────────────────────────"

# Check if governance CLI is available
if npx governance --version &>/dev/null; then
    CLI_VERSION=$(npx governance --version 2>/dev/null || echo "unknown")
    log_success "Governance CLI working: ${CLI_VERSION}"
else
    log_error "Governance CLI not working"
fi

# Check available commands
if npx governance --help &>/dev/null; then
    log_success "Help command available"
    if [ "$VERBOSE" = true ]; then
        log_verbose "Commands:"
        npx governance --help | grep -E "^  [a-z]" | sed 's/^/      /' || true
    fi
else
    log_error "Help command failed"
fi

# Check validate command
if npx governance validate --help &>/dev/null; then
    log_success "Validate command available"
else
    log_error "Validate command not available"
fi

# Check check command
if npx governance check --help &>/dev/null; then
    log_success "Check command available"
else
    log_error "Check command not available"
fi

echo ""

# =============================================================================
# Policy File Checks
# =============================================================================

echo "${BOLD}Policy Configuration Checks${NC}"
echo "─────────────────────────────────────────────────────"

# Check if policy file exists
if [ -f "$POLICY_FILE" ]; then
    log_success "Policy file exists: ${POLICY_FILE}"
    log_verbose "Location: $(pwd)/${POLICY_FILE}"

    # Check file size
    FILE_SIZE=$(wc -c < "$POLICY_FILE")
    if [ "$FILE_SIZE" -gt 0 ]; then
        log_success "Policy file is not empty (${FILE_SIZE} bytes)"
    else
        log_error "Policy file is empty"
    fi

    # Validate policy syntax
    if npx governance validate "$POLICY_FILE" &>/dev/null; then
        log_success "Policy syntax is valid"
    else
        log_error "Policy validation failed"
        if [ "$VERBOSE" = true ]; then
            log_verbose "Run: npx governance validate ${POLICY_FILE}"
        fi
    fi

    # Check for required sections
    if grep -q "^version:" "$POLICY_FILE"; then
        POLICY_VERSION=$(grep "^version:" "$POLICY_FILE" | head -1 | sed 's/version: //' | tr -d '"' | tr -d "'")
        log_success "Policy version: ${POLICY_VERSION}"
    else
        log_warning "No version specified in policy"
    fi

    if grep -q "^name:" "$POLICY_FILE"; then
        log_success "Policy name defined"
    else
        log_warning "No policy name specified"
    fi

else
    log_error "Policy file not found: ${POLICY_FILE}"
    log_verbose "Create with: mkdir -p .governance && touch .governance/policy.yaml"
fi

# Check .governance directory
if [ -d .governance ]; then
    log_success ".governance directory exists"
else
    log_warning ".governance directory not found"
    log_verbose "Create with: mkdir -p .governance"
fi

echo ""

# =============================================================================
# Git Hooks Checks
# =============================================================================

echo "${BOLD}Git Hooks Checks${NC}"
echo "─────────────────────────────────────────────────────"

if [ -d .git ]; then
    # Check .husky directory
    if [ -d .husky ]; then
        log_success ".husky directory exists"
    else
        log_warning ".husky directory not found"
        log_verbose "Initialize with: npx husky init"
    fi

    # Check pre-commit hook
    if [ -f .husky/pre-commit ]; then
        log_success "Pre-commit hook exists"

        if [ -x .husky/pre-commit ]; then
            log_success "Pre-commit hook is executable"
        else
            log_error "Pre-commit hook is not executable"
            log_verbose "Fix with: chmod +x .husky/pre-commit"
        fi

        if grep -q "npx governance" .husky/pre-commit; then
            log_success "Pre-commit hook calls governance"
        else
            log_warning "Pre-commit hook doesn't call governance"
        fi
    else
        log_warning "Pre-commit hook not found"
        log_verbose "Create with: ./scripts/setup-hooks.sh"
    fi

    # Check other hooks
    if [ -f .husky/pre-push ]; then
        log_success "Pre-push hook exists"
    fi

    if [ -f .husky/commit-msg ]; then
        log_success "Commit-msg hook exists"
    fi
else
    log_info "Skipping git hooks checks (not a git repository)"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "${BOLD}Validation Summary${NC}"
echo "─────────────────────────────────────────────────────"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    EXIT_CODE=0
    cat << EOF
${GREEN}${BOLD}
✅  ALL CHECKS PASSED!

Your governance engine is correctly configured and ready to use.
${NC}
EOF
elif [ $ERRORS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
    EXIT_CODE=2
    cat << EOF
${YELLOW}${BOLD}
⚠️  VALIDATION COMPLETED WITH WARNINGS

Warnings: ${WARNINGS}

Your governance engine is functional but has minor issues.
Review warnings above for improvements.
${NC}
EOF
else
    EXIT_CODE=1
    cat << EOF
${RED}${BOLD}
❌  VALIDATION FAILED

Errors: ${ERRORS}
Warnings: ${WARNINGS}

Critical issues detected. Please fix errors above before proceeding.
${NC}
EOF
fi

echo ""
echo "${BLUE}Next Steps:${NC}"

if [ $ERRORS -gt 0 ]; then
    echo "  1. Fix critical errors listed above"
    echo "  2. Re-run validation: ./validate-config.sh"
    echo "  3. If issues persist, see: https://github.com/DLTKEngineering/governance-engine/issues"
elif [ $WARNINGS -gt 0 ]; then
    echo "  1. Review warnings (optional improvements)"
    echo "  2. Test governance: npx governance check"
    echo "  3. Make a test commit to verify hooks"
else
    echo "  1. Test governance: npx governance check"
    echo "  2. Make a test commit to verify hooks work"
    echo "  3. Customize policy: editor ${POLICY_FILE}"
fi

echo ""

if [ "$VERBOSE" = true ]; then
    echo "${BLUE}Verbose Mode Enabled${NC}"
    echo "  Detailed diagnostics shown above"
    echo ""
fi

exit $EXIT_CODE
