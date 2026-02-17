# AI-SDLC Platform v4.0.0 - Quick Start Guide

## Prerequisites

- **Node.js 20+** (check with `node -v`)
- **npm** (included with Node.js)
- **Claude Code** (optional but recommended - `npm install -g @anthropic-ai/claude-code`)

## Installation (One Command)

```bash
bash install-platform.sh
```

This installs everything:
- 12 specialized AI agents
- 7 slash commands
- SQLite database (zero-config)
- CLI tool (`aisdlc`)
- Dashboard (localhost:3030)
- Health check system

**No cloud accounts, no Docker, no database servers needed.**

## Verify Installation

```bash
# Check platform health
npx aisdlc doctor

# Check platform status
npx aisdlc status
```

## Start Building

### Option 1: Claude Code (Recommended)

Open Claude Code in any project directory and use slash commands:

```bash
claude

# Then inside Claude Code:
/sdlc-start Build a user authentication system with JWT
```

The Conductor agent orchestrates the full workflow:

```
User -> Conductor -> BA -> Architect -> Engineer -> Security -> QA -> Atlas -> Customer
```

### Option 2: Individual Commands

```bash
# Gather requirements
/sdlc-requirements Add payment processing with Stripe

# Design architecture
/sdlc-architecture Design microservices for order management

# Run security review
/sdlc-security Review src/auth/

# Check workflow status
/sdlc-status
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx aisdlc init` | Initialize platform in current project |
| `npx aisdlc start` | Start dashboard server (localhost:3030) |
| `npx aisdlc stop` | Stop dashboard server |
| `npx aisdlc status` | Show platform status and statistics |
| `npx aisdlc dashboard` | Open dashboard in browser |
| `npx aisdlc doctor` | Run 8 health checks |
| `npx aisdlc config get <key>` | Read configuration |
| `npx aisdlc config set <key> <value>` | Update configuration |
| `npx aisdlc hooks install` | Install Claude Code git hooks |
| `npx aisdlc hooks remove` | Remove git hooks |
| `npx aisdlc mcp configure` | Configure MCP server |
| `npx aisdlc logs` | View audit logs |
| `npx aisdlc logs --errors` | View error logs only |
| `npx aisdlc reset --confirm` | Reset platform (removes data) |
| `npx aisdlc version` | Show version information |

## Dashboard

Start the dashboard to see real-time workflow progress:

```bash
npx aisdlc start
npx aisdlc dashboard
```

The dashboard at `http://localhost:3030` shows:
- Active SDLC workflows
- Agent status and progress
- Audit log
- Health status

## SDLC Workflow Phases

Every feature request goes through 7 phases:

| Phase | Agent | What It Does |
|-------|-------|-------------|
| 1. Requirements | BA Agent | Gathers requirements, acceptance criteria |
| 2. Architecture | Architect (Jets) | Designs solution, creates ADRs |
| 3. Development | Software Engineer | Implements code with tests |
| 4. Security | Security Agent | Reviews for vulnerabilities |
| 5. Testing | QA Agent | Runs integration and E2E tests |
| 6. Deployment | Atlas Agent | Deploys to staging/production |
| 7. Acceptance | Customer Agent | Validates against requirements |

Quality gates at phases 4, 5, and 7 can block the pipeline if issues are found.

## Where Things Live

```
~/.aisdlc/
  data/platform.db     SQLite database (all platform data)
  config.json          Platform configuration
  logs/                Platform logs
  backups/             Database backups

~/.claude/
  agents/              12 agent definitions (.md files)
  commands/            7 slash commands (.md files)
  hooks/               Git hook scripts
  sdlc-registry/       Project tracking registry
  finops/              Cost tracking scripts

docs/sdlc/            (in each project)
  requirements/        Requirements documents
  architecture/        Architecture designs and ADRs
  security/            Security review reports
  testing/             Test reports
  deployments/         Deployment records
  acceptance/          UAT reports
  tracking/            Workflow tracking files
```

## Sharing with Your Team

The platform is designed for easy team sharing:

1. **Clone this repository** to each developer's machine
2. **Run the installer**: `bash install-platform.sh`
3. Each developer gets their own local instance with:
   - Personal SQLite database
   - Personal configuration
   - Shared agent definitions (same behavior everywhere)
   - Shared slash commands

No shared infrastructure needed. Each developer runs independently.

## Troubleshooting

### Installation fails with "Node.js not found"
Install Node.js 20+ from https://nodejs.org/

### Dashboard won't start
```bash
npx aisdlc doctor          # Check what's wrong
npx aisdlc stop            # Stop any existing instance
npx aisdlc start           # Start fresh
```

### Database appears corrupted
```bash
npx aisdlc reset --confirm # Reset and reinitialize
npx aisdlc init            # Reinitialize
```

### Agents not responding
```bash
npx aisdlc doctor          # Check agent installation
bash install-platform.sh   # Reinstall agents
```

## Uninstalling

```bash
# Full removal (backs up database to /tmp/)
bash uninstall-platform.sh

# Keep your data, remove platform code
bash uninstall-platform.sh --keep-data

# Skip confirmation prompt
bash uninstall-platform.sh --confirm
```

## Next Steps

- Read the full architecture at `docs/sdlc/architecture/`
- Review the enterprise deployment guide at `ENTERPRISE-DEPLOYMENT.md`
- Customize configuration with `npx aisdlc config set`
- Install git hooks with `npx aisdlc hooks install`
