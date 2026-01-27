# ADR-005: Vector Database Selection for RAG-Enabled Memory System

**Date**: 2026-01-26
**Status**: PROPOSED
**Deciders**: Jets (Architect), Engineering Team
**Technical Story**: Agent Intelligence & Governance System - Memory Component

---

## Context and Problem Statement

The current AI-SDLC agents use file-based JSON storage for memory, which only supports exact-match lookups and keyword grep searches. This approach fails for semantic queries like:

- "Show me authentication patterns that worked well"
- "What security vulnerabilities have we found in payment systems?"
- "Have we solved this problem before?"

We need a vector database that enables **semantic search** over agent memories, allowing retrieval based on meaning rather than exact text matches.

## Decision Drivers

1. **Local-First Operation**: Must work offline/on-premise for security-sensitive environments
2. **Cost Efficiency**: No recurring subscription costs for development/testing
3. **Integration Simplicity**: Easy integration with Python-based agent infrastructure
4. **Performance**: Sub-100ms query latency for interactive agent use
5. **Scale Requirements**: Expected 50K-100K vectors (modest scale)
6. **Persistence**: Must survive restarts with durable storage
7. **Migration Path**: Ability to migrate to managed service if scale increases

## Considered Options

### Option 1: ChromaDB (Open Source, Local-First)

**Description**: Lightweight, embeddable vector database optimized for AI applications.

**Pros**:
- Free and open source (Apache 2.0)
- Local-first, runs embedded in application
- Simple Python API
- Built-in persistence (SQLite + Parquet)
- Good performance for <1M vectors
- Easy to set up (pip install chromadb)
- Supports metadata filtering
- Active development and community

**Cons**:
- Less mature than enterprise solutions
- Single-node only (no distributed mode)
- Limited enterprise support options
- Performance degrades at very large scale (>1M vectors)

**Technical Details**:
```python
# Installation
pip install chromadb

# Usage
import chromadb
client = chromadb.Client()
collection = client.create_collection("security_findings")
collection.add(
    documents=["SQL injection found in user query"],
    metadatas=[{"severity": "critical", "cwe": "CWE-89"}],
    ids=["finding-001"]
)
results = collection.query(query_texts=["injection vulnerabilities"], n_results=5)
```

**Cost**: $0 (open source)

### Option 2: Pinecone (Cloud-Managed)

**Description**: Fully managed vector database service with enterprise features.

**Pros**:
- Fully managed, no infrastructure to maintain
- Excellent performance at any scale
- Built-in high availability
- Enterprise support available
- Advanced features (namespaces, metadata filtering)
- Real-time index updates

**Cons**:
- Recurring monthly costs ($70+/month starter)
- Requires internet connectivity
- Data leaves local network
- Vendor lock-in
- More complex setup (API keys, SDK)

**Technical Details**:
```python
# Installation
pip install pinecone-client

# Usage
import pinecone
pinecone.init(api_key="xxx", environment="us-east-1")
index = pinecone.Index("memories")
index.upsert(vectors=[
    ("finding-001", [0.1, 0.2, ...], {"severity": "critical"})
])
results = index.query(vector=[0.1, 0.2, ...], top_k=5, include_metadata=True)
```

**Cost**: $70/month (Starter) to $1000+/month (Enterprise)

### Option 3: Weaviate (Self-Hosted or Cloud)

**Description**: Open-source vector database with GraphQL API and modular architecture.

**Pros**:
- Open source with cloud option
- Rich query language (GraphQL)
- Built-in vectorization modules
- Good documentation
- Strong semantic search capabilities
- Hybrid search (vector + keyword)

**Cons**:
- More complex deployment (Docker/K8s preferred)
- Higher resource requirements
- Steeper learning curve
- GraphQL adds complexity for simple use cases

**Technical Details**:
```python
# Requires Docker
docker run -d -p 8080:8080 semitechnologies/weaviate:latest

# Usage
import weaviate
client = weaviate.Client("http://localhost:8080")
client.data_object.create({
    "content": "SQL injection found",
    "severity": "critical"
}, "SecurityFinding")
```

**Cost**: $0 (self-hosted) or $25+/month (cloud)

### Option 4: PostgreSQL with pgvector

**Description**: Vector similarity search extension for PostgreSQL.

**Pros**:
- Familiar PostgreSQL interface
- Leverages existing Postgres infrastructure
- ACID compliance
- Mature ecosystem
- SQL-based queries

**Cons**:
- Vector operations added to general-purpose DB
- Less optimized for pure vector workloads
- Requires PostgreSQL expertise
- Index management complexity

**Technical Details**:
```sql
-- Extension
CREATE EXTENSION vector;

-- Table
CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)
);

-- Index
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops);

-- Query
SELECT * FROM memories
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 5;
```

**Cost**: $0 (extension) + PostgreSQL hosting costs

## Decision Outcome

**Chosen Option**: **ChromaDB** with migration path to Pinecone

### Rationale

| Factor | ChromaDB | Pinecone | Weaviate | pgvector |
|--------|----------|----------|----------|----------|
| Local-First | Excellent | Poor | Good | Excellent |
| Cost | Free | $70+/mo | Free/Paid | Free |
| Setup Simplicity | Excellent | Good | Medium | Medium |
| Python Integration | Excellent | Good | Good | Good |
| Scale (our needs) | Sufficient | Overkill | Sufficient | Sufficient |
| Migration Path | To Pinecone | N/A | Complex | To Pinecone |

**Why ChromaDB wins for Deltek**:

1. **Security Requirements**: Deltek handles sensitive government contractor data. Local-first operation ensures data never leaves the network.

2. **Cost Efficiency**: Zero recurring costs during development and for smaller teams. Budget can be allocated to more critical infrastructure.

3. **Simplicity**: Single pip install, no Docker or Kubernetes required. Agents can embed ChromaDB directly.

4. **Scale Match**: Our projected 50K-100K vectors is well within ChromaDB's sweet spot. Performance degrades only at 1M+ vectors.

5. **Migration Path**: If we outgrow ChromaDB, Pinecone migration is straightforward - same embedding format, similar API patterns.

### Migration Strategy to Pinecone (If Needed)

Trigger conditions for migration:
- Vector count exceeds 500K
- Query latency exceeds 200ms consistently
- Need for multi-region redundancy
- Enterprise support requirements

Migration steps:
1. Export all vectors from ChromaDB
2. Create Pinecone index with matching dimensions
3. Batch upload vectors to Pinecone
4. Update application to use Pinecone SDK
5. Verify data integrity
6. Cut over with feature flag

## Implementation Details

### Collection Configuration

```python
# chromadb_config.py

COLLECTIONS = {
    "security_findings": {
        "embedding_function": "openai",
        "distance_metric": "cosine",
        "metadata_schema": {
            "severity": str,
            "category": str,
            "cwe_id": str,
            "project": str
        }
    },
    "code_patterns": {
        "embedding_function": "openai",
        "distance_metric": "cosine",
        "metadata_schema": {
            "language": str,
            "framework": str,
            "pattern_type": str,
            "quality_score": float
        }
    },
    # ... additional collections
}

PERSISTENCE_PATH = "~/.claude/governance/memory/chromadb"
```

### Backup Strategy

ChromaDB data backed up to JSON for:
- Human readability
- Git tracking
- Disaster recovery
- Portability

```python
# backup_schedule.py

BACKUP_CONFIG = {
    "frequency": "daily",
    "retention": "30 days",
    "format": "json",
    "destination": "~/.claude/governance/memory/backup/",
    "compress": True
}
```

## Consequences

### Positive

- Zero cost for memory infrastructure
- Simple deployment and maintenance
- Full data sovereignty (local storage)
- Fast development iteration
- Easy testing and mocking

### Negative

- No built-in high availability (single node)
- Must implement our own backup/restore
- May need migration if scale increases significantly
- Less enterprise support compared to managed solutions

### Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Scale limit reached | Low | Medium | Pinecone migration plan ready |
| Data loss | Low | High | Daily backups + JSON exports |
| Performance degradation | Low | Medium | Monitoring + index optimization |
| ChromaDB project abandoned | Very Low | Medium | Alternative: pgvector or Pinecone |

## Compliance

- SOC2: Data remains local, audit trail via JSON backups
- GDPR: Data subject access requests served from local storage
- DCAA: No impact (ChromaDB stores derived data, not source records)

## Links

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Vector Database Comparison](https://www.pinecone.io/learn/vector-database/)
- Architecture Document: ARCH-20260126-GOVERNANCE.md
