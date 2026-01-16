# Agentic AI-SDLC Framework for Claude Code

## Complete Enterprise Software Development Automation

**Version**: 2.0.0  
**Author**: Deltek Cloud Engineering  

---

## What's New in v2.0

- **Separated DevOps/SRE Agent** - Dedicated deployment specialist
- **Post-Deployment Acceptance** - Customer Agent tests live environment
- **Security Agent** - Pure security review (no deployment concerns)
- **7-Phase Workflow** - Clear separation of concerns

---

## Agent Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER PROMPT                              │
│         "/sdlc-start Build customer feedback portal"            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CONDUCTOR (Opus)                            │
│            Classify → Track → Orchestrate → Report              │
└─────────────────────────────────────────────────────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
┌─────────┐            ┌──────────┐             ┌──────────┐
│   BA    │     →      │ ARCHITECT│      →      │ ENGINEER │
│ (Sonnet)│            │  (Opus)  │             │ (Sonnet) │
│         │            │          │             │          │
│ Require-│            │ Design   │             │ Implement│
│ ments   │            │ ADRs     │             │ Tests    │
└─────────┘            └──────────┘             └──────────┘
                                                     │
     ┌───────────────────────────────────────────────┘
     ▼
┌─────────┐            ┌──────────┐             ┌──────────┐
│SECURITY │     →      │    QA    │      →      │  ATLAS   │
│ (Sonnet)│            │ (Sonnet) │             │ (Sonnet) │
│         │            │          │             │          │
│ Review  │            │ Test     │             │ Deploy   │
│ Audit   │            │ Validate │             │ Operate  │
└─────────┘            └──────────┘             └──────────┘
     │                                               │
     │ Can BLOCK                                     │
     │ if vulns                                      ▼
     │                                         ┌──────────┐
     │                                         │ CUSTOMER │
     │                                         │ (Sonnet) │
     │                                         │          │
     │                                         │Post-UAT  │
     │                                         │Acceptance│
     │                                         └──────────┘
     │                                               │
     │                                               │ Can REJECT
     │                                               │ if fails
     └───────────────────────────────────────────────┘
                              │
                              ▼
                    ✅ PRODUCTION READY
```

---

## The 9 Agents

| Agent | Model | Role | Key Output |
|-------|-------|------|------------|
| **Conductor** | Opus | Meta-orchestrator | Tracking files, reports |
| **BA Agent** | Sonnet | Requirements engineering | REQ-*.md |
| **Architect (Jets)** | Opus | AI-native architecture | ARCH-*.md, ADR-*.md |
| **Software Engineer** | Sonnet | Implementation | src/, tests/ |
| **Security Agent** | Sonnet | Security review only | SECURITY-REVIEW-*.md |
| **QA Agent** | Sonnet | Pre-deployment testing | TEST-REPORT-*.md |
| **Atlas Agent** | Sonnet | Deployment & operations | DEPLOY-*.md |
| **Customer Agent** | Sonnet | Post-deployment UAT | UAT-*.md |
| **Tracker Agent** | Haiku | Progress monitoring | Status reports |

---

## Key Design Decisions

### Security Agent (Review Only)
- Performs SAST, dependency audit, compliance checks
- **Does NOT deploy** - pure security focus
- Can BLOCK pipeline if critical/high issues found

### Atlas Agent (Deployment)
- Handles infrastructure, CI/CD, deployment
- Deploys to staging first, then production
- Manages rollbacks if needed
- Configures monitoring and alerting

### Customer Agent (Post-Deployment)
- Tests the **deployed** application, not just code
- Validates acceptance criteria in live environment
- Confirms business value delivered
- Final gate before production sign-off

---

## Updating the Framework

Seamlessly update while preserving your customizations.

### Check Current Installation
```bash
sdlc-update --check
```
Shows version, detects custom agents/commands.

### Update from New Package
```bash
# Download new version, then:
sdlc-update /path/to/aisdlc-2.2.0.zip
```

This automatically:
1. Backs up current installation
2. **Removes deprecated files** (e.g., `devops-sre-agent.md` → `atlas-agent.md`)
3. Preserves custom agents/commands you added
4. Updates core files
5. Preserves registry data
6. Offers to clean up old version directories in Downloads

### Rollback if Needed
```bash
sdlc-update --rollback
```
Lists available backups and restores selected one.

### Manual Backup
```bash
sdlc-update --backup
```

### View Changelog
```bash
sdlc-update --changelog
```

---

## Control Center Dashboard

Real-time UI for monitoring agent activity across all projects.

### Features
- **Dashboard**: Stats, workflow visualization, recent activity
- **Projects**: Track all SDLC workflows, phase progress, blockers
- **Agents**: Invocation counts, average durations, success rates
- **Activity**: Chronological log of all agent actions

### Usage

1. **Open the dashboard artifact** in Claude.ai:
   - Copy `dashboard/sdlc-control-center.jsx`
   - Paste into a new Claude conversation
   - It will render as an interactive React component

2. **Or run the registry CLI**:
   ```bash
   sdlc-registry status      # View stats
   sdlc-registry activity    # View recent activity
   sdlc-registry projects    # List all projects
   ```

### How It Works

Agents automatically log their activity to `~/.claude/sdlc-registry/`:
- Project creation, phase starts, completions
- Blocking events (security, QA, customer)
- Progress updates and outputs

---

## Quick Start

### Installation

```bash
# Unzip and run installer
unzip aisdlc-2.1.0.zip
cd aisdlc-2.1.0
./install.sh

# Or with auto-cleanup of source directory
./install.sh --cleanup

# Or install to project directory (for team sharing)
./install.sh --project
```

### Usage

```bash
# Full SDLC workflow
/sdlc-start Build a user authentication system with OAuth 2.0

# Check status
/sdlc-status

# Deploy (after security + QA pass)
/sdlc-deploy staging
/sdlc-deploy production

# Individual phases
/sdlc-requirements [description]
/sdlc-architecture [description]
/sdlc-security [path]
/sdlc-review [path]
```

---

## Package Contents

```
aisdlc-2.1.0/
│
├── README.md                    # This file
├── CHANGELOG.md                 # Version history
├── VERSION                      # Current version number
├── manifest.json                # Release config (deprecations, versions)
├── install.sh                   # One-command installer
│
├── agents/                      # 9 SDLC Agents
│   ├── conductor.md             # Orchestrator (Opus)
│   ├── ba-agent.md              # Business Analyst (Sonnet)
│   ├── architect-jets.md        # Jets - Architect (Opus)
│   ├── software-engineer.md     # Developer (Sonnet)
│   ├── security-agent.md        # Security Review (Sonnet)
│   ├── qa-agent.md              # QA Testing (Sonnet)
│   ├── atlas-agent.md           # Atlas - Deployment (Sonnet)
│   ├── customer-agent.md        # Post-Deploy UAT (Sonnet)
│   └── tracker-agent.md         # Monitoring (Haiku)
│
├── commands/                    # Slash Commands
│   ├── sdlc-start.md            # Full workflow
│   ├── sdlc-status.md           # Check progress
│   ├── sdlc-review.md           # Code review
│   ├── sdlc-deploy.md           # Deployment
│   ├── sdlc-requirements.md     # Requirements only
│   ├── sdlc-architecture.md     # Architecture only
│   └── sdlc-security.md         # Security only
│
├── dashboard/                   # Control Center UI
│   └── sdlc-control-center.jsx  # React dashboard artifact
│
├── scripts/                     # CLI Tools & Build
│   ├── sdlc-registry.sh         # Registry CLI
│   ├── sdlc-update.sh           # Update manager
│   ├── release.sh               # Release builder
│   ├── install-agents.sh
│   ├── install-commands.sh
│   └── setup-project.sh
│
├── docs/                        # Reference Documentation
│   ├── AI-SDLC-Framework.md
│   ├── Agentic-AI-SDLC-Framework.md
│   ├── Agent-System-Prompts.md
│   ├── A2A-Protocol-Guide.md
│   ├── Registry-System.md
│   └── Implementation-Guide.md
│
└── project-template/            # Copy to your project
    ├── CLAUDE.md
    ├── .claude/settings.json
    └── docs/sdlc/
```

---

## Quality Gates

| Phase | Agent | Gate | Authority |
|-------|-------|------|-----------|
| Requirements | BA | All FRs have acceptance criteria | - |
| Architecture | Architect | ADRs for all decisions | - |
| Development | Engineer | >80% coverage, lint pass | - |
| Security | Security | 0 critical/high vulns | **BLOCK** |
| Testing | QA | All tests pass, SLAs met | **FAIL** |
| Deployment | Atlas | Health checks pass | **ROLLBACK** |
| Acceptance | Customer | All P0 criteria pass | **REJECT** |

---

## Output Directories

After running SDLC workflow:

```
docs/sdlc/
├── requirements/     # REQ-*.md
├── architecture/     # ARCH-*.md, ADR-*.md
├── security/        # SECURITY-REVIEW-*.md
├── testing/         # TEST-REPORT-*.md
├── deployments/     # DEPLOY-*.md
├── acceptance/      # UAT-*.md
└── tracking/        # SDLC-*.md
```

---

## Requirements

- **Claude Code**: Latest version
- **Subscription**: Pro or Max (required for subagents)
- **Disk**: ~1MB for agent files

---

## For Developers: Releasing New Versions

All release configuration is centralized in `manifest.json`.

### Quick Release

```bash
cd aisdlc-2.1.0/scripts
./release.sh wizard
```

Interactive wizard walks you through:
1. Version bump (patch/minor/major)
2. Adding deprecations
3. Building the package

### Manual Release Steps

```bash
# 1. Set new version
./scripts/release.sh set-version 2.2.0

# 2. Add any deprecations (optional)
./scripts/release.sh deprecate agents old-agent.md new-agent.md "Reason"

# 3. Build package
./scripts/release.sh build ~/releases/
```

### manifest.json Structure

```json
{
  "version": "2.1.0",
  "agents": {
    "current": ["conductor.md", "atlas-agent.md", ...],
    "deprecated": [
      {
        "file": "devops-sre-agent.md",
        "replacedBy": "atlas-agent.md",
        "version": "2.1.0",
        "reason": "Renamed for clarity"
      }
    ]
  },
  "commands": { ... },
  "scripts": { ... }
}
```

When you add a deprecation, it's automatically:
- Removed during `./install.sh`
- Removed during `sdlc-update`
- Documented in the manifest

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2025-01-15 | Control Center, Registry, Update Manager |
| 2.0.0 | 2025-01-15 | Atlas agent, post-deploy UAT |
| 1.0.0 | 2025-01-15 | Initial release |

See [CHANGELOG.md](CHANGELOG.md) for full details.

---

**Built for Deltek Cloud Engineering**  
**Powered by Claude Code + Anthropic**
