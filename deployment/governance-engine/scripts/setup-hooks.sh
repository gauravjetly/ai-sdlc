#!/bin/bash
# =============================================================================
# Vintiq Governance Engine - Git Hooks Setup Script
# =============================================================================
# This script sets up git hooks for governance policy enforcement.
# It can be run standalone or as part of the main installation.
#
# Usage: ./setup-hooks.sh [--force] [--hook-type=pre-commit]
#
# Options:
#   --force          Overwrite existing hooks without prompting
#   --hook-type=TYPE Setup specific hook (pre-commit, pre-push, commit-msg)
#   --no-verify      Add option to bypass hooks in instructions
#   --help           Show this help message
#
# =============================================================================

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FORCE=false
HOOK_TYPE="pre-commit"
SHOW_BYPASS=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --hook-type=*)
            HOOK_TYPE="${1#*=}"
            shift
            ;;
        --no-verify)
            SHOW_BYPASS=false
            shift
            ;;
        --help)
            cat << EOF
Vintiq Governance Engine - Git Hooks Setup

Usage: ./setup-hooks.sh [options]

Options:
  --force             Overwrite existing hooks without prompting
  --hook-type=TYPE    Setup specific hook (pre-commit, pre-push, commit-msg)
  --no-verify         Don't show bypass instructions
  --help              Show this help message

Examples:
  ./setup-hooks.sh                          # Interactive setup
  ./setup-hooks.sh --force                  # Force overwrite
  ./setup-hooks.sh --hook-type=pre-push     # Setup pre-push hook

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
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Pre-flight Checks
# =============================================================================

log_info "Setting up governance git hooks..."
echo ""

# Check if in git repository
if [ ! -d .git ]; then
    log_error "Not a git repository. Initialize git first: git init"
    exit 1
fi

# Check if governance engine is installed
if ! npm list @vintiq/governance-engine &>/dev/null; then
    log_error "Governance engine not installed. Run: npm install --save-dev @vintiq/governance-engine"
    exit 1
fi

# Check if npx is available
if ! command -v npx &>/dev/null; then
    log_error "npx not found. Please install npm."
    exit 1
fi

log_success "Pre-flight checks passed"
echo ""

# =============================================================================
# Install Husky
# =============================================================================

log_info "Checking for husky..."

if ! npm list husky &>/dev/null; then
    log_info "Installing husky..."
    npm install --save-dev husky
    log_success "Husky installed"
else
    log_info "Husky already installed"
fi

# Initialize husky
log_info "Initializing husky..."
if npx husky init 2>/dev/null; then
    log_success "Husky initialized"
else
    log_info "Husky already initialized"
fi

echo ""

# =============================================================================
# Create Pre-Commit Hook
# =============================================================================

if [ "$HOOK_TYPE" = "pre-commit" ] || [ "$HOOK_TYPE" = "all" ]; then
    HOOK_FILE=".husky/pre-commit"

    log_info "Setting up pre-commit hook..."

    if [ -f "$HOOK_FILE" ] && [ "$FORCE" = false ]; then
        log_warning "Pre-commit hook already exists"
        read -p "Overwrite? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing pre-commit hook"
        else
            log_info "Creating pre-commit hook..."
            create_precommit_hook
        fi
    else
        log_info "Creating pre-commit hook..."
        create_precommit_hook
    fi
fi

create_precommit_hook() {
    cat > .husky/pre-commit << 'EOF'
#!/bin/sh
# =============================================================================
# Vintiq Governance Engine - Pre-Commit Hook
# =============================================================================
# This hook runs before each commit to validate code against governance policies.
#
# To bypass (emergency only): git commit --no-verify
#
# =============================================================================

echo "🔍 Running governance checks..."
echo ""

# Run governance check on staged files
npx governance check --staged || {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌  GOVERNANCE CHECK FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Your commit violates one or more governance policies."
  echo "Please review and fix the violations listed above."
  echo ""
  echo "Common fixes:"
  echo "  • Remove hardcoded secrets/credentials"
  echo "  • Fix security vulnerabilities"
  echo "  • Ensure test coverage meets requirements"
  echo "  • Follow architecture layer rules"
  echo "  • Add required documentation"
  echo ""
  echo "For help, see: .governance/policy.yaml"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Emergency bypass (use with extreme caution):"
  echo "  git commit --no-verify"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 1
}

echo ""
echo "✅  All governance checks passed!"
echo ""

exit 0
EOF

    chmod +x .husky/pre-commit
    log_success "Pre-commit hook created"
}

# =============================================================================
# Create Pre-Push Hook (Optional)
# =============================================================================

if [ "$HOOK_TYPE" = "pre-push" ] || [ "$HOOK_TYPE" = "all" ]; then
    HOOK_FILE=".husky/pre-push"

    log_info "Setting up pre-push hook..."

    if [ -f "$HOOK_FILE" ] && [ "$FORCE" = false ]; then
        log_warning "Pre-push hook already exists"
        read -p "Overwrite? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing pre-push hook"
        else
            create_prepush_hook
        fi
    else
        create_prepush_hook
    fi
fi

create_prepush_hook() {
    cat > .husky/pre-push << 'EOF'
#!/bin/sh
# =============================================================================
# Vintiq Governance Engine - Pre-Push Hook
# =============================================================================
# This hook runs before pushing to remote to ensure quality gates are met.
#
# To bypass (emergency only): git push --no-verify
#
# =============================================================================

echo "🚀 Running pre-push quality checks..."
echo ""

# Run full test suite
echo "Running tests..."
npm test || {
  echo "❌ Tests failed. Fix tests before pushing."
  exit 1
}

# Run type check
echo "Running type check..."
npm run type-check || {
  echo "❌ Type check failed. Fix type errors before pushing."
  exit 1
}

# Run linter
echo "Running linter..."
npm run lint || {
  echo "❌ Linting failed. Fix lint errors before pushing."
  exit 1
}

# Run governance check
echo "Running governance check..."
npx governance check || {
  echo "❌ Governance check failed. Fix policy violations before pushing."
  exit 1
}

echo ""
echo "✅  All pre-push checks passed!"
echo ""

exit 0
EOF

    chmod +x .husky/pre-push
    log_success "Pre-push hook created"
}

# =============================================================================
# Create Commit-Msg Hook (Optional)
# =============================================================================

if [ "$HOOK_TYPE" = "commit-msg" ] || [ "$HOOK_TYPE" = "all" ]; then
    HOOK_FILE=".husky/commit-msg"

    log_info "Setting up commit-msg hook..."

    if [ -f "$HOOK_FILE" ] && [ "$FORCE" = false ]; then
        log_warning "Commit-msg hook already exists"
        read -p "Overwrite? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing commit-msg hook"
        else
            create_commitmsg_hook
        fi
    else
        create_commitmsg_hook
    fi
fi

create_commitmsg_hook() {
    cat > .husky/commit-msg << 'EOF'
#!/bin/sh
# =============================================================================
# Vintiq Governance Engine - Commit Message Hook
# =============================================================================
# This hook validates commit messages against the conventional commits format.
#
# =============================================================================

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Skip merge commits
if echo "$COMMIT_MSG" | grep -qE "^Merge "; then
  exit 0
fi

# Validate format: type(scope): description
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z-]+\))?!?: .{10,100}"; then
  echo "❌ Invalid commit message format"
  echo ""
  echo "Commit messages must follow Conventional Commits:"
  echo "  <type>(<scope>): <description>"
  echo ""
  echo "Types:"
  echo "  feat:     New feature"
  echo "  fix:      Bug fix"
  echo "  docs:     Documentation only"
  echo "  style:    Code style changes"
  echo "  refactor: Code refactoring"
  echo "  perf:     Performance improvement"
  echo "  test:     Adding tests"
  echo "  build:    Build system changes"
  echo "  ci:       CI configuration"
  echo "  chore:    Maintenance tasks"
  echo ""
  echo "Examples:"
  echo "  feat(auth): add OAuth 2.0 support"
  echo "  fix(api): resolve null pointer in user service"
  echo "  docs: update README with new examples"
  echo ""
  exit 1
fi

exit 0
EOF

    chmod +x .husky/commit-msg
    log_success "Commit-msg hook created"
}

# =============================================================================
# Test Hooks
# =============================================================================

echo ""
log_info "Testing hooks..."

# Test if hooks are executable
if [ -f .husky/pre-commit ] && [ -x .husky/pre-commit ]; then
    log_success "Pre-commit hook is executable"
else
    log_warning "Pre-commit hook may not be executable"
fi

if [ -f .husky/pre-push ] && [ -x .husky/pre-push ]; then
    log_success "Pre-push hook is executable"
fi

if [ -f .husky/commit-msg ] && [ -x .husky/commit-msg ]; then
    log_success "Commit-msg hook is executable"
fi

# =============================================================================
# Success Message
# =============================================================================

echo ""
cat << EOF
${GREEN}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║  ✅  Git Hooks Configured Successfully!                           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${NC}

${BLUE}Hooks Installed:${NC}
EOF

if [ -f .husky/pre-commit ]; then
    echo "  ✓ Pre-commit hook (.husky/pre-commit)"
fi

if [ -f .husky/pre-push ]; then
    echo "  ✓ Pre-push hook (.husky/pre-push)"
fi

if [ -f .husky/commit-msg ]; then
    echo "  ✓ Commit-msg hook (.husky/commit-msg)"
fi

echo ""
echo "${BLUE}How It Works:${NC}"
echo "  • Pre-commit: Runs before each commit to validate code"
echo "  • Pre-push: Runs before pushing to ensure quality"
echo "  • Commit-msg: Validates commit message format"
echo ""
echo "${BLUE}Test It:${NC}"
echo "  ${YELLOW}git commit -m \"test: trying out governance hooks\"${NC}"
echo ""

if [ "$SHOW_BYPASS" = true ]; then
    echo "${YELLOW}Emergency Bypass (use with caution):${NC}"
    echo "  ${YELLOW}git commit --no-verify${NC}"
    echo "  ${YELLOW}git push --no-verify${NC}"
    echo ""
fi

echo "${GREEN}Your code is now protected by governance policies!${NC} 🛡️"
echo ""

exit 0
