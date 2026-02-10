# ADR-025: Event-Driven Trigger Architecture

**Status**: Accepted
**Date**: 2026-02-10
**Context**: ARCH-20260210-0011

## Context
The trigger system must evaluate conditions against platform events and automatically create work items when conditions match. The platform already has an EventManager for pub/sub.

## Decision
Extend the existing EventManager with a TriggerEvaluator component that subscribes to all events, evaluates them against stored trigger definitions, and creates work items when conditions match.

## Rationale
- EventManager already handles platform event routing
- Adding trigger evaluation is a natural extension of the event pipeline
- Conditions are evaluated in-process for low latency
- Rate limiting and circuit breakers prevent trigger storms

## Consequences
- **Positive**: Low-latency trigger evaluation, reuse of existing event infrastructure, simple mental model
- **Negative**: All triggers evaluated on every event (O(n) per event); mitigated by event-type indexing to only evaluate matching triggers
- **Risk**: Cascading triggers (trigger A fires, creates event, triggers B). Mitigated by max depth of 3 and rate limiting.

## Safety Measures
- Rate limit: 10 fires/min per trigger (configurable)
- Global rate limit: 100 fires/min total
- Cascade depth limit: 3 levels
- Circuit breaker: disable after 50 consecutive failures
- Max 20 work items per single trigger fire
