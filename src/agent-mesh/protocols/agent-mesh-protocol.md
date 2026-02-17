# Agent Mesh Communication Protocol

## Overview

This document defines the protocol that all AI-SDLC agents must follow to participate in the Agent Mesh -- the inter-agent communication and collective learning system.

## Directory Structure

```
~/.claude/agent-mesh/
├── registry/
│   └── agents.json                    # All registered agents
├── bus/
│   ├── inboxes/
│   │   ├── conductor/                 # Conductor's inbox
│   │   ├── ba/                        # BA Agent's inbox
│   │   ├── jets/                      # Architect's inbox
│   │   ├── ux/                        # UX Agent's inbox
│   │   ├── engineer/                  # Engineer's inbox
│   │   ├── security/                  # Security Agent's inbox
│   │   ├── qa/                        # QA Agent's inbox
│   │   ├── atlas/                     # Atlas Agent's inbox
│   │   ├── customer/                  # Customer Agent's inbox
│   │   ├── ask-tom/                   # Ask Tom's inbox
│   │   ├── tracker/                   # Tracker's inbox
│   │   └── finops/                    # FinOps Agent's inbox
│   ├── outboxes/{agent}/              # Sent messages
│   ├── processed/                     # Completed messages
│   ├── failed/                        # Failed messages
│   └── log/                           # All messages (audit)
├── collective-memory/
│   ├── knowledge/
│   │   ├── cross-agent-learning/      # Learnings spanning multiple agents
│   │   ├── error-pattern/             # Recognized error patterns
│   │   ├── best-practice/             # Proven best practices
│   │   ├── anti-pattern/              # Things to avoid
│   │   ├── architecture-decision/     # Architecture decisions
│   │   ├── security-insight/          # Security learnings
│   │   ├── performance-insight/       # Performance learnings
│   │   ├── process-improvement/       # Process improvements
│   │   ├── conflict-resolution/       # How conflicts were resolved
│   │   └── integration-pattern/       # Integration patterns
│   └── index.json                     # Knowledge index
├── learning/
│   ├── events/                        # Learning events
│   └── patterns/                      # Recognized patterns
├── conflicts/                         # Conflict records
└── audit/
    └── {YYYY-MM-DD}/                  # Date-partitioned audit entries
```

## Agent Lifecycle Protocol

### 1. Before Starting Work

Every agent MUST check their inbox and load relevant collective knowledge:

```bash
# 1. Check inbox for messages
ls ~/.claude/agent-mesh/bus/inboxes/{agent-id}/ 2>/dev/null

# 2. Read pending messages (prioritized)
cat ~/.claude/agent-mesh/bus/inboxes/{agent-id}/critical-*.json 2>/dev/null
cat ~/.claude/agent-mesh/bus/inboxes/{agent-id}/high-*.json 2>/dev/null
cat ~/.claude/agent-mesh/bus/inboxes/{agent-id}/normal-*.json 2>/dev/null

# 3. Load relevant collective knowledge
# Search for knowledge applicable to this agent
ls ~/.claude/agent-mesh/collective-memory/knowledge/*/  2>/dev/null
# Read knowledge index for quick lookup
cat ~/.claude/agent-mesh/collective-memory/index.json 2>/dev/null
```

### 2. During Work

Agents should send messages when:
- They need expertise from another agent
- They discover something that other agents should know
- They encounter a conflict with another agent's output
- They complete a phase and hand off to the next agent

### 3. After Completing Work

Every agent MUST:
1. Extract learnings from their work
2. Contribute to collective memory
3. Send handoff notifications
4. Acknowledge processed messages

## Message Format

### File Naming Convention

Messages are stored as JSON files in the receiver's inbox:

```
{priority}-{timestamp}-{uuid}.json
```

Example: `high-2026-02-15T10-30-00-000Z-a1b2c3d4.json`

### Message Structure

```json
{
  "id": "uuid",
  "correlationId": "uuid-linking-related-messages",
  "parentMessageId": "uuid-of-parent-for-threading",
  "timestamp": "2026-02-15T10:30:00.000Z",
  "type": "request|response|notification|learning|consultation|escalation|broadcast|knowledge-update|conflict|resolution",
  "priority": "low|normal|high|critical",
  "status": "pending|delivered|read|processing|completed|failed|expired|acknowledged",
  "sender": "agent-id",
  "receiver": "agent-id|all",
  "subject": "Brief description",
  "content": "Detailed content",
  "context": {
    "sdlcPhase": "requirements|design|development|security|testing|deployment|acceptance",
    "workItemId": "SDLC-YYYYMMDD-HHMM",
    "projectId": "project-identifier",
    "relatedFiles": ["path/to/file1", "path/to/file2"],
    "relatedAgents": ["agent-id1", "agent-id2"],
    "tags": ["tag1", "tag2"]
  },
  "metadata": {
    "traceId": "uuid",
    "spanId": "uuid",
    "processingTime": 1500,
    "learningGenerated": true,
    "conflictDetected": false
  },
  "ttl": 86400,
  "requiresAck": true,
  "retryCount": 0,
  "maxRetries": 3
}
```

## Communication Patterns

### Pattern 1: Direct Request/Response

```
Agent A                    Agent B
  |                          |
  |-- REQUEST: "Need help" ->|
  |                          |-- Process request
  |<- RESPONSE: "Here's..." -|
  |                          |
  |-- ACK ------------------>|
```

### Pattern 2: Learning Propagation

```
Agent A                Learning Engine           Agent B, C, D
  |                         |                        |
  |-- LEARNING: "Found..." ->|                       |
  |                         |-- Analyze relevance    |
  |                         |                        |
  |                         |-- NOTIFICATION: "..." ->| (to relevant agents)
  |                         |                        |
  |                         |-- Store in collective  |
  |                         |   memory               |
```

### Pattern 3: Conflict Resolution

```
Agent A        Agent B        Conflict Resolver
  |               |                  |
  |-- POSITION -->|                  |
  |               |-- POSITION ----->|
  |               |                  |-- Check consensus
  |               |                  |-- Expertise vote
  |               |                  |-- Majority vote
  |               |                  |
  |<-- RESOLUTION -------------------|
  |               |<-- RESOLUTION ---|
```

### Pattern 4: Consultation

```
Agent A                    Agent B                    Collective Memory
  |                          |                              |
  |-- CONSULTATION: "..." -->|                              |
  |                          |-- Check collective memory -->|
  |                          |<-- Relevant knowledge ------|
  |                          |                              |
  |<- RESPONSE + LEARNING ---|                              |
  |                          |-- Store new learning ------->|
```

## Agent Communication Matrix

```
                        SENDS TO
              CON  BA  JET  UX  ENG  SEC  QA  ATL  CUS  TOM  TRK  FIN
         CON   -   Y    Y   Y    Y    Y   Y    Y    Y    Y    Y    Y
         BA    Y   -    Y   -    -    -   -    -    Y    -    Y    -
RECEIVES JET   Y   -    -   -    Y    Y   -    -    -    -    Y    -
FROM     UX    Y   -    -   -    Y    -   -    -    Y    -    Y    -
         ENG   Y   -    -   -    -    Y   Y    -    -    -    Y    -
         SEC   Y   -    -   -    Y    -   Y    -    -    -    Y    -
         QA    Y   -    -   -    Y    -   -    -    Y    -    Y    -
         ATL   Y   -    -   -    -    -   -    -    Y    -    Y    Y
         CUS   Y   Y    -   -    -    -   -    -    -    -    Y    -
         TOM   Y   Y    Y   Y    Y    Y   Y    Y    Y    -    Y    Y
         TRK   Y   -    -   -    -    -   -    -    -    -    -    -
         FIN   Y   -    -   -    -    -   -    Y    -    -    Y    -
```

## Safety Mechanisms

### Loop Detection
- Each message carries a `correlationId` that threads related messages
- System tracks chain depth per correlation ID
- Maximum chain depth: 10 messages
- Exceeding the limit raises an error and stops the chain

### Circuit Breakers
- Each agent has a circuit breaker
- After 5 consecutive failures, the circuit opens
- While open, no messages can be delivered to that agent
- After 60 seconds, circuit transitions to half-open (test delivery)
- Successful delivery resets the circuit to closed

### Message TTL
- Default TTL: 24 hours
- Critical messages: Configurable, default 24 hours
- Expired messages are moved to `failed/` directory

### Conflict Prevention
- Conflicts are detected when agents provide contradictory outputs
- Resolution follows a priority chain: consensus -> expertise -> majority -> conductor -> user
- All conflict resolutions are recorded as learnings

## Collective Memory Access

### Writing Knowledge

```json
{
  "id": "CK-abc12345",
  "category": "best-practice",
  "title": "Input Validation Pattern",
  "content": "Always validate and sanitize inputs at the API boundary...",
  "confidence": "emerging|established|proven",
  "sourceAgents": ["security", "engineer"],
  "applicableAgents": ["engineer", "qa", "security"],
  "evidenceCount": 2,
  "tags": ["security", "validation", "api"]
}
```

### Reading Knowledge

Agents should query collective memory for relevant knowledge before starting work:

1. Search by category relevant to their task
2. Search by tags related to the current project
3. Check for anti-patterns to avoid
4. Review recent conflict resolutions in their domain

## Learning Event Triggers

Learning events are automatically created when:

| Trigger | Description | Created By |
|---------|-------------|------------|
| problem-solved | A problem was successfully resolved | Ask Tom |
| error-encountered | An error pattern was detected | Any agent |
| pattern-recognized | A reusable pattern was identified | Learning Engine |
| consultation-completed | A cross-agent consultation finished | Any agent |
| conflict-resolved | A conflict between agents was resolved | Conflict Resolver |
| performance-anomaly | Unusual performance was detected | Atlas, Engineer |
| security-finding | A security issue was found | Security |
| process-deviation | Workflow deviated from expected | Conductor, Tracker |
| manual | Manually created learning | Any agent |

## Shell Script Integration

For agents running within Claude Code's Bash tool, use these commands:

```bash
# Initialize agent mesh (run once)
~/.claude/agent-mesh/mesh-cli.sh init

# Send a message to another agent
~/.claude/agent-mesh/mesh-cli.sh send \
  --from "engineer" \
  --to "security" \
  --type "request" \
  --subject "Security review needed" \
  --content "Please review the authentication implementation in src/auth/"

# Read inbox
~/.claude/agent-mesh/mesh-cli.sh inbox "engineer"

# Report a learning
~/.claude/agent-mesh/mesh-cli.sh learn \
  --agent "security" \
  --title "JWT Token Rotation Best Practice" \
  --description "Always rotate JWT tokens..." \
  --category "security-insight"

# Search collective knowledge
~/.claude/agent-mesh/mesh-cli.sh search --query "authentication" --agent "engineer"

# Get agent briefing (collective intelligence summary)
~/.claude/agent-mesh/mesh-cli.sh briefing "engineer"

# Check mesh health
~/.claude/agent-mesh/mesh-cli.sh health

# View audit report
~/.claude/agent-mesh/mesh-cli.sh audit --days 7
```

## Implementation Notes

The Agent Mesh is implemented in TypeScript and operates through the filesystem.
This design was chosen because:

1. **Works within Claude Code architecture** -- Agents use Task tool which spawns subprocesses that share the filesystem
2. **Durable** -- Messages persist on disk and survive process restarts
3. **Observable** -- All state is human-readable JSON files
4. **Debuggable** -- You can inspect any inbox, outbox, or knowledge item by reading the file
5. **No external dependencies** -- No Redis, no message queue, no database required
6. **Extensible** -- New agents just need a new directory in the inbox

The TypeScript implementation provides the programmatic API, while the shell script (`mesh-cli.sh`) provides a Bash-tool-friendly interface for agents running within Claude Code.
