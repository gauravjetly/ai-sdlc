# ADR-032: Memory Architecture - Semantic Vector Memory with PostgreSQL

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Engineer (Implementation)
**Context**: Agentic AI Platform Transformation

---

## Context

The current memory system operates at three levels:
1. **Per-agent file memory** (`~/.claude/agent-memory/{agent}/`) -- JSON files managed by each agent
2. **Collective memory** (`~/.claude/agent-mesh/collective-memory/`) -- Shared knowledge with string containment search
3. **Audit log** (`~/.claude/agent-mesh/audit/`) -- Date-partitioned JSON files

The search mechanism in collective memory uses `calculateRelevance()`, which performs string containment checks against titles, content, and tags. This misses semantically similar content that uses different words. For example, searching "user login" will not find knowledge titled "authentication flow" even though they are about the same concept.

For agentic behavior, agents need to retrieve the most relevant prior knowledge, past decisions, and similar episodes regardless of exact wording.

## Decision

**Adopt a three-tier memory architecture backed by PostgreSQL with pgvector for semantic search, Redis for working memory, and the existing filesystem for development fallback.**

### Three Memory Tiers

```
TIER 1: WORKING MEMORY (Redis)
─────────────────────────────
Scope: Per-task, ephemeral
Lifetime: Duration of task execution
Use: Scratchpad, intermediate results, current context
Speed: Sub-millisecond reads
Eviction: Cleared when task completes

TIER 2: SEMANTIC MEMORY (PostgreSQL + pgvector)
────────────────────────────────────────────────
Scope: Cross-project, persistent
Lifetime: Indefinite (with versioning and deprecation)
Use: Knowledge base, patterns, decisions, learnings
Speed: < 50ms for top-K vector search
Index: IVFFlat with 100 lists

TIER 3: EPISODIC MEMORY (PostgreSQL)
────────────────────────────────────
Scope: Per-workflow, persistent
Lifetime: Indefinite
Use: Complete workflow histories with outcomes
Speed: < 100ms for similar episode search
Links: Connects to semantic memory entries
```

### Embedding Strategy

- **Model**: `text-embedding-3-large` (OpenAI) -- 3072 dimensions
- **Fallback**: `text-embedding-3-small` (1536 dimensions) for cost-sensitive scenarios
- **Chunking**: Content split at 512 tokens with 50-token overlap
- **Batch Processing**: Embeddings generated in batches of 100 for efficiency

### Search Strategy: Hybrid Retrieval

```
Query: "How did we handle OAuth token refresh?"
                    │
         ┌──────────┴──────────┐
         │                     │
    VECTOR SEARCH         KEYWORD SEARCH
    (semantic sim.)       (BM25 on content)
         │                     │
    Top 10 results        Top 10 results
         │                     │
         └──────────┬──────────┘
                    │
              RECIPROCAL RANK
              FUSION (RRF)
                    │
              Top 5 combined
              results
```

Hybrid search combines vector similarity (captures meaning) with keyword search (captures exact terms, names, and identifiers). This prevents the common failure mode where vector search returns semantically similar but factually wrong results.

### Interface

```typescript
interface MemoryService {
  // Working Memory
  setWorkingMemory(taskId: string, key: string, value: any): Promise<void>;
  getWorkingMemory(taskId: string, key: string): Promise<any>;
  clearWorkingMemory(taskId: string): Promise<void>;

  // Semantic Memory
  storeKnowledge(input: {
    title: string;
    content: string;
    category: string;
    sourceAgent: AgentId;
    tags: string[];
    confidence: string;
  }): Promise<string>;

  searchKnowledge(query: string, options?: {
    topK?: number;
    minSimilarity?: number;
    category?: string;
    agentId?: AgentId;
    hybrid?: boolean;         // Use hybrid search (default: true)
  }): Promise<KnowledgeResult[]>;

  // Episodic Memory
  recordEpisode(episode: {
    workflowId: string;
    goal: string;
    outcome: 'success' | 'partial' | 'failure';
    summary: string;
    learnings: string[];
    durationSeconds: number;
    totalTokens: number;
  }): Promise<string>;

  findSimilarEpisodes(goal: string, limit?: number): Promise<Episode[]>;
}
```

## Alternatives Considered

### 1. Dedicated Vector Database (Pinecone, Weaviate, Chroma)
- **Pro**: Purpose-built for vector operations, managed service options
- **Con**: Additional infrastructure component, additional cost, data sync needed
- **Rejected**: pgvector provides adequate performance at our scale and avoids operational complexity of a separate service

### 2. Keep File-Based with Better Search (TF-IDF, BM25)
- **Pro**: No database dependency, simple to implement
- **Con**: No semantic understanding, poor recall for paraphrased queries
- **Rejected**: Does not meet the semantic retrieval requirement for agentic behavior

### 3. In-Memory Vector Store (FAISS, HNSWlib)
- **Pro**: Extremely fast, no external dependency
- **Con**: Data lost on restart, limited by RAM, no persistence
- **Rejected**: Need durable memory that survives process restarts

### 4. Knowledge Graph (Neo4j, TypeDB)
- **Pro**: Rich relationship modeling, graph traversal queries
- **Con**: Significant complexity, different query paradigm, additional infrastructure
- **Rejected**: Can model relationships in PostgreSQL JSONB; knowledge graph may be added later as an enhancement

## Consequences

### Positive
- Semantic search finds relevant knowledge regardless of exact wording
- Three-tier architecture matches access patterns (hot/warm/cold)
- Hybrid search prevents semantic-only retrieval failures
- PostgreSQL is already in the stack; pgvector is a lightweight extension
- Episodic memory enables "what happened last time" reasoning

### Negative
- Embedding API calls add cost (~$0.13 per million tokens)
- pgvector IVFFlat index requires periodic rebuilding as data grows
- Need to manage embedding model versioning (re-embed if model changes)

### Neutral
- Existing file-based collective memory is migrated to PostgreSQL (one-time)
- File-based memory retained as development fallback mode

---

**Related ADRs**: ADR-005 (Vector Database Selection), ADR-024 (PostgreSQL JSONB), ADR-030 (Agent Runtime)
