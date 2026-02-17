-- Migration 001: Initial Schema for Agentic AI Platform Phase 1
-- Creates all tables per ARCH-AGENTIC-PLATFORM-20260216, Section 7.1

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Management
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  capabilities JSONB NOT NULL DEFAULT '[]',
  model VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'available',
  last_active TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Workflow Management
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'planning',
  task_dag JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id VARCHAR(50) REFERENCES agents(id),
  type VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  success_criteria JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tokens_used INTEGER DEFAULT 0,
  reasoning_depth INTEGER DEFAULT 0,
  confidence DECIMAL(3,2),
  error TEXT
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(20) DEFAULT 'blocks',
  PRIMARY KEY (task_id, depends_on)
);

-- Semantic Memory (Knowledge Base)
CREATE TABLE IF NOT EXISTS knowledge (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072),
  confidence VARCHAR(20) DEFAULT 'emerging',
  source_agents VARCHAR(50)[] DEFAULT '{}',
  applicable_agents VARCHAR(50)[] DEFAULT '{}',
  evidence_count INTEGER DEFAULT 0,
  evidence JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  superseded_by VARCHAR(50)
);

-- IVFFlat index for vector similarity search
-- Note: IVFFlat requires data to be present before building the index.
-- For empty tables, we create the index but it will be rebuilt when data exists.
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_source_agents ON knowledge USING GIN(source_agents);
CREATE INDEX IF NOT EXISTS idx_knowledge_applicable_agents ON knowledge USING GIN(applicable_agents);

-- Episodic Memory
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  goal TEXT NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  summary TEXT,
  embedding vector(3072),
  learnings JSONB DEFAULT '[]',
  duration_seconds INTEGER,
  total_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events (for event bus persistence)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  source_agent VARCHAR(50),
  trace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_topic ON events(topic);
CREATE INDEX IF NOT EXISTS idx_events_trace ON events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  scope VARCHAR(20) DEFAULT 'global',
  condition JSONB NOT NULL,
  action VARCHAR(30) NOT NULL,
  enforcement VARCHAR(20) NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  agent_id VARCHAR(50),
  task_id UUID,
  workflow_id UUID,
  trace_id UUID,
  details JSONB NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_workflow ON audit_log(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Record this migration
INSERT INTO schema_migrations (version, name)
VALUES (1, '001-initial-schema')
ON CONFLICT (version) DO NOTHING;
