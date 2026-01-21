# Agent Registry System

**Version**: 2.4.0

The registry tracks all agent invocations across projects, enabling the Control Center dashboard to show real-time status.

## Registry Location

```
~/.claude/sdlc-registry/
├── registry.json        # Main registry file
├── projects/           # Per-project tracking
│   ├── SDLC-20250115-1423.json
│   └── ...
└── activity.log        # Chronological activity log
```

## FinOps Registry (v2.1.1+)

```
~/.claude/finops-registry/costs/
└── {PROJECT_ID}-costs.json    # Cost tracking per project
```

## Agent Memory (v2.2.0+)

```
~/.claude/agent-memory/
├── ba/                 # BA agent learnings
├── engineer/           # Software engineer patterns
├── security/           # Security vulnerabilities
├── qa/                 # Test patterns
├── atlas/              # Deployment patterns
├── customer/           # UAT patterns
├── conductor/          # Orchestration patterns
├── finops/             # Cost optimization patterns
├── tracker/            # Tracking patterns
└── shared/             # Cross-agent learnings
```

## Registry Schema

### registry.json
```json
{
  "version": "2.0.0",
  "lastUpdated": "2025-01-15T15:30:00Z",
  "stats": {
    "totalProjects": 15,
    "completedProjects": 12,
    "activeProjects": 2,
    "blockedProjects": 1,
    "totalInvocations": 342
  },
  "agents": {
    "conductor": { "invocations": 45, "avgDuration": "2m" },
    "ba": { "invocations": 42, "avgDuration": "15m" },
    "jets": { "invocations": 40, "avgDuration": "22m" },
    "engineer": { "invocations": 38, "avgDuration": "1h 15m" },
    "security": { "invocations": 35, "avgDuration": "18m", "blocked": 3 },
    "qa": { "invocations": 32, "avgDuration": "25m", "failed": 2 },
    "atlas": { "invocations": 30, "avgDuration": "10m", "rollbacks": 1 },
    "customer": { "invocations": 28, "avgDuration": "20m", "rejected": 1 },
    "tracker": { "invocations": 52, "avgDuration": "1m" }
  },
  "projects": ["SDLC-20250115-1423", "SDLC-20250115-0930", "..."]
}
```

### Project File (projects/SDLC-*.json)
```json
{
  "id": "SDLC-20250115-1423",
  "name": "Customer Feedback Portal",
  "description": "Build customer feedback portal with sentiment analysis",
  "status": "in_progress",
  "createdAt": "2025-01-15T14:23:00Z",
  "updatedAt": "2025-01-15T15:08:00Z",
  "currentPhase": "engineer",
  "phases": [
    {
      "agent": "conductor",
      "status": "complete",
      "startedAt": "2025-01-15T14:23:00Z",
      "completedAt": "2025-01-15T14:25:00Z",
      "duration": "2m",
      "outputs": ["docs/sdlc/tracking/SDLC-20250115-1423.md"]
    },
    {
      "agent": "ba",
      "status": "complete",
      "startedAt": "2025-01-15T14:25:00Z",
      "completedAt": "2025-01-15T14:40:00Z",
      "duration": "15m",
      "outputs": ["docs/sdlc/requirements/REQ-001.md"],
      "metrics": {
        "functionalRequirements": 8,
        "nonFunctionalRequirements": 5,
        "acceptanceCriteria": 12
      }
    }
  ],
  "activity": [
    {
      "timestamp": "2025-01-15T15:08:00Z",
      "agent": "engineer",
      "action": "Implementing FeedbackService class",
      "type": "progress"
    }
  ]
}
```

## How Agents Register Activity

Each agent should call the registry at key points:

### 1. Phase Start
```bash
# Called when agent begins work
claude-registry start-phase --project SDLC-20250115-1423 --agent engineer
```

### 2. Progress Update
```bash
# Called during work to log progress
claude-registry log --project SDLC-20250115-1423 --agent engineer \
  --action "Implementing FeedbackService class" --type progress
```

### 3. Phase Complete
```bash
# Called when agent finishes
claude-registry complete-phase --project SDLC-20250115-1423 --agent engineer \
  --outputs "src/services/feedback/,tests/services/feedback/" \
  --metrics '{"files":12,"coverage":"85%"}'
```

### 4. Blocking Events
```bash
# Called by Security/QA/Customer when blocking
claude-registry block --project SDLC-20250115-1423 --agent security \
  --reason "2 high severity vulnerabilities found" \
  --findings "SEC-001,SEC-002"
```

## Integration with Agents

Add this to each agent's workflow:

```markdown
## Registry Integration

At the start of your work:
1. Log phase start to registry

During your work:
2. Log significant progress events

At completion:
3. Log phase completion with outputs and metrics

If blocking:
4. Log block event with reason
```

## Control Center Integration

The Control Center reads from the registry:

1. **Dashboard**: Reads `registry.json` for stats
2. **Projects**: Reads `projects/*.json` for details
3. **Activity**: Reads `activity.log` for timeline
4. **Agents**: Aggregates from registry stats
5. **Costs**: Reads from `~/.claude/finops-registry/costs/` (v2.1.1+)
6. **Memory**: Reads from `~/.claude/agent-memory/` (v2.2.0+)

## Dashboard Features (v2.4.0)

The Control Center dashboard provides comprehensive visualization:

### Views
- **Executive Dashboard** - SDLC pipeline flow, agent performance, velocity charts
- **Projects** - Clickable cards with detail modals, search/filter, archive
- **Agents** - Clickable cards with deep dive modals
- **Timeline** - Gantt chart visualization of projects
- **Compare** - Side-by-side project comparison
- **Integrations** - Jira, GitHub, Slack connections
- **Costs** - Budget tracking and efficiency metrics
- **Activity** - Real-time event log

### Advanced Features
- **Command Palette** - Press `⌘K` for quick actions
- **AI Insights** - Auto-generated recommendations
- **Predictive Analytics** - Completion date estimates
- **Budget Alerts** - Toast notifications on threshold
- **PDF Export** - Print-optimized reports

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/registry` | Registry stats |
| `GET /api/projects` | Projects with costs |
| `GET /api/costs` | All cost data |
| `GET /api/activity` | Activity log |
| `GET /api/memory` | Agent memory stats |
| `GET /events` | SSE for real-time |

## File Watcher (Optional)

For real-time updates, the dashboard uses SSE (Server-Sent Events):

```bash
# Start the dashboard server with SSE support
node dashboard/server.js
```

The dashboard automatically connects to `/events` for live updates.
