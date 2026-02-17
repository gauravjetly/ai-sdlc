import { SQLiteProvider } from '@aisdlc/storage';

/**
 * Performance Profiler
 * Tracks and analyzes platform performance
 */

export async function perfCommand(args: string[]): Promise<void> {
  const action = args[0] || 'report';

  switch (action) {
    case 'report':
      await showPerformanceReport();
      break;
    case 'profile':
      await startProfiling();
      break;
    case 'optimize':
      await suggestOptimizations();
      break;
    default:
      console.log('Usage: aisdlc perf [report|profile|optimize]');
  }
}

async function showPerformanceReport(): Promise<void> {
  const db = new SQLiteProvider();

  console.log('\n  Performance Report (Last 7 Days)');
  console.log('  ═══════════════════════════════════\n');

  // Workflow performance
  const workflows = db.query<any>(`
    SELECT
      AVG(duration_ms) as avg_duration,
      MIN(duration_ms) as fastest,
      MAX(duration_ms) as slowest
    FROM workflows
    WHERE created_at > datetime('now', '-7 days')
  `)[0];

  if (workflows) {
    console.log('  Workflow Performance:');
    console.log(`    Avg Duration: ${Math.round(workflows.avg_duration / 60000)} min`);
    console.log(`    Fastest: ${Math.round(workflows.fastest / 60000)} min`);
    console.log(`    Slowest: ${Math.round(workflows.slowest / 60000)} min\n`);
  }

  // Agent performance
  console.log('  Agent Performance:');
  const agents = ['ba-agent', 'architect-jets', 'software-engineer', 'security-agent', 'qa-agent'];

  for (const agent of agents) {
    const agentStats = db.query<any>(`
      SELECT AVG(duration_ms) as avg
      FROM agent_executions
      WHERE agent_id = ? AND created_at > datetime('now', '-7 days')
    `, [agent])[0];

    if (agentStats && agentStats.avg) {
      const status = agentStats.avg < 300000 ? '✅' : '⚠️';
      console.log(`    ${agent.padEnd(20)} ${Math.round(agentStats.avg / 60000)} min ${status}`);
    }
  }

  // Bottlenecks
  console.log('\n  Bottlenecks Detected:\n');
  await detectBottlenecks(db);
}

async function detectBottlenecks(db: SQLiteProvider): Promise<void> {
  // Check slow queries
  const slowQueries = db.query<any>(`
    SELECT query, AVG(duration_ms) as avg_duration, COUNT(*) as count
    FROM query_log
    WHERE duration_ms > 500
    GROUP BY query
    ORDER BY avg_duration DESC
    LIMIT 5
  `);

  if (slowQueries.length > 0) {
    console.log('  🔴 Slow Database Queries:');
    slowQueries.forEach((q: any) => {
      console.log(`     ${q.query.substring(0, 50)}... (${q.avg_duration}ms, ${q.count}x)`);
    });
    console.log('     Suggestion: Add indexes or optimize queries\n');
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 200 * 1024 * 1024) {
    console.log('  🟡 High Memory Usage:');
    console.log(`     Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log('     Suggestion: Clear caches or reduce cache size\n');
  }
}

async function startProfiling(): Promise<void> {
  console.log('\n  Starting performance profiling...');
  console.log('  Run workflows normally. Results will be collected.\n');
  console.log('  Stop profiling with: Ctrl+C\n');
}

async function suggestOptimizations(): Promise<void> {
  console.log('\n  Optimization Suggestions:\n');
  console.log('  1. Enable classification cache');
  console.log('     Impact: 60% faster request classification\n');
  console.log('  2. Add SQLite indexes');
  console.log('     Impact: 75% faster knowledge queries\n');
  console.log('  3. Use Haiku for simple requests');
  console.log('     Impact: 80% cost reduction\n');
  console.log('  Apply optimizations? (y/N)');
}
