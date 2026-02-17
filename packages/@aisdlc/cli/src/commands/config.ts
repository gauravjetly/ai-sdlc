/**
 * aisdlc config - View and edit platform configuration
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const configCommand = new Command('config')
  .description('View or edit AI-SDLC platform configuration')
  .option('--get <key>', 'Get a specific config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const configPath = path.join(AISDLC_HOME, 'config.json');

    if (!fs.existsSync(configPath)) {
      console.log("  Platform not initialized. Run 'aisdlc init' first.");
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (options.get) {
      const keys = options.get.split('.');
      let value: unknown = config;
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[key];
        } else {
          value = undefined;
          break;
        }
      }
      if (options.json) {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(value !== undefined ? String(value) : 'undefined');
      }
      return;
    }

    if (options.set) {
      const [keyPath, value] = options.set.split('=');
      if (!keyPath || value === undefined) {
        console.log('  Usage: aisdlc config --set key.path=value');
        return;
      }

      const keys = keyPath.split('.');
      let target: Record<string, unknown> = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
          target[keys[i]] = {};
        }
        target = target[keys[i]] as Record<string, unknown>;
      }

      // Type coercion
      let parsedValue: unknown = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      target[keys[keys.length - 1]] = parsedValue;
      config.updatedAt = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      console.log(`  Set ${keyPath} = ${parsedValue}`);
      return;
    }

    // Display full config
    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('');
      console.log('  AI-SDLC Configuration');
      console.log('  =====================');
      console.log('');
      console.log(`  Version:        ${config.version}`);
      console.log(`  Storage:        ${config.storage}`);
      console.log(`  Event Bus:      ${config.eventBus}`);
      console.log(`  Dashboard Port: ${config.dashboard?.port}`);
      console.log(`  Governance:     Level ${config.governance?.level}`);
      console.log(`  Database:       ${config.database?.path}`);
      console.log(`  Agents Dir:     ${config.agents?.definitions}`);
      console.log(`  Hooks Dir:      ${config.hooks?.path}`);
      console.log(`  Initialized:    ${config.initialized}`);
      console.log(`  Created:        ${config.createdAt}`);
      console.log(`  Updated:        ${config.updatedAt}`);
      console.log('');
      console.log('  Edit with: aisdlc config --set key.path=value');
      console.log('  Example:   aisdlc config --set governance.level=2');
      console.log('');
    }
  });
