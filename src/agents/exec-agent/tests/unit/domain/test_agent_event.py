"""
Unit tests for Agent Event entity
"""

import pytest
from datetime import datetime
import json

from domain.entities.agent_event import (
    AgentEvent,
    EventType,
    AgentType,
)


def test_create_agent_event():
    """Test creating an agent event"""
    event = AgentEvent(
        id="test-123",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        target_agents=[AgentType.EXEC],
        payload={'project_id': 'PROJ-123'},
    )

    assert event.id == "test-123"
    assert event.event_type == EventType.PROJECT_COMPLETED
    assert event.source_agent == AgentType.CONDUCTOR
    assert AgentType.EXEC in event.target_agents


def test_broadcast_event():
    """Test creating a broadcast event"""
    event = AgentEvent(
        id="broadcast-1",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        payload={},
    )

    assert event.is_broadcast()
    assert event.is_for_agent(AgentType.EXEC)
    assert event.is_for_agent(AgentType.BA)


def test_targeted_event():
    """Test creating a targeted event"""
    event = AgentEvent(
        id="targeted-1",
        event_type=EventType.GENERATE_PRESENTATION,
        source_agent=AgentType.CONDUCTOR,
        target_agents=[AgentType.EXEC],
        payload={},
    )

    assert not event.is_broadcast()
    assert event.is_for_agent(AgentType.EXEC)
    assert not event.is_for_agent(AgentType.BA)


def test_add_target():
    """Test adding target agents"""
    event = AgentEvent(
        id="test-1",
        event_type=EventType.PRESENTATION_GENERATED,
        source_agent=AgentType.EXEC,
        target_agents=[AgentType.CONDUCTOR],
        payload={},
    )

    event.add_target(AgentType.TRACKER)
    assert AgentType.TRACKER in event.target_agents

    # Adding again shouldn't duplicate
    event.add_target(AgentType.TRACKER)
    assert event.target_agents.count(AgentType.TRACKER) == 1


def test_get_project_id():
    """Test extracting project ID from payload"""
    event = AgentEvent(
        id="test-1",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        payload={'project_id': 'PROJ-456'},
    )

    assert event.get_project_id() == 'PROJ-456'


def test_get_presentation_id():
    """Test extracting presentation ID from payload"""
    event = AgentEvent(
        id="test-1",
        event_type=EventType.PRESENTATION_GENERATED,
        source_agent=AgentType.EXEC,
        payload={'presentation_id': 'PRES-789'},
    )

    assert event.get_presentation_id() == 'PRES-789'


def test_validation():
    """Test event validation"""
    # Valid event
    event = AgentEvent(
        id="test-1",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        payload={},
    )

    assert event.is_valid()
    assert len(event.validate()) == 0


def test_to_dict():
    """Test converting event to dictionary"""
    timestamp = datetime(2026, 2, 17, 10, 30, 0)

    event = AgentEvent(
        id="test-1",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        target_agents=[AgentType.EXEC],
        timestamp=timestamp,
        payload={'project_id': 'PROJ-123'},
        correlation_id='corr-456',
    )

    data = event.to_dict()

    assert data['id'] == "test-1"
    assert data['event_type'] == EventType.PROJECT_COMPLETED.value
    assert data['source_agent'] == AgentType.CONDUCTOR.value
    assert AgentType.EXEC.value in data['target_agents']
    assert data['payload']['project_id'] == 'PROJ-123'
    assert data['correlation_id'] == 'corr-456'


def test_from_dict():
    """Test creating event from dictionary"""
    data = {
        'id': 'test-1',
        'event_type': 'project.completed',
        'source_agent': 'conductor',
        'target_agents': ['exec'],
        'timestamp': '2026-02-17T10:30:00',
        'payload': {'project_id': 'PROJ-123'},
        'correlation_id': 'corr-456',
    }

    event = AgentEvent.from_dict(data)

    assert event.id == 'test-1'
    assert event.event_type == EventType.PROJECT_COMPLETED
    assert event.source_agent == AgentType.CONDUCTOR
    assert AgentType.EXEC in event.target_agents
    assert event.get_project_id() == 'PROJ-123'


def test_to_json():
    """Test converting event to JSON"""
    event = AgentEvent(
        id="test-1",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        payload={'project_id': 'PROJ-123'},
    )

    json_str = event.to_json()
    assert isinstance(json_str, str)

    # Should be valid JSON
    data = json.loads(json_str)
    assert data['id'] == 'test-1'


def test_from_json():
    """Test creating event from JSON"""
    json_str = '''
    {
        "id": "test-1",
        "event_type": "project.completed",
        "source_agent": "conductor",
        "target_agents": ["exec"],
        "timestamp": "2026-02-17T10:30:00",
        "payload": {"project_id": "PROJ-123"}
    }
    '''

    event = AgentEvent.from_json(json_str)

    assert event.id == 'test-1'
    assert event.event_type == EventType.PROJECT_COMPLETED
    assert event.get_project_id() == 'PROJ-123'


def test_correlation_id():
    """Test correlation ID for related events"""
    correlation_id = "workflow-123"

    event1 = AgentEvent(
        id="event-1",
        event_type=EventType.PROJECT_CREATED,
        source_agent=AgentType.CONDUCTOR,
        correlation_id=correlation_id,
        payload={},
    )

    event2 = AgentEvent(
        id="event-2",
        event_type=EventType.ARCHITECTURE_DESIGNED,
        source_agent=AgentType.JETS,
        correlation_id=correlation_id,
        payload={},
    )

    assert event1.correlation_id == event2.correlation_id


def test_str_representation():
    """Test string representation of event"""
    event = AgentEvent(
        id="test-1",
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        target_agents=[AgentType.EXEC],
        payload={},
    )

    str_repr = str(event)
    assert "project.completed" in str_repr
    assert "conductor" in str_repr
    assert "exec" in str_repr
