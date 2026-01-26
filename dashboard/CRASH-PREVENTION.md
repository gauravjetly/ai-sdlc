# Dashboard Crash Prevention Guide

## Problem

The dashboard was crashing and required manual restarts.

## Solutions

We've created **two solutions** to prevent crashes and enable auto-restart:

### Option 1: PM2 Process Manager (✅ RUNNING NOW)

**Status**: ✅ **Active and running**

**Advantages:**
- ✅ Easy to install and use (no Docker required)
- ✅ Auto-restart on crashes
- ✅ Memory limit protection (512MB)
- ✅ Exponential backoff for repeated failures
- ✅ Built-in log management
- ✅ Optional auto-start on system boot
- ✅ Fast startup (~1-2 seconds)
- ✅ Minimal overhead

**Quick Commands:**

```bash
cd ~/aisdlc-2.1.0/dashboard

# Start
./pm2-dashboard.sh start

# View status
./pm2-dashboard.sh status

# View logs
./pm2-dashboard.sh logs

# Restart
./pm2-dashboard.sh restart

# Stop
./pm2-dashboard.sh stop

# Monitor (interactive dashboard)
./pm2-dashboard.sh monitor

# Configure auto-start on boot
./pm2-dashboard.sh startup
```

**Current Status:**
```bash
./pm2-dashboard.sh status
```

Dashboard URL: **http://localhost:3030**

---

### Option 2: Docker Container

**Status**: Available but requires Docker to be running

**Advantages:**
- ✅ Complete isolation from host system
- ✅ Auto-restart on crashes
- ✅ Resource limits (CPU + Memory)
- ✅ Health checks
- ✅ Automatic log rotation
- ✅ Consistent environment
- ✅ Security (runs as non-root)

**Prerequisites:**
- Docker Desktop installed and running

**Quick Commands:**

```bash
cd ~/aisdlc-2.1.0/dashboard

# Start
./docker-dashboard.sh start

# View status
./docker-dashboard.sh status

# View logs
./docker-dashboard.sh logs

# Restart
./docker-dashboard.sh restart

# Stop
./docker-dashboard.sh stop
```

**Full Documentation**: See `DOCKER-DEPLOYMENT.md`

---

## Which Should You Use?

### Use PM2 (Option 1) if:
- ✅ You want the simplest solution
- ✅ You don't have Docker installed
- ✅ You want fast startup times
- ✅ You want minimal resource overhead
- ✅ You're comfortable with Node.js ecosystem

### Use Docker (Option 2) if:
- ✅ You already use Docker
- ✅ You want complete process isolation
- ✅ You're deploying in production
- ✅ You need strict resource limits
- ✅ You want containerized infrastructure

---

## Current Setup

**Active Solution:** PM2 Process Manager ✅

The dashboard is currently running with PM2 and will:
- ✅ Auto-restart if it crashes
- ✅ Restart if memory exceeds 512MB
- ✅ Wait 3 seconds between restarts
- ✅ Use exponential backoff for repeated failures

**Access Dashboard:**
- URL: http://localhost:3030
- Status: `./pm2-dashboard.sh status`
- Logs: `./pm2-dashboard.sh logs`

---

## Auto-Start on System Boot

To make the dashboard start automatically when your computer boots:

```bash
cd ~/aisdlc-2.1.0/dashboard

# Configure auto-start
./pm2-dashboard.sh startup

# Then save the current configuration
./pm2-dashboard.sh save
```

This ensures the dashboard is always running, even after a reboot.

---

## Monitoring & Troubleshooting

### Check if Dashboard is Running

```bash
./pm2-dashboard.sh status
```

### View Real-Time Logs

```bash
./pm2-dashboard.sh logs
```

### Interactive Monitoring

```bash
./pm2-dashboard.sh monitor
```

This shows:
- CPU usage
- Memory usage
- Restart count
- Uptime
- Real-time logs

### If Dashboard Crashes

PM2 will automatically restart it within 3 seconds. You can check the restart count:

```bash
pm2 list
```

Look at the "↺" column - this shows restart count.

### If Restarts Keep Happening

1. Check the logs for errors:
   ```bash
   ./pm2-dashboard.sh logs
   ```

2. Check memory usage:
   ```bash
   pm2 list
   ```

3. Restart manually:
   ```bash
   ./pm2-dashboard.sh restart
   ```

4. If problems persist, check:
   - Is `~/.claude/sdlc-registry/` accessible?
   - Is port 3030 available?
   - Are there any file permission issues?

---

## Comparison: PM2 vs Docker vs Native

| Feature | Native (node) | PM2 | Docker |
|---------|--------------|-----|--------|
| Auto-restart | ❌ No | ✅ Yes | ✅ Yes |
| Memory limits | ❌ No | ✅ 512MB | ✅ 512MB |
| Resource isolation | ❌ No | ⚠️ Partial | ✅ Complete |
| Health checks | ❌ Manual | ✅ Yes | ✅ Yes |
| Log management | ❌ Manual | ✅ Automatic | ✅ Automatic |
| Setup time | ✅ Instant | ✅ 1 minute | ⚠️ 5 minutes |
| Startup time | ✅ 1 second | ✅ 2 seconds | ⚠️ 5 seconds |
| Resource overhead | ✅ Minimal | ✅ ~20MB | ⚠️ ~50MB |
| Auto-start on boot | ❌ Manual | ✅ Yes | ✅ Yes |
| Prerequisites | Node.js | Node.js + PM2 | Docker |

---

## Migration Between Solutions

### From Native to PM2 (Current Setup)

Already done! ✅

### From PM2 to Docker

```bash
# Stop PM2
./pm2-dashboard.sh stop

# Start Docker
./docker-dashboard.sh start
```

### From Docker to PM2

```bash
# Stop Docker
./docker-dashboard.sh stop

# Start PM2
./pm2-dashboard.sh start
```

---

## Files Created

1. **pm2-dashboard.sh** - PM2 management script
2. **docker-dashboard.sh** - Docker management script
3. **Dockerfile** - Docker image definition
4. **docker-compose.yml** - Docker Compose configuration
5. **.dockerignore** - Docker build exclusions
6. **DOCKER-DEPLOYMENT.md** - Full Docker documentation
7. **CRASH-PREVENTION.md** - This file

---

## Support

**Check Status:**
```bash
cd ~/aisdlc-2.1.0/dashboard
./pm2-dashboard.sh status
```

**View Logs:**
```bash
./pm2-dashboard.sh logs
```

**Restart Dashboard:**
```bash
./pm2-dashboard.sh restart
```

**For Issues:**
- Check logs first: `./pm2-dashboard.sh logs`
- Verify status: `./pm2-dashboard.sh status`
- Try restart: `./pm2-dashboard.sh restart`

---

**Current Version**: 2.4.0
**Active Solution**: PM2 Process Manager ✅
**Dashboard URL**: http://localhost:3030
**Status**: Running and auto-restart enabled
