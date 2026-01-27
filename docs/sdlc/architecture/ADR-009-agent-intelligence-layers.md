# ADR-009: Agent Intelligence Layers Design

**Date**: 2026-01-26
**Status**: PROPOSED
**Deciders**: Jets (Architect), AI Platform Team, Engineering Leadership
**Technical Story**: Agent Intelligence & Governance System - Intelligence Component

---

## Context and Problem Statement

Current AI-SDLC agents operate as stateless executors with no:

1. **Memory Awareness**: Cannot recall past work or apply learned patterns
2. **Policy Enforcement**: Execute any request without checking governance rules
3. **Context Understanding**: Lack organizational and project-specific knowledge
4. **Self-Improvement**: No mechanism to learn from outcomes

We need a **layered intelligence architecture** that progressively enhances agent capabilities while maintaining separation of concerns.

## Decision Drivers

1. **Modularity**: Each intelligence capability should be independent and testable
2. **Performance**: Layers should not add excessive latency
3. **Graceful Degradation**: If a layer fails, agents should continue with reduced capability
4. **Observability**: Must be able to trace which layers influenced decisions
5. **Extensibility**: Easy to add new intelligence layers in the future

## Decision Outcome

We will implement a **5-Layer Intelligence Architecture** where each layer adds a specific capability:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: SELF-IMPROVING (Future)                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Analyzes past performance                                          │   │
│  │ - Identifies knowledge gaps                                          │   │
│  │ - Flags low-confidence requests for review                          │   │
│  │ - Suggests prompt improvements                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: CONTEXT-AWARE                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Injects Deltek engineering standards                              │   │
│  │ - Loads project-specific context (tech stack, ADRs)                 │   │
│  │ - Retrieves team conventions                                        │   │
│  │ - Adds compliance requirements                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: POLICY-AWARE                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Pre-checks: Is this request allowed?                              │   │
│  │ - During-gen checks: Validate code as generated                     │   │
│  │ - Post-checks: Validate completed output                            │   │
│  │ - Blocks or auto-corrects violations                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: MEMORY-AUGMENTED                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Searches for similar past implementations                         │   │
│  │ - Retrieves proven code patterns                                    │   │
│  │ - Loads relevant security findings                                  │   │
│  │ - Identifies anti-patterns to avoid                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: BASE AGENT (Current State)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Executes tasks based on system prompt                             │   │
│  │ - Uses tools (Read, Write, Edit, Bash, etc.)                       │   │
│  │ - Returns response to user                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POST-EXECUTION                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Policy validation of output                                        │   │
│  │ - Memory storage (capture learnings)                                │   │
│  │ - Metrics collection                                                │   │
│  │ - Feedback loop                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Layer Specifications

### Layer 1: Base Agent (Current - No Changes)

**Purpose**: Execute tasks using LLM capabilities and tools.

**Characteristics**:
- Stateless execution
- Tool access (Read, Write, Edit, Bash, Glob, Grep)
- System prompt defines behavior
- No memory between sessions
- No policy awareness

**Implementation**: Existing agent infrastructure (Claude Code)

### Layer 2: Memory-Augmented Agent

**Purpose**: Enhance agents with organizational knowledge retrieval.

**Capabilities**:
```typescript
interface MemoryAugmentedLayer {
    // Find similar past work
    searchSimilarWork(request: string): Promise<Memory[]>;

    // Get proven patterns for task type
    getProvenPatterns(taskType: string): Promise<CodePattern[]>;

    // Get security findings to consider
    getSecurityFindings(topics: string[]): Promise<SecurityFinding[]>;

    // Get anti-patterns to avoid
    getAntiPatterns(topics: string[]): Promise<AntiPattern[]>;
}
```

**Processing Flow**:
```
Request: "Build user authentication"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY SEARCH                                 │
│                                                                  │
│  1. Parse intent: ["authentication", "user", "security"]        │
│                                                                  │
│  2. Search collections:                                          │
│     ├── code_patterns: "authentication implementation"          │
│     ├── security_findings: "authentication vulnerabilities"     │
│     └── failed_approaches: "authentication anti-patterns"       │
│                                                                  │
│  3. Rank by relevance + quality + recency                       │
│                                                                  │
│  4. Return top results:                                          │
│     - PATTERN-AUTH-001: OAuth 2.0 with refresh rotation         │
│     - SEC-2024-089: JWT without expiry (AVOID)                  │
│     - ANTI-001: Storing passwords in plain text (AVOID)         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
    Enhanced Request with Memory Context
```

**Output Enhancement**:
```markdown
### RELEVANT MEMORIES

**Proven Patterns**:
- PATTERN-AUTH-001: OAuth 2.0 with refresh token rotation (quality: 0.92)
  Use this pattern for API authentication.

**Security Findings to Consider**:
- SEC-2024-089: JWT tokens without expiry are vulnerable
  ALWAYS set expiresIn when creating JWTs.

**Approaches to Avoid**:
- ANTI-001: Never store passwords in plain text
- ANTI-015: Don't roll your own crypto
```

**Metrics**:
- Memory hit rate (% of requests with relevant memories)
- Relevance scores
- Pattern reuse rate
- Time to retrieve

### Layer 3: Policy-Aware Agent

**Purpose**: Enforce governance rules before, during, and after generation.

**Capabilities**:
```typescript
interface PolicyAwareLayer {
    // Pre-generation validation
    preCheck(context: PolicyContext): Promise<PolicyResult>;

    // During-generation validation (streaming)
    streamCheck(chunk: CodeChunk): PolicyResult;

    // Post-generation validation
    postCheck(output: GenerationOutput): Promise<PolicyResult>;

    // Auto-fix capabilities
    suggestFix(violation: PolicyViolation): Promise<FixSuggestion>;
}
```

**Processing Flow**:
```
Request: "Create a database query function"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRE-CHECK                                     │
│                                                                  │
│  ✓ Repository: github.com/DLTKEngineering/... (ALLOWED)         │
│  ✓ User: has 'developer' role (AUTHORIZED)                      │
│  ✓ Context: Architecture doc exists (READY)                     │
│                                                                  │
│  RESULT: PROCEED                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
    Agent Generates Code...
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STREAM-CHECK (Real-time)                      │
│                                                                  │
│  Chunk: "const query = `SELECT * FROM users WHERE id = ${id}`"  │
│                                                                  │
│  ❌ VIOLATION DETECTED:                                          │
│     Policy: security.sql_injection                               │
│     Severity: CRITICAL                                           │
│     Message: String interpolation in SQL query                   │
│                                                                  │
│  AGENT AUTO-CORRECTION:                                          │
│  "I'll use parameterized queries instead:                       │
│   const query = 'SELECT * FROM users WHERE id = $1'"            │
│                                                                  │
│  RESULT: CORRECTED AND CONTINUE                                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST-CHECK                                    │
│                                                                  │
│  ✓ Test coverage: 85% (minimum: 80%)                            │
│  ✓ Security scan: No critical/high findings                     │
│  ✓ Architecture: Follows layered pattern                        │
│  ✓ No hardcoded secrets                                          │
│                                                                  │
│  RESULT: APPROVED                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Enforcement Actions**:

| Violation Severity | Action | Agent Behavior |
|--------------------|--------|----------------|
| Critical | BLOCK | Stop immediately, require human fix |
| High | BLOCK or AUTO-FIX | Try to fix, block if can't |
| Medium | WARN | Continue with warning in output |
| Low | LOG | Note for review, continue |

**Metrics**:
- Violation count by category
- Auto-fix success rate
- Block rate
- False positive rate

### Layer 4: Context-Aware Agent

**Purpose**: Inject organizational and project-specific knowledge.

**Capabilities**:
```typescript
interface ContextAwareLayer {
    // Get Deltek engineering standards
    getDeltekStandards(topics: string[]): Promise<DeltekStandard[]>;

    // Get project-specific context
    getProjectContext(projectId: string): Promise<ProjectContext>;

    // Get team conventions
    getTeamConventions(projectId: string): Promise<Convention[]>;

    // Get compliance requirements
    getComplianceRequirements(scopes: string[]): Promise<ComplianceRule[]>;
}
```

**Processing Flow**:
```
Request: "Build payment processing feature"
Project: billing-service
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT GATHERING                             │
│                                                                  │
│  1. DELTEK STANDARDS                                             │
│     - Security: PCI-DSS compliance required for payments        │
│     - Architecture: Layered pattern mandatory                   │
│     - Encryption: AES-256 for card data                         │
│                                                                  │
│  2. PROJECT CONTEXT                                              │
│     - Tech stack: Node.js, Express, PostgreSQL                  │
│     - Existing: PaymentGateway interface defined                │
│     - ADR-007: Stripe as payment processor                      │
│                                                                  │
│  3. TEAM CONVENTIONS                                             │
│     - All currency in cents (integer)                           │
│     - Repository pattern for data access                        │
│     - Error codes: PAY_001, PAY_002, etc.                       │
│                                                                  │
│  4. COMPLIANCE                                                   │
│     - PCI-DSS: Never log card numbers                           │
│     - SOX: Audit trail for all transactions                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
    Enhanced Request with Full Context
```

**Context Injection**:
```markdown
### DELTEK ENGINEERING STANDARDS

**Security Requirements (PCI-DSS)**:
- Never store full card numbers
- Encrypt all card data at rest (AES-256)
- Use tokenization for recurring payments
- Log all payment events (no card data in logs)

**Architecture Requirements**:
- Follow layered architecture
- PaymentService in application layer
- PaymentRepository interface in domain layer
- StripeGateway in infrastructure layer

### PROJECT CONTEXT

**Technology Stack**:
- Runtime: Node.js 20.x
- Framework: Express 4.x
- Database: PostgreSQL 15

**Existing Architecture**:
- PaymentGateway interface exists (src/domain/payment-gateway.ts)
- ADR-007: Use Stripe as payment processor

**Team Conventions**:
- Currency stored as cents (integer)
- Use repository pattern
- Payment error codes: PAY_XXX

### COMPLIANCE

- PCI-DSS: Required for this feature
- SOX: Audit logging mandatory
```

**Metrics**:
- Context relevance score
- Token usage efficiency
- Context retrieval time
- Cache hit rate

### Layer 5: Self-Improving Agent (Future)

**Purpose**: Enable agents to learn from outcomes and improve over time.

**Capabilities** (Future Implementation):
```typescript
interface SelfImprovingLayer {
    // Analyze past performance
    analyzePerformance(agentType: string, taskType: string): Promise<PerformanceMetrics>;

    // Identify knowledge gaps
    identifyKnowledgeGaps(request: string): Promise<KnowledgeGap[]>;

    // Calculate confidence score
    calculateConfidence(request: string, context: EnhancedContext): number;

    // Flag for human review when uncertain
    flagForReview(reason: string): void;

    // Apply learned improvements
    applyImprovements(taskType: string): Promise<Improvement[]>;
}
```

**Future Processing Flow**:
```
Request: "Implement SAML authentication"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIDENCE ANALYSIS                           │
│                                                                  │
│  1. Check past SAML implementations: 2 found                    │
│  2. Check success rate: 1 success, 1 failure                    │
│  3. Analyze failure: Complex IdP configuration                  │
│  4. Check current knowledge: Limited SAML memories              │
│                                                                  │
│  CONFIDENCE SCORE: 0.45 (Low)                                   │
│                                                                  │
│  RECOMMENDATION: Flag for senior review                         │
│                                                                  │
│  KNOWLEDGE GAPS IDENTIFIED:                                      │
│  - SAML assertion validation                                    │
│  - IdP metadata handling                                        │
│  - Session management with SAML                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
    Agent proceeds with review flag
```

**Deferred to Phase 2**: This layer requires:
- Sufficient historical data
- Feedback collection mechanism
- Human-in-the-loop infrastructure
- Confidence calibration

## Layer Orchestration

### Orchestrator Implementation

```typescript
// intelligence-orchestrator.ts

class IntelligenceOrchestrator {
    private layers: IntelligenceLayer[] = [];

    constructor() {
        // Register layers in processing order
        this.layers = [
            new MemoryAugmentedLayer(),     // Layer 2
            new PolicyAwareLayer(),          // Layer 3
            new ContextAwareLayer(),         // Layer 4
            // new SelfImprovingLayer(),     // Layer 5 (future)
        ];
    }

    async processRequest(request: AgentRequest): Promise<EnhancedRequest> {
        let enhanced: LayerOutput = {
            request,
            memories: [],
            policies: [],
            context: null,
            confidence: 1.0,
            blocked: false
        };

        const metrics: LayerMetrics[] = [];

        for (const layer of this.layers) {
            const startTime = Date.now();

            try {
                enhanced = await layer.process(enhanced);

                metrics.push({
                    layer: layer.name,
                    duration: Date.now() - startTime,
                    success: true,
                    dataAdded: this.measureDataAdded(layer.name, enhanced)
                });

                // Stop if blocked by policy
                if (enhanced.blocked) {
                    return this.buildBlockedResponse(enhanced, metrics);
                }

            } catch (error) {
                // Graceful degradation - log and continue
                console.error(`Layer ${layer.name} failed:`, error);
                metrics.push({
                    layer: layer.name,
                    duration: Date.now() - startTime,
                    success: false,
                    error: error.message
                });
            }
        }

        return this.buildEnhancedRequest(enhanced, metrics);
    }

    private buildEnhancedRequest(
        output: LayerOutput,
        metrics: LayerMetrics[]
    ): EnhancedRequest {
        return {
            originalRequest: output.request.content,
            enhancedPrompt: this.formatEnhancedPrompt(output),
            layersApplied: metrics.filter(m => m.success).map(m => m.layer),
            totalLatency: metrics.reduce((sum, m) => sum + m.duration, 0),
            metadata: {
                memoryHits: output.memories.length,
                policiesActive: output.policies.length,
                contextTokens: this.countTokens(output.context),
                confidence: output.confidence
            }
        };
    }
}
```

### Layer Communication Contract

```typescript
// layer-contract.ts

interface LayerInput {
    request: AgentRequest;
    memories: Memory[];
    policies: Policy[];
    context: EnhancedContext | null;
    confidence: number;
    blocked: boolean;
    blockReason?: string;
    metadata: Record<string, any>;
}

interface LayerOutput extends LayerInput {
    // Each layer adds to this
}

interface IntelligenceLayer {
    name: string;
    priority: number;

    // Process and enhance the request
    process(input: LayerInput): Promise<LayerOutput>;

    // Health check
    isHealthy(): Promise<boolean>;

    // Graceful shutdown
    shutdown(): Promise<void>;
}
```

## Error Handling and Graceful Degradation

```typescript
// graceful-degradation.ts

const DEGRADATION_POLICY = {
    memoryAugmented: {
        // If memory search fails
        fallback: "Continue without memories",
        impact: "Agent won't have historical context",
        severity: "medium"
    },

    policyAware: {
        // If policy engine fails
        fallback: "Enable warn-only mode, log all actions",
        impact: "Violations not blocked, but logged",
        severity: "high",
        alertThreshold: 3 // Alert after 3 consecutive failures
    },

    contextAware: {
        // If context retrieval fails
        fallback: "Use cached or static context",
        impact: "Context may be stale",
        severity: "medium"
    },

    selfImproving: {
        // If confidence calculation fails
        fallback: "Assume medium confidence, continue",
        impact: "May miss review flagging",
        severity: "low"
    }
};

class GracefulDegradationHandler {
    private failureCounts: Map<string, number> = new Map();

    handleLayerFailure(layer: string, error: Error): DegradationAction {
        const policy = DEGRADATION_POLICY[layer];
        const count = (this.failureCounts.get(layer) || 0) + 1;
        this.failureCounts.set(layer, count);

        // Log failure
        this.logFailure(layer, error, count);

        // Alert if threshold exceeded
        if (policy.alertThreshold && count >= policy.alertThreshold) {
            this.sendAlert(layer, count, error);
        }

        return {
            action: policy.fallback,
            impact: policy.impact,
            continueProcessing: true
        };
    }
}
```

## Metrics and Observability

```typescript
// layer-metrics.ts

interface LayerMetrics {
    timestamp: Date;

    // Performance
    latencyMs: number;
    memoryUsageMb: number;

    // Layer-specific
    layer: string;
    success: boolean;
    dataProcessed: {
        inputItems: number;
        outputItems: number;
        tokensAdded: number;
    };

    // Quality
    relevanceScore?: number;  // For memory layer
    violationsFound?: number; // For policy layer
    confidence?: number;      // For self-improving layer

    // Errors
    error?: {
        type: string;
        message: string;
        stack?: string;
    };
}

// Dashboard metrics
const METRICS_DASHBOARD = {
    "Layer Performance": {
        "Average Latency by Layer": "histogram",
        "Layer Success Rate": "gauge",
        "Total Processing Time": "timer"
    },

    "Memory Layer": {
        "Memory Hit Rate": "percentage",
        "Average Relevance Score": "gauge",
        "Patterns Reused": "counter"
    },

    "Policy Layer": {
        "Violations Blocked": "counter",
        "Auto-Fix Success Rate": "percentage",
        "False Positive Rate": "percentage"
    },

    "Context Layer": {
        "Token Efficiency": "percentage",
        "Cache Hit Rate": "percentage",
        "Context Relevance": "gauge"
    }
};
```

## Implementation Timeline

| Phase | Layer | Timeline | Dependencies |
|-------|-------|----------|--------------|
| 1 | Memory-Augmented (L2) | Weeks 1-4 | ChromaDB setup, Embedding service |
| 2 | Policy-Aware (L3) | Weeks 5-7 | Policy YAML definitions |
| 3 | Context-Aware (L4) | Weeks 8-10 | Context sources setup |
| 4 | Orchestrator | Week 11 | All layers complete |
| 5 | Self-Improving (L5) | TBD | Sufficient data, feedback mechanism |

## Consequences

### Positive

1. **Modular Enhancement**: Each layer can be developed and tested independently
2. **Graceful Degradation**: Layer failures don't crash the system
3. **Observable**: Clear metrics for each layer's contribution
4. **Extensible**: Easy to add new layers in the future
5. **Testable**: Layers can be mocked for testing

### Negative

1. **Latency**: Multiple layers add processing time
2. **Complexity**: More components to maintain
3. **State Management**: Must coordinate between layers

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Layer latency cascade | Parallel processing where possible, strict timeouts |
| Layer conflict | Clear priority ordering, conflict resolution rules |
| Over-engineering | Start simple, add complexity based on evidence |
| Maintenance burden | Comprehensive testing, good documentation |

## Links

- Architecture Document: ARCH-20260126-GOVERNANCE.md
- ADR-005: Vector Database Selection
- ADR-006: Policy Engine Architecture
- ADR-007: Context Injection Strategy
- ADR-008: Memory Storage Format
