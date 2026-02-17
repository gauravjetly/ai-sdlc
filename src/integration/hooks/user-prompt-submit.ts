#!/usr/bin/env node
/**
 * UserPromptSubmit Hook
 *
 * Claude Code hook that runs BEFORE Claude processes every user message.
 * This is the entry point for the AI-SDLC integration.
 *
 * Behavior:
 * 1. Reads the user message from stdin (Claude Code passes JSON)
 * 2. Loads configuration (fast, cached)
 * 3. Checks if integration is enabled (kill switch)
 * 4. Classifies the request via HookBridge (Tier 1 rules, < 50ms)
 * 5. Routes the classification to determine SDLC action
 * 6. Applies governance rules
 * 7. Returns JSON to stdout:
 *    - Empty object {} for passthrough (no modification)
 *    - { result: "block", reason: "..." } for governance blocks
 *    - Enriched message with SDLC context for routed requests
 *
 * Performance target: < 200ms for passthrough, < 3s for SDLC routing
 *
 * @see ADR-043 for the hybrid hooks + MCP architecture decision
 * @see ARCH-20260216-CLAUDE-AISDLC-INTEGRATION Section 3.2.5
 */

import { getHookBridge } from './lib/hook-bridge';
import { loadHookConfig } from './lib/config-loader';
import { transformMessage, createPassthroughResult, TransformResult } from './lib/message-transformer';
import { RequestClassification, ClassificationContext } from '../classifier/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Input structure from Claude Code's UserPromptSubmit hook.
 */
interface HookInput {
  /** The user's message text */
  message: string;
  /** Session information */
  session?: {
    id?: string;
  };
  /** Conversation context */
  context?: {
    /** Recent messages in the conversation */
    recentMessages?: Array<{ role: string; content: string }>;
  };
}

/**
 * Output structure for Claude Code's UserPromptSubmit hook.
 * - Empty object: passthrough (no modification)
 * - { result: "block", reason: string }: block the message
 * - { result: "continue", message: string }: modify the message
 */
interface HookOutput {
  result?: 'continue' | 'block';
  reason?: string;
  message?: string;
}

/**
 * Read stdin synchronously (Claude Code passes hook input as JSON on stdin).
 */
function readStdin(): string {
  try {
    return fs.readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return '{}';
  }
}

/**
 * Write output to stdout (Claude Code reads hook output from stdout).
 */
function writeOutput(output: HookOutput): void {
  process.stdout.write(JSON.stringify(output));
}

/**
 * Get git context for classification enrichment.
 */
function getGitContext(): ClassificationContext {
  const context: ClassificationContext = {};

  try {
    const { execSync } = require('child_process');

    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 1000,
    }).trim();
    context.branch = branch;

    // Check for uncommitted changes
    const status = execSync('git status --porcelain 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 1000,
    }).trim();
    context.hasUncommittedChanges = status.length > 0;

    // Protected branches
    context.protectedBranches = ['main', 'master', 'production', 'release/*'];
  } catch {
    // Git not available or not in a repo -- that is fine
  }

  return context;
}

/**
 * Log a request to the registry for tracking.
 */
function logToRegistry(
  message: string,
  classification: RequestClassification | undefined,
  transformResult: TransformResult,
): void {
  try {
    const registryDir = path.join(os.homedir(), '.aisdlc', 'registry', 'requests');
    const dateDir = new Date().toISOString().split('T')[0];
    const fullDir = path.join(registryDir, dateDir);

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      messageLength: message.length,
      classification: classification ? {
        type: classification.type,
        complexity: classification.complexity,
        urgency: classification.urgency,
        confidence: classification.confidence,
        requiresSDLC: classification.requiresSDLC,
        classifierUsed: classification.classifierUsed,
        classificationDuration: classification.classificationDuration,
      } : null,
      transformed: transformResult.transformed,
      route: transformResult.metadata.route ? {
        strategy: transformResult.metadata.route.strategy,
        phases: transformResult.metadata.route.phases,
      } : null,
    };

    const filename = `REQ-${Date.now()}.json`;
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
  const startTime = Date.now();

  try {
    // 1. Load configuration
    const config = loadHookConfig();

    // 2. Check kill switch
    if (!config.enabled || !config.autoClassify) {
      writeOutput({});
      return;
    }

    // 3. Read input from Claude Code
    const rawInput = readStdin();
    let input: HookInput;

    try {
      input = JSON.parse(rawInput);
    } catch {
      // Invalid input -- passthrough
      writeOutput({});
      return;
    }

    const message = input.message;
    if (!message || message.trim().length === 0) {
      writeOutput({});
      return;
    }

    // 4. Get git context for better classification
    const context = getGitContext();

    // 5. Process through HookBridge (classify + route + governance)
    const bridge = getHookBridge(config);
    const result = await bridge.process(message, context);

    // 6. Apply timeout check
    const elapsed = Date.now() - startTime;
    if (elapsed > config.performance.maxClassificationTime) {
      // Too slow -- passthrough to avoid blocking the user
      const passthroughResult = createPassthroughResult(message);
      logToRegistry(message, result.classification, passthroughResult);
      writeOutput({});
      return;
    }

    // 7. Transform the message based on results
    const transformResult = transformMessage(
      message,
      result.classification,
      result.route,
      result.governance,
    );

    // 8. Log to registry
    logToRegistry(message, result.classification, transformResult);

    // 9. Return output to Claude Code
    if (!transformResult.transformed) {
      // Passthrough -- no modification
      writeOutput({});
      return;
    }

    // Check if governance blocked the request
    if (result.governance && !result.governance.allowed) {
      writeOutput({
        result: 'block',
        reason: transformResult.userMessage,
      });
      return;
    }

    // SDLC-routed message with context injection
    writeOutput({
      result: 'continue',
      message: transformResult.userMessage,
    });
  } catch (error) {
    // Hooks must NEVER crash -- always passthrough on error
    const errorMsg = error instanceof Error ? error.message : String(error);
    try {
      // Log the error for debugging
      const errorLog = path.join(os.homedir(), '.aisdlc', 'logs');
      if (!fs.existsSync(errorLog)) {
        fs.mkdirSync(errorLog, { recursive: true });
      }
      fs.appendFileSync(
        path.join(errorLog, 'hook-errors.log'),
        `[${new Date().toISOString()}] UserPromptSubmit error: ${errorMsg}\n`,
      );
    } catch {
      // Even logging failure must not break the hook
    }

    writeOutput({});
  }
}

// Execute
main().catch(() => {
  // Final safety net
  writeOutput({});
});
