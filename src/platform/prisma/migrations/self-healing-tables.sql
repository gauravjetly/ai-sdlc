-- Self-Healing Incidents Table
CREATE TABLE IF NOT EXISTS self_healing_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    resource_type VARCHAR(20) NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    namespace VARCHAR(255),
    description TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'detected',
    metrics JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_self_healing_incidents_issue_type ON self_healing_incidents(issue_type);
CREATE INDEX idx_self_healing_incidents_severity ON self_healing_incidents(severity);
CREATE INDEX idx_self_healing_incidents_status ON self_healing_incidents(status);
CREATE INDEX idx_self_healing_incidents_detected_at ON self_healing_incidents(detected_at);
CREATE INDEX idx_self_healing_incidents_resource ON self_healing_incidents(resource_type, resource_name);

-- Remediation Results Table
CREATE TABLE IF NOT EXISTS remediation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES self_healing_incidents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER, -- milliseconds
    success BOOLEAN NOT NULL DEFAULT false,
    error TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_remediation_results_incident_id ON remediation_results(incident_id);
CREATE INDEX idx_remediation_results_action ON remediation_results(action);
CREATE INDEX idx_remediation_results_status ON remediation_results(status);
CREATE INDEX idx_remediation_results_success ON remediation_results(success);

-- Health Checks Table
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(20) NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    namespace VARCHAR(255),
    healthy BOOLEAN NOT NULL DEFAULT true,
    checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    issues JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_checks_resource ON health_checks(resource_type, resource_name);
CREATE INDEX idx_health_checks_namespace ON health_checks(namespace);
CREATE INDEX idx_health_checks_healthy ON health_checks(healthy);
CREATE INDEX idx_health_checks_checked_at ON health_checks(checked_at);

-- Automatic cleanup of old health checks (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS void AS $$
BEGIN
    DELETE FROM health_checks
    WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily)
-- Note: Requires pg_cron extension or external scheduler
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-health-checks', '0 2 * * *', 'SELECT cleanup_old_health_checks()');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_self_healing_incidents_updated_at
    BEFORE UPDATE ON self_healing_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE self_healing_incidents IS 'Tracks detected issues and their remediation status';
COMMENT ON TABLE remediation_results IS 'Records remediation actions taken for incidents';
COMMENT ON TABLE health_checks IS 'Continuous health monitoring results for resources';

COMMENT ON COLUMN self_healing_incidents.issue_type IS 'Type of issue: container_crash, memory_leak, etc.';
COMMENT ON COLUMN self_healing_incidents.severity IS 'Severity level: critical, high, medium, low';
COMMENT ON COLUMN self_healing_incidents.status IS 'Current status: detected, awaiting_approval, remediating, resolved, failed, ignored';
COMMENT ON COLUMN remediation_results.action IS 'Action taken: restart_pod, scale_up, rollback_deployment, etc.';
COMMENT ON COLUMN remediation_results.duration IS 'Duration of remediation action in milliseconds';
