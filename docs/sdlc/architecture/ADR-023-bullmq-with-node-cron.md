# ADR-023: BullMQ for Reliable Scheduling with node-cron for Cron Parsing

**Status**: Accepted
**Date**: 2026-02-10
**Context**: ARCH-20260210-0011

## Context
The scheduling engine must reliably execute work items at scheduled times, survive server restarts, handle retries, and support delayed execution. The existing platform uses node-cron for in-process cron scheduling.

## Decision
Use BullMQ (backed by Redis) for reliable job scheduling and execution. Keep node-cron for cron expression validation and next-run-time calculation.

## Rationale
- **BullMQ**: Persistent queue surviving restarts, built-in retry with backoff, delayed jobs, rate limiting, concurrency control, and dashboard (Bull Board)
- **node-cron**: Already in use, excellent cron expression parser, but in-process only (jobs lost on restart)
- **Combined**: node-cron calculates "when", BullMQ ensures "it happens reliably"

## Consequences
- **Positive**: Reliable execution, retry semantics, horizontal scaling via multiple workers
- **Negative**: Redis dependency (already required for other platform features), additional infrastructure component
- **Monitoring**: BullMQ provides built-in metrics and Bull Board for queue monitoring

## Alternatives Considered
1. **node-cron only**: Simple but unreliable (jobs lost on restart)
2. **Agenda.js**: MongoDB-based; not compatible with existing PostgreSQL setup
3. **pg-boss**: PostgreSQL-native queue; good but lacks BullMQ's ecosystem and performance
