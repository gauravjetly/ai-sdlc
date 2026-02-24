# Frequently Asked Questions (FAQ)

Common questions about the Vintiq Governance Engine.

## General Questions

### What is the Governance Engine?

The Governance Engine is an automated tool that enforces coding standards, security policies, and architectural rules across all engineering projects. It acts as an automated code reviewer that validates code before it's committed or deployed.

### Why do we need this?

**Benefits**:
- **Security**: Prevents hardcoded secrets and vulnerabilities from reaching production
- **Quality**: Enforces consistent code standards across all teams
- **Compliance**: Ensures regulatory requirements (GDPR, SOX, PCI-DSS) are met
- **Speed**: Catches issues early, preventing failed CI builds and production incidents
- **Knowledge**: Codifies best practices, helping new team members learn standards

### Is this mandatory?

Yes, for all new projects. Existing projects have a grace period for adoption based on the rollout plan.

### Who created and maintains it?

Created by the Engineering Governance team. Maintained by:
- **Policy**: Engineering Governance Committee
- **Engine**: Platform Engineering team
- **Support**: #engineering-governance Slack channel

## Installation & Setup

### How long does installation take?

**5 minutes** for basic setup using the automated script:
```bash
curl -fsSL <install-url> | bash
```

**15 minutes** for full setup including customization.

### Do I need admin privileges?

No. Installation happens in your project directory using npm, which doesn't require admin rights.

### Can I install globally?

Not recommended. Install per-project as a dev dependency so the version is locked and consistent across the team.

### What if I already have git hooks?

The setup script will detect existing hooks and ask if you want to merge or replace them. You can combine multiple hooks:

```bash
#!/bin/sh
# .husky/pre-commit

# Existing checks
npm run lint

# Add governance
npx governance check --staged || exit 1
```

### Can I use this with [insert framework]?

Yes! The Governance Engine is framework-agnostic. It works with:
- React, Vue, Angular, Svelte
- Node.js, Express, NestJS, Fastify
- TypeScript, JavaScript, Python, Go
- Any project with a git repository

## Usage Questions

### When does the governance check run?

By default:
- **Pre-commit**: Before each `git commit` (checks staged files)
- **Pre-push** (optional): Before `git push` (full validation)
- **CI/CD**: During continuous integration pipeline

### Can I run checks manually?

Yes:
```bash
# Check all files
npx governance check

# Check specific file
npx governance check src/auth/login.ts

# Check directory
npx governance check src/domain/

# Check staged files only
npx governance check --staged
```

### How do I see what will be checked?

```bash
# Dry run (don't actually check, just show what would be checked)
npx governance check --dry-run

# Verbose mode (see detailed progress)
npx governance check --verbose
```

### What happens if a check fails?

**Pre-commit**: The commit is blocked and you see:
```
❌ Governance check failed!

Violation: Hardcoded secret detected
File: src/config.ts:12
Fix: Use environment variables

Violations must be fixed before committing.
Emergency bypass: git commit --no-verify
```

You must fix the violation or use `--no-verify` for emergencies.

**CI/CD**: The build fails and the PR cannot be merged.

### How long does a check take?

**Pre-commit** (staged files only): 3-10 seconds typically
**Full check**: 30-60 seconds for medium projects
**Large codebases**: 2-5 minutes

Performance tips:
- Enable caching
- Check only staged files in pre-commit
- Run full checks in pre-push or CI

## Policy Questions

### Who defines the policies?

**Base policies**: Engineering Governance Committee (represents all engineering teams)

**Project overrides**: Tech leads and architects can customize for specific project needs

### Can I customize the policy for my project?

Yes, within reason:

**Allowed**:
- Adjust test coverage thresholds (within ±10%)
- Add project-specific exclusions
- Configure layer names (if using different structure)
- Customize naming conventions

**Not allowed** (requires approval):
- Disable security checks
- Remove required documentation
- Allow hardcoded secrets
- Bypass architecture rules

### How do I request a policy change?

1. **Propose**: Open PR with change to `.governance/policy.yaml`
2. **Justify**: Include reason and examples
3. **Review**: Tag @governance-committee
4. **Approve**: Requires 2 approvals from tech leads
5. **Merge**: Announce change in #engineering

Example proposal:
```yaml
code_quality:
  test_coverage:
    by_layer:
      presentation: 60  # PROPOSAL: Lower from 70%

# JUSTIFICATION:
# UI components are tested via E2E tests which provide better coverage
# than unit tests for UI interactions. Unit tests for UI are often flaky
# and don't catch real issues. E2E coverage is 95%.
#
# EXAMPLES:
# - Login form: E2E covers all flows, unit tests are redundant
# - Dashboard: Visual testing via Percy, unit tests limited value
#
# APPROVED BY:
# - @tech-lead
# - @architect
```

### What if a rule seems wrong?

**First**: Make sure you understand the rule's purpose:
```bash
npx governance explain <violation-code>
```

**If still disagree**:
1. Document your case with examples
2. Discuss in #engineering-governance
3. Propose policy change (see above)

**Temporary workaround**:
```yaml
# Add exception with expiry
enforcement:
  exceptions:
    - pattern: "src/legacy/old-module.ts"
      rule: "test-coverage"
      reason: "Legacy code being refactored"
      expires: "2024-06-30"
      approved_by: "tech-lead@company.com"
```

### How often do policies change?

**Quarterly reviews**: Engineering Governance Committee reviews all policies

**Ad-hoc changes**: Security-critical updates pushed immediately

**You'll be notified**: Changes announced in #engineering with migration guide

## Bypass & Overrides

### Can I bypass the governance check?

**Yes, for emergencies**:
```bash
git commit --no-verify -m "hotfix: critical production issue"
```

**⚠️ Important**:
- Bypasses are logged and reviewed
- Must document reason in commit message
- Violations must be fixed in follow-up PR
- Repeated bypasses trigger review

### When is bypassing acceptable?

**Acceptable**:
- Production down, hotfix needed immediately
- False positive confirmed by governance team
- Policy bug preventing valid code

**Not acceptable**:
- "Don't have time to fix" (plan better)
- "Tests are hard to write" (learn TDD)
- "Policy is annoying" (propose change instead)

### Can I disable governance for my project?

**No**, governance is mandatory for all projects.

**But you can**:
- Customize policy (within limits)
- Add project-specific exceptions
- Adjust thresholds (within ranges)
- Request policy changes

### What if governance blocks me during an incident?

**During active incident**:
1. Bypass with `--no-verify`
2. Document incident number in commit
3. Deploy fix immediately
4. Create follow-up ticket to fix violations

**After incident**:
1. Fix violations in follow-up PR
2. Update incident post-mortem
3. Consider if policy needs adjustment

## Technical Questions

### Does it slow down my commits?

**Slightly**. Pre-commit checks add 3-10 seconds. This is intentional - it's faster than:
- Failed CI build (5-10 minutes)
- Security incident (days to weeks)
- Production bug (hours to fix)

**Optimization**:
```bash
# Check only staged files (fast)
npx governance check --staged

# Enable caching
export GOVERNANCE_CACHE_ENABLED=true
```

### Does it work offline?

**Yes**, once installed:
- No internet required for checks
- Policy file is local (`.governance/policy.yaml`)
- All validation runs locally

**Updates require internet**:
- Installing/updating package
- Downloading latest policy
- Syncing policy changes

### How much disk space does it use?

- Package: ~5 MB
- Dependencies: ~20 MB
- Policy: ~100 KB
- Cache: ~10 MB (if enabled)

**Total**: ~35 MB

### Will it work in my CI/CD?

**Yes**, supported in:
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Bitbucket Pipelines
- Azure DevOps
- Any CI with Node.js support

See [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md#cicd-integration) for examples.

### Can I use it with monorepos?

**Yes**:

**Option 1**: Install at root (recommended)
```bash
npm install --save-dev @vintiq/governance-engine -w
```

**Option 2**: Per-workspace policy
```bash
# Root policy
.governance/policy.yaml

# Workspace overrides
packages/api/.governance/policy.yaml
packages/ui/.governance/policy.yaml
```

### Does it support multiple languages?

**Currently supported**:
- TypeScript
- JavaScript
- YAML (policies)
- JSON (config)

**Planned**:
- Python
- Go
- Java
- C#

**Check language support**:
```bash
npx governance languages
```

## Integration Questions

### Does it work with ESLint/Prettier?

**Yes**, governance complements (doesn't replace) linters:

**ESLint**: Code style and syntax
**Prettier**: Formatting
**Governance**: Architecture, security, compliance

**They work together**:
```bash
#!/bin/sh
# .husky/pre-commit

# Linting
npx eslint --fix $(git diff --cached --name-only)

# Formatting
npx prettier --write $(git diff --cached --name-only)

# Governance
npx governance check --staged
```

### Can I integrate with VS Code?

**Coming soon!** VS Code extension in development.

**Meanwhile**, you can:
1. Run manually: `npx governance check file.ts`
2. Add to tasks.json:
```json
{
  "tasks": [
    {
      "label": "Governance Check",
      "type": "shell",
      "command": "npx governance check ${file}"
    }
  ]
}
```

### Does it work with Husky alternatives?

**Yes**, any git hook manager works:

**Husky** (recommended): Full support
**simple-git-hooks**: Supported
**lefthook**: Supported
**Native git hooks**: Supported (but not version controlled)

## Compliance Questions

### What compliance standards does it enforce?

- **GDPR**: Data privacy requirements
- **SOX**: Financial controls and audit trails
- **PCI-DSS**: Payment card security
- **HIPAA**: Healthcare data protection
- **DCAA**: Government contracting requirements

### How does it help with compliance?

**Automated checks**:
- Encryption requirements enforced
- Audit logging verified
- Access controls validated
- Data retention policies checked

**Documentation**:
- Compliance reports generated
- Audit trails maintained
- Evidence of controls

### Can auditors see the governance reports?

**Yes**, generate compliance reports:
```bash
npx governance report --format=compliance --output=audit-report.pdf
```

Reports include:
- All policy checks performed
- Violations found and fixed
- Exceptions granted and justifications
- Approval chains

## Team Questions

### How do I onboard new team members?

**New developer setup**:
1. Clone repo
2. Run `npm install` (hooks auto-install)
3. Review `.governance/policy.yaml`
4. Make first commit (governance will guide)

**Training**:
- Share [QUICK-START.md](./QUICK-START.md)
- Pair programming for first few commits
- Weekly Q&A in #engineering-governance

### What if someone disagrees with a violation?

**Resolution process**:
1. **Understand**: Why is this a violation?
   ```bash
   npx governance explain <code>
   ```

2. **Discuss**: In #engineering-governance
   - Is it a false positive?
   - Is the rule too strict?
   - Is there a better approach?

3. **Decide**:
   - Fix the code (most common)
   - Add exception (rare, requires approval)
   - Change policy (very rare, requires committee)

### How do we handle legacy code?

**Options**:

**1. Gradual migration**:
```yaml
enforcement:
  exceptions:
    - pattern: "src/legacy/**"
      reason: "Legacy code being refactored"
      expires: "2024-12-31"
```

**2. Lower thresholds**:
```yaml
code_quality:
  test_coverage:
    by_directory:
      "src/legacy": 40  # Lower than default 80%
```

**3. Refactor incrementally**:
- Don't let new violations in
- Fix violations when touching files
- Gradual improvement over time

## Support Questions

### Where do I get help?

**Quick questions**: #engineering-governance Slack

**Bug reports**: https://github.com/DLTKEngineering/governance-engine/issues

**Policy questions**: engineering-governance@vintiq.com

**Training**: Weekly office hours (Fridays 2-3pm)

### How do I report a bug?

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) first
2. Search existing issues
3. If new bug, create issue with:
   - Environment info
   - Steps to reproduce
   - Expected vs actual behavior
   - Logs (verbose mode)

### How can I contribute?

**Ways to contribute**:
- Report bugs and false positives
- Suggest policy improvements
- Share best practices
- Help others in #engineering-governance
- Contribute code (see CONTRIBUTING.md)

### Is there training available?

**Yes**:
- **Weekly office hours**: Fridays 2-3pm (open Q&A)
- **Monthly workshops**: Deep dives into policies
- **Self-service**: Complete documentation in `docs/`
- **Onboarding sessions**: For new team members

Contact engineering-governance@vintiq.com to schedule team training.

## Troubleshooting

### Where do I start troubleshooting?

1. **Run validator**:
   ```bash
   ./scripts/validate-config.sh --verbose
   ```

2. **Check docs**:
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
   - [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md)

3. **Enable debug mode**:
   ```bash
   export GOVERNANCE_LOG_LEVEL=debug
   npx governance check --verbose
   ```

4. **Ask for help**: #engineering-governance

### What if the same issue keeps happening?

**Document it**:
1. Collect examples
2. Share in #engineering-governance
3. Work with team to find root cause
4. Update policy or engine to prevent recurrence

## Still Have Questions?

**Don't see your question here?**

- **Slack**: #engineering-governance
- **Email**: engineering-governance@vintiq.com
- **Office Hours**: Fridays 2-3pm
- **Documentation**: See all docs in `deployment/governance-engine/docs/`

**Help improve this FAQ**:
If you have a question that's not answered here, please submit a PR to add it!

---

**Remember**: The governance engine is here to help, not hinder. If something seems unreasonable, let's discuss it! 💬
