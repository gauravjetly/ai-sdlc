# ADR-018: AI Agent Orchestration

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: AI/ML Architecture

---

## Context

The Deltek Catalyst platform includes 8 AI-powered agents:

1. **Developer Agent** - Dependency updates, code reviews
2. **SRE Agent** - Health monitoring, auto-scaling
3. **Security Agent** - Vulnerability scans, compliance
4. **QA Agent** - Automated testing, quality gates
5. **Release Manager** - Deployment orchestration
6. **Architect Agent** - Design reviews, best practices
7. **FinOps Agent** - Cost optimization, budget tracking
8. **Conductor Agent** - Multi-agent orchestration

Requirements:
- Independent agent execution
- Coordinated multi-agent workflows
- Event-driven triggers
- Scheduled execution (cron)
- Manual execution via UI
- Execution history and audit trail
- Resource quotas and rate limiting
- Graceful degradation when AI services unavailable

## Decision

**We will implement an Event-Driven Agent Orchestration system** with the following architecture:

### 1. Orchestration Pattern: Event-Driven + Workflow Engine

```
+------------------------------------------------------------------+
|                    AGENT ORCHESTRATION ARCHITECTURE               |
+------------------------------------------------------------------+
|                                                                   |
|  TRIGGERS                                                         |
|  +----------+  +----------+  +----------+  +----------+          |
|  | Schedule |  |  Event   |  |  Manual  |  |  Webhook |          |
|  | (Cron)   |  | (Kafka)  |  |  (API)   |  |  (CI/CD) |          |
|  +----+-----+  +----+-----+  +----+-----+  +----+-----+          |
|       |             |             |             |                 |
|       +-------------+-------------+-------------+                 |
|                           |                                       |
|                           v                                       |
|  +------------------------------------------------------------+  |
|  |                  Agent Scheduler                            |  |
|  |  - Trigger validation                                       |  |
|  |  - Queue management                                         |  |
|  |  - Rate limiting                                            |  |
|  |  - Priority handling                                        |  |
|  +------------------------------------------------------------+  |
|                           |                                       |
|                           v                                       |
|  +------------------------------------------------------------+  |
|  |                  Job Queue (Redis/BullMQ)                   |  |
|  +------------------------------------------------------------+  |
|       |             |             |             |                 |
|       v             v             v             v                 |
|  +----------+  +----------+  +----------+  +----------+          |
|  | Worker 1 |  | Worker 2 |  | Worker 3 |  | Worker N |          |
|  +----+-----+  +----+-----+  +----+-----+  +----+-----+          |
|       |             |             |             |                 |
|       v             v             v             v                 |
|  +------------------------------------------------------------+  |
|  |                  Agent Runtime                              |  |
|  |  +--------+  +--------+  +--------+  +--------+            |  |
|  |  |Developer|  |  SRE   |  |Security|  |  QA    |  ...      |  |
|  |  | Agent  |  | Agent  |  | Agent  |  | Agent  |            |  |
|  |  +--------+  +--------+  +--------+  +--------+            |  |
|  +------------------------------------------------------------+  |
|                           |                                       |
|                           v                                       |
|  +------------------------------------------------------------+  |
|  |                  AI Service Layer                           |  |
|  |  +----------+  +----------+  +----------+                  |  |
|  |  |  Claude  |  |  OpenAI  |  |  Custom  |                  |  |
|  |  |   API    |  |   API    |  |  Models  |                  |  |
|  |  +----------+  +----------+  +----------+                  |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### 2. Agent Definition Model

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  version: string;

  // Capabilities
  capabilities: AgentCapability[];

  // Execution configuration
  execution: {
    timeout: number;           // Max execution time (ms)
    retries: number;           // Retry count on failure
    concurrency: number;       // Max concurrent executions
    priority: 'low' | 'medium' | 'high' | 'critical';
  };

  // Resource requirements
  resources: {
    memory: string;            // e.g., "512Mi"
    cpu: string;               // e.g., "500m"
    aiTokenBudget: number;     // Max tokens per execution
  };

  // Triggers
  triggers: AgentTrigger[];

  // Dependencies on other agents
  dependencies?: string[];

  // Input/output schema
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

type AgentCapability =
  | 'code_review'
  | 'dependency_update'
  | 'health_monitoring'
  | 'auto_scaling'
  | 'vulnerability_scan'
  | 'compliance_check'
  | 'test_generation'
  | 'quality_gate'
  | 'deployment_orchestration'
  | 'design_review'
  | 'cost_analysis'
  | 'budget_alert'
  | 'multi_agent_coordination';

interface AgentTrigger {
  type: 'schedule' | 'event' | 'webhook' | 'manual';
  schedule?: string;           // Cron expression
  event?: string;              // Event type to listen for
  webhookPath?: string;        // Webhook endpoint path
  conditions?: TriggerCondition[];
}
```

### 3. Workflow Engine for Multi-Agent Coordination

**Chosen**: Temporal.io for complex workflows, BullMQ for simple job queues

```typescript
// Conductor Agent orchestrates multi-agent workflows
interface AgentWorkflow {
  id: string;
  name: string;
  description: string;

  // Workflow definition (DAG)
  steps: WorkflowStep[];

  // Workflow-level configuration
  configuration: {
    timeout: number;
    failureStrategy: 'fail_fast' | 'continue_on_error' | 'retry';
    notifyOnComplete: boolean;
    notifyOnFailure: boolean;
  };
}

interface WorkflowStep {
  id: string;
  agentId: string;
  name: string;

  // Input mapping from previous steps
  inputs: {
    [key: string]: string | StepReference;
  };

  // Conditional execution
  condition?: {
    expression: string;
    dependsOn: string[];  // Step IDs
  };

  // Parallel execution
  parallel?: boolean;

  // On step completion
  onSuccess?: {
    nextSteps: string[];
    notify?: boolean;
  };

  onFailure?: {
    retryCount: number;
    fallbackSteps?: string[];
    notify: boolean;
  };
}
```

### 4. AI Service Abstraction

**Chosen**: Provider-agnostic AI service layer

```typescript
interface AIService {
  // Text generation
  generateText(params: TextGenerationParams): Promise<TextGenerationResult>;

  // Code analysis
  analyzeCode(params: CodeAnalysisParams): Promise<CodeAnalysisResult>;

  // Structured output
  generateStructured<T>(params: StructuredGenerationParams<T>): Promise<T>;

  // Embeddings
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  // Available models
  listModels(): Promise<AIModel[]>;
}

interface AIServiceConfig {
  provider: 'anthropic' | 'openai' | 'azure_openai' | 'custom';
  model: string;
  maxTokens: number;
  temperature: number;
  fallbackProvider?: string;
  fallbackModel?: string;
}
```

## Alternatives Considered

### Orchestration Engine

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **BullMQ + Temporal** | Simple jobs + complex workflows | Two systems | **Selected** |
| Apache Airflow | DAG workflows, mature | Python-only, heavy | Rejected |
| Prefect | Modern, flexible | Less mature | Future consideration |
| Custom solution | Full control | Maintenance burden | Rejected |

### AI Provider Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Multi-provider** | Resilience, flexibility | Complexity | **Selected** |
| Single provider | Simplicity | Vendor lock-in, risk | Rejected |

### Execution Model

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Queue-based workers** | Scalable, reliable | Latency | **Selected** |
| In-process | Low latency | Not scalable | Rejected |
| Serverless functions | Auto-scale | Cold starts | Rejected for core agents |

## Consequences

### Positive

1. **Scalability**: Workers scale independently
2. **Reliability**: Queue-based with retries
3. **Flexibility**: Mix of simple jobs and complex workflows
4. **Observability**: Full execution history
5. **Resilience**: AI provider fallback

### Negative

1. **Complexity**: Multiple systems to manage
2. **Latency**: Queue overhead for simple tasks
3. **Cost**: AI API costs can be significant

### Mitigations

1. **Unified Dashboard**: Single pane for all agents
2. **Priority Queues**: Fast-track critical tasks
3. **Token Budgets**: Control AI costs per agent

## Implementation Details

### Agent Base Class

```typescript
// src/domain/agents/BaseAgent.ts
export abstract class BaseAgent {
  protected logger: Logger;
  protected aiService: AIService;
  protected metrics: MetricsCollector;

  constructor(
    protected config: AgentDefinition,
    protected services: AgentServices
  ) {
    this.logger = services.logger.child({ agent: config.id });
    this.aiService = services.aiService;
    this.metrics = services.metrics;
  }

  async execute(context: AgentExecutionContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Validate input
      await this.validateInput(context.input);

      // Pre-execution hooks
      await this.onBeforeExecute(context);

      // Execute agent logic
      const result = await this.run(context);

      // Post-execution hooks
      await this.onAfterExecute(context, result);

      // Record metrics
      this.metrics.recordExecution({
        agentId: this.config.id,
        duration: Date.now() - startTime,
        success: true,
        tokensUsed: result.tokensUsed,
      });

      return result;
    } catch (error) {
      this.logger.error('Agent execution failed', { error, context });

      this.metrics.recordExecution({
        agentId: this.config.id,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  protected abstract run(context: AgentExecutionContext): Promise<AgentResult>;

  protected async validateInput(input: any): Promise<void> {
    // Validate against inputSchema
  }

  protected async onBeforeExecute(context: AgentExecutionContext): Promise<void> {
    // Override in subclass
  }

  protected async onAfterExecute(
    context: AgentExecutionContext,
    result: AgentResult
  ): Promise<void> {
    // Override in subclass
  }
}
```

### Security Agent Implementation

```typescript
// src/domain/agents/SecurityAgent.ts
export class SecurityAgent extends BaseAgent {
  static readonly DEFINITION: AgentDefinition = {
    id: 'security-agent',
    name: 'Security Agent',
    description: 'Vulnerability scanning and compliance checking',
    version: '1.0.0',
    capabilities: ['vulnerability_scan', 'compliance_check'],
    execution: {
      timeout: 300000,  // 5 minutes
      retries: 2,
      concurrency: 5,
      priority: 'high',
    },
    resources: {
      memory: '1Gi',
      cpu: '500m',
      aiTokenBudget: 10000,
    },
    triggers: [
      { type: 'schedule', schedule: '0 2 * * *' },  // Daily at 2 AM
      { type: 'event', event: 'deployment.created' },
      { type: 'manual' },
    ],
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['all', 'application', 'infrastructure'] },
        scanType: { type: 'string', enum: ['vulnerability', 'compliance', 'both'] },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        vulnerabilities: { type: 'array' },
        complianceResults: { type: 'array' },
        score: { type: 'number' },
      },
    },
  };

  protected async run(context: AgentExecutionContext): Promise<AgentResult> {
    const { target, scanType } = context.input;

    const results: AgentResult = {
      success: true,
      data: {
        vulnerabilities: [],
        complianceResults: [],
        score: 100,
      },
      tokensUsed: 0,
    };

    // Run vulnerability scan
    if (scanType === 'vulnerability' || scanType === 'both') {
      const vulnResults = await this.runVulnerabilityScan(target);
      results.data.vulnerabilities = vulnResults.findings;
      results.tokensUsed += vulnResults.tokensUsed;
    }

    // Run compliance check
    if (scanType === 'compliance' || scanType === 'both') {
      const complianceResults = await this.runComplianceCheck(target);
      results.data.complianceResults = complianceResults.findings;
      results.tokensUsed += complianceResults.tokensUsed;
    }

    // Calculate security score using AI
    results.data.score = await this.calculateSecurityScore(
      results.data.vulnerabilities,
      results.data.complianceResults
    );

    // Generate AI-powered recommendations
    const recommendations = await this.generateRecommendations(results.data);
    results.data.recommendations = recommendations;

    return results;
  }

  private async runVulnerabilityScan(target: string): Promise<ScanResult> {
    // Integrate with Trivy, Snyk, or other scanners
    const rawFindings = await this.services.vulnScanner.scan(target);

    // Use AI to prioritize and contextualize findings
    const contextualizedFindings = await this.aiService.generateStructured({
      prompt: `Analyze these vulnerability scan results and provide:
        1. Risk assessment for each finding
        2. Prioritized remediation order
        3. Estimated effort to fix

        Findings: ${JSON.stringify(rawFindings)}`,
      schema: VulnerabilityAnalysisSchema,
      model: 'claude-3-sonnet',
    });

    return contextualizedFindings;
  }

  private async generateRecommendations(data: SecurityScanData): Promise<string[]> {
    const response = await this.aiService.generateText({
      prompt: `Based on these security scan results, provide actionable recommendations:
        - ${data.vulnerabilities.length} vulnerabilities found
        - ${data.complianceResults.filter(r => !r.passed).length} compliance failures
        - Current score: ${data.score}/100

        Provide 3-5 prioritized recommendations with specific steps.`,
      model: 'claude-3-sonnet',
      maxTokens: 1000,
    });

    return response.text.split('\n').filter(line => line.trim());
  }
}
```

### Agent Scheduler

```typescript
// src/application/services/AgentScheduler.ts
export class AgentScheduler {
  private queues: Map<string, Queue> = new Map();
  private schedules: Map<string, ScheduledTask> = new Map();

  constructor(
    private agentRegistry: AgentRegistry,
    private eventBus: EventBus,
    private redis: Redis
  ) {}

  async initialize(): Promise<void> {
    // Create queues for each agent
    for (const agent of this.agentRegistry.getAllAgents()) {
      const queue = new Queue(`agent:${agent.id}`, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: agent.execution.retries,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      });

      this.queues.set(agent.id, queue);

      // Set up scheduled triggers
      for (const trigger of agent.triggers.filter(t => t.type === 'schedule')) {
        this.setupSchedule(agent.id, trigger.schedule!);
      }
    }

    // Subscribe to events for event-driven triggers
    await this.subscribeToEvents();
  }

  async triggerAgent(
    agentId: string,
    input: any,
    options: TriggerOptions = {}
  ): Promise<string> {
    const queue = this.queues.get(agentId);
    if (!queue) {
      throw new Error(`Agent queue not found: ${agentId}`);
    }

    const job = await queue.add('execute', {
      input,
      triggeredBy: options.triggeredBy || 'manual',
      tenantId: options.tenantId,
      correlationId: options.correlationId || generateId(),
    }, {
      priority: options.priority || 1,
      delay: options.delay || 0,
    });

    return job.id!;
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to relevant events
    const eventTriggers = this.agentRegistry.getEventTriggers();

    for (const [eventType, agentIds] of eventTriggers) {
      await this.eventBus.subscribe(eventType, async (event) => {
        for (const agentId of agentIds) {
          await this.triggerAgent(agentId, event.payload, {
            triggeredBy: `event:${eventType}`,
            tenantId: event.tenantId,
            correlationId: event.correlationId,
          });
        }
      });
    }
  }

  private setupSchedule(agentId: string, cronExpression: string): void {
    const task = cron.schedule(cronExpression, async () => {
      await this.triggerAgent(agentId, {}, {
        triggeredBy: `schedule:${cronExpression}`,
      });
    });

    this.schedules.set(`${agentId}:${cronExpression}`, task);
  }
}
```

### Conductor Agent (Multi-Agent Orchestrator)

```typescript
// src/domain/agents/ConductorAgent.ts
export class ConductorAgent extends BaseAgent {
  protected async run(context: AgentExecutionContext): Promise<AgentResult> {
    const { workflowId, inputs } = context.input;

    // Load workflow definition
    const workflow = await this.services.workflowRepository.findById(workflowId);

    // Execute workflow using Temporal
    const workflowRun = await this.services.temporal.workflow.execute(
      'agentWorkflow',
      {
        taskQueue: 'agent-workflows',
        workflowId: `${workflowId}-${Date.now()}`,
        args: [{
          definition: workflow,
          inputs,
          tenantId: context.tenantId,
        }],
      }
    );

    return {
      success: true,
      data: {
        workflowRunId: workflowRun.workflowId,
        status: 'started',
      },
      tokensUsed: 0,
    };
  }
}

// Temporal workflow definition
export async function agentWorkflow(params: WorkflowParams): Promise<WorkflowResult> {
  const { definition, inputs, tenantId } = params;

  const stepResults: Map<string, StepResult> = new Map();

  for (const step of topologicalSort(definition.steps)) {
    // Check conditions
    if (step.condition && !evaluateCondition(step.condition, stepResults)) {
      continue;
    }

    // Resolve inputs from previous steps
    const stepInputs = resolveInputs(step.inputs, stepResults);

    // Execute agent
    const result = await executeAgent({
      agentId: step.agentId,
      input: stepInputs,
      tenantId,
    });

    stepResults.set(step.id, result);

    // Handle failure
    if (!result.success) {
      if (definition.configuration.failureStrategy === 'fail_fast') {
        throw new WorkflowError(`Step ${step.id} failed`, result.error);
      }
    }
  }

  return {
    success: true,
    stepResults: Object.fromEntries(stepResults),
  };
}
```

## References

- [Temporal.io Documentation](https://docs.temporal.io/)
- [BullMQ Guide](https://docs.bullmq.io/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Multi-Agent Systems Design](https://www.microsoft.com/en-us/research/publication/multi-agent-systems/)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
