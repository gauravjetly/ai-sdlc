#!/usr/bin/env node
/**
 * Stop Hook
 *
 * Claude Code hook that runs AFTER Claude finishes responding.
 * Used for completion tracking, cost logging, and post-response governance checks.
 *
 * @see ADR-043 for the hybrid hooks + MCP architecture decision
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Input from Claude Code's Stop hook.
 */
interface StopHookInput {
  /** Metadata about the completed response */
  response?: {
    /** Token usage */
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
    /** Whether the response was truncated */
    truncated?: boolean;
  };
  /** Session ID */
  session?: {
    id?: string;
  };
}

/**
 * Read stdin synchronously.
 */
function readStdin(): string {
  try {
    return fs.readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return '{}';
  }
}

/**
 * Log completion to the registry.
 */
function logCompletion(input: StopHookInput): void {
  try {
    const registryDir = path.join(os.homedir(), '.aisdlc', 'registry', 'completions');
    const dateDir = new Date().toISOString().split('T')[0];
    const fullDir = path.join(registryDir, dateDir);

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: input.session?.id || 'unknown',
      tokenUsage: {
        input: input.response?.usage?.input_tokens || 0,
        output: input.response?.usage?.output_tokens || 0,
      },
      truncated: input.response?.truncated || false,
    };

    const filename = `COMP-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(fullDir, filename),
      JSON.stringify(entry, null, 2),
    );
  } catch {
    // Logging failures must never break the hook
  }
}

/**
 * Main hook execution.
 */
async function main(): Promise<void> {
  try {
    const rawInput = readStdin();
    let input: StopHookInput;

    try {
      input = JSON.parse(rawInput);
    } catch {
      input = {};
    }

    logCompletion(input);

    // Output empty -- stop hooks do not modify anything
    process.stdout.write('{}');
  } catch {
    // Stop hooks must never crash
    process.stdout.write('{}');
  }
}

main().catch(() => {
  process.stdout.write('{}');
});
