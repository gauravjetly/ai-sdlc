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

// Get comprehensive project details including all documentation
function getProjectDetails(projectId) {
  try {
    const SDLC_DOCS_DIR = path.join(__dirname, '..', 'docs', 'sdlc');

    // 1. Get basic project data
    const projectFile = path.join(PROJECTS_DIR, `${projectId}.json`);
    if (!fs.existsSync(projectFile)) {
      return null;
    }

    const projectData = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

    // 2. Get cost data
    const costData = getCostByProjectId(projectId);

    // 3. Find all related documentation files
    const docs = {
      requirements: null,
      architecture: null,
      security: null,
      testing: null,
      deployment: null,
      acceptance: null,
      tracking: null,
      readme: null,
      adrs: []
    };

    // Helper to find and read a file matching pattern
    const findAndReadDoc = (dir, pattern) => {
      try {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        const matchedFile = files.find(f => f.includes(projectId) || f.includes(pattern));
        if (matchedFile) {
          const content = fs.readFileSync(path.join(dir, matchedFile), 'utf8');
          return {
            filename: matchedFile,
            content: content,
            path: path.join(dir, matchedFile)
          };
        }
      } catch (e) {
        return null;
      }
      return null;
    };

    // Read documentation from each phase
    docs.requirements = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'requirements'), projectId);
    docs.architecture = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'architecture'), projectId);
    docs.security = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'security'), projectId);
    docs.testing = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'testing'), projectId);
    docs.deployment = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'deployments'), projectId);
    docs.acceptance = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'acceptance'), projectId);
    docs.tracking = findAndReadDoc(path.join(SDLC_DOCS_DIR, 'tracking'), projectId);

    // Find ADRs related to this project (by date or mentioned in architecture doc)
    try {
      const adrDir = path.join(SDLC_DOCS_DIR, 'architecture');
      if (fs.existsSync(adrDir)) {
        const adrFiles = fs.readdirSync(adrDir).filter(f => f.startsWith('ADR-') && f.endsWith('.md'));
        // Get recent ADRs or all if project-specific search fails
        const relevantADRs = adrFiles.slice(-5); // Last 5 ADRs
        docs.adrs = relevantADRs.map(filename => ({
          filename: filename,
          content: fs.readFileSync(path.join(adrDir, filename), 'utf8').substring(0, 1000), // First 1000 chars
          path: path.join(adrDir, filename)
        }));
      }
    } catch (e) {
      // ADRs are optional
    }

    // 4. Check for README in project outputs
    if (projectData.phases && projectData.phases.length > 0) {
      for (const phase of projectData.phases) {
        if (phase.outputs && phase.outputs.length > 0) {
          for (const output of phase.outputs) {
            const readmePath = path.join(__dirname, '..', output, 'README.md');
            if (fs.existsSync(readmePath)) {
              docs.readme = {
                filename: 'README.md',
                content: fs.readFileSync(readmePath, 'utf8'),
                path: readmePath
              };
              break;
            }
          }
        }
      }
    }

    // 5. Extract GitHub repository URL and determine main project context
    let githubUrl = null;
    let mainProject = null;
    let mainProjectRepo = null;
    let featureName = projectData.description || projectData.name || 'Feature Development';

    const githubPatterns = [
      /github\.com[\/:]([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/gi,
      /https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/gi
    ];

    // Search in documentation for GitHub URLs
    const searchContent = [
      docs.readme?.content,
      docs.architecture?.content,
      docs.deployment?.content,
      docs.requirements?.content
    ].filter(Boolean).join('\n');

    for (const pattern of githubPatterns) {
      const match = pattern.exec(searchContent);
      if (match) {
        githubUrl = match[0].startsWith('http') ? match[0] : `https://github.com/${match[1]}`;
        // This is likely the main project repo
        mainProjectRepo = githubUrl;
        // Extract main project name from repo URL
        const repoMatch = githubUrl.match(/github\.com\/[^/]+\/([^/\.]+)/);
        if (repoMatch) {
          mainProject = repoMatch[1]
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        break;
      }
    }

    // Try to extract main project info from description patterns
    // Patterns like: "Add X to Y project" or "Build X for Y" or "Enhance Y with X"
    const description = projectData.description || '';
    const descPatterns = [
      /(?:for|to|in)\s+([A-Z][a-zA-Z0-9-_]+)\s+(?:project|repo|repository)/i,
      /([A-Z][a-zA-Z0-9-_]+)\s+(?:project|application|app)/i,
      /(?:Enhance|Update|Improve|Fix|Modify)\s+([A-Z][a-zA-Z0-9-_]+)/i
    ];

    for (const pattern of descPatterns) {
      const match = description.match(pattern);
      if (match && match[1] && !mainProject) {
        const candidate = match[1];
        // Only use if it looks like a project name
        if (candidate.length > 2 && /^[A-Z]/.test(candidate)) {
          mainProject = candidate;
          break;
        }
      }
    }

    // PRIORITY 1: Check if project has projectContext (new enhanced format from tracker)
    if (projectData.projectContext) {
      if (projectData.projectContext.mainProject) {
        mainProject = projectData.projectContext.mainProject;
      }
      if (projectData.projectContext.mainProjectRepo) {
        mainProjectRepo = projectData.projectContext.mainProjectRepo;
      }
      if (projectData.projectContext.featureName) {
        featureName = projectData.projectContext.featureName;
      }
    }

    // PRIORITY 2: Check if project data has legacy mainProject fields (backward compatibility)
    if (!mainProject && projectData.mainProject) {
      mainProject = projectData.mainProject;
    }
    if (!mainProjectRepo && projectData.mainProjectRepo) {
      mainProjectRepo = projectData.mainProjectRepo;
    }
    if (!featureName && projectData.featureName) {
      featureName = projectData.featureName;
    }

    // If still no main project, try to infer from first output directory
    if (!mainProject && projectData.phases && projectData.phases.length > 0) {
      // Common directories to exclude from project name detection
      const excludedDirs = ['docs', 'src', 'tests', 'test', 'dist', 'build', 'lib', 'node_modules', 'config', 'scripts', 'public', 'assets', 'components'];

      for (const phase of projectData.phases) {
        if (phase.outputs && phase.outputs.length > 0) {
          const firstOutput = phase.outputs[0];
          // Pattern like "src/claude-admin/" or "claude-admin/src"
          const pathMatch = firstOutput.match(/(?:^|\/)(([a-z]+-?)+(?:-admin|-app|-system|-service|-api)?)/i);
          if (pathMatch && pathMatch[1] && !mainProject) {
            const candidate = pathMatch[1].toLowerCase();
            // Only use if it's not a common directory name
            if (!excludedDirs.includes(candidate) && candidate.length > 2) {
              mainProject = pathMatch[1]
                .split(/[-_]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              break;
            }
          }
        }
      }
    }

    // 6. Extract deployment/end URLs
    const deploymentUrls = [];
    const urlPattern = /https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/[^\s]*)?/gi;

    if (docs.deployment?.content) {
      const urls = docs.deployment.content.match(urlPattern) || [];
      deploymentUrls.push(...urls.filter(url =>
        !url.includes('github.com') &&
        !url.includes('localhost') &&
        !url.includes('example.com')
      ));
    }

    // 7. Build change log from activity
    const projectActivity = getActivityLog(1000).filter(a => a.projectId === projectId);
    const changelog = projectActivity.map(a => ({
      timestamp: a.timestamp,
      event: a.event,
      agent: a.agent,
      message: a.message || a.description,
      phase: a.phase
    }));

    // 8. Extract implementation summary
    const implementation = {
      filesCreated: [],
      technologies: [],
      features: [],
      tests: {
        total: 0,
        passing: 0,
        coverage: 0
      }
    };

    // Parse outputs to get file list
    if (projectData.phases) {
      projectData.phases.forEach(phase => {
        if (phase.outputs) {
          implementation.filesCreated.push(...phase.outputs);
        }
      });
    }

    // Extract technologies from architecture doc
    if (docs.architecture?.content) {
      const techPatterns = [
        /Node\.js/gi, /TypeScript/gi, /JavaScript/gi, /Python/gi, /Java/gi,
        /React/gi, /Vue/gi, /Angular/gi, /Express/gi, /PostgreSQL/gi, /MongoDB/gi,
        /Docker/gi, /Kubernetes/gi, /AWS/gi, /Azure/gi, /GCP/gi
      ];

      const foundTechs = new Set();
      techPatterns.forEach(pattern => {
        const matches = docs.architecture.content.match(pattern);
        if (matches) {
          foundTechs.add(matches[0]);
        }
      });
      implementation.technologies = Array.from(foundTechs);
    }

    // Extract test results from testing doc
    if (docs.testing?.content) {
      const testMatch = docs.testing.content.match(/(\d+)\s+tests?\s+passed?/i);
      const coverageMatch = docs.testing.content.match(/coverage[:\s]+(\d+)%/i);

      if (testMatch) {
        implementation.tests.passing = parseInt(testMatch[1]);
        implementation.tests.total = implementation.tests.passing;
      }
      if (coverageMatch) {
        implementation.tests.coverage = parseInt(coverageMatch[1]);
      }
    }

    // Determine if this is a feature addition
    // Priority 1: Use explicit value from projectContext
    // Priority 2: Infer from presence of mainProject
    let isFeatureAddition = !!mainProject;
    if (projectData.projectContext && typeof projectData.projectContext.isFeatureAddition === 'boolean') {
      isFeatureAddition = projectData.projectContext.isFeatureAddition;
    }

    // 9. Build comprehensive response
    return {
      // Basic project info
      project: projectData,

      // Main project context (the actual project this feature belongs to)
      mainProject: {
        name: mainProject || 'Standalone Project',
        repository: mainProjectRepo || githubUrl,
        featureName: featureName,
        isFeatureAddition: isFeatureAddition,
        projectType: projectData.projectContext?.projectType || (isFeatureAddition ? 'FEATURE_ADDITION' : 'STANDALONE')
      },

      // Cost data
      costs: costData,

      // All documentation
      documentation: docs,

      // Links
      links: {
        github: githubUrl,
        mainProjectRepo: mainProjectRepo,
        deployment: deploymentUrls.length > 0 ? deploymentUrls[0] : null,
        allUrls: deploymentUrls
      },

      // Implementation summary
      implementation: implementation,

      // Change log
      changelog: changelog,

      // Metrics
      metrics: {
        duration: projectData.completedAt && projectData.createdAt
          ? Math.round((new Date(projectData.completedAt) - new Date(projectData.createdAt)) / 1000 / 60)
          : 0,
        phases: projectData.phases?.length || 0,
        filesCreated: implementation.filesCreated.length,
        technologies: implementation.technologies.length,
        testCoverage: implementation.tests.coverage,
        totalCost: costData?.total_cost || 0
      }
    };

  } catch (error) {
    console.error(`Error getting project details for ${projectId}:`, error);
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
// REVERSE PROXY UTILITY
// ============================================================================

/**
 * Proxy a request to a target server
 * Forwards method, headers, body and pipes the response back to the client
 *
 * @param {http.IncomingMessage} req - Source request
 * @param {http.ServerResponse} res - Response to client
 * @param {string} targetUrl - Target server URL (e.g., 'http://localhost:3000')
 * @param {string} targetPath - Optional path override (defaults to req.url)
 */
function proxyRequest(req, res, targetUrl, targetPath) {
  const path = targetPath !== undefined ? targetPath : req.url;
  const target = new URL(path, targetUrl);

  // Prepare proxy request options
  const options = {
    hostname: target.hostname,
    port: parseInt(target.port) || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: req.method,
    headers: {}
  };

  // Create proxy request to target server
  const proxyReq = http.request(options, (proxyRes) => {
    // Forward status code and headers from target to client
    res.writeHead(proxyRes.statusCode, proxyRes.headers);

    // Pipe response from target to client
    proxyRes.pipe(res);
  });

  // Handle proxy request errors (connection failures, timeouts)
  proxyReq.on('error', (error) => {
    console.error(`  [${new Date().toISOString().slice(11,19)}] Proxy error (${targetUrl}):`, error.message);

    // Return 502 Bad Gateway if target is unreachable
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway',
        message: 'Target service is unavailable',
        target: targetUrl
      }));
    }
  });

  // Pipe request body from client to target
  req.pipe(proxyReq);
}

// ============================================================================
// HTTP SERVER
// ============================================================================

// Create HTTP server
const server = http.createServer((req, res) => {
  // ============================================================================
  // REVERSE PROXY ROUTES - Phase 1 Dashboard Integration
  // ============================================================================
  // Check proxy routes FIRST, before setting any headers

  // Proxy to Platform API (port 3000)
  // Routes: /api/v1/* -> http://localhost:3000/api/v1/*
  if (req.url.startsWith('/api/v1')) {
    proxyRequest(req, res, 'http://localhost:3000');
    return;
  }

  // Proxy to Vite dev server (port 3001)
  // Routes: /platform/* -> http://localhost:3001/* (strip /platform prefix)
  if (req.url.startsWith('/platform')) {
    const targetPath = req.url.substring('/platform'.length) || '/';
    proxyRequest(req, res, 'http://localhost:3001', targetPath);
    return;
  }

  // ============================================================================
  // CORS HEADERS - For non-proxy routes
  // ============================================================================

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

  // API endpoint for comprehensive project details
  if (req.url.match(/^\/api\/projects\/[^/]+\/details$/)) {
    const urlParts = req.url.split('/');
    const projectId = urlParts[3];
    const details = getProjectDetails(projectId);

    if (details) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(details));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
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


  // ============================================================================
  // EXEC AGENT API - Generate Executive Presentations
  // ============================================================================

  if (req.url === '/api/exec/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const projectId = data.project_id || 'UNKNOWN';
        const presType = data.type || 'executive-summary';

        console.log(`[Exec Agent] Generating ${presType} presentation for ${projectId}`);

        // Execute Python script
        const execAgentPath = path.join(__dirname, '../src/agents/exec-agent/exec-agent.py');
        const cmd = `cd "${path.dirname(execAgentPath)}" && source venv/bin/activate && python exec-agent.py generate "${projectId}" "${presType}"`;

        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`[Exec Agent] Error: ${stderr}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Failed to generate presentation',
              details: stderr
            }));
            return;
          }

          // Extract output path from stdout
          const outputMatch = stdout.match(/Presentation generated: (.+)/);
          const outputPath = outputMatch ? outputMatch[1].trim() : null;

          console.log(`[Exec Agent] ✅ Generated: ${outputPath}`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Presentation generated successfully',
            output_path: outputPath,
            project_id: projectId,
            type: presType
          }));
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.url === '/api/exec/list' && req.method === 'GET') {
    // List all generated presentations
    const execMemoryDir = path.join(process.env.HOME, '.claude', 'exec-agent-memory', 'presentations');
    
    try {
      const files = fs.readdirSync(execMemoryDir).filter(f => f.endsWith('.pptx'));
      const presentations = files.map(f => ({
        filename: f,
        path: path.join(execMemoryDir, f),
        created: fs.statSync(path.join(execMemoryDir, f)).mtime
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, presentations }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
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
// WEBSOCKET UPGRADE SUPPORT - For Vite HMR
// ============================================================================

server.on('upgrade', (req, socket, head) => {
  // Handle WebSocket upgrades for Vite HMR
  if (req.url.startsWith('/platform')) {
    const target = new URL('http://localhost:3001');

    // Create proxy connection to Vite dev server
    const proxySocket = http.request({
      hostname: target.hostname,
      port: target.port,
      path: req.url.substring('/platform'.length) || '/',
      method: req.method,
      headers: req.headers
    });

    proxySocket.on('upgrade', (proxyRes, proxySocketUpgrade, proxyHead) => {
      // Forward upgrade response to client
      socket.write(`HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`);
      Object.keys(proxyRes.headers).forEach(key => {
        socket.write(`${key}: ${proxyRes.headers[key]}\r\n`);
      });
      socket.write('\r\n');

      // Pipe data between client and target
      proxySocketUpgrade.pipe(socket);
      socket.pipe(proxySocketUpgrade);
    });

    proxySocket.on('error', (error) => {
      console.error(`  [${new Date().toISOString().slice(11,19)}] WebSocket proxy error:`, error.message);
      socket.destroy();
    });

    proxySocket.end(head);
  } else {
    // Not a proxy WebSocket, close it
    socket.destroy();
  }
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
  console.log('  Proxy Routes (Phase 1 Integration):');
  console.log(`    /api/v1/*    -> http://localhost:3000 (Platform API)`);
  console.log(`    /platform/*  -> http://localhost:3001 (Vite Dev Server)`);
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
