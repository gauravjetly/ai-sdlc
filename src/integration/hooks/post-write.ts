#!/usr/bin/env node
/**
 * PostToolUse (Write) Hook
 *
 * Claude Code hook that runs after a Write tool use.
 * Logs file changes for audit trail at governance levels 3 and 4.
 *
 * @see ADR-043 for the hybrid hooks + MCP architecture decision
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Input from Claude Code's PostToolUse hook.
 */
interface PostWriteInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    content?: string;
  };
}

function readStdin(): string {
  try {
    return fs.readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return '{}';
  }
}

function logFileChange(input: PostWriteInput): void {
  try {
    const auditDir = path.join(os.homedir(), '.aisdlc', 'registry', 'file-changes');
    const dateDir = new Date().toISOString().split('T')[0];
    const fullDir = path.join(auditDir, dateDir);

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      tool: input.tool_name || 'Write',
      filePath: input.tool_input?.file_path || 'unknown',
      contentLength: input.tool_input?.content?.length || 0,
    };

    const filename = `WRITE-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(fullDir, filename),
      JSON.stringify(entry, null, 2),
    );
  } catch {
    // Must never fail
  }
}

async function main(): Promise<void> {
  try {
    const rawInput = readStdin();
    let input: PostWriteInput;

    try {
      input = JSON.parse(rawInput);
    } catch {
      input = {};
    }

    logFileChange(input);
    process.stdout.write('{}');
  } catch {
    process.stdout.write('{}');
  }
}

main().catch(() => {
  process.stdout.write('{}');
});
