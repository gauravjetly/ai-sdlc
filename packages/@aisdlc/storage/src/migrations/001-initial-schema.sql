-- Migration 001: Initial Schema for AI-SDLC Local Production Platform
-- SQLite-compatible version of the PostgreSQL schema

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- Knowledge base (collective memory)
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

-- Events (event bus persistence)
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

-- Audit trail
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

-- Agent messages
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

-- Workflows
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

-- Approval requests
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

-- SDLC project registry
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

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, '001-initial-schema');
