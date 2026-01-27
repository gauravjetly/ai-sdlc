# Deltek Governance Engine - Installation Guide

Complete guide for installing and configuring the Governance Engine across different environments and scenarios.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation Methods](#installation-methods)
- [Configuration](#configuration)
- [Policy Customization](#policy-customization)
- [Git Hooks Setup](#git-hooks-setup)
- [CI/CD Integration](#cicd-integration)
- [Team Rollout](#team-rollout)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

| Component | Minimum Version | Recommended |
|-----------|----------------|-------------|
| Node.js | 18.0.0 | 20.x LTS |
| npm | 8.0.0 | 10.x |
| Git | 2.20.0 | Latest |
| OS | Linux, macOS, Windows | Any |

### Verify Requirements

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

### Disk Space

- Package size: ~5 MB
- With dependencies: ~25 MB
- Policy files: ~100 KB

## Installation Methods

### Method 1: Automated Installation Script

**Best for**: Quick setup, new projects

```bash
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/install.sh | bash
```

This script will:
1. Check prerequisites
2. Install the package
3. Download the policy
4. Setup git hooks
5. Verify installation

### Method 2: npm Package Installation

**Best for**: Existing projects, manual control

```bash
# Install as dev dependency
npm install --save-dev @deltek/governance-engine

# Or with yarn
yarn add -D @deltek/governance-engine
```

Then setup policy and hooks:
```bash
# Create governance directory
mkdir -p .governance

# Download policy
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/policies/deltek-engineering.yaml > .governance/policy.yaml

# Setup hooks (see Git Hooks Setup section)
npx husky init
echo 'npx governance check --staged' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Method 3: Local Scripts

**Best for**: Internal deployment, offline installation

```bash
cd /path/to/your/project

# Run installation script
/path/to/aisdlc-2.1.0/deployment/governance-engine/scripts/install-governance.sh
```

### Method 4: Monorepo Installation

**Best for**: Workspaces, Lerna, Nx monorepos

```bash
# Install at root
npm install --save-dev @deltek/governance-engine -w

# Or for specific workspace
npm install --save-dev @deltek/governance-engine -w packages/my-package
```

Create policy at root:
```bash
mkdir -p .governance
curl -fsSL <policy-url> > .governance/policy.yaml
```

Git hooks apply to entire repo from root.

### Method 5: Global Installation (Not Recommended)

```bash
# Install globally
npm install -g @deltek/governance-engine

# Can now run from anywhere
governance check /path/to/project
```

> ⚠️ **Warning**: Global installation doesn't integrate with pre-commit hooks. Use local installation for best results.

## Configuration

### Policy File Structure

The policy file (`.governance/policy.yaml`) defines all rules:

```yaml
version: "1.0.0"
name: "Deltek Engineering Standards"
description: "Mandatory governance policies"

# Repository rules
repository:
  allowed_organizations:
    - "github.com/DLTKEngineering"
  branch_naming:
    pattern: "^(feature|bugfix|hotfix)/[A-Z]+-[0-9]+"

# Architecture rules
architecture:
  mandatory_pattern: "layered"
  layers:
    domain:
      directory: "src/domain"
      forbidden_dependencies:
        - "infrastructure"

# Security rules
security:
  secrets:
    no_hardcoded: true
  encryption:
    at_rest:
      algorithm: "AES-256-GCM"

# Quality rules
code_quality:
  test_coverage:
    minimum_total: 80
  linting:
    zero_warnings: true
```

### Environment Variables

Configure via environment variables:

```bash
# Policy file location (default: .governance/policy.yaml)
export GOVERNANCE_POLICY_PATH="/path/to/custom-policy.yaml"

# Enable verbose logging
export GOVERNANCE_LOG_LEVEL="debug"

# Disable colored output
export GOVERNANCE_NO_COLOR="true"

# Custom cache directory
export GOVERNANCE_CACHE_DIR="/tmp/governance-cache"
```

Add to `.env`:
```bash
GOVERNANCE_POLICY_PATH=.governance/policy.yaml
GOVERNANCE_LOG_LEVEL=info
```

### Configuration File

Create `.governance/config.json`:

```json
{
  "policyPath": ".governance/policy.yaml",
  "logLevel": "info",
  "outputFormat": "text",
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**"
  ]
}
```

## Policy Customization

### Basic Customization

Copy the default policy and modify:

```bash
# Copy default policy
cp .governance/policy.yaml .governance/policy.custom.yaml

# Edit
editor .governance/policy.custom.yaml

# Use custom policy
npx governance check --policy=.governance/policy.custom.yaml
```

### Common Customizations

#### 1. Adjust Test Coverage Requirements

```yaml
code_quality:
  test_coverage:
    minimum_total: 70  # Lower from 80%
    by_layer:
      domain: 85       # Keep domain high
      presentation: 60 # Lower for UI
```

#### 2. Add Project-Specific Exclusions

```yaml
code_quality:
  test_coverage:
    exclude_patterns:
      - "**/legacy/**"
      - "**/vendor/**"
      - "**/generated/**"
      - "**/migrations/**"
```

#### 3. Customize Architecture Layers

```yaml
architecture:
  layers:
    # Add custom layer
    shared:
      directory: "src/shared"
      responsibilities:
        - "Shared utilities"
        - "Common types"
      allowed_dependencies: []
```

#### 4. Relax Security Rules for Development

```yaml
security:
  secrets:
    no_hardcoded: true
    exceptions:
      - pattern: "**/*.test.ts"
      - pattern: "**/fixtures/**"
      - pattern: "**/*.mock.ts"
```

#### 5. Custom Commit Message Format

```yaml
repository:
  commit_message:
    pattern: "^[A-Z]+-[0-9]+: .{10,100}$"
    examples:
      - "PROJ-123: Implement user authentication"
    enforcement: "warn"
```

### Policy Inheritance

Create organization-wide base policy:

```yaml
# .governance/base-policy.yaml
version: "1.0.0"
name: "Base Standards"

security:
  secrets:
    no_hardcoded: true
  encryption:
    minimum_tls: "1.3"
```

Extend in project policy:

```yaml
# .governance/policy.yaml
version: "1.0.0"
name: "Project Standards"

extends:
  - "./base-policy.yaml"

# Override specific settings
code_quality:
  test_coverage:
    minimum_total: 70  # Lower than base
```

### Policy Validation

Always validate after changes:

```bash
# Validate policy syntax
npx governance validate .governance/policy.yaml

# Test policy with dry-run
npx governance check --dry-run

# Show what policy is active
npx governance config show
```

## Git Hooks Setup

### Automatic Setup

```bash
# Using provided script
/path/to/deployment/governance-engine/scripts/setup-hooks.sh

# Or manually with husky
npx husky init
echo 'npx governance check --staged' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Pre-Commit Hook

Creates `.husky/pre-commit`:

```bash
#!/bin/sh
# Run governance on staged files only

npx governance check --staged || {
  echo "❌ Governance check failed"
  echo "Fix violations or use: git commit --no-verify"
  exit 1
}
```

### Pre-Push Hook

Creates `.husky/pre-push`:

```bash
#!/bin/sh
# Run full test suite before push

npm test || exit 1
npm run lint || exit 1
npx governance check || exit 1
```

### Commit-Msg Hook

Creates `.husky/commit-msg`:

```bash
#!/bin/sh
# Validate commit message format

COMMIT_MSG=$(cat $1)

if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs):"; then
  echo "❌ Invalid commit message format"
  echo "Use: type(scope): description"
  exit 1
fi
```

### Custom Hooks

Create custom hook for your workflow:

```bash
#!/bin/sh
# .husky/pre-commit

# Run governance
npx governance check --staged || exit 1

# Run type check
npm run type-check || exit 1

# Run unit tests for changed files
npm run test:changed || exit 1

# Run custom validation
./scripts/custom-validation.sh || exit 1
```

### Team Hook Setup

For teams, commit hooks to repo:

```bash
# Add to package.json
{
  "scripts": {
    "prepare": "husky install",
    "postinstall": "husky install"
  }
}
```

When team members clone:
```bash
git clone <repo>
npm install  # Hooks auto-installed
```

## CI/CD Integration

### GitHub Actions

`.github/workflows/governance.yml`:

```yaml
name: Governance Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  governance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Governance Check
        run: npx governance check

      - name: Upload Report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: governance-report
          path: governance-report.json
```

### GitLab CI

`.gitlab-ci.yml`:

```yaml
governance:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx governance check
  artifacts:
    when: on_failure
    reports:
      junit: governance-report.xml
    paths:
      - governance-report.json
```

### Jenkins

`Jenkinsfile`:

```groovy
pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Governance') {
            steps {
                sh 'npx governance check --format=junit > governance.xml'
            }
        }
    }

    post {
        always {
            junit 'governance.xml'
        }
    }
}
```

### CircleCI

`.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  governance:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - deps-{{ checksum "package-lock.json" }}
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Governance check
          command: npx governance check
      - store_artifacts:
          path: governance-report.json

workflows:
  version: 2
  test:
    jobs:
      - governance
```

### Bitbucket Pipelines

`bitbucket-pipelines.yml`:

```yaml
pipelines:
  default:
    - step:
        name: Governance Check
        image: node:20
        caches:
          - node
        script:
          - npm ci
          - npx governance check
        artifacts:
          - governance-report.json
```

## Team Rollout

### Phase 1: Pilot (Week 1)

**Team**: 1-2 developers

```bash
# Install in warning mode
npx governance check --severity=warn

# Review violations, don't block
git commit --no-verify
```

**Goal**: Gather feedback, identify false positives

### Phase 2: Early Adopters (Weeks 2-3)

**Team**: 5-10 developers

```bash
# Enable blocking for critical issues only
enforcement:
  blocking_severity: "error"  # Block errors, warn others
```

**Goal**: Refine policy, build confidence

### Phase 3: Department Rollout (Week 4)

**Team**: Full department

```bash
# Full enforcement
enforcement:
  blocking_severity: "warning"  # Block all violations
```

**Goal**: Full adoption, ongoing support

### Rollout Checklist

- [ ] Install on pilot team machines
- [ ] Run initial scans, document violations
- [ ] Hold training session
- [ ] Create team-specific policy adjustments
- [ ] Setup CI/CD integration
- [ ] Monitor adoption via dashboard
- [ ] Collect feedback weekly
- [ ] Adjust policy based on feedback
- [ ] Expand to next team
- [ ] Document learnings

## Troubleshooting

### Common Issues

#### 1. "Module not found: @deltek/governance-engine"

**Fix**:
```bash
# Re-install
rm -rf node_modules package-lock.json
npm install
```

#### 2. "Policy file not found"

**Fix**:
```bash
# Create and download
mkdir -p .governance
curl -fsSL <policy-url> > .governance/policy.yaml
```

#### 3. "Pre-commit hook not running"

**Fix**:
```bash
# Re-initialize husky
rm -rf .husky
npx husky init
./scripts/setup-hooks.sh --force
```

#### 4. "Permission denied: .husky/pre-commit"

**Fix**:
```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

#### 5. "Too many violations blocking work"

**Fix**:
```bash
# Temporary: Use warning mode
npx governance check --severity=warn

# Long-term: Adjust policy
# Edit .governance/policy.yaml to relax rules
```

### Debug Mode

Enable detailed logging:

```bash
# Set log level
export GOVERNANCE_LOG_LEVEL=debug

# Run with verbose flag
npx governance check --verbose

# See what's being checked
npx governance check --dry-run --verbose
```

### Validation Script

Use the validation script to diagnose:

```bash
/path/to/deployment/governance-engine/scripts/validate-config.sh --verbose
```

### Getting Help

1. **Check Documentation**: Review all docs in `deployment/governance-engine/docs/`
2. **Run Validator**: `./scripts/validate-config.sh`
3. **Check Issues**: https://github.com/DLTKEngineering/governance-engine/issues
4. **Slack Support**: #engineering-governance
5. **Email**: engineering-governance@deltek.com

## Advanced Configuration

### Custom Validators

Create custom validators in `.governance/validators/`:

```javascript
// .governance/validators/custom-security.js
module.exports = {
  name: 'custom-security-check',
  severity: 'error',

  validate(file, content) {
    // Your custom logic
    if (content.includes('eval(')) {
      return {
        passed: false,
        message: 'eval() is forbidden for security'
      };
    }
    return { passed: true };
  }
};
```

Reference in policy:

```yaml
security:
  custom_validators:
    - "./validators/custom-security.js"
```

### Multiple Policies

Use different policies per environment:

```bash
# Development
npx governance check --policy=.governance/policy.dev.yaml

# Production
npx governance check --policy=.governance/policy.prod.yaml
```

Configure in `package.json`:

```json
{
  "scripts": {
    "check:dev": "governance check --policy=.governance/policy.dev.yaml",
    "check:prod": "governance check --policy=.governance/policy.prod.yaml"
  }
}
```

### Caching

Enable caching for faster checks:

```json
{
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "directory": ".governance/cache"
  }
}
```

Clear cache:
```bash
rm -rf .governance/cache
```

---

**Installation complete!** For quick reference, see [QUICK-START.md](./QUICK-START.md).

For git hooks details, see [GIT-HOOKS-SETUP.md](./GIT-HOOKS-SETUP.md).

For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
