-- Migration 001: Create Audit Tables
-- Phase 3: Persistent Audit Logging
-- Database: PostgreSQL
-- Created: 2026-02-17

-- Audit log table: stores all governance and workflow events
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(100),
  request_id VARCHAR(100),
  workflow_id VARCHAR(100),
  classification JSONB,
  routing JSONB,
  governance_decision JSONB,
  approval_status VARCHAR(20),
  bypass_token_used BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_workflow ON audit_log(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_approval_status ON audit_log(approval_status);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_type_timestamp
  ON audit_log(event_type, timestamp DESC);

-- Approval requests table: tracks governance approval workflows
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY,
  workflow_id VARCHAR(100) NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  branch VARCHAR(100),
  requester_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(100),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by VARCHAR(100),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  blocked_gates TEXT[] DEFAULT '{}',
  governance_level SMALLINT NOT NULL DEFAULT 3,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_approval_workflow ON approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requester ON approval_requests(requester_id);

-- Bypass tokens table: tracks HMAC-SHA256 governance bypass tokens
CREATE TABLE IF NOT EXISTS bypass_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  workflow_id VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  gates TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bypass_workflow ON bypass_tokens(workflow_id);
CREATE INDEX IF NOT EXISTS idx_bypass_used ON bypass_tokens(used);

-- Daily statistics materialized view for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_daily_stats AS
SELECT
  DATE(timestamp) as day,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE event_type = 'governance_decision') as governance_decisions,
  COUNT(*) FILTER (WHERE event_type = 'approval_requested') as approvals_requested,
  COUNT(*) FILTER (WHERE event_type = 'approval_approved') as approvals_approved,
  COUNT(*) FILTER (WHERE event_type = 'approval_rejected') as approvals_rejected,
  COUNT(*) FILTER (WHERE bypass_token_used = true) as bypass_tokens_used,
  COUNT(*) FILTER (WHERE event_type = 'workflow_completed') as workflows_completed,
  COUNT(*) FILTER (WHERE event_type = 'workflow_failed') as workflows_failed
FROM audit_log
GROUP BY DATE(timestamp);

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_daily_stats_day ON audit_daily_stats(day);

-- Comments for documentation
COMMENT ON TABLE audit_log IS 'Immutable audit log for all governance and workflow events';
COMMENT ON TABLE approval_requests IS 'Governance approval workflow requests';
COMMENT ON TABLE bypass_tokens IS 'HMAC-SHA256 bypass tokens for Level 3 governance';
COMMENT ON MATERIALIZED VIEW audit_daily_stats IS 'Pre-computed daily statistics for dashboard';
