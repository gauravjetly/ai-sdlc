"""
EventStreamClient - Polls the agent mesh inbox for events directed to exec agent.

Bridges the file-based agent mesh with the exec agent's domain event system.
Designed for graceful degradation: if the mesh directory does not exist, this
component does nothing and the exec agent continues to function normally.

Architecture: Infrastructure layer only. No domain logic lives here.
"""

import json
import logging
import threading
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class EventStreamPort(ABC):
    """
    Domain port (abstract interface) for event stream integration.

    Placed here for convenience since it is tightly coupled to this
    infrastructure module; the domain layer imports from domain/ports/.
    """

    @abstractmethod
    def subscribe(self, event_type: str, handler: Callable[[Dict[str, Any]], None]) -> None:
        """Subscribe a handler to a specific event type."""
        ...

    @abstractmethod
    def start_polling(self, interval_seconds: int = 15) -> None:
        """Start background polling for new events."""
        ...

    @abstractmethod
    def stop(self) -> None:
        """Stop background polling and release resources."""
        ...


class EventStreamClient(EventStreamPort):
    """
    Polls ~/.claude/agent-mesh/bus/exec/inbox/ every 15 seconds for new events.

    Each file in the inbox is a JSON-encoded AgentMessage from the TypeScript
    mesh. When processed, the file is moved to the processed/ directory so
    it is never delivered twice.

    Failure modes handled:
    - Inbox directory does not exist: polling silently skips, no exception raised.
    - Malformed JSON file: logged as WARNING, file moved to processed/ to avoid
      re-processing loops.
    - Handler raises an exception: logged as ERROR, other handlers still run.
    - Background thread crashes: logged as CRITICAL, client marks itself stopped.
    """

    def __init__(self, agent_id: str = "exec") -> None:
        self.agent_id = agent_id
        self.inbox_dir = Path.home() / ".claude" / "agent-mesh" / "bus" / agent_id / "inbox"
        self.processed_dir = Path.home() / ".claude" / "agent-mesh" / "bus" / agent_id / "processed"
        self._handlers: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}
        self._running: bool = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def subscribe(self, event_type: str, handler: Callable[[Dict[str, Any]], None]) -> None:
        """
        Register a handler for a specific event type.

        The event_type should match the 'type' field of AgentMessage objects
        or the 'event_type' field of AgentEvent payloads (e.g., 'project.completed').
        Use the special value '*' to subscribe to ALL event types.

        Args:
            event_type: Event type string to filter on, or '*' for all events.
            handler: Callable that receives the full parsed message dictionary.
        """
        with self._lock:
            if event_type not in self._handlers:
                self._handlers[event_type] = []
            self._handlers[event_type].append(handler)
        logger.debug("EventStreamClient: subscribed handler for event_type='%s'", event_type)

    def start_polling(self, interval_seconds: int = 15) -> None:
        """
        Start a background daemon thread that polls the inbox every interval_seconds.

        If the mesh directory does not exist the thread still runs but skips
        each poll silently. This preserves V1 behaviour with zero overhead.

        Args:
            interval_seconds: Polling interval in seconds (default 15).
        """
        if self._running:
            logger.warning("EventStreamClient: start_polling called but already running")
            return

        self._running = True
        self._thread = threading.Thread(
            target=self._polling_loop,
            args=(interval_seconds,),
            daemon=True,
            name="exec-agent-event-stream",
        )
        self._thread.start()
        logger.info(
            "EventStreamClient: started polling '%s' every %ds",
            self.inbox_dir,
            interval_seconds,
        )

    def stop(self) -> None:
        """
        Signal the polling thread to stop and wait for it to exit.

        Safe to call even if polling was never started.
        """
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.info("EventStreamClient: stopped")

    def is_running(self) -> bool:
        """Return True if the polling thread is active."""
        return self._running and (self._thread is not None and self._thread.is_alive())

    # ------------------------------------------------------------------
    # Internal polling loop
    # ------------------------------------------------------------------

    def _polling_loop(self, interval_seconds: int) -> None:
        """Background thread: poll inbox at the configured interval."""
        import time

        while self._running:
            try:
                self._process_inbox()
            except Exception as exc:
                # Any unexpected error must not crash the thread
                logger.critical(
                    "EventStreamClient: unexpected error in polling loop: %s",
                    exc,
                    exc_info=True,
                )
            time.sleep(interval_seconds)

    def _process_inbox(self) -> None:
        """
        Read all .json files in the inbox, dispatch events, and move to processed/.

        This method is idempotent: files that cannot be parsed are still moved
        to processed/ to prevent repeated error logs.
        """
        if not self.inbox_dir.exists():
            # Mesh not installed – graceful degradation, nothing to do
            return

        # Ensure processed directory exists before we try to move files there
        self.processed_dir.mkdir(parents=True, exist_ok=True)

        message_files = sorted(self.inbox_dir.glob("*.json"))
        for message_file in message_files:
            self._process_message_file(message_file)

    def _process_message_file(self, message_file: Path) -> None:
        """Parse a single inbox file and dispatch to registered handlers."""
        try:
            raw = message_file.read_text(encoding="utf-8")
            message = json.loads(raw)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning(
                "EventStreamClient: could not parse '%s': %s – moving to processed",
                message_file.name,
                exc,
            )
            self._move_to_processed(message_file)
            return

        self._dispatch(message)
        self._move_to_processed(message_file)

    def _dispatch(self, message: Dict[str, Any]) -> None:
        """
        Deliver a parsed message to all relevant handlers.

        Handlers subscribed to '*' receive every message.
        Handlers subscribed to a specific type receive only matching messages.
        """
        # Determine event type from the message. The mesh wraps domain events
        # inside AgentMessage; we look in 'type' and also inspect nested payload.
        event_type = message.get("type", "")
        content = message.get("content", "")

        # Attempt to decode nested event from content field
        if isinstance(content, str):
            try:
                content_dict = json.loads(content)
                if "event_type" in content_dict:
                    event_type = content_dict.get("event_type", event_type)
                    message["_decoded_content"] = content_dict
            except (json.JSONDecodeError, ValueError):
                pass

        with self._lock:
            handlers_for_type = list(self._handlers.get(event_type, []))
            handlers_wildcard = list(self._handlers.get("*", []))

        all_handlers = handlers_for_type + handlers_wildcard
        if not all_handlers:
            logger.debug(
                "EventStreamClient: no handlers for event_type='%s'", event_type
            )
            return

        for handler in all_handlers:
            try:
                handler(message)
            except Exception as exc:
                logger.error(
                    "EventStreamClient: handler %s raised error for event '%s': %s",
                    getattr(handler, "__name__", repr(handler)),
                    event_type,
                    exc,
                    exc_info=True,
                )

    def _move_to_processed(self, message_file: Path) -> None:
        """Atomically move a processed file out of the inbox."""
        destination = self.processed_dir / message_file.name
        try:
            message_file.rename(destination)
        except OSError as exc:
            # If rename fails (e.g. cross-device), try copy-then-delete
            try:
                import shutil
                shutil.copy2(str(message_file), str(destination))
                message_file.unlink()
            except OSError as copy_exc:
                logger.error(
                    "EventStreamClient: could not move '%s' to processed: %s / %s",
                    message_file.name,
                    exc,
                    copy_exc,
                )
