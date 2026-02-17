/**
 * aisdlc_get_status MCP Tool
 *
 * Returns the status of active and recent SDLC workflows.
 *
 * @module mcp-server/tools/get-status
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const getStatusToolSchema = {
  name: 'aisdlc_get_status',
  description: 'Get the status of active and recent SDLC workflows. Optionally filter by a specific workflow ID. Returns workflow details, current phase, and progress.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      workflowId: {
        type: 'string',
        description: 'Specific workflow ID to check (optional, returns all if not specified)',
      },
    },
    required: [],
  },
};

/**
 * Execute the get-status tool.
 */
export async function executeGetStatus(
  args: { workflowId?: string },
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const workflowDir = path.join(os.homedir(), '.aisdlc', 'registry', 'workflows');

    if (!fs.existsSync(workflowDir)) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            active: [],
            completed: [],
            message: 'No workflows found. Use aisdlc_start_workflow to begin.',
          }, null, 2),
        }],
      };
    }

    // Read all workflow files
    const files = fs.readdirSync(workflowDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    const workflows: Array<Record<string, unknown>> = [];
    for (const file of files.slice(0, 50)) { // Last 50 workflows
      try {
        const content = fs.readFileSync(path.join(workflowDir, file), 'utf-8');
        workflows.push(JSON.parse(content));
      } catch {
        // Skip corrupt files
      }
    }

    // Filter by ID if specified
    if (args.workflowId) {
      const workflow = workflows.find(w => w.id === args.workflowId);
      if (workflow) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(workflow, null, 2),
          }],
        };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Workflow ${args.workflowId} not found` }),
        }],
        isError: true,
      };
    }

    // Return summary
    const active = workflows.filter(w => w.status === 'initiated' || w.status === 'in-progress');
    const completed = workflows.filter(w => w.status === 'completed');
    const failed = workflows.filter(w => w.status === 'failed' || w.status === 'blocked');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: {
            total: workflows.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
          },
          active: active.map(summarizeWorkflow),
          recentCompleted: completed.slice(0, 10).map(summarizeWorkflow),
        }, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Status check failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}

/**
 * Create a summary of a workflow for listing.
 */
function summarizeWorkflow(workflow: Record<string, unknown>): Record<string, unknown> {
  return {
    id: workflow.id,
    description: workflow.description,
    status: workflow.status,
    createdAt: workflow.createdAt,
    classification: workflow.classification,
    route: workflow.route ? {
      strategy: (workflow.route as Record<string, unknown>).strategy,
      phases: (workflow.route as Record<string, unknown>).phases,
    } : undefined,
  };
}
