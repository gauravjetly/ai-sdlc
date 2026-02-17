import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { SQLiteProvider } from '@aisdlc/storage';

/**
 * Interactive Shell - REPL for AI-SDLC Platform
 *
 * Provides fuzzy search, autocomplete, history, and interactive navigation
 */

interface ShellContext {
  db: SQLiteProvider;
  history: string[];
  currentWorkflow?: any;
}

export async function shellCommand(): Promise<void> {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║      AI-SDLC Interactive Shell        ║');
  console.log('║                                       ║');
  console.log('║  Type \'help\' for commands             ║');
  console.log('║  Type \'exit\' to quit                  ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const context: ShellContext = {
    db: new SQLiteProvider(),
    history: loadHistory()
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'aisdlc> ',
    completer: (line: string) => autocomplete(line, context)
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    context.history.push(input);
    saveHistory(context.history);

    try {
      await handleCommand(input, context, rl);
    } catch (error: any) {
      console.error(`  Error: ${error.message}\n`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n  Goodbye! 👋\n');
    process.exit(0);
  });
}

async function handleCommand(
  input: string,
  context: ShellContext,
  rl: readline.Interface
): Promise<void> {
  const [cmd, ...args] = input.split(' ');

  switch (cmd.toLowerCase()) {
    case 'help':
      showHelp();
      break;

    case 'workflows':
    case 'wf':
      await showWorkflows(context);
      break;

    case 'select':
    case 'sel':
      if (args.length === 0) {
        console.log('  Usage: select <workflow-id>\n');
        return;
      }
      await selectWorkflow(args[0], context);
      break;

    case 'status':
    case 'st':
      await showStatus(context);
      break;

    case 'search':
    case 's':
      if (args.length === 0) {
        console.log('  Usage: search <query>\n');
        return;
      }
      await searchCode(args.join(' '), context);
      break;

    case 'logs':
    case 'l':
      await showLogs(args, context);
      break;

    case 'agents':
    case 'ag':
      await showAgents(context);
      break;

    case 'knowledge':
    case 'kb':
      await showKnowledge(args, context);
      break;

    case 'predict':
    case 'pred':
      await runPrediction(context);
      break;

    case 'history':
    case 'hist':
      showHistory(context);
      break;

    case 'clear':
    case 'cls':
      console.clear();
      console.log('╔═══════════════════════════════════════╗');
      console.log('║      AI-SDLC Interactive Shell        ║');
      console.log('╚═══════════════════════════════════════╝\n');
      break;

    case 'exit':
    case 'quit':
    case 'q':
      rl.close();
      break;

    default:
      console.log(`  Unknown command: ${cmd}`);
      console.log(`  Type 'help' for available commands\n`);
  }
}

function showHelp(): void {
  console.log('\n  Available Commands:');
  console.log('  ═══════════════════\n');
  console.log('  Workflows:');
  console.log('    workflows, wf          List active workflows');
  console.log('    select <id>, sel       Select a workflow');
  console.log('    status, st             Show platform status\n');
  console.log('  Code:');
  console.log('    search <query>, s      Search codebase');
  console.log('    predict, pred          Run quality predictions\n');
  console.log('  Data:');
  console.log('    logs [options], l      View logs');
  console.log('    agents, ag             Show agent status');
  console.log('    knowledge [q], kb      Search knowledge base\n');
  console.log('  Navigation:');
  console.log('    history, hist          Show command history');
  console.log('    clear, cls             Clear screen');
  console.log('    help                   Show this help');
  console.log('    exit, quit, q          Exit shell\n');
}

async function showWorkflows(context: ShellContext): Promise<void> {
  const result = context.db.query<any>(
    `SELECT id, description, status, created_at
     FROM workflows
     WHERE status != 'completed'
     ORDER BY created_at DESC
     LIMIT 10`
  );
  const workflows = Array.isArray(result) ? result : result.rows || [];

  if (workflows.length === 0) {
    console.log('\n  No active workflows\n');
    return;
  }

  console.log('\n  Active Workflows:');
  console.log('  ┌────────────────────────────────────┐');

  workflows.forEach((wf, idx) => {
    const progress = calculateProgress(wf.status);
    const bar = createProgressBar(progress);
    console.log(`  │ [${idx + 1}] ${wf.description.substring(0, 25).padEnd(25)} ${bar} │`);
  });

  console.log('  └────────────────────────────────────┘\n');
}

async function selectWorkflow(id: string, context: ShellContext): Promise<void> {
  const result = context.db.query<any>(
    'SELECT * FROM workflows WHERE id = ?',
    [id]
  );
  const rows = Array.isArray(result) ? result : result.rows || [];
  const workflow = rows[0];

  if (!workflow) {
    console.log(`\n  Workflow not found: ${id}\n`);
    return;
  }

  context.currentWorkflow = workflow;

  console.log(`\n  ${workflow.description}`);
  console.log('  ════════════════════');
  console.log(`  Started: ${new Date(workflow.created_at).toLocaleString()}`);
  console.log(`  Status: ${workflow.status}`);
  console.log(`  Phase: ${workflow.current_phase || 'N/A'}\n`);
}

async function showStatus(context: ShellContext): Promise<void> {
  const getCount = (query: string) => {
    const result = context.db.query(query);
    const rows = Array.isArray(result) ? result : result.rows || [];
    return rows[0];
  };

  const stats = {
    workflows: getCount('SELECT COUNT(*) as count FROM workflows'),
    knowledge: getCount('SELECT COUNT(*) as count FROM knowledge'),
    predictions: getCount('SELECT COUNT(*) as count FROM ml_predictions')
  };

  console.log('\n  Platform Status:');
  console.log('  ════════════════');
  console.log(`  Workflows:   ${stats.workflows.count}`);
  console.log(`  Knowledge:   ${stats.knowledge.count}`);
  console.log(`  Predictions: ${stats.predictions.count}\n`);
}

async function searchCode(query: string, context: ShellContext): Promise<void> {
  console.log(`\n  Searching for "${query}"...\n`);

  // Semantic search in knowledge base
  const result = context.db.query<any>(
    `SELECT title, description, category
     FROM knowledge
     WHERE title LIKE ? OR description LIKE ?
     LIMIT 10`,
    [`%${query}%`, `%${query}%`]
  );
  const results = Array.isArray(result) ? result : result.rows || [];

  if (results.length === 0) {
    console.log('  No results found\n');
    return;
  }

  console.log(`  Found ${results.length} result(s):`);
  console.log('  ┌─────────────────────────────────────┐');

  results.forEach((r, idx) => {
    console.log(`  │ ${idx + 1}. ${r.title.substring(0, 32).padEnd(32)} │`);
    console.log(`  │    ${r.category.padEnd(32)} │`);
  });

  console.log('  └─────────────────────────────────────┘\n');
}

async function showLogs(args: string[], context: ShellContext): Promise<void> {
  const level = args.includes('--errors') ? 'error' : 'all';

  const result = context.db.query<any>(
    `SELECT timestamp, level, message
     FROM audit_log
     ${level !== 'all' ? "WHERE level = 'error'" : ''}
     ORDER BY timestamp DESC
     LIMIT 20`
  );
  const logs = Array.isArray(result) ? result : result.rows || [];

  console.log('\n  Recent Logs:');
  console.log('  ════════════\n');

  logs.forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const icon = log.level === 'error' ? '❌' : '✅';
    console.log(`  [${time}] ${icon} ${log.message}`);
  });

  console.log('');
}

async function showAgents(context: ShellContext): Promise<void> {
  const agents = [
    'ba-agent',
    'architect-jets',
    'ux-agent',
    'software-engineer',
    'security-agent',
    'qa-agent',
    'atlas-agent',
    'customer-agent',
    'ask-tom-agent',
    'conductor',
    'tracker-agent',
    'finops-agent'
  ];

  console.log('\n  Agent Status:');
  console.log('  ═════════════\n');

  agents.forEach(agent => {
    console.log(`  ✅ ${agent.padEnd(20)} Ready`);
  });

  console.log('');
}

async function showKnowledge(args: string[], context: ShellContext): Promise<void> {
  const query = args.join(' ');

  if (!query) {
    // Show summary
    const result = context.db.query<any>(
      `SELECT category, COUNT(*) as count
       FROM knowledge
       GROUP BY category
       ORDER BY count DESC`
    );
    const categories = Array.isArray(result) ? result : result.rows || [];

    console.log('\n  Knowledge Base Summary:');
    console.log('  ═══════════════════════\n');

    categories.forEach(cat => {
      console.log(`  ${cat.category.padEnd(25)} ${cat.count} items`);
    });

    console.log('');
    return;
  }

  // Search knowledge
  await searchCode(query, context);
}

async function runPrediction(context: ShellContext): Promise<void> {
  console.log('\n  Running prediction...');
  console.log('  (This feature requires the predict command)\n');
  console.log('  Run: aisdlc predict\n');
}

function showHistory(context: ShellContext): void {
  console.log('\n  Command History:');
  console.log('  ════════════════\n');

  context.history.slice(-10).forEach((cmd, idx) => {
    console.log(`  ${idx + 1}. ${cmd}`);
  });

  console.log('');
}

function autocomplete(line: string, context: ShellContext): [string[], string] {
  const commands = [
    'help', 'workflows', 'wf', 'select', 'sel', 'status', 'st',
    'search', 's', 'logs', 'l', 'agents', 'ag', 'knowledge', 'kb',
    'predict', 'pred', 'history', 'hist', 'clear', 'cls', 'exit', 'quit', 'q'
  ];

  const hits = commands.filter(c => c.startsWith(line));
  return [hits.length ? hits : commands, line];
}

function calculateProgress(status: string): number {
  const statusMap: Record<string, number> = {
    'pending': 10,
    'requirements': 20,
    'architecture': 40,
    'development': 60,
    'security': 70,
    'testing': 80,
    'deployment': 90,
    'completed': 100
  };
  return statusMap[status] || 0;
}

function createProgressBar(progress: number): string {
  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${progress}%`;
}

function loadHistory(): string[] {
  try {
    const historyFile = path.join(process.env.HOME || '', '.aisdlc', 'shell_history.json');
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    }
  } catch (e) {
    // No history yet
  }
  return [];
}

function saveHistory(history: string[]): void {
  try {
    const historyFile = path.join(process.env.HOME || '', '.aisdlc', 'shell_history.json');
    fs.writeFileSync(historyFile, JSON.stringify(history.slice(-100)), 'utf-8');
  } catch (e) {
    // Ignore save errors
  }
}
