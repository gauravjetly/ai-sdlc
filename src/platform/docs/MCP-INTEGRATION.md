# MCP Integration Guide

## Overview

The AI Platform MCP Server exposes **100+ tools** for AI agents to manage deployments, infrastructure, security, costs, observability, testing, releases, and architecture validation through the Model Context Protocol (MCP).

## Quick Start

### 1. Build the MCP Server

```bash
cd src/platform
npm install
npm run build
```

### 2. Start the MCP Server

**Option A: stdio transport (for Claude Desktop)**
```bash
npm run mcp:start
```

**Option B: HTTP/SSE transport (for web integrations)**
```bash
npm run mcp:http
# Server runs on http://localhost:3001
```

### 3. Test the Server

```bash
# List all tools
curl http://localhost:3001/tools

# Get server health
curl http://localhost:3001/health

# Search tools
curl http://localhost:3001/tools/search?q=deploy
```

## Integration Methods

### Method 1: Claude Desktop (stdio)

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ai-platform": {
      "command": "node",
      "args": [
        "/path/to/aisdlc-2.1.0/src/platform/dist/mcp/server/mcp-server.js"
      ]
    }
  }
}
```

Restart Claude Desktop, and you'll have access to 100+ platform tools!

### Method 2: TypeScript/Node.js

```typescript
import { createMCPClient } from '@platform/mcp/client/mcp-client';

// Connect to MCP server
const client = await createMCPClient({
  serverCommand: 'node dist/mcp/server/mcp-server.js'
});

// List all tools
const tools = await client.listTools();
console.log(`Available tools: ${tools.length}`);

// Deploy an application
const deployment = await client.deployApplication({
  application: 'web-app',
  version: '1.2.0',
  environment: 'prod',
  strategy: 'blue-green',
  replicas: 5
});

console.log(`Deployment ID: ${deployment.deployment_id}`);

// Get deployment status
const status = await client.getDeploymentStatus(deployment.deployment_id);
console.log(`Status: ${status.status}`);

// Disconnect
await client.disconnect();
```

### Method 3: HTTP REST API

```bash
# Execute a tool via REST
curl -X POST http://localhost:3001/tools/deploy_application/execute \
  -H "Content-Type: application/json" \
  -d '{
    "application": "web-app",
    "version": "1.2.0",
    "environment": "prod",
    "strategy": "rolling",
    "replicas": 3
  }'
```

### Method 4: HTTP SSE (Server-Sent Events)

For real-time MCP communication over HTTP:

```typescript
const response = await fetch('http://localhost:3001/sse', {
  method: 'POST'
});

// Handle SSE stream
const reader = response.body.getReader();
// ... process MCP messages
```

## Tool Categories

### 1. Deployment Tools (15 tools)

Manage application deployments across environments:

- `deploy_application` - Deploy with strategies (rolling, blue-green, canary)
- `rollback_deployment` - Automatic rollback to previous version
- `get_deployment_status` - Monitor deployment progress
- `get_deployment_logs` - Retrieve deployment logs
- `scale_deployment` - Scale replicas up or down
- `restart_deployment` - Rolling restart
- `list_deployments` - List all deployments with filters
- `get_deployment_health` - Health checks and uptime
- `pause_deployment` - Pause traffic
- `resume_deployment` - Resume traffic
- `get_deployment_metrics` - CPU, memory, requests
- `update_deployment_config` - Update configuration
- `get_deployment_events` - Recent state changes
- `validate_deployment` - Pre-deployment validation
- `get_deployment_dependencies` - Service dependencies

### 2. Infrastructure Tools (15 tools)

Provision and manage cloud infrastructure:

- `provision_infrastructure` - Multi-cloud provisioning (AWS, OCI, Azure, GCP)
- `get_infrastructure_status` - Resource status monitoring
- `destroy_infrastructure` - Safe infrastructure teardown
- `scale_infrastructure` - Auto-scaling configuration
- `list_infrastructure` - List all infrastructure
- `get_resource_details` - Detailed resource information
- `update_infrastructure` - Apply configuration changes
- `validate_infrastructure` - Pre-provisioning validation
- `get_infrastructure_cost` - Cost breakdown
- `tag_infrastructure` - Apply resource tags
- `get_infrastructure_topology` - Visual topology
- `backup_infrastructure_state` - State backup
- `restore_infrastructure_state` - State restoration
- `get_infrastructure_compliance` - Compliance checking
- `optimize_infrastructure` - Cost and performance optimization

### 3. Security Tools (15 tools)

Security scanning and compliance:

- `run_security_scan` - Vulnerabilities, compliance, secrets
- `apply_patches` - Automated patching
- `check_compliance` - CIS, SOC2, GDPR, PCI-DSS
- `generate_security_report` - PDF/JSON/HTML reports
- `rotate_secrets` - Zero-downtime secret rotation
- `audit_access_logs` - Anomaly detection
- `configure_firewall` - Firewall rule management
- `enable_encryption` - At-rest and in-transit encryption
- `scan_docker_image` - Container vulnerability scanning
- `check_certificates` - SSL/TLS certificate monitoring
- `detect_malware` - Malware detection
- `enable_waf` - Web Application Firewall
- `generate_security_keys` - Cryptographic key generation
- `review_iam_policies` - IAM policy auditing
- `enable_audit_logging` - Audit log configuration

### 4. Cost Management Tools (12 tools)

Cloud cost optimization:

- `get_cost_report` - Detailed cost reports
- `forecast_costs` - Multi-month cost forecasting
- `optimize_costs` - Optimization recommendations
- `set_budget_alert` - Budget alerting
- `get_resource_cost` - Per-resource cost tracking
- `compare_cloud_costs` - Multi-cloud cost comparison
- `get_cost_breakdown` - Granular cost breakdown
- `get_unused_resources` - Identify waste
- `estimate_deployment_cost` - Pre-deployment estimates
- `get_cost_anomalies` - Anomaly detection
- `get_cost_allocation` - Team/project allocation
- `export_cost_data` - CSV/JSON/Excel export

### 5. Observability Tools (15 tools)

Monitoring and observability:

- `get_metrics` - CPU, memory, requests, errors, latency
- `get_logs` - Log retrieval with filtering
- `get_traces` - Distributed tracing
- `create_alert` - Multi-channel alerting
- `get_service_health` - Health status
- `get_dashboard_data` - Dashboard aggregation
- `analyze_performance` - Bottleneck detection
- `get_error_rate` - Error rate analysis
- `get_latency_percentiles` - p50, p95, p99
- `get_service_dependencies` - Dependency mapping
- `get_slo_status` - SLO compliance
- `create_dashboard` - Custom dashboards
- `get_apdex_score` - Application performance index
- `analyze_anomalies` - ML-based anomaly detection
- `get_capacity_forecast` - Capacity planning

### 6. Testing Tools (10 tools)

Automated testing:

- `run_tests` - Unit, integration, e2e, performance, security
- `get_test_results` - Detailed test results
- `get_code_coverage` - Coverage metrics
- `run_load_test` - Load and stress testing
- `run_security_tests` - Security testing (SQL injection, XSS)
- `validate_api_contract` - OpenAPI/Swagger validation
- `generate_test_data` - Test data generation
- `run_smoke_tests` - Quick smoke tests
- `run_regression_tests` - Regression testing
- `run_accessibility_tests` - WCAG compliance

### 7. Release Management Tools (10 tools)

Release orchestration:

- `create_release` - Create releases with approval workflows
- `get_release_status` - Release progress monitoring
- `approve_release` - Release approval
- `rollback_release` - Release rollback
- `get_release_history` - Release history
- `promote_release` - Environment promotion
- `schedule_release` - Scheduled releases
- `cancel_release` - Release cancellation
- `get_release_notes` - Auto-generated release notes
- `validate_release` - Pre-release validation

### 8. Architecture Tools (10 tools)

Architecture validation and analysis:

- `validate_architecture` - Rule-based validation
- `analyze_dependencies` - Dependency analysis
- `check_coupling` - Coupling measurement
- `generate_architecture_diagram` - Mermaid/PlantUML/SVG
- `detect_architecture_smells` - Anti-pattern detection
- `validate_layer_boundaries` - Layer boundary validation
- `analyze_code_complexity` - Complexity metrics
- `check_solid_principles` - SOLID compliance
- `detect_circular_dependencies` - Circular dependency detection
- `generate_documentation` - Auto-documentation

## Example Workflows

### Deploy to Production

```typescript
// 1. Run security scan
const scan = await client.runSecurityScan({
  target: 'web-app:v1.2.0',
  scan_type: 'all'
});

if (scan.critical > 0) {
  throw new Error('Critical vulnerabilities found!');
}

// 2. Run tests
const tests = await client.runTests({
  type: 'e2e',
  parallel: true
});

if (tests.failed > 0) {
  throw new Error('Tests failed!');
}

// 3. Create release
const release = await client.createRelease({
  application: 'web-app',
  version: '1.2.0',
  environment: 'prod',
  strategy: 'blue-green',
  approval_required: true
});

// 4. Approve release
await client.approveRelease({
  release_id: release.release_id,
  approver: 'john.doe'
});

// 5. Monitor deployment
const status = await client.getReleaseStatus(release.release_id);
console.log(`Release status: ${status.status}`);
```

### Cost Optimization

```typescript
// 1. Get current costs
const report = await client.getCostReport({
  period: 'monthly',
  cloud: 'aws'
});

console.log(`Current monthly cost: $${report.total_cost}`);

// 2. Find unused resources
const unused = await client.callTool('get_unused_resources', {
  cloud: 'aws',
  days_unused: 30
});

console.log(`Potential savings: $${unused.total_waste}/month`);

// 3. Get optimization recommendations
const optimizations = await client.callTool('optimize_costs', {
  cloud: 'aws',
  strategy: 'moderate'
});

console.log('Optimization opportunities:');
optimizations.opportunities.forEach(opp => {
  console.log(`- ${opp.action}: ${opp.savings}`);
});

// 4. Forecast future costs
const forecast = await client.forecastCosts({
  cloud: 'aws',
  months: 6
});

console.log('6-month forecast:', forecast.predictions);
```

### Infrastructure Provisioning

```typescript
// 1. Validate workflow
const validation = await client.callTool('validate_infrastructure', {
  workflow: `
    workflow:
      name: production-infrastructure
      target_cloud: aws
      region: us-east-1
      resources:
        - type: virtual_network
          name: prod-vpc
          cidr: "10.0.0.0/16"
        - type: kubernetes_cluster
          name: prod-cluster
          version: "1.28"
          node_count: 5
  `
});

if (!validation.valid) {
  throw new Error('Invalid workflow');
}

console.log(`Estimated cost: $${validation.estimated_cost.monthly}/month`);

// 2. Provision infrastructure
const infra = await client.provisionInfrastructure({
  workflow: workflowYaml,
  cloud: 'aws',
  environment: 'prod'
});

console.log(`Workflow ID: ${infra.workflow_id}`);

// 3. Monitor provisioning
let status = await client.getInfrastructureStatus(infra.workflow_id);

while (status.status === 'provisioning') {
  await new Promise(resolve => setTimeout(resolve, 30000));
  status = await client.getInfrastructureStatus(infra.workflow_id);
}

console.log('Infrastructure ready!');
```

## Error Handling

All tools follow a consistent error format:

```json
{
  "error": {
    "code": "TOOL_EXECUTION_ERROR",
    "message": "Invalid arguments for tool deploy_application: version must be semver",
    "tool": "deploy_application"
  }
}
```

Handle errors appropriately:

```typescript
try {
  const result = await client.callTool('deploy_application', args);
} catch (error) {
  console.error(`Tool execution failed: ${error.message}`);
  // Implement retry logic or fallback
}
```

## Best Practices

1. **Always validate** before executing destructive operations
2. **Use confirmation flags** for destroy operations
3. **Monitor async operations** with status polling
4. **Set budget alerts** to prevent cost overruns
5. **Run security scans** before deployments
6. **Test in lower environments** first
7. **Use structured logging** for debugging
8. **Implement retry logic** for transient failures
9. **Cache tool listings** to reduce overhead
10. **Use appropriate timeouts** for long-running operations

## Troubleshooting

### Connection Issues

```bash
# Check if server is running
curl http://localhost:3001/health

# Check server logs
npm run mcp:dev
```

### Tool Not Found

```bash
# List all available tools
npm run mcp:tools

# Search for specific tool
curl http://localhost:3001/tools/search?q=deploy
```

### Validation Errors

All tools use Zod for input validation. Check the error message for specific validation issues:

- UUID format: Must be valid UUID v4
- Semver: Must be `X.Y.Z` format
- Enum values: Must be one of specified values
- Numeric ranges: Must be within specified min/max

## Performance

- Tool listing: <10ms
- Tool execution: Varies by operation (5s - 5min)
- HTTP overhead: ~2-5ms per request
- stdio transport: ~1ms overhead

## Security

- No authentication on stdio (local only)
- HTTP server should be behind authentication
- Secrets are never logged
- Destructive operations require confirmation
- All inputs are validated

## Support

- Documentation: `/docs/MCP-INTEGRATION.md`
- Tool Reference: `/docs/TOOL-REFERENCE.md`
- Examples: `/examples/mcp-client-examples.ts`
- Issues: GitHub Issues

---

**Built with the Model Context Protocol (MCP) by Anthropic**
