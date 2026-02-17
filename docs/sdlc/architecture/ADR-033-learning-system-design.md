# ADR-033: Learning System Design - Outcome-Based Continuous Learning

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), QA Agent (Quality)
**Context**: Agentic AI Platform Transformation

---

## Context

The current learning engine uses regex pattern matching to detect errors, best practices, and security insights in agent output text. This is brittle (misses paraphrased insights), shallow (cannot understand nuanced learnings), and disconnected from outcomes (does not know if a learning actually helped).

For a truly self-improving system, learning must be:
- **LLM-powered** -- Use the LLM itself to extract insights from agent work
- **Outcome-linked** -- Track whether applying a learning improved or worsened results
- **Automatically triggered** -- Capture learnings without manual intervention
- **Quality-gated** -- Prevent bad learnings from propagating
- **Measurable** -- Track learning velocity and effectiveness

## Decision

**Implement an outcome-based continuous learning system with LLM-powered extraction, effectiveness tracking, and automatic knowledge lifecycle management.**

### Learning Pipeline

```
AGENT OUTPUT
     │
     ▼
[LLM EXTRACTION] ──► "What did this agent learn? What patterns emerged?
     │                  What mistakes were made? What would you do differently?"
     │
     ▼
[STRUCTURED LEARNING]
     │
     ├── Title: "OAuth callback must include state parameter"
     ├── Category: security-insight
     ├── Confidence: emerging
     ├── ApplicableTo: [engineer, security]
     ├── Evidence: {task output, validation results}
     └── Embedding: vector(3072)
     │
     ▼
[DEDUPLICATION] ──► Search semantic memory for similar knowledge
     │                If > 0.9 similarity, merge with existing entry
     │                If 0.7-0.9, link as related
     │                If < 0.7, create new entry
     │
     ▼
[STORAGE] ──► Semantic Memory (pgvector)
     │
     ▼
[PROPAGATION] ──► Event Bus: learning.discovered
     │              │
     │              ▼
     │         Subscribed agents receive notification
     │
     ▼
[OUTCOME TRACKING]
     │
     ├── When learning is applied: learning.applied event
     ├── Track: did applying this learning improve task outcome?
     ├── If positive outcome: increase confidence
     ├── If negative outcome: decrease confidence, flag for review
     └── If no effect: no change
```

### Outcome Tracking

```typescript
interface LearningOutcome {
  learningId: string;
  taskId: string;
  agentId: AgentId;
  applied: boolean;               // Was this learning used?
  taskOutcome: 'success' | 'failure' | 'partial';
  attributedToLearning: boolean;  // Did the learning help?
  notes: string;
}

// Confidence evolution based on outcomes:
// speculative -> emerging -> established -> proven
//
// Promotion rules:
//   emerging:     1+ positive outcomes
//   established:  3+ positive outcomes from 2+ agents
//   proven:       5+ positive outcomes from 3+ agents, 0 negative
//
// Demotion rules:
//   Any confidence:  2+ negative outcomes -> flag for review
//   proven/established:  3+ negative -> demote one level
//   Any:  6 months without use -> deprecated
```

### LLM-Powered Extraction

Replace regex detection with structured LLM calls:

```typescript
async function extractLearnings(agentOutput: string, taskContext: TaskNode): Promise<Learning[]> {
  const prompt = `
    Analyze the following agent output from a ${taskContext.type} task.
    Extract any learnings, patterns, or insights that would be valuable
    for future tasks.

    For each learning, provide:
    - title: A concise, searchable title
    - description: Detailed explanation
    - category: One of [best-practice, anti-pattern, error-pattern,
      security-insight, performance-insight, architecture-decision,
      integration-pattern, process-improvement]
    - applicableAgents: Which agents should know this
    - actionable: Specific action to take based on this learning

    Agent output:
    ${agentOutput}

    Task context:
    ${JSON.stringify(taskContext)}

    Return JSON array of learnings.
  `;

  return await llm.structured(prompt, LearningArraySchema);
}
```

### Knowledge Lifecycle

```
                KNOWLEDGE LIFECYCLE
                ═══════════════════

  [Created]  ──►  [Emerging]  ──►  [Established]  ──►  [Proven]
     │                │                  │                  │
     │                │                  │                  │
     ▼                ▼                  ▼                  ▼
  (negative       (negative          (negative          (negative
   outcomes)       outcomes)          outcomes)          outcomes)
     │                │                  │                  │
     ▼                ▼                  ▼                  ▼
  [Deprecated]   [Flagged for      [Demoted to        [Demoted to
                  Review]           Emerging]           Established]

  Time-based deprecation:
  - Not accessed in 6 months → deprecated
  - Superseded by newer knowledge → superseded
```

## Alternatives Considered

### 1. Continue with Regex Pattern Detection
- **Pro**: No additional LLM cost, fast
- **Con**: Misses nuanced insights, brittle, no outcome tracking
- **Rejected**: Fundamentally cannot achieve self-improving behavior

### 2. Fine-tune a Learning Classifier
- **Pro**: Fast inference, specialized to our domain
- **Con**: Needs training data we do not have yet; maintenance burden
- **Rejected**: Premature optimization; LLM extraction is more flexible during early phases

### 3. Human-Curated Knowledge Only
- **Pro**: High quality, no hallucination risk
- **Con**: Does not scale, defeats the purpose of autonomous learning
- **Rejected**: Human review is part of the quality gate, not the primary mechanism

## Consequences

### Positive
- Learnings are semantically rich and actionable
- Outcome tracking enables self-improvement measurement
- Automatic deduplication prevents knowledge bloat
- Confidence lifecycle prevents stale knowledge
- LLM extraction catches insights regex would miss

### Negative
- Additional LLM API calls (cost ~$0.01-0.05 per extraction)
- Risk of LLM hallucinating learnings that are not real
- Outcome attribution is imprecise (correlation vs causation)

### Mitigations
- Budget cap on learning extraction calls
- Human review for any learning promoted to "proven"
- Statistical significance thresholds for outcome attribution

---

**Related ADRs**: ADR-032 (Memory Architecture), ADR-030 (Agent Runtime)
