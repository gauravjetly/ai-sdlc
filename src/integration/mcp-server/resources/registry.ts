/**
 * aisdlc://registry Resource
 *
 * MCP resource that provides access to all tracked SDLC work items.
 *
 * @module mcp-server/resources/registry
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const registryResource = {
  uri: 'aisdlc://registry',
  name: 'SDLC Registry',
  description: 'All tracked SDLC work items with their current status',
  mimeType: 'application/json',
};

/**
 * Read the registry contents.
 */
export function readRegistry(): string {
  try {
    const workflowDir = path.join(os.homedir(), '.aisdlc', 'registry', 'workflows');
    if (!fs.existsSync(workflowDir)) {
      return JSON.stringify({ workflows: [], message: 'No workflows tracked yet.' });
    }

    const files = fs.readdirSync(workflowDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 50);

    const workflows: Array<Record<string, unknown>> = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(workflowDir, file), 'utf-8');
        workflows.push(JSON.parse(content));
      } catch {
        // Skip corrupt files
      }
    }

    return JSON.stringify({
      totalWorkflows: workflows.length,
      active: workflows.filter(w => w.status === 'initiated' || w.status === 'in-progress'),
      completed: workflows.filter(w => w.status === 'completed'),
      blocked: workflows.filter(w => w.status === 'blocked'),
    }, null, 2);
  } catch {
    return JSON.stringify({ error: 'Failed to read registry' });
  }
}
