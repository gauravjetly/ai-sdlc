# Docker Deployment Guide - AI-SDLC Dashboard

This guide explains how to run the AI-SDLC dashboard in a Docker container for improved stability and auto-restart capabilities.

## Why Containerize?

**Benefits:**
- ✅ **Auto-restart on crashes** - Container restarts automatically if it crashes
- ✅ **Isolation** - Runs in isolated environment, won't conflict with other processes
- ✅ **Consistent environment** - Same Node.js version everywhere
- ✅ **Resource limits** - Prevents dashboard from consuming too much memory/CPU
- ✅ **Health checks** - Automatic monitoring and recovery
- ✅ **Easy management** - Simple commands to start/stop/restart
- ✅ **Persistent logs** - Logs are retained and rotated automatically

## Prerequisites

### Install Docker

**macOS:**
```bash
# Download and install Docker Desktop
# https://docs.docker.com/desktop/install/mac-install/
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

**Windows:**
```bash
# Download and install Docker Desktop
# https://docs.docker.com/desktop/install/windows-install/
```

### Verify Docker Installation

```bash
docker --version
docker info
```

## Quick Start

### Option 1: Using the Management Script (Recommended)

```bash
cd ~/aisdlc-2.1.0/dashboard

# Start dashboard (builds image if needed)
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

### Option 2: Using Docker Compose Directly

```bash
cd ~/aisdlc-2.1.0/dashboard

# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Restart
docker compose restart
```

### Option 3: Using Docker CLI

```bash
cd ~/aisdlc-2.1.0/dashboard

# Build image
docker build -t aisdlc-dashboard:2.4.0 .

# Run container
docker run -d \
  --name sdlc-control-center \
  --restart unless-stopped \
  -p 3030:3030 \
  -v ~/.claude:/home/sdlc/.claude:ro \
  aisdlc-dashboard:2.4.0

# View logs
docker logs -f sdlc-control-center

# Stop
docker stop sdlc-control-center
```

## Management Commands

The `docker-dashboard.sh` script provides easy management:

| Command | Description |
|---------|-------------|
| `start` | Build and start the dashboard container |
| `stop` | Stop the dashboard container |
| `restart` | Restart the dashboard container |
| `status` | Show container status and health |
| `logs` | Show container logs (follow mode) |
| `build` | Build the Docker image only |
| `rebuild` | Rebuild image and restart container |
| `help` | Show help message |

## Features

### Auto-Restart Policy

The container is configured with `restart: unless-stopped`, which means:
- ✅ Restarts automatically if it crashes
- ✅ Restarts when Docker daemon starts (system reboot)
- ❌ Does NOT restart if you manually stop it

### Health Checks

The container includes health checks that:
- Run every 30 seconds
- Check if the API is responding
- Mark container as unhealthy after 3 failed checks
- Docker can be configured to restart unhealthy containers

### Resource Limits

To prevent resource exhaustion:
- **Memory Limit**: 512MB
- **CPU Limit**: 0.5 cores (50%)
- **Memory Reservation**: 256MB
- **CPU Reservation**: 0.25 cores (25%)

### Logging

Logs are automatically managed:
- **Max size per file**: 10MB
- **Max files**: 3 (rotates automatically)
- **Total log storage**: ~30MB

View logs:
```bash
./docker-dashboard.sh logs
```

### Security

- ✅ Runs as non-root user (`sdlc:1001`)
- ✅ Read-only mount of `~/.claude` directory
- ✅ Minimal Alpine Linux base image
- ✅ No unnecessary packages installed

## Accessing the Dashboard

Once started, access the dashboard at:

**URL**: http://localhost:3030

The dashboard will automatically open in your browser when started with the management script.

## Monitoring

### Check Container Status

```bash
# Using management script
./docker-dashboard.sh status

# Using Docker directly
docker ps -f name=sdlc-control-center
```

### View Real-Time Logs

```bash
# Using management script (recommended)
./docker-dashboard.sh logs

# Using Docker Compose
docker compose logs -f

# Using Docker directly
docker logs -f sdlc-control-center
```

### Check Health Status

```bash
docker inspect --format='{{.State.Health.Status}}' sdlc-control-center
```

Health states:
- `starting` - Initial startup period (first 10s)
- `healthy` - All health checks passing
- `unhealthy` - Health checks failing

### View Resource Usage

```bash
docker stats sdlc-control-center
```

## Troubleshooting

### Container Won't Start

**Check Docker is running:**
```bash
docker info
```

If Docker isn't running:
- **macOS**: Start Docker Desktop
- **Linux**: `sudo systemctl start docker`
- **Windows**: Start Docker Desktop

**Check for port conflicts:**
```bash
lsof -i :3030
```

Kill conflicting process:
```bash
lsof -ti:3030 | xargs kill -9
```

**View container logs:**
```bash
docker logs sdlc-control-center
```

### Container Keeps Crashing

**View last 100 log lines:**
```bash
docker logs --tail 100 sdlc-control-center
```

**Check health status:**
```bash
docker inspect --format='{{.State.Health}}' sdlc-control-center
```

**Common issues:**
- `~/.claude` directory not readable - Check permissions
- Registry not initialized - Run `/sdlc-status` first
- Port 3030 in use - Change port in `docker-compose.yml`

### Cannot Access Dashboard

**Check container is running:**
```bash
./docker-dashboard.sh status
```

**Check port mapping:**
```bash
docker port sdlc-control-center
```

**Test connectivity:**
```bash
curl http://localhost:3030/api/registry
```

**Check firewall:**
```bash
# macOS
sudo pfctl -sr

# Linux
sudo iptables -L
```

### Data Not Showing

**Verify volume mount:**
```bash
docker exec sdlc-control-center ls -la /home/sdlc/.claude
```

**Check registry files exist:**
```bash
ls -la ~/.claude/sdlc-registry/
```

**Re-mount with correct permissions:**
```bash
# Stop container
./docker-dashboard.sh stop

# Check permissions
ls -la ~/.claude

# Restart
./docker-dashboard.sh start
```

## Updating the Dashboard

After making changes to dashboard code:

```bash
cd ~/aisdlc-2.1.0/dashboard

# Rebuild and restart
./docker-dashboard.sh rebuild
```

This will:
1. Build a new image with your changes
2. Stop the old container
3. Start a new container with the updated image

## Advanced Configuration

### Change Port

Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3030"  # Host:Container
```

Or set environment variable:
```bash
PORT=8080 docker compose up -d
```

### Adjust Resource Limits

Edit `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'        # 1 full core
      memory: 1024M      # 1GB RAM
```

### Enable Debug Logging

```bash
docker run -d \
  --name sdlc-control-center \
  -e NODE_ENV=development \
  -e DEBUG=true \
  -p 3030:3030 \
  -v ~/.claude:/home/sdlc/.claude:ro \
  aisdlc-dashboard:2.4.0
```

### Run on Different Network

```bash
# Create network
docker network create aisdlc

# Update docker-compose.yml
networks:
  default:
    external: true
    name: aisdlc
```

## Production Deployment

For production use:

### 1. Use Docker Compose

The `docker-compose.yml` is production-ready with:
- Auto-restart policy
- Resource limits
- Health checks
- Log rotation
- Security settings

### 2. Set Up Monitoring

Use Docker's built-in monitoring or integrate with tools like:
- Prometheus + Grafana
- Datadog
- New Relic

### 3. Configure Backup

Backup the registry data:
```bash
# Backup script
tar -czf sdlc-registry-backup.tar.gz ~/.claude/sdlc-registry/
```

### 4. Use Docker Swarm (Optional)

For high availability:
```bash
docker swarm init
docker stack deploy -c docker-compose.yml sdlc
```

### 5. Set Up Reverse Proxy (Optional)

For HTTPS and authentication:
```yaml
# nginx.conf
server {
  listen 443 ssl;
  server_name dashboard.example.com;

  location / {
    proxy_pass http://localhost:3030;
  }
}
```

## Comparison: Docker vs Native

| Feature | Native (node server.js) | Docker Container |
|---------|-------------------------|------------------|
| Auto-restart | ❌ Manual restart needed | ✅ Automatic |
| Resource limits | ❌ Uses all available | ✅ Capped at 512MB |
| Isolation | ❌ Shares environment | ✅ Isolated |
| Health monitoring | ❌ Manual | ✅ Automatic |
| Log management | ❌ Manual | ✅ Automatic rotation |
| Setup complexity | ✅ Simple | ⚠️ Requires Docker |
| Startup time | ✅ Fast (~1s) | ⚠️ Slower (~5s) |
| Resource overhead | ✅ Minimal | ⚠️ ~50MB extra |

## Alternative: PM2 (Without Docker)

If Docker is not available, use PM2 for process management:

```bash
# Install PM2
npm install -g pm2

# Start dashboard
cd ~/aisdlc-2.1.0/dashboard
pm2 start server.js --name sdlc-dashboard

# Configure auto-restart
pm2 startup
pm2 save

# Commands
pm2 status
pm2 logs sdlc-dashboard
pm2 restart sdlc-dashboard
pm2 stop sdlc-dashboard
```

## Support

For issues or questions:
- Check logs: `./docker-dashboard.sh logs`
- View status: `./docker-dashboard.sh status`
- Report issues: https://github.com/anthropics/claude-code/issues

---

**Built for AI-SDLC Framework v2.4.0**
**Containerized with Docker • Auto-restart • Health Checks • Resource Limits**
