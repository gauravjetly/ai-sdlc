# AI-SDLC Control Center Dashboard

Real-time web-based dashboard for monitoring AI-SDLC agent workflows across all projects.

**Version**: 2.4.0

---

## Features

### Core Dashboard
- **Real-Time Updates** - SSE (Server-Sent Events) for instant notifications
- **Live Project Tracking** - Monitor all active, completed, and blocked projects
- **Agent Activity Feed** - See what each agent is doing in real-time
- **Visual Workflow** - Beautiful UI showing agent pipeline and progress
- **Dark Mode** - Toggle between light and dark themes
- **Keyboard Shortcuts** - Press `⌘K` (or `Ctrl+K`) for command palette

### Advanced Features (v2.4.0)

| Feature | Description |
|---------|-------------|
| **Project Detail Modal** | Click any project for full phase history, logs, metrics |
| **Command Palette** | `⌘K` for VS Code-style quick actions and navigation |
| **Sparkline Charts** | Mini trend visualizations in metric cards |
| **Gantt Timeline** | Visual timeline view of all projects |
| **Agent Deep Dive** | Click any agent for full history and stats |
| **PDF Export** | Print-optimized executive summaries |
| **Budget Alerts** | Toast notifications when budget thresholds hit |
| **AI Insights** | Auto-generated recommendations on Executive view |
| **Compare Projects** | Side-by-side project comparison |
| **Predictive Analytics** | ML-based completion date estimates |
| **Integration Hub** | Jira, GitHub, Slack connection management |

---

## Quick Start

### Option 1: Using the Start Script (Recommended)

```bash
cd ~/aisdlc-2.1.0/dashboard
./start-dashboard.sh
```

The dashboard will automatically open in your browser at `http://localhost:3030`

### Option 2: Global Command

```bash
~/.claude/sdlc-dashboard
```

### Option 3: Direct Node.js

```bash
cd ~/aisdlc-2.1.0/dashboard
node server.js
```

---

## Dashboard Views

### Executive Dashboard
- **SDLC Pipeline Flow** - All 8 stages with project counts per stage
- **Agent Performance Grid** - Invocations, success rates, costs for each agent
- **Project Velocity Chart** - 4-week trend of completed projects
- **Bottleneck Detection** - Identify which agents are blocking projects
- **AI Insights Panel** - Auto-generated recommendations based on data
- **Predictive Analytics** - ML-based completion date estimates
- **Cost by Model** - Opus/Sonnet/Haiku distribution

### Projects View
- **Project Cards** - Click for full detail modal
- **Search & Filter** - Find projects by name, status, or ID
- **Status Filters** - All, In Progress, Completed, Blocked
- **Archive System** - Archive/restore projects with dedicated view
- **Phase Progress** - Visual pipeline showing agent completion
- **Cost Tracking** - Per-project spending with budget health

### Agents View
- **All 11 Agents** - Conductor, BA, Jets, Engineer, Security, QA, Atlas, Customer, Ask Tom, FinOps, Tracker
- **Agent Cards** - Click for deep dive modal with full history
- **Pipeline Agents** - Core SDLC workflow agents
- **Support Agents** - On-demand specialists (Ask Tom, FinOps, Tracker)
- **Performance Stats** - Invocations, costs, success rates

### Timeline View (New in v2.4.0)
- **Gantt Chart** - Visual timeline of all projects
- **Phase Duration** - See how long each phase takes
- **Project Overlap** - Identify resource conflicts
- **Hover Details** - Quick info on any timeline segment

### Compare View (New in v2.4.0)
- **Side-by-Side** - Compare up to 4 projects
- **Metric Comparison** - Costs, duration, phase completion
- **Performance Analysis** - Identify best/worst performers
- **Selection Interface** - Easy project picker

### Integrations Hub (New in v2.4.0)
- **Jira Integration** - Connect to Jira for ticket sync
- **GitHub Integration** - Link to repos and PRs
- **Slack Integration** - Real-time notifications
- **Connection Management** - Add, edit, remove integrations
- **Status Indicators** - Connected/Disconnected state

### Costs View
- **Summary Cards** - Total budget, spent, remaining, health
- **Cost by Agent** - Horizontal bars showing distribution
- **Cost by Model** - Opus/Sonnet/Haiku breakdown
- **Efficiency Metrics** - Cost per project, per 1K tokens
- **Optimization Tips** - Best practices for reducing costs

### Activity View
- **Chronological Log** - All agent actions with timestamps
- **Event Types** - Phase starts, completions, blocks, approvals
- **Real-time Updates** - Instant via SSE

### AI Learning View
- **Commands Reference** - All /sdlc-* commands with examples
- **Prompt Templates** - Best practice prompts for common tasks
- **Tips & Best Practices** - Guidance for optimal results
- **Agent Guide** - When to use each agent
- **Best Practices** - Category-specific recommendations

### Value & ROI View
- **Time Savings** - Estimated hours saved vs manual
- **Cost Efficiency** - AI cost vs developer cost
- **Quality Improvements** - Defect reduction, code quality
- **ROI Calculator** - Return on investment metrics

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Escape` | Close modal/palette |
| `↑` / `↓` | Navigate palette options |
| `Enter` | Select palette option |

### Command Palette Actions
- Navigate to any view (Executive, Projects, Agents, etc.)
- Search and open projects by name
- Run SDLC workflow
- Toggle dark/light theme
- Export data (CSV, PDF)
- Open settings

---

## API Endpoints

The dashboard server provides REST API endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /api/registry` | Registry metadata and stats |
| `GET /api/projects` | All projects with phases and costs |
| `GET /api/costs` | All cost data |
| `GET /api/costs/:projectId` | Specific project costs |
| `GET /api/activity?limit=50` | Activity log (default 50 events) |
| `GET /api/memory` | Agent memory stats |
| `GET /events` | SSE endpoint for real-time updates |

### Example API Usage

```bash
# Get registry stats
curl http://localhost:3030/api/registry

# Get all projects with costs
curl http://localhost:3030/api/projects

# Get recent activity
curl http://localhost:3030/api/activity?limit=10

# Get cost data
curl http://localhost:3030/api/costs
```

---

## Data Sources

### SDLC Registry (`~/.claude/sdlc-registry/`)
```
├── registry.json      (stats, agent counts)
├── activity.log       (timestamped events)
└── projects/          (individual project files)
          └── SDLC-*.json
```

### FinOps Registry (`~/.claude/finops-registry/costs/`)
```
└── {PROJECT_ID}-costs.json
```

### Agent Memory (`~/.claude/agent-memory/`)
```
├── ba/
├── engineer/
├── security/
├── qa/
├── atlas/
├── customer/
├── conductor/
├── finops/
├── tracker/
└── shared/
```

---

## Configuration

### Port

Default: `3030`

Change the port:

```bash
PORT=8080 node server.js
```

### Budget Settings

Stored in browser localStorage:
- `sdlc-budget` - Total budget amount (default: $10)
- `sdlc-budget-alert` - Alert threshold percentage (default: 80%)

### Theme

Stored in browser localStorage:
- `sdlc-theme` - "light" or "dark"

### Integrations

Stored in browser localStorage:
- `sdlc-integrations` - JSON array of integration configs

---

## Modals & Overlays

### Project Detail Modal
Click any project card to open:
- **Overview** - Status, cost, duration, progress
- **Phase Timeline** - Visual timeline of all phases
- **Cost Breakdown** - Spending by agent and model
- **Activity Log** - Recent events for this project
- **Actions** - Archive, export, run again

### Agent Detail Modal
Click any agent card to open:
- **Stats** - Total invocations, success rate, total cost
- **Performance** - Average duration, blocked count
- **Recent Activity** - Latest actions by this agent
- **Capabilities** - Agent description and model info

### Command Palette
Press `⌘K` to open:
- **Search** - Type to filter commands and projects
- **Navigation** - Quick jump to any view
- **Actions** - Run SDLC, export, toggle theme
- **Projects** - Search and open by name

---

## Troubleshooting

### Dashboard shows "No projects yet"

This is normal if you haven't run any SDLC workflows. To create a project:

```bash
/sdlc-start Build a simple REST API
```

### "Registry not initialized" warning

Run:

```bash
~/.claude/bin-sdlc-registry init
```

### Port already in use

Kill existing process and restart:

```bash
lsof -ti:3030 | xargs kill -9
node server.js
```

Or change the port:

```bash
PORT=3031 node server.js
```

### Browser doesn't auto-open

Manually open: `http://localhost:3030`

### Command Palette not opening

- Mac: Press `⌘K`
- Windows/Linux: Press `Ctrl+K`

### Dark mode not persisting

Check browser localStorage is not blocked. Theme is stored in `sdlc-theme`.

---

## Requirements

- **Node.js**: v14 or higher
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)
- **AI-SDLC**: v2.4.0 or higher

---

## Architecture

### Server (server.js)

- Node.js HTTP server
- Serves static HTML
- Provides JSON API endpoints
- SSE for real-time updates
- Reads registry and cost files
- No external dependencies

### Client (index.html)

- React 18 (loaded from CDN)
- Babel for JSX compilation
- SSE for real-time updates
- Responsive design
- Light/dark theme support
- ~7000 lines of integrated code

### Components

| Component | Description |
|-----------|-------------|
| `App` | Main application with routing |
| `ExecutiveDashboard` | Analytics overview |
| `Projects` | Project list with search/filter |
| `ProjectCard` | Individual project display |
| `ProjectDetailModal` | Full project details |
| `Agents` | Agent grid display |
| `AgentCard` | Individual agent display |
| `AgentDetailModal` | Full agent details |
| `GanttTimeline` | Timeline visualization |
| `CompareProjectsView` | Side-by-side comparison |
| `IntegrationHub` | External connections |
| `CommandPalette` | Quick command menu |
| `ToastContainer` | Notification system |
| `AIInsightsPanel` | Recommendations |
| `PredictiveAnalytics` | Completion estimates |

---

## Production Use

### Running in Background

```bash
# Start in background
nohup node server.js > dashboard.log 2>&1 &

# Check if running
lsof -i :3030

# Stop
kill $(lsof -t -i:3030)
```

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start dashboard
pm2 start server.js --name sdlc-dashboard

# Monitor
pm2 status

# Logs
pm2 logs sdlc-dashboard

# Auto-restart on system reboot
pm2 startup
pm2 save
```

---

## Security Notes

**Local Use Only**: The dashboard server has no authentication and should only be run on `localhost`.

For production/team use:
- Add authentication middleware
- Use HTTPS with TLS certificates
- Deploy behind a reverse proxy (nginx/Apache)
- Add rate limiting
- Enable CORS only for specific domains

---

## Version History

| Version | Date | Features |
|---------|------|----------|
| 2.4.0 | 2026-01-21 | 12 advanced features (Command Palette, Gantt, AI Insights, etc.) |
| 2.3.0 | 2026-01-20 | Memory dashboard, cross-agent learning |
| 2.1.1 | 2025-01-15 | Costs tab, FinOps integration |
| 2.1.0 | 2025-01-15 | Initial dashboard release |

---

**Built for AI-SDLC Framework v2.4.0**
**Powered by Node.js + React 18**
**Real-time SSE • Dark Mode • Command Palette • 12 Advanced Features**
