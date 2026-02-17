# ARCH-20260216-CLAUDE-AISDLC-INTEGRATION

## Architecture: Claude Code <> AI-SDLC Platform Integration

**Version**: 1.0.0
**Date**: 2026-02-16
**Author**: Jets (World-Class Architect)
**Status**: Proposed
**Classification**: Strategic Integration Architecture

---

## 1. Executive Summary

### Problem

Claude Code users currently interact with the LLM in an ad-hoc, unstructured manner. Code is written without governance, tracking, or quality gates. The AI-SDLC platform exists as a powerful parallel system with 12 specialized agents, collective memory, governance engine, and full SDLC workflow support -- but it requires manual invocation via `/sdlc-*` commands and sits disconnected from the natural Claude Code experience.

### Solution

Design a **Request Interception Layer** that sits between the user and Claude Code, automatically classifying every request, routing code-affecting work through AI-SDLC agents, enforcing configurable governance, and presenting a seamless experience where the user never needs to know the machinery underneath -- unless they want to.

### Architecture Summary

```
USER
  |
  v
[Claude Code CLI]
  |
  v
[UserPromptSubmit Hook] -----> [Request Classifier]
  |                                    |
  |                          [Classification Result]
  |                                    |
  v                                    v
[MCP Server: aisdlc-platform]   [Smart Router]
  |                                    |
  |         +----+----+----+----+------+------+
  |         |    |    |    |    |      |      |
  |         v    v    v    v    v      v      v
  |       [QA] [BA] [ENG][SEC][ARCH] [TOM] [Direct]
  |                                           |
  v                                           v
[Governance Engine] <----> [Quality Gates]  [Claude]
  |
  v
[Control Center Dashboard]
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Integration mechanism | Hybrid: Claude Code Hooks + MCP Server | Hooks for interception, MCP for tools and context |
| Classification engine | LLM-based with rule fallback | Accuracy over speed; rules catch obvious patterns |
| Governance model | 4-level configurable | Supports startups through regulated enterprises |
| Router pattern | Strategy pattern with chain of responsibility | Clean separation of routing logic per request type |
| Configuration format | YAML with per-project overrides | Human-readable, git-committable, hierarchical |
| State management | File-based (dev) / PostgreSQL (prod) | Consistent with existing agent mesh architecture |

---

## 2. Current State Analysis

### What Exists Today

```
COMPONENT                         STATUS    INTEGRATION READINESS
---------------------------------------------------------------------------
Agent Mesh (12 agents)            BUILT     HIGH  - Well-typed, message bus ready
Governance Engine                 BUILT     HIGH  - Policy YAML, validators, enforcers
Collective Memory                 BUILT     HIGH  - File + PostgreSQL providers
Event Bus                         BUILT     HIGH  - File + BullMQ providers
Control Center Dashboard          BUILT     MEDIUM - Needs request flow views
SDLC Commands (/sdlc-*)          BUILT     HIGH  - CLI interface ready
Learning Engine                   BUILT     MEDIUM - Can capture integration learnings
Conflict Resolution               BUILT     LOW   - Not directly needed for integration
Agentic Platform Architecture     DESIGNED  N/A   - Strategic roadmap (ARCH-AGENTIC-PLATFORM)
```

### What Is Missing

| Component | Gap Description | Priority |
|---|---|---|
| **Request Classifier** | No mechanism to analyze and categorize user messages | CRITICAL |
| **Smart Router** | No logic to route classified requests to appropriate handlers | CRITICAL |
| **Claude Code Hooks** | No `UserPromptSubmit` or `Stop` hooks configured | CRITICAL |
| **MCP Server** | No MCP server exposing AI-SDLC tools to Claude Code | HIGH |
| **Governance Levels** | Governance engine exists but lacks tiered level support | HIGH |
| **Configuration System** | No unified YAML config for integration behavior | HIGH |
| **Request Registry** | No tracking of all requests (including bypassed ones) | MEDIUM |
| **Dashboard Views** | No real-time request flow visualization | MEDIUM |

### Integration Points in Claude Code

Claude Code provides these integration points (confirmed from documentation):

1. **Hooks** (settings.json):
   - `UserPromptSubmit` -- Intercept before Claude processes the prompt
   - `Stop` -- Execute after Claude finishes responding
   - `PreToolUse` / `PostToolUse` -- Intercept tool usage
   - `TaskCompleted` -- When a Task agent completes

2. **MCP Servers** (settings.json):
   - Expose custom tools to Claude Code
   - Expose resources as `@`-mentionable context
   - Expose prompts as `/`-commands
   - OAuth 2.0 authentication for remote servers
   - Tool Search reduces context overhead by 85%

3. **CLAUDE.md** -- Project-level instructions injected into every conversation

4. **Settings files** -- `~/.claude/settings.json` (user) and `.claude/settings.json` (project)

---

## 3. Target Architecture

### 3.1 High-Level Architecture

```
                    CLAUDE CODE <> AI-SDLC INTEGRATION ARCHITECTURE
==========================================================================

                         USER INTERFACE
    +----------------------------------------------------------+
    |  Claude Code CLI                                          |
    |  $ claude "Add authentication with OAuth 2.0"            |
    +---------------------------+------------------------------+
                                |
                    INTERCEPTION LAYER
    +---------------------------v------------------------------+
    |                                                          |
    |   [UserPromptSubmit Hook]                                |
    |         |                                                |
    |         v                                                |
    |   [Request Classifier]                                   |
    |   - LLM-based classification (structured output)         |
    |   - Rule-based fallback for speed                        |
    |   - Context-aware (git status, open files, history)      |
    |         |                                                |
    |         v                                                |
    |   [Smart Router]                                         |
    |   - Maps classification to handler                       |
    |   - Applies governance rules                             |
    |   - Selects SDLC phases                                  |
    |         |                                                |
    |   +-----+-----+-----+-----+-----+-----+-----+          |
    |   |     |     |     |     |     |     |     |          |
    |   v     v     v     v     v     v     v     v          |
    | [PASS] [SDLC] [FIX] [REV] [ARCH][EMR] [QA] [OPS]     |
    |                                                          |
    +---------------------------+------------------------------+
                                |
                    MCP TOOL LAYER
    +---------------------------v------------------------------+
    |                                                          |
    |   MCP Server: aisdlc-platform                            |
    |                                                          |
    |   TOOLS:                                                 |
    |   - aisdlc_classify    (classify a request)              |
    |   - aisdlc_start       (start full SDLC workflow)        |
    |   - aisdlc_review      (code review)                     |
    |   - aisdlc_ask_tom     (problem solving)                 |
    |   - aisdlc_status      (workflow status)                 |
    |   - aisdlc_governance  (check governance)                |
    |   - aisdlc_memory      (search collective memory)        |
    |   - aisdlc_config      (view/update config)              |
    |                                                          |
    |   RESOURCES:                                             |
    |   - @aisdlc://registry  (all tracked work items)         |
    |   - @aisdlc://memory    (collective knowledge)           |
    |   - @aisdlc://config    (current configuration)          |
    |   - @aisdlc://health    (system health status)           |
    |                                                          |
    |   PROMPTS (Commands):                                    |
    |   - /mcp__aisdlc__sdlc_start                             |
    |   - /mcp__aisdlc__sdlc_review                            |
    |   - /mcp__aisdlc__sdlc_status                            |
    |   - /mcp__aisdlc__sdlc_config                            |
    |                                                          |
    +---------------------------+------------------------------+
                                |
                    GOVERNANCE LAYER
    +---------------------------v------------------------------+
    |                                                          |
    |   [Governance Engine]                                    |
    |   - Level 1: Tracking Only                               |
    |   - Level 2: Light Governance (recommended)              |
    |   - Level 3: Full Governance                             |
    |   - Level 4: Audit Mode (compliance)                     |
    |                                                          |
    |   [Quality Gates]                                        |
    |   - Pre-commit validation                                |
    |   - Security review (blocking/non-blocking)              |
    |   - QA testing (blocking/non-blocking)                   |
    |   - Architecture compliance                              |
    |                                                          |
    +---------------------------+------------------------------+
                                |
                    AGENT MESH LAYER
    +---------------------------v------------------------------+
    |                                                          |
    |   +------+ +------+ +------+ +------+ +------+          |
    |   | BA   | | Jets | |  UX  | | Eng  | | Sec  |          |
    |   +------+ +------+ +------+ +------+ +------+          |
    |   +------+ +------+ +------+ +------+ +------+          |
    |   |  QA  | | Atlas| | Cust | | Tom  | |FinOps|          |
    |   +------+ +------+ +------+ +------+ +------+          |
    |   +------------+                                         |
    |   | Conductor  | <-- Orchestrates agent workflows        |
    |   +------------+                                         |
    |                                                          |
    |   [Message Bus] [Collective Memory] [Learning Engine]    |
    |   [Event Bus]   [Audit Log]         [Conflict Resolver]  |
    |                                                          |
    +---------------------------+------------------------------+
                                |
                    OBSERVABILITY LAYER
    +---------------------------v------------------------------+
    |                                                          |
    |   [Control Center Dashboard]                             |
    |   - Real-time request flow visualization                 |
    |   - Classification accuracy metrics                      |
    |   - Governance compliance dashboard                      |
    |   - Active workflow monitoring                            |
    |   - Cost tracking (tokens, time, money)                  |
    |   - Agent utilization metrics                            |
    |                                                          |
    |   [Request Registry]                                     |
    |   - Every request logged with classification             |
    |   - Routing decisions tracked                            |
    |   - Governance gate results recorded                     |
    |   - Outcome tracked (success/failure/override)           |
    |                                                          |
    +----------------------------------------------------------+
```

### 3.2 Component Details

#### 3.2.1 Request Classifier

The classifier determines what kind of work a user request represents and what level of SDLC process is appropriate.

**Classification Schema:**

```typescript
// File: src/integration/domain/entities/RequestClassification.ts

export type RequestType =
  | 'qa'              // Simple question/answer
  | 'explanation'     // Explain concept or code
  | 'code-change'     // New feature, refactor, or code modification
  | 'bug-fix'         // Fix a specific bug or error
  | 'architecture'    // Design or architectural decision
  | 'review'          // Code review, security review
  | 'emergency'       // Production incident, critical fix
  | 'devops'          // Infrastructure, deployment, CI/CD
  | 'documentation'   // Write or update docs
  | 'testing'         // Write or run tests
  | 'configuration';  // Config changes, environment setup

export type Complexity = 'trivial' | 'simple' | 'medium' | 'complex' | 'epic';

export type Urgency = 'low' | 'normal' | 'high' | 'critical';

export interface RequestClassification {
  id: string;
  timestamp: string;
  userMessage: string;
  messageHash: string;

  // Classification results
  type: RequestType;
  complexity: Complexity;
  urgency: Urgency;
  confidence: number;  // 0.0 to 1.0

  // Routing decisions
  requiresSDLC: boolean;
  requiredPhases: SDLCPhase[];
  optionalPhases: SDLCPhase[];
  estimatedDuration: string;      // "2 minutes", "20 minutes", "2 hours"
  estimatedTokens: number;

  // Context
  detectedTechnologies: string[];
  affectedFiles: string[];
  gitContext: {
    branch: string;
    hasUncommittedChanges: boolean;
    isProtectedBranch: boolean;
  };

  // Classification metadata
  classifierUsed: 'llm' | 'rules' | 'hybrid';
  classificationDuration: number;  // ms
  rulesMatched: string[];
}

export type SDLCPhase =
  | 'requirements'   // BA agent
  | 'architecture'   // Jets agent
  | 'ux-design'      // UX agent
  | 'implementation' // Engineer agent
  | 'security'       // Security agent
  | 'testing'        // QA agent
  | 'deployment'     // Atlas agent
  | 'acceptance'     // Customer agent
  | 'tracking'       // Tracker agent
  | 'cost-analysis'; // FinOps agent
```

**Classification Strategy:**

The classifier uses a two-tier approach for speed and accuracy:

```
                CLASSIFICATION PIPELINE
                =====================

    User Message
         |
         v
    [Tier 1: Rule-Based Heuristics]  (< 50ms)
    - Keyword matching for obvious patterns
    - Regex for emergency keywords
    - Message length heuristics
    - Question mark detection for Q&A
    - File path detection for targeted changes
         |
         |-- High confidence (>= 0.9)? --> Return immediately
         |
         v
    [Tier 2: LLM Classification]  (< 2 seconds)
    - Claude Haiku for speed
    - Structured JSON output
    - Context-enriched prompt:
      * Git status (branch, uncommitted changes)
      * Recent conversation history
      * Open file list
      * Project type detection
         |
         v
    [Merge Results]
    - Combine rule scores with LLM classification
    - Higher confidence wins
    - Log disagreements for learning
         |
         v
    [RequestClassification]
```

**Tier 1 Rule Examples:**

```typescript
// File: src/integration/infrastructure/classifiers/RuleClassifier.ts

const RULES: ClassificationRule[] = [
  // Q&A patterns
  {
    name: 'simple-question',
    pattern: /^(what|how|why|when|where|who|can you explain|tell me about)\s/i,
    conditions: [(msg) => msg.length < 200, (msg) => !msg.includes('code')],
    result: { type: 'qa', complexity: 'trivial', requiresSDLC: false },
    confidence: 0.85,
  },

  // Emergency patterns
  {
    name: 'production-emergency',
    pattern: /\b(urgent|critical|production\s+down|outage|500\s+error|crash|data\s+loss)\b/i,
    conditions: [],
    result: { type: 'emergency', urgency: 'critical', requiresSDLC: true },
    confidence: 0.95,
  },

  // Trivial changes
  {
    name: 'trivial-fix',
    pattern: /\b(fix\s+typo|update\s+readme|fix\s+spelling|rename|update\s+comment)\b/i,
    conditions: [(msg) => msg.length < 100],
    result: { type: 'code-change', complexity: 'trivial', requiresSDLC: false },
    confidence: 0.90,
  },

  // Code generation
  {
    name: 'new-feature',
    pattern: /\b(add|build|create|implement|develop|write)\s+(a\s+)?(new\s+)?(feature|component|service|api|endpoint|module|system|page)/i,
    conditions: [],
    result: { type: 'code-change', complexity: 'medium', requiresSDLC: true },
    confidence: 0.80,
  },

  // Architecture requests
  {
    name: 'architecture-request',
    pattern: /\b(design|architect|choose|evaluate|compare|tech\s+stack|system\s+design|scalab)/i,
    conditions: [],
    result: { type: 'architecture', complexity: 'complex', requiresSDLC: true },
    confidence: 0.80,
  },

  // Review requests
  {
    name: 'review-request',
    pattern: /\b(review|audit|check|analyze|evaluate|assess)\s+(this\s+)?(code|security|performance|implementation)/i,
    conditions: [],
    result: { type: 'review', complexity: 'medium', requiresSDLC: true },
    confidence: 0.85,
  },
];
```

**Tier 2 LLM Prompt:**

```typescript
// File: src/integration/infrastructure/classifiers/LLMClassifier.ts

const CLASSIFICATION_PROMPT = `You are a request classifier for an AI-powered SDLC platform.

Analyze the following user message and classify it. Consider the context provided.

USER MESSAGE:
{userMessage}

CONTEXT:
- Git branch: {branch}
- Uncommitted changes: {uncommittedChanges}
- Project type: {projectType}
- Recent conversation: {recentContext}

Respond with ONLY this JSON structure:
{
  "type": one of ["qa", "explanation", "code-change", "bug-fix", "architecture", "review", "emergency", "devops", "documentation", "testing", "configuration"],
  "complexity": one of ["trivial", "simple", "medium", "complex", "epic"],
  "urgency": one of ["low", "normal", "high", "critical"],
  "confidence": number between 0 and 1,
  "requiresSDLC": boolean,
  "requiredPhases": array of phases needed,
  "reasoning": "brief explanation of classification"
}

CLASSIFICATION RULES:
1. Q&A and explanations NEVER require SDLC
2. Trivial changes (typos, comments, formatting) do NOT require SDLC
3. Any new feature or significant code change REQUIRES SDLC
4. Bug fixes require SDLC unless trivial (one-line fix)
5. Architecture decisions ALWAYS require SDLC
6. Emergency items require SDLC with abbreviated phases
7. If the message mentions "production", "deploy", or "release", increase urgency
8. If complexity is "epic", all phases are required`;
```

#### 3.2.2 Smart Router

The router maps classifications to concrete actions, applying governance rules.

```
                ROUTING DECISION TREE
                ====================

    RequestClassification
           |
           v
    [Check Governance Level]
           |
    +------+------+------+------+
    |      |      |      |      |
    v      v      v      v      v
  Level 1  Level 2 Level 3 Level 4
  Track    Light   Full   Audit
           |
           v
    [Apply Routing Strategy]
           |
    +------+------+------+------+------+------+
    |      |      |      |      |      |      |
    v      v      v      v      v      v      v

  type=qa          --> PASSTHROUGH (direct Claude response)
  type=explanation --> PASSTHROUGH (direct Claude response)

  complexity=trivial AND type!=emergency
                   --> OPTIMIZED (Engineer only, minimal tracking)

  type=emergency   --> EMERGENCY (Ask Tom immediately, parallel Engineer)

  type=code-change, complexity=simple
                   --> LIGHT SDLC (BA skip, Eng + Security + QA)

  type=code-change, complexity=medium+
                   --> FULL SDLC (BA + Arch + Eng + Security + QA)

  type=architecture
                   --> ARCHITECTURE (BA + Jets + Security, no Eng)

  type=review      --> REVIEW (Security + QA, targeted review)

  type=bug-fix     --> BUG FIX (Eng + QA, optional Security)

  type=devops      --> DEVOPS (Atlas + Security)

  type=testing     --> TESTING (QA + Eng)

  type=documentation
                   --> DOCS (BA + Eng, minimal governance)

  type=configuration
                   --> CONFIG (Eng + Security)
```

**Router Implementation:**

```typescript
// File: src/integration/application/services/SmartRouter.ts

interface RoutingDecision {
  strategy: RoutingStrategy;
  phases: SDLCPhase[];
  agents: AgentId[];
  governanceLevel: GovernanceLevel;
  sdlcCommand: string | null;      // /sdlc-start, /sdlc-review, etc.
  contextInjection: string;        // Additional context for Claude
  estimatedDuration: string;
  blocking: boolean;               // Does this block the user response?
  parallel: boolean;               // Can agents run in parallel?
}

type RoutingStrategy =
  | 'passthrough'       // Direct Claude response, log only
  | 'optimized'         // Minimal SDLC, fast path
  | 'light-sdlc'       // Abbreviated workflow
  | 'full-sdlc'        // Complete workflow
  | 'emergency'         // Fastest resolution path
  | 'architecture'      // Architecture-focused workflow
  | 'review'            // Review-focused workflow
  | 'devops';           // Infrastructure-focused workflow
```

**Routing Matrix:**

| Request Type | Complexity | Strategy | Required Agents | Est. Duration |
|---|---|---|---|---|
| qa | any | passthrough | none | 2s |
| explanation | any | passthrough | none | 5s |
| code-change | trivial | optimized | engineer | 1m |
| code-change | simple | light-sdlc | eng, qa | 5m |
| code-change | medium | full-sdlc | ba, eng, sec, qa | 15m |
| code-change | complex | full-sdlc | ba, jets, eng, sec, qa | 30m |
| code-change | epic | full-sdlc | all agents | 2h |
| bug-fix | trivial | optimized | engineer | 2m |
| bug-fix | simple | light-sdlc | eng, qa | 5m |
| bug-fix | medium+ | full-sdlc | eng, sec, qa | 15m |
| architecture | any | architecture | ba, jets, sec | 20m |
| review | any | review | sec, qa | 10m |
| emergency | any | emergency | ask-tom, eng | 5m |
| devops | any | devops | atlas, sec | 10m |
| testing | any | optimized | qa, eng | 10m |
| documentation | any | optimized | eng | 5m |
| configuration | any | optimized | eng, sec | 5m |

#### 3.2.3 Governance Engine (Enhanced)

The existing governance engine is extended with tiered governance levels.

```
                    GOVERNANCE LEVELS
                    =================

    Level 1: TRACKING ONLY
    +--------------------------------------------------+
    |  - Log all requests to registry                   |
    |  - Generate documentation automatically           |
    |  - No blocking gates                             |
    |  - No approval required                          |
    |  - Cost tracking enabled                         |
    |  Use case: Solo developer, rapid prototyping     |
    +--------------------------------------------------+

    Level 2: LIGHT GOVERNANCE (Recommended)
    +--------------------------------------------------+
    |  Everything in Level 1, plus:                    |
    |  - Security review (non-blocking, advisory)      |
    |  - QA testing (non-blocking, advisory)           |
    |  - Architecture check for complex changes        |
    |  - Can override any gate with reason             |
    |  Use case: Small teams, startups, internal tools |
    +--------------------------------------------------+

    Level 3: FULL GOVERNANCE
    +--------------------------------------------------+
    |  Everything in Level 2, plus:                    |
    |  - Security review BLOCKING                      |
    |  - QA testing BLOCKING                           |
    |  - Architecture review BLOCKING for complex      |
    |  - Customer acceptance for features              |
    |  - Cannot bypass without approval token          |
    |  Use case: Production systems, client work       |
    +--------------------------------------------------+

    Level 4: AUDIT MODE
    +--------------------------------------------------+
    |  Everything in Level 3, plus:                    |
    |  - Every change requires approval workflow       |
    |  - Full audit trail with tamper detection        |
    |  - Compliance checks (SOC2, HIPAA, etc.)        |
    |  - Segregation of duties enforcement            |
    |  - Retention policies enforced                   |
    |  Use case: Regulated industries, government      |
    +--------------------------------------------------+
```

**Governance Decision Flow:**

```typescript
// File: src/integration/application/services/GovernanceGatekeeper.ts

interface GovernanceDecision {
  allowed: boolean;
  level: GovernanceLevel;
  gates: GateResult[];
  overrideAvailable: boolean;
  overrideRequiresToken: boolean;
  blockedBy: string[];
  advisories: string[];
  auditEntry: AuditEntry;
}

interface GateResult {
  gate: string;
  passed: boolean;
  blocking: boolean;    // Depends on governance level
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  remediation?: string;
}
```

#### 3.2.4 MCP Server: aisdlc-platform

An MCP server that exposes AI-SDLC capabilities as tools, resources, and commands within Claude Code.

```
                    MCP SERVER ARCHITECTURE
                    =======================

    Claude Code
         |
         | (MCP Protocol - stdio transport)
         |
         v
    [aisdlc-platform MCP Server]
    |
    +-- Tools (callable by Claude):
    |   |
    |   +-- aisdlc_classify
    |   |   Input: { message: string, context?: object }
    |   |   Output: RequestClassification
    |   |
    |   +-- aisdlc_start_workflow
    |   |   Input: { description: string, type?: string, governance?: number }
    |   |   Output: { workflowId: string, phases: string[], estimatedDuration: string }
    |   |
    |   +-- aisdlc_review_code
    |   |   Input: { path: string, type?: 'security' | 'quality' | 'full' }
    |   |   Output: { findings: Finding[], summary: string }
    |   |
    |   +-- aisdlc_ask_tom
    |   |   Input: { problem: string, context?: string }
    |   |   Output: { analysis: string, solution: string, confidence: number }
    |   |
    |   +-- aisdlc_get_status
    |   |   Input: { workflowId?: string }
    |   |   Output: { active: Workflow[], completed: Workflow[] }
    |   |
    |   +-- aisdlc_check_governance
    |   |   Input: { files?: string[], staged?: boolean }
    |   |   Output: GovernanceResult
    |   |
    |   +-- aisdlc_search_memory
    |   |   Input: { query: string, category?: string }
    |   |   Output: CollectiveKnowledge[]
    |   |
    |   +-- aisdlc_get_config
    |   |   Input: {}
    |   |   Output: PlatformConfig
    |   |
    |   +-- aisdlc_set_governance_level
    |       Input: { level: 1 | 2 | 3 | 4 }
    |       Output: { previous: number, current: number }
    |
    +-- Resources (@-mentionable):
    |   |
    |   +-- aisdlc://registry
    |   |   List of all tracked work items with status
    |   |
    |   +-- aisdlc://memory/{category}
    |   |   Collective knowledge by category
    |   |
    |   +-- aisdlc://config
    |   |   Current platform configuration
    |   |
    |   +-- aisdlc://health
    |   |   System health status
    |   |
    |   +-- aisdlc://agents
    |       Agent registry with capabilities and status
    |
    +-- Prompts (/commands):
        |
        +-- /mcp__aisdlc__start
        |   "Start a governed SDLC workflow"
        |
        +-- /mcp__aisdlc__review
        |   "Review code for quality and security"
        |
        +-- /mcp__aisdlc__status
        |   "Check status of active workflows"
        |
        +-- /mcp__aisdlc__config
            "View or modify platform configuration"
```

#### 3.2.5 Hook Configuration

The integration uses Claude Code hooks for automatic interception.

**UserPromptSubmit Hook:**

This hook runs before Claude processes every user message. It:
1. Classifies the request
2. If SDLC is needed, injects routing instructions
3. If governance blocks, returns a blocking message
4. If passthrough, adds minimal context injection

```json
// File: .claude/settings.json (project-level)
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/gauravjetly/aisdlc-2.1.0/src/integration/hooks/user-prompt-submit.js"
          }
        ],
        "timeout": 5000
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/gauravjetly/aisdlc-2.1.0/src/integration/hooks/stop.js"
          }
        ],
        "timeout": 3000
      }
    ],
    "PostToolUse": [
      {
        "matcher": {
          "tool_name": "Write"
        },
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/gauravjetly/aisdlc-2.1.0/src/integration/hooks/post-write.js"
          }
        ],
        "timeout": 5000
      }
    ]
  }
}
```

**Hook Behavior:**

```
UserPromptSubmit Hook Flow:
===========================

1. Receive user message from stdin
2. Load config from ~/.aisdlc/config.yml + .aisdlc.yml
3. Check if integration is enabled (kill switch)
4. Run Tier 1 classification (rules, < 50ms)
5. If confidence >= 0.9 AND result is passthrough:
   - Log to registry
   - Return empty (no transformation)
6. If confidence < 0.9:
   - Run Tier 2 classification (LLM, < 2s)
7. Based on classification:
   a. type=qa/explanation:
      - Log to registry
      - Return empty (passthrough)
   b. type=code-change/architecture/etc:
      - Apply governance rules
      - If blocked: return { "result": "block", "reason": "..." }
      - If allowed: return { "result": "continue",
          "message": "[original message]\n\n[AISDLC CONTEXT:
          This is a {type} request with {complexity} complexity.
          Required phases: {phases}. Use the aisdlc_start_workflow
          MCP tool to begin the governed workflow.]" }
   c. type=emergency:
      - Return { "result": "continue",
          "message": "[original message]\n\n[AISDLC EMERGENCY:
          Use aisdlc_ask_tom MCP tool immediately for this
          critical issue.]" }

Stop Hook Flow:
===============

1. Receive response metadata from stdin
2. Log completion to registry
3. If SDLC workflow was active:
   - Update workflow status
   - Trigger post-completion governance checks
   - Update cost tracking
4. Return empty
```

#### 3.2.6 Configuration System

Hierarchical configuration with sensible defaults.

```yaml
# File: ~/.aisdlc/config.yml  (User-level defaults)

version: "1.0"

# Core settings
enabled: true                    # Master kill switch
auto_classify: true              # Auto-classify all requests
show_classification: false       # Show classification to user

# Governance
governance:
  level: 2                       # 1=tracking, 2=light, 3=full, 4=audit
  default_for_new_projects: 2

# Classification
classification:
  tier1_enabled: true            # Rule-based fast classification
  tier2_enabled: true            # LLM-based classification
  tier2_model: "haiku"           # Model for classification (haiku for speed)
  confidence_threshold: 0.7      # Below this, ask user to confirm
  cache_ttl: 300                 # Cache classifications for 5 minutes

# Routing
routing:
  emergency_keywords:
    - "urgent"
    - "critical"
    - "production down"
    - "outage"
    - "data loss"
    - "security breach"
  trivial_max_length: 80         # Messages shorter than this might be trivial
  always_sdlc_for:
    - "production"               # Always use SDLC when targeting production
    - "main"                     # Always use SDLC for main branch
  never_sdlc_for:
    - "explain"
    - "what is"
    - "how does"

# Phases
phases:
  always_run:                    # Minimum phases at any governance level
    - "implementation"
  level_2_phases:                # Additional phases for Level 2
    - "security"
    - "testing"
  level_3_phases:                # Additional phases for Level 3
    - "requirements"
    - "architecture"
    - "acceptance"
  level_4_phases:                # Additional phases for Level 4
    - "cost-analysis"

# Bypass
bypass:
  allow_at_level_1: true
  allow_at_level_2: true
  allow_at_level_3: false        # Requires token
  allow_at_level_4: false        # Never bypassed
  bypass_token_env: "AISDLC_BYPASS_TOKEN"

# Tracking
tracking:
  log_all_requests: true
  log_classifications: true
  log_routing_decisions: true
  generate_documentation: true
  cost_tracking: true
  registry_path: "docs/sdlc"

# Performance
performance:
  max_classification_time: 3000  # ms, fallback to rules if exceeded
  cache_classifications: true
  parallel_agent_execution: true

# User experience
ux:
  show_progress: true            # Show SDLC progress messages
  show_phase_transitions: true
  verbose_mode: false
  color_output: true
```

```yaml
# File: .aisdlc.yml  (Project-level overrides)

# Override governance for this project
governance:
  level: 3                       # This is a production project

# Project-specific routing
routing:
  always_sdlc_for:
    - "api"
    - "database"
    - "auth"

# Project-specific phases
phases:
  always_run:
    - "implementation"
    - "security"                 # Always security review for this project
    - "testing"

# Protected branches
branches:
  protected:
    - "main"
    - "production"
    - "release/*"
  governance_overrides:
    main: 3                      # Level 3 for main branch
    production: 4                # Level 4 for production branch
```

---

## 4. Data Architecture

### 4.1 Request Registry Schema

```typescript
// File: src/integration/domain/entities/RequestEntry.ts

interface RequestEntry {
  id: string;
  timestamp: string;
  sessionId: string;

  // Request
  userMessage: string;
  messageHash: string;
  messageLength: number;

  // Classification
  classification: RequestClassification;

  // Routing
  routingDecision: RoutingDecision;

  // Governance
  governanceLevel: GovernanceLevel;
  governanceResult: GovernanceDecision | null;

  // Execution
  sdlcWorkflowId: string | null;
  phases: PhaseExecution[];
  duration: number;
  tokensUsed: number;
  cost: number;

  // Outcome
  status: 'classified' | 'routed' | 'executing' | 'completed' | 'failed' | 'bypassed';
  outcome: 'success' | 'failure' | 'partial' | 'overridden' | null;
  errorMessage: string | null;
}

interface PhaseExecution {
  phase: SDLCPhase;
  agentId: AgentId;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: string | null;
  endTime: string | null;
  tokensUsed: number;
  output: string | null;
  gateResult: GateResult | null;
}
```

### 4.2 File-Based Storage Structure

```
~/.aisdlc/
|-- config.yml                        # User-level configuration
|-- registry/
|   |-- requests/
|   |   |-- 2026-02-16/
|   |   |   |-- REQ-001.json          # Individual request entries
|   |   |   |-- REQ-002.json
|   |   |   +-- ...
|   |-- classifications/
|   |   |-- cache.json                # Classification cache
|   |-- stats/
|       |-- daily/
|       |   |-- 2026-02-16.json       # Daily aggregate stats
|       |-- weekly/
|       |-- monthly/
|-- sessions/
|   |-- SESSION-{id}.json             # Active session tracking
|-- governance/
|   |-- decisions/
|   |   |-- 2026-02-16/
|   |       |-- GOV-001.json          # Governance decision records
|   |-- overrides/
|       |-- OVERRIDE-001.json         # Override/bypass records
+-- logs/
    |-- integration.log               # Integration layer logs
    |-- classifier.log                # Classification debug log
    +-- router.log                    # Routing decision log

{project}/.aisdlc.yml                 # Project-level config overrides
{project}/.aisdlc/
|-- request-history.json              # Project request history (summary)
+-- governance-report.json            # Latest governance report
```

### 4.3 Database Schema (Production Mode)

For production deployments using PostgreSQL:

```sql
-- Request registry table
CREATE TABLE integration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_message TEXT NOT NULL,
  message_hash VARCHAR(64) NOT NULL,

  -- Classification
  request_type VARCHAR(30) NOT NULL,
  complexity VARCHAR(20) NOT NULL,
  urgency VARCHAR(20) NOT NULL,
  classification_confidence DECIMAL(3,2),
  classifier_used VARCHAR(10) NOT NULL,
  requires_sdlc BOOLEAN NOT NULL DEFAULT false,
  required_phases TEXT[] DEFAULT '{}',

  -- Routing
  routing_strategy VARCHAR(30),
  routing_agents TEXT[] DEFAULT '{}',

  -- Governance
  governance_level SMALLINT NOT NULL DEFAULT 2,
  governance_passed BOOLEAN,
  governance_bypassed BOOLEAN DEFAULT false,
  bypass_reason TEXT,

  -- Execution
  sdlc_workflow_id UUID REFERENCES workflows(id),
  status VARCHAR(20) NOT NULL DEFAULT 'classified',
  outcome VARCHAR(20),
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT fk_workflow FOREIGN KEY (sdlc_workflow_id) REFERENCES workflows(id)
);

CREATE INDEX idx_requests_session ON integration_requests(session_id);
CREATE INDEX idx_requests_type ON integration_requests(request_type);
CREATE INDEX idx_requests_status ON integration_requests(status);
CREATE INDEX idx_requests_created ON integration_requests(created_at);
CREATE INDEX idx_requests_hash ON integration_requests(message_hash);

-- Classification cache table
CREATE TABLE classification_cache (
  message_hash VARCHAR(64) PRIMARY KEY,
  classification JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0
);

-- Governance decisions table
CREATE TABLE governance_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES integration_requests(id),
  governance_level SMALLINT NOT NULL,
  gates JSONB NOT NULL,
  allowed BOOLEAN NOT NULL,
  blocked_by TEXT[] DEFAULT '{}',
  advisories TEXT[] DEFAULT '{}',
  override_used BOOLEAN DEFAULT false,
  override_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily statistics materialized view
CREATE MATERIALIZED VIEW integration_daily_stats AS
SELECT
  DATE(created_at) as day,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE request_type = 'qa') as qa_requests,
  COUNT(*) FILTER (WHERE requires_sdlc = true) as sdlc_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE governance_bypassed = true) as bypassed,
  AVG(classification_confidence) as avg_confidence,
  AVG(duration_ms) as avg_duration,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost
FROM integration_requests
GROUP BY DATE(created_at);
```

---

## 5. Sequence Diagrams

### 5.1 Simple Q&A Flow (Passthrough)

```
User                    Hook                Classifier       Claude
 |                       |                      |              |
 |--"What is React?"---->|                      |              |
 |                       |--classify----------->|              |
 |                       |<--{type:qa,conf:0.95}|              |
 |                       |                      |              |
 |                       |  (log to registry)   |              |
 |                       |                      |              |
 |                       |--passthrough-------->|              |
 |                       |                      |  (normal     |
 |                       |                      |   Claude     |
 |<-----"React is..."--------------------------|   response)  |
 |                       |                      |              |

Total overhead: ~100ms (rule-based classification)
```

### 5.2 Code Change Flow (Full SDLC)

```
User              Hook           Classifier    Router       MCP Server        Agent Mesh
 |                 |                 |            |              |                |
 |--"Add auth"--->|                 |            |              |                |
 |                 |--classify------>|            |              |                |
 |                 |<--{code,med}---|            |              |                |
 |                 |                 |            |              |                |
 |                 |--route-------->|----------->|              |                |
 |                 |                 |  {full-sdlc|              |                |
 |                 |                 |   phases:  |              |                |
 |                 |                 |   ba,jets, |              |                |
 |                 |                 |   eng,sec, |              |                |
 |                 |                 |   qa}      |              |                |
 |                 |                 |            |              |                |
 |                 |--inject context into message |              |                |
 |                 |                 |            |              |                |
 |                 |--(enriched msg)----------->Claude          |                |
 |                 |                 |            |              |                |
 |                 |                 |       Claude sees MCP tools               |
 |                 |                 |       and calls:          |                |
 |                 |                 |            |              |                |
 |                 |                 |            | aisdlc_start_workflow          |
 |                 |                 |            |              |--start-------->|
 |                 |                 |            |              |                |
 |                 |                 |            |              |  BA Agent      |
 |                 |                 |            |              |  Jets Agent    |
 |                 |                 |            |              |  Engineer      |
 |                 |                 |            |              |  Security      |
 |                 |                 |            |              |  QA Agent      |
 |                 |                 |            |              |                |
 |                 |                 |            |              |<--results------|
 |                 |                 |            |              |                |
 |<-----------"Auth system implemented with full SDLC"---------|                |
 |                 |                 |            |              |                |
 |  Stop Hook:    |                 |            |              |                |
 |                 |--log completion, update registry, cost tracking              |
 |                 |                 |            |              |                |

Total time: ~15-30 minutes for medium complexity
```

### 5.3 Emergency Flow

```
User                    Hook              Classifier    Router        MCP Server
 |                       |                    |           |              |
 |--"URGENT: API 500"--->|                    |           |              |
 |                        |--classify--------->|           |              |
 |                        |<--{emergency,crit}-|           |              |
 |                        |                    |           |              |
 |                        |--route------------>|---------->|              |
 |                        |                    | {emergency|              |
 |                        |                    |  ask-tom} |              |
 |                        |                    |           |              |
 |                        |--inject: "Use aisdlc_ask_tom immediately"    |
 |                        |                    |           |              |
 |                        |----(to Claude)---->            |              |
 |                        |                    |     Claude calls:        |
 |                        |                    |           | aisdlc_ask_tom
 |                        |                    |           |              |
 |<---"Root cause: [analysis]. Fix: [solution]"------------|              |
 |                        |                    |           |              |

Total time: ~2-5 minutes
```

### 5.4 Governance Blocking Flow

```
User                    Hook           Classifier   Governance    User
 |                       |                |            |           |
 |--"Deploy to prod"---->|                |            |           |
 |                        |--classify----->|            |           |
 |                        |<--{devops,hi}--|            |           |
 |                        |                |            |           |
 |                        |--check governance---------->|           |
 |                        |                |            |           |
 |                        |  (Level 3: Full Governance) |           |
 |                        |  (Protected branch: prod)   |           |
 |                        |  (Requires approval)        |           |
 |                        |                |            |           |
 |                        |<--BLOCKED: approval needed--|           |
 |                        |                |            |           |
 |<--"This change requires approval for production.     |           |
 |    Current governance level: 3 (Full).               |           |
 |    Required: Security review + QA + Approval.        |           |
 |    Use /mcp__aisdlc__start with --governance-override|           |
 |    or request an approval token."                    |           |
 |                        |                |            |           |
```

---

## 6. Integration Installation

### 6.1 Setup Process

```
INSTALLATION SEQUENCE
=====================

Step 1: Install MCP Server
--------------------------
$ cd /Users/gauravjetly/aisdlc-2.1.0/src/integration
$ npm install
$ npm run build

Step 2: Configure Claude Code MCP Server
-----------------------------------------
Add to ~/.claude/settings.json:
{
  "mcpServers": {
    "aisdlc-platform": {
      "command": "node",
      "args": ["/Users/gauravjetly/aisdlc-2.1.0/src/integration/mcp-server/index.js"],
      "env": {
        "AISDLC_CONFIG": "~/.aisdlc/config.yml",
        "AISDLC_ROOT": "/Users/gauravjetly/aisdlc-2.1.0"
      }
    }
  }
}

Step 3: Configure Hooks
------------------------
Add to ~/.claude/settings.json or .claude/settings.json:
{
  "hooks": {
    "UserPromptSubmit": [...],
    "Stop": [...],
    "PostToolUse": [...]
  }
}

Step 4: Create Default Configuration
--------------------------------------
$ mkdir -p ~/.aisdlc
$ cp /Users/gauravjetly/aisdlc-2.1.0/src/integration/templates/config.yml ~/.aisdlc/config.yml

Step 5: Verify Installation
----------------------------
$ claude "What is the AI-SDLC status?"
  --> Should invoke aisdlc_get_status MCP tool
  --> Should return system health and configuration

Step 6: (Optional) Create Project Override
-------------------------------------------
$ cp /Users/gauravjetly/aisdlc-2.1.0/src/integration/templates/project-config.yml .aisdlc.yml
$ edit .aisdlc.yml  # Set project-specific governance level
```

---

## 7. User Experience Scenarios

### 7.1 Scenario: Developer's First Day

```
$ claude
> What is this project about?

[Classification: qa, confidence: 0.95]
[Route: passthrough]

Claude: "This is an AI-SDLC platform that provides governed software
development workflows through 12 specialized AI agents..."

> Add a user profile page with avatar upload

[Classification: code-change, complexity: medium, confidence: 0.88]
[Route: full-sdlc, phases: [ba, jets, eng, sec, qa]]
[Governance: Level 2 (Light)]

Claude: "Starting governed SDLC workflow for this feature request.

SDLC Workflow: SDLC-20260216-1430
Phases: Requirements -> Architecture -> Implementation -> Security -> QA

Phase 1/5: Requirements (BA Agent)...
[BA generates REQ-20260216-1430.md]

Phase 2/5: Architecture (Jets Agent)...
[Jets generates ARCH-20260216-1430.md]

Phase 3/5: Implementation (Engineer)...
[Engineer creates src/pages/UserProfile.tsx, src/api/avatar.ts, ...]

Phase 4/5: Security Review (non-blocking)...
[Security: No critical findings. 1 advisory: validate file upload size]

Phase 5/5: QA Testing (non-blocking)...
[QA: 12 tests written. All passing. Coverage: 87%]

Result: User profile page with avatar upload implemented.
Files created: [list]
Documentation: docs/sdlc/requirements/REQ-20260216-1430.md
Security: 1 advisory (non-blocking)
Tests: 12 tests, all passing
Tracking: docs/sdlc/tracking/SDLC-20260216-1430.md"

> Fix the typo in the README

[Classification: code-change, complexity: trivial, confidence: 0.92]
[Route: optimized, phases: [eng]]

Claude: "Fixed typo in README.md. [Shows diff]"
```

### 7.2 Scenario: Changing Governance Level

```
$ claude
> Set governance to level 3 for this project

[Classification: configuration, confidence: 0.90]
[Route: passthrough + MCP tool call]

Claude calls: aisdlc_set_governance_level({ level: 3 })

Claude: "Governance level updated for this project:
  Previous: Level 2 (Light Governance)
  Current:  Level 3 (Full Governance)

  Changes:
  - Security reviews are now BLOCKING
  - QA testing is now BLOCKING
  - Architecture review required for complex changes
  - Customer acceptance required for new features
  - Override requires approval token

  Updated: .aisdlc.yml"
```

### 7.3 Scenario: Emergency Response

```
$ claude
> URGENT: The authentication API is returning 500 errors in production

[Classification: emergency, urgency: critical, confidence: 0.97]
[Route: emergency, phases: [ask-tom, eng]]
[Governance: MINIMAL (emergency override)]

Claude calls: aisdlc_ask_tom({
  problem: "Authentication API returning 500 errors in production",
  context: "[auto-gathered: recent deployments, error logs, git history]"
})

Claude: "EMERGENCY RESPONSE

Root Cause Analysis (Ask Tom):
  - Recent deployment 2h ago changed JWT validation logic
  - Error: token.verify() receiving null audience parameter
  - Commit: abc1234 by developer@team.com

Immediate Fix:
  [Shows targeted fix in src/auth/jwt-validator.ts]
  [Fix applied and tested locally]

Recommended Actions:
  1. Apply fix immediately (shown above)
  2. Deploy hotfix to production
  3. Add regression test for JWT audience validation
  4. Post-incident review scheduled

Time to diagnosis: 45 seconds
Time to fix: 2 minutes

Note: Emergency governance used. Full post-incident SDLC review
will be triggered automatically after resolution."
```

---

## 8. Dashboard Integration

### 8.1 New Dashboard Views

The existing Control Center dashboard (React + MUI) is extended with these views:

```
CONTROL CENTER - NEW VIEWS
===========================

1. REQUEST FLOW (Real-time)
   +-------------------------------------------+
   | Request Flow                    [Live]     |
   |                                            |
   | 10:30  "Add auth"       [code-change]      |
   |        --> full-sdlc    [running]          |
   |        BA -> Jets -> Eng -> Sec -> QA      |
   |                    ^                       |
   |                    |                       |
   |               [current]                    |
   |                                            |
   | 10:28  "What is React?" [qa]               |
   |        --> passthrough  [completed]        |
   |                                            |
   | 10:25  "Fix typo"       [trivial]          |
   |        --> optimized    [completed]        |
   +-------------------------------------------+

2. CLASSIFICATION METRICS
   +-------------------------------------------+
   | Classification Accuracy    Last 7 Days     |
   |                                            |
   | [pie chart]                                |
   | qa: 45%  | code-change: 30%               |
   | review: 10% | emergency: 2%               |
   | other: 13%                                 |
   |                                            |
   | Avg confidence: 0.87                       |
   | Override rate: 5%                          |
   | Classification time: 120ms (avg)          |
   +-------------------------------------------+

3. GOVERNANCE COMPLIANCE
   +-------------------------------------------+
   | Governance Dashboard                       |
   |                                            |
   | Level: 2 (Light)                          |
   | Compliance rate: 94%                       |
   | Bypasses this week: 3                      |
   | Blocked requests: 1                        |
   |                                            |
   | Security gates passed: 47/50              |
   | QA gates passed: 48/50                     |
   |                                            |
   | [trend chart over time]                    |
   +-------------------------------------------+

4. COST TRACKING
   +-------------------------------------------+
   | Cost Analysis                              |
   |                                            |
   | Today:  $2.30 (145K tokens)               |
   | Week:   $14.50 (890K tokens)              |
   | Month:  $52.00 (3.2M tokens)             |
   |                                            |
   | By request type:                           |
   | code-change: $8.20 | architecture: $3.10  |
   | qa: $1.50          | emergency: $0.80     |
   |                                            |
   | SDLC overhead: 12% of total cost          |
   +-------------------------------------------+
```

---

## 9. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Request Classifier** | TypeScript + Claude Haiku | Fast classification, structured JSON output |
| **Smart Router** | TypeScript | Pure logic, no external deps |
| **MCP Server** | TypeScript + @modelcontextprotocol/sdk | Official MCP SDK |
| **Hooks** | Node.js scripts | Claude Code hook compatibility |
| **Configuration** | YAML (js-yaml parser) | Human-readable, widely understood |
| **File Storage** | JSON files | Consistent with existing agent mesh |
| **Database** | PostgreSQL (production) | Consistent with existing platform |
| **Dashboard** | React + MUI (existing) | Extend current Control Center |
| **Testing** | Jest + ts-jest | Consistent with existing test setup |

---

## 10. Security Considerations

### 10.1 Threat Model

| Threat | Mitigation |
|---|---|
| User bypasses classification | Hook runs before Claude sees message; cannot be skipped |
| Malicious prompt injection via classification | LLM classifier uses structured output only; no code execution |
| Governance bypass | Levels 3-4 require cryptographic bypass tokens |
| Sensitive data in registry | Classification logs hash messages; full content optional |
| MCP server compromise | Runs locally (stdio transport); no network exposure |
| Configuration tampering | File permissions; git-tracked project configs |
| Token budget abuse | Hard limits per classification; configurable caps |

### 10.2 Data Handling

- User messages are hashed (SHA-256) for registry tracking; full message stored only if `tracking.log_full_messages: true`
- Classification results contain no sensitive data
- Governance decisions are immutable audit records
- Bypass tokens use HMAC-SHA256 with configurable secret
- MCP server communicates via stdio (no network exposure)

---

## 11. Performance Requirements

| Metric | Target | Rationale |
|---|---|---|
| Tier 1 classification latency | < 50ms | Rule-based, no LLM call |
| Tier 2 classification latency | < 2s | Haiku model, structured output |
| Total hook overhead (passthrough) | < 200ms | User should not notice |
| Total hook overhead (SDLC route) | < 3s | Acceptable for workflow setup |
| Classification cache hit rate | > 40% | Similar messages in same session |
| Correct classification rate | > 90% | Measured against human judgment |
| False positive SDLC rate | < 5% | Q&A incorrectly routed to SDLC |
| False negative SDLC rate | < 3% | Code changes not caught |

---

## 12. Testing Strategy

### 12.1 Test Plan

| Test Type | Scope | Coverage Target |
|---|---|---|
| Unit tests | Classifier rules, router logic, governance | 90% |
| Integration tests | Hook -> Classifier -> Router -> MCP flow | 80% |
| Classification accuracy | 500+ labeled message dataset | > 90% |
| E2E tests | User message -> SDLC workflow -> output | 70% |
| Performance tests | Classification latency under load | p99 < 3s |
| Governance tests | All 4 levels, blocking/non-blocking | 100% |

### 12.2 Classification Test Dataset

A labeled dataset of 500+ user messages with expected classifications:

```json
{
  "test_cases": [
    {
      "message": "What is React?",
      "expected": { "type": "qa", "complexity": "trivial", "requiresSDLC": false }
    },
    {
      "message": "Add authentication with OAuth 2.0 and MFA",
      "expected": { "type": "code-change", "complexity": "complex", "requiresSDLC": true }
    },
    {
      "message": "Fix the typo on line 42 of README.md",
      "expected": { "type": "code-change", "complexity": "trivial", "requiresSDLC": false }
    },
    {
      "message": "URGENT: production database is returning connection errors",
      "expected": { "type": "emergency", "urgency": "critical", "requiresSDLC": true }
    }
  ]
}
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Basic classification and routing with passthrough for non-code requests.

| Task | Description | Effort |
|---|---|---|
| Request Classifier (Tier 1) | Rule-based classification engine | 2 days |
| Request Classifier (Tier 2) | LLM-based classification with Haiku | 2 days |
| Smart Router (core) | Routing logic for all request types | 2 days |
| Configuration System | YAML config with defaults and overrides | 1 day |
| UserPromptSubmit Hook | Claude Code hook integration | 1 day |
| Stop Hook | Completion tracking hook | 1 day |
| Request Registry (file-based) | Log all requests and classifications | 1 day |

**Deliverables:**
- Automatic classification of all user messages
- Q&A and trivial requests pass through without delay
- Code changes detected and flagged
- Basic configuration via YAML

### Phase 2: MCP Integration (Week 3-4)

**Goal**: MCP server exposing AI-SDLC tools, resources, and commands.

| Task | Description | Effort |
|---|---|---|
| MCP Server (core) | Server setup with @modelcontextprotocol/sdk | 2 days |
| Tools: classify, start, review | Core SDLC tools | 3 days |
| Tools: ask_tom, status, governance | Support tools | 2 days |
| Resources: registry, memory, config | @-mentionable resources | 2 days |
| Prompts: start, review, status | /-command integration | 1 day |

**Deliverables:**
- Full MCP server with 8+ tools
- Resources accessible via @ mentions
- Commands accessible via / prefix
- Claude Code can invoke full SDLC workflows

### Phase 3: Governance Engine (Week 5-6)

**Goal**: Configurable 4-level governance with quality gates.

| Task | Description | Effort |
|---|---|---|
| Governance Level System | 4-level configurable governance | 2 days |
| Quality Gates | Security, QA, architecture gates | 3 days |
| Bypass System | Token-based bypass for Levels 3-4 | 2 days |
| Branch Protection | Governance overrides per branch | 1 day |
| Audit Trail | Immutable governance decision log | 2 days |

**Deliverables:**
- 4 governance levels fully operational
- Blocking and non-blocking gates
- Bypass with audit trail
- Branch-specific governance

### Phase 4: Dashboard and Polish (Week 7-8)

**Goal**: Dashboard integration, performance optimization, documentation.

| Task | Description | Effort |
|---|---|---|
| Dashboard: Request Flow | Real-time request visualization | 2 days |
| Dashboard: Classification Metrics | Accuracy and distribution charts | 1 day |
| Dashboard: Governance Compliance | Compliance rate and gate results | 1 day |
| Dashboard: Cost Tracking | Token and cost analysis views | 1 day |
| Performance Optimization | Caching, parallel execution | 2 days |
| Documentation | Setup guide, user guide, API docs | 2 days |
| Classification Test Suite | 500+ labeled test cases | 1 day |

**Deliverables:**
- Control Center with integration views
- Performance within targets
- Complete documentation
- Classification accuracy validated

---

## 14. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Classification accuracy | > 90% | Against labeled test dataset |
| Hook overhead (passthrough) | < 200ms | p50 latency measurement |
| Hook overhead (SDLC route) | < 3s | p50 latency measurement |
| False positive SDLC rate | < 5% | Q&A sent to SDLC incorrectly |
| SDLC compliance rate | > 80% | Code changes routed through SDLC |
| Production change tracking | 100% | All production changes logged |
| User satisfaction | > 8/10 | User feedback survey |
| Governance gate pass rate | > 85% | First-pass gate success |
| Cost overhead | < 15% | SDLC tokens / direct tokens |

---

## 15. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Classification overhead annoys users | Medium | High | Rule-based tier for < 50ms; cache similar messages |
| False positives send Q&A through SDLC | Low | Medium | High confidence threshold; easy override |
| False negatives miss code changes | Medium | High | Conservative classification; monitor miss rate |
| MCP server instability | Low | High | Graceful fallback to direct Claude; health checks |
| Hook failure blocks all interaction | Low | Critical | Timeout with fallback; health check in hook |
| Governance too strict for rapid dev | Medium | Medium | Default Level 2; per-project overrides |
| Performance degrades with many agents | Medium | Medium | Parallel agent execution; caching |
| Configuration complexity | Low | Medium | Sensible defaults; templates; validation |

---

## 16. Related Architecture Documents

| Document | Relationship |
|---|---|
| ARCH-AGENTIC-PLATFORM-20260216 | Strategic platform vision this integrates into |
| ADR-040 (this batch) | Request Classification Strategy |
| ADR-041 (this batch) | Smart Routing Architecture |
| ADR-042 (this batch) | Governance Level Design |
| ADR-043 (this batch) | Integration Layer Choice |
| ADR-044 (this batch) | User Experience Flow |
| ADR-003 (existing) | Event-Driven Agents |
| ADR-004 (existing) | Layered Architecture |
| ADR-006 (existing) | Policy Engine Architecture |

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-16
**Author**: Jets (Architect Agent)
**Next Review**: After Phase 1 completion
