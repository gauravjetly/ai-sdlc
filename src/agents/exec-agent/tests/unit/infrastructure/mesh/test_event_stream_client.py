"""
Unit tests for EventStreamClient

Tests cover:
  - Subscribing handlers and dispatching events
  - Processing well-formed inbox messages
  - Graceful handling of missing inbox directory (no mesh installed)
  - Graceful handling of malformed JSON files
  - Handler exceptions do not crash the client
  - Wildcard '*' subscription receives all events
  - Processed files are moved out of the inbox
"""

import json
import threading
import time
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

import pytest

from infrastructure.mesh.event_stream_client import EventStreamClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def tmp_inbox(tmp_path: Path) -> Path:
    """Create a temporary inbox directory."""
    inbox = tmp_path / "bus" / "exec" / "inbox"
    inbox.mkdir(parents=True)
    return inbox


@pytest.fixture()
def tmp_processed(tmp_path: Path) -> Path:
    """Create a temporary processed directory."""
    processed = tmp_path / "bus" / "exec" / "processed"
    processed.mkdir(parents=True)
    return processed


@pytest.fixture()
def client(tmp_path: Path) -> EventStreamClient:
    """EventStreamClient pointing at a tmp mesh base."""
    c = EventStreamClient(agent_id="exec")
    c.inbox_dir = tmp_path / "bus" / "exec" / "inbox"
    c.processed_dir = tmp_path / "bus" / "exec" / "processed"
    return c


def _write_message(inbox: Path, filename: str, message: Dict[str, Any]) -> Path:
    """Helper: write a JSON message file to the inbox."""
    inbox.mkdir(parents=True, exist_ok=True)
    p = inbox / filename
    p.write_text(json.dumps(message, indent=2), encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# Subscription tests
# ---------------------------------------------------------------------------


def test_subscribe_registers_handler(client: EventStreamClient) -> None:
    """Subscribe should register the handler without raising."""
    handler = MagicMock()
    client.subscribe("project.completed", handler)
    with client._lock:
        assert "project.completed" in client._handlers
        assert handler in client._handlers["project.completed"]


def test_subscribe_multiple_handlers_for_same_type(client: EventStreamClient) -> None:
    """Multiple handlers for the same event type should all be registered."""
    h1, h2 = MagicMock(), MagicMock()
    client.subscribe("project.completed", h1)
    client.subscribe("project.completed", h2)
    with client._lock:
        assert len(client._handlers["project.completed"]) == 2


def test_subscribe_wildcard(client: EventStreamClient) -> None:
    """Wildcard '*' subscription should be stored under the '*' key."""
    handler = MagicMock()
    client.subscribe("*", handler)
    with client._lock:
        assert "*" in client._handlers


# ---------------------------------------------------------------------------
# _process_inbox tests (direct method call, no background thread)
# ---------------------------------------------------------------------------


def test_process_inbox_nonexistent_dir_does_not_raise(client: EventStreamClient) -> None:
    """If inbox does not exist, _process_inbox should return silently."""
    # inbox_dir points to a path that does not exist yet
    assert not client.inbox_dir.exists()
    client._process_inbox()  # must not raise


def test_process_inbox_dispatches_event_to_subscriber(
    client: EventStreamClient, tmp_inbox: Path, tmp_processed: Path
) -> None:
    """Valid message file in inbox should reach the subscribed handler."""
    client.inbox_dir = tmp_inbox
    client.processed_dir = tmp_processed

    received: List[Dict[str, Any]] = []

    def handler(msg: Dict[str, Any]) -> None:
        received.append(msg)

    client.subscribe("project.completed", handler)

    message = {
        "id": "msg-001",
        "type": "project.completed",
        "sender": "conductor",
        "receiver": "exec",
        "content": json.dumps({"event_type": "project.completed", "payload": {"project_id": "PROJ-1"}}),
    }
    _write_message(tmp_inbox, "msg-001.json", message)

    client._process_inbox()

    assert len(received) == 1
    assert received[0]["id"] == "msg-001"


def test_process_inbox_moves_file_to_processed(
    client: EventStreamClient, tmp_inbox: Path, tmp_processed: Path
) -> None:
    """After processing, the message file should be in processed/, not inbox/."""
    client.inbox_dir = tmp_inbox
    client.processed_dir = tmp_processed

    message = {"id": "msg-002", "type": "project.completed", "sender": "conductor"}
    _write_message(tmp_inbox, "msg-002.json", message)

    client._process_inbox()

    assert not (tmp_inbox / "msg-002.json").exists()
    assert (tmp_processed / "msg-002.json").exists()


def test_process_inbox_handles_malformed_json(
    client: EventStreamClient, tmp_inbox: Path, tmp_processed: Path
) -> None:
    """Malformed JSON should be moved to processed without raising an exception."""
    client.inbox_dir = tmp_inbox
    client.processed_dir = tmp_processed

    bad_file = tmp_inbox / "bad.json"
    bad_file.write_text("this is not json {{{{", encoding="utf-8")

    # Should not raise
    client._process_inbox()

    assert not bad_file.exists()
    assert (tmp_processed / "bad.json").exists()


def test_process_inbox_wildcard_handler_receives_any_event(
    client: EventStreamClient, tmp_inbox: Path, tmp_processed: Path
) -> None:
    """Wildcard handler should receive events regardless of type."""
    client.inbox_dir = tmp_inbox
    client.processed_dir = tmp_processed

    received: List[Dict[str, Any]] = []
    client.subscribe("*", lambda msg: received.append(msg))

    for i, event_type in enumerate(["project.completed", "architecture.updated", "tests.failed"]):
        _write_message(
            tmp_inbox,
            f"msg-{i:03d}.json",
            {"id": f"msg-{i:03d}", "type": event_type},
        )

    client._process_inbox()

    assert len(received) == 3


def test_process_inbox_handler_exception_does_not_crash(
    client: EventStreamClient, tmp_inbox: Path, tmp_processed: Path
) -> None:
    """A handler that raises should not prevent other handlers from running."""
    client.inbox_dir = tmp_inbox
    client.processed_dir = tmp_processed

    call_count = [0]

    def bad_handler(msg: Dict[str, Any]) -> None:
        raise RuntimeError("intentional error")

    def good_handler(msg: Dict[str, Any]) -> None:
        call_count[0] += 1

    client.subscribe("project.completed", bad_handler)
    client.subscribe("project.completed", good_handler)

    _write_message(
        tmp_inbox, "msg-003.json", {"id": "msg-003", "type": "project.completed"}
    )

    # Must not raise
    client._process_inbox()

    assert call_count[0] == 1


def test_process_inbox_no_handler_does_not_raise(
    client: EventStreamClient, tmp_inbox: Path, tmp_processed: Path
) -> None:
    """Events with no registered handler should still be processed silently."""
    client.inbox_dir = tmp_inbox
    client.processed_dir = tmp_processed

    _write_message(
        tmp_inbox,
        "msg-004.json",
        {"id": "msg-004", "type": "some.unknown.event"},
    )

    client._process_inbox()  # must not raise
    assert not (tmp_inbox / "msg-004.json").exists()


# ---------------------------------------------------------------------------
# Start / stop tests
# ---------------------------------------------------------------------------


def test_start_polling_creates_daemon_thread(client: EventStreamClient) -> None:
    """start_polling should create a running daemon thread."""
    try:
        client.start_polling(interval_seconds=60)
        assert client.is_running()
        assert client._thread is not None
        assert client._thread.daemon
    finally:
        client.stop()


def test_stop_sets_running_false(client: EventStreamClient) -> None:
    """After stop(), is_running() should return False."""
    client.start_polling(interval_seconds=60)
    client.stop()
    assert not client._running


def test_double_start_is_safe(client: EventStreamClient) -> None:
    """Calling start_polling twice should not raise or create a second thread."""
    try:
        client.start_polling(interval_seconds=60)
        first_thread = client._thread
        client.start_polling(interval_seconds=60)  # second call – should be a no-op
        assert client._thread is first_thread
    finally:
        client.stop()
