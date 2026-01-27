# Deltek Governance Engine - Quick Start Guide

**Get up and running in 5 minutes!**

## What is This?

The Deltek Governance Engine automatically enforces coding standards, security policies, and architectural rules across all engineering projects. Think of it as an automated code reviewer that never sleeps.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git repository (recommended)

Check your versions:
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

## Installation

### Option 1: One-Command Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/install.sh | bash
```

### Option 2: Manual Install

```bash
# 1. Install the package
npm install --save-dev @deltek/governance-engine

# 2. Download the policy
mkdir -p .governance
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/policies/deltek-engineering.yaml > .governance/policy.yaml

# 3. Setup git hooks
npx husky init
echo 'npx governance check' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Option 3: From Local Scripts

```bash
cd /path/to/your/project
/path/to/aisdlc-2.1.0/deployment/governance-engine/scripts/install-governance.sh
```

## Verify Installation

```bash
# Check if CLI works
npx governance --version

# Validate your policy
npx governance validate .governance/policy.yaml

# Run a test check
npx governance check
```

Expected output:
```
✅ Governance engine v1.0.0
✅ Policy valid
✅ No violations found
```

## Your First Governance Check

Create a test file with a security issue:

```javascript
// test-file.js
const API_KEY = "hardcoded-secret-12345";  // ❌ Security violation!

function connectToAPI() {
  return fetch('https://api.example.com', {
    headers: { 'Authorization': API_KEY }
  });
}
```

Run governance check:
```bash
npx governance check test-file.js
```

You'll see:
```
❌ SECURITY VIOLATION: Hardcoded secret detected

File: test-file.js:1
Line: const API_KEY = "hardcoded-secret-12345";

Fix: Use environment variables
  const API_KEY = process.env.API_KEY;
```

Fix it:
```javascript
// test-file.js - Fixed ✅
const API_KEY = process.env.API_KEY;

function connectToAPI() {
  return fetch('https://api.example.com', {
    headers: { 'Authorization': API_KEY }
  });
}
```

Run check again:
```bash
npx governance check test-file.js
✅ No violations found
```

## How It Works

### 1. Pre-Commit Hooks

When you try to commit:
```bash
git add .
git commit -m "feat: add new feature"
```

The governance engine automatically:
1. Scans staged files
2. Checks for violations
3. Blocks commit if violations found
4. Allows commit if all checks pass

### 2. Manual Checks

Check specific files:
```bash
npx governance check src/auth/login.ts
```

Check entire directories:
```bash
npx governance check src/
```

Check all files:
```bash
npx governance check
```

### 3. CI/CD Integration

Add to your `.github/workflows/ci.yml`:
```yaml
- name: Governance Check
  run: npx governance check
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npx governance check` | Check all files for violations |
| `npx governance check <file>` | Check specific file |
| `npx governance validate <policy>` | Validate policy file |
| `npx governance --help` | Show all commands |
| `npx governance --version` | Show version |

## What Gets Checked?

The governance engine checks for:

### Security
- Hardcoded secrets/API keys
- SQL injection vulnerabilities
- Weak encryption algorithms
- Missing authentication
- Insecure dependencies

### Architecture
- Layer dependency violations
- Incorrect file placement
- Circular dependencies
- SOLID principle violations

### Code Quality
- Test coverage < 80%
- Linting errors
- Type safety issues
- Code complexity
- Missing documentation

### Compliance
- GDPR requirements
- SOX controls
- PCI-DSS standards
- HIPAA regulations

## Quick Troubleshooting

### "Governance engine not found"
```bash
# Make sure it's installed
npm list @deltek/governance-engine

# If not, install it
npm install --save-dev @deltek/governance-engine
```

### "Policy file not found"
```bash
# Create the directory
mkdir -p .governance

# Download the policy
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/policies/deltek-engineering.yaml > .governance/policy.yaml
```

### "Pre-commit hook not working"
```bash
# Re-run hook setup
/path/to/deployment/governance-engine/scripts/setup-hooks.sh --force
```

### "False positive violation"
```bash
# Add to your policy file (.governance/policy.yaml):
enforcement:
  exceptions:
    - pattern: "specific-file-pattern"
      reason: "Why this is safe"
```

## Emergency Bypass

**USE WITH EXTREME CAUTION!**

If you absolutely must bypass governance checks (production emergency only):

```bash
git commit --no-verify -m "hotfix: critical production issue"
```

This will be logged and flagged for review.

## Customizing Your Policy

The policy file is at `.governance/policy.yaml`. You can customize:

```yaml
# Example: Relax test coverage for specific directories
code_quality:
  test_coverage:
    minimum_total: 80
    by_layer:
      domain: 90
      infrastructure: 60  # Lower for infrastructure
    exclude_patterns:
      - "**/generated/**"
      - "**/legacy/**"     # Exclude legacy code
```

See [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md) for full policy customization.

## Next Steps

1. **Understand Your Policy**: Review `.governance/policy.yaml`
2. **Run Full Check**: `npx governance check`
3. **Fix Violations**: Address any issues found
4. **Make a Commit**: Test the pre-commit hook
5. **Customize**: Tailor policy to your project needs

## Getting Help

- **Documentation**: See `docs/` directory
- **Issues**: https://github.com/DLTKEngineering/governance-engine/issues
- **Slack**: #engineering-governance
- **Email**: engineering-governance@deltek.com

## Pro Tips

1. **Run checks before committing** to avoid surprises:
   ```bash
   npx governance check && git commit
   ```

2. **Check modified files only** for faster feedback:
   ```bash
   npx governance check --staged
   ```

3. **See detailed violation info**:
   ```bash
   npx governance check --verbose
   ```

4. **Generate a report**:
   ```bash
   npx governance check --format=json > violations.json
   ```

5. **Integrate with VS Code** (coming soon):
   ```bash
   npm install --save-dev @deltek/governance-vscode
   ```

---

**You're all set!** The governance engine is now protecting your codebase. Happy coding with confidence! 🚀

For detailed configuration options, see [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md).
