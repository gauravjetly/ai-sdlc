"""
Agent Event Entity - Domain model for inter-agent communication

This is a pure domain entity representing events that flow through
the agent mesh for coordination and knowledge sharing.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


class EventType(Enum):
    """Types of events in the agent mesh"""

    # Project lifecycle events
    PROJECT_CREATED = "project.created"
    PROJECT_UPDATED = "project.updated"
    PROJECT_COMPLETED = "project.completed"

    # Architecture events
    ARCHITECTURE_DESIGNED = "architecture.designed"
    ARCHITECTURE_UPDATED = "architecture.updated"
    ADR_CREATED = "adr.created"

    # Development events
    CODE_COMMITTED = "code.committed"
    BUILD_COMPLETED = "build.completed"

    # Security events
    SECURITY_SCAN_COMPLETED = "security.scan_completed"
    VULNERABILITY_FOUND = "security.vulnerability_found"
    VULNERABILITY_FIXED = "security.vulnerability_fixed"

    # Testing events
    TESTS_COMPLETED = "tests.completed"
    TESTS_FAILED = "tests.failed"
    QUALITY_GATE_PASSED = "quality.gate_passed"

    # Deployment events
    DEPLOYMENT_STARTED = "deployment.started"
    DEPLOYMENT_COMPLETED = "deployment.completed"
    DEPLOYMENT_FAILED = "deployment.failed"

    # Customer events
    UAT_COMPLETED = "uat.completed"
    FEEDBACK_RECEIVED = "customer.feedback_received"

    # Exec Agent events (outbound)
    PRESENTATION_GENERATED = "presentation.generated"
    PRESENTATION_UPDATED = "presentation.updated"
    LEARNING_INSIGHT = "exec.learning_insight"

    # Exec Agent triggers (inbound)
    GENERATE_PRESENTATION = "exec.generate_presentation"
    UPDATE_PRESENTATION = "exec.update_presentation"


class AgentType(Enum):
    """Types of agents in the AI-SDLC system"""

    CONDUCTOR = "conductor"
    BA = "ba"
    JETS = "jets"
    UX = "ux"
    ENGINEER = "engineer"
    SECURITY = "security"
    QA = "qa"
    ATLAS = "atlas"
    CUSTOMER = "customer"
    TRACKER = "tracker"
    FINOPS = "finops"
    EXEC = "exec"


@dataclass
class AgentEvent:
    """
    Core domain entity for inter-agent events.

    Events are immutable messages that flow through the agent mesh,
    enabling autonomous coordination and knowledge sharing.
    """

    id: str
    event_type: EventType
    source_agent: AgentType
    target_agents: List[AgentType] = field(default_factory=list)  # empty = broadcast
    timestamp: datetime = field(default_factory=datetime.now)
    payload: Dict[str, Any] = field(default_factory=dict)
    correlation_id: Optional[str] = None  # Link related events
    metadata: Dict[str, Any] = field(default_factory=dict)  # Additional context

    def is_broadcast(self) -> bool:
        """Check if this event is a broadcast to all agents"""
        return len(self.target_agents) == 0

    def is_for_agent(self, agent: AgentType) -> bool:
        """Check if this event is intended for a specific agent"""
        return self.is_broadcast() or agent in self.target_agents

    def add_target(self, agent: AgentType) -> None:
        """Add a target agent to this event"""
        if agent not in self.target_agents:
            self.target_agents.append(agent)

    def get_project_id(self) -> Optional[str]:
        """Extract project ID from payload if present"""
        return self.payload.get('project_id')

    def get_presentation_id(self) -> Optional[str]:
        """Extract presentation ID from payload if present"""
        return self.payload.get('presentation_id')

    def validate(self) -> List[str]:
        """
        Validate the event and return list of errors.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        if not self.id:
            errors.append("Event ID is required")

        if not self.source_agent:
            errors.append("Source agent is required")

        if not self.event_type:
            errors.append("Event type is required")

        if not self.timestamp:
            errors.append("Timestamp is required")

        return errors

    def is_valid(self) -> bool:
        """Check if event is valid"""
        return len(self.validate()) == 0

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert event to dictionary for serialization.

        Returns:
            Dictionary representation of the event
        """
        return {
            'id': self.id,
            'event_type': self.event_type.value,
            'source_agent': self.source_agent.value,
            'target_agents': [agent.value for agent in self.target_agents],
            'timestamp': self.timestamp.isoformat(),
            'payload': self.payload,
            'correlation_id': self.correlation_id,
            'metadata': self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentEvent':
        """
        Create event from dictionary.

        Args:
            data: Dictionary representation of the event

        Returns:
            AgentEvent instance
        """
        return cls(
            id=data['id'],
            event_type=EventType(data['event_type']),
            source_agent=AgentType(data['source_agent']),
            target_agents=[AgentType(agent) for agent in data.get('target_agents', [])],
            timestamp=datetime.fromisoformat(data['timestamp']),
            payload=data.get('payload', {}),
            correlation_id=data.get('correlation_id'),
            metadata=data.get('metadata', {}),
        )

    def to_json(self) -> str:
        """Convert event to JSON string"""
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_json(cls, json_str: str) -> 'AgentEvent':
        """Create event from JSON string"""
        return cls.from_dict(json.loads(json_str))

    def __str__(self) -> str:
        """String representation of the event"""
        targets = "broadcast" if self.is_broadcast() else ", ".join(a.value for a in self.target_agents)
        return (
            f"AgentEvent({self.event_type.value} "
            f"from {self.source_agent.value} → {targets} "
            f"at {self.timestamp.isoformat()})"
        )
