/**
 * aisdlc_ask_tom MCP Tool
 *
 * Invokes the Ask Tom agent for problem solving and root cause analysis.
 * Used for emergencies, blockers, and complex technical problems.
 *
 * @module mcp-server/tools/ask-tom
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const askTomToolSchema = {
  name: 'aisdlc_ask_tom',
  description: 'Invoke the Ask Tom problem-solving agent for complex problems, root cause analysis, production incidents, and technical blockers. Ask Tom performs deep analysis and provides solutions with confidence levels.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      problem: {
        type: 'string',
        description: 'Detailed description of the problem or blocker',
      },
      context: {
        type: 'string',
        description: 'Additional context (error logs, recent changes, etc.)',
      },
      urgency: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'critical'],
        description: 'Urgency level (default: normal)',
      },
    },
    required: ['problem'],
  },
};

/**
 * Execute the ask-tom tool.
 */
export async function executeAskTom(
  args: { problem: string; context?: string; urgency?: string },
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const urgency = args.urgency || 'normal';
    const problemId = `PROBLEM-${Date.now()}`;

    // Create problem tracking entry
    const problemEntry = {
      id: problemId,
      problem: args.problem,
      context: args.context || '',
      urgency,
      status: 'initiated',
      createdAt: new Date().toISOString(),
      agent: 'ask-tom',
    };

    // Save problem entry
    const problemDir = path.join(os.homedir(), '.aisdlc', 'registry', 'problems');
    if (!fs.existsSync(problemDir)) {
      fs.mkdirSync(problemDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(problemDir, `${problemId}.json`),
      JSON.stringify(problemEntry, null, 2),
    );

    const instructions = urgency === 'critical'
      ? `EMERGENCY: Invoke the Ask Tom agent immediately with problem: "${args.problem}". This is a critical issue requiring immediate root cause analysis and resolution.`
      : `Invoke the Ask Tom agent to analyze and solve: "${args.problem}". Provide root cause analysis and actionable solutions.`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'initiated',
          problemId,
          urgency,
          instructions,
          expectedOutput: 'Root cause analysis, solution recommendation, prevention measures',
        }, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Ask Tom initiation failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}
