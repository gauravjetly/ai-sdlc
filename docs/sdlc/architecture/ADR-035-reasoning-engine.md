# ADR-035: Reasoning Engine Approach - ReAct with Reflection

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Ask-Tom (Problem Solving)
**Context**: Agentic AI Platform Transformation

---

## Context

Current agents process tasks in a single LLM pass: receive input, produce output. There is no mechanism for:
- Structured multi-step reasoning
- Self-evaluation of output quality
- Iterative refinement based on feedback
- Confidence scoring
- External validation (running tests, linting, etc.)

Research and industry practice show that structured reasoning loops (ReAct, Reflexion, CRITIC) significantly improve agent output quality, with 10-30% accuracy improvements on complex tasks.

## Decision

**Implement a configurable Reasoning Engine that wraps agent execution in a ReAct loop with an optional Reflection step. The engine supports external validation hooks and confidence-based accept/retry/escalate decisions.**

### Core Loop: THINK - ACT - OBSERVE - REFLECT

```
                    REASONING ENGINE
                    ═══════════════

Iteration 1:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  THINK  │───►│   ACT   │───►│ OBSERVE │───►│ REFLECT │
│         │    │         │    │         │    │         │
│ Plan    │    │ Execute │    │ Collect │    │ Self-   │
│ approach│    │ tools   │    │ results │    │ evaluate│
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                   │
                                          ┌────────┼────────┐
                                          │        │        │
                                       ACCEPT    RETRY   ESCALATE
                                    (conf>=0.7) (conf<0.7) (retries
                                                            exceeded)

Iteration 2 (if RETRY):
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  THINK  │───►│   ACT   │───►│ OBSERVE │───►│ REFLECT │
│         │    │         │    │         │    │         │
│ Adjust  │    │ Execute │    │ Collect │    │ Re-     │
│ based on│    │ with    │    │ new     │    │ evaluate│
│ feedback│    │ fixes   │    │ results │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Reasoning Modes

```typescript
type ReasoningMode =
  | 'single-pass'       // No loop, just think-act (for simple tasks)
  | 'react'             // ReAct loop: think-act-observe, repeat
  | 'react-reflect'     // ReAct + self-reflection
  | 'debate'            // Two agents: producer + critic
  | 'consensus';        // N agents independently solve, then merge

// Default mode per agent:
const DEFAULT_REASONING_MODE: Record<AgentId, ReasoningMode> = {
  conductor: 'single-pass',     // Orchestration is straightforward
  ba: 'react-reflect',          // Requirements need validation
  jets: 'react-reflect',        // Architecture needs reflection
  ux: 'react',                  // Design is iterative
  engineer: 'react-reflect',    // Code needs testing and review
  security: 'debate',           // Security benefits from adversarial review
  qa: 'react',                  // Testing is iterative
  atlas: 'react',               // Deployment needs verification
  customer: 'single-pass',      // UAT is binary pass/fail
  'ask-tom': 'react-reflect',   // Problem-solving is deeply iterative
  tracker: 'single-pass',       // Status tracking is simple
  finops: 'single-pass',        // Cost calculation is formulaic
};
```

### Reflection Prompt Template

```typescript
const REFLECTION_PROMPT = `
You just completed a task. Evaluate your own output.

TASK: {task_description}
SUCCESS CRITERIA: {success_criteria}
YOUR OUTPUT: {agent_output}
VALIDATION RESULTS: {external_validation}

Answer these questions:
1. Does my output fully satisfy the task requirements?
2. Does it meet all success criteria?
3. Are there any errors, omissions, or inconsistencies?
4. Did the external validation pass?
5. What is my confidence level (0.0 to 1.0)?
6. If confidence < 0.7, what specific improvements should I make?

Return JSON:
{
  "confidence": 0.0-1.0,
  "decision": "accept" | "retry" | "escalate",
  "issues": ["issue1", "issue2"],
  "improvements": ["improvement1", "improvement2"],
  "reasoning": "explanation of confidence score"
}
`;
```

### External Validation Hooks

The Reasoning Engine runs automated checks between OBSERVE and REFLECT:

```typescript
interface ValidationHook {
  name: string;
  applicableTo: AgentId[];
  check: (output: string, context: TaskContext) => Promise<ValidationResult>;
}

const DEFAULT_HOOKS: ValidationHook[] = [
  {
    name: 'lint-check',
    applicableTo: ['engineer'],
    check: async (output, ctx) => {
      // Run ESLint on produced code
      return runLint(ctx.outputFiles);
    },
  },
  {
    name: 'type-check',
    applicableTo: ['engineer'],
    check: async (output, ctx) => {
      // Run TypeScript compiler
      return runTypeCheck(ctx.outputFiles);
    },
  },
  {
    name: 'test-run',
    applicableTo: ['engineer', 'qa'],
    check: async (output, ctx) => {
      // Run relevant test suite
      return runTests(ctx.testSuite);
    },
  },
  {
    name: 'security-scan',
    applicableTo: ['engineer', 'security'],
    check: async (output, ctx) => {
      // Run SAST scanner
      return runSecurityScan(ctx.outputFiles);
    },
  },
  {
    name: 'schema-validation',
    applicableTo: ['ba', 'jets'],
    check: async (output, ctx) => {
      // Validate output against expected schema
      return validateSchema(output, ctx.expectedSchema);
    },
  },
];
```

### Debate Mode (for Security Agent)

```
PRODUCER AGENT (Engineer)          CRITIC AGENT (Security)
         │                                   │
         │  Produce implementation            │
         │───────────────────────────────────►│
         │                                   │  Review for vulnerabilities
         │                                   │  Score: 0.6 (issues found)
         │◄──────────────────────────────────│
         │  Fix identified issues             │
         │───────────────────────────────────►│
         │                                   │  Re-review
         │                                   │  Score: 0.9 (approved)
         │◄──────────────────────────────────│
         │                                   │
         ▼                                   ▼
    FINAL OUTPUT (reviewed and approved)
```

## Alternatives Considered

### 1. No Reasoning Loop (current single-pass)
- **Pro**: Fast, cheap, simple
- **Con**: No self-correction, no quality assurance, no confidence scoring
- **Rejected**: Cannot achieve agentic behavior without structured reasoning

### 2. Tree-of-Thought (ToT)
- **Pro**: Explores multiple reasoning paths, finds optimal solution
- **Con**: Extremely expensive (branching factor * depth * token cost), slow
- **Rejected**: Cost-prohibitive for routine SDLC tasks; may be added for high-stakes decisions only

### 3. Monte Carlo Tree Search (MCTS)
- **Pro**: Provably optimal exploration of solution space
- **Con**: Requires simulation environment, very expensive
- **Rejected**: No practical simulation environment for SDLC tasks

### 4. Fixed N-iteration loop (always run 3 times)
- **Pro**: Simple, predictable cost
- **Con**: Wastes tokens on tasks that are correct on first attempt
- **Rejected**: Confidence-based early exit is more efficient

## Consequences

### Positive
- Agent outputs are self-evaluated and confidence-scored
- External validation catches real errors (failing tests, type errors)
- Iterative refinement improves output quality (10-30% improvement expected)
- Debate mode provides adversarial review for high-stakes decisions
- Configurable per agent -- simple tasks use single-pass, complex tasks use full reflection

### Negative
- 2-3x token cost for tasks that require iteration
- Increased latency (each reasoning cycle is an additional LLM call)
- Reflection prompts consume context window budget

### Mitigations
- Confidence-based early exit prevents unnecessary iterations
- Token budget enforcement per task
- Reasoning mode configurable per agent and per task type
- Metrics track actual iteration counts for cost optimization

---

**Related ADRs**: ADR-030 (Agent Runtime), ADR-037 (Safety Mechanisms), ADR-033 (Learning System)
