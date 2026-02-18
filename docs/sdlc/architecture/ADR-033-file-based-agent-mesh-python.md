# ADR-033: File-Based Agent Mesh Integration for Python Agent

## Status
Proposed

## Date
2026-02-17

## Context

The AI-SDLC agent mesh is implemented in TypeScript (`/Users/gauravjetly/aisdlc-2.1.0/src/agent-mesh/`) with the following components:

- **Message Bus** (`message-bus.ts`): File-based message passing via JSON files in `~/.claude/agent-mesh/bus/`
- **Agent Registry** (`agent-registry.ts`): Agent profiles stored in `~/.claude/agent-mesh/registry/agents.json`
- **Collective Memory** (`collective-memory.ts`): Shared knowledge in `~/.claude/agent-mesh/collective-memory/`
- **Learning Engine** (`learning-engine.ts`): Learning propagation via message bus
- **Audit Log** (`audit-log.ts`): Date-partitioned audit entries

All inter-agent communication uses **JSON files on the local filesystem**. The message bus writes JSON message files to agent inboxes, agents read from their inboxes, and acknowledgements move files to the processed directory.

The Exec Agent is written in **Python**. It needs to participate fully in the agent mesh: receive messages, send messages, contribute to collective memory, and share learnings. The question is how to bridge the Python agent with the TypeScript mesh infrastructure.

### Options Considered

1. **Direct File I/O (Python reads/writes the same JSON files)** -- The Python agent directly reads from `~/.claude/agent-mesh/bus/inboxes/exec/` and writes to other agents' inboxes. It reads/writes collective memory JSON files directly. No TypeScript dependency at runtime.

2. **TypeScript Wrapper CLI** -- Build a small TypeScript CLI that wraps the mesh SDK. The Python agent shells out to `node mesh-cli.js send --to conductor --subject "..."`. Adds a Node.js dependency but uses the official SDK.

3. **HTTP Bridge** -- Run the TypeScript mesh as a local HTTP server. Python agent communicates via REST API. Clean separation but adds a running service dependency.

4. **Python Port of Mesh SDK** -- Rewrite the TypeScript mesh SDK in Python. Full native support but significant duplication and maintenance burden.

5. **Shared SQLite Database** -- Replace file-based bus with SQLite. Both TypeScript and Python can read/write. Requires changing the mesh implementation.

## Decision

We will use **Option 1: Direct File I/O**. The Python agent will read and write the same JSON file format used by the TypeScript agent mesh.

### Rationale

The TypeScript mesh is fundamentally a **file-based system**. Its message bus writes JSON files to directories. Its collective memory stores JSON files in directories. Its audit log writes JSON files to date-partitioned directories. The file format is the API contract -- not the TypeScript classes.

By implementing a Python client that reads and writes these same JSON files following the same naming conventions and data schemas, the Exec Agent becomes a full mesh participant without any TypeScript dependency at runtime.

### Implementation: AgentMeshClient (Python)

```python
class AgentMeshClient:
    """
    Python client for the file-based agent mesh.

    Follows the exact same file format, directory structure, and naming
    conventions as the TypeScript MessageBus, CollectiveMemory, and
    AuditLog implementations.
    """

    BASE_PATH = Path.home() / ".claude" / "agent-mesh"

    # Directory structure (matches TypeScript implementation):
    # {BASE_PATH}/bus/inboxes/{agent_id}/       -- Incoming messages
    # {BASE_PATH}/bus/outboxes/{agent_id}/      -- Sent messages
    # {BASE_PATH}/bus/processed/                 -- Acknowledged messages
    # {BASE_PATH}/bus/failed/                    -- Failed messages
    # {BASE_PATH}/bus/log/                       -- Central message log
    # {BASE_PATH}/registry/agents.json           -- Agent registry
    # {BASE_PATH}/collective-memory/knowledge/   -- Shared knowledge
    # {BASE_PATH}/collective-memory/index.json   -- Knowledge index
    # {BASE_PATH}/audit/{date}/                  -- Audit entries
    # {BASE_PATH}/learning/events/               -- Learning events
```

### Message Format (matches TypeScript AgentMessage interface)

```python
@dataclass
class AgentMessage:
    id: str                    # UUID v4
    correlationId: str         # Links related messages
    parentMessageId: Optional[str]
    timestamp: str             # ISO 8601
    type: str                  # request|response|notification|learning|...
    priority: str              # low|normal|high|critical
    status: str                # pending|delivered|read|completed|failed
    sender: str                # Agent ID
    receiver: str              # Agent ID or "all"
    subject: str
    content: str
    context: MessageContext
    metadata: MessageMetadata
    ttl: int                   # Seconds
    requiresAck: bool
    retryCount: int
    maxRetries: int
```

### File Naming Convention (matches TypeScript)

```
Inbox files:  {priority}-{timestamp}-{message_id}.json
              e.g., "normal-2026-02-17T10-00-00-000Z-a1b2c3d4.json"

Outbox files: {timestamp}-{message_id}.json
Log files:    {timestamp}-{message_id}.json
Audit files:  {uuid}.json (in date-partitioned directory)
```

### Registration

The Python agent appends itself to the agents.json registry:

```python
def register(self):
    registry_path = self.BASE_PATH / "registry" / "agents.json"
    agents = json.loads(registry_path.read_text())

    # Remove existing exec entry if present
    agents = [a for a in agents if a["id"] != "exec"]

    # Add current registration
    agents.append({
        "id": "exec",
        "name": "Exec Agent",
        "status": "available",
        "capabilities": ["presentation-generation", "visual-reporting", "brand-compliance"]
    })

    registry_path.write_text(json.dumps(agents, indent=2))
```

### Inbox Polling

```python
def poll_inbox(self) -> List[AgentMessage]:
    inbox_path = self.BASE_PATH / "bus" / "inboxes" / "exec"
    inbox_path.mkdir(parents=True, exist_ok=True)

    messages = []
    for file in sorted(inbox_path.glob("*.json")):
        msg = json.loads(file.read_text())
        # Check expiry
        if self._is_expired(msg):
            self._move_to_failed(file, "expired")
            continue
        messages.append(AgentMessage(**msg))

    # Sort by priority then timestamp
    return sorted(messages, key=lambda m: (
        {"critical": 0, "high": 1, "normal": 2, "low": 3}[m.priority],
        m.timestamp
    ))
```

### Sending Messages

```python
def send_message(self, receiver: str, subject: str, content: str,
                 msg_type: str = "notification", priority: str = "normal"):
    message = {
        "id": str(uuid.uuid4()),
        "correlationId": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": msg_type,
        "priority": priority,
        "status": "delivered",
        "sender": "exec",
        "receiver": receiver,
        "subject": subject,
        "content": content,
        "context": {"tags": ["exec-agent"]},
        "metadata": {"traceId": str(uuid.uuid4()), "spanId": str(uuid.uuid4())},
        "ttl": 86400,
        "requiresAck": False,
        "retryCount": 0,
        "maxRetries": 3
    }

    # Write to receiver's inbox
    inbox_path = self.BASE_PATH / "bus" / "inboxes" / receiver
    inbox_path.mkdir(parents=True, exist_ok=True)
    ts = message["timestamp"].replace(":", "-").replace(".", "-")
    filename = f"{priority}-{ts}-{message['id']}.json"
    (inbox_path / filename).write_text(json.dumps(message, indent=2))

    # Log to outbox
    outbox_path = self.BASE_PATH / "bus" / "outboxes" / "exec"
    outbox_path.mkdir(parents=True, exist_ok=True)
    (outbox_path / f"{ts}-{message['id']}.json").write_text(
        json.dumps(message, indent=2)
    )

    # Log to central log
    log_path = self.BASE_PATH / "bus" / "log"
    log_path.mkdir(parents=True, exist_ok=True)
    (log_path / f"{ts}-{message['id']}.json").write_text(
        json.dumps(message, indent=2)
    )
```

### Collective Memory Integration

```python
def contribute_knowledge(self, category: str, title: str, content: str,
                         confidence: str, tags: List[str]):
    knowledge_id = f"CK-{uuid.uuid4().hex[:8]}"
    knowledge = {
        "id": knowledge_id,
        "category": category,
        "title": title,
        "content": content,
        "confidence": confidence,
        "sourceAgents": ["exec"],
        "applicableAgents": ["conductor", "ba", "jets", "tracker"],
        "evidenceCount": 1,
        "evidence": [],
        "tags": tags,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "lastAccessedAt": datetime.utcnow().isoformat() + "Z",
        "accessCount": 0,
        "version": 1,
        "status": "active"
    }

    knowledge_path = (self.BASE_PATH / "collective-memory" / "knowledge"
                      / category / f"{knowledge_id}.json")
    knowledge_path.parent.mkdir(parents=True, exist_ok=True)
    knowledge_path.write_text(json.dumps(knowledge, indent=2))
```

## Consequences

### Positive

- **Zero runtime dependency**: No Node.js process needed. Pure Python file I/O.
- **Exact compatibility**: Uses identical file format, naming, and directory structure as the TypeScript implementation. Messages from TypeScript agents are immediately readable by the Python client and vice versa.
- **Simple implementation**: ~200 lines of Python for full mesh participation.
- **Debuggable**: All messages are human-readable JSON files that can be inspected directly.
- **Atomic operations**: Python's `Path.write_text()` is atomic on most filesystems for small files (< 4KB). Messages are small JSON documents.
- **No new infrastructure**: Uses the existing `~/.claude/agent-mesh/` directory structure.

### Negative

- **No TypeScript SDK reuse**: The Python client is a separate implementation of the same file-based protocol. If the TypeScript mesh changes its file format, the Python client must be updated independently. Mitigated by:
  - The file format is the stable contract, not the TypeScript classes
  - The format is well-documented in TypeScript types (`types/index.ts`)
  - Adding a version field to messages for forward compatibility
- **No compile-time type safety**: Python client uses dicts and dataclasses, not TypeScript interfaces. Mitigated by Pydantic models that validate message structure.
- **Race conditions**: Two agents writing to the same inbox simultaneously could theoretically produce conflicts. Mitigated by unique message IDs in filenames and atomic file writes.
- **No real-time notification**: The Python agent must poll its inbox (no file system event push from the TypeScript side). Mitigated by polling on a short interval (5 seconds) when the agent is active, or using watchdog for file system events.

### Neutral

- The Exec Agent's inbox directory (`~/.claude/agent-mesh/bus/inboxes/exec/`) must be created during agent registration
- The existing agent registry (`agents.json`) can accept the new "exec" agent entry without any TypeScript code changes
- Audit entries written by the Python client are indistinguishable from those written by TypeScript agents

## Validation

To verify compatibility, the following integration tests will be performed:

1. **TypeScript sends, Python reads**: Send a message via the TypeScript MessageBus to the "exec" inbox. Verify the Python client reads it correctly.
2. **Python sends, TypeScript reads**: Send a message via the Python client to the "conductor" inbox. Verify the TypeScript MessageBus reads it correctly.
3. **Collective memory round-trip**: Write knowledge via Python client. Read it via TypeScript CollectiveMemory class. Verify all fields match.
4. **Audit trail**: Write audit entries from both sides. Verify they appear in the same date-partitioned directory with consistent format.
