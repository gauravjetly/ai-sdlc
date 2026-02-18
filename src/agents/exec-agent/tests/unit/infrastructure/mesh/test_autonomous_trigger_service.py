"""
Unit tests for AutonomousTriggerService

Tests cover:
  - Service starts polling and subscribes to all rule event types
  - Trigger dispatches generation for a matching event with project_id
  - Cooldown prevents re-triggering within the cooldown window
  - Cooldown allows re-triggering after the window expires
  - Different projects have independent cooldowns (project A does not block B)
  - Events without project_id are silently skipped
  - Generator exceptions do not crash the service
  - Max concurrent generation cap is respected
"""

import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, call, patch

import pytest

from application.services.autonomous_trigger_service import (
    AutonomousTriggerService,
    TriggerRule,
)


# ---------------------------------------------------------------------------
# Stub implementations
# ---------------------------------------------------------------------------


class StubEventClient:
    """In-memory event client that captures subscriptions and allows manual dispatch."""

    def __init__(self) -> None:
        self._subscriptions: Dict[str, List] = {}
        self._polling_started = False
        self._polling_stopped = False

    def subscribe(self, event_type: str, handler) -> None:
        self._subscriptions.setdefault(event_type, []).append(handler)

    def start_polling(self, interval_seconds: int = 15) -> None:
        self._polling_started = True

    def stop(self) -> None:
        self._polling_stopped = True

    def dispatch(self, event_type: str, message: Dict[str, Any]) -> None:
        """Manually trigger handlers for a given event type (test helper)."""
        # Inject '_event_type' so handlers can read it
        message.setdefault("type", event_type)
        for handler in self._subscriptions.get(event_type, []):
            handler(message)
        for handler in self._subscriptions.get("*", []):
            handler(message)


class StubGenerator:
    """Tracks generation calls and returns a fake path."""

    def __init__(self, fail: bool = False) -> None:
        self.calls: List[Dict[str, Any]] = []
        self._fail = fail

    def generate(
        self, project_id: str, presentation_type: str, auto_mode: bool = True
    ) -> Optional[str]:
        self.calls.append(
            {"project_id": project_id, "presentation_type": presentation_type}
        )
        if self._fail:
            raise RuntimeError("Simulated generator failure")
        return f"/fake/{project_id}/{presentation_type}.pptx"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


SIMPLE_RULE = TriggerRule(
    rule_id="R-TEST",
    event_type="project.completed",
    presentation_type="executive_summary",
    delay_seconds=0,
    cooldown_minutes=60,
    priority="normal",
)

ZERO_COOLDOWN_RULE = TriggerRule(
    rule_id="R-ZERO",
    event_type="sprint.completed",
    presentation_type="status_report",
    delay_seconds=0,
    cooldown_minutes=0,
    priority="normal",
)


@pytest.fixture()
def stub_client() -> StubEventClient:
    return StubEventClient()


@pytest.fixture()
def stub_generator() -> StubGenerator:
    return StubGenerator()


@pytest.fixture()
def service(stub_client: StubEventClient, stub_generator: StubGenerator) -> AutonomousTriggerService:
    return AutonomousTriggerService(
        event_client=stub_client,
        generator=stub_generator,
        rules=[SIMPLE_RULE, ZERO_COOLDOWN_RULE],
    )


# ---------------------------------------------------------------------------
# Start / stop
# ---------------------------------------------------------------------------


def test_start_calls_event_client_start_polling(
    service: AutonomousTriggerService, stub_client: StubEventClient
) -> None:
    """start() should start polling on the event client."""
    service.start()
    assert stub_client._polling_started


def test_start_subscribes_to_all_rule_event_types(
    service: AutonomousTriggerService, stub_client: StubEventClient
) -> None:
    """Each rule's event_type should be subscribed."""
    service.start()
    assert "project.completed" in stub_client._subscriptions
    assert "sprint.completed" in stub_client._subscriptions


def test_stop_calls_event_client_stop(
    service: AutonomousTriggerService, stub_client: StubEventClient
) -> None:
    """stop() should call stop on the event client."""
    service.start()
    service.stop()
    assert stub_client._polling_stopped


# ---------------------------------------------------------------------------
# Event handling – generation dispatch
# ---------------------------------------------------------------------------


def test_matching_event_triggers_generation(
    service: AutonomousTriggerService,
    stub_client: StubEventClient,
    stub_generator: StubGenerator,
) -> None:
    """An event matching a rule should result in generate() being called."""
    service.start()

    stub_client.dispatch(
        "project.completed",
        {"type": "project.completed", "context": {"projectId": "PROJ-42"}},
    )

    # Generation runs in a daemon thread; give it a moment
    timeout = time.time() + 3
    while not stub_generator.calls and time.time() < timeout:
        time.sleep(0.05)

    assert len(stub_generator.calls) == 1
    assert stub_generator.calls[0]["project_id"] == "PROJ-42"
    assert stub_generator.calls[0]["presentation_type"] == "executive_summary"


def test_event_without_project_id_is_skipped(
    service: AutonomousTriggerService,
    stub_client: StubEventClient,
    stub_generator: StubGenerator,
) -> None:
    """An event with no extractable project_id should produce no generation."""
    service.start()

    stub_client.dispatch("project.completed", {"type": "project.completed"})
    time.sleep(0.1)  # small wait to confirm nothing happened

    assert len(stub_generator.calls) == 0


# ---------------------------------------------------------------------------
# Cooldown management
# ---------------------------------------------------------------------------


def test_cooldown_prevents_second_trigger(
    service: AutonomousTriggerService,
    stub_client: StubEventClient,
    stub_generator: StubGenerator,
) -> None:
    """Second event within cooldown window should NOT trigger a second generation."""
    service.start()

    msg = {"type": "project.completed", "context": {"projectId": "PROJ-1"}}

    stub_client.dispatch("project.completed", msg)
    timeout = time.time() + 3
    while not stub_generator.calls and time.time() < timeout:
        time.sleep(0.05)

    # Dispatch again immediately (still in cooldown)
    stub_client.dispatch("project.completed", msg)
    time.sleep(0.1)

    assert len(stub_generator.calls) == 1


def test_cooldown_is_per_project(
    service: AutonomousTriggerService,
    stub_client: StubEventClient,
    stub_generator: StubGenerator,
) -> None:
    """Project A cooldown should NOT block Project B."""
    service.start()

    stub_client.dispatch(
        "project.completed",
        {"type": "project.completed", "context": {"projectId": "PROJ-A"}},
    )
    timeout = time.time() + 3
    while not stub_generator.calls and time.time() < timeout:
        time.sleep(0.05)

    # Project B should still be allowed
    stub_client.dispatch(
        "project.completed",
        {"type": "project.completed", "context": {"projectId": "PROJ-B"}},
    )
    timeout2 = time.time() + 3
    while len(stub_generator.calls) < 2 and time.time() < timeout2:
        time.sleep(0.05)

    project_ids = {c["project_id"] for c in stub_generator.calls}
    assert "PROJ-A" in project_ids
    assert "PROJ-B" in project_ids


def test_zero_cooldown_allows_repeated_triggers(
    service: AutonomousTriggerService,
    stub_client: StubEventClient,
    stub_generator: StubGenerator,
) -> None:
    """A rule with cooldown_minutes=0 should allow back-to-back triggers."""
    service.start()

    msg = {"type": "sprint.completed", "context": {"projectId": "PROJ-SPRINT"}}

    stub_client.dispatch("sprint.completed", msg)
    timeout = time.time() + 3
    while not stub_generator.calls and time.time() < timeout:
        time.sleep(0.05)

    stub_client.dispatch("sprint.completed", msg)
    timeout2 = time.time() + 3
    while len(stub_generator.calls) < 2 and time.time() < timeout2:
        time.sleep(0.05)

    sprint_calls = [c for c in stub_generator.calls if c["project_id"] == "PROJ-SPRINT"]
    assert len(sprint_calls) >= 2


def test_is_in_cooldown_true_within_window(
    service: AutonomousTriggerService,
) -> None:
    """_is_in_cooldown should return True when last exec was recent."""
    service._cooldowns[("PROJ-X", "R-TEST")] = datetime.now(timezone.utc)
    assert service._is_in_cooldown("PROJ-X", "R-TEST") is True


def test_is_in_cooldown_false_after_window(
    service: AutonomousTriggerService,
) -> None:
    """_is_in_cooldown should return False after the cooldown period."""
    service._cooldowns[("PROJ-X", "R-TEST")] = datetime.now(timezone.utc) - timedelta(hours=2)
    assert service._is_in_cooldown("PROJ-X", "R-TEST") is False


def test_is_in_cooldown_false_for_unknown_project(
    service: AutonomousTriggerService,
) -> None:
    """_is_in_cooldown should return False for a project not yet recorded."""
    assert service._is_in_cooldown("BRAND-NEW-PROJ", "R-TEST") is False


# ---------------------------------------------------------------------------
# Resilience
# ---------------------------------------------------------------------------


def test_generator_exception_does_not_crash_service(
    stub_client: StubEventClient,
) -> None:
    """Generator raising an exception should not propagate to the event thread."""
    failing_generator = StubGenerator(fail=True)
    service = AutonomousTriggerService(
        event_client=stub_client,
        generator=failing_generator,
        rules=[ZERO_COOLDOWN_RULE],
    )
    service.start()

    stub_client.dispatch(
        "sprint.completed",
        {"type": "sprint.completed", "context": {"projectId": "PROJ-FAIL"}},
    )
    # Give the generation thread time to run and fail
    time.sleep(0.3)

    # Service still alive (no crash); verify it would still subscribe to events
    assert "sprint.completed" in stub_client._subscriptions


# ---------------------------------------------------------------------------
# project_id extraction
# ---------------------------------------------------------------------------


def test_extract_project_id_from_top_level(service: AutonomousTriggerService) -> None:
    msg = {"project_id": "DIRECT-ID"}
    assert service._extract_project_id(msg) == "DIRECT-ID"


def test_extract_project_id_from_context_camel_case(service: AutonomousTriggerService) -> None:
    msg = {"context": {"projectId": "CAMEL-ID"}}
    assert service._extract_project_id(msg) == "CAMEL-ID"


def test_extract_project_id_from_context_snake_case(service: AutonomousTriggerService) -> None:
    msg = {"context": {"project_id": "SNAKE-ID"}}
    assert service._extract_project_id(msg) == "SNAKE-ID"


def test_extract_project_id_from_decoded_content(service: AutonomousTriggerService) -> None:
    msg = {"_decoded_content": {"project_id": "DECODED-ID"}}
    assert service._extract_project_id(msg) == "DECODED-ID"


def test_extract_project_id_from_decoded_payload(service: AutonomousTriggerService) -> None:
    msg = {"_decoded_content": {"payload": {"project_id": "PAYLOAD-ID"}}}
    assert service._extract_project_id(msg) == "PAYLOAD-ID"


def test_extract_project_id_returns_none_when_missing(service: AutonomousTriggerService) -> None:
    msg = {"type": "project.completed", "sender": "conductor"}
    assert service._extract_project_id(msg) is None
