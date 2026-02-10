# AI Agent Workers

This directory contains the BullMQ worker implementations for all 8 AI agent personas. Each worker performs real operations using actual tools and services - **NO MOCK DATA**.

## Architecture

All workers follow the same pattern:
- Implement `process(job: Job)` method for BullMQ integration
- Use PostgreSQL via Prisma for persistence
- Send real-time updates via WebSocket
- Execute actual system commands and API calls
- Handle errors properly with detailed logging

## Workers Overview

### 1. Security Worker (`security.worker.ts`)

**Agent Type:** `security_agent`

**Capabilities:**
- **Container Scanning:** Uses Trivy to scan Docker images for vulnerabilities
- **Dependency Auditing:** Scans npm, pip, maven dependencies
- **Infrastructure Security:** Uses Checkov to scan Terraform/K8s/CloudFormation
- **Vulnerability Fixes:** Auto-applies security patches where possible
- **Compliance Checks:** Runs SOC2/HIPAA/PCI compliance verification

**Task Types:**
```typescript
- scan_container: { imageUri: string }
- scan_dependencies: { projectPath: string, ecosystem: 'npm' | 'pip' | 'maven' }
- scan_infrastructure: { path: string, framework: 'terraform' | 'kubernetes' | 'cloudformation' }
- fix_vulnerabilities: { projectPath: string, ecosystem: string, autoFix: boolean }
- compliance_check: { framework: 'soc2' | 'hipaa', region: string }
```

**Database:**
- Creates `VulnerabilityScan` and `Vulnerability` records
- Stores scan results with severity counts

**Tools Required:**
- Trivy (container scanning)
- Checkov (IaC scanning)
- AWS CLI (compliance checks)

---

### 2. Developer Worker (`developer.worker.ts`)

**Agent Type:** `developer_agent`

**Capabilities:**
- **Kubernetes Deployments:** Real K8s deployments with rolling updates
- **Test Execution:** Runs unit, integration, E2E tests
- **Container Builds:** Docker image building with BuildKit
- **Deployment Rollbacks:** Kubernetes rollout undo operations
- **Scaling:** Horizontal pod autoscaling

**Task Types:**
```typescript
- deploy_application: {
    application: string,
    version: string,
    environment: 'dev' | 'uat' | 'production',
    namespace?: string,
    imageUri: string,
    replicas?: number,
    containerPort?: number,
    strategy?: 'rolling' | 'recreate'
  }
- run_tests: { projectPath: string, testType: 'unit' | 'integration' | 'e2e', testCommand?: string }
- build_container: { projectPath: string, imageName: string, imageTag?: string, dockerfile?: string }
- rollback_deployment: { deploymentId: string, revision?: number }
- scale_deployment: { deploymentId: string, replicas: number }
```

**Database:**
- Creates and updates `Deployment` records
- Stores deployment status and metadata

**Tools Required:**
- kubectl (Kubernetes CLI)
- Docker (container builds)
- npm/jest/mocha (testing)

---

### 3. SRE Worker (`sre.worker.ts`)

**Agent Type:** `sre_agent`

**Capabilities:**
- **Infrastructure Monitoring:** Real-time cluster and resource health checks
- **Incident Response:** Automated incident handling and diagnostics
- **Health Checks:** Multi-target health verification
- **Auto-Remediation:** Self-healing for common issues
- **Capacity Planning:** Resource utilization forecasting

**Task Types:**
```typescript
- monitor_infrastructure: { resourceType: 'all' | 'kubernetes' | 'database', environment: string }
- incident_response: { incidentType: string, resourceId?: string, severity: 'low' | 'medium' | 'high', autoRemediate?: boolean }
- health_check: { targets: string[], detailed?: boolean }
- auto_remediate: { issue: string, resourceId?: string, action: 'restart_pod' | 'scale_down' | 'clear_cache' }
- capacity_planning: { environment: string, forecastDays?: number }
```

**Database:**
- Queries deployment and resource status
- Updates deployment health metrics

**Tools Required:**
- kubectl (Kubernetes monitoring)
- AWS SDK (CloudWatch, EC2, ECS)

---

### 4. QA Worker (`qa.worker.ts`)

**Agent Type:** `qa_agent`

**Capabilities:**
- **E2E Testing:** Playwright-based browser testing
- **Performance Testing:** k6 load testing
- **Smoke Testing:** Quick health endpoint validation
- **Load Testing:** Stress testing with progressive ramp-up
- **Quality Gates:** Coverage, security, performance thresholds

**Task Types:**
```typescript
- run_e2e_tests: { projectPath: string, baseUrl: string, browser?: 'chromium' | 'firefox' | 'webkit', headless?: boolean }
- performance_test: { url: string, duration?: number, vus?: number }
- smoke_test: { endpoints: Array<{ url: string, method?: string }> }
- load_test: { url: string, targetRPS?: number, duration?: number, rampUpTime?: number }
- quality_gate_check: { projectPath?: string, coverageThreshold?: number, securityThreshold?: number }
```

**Database:**
- Queries vulnerability counts for quality gates

**Tools Required:**
- Playwright (E2E testing)
- k6 (load testing)
- curl (smoke testing)

---

### 5. FinOps Worker (`finops.worker.ts`)

**Agent Type:** `finops_agent`

**Capabilities:**
- **Cost Analysis:** Real cost breakdown and trending
- **Optimization Recommendations:** Right-sizing, lifecycle, unused resources
- **Cost Optimization:** Auto-apply approved optimizations
- **Cost Forecasting:** Linear regression forecasting
- **Tag Compliance:** Resource tagging verification

**Task Types:**
```typescript
- analyze_costs: { startDate?: string, endDate?: string, groupBy?: 'service' | 'environment' }
- generate_recommendations: { environment?: string, minSavings?: number }
- apply_optimization: { recommendationId: string }
- forecast_costs: { horizonDays?: number }
- tag_compliance_check: { requiredTags?: string[] }
```

**Database:**
- Reads `CostRecord` for analysis
- Creates `CostRecommendation` entries
- Queries `CloudResource` for tagging compliance

---

### 6. Release Manager Worker (`release-manager.worker.ts`)

**Agent Type:** `release_manager`

**Capabilities:**
- **Release Creation:** Multi-service release coordination
- **Deployment Coordination:** Sequential service deployments with pauses
- **Release Notes:** Git-based changelog generation
- **Release Approval:** Approval workflow management
- **Release Rollback:** Coordinated multi-service rollback

**Task Types:**
```typescript
- create_release: { version: string, environment: string, services: string[], releaseNotes?: string, scheduledTime?: string }
- coordinate_deployment: { releaseId: string, deploymentOrder: Array<{ name: string, version: string }>, pauseBetweenServices?: number }
- generate_release_notes: { repository: string, fromTag: string, toTag?: string, format?: 'markdown' }
- approve_release: { releaseId: string, approver: string, comments?: string }
- rollback_release: { releaseId: string, reason?: string }
```

**Database:**
- Queries deployment status for validation
- Updates deployment records during rollback

**Tools Required:**
- git (release notes generation)
- kubectl (deployment rollback)

---

### 7. Architect Worker (`architect.worker.ts`)

**Agent Type:** `architect_agent`

**Capabilities:**
- **Design Review:** Project structure and pattern analysis
- **Dependency Analysis:** Circular dependency detection, outdated packages
- **Architecture Diagrams:** Mermaid diagram generation
- **Tech Decision Review:** Pros/cons assessment
- **Scalability Assessment:** Capacity and scaling recommendations

**Task Types:**
```typescript
- design_review: { projectPath: string, focus?: 'all' | 'security' | 'performance' }
- dependency_analysis: { projectPath: string, depth?: number }
- architecture_diagram: { projectPath: string, outputFormat?: 'mermaid' }
- tech_decision: { decision: string, context?: string, alternatives?: string[] }
- scalability_assessment: { environment: string, targetRPS?: number }
```

**Database:**
- Queries deployment metrics for scalability assessment

**Tools Required:**
- npm (dependency analysis)
- madge (circular dependency detection)

---

### 8. Conductor Worker (`conductor.worker.ts`)

**Agent Type:** `conductor_agent`

**Capabilities:**
- **Deployment Orchestration:** Multi-agent deployment workflow
- **Full CI/CD Pipeline:** Build → Scan → Test → Deploy
- **Incident Workflow:** Coordinated incident response across agents
- **Release Workflow:** End-to-end release coordination
- **Compliance Workflow:** Multi-faceted compliance checks

**Task Types:**
```typescript
- orchestrate_deployment: {
    application: string,
    version: string,
    environment: string,
    skipTests?: boolean,
    skipSecurity?: boolean
  }
- full_pipeline: { projectPath: string, application: string, version: string }
- incident_workflow: { incidentType: string, resourceId?: string, severity: string }
- release_workflow: { version: string, services: string[], environment: string }
- compliance_workflow: { framework?: 'soc2' | 'hipaa' }
```

**Special Features:**
- Orchestrates other agents via BullMQ
- Waits for job completion with timeout
- Handles workflow state management
- Provides end-to-end observability

---

## Common Patterns

### Logging
All workers implement structured logging:
```typescript
private async log(executionId: string, message: string, level: string = 'INFO'): Promise<void> {
  // 1. Update database execution logs
  // 2. Send WebSocket real-time update
  // 3. Log to Winston logger
}
```

### Progress Tracking
Workers update job progress throughout execution:
```typescript
job.updateProgress(50); // 50% complete
```

### Error Handling
All workers catch errors and log them:
```typescript
try {
  // Work
} catch (error: any) {
  await this.log(executionId, `Task failed: ${error.message}`, 'ERROR');
  throw error;
}
```

### Database Integration
All workers use Prisma for database operations:
```typescript
await prisma.agentExecution.update({
  where: { id: executionId },
  data: { logs: { push: logEntry } }
});
```

### WebSocket Updates
Real-time updates sent to subscribers:
```typescript
this.websocket.emit(`execution:${executionId}`, 'log', {
  timestamp,
  level,
  message
});
```

## Usage Example

```typescript
import { AgentOrchestrationService } from '../agent-orchestration.service';
import { WebSocketServer } from '../../../infrastructure/websocket/server';
import { SecurityWorker } from './workers';

// Initialize service
const orchestration = new AgentOrchestrationService(websocket);

// Register workers
orchestration.registerWorker(
  'security_agent',
  async (job) => {
    const worker = new SecurityWorker(websocket);
    return worker.process(job);
  }
);

// Queue a task
const execution = await orchestration.queueTask({
  agentId: 'security_agent',
  taskType: 'scan_container',
  taskParams: {
    imageUri: 'myapp:latest'
  },
  priority: 'HIGH'
});

// Monitor execution
const status = await orchestration.getExecutionStatus(execution.executionId);
```

## Testing

Each worker can be tested independently:

```typescript
describe('SecurityWorker', () => {
  it('should scan container and find vulnerabilities', async () => {
    const worker = new SecurityWorker();
    const job = createMockJob({
      executionId: 'test-123',
      taskType: 'scan_container',
      taskParams: { imageUri: 'nginx:latest' }
    });

    const result = await worker.process(job);

    expect(result.summary.total).toBeGreaterThan(0);
    expect(result.scanId).toBeDefined();
  });
});
```

## Deployment

Workers are automatically started by the agent orchestration service:

```typescript
// In server initialization
import Workers from './services/agent/workers';

Object.entries(Workers).forEach(([name, WorkerClass]) => {
  const agentId = name.replace('Worker', '').toLowerCase() + '_agent';
  orchestration.registerWorker(agentId, async (job) => {
    const worker = new WorkerClass(websocket);
    return worker.process(job);
  });
});
```

## Monitoring

All worker executions are tracked in the database:

```sql
SELECT
  agent_id,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM agent_executions
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_id;
```

## Maintenance

### Adding a New Task Type

1. Add task type to worker's `process()` method
2. Implement the task handler method
3. Update task types documentation
4. Add tests for the new task

### Updating an Existing Task

1. Modify the task handler method
2. Update database schema if needed
3. Update tests
4. Document changes

## Performance Considerations

- Workers run in separate processes via BullMQ
- Concurrency: 5 jobs per worker by default
- Rate limiting: 10 jobs per second max
- Job timeout: Configurable per task type
- Retry policy: Exponential backoff (3 attempts)

## Security

- No secrets in code - use environment variables
- All file operations use absolute paths
- Command execution uses promisify(exec) safely
- Database queries use parameterized statements
- WebSocket channels are scoped to execution IDs

## License

Private - Deltek Catalyst Platform
