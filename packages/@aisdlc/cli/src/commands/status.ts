/**
 * aisdlc status - Show platform status
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const statusCommand = new Command('status')
  .description('Show AI-SDLC platform status')
  .action(async () => {
    console.log('');
    console.log('  AI-SDLC Platform Status');
    console.log('  =======================');
    console.log('');

    // Check initialization
    const configPath = path.join(AISDLC_HOME, 'config.json');
    if (!fs.existsSync(configPath)) {
      console.log("  Platform: NOT INITIALIZED (run 'aisdlc init')");
      console.log('');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Platform info
    console.log(`  Version:      ${config.version}`);
    console.log(`  Storage:      ${config.storage}`);
    console.log(`  Event Bus:    ${config.eventBus}`);
    console.log(`  Governance:   Level ${config.governance?.level ?? 1}`);
    console.log(`  Initialized:  ${config.initialized ? 'Yes' : 'No'}`);
    console.log('');

    // Dashboard status
    const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);
      try {
        process.kill(pid, 0);
        console.log(`  Dashboard:    RUNNING (PID: ${pid})`);
        console.log(`  URL:          http://localhost:${config.dashboard?.port ?? 3030}`);
      } catch {
        console.log('  Dashboard:    STOPPED (stale PID)');
      }
    } else {
      console.log('  Dashboard:    STOPPED');
    }
    console.log('');

    // Database stats
    const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');
    if (fs.existsSync(dbPath)) {
      try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath, { readonly: true });

        const tables = ['audit_log', 'knowledge', 'workflows', 'agent_messages', 'events'];
        console.log('  Database:');
        console.log('  ---------');

        for (const table of tables) {
          try {
            const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
            const label = table.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            console.log(`  ${label.padEnd(18)} ${result.count}`);
          } catch {
            // Table may not exist
          }
        }

        const fileSize = fs.statSync(dbPath).size;
        console.log(`  Database Size:   ${(fileSize / 1024).toFixed(1)} KB`);

        db.close();
      } catch (error) {
        console.log(`  Database:        Error - ${(error as Error).message}`);
      }
    } else {
      console.log("  Database:        Not found (run 'aisdlc init')");
    }

    console.log('');

    // Agents
    const agentsDir = path.join(os.homedir(), '.claude', 'agents');
    if (fs.existsSync(agentsDir)) {
      const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      console.log(`  Agents:       ${agents.length} installed`);
    } else {
      console.log('  Agents:       None installed');
    }

    // Hooks
    const hooksDir = path.join(os.homedir(), '.claude', 'hooks');
    if (fs.existsSync(hooksDir)) {
      const hooks = fs.readdirSync(hooksDir);
      console.log(`  Hooks:        ${hooks.length} file(s)`);
    } else {
      console.log('  Hooks:        Not installed');
    }

    console.log('');
  });
