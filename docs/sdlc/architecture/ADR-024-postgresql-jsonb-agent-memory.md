# ADR-024: PostgreSQL JSONB for Agent Memory Storage

**Status**: Accepted
**Date**: 2026-02-10
**Context**: ARCH-20260210-0011

## Context
Memory-persistent agents need a storage layer that can persist arbitrary structured data across executions, support efficient retrieval by key, and handle up to 10GB per agent.

## Decision
Use PostgreSQL JSONB columns within the existing database for agent memory storage, with a two-tier cache (in-process LRU + PostgreSQL).

## Rationale
- No new infrastructure required (existing PostgreSQL)
- JSONB supports GIN indexes for fast JSON path queries
- Prisma provides type-safe access
- Size manageable within PostgreSQL limits
- Atomic operations via database transactions
- Backup and recovery via existing database backup strategy

## Consequences
- **Positive**: No new infrastructure, ACID guarantees, familiar tooling, GIN-indexed queries
- **Negative**: Large JSONB values can impact PostgreSQL performance; mitigated by size limits and LRU cache
- **Migration**: Straightforward Prisma migration to add AgentMemoryEntry model

## Alternatives Considered
1. **Redis**: Fast but volatile (requires persistence config), harder to query by content
2. **MongoDB**: Natural fit for document storage but adds a new database dependency
3. **S3/Object Storage**: Good for large blobs but poor for frequent small reads
4. **Vector Database**: Overkill for v1; could be added later for semantic memory search
