# ADR-026: Multi-Project Agent Pool Orchestration

**Status**: Accepted
**Date**: 2026-02-10
**Context**: ARCH-20260210-0011-v2

## Context
Multiple SDLC projects can run concurrently, but agent instances are finite resources. When 5 projects all need a developer agent simultaneously, the system must decide how to allocate scarce agent capacity fairly and efficiently.

## Decision
Implement a **Priority-Deadline Agent Pool Scheduler** that allocates agents using a composite priority score: `(project_priority * 10) + (days_until_deadline * -1) + (phase_order_bonus)`.

Projects with higher priority and closer deadlines get agents first. When all agents are busy, phases are queued and an ETA is computed from historical average phase durations.

## Rationale
- Priority-only scheduling starves low-priority projects indefinitely
- FIFO scheduling ignores urgency and business value
- Deadline-aware scheduling balances fairness with urgency
- Phase-order bonus clears early phases first to avoid pipeline stalls (a project stuck in phase 1 blocks all later phases)

## Consequences
- **Positive**: Critical projects with tight deadlines get agents first; no project is starved forever; predictable ETAs
- **Negative**: Complex to implement; requires historical data for accurate ETAs; priority inversions possible under extreme load
- **Mitigation**: Fall back to simple priority ordering if historical data is insufficient (first 10 projects)

## Alternatives Considered
1. **Dedicated agents per project**: Simple but wasteful; idle agents when project is between phases
2. **Round-robin**: Fair but ignores priority and deadlines
3. **Market-based (bidding)**: Sophisticated but overly complex for v1
