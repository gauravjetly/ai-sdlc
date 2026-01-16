# AI-SDLC Control Center Dashboard

Real-time web-based dashboard for monitoring AI-SDLC agent workflows across all projects.

## Features

✅ **Real-Time Updates** - Auto-refreshes every 3 seconds
✅ **Live Project Tracking** - Monitor all active, completed, and blocked projects
✅ **Agent Activity Feed** - See what each agent is doing in real-time
✅ **Visual Workflow** - Beautiful UI showing agent pipeline and progress
✅ **Centralized Monitoring** - Track workflows across multiple projects from one place
✅ **Registry Integration** - Pulls data directly from `~/.claude/sdlc-registry/`

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

## Dashboard Tabs

### 📊 Dashboard
- Real-time stats (Total, Completed, In Progress, Blocked)
- Agent workflow visualization
- Recent activity feed
- Auto-refresh every 3 seconds

### 📁 Projects
- List of all SDLC projects
- Click any project to see phase details
- Visual progress bars showing agent completion
- Status indicators (complete, in_progress, blocked)

### 🤖 Agents
- All 9 SDLC agents with their stats
- Invocation counts
- Blocking/failure metrics
- Model information (Opus/Sonnet/Haiku)

### 📝 Activity
- Complete chronological activity log
- Agent actions with timestamps
- Project associations
- Type indicators (progress, complete, blocked, approved)

---

## API Endpoints

The dashboard server provides REST API endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /api/registry` | Registry metadata and stats |
| `GET /api/projects` | All projects with phases |
| `GET /api/activity?limit=50` | Activity log (default 50 events) |

### Example API Usage

```bash
# Get registry stats
curl http://localhost:3030/api/registry

# Get all projects
curl http://localhost:3030/api/projects

# Get recent activity
curl http://localhost:3030/api/activity?limit=10
```

---

## How It Works

### Data Flow

```
SDLC Agents → Registry Files → Dashboard Server → Web UI
                ↓
    ~/.claude/sdlc-registry/
    ├── registry.json      (stats, agent counts)
    ├── activity.log       (timestamped events)
    └── projects/          (individual project files)
              └── SDLC-*.json
```

### Auto-Refresh

The dashboard automatically refreshes data every **3 seconds** to show:
- New projects created
- Phase transitions (BA → Architect → Engineer, etc.)
- Agent activity in real-time
- Blocking events or completions

### Registry Updates

Agents automatically update the registry when they:
- Create a new project
- Start a phase
- Complete a phase
- Block a project (security/QA)
- Log progress updates

---

## Configuration

### Port

Default: `3030`

Change the port:

```bash
PORT=8080 node server.js
```

Or set in your environment:

```bash
export PORT=8080
./start-dashboard.sh
```

### Registry Location

Default: `~/.claude/sdlc-registry/`

The dashboard reads from this location automatically. No configuration needed.

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

Change the port:

```bash
PORT=3031 ./start-dashboard.sh
```

### Browser doesn't auto-open

Manually open: `http://localhost:3030`

---

## Requirements

- **Node.js**: v12 or higher (v14+ recommended)
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)
- **AI-SDLC**: v2.1.0 or higher

---

## Keyboard Shortcuts

- **Ctrl+C** - Stop the server
- **Cmd/Ctrl+R** - Refresh browser (not needed, auto-refreshes)
- **Cmd/Ctrl+W** - Close browser tab

---

## Architecture

### Server (server.js)

- Node.js HTTP server
- Serves static HTML
- Provides JSON API endpoints
- Reads registry files directly
- No external dependencies (uses only Node.js built-ins)

### Client (index.html)

- React 18 (loaded from CDN)
- Babel for JSX compilation
- Auto-refresh with `setInterval`
- Responsive design
- Dark theme optimized for code work

---

## Integration with SDLC Workflow

### Automatic Updates

When you run SDLC commands, the dashboard updates automatically:

```bash
# Terminal 1: Start dashboard
./start-dashboard.sh

# Terminal 2: Run SDLC workflow
/sdlc-start Build user authentication

# Dashboard automatically shows:
# - New project created
# - Conductor phase starting
# - BA Agent gathering requirements
# - Live progress updates
```

### Multi-Project Monitoring

The dashboard tracks ALL projects across your system:

- Projects in `~/project-a/`
- Projects in `~/project-b/`
- Projects in `~/company/repo/`

All show up in the same dashboard because they all write to:
`~/.claude/sdlc-registry/`

---

## Sample Data

To test the dashboard with sample data:

```bash
# Create a test project
~/.claude/bin-sdlc-registry create SDLC-TEST-001 "Test Project" "Sample description"

# Start a phase
~/.claude/bin-sdlc-registry start SDLC-TEST-001 ba

# Complete a phase
~/.claude/bin-sdlc-registry complete SDLC-TEST-001 ba "REQ-001.md"

# Check dashboard - it updates automatically!
```

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

# Stop
pm2 stop sdlc-dashboard

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Using systemd (Linux)

Create `/etc/systemd/system/sdlc-dashboard.service`:

```ini
[Unit]
Description=AI-SDLC Control Center Dashboard
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/aisdlc-2.1.0/dashboard
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable sdlc-dashboard
sudo systemctl start sdlc-dashboard
sudo systemctl status sdlc-dashboard
```

---

## Security Notes

⚠️ **Local Use Only**: The dashboard server has no authentication and should only be run on `localhost`.

For production/team use:
- Add authentication middleware
- Use HTTPS with TLS certificates
- Deploy behind a reverse proxy (nginx/Apache)
- Add rate limiting
- Enable CORS only for specific domains

---

## Future Enhancements

Planned features:

- [ ] WebSocket support for instant updates (no polling)
- [ ] Filtering and search
- [ ] Export data to CSV/JSON
- [ ] Dark/light theme toggle
- [ ] Agent performance charts
- [ ] Project timeline visualization
- [ ] Email/Slack notifications for blocks
- [ ] Multi-user support with authentication

---

## Support

For issues or questions:

1. Check the registry is initialized: `~/.claude/bin-sdlc-registry status`
2. Verify Node.js version: `node -v`
3. Check server logs for errors
4. View browser console (F12) for client errors

---

**Built for AI-SDLC Framework v2.1.0**
**Powered by Node.js + React 18**
**Auto-refresh: 3 seconds • Localhost only • No external dependencies**
