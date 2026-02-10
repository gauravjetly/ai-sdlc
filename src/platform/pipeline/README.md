# Phase 9: Full Pipeline Automation (Dev→UAT→Prod→DR)

## Overview

Complete multi-stage deployment pipeline with sequential environment promotion, approval gates, smoke testing, and automatic rollback capabilities.

## Features

### 1. **Multi-Stage Deployments**
- **Sequential Progression**: Dev → UAT → Prod → DR
- **Environment-Specific Configuration**: Different replicas, resources, and strategies per environment
- **Strategy Support**: Rolling updates, Blue-Green, Canary deployments
- **State Persistence**: All pipeline state stored in PostgreSQL

### 2. **Approval Gates**
- **Manual Approval**: Required for production and DR deployments
- **Auto-Approval**: Automatic for dev/uat environments
- **Multiple Approvers**: Support for multiple required approvers
- **Timeout Handling**: Automatic expiration after configured timeout
- **Notification System**: Alerts to Slack, email, PagerDuty
- **Audit Trail**: Complete history of all approval decisions

### 3. **Validation & Testing**
- **Pre-Deployment Validation**: Namespace, image, quotas, version format
- **Smoke Tests**: Health checks, HTTP tests, custom tests
- **Progressive Validation**: Tests run after each stage
- **Failure Detection**: Automatic detection of deployment failures
- **Metrics Analysis**: For canary deployments

### 4. **Rollback Capability**
- **Automatic Rollback**: On failure if enabled
- **Stage-Level Rollback**: Each stage can be rolled back independently
- **Previous Version Tracking**: Maintains deployment history
- **Cascading Rollback**: Rollback all stages if one fails

### 5. **Real Kubernetes Integration**
- **Native K8s Operations**: Using @kubernetes/client-node
- **Deployment Management**: Create, update, scale, delete
- **Service Management**: Automatic service creation/updates
- **Status Monitoring**: Real-time deployment status tracking
- **Health Checking**: Readiness and liveness probes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PIPELINE ORCHESTRATION                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pipeline Service                                         │  │
│  │  - Multi-stage execution                                  │  │
│  │  - Sequential progression                                 │  │
│  │  - Smoke testing                                          │  │
│  │  - Rollback management                                    │  │
│  └───────────────┬──────────────────────────────────────────┘  │
│                  │                                              │
│                  ├──────────┬──────────────┐                   │
│                  │          │              │                   │
│    ┌─────────────▼─────┐  ┌▼────────────┐ ┌▼──────────────┐  │
│    │ Promotion Service │  │  Approval   │ │  Kubernetes   │  │
│    │ - Environment     │  │  Service    │ │  Operations   │  │
│    │   promotion       │  │ - Manual    │ │ - Deployments │  │
│    │ - Blue-green      │  │   approval  │ │ - Services    │  │
│    │ - Canary          │  │ - Auto      │ │ - Scaling     │  │
│    │ - Validation      │  │   approval  │ │ - Monitoring  │  │
│    └───────────────────┘  └─────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │
                ┌───────────▼────────────┐
                │   PostgreSQL Database   │
                │  - Deployments          │
                │  - Deployment Logs      │
                │  - Approval Records     │
                │  - Audit Trail          │
                └────────────────────────┘
```

## Core Components

### 1. Pipeline Service (`pipeline.service.ts`)

**Purpose**: Orchestrates multi-stage deployments with sequential progression.

**Key Methods**:
- `executePipeline(config)`: Execute complete pipeline
- `executeStage(config, stage)`: Deploy single stage
- `waitForDeploymentReady()`: Wait for K8s deployment
- `runSmokeTests()`: Execute post-deployment tests
- `rollbackPipeline()`: Rollback failed stages
- `resumePipelineExecution()`: Resume after approval

**Features**:
- Sequential stage execution
- Approval gate handling
- Smoke test execution
- Automatic rollback on failure
- PostgreSQL state tracking

### 2. Promotion Service (`promotion.service.ts`)

**Purpose**: Manages environment promotions with different deployment strategies.

**Key Methods**:
- `promoteToEnvironment(request)`: Promote to target environment
- `validatePromotion(request)`: Pre-deployment validation
- `executeRollingDeployment()`: Rolling update strategy
- `executeBlueGreenDeployment()`: Blue-green strategy
- `executeCanaryDeployment()`: Canary release strategy
- `rollback(request)`: Rollback deployment

**Deployment Strategies**:

1. **Rolling Update**:
   - Gradual replacement of pods
   - MaxSurge: 25%, MaxUnavailable: 25%
   - Zero downtime

2. **Blue-Green**:
   - Deploy new version (green)
   - Switch traffic from blue to green
   - Scale down old version (blue)
   - Instant rollback capability

3. **Canary**:
   - Progressive traffic shifting: 10% → 25% → 50% → 100%
   - Metrics analysis at each step
   - Automatic rollback on threshold breach

### 3. Approval Service (`approval.service.ts`)

**Purpose**: Manages approval workflows for production deployments.

**Key Methods**:
- `createApproval(request)`: Create approval request
- `approve(approvalId, approver)`: Approve request
- `reject(approvalId, approver)`: Reject request
- `getPendingApprovals()`: Get pending approvals
- `getApprovalHistory()`: Get approval audit trail

**Approval Types**:
- `DEPLOYMENT`: New deployment approval
- `PROMOTION`: Environment promotion approval
- `ROLLBACK`: Rollback approval
- `CONFIGURATION_CHANGE`: Config change approval
- `INFRASTRUCTURE_CHANGE`: Infrastructure change approval

**Auto-Approval Rules**:
- Dev: Always auto-approved
- UAT: Always auto-approved
- Production: Manual approval required
- DR: Manual approval required

## Usage Examples

### Basic Pipeline Execution

```typescript
import { PipelineService, PipelineConfig, Environment } from './pipeline';

const pipelineService = new PipelineService();

const config: PipelineConfig = {
  name: 'api-service-pipeline',
  application: 'api-service',
  version: 'v1.2.3',
  imageUri: 'ecr.io/api-service:v1.2.3',
  rollbackOnFailure: true,
  stages: [
    {
      name: 'Development',
      environment: Environment.dev,
      cloud: 'aws',
      clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/dev',
      namespace: 'api-service-dev',
      requiresApproval: false,
      autoPromotion: true,
      deploymentConfig: {
        replicas: 2,
        strategy: 'rolling',
        cpuRequest: '100m',
        memoryRequest: '128Mi'
      },
      smokeTests: [
        { name: 'health-check', type: 'health', timeout: 30 }
      ]
    }
    // ... more stages
  ]
};

const execution = await pipelineService.executePipeline(config);
console.log('Pipeline Status:', execution.status);
```

### Environment Promotion with Validation

```typescript
import { PromotionService } from './pipeline';

const promotionService = new PromotionService();

const result = await promotionService.promoteToEnvironment({
  application: 'api-service',
  version: 'v1.2.3',
  fromEnvironment: 'uat',
  toEnvironment: Environment.production,
  imageUri: 'ecr.io/api-service:v1.2.3',
  replicas: 5,
  strategy: 'canary',
  namespace: 'api-service-prod',
  clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/prod'
});

if (result.success) {
  console.log('Promotion successful:', result.deploymentId);
  console.log('Rollback available:', result.rollbackAvailable);
}
```

### Manual Approval Workflow

```typescript
import { ApprovalService, ApprovalType } from './pipeline';

const approvalService = new ApprovalService();

// Create approval request
const approval = await approvalService.createApproval({
  type: ApprovalType.PROMOTION,
  title: 'Promote to Production',
  description: 'Deploy v1.2.3 to production',
  requestedBy: 'release.manager@company.com',
  approvers: ['tech-lead@company.com', 'platform-owner@company.com'],
  metadata: {
    application: 'api-service',
    version: 'v1.2.3',
    environment: 'production',
    risk: 'high'
  },
  timeout: 4 * 60 * 60 // 4 hours
});

// Listen to approval events
approvalService.on('approval:approved', (approval) => {
  console.log('Approved by:', approval.approvedBy);
  // Resume pipeline execution
});

// Make approval decision
await approvalService.approve(
  approval.id,
  'tech-lead@company.com',
  'Approved after successful testing'
);
```

### Canary Deployment with Analysis

```typescript
import { PromotionService } from './pipeline';

const promotionService = new PromotionService();

// Canary deployment automatically:
// 1. Deploys canary version
// 2. Shifts traffic: 10% → 25% → 50% → 100%
// 3. Analyzes metrics at each step
// 4. Rolls back if metrics exceed thresholds
// 5. Promotes canary to stable when complete

const result = await promotionService.promoteToEnvironment({
  application: 'api-service',
  version: 'v1.2.3',
  fromEnvironment: 'uat',
  toEnvironment: Environment.production,
  imageUri: 'ecr.io/api-service:v1.2.3',
  replicas: 10,
  strategy: 'canary', // Use canary strategy
  namespace: 'api-service-prod',
  clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/prod'
});
```

## Complete Integration Example

Run the complete demo:

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform
npx tsx pipeline/pipeline-integration-example.ts
```

This demonstrates:
- Complete Dev → UAT → Prod → DR pipeline
- Approval gates at production and DR
- Smoke tests after each deployment
- Automatic rollback on failure
- Real-time status updates

## Database Schema

Pipeline state is stored in PostgreSQL:

```sql
-- Deployments table
CREATE TABLE deployments (
  id                  UUID PRIMARY KEY,
  name                TEXT NOT NULL,
  application         TEXT NOT NULL,
  version             TEXT NOT NULL,
  environment         TEXT NOT NULL,
  cloud               TEXT NOT NULL,
  cluster_arn         TEXT NOT NULL,
  namespace           TEXT NOT NULL,
  status              TEXT NOT NULL,
  status_message      TEXT,
  strategy            TEXT NOT NULL,
  replicas            INTEGER NOT NULL,
  k8s_deployment_name TEXT NOT NULL,
  image_registry      TEXT NOT NULL,
  created_at          TIMESTAMP DEFAULT NOW(),
  started_at          TIMESTAMP,
  completed_at        TIMESTAMP
);

-- Deployment logs table
CREATE TABLE deployment_logs (
  id            UUID PRIMARY KEY,
  deployment_id UUID REFERENCES deployments(id),
  timestamp     TIMESTAMP DEFAULT NOW(),
  level         TEXT NOT NULL,
  message       TEXT NOT NULL,
  metadata      JSONB
);
```

## Smoke Tests

### Health Check Test
```typescript
{
  name: 'health-check',
  type: 'health',
  timeout: 30
}
```
Verifies deployment is running and healthy in Kubernetes.

### HTTP Test
```typescript
{
  name: 'api-endpoint-test',
  type: 'http',
  endpoint: '/api/v1/status',
  expectedStatus: 200,
  timeout: 60
}
```
Makes HTTP request to service endpoint.

### Custom Test
```typescript
{
  name: 'integration-test',
  type: 'custom',
  timeout: 120
}
```
Runs custom validation logic.

## Rollback Scenarios

### Automatic Rollback

Triggered when:
- Deployment fails to become ready
- Smoke tests fail
- Canary metrics exceed thresholds

```typescript
const config: PipelineConfig = {
  rollbackOnFailure: true, // Enable automatic rollback
  // ... other config
};
```

### Manual Rollback

```typescript
import { PromotionService } from './pipeline';

const promotionService = new PromotionService();

await promotionService.rollback({
  deploymentId: 'deploy-123',
  namespace: 'api-service-prod',
  deploymentName: 'api-service-production'
});
```

## Monitoring & Observability

All operations are logged with:
- Trace IDs for correlation
- Structured logging (JSON)
- Database persistence
- Event emission for external integrations

```typescript
// Subscribe to pipeline events
pipelineService.on('stage:completed', (stage) => {
  console.log('Stage completed:', stage.name);
});

// Subscribe to approval events
approvalService.on('approval:approved', (approval) => {
  console.log('Approved by:', approval.approvedBy);
});
```

## Quality Standards

### Test Coverage
- Unit tests: >80% coverage target
- Integration tests: Critical paths covered
- E2E tests: Complete pipeline flows

### Code Quality
- SOLID principles applied
- Strong typing (TypeScript strict mode)
- Error handling: All paths covered
- Logging: Comprehensive structured logging
- No hardcoded secrets or configuration

### Security
- Kubernetes RBAC enforcement
- Approval audit trail
- No secrets in logs
- Secure credential management

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/platform"

# Kubernetes
KUBECONFIG="/path/to/kubeconfig"

# Notifications (optional)
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
EMAIL_SMTP_HOST="smtp.company.com"
PAGERDUTY_API_KEY="..."
```

### Approval Rules

Customize approval requirements:

```typescript
// Custom approver determination
ApprovalService.getRequiredApprovers = (environment, risk) => {
  if (environment === 'production' && risk === 'critical') {
    return ['tech-lead', 'platform-owner', 'cto', 'security-lead'];
  }
  // ... other rules
};
```

## Error Handling

All services implement comprehensive error handling:

```typescript
try {
  const execution = await pipelineService.executePipeline(config);
} catch (error) {
  logger.error('Pipeline failed', { error });

  // Error details available in execution object
  if (execution.error) {
    console.error('Error:', execution.error);
  }

  // Check which stage failed
  const failedStage = execution.stages.find(s => s.status === 'failed');
  if (failedStage) {
    console.error('Failed stage:', failedStage.stageName);
  }
}
```

## Performance Considerations

- **Parallel Operations**: Independent stages can run in parallel
- **Timeout Management**: Configurable timeouts prevent hanging
- **Resource Limits**: Kubernetes resource quotas enforced
- **Database Connection Pooling**: Prisma connection pooling
- **Event-Driven**: Non-blocking event-driven architecture

## Future Enhancements

1. **Multi-Cluster Support**: Deploy to multiple clusters simultaneously
2. **Advanced Canary Analysis**: Integrate with Prometheus/Grafana
3. **Cost Estimation**: Calculate deployment costs before execution
4. **Compliance Checks**: Automated compliance validation
5. **ChatOps Integration**: Slack/Teams approval workflows
6. **GitOps Integration**: ArgoCD/Flux synchronization
7. **Progressive Delivery**: Flagger integration for advanced canary

## Troubleshooting

### Pipeline Stuck in "deploying" Status

**Cause**: Kubernetes deployment not becoming ready
**Solution**: Check pod logs, events, resource quotas

```bash
kubectl logs -n <namespace> <pod-name>
kubectl describe deployment -n <namespace> <deployment-name>
kubectl get events -n <namespace>
```

### Approval Timeout

**Cause**: Approval not received within timeout period
**Solution**: Increase timeout or enable auto-approval for non-prod

```typescript
const approval = await approvalService.createApproval({
  timeout: 8 * 60 * 60, // Increase to 8 hours
  // ... other config
});
```

### Rollback Failed

**Cause**: Previous version not available
**Solution**: Ensure rollbackAvailable is true before attempting

```typescript
if (result.rollbackAvailable) {
  await promotionService.rollback(request);
}
```

## Support

For issues or questions:
- Check logs: `/Users/gauravjetly/aisdlc-2.1.0/src/platform/logs/`
- Review database: PostgreSQL `deployments` and `deployment_logs` tables
- Enable debug logging: `LOG_LEVEL=debug`

## Summary

Phase 9 implementation provides:

✅ Sequential multi-stage deployments (Dev→UAT→Prod→DR)
✅ Approval gates with manual/auto approval
✅ Smoke tests after each deployment
✅ Automatic rollback on failure
✅ Multiple deployment strategies (rolling, blue-green, canary)
✅ Real Kubernetes operations
✅ PostgreSQL state persistence
✅ Complete audit trail
✅ Event-driven architecture
✅ Production-grade error handling

**Next Step**: Use the security-agent subagent to review security and deploy.
