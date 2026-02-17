# ADR-041: Smart Routing Architecture

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Conductor (Orchestrator)
**Related**: ARCH-20260216-CLAUDE-AISDLC-INTEGRATION, ADR-040

---

## Context

Once a user message is classified, it must be routed to the appropriate handler. Simple questions should pass through to Claude directly. Code changes should flow through SDLC agents. Emergencies need immediate expert attention. The routing must respect the configured governance level and apply appropriate quality gates.

## Decision

**We will use a Strategy Pattern with Chain of Responsibility for routing, where each request type maps to a named routing strategy that determines which agents are involved, what phases run, and what governance gates apply.**

### Routing Strategies

Eight named strategies handle all request types:

| Strategy | Description | Agents Involved | Avg Duration |
|---|---|---|---|
| `passthrough` | Direct to Claude, log only | None | 0s overhead |
| `optimized` | Single agent, minimal governance | 1-2 agents | 1-5m |
| `light-sdlc` | Abbreviated workflow, core phases | 2-3 agents | 5-10m |
| `full-sdlc` | Complete workflow, all required phases | 4-6 agents | 15-30m |
| `emergency` | Fastest resolution, minimal gates | ask-tom + eng | 2-5m |
| `architecture` | Architecture-focused, design phases | ba + jets + sec | 20m |
| `review` | Targeted code/security review | sec + qa | 10m |
| `devops` | Infrastructure and deployment | atlas + sec | 10m |

### Routing Logic

```
classify(message) --> RequestClassification
                          |
                          v
                    route(classification, governanceLevel)
                          |
                          v
                    RoutingDecision {
                      strategy: RoutingStrategy,
                      phases: SDLCPhase[],
                      agents: AgentId[],
                      governanceLevel: GovernanceLevel,
                      sdlcCommand: string | null,
                      blocking: boolean,
                      parallel: boolean
                    }
```

### Governance Interaction

The router applies governance rules based on the configured level:

- **Level 1**: All strategies available; no blocking gates; tracking only
- **Level 2**: Security and QA gates are advisory (non-blocking)
- **Level 3**: Security and QA gates are blocking; complex changes need architecture review
- **Level 4**: All gates blocking; approval workflow required; no bypasses

### Phase Selection Algorithm

```
requiredPhases = basePhases(strategy)
  + governanceLevelPhases(level)
  + branchProtectionPhases(branch)
  - skipPhases(classification.complexity === 'trivial')
```

### Integration with Context Injection

For SDLC-routed requests, the router produces a context injection string that is appended to the user message before Claude processes it. This instructs Claude to use the appropriate MCP tools:

```
[AISDLC CONTEXT]
Classification: code-change (medium complexity)
Strategy: full-sdlc
Required phases: requirements, architecture, implementation, security, testing
Governance: Level 2 (Light)
Instructions: Use the aisdlc_start_workflow MCP tool to begin this governed workflow.
              Pass the user's original request as the description parameter.
[/AISDLC CONTEXT]
```

## Alternatives Considered

### Alternative 1: Single Strategy (Always Full SDLC)
- **Description**: Route everything through the full SDLC pipeline
- **Pros**: Simple; consistent; maximum governance
- **Cons**: Massive overhead for simple questions; 15+ minute wait for "What is React?"
- **Rejected because**: Unusable for real development. Users would disable the system immediately.

### Alternative 2: Binary Router (SDLC or Not)
- **Description**: Either full SDLC or passthrough, nothing in between
- **Pros**: Simple to implement; easy to understand
- **Cons**: No optimized paths for trivial changes; no emergency handling; no architectural focus
- **Rejected because**: Missing the nuance. A typo fix does not need the same process as a new authentication system.

### Alternative 3: User-Selected Routing
- **Description**: Let the user choose the routing via prefix commands (/sdlc, /quick, /emergency)
- **Pros**: User is always in control; no classification errors
- **Cons**: Defeats the purpose of automatic governance; users will always choose /quick; no enforcement
- **Rejected because**: Does not solve the governance problem. The goal is that the system makes intelligent decisions automatically.

### Alternative 4: ML-Based Routing Model
- **Description**: Train a model to predict the optimal routing strategy
- **Pros**: Could learn from historical outcomes; highly optimized over time
- **Cons**: Cold start; requires labeled routing data; complex to train and maintain
- **Rejected because**: Premature optimization. The strategy pattern is deterministic, predictable, and sufficient. ML routing can be added later if the strategy mapping proves inadequate.

## Consequences

### Positive
- Clear, deterministic mapping from classification to routing strategy
- Each strategy is independently configurable and testable
- Governance levels overlay cleanly onto routing decisions
- New strategies can be added without modifying existing ones
- Context injection is non-invasive (Claude can still operate normally)

### Negative
- 8 strategies to maintain and test
- Routing matrix (type x complexity x governance) has many combinations
- Context injection adds tokens to every SDLC-routed message
- Strategy selection logic must be kept in sync with classification output

### Neutral
- The routing matrix is documented in the architecture doc for transparency
- Per-project overrides allow customization without changing core logic
- Routing decisions are logged for audit and learning
