/**
 * aisdlc init - Initialize the AI-SDLC platform
 *
 * Creates ~/.aisdlc/ directory structure, initializes SQLite database,
 * writes default configuration, and runs migrations.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');
const AISDLC_VERSION = '4.0.0';

export const initCommand = new Command('init')
  .description('Initialize AI-SDLC platform for local production')
  .option('--local-production', 'Production-grade local setup (default)')
  .option('--force', 'Force re-initialization')
  .action(async (options) => {
    console.log('');
    console.log('  AI-SDLC Platform Initialization');
    console.log('  ================================');
    console.log('');

    // Check if already initialized
    const configPath = path.join(AISDLC_HOME, 'config.json');
    if (fs.existsSync(configPath) && !options.force) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.initialized) {
        console.log('  [OK] Platform already initialized (v' + config.version + ')');
        console.log('  Use --force to re-initialize');
        console.log('');
        return;
      }
    }

    // Step 1: Create directory structure
    console.log('  [1/5] Creating directory structure...');
    const dirs = [
      AISDLC_HOME,
      path.join(AISDLC_HOME, 'data'),
      path.join(AISDLC_HOME, 'logs'),
      path.join(AISDLC_HOME, 'agents'),
      path.join(AISDLC_HOME, 'backups'),
      path.join(AISDLC_HOME, 'config'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    console.log('        ~/.aisdlc/ directory structure created');

    // Step 2: Initialize SQLite database
    console.log('  [2/5] Initializing SQLite database...');
    const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');

    try {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);

      // Configure for production
      db.pragma('journal_mode = WAL');
      db.pragma('busy_timeout = 5000');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = -64000');
      db.pragma('foreign_keys = ON');

      // Run migration SQL
      const migrationPath = path.join(__dirname, '..', '..', '..', '..', '@aisdlc', 'storage', 'src', 'migrations', '001-initial-schema.sql');

      let migrationSQL: string;
      if (fs.existsSync(migrationPath)) {
        migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      } else {
        // Inline migration for standalone CLI installation
        migrationSQL = getInlineMigration();
      }

      db.exec(migrationSQL);
      db.close();

      // Set file permissions
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(dbPath, 0o600);
        } catch {
          // Ignore
        }
      }

      console.log('        SQLite database initialized at ~/.aisdlc/data/platform.db');
    } catch (error) {
      console.log('        [WARN] SQLite initialization issue: ' + (error as Error).message);
      console.log('        Platform will use file-based storage as fallback');
    }

    // Step 3: Write configuration
    console.log('  [3/5] Writing platform configuration...');
    const config = {
      version: AISDLC_VERSION,
      storage: 'sqlite',
      eventBus: 'file',
      dashboard: {
        port: 3030,
        host: 'localhost',
      },
      database: {
        path: dbPath,
      },
      governance: {
        level: 1,
        requireApproval: false,
      },
      agents: {
        definitions: path.join(os.homedir(), '.claude', 'agents'),
      },
      hooks: {
        installed: false,
        path: path.join(os.homedir(), '.claude', 'hooks'),
      },
      mcp: {
        configured: false,
      },
      initialized: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('        Configuration saved to ~/.aisdlc/config.json');

    // Step 4: Check for existing agent installation
    console.log('  [4/5] Checking agent installation...');
    const agentsDir = path.join(os.homedir(), '.claude', 'agents');
    if (fs.existsSync(agentsDir)) {
      const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      console.log(`        Found ${agents.length} agent definition(s) in ~/.claude/agents/`);
    } else {
      console.log('        No agents found. Run install.sh from the AI-SDLC package to install agents.');
    }

    // Step 5: Summary
    console.log('  [5/5] Initialization complete!');
    console.log('');
    console.log('  Platform Configuration:');
    console.log('  -----------------------');
    console.log('  Version:    ' + AISDLC_VERSION);
    console.log('  Storage:    SQLite (local, zero-config)');
    console.log('  Event Bus:  File-based (no Redis needed)');
    console.log('  Dashboard:  http://localhost:3030');
    console.log('  Database:   ~/.aisdlc/data/platform.db');
    console.log('  Config:     ~/.aisdlc/config.json');
    console.log('');
    console.log('  Next Steps:');
    console.log('  -----------');
    console.log('  1. aisdlc start       Start the dashboard');
    console.log('  2. aisdlc doctor      Run health checks');
    console.log('  3. aisdlc status      View platform status');
    console.log('');
  });

function getInlineMigration(): string {
  return `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence TEXT DEFAULT 'emerging',
  source_agents TEXT DEFAULT '[]',
  applicable_agents TEXT DEFAULT '[]',
  evidence_count INTEGER DEFAULT 0,
  evidence TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_accessed_at TEXT DEFAULT (datetime('now')),
  access_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  superseded_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge(status);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  source_agent TEXT,
  trace_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_topic ON events(topic);
CREATE INDEX IF NOT EXISTS idx_events_trace ON events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  task_id TEXT,
  workflow_id TEXT,
  trace_id TEXT,
  details TEXT NOT NULL,
  success INTEGER DEFAULT 1,
  error TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  priority TEXT DEFAULT 'normal',
  correlation_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_to ON agent_messages(to_agent);
CREATE INDEX IF NOT EXISTS idx_messages_status ON agent_messages(status);

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  status TEXT DEFAULT 'planning',
  task_dag TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requester_id TEXT,
  approver_id TEXT,
  reason TEXT,
  decided_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sdlc_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'feature',
  status TEXT NOT NULL DEFAULT 'active',
  phases TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, '001-initial-schema');
`;
}
