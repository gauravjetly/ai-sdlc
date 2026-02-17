# AI-SDLC Platform - Enterprise Deployment Guide

## Overview

The AI-SDLC Platform is designed as a **local-first, zero-infrastructure** developer tool. Each developer runs their own instance on their laptop. This document explains how to deploy across organizations of any size -- from small teams to thousands of developers.

## Deployment Model

```
Developer Laptop A          Developer Laptop B          Developer Laptop C
+------------------+       +------------------+       +------------------+
| AI-SDLC v4.0.0  |       | AI-SDLC v4.0.0  |       | AI-SDLC v4.0.0  |
| SQLite (local)   |       | SQLite (local)   |       | SQLite (local)   |
| LRU Cache (RAM)  |       | LRU Cache (RAM)  |       | LRU Cache (RAM)  |
| Dashboard :3030  |       | Dashboard :3030  |       | Dashboard :3030  |
| 12 Agents        |       | 12 Agents        |       | 12 Agents        |
+------------------+       +------------------+       +------------------+
        |                           |                           |
        v                           v                           v
   Claude Code API            Claude Code API            Claude Code API
   (Anthropic cloud)          (Anthropic cloud)          (Anthropic cloud)
```

Key characteristics:
- **No shared infrastructure** -- no databases, no message brokers, no container orchestration
- **No network dependencies** beyond the Claude Code API
- **Each developer is independent** -- one failure does not affect others
- **All data stays local** -- compliance-friendly, no data leaves the laptop

## Scaling to Thousands of Developers

### Why This Model Scales

Traditional centralized platforms hit bottlenecks as teams grow: database contention, message queue backpressure, deployment complexity, single points of failure. The AI-SDLC Platform avoids all of these because each developer has their own isolated instance.

| Metric | Centralized Platform | AI-SDLC Local Platform |
|--------|---------------------|----------------------|
| Database load | O(N) -- grows with users | O(1) -- always 1 user per DB |
| Failure blast radius | All developers | Single developer |
| Infrastructure cost | $500-5000/month | $0 |
| Setup time (new dev) | 2-4 hours (accounts, VPN, etc.) | 5 minutes |
| Network dependency | Always-on server | Only Claude API calls |
| Data residency | Central server location | Developer's machine |

### Capacity Per Developer

Each developer's local instance handles:

| Resource | Usage | Notes |
|----------|-------|-------|
| Disk (SQLite DB) | 5-50 MB | After months of heavy use |
| Disk (agent definitions) | ~2 MB | 12 agents, 7 commands |
| RAM (LRU cache) | 10-50 MB | Configurable, auto-evicts |
| RAM (dashboard server) | ~30 MB | Lightweight Express server |
| CPU | Negligible | SQLite is very efficient |
| Network | Claude API only | No inter-developer traffic |

### Team Sizes

| Team Size | Deployment Method | Estimated Setup |
|-----------|------------------|----------------|
| 1-10 | Manual install from shared repo | 5 min per developer |
| 10-50 | Git clone + install script | 5 min per developer |
| 50-200 | Internal package registry (Artifactory/Nexus) | 2 min per developer |
| 200-1000 | MDM/SCCM software distribution | Automatic |
| 1000+ | Enterprise software catalog (ServiceNow, etc.) | Self-service |

## Installation Methods

### Method 1: Git Repository (Small Teams)

```bash
# Each developer clones the repo
git clone https://your-internal-git/aisdlc-platform.git
cd aisdlc-platform
bash install-platform.sh
```

### Method 2: Internal npm Registry (Medium Teams)

Publish to your internal registry:

```bash
# Admin publishes once
npm publish --registry https://your-registry.company.com

# Each developer installs
npm install -g @aisdlc/platform --registry https://your-registry.company.com
aisdlc init
```

### Method 3: MDM Distribution (Large Enterprises)

Package as a standard software distribution:

1. Create a distribution archive:
```bash
tar czf aisdlc-platform-4.0.0.tar.gz \
  agents/ commands/ packages/ scripts/ \
  install-platform.sh uninstall-platform.sh \
  QUICKSTART.md
```

2. Create a post-install script for MDM:
```bash
#!/bin/bash
# MDM post-install script
cd /opt/aisdlc-platform
bash install-platform.sh
```

3. Distribute via Jamf (macOS), SCCM (Windows), or Ansible (Linux).

### Method 4: Docker (Development Environments)

For standardized development environments:

```dockerfile
FROM node:20-slim
COPY . /opt/aisdlc-platform
WORKDIR /opt/aisdlc-platform
RUN bash install-platform.sh
# Note: SQLite DB will be inside the container
# Mount a volume for persistence: -v ~/.aisdlc:/root/.aisdlc
```

## Configuration Management

### Standardized Team Configuration

Create a shared configuration template:

```json
{
  "version": "4.0.0",
  "storage": "sqlite",
  "eventBus": "file",
  "dashboard": {
    "port": 3030,
    "host": "localhost"
  },
  "governance": {
    "level": 2,
    "requireApproval": true,
    "approvers": ["tech-lead", "security"]
  },
  "agents": {
    "preferredModel": "sonnet"
  }
}
```

Distribute this as `config-template.json` and have the installer apply it:

```bash
# In your customized install script
cp config-template.json "$HOME/.aisdlc/config.json"
```

### Environment-Specific Overrides

Developers can override team defaults:

```bash
npx aisdlc config set governance.level 1       # For local development
npx aisdlc config set dashboard.port 3031      # If 3030 is in use
```

## Security Considerations

### Data Residency

All data stays on the developer's machine:
- SQLite database at `~/.aisdlc/data/platform.db`
- Logs at `~/.aisdlc/logs/`
- Configuration at `~/.aisdlc/config.json`

No data is transmitted between developers or to any server (except Claude API calls which go to Anthropic).

### Access Control

- Database file permissions set to 0600 (owner read/write only) on Unix
- Dashboard binds to `localhost` only (not `0.0.0.0`)
- No remote access to any component
- No API keys stored in the database

### Compliance

| Requirement | How It Is Met |
|------------|---------------|
| GDPR | All data local, no cross-border transfer |
| SOC 2 | Audit logging, access controls, encryption at rest (OS-level) |
| HIPAA | No PHI in platform data, local-only storage |
| FedRAMP | No cloud infrastructure to certify |

### API Key Management

Claude Code API keys should be managed per your organization's secrets policy:

```bash
# Option 1: Environment variable (recommended)
export ANTHROPIC_API_KEY=sk-ant-...

# Option 2: Claude Code's built-in auth
claude auth login

# Option 3: Enterprise SSO (if Anthropic supports it)
# Contact Anthropic for enterprise authentication options
```

Never store API keys in the AI-SDLC database or configuration files.

## Monitoring and Observability

### Per-Developer Monitoring

Each developer has their own dashboard at `http://localhost:3030`:
- Active workflows and phase progress
- Agent performance metrics
- Audit trail
- Health status

### Team-Level Visibility

For team-level visibility, consider aggregating metrics:

1. **Git-Based Reporting**: SDLC documents (requirements, architecture, test reports) are checked into Git. Pull request reviews provide natural team visibility.

2. **Periodic Health Checks**: Add to your CI pipeline:
```bash
# In CI, verify platform health
npx aisdlc doctor --json > health-report.json
```

3. **Cost Tracking**: The FinOps agent tracks per-developer costs. Aggregate across the team by collecting cost reports from each developer's `docs/sdlc/costs/` directory.

## Upgrade Procedure

### Rolling Upgrades

Since each developer is independent, upgrades are inherently zero-downtime:

1. Publish new version to your distribution channel
2. Developers upgrade at their convenience:
```bash
git pull origin main
bash install-platform.sh  # Idempotent - safe to re-run
```

3. No coordination needed between developers
4. No database migration across a shared database

### Version Compatibility

The platform uses semver. Agent definitions are backward-compatible within a major version. SQLite schema includes a `schema_migrations` table for safe upgrades.

### Rollback

```bash
git checkout v4.0.0       # Previous version tag
bash install-platform.sh  # Reinstall previous version
```

Data is preserved across version changes. The SQLite schema only adds tables/columns, never removes them.

## Cost Estimation

### Per-Developer AI Costs

| Activity | Estimated Cost | Frequency |
|----------|---------------|-----------|
| Full SDLC workflow (7 phases) | $8-15 in tokens | Per feature |
| Security review only | $0.50-1.00 | Per review |
| Code review | $0.25-0.50 | Per review |
| Architecture design | $3-5 | Per design |

### Team Cost Projections

| Team Size | Features/Month | Estimated Monthly AI Cost |
|-----------|---------------|--------------------------|
| 5 | 10 | $80-150 |
| 20 | 40 | $320-600 |
| 50 | 100 | $800-1,500 |
| 200 | 400 | $3,200-6,000 |
| 1000 | 2000 | $16,000-30,000 |

Infrastructure cost: $0 (no shared infrastructure).

### Cost Optimization

1. **Use Sonnet for routine tasks** (requirements, testing, deployment)
2. **Reserve Opus for complex tasks** (architecture, problem-solving)
3. **Use Haiku for tracking/monitoring** (cheapest model)
4. **Cache agent outputs** -- LRU cache prevents redundant API calls

## Disaster Recovery

### Individual Developer Recovery

If a developer's database is corrupted:

```bash
# Option 1: Reset and start fresh
npx aisdlc reset --confirm
npx aisdlc init

# Option 2: Restore from backup
cp ~/.aisdlc/backups/latest.db ~/.aisdlc/data/platform.db
```

### Team-Wide Recovery

Since each developer is independent, team-wide disasters are not a concern for the platform itself. SDLC documents are in Git, providing distributed backup of all project artifacts.

## Support Matrix

### Operating Systems

| OS | Status | Notes |
|----|--------|-------|
| macOS 12+ | Fully supported | Primary development platform |
| Ubuntu 22.04+ | Fully supported | |
| Debian 12+ | Fully supported | |
| Windows 10+ (WSL2) | Supported | Use WSL2 for best experience |
| Windows 10+ (native) | Partial | Some path handling differences |
| RHEL 8+ | Supported | |
| Alpine Linux | Supported | Need `apk add python3 make g++` for native modules |

### Node.js Versions

| Version | Status |
|---------|--------|
| 20.x LTS | Fully supported (recommended) |
| 22.x | Supported |
| 18.x | Not supported (EOL) |

### Architecture

| Architecture | Status |
|-------------|--------|
| x86_64 / AMD64 | Fully supported |
| ARM64 / Apple Silicon | Fully supported |
| ARM (32-bit) | Not tested |

## FAQ

**Q: What happens if Claude API is down?**
A: The platform itself continues to work (dashboard, CLI, database). Agent execution waits for API availability. No data is lost.

**Q: Can two developers share a database?**
A: Not recommended. Each developer should have their own instance. Use Git for sharing artifacts.

**Q: How do I backup the database?**
A: Copy `~/.aisdlc/data/platform.db`. It is a single file. The uninstaller automatically creates a backup before removal.

**Q: Can I use this with a different AI provider?**
A: The platform is designed for Claude Code. The agent definitions use Claude-specific features. Adapting to other providers would require modifying agent definitions.

**Q: What is the maximum database size?**
A: SQLite supports databases up to 281 TB. In practice, even years of heavy use will produce a database under 100 MB.

**Q: Can I run this in CI/CD?**
A: Yes. Install the platform, run your commands, and collect outputs. The platform works in non-interactive mode.
