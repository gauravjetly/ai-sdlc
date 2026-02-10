# Agent Orchestration - Quick Reference Card

## Installation

```bash
npm install
```

## Basic Usage

```typescript
import { Orchestrator, DeveloperAgent } from './orchestration';

// Create and start
const orchestrator = new Orchestrator();
const agent = new DeveloperAgent();
orchestrator.getAgentRegistry().register(agent);
await orchestrator.start('./config/agent-schedules.yaml');

// Execute agent
const result = await orchestrator.executeAgent('developer-agent', {
  action: 'deploy',
  environment: 'dev'
});

// Execute workflow
const workflow = await orchestrator.executeWorkflow('deploy-feature-end-to-end', {
  application: 'my-app',
  version: '1.0.0'
});

// Stop
await orchestrator.stop();
```

## Core APIs

### Orchestrator

```typescript
await orchestrator.start(configPath?)           // Start system
await orchestrator.stop()                       // Stop system
await orchestrator.executeAgent(id, params)     // Execute agent
await orchestrator.executeWorkflow(id, context) // Execute workflow
await orchestrator.loadSchedules(path)          // Load schedules
await orchestrator.loadWorkflows(dir)           // Load workflows
orchestrator.getState()                         // Get state
await orchestrator.healthCheck()                // Health check
```

### Scheduler

```typescript
scheduler.addJob(name, cron, handler, config)   // Add job
scheduler.removeJob(name)                       // Remove job
scheduler.start()                               // Start scheduler
scheduler.stop()                                // Stop scheduler
scheduler.getExecutionHistory(name?, limit?)    // Get history
scheduler.getJobStats(name)                     // Get statistics
scheduler.listJobs()                            // List all jobs
```

### Event Manager

```typescript
eventManager.registerHandler(type, handler)     // Register handler
eventManager.publishEvent(event)                // Publish event
eventManager.publishEventSync(event)            // Publish sync
eventManager.getEventHistory(type?, limit?)     // Get history
eventManager.listEventTypes()                   // List types

// Pre-defined events
await eventManager.deploymentComplete(id, meta)
await eventManager.deploymentFailed(id, reason)
await eventManager.alertFired(id, severity, msg)
await eventManager.testFailed(id, reason)
await eventManager.vulnerabilityDetected(id, severity)
```

### Workflow Engine

```typescript
workflowEngine.registerWorkflow(workflow)       // Register workflow
workflowEngine.unregisterWorkflow(id)           // Unregister
await workflowEngine.execute(id, context)       // Execute workflow
workflowEngine.getWorkflow(id)                  // Get workflow
workflowEngine.listWorkflows()                  // List workflows
workflowEngine.getExecution(id)                 // Get execution
workflowEngine.listExecutions(workflowId?)      // List executions
await workflowEngine.cancelExecution(id)        // Cancel execution
```

### Agent Registry

```typescript
registry.register(agent)                        // Register agent
registry.unregister(id)                         // Unregister agent
registry.get(id)                                // Get agent
registry.list()                                 // List all agents
registry.listByType(type)                       // List by type
registry.listEnabled()                          // List enabled
await registry.initializeAll()                  // Initialize all
await registry.healthCheckAll()                 // Health check all
```

## Configuration Examples

### Schedule Configuration (YAML)

```yaml
schedules:
  - name: daily-security-scan
    agentId: security-agent
    cron: "0 2 * * *"
    enabled: true
    parameters:
      action: vulnerability_scan
      targets: all
```

### Workflow Configuration (YAML)

```yaml
workflow:
  id: my-workflow
  name: My Workflow
  description: Example workflow

  steps:
    - id: step-1
      name: First Step
      agentId: developer-agent
      action: build
      parameters:
        branch: main
      continueOnFailure: false
      retryPolicy:
        maxAttempts: 3
        backoffMs: 5000
        backoffMultiplier: 2
      timeout: 600000
```

## Cron Expression Format

```
* * * * * *
│ │ │ │ │ └─ day of week (0-7, 0=Sunday)
│ │ │ │ └─── month (1-12)
│ │ │ └───── day of month (1-31)
│ │ └─────── hour (0-23)
│ └───────── minute (0-59)
└─────────── second (0-59, optional)
```

### Common Examples

```
"0 9 * * *"      # 9 AM daily
"0 */2 * * *"    # Every 2 hours
"0 0 * * 0"      # Sunday midnight
"*/15 * * * *"   # Every 15 minutes
"0 9 * * 1-5"    # 9 AM weekdays
"0 2 1 * *"      # 2 AM on 1st of month
```

## Pre-defined Events

| Event Type | Description |
|------------|-------------|
| `deployment.complete` | Deployment finished successfully |
| `deployment.failed` | Deployment failed |
| `alert.fired` | Alert triggered |
| `test.failed` | Test failed |
| `test.passed` | Test passed |
| `security.vulnerability_detected` | Vulnerability found |
| `cost.threshold_exceeded` | Cost threshold exceeded |
| `health.check_failed` | Health check failed |
| `rollback.initiated` | Rollback started |
| `approval.required` | Approval needed |
| `approval.granted` | Approval granted |
| `approval.rejected` | Approval rejected |

## Creating Custom Agent

```typescript
import { BaseAgent } from './orchestration';

export class MyAgent extends BaseAgent {
  constructor() {
    super({
      id: 'my-agent',
      name: 'My Agent',
      description: 'My custom agent',
      type: 'developer',
      capabilities: ['action1', 'action2'],
      enabled: true,
      config: {}
    });
  }

  protected async run(parameters: any): Promise<any> {
    const { action } = parameters;
    // Implement actions
    return { success: true };
  }
}
```

## Testing

```bash
# Run all tests
npm test -- tests/orchestration/

# Run specific test
npm test -- tests/orchestration/scheduler.test.ts

# Run with coverage
npm test -- tests/orchestration/ --coverage

# Run example
npx tsx orchestration/examples/basic-usage.ts
```

## Environment Variables

```bash
LOG_LEVEL=info          # Logging level (debug, info, warn, error)
STATE_DIR=./.state      # State persistence directory
```

## Troubleshooting

### Scheduler Issues
- Check: `scheduler.isRunning()`
- Verify cron expression
- Check job enabled status

### Workflow Issues
- Verify agent registration: `registry.list()`
- Check agent health: `await registry.healthCheckAll()`
- Review step parameters

### Event Issues
- List event types: `eventManager.listEventTypes()`
- Check event spelling
- Use `publishEventSync()` for debugging

## Common Patterns

### Schedule + Event Handler

```typescript
// Schedule a job
scheduler.addJob('check', '*/5 * * * *', async () => {
  const health = await checkHealth();
  if (!health.ok) {
    await eventManager.alertFired('health-alert', 'critical', 'Unhealthy');
  }
});

// Handle the event
eventManager.registerHandler('alert.fired', async (event) => {
  if (event.data.severity === 'critical') {
    await orchestrator.executeWorkflow('incident-response', event.data);
  }
});
```

### Workflow with Context

```typescript
const workflow = {
  id: 'deploy-with-context',
  name: 'Deploy with Context',
  steps: [
    {
      id: 'build',
      agentId: 'developer-agent',
      action: 'build',
      parameters: { branch: 'main' }
    },
    {
      id: 'deploy',
      agentId: 'developer-agent',
      action: 'deploy',
      parameters: {
        environment: 'prod',
        build_id: '{{ context.buildId }}'  // Use previous step output
      }
    }
  ]
};
```

### Error Handling

```typescript
try {
  const result = await orchestrator.executeAgent('agent-id', params);
  if (result.status === 'failed') {
    console.error('Agent failed:', result.error);
    // Handle failure
  }
} catch (error) {
  console.error('Execution error:', error);
  // Handle exception
}
```

## File Locations

```
orchestration/           # Source code
├── engine/             # Core engine
├── agents/             # Agent system
├── state/              # State management
├── types/              # TypeScript types
└── examples/           # Usage examples

config/                  # Configuration
├── agent-schedules.yaml
└── workflows/

tests/orchestration/     # Tests

.orchestration-state/    # State persistence (runtime)
logs/                    # Log files (runtime)
```

## Documentation

- [Complete Guide](./ORCHESTRATION-GUIDE.md) - 1,500+ line comprehensive guide
- [README](./README.md) - Quick start and overview
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md) - Technical details
- [Handoff Checklist](./HANDOFF-CHECKLIST.md) - Completion status

## Support

- Review documentation
- Check logs in `logs/`
- Run health check: `await orchestrator.healthCheck()`
- Check state in `.orchestration-state/`

---

**Version**: 1.0.0 | **Status**: Production Ready ✅
