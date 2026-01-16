#!/usr/bin/env node

/**
 * AI-SDLC Control Center - Web Server
 * Serves the dashboard UI and provides real-time registry data
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3030;
const REGISTRY_DIR = path.join(process.env.HOME, '.claude', 'sdlc-registry');
const REGISTRY_FILE = path.join(REGISTRY_DIR, 'registry.json');
const PROJECTS_DIR = path.join(REGISTRY_DIR, 'projects');
const ACTIVITY_LOG = path.join(REGISTRY_DIR, 'activity.log');

// Read registry data
function getRegistryData() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return {
        version: '2.0.0',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          blockedProjects: 0,
          totalInvocations: 0
        },
        agents: {},
        projects: []
      };
    }

    const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading registry:', error);
    return null;
  }
}

// Read all projects
function getAllProjects() {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(PROJECTS_DIR);
    const projects = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const data = fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8');
          return JSON.parse(data);
        } catch (e) {
          return null;
        }
      })
      .filter(p => p !== null);

    return projects;
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
}

// Read activity log
function getActivityLog(limit = 50) {
  try {
    if (!fs.existsSync(ACTIVITY_LOG)) {
      return [];
    }

    const data = fs.readFileSync(ACTIVITY_LOG, 'utf8');
    const lines = data.trim().split('\n').filter(l => l);

    const activities = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(a => a !== null);

    // Return most recent first
    return activities.reverse().slice(0, limit);
  } catch (error) {
    console.error('Error reading activity log:', error);
    return [];
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint for registry data
  if (req.url === '/api/registry') {
    const registry = getRegistryData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(registry));
    return;
  }

  // API endpoint for projects
  if (req.url === '/api/projects') {
    const projects = getAllProjects();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(projects));
    return;
  }

  // API endpoint for activity
  if (req.url.startsWith('/api/activity')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const activity = getActivityLog(limit);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(activity));
    return;
  }

  // Serve the dashboard HTML
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading dashboard');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           AI-SDLC Control Center - LIVE                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  🌐 Dashboard:     http://localhost:${PORT}`);
  console.log(`  📊 API Registry:  http://localhost:${PORT}/api/registry`);
  console.log(`  📁 API Projects:  http://localhost:${PORT}/api/projects`);
  console.log(`  📝 API Activity:  http://localhost:${PORT}/api/activity`);
  console.log('');
  console.log('  Registry: ' + (fs.existsSync(REGISTRY_FILE) ? '✅ Connected' : '⚠️  Not initialized'));
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');

  // Open browser automatically
  const url = `http://localhost:${PORT}`;
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n\n  Shutting down gracefully...');
  server.close(() => {
    console.log('  Server closed\n');
    process.exit(0);
  });
});
