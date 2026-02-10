# MCP Tool Reference

Complete reference for all 100+ MCP tools available in the AI Platform.

## Table of Contents

- [Deployment Tools](#deployment-tools)
- [Infrastructure Tools](#infrastructure-tools)
- [Security Tools](#security-tools)
- [Cost Management Tools](#cost-management-tools)
- [Observability Tools](#observability-tools)
- [Testing Tools](#testing-tools)
- [Release Management Tools](#release-management-tools)
- [Architecture Tools](#architecture-tools)

---

## Deployment Tools

### deploy_application

Deploy an application to a specified environment.

**Parameters:**
- `application` (string, required): Application name
- `version` (string, required): Semantic version (e.g., "1.2.0")
- `environment` (enum, required): `dev`, `uat`, `prod`, `dr`
- `strategy` (enum, optional): `rolling`, `blue-green`, `canary`
- `replicas` (number, optional): 1-100

**Returns:**
```json
{
  "deployment_id": "uuid",
  "status": "pending",
  "message": "Deployment initiated",
  "estimated_time": "5-10 minutes"
}
```

**Example:**
```typescript
const result = await client.callTool('deploy_application', {
  application: 'web-app',
  version: '1.2.0',
  environment: 'prod',
  strategy: 'blue-green',
  replicas: 5
});
```

### rollback_deployment

Rollback a deployment to the previous version.

**Parameters:**
- `deployment_id` (UUID, required): Deployment to rollback

**Returns:**
```json
{
  "success": true,
  "previous_version": "1.0.0",
  "message": "Rolled back to version 1.0.0"
}
```

### get_deployment_status

Get current deployment status and health.

**Parameters:**
- `deployment_id` (UUID, required)

**Returns:**
```json
{
  "id": "uuid",
  "status": "deployed",
  "health": "healthy",
  "replicas": {
    "desired": 3,
    "current": 3,
    "ready": 3
  }
}
```

### get_deployment_logs

Retrieve deployment logs.

**Parameters:**
- `deployment_id` (UUID, required)
- `lines` (number, optional): 1-10000, default 100
- `since` (string, optional): Time range (e.g., "1h", "30m")

**Returns:**
```json
{
  "deployment_id": "uuid",
  "logs": ["log line 1", "log line 2"],
  "count": 2
}
```

### scale_deployment

Scale deployment replicas.

**Parameters:**
- `deployment_id` (UUID, required)
- `replicas` (number, required): 0-100

**Returns:**
```json
{
  "success": true,
  "new_replica_count": 5,
  "status": "scaling"
}
```

---

## Infrastructure Tools

### provision_infrastructure

Provision cloud infrastructure using workflow definition.

**Parameters:**
- `workflow` (string, required): YAML or JSON workflow definition
- `cloud` (enum, required): `aws`, `oci`, `azure`, `gcp`
- `environment` (enum, required): `dev`, `uat`, `prod`, `dr`

**Returns:**
```json
{
  "workflow_id": "uuid",
  "status": "provisioning",
  "resources": [
    {
      "type": "virtual_network",
      "name": "app-network",
      "status": "creating"
    }
  ]
}
```

### get_infrastructure_status

Get infrastructure provisioning status.

**Parameters:**
- `workflow_id` (UUID, required)

**Returns:**
```json
{
  "workflow_id": "uuid",
  "status": "provisioned",
  "resources": [...]
}
```

### destroy_infrastructure

Destroy provisioned infrastructure.

**Parameters:**
- `workflow_id` (UUID, required)
- `confirm` (boolean, required): Must be `true`

**Returns:**
```json
{
  "success": true,
  "status": "destroying",
  "estimated_time": "10-15 minutes"
}
```

---

## Security Tools

### run_security_scan

Run comprehensive security scan.

**Parameters:**
- `target` (string, required): Target to scan
- `scan_type` (enum, required): `vulnerabilities`, `compliance`, `secrets`, `all`

**Returns:**
```json
{
  "scan_id": "uuid",
  "findings_count": 10,
  "critical": 0,
  "high": 2,
  "summary": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 3
  }
}
```

### check_compliance

Check compliance against security standards.

**Parameters:**
- `target` (string, required)
- `standards` (array, required): `CIS`, `SOC2`, `GDPR`, `PCI-DSS`

**Returns:**
```json
{
  "compliant": true,
  "score": 92,
  "standards_checked": ["CIS", "SOC2"],
  "recommendations": ["Enable audit logging"]
}
```

---

## Cost Management Tools

### get_cost_report

Get detailed cost report.

**Parameters:**
- `period` (enum, required): `daily`, `weekly`, `monthly`, `yearly`
- `cloud` (enum, optional): `aws`, `oci`, `azure`, `gcp`

**Returns:**
```json
{
  "period": "monthly",
  "total_cost": 4532.50,
  "breakdown": [
    {
      "service": "compute",
      "cost": 2100.00,
      "percentage": 46.3
    }
  ]
}
```

### forecast_costs

Forecast future costs.

**Parameters:**
- `cloud` (enum, required): Cloud provider
- `months` (number, required): 1-12 months

**Returns:**
```json
{
  "forecast_months": 6,
  "predictions": [
    {
      "month": "2026-02",
      "estimated_cost": 4500,
      "confidence": 0.85
    }
  ]
}
```

---

## Observability Tools

### get_metrics

Get performance metrics.

**Parameters:**
- `service` (string, required)
- `metrics` (array, required): `cpu`, `memory`, `requests`, `errors`, `latency`
- `start_time` (ISO8601, optional)
- `end_time` (ISO8601, optional)

**Returns:**
```json
{
  "service": "web-app",
  "metrics": {
    "cpu": 45,
    "memory": 62,
    "latency": {
      "p50": 120,
      "p95": 250,
      "p99": 450
    }
  }
}
```

### get_logs

Retrieve application logs.

**Parameters:**
- `service` (string, required)
- `level` (enum, optional): `error`, `warn`, `info`, `debug`
- `lines` (number, optional): 1-10000, default 100
- `since` (string, optional): Time range

**Returns:**
```json
{
  "service": "web-app",
  "logs": [
    {
      "timestamp": "2026-01-29T10:00:00Z",
      "level": "info",
      "message": "Application started"
    }
  ]
}
```

---

## Testing Tools

### run_tests

Run automated tests.

**Parameters:**
- `type` (enum, required): `unit`, `integration`, `e2e`, `performance`, `security`
- `target` (string, optional): Specific test target
- `parallel` (boolean, optional): Default `true`

**Returns:**
```json
{
  "test_run_id": "uuid",
  "type": "unit",
  "status": "passed",
  "total": 150,
  "passed": 148,
  "failed": 2,
  "coverage": 87.5
}
```

### get_code_coverage

Get code coverage metrics.

**Parameters:**
- `target` (string, optional): Coverage target
- `threshold` (number, optional): 0-100

**Returns:**
```json
{
  "coverage": {
    "lines": 87.5,
    "branches": 82.3,
    "functions": 90.1
  },
  "passed": true
}
```

---

## Release Management Tools

### create_release

Create a new release.

**Parameters:**
- `application` (string, required)
- `version` (semver, required)
- `environment` (enum, required)
- `strategy` (enum, required): Deployment strategy
- `approval_required` (boolean, optional)

**Returns:**
```json
{
  "release_id": "uuid",
  "status": "pending_approval",
  "message": "Release created successfully"
}
```

### approve_release

Approve a release.

**Parameters:**
- `release_id` (UUID, required)
- `approver` (string, required)

**Returns:**
```json
{
  "release_id": "uuid",
  "approved_by": "john.doe",
  "status": "approved"
}
```

---

## Architecture Tools

### validate_architecture

Validate code architecture.

**Parameters:**
- `target` (string, required): Code directory
- `rules` (array, optional): Architecture rules

**Returns:**
```json
{
  "status": "valid",
  "violations": [],
  "metrics": {
    "coupling": 35,
    "cohesion": 85,
    "complexity": 42
  }
}
```

### analyze_dependencies

Analyze project dependencies.

**Parameters:**
- `target` (string, required)
- `depth` (number, optional): 1-10, default 3

**Returns:**
```json
{
  "total_dependencies": 125,
  "outdated": 8,
  "vulnerable": 2,
  "recommendations": ["Update outdated packages"]
}
```

---

## Common Patterns

### Async Operations

Many tools return immediately with a resource ID. Poll for status:

```typescript
// Start operation
const result = await client.callTool('provision_infrastructure', params);
const workflowId = result.workflow_id;

// Poll for completion
let status = 'provisioning';
while (status === 'provisioning') {
  await sleep(10000); // Wait 10 seconds
  const statusResult = await client.callTool('get_infrastructure_status', {
    workflow_id: workflowId
  });
  status = statusResult.status;
}
```

### Error Handling

```typescript
try {
  const result = await client.callTool('deploy_application', params);
} catch (error) {
  if (error.message.includes('Invalid arguments')) {
    // Handle validation error
  } else if (error.message.includes('Tool not found')) {
    // Handle unknown tool
  } else {
    // Handle execution error
  }
}
```

### Batching

Execute multiple tools in parallel:

```typescript
const [metrics, logs, health] = await Promise.all([
  client.getMetrics({ service: 'web-app', metrics: ['cpu', 'memory'] }),
  client.getLogs({ service: 'web-app', lines: 100 }),
  client.getServiceHealth('web-app')
]);
```

---

## Data Types

### UUID
Standard UUID v4 format: `123e4567-e89b-12d3-a456-426614174000`

### Semver
Semantic version: `MAJOR.MINOR.PATCH` (e.g., `1.2.0`)

### ISO8601
Date/time format: `2026-01-29T10:00:00Z`

### Environment
One of: `dev`, `uat`, `prod`, `dr`

### Cloud Provider
One of: `aws`, `oci`, `azure`, `gcp`

### Deployment Strategy
One of: `rolling`, `blue-green`, `canary`

---

For more examples and integration guides, see [MCP-INTEGRATION.md](./MCP-INTEGRATION.md).
