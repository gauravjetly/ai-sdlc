import { SQLiteProvider } from '@aisdlc/storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Knowledge Graph Visualization
 * Generate and display relationship graphs
 */

export async function graphCommand(args: string[]): Promise<void> {
  const type = args[0] || 'overview';

  console.log('\n  Knowledge Graph Generator');
  console.log('  ═════════════════════════\n');

  switch (type) {
    case 'overview':
      await generateOverviewGraph();
      break;
    case 'agents':
      await generateAgentGraph();
      break;
    case 'files':
      await generateFileGraph();
      break;
    case 'knowledge':
      await generateKnowledgeGraph();
      break;
    default:
      console.log('Usage: aisdlc graph [overview|agents|files|knowledge]');
  }
}

async function generateOverviewGraph(): Promise<void> {
  const db = new SQLiteProvider();

  console.log('  Platform Overview Graph\n');
  console.log('  Workflows:');
  console.log('  ┌─────────────────────────────────┐');
  console.log('  │         Platform Stats          │');
  console.log('  ├─────────────────────────────────┤');

    const getCount = (query: string) => {
    const result = db.query({dbPath: ''});
    const rows = Array.isArray(result) ? result : result.rows || [];
    return rows[0];
  };

  const stats = {
    workflows: getCount('SELECT COUNT(*) as count FROM workflows'),
    knowledge: getCount('SELECT COUNT(*) as count FROM knowledge'),
    agents: 12
  };

  console.log(`  │ Workflows:    ${stats.workflows.count.toString().padStart(10)} │`);
  console.log(`  │ Knowledge:    ${stats.knowledge.count.toString().padStart(10)} │`);
  console.log(`  │ Agents:       ${stats.agents.toString().padStart(10)} │`);
  console.log('  └─────────────────────────────────┘\n');

  console.log('  Relationships:');
  console.log('');
  console.log('       Workflows');
  console.log('           │');
  console.log('           ├──► BA Agent');
  console.log('           ├──► Architect');
  console.log('           ├──► Engineer');
  console.log('           ├──► Security');
  console.log('           ├──► QA');
  console.log('           ├──► Atlas');
  console.log('           └──► Customer');
  console.log('');
  console.log('       Knowledge Base');
  console.log('           │');
  console.log('           ├──► Patterns');
  console.log('           ├──► Best Practices');
  console.log('           └──► Learnings');
  console.log('');
}

async function generateAgentGraph(): Promise<void> {
  const db = new SQLiteProvider();

  console.log('  Agent Collaboration Graph\n');

  // Query agent interactions
  const interactions = db.query<any>(`
    SELECT from_agent, to_agent, COUNT(*) as count
    FROM agent_messages
    GROUP BY from_agent, to_agent
    ORDER BY count DESC
    LIMIT 20
  `);

  if (interactions.length === 0) {
    console.log('  No agent interactions yet\n');
    return;
  }

  console.log('  Top Collaborations:\n');

  interactions.forEach((i: any) => {
    const bar = '█'.repeat(Math.min(20, i.count));
    console.log(`  ${i.from_agent.padEnd(20)} ──► ${i.to_agent.padEnd(20)} ${bar} ${i.count}`);
  });

  console.log('');
}

async function generateFileGraph(): Promise<void> {
  console.log('  File Dependency Graph\n');

  // Find files that change together
  const files = findFrequentlyChangedTogether();

  if (files.length === 0) {
    console.log('  No file relationships detected yet\n');
    return;
  }

  console.log('  Files frequently changed together:\n');

  files.forEach((pair: any, idx) => {
    console.log(`  ${idx + 1}. ${pair.file1}`);
    console.log(`     └──► ${pair.file2}`);
    console.log(`          (${pair.count} times)\n`);
  });
}

async function generateKnowledgeGraph(): Promise<void> {
  const db = new SQLiteProvider();

  console.log('  Knowledge Relationship Graph\n');

  const categories = db.query<any>(`
    SELECT category, COUNT(*) as count
    FROM knowledge
    GROUP BY category
    ORDER BY count DESC
  `);

  if (categories.length === 0) {
    console.log('  No knowledge captured yet\n');
    return;
  }

  console.log('  Knowledge by Category:\n');

  const maxCount = Math.max(...categories.map((c: any) => c.count));

  categories.forEach((cat: any) => {
    const barLength = Math.round((cat.count / maxCount) * 30);
    const bar = '█'.repeat(barLength);
    console.log(`  ${cat.category.padEnd(30)} ${bar} ${cat.count}`);
  });

  console.log('');
}

function findFrequentlyChangedTogether(): any[] {
  // This would analyze git history
  // For now, return empty
  return [];
}

export async function exportGraphToDot(type: string, outputPath: string): Promise<void> {
  console.log(`\n  Exporting ${type} graph to: ${outputPath}\n`);

  const dot = generateDotFormat(type);
  fs.writeFileSync(outputPath, dot);

  console.log('  ✅ Graph exported');
  console.log('  Convert to image with: dot -Tpng graph.dot -o graph.png\n');
}

function generateDotFormat(type: string): string {
  return `digraph G {
  rankdir=LR;
  node [shape=box, style=rounded];

  // Agents
  BA [label="BA Agent"];
  Architect [label="Architect"];
  Engineer [label="Software Engineer"];
  Security [label="Security Agent"];
  QA [label="QA Agent"];

  // Relationships
  BA -> Architect;
  Architect -> Engineer;
  Engineer -> Security;
  Security -> QA;
}
`;
}
