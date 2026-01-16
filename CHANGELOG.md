# Changelog

All notable changes to the AI-SDLC Framework.

## [2.1.0] - 2025-01-15

### Added
- **Control Center Dashboard** - React UI for monitoring agent activity
- **SDLC Registry** - Central tracking of all agent invocations
- **sdlc-registry CLI** - Command-line tool for viewing stats and activity
- **sdlc-update CLI** - Seamless update manager with backup/rollback
- Registry integration in Conductor agent
- `--cleanup` flag for install.sh to auto-remove source directory
- `--project` flag for install.sh to install to project directory
- Automatic cleanup of deprecated files during install/update

### Changed
- Agents now log activity to `~/.claude/sdlc-registry/`
- Install script now sets up registry automatically
- Package naming now includes version (e.g., `aisdlc-2.1.0.zip`)

### Deprecated Files (auto-removed on install/update)
- `devops-sre-agent.md` → renamed to `atlas-agent.md`

## [2.0.0] - 2025-01-15

### Added
- **Atlas Agent** - Dedicated DevOps/SRE agent for deployment
- **Post-deployment UAT** - Customer Agent now tests live environment
- `/sdlc-deploy` command for deployment workflow

### Changed
- **Security Agent** - Now review-only (no deployment)
- **Customer Agent** - Now performs post-deployment acceptance testing
- 7-phase workflow (was 6)
- Agent naming: Jets (Architect), Atlas (DevOps/SRE)

### Fixed
- Clear separation of concerns between Security and Deployment

## [1.0.0] - 2025-01-15

### Added
- Initial release
- 8 SDLC agents (Conductor, BA, Architect, Engineer, Security, QA, Customer, Tracker)
- 6 slash commands
- A2A Protocol for agent communication
- Project template with CLAUDE.md
- Installation scripts

---

## Upgrade Guide

### From 1.x to 2.x

1. **Backup first**: `sdlc-update --backup`
2. **Update**: `sdlc-update /path/to/aisdlc-complete.zip`
3. **Note**: Security Agent no longer deploys - Atlas handles deployment
4. **Note**: Customer Agent now tests post-deployment

### From 2.0 to 2.1

1. **Update**: `sdlc-update /path/to/aisdlc-complete.zip`
2. **Initialize registry**: `sdlc-registry init`
3. **Open Control Center**: Use the JSX artifact in Claude.ai

---

## Version Numbering

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes to agent workflows
- **MINOR** (0.X.0): New agents, commands, or features
- **PATCH** (0.0.X): Bug fixes, documentation updates
