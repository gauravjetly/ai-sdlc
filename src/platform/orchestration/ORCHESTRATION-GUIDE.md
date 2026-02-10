# Agent Orchestration System - Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Components](#core-components)
5. [Agent Development](#agent-development)
6. [Workflow Creation](#workflow-creation)
7. [Scheduling](#scheduling)
8. [Event-Driven Triggers](#event-driven-triggers)
9. [State Management](#state-management)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Agent Orchestration System is a production-ready framework for coordinating AI agents, managing workflows, and automating DevOps operations.

### Key Features

- **Cron-based Scheduling**: Schedule agent executions using cron expressions
- **Event-Driven Triggers**: React to platform events automatically
- **Multi-Agent Workflows**: Orchestrate complex workflows across multiple agents
- **Retry Logic**: Built-in retry with exponential backoff
- **State Management**: Track and persist execution state
- **Health Monitoring**: Comprehensive health checks for all components
- **Execution History**: Track all executions with detailed logs

### Supported Agents

- **Developer Agent**: Deployments, builds, rollbacks
- **SRE Agent**: Health checks, monitoring, incident response
- **Security Agent**: Vulnerability scans, compliance audits
- **QA Agent**: Test execution, validation
- **FinOps Agent**: Cost analysis, optimization
- **Release Manager**: Release planning, approvals
- **Architect Agent**: Architecture validation
- **BA Agent**: Requirements analysis
- **Customer Support Agent**: Ticket analysis, notifications

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Orchestrator (Main Engine)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌───────────────┐          │
│  │  Scheduler   │  │ Event Manager │          │
│  │  (Cron-based)│  │ (Event-driven)│          │
│  └──────────────┘  └───────────────┘          │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         Workflow Engine                  │  │
│  │  (Multi-agent workflow execution)        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         Agent Registry                   │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │  │
│  │  │Dev │ │SRE │ │QA  │ │Sec │ │... │    │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Quick Start

### Installation

```bash
cd /path/to/platform
npm install
```

### Basic Usage

```typescript
import { Orchestrator, DeveloperAgent } from './orchestration';

// Create orchestrator
const orchestrator = new Orchestrator();

// Register agents
const devAgent = new DeveloperAgent();
orchestrator.getAgentRegistry().register(devAgent);

// Start orchestrator
await orchestrator.start();

// Execute agent
const result = await orchestrator.executeAgent('developer-agent', {
  action: 'deploy',
  environment: 'dev'
});

console.log('Deployment result:', result);

// Stop orchestrator
await orchestrator.stop();
```

### With Configuration

```typescript
// Start with schedule configuration
await orchestrator.start('./config/agent-schedules.yaml');

// Load workflows
await orchestrator.loadWorkflows('./config/workflows');
```

---

## Core Components

### 1. Orchestrator

The main coordination engine that manages all sub-components.

```typescript
const orchestrator = new Orchestrator();

// Start with configuration
await orchestrator.start('./config/agent-schedules.yaml');

// Execute agent
const execution = await orchestrator.executeAgent('agent-id', parameters);

// Execute workflow
const workflowExecution = await orchestrator.executeWorkflow('workflow-id', context);

// Get state
const state = orchestrator.getState();

// Health check
const health = await orchestrator.healthCheck();

// Stop
await orchestrator.stop();
```

### 2. Scheduler

Cron-based job scheduler for automated agent execution.

```typescript
const scheduler = orchestrator.getScheduler();

// Add scheduled job
scheduler.addJob(
  'daily-health-check',
  '0 8 * * *',  // 8 AM daily
  async () => {
    await orchestrator.executeAgent('sre-agent', {
      action: 'health_check'
    });
  }
);

// Start scheduler
scheduler.start();

// Get execution history
const history = scheduler.getExecutionHistory('daily-health-check');

// Get job statistics
const stats = scheduler.getJobStats('daily-health-check');

// Stop scheduler
scheduler.stop();
```

### 3. Event Manager

Event-driven trigger system for reactive operations.

```typescript
const eventManager = orchestrator.getEventManager();

// Register event handler
eventManager.registerHandler('deployment.failed', async (event) => {
  console.log('Deployment failed:', event.data);

  // Trigger rollback workflow
  await orchestrator.executeWorkflow('rollback', event.data);
});

// Publish event
await eventManager.deploymentFailed('deploy-123', 'Health check failed');

// Custom event
await eventManager.publishEvent({
  type: 'custom.event',
  timestamp: new Date(),
  data: { key: 'value' }
});

// Get event history
const events = eventManager.getEventHistory('deployment.failed', 10);
```

### 4. Workflow Engine

Multi-agent workflow orchestration with retry logic and state management.

```typescript
const workflowEngine = orchestrator.getWorkflowEngine();

// Define workflow
const workflow = {
  id: 'deploy-to-prod',
  name: 'Deploy to Production',
  description: 'Full production deployment pipeline',
  steps: [
    {
      id: 'build',
      name: 'Build Application',
      agentId: 'developer-agent',
      action: 'build',
      parameters: { branch: 'main' },
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 5000
      }
    },
    {
      id: 'test',
      name: 'Run Tests',
      agentId: 'qa-agent',
      action: 'run_tests',
      parameters: { test_suite: 'all' },
      continueOnFailure: false
    },
    {
      id: 'deploy',
      name: 'Deploy',
      agentId: 'sre-agent',
      action: 'deploy',
      parameters: {
        environment: 'prod',
        strategy: 'blue-green'
      },
      timeout: 600000  // 10 minutes
    }
  ]
};

// Register workflow
workflowEngine.registerWorkflow(workflow);

// Execute workflow
const execution = await workflowEngine.execute('deploy-to-prod', {
  application: 'my-app',
  version: '1.0.0'
});

// Check execution status
console.log('Status:', execution.status);
console.log('Steps completed:', execution.steps.filter(s => s.status === 'completed').length);

// List executions
const executions = workflowEngine.listExecutions('deploy-to-prod', 10);
```

### 5. Agent Registry

Centralized registry for all agents.

```typescript
const registry = orchestrator.getAgentRegistry();

// Register agent
registry.register(new DeveloperAgent());

// Get agent
const agent = registry.get('developer-agent');

// List all agents
const allAgents = registry.list();

// List by type
const sreAgents = registry.listByType('sre');

// Health check all agents
const healthResults = await registry.healthCheckAll();

// Initialize all agents
await registry.initializeAll();
```

---

## Agent Development

### Creating a Custom Agent

```typescript
import { BaseAgent } from './orchestration';
import { AgentConfig, AgentType } from './orchestration/types';

export class MyCustomAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'my-custom-agent',
      name: 'My Custom Agent',
      description: 'Does custom operations',
      type: AgentType.DEVELOPER,
      capabilities: ['action1', 'action2'],
      enabled: true,
      config: {
        apiKey: process.env.MY_API_KEY
      }
    };

    super(config);
  }

  // Initialize agent (optional)
  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing custom agent...');
    // Connect to external services, load models, etc.
  }

  // Health check (optional)
  protected async onHealthCheck(): Promise<void> {
    // Check connectivity, validate credentials, etc.
  }

  // Validate parameters (optional)
  protected validateParameters(parameters: any): void {
    if (!parameters.action) {
      throw new Error('Action is required');
    }
  }

  // Main execution logic (required)
  protected async run(parameters: any): Promise<any> {
    const { action } = parameters;

    this.logger.info(`Executing action: ${action}`);

    switch (action) {
      case 'action1':
        return await this.performAction1(parameters);

      case 'action2':
        return await this.performAction2(parameters);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async performAction1(params: any): Promise<any> {
    // Implementation
    return { success: true, data: {} };
  }

  private async performAction2(params: any): Promise<any> {
    // Implementation
    return { success: true, data: {} };
  }
}
```

### Registering Your Agent

```typescript
const agent = new MyCustomAgent();
await agent.initialize();
orchestrator.getAgentRegistry().register(agent);
```

---

## Workflow Creation

### Workflow Definition

Create a workflow YAML file:

```yaml
# config/workflows/my-workflow.yaml
workflow:
  id: my-custom-workflow
  name: My Custom Workflow
  description: Custom multi-agent workflow

  steps:
    - id: step-1
      name: First Step
      agentId: developer-agent
      action: build
      parameters:
        branch: main
        run_tests: true
      continueOnFailure: false
      retryPolicy:
        maxAttempts: 3
        backoffMs: 5000
        backoffMultiplier: 2
      timeout: 600000  # 10 minutes

    - id: step-2
      name: Second Step
      agentId: qa-agent
      action: run_tests
      parameters:
        test_suite: integration
        deployment_id: "{{ context.deployment_id }}"
      continueOnFailure: false

    - id: step-3
      name: Third Step
      agentId: sre-agent
      action: deploy
      parameters:
        environment: prod
        build_id: "{{ context.buildId }}"
      continueOnFailure: false
```

### Loading and Executing

```typescript
// Load workflow from file
await orchestrator.loadWorkflows('./config/workflows');

// Execute with context
const result = await orchestrator.executeWorkflow('my-custom-workflow', {
  application: 'my-app',
  version: '2.0.0'
});

console.log('Workflow status:', result.status);
```

### Context Interpolation

Workflows support context variable interpolation:

```yaml
parameters:
  deployment_id: "{{ context.deployment_id }}"
  build_id: "{{ context.buildId }}"
  version: "{{ context.version }}"
```

Context is passed between steps automatically. Each step's output is merged into the context for subsequent steps.

---

## Scheduling

### Schedule Configuration

Create a schedule configuration file:

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
      comprehensive: true

  - name: weekly-cost-report
    agentId: finops-agent
    cron: "0 9 * * 1"  # Monday 9 AM
    enabled: true
    parameters:
      action: generate_cost_report
      period: last_week
```

### Cron Expression Format

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ day of week (0 - 7) (0 or 7 is Sun)
│ │ │ │ └─── month (1 - 12)
│ │ │ └───── day of month (1 - 31)
│ │ └─────── hour (0 - 23)
│ └───────── minute (0 - 59)
└─────────── second (0 - 59, optional)
```

### Examples

```bash
"0 9 * * *"      # 9 AM every day
"0 */2 * * *"    # Every 2 hours
"0 0 * * 0"      # Sunday midnight
"*/15 * * * *"   # Every 15 minutes
"0 9 * * 1-5"    # 9 AM weekdays
```

---

## Event-Driven Triggers

### Pre-defined Events

The system provides several pre-defined events:

- `deployment.complete` - Deployment finished successfully
- `deployment.failed` - Deployment failed
- `alert.fired` - Alert triggered
- `test.failed` - Test execution failed
- `test.passed` - Test execution passed
- `security.vulnerability_detected` - Security vulnerability found
- `cost.threshold_exceeded` - Cost threshold exceeded
- `health.check_failed` - Health check failed
- `rollback.initiated` - Rollback started
- `approval.required` - Approval needed
- `approval.granted` - Approval granted
- `approval.rejected` - Approval rejected

### Registering Event Handlers

```typescript
const eventManager = orchestrator.getEventManager();

// Handle deployment failures
eventManager.registerHandler('deployment.failed', async (event) => {
  const { deploymentId, reason } = event.data;

  // Trigger rollback workflow
  await orchestrator.executeWorkflow('rollback', {
    deploymentId,
    reason
  });

  // Notify team
  await orchestrator.executeAgent('customer-support-agent', {
    action: 'send_notifications',
    type: 'deployment_failed',
    deploymentId
  });
});

// Handle critical alerts
eventManager.registerHandler('alert.fired', async (event) => {
  const { severity } = event.data;

  if (severity === 'critical') {
    // Trigger incident response
    await orchestrator.executeWorkflow('incident-response', event.data);
  }
});

// Handle security vulnerabilities
eventManager.registerHandler('security.vulnerability_detected', async (event) => {
  const { severity, vulnerabilityId } = event.data;

  if (severity === 'critical' || severity === 'high') {
    // Trigger security remediation workflow
    await orchestrator.executeWorkflow('security-remediation', {
      vulnerabilityId,
      severity
    });
  }
});
```

### Publishing Events

```typescript
// Use pre-defined methods
await eventManager.deploymentComplete('deploy-123', {
  environment: 'prod',
  version: '1.0.0'
});

await eventManager.alertFired('alert-456', 'critical', 'Service down');

await eventManager.vulnerabilityDetected('vuln-789', 'high', {
  cve: 'CVE-2024-1234'
});

// Or publish custom events
await eventManager.publishEvent({
  type: 'custom.event',
  timestamp: new Date(),
  data: {
    key: 'value'
  }
});
```

---

## State Management

### Execution State Manager

Track and persist agent and workflow executions:

```typescript
import { ExecutionStateManager } from './orchestration';

const stateManager = new ExecutionStateManager('./.orchestration-state');

// Save agent execution
await stateManager.saveAgentExecution(execution);

// Load agent execution
const loaded = await stateManager.loadAgentExecution(executionId);

// Save workflow execution
await stateManager.saveWorkflowExecution(workflowExecution);

// Load workflow execution
const loadedWorkflow = await stateManager.loadWorkflowExecution(executionId);

// List all executions
const agentExecutions = await stateManager.listAgentExecutions();
const workflowExecutions = await stateManager.listWorkflowExecutions();

// Clean up old executions (older than 30 days)
await stateManager.cleanupOldExecutions(30);
```

---

## Best Practices

### 1. Agent Design

- **Single Responsibility**: Each agent should have a clear, focused purpose
- **Idempotency**: Operations should be idempotent when possible
- **Error Handling**: Handle all error cases explicitly
- **Logging**: Log all important operations
- **Health Checks**: Implement meaningful health checks
- **Timeouts**: Set appropriate timeouts for long-running operations

### 2. Workflow Design

- **Small Steps**: Break workflows into small, manageable steps
- **Retry Logic**: Add retry policies for flaky operations
- **Continue on Failure**: Use `continueOnFailure` judiciously
- **Context Passing**: Use context to pass data between steps
- **Timeouts**: Set timeouts for all steps
- **Validation**: Validate workflow definitions before execution

### 3. Scheduling

- **Timezone Awareness**: Consider timezone when scheduling
- **Resource Usage**: Avoid scheduling resource-intensive jobs simultaneously
- **Monitoring**: Monitor job execution and failure rates
- **Maintenance Windows**: Schedule maintenance jobs during off-peak hours

### 4. Event Handling

- **Async Processing**: Keep event handlers fast and async
- **Error Handling**: Handle errors in event handlers gracefully
- **Dead Letter Queue**: Implement DLQ for failed event processing
- **Idempotency**: Make event handlers idempotent

### 5. Production Deployment

- **Monitoring**: Monitor orchestrator health
- **Alerting**: Set up alerts for critical failures
- **Backup**: Backup execution state regularly
- **Scaling**: Consider horizontal scaling for high load
- **Security**: Secure agent credentials and API keys

---

## Troubleshooting

### Common Issues

#### 1. Scheduler Not Executing Jobs

**Symptoms**: Jobs are scheduled but not executing

**Solutions**:
- Check if scheduler is running: `scheduler.isRunning()`
- Verify cron expression is valid
- Check if job is enabled: `scheduler.getJob(jobName).enabled`
- Check logs for errors

#### 2. Workflow Steps Failing

**Symptoms**: Workflow steps consistently fail

**Solutions**:
- Check agent registration: `registry.list()`
- Verify agent health: `await registry.healthCheckAll()`
- Check step parameters and context
- Review step timeout settings
- Check agent logs

#### 3. Events Not Triggering

**Symptoms**: Event handlers not being called

**Solutions**:
- Verify handler registration: `eventManager.listEventTypes()`
- Check event type spelling
- Use `publishEventSync()` for debugging
- Check handler error logs

#### 4. High Memory Usage

**Symptoms**: Orchestrator consuming excessive memory

**Solutions**:
- Clear execution history: `scheduler.clearHistory()`
- Clean up old state: `stateManager.cleanupOldExecutions()`
- Reduce max execution history: Configure in constructor
- Check for memory leaks in custom agents

#### 5. Agent Initialization Failures

**Symptoms**: Agents failing to initialize

**Solutions**:
- Check agent dependencies
- Verify credentials and API keys
- Review agent logs
- Test agent health check

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
```

### Health Checks

Regular health checks:

```typescript
const health = await orchestrator.healthCheck();

console.log('Orchestrator:', health.orchestrator);
console.log('Scheduler:', health.scheduler);
console.log('Agent Health:', health.agents);

if (!health.healthy) {
  // Take corrective action
}
```

---

## Additional Resources

- [Agent Development Guide](./AGENT-DEVELOPMENT.md)
- [Workflow Examples](./WORKFLOW-EXAMPLES.md)
- [API Reference](./API-REFERENCE.md)
- [Architecture Decision Records](../docs/ADRs/)

---

For support, contact the platform team or create an issue in the repository.
