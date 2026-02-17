/**
 * aisdlc reset - Reset platform to defaults
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const resetCommand = new Command('reset')
  .description('Reset AI-SDLC platform to defaults')
  .option('--confirm', 'Skip confirmation prompt')
  .option('--keep-config', 'Keep configuration, only reset database')
  .action(async (options) => {
    console.log('');

    if (!options.confirm) {
      console.log('  WARNING: This will reset the AI-SDLC platform.');
      console.log('');
      console.log('  The following will be deleted:');
      if (!options.keepConfig) {
        console.log('  - Configuration (~/.aisdlc/config.json)');
      }
      console.log('  - Database (~/.aisdlc/data/platform.db)');
      console.log('  - Logs (~/.aisdlc/logs/)');
      console.log('');
      console.log('  Agent definitions will NOT be affected.');
      console.log('');
      console.log("  Run with --confirm to proceed, or 'aisdlc uninstall' for full removal.");
      console.log('');
      return;
    }

    console.log('  Resetting AI-SDLC Platform...');

    // Stop services first
    const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Process may already be stopped
      }
      fs.unlinkSync(pidPath);
    }

    // Reset database
    const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('  [OK] Database deleted');
    }

    // Delete WAL and SHM files
    for (const ext of ['-wal', '-shm']) {
      const walPath = dbPath + ext;
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }
    }

    // Reset logs
    const logsDir = path.join(AISDLC_HOME, 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(logsDir, file));
      }
      console.log('  [OK] Logs cleared');
    }

    // Reset config (optional)
    if (!options.keepConfig) {
      const configPath = path.join(AISDLC_HOME, 'config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log('  [OK] Configuration deleted');
      }
    }

    // Clean up server script
    const scriptPath = path.join(AISDLC_HOME, 'dashboard-server.js');
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    console.log('');
    console.log("  Platform reset complete. Run 'aisdlc init' to reinitialize.");
    console.log('');
  });
