# ADR-022: Extend Existing Monolith for Scheduling Module

**Status**: Accepted
**Date**: 2026-02-10
**Context**: ARCH-20260210-0011

## Context
The scheduling feature requires backend services for work management, trigger evaluation, and agent memory. We need to decide whether to build a new microservice or extend the existing platform.

## Decision
Extend the existing platform monolith with a new `scheduling/` module following the established layered architecture pattern (domain, application, infrastructure, presentation).

## Rationale
- The existing platform already has the agent infrastructure, event system, and database
- A separate microservice would introduce network overhead, distributed transactions, and operational complexity disproportionate to the feature scope
- The layered architecture already supports clean module boundaries
- The team can deliver faster by reusing existing infrastructure

## Consequences
- **Positive**: Faster delivery, simpler operations, reuse of existing auth/logging/monitoring
- **Negative**: Module must be carefully bounded to avoid coupling; scaling is per-application rather than per-module
- **Risk**: If scheduling load is disproportionately high, it could impact other platform features. Mitigated by BullMQ offloading work to background workers.

## Alternatives Considered
1. **New microservice**: More isolation but high operational overhead for a v1 feature
2. **Serverless functions**: Good scaling but poor fit for long-running agent executions
