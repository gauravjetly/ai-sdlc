# ADR-040: Request Classification Strategy

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Conductor (Orchestrator)
**Related**: ARCH-20260216-CLAUDE-AISDLC-INTEGRATION

---

## Context

To make AI-SDLC the default operating system for Claude Code, every user message must be automatically classified to determine whether it requires SDLC governance or can pass through directly to Claude. The classifier must be fast (to avoid annoying the user), accurate (to avoid false positives/negatives), and context-aware (to consider git state, project type, and conversation history).

## Decision

**We will use a two-tier hybrid classification strategy: rule-based heuristics (Tier 1) with LLM-based classification (Tier 2) as fallback.**

### Tier 1: Rule-Based Classification
- Pattern matching with regex and keyword analysis
- Runs in < 50ms
- Handles obvious cases (questions, trivial changes, emergencies)
- Returns immediately if confidence >= 0.9

### Tier 2: LLM-Based Classification
- Uses Claude Haiku for speed and cost efficiency
- Structured JSON output (no free-form parsing)
- Context-enriched with git status, file list, conversation history
- Runs in < 2 seconds
- Used when Tier 1 confidence < 0.9

### Merge Strategy
- Results from both tiers are combined
- Higher confidence score wins
- Disagreements are logged for learning

### Classification Output
- 11 request types (qa, explanation, code-change, bug-fix, architecture, review, emergency, devops, documentation, testing, configuration)
- 5 complexity levels (trivial, simple, medium, complex, epic)
- 4 urgency levels (low, normal, high, critical)
- Confidence score (0.0 to 1.0)
- Boolean: requiresSDLC
- Required and optional SDLC phases

## Alternatives Considered

### Alternative 1: LLM-Only Classification
- **Description**: Use Claude Haiku for every classification
- **Pros**: Higher accuracy; context-aware; fewer edge cases
- **Cons**: 1-2 second latency on every message; token cost; network dependency
- **Rejected because**: Latency on simple Q&A is unacceptable. Users asking "What is React?" should not wait 2 seconds for classification.

### Alternative 2: Rule-Only Classification
- **Description**: Use only regex and keyword patterns
- **Pros**: Zero latency; no token cost; no network dependency; deterministic
- **Cons**: Cannot understand nuanced requests; high false positive/negative rate; brittle; requires constant maintenance
- **Rejected because**: Cannot handle ambiguous messages like "Can you refactor the auth module to use strategy pattern?" which requires understanding that this is both a code change and an architecture decision.

### Alternative 3: Fine-Tuned Small Model
- **Description**: Train a small classifier model on labeled SDLC data
- **Pros**: Fast inference; high accuracy once trained; no per-call cost
- **Cons**: Requires training data (cold start problem); model maintenance; deployment complexity; cannot adapt to new patterns without retraining
- **Rejected because**: Cold start problem is significant. We do not have 10,000+ labeled examples to train on. The hybrid approach builds this dataset over time.

### Alternative 4: Embedding-Based Classification
- **Description**: Embed messages and compare to category centroids
- **Pros**: Fast once embeddings are cached; semantic understanding
- **Cons**: Requires pre-computed category embeddings; may not handle multi-category messages; embedding API dependency
- **Rejected because**: Category boundaries are too fluid. "Fix the security bug in the auth system" spans bug-fix, security, and code-change categories. LLM classification handles this ambiguity better.

## Consequences

### Positive
- Fast path for obvious cases (Q&A, trivial) -- < 50ms overhead
- Accurate classification for complex cases via LLM
- Classification data builds a training dataset for future improvements
- Disagreements between tiers generate learning events
- Cache reduces LLM calls for repeated similar messages

### Negative
- Two systems to maintain (rules + LLM prompt)
- LLM classification adds 1-2 second latency for non-obvious cases
- Token cost for Tier 2 (~100 tokens per classification)
- Risk of rules and LLM drifting apart

### Neutral
- Classification accuracy will improve over time as rules are refined
- Per-project classification rules can be added via .aisdlc.yml
- Cache TTL balances freshness vs. cost

## Compliance

- Classification results are logged to the request registry for audit
- No sensitive user data is stored in classification results (messages are hashed)
- LLM classification prompts contain no PII

## Notes

- The labeled test dataset (500+ cases) will be built during Phase 1
- Classification accuracy target: > 90% against labeled dataset
- Monitor false positive rate (Q&A sent to SDLC) and false negative rate (code changes not caught)
- Plan to evolve to Tier 3 (fine-tuned model) once sufficient labeled data exists (10,000+ examples)
