# Event Catalog - Complete Reference

## Overview

This document catalogs all event types in the AI-SDLC agent mesh that the Exec Agent subscribes to or publishes.

## Event Format

All events follow this JSON structure:

```json
{
  "id": "unique-event-id",
  "event_type": "event.type.name",
  "source_agent": "agent-name",
  "target_agents": ["agent1", "agent2"],
  "timestamp": "2026-02-17T10:30:00Z",
  "payload": {
    "project_id": "PROJ-123",
    ...
  },
  "correlation_id": "workflow-id",
  "metadata": {}
}
```

## Event Types

### Project Lifecycle Events

#### `project.created`
**Source:** Conductor
**Description:** New project initialized in the system
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "project_name": "Feature Implementation",
  "created_by": "user@example.com",
  "team_size": 5
}
```
**Exec Agent Action:** Add project to knowledge graph

#### `project.updated`
**Source:** Conductor
**Description:** Project metadata or status changed
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "changes": ["status", "timeline", "team"],
  "previous_status": "in_progress",
  "current_status": "review"
}
```
**Exec Agent Action:** Refresh status slides if significant changes

#### `project.completed`
**Source:** Conductor
**Description:** Project reached completion
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "completion_date": "2026-02-17",
  "final_status": "success",
  "duration_days": 45
}
```
**Exec Agent Action:** Auto-generate executive summary presentation

---

### Architecture Events

#### `architecture.designed`
**Source:** Jets (Architect Agent)
**Description:** Initial architecture designed for project
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "architecture_id": "ARCH-001",
  "style": "microservices",
  "components": 12,
  "diagram_url": "path/to/diagram.png"
}
```
**Exec Agent Action:** Prepare architecture slides for presentations

#### `architecture.updated`
**Source:** Jets
**Description:** Architecture changed (ADR created, components added/removed)
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "architecture_id": "ARCH-001",
  "version": "2.0",
  "changes": ["Added caching layer", "Updated API gateway"],
  "adr_id": "ADR-005"
}
```
**Exec Agent Action:** Regenerate architecture diagrams in existing presentations

#### `adr.created`
**Source:** Jets
**Description:** Architecture Decision Record created
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "adr_id": "ADR-005",
  "title": "Use Redis for caching",
  "status": "accepted",
  "decision_date": "2026-02-17"
}
```
**Exec Agent Action:** Add ADR summary to architecture slides

---

### Development Events

#### `code.committed`
**Source:** Engineer Agent
**Description:** Code committed to repository
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "commit_count": 15,
  "lines_added": 1200,
  "lines_removed": 300,
  "files_changed": 25
}
```
**Exec Agent Action:** Update development progress metrics

#### `build.completed`
**Source:** Engineer Agent
**Description:** CI/CD build completed
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "build_id": "BUILD-456",
  "status": "success",
  "duration_seconds": 120,
  "artifacts": ["app.jar", "docs.zip"]
}
```
**Exec Agent Action:** Update build status indicators

---

### Security Events

#### `security.scan_completed`
**Source:** Security Agent
**Description:** Security scan finished
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "scan_id": "SCAN-789",
  "results": {
    "vulnerabilities_count": 2,
    "critical": 0,
    "high": 1,
    "medium": 1,
    "low": 0,
    "security_score": 0.85
  },
  "scan_date": "2026-02-17"
}
```
**Exec Agent Action:** Update security posture slides with latest scan results

#### `security.vulnerability_found`
**Source:** Security Agent
**Description:** Specific vulnerability discovered
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "vulnerability_id": "VULN-001",
  "severity": "high",
  "title": "SQL Injection in API endpoint",
  "cve": "CVE-2024-12345",
  "affected_component": "user-api",
  "discovered_date": "2026-02-17"
}
```
**Exec Agent Action:** Add vulnerability to security tracking, create alert slide

#### `security.vulnerability_fixed`
**Source:** Security Agent
**Description:** Vulnerability remediated
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "vulnerability_id": "VULN-001",
  "fix_method": "code_patch",
  "fix_commit": "abc123",
  "verified": true,
  "time_to_fix_hours": 4.5
}
```
**Exec Agent Action:** Update security status, publish learning insight about fix time

---

### Testing Events

#### `tests.completed`
**Source:** QA Agent
**Description:** Test suite execution finished
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "test_run_id": "RUN-999",
  "total_tests": 1250,
  "passed": 1240,
  "failed": 10,
  "skipped": 0,
  "test_coverage": 0.92,
  "duration_seconds": 300
}
```
**Exec Agent Action:** Update quality metrics slides

#### `tests.failed`
**Source:** QA Agent
**Description:** Tests failed
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "test_run_id": "RUN-999",
  "failures": {
    "count": 10,
    "rate": 0.008,
    "failure_types": ["assertion", "timeout", "error"],
    "critical_failures": 2
  }
}
```
**Exec Agent Action:** Add risk indicator to status slides

#### `quality.gate_passed`
**Source:** QA Agent
**Description:** Quality gate criteria met
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "gate_id": "GATE-PRE-DEPLOY",
  "metrics": {
    "test_coverage": 0.92,
    "code_quality_score": 0.88,
    "security_score": 0.85,
    "performance_score": 0.90
  },
  "passed": true
}
```
**Exec Agent Action:** Add quality achievement badge to presentations

---

### Deployment Events

#### `deployment.started`
**Source:** Atlas (Deploy Agent)
**Description:** Deployment initiated
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "deployment_id": "DEPLOY-555",
  "environment": "production",
  "version": "2.1.0",
  "initiated_by": "user@example.com",
  "start_time": "2026-02-17T10:00:00Z"
}
```
**Exec Agent Action:** Update deployment status indicators

#### `deployment.completed`
**Source:** Atlas
**Description:** Deployment successfully finished
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "deployment_id": "DEPLOY-555",
  "environment": "production",
  "status": "success",
  "duration_seconds": 180,
  "services_deployed": 8,
  "rollback_enabled": true
}
```
**Exec Agent Action:** Update deployment status, add success indicator

#### `deployment.failed`
**Source:** Atlas
**Description:** Deployment failed
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "deployment_id": "DEPLOY-555",
  "environment": "production",
  "status": "failed",
  "error_message": "Health check timeout",
  "rollback_initiated": true,
  "failed_at_stage": "health_check"
}
```
**Exec Agent Action:** Add deployment failure alert to status presentations

---

### Customer Events

#### `uat.completed`
**Source:** Customer Agent
**Description:** User Acceptance Testing completed
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "uat_id": "UAT-777",
  "results": {
    "status": "accepted",
    "acceptance_rate": 0.95,
    "test_scenarios": 50,
    "passed": 48,
    "failed": 2
  },
  "feedback_summary": "Minor issues in admin panel"
}
```
**Exec Agent Action:** Learn from high acceptance rate, emphasize success in presentations

#### `customer.feedback_received`
**Source:** Customer Agent
**Description:** Customer provided feedback
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "presentation_id": "PRES-001",
  "rating": 4,
  "sentiment": "positive",
  "comments": "Clear and concise presentation, excellent diagrams",
  "areas_for_improvement": ["Add more financial details"]
}
```
**Exec Agent Action:** Process feedback, update learning model, adjust future presentations

---

### Exec Agent Events (Outbound)

#### `presentation.generated`
**Source:** Exec Agent
**Target:** Conductor, Tracker
**Description:** New presentation created
**Payload:**
```json
{
  "presentation_id": "PRES-001",
  "project_id": "PROJ-123",
  "type": "executive-summary",
  "slide_count": 8,
  "quality_score": 0.85,
  "file_path": "/path/to/presentation.pptx",
  "generated_at": "2026-02-17T11:00:00Z"
}
```
**Other Agents Actions:**
- **Conductor:** Records in project timeline
- **Tracker:** Updates deliverables tracking

#### `presentation.updated`
**Source:** Exec Agent
**Target:** Conductor, Tracker
**Description:** Existing presentation updated
**Payload:**
```json
{
  "original_presentation_id": "PRES-001",
  "updated_presentation_id": "PRES-001-v2",
  "project_id": "PROJ-123",
  "changes": ["architecture", "security"],
  "trigger": "architecture.updated",
  "version": 2
}
```

#### `exec.learning_insight`
**Source:** Exec Agent
**Target:** Broadcast (all agents)
**Description:** Insight learned from patterns
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "insight_type": "high_quality_metrics",
  "details": {
    "test_coverage": 0.92,
    "code_quality": 0.88
  },
  "source": "security_event_handler",
  "confidence": 0.85
}
```

---

### Exec Agent Triggers (Inbound)

#### `exec.generate_presentation`
**Source:** Any agent (typically Conductor)
**Target:** Exec Agent
**Description:** Request to generate presentation
**Payload:**
```json
{
  "project_id": "PROJ-123",
  "presentation_type": "executive-summary",
  "audience": "c-suite",
  "requested_by": "user@example.com"
}
```
**Exec Agent Action:** Generate requested presentation

#### `exec.update_presentation`
**Source:** Any agent
**Target:** Exec Agent
**Description:** Request to update existing presentation
**Payload:**
```json
{
  "presentation_id": "PRES-001",
  "update_sections": ["architecture", "status"],
  "reason": "architecture_change"
}
```
**Exec Agent Action:** Regenerate specified sections

---

## Event Sequencing

### Typical Project Workflow

```
1. project.created (Conductor)
2. architecture.designed (Jets)
3. code.committed (Engineer) [multiple]
4. build.completed (Engineer) [multiple]
5. security.scan_completed (Security)
6. tests.completed (QA)
7. quality.gate_passed (QA)
8. deployment.completed (Atlas)
9. uat.completed (Customer)
10. customer.feedback_received (Customer)
11. project.completed (Conductor)
12. → exec.generate_presentation (Exec) [triggered by #11]
13. → presentation.generated (Exec)
```

### Architecture Change Workflow

```
1. architecture.updated (Jets)
2. → exec.update_presentation (Exec) [auto-triggered]
3. → presentation.updated (Exec)
4. adr.created (Jets)
5. → exec.update_presentation (Exec)
```

### Security Issue Workflow

```
1. security.vulnerability_found (Security)
2. → exec updates security slides
3. security.vulnerability_fixed (Security)
4. → exec.learning_insight (Exec)
5. → presentation.updated (Exec)
```

## Best Practices

### Event Design
1. **Immutability** - Events are never modified after publishing
2. **Self-Contained** - Include all necessary context in payload
3. **Correlation** - Use correlation_id for related events
4. **Idempotency** - Handlers should safely handle duplicate events

### Error Handling
1. **Validate** - Always validate event structure
2. **Log** - Log all events received and published
3. **Graceful Degradation** - Continue on handler errors
4. **Dead Letter Queue** - Archive events that can't be processed

### Performance
1. **Async Processing** - Don't block event publishing
2. **Batch Operations** - Group related updates
3. **TTL** - Expire old events (30 days default)
4. **Indexing** - Index events by project_id and timestamp

## Monitoring

### Key Metrics
- Events published per hour
- Event processing latency
- Handler error rate
- Event backlog size
- Correlation chain completeness

### Alerts
- Event processing > 30 seconds
- Handler error rate > 5%
- Inbox backlog > 100 events
- Event age > 24 hours

---

**Last Updated:** 2026-02-17
**Version:** 1.0
**Maintained By:** Exec Agent Team
