# Quick Start Guide: AI-SDLC Integrated Dashboard

Get up and running with the AI-SDLC Integrated Dashboard in under 5 minutes.

## What is This?

The AI-SDLC Integrated Dashboard is a unified control center that combines:
- **AI-SDLC Control Center** - Monitor your AI-powered software development lifecycle
- **Platform UI** - Manage deployments, environments, and infrastructure
- **Visual Designer** - Design and configure cloud architectures visually
- **Deployment Manager** - Track and control application deployments

All in one seamless interface at http://localhost:3030

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Operating System**: macOS, Linux, or Windows (WSL2)
- **Ports Available**: 3030, 3000, 3001 must be free

### Check Prerequisites

```bash
# Check Node.js version
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: 9.x.x or higher

# Check if ports are free
lsof -i :3030,3000,3001
# Expected: No output (ports are free)
```

---

## Installation

### Step 1: Clone or Navigate to Repository

```bash
cd /Users/gauravjetly/aisdlc-2.1.0
```

### Step 2: Install Dependencies

**Install Platform API dependencies:**
```bash
cd src/platform
npm install
cd ../..
```

**Install Platform Webapp dependencies:**
```bash
cd src/platform/webapp
npm install
cd ../../..
```

**Dashboard server has no dependencies** (uses Node.js built-ins only)

### Step 3: Verify Installation

```bash
# Check if node_modules exist
ls src/platform/node_modules
ls src/platform/webapp/node_modules
```

---

## Starting the Dashboard

### Quick Start (Recommended)

Use the unified startup script:

```bash
./start-all.sh
```

This will:
1. Start the Dashboard Server (port 3030)
2. Start the Platform API (port 3000)
3. Start the Platform Webapp (port 3001)
4. Run health checks for all services
5. Display access URLs

**Expected Output:**
```
==========================================
  AI-SDLC Integrated Dashboard
==========================================

Checking prerequisites...
Prerequisites OK

1. Starting Dashboard Server (port 3030)...
Waiting for Dashboard on port 3030...
Dashboard is ready!
Dashboard started (PID: 12345)

2. Starting Platform API (port 3000)...
Waiting for Platform API on port 3000...
Platform API is ready!
Platform API started (PID: 12346)

3. Starting Platform Webapp (port 3001)...
Waiting for Platform Webapp on port 3001...
Platform Webapp is ready!
Platform Webapp started (PID: 12347)

==========================================
  All Services Started Successfully!
==========================================

Access Points:
  Main Dashboard:  http://localhost:3030
  Platform API:    http://localhost:3000
  Platform Webapp: http://localhost:3001

Logs:
  Dashboard: .platform-state/logs/dashboard.log
  API:       .platform-state/logs/api.log
  Webapp:    .platform-state/logs/webapp.log

Press Ctrl+C to stop all services
```

### Manual Start (Advanced)

If you prefer to start services individually:

**Terminal 1 - Dashboard Server:**
```bash
cd dashboard
node server.js
```

**Terminal 2 - Platform API:**
```bash
cd src/platform
npm run api:dev
```

**Terminal 3 - Platform Webapp:**
```bash
cd src/platform/webapp
npm run dev
```

---

## Accessing the Dashboard

### Open in Browser

Navigate to: **http://localhost:3030**

You should see the AI-SDLC Control Center with multiple tabs:
- Overview
- Projects
- Agents
- Activity
- Platform UI
- Visual Designer
- Deployments

### First-Time Setup

1. **Check the Overview Tab**: Shows system status and quick stats
2. **Explore Projects**: View all SDLC projects tracked by the system
3. **Check Agents**: See the status of all AI agents (BA, Architect, Engineer, etc.)
4. **Review Activity**: Real-time feed of SDLC activities
5. **Try Platform UI**: Click to see the embedded platform interface
6. **Test Theme Switching**: Toggle between light and dark themes (top-right corner)

---

## Using the Dashboard

### Navigation

Click any tab in the top navigation to switch views:

| Tab | Description |
|-----|-------------|
| **Overview** | Dashboard home with system stats |
| **Projects** | List and manage all SDLC projects |
| **Agents** | Monitor AI agent status and performance |
| **Activity** | Real-time activity feed and logs |
| **Platform UI** | Full platform interface (embedded) |
| **Visual Designer** | Drag-and-drop cloud architecture designer |
| **Deployments** | Deployment management and tracking |

### Key Features

**1. Theme Synchronization**
- Toggle theme in dashboard (moon/sun icon)
- Embedded views automatically match your theme preference
- Theme persists across sessions

**2. Real-time Updates**
- Activity feed updates automatically
- Project status changes appear instantly
- No manual refresh needed

**3. Unified Interface**
- Access all platform features without switching apps
- Seamless navigation between views
- Consistent experience across all tabs

**4. API Integration**
- Dashboard proxies API requests to Platform API
- Direct access to `/api/*` endpoints through dashboard
- No CORS issues

---

## Common Tasks

### 1. Start a New SDLC Project

From the Claude CLI:
```bash
/sdlc-start "Build user authentication system"
```

Then view progress in dashboard:
1. Go to http://localhost:3030
2. Click "Activity" tab
3. Watch real-time progress
4. Check "Projects" tab for project details

### 2. Deploy an Application

1. Open dashboard: http://localhost:3030
2. Click "Platform UI" tab
3. Navigate to Deployments
4. Click "New Deployment"
5. Follow deployment wizard

Or use the dedicated "Deployments" tab for quick access.

### 3. Design Cloud Architecture

1. Open dashboard: http://localhost:3030
2. Click "Visual Designer" tab
3. Drag components onto canvas
4. Connect components
5. Configure properties
6. Export as Terraform/CloudFormation

### 4. Monitor Agent Activity

1. Open dashboard: http://localhost:3030
2. Click "Agents" tab
3. View agent status (idle/active/error)
4. Check agent performance metrics
5. Review agent task history

---

## Troubleshooting

### Port Already in Use

**Problem**: Error message "Port 3030 is already in use"

**Solution**:
```bash
# Find process using port 3030
lsof -i :3030

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or kill all node processes (use with caution)
pkill -9 node

# Restart dashboard
./start-all.sh
```

### Services Not Starting

**Problem**: One or more services fail to start

**Solution 1: Check logs**
```bash
# View dashboard logs
tail -f .platform-state/logs/dashboard.log

# View API logs
tail -f .platform-state/logs/api.log

# View webapp logs
tail -f .platform-state/logs/webapp.log
```

**Solution 2: Manual restart**
```bash
# Stop all services
./stop-all.sh  # or Ctrl+C

# Clean PID files
rm -f dashboard/dashboard.pid
rm -f .platform-state/api.pid
rm -f .platform-state/webapp.pid

# Restart
./start-all.sh
```

### Iframe Not Loading

**Problem**: "Platform UI" or other embedded views show blank screen

**Solutions**:

1. **Check if webapp is running**:
   ```bash
   curl http://localhost:3001
   ```
   Should return HTML. If not, restart webapp.

2. **Check browser console**:
   Press F12, look for errors related to CORS or iframe loading.

3. **Clear browser cache**:
   Hard refresh: Shift+F5 (Windows/Linux) or Cmd+Shift+R (Mac)

4. **Try different browser**:
   Test in Chrome, Firefox, or Safari to isolate browser-specific issues.

### Theme Not Syncing

**Problem**: Changing theme in dashboard doesn't update embedded views

**Solutions**:

1. **Check browser console**: Look for postMessage errors
2. **Verify both services running**: Dashboard (3030) and Webapp (3001)
3. **Clear localStorage**:
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```
4. **Check for JavaScript errors**: Open DevTools, check Console tab

### API Requests Failing

**Problem**: Data not loading, API errors in console

**Solutions**:

1. **Verify API is running**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check API logs**:
   ```bash
   tail -f .platform-state/logs/api.log
   ```

3. **Restart API**:
   ```bash
   cd src/platform
   npm run api:dev
   ```

4. **Check proxy configuration**: Ensure dashboard server.js has correct proxy routes

### Performance Issues

**Problem**: Dashboard slow or unresponsive

**Solutions**:

1. **Check system resources**:
   ```bash
   # Check CPU and memory
   top -o cpu
   ```

2. **Restart services**: Sometimes a fresh start helps
   ```bash
   ./stop-all.sh
   ./start-all.sh
   ```

3. **Clear browser data**: Excessive cache can slow things down

4. **Reduce browser extensions**: Disable unnecessary extensions

### Can't Stop Services

**Problem**: Ctrl+C doesn't stop services, or processes remain running

**Solutions**:

1. **Force kill by PID**:
   ```bash
   # Kill dashboard
   kill -9 $(cat dashboard/dashboard.pid)

   # Kill API
   kill -9 $(cat .platform-state/api.pid)

   # Kill webapp
   kill -9 $(cat .platform-state/webapp.pid)
   ```

2. **Kill all node processes** (use with caution):
   ```bash
   pkill -9 node
   ```

3. **Clean up PID files**:
   ```bash
   rm -f dashboard/dashboard.pid
   rm -f .platform-state/api.pid
   rm -f .platform-state/webapp.pid
   ```

---

## Advanced Configuration

### Changing Ports

If you need to use different ports, edit the following:

**Dashboard Port (default 3030):**
Edit `dashboard/server.js`:
```javascript
const PORT = process.env.PORT || 3030;
```

**API Port (default 3000):**
Edit `src/platform/package.json`:
```json
"scripts": {
  "api:dev": "PORT=3000 node api/server.js"
}
```

**Webapp Port (default 3001):**
Edit `src/platform/webapp/vite.config.ts`:
```typescript
server: {
  port: 3001
}
```

### Environment Variables

Create `.env` files for environment-specific configuration:

**Dashboard** (`dashboard/.env`):
```bash
PORT=3030
API_URL=http://localhost:3000
LOG_LEVEL=info
```

**Platform API** (`src/platform/.env`):
```bash
PORT=3000
DATABASE_URL=postgresql://...
LOG_LEVEL=debug
```

**Platform Webapp** (`src/platform/webapp/.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_TITLE=AI-SDLC Platform
```

### Enabling Debug Mode

For detailed logging:

```bash
# Set debug environment variable
export DEBUG=true

# Start with verbose logging
NODE_ENV=development ./start-all.sh
```

---

## Next Steps

Now that you have the dashboard running:

1. **Explore the Interface**: Click through all tabs and features
2. **Run Integration Tests**: Follow `INTEGRATION-TEST-CHECKLIST.md`
3. **Create a Test Project**: Use `/sdlc-start` to see the full workflow
4. **Deploy an Application**: Try the deployment wizard
5. **Customize Theme**: Set your preferred color scheme
6. **Read Architecture Docs**: See `docs/sdlc/architecture/` for technical details

---

## Getting Help

### Documentation

- **Integration Tests**: See `INTEGRATION-TEST-CHECKLIST.md`
- **Architecture**: See `docs/sdlc/architecture/`
- **API Docs**: http://localhost:3000/api-docs (when API is running)
- **Main README**: See `README.md` in project root

### Logs

Check logs for detailed error information:

```bash
# Dashboard logs
tail -f .platform-state/logs/dashboard.log

# API logs
tail -f .platform-state/logs/api.log

# Webapp logs
tail -f .platform-state/logs/webapp.log
```

### Common Log Locations

- Dashboard server: `.platform-state/logs/dashboard.log`
- Platform API: `.platform-state/logs/api.log`
- Platform webapp: `.platform-state/logs/webapp.log`
- SDLC activity: `~/.claude/sdlc-registry/activity.log`

### Community

- Open an issue on GitHub
- Check existing issues for similar problems
- Contribute improvements via pull requests

---

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `./start-all.sh` | Start all services |
| `Ctrl+C` | Stop all services |
| `./test-integration.sh` | Run integration tests |
| `lsof -i :3030,3000,3001` | Check port usage |
| `tail -f .platform-state/logs/*.log` | View logs |

### URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3030 |
| Platform API | http://localhost:3000 |
| Platform Webapp | http://localhost:3001 |
| API Health | http://localhost:3000/health |
| API Docs | http://localhost:3000/api-docs |

### Key Files

| File | Purpose |
|------|---------|
| `start-all.sh` | Unified startup script |
| `dashboard/server.js` | Dashboard web server |
| `src/platform/api/server.js` | Platform REST API |
| `src/platform/webapp/src/App.tsx` | Webapp entry point |

---

## Success Checklist

You know everything is working when:

- [ ] All three services start without errors
- [ ] Dashboard loads at http://localhost:3030
- [ ] All tabs are accessible
- [ ] Theme switching works
- [ ] Embedded iframes load properly
- [ ] Activity feed updates in real-time
- [ ] No errors in browser console
- [ ] API requests succeed
- [ ] Services stop cleanly with Ctrl+C

---

**Congratulations!** You now have a fully functional AI-SDLC Integrated Dashboard.

Start building amazing software with AI-powered development workflows!

---

*Last Updated: 2026-02-10*
*Version: 1.0.0*
