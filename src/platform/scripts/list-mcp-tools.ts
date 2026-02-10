#!/usr/bin/env tsx

/**
 * List all MCP tools
 *
 * Utility script to display all available MCP tools organized by category
 */

import { ToolRegistry } from '../mcp/server/tool-registry.js';

function main() {
  const registry = new ToolRegistry();
  const stats = registry.getStatistics();

  console.log('\n========================================');
  console.log('  AI Platform MCP Tools');
  console.log('========================================\n');

  console.log(`Total Tools: ${stats.total}\n`);

  const categories = [
    'deployment',
    'infrastructure',
    'security',
    'cost',
    'observability',
    'testing',
    'release',
    'architecture'
  ];

  for (const category of categories) {
    const tools = registry.getToolsByCategory(category);

    console.log(`\n${category.toUpperCase()} (${tools.length} tools)`);
    console.log('─'.repeat(50));

    for (const tool of tools) {
      console.log(`\n  ${tool.name}`);
      console.log(`  ${tool.description}`);
    }
  }

  console.log('\n========================================\n');
}

main();
