/**
 * aisdlc_search_memory MCP Tool
 *
 * Search the collective memory system for knowledge, patterns, and solutions.
 *
 * @module mcp-server/tools/search-memory
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const searchMemoryToolSchema = {
  name: 'aisdlc_search_memory',
  description: 'Search the AI-SDLC collective memory for knowledge, patterns, solutions, and learnings. Can filter by category (patterns, solutions, learnings, projects).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      category: {
        type: 'string',
        enum: ['patterns', 'solutions', 'learnings', 'projects', 'all'],
        description: 'Memory category to search (default: all)',
      },
    },
    required: ['query'],
  },
};

/**
 * Execute the search-memory tool.
 */
export async function executeSearchMemory(
  args: { query: string; category?: string },
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const category = args.category || 'all';
    const memoryBase = path.join(os.homedir(), '.claude', 'agent-memory');
    const results: Array<{ source: string; content: Record<string, unknown> }> = [];

    const agentDirs = ['conductor', 'ba', 'jets', 'engineer', 'security', 'qa', 'atlas', 'customer'];

    for (const agent of agentDirs) {
      const agentDir = path.join(memoryBase, agent);
      if (!fs.existsSync(agentDir)) continue;

      const categoriesToSearch = category === 'all'
        ? ['patterns', 'solutions', 'learnings']
        : [category];

      for (const cat of categoriesToSearch) {
        const catDir = path.join(agentDir, cat);
        if (!fs.existsSync(catDir)) continue;

        try {
          const files = fs.readdirSync(catDir).filter(f => f.endsWith('.json'));
          for (const file of files) {
            try {
              const content = fs.readFileSync(path.join(catDir, file), 'utf-8');
              const data = JSON.parse(content);
              const contentStr = JSON.stringify(data).toLowerCase();
              if (contentStr.includes(args.query.toLowerCase())) {
                results.push({
                  source: `${agent}/${cat}/${file}`,
                  content: data,
                });
              }
            } catch {
              // Skip unreadable files
            }
          }
        } catch {
          // Skip unreadable directories
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query: args.query,
          category,
          resultCount: results.length,
          results: results.slice(0, 20), // Limit to 20 results
        }, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Memory search failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}
