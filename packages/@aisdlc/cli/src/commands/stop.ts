/**
 * aisdlc stop - Stop AI-SDLC platform services
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const stopCommand = new Command('stop')
  .description('Stop AI-SDLC platform services')
  .action(async () => {
    console.log('');
    console.log('  Stopping AI-SDLC Platform...');

    const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');

    if (!fs.existsSync(pidPath)) {
      console.log('  [OK] No running platform services found');
      console.log('');
      return;
    }

    const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);

    try {
      process.kill(pid, 'SIGTERM');
      console.log(`  [OK] Dashboard stopped (PID: ${pid})`);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ESRCH') {
        console.log('  [OK] Dashboard process was already stopped');
      } else {
        console.log(`  [WARN] Could not stop process ${pid}: ${err.message}`);
      }
    }

    // Clean up PID file
    try {
      fs.unlinkSync(pidPath);
    } catch {
      // Ignore
    }

    // Clean up server script
    const scriptPath = path.join(AISDLC_HOME, 'dashboard-server.js');
    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch {
      // Ignore
    }

    console.log('  [OK] All services stopped');
    console.log('');
  });
