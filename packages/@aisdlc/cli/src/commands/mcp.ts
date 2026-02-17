/**
 * aisdlc mcp:configure - Configure MCP server for Claude Desktop
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const mcpConfigureCommand = new Command('mcp:configure')
  .description('Configure MCP server for Claude Desktop integration')
  .action(async () => {
    console.log('');
    console.log('  Configuring MCP Server...');
    console.log('');

    // Find Claude Desktop config path
    const configPaths: { path: string; platform: string }[] = [
      {
        path: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        platform: 'macOS',
      },
      {
        path: path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
        platform: 'Linux',
      },
      {
        path: path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
        platform: 'Windows',
      },
    ];

    let configPath: string | null = null;
    let platformName = '';

    for (const cp of configPaths) {
      if (fs.existsSync(cp.path)) {
        configPath = cp.path;
        platformName = cp.platform;
        break;
      }
      // Also check if the parent directory exists (config file may not exist yet)
      const dir = path.dirname(cp.path);
      if (fs.existsSync(dir)) {
        configPath = cp.path;
        platformName = cp.platform;
        break;
      }
    }

    if (!configPath) {
      console.log('  [WARN] Claude Desktop config directory not found.');
      console.log('');
      console.log('  Manual Configuration:');
      console.log('  Add this to your claude_desktop_config.json:');
      console.log('');
      console.log('  {');
      console.log('    "mcpServers": {');
      console.log('      "aisdlc": {');
      console.log('        "command": "node",');
      console.log('        "args": ["' + path.join(AISDLC_HOME, 'mcp-server.js') + '"]');
      console.log('      }');
      console.log('    }');
      console.log('  }');
      console.log('');
      return;
    }

    // Read existing config or create new one
    let config: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {
        config = {};
      }
    }

    // Add MCP server configuration
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    const mcpServers = config.mcpServers as Record<string, unknown>;
    mcpServers['aisdlc'] = {
      command: 'node',
      args: [path.join(AISDLC_HOME, 'mcp-server.js')],
    };

    // Ensure directory exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`  [OK] MCP server added to Claude Desktop config (${platformName})`);
    console.log(`  Config: ${configPath}`);
    console.log('');

    // Update AISDLC config
    const aisdlcConfigPath = path.join(AISDLC_HOME, 'config.json');
    if (fs.existsSync(aisdlcConfigPath)) {
      const aisdlcConfig = JSON.parse(fs.readFileSync(aisdlcConfigPath, 'utf-8'));
      aisdlcConfig.mcp = { configured: true };
      aisdlcConfig.updatedAt = new Date().toISOString();
      fs.writeFileSync(aisdlcConfigPath, JSON.stringify(aisdlcConfig, null, 2));
    }

    console.log('  Restart Claude Desktop to activate the MCP server.');
    console.log('');
  });
