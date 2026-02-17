/**
 * aisdlc hooks:install / hooks:remove - Manage Claude Code hooks
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const hooksInstallCommand = new Command('hooks:install')
  .description('Install AI-SDLC hooks into Claude Code')
  .action(async () => {
    console.log('');
    console.log('  Installing AI-SDLC Claude Code Hooks...');
    console.log('');

    const hooksDir = path.join(CLAUDE_HOME, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Create the UserPromptSubmit hook
    const hookContent = getHookScript();
    const hookPath = path.join(hooksDir, 'aisdlc-classify.sh');
    fs.writeFileSync(hookPath, hookContent);

    if (process.platform !== 'win32') {
      fs.chmodSync(hookPath, 0o755);
    }

    console.log(`  [OK] Hook installed: ${hookPath}`);

    // Update config
    const configPath = path.join(AISDLC_HOME, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.hooks = { ...config.hooks, installed: true, path: hooksDir };
      config.updatedAt = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    console.log('  [OK] Configuration updated');
    console.log('');
    console.log('  The hook will classify messages when you use Claude Code.');
    console.log('  Restart Claude Code to activate.');
    console.log('');
  });

export const hooksRemoveCommand = new Command('hooks:remove')
  .description('Remove AI-SDLC hooks from Claude Code')
  .action(async () => {
    console.log('');
    console.log('  Removing AI-SDLC Claude Code Hooks...');

    const hooksDir = path.join(CLAUDE_HOME, 'hooks');
    const hookPath = path.join(hooksDir, 'aisdlc-classify.sh');

    if (fs.existsSync(hookPath)) {
      fs.unlinkSync(hookPath);
      console.log(`  [OK] Hook removed: ${hookPath}`);
    } else {
      console.log('  [OK] No hooks to remove');
    }

    // Update config
    const configPath = path.join(AISDLC_HOME, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.hooks = { ...config.hooks, installed: false };
      config.updatedAt = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    console.log('');
  });

function getHookScript(): string {
  return `#!/bin/bash
#
# AI-SDLC Request Classification Hook
# Intercepts Claude Code messages for SDLC workflow routing
#
# This hook runs on UserPromptSubmit and classifies the request.
# It adds SDLC context to the message if an SDLC workflow is detected.
#

# Only process user prompts
if [ "\${CLAUDE_HOOK_EVENT}" != "UserPromptSubmit" ]; then
  exit 0
fi

# Read the user's message from stdin
MESSAGE=$(cat)

# Quick pattern check - is this likely an SDLC request?
if echo "\${MESSAGE}" | grep -qiE '/sdlc|build|implement|create|fix|deploy|test|review|security'; then
  # Log classification to SQLite if available
  DB_PATH="\${HOME}/.aisdlc/data/platform.db"
  if command -v sqlite3 &>/dev/null && [ -f "\${DB_PATH}" ]; then
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    sqlite3 "\${DB_PATH}" "INSERT INTO audit_log (id, event_type, details, created_at) VALUES (lower(hex(randomblob(16))), 'hook.classify', json_object('message_preview', substr('\${MESSAGE}', 1, 100)), '\${TIMESTAMP}');" 2>/dev/null
  fi
fi

# Pass through - hooks should not modify the message
exit 0
`;
}
