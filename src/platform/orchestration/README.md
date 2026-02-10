# Agent Orchestration System

Production-ready orchestration engine for coordinating AI agents with scheduling, event-driven triggers, and multi-agent workflows.

## Features

- **Cron-based Scheduling**: Automate agent execution with flexible cron expressions
- **Event-Driven Triggers**: React to platform events in real-time
- **Multi-Agent Workflows**: Orchestrate complex workflows across multiple agents
- **Retry Logic**: Built-in retry with exponential backoff
- **State Management**: Track and persist all executions
- **Health Monitoring**: Comprehensive health checks
- **Execution History**: Detailed logs and statistics

## Quick Start

```typescript
import { Orchestrator, DeveloperAgent } from './orchestration';

// Create orchestrator
const orchestrator = new Orchestrator();

// Register agents
const devAgent = new DeveloperAgent();
await devAgent.initialize();
orchestrator.getAgentRegistry().register(devAgent);

// Start with configuration
await orchestrator.start('./config/agent-schedules.yaml');

// Execute agent directly
const result = await orchestrator.executeAgent('developer-agent', {
  action: 'deploy',
  environment: 'dev'
});

console.log('Result:', result);

// Stop orchestrator
await orchestrator.stop();
```

## Architecture

```
Orchestrator
├── Scheduler (Cron-based scheduling)
├── EventManager (Event-driven triggers)
├── WorkflowEngine (Multi-agent workflows)
└── AgentRegistry (Agent management)
```

## Documentation

- [Complete Guide](./ORCHESTRATION-GUIDE.md) - Comprehensive documentation
- [Workflow Examples](../../config/workflows/) - Example workflow definitions
- [Agent Development](./ORCHESTRATION-GUIDE.md#agent-development) - Create custom agents

## Example: Schedule Configuration

```yaml
# config/agent-schedules.yaml
schedules:
  - name: daily-security-scan
    agentId: security-agent
    cron: "0 2 * * *"  # 2 AM daily
    enabled: true
    parameters:
      action: vulnerability_scan
      targets: all

  - name: hourly-health-check
    agentId: sre-agent
    cron: "0 * * * *"  # Every hour
    enabled: true
    parameters:
      action: health_check
```

## Example: Workflow Definition

```yaml
# config/workflows/deploy-to-prod.yaml
workflow:
  id: deploy-to-prod
  name: Deploy to Production
  description: Full production deployment pipeline

  steps:
    - id: build
      name: Build Application
      agentId: developer-agent
      action: build
      parameters:
        branch: main
      retryPolicy:
        maxAttempts: 3
        backoffMs: 5000

    - id: test
      name: Run Tests
      agentId: qa-agent
      action: run_tests
      parameters:
        test_suite: all

    - id: deploy
      name: Deploy to Production
      agentId: sre-agent
      action: deploy
      parameters:
        environment: prod
        strategy: blue-green
```

## Example: Event-Driven Triggers

```typescript
const eventManager = orchestrator.getEventManager();

// Handle deployment failures
eventManager.registerHandler('deployment.failed', async (event) => {
  // Trigger rollback workflow
  await orchestrator.executeWorkflow('rollback', event.data);
});

// Publish event
await eventManager.deploymentFailed('deploy-123', 'Health check failed');
```

## Example: Custom Agent

```typescript
import { BaseAgent } from './orchestration';

export class MyAgent extends BaseAgent {
  constructor() {
    super({
      id: 'my-agent',
      name: 'My Custom Agent',
      description: 'Does custom operations',
      type: 'developer',
      capabilities: ['action1', 'action2'],
      enabled: true,
      config: {}
    });
  }

  protected async run(parameters: any): Promise<any> {
    const { action } = parameters;

    switch (action) {
      case 'action1':
        return { success: true };
      case 'action2':
        return { success: true };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
```

## Testing

```bash
# Run all orchestration tests
npm test -- tests/orchestration/

# Run specific test file
npm test -- tests/orchestration/scheduler.test.ts

# Run with coverage
npm test -- tests/orchestration/ --coverage
```

## Configuration

### Environment Variables

```bash
LOG_LEVEL=info          # Logging level (debug, info, warn, error)
STATE_DIR=./.state      # Directory for state persistence
```

### Scheduler Configuration

Cron expression format:
```
* * * * * *
│ │ │ │ │ └─ day of week (0-7)
│ │ │ │ └─── month (1-12)
│ │ │ └───── day of month (1-31)
│ │ └─────── hour (0-23)
│ └───────── minute (0-59)
└─────────── second (0-59, optional)
```

## API Reference

### Orchestrator

```typescript
class Orchestrator {
  async start(configPath?: string): Promise<void>
  async stop(): Promise<void>
  async executeAgent(agentId: string, parameters: any): Promise<AgentExecution>
  async executeWorkflow(workflowId: string, context: any): Promise<WorkflowExecution>
  async loadSchedules(configPath: string): Promise<void>
  async loadWorkflows(workflowsDir: string): Promise<void>
  getState(): OrchestratorState
  async healthCheck(): Promise<HealthCheckResult>
  getScheduler(): Scheduler
  getEventManager(): EventManager
  getWorkflowEngine(): WorkflowEngine
  getAgentRegistry(): AgentRegistry
}
```

### Scheduler

```typescript
class Scheduler {
  addJob(name: string, cron: string, handler: () => Promise<void>): void
  removeJob(name: string): void
  enableJob(name: string): void
  disableJob(name: string): void
  start(): void
  stop(): void
  getExecutionHistory(jobName?: string, limit?: number): JobExecution[]
  getJobStats(jobName: string): JobStatistics
  listJobs(): ScheduledJob[]
  isRunning(): boolean
}
```

### EventManager

```typescript
class EventManager {
  registerHandler(eventType: string, handler: EventHandler): void
  unregisterHandler(eventType: string, handler: EventHandler): void
  async publishEvent(event: PlatformEvent): Promise<void>
  async publishEventSync(event: PlatformEvent): Promise<void>
  getEventHistory(eventType?: string, limit?: number): PlatformEvent[]
  listEventTypes(): string[]

  // Pre-defined event methods
  async deploymentComplete(deploymentId: string, metadata: any): Promise<void>
  async deploymentFailed(deploymentId: string, reason: string): Promise<void>
  async alertFired(alertId: string, severity: string, message: string): Promise<void>
  // ... more pre-defined events
}
```

### WorkflowEngine

```typescript
class WorkflowEngine {
  registerWorkflow(workflow: Workflow): void
  unregisterWorkflow(workflowId: string): void
  async execute(workflowId: string, context: any): Promise<WorkflowExecution>
  getWorkflow(workflowId: string): Workflow | undefined
  listWorkflows(): Workflow[]
  getExecution(executionId: string): WorkflowExecution | undefined
  listExecutions(workflowId?: string, limit?: number): WorkflowExecution[]
  async cancelExecution(executionId: string): Promise<boolean>
}
```

## Best Practices

1. **Agent Design**: Keep agents focused on single responsibilities
2. **Workflow Steps**: Break workflows into small, testable steps
3. **Retry Logic**: Add retry policies for flaky operations
4. **Error Handling**: Handle all error cases explicitly
5. **Logging**: Log important operations for debugging
6. **Health Checks**: Implement meaningful health checks
7. **State Management**: Regularly clean up old execution state
8. **Monitoring**: Monitor orchestrator and agent health

## Troubleshooting

### Scheduler not executing jobs

- Check if scheduler is running: `scheduler.isRunning()`
- Verify cron expression
- Check if job is enabled
- Review logs for errors

### Workflow steps failing

- Verify agent registration
- Check agent health
- Review step parameters
- Check timeout settings

### Events not triggering

- Verify handler registration
- Check event type spelling
- Use `publishEventSync()` for debugging

## Support

For issues and questions:
- Create an issue in the repository
- Contact the platform team
- Check the [Complete Guide](./ORCHESTRATION-GUIDE.md)

## License

ISC
