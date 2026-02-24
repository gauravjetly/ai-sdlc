# ADR-021: No Mock Data Policy

## Status

**ACCEPTED** - 2026-01-30

## Context

The current Vintiq Catalyst platform implementation contains significant amounts of mock data and placeholder implementations:

### Current Problems

1. **DeploymentWizard.tsx**
   - Uses `setTimeout()` to simulate deployment progress
   - Shows fake progress percentages
   - No actual Kubernetes deployment occurs

2. **CloudResources.tsx**
   - Contains `mockResources` array with hardcoded VPCs and clusters
   - "Create" buttons don't actually create anything
   - No AWS/OCI API integration

3. **AgentControl.tsx**
   - Contains `mockLogs` array with fake log entries
   - "Run Now" button doesn't execute anything
   - No actual agent task processing

4. **CostOptimization.tsx**
   - Contains `costData` array with static numbers
   - Contains `recommendations` array with fake savings
   - "Apply" button shows alert but does nothing

5. **SecurityCenter.tsx**
   - Contains `vulnerabilities` array with hardcoded CVEs
   - Contains `complianceChecks` array with fake statuses
   - Scan button just shows a progress bar

6. **deployment.controller.ts**
   - Uses in-memory `Map<string, DeploymentResponse>` instead of database
   - Returns mock logs, metrics, and events
   - Data is lost on server restart

### User Requirements

The user has explicitly requested:
- Every service must have real implementations
- No fake data in responses
- No placeholder implementations
- No simulated services
- Clear execution paths for all operations

## Decision

We will adopt a **NO MOCK DATA POLICY** for the Vintiq Catalyst platform. This means:

### Absolute Rules

1. **All API responses must contain real data** from actual sources (databases, cloud APIs, Kubernetes clusters)

2. **All operations must perform real actions** (actual deployments, actual resource creation, actual scans)

3. **All progress indicators must reflect real progress** from actual operations

4. **All logs must be real logs** from actual processes

5. **All costs must be real costs** from actual billing APIs

6. **All vulnerabilities must be real vulnerabilities** from actual security scanners

### Implementation Approach

| Service | Real Implementation |
|---------|---------------------|
| Deployments | Kubernetes client (@kubernetes/client-node) |
| Cloud Resources | AWS SDK v3, OCI SDK |
| Agent Execution | BullMQ job queue with real task processors |
| Cost Analysis | AWS Cost Explorer API |
| Security Scans | Trivy, Checkov, npm audit |
| Data Persistence | PostgreSQL database |
| Real-time Updates | WebSocket server with live data |

### Forbidden Patterns

```typescript
// FORBIDDEN: Hardcoded arrays
const mockResources = [
  { name: 'fake-vpc', status: 'Active' } // NO!
];

// FORBIDDEN: Simulated delays
setTimeout(() => {
  setProgress(prev => prev + 10); // NO!
}, 300);

// FORBIDDEN: Static numbers
const costs = {
  total: 15234.56, // NO! Must come from Cost Explorer
};

// FORBIDDEN: Fake logs
const mockLogs = [
  '[2024-01-30] Agent started...' // NO!
];

// FORBIDDEN: In-memory storage
const deployments = new Map(); // NO! Use database
```

### Required Patterns

```typescript
// REQUIRED: Real API calls
const vpc = await ec2.send(new CreateVpcCommand({
  CidrBlock: config.cidrBlock,
}));

// REQUIRED: Real database queries
const result = await db.query(
  'SELECT * FROM deployments WHERE id = $1',
  [deploymentId]
);

// REQUIRED: Real external tool execution
const { stdout } = await execAsync(
  `trivy image --format json ${imageUri}`
);

// REQUIRED: Real cloud API data
const costs = await costExplorer.send(new GetCostAndUsageCommand({
  TimePeriod: { Start: startDate, End: endDate },
}));
```

## Consequences

### Positive Consequences

1. **Production-Ready from Day One**
   - Platform works exactly as it will in production
   - No surprises when deploying to real environments
   - Confidence in all functionality

2. **Real Testing**
   - Integration tests verify actual behavior
   - E2E tests prove real workflows
   - No "it works with mocks" false confidence

3. **Accurate Demonstrations**
   - Sales demos show real capabilities
   - Customer pilots use real data
   - No "this is just a simulation" disclaimers

4. **Proper Error Handling**
   - Real errors from real systems
   - Actual failure modes discovered early
   - Resilience tested with real scenarios

5. **Accurate Performance**
   - Real latencies measured
   - Real throughput tested
   - No optimistic mock timings

### Negative Consequences

1. **Increased Complexity**
   - Must set up real infrastructure for development
   - Need actual cloud accounts with credentials
   - Requires more setup time

2. **Cost Implications**
   - Real AWS/OCI resources cost money
   - Need test accounts with budgets
   - Development environments incur costs

3. **Slower Development**
   - Can't just mock a quick prototype
   - Must implement full integration
   - More code to write per feature

4. **External Dependencies**
   - Requires network connectivity
   - Cloud services must be available
   - Third-party tools must be installed

### Mitigation Strategies

1. **Development Clusters**
   - Use small, cost-optimized development K8s clusters
   - Share clusters across team
   - Auto-scale to zero when not in use

2. **Test Accounts**
   - Use AWS/OCI free tier where possible
   - Set budget alerts
   - Clean up test resources automatically

3. **Local Development Mode**
   - Use local Kubernetes (minikube, kind)
   - Use localstack for AWS services in development
   - Still real, just local

4. **Feature Flags**
   - Disable expensive operations in non-prod
   - Skip compliance checks in development
   - Use smaller resource sizes in test

## Compliance

### How to Verify Compliance

1. **Code Review Checklist**
   - [ ] No hardcoded data arrays
   - [ ] No setTimeout for fake progress
   - [ ] No in-memory Maps for storage
   - [ ] All external calls use real SDKs
   - [ ] Database queries for all reads
   - [ ] Database writes for all mutations

2. **Automated Checks**
   ```bash
   # Check for mock patterns
   grep -r "mockResources" src/
   grep -r "mockLogs" src/
   grep -r "setTimeout.*setProgress" src/
   grep -r "new Map<string" src/services/
   ```

3. **Integration Test Coverage**
   - All services must have integration tests
   - Tests must run against real (test) infrastructure
   - No mocking of external services in integration tests

## Related Documents

- [REAL-SERVICES-ARCHITECTURE.md](./REAL-SERVICES-ARCHITECTURE.md) - Complete architecture
- [EXECUTION-GUIDE.md](./EXECUTION-GUIDE.md) - How to execute each service
- [INFRASTRUCTURE-REQUIREMENTS.md](./INFRASTRUCTURE-REQUIREMENTS.md) - Required infrastructure

## Decision Makers

- **Architect**: Jets (Architect Agent)
- **Approved By**: User requirement
- **Date**: 2026-01-30

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-30 | Initial decision | Jets |
