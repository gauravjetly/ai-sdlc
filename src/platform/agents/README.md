# AI Agent Personas - Phase 6

8 specialized AI agents with MCP integration for autonomous platform operations.

## Overview

This module implements 8 AI agent personas that integrate with the MCP (Model Context Protocol) server to operate the multi-cloud DevOps platform autonomously.

## Agents

### 1. Developer Agent (`developer-agent.ts`)
**Persona**: Software Engineer

**Capabilities**:
- Deploy applications
- Run tests (unit, integration, e2e)
- Analyze code quality
- Check dependencies
- Rollback deployments

**Scheduled Tasks**:
- Daily dependency updates (9 AM)
- Hourly code quality analysis
- Daily test coverage check (10 AM)

**Event Triggers**:
- `deployment.failed` - Analyze and attempt recovery
- `test.failed` - Analyze test failures
- `deployment.complete` - Run post-deployment validation

### 2. SRE Agent (`sre-agent.ts`)
**Persona**: Site Reliability Engineer

**Capabilities**:
- System health monitoring
- Performance analysis
- Auto-scaling
- Incident investigation
- Metrics collection

**Scheduled Tasks**:
- Health checks every 5 minutes
- Hourly performance analysis
- Metrics collection every 15 minutes
- Daily capacity planning (8 AM)

**Event Triggers**:
- `alert.fired` (critical) - Immediate investigation
- `resource.exhausted` - Auto-scaling
- `health.check_failed` - Diagnostic analysis

### 3. Security Agent (`security-agent.ts`)
**Persona**: Security Engineer

**Capabilities**:
- Vulnerability scanning
- Compliance checking (CIS, SOC2, GDPR, PCI-DSS)
- Secret rotation
- Access auditing
- Threat investigation

**Scheduled Tasks**:
- Daily vulnerability scans (2 AM)
- Weekly compliance checks (Sunday 3 AM)
- Monthly secret rotation audit (1st of month, 4 AM)
- Daily security posture assessment (5 AM)

**Event Triggers**:
- `security.alert` - Immediate threat response
- `vulnerability.detected` - Risk assessment
- `deployment.complete` - Security scan

### 4. QA Agent (`qa-agent.ts`)
**Persona**: Quality Assurance Engineer

**Capabilities**:
- Test execution (unit, integration, e2e, performance, security)
- Test coverage analysis
- Quality validation
- Flaky test detection
- Test report generation

**Scheduled Tasks**:
- Hourly smoke tests
- Nightly regression tests (2 AM)
- Daily coverage reports (9 AM)
- Weekly test quality analysis (Monday 8 AM)

**Event Triggers**:
- `deployment.complete` - Post-deployment tests
- `code.committed` - Commit tests
- `release.scheduled` - Full regression suite
- `test.failed` - Failure analysis

### 5. Release Manager Agent (`release-manager-agent.ts`)
**Persona**: Release Manager

**Capabilities**:
- Release creation and orchestration
- Environment promotion
- Deployment rollback
- Release approval workflow
- Deployment reporting

**Scheduled Tasks**:
- Daily release planning (10 AM)
- Daily deployment reports (5 PM)
- Weekly release retrospective (Friday 3 PM)

**Event Triggers**:
- `deployment.complete` - Evaluate promotion
- `deployment.failed` - Automatic rollback
- `approval.granted` - Proceed with release
- `test.failed` - Evaluate rollback

### 6. Architect Agent (`architect-agent.ts`)
**Persona**: Software Architect

**Capabilities**:
- Architecture validation
- Dependency analysis
- Design pattern review
- Complexity assessment
- Technical debt tracking

**Scheduled Tasks**:
- Weekly architecture review (Monday 10 AM)
- Monthly technical debt assessment (1st of month, 9 AM)
- Daily dependency analysis (11 AM)

**Event Triggers**:
- `service.created` - Architecture review
- `code.committed` - Review architecture changes
- `deployment.complete` - Validate deployment architecture

### 7. FinOps Agent (`finops-agent.ts`)
**Persona**: Financial Operations Engineer

**Capabilities**:
- Cost analysis
- Budget tracking
- Cost forecasting
- Resource optimization
- Cost reporting

**Scheduled Tasks**:
- Daily cost analysis (8 AM)
- Weekly optimization recommendations (Monday 9 AM)
- Monthly budget review (1st of month, 10 AM)
- Hourly cost tracking

**Event Triggers**:
- `cost.threshold_exceeded` - Emergency optimization
- `deployment.complete` - Cost impact analysis
- `resource.scaled` - Track scaling costs

### 8. Conductor Agent (`conductor-agent.ts`)
**Persona**: Orchestrator

**Capabilities**:
- Multi-agent workflow execution
- Agent coordination
- Workflow monitoring
- Agent health management
- Capacity management

**Scheduled Tasks**:
- Continuous workflow monitoring (every 5 minutes)
- Agent health checks (every 5 minutes)
- Daily workflow analytics (8 AM)
- Hourly capacity check

**Event Triggers**:
- `workflow.started` - Track workflow
- `workflow.completed` - Log completion
- `workflow.failed` - Handle failure
- `agent.unhealthy` - Agent recovery

## Usage

### Creating Individual Agents

```typescript
import { AgentFactory, AgentType } from './agents';

// Create a developer agent
const devAgent = AgentFactory.createAgent(AgentType.DEVELOPER, {
  id: 'dev-1',
  name: 'Developer Agent',
  description: 'Software engineering automation',
  enableScheduling: true,
  enableEventTriggers: true
});

// Initialize the agent
await devAgent.initialize();

// Execute an action
const result = await devAgent.execute({
  action: 'deploy',
  application: 'my-app',
  version: '1.0.0',
  environment: 'dev'
});

// Shutdown
await devAgent.shutdown();
```

### Creating Complete Agent Team

```typescript
import { AgentFactory } from './agents';

// Create all 8 agents
const team = await AgentFactory.createAgentTeam({
  enableScheduling: true,
  enableEventTriggers: true
});

// Access individual agents
await team.developer.execute({ action: 'deploy', ... });
await team.sre.execute({ action: 'check_health', ... });
await team.security.execute({ action: 'scan_vulnerabilities', ... });

// Conductor orchestrates workflows
await team.conductor.executeWorkflow({
  workflow: {
    id: 'deploy-workflow',
    name: 'Full Deployment Workflow',
    steps: [
      { id: '1', agentId: 'dev-1', action: 'deploy', ... },
      { id: '2', agentId: 'qa-1', action: 'run_tests', ... },
      { id: '3', agentId: 'sec-1', action: 'scan_vulnerabilities', ... }
    ]
  }
});

// Shutdown all agents
await AgentFactory.shutdownAll();
```

### Using Configuration File

```typescript
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { AgentFactory } from './agents';

// Load configuration
const config = yaml.load(
  fs.readFileSync('config/agent-configs.yaml', 'utf8')
) as any;

// Create agents from configuration
for (const [type, agentConfig] of Object.entries(config.agents)) {
  const agent = AgentFactory.createAgent(type, agentConfig);
  await agent.initialize();
}
```

## Architecture

```
agents/
├── base-agent.ts              # Abstract base class
├── developer-agent.ts         # Developer persona
├── sre-agent.ts              # SRE persona
├── security-agent.ts         # Security persona
├── qa-agent.ts               # QA persona
├── release-manager-agent.ts  # Release Manager persona
├── architect-agent.ts        # Architect persona
├── finops-agent.ts           # FinOps persona
├── conductor-agent.ts        # Orchestrator persona
├── agent-factory.ts          # Factory pattern
└── index.ts                  # Exports
```

## Base Agent Features

All agents inherit from `BaseAgent`:

- **MCP Integration**: Connect to MCP server and execute tools
- **Event Handling**: Subscribe to platform events
- **Scheduling**: Cron-based job scheduling
- **Health Checks**: Monitor agent health
- **Execution Tracking**: Track execution history
- **Error Handling**: Comprehensive error handling and logging

## Integration Points

### MCP Client
All agents use `PlatformMCPClient` to execute MCP tools:
```typescript
const result = await this.mcpClient.deployApplication({
  application: 'my-app',
  version: '1.0.0',
  environment: 'prod'
});
```

### Event Manager
Agents subscribe to platform events:
```typescript
this.eventManager.registerHandler('deployment.failed', async (event) => {
  await this.handleDeploymentFailure(event);
});
```

### Scheduler
Agents schedule periodic tasks:
```typescript
this.scheduler.addJob('health-checks', '*/5 * * * *', async () => {
  await this.performHealthChecks();
});
```

## Testing

```bash
# Run agent tests
npm run test:unit -- agents

# Run specific agent test
npm run test:unit -- agents/developer-agent.test.ts

# Run with coverage
npm run test:coverage -- agents
```

## Configuration

See `config/agent-configs.yaml` for complete agent configuration including:
- Scheduling
- Event triggers
- Thresholds and limits
- MCP server configuration

## Best Practices

1. **Always initialize agents** before use
2. **Shutdown agents gracefully** when done
3. **Use the Conductor** for multi-agent workflows
4. **Monitor agent health** regularly
5. **Configure appropriate thresholds** for each environment
6. **Enable scheduling** for production environments
7. **Review agent logs** for insights and debugging

## Extending

To create a new agent:

1. Extend `BaseAgent`
2. Implement abstract methods:
   - `setupEventTriggers()`
   - `setupScheduledJobs()`
   - `executeInternal()`
   - `getAgentType()`
   - `getCapabilities()`
3. Add agent type to `AgentFactory`
4. Create tests
5. Update configuration file

## License

Copyright © 2024. All rights reserved.
