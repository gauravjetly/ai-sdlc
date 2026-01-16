# A2A Protocol Implementation Guide
## Technical Specification for Agent-to-Agent Communication

---

## Quick Start: Triggering the System

```
USER: "Build a customer feedback portal with sentiment analysis"

        ┌─────────────────────────────────────────────────────────────┐
        │                    AUTONOMOUS EXECUTION                      │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  CONDUCTOR: Interprets request                              │
        │  - Type: NEW_FEATURE                                        │
        │  - Domain: Feedback + AI (Sentiment)                        │
        │  - Creates correlation_id                                   │
        │  - Triggers: BA_AGENT                                       │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  BA_AGENT: Gathers requirements                             │
        │  - Problem statement                                        │
        │  - Functional requirements (feedback collection, analysis)  │
        │  - NFRs (performance, security, compliance)                 │
        │  - Acceptance criteria (Given/When/Then)                    │
        │  - Sends: REQUIREMENTS_COMPLETE → ARCHITECT                 │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  ARCHITECT (Jets): Designs system                           │
        │  - Component architecture                                   │
        │  - AI integration (sentiment model selection)               │
        │  - ADRs for technology choices                              │
        │  - Sends: ARCHITECTURE_READY → ENGINEER + SECURITY          │
        └─────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │  ENGINEER: Implements │   │  SECURITY: Reviews    │
        │  - Code with tests    │   │  - Architecture audit │
        │  - API documentation  │   │  - Prepares for scan  │
        │  - >80% coverage      │   │                       │
        └───────────┬───────────┘   └───────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  SECURITY: Scans + Deploys                                  │
        │  - SAST/DAST scanning                                       │
        │  - Dependency audit                                         │
        │  - Compliance check                                         │
        │  - Deploy to environment                                    │
        │  - Sends: SECURITY_APPROVED → QA                            │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  QA: Validates quality                                      │
        │  - Integration tests                                        │
        │  - E2E tests                                                │
        │  - Performance validation                                   │
        │  - Sends: QA_PASSED → CUSTOMER                              │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  CUSTOMER: Accepts delivery                                 │
        │  - Functional simulation                                    │
        │  - Acceptance criteria validation                           │
        │  - Business value confirmation                              │
        │  - Sends: VALIDATION_COMPLETE → CONDUCTOR                   │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  CONDUCTOR: Reports completion                              │
        │  ✅ All phases complete                                     │
        │  📦 Deliverables ready                                      │
        │  📊 Metrics captured                                        │
        └─────────────────────────────────────────────────────────────┘
```

---

## Message Schema

### Base Message Structure

```typescript
interface A2AMessage {
  header: {
    messageId: string;          // UUID v4
    timestamp: string;          // ISO 8601
    senderAgent: AgentId;
    receiverAgent: AgentId | 'broadcast';
    messageType: MessageType;
    priority: 'low' | 'normal' | 'high' | 'critical';
    correlationId: string;      // Links all messages in a request
  };
  
  payload: {
    action: string;             // Specific action (REQUIREMENTS_COMPLETE, etc.)
    data: Record<string, any>;  // Action-specific data
    context: {
      sdlcPhase: SDLCPhase;
      workItemId?: string;
      parentRequestId: string;
    };
  };
  
  metadata: {
    retryCount: number;
    ttl: number;                // Seconds
    requiresAck: boolean;
    traceId: string;
  };
}
```

### Message Types

| Type | Purpose | Example |
|------|---------|---------|
| INITIATE | Start a workflow | Conductor → BA: Start requirements |
| COMPLETE | Signal phase done | BA → Architect: Requirements ready |
| HANDOFF | Transfer work | Any agent handing off to next |
| ESCALATE | Raise issue | Agent → Conductor: Need help |
| STATUS_UPDATE | Progress report | Any → Tracker: Update status |
| GATE_PASSED | Quality check OK | QA → Customer: Tests passed |
| GATE_FAILED | Quality check failed | Security → Engineer: Issues found |
| REWORK_REQUIRED | Send back for fixes | QA → Engineer: Bug found |

---

## Agent Communication Matrix

```
                    RECEIVES FROM
           ┌────┬────┬────┬────┬────┬────┬────┬────┐
           │COND│ BA │ARCH│ ENG│ SEC│ QA │CUST│TRAK│
      ┌────┼────┼────┼────┼────┼────┼────┼────┼────┤
      │COND│    │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ Receives completions
S     ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
E     │ BA │ ✓  │    │    │    │    │    │ ✓  │    │ Receives initiate, validate
N     ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
D     │ARCH│    │ ✓  │    │    │    │    │    │    │ Receives requirements
S     ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
      │ ENG│    │    │ ✓  │    │ ✓  │ ✓  │    │    │ Receives arch, findings, bugs
T     ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
O     │ SEC│    │    │ ✓  │ ✓  │    │    │    │    │ Receives arch, implementation
      ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
      │ QA │    │    │    │    │ ✓  │    │    │    │ Receives security approval
      ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
      │CUST│    │ ✓  │    │    │    │ ✓  │    │    │ Receives QA passed, criteria
      ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
      │TRAK│ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │    │ Receives ALL status updates
      └────┴────┴────┴────┴────┴────┴────┴────┴────┘
```

---

## Python Implementation

### Message Bus (Redis Streams)

```python
import redis
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum

class AgentId(Enum):
    CONDUCTOR = "conductor"
    BA_AGENT = "ba_agent"
    ARCHITECT_AGENT = "architect_agent"
    SOFTWARE_ENGINEER_AGENT = "software_engineer_agent"
    SECURITY_AGENT = "security_agent"
    QA_AGENT = "qa_agent"
    CUSTOMER_AGENT = "customer_agent"
    TRACKER_AGENT = "tracker_agent"

@dataclass
class A2AMessage:
    message_id: str
    timestamp: str
    sender_agent: str
    receiver_agent: str
    message_type: str
    priority: str
    correlation_id: str
    action: str
    data: Dict[str, Any]
    sdlc_phase: str
    work_item_id: str
    parent_request_id: str
    trace_id: str
    
    def to_json(self) -> str:
        return json.dumps(asdict(self))
    
    @classmethod
    def from_json(cls, json_str: str) -> 'A2AMessage':
        data = json.loads(json_str)
        return cls(**data)
    
    @classmethod
    def create(
        cls,
        sender: AgentId,
        receiver: str,
        action: str,
        data: Dict,
        correlation_id: str,
        sdlc_phase: str,
        message_type: str = "HANDOFF",
        priority: str = "normal",
        work_item_id: str = ""
    ) -> 'A2AMessage':
        return cls(
            message_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat() + "Z",
            sender_agent=sender.value,
            receiver_agent=receiver,
            message_type=message_type,
            priority=priority,
            correlation_id=correlation_id,
            action=action,
            data=data,
            sdlc_phase=sdlc_phase,
            work_item_id=work_item_id,
            parent_request_id=correlation_id,
            trace_id=str(uuid.uuid4())
        )


class A2AMessageBus:
    """Redis Streams-based message bus"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(redis_url)
        self.stream_prefix = "a2a:agent:"
    
    def publish(self, message: A2AMessage) -> str:
        """Publish message to receiver's stream"""
        stream = f"{self.stream_prefix}{message.receiver_agent}"
        msg_id = self.redis.xadd(stream, {"payload": message.to_json()})
        
        # Also publish to tracker
        if message.receiver_agent != AgentId.TRACKER_AGENT.value:
            tracker_stream = f"{self.stream_prefix}{AgentId.TRACKER_AGENT.value}"
            self.redis.xadd(tracker_stream, {"payload": message.to_json()})
        
        return msg_id.decode()
    
    def subscribe(
        self,
        agent_id: AgentId,
        handler: Callable[[A2AMessage], None],
        block_ms: int = 5000
    ):
        """Subscribe to messages for this agent"""
        stream = f"{self.stream_prefix}{agent_id.value}"
        last_id = "0"
        
        # Create consumer group if not exists
        try:
            self.redis.xgroup_create(stream, "agents", id="0", mkstream=True)
        except redis.ResponseError:
            pass  # Group already exists
        
        while True:
            messages = self.redis.xreadgroup(
                groupname="agents",
                consumername=agent_id.value,
                streams={stream: ">"},
                block=block_ms
            )
            
            for stream_name, entries in messages:
                for entry_id, data in entries:
                    try:
                        message = A2AMessage.from_json(data[b"payload"])
                        handler(message)
                        self.redis.xack(stream_name, "agents", entry_id)
                    except Exception as e:
                        print(f"Error processing message: {e}")
```

### Base Agent Class

```python
from abc import ABC, abstractmethod
import anthropic  # or openai, etc.

class BaseAgent(ABC):
    """Base class for all SDLC agents"""
    
    def __init__(
        self,
        agent_id: AgentId,
        message_bus: A2AMessageBus,
        system_prompt: str,
        model: str = "claude-sonnet-4-20250514"
    ):
        self.agent_id = agent_id
        self.bus = message_bus
        self.system_prompt = system_prompt
        self.model = model
        self.client = anthropic.Anthropic()
        self.handlers: Dict[str, Callable] = {}
        self._register_handlers()
    
    @abstractmethod
    def _register_handlers(self):
        """Register message handlers - implement in subclass"""
        pass
    
    def send(
        self,
        receiver: str,
        action: str,
        data: Dict,
        correlation_id: str,
        sdlc_phase: str,
        message_type: str = "HANDOFF",
        priority: str = "normal"
    ):
        """Send message to another agent"""
        message = A2AMessage.create(
            sender=self.agent_id,
            receiver=receiver,
            action=action,
            data=data,
            correlation_id=correlation_id,
            sdlc_phase=sdlc_phase,
            message_type=message_type,
            priority=priority
        )
        self.bus.publish(message)
        print(f"[{self.agent_id.value}] Sent {action} to {receiver}")
    
    def think(self, context: str, task: str) -> str:
        """Use LLM to process task"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[
                {"role": "user", "content": f"Context:\n{context}\n\nTask:\n{task}"}
            ]
        )
        return response.content[0].text
    
    def handle_message(self, message: A2AMessage):
        """Route message to appropriate handler"""
        handler = self.handlers.get(message.action)
        if handler:
            print(f"[{self.agent_id.value}] Handling {message.action}")
            handler(message)
        else:
            print(f"[{self.agent_id.value}] No handler for {message.action}")
    
    def start(self):
        """Start listening for messages"""
        print(f"[{self.agent_id.value}] Agent started, listening...")
        self.bus.subscribe(self.agent_id, self.handle_message)
```

### Conductor Agent

```python
CONDUCTOR_PROMPT = """
You are the CONDUCTOR AGENT - meta-orchestrator for an AI SDLC system.

When you receive a user request:
1. Classify the request type (NEW_FEATURE, BUG_FIX, MODERNIZATION, etc.)
2. Extract key domain/technology hints
3. Prepare context for the BA Agent

Respond with JSON:
{
  "request_type": "NEW_FEATURE|BUG_FIX|MODERNIZATION|ENHANCEMENT",
  "domain": "extracted domain",
  "hints": ["key", "technology", "hints"],
  "summary": "one line summary"
}
"""

class ConductorAgent(BaseAgent):
    def __init__(self, message_bus: A2AMessageBus):
        super().__init__(
            AgentId.CONDUCTOR,
            message_bus,
            CONDUCTOR_PROMPT
        )
        self.active_requests: Dict[str, Dict] = {}
    
    def _register_handlers(self):
        self.handlers["USER_REQUEST"] = self.handle_user_request
        self.handlers["REQUIREMENTS_COMPLETE"] = self.handle_phase_complete
        self.handlers["ARCHITECTURE_READY"] = self.handle_phase_complete
        self.handlers["IMPLEMENTATION_COMPLETE"] = self.handle_phase_complete
        self.handlers["SECURITY_APPROVED"] = self.handle_phase_complete
        self.handlers["QA_PASSED"] = self.handle_phase_complete
        self.handlers["VALIDATION_COMPLETE"] = self.handle_complete
        self.handlers["BLOCKER"] = self.handle_blocker
    
    def handle_user_request(self, message: A2AMessage):
        """Process new user request"""
        user_request = message.data.get("request", "")
        correlation_id = str(uuid.uuid4())
        
        # Use LLM to classify
        classification = self.think(
            context="",
            task=f"Classify this request: {user_request}"
        )
        
        # Parse classification (in production, use proper JSON parsing)
        import json
        try:
            parsed = json.loads(classification)
        except:
            parsed = {"request_type": "NEW_FEATURE", "domain": "general", "hints": [], "summary": user_request}
        
        # Track request
        self.active_requests[correlation_id] = {
            "request": user_request,
            "classification": parsed,
            "phase": "discover",
            "started_at": datetime.utcnow().isoformat()
        }
        
        # Trigger BA Agent
        self.send(
            receiver=AgentId.BA_AGENT.value,
            action="INITIATE_REQUIREMENTS",
            data={
                "userRequest": user_request,
                "classification": parsed
            },
            correlation_id=correlation_id,
            sdlc_phase="discover",
            message_type="INITIATE"
        )
    
    def handle_phase_complete(self, message: A2AMessage):
        """Handle phase completion, trigger next"""
        correlation_id = message.correlation_id
        request = self.active_requests.get(correlation_id)
        if not request:
            return
        
        # Determine next phase
        phase_flow = {
            "REQUIREMENTS_COMPLETE": ("design", AgentId.ARCHITECT_AGENT.value),
            "ARCHITECTURE_READY": ("develop", AgentId.SOFTWARE_ENGINEER_AGENT.value),
            "IMPLEMENTATION_COMPLETE": ("secure", AgentId.SECURITY_AGENT.value),
            "SECURITY_APPROVED": ("test", AgentId.QA_AGENT.value),
            "QA_PASSED": ("accept", AgentId.CUSTOMER_AGENT.value),
        }
        
        next_info = phase_flow.get(message.action)
        if next_info:
            next_phase, next_agent = next_info
            request["phase"] = next_phase
            
            self.send(
                receiver=next_agent,
                action=f"START_{next_phase.upper()}",
                data=message.data,
                correlation_id=correlation_id,
                sdlc_phase=next_phase
            )
    
    def handle_complete(self, message: A2AMessage):
        """Handle final completion"""
        correlation_id = message.correlation_id
        request = self.active_requests.get(correlation_id)
        if request:
            request["completed_at"] = datetime.utcnow().isoformat()
            request["status"] = "COMPLETE"
            print(f"\n{'='*60}")
            print(f"✅ DELIVERY COMPLETE: {correlation_id}")
            print(f"Request: {request['request']}")
            print(f"Duration: {request['started_at']} → {request['completed_at']}")
            print(f"{'='*60}\n")
    
    def handle_blocker(self, message: A2AMessage):
        """Handle blockers from agents"""
        print(f"⚠️ BLOCKER from {message.sender_agent}: {message.data}")
        # Implement resolution logic
```

### BA Agent

```python
BA_PROMPT = """
You are the BA AGENT in an AI SDLC system. You own requirements engineering.

When you receive a request, produce:
1. Problem Statement: [WHO] needs [WHAT] because [WHY], resulting in [IMPACT]
2. Functional Requirements (FR-XXX format)
3. Non-Functional Requirements (quantified)
4. Acceptance Criteria (Given/When/Then)

Respond with structured markdown following the templates exactly.
Never proceed with ambiguous requirements - ask for clarification.
"""

class BAAgent(BaseAgent):
    def __init__(self, message_bus: A2AMessageBus):
        super().__init__(AgentId.BA_AGENT, message_bus, BA_PROMPT)
    
    def _register_handlers(self):
        self.handlers["INITIATE_REQUIREMENTS"] = self.handle_initiate
        self.handlers["CLARIFY_REQUEST"] = self.handle_clarify
    
    def handle_initiate(self, message: A2AMessage):
        """Start requirements gathering"""
        user_request = message.data.get("userRequest", "")
        classification = message.data.get("classification", {})
        
        # Use LLM to generate requirements
        requirements = self.think(
            context=f"Classification: {json.dumps(classification)}",
            task=f"""Generate complete requirements for: {user_request}
            
            Include:
            1. Problem Statement
            2. Functional Requirements (FR-001, FR-002, etc.)
            3. Non-Functional Requirements (performance, security, etc.)
            4. Acceptance Criteria (Given/When/Then for each FR)
            """
        )
        
        # Send to Architect
        self.send(
            receiver=AgentId.ARCHITECT_AGENT.value,
            action="REQUIREMENTS_COMPLETE",
            data={
                "requirements": requirements,
                "originalRequest": user_request,
                "classification": classification
            },
            correlation_id=message.correlation_id,
            sdlc_phase="design"
        )
    
    def handle_clarify(self, message: A2AMessage):
        """Handle clarification requests"""
        # Implement clarification logic
        pass
```

### Running the System

```python
# main.py
import threading

def main():
    # Initialize message bus
    bus = A2AMessageBus("redis://localhost:6379")
    
    # Create agents
    conductor = ConductorAgent(bus)
    ba = BAAgent(bus)
    # ... create other agents
    
    # Start agents in threads
    threads = [
        threading.Thread(target=conductor.start, daemon=True),
        threading.Thread(target=ba.start, daemon=True),
        # ... other agents
    ]
    
    for t in threads:
        t.start()
    
    # Trigger with user request
    initial_message = A2AMessage.create(
        sender=AgentId.CONDUCTOR,  # External trigger
        receiver=AgentId.CONDUCTOR.value,
        action="USER_REQUEST",
        data={"request": "Build a customer feedback portal with sentiment analysis"},
        correlation_id=str(uuid.uuid4()),
        sdlc_phase="initiate"
    )
    bus.publish(initial_message)
    
    # Keep running
    for t in threads:
        t.join()

if __name__ == "__main__":
    main()
```

---

## Learning Engine Integration

```python
class LearningEngine:
    """Continuous improvement engine for agents"""
    
    def __init__(self, knowledge_base):
        self.kb = knowledge_base
        self.metrics: Dict[str, List] = {}
    
    def capture_delivery(self, correlation_id: str, metrics: Dict):
        """Capture metrics from completed delivery"""
        self.metrics[correlation_id] = metrics
        
        # Analyze patterns
        self._analyze_cycle_time()
        self._analyze_rework_rate()
        self._analyze_quality_gates()
    
    def detect_model_updates(self):
        """Check for new model versions"""
        # Poll model registry
        # Compare capabilities
        # Recommend upgrades
        pass
    
    def update_agent_knowledge(self, agent_id: str, learning: Dict):
        """Update agent's knowledge base with new learnings"""
        self.kb.add(
            namespace=f"agent:{agent_id}",
            document=learning
        )
    
    def get_recommendations(self, agent_id: str) -> List[str]:
        """Get improvement recommendations for agent"""
        # Analyze historical performance
        # Compare to best practices
        # Return actionable recommendations
        return []
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Conductor   │  │   BA Agent   │  │  Architect   │           │
│  │   Pod (1)    │  │   Pod (2)    │  │   Pod (1)    │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └────────────┬────┴────────┬────────┘                    │
│                      │             │                             │
│                      ▼             ▼                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              REDIS CLUSTER (A2A Message Bus)             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                      │             │                             │
│         ┌────────────┴─────────────┴────────────┐               │
│         │                 │                      │               │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴───┐           │
│  │   Engineer   │  │   Security   │  │      QA      │           │
│  │   Pod (3)    │  │   Pod (1)    │  │   Pod (2)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Customer   │  │   Tracker    │  │   Learning   │           │
│  │   Pod (1)    │  │   Pod (1)    │  │   Engine     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                       SUPPORTING SERVICES                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Postgres   │  │   Pinecone   │  │   Grafana    │           │
│  │  (Tracker)   │  │(Knowledge)   │  │ (Monitoring) │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```bash
# .env
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Agent Configuration
CONDUCTOR_MODEL=claude-sonnet-4-20250514
BA_MODEL=claude-sonnet-4-20250514
ARCHITECT_MODEL=claude-sonnet-4-20250514
ENGINEER_MODEL=claude-sonnet-4-20250514

# Knowledge Base
PINECONE_API_KEY=...
PINECONE_INDEX=aisdlc-knowledge

# Observability
GRAFANA_URL=http://grafana:3000
JAEGER_URL=http://jaeger:14268
```

---

## Monitoring & Observability

### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `sdlc.cycle_time` | End-to-end delivery time | >24h for small |
| `sdlc.phase_duration` | Time per phase | >4h per phase |
| `sdlc.rework_rate` | Items sent back | >30% |
| `sdlc.blocker_count` | Active blockers | >0 critical |
| `agent.message_latency` | A2A message delay | >1s |
| `agent.error_rate` | Processing failures | >1% |

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AI-SDLC Agent Mesh",
    "panels": [
      {
        "title": "Active Requests",
        "type": "stat",
        "query": "count(sdlc_requests{status='active'})"
      },
      {
        "title": "Phase Distribution",
        "type": "piechart",
        "query": "count by (phase)(sdlc_requests)"
      },
      {
        "title": "Agent Message Flow",
        "type": "nodeGraph",
        "query": "a2a_messages_total"
      },
      {
        "title": "Cycle Time Trend",
        "type": "timeseries",
        "query": "histogram_quantile(0.95, sdlc_cycle_time)"
      }
    ]
  }
}
```

---

*A2A Protocol Version: 1.0 | Implementation: Python 3.11+ | Message Bus: Redis Streams*
