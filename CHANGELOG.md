# Changelog

All notable changes to the AI-SDLC Framework.

## [2.2.0] - 2026-01-20

### Added
- **Self-Learning Memory for ALL Agents** - Unified memory architecture at `~/.claude/agent-memory/`
- **Ask Tom Agent** - Elite problem-solving specialist with E.L.I.M.I.N.A.T.E. framework (Opus model)
- **Ask Tom Command** - `/sdlc-ask-tom` for direct problem-solving invocation
- **Automatic Problem Resolution** - Conductor auto-invokes Ask Tom on blockers
- **Root Cause Analysis** - 5 Whys, Fishbone diagrams, and Fault Tree methodologies
- **Agent Coordination** - Ask Tom can invoke any agent for specialized expertise
- **Problem Documentation** - Creates detailed reports at `docs/sdlc/problems/PROBLEM-*.md`
- **Prevention Measures** - Implements safeguards to prevent issue recurrence
- **Dashboard Integration** - Ask Tom appears in dashboard with special on-demand section

### Self-Learning Memory System
Every agent now has persistent memory:
- **BA Agent**: Requirements patterns, stakeholder knowledge, domain glossaries
- **Software Engineer**: Code patterns, bug fixes, performance solutions
- **Security Agent**: Vulnerability signatures, secure patterns, compliance rules
- **QA Agent**: Test patterns, flaky test solutions, performance baselines
- **Atlas Agent**: Deployment patterns, incident resolutions, scaling strategies
- **Customer Agent**: Acceptance patterns, user feedback, journey templates
- **Conductor**: Workflow patterns, blocker resolutions, estimation models
- **FinOps Agent**: Cost patterns, budget models, optimization strategies
- **Tracker Agent**: Duration patterns, early warning signs, reporting templates

### Changed
- Agent count increased from 10 to 11 (added Ask Tom)
- All agents now load memory BEFORE tasks and save learnings AFTER
- Conductor now auto-invokes Ask Tom on: blockers, 3+ phase failures, >2hr no progress
- Architect (Jets) enhanced as "World's Best Architect" for ANY system + Deltek specialty
- README.md updated with Ask Tom documentation and usage examples
- Dashboard workflow visualization includes Ask Tom as on-demand agent
- Output directories now include `docs/sdlc/problems/` folder
- Registry integration supports `ask-tom` agent tracking

### Enhanced
- **Architect (Jets)** - Universal architecture expertise with Deltek product specialty
- **Conductor Blocker Handling** - Step 5 now includes Ask Tom invocation criteria
- **Quality Standards** - Never-give-up criteria ensures complete problem resolution
- **Documentation** - Comprehensive problem resolution reports with lessons learned
- **Dashboard UI** - Purple-highlighted Ask Tom section with lightning bolt icon

## [2.1.1] - 2025-01-15

### Added
- **FinOps Agent** - Automatic AI token cost tracking and budget monitoring
- **Production-Ready Dashboard** - Node.js server with RESTful API endpoints
- **Costs Tab** - Comprehensive cost analytics with budget health indicators
- **Cost Integration** - Real-time cost data across Dashboard, Projects, and Agents tabs
- **Budget Alerts** - Color-coded warnings at 50% (🟡) and 90% (🔴) thresholds
- **Cost Efficiency Metrics** - Average cost per project, cost per 1K tokens
- **API Endpoints** - `/api/costs`, `/api/costs/:projectId` for FinOps data
- **Cost Breakdown** - Spending by agent, by project, with optimization tips

### Changed
- Dashboard now runs as standalone Node.js server (not JSX artifact)
- Version footer updated to v2.1.1 with cost tracking status
- Agent count increased from 9 to 10 (added FinOps)
- `/api/projects` now includes merged cost data
- Dashboard auto-refresh rate remains 3 seconds

### Enhanced
- **Dashboard Tab**: Added Total Spent card and budget utilization progress bar
- **Projects Tab**: Cost displays in project cards with budget health indicators
- **Agents Tab**: Total cost per agent across all projects
- **Backend**: Data transformation for FinOps native format to dashboard schema

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

### From 2.1.0 to 2.1.1

1. **Update**: `sdlc-update /path/to/aisdlc-2.1.1.zip`
2. **Start Dashboard Server**: `node dashboard/server.js`
3. **Access**: Open `http://localhost:3030` to see new Costs tab
4. **Note**: FinOps Agent automatically tracks costs to `~/.claude/finops-registry/costs/`
5. **Note**: Dashboard is now a Node.js server (not JSX artifact)

### From 2.1.1 to 2.2.0

1. **Update**: `sdlc-update /path/to/aisdlc-2.2.0.zip`
2. **Memory directories created automatically** at `~/.claude/agent-memory/`
3. **All agents enhanced** with self-learning capabilities
4. **Ask Tom available** via `/sdlc-ask-tom [problem]`
5. **Note**: Agents now learn from every task - patterns, solutions, and learnings persist
6. **Note**: Jets is now "World's Best Architect" for ANY system (not just Deltek)

---

## Version Numbering

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes to agent workflows
- **MINOR** (0.X.0): New agents, commands, or features
- **PATCH** (0.0.X): Bug fixes, documentation updates
