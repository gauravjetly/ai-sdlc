-- AI-SDLC Database Schema
-- ========================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   VARCHAR(64) UNIQUE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    idea         TEXT NOT NULL,
    workspace    VARCHAR(1024),
    status       VARCHAR(32) DEFAULT 'queued',
    started_at   TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_cost   DECIMAL(10,6) DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    error_count  INTEGER DEFAULT 0,
    metadata     JSONB DEFAULT '{}'
);

-- Phase executions
CREATE TABLE IF NOT EXISTS phase_executions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  VARCHAR(64) REFERENCES projects(project_id),
    phase_id    INTEGER NOT NULL,
    phase_name  VARCHAR(128) NOT NULL,
    status      VARCHAR(32) DEFAULT 'pending',
    started_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    agents      JSONB DEFAULT '[]',
    artifacts   JSONB DEFAULT '[]',
    errors      JSONB DEFAULT '[]'
);

-- Agent runs
CREATE TABLE IF NOT EXISTS agent_runs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   VARCHAR(64),
    agent_type   VARCHAR(64) NOT NULL,
    task         JSONB,
    output       JSONB,
    success      BOOLEAN DEFAULT FALSE,
    tokens_used  INTEGER DEFAULT 0,
    cost_usd     DECIMAL(10,6) DEFAULT 0,
    started_at   TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    errors       JSONB DEFAULT '[]'
);

-- Security scans
CREATE TABLE IF NOT EXISTS security_scans (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id     VARCHAR(64) UNIQUE NOT NULL,
    project_id  VARCHAR(64),
    score       DECIMAL(5,1),
    passed      BOOLEAN,
    findings    JSONB DEFAULT '[]',
    scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Remediation audit log
CREATE TABLE IF NOT EXISTS remediation_audit (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger     VARCHAR(128) NOT NULL,
    service     VARCHAR(128),
    context     JSONB,
    results     JSONB,
    dry_run     BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status    ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_started   ON projects(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase_project      ON phase_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_project      ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_security_project   ON security_scans(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_idea_trgm ON projects USING gin(idea gin_trgm_ops);
