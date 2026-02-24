# Troubleshooting Guide

Common issues and solutions for the Vintiq Governance Engine.

## Quick Diagnostics

Run the validation script first:

```bash
/path/to/deployment/governance-engine/scripts/validate-config.sh --verbose
```

This checks:
- Node.js and npm versions
- Package installation
- Policy file validity
- Git hooks configuration
- CLI functionality

## Common Issues

### Installation Issues

#### Issue: "npm ERR! 404 Not Found - GET https://registry.npmjs.org/@vintiq%2fgovernance-engine"

**Cause**: Package not published to npm yet

**Solution**:
```bash
# Install from local path
npm install --save-dev /path/to/aisdlc-2.1.0/src/governance-engine

# Or link locally
cd /path/to/aisdlc-2.1.0/src/governance-engine
npm link

cd /path/to/your/project
npm link @vintiq/governance-engine
```

#### Issue: "Node.js version too old"

**Cause**: Node.js < 18.0.0

**Solution**:
```bash
# Check version
node --version

# Update Node.js
# Using nvm (recommended):
nvm install 20
nvm use 20

# Using package manager:
brew install node@20          # macOS
sudo apt install nodejs       # Ubuntu
choco install nodejs          # Windows
```

#### Issue: "Permission denied during installation"

**Cause**: Insufficient permissions

**Solution**:
```bash
# Don't use sudo with npm!
# Fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to ~/.bashrc or ~/.zshrc:
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

### Configuration Issues

#### Issue: "Policy file not found"

**Cause**: Missing `.governance/policy.yaml`

**Solution**:
```bash
# Create directory
mkdir -p .governance

# Download policy
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/policies/vintiq-engineering.yaml > .governance/policy.yaml

# Or copy from template
cp /path/to/deployment/governance-engine/policies/vintiq-engineering.yaml .governance/policy.yaml

# Verify
ls -la .governance/policy.yaml
npx governance validate .governance/policy.yaml
```

#### Issue: "Policy validation failed"

**Cause**: Invalid YAML syntax or schema

**Solution**:
```bash
# Check YAML syntax
npx js-yaml .governance/policy.yaml

# See specific errors
npx governance validate .governance/policy.yaml --verbose

# Common fixes:
# 1. Fix indentation (use spaces, not tabs)
# 2. Quote special characters
# 3. Check for missing colons
# 4. Validate against schema
```

**Example fixes**:
```yaml
# ❌ Wrong: Missing quotes
pattern: ^[a-z]+$

# ✅ Correct: Quoted
pattern: "^[a-z]+$"

# ❌ Wrong: Tabs for indentation
repository:
→   branch_naming:

# ✅ Correct: Spaces for indentation
repository:
  branch_naming:
```

#### Issue: "Cannot find module '@vintiq/governance-engine'"

**Cause**: Package not installed or node_modules corrupted

**Solution**:
```bash
# Verify installation
npm list @vintiq/governance-engine

# If not installed:
npm install --save-dev @vintiq/governance-engine

# If corrupted:
rm -rf node_modules package-lock.json
npm install
```

### Git Hooks Issues

#### Issue: "Pre-commit hook not running"

**Cause**: Hook not executable or husky not configured

**Solution**:
```bash
# Check if hook exists
ls -la .husky/pre-commit

# Make executable
chmod +x .husky/pre-commit

# Check git config
git config core.hooksPath
# Should show: .husky

# Re-initialize husky
rm -rf .husky
npx husky init
./scripts/setup-hooks.sh --force

# Test
git add .
git commit --dry-run -m "test"
```

#### Issue: "Hook runs but governance check skipped"

**Cause**: npx not finding governance package

**Solution**:
```bash
# Verify governance CLI works
npx governance --version

# Update hook to be explicit:
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
PATH="$PATH:./node_modules/.bin"
npx --no-install @vintiq/governance-engine check --staged || exit 1
EOF

chmod +x .husky/pre-commit
```

#### Issue: "Permission denied: .husky/pre-commit"

**Cause**: Hook file not executable

**Solution**:
```bash
# Fix permissions
chmod +x .husky/pre-commit
chmod +x .husky/*

# Verify
ls -la .husky/

# Should show: -rwxr-xr-x (executable)
```

#### Issue: "Hook fails with 'command not found: npx'"

**Cause**: PATH not set correctly in hook

**Solution**:
```bash
# Update hook to set PATH:
cat > .husky/pre-commit << 'EOF'
#!/bin/sh

# Ensure PATH includes node binaries
export PATH="/usr/local/bin:$HOME/.nvm/versions/node/v20.0.0/bin:$PATH"

# Or source profile
[ -f ~/.bashrc ] && . ~/.bashrc
[ -f ~/.zshrc ] && . ~/.zshrc

npx governance check --staged || exit 1
EOF
```

### Runtime Issues

#### Issue: "Governance check hangs forever"

**Cause**: Checking too many files or stuck on large file

**Solution**:
```bash
# Check with timeout
timeout 30s npx governance check

# Check with verbose to see progress
npx governance check --verbose

# Exclude large directories
npx governance check --exclude='node_modules/**' --exclude='dist/**'

# Check specific files
npx governance check src/
```

#### Issue: "Out of memory error"

**Cause**: Large codebase or memory leak

**Solution**:
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npx governance check

# Or in package.json:
{
  "scripts": {
    "check": "NODE_OPTIONS='--max-old-space-size=4096' governance check"
  }
}

# Check in batches
find src -name "*.ts" | xargs -n 50 npx governance check
```

#### Issue: "Check reports violations in node_modules/"

**Cause**: Not excluding dependencies

**Solution**:
```bash
# Add to .governance/config.json:
{
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**",
    "*.min.js"
  ]
}

# Or via CLI:
npx governance check --exclude='node_modules/**'
```

### Policy Issues

#### Issue: "Too many violations blocking development"

**Cause**: Strict policy or legacy code

**Solutions**:

**Option 1: Use warning mode temporarily**
```bash
npx governance check --severity=warn
```

**Option 2: Add exceptions to policy**
```yaml
code_quality:
  test_coverage:
    exceptions:
      - pattern: "**/legacy/**"
        reason: "Legacy code being refactored"
```

**Option 3: Gradual enforcement**
```yaml
enforcement:
  rollout:
    percentage: 50  # Only enforce on 50% of checks
    start_date: "2024-01-01"
    full_enforcement_date: "2024-03-01"
```

**Option 4: Relax thresholds**
```yaml
code_quality:
  test_coverage:
    minimum_total: 60  # Lower from 80%
  complexity:
    cyclomatic:
      max: 15  # Increase from 10
```

#### Issue: "False positive security violation"

**Cause**: Pattern matching too broad

**Solution**:
```yaml
# Add specific exception
security:
  secrets:
    no_hardcoded: true
    exceptions:
      - pattern: "**/*.test.ts"
        reason: "Test fixtures may contain fake credentials"
      - pattern: "**/constants.ts"
        rule: "API_ENDPOINT"
        reason: "Public API endpoints, not secrets"
```

**Report false positives**:
```bash
# Create issue with example
npx governance check --verbose src/problem-file.ts > violation.txt
# Attach violation.txt to GitHub issue
```

#### Issue: "Architecture violation in legitimate case"

**Cause**: Valid cross-layer dependency

**Solution**:
```yaml
architecture:
  layers:
    domain:
      forbidden_dependencies:
        - "infrastructure"
      exceptions:
        - from: "domain/events"
          to: "infrastructure/messaging"
          reason: "Event bus abstraction requires infrastructure"
          approved_by: "architect@company.com"
```

### CI/CD Issues

#### Issue: "CI check passes but git hook fails"

**Cause**: Different policy versions or configurations

**Solution**:
```bash
# Ensure same policy in CI
# In CI config:
- name: Validate Policy
  run: |
    npx governance validate .governance/policy.yaml
    md5sum .governance/policy.yaml

# Compare with local:
md5sum .governance/policy.yaml
```

#### Issue: "CI times out during governance check"

**Cause**: Too many files or slow checks

**Solution**:
```yaml
# GitHub Actions: Increase timeout
jobs:
  governance:
    timeout-minutes: 15  # Default is 10

# Split checks:
jobs:
  governance-security:
    steps:
      - run: npx governance check --checks=security

  governance-quality:
    steps:
      - run: npx governance check --checks=quality
```

#### Issue: "Different results in CI vs local"

**Cause**: Different Node.js versions or dependencies

**Solution**:
```yaml
# Pin Node.js version in CI
- uses: actions/setup-node@v3
  with:
    node-version: '20.9.0'  # Match local

# Use exact dependency versions
npm ci  # Not npm install

# Lock governance version
{
  "devDependencies": {
    "@vintiq/governance-engine": "1.0.0"  # Exact version
  }
}
```

### Performance Issues

#### Issue: "Governance check is too slow"

**Symptoms**: Takes > 30 seconds for pre-commit

**Solutions**:

**1. Check only staged files**:
```bash
npx governance check --staged  # Not all files
```

**2. Enable caching**:
```bash
export GOVERNANCE_CACHE_ENABLED=true
npx governance check --cache
```

**3. Skip slow checks in pre-commit**:
```bash
# pre-commit: Fast checks only
npx governance check --staged --skip-tests --skip-coverage

# pre-push: Comprehensive checks
npx governance check --all
```

**4. Parallel execution**:
```bash
#!/bin/sh
# .husky/pre-commit

npx governance check --staged --checks=security &
PID1=$!

npx governance check --staged --checks=architecture &
PID2=$!

wait $PID1 || exit 1
wait $PID2 || exit 1
```

**5. Profile to find bottleneck**:
```bash
npx governance check --profile
# Shows time spent in each checker
```

### Team Collaboration Issues

#### Issue: "Teammate can't commit after pull"

**Cause**: Hooks not installed after pull

**Solution**:
```bash
# Add to package.json:
{
  "scripts": {
    "postinstall": "husky install"
  }
}

# Tell teammate:
npm install  # Re-run to install hooks
```

#### Issue: "Different violations for same code"

**Cause**: Different policy versions

**Solution**:
```bash
# Check policy version
grep "^version:" .governance/policy.yaml

# Everyone pull latest:
git pull origin main

# Verify policy hash matches:
md5sum .governance/policy.yaml
# All team members should see same hash
```

#### Issue: "Disagreement about policy rule"

**Resolution process**:

1. **Document the case**:
   ```bash
   # Create issue with example
   npx governance check problem-file.ts > example.txt
   ```

2. **Propose change**:
   ```yaml
   # .governance/policy.yaml
   # Add comment explaining proposed change
   code_quality:
     # PROPOSAL: Lower test coverage for UI components
     # Reason: UI tests are slow and flaky
     # Alternative: Use E2E tests instead
     test_coverage:
       by_layer:
         presentation: 60  # Proposed: lower from 70%
   ```

3. **Get approval**:
   - Open PR with policy change
   - Tag architect and tech lead
   - Include justification and examples

4. **Rollout**:
   - Merge after approval
   - Announce in #engineering
   - Update documentation

## Debug Mode

Enable detailed logging:

```bash
# Set log level
export GOVERNANCE_LOG_LEVEL=debug

# Run with verbose flag
npx governance check --verbose

# Save debug output
npx governance check --verbose &> debug.log

# Profile performance
npx governance check --profile --verbose
```

## Validation Script

Use the comprehensive validator:

```bash
# Run full validation
./scripts/validate-config.sh --verbose

# Check specific components
./scripts/validate-config.sh 2>&1 | grep "ERROR"
./scripts/validate-config.sh 2>&1 | grep "WARN"
```

## Getting Help

### Self-Service

1. **Check this troubleshooting guide**
2. **Run validation script**: `./scripts/validate-config.sh --verbose`
3. **Search existing issues**: https://github.com/DLTKEngineering/governance-engine/issues
4. **Check FAQ**: See [FAQ.md](./FAQ.md)

### Community Support

1. **Slack**: #engineering-governance
   - Quick questions
   - Share solutions
   - Community help

2. **GitHub Issues**: https://github.com/DLTKEngineering/governance-engine/issues
   - Bug reports
   - Feature requests
   - Detailed troubleshooting

3. **Email**: engineering-governance@vintiq.com
   - Policy questions
   - Compliance concerns
   - Escalations

### Creating a Bug Report

Include:

1. **Environment**:
   ```bash
   node --version
   npm --version
   npx governance --version
   uname -a  # OS info
   ```

2. **Policy version**:
   ```bash
   head -n 5 .governance/policy.yaml
   ```

3. **Reproduction steps**:
   ```bash
   # Exact commands that trigger issue
   npx governance check --verbose
   ```

4. **Expected vs actual behavior**

5. **Logs**:
   ```bash
   npx governance check --verbose &> error.log
   # Attach error.log
   ```

6. **Minimal reproduction**:
   ```javascript
   // Smallest code sample that shows issue
   const x = "test";
   ```

## Common Error Messages

### "EACCES: permission denied"

**Fix**:
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### "Cannot read property 'version' of undefined"

**Fix**:
```bash
# Corrupted package-lock.json
rm package-lock.json node_modules -rf
npm install
```

### "Unexpected token in JSON"

**Fix**:
```bash
# Corrupted config file
# Validate JSON:
cat .governance/config.json | jq .

# If invalid, recreate:
rm .governance/config.json
# Use YAML policy only
```

### "Maximum call stack size exceeded"

**Fix**:
```bash
# Circular dependency in policy
npx governance validate .governance/policy.yaml --check-circular

# Or increase stack size
node --stack-size=2000 ./node_modules/.bin/governance check
```

## Still Stuck?

If none of these solutions work:

1. **Collect diagnostics**:
   ```bash
   ./scripts/validate-config.sh --verbose > diagnostics.txt
   npx governance check --verbose >> diagnostics.txt 2>&1
   npm list >> diagnostics.txt
   ```

2. **Contact support**:
   - Slack: #engineering-governance
   - Email: engineering-governance@vintiq.com
   - Attach: diagnostics.txt

3. **Emergency bypass** (last resort):
   ```bash
   git commit --no-verify
   # Must document reason in commit message
   # Will be reviewed
   ```

---

**Most issues can be resolved with the validation script and this guide.** If you find a solution not listed here, please contribute back! 🙏
