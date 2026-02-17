/**
 * Health Checker
 *
 * Runs 8 diagnostic checks in parallel and produces a unified health report.
 * Each check has a 10-second timeout to prevent blocking.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { HealthCheck, HealthReport, HealthStatus } from './types';

const AISDLC_VERSION = '4.0.0';
const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');
const CLAUDE_HOME = path.join(os.homedir(), '.claude');

export class HealthChecker {
  private checks: Array<() => Promise<HealthCheck>> = [];

  constructor() {
    this.checks = [
      () => this.checkNodeVersion(),
      () => this.checkClaudeCode(),
      () => this.checkDatabase(),
      () => this.checkHooks(),
      () => this.checkMCP(),
      () => this.checkAgents(),
      () => this.checkDashboard(),
      () => this.checkConfig(),
    ];
  }

  /**
   * Run all health checks and produce a report.
   */
  async checkAll(): Promise<HealthReport> {
    const results = await Promise.all(
      this.checks.map(check => this.runWithTimeout(check, 10000))
    );

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      unknown: results.filter(r => r.status === 'unknown').length,
    };

    let overall: HealthStatus = 'healthy';
    if (summary.unhealthy > 0) {
      overall = 'unhealthy';
    } else if (summary.degraded > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      checks: results,
      platform: {
        version: AISDLC_VERSION,
        node: process.version,
        os: `${os.platform()} ${os.release()}`,
        arch: os.arch(),
      },
      summary,
    };
  }

  /**
   * Run a single check with a timeout.
   */
  private async runWithTimeout(
    check: () => Promise<HealthCheck>,
    timeoutMs: number
  ): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const result = await Promise.race([
        check(),
        new Promise<HealthCheck>((_, reject) =>
          setTimeout(() => reject(new Error('Check timed out')), timeoutMs)
        ),
      ]);
      result.duration = Date.now() - start;
      return result;
    } catch (error) {
      return {
        name: 'unknown',
        status: 'unknown',
        message: `Check failed: ${(error as Error).message}`,
        duration: Date.now() - start,
      };
    }
  }

  // ============================================================
  // Individual Health Checks
  // ============================================================

  private async checkNodeVersion(): Promise<HealthCheck> {
    const name = 'node-version';
    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0], 10);

      if (major >= 20) {
        return {
          name,
          status: 'healthy',
          message: `Node.js ${version} (>= 20 required)`,
          duration: 0,
          details: { version, major },
        };
      } else {
        return {
          name,
          status: 'unhealthy',
          message: `Node.js ${version} is below minimum (20). Please upgrade.`,
          duration: 0,
          details: { version, major, required: 20 },
        };
      }
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: `Could not determine Node.js version: ${(error as Error).message}`,
        duration: 0,
      };
    }
  }

  private async checkClaudeCode(): Promise<HealthCheck> {
    const name = 'claude-code';
    try {
      const result = execSync('claude --version 2>/dev/null || echo "not-found"', {
        timeout: 5000,
        encoding: 'utf-8',
      }).trim();

      if (result === 'not-found' || result === '') {
        return {
          name,
          status: 'degraded',
          message: 'Claude Code CLI not found. Platform works but hooks will not auto-trigger.',
          duration: 0,
          details: { installed: false },
        };
      }

      return {
        name,
        status: 'healthy',
        message: `Claude Code found: ${result}`,
        duration: 0,
        details: { installed: true, version: result },
      };
    } catch {
      return {
        name,
        status: 'degraded',
        message: 'Claude Code CLI not detected. Platform works in standalone mode.',
        duration: 0,
        details: { installed: false },
      };
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const name = 'database';
    const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');

    try {
      if (!fs.existsSync(dbPath)) {
        return {
          name,
          status: 'unhealthy',
          message: `Database not found at ${dbPath}. Run 'aisdlc init' first.`,
          duration: 0,
          details: { path: dbPath, exists: false },
        };
      }

      // Try to open and query the database
      const Database = require('better-sqlite3');
      const db = new Database(dbPath, { readonly: true });
      const result = db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as { count: number };
      db.close();

      return {
        name,
        status: 'healthy',
        message: `SQLite database operational (${result.count} migration(s) applied)`,
        duration: 0,
        details: {
          path: dbPath,
          exists: true,
          migrations: result.count,
          size: fs.statSync(dbPath).size,
        },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: `Database error: ${(error as Error).message}`,
        duration: 0,
        details: { path: dbPath },
      };
    }
  }

  private async checkHooks(): Promise<HealthCheck> {
    const name = 'hooks';
    const hooksDir = path.join(CLAUDE_HOME, 'hooks');

    try {
      if (!fs.existsSync(hooksDir)) {
        return {
          name,
          status: 'degraded',
          message: `Hooks directory not found. Run 'aisdlc hooks:install' to enable auto-classification.`,
          duration: 0,
          details: { path: hooksDir, installed: false },
        };
      }

      const hookFiles = fs.readdirSync(hooksDir);
      const sdlcHooks = hookFiles.filter(f => f.includes('sdlc') || f.includes('aisdlc'));

      if (sdlcHooks.length === 0) {
        return {
          name,
          status: 'degraded',
          message: 'Hooks directory exists but no AI-SDLC hooks found.',
          duration: 0,
          details: { path: hooksDir, installed: false, files: hookFiles },
        };
      }

      return {
        name,
        status: 'healthy',
        message: `${sdlcHooks.length} AI-SDLC hook(s) installed`,
        duration: 0,
        details: { path: hooksDir, installed: true, hooks: sdlcHooks },
      };
    } catch (error) {
      return {
        name,
        status: 'degraded',
        message: `Could not check hooks: ${(error as Error).message}`,
        duration: 0,
      };
    }
  }

  private async checkMCP(): Promise<HealthCheck> {
    const name = 'mcp';

    try {
      // Check for Claude desktop config
      const configPaths = [
        path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
      ];

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const hasSdlcServer = config.mcpServers &&
            Object.keys(config.mcpServers).some((k: string) =>
              k.includes('sdlc') || k.includes('aisdlc')
            );

          if (hasSdlcServer) {
            return {
              name,
              status: 'healthy',
              message: 'MCP server configured in Claude Desktop',
              duration: 0,
              details: { configPath, configured: true },
            };
          }
        }
      }

      return {
        name,
        status: 'degraded',
        message: "MCP not configured. Run 'aisdlc mcp:configure' for enhanced integration.",
        duration: 0,
        details: { configured: false },
      };
    } catch (error) {
      return {
        name,
        status: 'degraded',
        message: `MCP check skipped: ${(error as Error).message}`,
        duration: 0,
      };
    }
  }

  private async checkAgents(): Promise<HealthCheck> {
    const name = 'agents';
    const agentsDir = path.join(CLAUDE_HOME, 'agents');

    try {
      if (!fs.existsSync(agentsDir)) {
        return {
          name,
          status: 'unhealthy',
          message: `Agents directory not found at ${agentsDir}. Run the install script.`,
          duration: 0,
          details: { path: agentsDir, count: 0 },
        };
      }

      const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      const expectedAgents = [
        'conductor.md',
        'ba-agent.md',
        'architect-jets.md',
        'software-engineer.md',
        'security-agent.md',
        'qa-agent.md',
        'atlas-agent.md',
        'customer-agent.md',
        'tracker-agent.md',
      ];

      const missing = expectedAgents.filter(a => !agentFiles.includes(a));

      if (missing.length === 0) {
        return {
          name,
          status: 'healthy',
          message: `All ${agentFiles.length} agent definitions found`,
          duration: 0,
          details: { path: agentsDir, count: agentFiles.length, agents: agentFiles },
        };
      } else {
        return {
          name,
          status: 'degraded',
          message: `${missing.length} agent definition(s) missing: ${missing.join(', ')}`,
          duration: 0,
          details: { path: agentsDir, count: agentFiles.length, missing },
        };
      }
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: `Agent check failed: ${(error as Error).message}`,
        duration: 0,
      };
    }
  }

  private async checkDashboard(): Promise<HealthCheck> {
    const name = 'dashboard';

    try {
      // Check if dashboard PID file exists and process is running
      const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');

      if (!fs.existsSync(pidPath)) {
        return {
          name,
          status: 'degraded',
          message: "Dashboard not running. Start with 'aisdlc start'.",
          duration: 0,
          details: { running: false },
        };
      }

      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);

      // Check if process is still running
      try {
        process.kill(pid, 0); // Signal 0 just checks existence
        return {
          name,
          status: 'healthy',
          message: `Dashboard running (PID: ${pid}) at http://localhost:3030`,
          duration: 0,
          details: { running: true, pid, url: 'http://localhost:3030' },
        };
      } catch {
        // PID file exists but process is dead
        fs.unlinkSync(pidPath);
        return {
          name,
          status: 'degraded',
          message: "Dashboard process not found (stale PID). Start with 'aisdlc start'.",
          duration: 0,
          details: { running: false, stalePid: pid },
        };
      }
    } catch (error) {
      return {
        name,
        status: 'degraded',
        message: `Dashboard check: ${(error as Error).message}`,
        duration: 0,
      };
    }
  }

  private async checkConfig(): Promise<HealthCheck> {
    const name = 'config';
    const configPath = path.join(AISDLC_HOME, 'config.json');

    try {
      if (!fs.existsSync(configPath)) {
        return {
          name,
          status: 'unhealthy',
          message: `Configuration not found. Run 'aisdlc init' first.`,
          duration: 0,
          details: { path: configPath, exists: false },
        };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      if (!config.initialized) {
        return {
          name,
          status: 'unhealthy',
          message: "Platform not initialized. Run 'aisdlc init'.",
          duration: 0,
          details: { path: configPath, initialized: false },
        };
      }

      return {
        name,
        status: 'healthy',
        message: `Platform v${config.version} initialized (storage: ${config.storage}, governance: level ${config.governance?.level ?? 1})`,
        duration: 0,
        details: {
          path: configPath,
          version: config.version,
          storage: config.storage,
          eventBus: config.eventBus,
          governance: config.governance?.level,
        },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: `Config error: ${(error as Error).message}`,
        duration: 0,
      };
    }
  }
}
