# Git Hooks Setup Guide

Complete guide for setting up and managing git hooks with the Deltek Governance Engine.

## Table of Contents

- [What Are Git Hooks?](#what-are-git-hooks)
- [Available Hooks](#available-hooks)
- [Setup Methods](#setup-methods)
- [Hook Configuration](#hook-configuration)
- [Team Integration](#team-integration)
- [Troubleshooting](#troubleshooting)

## What Are Git Hooks?

Git hooks are scripts that run automatically at certain points in the Git workflow. The Governance Engine uses hooks to validate code before commits and pushes.

### Benefits

- **Automatic Validation**: No need to remember to run checks
- **Fast Feedback**: Catch issues before they reach remote
- **Consistent Standards**: Everyone follows the same rules
- **Time Savings**: Prevents failed CI builds

### Hook Types We Use

| Hook | When It Runs | Purpose |
|------|-------------|---------|
| `pre-commit` | Before commit is created | Validate staged changes |
| `commit-msg` | After commit message entered | Validate message format |
| `pre-push` | Before push to remote | Final quality gate |
| `post-merge` | After pulling/merging | Update dependencies |

## Available Hooks

### Pre-Commit Hook (Recommended)

**Runs**: Before each `git commit`
**Checks**: Staged files only
**Speed**: Fast (only changed files)

```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 Running governance checks on staged files..."

npx governance check --staged || {
  echo ""
  echo "❌ Governance check failed!"
  echo "Fix violations or bypass with: git commit --no-verify"
  exit 1
}

echo "✅ All checks passed!"
```

**What it catches**:
- Hardcoded secrets
- Security vulnerabilities
- Architecture violations
- Missing tests
- Linting errors

### Commit-Msg Hook (Optional)

**Runs**: After entering commit message
**Checks**: Commit message format
**Speed**: Instant

```bash
#!/bin/sh
# .husky/commit-msg

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Validate Conventional Commits format
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z-]+\))?!?: .{10,100}"; then
  cat << EOF

❌ Invalid commit message format

Required format:
  <type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Examples:
  feat(auth): add OAuth 2.0 support
  fix(api): resolve null pointer exception
  docs: update installation guide

Your message:
  $COMMIT_MSG

EOF
  exit 1
fi
```

**What it validates**:
- Conventional Commits format
- Minimum message length
- Required type prefix
- Optional scope
- Description clarity

### Pre-Push Hook (Advanced)

**Runs**: Before `git push`
**Checks**: Full test suite
**Speed**: Slower (comprehensive)

```bash
#!/bin/sh
# .husky/pre-push

echo "🚀 Running pre-push quality gates..."

# Run tests
echo "▶ Running tests..."
npm test || {
  echo "❌ Tests failed"
  exit 1
}

# Type check
echo "▶ Type checking..."
npm run type-check || {
  echo "❌ Type errors found"
  exit 1
}

# Lint
echo "▶ Linting..."
npm run lint || {
  echo "❌ Lint errors found"
  exit 1
}

# Governance check (all files)
echo "▶ Governance check..."
npx governance check || {
  echo "❌ Policy violations found"
  exit 1
}

# Check coverage
echo "▶ Checking test coverage..."
npm run test:coverage -- --silent || {
  echo "❌ Insufficient test coverage"
  exit 1
}

echo "✅ All pre-push checks passed!"
```

**What it checks**:
- Unit tests pass
- Integration tests pass
- Type safety
- Linting
- Test coverage
- Policy compliance
- Build succeeds

### Post-Merge Hook (Optional)

**Runs**: After `git pull` or `git merge`
**Checks**: Dependencies updated
**Speed**: Fast

```bash
#!/bin/sh
# .husky/post-merge

echo "📦 Checking for dependency updates..."

# Check if package-lock.json changed
if git diff HEAD@{1} --name-only | grep -q "package-lock.json"; then
  echo "Dependencies changed, running npm install..."
  npm install
fi

# Check if policy changed
if git diff HEAD@{1} --name-only | grep -q ".governance/policy.yaml"; then
  echo "Policy updated, validating..."
  npx governance validate .governance/policy.yaml
fi
```

## Setup Methods

### Method 1: Automated Script (Recommended)

Use the provided setup script:

```bash
# Setup all hooks
/path/to/deployment/governance-engine/scripts/setup-hooks.sh

# Setup specific hook
./scripts/setup-hooks.sh --hook-type=pre-commit

# Force overwrite existing
./scripts/setup-hooks.sh --force
```

### Method 2: Manual Setup with Husky

```bash
# 1. Install husky
npm install --save-dev husky

# 2. Initialize husky
npx husky init

# 3. Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
npx governance check --staged || exit 1
EOF

# 4. Make executable
chmod +x .husky/pre-commit

# 5. Test it
git add .
git commit -m "test: verify hooks work"
```

### Method 3: Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky install",
    "postinstall": "husky install"
  }
}
```

When teammates clone:
```bash
npm install  # Hooks auto-setup
```

### Method 4: Native Git Hooks (Not Recommended)

```bash
# Create .git/hooks/pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npx governance check --staged || exit 1
EOF

chmod +x .git/hooks/pre-commit
```

> ⚠️ **Problem**: `.git/hooks/` is not version controlled. Use Husky instead.

## Hook Configuration

### Customize Pre-Commit Behavior

#### Check Only Specific File Types

```bash
#!/bin/sh
# .husky/pre-commit

# Get staged TypeScript/JavaScript files
FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$')

if [ -n "$FILES" ]; then
  echo "$FILES" | xargs npx governance check || exit 1
fi
```

#### Skip Tests in Pre-Commit (Run in Pre-Push)

```bash
#!/bin/sh
# .husky/pre-commit

# Quick checks only
npx governance check --staged --skip-tests || exit 1
npx eslint --max-warnings 0 $(git diff --cached --name-only) || exit 1
```

#### Progressive Enhancement

Start with warnings only, gradually enforce:

```bash
#!/bin/sh
# .husky/pre-commit

# Week 1-2: Warnings only
npx governance check --staged --severity=warn

# Week 3-4: Block errors only
# npx governance check --staged --min-severity=error || exit 1

# Week 5+: Block all violations
# npx governance check --staged || exit 1
```

### Customize Commit Message Validation

#### Project-Specific Format

```bash
#!/bin/sh
# .husky/commit-msg

COMMIT_MSG=$(cat $1)

# Require JIRA ticket
if ! echo "$COMMIT_MSG" | grep -qE "^[A-Z]+-[0-9]+:"; then
  echo "❌ Commit must start with JIRA ticket (e.g., PROJ-123: description)"
  exit 1
fi

# Minimum length
if [ ${#COMMIT_MSG} -lt 20 ]; then
  echo "❌ Commit message too short (minimum 20 characters)"
  exit 1
fi
```

#### Skip Validation for Merges

```bash
#!/bin/sh
# .husky/commit-msg

COMMIT_MSG=$(cat $1)

# Skip merge commits
if echo "$COMMIT_MSG" | grep -qE "^Merge "; then
  exit 0
fi

# Validate regular commits
npx governance validate-commit "$1" || exit 1
```

### Performance Optimization

#### Cache Results

```bash
#!/bin/sh
# .husky/pre-commit

# Enable caching
export GOVERNANCE_CACHE_ENABLED=true
export GOVERNANCE_CACHE_TTL=3600

npx governance check --staged --cache || exit 1
```

#### Parallel Execution

```bash
#!/bin/sh
# .husky/pre-commit

# Run checks in parallel
npx governance check --staged &
PID1=$!

npm run type-check &
PID2=$!

npx eslint $(git diff --cached --name-only) &
PID3=$!

# Wait for all
wait $PID1 || exit 1
wait $PID2 || exit 1
wait $PID3 || exit 1
```

#### Skip Slow Checks

```bash
#!/bin/sh
# .husky/pre-commit

# Fast checks only
npx governance check --staged --skip-slow || exit 1

# Slow checks in pre-push
```

## Team Integration

### Onboarding New Developers

**Step 1**: Clone repository
```bash
git clone <repo-url>
cd <repo>
```

**Step 2**: Install dependencies
```bash
npm install  # Hooks auto-installed via postinstall script
```

**Step 3**: Verify hooks
```bash
# Check if hooks exist
ls -la .husky/

# Test pre-commit
git add README.md
git commit -m "test: verify hooks" --dry-run
```

**Step 4**: First commit
```bash
# Make a change
echo "test" >> test.txt
git add test.txt

# Commit (hooks will run)
git commit -m "chore: test governance hooks"

# If it fails, fix violations
npx governance check test.txt
```

### Team Standards

#### Commit `.husky/` Directory

```bash
# Add to git
git add .husky/
git commit -m "chore: add governance git hooks"
git push
```

Everyone who clones gets the same hooks.

#### Document Bypass Procedure

Create `CONTRIBUTING.md`:

```markdown
## Git Hooks

Pre-commit hooks validate code quality. If they fail:

1. **Fix the violations** (preferred):
   ```bash
   npx governance check --verbose  # See details
   # Fix issues
   git add .
   git commit
   ```

2. **Emergency bypass** (requires justification):
   ```bash
   git commit --no-verify -m "hotfix: critical production issue"
   # Must document why in PR
   ```

Bypassing hooks is logged and will be reviewed.
```

#### Setup CI Check

Even with hooks, validate in CI (hooks can be bypassed):

```yaml
# .github/workflows/ci.yml
- name: Verify Governance
  run: npx governance check
```

### Handling Disagreements

If developers disagree with a rule:

1. **Document the case**: Collect examples
2. **Discuss with team**: Weekly governance review
3. **Propose change**: PR to policy file
4. **Get approval**: From tech lead/architect
5. **Update policy**: Merge and communicate

```yaml
# .governance/policy.yaml

# Add exception with reason
code_quality:
  test_coverage:
    exceptions:
      - pattern: "**/legacy/**"
        reason: "Legacy code being refactored"
        expires: "2024-12-31"
        approved_by: "tech-lead@company.com"
```

## Troubleshooting

### Hook Not Running

**Symptom**: Commit succeeds without running checks

**Debug**:
```bash
# Check if hook exists
ls -la .husky/pre-commit

# Check if executable
test -x .husky/pre-commit && echo "Executable" || echo "Not executable"

# Check husky is installed
npm list husky

# Check git config
git config core.hooksPath
```

**Fix**:
```bash
# Re-initialize husky
rm -rf .husky
npx husky init

# Recreate hook
./scripts/setup-hooks.sh --force

# Verify
git add .
git commit --dry-run -m "test"
```

### Hook Fails Every Time

**Symptom**: Can't commit anything

**Debug**:
```bash
# Run governance manually
npx governance check --staged --verbose

# Check specific file
npx governance check path/to/file.ts --verbose

# Validate policy
npx governance validate .governance/policy.yaml
```

**Fix**:
```bash
# See what's failing
npx governance check --staged --verbose

# Fix the violations
# OR adjust policy if false positive

# Temporary: Use warning mode
npx governance check --staged --severity=warn
```

### "Permission Denied" Error

**Symptom**: `Permission denied: .husky/pre-commit`

**Fix**:
```bash
# Make executable
chmod +x .husky/pre-commit
chmod +x .husky/*

# Verify
ls -la .husky/
```

### Hook Runs But Check Skipped

**Symptom**: Hook runs but governance check doesn't execute

**Debug**:
```bash
# Check if governance is installed
npm list @deltek/governance-engine

# Check if CLI works
npx governance --version

# Run hook manually
.husky/pre-commit
```

**Fix**:
```bash
# Re-install governance engine
npm install --save-dev @deltek/governance-engine

# Update hook to use full path
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
npx --no-install governance check --staged || exit 1
EOF
```

### Slow Hook Performance

**Symptom**: Hook takes too long

**Solutions**:

1. **Check only staged files**:
   ```bash
   npx governance check --staged  # Not all files
   ```

2. **Enable caching**:
   ```bash
   export GOVERNANCE_CACHE_ENABLED=true
   ```

3. **Skip slow checks in pre-commit**:
   ```bash
   npx governance check --staged --skip-tests
   ```

4. **Move comprehensive checks to pre-push**:
   ```bash
   # pre-commit: fast checks
   # pre-push: slow checks
   ```

### Bypassing Hooks

**Emergency only**:
```bash
git commit --no-verify -m "hotfix: critical issue"
```

**Permanent disable** (not recommended):
```bash
git config core.hooksPath /dev/null
```

**Re-enable**:
```bash
git config --unset core.hooksPath
```

## Best Practices

### DO

✅ Keep pre-commit fast (< 10 seconds)
✅ Run comprehensive checks in pre-push
✅ Provide clear error messages
✅ Allow emergency bypass with `--no-verify`
✅ Log all bypasses for review
✅ Validate hooks in CI too
✅ Document bypass procedures
✅ Commit hooks to repository

### DON'T

❌ Put slow tests in pre-commit
❌ Block commits for warnings
❌ Hide error details from developers
❌ Make bypass too easy
❌ Forget to validate in CI
❌ Leave hooks undocumented
❌ Use non-version-controlled hooks

## Additional Resources

- **Husky Documentation**: https://typicode.github.io/husky/
- **Git Hooks Reference**: https://git-scm.com/docs/githooks
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Team Support**: #engineering-governance Slack channel

---

**Hooks configured!** Your commits are now protected by governance policies. 🛡️
