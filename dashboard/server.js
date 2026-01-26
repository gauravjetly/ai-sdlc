#!/usr/bin/env node

/**
 * AI-SDLC Control Center - Web Server
 * Serves the dashboard UI and provides real-time registry data
 *
 * ENHANCED: Comprehensive file watching for automatic updates
 * - Watches activity.log, registry.json, projects/*.json, and costs/*.json
 * - Uses debounced broadcasting to prevent update flooding
 * - Maintains file modification timestamps for change detection
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
const FINOPS_DIR = path.join(process.env.HOME, '.claude', 'finops-registry', 'costs');
const REGISTRY_SCRIPT = path.join(REGISTRY_DIR, 'sdlc-registry.sh');

// ============================================================================
// FILE CHANGE TRACKING - Comprehensive monitoring for all data sources
// ============================================================================

// Track file modification times for change detection
const fileTracker = {
  activityLog: { mtime: 0, size: 0 },
  registry: { mtime: 0 },
  projects: new Map(), // filename -> mtime
  costs: new Map()     // filename -> mtime
};

// Debounce timer for broadcasting updates
let broadcastTimer = null;
const BROADCAST_DEBOUNCE_MS = 500; // Wait 500ms after last change before broadcasting

// Flag to track if changes are pending
let changesPending = false;

/**
 * Check if a file has been modified since last check
 */
function hasFileChanged(filepath, tracker) {
  try {
    if (!fs.existsSync(filepath)) {
      return false;
    }
    const stats = fs.statSync(filepath);
    const mtime = stats.mtimeMs;

    if (tracker.mtime === undefined || mtime > tracker.mtime) {
      tracker.mtime = mtime;
      if (tracker.size !== undefined) {
        tracker.size = stats.size;
      }
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Check if any files in a directory have changed
 */
function hasDirectoryChanged(dirPath, trackerMap, extension) {
  try {
    if (!fs.existsSync(dirPath)) {
      return false;
    }

    let changed = false;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(extension));

    // Check for new or modified files
    for (const file of files) {
      const filepath = path.join(dirPath, file);
      const stats = fs.statSync(filepath);
      const mtime = stats.mtimeMs;

      if (!trackerMap.has(file) || trackerMap.get(file) < mtime) {
        trackerMap.set(file, mtime);
        changed = true;
      }
    }

    // Check for deleted files
    for (const [file] of trackerMap) {
      if (!files.includes(file)) {
        trackerMap.delete(file);
        changed = true;
      }
    }

    return changed;
  } catch (e) {
    return false;
  }
}

/**
 * Schedule a debounced broadcast to all SSE clients
 */
function scheduleBroadcast() {
  changesPending = true;

  // Clear existing timer
  if (broadcastTimer) {
    clearTimeout(broadcastTimer);
  }

  // Schedule new broadcast after debounce period
  broadcastTimer = setTimeout(() => {
    if (changesPending) {
      broadcastUpdate();
      changesPending = false;
    }
  }, BROADCAST_DEBOUNCE_MS);
}

/**
 * Broadcast full update to all SSE clients
 */
function broadcastUpdate() {
  if (sseClients.size === 0) {
    return; // No clients connected
  }

  const activity = getActivityLog(20);
  const projects = getAllProjects();
  const registry = getRegistryData();
  const costs = getAllCosts();

  broadcast('update', { activity, projects, registry, costs });
  console.log(`  [${new Date().toISOString().slice(11,19)}] Broadcast update to ${sseClients.size} client(s)`);
}

/**
 * Comprehensive file watcher - checks all data sources for changes
 */
function watchAllFiles() {
  let anyChanges = false;

  // Check activity log
  if (hasFileChanged(ACTIVITY_LOG, fileTracker.activityLog)) {
    anyChanges = true;
  }

  // Check registry.json
  if (hasFileChanged(REGISTRY_FILE, fileTracker.registry)) {
    anyChanges = true;
  }

  // Check projects directory
  if (hasDirectoryChanged(PROJECTS_DIR, fileTracker.projects, '.json')) {
    anyChanges = true;
  }

  // Check costs directory
  if (hasDirectoryChanged(FINOPS_DIR, fileTracker.costs, '.json')) {
    anyChanges = true;
  }

  // Schedule broadcast if any changes detected
  if (anyChanges) {
    scheduleBroadcast();
  }
}

// ============================================================================
// AUTO-FIX FUNCTIONALITY
// ============================================================================

// Auto-fix stalled projects - runs the registry autofix command
function runAutofix() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(REGISTRY_SCRIPT)) {
      console.log('  Registry script not found, skipping autofix');
      resolve({ fixed: 0, checked: 0 });
      return;
    }

    exec(`bash "${REGISTRY_SCRIPT}" autofix`, (error, stdout, stderr) => {
      if (error) {
        console.error('  Autofix error:', error.message);
        resolve({ fixed: 0, checked: 0, error: error.message });
        return;
      }

      // Parse output to get counts
      const fixedMatch = stdout.match(/fixed (\d+) stalled projects/);
      const checkedMatch = stdout.match(/Checked (\d+) projects/);

      const result = {
        fixed: fixedMatch ? parseInt(fixedMatch[1]) : 0,
        checked: checkedMatch ? parseInt(checkedMatch[1]) : 0,
        output: stdout.trim()
      };

      if (result.fixed > 0) {
        console.log(`  Auto-fixed ${result.fixed} stalled projects`);
      }

      resolve(result);
    });
  });
}

// ============================================================================
// DATA READING FUNCTIONS
// ============================================================================

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

// Read all cost data from FinOps registry
function getAllCosts() {
  try {
    if (!fs.existsSync(FINOPS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(FINOPS_DIR);
    const costs = files
      .filter(f => f.endsWith('-costs.json') || f.endsWith('.json'))
      .map(f => {
        try {
          const data = fs.readFileSync(path.join(FINOPS_DIR, f), 'utf8');
          const parsed = JSON.parse(data);

          // Transform to normalized format
          return {
            project_id: parsed.projectId,
            project_name: parsed.projectId, // Will be enriched later if needed
            budget: parsed.budget || 0,
            currency: parsed.currency || 'USD',
            total_cost: parsed.costs?.totalSpent || 0,
            total_tokens: parsed.tokenUsage?.totalTokens || 0,
            created_at: parsed.createdAt,
            breakdown_by_agent: parsed.byAgent ? Object.keys(parsed.byAgent).map(agentId => ({
              agent: agentId,
              model: parsed.byAgent[agentId].model,
              invocations: parsed.byAgent[agentId].invocations || 0,
              tokens: (parsed.byAgent[agentId].inputTokens || 0) + (parsed.byAgent[agentId].outputTokens || 0),
              cost: parsed.byAgent[agentId].cost || 0
            })) : []
          };
        } catch (e) {
          console.error(`Error reading cost file ${f}:`, e);
          return null;
        }
      })
      .filter(c => c !== null);

    return costs;
  } catch (error) {
    console.error('Error reading costs:', error);
    return [];
  }
}

// Read cost data for a specific project
function getCostByProjectId(projectId) {
  try {
    const costFile = path.join(FINOPS_DIR, `${projectId}-costs.json`);
    if (!fs.existsSync(costFile)) {
      return null;
    }

    const data = fs.readFileSync(costFile, 'utf8');
    const parsed = JSON.parse(data);

    // Transform to normalized format
    return {
      project_id: parsed.projectId,
      project_name: parsed.projectId,
      budget: parsed.budget || 0,
      currency: parsed.currency || 'USD',
      total_cost: parsed.costs?.totalSpent || 0,
      total_tokens: parsed.tokenUsage?.totalTokens || 0,
      created_at: parsed.createdAt,
      breakdown_by_agent: parsed.byAgent ? Object.keys(parsed.byAgent).map(agentId => ({
        agent: agentId,
        model: parsed.byAgent[agentId].model,
        invocations: parsed.byAgent[agentId].invocations || 0,
        tokens: (parsed.byAgent[agentId].inputTokens || 0) + (parsed.byAgent[agentId].outputTokens || 0),
        cost: parsed.byAgent[agentId].cost || 0
      })) : []
    };
  } catch (error) {
    console.error(`Error reading cost for project ${projectId}:`, error);
    return null;
  }
}

// ============================================================================
// SSE (Server-Sent Events) HANDLING
// ============================================================================

// SSE clients for real-time updates
const sseClients = new Set();

// Broadcast to all SSE clients
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

// Send heartbeat to keep SSE connections alive
function sendHeartbeat() {
  const heartbeat = `: heartbeat\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(heartbeat);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

// ============================================================================
// HTTP SERVER
// ============================================================================

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // SSE endpoint for real-time updates
  if (req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering if behind proxy
    });

    // Send initial data
    const projects = getAllProjects();
    const activity = getActivityLog(20);
    const registry = getRegistryData();
    const costs = getAllCosts();
    res.write(`event: init\ndata: ${JSON.stringify({ projects, activity, registry, costs })}\n\n`);

    sseClients.add(res);
    console.log(`  [${new Date().toISOString().slice(11,19)}] SSE client connected (${sseClients.size} total)`);

    req.on('close', () => {
      sseClients.delete(res);
      console.log(`  [${new Date().toISOString().slice(11,19)}] SSE client disconnected (${sseClients.size} total)`);
    });
    return;
  }

  // API endpoint for forcing a refresh (manual trigger)
  if (req.url === '/api/refresh') {
    broadcastUpdate();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Refresh broadcast sent' }));
    return;
  }

  // API endpoint for registry data
  if (req.url === '/api/registry') {
    const registry = getRegistryData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(registry));
    return;
  }

  // API endpoint for projects (with cost data merged)
  if (req.url === '/api/projects') {
    const projects = getAllProjects();
    const costs = getAllCosts();

    // Create a map of project ID to cost data
    const costMap = {};
    costs.forEach(cost => {
      costMap[cost.project_id] = cost;
    });

    // Merge cost data into projects
    const projectsWithCosts = projects.map(project => ({
      ...project,
      cost: costMap[project.id] || null
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(projectsWithCosts));
    return;
  }

  // API endpoint for all costs
  if (req.url === '/api/costs') {
    const costs = getAllCosts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(costs));
    return;
  }

  // API endpoint for cost by project ID
  if (req.url.startsWith('/api/costs/')) {
    const projectId = req.url.replace('/api/costs/', '');
    const cost = getCostByProjectId(projectId);
    if (cost) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cost));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cost data not found' }));
    }
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

  // API endpoint for autofix - manually trigger project status reconciliation
  if (req.url === '/api/autofix') {
    runAutofix().then(result => {
      // Also broadcast update after autofix
      scheduleBroadcast();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    }).catch(error => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    });
    return;
  }

  // API endpoint for running SDLC workflow - supports new, continue, and agent modes
  if (req.url === '/api/run-sdlc' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { mode, description, projectName, workflow, projectId, agent, prompt } = data;

        // Agent action commands mapping
        const agentCommands = {
          'ask-tom': '/sdlc-ask-tom',
          'ba': '/sdlc-requirements',
          'jets': '/sdlc-architecture',
          'security': '/sdlc-security',
          'qa': '/sdlc-review',
          'tracker': '/sdlc-status',
          'finops': '/sdlc-status'
        };

        // Workflow commands mapping
        const workflowCommands = {
          full: '/sdlc-start',
          fullWithTom: '/sdlc-start',
          quick: '/sdlc-start',
          review: '/sdlc-review src/',
          architecture: '/sdlc-architecture',
          deploy: '/sdlc-deploy'
        };

        // MODE: Agent Action
        if (mode === 'agent') {
          if (!agent) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Agent is required' }));
            return;
          }

          let command = agentCommands[agent] || '/sdlc-status';
          if (prompt) {
            command += ` ${prompt}`;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            projectId: projectId || null,
            message: 'Run this command in your Claude Code terminal:',
            command,
            note: `The ${agent} agent will be invoked.`
          }));
          return;
        }

        // MODE: Continue existing project
        if (mode === 'continue') {
          if (!projectId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Project ID is required' }));
            return;
          }

          let command = workflowCommands[workflow] || '/sdlc-start';
          if (workflow === 'review') {
            command = '/sdlc-review src/';
          } else if (workflow === 'deploy') {
            command = '/sdlc-deploy';
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            projectId,
            message: `Continue project ${projectId}. Run this in your Claude Code terminal:`,
            command,
            note: 'The workflow will continue from where it left off.'
          }));
          return;
        }

        // MODE: New project (default)
        if (!description) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Description is required' }));
          return;
        }

        // Generate project ID
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
        const newProjectId = `SDLC-${timestamp}`;

        // Create project in registry
        const name = projectName || description.slice(0, 50);
        const createCmd = `bash "${REGISTRY_SCRIPT}" create "${newProjectId}" "${name.replace(/"/g, '\\"')}" "${description.replace(/"/g, '\\"')}"`;

        exec(createCmd, (error, stdout, stderr) => {
          if (error) {
            console.error('Error creating project:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to create project' }));
            return;
          }

          // Schedule broadcast after project creation
          scheduleBroadcast();

          // Generate command based on workflow
          let command = workflowCommands[workflow] || '/sdlc-start';
          command += ` ${description}`;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            projectId: newProjectId,
            message: `Project ${newProjectId} created. Run this in your Claude Code terminal:`,
            command,
            note: 'The SDLC workflow will be orchestrated by the Conductor agent.'
          }));
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
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

  // Serve static assets (images, SVGs, etc.)
  if (req.url.startsWith('/assets/')) {
    const assetPath = path.join(__dirname, req.url);
    const ext = path.extname(assetPath).toLowerCase();

    const mimeTypes = {
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(assetPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Asset not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

server.listen(PORT, async () => {
  console.log('');
  console.log('==================================================================');
  console.log('           AI-SDLC Control Center - LIVE                          ');
  console.log('==================================================================');
  console.log('');
  console.log(`  Dashboard:     http://localhost:${PORT}`);
  console.log(`  API Registry:  http://localhost:${PORT}/api/registry`);
  console.log(`  API Projects:  http://localhost:${PORT}/api/projects`);
  console.log(`  API Costs:     http://localhost:${PORT}/api/costs`);
  console.log(`  API Activity:  http://localhost:${PORT}/api/activity`);
  console.log(`  API Autofix:   http://localhost:${PORT}/api/autofix`);
  console.log(`  API Refresh:   http://localhost:${PORT}/api/refresh`);
  console.log('');
  console.log('  Registry: ' + (fs.existsSync(REGISTRY_FILE) ? 'Connected' : 'Not initialized'));
  console.log('  FinOps:   ' + (fs.existsSync(FINOPS_DIR) ? 'Connected' : 'No cost data'));
  console.log('');

  // Run autofix on startup to reconcile any stalled projects
  console.log('  Running project status autofix...');
  await runAutofix();
  console.log('');

  // Set up periodic autofix every 60 seconds
  setInterval(() => {
    runAutofix().catch(err => console.error('  Periodic autofix error:', err.message));
  }, 60000);

  console.log('  Auto-fix: Enabled (runs every 60s)');
  console.log('');

  // ENHANCED: Set up comprehensive file watching (every 1 second)
  // This watches: activity.log, registry.json, projects/*.json, costs/*.json
  setInterval(watchAllFiles, 1000);
  console.log('  Real-time: Comprehensive file watching enabled (1s interval)');
  console.log('             - Watching: activity.log');
  console.log('             - Watching: registry.json');
  console.log('             - Watching: projects/*.json');
  console.log('             - Watching: costs/*.json');
  console.log('');

  // SSE heartbeat to keep connections alive (every 30 seconds)
  setInterval(sendHeartbeat, 30000);
  console.log('  SSE Heartbeat: Enabled (every 30s)');
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

process.on('SIGINT', () => {
  console.log('\n\n  Shutting down gracefully...');
  server.close(() => {
    console.log('  Server closed\n');
    process.exit(0);
  });
});
