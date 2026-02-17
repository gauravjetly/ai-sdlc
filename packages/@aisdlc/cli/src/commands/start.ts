/**
 * aisdlc start - Start the AI-SDLC platform services
 *
 * Launches the dashboard server as a background process.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const startCommand = new Command('start')
  .description('Start AI-SDLC platform services')
  .option('-p, --port <port>', 'Dashboard port', '3030')
  .option('--foreground', 'Run in foreground (do not daemonize)')
  .action(async (options) => {
    console.log('');
    console.log('  Starting AI-SDLC Platform...');
    console.log('');

    // Check initialization
    const configPath = path.join(AISDLC_HOME, 'config.json');
    if (!fs.existsSync(configPath)) {
      console.log("  [ERROR] Platform not initialized. Run 'aisdlc init' first.");
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config.initialized) {
      console.log("  [ERROR] Platform not initialized. Run 'aisdlc init' first.");
      process.exit(1);
    }

    // Check if already running
    const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);
      try {
        process.kill(pid, 0);
        console.log(`  [OK] Platform already running (PID: ${pid})`);
        console.log(`  Dashboard: http://localhost:${config.dashboard?.port ?? options.port}`);
        console.log('');
        return;
      } catch {
        // Stale PID, remove it
        fs.unlinkSync(pidPath);
      }
    }

    const port = options.port || config.dashboard?.port || 3030;

    // Start a lightweight HTTP server for the dashboard
    const serverScript = createDashboardServer(port);
    const scriptPath = path.join(AISDLC_HOME, 'dashboard-server.js');
    fs.writeFileSync(scriptPath, serverScript);

    if (options.foreground) {
      console.log(`  Dashboard starting on http://localhost:${port} (foreground mode)`);
      console.log('  Press Ctrl+C to stop');
      console.log('');

      require(scriptPath);
    } else {
      // Spawn as background process
      const child = spawn('node', [scriptPath], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, AISDLC_PORT: String(port) },
      });

      child.unref();

      if (child.pid) {
        fs.writeFileSync(pidPath, String(child.pid));

        console.log(`  [OK] Dashboard started (PID: ${child.pid})`);
        console.log(`  [OK] URL: http://localhost:${port}`);
        console.log('');
        console.log('  Services Running:');
        console.log('  -----------------');
        console.log(`  Dashboard:  http://localhost:${port}`);
        console.log('  Storage:    SQLite (~/.aisdlc/data/platform.db)');
        console.log('  Event Bus:  File-based');
        console.log('');
        console.log("  Stop with: aisdlc stop");
        console.log('');
      } else {
        console.log('  [ERROR] Failed to start dashboard process');
        process.exit(1);
      }
    }
  });

function createDashboardServer(port: number): string {
  return `
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.AISDLC_PORT || ${port};
const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

// Write PID for management
fs.writeFileSync(
  path.join(AISDLC_HOME, 'dashboard.pid'),
  String(process.pid)
);

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// API endpoints
function handleAPI(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      version: '4.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
    return true;
  }

  if (url.pathname === '/api/status') {
    let dbStats = {};
    try {
      const Database = require('better-sqlite3');
      const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');
      if (fs.existsSync(dbPath)) {
        const db = new Database(dbPath, { readonly: true });
        const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_log').get();
        const knowledgeCount = db.prepare('SELECT COUNT(*) as count FROM knowledge').get();
        const workflowCount = db.prepare('SELECT COUNT(*) as count FROM workflows').get();
        db.close();
        dbStats = {
          auditEvents: auditCount.count,
          knowledgeItems: knowledgeCount.count,
          workflows: workflowCount.count,
        };
      }
    } catch (e) {
      dbStats = { error: e.message };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      platform: 'AI-SDLC',
      version: '4.0.0',
      storage: 'sqlite',
      database: dbStats,
      uptime: process.uptime(),
    }));
    return true;
  }

  if (url.pathname === '/api/audit') {
    try {
      const Database = require('better-sqlite3');
      const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');
      const db = new Database(dbPath, { readonly: true });
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const events = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit);
      db.close();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(events));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  return false;
}

// Create server
const server = http.createServer((req, res) => {
  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle API routes
  if (req.url.startsWith('/api/')) {
    if (handleAPI(req, res)) return;
  }

  // Serve dashboard status page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(getDashboardHTML());
});

server.listen(PORT, 'localhost', () => {
  // Server started silently (background process)
});

// Cleanup on exit
process.on('SIGTERM', () => {
  const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
  try { fs.unlinkSync(pidPath); } catch {}
  process.exit(0);
});

process.on('SIGINT', () => {
  const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
  try { fs.unlinkSync(pidPath); } catch {}
  process.exit(0);
});

function getDashboardHTML() {
  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI-SDLC Control Center</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 24px 32px; border-bottom: 1px solid #334155; }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header p { color: #94a3b8; margin-top: 4px; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; }
    .card h3 { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .card .value { font-size: 28px; font-weight: 700; color: #38bdf8; }
    .card .label { font-size: 13px; color: #64748b; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-healthy { background: #065f46; color: #6ee7b7; }
    .status-degraded { background: #78350f; color: #fcd34d; }
    .table { width: 100%; margin-top: 24px; }
    .table-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #334155; }
    td { padding: 8px 12px; font-size: 14px; border-bottom: 1px solid #1e293b; }
    #audit-log td { font-family: 'SF Mono', monospace; font-size: 12px; }
    .refresh-btn { background: #334155; border: 1px solid #475569; color: #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .refresh-btn:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AI-SDLC Control Center</h1>
    <p>Local Production Platform v4.0.0</p>
  </div>
  <div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2 style="font-size: 18px;">Platform Status</h2>
      <button class="refresh-btn" onclick="refreshAll()">Refresh</button>
    </div>
    <div class="grid">
      <div class="card">
        <h3>System Status</h3>
        <div id="system-status"><span class="status-badge status-healthy">HEALTHY</span></div>
        <div class="label" id="uptime">Loading...</div>
      </div>
      <div class="card">
        <h3>Audit Events</h3>
        <div class="value" id="audit-count">-</div>
        <div class="label">Total logged events</div>
      </div>
      <div class="card">
        <h3>Knowledge Items</h3>
        <div class="value" id="knowledge-count">-</div>
        <div class="label">Collective memory entries</div>
      </div>
      <div class="card">
        <h3>Workflows</h3>
        <div class="value" id="workflow-count">-</div>
        <div class="label">SDLC workflows tracked</div>
      </div>
    </div>
    <div class="table-card">
      <h3 style="font-size: 14px; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px;">Recent Audit Events</h3>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Agent</th><th>Status</th></tr></thead>
        <tbody id="audit-log"><tr><td colspan="4" style="color: #64748b;">Loading...</td></tr></tbody>
      </table>
    </div>
  </div>
  <script>
    async function refreshAll() {
      try {
        const statusRes = await fetch('/api/status');
        const status = await statusRes.json();
        document.getElementById('audit-count').textContent = status.database?.auditEvents ?? '-';
        document.getElementById('knowledge-count').textContent = status.database?.knowledgeItems ?? '-';
        document.getElementById('workflow-count').textContent = status.database?.workflows ?? '-';
        document.getElementById('uptime').textContent = 'Uptime: ' + Math.round(status.uptime) + 's | Storage: ' + status.storage;
      } catch (e) {
        document.getElementById('uptime').textContent = 'Error: ' + e.message;
      }
      try {
        const auditRes = await fetch('/api/audit?limit=10');
        const events = await auditRes.json();
        const tbody = document.getElementById('audit-log');
        if (events.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="color: #64748b;">No events yet</td></tr>';
        } else {
          tbody.innerHTML = events.map(e => '<tr>' +
            '<td>' + new Date(e.created_at).toLocaleTimeString() + '</td>' +
            '<td>' + e.event_type + '</td>' +
            '<td>' + (e.agent_id || '-') + '</td>' +
            '<td>' + (e.success ? '<span style="color:#6ee7b7">OK</span>' : '<span style="color:#fca5a5">FAIL</span>') + '</td>' +
          '</tr>').join('');
        }
      } catch (e) {
        document.getElementById('audit-log').innerHTML = '<tr><td colspan="4" style="color: #fca5a5;">Error loading events</td></tr>';
      }
    }
    refreshAll();
    setInterval(refreshAll, 10000);
  </script>
</body>
</html>\`;
}
`;
}
