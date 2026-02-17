/**
 * aisdlc dashboard - Open the dashboard in default browser
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const dashboardCommand = new Command('dashboard')
  .description('Open the AI-SDLC dashboard in your default browser')
  .action(async () => {
    const configPath = path.join(AISDLC_HOME, 'config.json');
    let port = 3030;

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      port = config.dashboard?.port ?? 3030;
    }

    const url = `http://localhost:${port}`;

    // Check if dashboard is running
    const pidPath = path.join(AISDLC_HOME, 'dashboard.pid');
    if (!fs.existsSync(pidPath)) {
      console.log('');
      console.log("  Dashboard is not running. Start it with: aisdlc start");
      console.log('');
      return;
    }

    console.log(`  Opening dashboard at ${url}...`);

    try {
      // Dynamic import for ESM 'open' package
      const openModule = await import('open');
      const open = openModule.default;
      await open(url);
    } catch {
      // Fallback: use platform-specific commands
      const { exec } = require('child_process');
      const command = process.platform === 'darwin'
        ? `open ${url}`
        : process.platform === 'win32'
          ? `start ${url}`
          : `xdg-open ${url}`;

      exec(command, (error: Error | null) => {
        if (error) {
          console.log(`  Could not open browser. Visit: ${url}`);
        }
      });
    }
  });
