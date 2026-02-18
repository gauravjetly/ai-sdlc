# ADR-036: Autonomous Event Trigger Design

**Status**: Proposed
**Date**: 2026-02-17
**Author**: Jets (World-Class Architect)
**Context**: ARCH-20260217-EXEC-AGENT-V2

---

## Context

The Exec Agent V1 supports event-driven presentation updates through its `EventOrchestrator`, which subscribes to 10 SDLC event types and routes them to handlers:

- `ProjectEventHandler`: project.completed, project.updated, architecture.updated
- `SecurityEventHandler`: security.scan_completed, vulnerability.found, vulnerability.fixed
- `FeedbackEventHandler`: uat.completed, customer.feedback_received, quality.gate_passed, tests.failed

The V1 `AutoUpdater` can regenerate presentations when triggered by these events. However, the current design has critical limitations:

1. **Reactive only**: Someone must manually create the initial presentation. Events only trigger *updates* to existing presentations, never *creation* of new ones.
2. **No decision intelligence**: Every matching event triggers an update, regardless of whether the change is significant enough to warrant regeneration.
3. **No storm protection**: Rapid-fire events (e.g., 10 code commits in 5 minutes) would trigger 10 redundant regenerations.
4. **No priority ordering**: A security-critical event and a minor status update are treated identically.
5. **No proactive behavior**: The agent cannot suggest presentations based on detected patterns.

Making the Exec Agent "fully agentic" requires it to autonomously decide **when to generate**, **what to generate**, **for whom**, and **at what priority**, while preventing runaway behavior.

## Decision

Implement an **Autonomous Behavior Engine (ABE)** with four components: a configurable rule set, a cooldown manager, a priority queue, and a queue processor. The ABE sits between the event stream and the V1 generation pipeline.

### Architecture

```
Event Stream -> Event Classifier -> Decision Rules -> Cooldown Check
                                                           |
                                                     PASS  |  SKIP
                                                      |    |    |
                                                      v    |    v
                                                 Priority  | Log reason
                                                  Queue    |
                                                      |    |
                                                      v    |
                                                 Queue     |
                                                 Processor |
                                                      |    |
                                                      v    |
                                                 V1 Pipeline
```

### Component Details

**1. Decision Rules Engine**

A configurable set of `TriggerRule` objects evaluated against incoming events. Each rule specifies:

- **Event pattern**: Which event type triggers this rule
- **Conditions**: Predicate expressions that must ALL be true (e.g., `"change_significance > 0.3"`)
- **Action**: What to do when the rule fires (`generate`, `update`, `suggest`, `self-improve`)
- **Cooldown**: Minimum minutes between consecutive firings of this rule for the same project
- **Priority**: `critical > high > normal > low`

Initial rule set: 12 rules covering project completion, architecture changes, security findings, weekly status, milestones, cost overruns, quality failures, deployment completion, code commit batching, staleness detection, quality degradation, and sprint boundaries.

Rules are stored in `~/.claude/exec-agent-memory/config/autonomous-rules.json` and can be modified without code changes.

**2. Cooldown Manager**

Prevents generation storms with per-rule, per-project timers:

- Each `(rule_id, project_id)` pair has an independent cooldown
- The cooldown starts when the rule fires (after conditions are met)
- While cooling down, the rule is skipped with a logged reason
- `priority="critical"` bypasses ALL cooldowns (for security incidents)
- Skip count is tracked per rule for analytics

**3. Priority Queue**

Actions that pass the cooldown check are enqueued by priority:

- 4 priority levels: critical (0), high (1), normal (2), low (3)
- FIFO within each priority level
- Maximum queue depth: 20 actions (shed load if overwhelmed)
- Actions expire after 4 hours if not processed
- Expired actions are logged for analytics

**4. Queue Processor**

Dequeues actions and executes them through the V1 pipeline:

- Maximum 3 concurrent generations (prevents CPU/memory saturation)
- Uses existing `PresentationGenerator.generate()` for "generate" actions
- Uses existing `AutoUpdater.update_presentation()` for "update" actions
- For "suggest" actions: stores suggestion in `suggestions/pending.json` and surfaces via CLI/API
- For "self-improve" actions: invokes `MetaLearningController.evaluate_and_adjust()`

### Safety Principles

1. **Never generate without event + conditions**: No rule fires without a triggering event AND all conditions being true.
2. **Cooldowns prevent storms**: Minimum interval between identical actions.
3. **Queue depth limits**: Overwhelmed queue sheds load rather than accumulating unbounded work.
4. **Expiry prevents stale work**: Old actions are discarded, not executed with outdated context.
5. **Concurrent limit**: Maximum 3 simultaneous generations prevents resource exhaustion.
6. **Suggest vs. Generate**: Low-confidence actions use "suggest" (human reviews) rather than "generate" (autonomous).
7. **Configurable rules**: Rules can be disabled, adjusted, or extended without code changes.

## Alternatives Considered

### Alternative A: Direct Event-to-Action Mapping (Enhanced V1)

Extend the existing `EventOrchestrator` with direct event-to-generation mappings (no rules engine, no cooldowns).

- **Pro**: Simple extension of working code, no new components
- **Con**: No storm protection, no priority ordering, no conditions checking, every event triggers generation
- **Rejected because**: Without cooldowns and conditions, 10 rapid commits would trigger 10 redundant presentations. This is the "generation storm" problem.

### Alternative B: Cron-Only Approach

Instead of event-driven triggers, generate presentations on fixed schedules (e.g., daily at 9am, weekly on Monday).

- **Pro**: Completely predictable, no storm risk, simple to implement
- **Con**: No real-time responsiveness. A critical security finding at 10am would not be reflected until 9am the next day.
- **Rejected because**: Executive presentations must reflect current state. A 24-hour delay for critical events is unacceptable.

### Alternative C: ML-Based Trigger Prediction

Train a model to predict when presentations are needed based on historical patterns.

- **Pro**: Could discover non-obvious patterns (e.g., "every time user X commits to branch Y, a presentation is requested within 2 hours")
- **Con**: Requires significant training data (100s of events), complex model, black-box decisions hard to debug
- **Rejected because**: Rule-based triggers are transparent, debuggable, and effective for the known SDLC event types. ML can be added later as a "ProactiveIntelligenceEngine" for pattern-based predictions (supplementing, not replacing rules).

### Alternative D: Human-Approval Gate

All autonomous triggers require human approval before generation.

- **Pro**: Full human control, prevents any unwanted generation
- **Con**: Defeats the purpose of autonomous behavior. Adds latency. Requires human availability.
- **Rejected because**: The goal is to remove the human bottleneck. However, the "suggest" action type serves this use case for low-confidence scenarios.

### Alternative E: Complex Event Processing (CEP) Engine

Use a full CEP engine (e.g., Esper, Flink) for sophisticated event pattern matching over time windows.

- **Pro**: Can detect complex temporal patterns (e.g., "3 security events within 1 hour from different agents")
- **Con**: Massive dependency, requires JVM or Flink cluster, overkill for 12 rules
- **Rejected because**: The initial rule set is 12 simple rules. A full CEP engine adds operational complexity disproportionate to the problem size. If temporal patterns become important, they can be implemented as custom conditions within the existing rules engine.

## Consequences

### Positive

- Presentations exist before anyone asks for them (removes human bottleneck)
- Critical events (security, cost overruns) get immediate attention
- Storm protection prevents wasted compute on redundant generations
- Priority ordering ensures the most important presentations are generated first
- Rules are transparent and configurable without code changes
- The "suggest" action type provides a gentle path for uncertain triggers
- Existing V1 pipeline is used as-is (no changes to proven code)
- Full audit trail: every rule evaluation, skip reason, and execution is logged

### Negative

- Adds complexity: 4 new components (rules, cooldowns, queue, processor)
- File-based polling has 15-second latency (events are not instant)
- Rules must be hand-authored (no automatic rule discovery)
- Cooldown values require tuning per deployment (initial values are estimates)
- Maximum 3 concurrent generations may bottleneck during high-activity periods
- Actions that expire before processing are silently lost (only logged)

### Risks

| Risk | Mitigation |
|------|-----------|
| Generation storm despite cooldowns (rules conflict) | Queue depth limit (20); concurrent limit (3); per-project isolation |
| Critical event delayed by queue depth | Critical priority is processed first; bypasses cooldowns |
| Cooldown values too aggressive (miss legitimate updates) | Configurable per rule; analytics track skip counts for tuning |
| Cooldown values too lenient (still some storms) | Start conservative (long cooldowns); reduce based on monitoring |
| Event stream processor crashes | Daemon thread with auto-restart; health check endpoint |
| Disk fills with queue/cooldown state | Fixed-size JSON files; expired actions are pruned; cooldowns are single records |

## Implementation Notes

**New domain entities**:
- `TriggerRule` -- Rule definition with event pattern, conditions, action, cooldown, priority
- `AutonomousAction` -- Queued action with rule reference, project context, expiry
- `CooldownRecord` -- Per-rule, per-project execution timestamp and skip count

**New domain services**:
- `AutonomousDecisionRules` -- Evaluates rules against events and conditions
- `CooldownManager` -- Manages cooldown timers with per-project isolation

**New application service**:
- `AutonomousBehaviorEngine` -- Wires event stream -> rules -> cooldown -> queue -> pipeline

**New infrastructure**:
- `FileCooldownStore` -- Persists cooldowns to `cooldowns/cooldowns.json`
- `FilePriorityQueueStore` -- Persists queue to `queue/action-queue.json`
- `EventStreamClient` -- Polls mesh inbox and events directory

**New presentation layer**:
- `AutonomousTriggerListener` -- Starts the event polling loop and ABE on agent startup

**Integration with existing V1 code**:
- `AutonomousBehaviorEngine` calls `PresentationGenerator.generate()` for "generate" actions
- `AutonomousBehaviorEngine` calls `AutoUpdater.update_presentation()` for "update" actions
- No modifications to any existing V1 classes

**Test strategy**:
- Unit test: each of 12 rules matches its expected event type
- Unit test: rules with unmet conditions do not fire
- Unit test: cooldown blocks re-execution within window
- Unit test: cooldown allows execution after window
- Unit test: critical priority bypasses cooldowns
- Unit test: queue respects max depth (21st action rejected)
- Unit test: expired actions are pruned
- Integration test: simulated event -> autonomous generation -> output file exists
- Acceptance test: architecture update event -> deck regenerated within 60 seconds without human intervention
