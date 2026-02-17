/**
 * aisdlc doctor - Run comprehensive health checks
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');
const CLAUDE_HOME = path.join(os.homedir(), '.claude');

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export const doctorCommand = new Command('doctor')
  .description('Run AI-SDLC health checks')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    const results: CheckResult[] = [];

    // Run all checks
    results.push(checkNodeVersion());
    results.push(checkClaudeCode());
    results.push(checkPlatformInit());
    results.push(checkDatabase());
    results.push(checkAgents());
    results.push(checkHooks());
    results.push(checkMCP());
    results.push(checkDashboard());

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    // Display results
    console.log('');
    console.log('  AI-SDLC Health Check');
    console.log('  ====================');
    console.log('');

    const statusIcons: Record<string, string> = {
      pass: '[PASS]',
      warn: '[WARN]',
      fail: '[FAIL]',
    };

    for (const result of results) {
      const icon = statusIcons[result.status];
      console.log(`  ${icon} ${result.name}`);
      console.log(`         ${result.message}`);
      console.log('');
    }

    // Summary
    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    console.log('  Summary');
    console.log('  -------');
    console.log(`  ${passCount} passed, ${warnCount} warnings, ${failCount} failures`);
    console.log('');

    if (failCount > 0) {
      console.log('  Action Required:');
      for (const result of results.filter(r => r.status === 'fail')) {
        console.log(`  - Fix: ${result.name}`);
      }
      console.log('');
      process.exit(1);
    }

    if (failCount === 0 && warnCount === 0) {
      console.log('  All checks passed! Platform is healthy.');
      console.log('');
    }
  });

function checkNodeVersion(): CheckResult {
  const major = parseInt(process.version.slice(1).split('.')[0], 10);
  if (major >= 20) {
    return { name: 'Node.js Version', status: 'pass', message: `${process.version} (>= 20 required)` };
  }
  return { name: 'Node.js Version', status: 'fail', message: `${process.version} - upgrade to Node.js 20+` };
}

function checkClaudeCode(): CheckResult {
  try {
    const result = execSync('claude --version 2>/dev/null', { encoding: 'utf-8', timeout: 5000 }).trim();
    return { name: 'Claude Code', status: 'pass', message: `Installed (${result})` };
  } catch {
    return { name: 'Claude Code', status: 'warn', message: 'Not found. Platform works but hooks will not auto-trigger.' };
  }
}

function checkPlatformInit(): CheckResult {
  const configPath = path.join(AISDLC_HOME, 'config.json');
  if (!fs.existsSync(configPath)) {
    return { name: 'Platform Init', status: 'fail', message: "Not initialized. Run 'aisdlc init'" };
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.initialized) {
    return { name: 'Platform Init', status: 'fail', message: "Incomplete. Run 'aisdlc init'" };
  }
  return { name: 'Platform Init', status: 'pass', message: `Initialized (v${config.version})` };
}

function checkDatabase(): CheckResult {
  const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');
  if (!fs.existsSync(dbPath)) {
    return { name: 'SQLite Database', status: 'fail', message: "Not found. Run 'aisdlc init'" };
  }
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const result = db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as { count: number };
    const size = fs.statSync(dbPath).size;
    db.close();
    return {
      name: 'SQLite Database',
      status: 'pass',
      message: `Operational (${result.count} migration(s), ${(size / 1024).toFixed(1)} KB)`,
    };
  } catch (error) {
    return { name: 'SQLite Database', status: 'fail', message: `Error: ${(error as Error).message}` };
  }
}

function checkAgents(): CheckResult {
  const agentsDir = path.join(CLAUDE_HOME, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return { name: 'Agent Definitions', status: 'fail', message: 'No agents directory. Run install.sh' };
  }
  const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  if (agents.length === 0) {
    return { name: 'Agent Definitions', status: 'fail', message: 'No agent files found' };
  }
  if (agents.length < 9) {
    return { name: 'Agent Definitions', status: 'warn', message: `${agents.length} agents found (9+ recommended)` };
  }
  return { name: 'Agent Definitions', status: 'pass', message: `${agents.length} agent definitions installed` };
}

function checkHooks(): CheckResult {
  const hooksDir = path.join(CLAUDE_HOME, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    return { name: 'Claude Code Hooks', status: 'warn', message: "Not installed. Run 'aisdlc hooks:install'" };
  }
  const hooks = fs.readdirSync(hooksDir);
  if (hooks.length === 0) {
    return { name: 'Claude Code Hooks', status: 'warn', message: 'Hooks directory empty' };
  }
  return { name: 'Claude Code Hooks', status: 'pass', message: `${hooks.length} hook file(s) installed` };
}

function checkMCP(): CheckResult {
  const configPaths = [
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.mcpServers) {
          return { name: 'MCP Configuration', status: 'pass', message: 'MCP server configured' };
        }
      } catch {
        // Continue checking other paths
      }
    }
  }

  return { name: 'MCP Configuration', status: 'warn', message: "Not configured. Run 'aisdlc mcp:configure'" };
}

function checkDashboard(): CheckResult {
  const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
  if (!fs.existsSync(pidPath)) {
    return { name: 'Dashboard Server', status: 'warn', message: "Not running. Start with 'aisdlc start'" };
  }
  const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);
  try {
    process.kill(pid, 0);
    return { name: 'Dashboard Server', status: 'pass', message: `Running (PID: ${pid})` };
  } catch {
    return { name: 'Dashboard Server', status: 'warn', message: 'Stale PID file. Restart with aisdlc start' };
  }
}
