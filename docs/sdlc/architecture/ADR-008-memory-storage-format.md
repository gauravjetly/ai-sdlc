# ADR-008: Memory Storage Format

**Date**: 2026-01-26
**Status**: PROPOSED
**Deciders**: Jets (Architect), Data Architecture Team
**Technical Story**: Agent Intelligence & Governance System - Memory Data Model

---

## Context and Problem Statement

The governance system needs to store diverse types of "memories" that agents create and learn from:

- Security findings and how they were fixed
- Code patterns that proved effective
- Architecture decisions (ADRs)
- Failed approaches to avoid
- Compliance rules and implementations
- Deltek product-specific knowledge

These memories need to support:
1. **Semantic Search**: Find memories by meaning, not just keywords
2. **Metadata Filtering**: Filter by severity, category, project, etc.
3. **Versioning**: Track how knowledge evolves
4. **Human Readability**: Engineers should be able to review memories
5. **Git Compatibility**: Track changes in version control
6. **Portability**: Migrate between vector databases if needed

## Decision Drivers

1. **Dual Storage**: Need both vector embeddings AND human-readable format
2. **Schema Evolution**: Memory types may evolve over time
3. **Query Flexibility**: Both semantic and metadata-based queries
4. **Audit Trail**: Track who created what and when
5. **Backup/Recovery**: Easy backup and restore capabilities

## Considered Options

### Option 1: Vector DB Only

**Description**: Store everything in ChromaDB with metadata.

**Pros**:
- Single source of truth
- Simpler architecture
- Fast semantic search

**Cons**:
- Not human-readable without tooling
- Vector DB lock-in
- Limited query capabilities
- No git-trackable history

### Option 2: Relational DB Only (PostgreSQL)

**Description**: Store memories in PostgreSQL tables.

**Pros**:
- Powerful queries (SQL)
- ACID compliance
- Familiar tooling

**Cons**:
- No native vector search (pgvector adds complexity)
- Not git-trackable
- Schema migrations needed

### Option 3: Hybrid Storage (Vector + Markdown) - Selected

**Description**: Store embeddings in ChromaDB for search, but maintain human-readable Markdown/JSON files as source of truth.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY CREATION                               │
│                                                                  │
│  Agent generates learning →  Store as Markdown/JSON →  Index    │
│                              (Git-tracked, readable)    in      │
│                                                        ChromaDB │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY STORAGE                                │
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────┐    │
│  │ SOURCE OF TRUTH         │    │ SEARCH INDEX            │    │
│  │ (Markdown/JSON Files)   │    │ (ChromaDB Vectors)      │    │
│  │                         │    │                         │    │
│  │ ~/.claude/governance/   │───▶│ Embeddings              │    │
│  │   memory/source/        │    │ + Metadata              │    │
│  │                         │    │ + File Reference        │    │
│  │ - Human readable        │    │                         │    │
│  │ - Git tracked           │    │ - Semantic search       │    │
│  │ - Easy to edit          │    │ - Fast retrieval        │    │
│  └─────────────────────────┘    └─────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY RETRIEVAL                              │
│                                                                  │
│  Query → ChromaDB (semantic search) → Get file references →     │
│          Load full content from Markdown/JSON                   │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**:
- Best of both worlds: semantic search + human readability
- Git-trackable knowledge base
- Easy to migrate vector DBs
- Engineers can edit memories directly
- Simple backup (just files)

**Cons**:
- Must keep two stores in sync
- More complex write path
- File system performance at scale

## Decision Outcome

**Chosen Option**: **Option 3 - Hybrid Storage (Vector + Markdown/JSON)**

### Rationale

1. **Transparency**: Engineers can browse and edit memories as files
2. **Portability**: If we switch from ChromaDB, we just re-index files
3. **Compliance**: Git history provides audit trail
4. **Recovery**: Simple file backup/restore
5. **Collaboration**: PRs to improve organizational knowledge

## Implementation Details

### File Structure

```
~/.claude/governance/memory/source/
├── security_findings/
│   ├── SEC-2024-001.md
│   ├── SEC-2024-002.md
│   └── index.json           # Index with metadata
│
├── code_patterns/
│   ├── PATTERN-AUTH-001.md
│   ├── PATTERN-DATA-002.md
│   └── index.json
│
├── architecture_decisions/
│   ├── ADR-001-database.md
│   ├── ADR-002-authentication.md
│   └── index.json
│
├── failed_approaches/
│   ├── ANTI-001-nested-callbacks.md
│   └── index.json
│
├── compliance_rules/
│   ├── HIPAA-001.md
│   ├── SOC2-001.md
│   └── index.json
│
└── deltek_knowledge/
    ├── costpoint/
    │   ├── API-001-authentication.md
    │   └── INT-001-cobra-integration.md
    └── vantagepoint/
        └── API-001-projects.md
```

### Memory Document Format (Markdown)

```markdown
---
id: SEC-2024-089
type: security_finding
version: 1
created: 2024-03-15T10:30:00Z
updated: 2024-03-16T14:22:00Z
author: security-agent
project: billing-service
status: resolved

# Metadata for filtering
severity: critical
category: authentication
cwe: CWE-798
cvss: 9.1

# Indexing hints
keywords:
  - JWT
  - token
  - expiry
  - authentication
  - vulnerability

# Relationships
related:
  - SEC-2024-076
  - PATTERN-AUTH-001
---

# JWT Without Expiry Vulnerability

## Summary

JWT tokens issued without expiration claim (`exp`) remain valid indefinitely, creating a security risk if tokens are compromised.

## Location

- **Project**: billing-service
- **File**: `src/auth/token-service.ts`
- **Line**: 45-52

## Vulnerable Code

```typescript
// BAD: No expiration set
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET
);
```

## Impact

If an attacker obtains a token through XSS, MITM, or other means, they have permanent access to the user's account until the user explicitly revokes it or the signing key is rotated.

## Remediation

Always set token expiration:

```typescript
// GOOD: Token expires in 15 minutes
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
```

## Resolution

- **Fix Applied**: Added 15-minute expiry to all access tokens
- **Verified**: 2024-03-16 by security-agent
- **PR**: https://github.com/DLTKEngineering/billing-service/pull/234

## Learning for Agents

When implementing JWT authentication:
1. ALWAYS set `expiresIn` option
2. Use short expiry (15-60 minutes) for access tokens
3. Implement refresh token rotation for longer sessions
4. Add token revocation capability for emergency logout

## References

- [CWE-798: Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [Deltek Security Standards](internal://standards/security/authentication.yaml)
```

### Memory Document Format (JSON for Structured Data)

```json
{
  "id": "PATTERN-AUTH-001",
  "type": "code_pattern",
  "version": 2,
  "created": "2024-02-10T09:15:00Z",
  "updated": "2024-06-22T11:30:00Z",
  "author": "engineer-agent",

  "metadata": {
    "language": "typescript",
    "framework": "express",
    "pattern_type": "authentication",
    "quality_score": 0.92,
    "usage_count": 47,
    "last_used": "2024-06-22T11:30:00Z"
  },

  "title": "OAuth 2.0 Authentication with Refresh Token Rotation",

  "description": "Secure implementation of OAuth 2.0 authorization code flow with PKCE and refresh token rotation for Express.js applications.",

  "when_to_use": [
    "Building API authentication for web or mobile clients",
    "Need long-lived sessions without compromising security",
    "Integration with identity providers (Okta, Auth0, Azure AD)"
  ],

  "when_not_to_use": [
    "Internal service-to-service authentication (use mTLS instead)",
    "Simple scripts or CLI tools (use API keys)",
    "Batch processing (use service accounts)"
  ],

  "implementation": {
    "structure": [
      "src/auth/oauth-controller.ts - HTTP endpoints",
      "src/auth/oauth-service.ts - Business logic",
      "src/auth/token-service.ts - JWT creation/validation",
      "src/auth/refresh-token-repository.ts - Token storage"
    ],
    "key_files": {
      "oauth-service.ts": "// Full implementation code here..."
    }
  },

  "security_considerations": [
    "Always use PKCE for public clients",
    "Rotate refresh tokens on each use",
    "Store refresh tokens hashed in database",
    "Implement token revocation endpoint",
    "Set short expiry for access tokens (15 min)"
  ],

  "test_coverage": {
    "unit_tests": 15,
    "integration_tests": 8,
    "coverage_percentage": 94
  },

  "related": [
    "SEC-2024-089",
    "ADR-003-authentication"
  ],

  "reviews": [
    {
      "date": "2024-02-15",
      "reviewer": "security-agent",
      "verdict": "approved",
      "notes": "Follows OWASP guidelines"
    },
    {
      "date": "2024-06-22",
      "reviewer": "engineer-agent",
      "verdict": "updated",
      "notes": "Added PKCE support"
    }
  ]
}
```

### Index File Format

```json
{
  "collection": "security_findings",
  "last_indexed": "2024-06-22T12:00:00Z",
  "count": 156,

  "entries": [
    {
      "id": "SEC-2024-089",
      "file": "SEC-2024-089.md",
      "title": "JWT Without Expiry Vulnerability",
      "severity": "critical",
      "category": "authentication",
      "status": "resolved",
      "created": "2024-03-15T10:30:00Z",
      "embedding_id": "chroma-sec-2024-089-v1"
    },
    {
      "id": "SEC-2024-090",
      "file": "SEC-2024-090.md",
      "title": "SQL Injection in User Query",
      "severity": "critical",
      "category": "injection",
      "status": "resolved",
      "created": "2024-03-20T08:45:00Z",
      "embedding_id": "chroma-sec-2024-090-v1"
    }
  ],

  "statistics": {
    "by_severity": {
      "critical": 12,
      "high": 34,
      "medium": 67,
      "low": 43
    },
    "by_category": {
      "authentication": 23,
      "injection": 18,
      "crypto": 15
    },
    "by_status": {
      "resolved": 142,
      "open": 8,
      "wont_fix": 6
    }
  }
}
```

### Synchronization Service

```typescript
// memory-sync-service.ts

interface MemorySyncService {
    /**
     * Sync files to vector database
     */
    syncToVectorDB(): Promise<SyncResult>;

    /**
     * Index a single memory file
     */
    indexMemory(filePath: string): Promise<void>;

    /**
     * Remove memory from index
     */
    removeFromIndex(memoryId: string): Promise<void>;

    /**
     * Verify sync integrity
     */
    verifySyncIntegrity(): Promise<IntegrityReport>;

    /**
     * Rebuild entire index from files
     */
    rebuildIndex(): Promise<void>;
}

class MemorySyncServiceImpl implements MemorySyncService {
    async syncToVectorDB(): Promise<SyncResult> {
        const files = await this.scanMemoryFiles();
        const index = await this.loadIndex();
        const vectorDB = this.getVectorDBClient();

        const result: SyncResult = {
            added: 0,
            updated: 0,
            removed: 0,
            errors: []
        };

        // Find files to add/update
        for (const file of files) {
            const existing = index.entries.find(e => e.file === file.name);

            if (!existing) {
                // New file - add to index
                await this.indexNewMemory(file, vectorDB);
                result.added++;
            } else if (file.modified > existing.indexed) {
                // File updated - re-index
                await this.reindexMemory(file, existing, vectorDB);
                result.updated++;
            }
        }

        // Find entries to remove (file deleted)
        for (const entry of index.entries) {
            const fileExists = files.some(f => f.name === entry.file);
            if (!fileExists) {
                await this.removeFromVectorDB(entry.embedding_id, vectorDB);
                result.removed++;
            }
        }

        // Update index file
        await this.saveIndex(index);

        return result;
    }

    private async indexNewMemory(file: MemoryFile, vectorDB: ChromaClient): Promise<void> {
        // Parse file
        const content = await this.parseMemoryFile(file.path);

        // Generate embedding text (optimized for search)
        const embeddingText = this.generateEmbeddingText(content);

        // Create embedding
        const embedding = await this.embeddingService.embed(embeddingText);

        // Store in vector DB
        await vectorDB.add({
            ids: [content.id],
            documents: [embeddingText],
            embeddings: [embedding],
            metadatas: [this.extractMetadata(content)]
        });
    }

    private generateEmbeddingText(content: MemoryContent): string {
        // Combine key fields for better semantic search
        const parts = [
            content.title,
            content.summary || content.description,
            content.learning || '',
            (content.keywords || []).join(' ')
        ];

        return parts.filter(Boolean).join('\n\n');
    }
}
```

### File Watch for Real-Time Sync

```typescript
// memory-watcher.ts

import { watch } from 'chokidar';

class MemoryWatcher {
    private watcher: FSWatcher;
    private syncService: MemorySyncService;

    start(): void {
        this.watcher = watch(MEMORY_SOURCE_PATH, {
            ignored: /index\.json$/,  // Don't watch index files
            persistent: true,
            awaitWriteFinish: true
        });

        this.watcher
            .on('add', path => this.onFileAdded(path))
            .on('change', path => this.onFileChanged(path))
            .on('unlink', path => this.onFileRemoved(path));
    }

    private async onFileAdded(path: string): Promise<void> {
        console.log(`Memory added: ${path}`);
        await this.syncService.indexMemory(path);
    }

    private async onFileChanged(path: string): Promise<void> {
        console.log(`Memory updated: ${path}`);
        await this.syncService.indexMemory(path);
    }

    private async onFileRemoved(path: string): Promise<void> {
        console.log(`Memory removed: ${path}`);
        const memoryId = this.extractMemoryId(path);
        await this.syncService.removeFromIndex(memoryId);
    }
}
```

## Consequences

### Positive

1. **Human Readable**: Engineers can browse memories as files
2. **Git Trackable**: Full history of knowledge evolution
3. **Portable**: Switch vector DBs by re-indexing files
4. **Recoverable**: Simple file backup restores everything
5. **Editable**: Fix errors by editing markdown files
6. **Reviewable**: PRs for knowledge base changes

### Negative

1. **Dual Write**: Must maintain sync between files and vector DB
2. **Complexity**: More moving parts than single store
3. **Performance**: File I/O for full content retrieval
4. **Disk Usage**: Stores data twice (files + vectors)

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Sync drift | Integrity checks + reconciliation job |
| File corruption | Git history + daily backups |
| Large file count | Index files for fast listing |
| Concurrent edits | File locking + conflict detection |

## Migration from Existing Memory

```bash
#!/bin/bash
# migrate-to-hybrid-format.sh

# 1. Export existing JSON memories
find ~/.claude/architect-memory -name "*.json" -exec cat {} \; > /tmp/all-memories.json

# 2. Convert to new format
python convert-memories.py /tmp/all-memories.json ~/.claude/governance/memory/source/

# 3. Build index files
python build-indexes.py ~/.claude/governance/memory/source/

# 4. Index in ChromaDB
python index-memories.py ~/.claude/governance/memory/source/

# 5. Verify
python verify-migration.py
```

## Links

- Architecture Document: ARCH-20260126-GOVERNANCE.md
- ADR-005: Vector Database Selection
- ADR-006: Policy Engine Architecture
- ADR-007: Context Injection Strategy
