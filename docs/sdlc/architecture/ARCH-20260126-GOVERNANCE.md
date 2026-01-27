# Architecture Design: Agent Intelligence & Governance System

**Document ID**: ARCH-20260126-GOVERNANCE
**Version**: 1.0.0
**Date**: 2026-01-26
**Author**: Jets (Architect Agent)
**Status**: PROPOSED

---

## Executive Summary

### Problem Statement

The current AI-SDLC framework operates with autonomous agents that lack:

1. **Governance Enforcement** - No automatic compliance with organizational policies
2. **RAG-Enabled Memory** - File-based memory without semantic search capabilities
3. **Contextual Intelligence** - Agents lack deep context about Deltek standards
4. **Policy-as-Code** - Rules exist in documentation but are not enforced at runtime

### Solution Vision

**"All code must follow Deltek governance by default, not by human vigilance"**

This architecture introduces a comprehensive **Agent Intelligence & Governance System** that transforms agents from autonomous executors into **policy-aware, memory-augmented, context-intelligent agents** that enforce governance automatically.

### Core Value Proposition

| Capability | Current State | Future State |
|------------|---------------|--------------|
| Policy Compliance | Manual review | Automatic enforcement |
| Memory Search | File-based grep | Semantic vector search |
| Context Awareness | Static prompts | Dynamic context injection |
| Learning | Isolated per session | Persistent organizational knowledge |
| Security | Post-commit scanning | Pre-generation blocking |

---

## System Architecture Overview

### High-Level Architecture

```
                                 ┌─────────────────────────────────────────┐
                                 │         User Request                     │
                                 └────────────────┬────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AGENT INTELLIGENCE GATEWAY                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  Context Engine  │  │  Policy Engine   │  │  Memory Engine   │  │ Learning Engine │ │
│  │                  │  │                  │  │                  │  │                 │ │
│  │  - Load Deltek   │  │  - Pre-check     │  │  - Vector search │  │  - Capture      │ │
│  │    standards     │  │    compliance    │  │  - Retrieve      │  │    learnings    │ │
│  │  - Project ctx   │  │  - Validate      │  │    similar       │  │  - Update       │ │
│  │  - Historical    │  │    at runtime    │  │    solutions     │  │    knowledge    │ │
│  │    decisions     │  │  - Block if      │  │  - Anti-pattern  │  │  - Improve      │ │
│  │                  │  │    violated      │  │    detection     │  │    over time    │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ENHANCED AGENT PROMPT                                       │
│                                                                                          │
│  Original Request + Deltek Standards + Relevant Memories + Active Policies + Context    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              AGENT EXECUTION LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐ │
│  │ Conductor   │  │ BA Agent    │  │ Jets        │  │ Engineer    │  │ Security      │ │
│  │             │  │             │  │ (Architect) │  │             │  │               │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                                     │
│  │ QA Agent    │  │ Atlas       │  │ Customer    │                                     │
│  │             │  │ (Deploy)    │  │             │                                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           POST-EXECUTION VALIDATION                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Policy Validator │  │ Security Scanner │  │ Quality Gates    │  │ Memory Updater  │ │
│  │                  │  │                  │  │                  │  │                 │ │
│  │  - Check output  │  │  - OWASP scan    │  │  - Test coverage │  │  - Store new    │ │
│  │    compliance    │  │  - Secret detect │  │  - Lint check    │  │    patterns     │ │
│  │  - Block if      │  │  - Vuln scan     │  │  - Type check    │  │  - Log outcome  │ │
│  │    violated      │  │                  │  │                  │  │                 │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: RAG-Enabled Memory System

### Architecture

```
                        ┌─────────────────────────────────────────┐
                        │         Memory Ingestion Pipeline       │
                        │                                         │
                        │  Agent Output → Chunking → Embedding    │
                        │                      ↓                  │
                        │              Vector Storage             │
                        └──────────────────┬──────────────────────┘
                                           │
                        ┌──────────────────┼──────────────────────┐
                        │                  │                      │
                        ▼                  ▼                      ▼
              ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
              │  ChromaDB       │ │  Metadata Store │ │  File Backup    │
              │  (Vector DB)    │ │  (PostgreSQL)   │ │  (JSON/Markdown)│
              │                 │ │                 │ │                 │
              │  - Embeddings   │ │  - Memory ID    │ │  - Human        │
              │  - Collections  │ │  - Source       │ │    readable     │
              │  - Similarity   │ │  - Timestamp    │ │  - Git tracked  │
              │    search       │ │  - Version      │ │  - Fallback     │
              └─────────────────┘ └─────────────────┘ └─────────────────┘
                        │                  │                      │
                        └──────────────────┼──────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────────┐
                        │         Memory Retrieval Service        │
                        │                                         │
                        │  Query → Embed → Search → Rank → Return │
                        └─────────────────────────────────────────┘
```

### Technology Selection: ChromaDB

**Decision**: Use ChromaDB as the vector database

**Rationale**:
| Factor | ChromaDB | Pinecone | Weaviate |
|--------|----------|----------|----------|
| Deployment | Local-first, embeddable | Cloud-only | Self-hosted complex |
| Cost | Free (open source) | $70+/month | Free but heavy |
| Setup | pip install chromadb | Account required | K8s preferred |
| Performance | Good for <1M vectors | Excellent | Excellent |
| Integration | Python-native | SDK required | GraphQL |
| Persistence | SQLite + Parquet | Managed | Custom |

**Why ChromaDB for Deltek**:
1. **Local-First**: Runs alongside agents without external dependencies
2. **Cost-Effective**: No subscription for development/testing
3. **Simple Integration**: Direct Python API matches agent architecture
4. **Sufficient Scale**: Deltek's memory needs are <100K vectors
5. **Portable**: Can migrate to Pinecone later if scale requires

### Memory Collections Structure

```python
# Memory Collection Schema

collections = {
    "security_findings": {
        "description": "Security vulnerabilities found and remediation",
        "embedding_model": "text-embedding-3-small",
        "metadata_schema": {
            "severity": "string",      # critical, high, medium, low
            "category": "string",      # injection, auth, crypto, etc.
            "cwe_id": "string",        # CWE-79, CWE-89, etc.
            "file_type": "string",     # typescript, python, go
            "resolution": "string",    # fix applied
            "project": "string",       # project identifier
            "timestamp": "datetime",
            "product": "string"        # Deltek product if applicable
        }
    },

    "code_patterns": {
        "description": "Proven code patterns that passed review",
        "embedding_model": "text-embedding-3-small",
        "metadata_schema": {
            "language": "string",
            "framework": "string",
            "pattern_type": "string",  # authentication, validation, etc.
            "quality_score": "float",  # 0-1 based on review feedback
            "usage_count": "int",
            "last_used": "datetime"
        }
    },

    "architecture_decisions": {
        "description": "ADRs and architecture choices",
        "embedding_model": "text-embedding-3-small",
        "metadata_schema": {
            "decision_type": "string", # technology, pattern, integration
            "status": "string",        # proposed, accepted, deprecated
            "context": "string",
            "consequences": "string",
            "product": "string"
        }
    },

    "failed_approaches": {
        "description": "Anti-patterns and things that didn't work",
        "embedding_model": "text-embedding-3-small",
        "metadata_schema": {
            "failure_type": "string",  # performance, security, maintenance
            "root_cause": "string",
            "what_to_avoid": "string",
            "better_alternative": "string"
        }
    },

    "compliance_rules": {
        "description": "Compliance requirements and how met",
        "embedding_model": "text-embedding-3-small",
        "metadata_schema": {
            "standard": "string",      # SOC2, HIPAA, GDPR, DCAA
            "requirement": "string",
            "implementation": "string",
            "evidence": "string"
        }
    },

    "deltek_knowledge": {
        "description": "Deltek product-specific knowledge",
        "embedding_model": "text-embedding-3-small",
        "metadata_schema": {
            "product": "string",       # Costpoint, Vantagepoint, etc.
            "topic": "string",         # integration, module, api
            "version": "string",
            "source": "string"         # documentation, implementation, support
        }
    }
}
```

### Embedding Strategy

```python
# Embedding Configuration

embedding_config = {
    "model": "text-embedding-3-small",  # OpenAI
    "dimensions": 1536,
    "chunking": {
        "strategy": "semantic",
        "max_chunk_size": 512,          # tokens
        "overlap": 50,                   # tokens
        "separators": ["\n\n", "\n", ". ", " "]
    },
    "fallback": {
        "model": "all-MiniLM-L6-v2",    # Local Sentence-BERT
        "dimensions": 384,
        "use_when": "offline or cost optimization"
    }
}
```

### Memory Service API

```typescript
// memory-service.ts

interface MemoryService {
    // Store new memory
    store(memory: Memory): Promise<string>;

    // Semantic search
    search(query: string, options: SearchOptions): Promise<Memory[]>;

    // Get similar to existing memory
    findSimilar(memoryId: string, limit: number): Promise<Memory[]>;

    // Update memory (versioned)
    update(memoryId: string, updates: Partial<Memory>): Promise<Memory>;

    // Deprecate (soft delete)
    deprecate(memoryId: string, reason: string): Promise<void>;

    // Get memory by ID
    get(memoryId: string): Promise<Memory | null>;

    // Bulk operations
    bulkStore(memories: Memory[]): Promise<string[]>;
    bulkSearch(queries: string[], options: SearchOptions): Promise<Memory[][]>;
}

interface Memory {
    id: string;
    content: string;
    collection: string;
    metadata: Record<string, any>;
    embedding?: number[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
    deprecatedAt?: Date;
    deprecationReason?: string;
}

interface SearchOptions {
    collection?: string;
    filters?: Record<string, any>;
    limit?: number;
    minScore?: number;
    includeDeprecated?: boolean;
}
```

### Memory Retrieval Flow

```
Agent Request: "Build authentication for API"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY RETRIEVAL                              │
│                                                                  │
│  1. Parse Intent: "authentication", "API"                        │
│                                                                  │
│  2. Query Collections (parallel):                                │
│     ├── security_findings: "authentication vulnerabilities"     │
│     ├── code_patterns: "authentication API implementation"      │
│     ├── architecture_decisions: "authentication architecture"   │
│     └── deltek_knowledge: "authentication Deltek standards"     │
│                                                                  │
│  3. Rank Results:                                                │
│     - Semantic similarity score                                  │
│     - Recency (newer = higher)                                   │
│     - Quality score (from feedback)                              │
│     - Relevance to current project                               │
│                                                                  │
│  4. Return Top K:                                                │
│     [                                                            │
│       { pattern: "OAuth 2.0 with refresh tokens", score: 0.95 },│
│       { finding: "JWT without expiry is vulnerable", score: 0.92 },│
│       { adr: "ADR-003: JWT with 15min expiry", score: 0.88 },   │
│       { deltek: "MFA required for all APIs", score: 0.85 }      │
│     ]                                                            │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
            Inject into Agent Prompt
```

---

## Component 2: Governance Policy Engine

### Policy Architecture

```
                    ┌─────────────────────────────────────────┐
                    │         POLICY DEFINITION LAYER         │
                    │                                         │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
                    │  │ Org     │ │ Project │ │ Agent   │   │
                    │  │ Policies│ │ Policies│ │ Policies│   │
                    │  └─────────┘ └─────────┘ └─────────┘   │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────────┐
                    │                  │                      │
                    ▼                  ▼                      ▼
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │  Pre-Generation │ │  During-Gen     │ │  Post-Gen       │
         │  Checks         │ │  Checks         │ │  Checks         │
         │                 │ │                 │ │                 │
         │  - Repo allowed?│ │  - Pattern ok?  │ │  - Tests pass?  │
         │  - Context ok?  │ │  - No secrets?  │ │  - Coverage ok? │
         │  - Auth'd user? │ │  - SQL safe?    │ │  - Security ok? │
         └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                  │                      │
                    └──────────────────┼──────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────────┐
                    │         ENFORCEMENT ENGINE               │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Violation Detected?            │    │
                    │  │                                 │    │
                    │  │  YES → Block + Log + Learn      │    │
                    │  │  NO  → Allow + Continue         │    │
                    │  └─────────────────────────────────┘    │
                    └─────────────────────────────────────────┘
```

### Policy Definition Schema (YAML)

```yaml
# ~/.claude/governance/policies/deltek-engineering.yaml

version: "1.0.0"
name: "Deltek Engineering Standards"
description: "Mandatory governance policies for all Deltek engineering projects"
effective_date: "2026-01-01"
last_updated: "2026-01-26"

# Policy inheritance
extends:
  - "base-security-policies.yaml"
  - "base-quality-policies.yaml"

# Repository Governance
repository:
  allowed_organizations:
    - "github.com/DLTKEngineering"
    - "github.com/deltek-internal"

  branch_naming:
    pattern: "^(feature|bugfix|hotfix|release)/[A-Z]+-[0-9]+-[a-z0-9-]+$"
    examples:
      - "feature/JIRA-123-add-oauth-support"
      - "bugfix/JIRA-456-fix-sql-injection"
    error_message: "Branch name must follow pattern: {type}/JIRA-{ticket}-{description}"

  commit_message:
    pattern: "^(feat|fix|docs|style|refactor|test|chore)(\\([a-z]+\\))?!?: .{10,100}$"
    examples:
      - "feat(auth): implement OAuth 2.0 with MFA support"
      - "fix(security): remediate SQL injection in user query"

  pull_requests:
    required_approvals: 2
    required_reviewers:
      - role: "senior-engineer"
        count: 1
      - role: "security-engineer"
        count: 1
        when: "security-sensitive"
    required_checks:
      - "lint"
      - "test"
      - "security-scan"
      - "coverage"
    merge_strategy: "squash"
    delete_branch_on_merge: true

  protected_branches:
    - name: "main"
      enforce_admins: true
      require_signed_commits: true
    - name: "release/*"
      enforce_admins: true

# Architecture Standards
architecture:
  mandatory_pattern: "layered"

  layers:
    presentation:
      allowed_dependencies: ["application", "domain"]
      forbidden_dependencies: ["infrastructure"]
      responsibilities:
        - "HTTP handling"
        - "Request validation"
        - "Response transformation"
        - "API documentation"

    application:
      allowed_dependencies: ["domain"]
      forbidden_dependencies: ["infrastructure", "presentation"]
      responsibilities:
        - "Use case orchestration"
        - "Transaction management"
        - "DTO transformation"

    domain:
      allowed_dependencies: []
      forbidden_dependencies: ["infrastructure", "presentation", "application"]
      responsibilities:
        - "Business logic"
        - "Domain entities"
        - "Value objects"
        - "Domain services"

    infrastructure:
      allowed_dependencies: ["domain"]
      forbidden_dependencies: ["presentation", "application"]
      responsibilities:
        - "Database access"
        - "External API calls"
        - "Messaging"
        - "File storage"

  principles:
    solid:
      enforcement: "strict"
      violations_block: true

    dry:
      enforcement: "warn"
      max_duplication_lines: 5

    yagni:
      enforcement: "warn"
      unused_code_blocks: true

# Code Quality Standards
code_quality:
  test_coverage:
    minimum_total: 80
    minimum_domain: 90
    minimum_application: 80
    minimum_presentation: 70
    enforcement: "block"

  linting:
    zero_warnings: true
    enforcement: "block"

  type_safety:
    strict_mode: true
    no_any: true
    no_implicit_any: true
    enforcement: "block"

  complexity:
    max_cyclomatic: 10
    max_cognitive: 15
    max_function_lines: 50
    max_file_lines: 300
    enforcement: "warn"

  naming_conventions:
    files: "kebab-case"
    classes: "PascalCase"
    functions: "camelCase"
    constants: "UPPER_SNAKE_CASE"
    enforcement: "block"

# Security Policies
security:
  authentication:
    required: true
    methods:
      - "OAuth 2.0"
      - "SAML 2.0"
      - "OpenID Connect"
    mfa:
      required_for: ["admin", "privileged"]
      methods: ["TOTP", "WebAuthn"]
    session:
      max_duration: 3600  # seconds
      idle_timeout: 900   # seconds
      secure_cookies: true
      httponly_cookies: true

  authorization:
    model: "RBAC"
    require_on_all_endpoints: true
    default_deny: true

  encryption:
    at_rest:
      algorithm: "AES-256"
      key_management: "AWS KMS"
    in_transit:
      minimum_tls: "1.3"
      required: true

  input_validation:
    required: true
    sanitize_output: true
    parameterized_queries_only: true

  secrets:
    no_hardcoded: true
    detection_tools:
      - "gitleaks"
      - "trufflehog"
    management: "AWS Secrets Manager"

  dependencies:
    vulnerability_scanning: true
    block_critical_cve: true
    block_high_cve: true
    max_cvss_allowed: 6.9
    audit_frequency: "daily"

  owasp_top_10:
    enforcement: "block"
    checks:
      - "A01:2021-Broken Access Control"
      - "A02:2021-Cryptographic Failures"
      - "A03:2021-Injection"
      - "A04:2021-Insecure Design"
      - "A05:2021-Security Misconfiguration"
      - "A06:2021-Vulnerable Components"
      - "A07:2021-Auth Failures"
      - "A08:2021-Software Integrity Failures"
      - "A09:2021-Logging Failures"
      - "A10:2021-SSRF"

# Compliance Requirements
compliance:
  dcaa:
    applies_to: ["govcon"]
    requirements:
      - "Timekeeping audit trail"
      - "Cost accumulation tracking"
      - "Labor distribution controls"
    enforcement: "block"

  sox:
    applies_to: ["financial"]
    requirements:
      - "Change management controls"
      - "Access audit logs"
      - "Segregation of duties"
    enforcement: "block"

  gdpr:
    applies_to: ["pii", "eu-data"]
    requirements:
      - "Data subject rights"
      - "Consent tracking"
      - "Data retention policies"
      - "Right to erasure"
    enforcement: "block"

  hipaa:
    applies_to: ["phi", "healthcare"]
    requirements:
      - "PHI encryption"
      - "Access audit trail"
      - "Minimum necessary access"
    enforcement: "block"

# Documentation Standards
documentation:
  required_files:
    - path: "README.md"
      sections:
        - "Overview"
        - "Prerequisites"
        - "Installation"
        - "Configuration"
        - "Usage"
        - "Testing"
        - "Deployment"

    - path: "docs/ARCHITECTURE.md"
      when: "new-project"

    - path: "docs/api/openapi.yaml"
      when: "api-project"

  adr:
    required_for:
      - "technology-choice"
      - "architecture-pattern"
      - "security-decision"
      - "integration-approach"
    location: "docs/adr/"
    format: "ADR-{number}-{title}.md"

  code_comments:
    public_api_docs: true
    complex_logic_explanation: true
    no_todo_in_production: true

# Enforcement Actions
enforcement:
  pre_generation:
    - check: "repository_allowed"
      action: "block"
      message: "Repository not in allowed list"

    - check: "user_authorized"
      action: "block"
      message: "User not authorized for this action"

  during_generation:
    - check: "no_hardcoded_secrets"
      action: "block"
      message: "Hardcoded secret detected"

    - check: "sql_injection_safe"
      action: "block"
      message: "Potential SQL injection vulnerability"

    - check: "architecture_compliance"
      action: "warn"
      message: "Architecture pattern violation"

  post_generation:
    - check: "test_coverage"
      action: "block"
      message: "Test coverage below minimum"

    - check: "security_scan"
      action: "block"
      message: "Security vulnerabilities detected"

    - check: "lint_clean"
      action: "block"
      message: "Linting errors found"
```

### Policy Engine Implementation

```typescript
// policy-engine.ts

interface PolicyEngine {
    // Load policies
    loadPolicies(paths: string[]): Promise<void>;

    // Pre-generation check
    preCheck(context: GenerationContext): Promise<PolicyResult>;

    // During-generation check (streaming)
    streamCheck(chunk: string, context: GenerationContext): PolicyResult;

    // Post-generation check
    postCheck(output: GenerationOutput, context: GenerationContext): Promise<PolicyResult>;

    // Get active policies for context
    getActivePolicies(context: GenerationContext): Policy[];

    // Explain why something was blocked
    explainViolation(violationId: string): ViolationExplanation;
}

interface PolicyResult {
    allowed: boolean;
    violations: PolicyViolation[];
    warnings: PolicyWarning[];
    appliedPolicies: string[];
    executionTime: number;
}

interface PolicyViolation {
    id: string;
    policy: string;
    rule: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    location?: CodeLocation;
    remediation: string;
    references: string[];
}

interface PolicyWarning {
    policy: string;
    rule: string;
    message: string;
    suggestion: string;
}

interface GenerationContext {
    projectId: string;
    repository: string;
    branch: string;
    user: string;
    agentType: string;
    requestType: string;
    complianceScopes: string[];
}

interface GenerationOutput {
    files: FileOutput[];
    testResults?: TestResults;
    securityScan?: SecurityScanResults;
    coverage?: CoverageResults;
}
```

### Policy Enforcement Flow

```
Request: "Create user authentication API"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PRE-GENERATION CHECKS                            │
│                                                                  │
│  1. Repository Check:                                            │
│     ✓ github.com/DLTKEngineering/auth-service → ALLOWED         │
│                                                                  │
│  2. User Authorization:                                          │
│     ✓ User has "developer" role → ALLOWED                       │
│                                                                  │
│  3. Context Requirements:                                        │
│     ✓ Architecture document exists → ALLOWED                    │
│     ✓ Requirements document exists → ALLOWED                    │
│                                                                  │
│  RESULT: PROCEED                                                 │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              DURING-GENERATION CHECKS (Streaming)                │
│                                                                  │
│  Code chunk: "const password = 'admin123';"                      │
│                                                                  │
│  ❌ VIOLATION DETECTED:                                          │
│     - Policy: security.secrets.no_hardcoded                      │
│     - Severity: CRITICAL                                         │
│     - Action: BLOCK                                              │
│                                                                  │
│  Agent Response:                                                 │
│  "I cannot hardcode passwords. Using environment variable:       │
│   const password = process.env.ADMIN_PASSWORD"                   │
│                                                                  │
│  ✓ Code chunk: Parameterized SQL query → ALLOWED                │
│  ✓ Code chunk: bcrypt password hash → ALLOWED                   │
│  ✓ Code chunk: JWT with expiry → ALLOWED                        │
│                                                                  │
│  RESULT: CONTINUE WITH CORRECTIONS                               │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│               POST-GENERATION CHECKS                             │
│                                                                  │
│  1. Test Coverage:                                               │
│     - Total: 85% (minimum: 80%) → ✓ PASS                        │
│     - Domain: 92% (minimum: 90%) → ✓ PASS                       │
│                                                                  │
│  2. Security Scan:                                               │
│     - Critical CVEs: 0 → ✓ PASS                                 │
│     - High CVEs: 0 → ✓ PASS                                     │
│     - OWASP checks: All passing → ✓ PASS                        │
│                                                                  │
│  3. Linting:                                                     │
│     - Errors: 0 → ✓ PASS                                        │
│     - Warnings: 0 → ✓ PASS                                      │
│                                                                  │
│  4. Architecture Compliance:                                     │
│     - Layer violations: 0 → ✓ PASS                              │
│     - Dependency direction: Correct → ✓ PASS                    │
│                                                                  │
│  RESULT: APPROVED FOR DEPLOYMENT                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component 3: Context Injection System

### Context Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           CONTEXT SOURCES                │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Deltek Standards (Org-wide)    │    │
                    │  │  - Coding standards             │    │
                    │  │  - Security policies            │    │
                    │  │  - Architecture patterns        │    │
                    │  │  - Compliance requirements      │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Project Context (Project-level)│    │
                    │  │  - Tech stack                   │    │
                    │  │  - Existing architecture        │    │
                    │  │  - Team conventions             │    │
                    │  │  - ADRs                         │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Historical Context (Memory)    │    │
                    │  │  - Similar implementations      │    │
                    │  │  - Past security findings       │    │
                    │  │  - Proven patterns              │    │
                    │  │  - Anti-patterns to avoid       │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Live Context (Real-time)       │    │
                    │  │  - Current codebase state       │    │
                    │  │  - Open PRs/issues              │    │
                    │  │  - CI/CD status                 │    │
                    │  │  - Dependency versions          │    │
                    │  └─────────────────────────────────┘    │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────────┐
                    │                  │                      │
                    ▼                  ▼                      ▼
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │ Context Ranker  │ │ Context Trimmer │ │ Context Builder │
         │                 │ │                 │ │                 │
         │ - Relevance     │ │ - Token budget  │ │ - Structure     │
         │ - Recency       │ │ - Priority      │ │ - Format        │
         │ - Importance    │ │ - Compression   │ │ - Injection     │
         └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                  │                      │
                    └──────────────────┼──────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────────┐
                    │         ENHANCED AGENT PROMPT           │
                    │                                         │
                    │  [Base Agent Prompt]                    │
                    │  +                                      │
                    │  [Deltek Standards Context]             │
                    │  +                                      │
                    │  [Project Context]                      │
                    │  +                                      │
                    │  [Relevant Memories]                    │
                    │  +                                      │
                    │  [Active Policies]                      │
                    │  +                                      │
                    │  [User Request]                         │
                    └─────────────────────────────────────────┘
```

### Context Injection Service

```typescript
// context-injection-service.ts

interface ContextInjectionService {
    // Build complete context for agent
    buildContext(request: AgentRequest): Promise<EnhancedContext>;

    // Get Deltek standards for topic
    getDeltekStandards(topic: string): Promise<DeltekStandard[]>;

    // Get project context
    getProjectContext(projectId: string): Promise<ProjectContext>;

    // Get historical context from memory
    getHistoricalContext(query: string, options: MemorySearchOptions): Promise<HistoricalContext>;

    // Get live context
    getLiveContext(projectId: string): Promise<LiveContext>;
}

interface EnhancedContext {
    // Original request
    originalRequest: string;

    // Deltek-specific standards
    deltekStandards: {
        architecture: ArchitectureStandard[];
        security: SecurityStandard[];
        compliance: ComplianceRequirement[];
        coding: CodingStandard[];
    };

    // Project-specific context
    projectContext: {
        techStack: TechStack;
        architecture: ArchitectureOverview;
        conventions: CodingConvention[];
        adrs: ADR[];
    };

    // Historical context from memory
    historicalContext: {
        similarImplementations: Memory[];
        relevantPatterns: Memory[];
        securityFindings: Memory[];
        antiPatterns: Memory[];
    };

    // Active policies
    activePolicies: {
        repository: RepositoryPolicy;
        security: SecurityPolicy;
        quality: QualityPolicy;
        compliance: CompliancePolicy[];
    };

    // Token budget tracking
    tokenBudget: {
        total: number;
        used: number;
        remaining: number;
    };
}

// Context priority for trimming when over budget
const CONTEXT_PRIORITY = {
    activePolicies: 1,        // Highest - never trim
    deltekStandards: 2,       // Very high - minimal trim
    projectContext: 3,        // High
    securityFindings: 4,      // Medium-high
    relevantPatterns: 5,      // Medium
    similarImplementations: 6, // Medium-low
    antiPatterns: 7           // Lower - trim first
};
```

### Context Template

```markdown
## ENHANCED AGENT CONTEXT

### DELTEK ENGINEERING STANDARDS (MANDATORY)

#### Architecture Requirements
- Pattern: Layered Architecture (Presentation → Application → Domain → Infrastructure)
- Domain layer must have ZERO external dependencies
- All dependencies point inward

#### Security Requirements
- Authentication: OAuth 2.0 with MFA for privileged access
- Encryption: AES-256 at rest, TLS 1.3 in transit
- No hardcoded secrets - use environment variables or AWS Secrets Manager
- All inputs must be validated
- Parameterized queries only (no string concatenation for SQL)

#### Compliance Requirements (Active for this project)
- [X] SOC2: Audit logging required
- [X] GDPR: PII must be encrypted, consent tracked
- [ ] HIPAA: Not applicable
- [ ] DCAA: Not applicable

### PROJECT CONTEXT

#### Technology Stack
- Runtime: Node.js 20.x
- Framework: Express.js 4.x
- Database: PostgreSQL 15
- ORM: Prisma
- Testing: Jest

#### Existing Architecture
- Services: UserService, AuthService, ProjectService
- API Version: v2
- Authentication: JWT with 15-minute expiry

#### Relevant ADRs
- ADR-001: Use TypeScript strict mode
- ADR-003: JWT authentication with refresh tokens
- ADR-005: Repository pattern for data access

### RELEVANT MEMORIES

#### Similar Implementations
1. **REF-AUTH-2024-03**: OAuth implementation in billing service
   - Worked well: Refresh token rotation
   - Lesson: Always validate redirect URIs

2. **REF-USER-2024-01**: User management API
   - Pattern used: CQRS for user queries
   - Test coverage achieved: 92%

#### Security Findings to Consider
1. **SEC-2024-089**: JWT without expiry vulnerability
   - Always set exp claim
   - Maximum 15 minutes for access tokens

2. **SEC-2024-076**: SQL injection in legacy query
   - Avoid: string concatenation in queries
   - Use: parameterized queries via ORM

#### Anti-Patterns to Avoid
1. Direct database access from controllers
2. Business logic in infrastructure layer
3. Catching and ignoring exceptions

### ACTIVE POLICIES

#### Repository Policy
- Target: github.com/DLTKEngineering/auth-service
- Branch: feature/JIRA-456-oauth-implementation
- Required approvals: 2 (1 senior + 1 security)

#### Quality Gates
- Test coverage: minimum 80%
- Lint: zero warnings
- Security scan: no critical/high findings

---

### YOUR TASK

[Original user request inserted here]

**IMPORTANT**: Follow all Deltek standards above. The governance system will validate your output against these policies.
```

---

## Component 4: Agent Intelligence Layers

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 5: SELF-IMPROVING AGENT (Future)                          │
│                                                                                          │
│  - Analyzes own performance metrics                                                      │
│  - Identifies knowledge gaps                                                             │
│  - Requests human feedback when uncertain                                                │
│  - Updates own behavior based on outcomes                                                │
│  - Suggests prompt improvements                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 4: CONTEXT-AWARE AGENT                                     │
│                                                                                          │
│  - Understands Deltek standards deeply                                                   │
│  - Applies project-specific conventions                                                  │
│  - References historical decisions (ADRs)                                                │
│  - Adapts to team preferences                                                            │
│  - Considers compliance requirements                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 3: POLICY-AWARE AGENT                                      │
│                                                                                          │
│  - Checks compliance before generating                                                   │
│  - Auto-corrects policy violations                                                       │
│  - Blocks non-compliant actions                                                          │
│  - Explains why something was blocked                                                    │
│  - Suggests compliant alternatives                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 2: MEMORY-AUGMENTED AGENT                                  │
│                                                                                          │
│  - Retrieves relevant past experiences                                                   │
│  - Learns from previous successes/failures                                               │
│  - Applies proven patterns automatically                                                 │
│  - Avoids known anti-patterns                                                            │
│  - Reuses validated solutions                                                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: BASE AGENT (Current State)                              │
│                                                                                          │
│  - Executes tasks based on system prompt                                                 │
│  - Uses tools (Read, Write, Edit, Bash)                                                  │
│  - Follows instructions in prompt                                                        │
│  - No persistent memory                                                                  │
│  - No policy awareness                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Intelligence Layer Implementation

```typescript
// agent-intelligence-layers.ts

interface IntelligenceLayer {
    name: string;
    priority: number;
    process(input: LayerInput): Promise<LayerOutput>;
}

// Layer 2: Memory-Augmented
class MemoryAugmentedLayer implements IntelligenceLayer {
    name = "memory-augmented";
    priority = 2;

    async process(input: LayerInput): Promise<LayerOutput> {
        // 1. Search for similar past work
        const similarWork = await this.memoryService.search(
            input.request,
            { collections: ["code_patterns", "architecture_decisions"], limit: 5 }
        );

        // 2. Get proven patterns for this type of task
        const patterns = await this.memoryService.search(
            input.taskType,
            { collections: ["code_patterns"], filters: { quality_score: { $gte: 0.8 } } }
        );

        // 3. Get anti-patterns to avoid
        const antiPatterns = await this.memoryService.search(
            input.request,
            { collections: ["failed_approaches"], limit: 3 }
        );

        return {
            ...input,
            memories: {
                similarWork,
                patterns,
                antiPatterns
            }
        };
    }
}

// Layer 3: Policy-Aware
class PolicyAwareLayer implements IntelligenceLayer {
    name = "policy-aware";
    priority = 3;

    async process(input: LayerInput): Promise<LayerOutput> {
        // 1. Pre-check: Is this request allowed?
        const preCheck = await this.policyEngine.preCheck(input.context);
        if (!preCheck.allowed) {
            return {
                ...input,
                blocked: true,
                blockReason: preCheck.violations,
                suggestedFixes: this.getSuggestedFixes(preCheck.violations)
            };
        }

        // 2. Inject active policies into context
        const activePolicies = this.policyEngine.getActivePolicies(input.context);

        return {
            ...input,
            activePolicies,
            policyInstructions: this.formatPolicyInstructions(activePolicies)
        };
    }
}

// Layer 4: Context-Aware
class ContextAwareLayer implements IntelligenceLayer {
    name = "context-aware";
    priority = 4;

    async process(input: LayerInput): Promise<LayerOutput> {
        // 1. Load Deltek standards
        const deltekStandards = await this.contextService.getDeltekStandards(
            input.taskType
        );

        // 2. Load project context
        const projectContext = await this.contextService.getProjectContext(
            input.projectId
        );

        // 3. Load live context (current state)
        const liveContext = await this.contextService.getLiveContext(
            input.projectId
        );

        return {
            ...input,
            deltekStandards,
            projectContext,
            liveContext
        };
    }
}

// Layer 5: Self-Improving (Future)
class SelfImprovingLayer implements IntelligenceLayer {
    name = "self-improving";
    priority = 5;

    async process(input: LayerInput): Promise<LayerOutput> {
        // 1. Analyze past performance for similar tasks
        const performanceMetrics = await this.analyticsService.getPerformance(
            input.taskType,
            input.agentType
        );

        // 2. Identify confidence level
        const confidence = this.calculateConfidence(input, performanceMetrics);

        // 3. If low confidence, flag for human review
        if (confidence < 0.7) {
            return {
                ...input,
                flagForReview: true,
                uncertaintyReasons: this.identifyUncertainty(input)
            };
        }

        // 4. Apply learned improvements
        const improvements = await this.getLearnedImprovements(input.taskType);

        return {
            ...input,
            confidence,
            appliedImprovements: improvements
        };
    }
}

// Layer Orchestrator
class AgentIntelligenceOrchestrator {
    private layers: IntelligenceLayer[] = [
        new MemoryAugmentedLayer(),
        new PolicyAwareLayer(),
        new ContextAwareLayer(),
        // new SelfImprovingLayer(), // Enable in future
    ];

    async process(request: AgentRequest): Promise<EnhancedAgentRequest> {
        let output: LayerOutput = { ...request };

        // Process through each layer in priority order
        for (const layer of this.layers.sort((a, b) => a.priority - b.priority)) {
            output = await layer.process(output);

            // Stop if blocked
            if (output.blocked) {
                return this.formatBlockedResponse(output);
            }
        }

        return this.formatEnhancedRequest(output);
    }
}
```

---

## Component 5: Data Architecture

### Database Schema

```sql
-- PostgreSQL schema for Governance System

-- Memory metadata storage
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    embedding_id VARCHAR(255), -- Reference to vector DB
    metadata JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deprecated_at TIMESTAMP WITH TIME ZONE,
    deprecation_reason TEXT,
    created_by VARCHAR(255),
    project_id VARCHAR(255),

    CONSTRAINT valid_collection CHECK (collection IN (
        'security_findings', 'code_patterns', 'architecture_decisions',
        'failed_approaches', 'compliance_rules', 'deltek_knowledge'
    ))
);

CREATE INDEX idx_memories_collection ON memories(collection);
CREATE INDEX idx_memories_project ON memories(project_id);
CREATE INDEX idx_memories_metadata ON memories USING GIN(metadata);

-- Policy definitions
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    definition JSONB NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_policies_category ON policies(category);
CREATE INDEX idx_policies_active ON policies(is_active);

-- Policy violations log
CREATE TABLE policy_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES policies(id),
    project_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    location JSONB,
    remediation TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low'))
);

CREATE INDEX idx_violations_project ON policy_violations(project_id);
CREATE INDEX idx_violations_severity ON policy_violations(severity);
CREATE INDEX idx_violations_unresolved ON policy_violations(resolved_at) WHERE resolved_at IS NULL;

-- Context cache
CREATE TABLE context_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    context_type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_context_project_type ON context_cache(project_id, context_type);

-- Agent performance metrics
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    task_type VARCHAR(100),
    success BOOLEAN NOT NULL,
    duration_ms INTEGER,
    token_count_in INTEGER,
    token_count_out INTEGER,
    memory_hits INTEGER DEFAULT 0,
    policy_violations INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_metrics_agent ON agent_metrics(agent_type);
CREATE INDEX idx_metrics_project ON agent_metrics(project_id);
CREATE INDEX idx_metrics_date ON agent_metrics(created_at);

-- Learning events
CREATE TABLE learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    source_agent VARCHAR(100) NOT NULL,
    project_id VARCHAR(255),
    learning JSONB NOT NULL,
    confidence DECIMAL(3,2),
    applied_count INTEGER DEFAULT 0,
    last_applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_type ON learning_events(event_type);
CREATE INDEX idx_learning_agent ON learning_events(source_agent);
```

### File System Structure

```
~/.claude/governance/
├── config/
│   ├── governance-config.yaml     # Main configuration
│   └── embedding-config.yaml      # Embedding model config
│
├── policies/
│   ├── org/                       # Organization-level policies
│   │   ├── deltek-engineering.yaml
│   │   ├── security-baseline.yaml
│   │   └── compliance-rules.yaml
│   │
│   ├── project/                   # Project-level overrides
│   │   └── {project-id}/
│   │       └── policy-overrides.yaml
│   │
│   └── agent/                     # Agent-specific policies
│       ├── engineer-policies.yaml
│       ├── security-policies.yaml
│       └── architect-policies.yaml
│
├── context/
│   ├── deltek-standards/          # Deltek-specific standards
│   │   ├── architecture.yaml
│   │   ├── security.yaml
│   │   ├── compliance.yaml
│   │   └── coding.yaml
│   │
│   └── templates/                 # Context injection templates
│       ├── base-context.md
│       ├── security-context.md
│       └── compliance-context.md
│
├── memory/
│   ├── chromadb/                  # Vector database storage
│   │   ├── chroma.sqlite3
│   │   └── index/
│   │
│   └── backup/                    # JSON backups (human-readable)
│       ├── security_findings/
│       ├── code_patterns/
│       └── architecture_decisions/
│
├── logs/
│   ├── policy-violations.log
│   ├── memory-operations.log
│   └── agent-metrics.log
│
└── scripts/
    ├── init-governance.sh
    ├── migrate-memory.sh
    └── policy-validator.sh
```

---

## Implementation Plan

### Phase 1: RAG Memory System (4 weeks)

**Week 1-2: Core Infrastructure**
- [ ] Set up ChromaDB with persistence
- [ ] Implement embedding service (OpenAI + local fallback)
- [ ] Create memory collection schemas
- [ ] Build Memory Service API

**Week 3: Integration**
- [ ] Integrate memory service with all agents
- [ ] Implement memory retrieval flow
- [ ] Add memory storage after agent execution
- [ ] Create memory search UI in dashboard

**Week 4: Migration & Testing**
- [ ] Migrate existing file-based memory to vectors
- [ ] Test semantic search accuracy
- [ ] Performance optimization
- [ ] Documentation

### Phase 2: Policy Engine (3 weeks)

**Week 1: Policy Framework**
- [ ] Design policy YAML schema
- [ ] Implement policy parser
- [ ] Create policy validation engine
- [ ] Build policy inheritance system

**Week 2: Enforcement**
- [ ] Implement pre-generation checks
- [ ] Implement during-generation checks (streaming)
- [ ] Implement post-generation checks
- [ ] Create violation handler

**Week 3: Integration & Testing**
- [ ] Integrate with agent execution flow
- [ ] Create policy management UI
- [ ] Test with real policies
- [ ] Documentation

### Phase 3: Context Injection (3 weeks)

**Week 1: Context Sources**
- [ ] Implement Deltek standards loader
- [ ] Implement project context retrieval
- [ ] Implement live context gathering
- [ ] Create context ranking algorithm

**Week 2: Context Builder**
- [ ] Implement context trimming (token budget)
- [ ] Create context templates
- [ ] Build context injection service
- [ ] Integrate with memory service

**Week 3: Testing & Optimization**
- [ ] Test context relevance
- [ ] Optimize token usage
- [ ] Performance testing
- [ ] Documentation

### Phase 4: Intelligence Layers (4 weeks)

**Week 1-2: Layer Implementation**
- [ ] Implement Memory-Augmented Layer
- [ ] Implement Policy-Aware Layer
- [ ] Implement Context-Aware Layer
- [ ] Create Layer Orchestrator

**Week 3: Integration**
- [ ] Integrate layers with all agents
- [ ] Test layer interaction
- [ ] Performance optimization
- [ ] Error handling

**Week 4: Monitoring & Analytics**
- [ ] Implement agent metrics collection
- [ ] Create analytics dashboard
- [ ] Set up alerting
- [ ] Documentation

---

## Migration Strategy

### Migrating Existing File-Based Memory

```python
# migrate_memory.py

import json
import os
from pathlib import Path
from chromadb import Client
from datetime import datetime

def migrate_file_memory_to_vectors():
    """Migrate existing JSON memory files to ChromaDB vectors."""

    # Source directories
    source_dirs = {
        'patterns': '~/.claude/architect-memory/patterns/',
        'products': '~/.claude/architect-memory/products/',
        'technologies': '~/.claude/architect-memory/technologies/',
        'knowledge': '~/.claude/architect-memory/knowledge-base/'
    }

    # Target collections
    collection_mapping = {
        'patterns': 'code_patterns',
        'products': 'deltek_knowledge',
        'technologies': 'code_patterns',
        'knowledge': 'architecture_decisions'
    }

    chroma = Client()

    for source_type, source_dir in source_dirs.items():
        dir_path = Path(source_dir).expanduser()
        if not dir_path.exists():
            continue

        collection_name = collection_mapping[source_type]
        collection = chroma.get_or_create_collection(collection_name)

        for json_file in dir_path.glob('**/*.json'):
            with open(json_file) as f:
                data = json.load(f)

            # Convert to memory format
            memories = convert_to_memories(data, source_type, json_file.name)

            # Store in vector DB
            for memory in memories:
                collection.add(
                    documents=[memory['content']],
                    metadatas=[memory['metadata']],
                    ids=[memory['id']]
                )

            # Keep JSON backup
            backup_path = Path(f'~/.claude/governance/memory/backup/{collection_name}/').expanduser()
            backup_path.mkdir(parents=True, exist_ok=True)
            shutil.copy(json_file, backup_path / json_file.name)

    print(f"Migration complete. Backed up to ~/.claude/governance/memory/backup/")
```

### Onboarding Existing Projects

```yaml
# project-onboarding-checklist.yaml

onboarding_steps:
  - step: 1
    name: "Policy Assessment"
    tasks:
      - "Identify applicable compliance requirements"
      - "Determine project-specific policy overrides needed"
      - "Create policy override file if necessary"
    output: "policies/project/{project-id}/policy-overrides.yaml"

  - step: 2
    name: "Context Setup"
    tasks:
      - "Document current tech stack"
      - "Export existing ADRs"
      - "Identify team conventions"
      - "Map integration points"
    output: "Project context loaded into context service"

  - step: 3
    name: "Memory Seeding"
    tasks:
      - "Import past security findings"
      - "Import proven code patterns"
      - "Import architecture decisions"
      - "Mark deprecated patterns"
    output: "Historical memories in vector database"

  - step: 4
    name: "Validation"
    tasks:
      - "Run policy validation on existing codebase"
      - "Identify compliance gaps"
      - "Create remediation plan"
      - "Test agent with governance enabled"
    output: "Validation report + remediation plan"

  - step: 5
    name: "Activation"
    tasks:
      - "Enable governance for project"
      - "Configure alerting"
      - "Train team on governance features"
      - "Monitor first week of usage"
    output: "Project fully onboarded"
```

### Rollback Plan

```yaml
# rollback-plan.yaml

rollback_scenarios:
  - scenario: "Memory service unavailable"
    detection: "Memory service health check fails"
    action:
      - "Fall back to file-based memory (JSON files)"
      - "Queue memory operations for later sync"
      - "Alert operations team"
    recovery:
      - "Restart memory service"
      - "Replay queued operations"
      - "Verify data consistency"

  - scenario: "Policy engine blocking valid requests"
    detection: "Spike in policy violations or user complaints"
    action:
      - "Enable 'warn-only' mode (log but don't block)"
      - "Review recent policy changes"
      - "Identify false positives"
    recovery:
      - "Fix policy rules"
      - "Add exceptions where appropriate"
      - "Re-enable enforcement mode"

  - scenario: "Context injection causing timeouts"
    detection: "Agent response time > 30s"
    action:
      - "Reduce context size (aggressive trimming)"
      - "Disable non-critical context sources"
      - "Use cached context only"
    recovery:
      - "Optimize context retrieval"
      - "Increase caching"
      - "Gradually re-enable context sources"

  - scenario: "Full system rollback needed"
    detection: "Multiple critical issues"
    action:
      - "Disable governance gateway"
      - "Revert to previous agent versions"
      - "Restore from backup"
    recovery:
      - "Root cause analysis"
      - "Fix issues in staging"
      - "Gradual re-enablement"
```

---

## Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Policy Compliance Rate** | 100% | No code reaches repo without passing all checks |
| **Secret Detection Rate** | 100% | No secrets committed to any repository |
| **Memory Hit Rate** | >70% | Percentage of requests that use relevant memories |
| **Context Relevance Score** | >0.85 | Measured by agent feedback on context usefulness |
| **False Positive Rate** | <5% | Policy violations that are actually valid code |
| **Agent Response Time** | <10s overhead | Time added by governance layers |
| **Pattern Reuse Rate** | >60% | Percentage of code using proven patterns |
| **Security Finding Reuse** | >80% | Past findings preventing future vulnerabilities |

### Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE SYSTEM DASHBOARD                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Policy Status   │  │ Memory Health   │  │ Agent Metrics   │             │
│  │                 │  │                 │  │                 │             │
│  │ Compliance: 99% │  │ Vectors: 45,234 │  │ Requests: 1,234 │             │
│  │ Violations: 12  │  │ Collections: 6  │  │ Blocked: 23     │             │
│  │ Warnings: 45    │  │ Index Health: OK│  │ Avg Time: 2.3s  │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ Recent Policy Violations                                   │            │
│  ├────────────────────────────────────────────────────────────┤            │
│  │ 1. SEC-CRITICAL: Hardcoded API key detected (BLOCKED)     │            │
│  │ 2. ARCH-WARN: Domain layer importing infrastructure       │            │
│  │ 3. TEST-WARN: Coverage 78% (below 80% threshold)         │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ Memory Usage Analytics                                     │            │
│  ├────────────────────────────────────────────────────────────┤            │
│  │ Top Queries:                                               │            │
│  │   - "authentication patterns" (234 hits)                  │            │
│  │   - "SQL injection prevention" (189 hits)                 │            │
│  │   - "Costpoint integration" (156 hits)                    │            │
│  │                                                            │            │
│  │ Memory Effectiveness:                                      │            │
│  │   [████████████░░░░░░░░] 72% patterns reused              │            │
│  │   [██████████████░░░░░░] 85% findings applied             │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision Records

See accompanying ADR documents:

- **ADR-001-VECTOR-DATABASE.md** - ChromaDB selection rationale
- **ADR-002-POLICY-ENGINE.md** - Policy engine architecture
- **ADR-003-CONTEXT-INJECTION.md** - Context injection strategy
- **ADR-004-MEMORY-FORMAT.md** - Memory storage format decisions
- **ADR-005-INTELLIGENCE-LAYERS.md** - Agent intelligence layer design

---

## Appendix A: Deltek-Specific Governance Rules

```yaml
# deltek-specific-rules.yaml

deltek_products:
  costpoint:
    api_standards:
      - "Use official Costpoint REST API"
      - "Never access database directly"
      - "Respect module boundaries"

    compliance:
      - "DCAA timekeeping compliance"
      - "Audit trail for all financial transactions"
      - "Labor distribution controls"

    integration_patterns:
      - "Use middleware for transformations"
      - "Implement retry logic for API calls"
      - "Log all integration transactions"

  vantagepoint:
    api_standards:
      - "Use Vantagepoint REST API v2+"
      - "Implement proper pagination"
      - "Handle rate limiting gracefully"

    data_patterns:
      - "Project-centric data model"
      - "Employee resource management"
      - "Time entry validation rules"

  govwin:
    api_standards:
      - "Use GovWin IQ API"
      - "Cache opportunity data appropriately"
      - "Handle data freshness requirements"

    integration_patterns:
      - "Opportunity sync to ERP"
      - "Competitor intelligence mapping"
      - "Pipeline management integration"

cross_product_rules:
  - "Single sign-on across products where supported"
  - "Consistent error handling patterns"
  - "Unified logging format"
  - "Common security baseline"
```

---

## Appendix B: Security Policy Details

```yaml
# security-policy-details.yaml

owasp_top_10_checks:
  A01_broken_access_control:
    checks:
      - "Authorization on all endpoints"
      - "RBAC properly implemented"
      - "No privilege escalation paths"
    agent_instruction: |
      Always implement authorization checks. Use decorators or middleware
      to enforce access control. Never rely on client-side checks alone.

  A02_cryptographic_failures:
    checks:
      - "TLS 1.3 for all connections"
      - "AES-256 for data at rest"
      - "No deprecated algorithms"
    agent_instruction: |
      Use only approved encryption algorithms. Never implement custom crypto.
      Always use secure random number generation.

  A03_injection:
    checks:
      - "Parameterized queries only"
      - "Input validation on all user data"
      - "Output encoding for HTML/JS contexts"
    agent_instruction: |
      Never concatenate user input into queries or commands.
      Always use ORM parameterized queries or prepared statements.
      Validate and sanitize all inputs at boundaries.

  A04_insecure_design:
    checks:
      - "Threat modeling performed"
      - "Security requirements documented"
      - "Defense in depth applied"
    agent_instruction: |
      Consider security at design time. Apply layered security controls.
      Document security assumptions and requirements.

  A05_security_misconfiguration:
    checks:
      - "No default credentials"
      - "Error messages don't leak info"
      - "Security headers configured"
    agent_instruction: |
      Configure security headers (CSP, HSTS, X-Frame-Options).
      Disable debug mode in production. Remove default accounts.

  A06_vulnerable_components:
    checks:
      - "Dependencies scanned daily"
      - "No critical CVEs"
      - "No high CVEs without mitigation"
    agent_instruction: |
      Keep dependencies updated. Monitor security advisories.
      Have a process for emergency patching.

  A07_auth_failures:
    checks:
      - "Strong password policy"
      - "MFA for privileged access"
      - "Secure session management"
    agent_instruction: |
      Implement MFA. Use secure session handling.
      Rate limit authentication attempts.

  A08_software_integrity:
    checks:
      - "Dependencies verified"
      - "CI/CD pipeline secured"
      - "Code signing where applicable"
    agent_instruction: |
      Verify dependency integrity. Use lock files.
      Secure the build pipeline.

  A09_logging_failures:
    checks:
      - "Security events logged"
      - "Logs protected from tampering"
      - "Alerting on suspicious activity"
    agent_instruction: |
      Log all security-relevant events. Include trace IDs.
      Never log sensitive data. Send logs to SIEM.

  A10_ssrf:
    checks:
      - "URL validation on user input"
      - "Allowlist for external calls"
      - "No internal network exposure"
    agent_instruction: |
      Validate and sanitize URLs. Use allowlists for external resources.
      Block requests to internal network ranges.
```

---

**Document Status**: PROPOSED
**Next Steps**:
1. Review with engineering leadership
2. Create detailed ADRs
3. Prototype memory service
4. Begin Phase 1 implementation

**Author**: Jets (Architect Agent)
**Reviewed By**: [Pending]
**Approved By**: [Pending]
