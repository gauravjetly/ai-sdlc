# Vintiq Governance Engine - Deployment Package

Complete deployment package for rolling out the Governance Engine across your organization.

## What's Included

This deployment package contains everything needed to successfully deploy the Governance Engine from pilot through full rollout.

### 📁 Directory Structure

```
deployment/governance-engine/
├── README.md                    # This file
├── scripts/                     # Installation and setup scripts
│   ├── install-governance.sh    # One-command installation
│   ├── setup-hooks.sh          # Git hooks configuration
│   └── validate-config.sh      # Installation validator
├── docs/                       # Complete documentation
│   ├── QUICK-START.md          # 5-minute setup guide
│   ├── INSTALLATION-GUIDE.md   # Detailed installation
│   ├── GIT-HOOKS-SETUP.md     # Git hooks guide
│   ├── TROUBLESHOOTING.md     # Common issues and solutions
│   ├── FAQ.md                 # Frequently asked questions
│   └── ROLLOUT-PLAN.md        # Phased deployment strategy
├── monitoring/                # Monitoring and reporting
│   └── dashboard.html         # Real-time dashboard
└── pilot/                     # Pilot program materials
    ├── team-selection-criteria.md
    ├── pilot-plan.md
    ├── feedback-survey-template.md
    └── weekly-checkin-template.md
```

## Quick Start

### For End Users (Developers)

**Install in your project** (5 minutes):

```bash
# Option 1: One-command install
curl -fsSL https://raw.githubusercontent.com/DLTKEngineering/governance-engine/main/install.sh | bash

# Option 2: Using script from this package
/path/to/deployment/governance-engine/scripts/install-governance.sh

# Option 3: Manual npm install
npm install --save-dev @vintiq/governance-engine
```

**Read the docs**:
- Start here: [QUICK-START.md](./docs/QUICK-START.md)
- Detailed setup: [INSTALLATION-GUIDE.md](./docs/INSTALLATION-GUIDE.md)

### For Deployment Team

**Plan the rollout**:

1. **Read the rollout plan**: [ROLLOUT-PLAN.md](./docs/ROLLOUT-PLAN.md)
2. **Select pilot teams**: [team-selection-criteria.md](./pilot/team-selection-criteria.md)
3. **Execute pilot**: [pilot-plan.md](./pilot/pilot-plan.md)
4. **Deploy organization-wide**: Follow rollout plan

## Deployment Phases

### Phase 0: Preparation (Week -2 to 0)
- Deploy package to internal npm registry
- Set up monitoring dashboard
- Prepare support channels
- Create documentation site

### Phase 1: Pilot (Week 1-2)
- 2 teams, 5-10 developers each
- Week 1: Warning mode
- Week 2: Blocking mode
- Gather feedback and refine

### Phase 2: Early Adopters (Week 3-4)
- 3-5 teams, 20-30 developers
- Identify champions
- Build momentum

### Phase 3: Department Rollout (Week 5-6)
- Full engineering department
- Staggered by team type
- Intensive support

### Phase 4: Refinement (Week 7-8)
- Optimize based on usage
- Establish steady state
- Measure success

**Total Timeline**: 8 weeks from pilot to full adoption

See [ROLLOUT-PLAN.md](./docs/ROLLOUT-PLAN.md) for complete details.

## Key Scripts

### install-governance.sh

**Purpose**: One-command installation for end users

**Usage**:
```bash
./scripts/install-governance.sh
```

**What it does**:
1. Checks prerequisites (Node.js, npm, git)
2. Installs governance engine package
3. Downloads Vintiq policy file
4. Sets up git pre-commit hooks
5. Verifies installation

**Time**: ~5 minutes

### setup-hooks.sh

**Purpose**: Configure git hooks for governance enforcement

**Usage**:
```bash
./scripts/setup-hooks.sh              # Interactive
./scripts/setup-hooks.sh --force      # Overwrite existing
./scripts/setup-hooks.sh --hook-type=pre-commit  # Specific hook
```

**What it does**:
1. Installs husky if needed
2. Creates pre-commit hook
3. Optionally creates pre-push and commit-msg hooks
4. Makes hooks executable
5. Tests configuration

**Time**: ~2 minutes

### validate-config.sh

**Purpose**: Verify governance engine is correctly installed

**Usage**:
```bash
./scripts/validate-config.sh              # Quick validation
./scripts/validate-config.sh --verbose    # Detailed diagnostics
```

**What it checks**:
1. Node.js and npm versions
2. Package installation
3. Policy file existence and validity
4. Git hooks configuration
5. CLI functionality

**Time**: ~1 minute

**Use cases**:
- After installation (verify success)
- When troubleshooting issues
- Before seeking support (gather diagnostics)

## Documentation Guide

### For End Users

**Start here**: [QUICK-START.md](./docs/QUICK-START.md)
- 5-minute overview
- Basic commands
- First governance check
- Common tasks

**Next**: [INSTALLATION-GUIDE.md](./docs/INSTALLATION-GUIDE.md)
- Complete installation options
- Configuration
- Policy customization
- CI/CD integration

**When needed**: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Common issues
- Solutions
- Debug mode
- Getting help

**Reference**: [FAQ.md](./docs/FAQ.md)
- Common questions
- Best practices
- Policy questions
- Bypass procedures

### For Deployment Team

**Planning**: [ROLLOUT-PLAN.md](./docs/ROLLOUT-PLAN.md)
- Complete 8-week plan
- Success criteria
- Risk management
- Communication templates

**Pilot**: [pilot/](./pilot/)
- Team selection criteria
- Detailed pilot plan
- Survey templates
- Meeting agendas

## Monitoring Dashboard

**Location**: [monitoring/dashboard.html](./monitoring/dashboard.html)

**Features**:
- Real-time governance metrics
- Violations by type (chart)
- Violations by project (table)
- Top violations list
- Adoption rate tracking
- Bypass rate monitoring

**Setup**:
```bash
# Serve dashboard locally
cd monitoring
python -m http.server 8000

# Open in browser
open http://localhost:8000/dashboard.html
```

**Production Deployment**:
- Host on internal server
- Configure data source (governance logs/database)
- Set up auto-refresh
- Add authentication if needed

## Support Model

### Self-Service (80% of questions)
- **Documentation**: Everything in `docs/`
- **Validation Script**: `./scripts/validate-config.sh`
- **FAQ**: Common questions answered

### Community Support (15% of questions)
- **Slack**: #engineering-governance
- **Office Hours**: Weekly (schedule TBD)
- **Champions**: Team advocates

### Direct Support (5% of questions)
- **Email**: engineering-governance@vintiq.com
- **For**: Complex issues, policy questions, escalations
- **SLA**: Response within 4 hours

## Success Metrics

### Quantitative

| Metric | Target | Tracking |
|--------|--------|----------|
| Adoption rate | 85% | User count / total engineers |
| Violations caught | 1000+/week | Governance logs |
| Security issues prevented | 50+ | Critical violation count |
| False positive rate | < 1% | Survey + manual review |
| Bypass rate | < 3% | Git logs |
| Developer satisfaction | > 8/10 | Quarterly survey |
| Average check time | < 8 sec | Performance logs |

### Qualitative

- [ ] Teams see value in governance
- [ ] Policy is reasonable and fair
- [ ] Support is responsive and helpful
- [ ] Documentation is clear and complete
- [ ] Teams recommend to others

## Common Use Cases

### Use Case 1: Install for First Time

**Developer**: Sarah (Frontend Engineer)

**Steps**:
1. Run installation script
2. Policy downloaded automatically
3. Git hooks configured
4. Make first commit - governance runs
5. Fix any violations

**Time**: 10 minutes

**Resources**: [QUICK-START.md](./docs/QUICK-START.md)

### Use Case 2: Troubleshoot Installation Issue

**Developer**: Mike (Backend Engineer)

**Steps**:
1. Run validation script
2. Review output for errors
3. Check troubleshooting guide
4. Fix identified issues
5. Re-run validation

**Time**: 15 minutes

**Resources**: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

### Use Case 3: Customize Policy

**Team Lead**: Alex

**Steps**:
1. Copy default policy
2. Review customization guidelines
3. Adjust thresholds for team
4. Validate policy
5. Deploy to team

**Time**: 30 minutes

**Resources**: [INSTALLATION-GUIDE.md#policy-customization](./docs/INSTALLATION-GUIDE.md#policy-customization)

### Use Case 4: Deploy to Team

**Engineering Manager**: Jordan

**Steps**:
1. Review rollout plan
2. Select team and timeline
3. Schedule training session
4. Support team during installation
5. Monitor adoption

**Time**: 1 week

**Resources**: [ROLLOUT-PLAN.md](./docs/ROLLOUT-PLAN.md)

### Use Case 5: Run Pilot Program

**Governance Lead**: Taylor

**Steps**:
1. Select pilot teams (criteria)
2. Execute 2-week pilot plan
3. Collect feedback (surveys)
4. Analyze results
5. Make go/no-go decision

**Time**: 4 weeks (2 weeks pilot + 2 weeks analysis)

**Resources**: All files in [pilot/](./pilot/)

## Integration Examples

### GitHub Actions

```yaml
name: Governance Check
on: [push, pull_request]
jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx governance check
```

### Pre-Commit Hook

```bash
#!/bin/sh
# .husky/pre-commit
npx governance check --staged || exit 1
```

### Package.json Scripts

```json
{
  "scripts": {
    "check": "governance check",
    "check:staged": "governance check --staged",
    "validate": "governance validate .governance/policy.yaml",
    "prepare": "husky install"
  }
}
```

## Customization

### Policy Customization

**Location**: `.governance/policy.yaml` in each project

**Common Customizations**:
- Test coverage thresholds
- Architecture layers
- Exclusion patterns
- Security exceptions
- Naming conventions

**Example**:
```yaml
code_quality:
  test_coverage:
    minimum_total: 70  # Lower from default 80%
    exclude_patterns:
      - "**/legacy/**"  # Exclude legacy code
```

See [INSTALLATION-GUIDE.md#policy-customization](./docs/INSTALLATION-GUIDE.md#policy-customization)

### Dashboard Customization

**Location**: `monitoring/dashboard.html`

**Customizable**:
- Data source (currently mock data)
- Refresh interval
- Metrics displayed
- Chart types
- Styling/branding

**TODO**: Connect to actual data source
- Governance engine logs
- Database
- API endpoint

## Roadmap

### Short Term (Next 3 months)
- [ ] VS Code extension
- [ ] Enhanced dashboard with real data
- [ ] Performance optimizations
- [ ] Additional language support (Python)

### Medium Term (3-6 months)
- [ ] Auto-fix capabilities
- [ ] Machine learning for false positive detection
- [ ] Advanced policy inheritance
- [ ] Team-specific dashboards

### Long Term (6-12 months)
- [ ] IDE integrations (IntelliJ, WebStorm)
- [ ] Real-time violation detection
- [ ] AI-powered policy suggestions
- [ ] Cross-repo policy enforcement

## Contributing

We welcome contributions!

**Ways to Contribute**:
- Report bugs and issues
- Suggest policy improvements
- Share best practices
- Improve documentation
- Contribute code

**Process**:
1. Open issue or discussion
2. Get feedback from governance team
3. Submit PR with changes
4. Pass all quality checks
5. Get approved and merged

## License

MIT License - See LICENSE file for details

## Contact

**Support**: engineering-governance@vintiq.com
**Slack**: #engineering-governance
**GitHub**: https://github.com/DLTKEngineering/governance-engine

---

## Checklist: Ready for Deployment?

### Infrastructure
- [ ] Package built and tested
- [ ] Internal npm registry ready
- [ ] Monitoring dashboard deployed
- [ ] Support channels created
- [ ] Documentation site live

### Team
- [ ] Governance team staffed
- [ ] Support rotation scheduled
- [ ] Pilot teams selected
- [ ] Champions identified
- [ ] Training prepared

### Documentation
- [ ] All docs reviewed and accurate
- [ ] Examples tested
- [ ] Troubleshooting complete
- [ ] FAQ populated
- [ ] Videos recorded

### Communication
- [ ] Announcement email drafted
- [ ] All-hands presentation ready
- [ ] Slack messages prepared
- [ ] Training invites sent
- [ ] Timeline communicated

### Pilot
- [ ] Pilot teams confirmed
- [ ] Kickoff scheduled
- [ ] Surveys created
- [ ] Retrospectives scheduled
- [ ] Success criteria defined

**If all checked: Ready to launch pilot! 🚀**

---

**Everything you need to successfully deploy the Governance Engine is in this package. Questions? See docs/ or reach out to the governance team.**

Good luck with your rollout! 🎉
