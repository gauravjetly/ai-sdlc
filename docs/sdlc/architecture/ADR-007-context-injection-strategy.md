# ADR-007: Context Injection Strategy

**Date**: 2026-01-26
**Status**: PROPOSED
**Deciders**: Jets (Architect), AI Platform Team
**Technical Story**: Agent Intelligence & Governance System - Context Component

---

## Context and Problem Statement

AI agents in the SDLC framework operate with static system prompts that lack:

1. **Organizational Standards**: Agents don't know Vintiq-specific coding standards, security policies, or compliance requirements
2. **Project Context**: Agents lack awareness of the current project's tech stack, existing architecture, and team conventions
3. **Historical Knowledge**: Agents cannot reference past decisions, proven patterns, or lessons learned
4. **Live State**: Agents don't know current codebase state, open PRs, or CI/CD status

The result: Agents generate generic solutions that require significant manual adjustment to meet Vintiq standards.

**Goal**: Inject rich, relevant context into every agent prompt so responses are Vintiq-compliant by default.

## Decision Drivers

1. **Relevance**: Only inject context that improves agent output quality
2. **Token Efficiency**: LLM context windows are limited and expensive
3. **Freshness**: Context must be current, not stale
4. **Performance**: Context retrieval must not significantly slow agents
5. **Transparency**: Agents should explain what context influenced decisions

## Considered Options

### Option 1: Static Context Files (Append to System Prompt)

**Description**: Maintain static markdown files with standards and append to all agent prompts.

**Pros**:
- Simple implementation
- No runtime overhead
- Easy to update

**Cons**:
- Same context for all requests (wasteful)
- No project-specific customization
- Cannot adapt to request type
- Token inefficient (bloated prompts)

**Example**:
```
[BASE AGENT PROMPT]
[VINTIQ-STANDARDS.md - 5000 tokens]
[SECURITY-POLICIES.md - 3000 tokens]
[USER REQUEST]
```

### Option 2: Rule-Based Context Selection

**Description**: Pre-defined rules that select context based on request type, agent type, and keywords.

**Pros**:
- More targeted than static
- Predictable behavior
- No ML inference needed

**Cons**:
- Rules become complex to maintain
- Cannot handle novel requests
- Misses semantic relationships

**Example Rules**:
```yaml
rules:
  - trigger: "authentication"
    inject:
      - standards/security/authentication.yaml
      - patterns/auth/oauth2.yaml

  - trigger: "database"
    inject:
      - standards/data/persistence.yaml
      - patterns/data/repository.yaml
```

### Option 3: Semantic Context Retrieval (RAG-Based) - Selected

**Description**: Use vector similarity search to retrieve relevant context based on request semantics.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                     USER REQUEST                                 │
│     "Build user authentication API with OAuth 2.0"              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CONTEXT RETRIEVAL ENGINE                        │
│                                                                  │
│  1. EXTRACT INTENT                                               │
│     Topics: ["authentication", "API", "OAuth 2.0"]              │
│                                                                  │
│  2. QUERY CONTEXT SOURCES (Parallel)                             │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ Vintiq Standards   │ Project Context │ Memory Search  │   │
│     │                    │                 │                │   │
│     │ - Security policy  │ - Tech stack    │ - Past auth    │   │
│     │ - Auth standards   │ - ADRs          │   implementations│   │
│     │ - API guidelines   │ - Conventions   │ - Security      │   │
│     │                    │                 │   findings     │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. RANK & FILTER                                                │
│     - Relevance score (semantic similarity)                     │
│     - Priority score (source importance)                        │
│     - Recency score (prefer newer)                              │
│                                                                  │
│  4. TRIM TO TOKEN BUDGET                                         │
│     Budget: 4000 tokens for context                             │
│     Strategy: Keep highest-ranked, summarize if needed          │
│                                                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ENHANCED AGENT PROMPT                         │
│                                                                  │
│  [Base Agent Prompt]                                             │
│  ---                                                             │
│  [VINTIQ STANDARDS - 1200 tokens]                               │
│  - OAuth 2.0 with MFA required for all APIs                     │
│  - JWT tokens with 15-minute expiry                             │
│  - Refresh token rotation mandatory                             │
│  ---                                                             │
│  [PROJECT CONTEXT - 800 tokens]                                 │
│  - Stack: Node.js 20, Express, PostgreSQL                       │
│  - Existing auth: ADR-003 JWT implementation                    │
│  - Conventions: Repository pattern for data                     │
│  ---                                                             │
│  [RELEVANT MEMORIES - 600 tokens]                               │
│  - REF-AUTH-2024: OAuth implementation that worked well         │
│  - SEC-089: JWT without expiry vulnerability (avoid)            │
│  ---                                                             │
│  [ACTIVE POLICIES - 400 tokens]                                 │
│  - Test coverage: 80% minimum                                   │
│  - Security scan: No critical/high vulnerabilities              │
│  ---                                                             │
│  [USER REQUEST]                                                  │
│                                                                  │
│  Total Context: ~3000 tokens (within 4000 budget)               │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**:
- Highly relevant context for each request
- Token efficient (only includes what's needed)
- Learns from memory over time
- Adapts to novel requests

**Cons**:
- More complex implementation
- Requires embedding infrastructure
- Retrieval latency added
- Relevance depends on embedding quality

### Option 4: LLM-Driven Context Selection

**Description**: Use a smaller LLM to analyze the request and select appropriate context.

**Pros**:
- Very intelligent context selection
- Can reason about complex relationships

**Cons**:
- Additional LLM call latency and cost
- Potential for selection errors
- More complex error handling

## Decision Outcome

**Chosen Option**: **Option 3 - Semantic Context Retrieval (RAG-Based)**

### Rationale

1. **Quality**: Semantic search finds relevant context even when keywords don't match exactly
2. **Efficiency**: Only relevant context is included, optimizing token usage
3. **Synergy**: Leverages the same vector database used for memory system
4. **Adaptability**: Works for any type of request without rule maintenance
5. **Measurable**: Can track context relevance and optimize over time

## Implementation Details

### Context Source Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT PRIORITY HIERARCHY                    │
│                                                                  │
│  P1 (MANDATORY - Never Trim)                                    │
│  ├── Active Security Policies                                   │
│  ├── Active Compliance Requirements                             │
│  └── Repository/Branch Policies                                 │
│                                                                  │
│  P2 (HIGH - Trim Last)                                          │
│  ├── Vintiq Architecture Standards                              │
│  ├── Relevant Security Findings                                 │
│  └── Critical ADRs for Project                                  │
│                                                                  │
│  P3 (MEDIUM - Trim If Needed)                                   │
│  ├── Project Tech Stack                                         │
│  ├── Relevant Code Patterns                                     │
│  └── Team Conventions                                           │
│                                                                  │
│  P4 (LOWER - Trim First)                                        │
│  ├── Similar Past Implementations                               │
│  ├── Anti-patterns to Avoid                                     │
│  └── General Best Practices                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Context Retrieval Service

```typescript
// context-retrieval-service.ts

interface ContextRetrievalService {
    /**
     * Build complete context for agent request
     */
    buildContext(request: AgentRequest): Promise<EnhancedContext>;

    /**
     * Get Vintiq standards relevant to topic
     */
    getVintiqStandards(topics: string[]): Promise<VintiqStandard[]>;

    /**
     * Get project-specific context
     */
    getProjectContext(projectId: string): Promise<ProjectContext>;

    /**
     * Search memory for relevant historical context
     */
    searchMemory(query: string, options: MemorySearchOptions): Promise<Memory[]>;

    /**
     * Get active policies for context
     */
    getActivePolicies(context: PolicyContext): Promise<ActivePolicies>;

    /**
     * Trim context to fit token budget
     */
    trimContext(context: EnhancedContext, tokenBudget: number): EnhancedContext;
}

interface EnhancedContext {
    // Core context sections
    vintiqStandards: ContextSection;
    projectContext: ContextSection;
    historicalContext: ContextSection;
    activePolicies: ContextSection;

    // Metadata
    totalTokens: number;
    tokenBudget: number;
    retrievalTime: number;
    sourcesUsed: string[];
}

interface ContextSection {
    content: string;
    tokens: number;
    priority: 1 | 2 | 3 | 4;
    sources: ContextSource[];
}

interface ContextSource {
    type: "standard" | "memory" | "project" | "policy";
    id: string;
    name: string;
    relevanceScore: number;
}
```

### Token Budget Management

```typescript
// token-budget-manager.ts

const TOKEN_BUDGETS = {
    // Agent-specific budgets (portion of context window for context injection)
    conductor: 2000,
    ba: 3000,
    architect: 5000,     // Needs more context for complex decisions
    engineer: 4000,
    security: 4000,
    qa: 3000,
    atlas: 2000,
    customer: 2000
};

const SECTION_ALLOCATIONS = {
    // Percentage allocation by priority
    p1_mandatory: 0.25,    // Active policies (always included)
    p2_high: 0.35,         // Standards, security findings
    p3_medium: 0.25,       // Tech stack, patterns
    p4_lower: 0.15         // Similar implementations, anti-patterns
};

class TokenBudgetManager {
    trimToFit(context: EnhancedContext, budget: number): EnhancedContext {
        // If within budget, return as-is
        if (context.totalTokens <= budget) {
            return context;
        }

        // Calculate allocation per priority
        const allocations = this.calculateAllocations(budget);

        // Trim each section to fit allocation
        const trimmed: EnhancedContext = {
            ...context,
            vintiqStandards: this.trimSection(
                context.vintiqStandards,
                allocations.p2_high
            ),
            projectContext: this.trimSection(
                context.projectContext,
                allocations.p3_medium
            ),
            historicalContext: this.trimSection(
                context.historicalContext,
                allocations.p4_lower
            ),
            activePolicies: this.trimSection(
                context.activePolicies,
                allocations.p1_mandatory
            )
        };

        trimmed.totalTokens = this.countTokens(trimmed);
        return trimmed;
    }

    private trimSection(section: ContextSection, maxTokens: number): ContextSection {
        if (section.tokens <= maxTokens) {
            return section;
        }

        // Strategy 1: Remove lowest relevance items
        const sortedSources = section.sources
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        let trimmedContent = "";
        let tokens = 0;

        for (const source of sortedSources) {
            const sourceTokens = this.countSourceTokens(source);
            if (tokens + sourceTokens <= maxTokens) {
                trimmedContent += this.formatSource(source);
                tokens += sourceTokens;
            }
        }

        return {
            ...section,
            content: trimmedContent,
            tokens,
            sources: sortedSources.filter(s =>
                trimmedContent.includes(s.id)
            )
        };
    }
}
```

### Context Injection Template

```markdown
## CONTEXT INJECTION TEMPLATE

---BEGIN VINTIQ ENGINEERING CONTEXT---

### MANDATORY STANDARDS (Priority 1)

**Active Policies**:
{{#each activePolicies}}
- {{this.name}}: {{this.summary}}
{{/each}}

**Compliance Requirements**:
{{#each complianceRequirements}}
- {{this.standard}}: {{this.requirement}}
{{/each}}

### VINTIQ STANDARDS (Priority 2)

**Architecture**:
{{#if architecture}}
- Pattern: {{architecture.pattern}}
- Layers: {{architecture.layers}}
- Dependency Rule: {{architecture.dependencyRule}}
{{/if}}

**Security**:
{{#if security}}
- Authentication: {{security.authentication}}
- Encryption: {{security.encryption}}
- Input Validation: {{security.inputValidation}}
{{/if}}

**Relevant Security Findings**:
{{#each securityFindings}}
- {{this.id}}: {{this.summary}} (Severity: {{this.severity}})
  Lesson: {{this.lesson}}
{{/each}}

### PROJECT CONTEXT (Priority 3)

**Technology Stack**:
{{#if techStack}}
- Runtime: {{techStack.runtime}}
- Framework: {{techStack.framework}}
- Database: {{techStack.database}}
{{/if}}

**Existing Architecture**:
{{#each adrs}}
- {{this.id}}: {{this.title}} - {{this.decision}}
{{/each}}

**Team Conventions**:
{{#each conventions}}
- {{this.name}}: {{this.rule}}
{{/each}}

### HISTORICAL CONTEXT (Priority 4)

**Similar Past Implementations**:
{{#each similarImplementations}}
- {{this.ref}}: {{this.description}}
  What worked: {{this.whatWorked}}
{{/each}}

**Anti-Patterns to Avoid**:
{{#each antiPatterns}}
- {{this.name}}: {{this.description}}
  Better alternative: {{this.alternative}}
{{/each}}

---END VINTIQ ENGINEERING CONTEXT---

**IMPORTANT**: Your output will be validated against the policies above. Follow Vintiq standards to avoid rejection.

---

### YOUR TASK

{{originalRequest}}
```

### Caching Strategy

```typescript
// context-cache.ts

interface ContextCache {
    // Vintiq standards rarely change - cache aggressively
    vintiqStandards: {
        ttl: "24h",
        refreshOn: "policy_update_event"
    },

    // Project context changes occasionally
    projectContext: {
        ttl: "1h",
        refreshOn: ["commit", "adr_created", "config_change"]
    },

    // Memory search results - short cache
    memoryResults: {
        ttl: "5m",
        keyPattern: "memory:${query_hash}:${projectId}"
    },

    // Active policies - medium cache
    activePolicies: {
        ttl: "30m",
        refreshOn: "policy_update_event"
    }
}

class ContextCacheService {
    private cache: Redis;

    async getOrFetch<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number
    ): Promise<T> {
        // Check cache
        const cached = await this.cache.get(key);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fetch and cache
        const data = await fetchFn();
        await this.cache.setex(key, ttl, JSON.stringify(data));
        return data;
    }

    async invalidate(pattern: string): Promise<void> {
        const keys = await this.cache.keys(pattern);
        if (keys.length > 0) {
            await this.cache.del(...keys);
        }
    }
}
```

## Consequences

### Positive

1. **Relevance**: Agents receive highly relevant context for each request
2. **Efficiency**: Token usage optimized through prioritization and trimming
3. **Consistency**: All agents receive Vintiq standards automatically
4. **Learning**: Context quality improves as memory grows
5. **Transparency**: Can explain what context influenced decisions

### Negative

1. **Complexity**: Retrieval pipeline adds implementation complexity
2. **Latency**: Context retrieval adds 100-500ms to agent startup
3. **Embedding Dependency**: Quality depends on embedding model
4. **Cache Management**: Must handle cache invalidation properly

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Irrelevant context injected | Track relevance scores, tune retrieval |
| Context too large | Strict token budgets with priority trimming |
| Stale context | Cache TTLs + event-driven invalidation |
| Retrieval failures | Graceful degradation to static context |

## Metrics to Track

1. **Context Relevance Score**: Measure if injected context was used in response
2. **Token Efficiency**: Actual tokens used vs budget
3. **Retrieval Latency**: Time to build context
4. **Cache Hit Rate**: Percentage of requests served from cache
5. **Agent Quality Improvement**: Before/after context injection comparison

## Links

- Architecture Document: ARCH-20260126-GOVERNANCE.md
- ADR-005: Vector Database Selection
- ADR-006: Policy Engine Architecture
