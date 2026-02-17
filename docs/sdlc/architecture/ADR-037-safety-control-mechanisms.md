# ADR-037: Safety and Control Mechanisms - Bounded Autonomy

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Security Agent
**Context**: Agentic AI Platform Transformation

---

## Context

Autonomous agents introduce new risk categories that do not exist in human-triggered systems:
- Agents may produce harmful or incorrect outputs without human review
- Reasoning loops may consume excessive resources (tokens, time, cost)
- Autonomous triggers may initiate unwanted workflows
- Agents may modify production systems without approval
- Knowledge propagation may spread incorrect learnings

The principle of "bounded autonomy" means agents have clear operational limits, explicit escalation paths, and comprehensive audit trails.

## Decision

**Implement a multi-layered safety architecture with a Policy Engine, Budget Guards, Output Validation, Human Escalation, and Kill Switch capabilities.**

### Safety Layers

```
LAYER 1: PRE-ACTION (before agent acts)
─────────────────────────────────────────
Policy Engine evaluates: "Is this agent allowed to do this?"
Budget Guard checks:     "Does the task have budget remaining?"
Permission check:        "Does this agent have tool access?"

LAYER 2: RUNTIME (while agent runs)
────────────────────────────────────
Token monitor:       Track cumulative token usage
Time monitor:        Enforce task timeout
Cost monitor:        Track cumulative cost
Loop detector:       Detect infinite reasoning loops
Output monitor:      Watch for sensitive data in output

LAYER 3: POST-ACTION (after agent completes)
────────────────────────────────────────────
Output validation:   Schema check, quality score
Security scan:       Check for leaked secrets, vulnerabilities
Compliance check:    Verify against project policies
Human review gate:   Block critical actions until approved
Learning review:     Validate learnings before propagation to "proven"
```

### Policy Engine

```typescript
// Policy definition
interface Policy {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'workflow' | 'agent' | 'task';
  rules: PolicyRule[];
  enabled: boolean;
}

interface PolicyRule {
  condition: {
    agent?: AgentId | AgentId[];
    action?: string[];            // e.g., ['file:delete', 'deploy:production']
    resource?: string[];           // e.g., ['src/**', 'config/**']
    environment?: string[];        // e.g., ['production']
    timeOfDay?: { after: string; before: string };
  };
  effect: 'allow' | 'deny' | 'require-approval';
  approvers?: string[];           // Who can approve
  reason: string;
}

// Example policies:
const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'no-production-delete',
    name: 'Prevent Production Data Deletion',
    description: 'No agent may delete data in production',
    scope: 'global',
    rules: [{
      condition: { action: ['delete', 'drop', 'truncate'], environment: ['production'] },
      effect: 'deny',
      reason: 'Production data deletion is never allowed by agents',
    }],
    enabled: true,
  },
  {
    id: 'approve-deploy',
    name: 'Require Approval for Production Deployment',
    description: 'Production deployments require human approval',
    scope: 'global',
    rules: [{
      condition: { action: ['deploy'], environment: ['production'] },
      effect: 'require-approval',
      approvers: ['human'],
      reason: 'Production deployments must be human-approved',
    }],
    enabled: true,
  },
  {
    id: 'security-review-required',
    name: 'Security Review for API Changes',
    description: 'Security agent must review all API endpoint changes',
    scope: 'workflow',
    rules: [{
      condition: { resource: ['src/presentation/**', 'src/api/**'] },
      effect: 'require-approval',
      approvers: ['security'],
      reason: 'API changes require security agent review',
    }],
    enabled: true,
  },
  {
    id: 'token-budget',
    name: 'Task Token Budget',
    description: 'No single task may exceed 100K tokens',
    scope: 'task',
    rules: [{
      condition: { action: ['llm-call'] },
      effect: 'deny',
      reason: 'Task token budget exceeded. Budget: 100,000. Used: {used}.',
    }],
    enabled: true,
  },
];
```

### Budget Guards

```typescript
interface BudgetGuard {
  // Check remaining budget before action
  checkBudget(scope: BudgetScope): Promise<BudgetStatus>;

  // Record resource consumption
  recordUsage(usage: ResourceUsage): Promise<void>;

  // Get current budget status
  getStatus(workflowId: string): Promise<WorkflowBudget>;
}

interface WorkflowBudget {
  workflowId: string;
  limits: {
    maxTokens: number;          // e.g., 500,000
    maxCostUSD: number;         // e.g., 10.00
    maxDurationMinutes: number; // e.g., 60
    maxReplanAttempts: number;  // e.g., 3
  };
  used: {
    tokens: number;
    costUSD: number;
    durationMinutes: number;
    replanAttempts: number;
  };
  remaining: {
    tokens: number;
    costUSD: number;
    durationMinutes: number;
    replanAttempts: number;
  };
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
  alerts: string[];
}
```

### Human Escalation Protocol

```
ESCALATION TRIGGERS:
────────────────────
1. Confidence below threshold (< 0.3)
2. Policy requires approval
3. Budget exceeded
4. Max retries exhausted
5. Conflict unresolvable by agents
6. Agent explicitly requests human input

ESCALATION CHANNELS:
────────────────────
CLI:     Print to stdout with [HUMAN INPUT REQUIRED] prefix
Web:     WebSocket notification to dashboard
Slack:   Post to configured channel (if integrated)
Email:   Send to configured address (if integrated)

ESCALATION FLOW:
────────────────
Agent ──► Reasoning Engine ──► "Confidence: 0.25, escalating"
                                      │
                                      ▼
                              [Pause Task]
                                      │
                              [Notify Human]
                                      │
                                      ▼
                          [Human Responds via CLI/Web/Slack]
                                      │
                              [Resume Task with Input]
                                      │
                              [Record Decision as Learning]
```

### Kill Switch

```typescript
interface KillSwitch {
  // Stop a specific task immediately
  killTask(taskId: string, reason: string): Promise<void>;

  // Stop an entire workflow
  killWorkflow(workflowId: string, reason: string): Promise<void>;

  // Stop all agent activity (global emergency stop)
  killAll(reason: string): Promise<void>;

  // Pause (can be resumed)
  pauseWorkflow(workflowId: string, reason: string): Promise<void>;
  resumeWorkflow(workflowId: string): Promise<void>;
}

// Kill switch triggers:
// - Manual: Human invokes via CLI or dashboard
// - Automatic: Budget guard detects critical overspend
// - Automatic: Policy engine detects violation
// - Automatic: Health check detects system degradation
```

## Alternatives Considered

### 1. No Safety Layer (trust agents)
- **Rejected**: Unacceptable risk for any production system

### 2. Human Approval for Every Action
- **Pro**: Maximum safety
- **Con**: Eliminates autonomy, defeats the purpose of agentic system
- **Rejected**: Impractical; bounded autonomy is the right balance

### 3. Full OPA (Open Policy Agent) Integration
- **Pro**: Industry-standard policy engine, Rego language
- **Con**: Additional infrastructure, Java/Go dependency, over-engineered
- **Rejected**: Our policy needs are simpler; a lightweight TypeScript policy engine suffices

## Consequences

### Positive
- Clear boundaries on agent autonomy
- Budget controls prevent cost overruns
- Human escalation for high-stakes decisions
- Kill switch for emergency situations
- All agent actions are auditable

### Negative
- Policy evaluation adds latency to every action
- Overly restrictive policies may reduce agent effectiveness
- Human escalation pauses workflow execution

### Mitigations
- Cache policy evaluations for repeated actions
- Policy tuning based on false positive/negative rates
- Asynchronous human notification (does not block non-critical paths)
- Policy bypass for trusted scenarios (configurable per environment)

---

**Related ADRs**: ADR-030 (Agent Runtime), ADR-035 (Reasoning Engine), ADR-036 (Scalability)
