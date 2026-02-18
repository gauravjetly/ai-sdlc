"""
File-Based Event Bus Implementation

Implements event messaging using the file system for simplicity and
reliability. Events are stored as JSON files in a shared directory.
"""

import json
import os
import time
import uuid
from pathlib import Path
from typing import Callable, Optional, List, Dict
from datetime import datetime, timedelta
import threading
import fcntl
from glob import glob

from ...domain.interfaces.event_bus_port import EventBusPort
from ...domain.entities.agent_event import AgentEvent, EventType, AgentType


class FileEventBus(EventBusPort):
    """
    File-based event bus using ~/.claude/sdlc-registry/events/

    Features:
    - Atomic writes using temp files
    - Event indexing for fast queries
    - Subscription callbacks
    - Event TTL (30 days retention)
    - Background polling thread
    """

    def __init__(
        self,
        events_dir: Optional[str] = None,
        poll_interval: float = 1.0,
        retention_days: int = 30,
    ):
        """
        Initialize the file event bus.

        Args:
            events_dir: Directory to store events (default: ~/.claude/sdlc-registry/events/)
            poll_interval: How often to poll for new events in seconds
            retention_days: How long to retain events
        """
        if events_dir is None:
            home = str(Path.home())
            events_dir = os.path.join(home, '.claude', 'sdlc-registry', 'events')

        self.events_dir = events_dir
        self.poll_interval = poll_interval
        self.retention_days = retention_days

        # Create directories
        os.makedirs(self.events_dir, exist_ok=True)
        self.inbox_dir = os.path.join(self.events_dir, 'inbox', 'exec')
        self.outbox_dir = os.path.join(self.events_dir, 'outbox', 'exec')
        self.archive_dir = os.path.join(self.events_dir, 'archive')
        os.makedirs(self.inbox_dir, exist_ok=True)
        os.makedirs(self.outbox_dir, exist_ok=True)
        os.makedirs(self.archive_dir, exist_ok=True)

        # Subscription management
        self.subscriptions: Dict[str, tuple[EventType, Callable]] = {}
        self.broadcast_subscriptions: Dict[str, Callable] = {}

        # Polling state
        self.running = False
        self.poll_thread: Optional[threading.Thread] = None
        self.last_poll_time: Optional[datetime] = None

    def publish(self, event: AgentEvent) -> None:
        """
        Publish an event to the mesh.

        Events are written to outbox and copied to target agent inboxes.
        """
        if not event.is_valid():
            raise ValueError(f"Invalid event: {event.validate()}")

        # Create unique filename with timestamp
        timestamp_str = event.timestamp.strftime('%Y%m%d-%H%M%S-%f')
        filename = f"{timestamp_str}-{event.event_type.value}-{event.id}.json"

        # Write to outbox (our record)
        outbox_path = os.path.join(self.outbox_dir, filename)
        self._write_event_atomic(outbox_path, event)

        # Write to target agent inboxes
        if event.is_broadcast():
            # Broadcast to all agents except self
            for agent in AgentType:
                if agent != AgentType.EXEC:
                    self._deliver_to_agent(agent, event, filename)
        else:
            # Deliver to specific agents
            for agent in event.target_agents:
                if agent != AgentType.EXEC:
                    self._deliver_to_agent(agent, event, filename)

    def _deliver_to_agent(
        self,
        agent: AgentType,
        event: AgentEvent,
        filename: str,
    ) -> None:
        """Deliver event to a specific agent's inbox"""
        agent_inbox = os.path.join(
            self.events_dir, 'inbox', agent.value, filename
        )
        os.makedirs(os.path.dirname(agent_inbox), exist_ok=True)
        self._write_event_atomic(agent_inbox, event)

    def _write_event_atomic(self, path: str, event: AgentEvent) -> None:
        """Write event to file atomically (temp file + rename)"""
        temp_path = f"{path}.tmp"
        try:
            with open(temp_path, 'w') as f:
                # Acquire exclusive lock
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                f.write(event.to_json())
                f.flush()
                os.fsync(f.fileno())
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

            # Atomic rename
            os.rename(temp_path, path)
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise RuntimeError(f"Failed to write event: {e}")

    def subscribe(
        self,
        event_type: EventType,
        handler: Callable[[AgentEvent], None],
    ) -> str:
        """Subscribe to a specific event type"""
        subscription_id = str(uuid.uuid4())
        self.subscriptions[subscription_id] = (event_type, handler)
        return subscription_id

    def subscribe_all(
        self,
        handler: Callable[[AgentEvent], None],
    ) -> str:
        """Subscribe to all event types"""
        subscription_id = str(uuid.uuid4())
        self.broadcast_subscriptions[subscription_id] = handler
        return subscription_id

    def unsubscribe(self, subscription_id: str) -> None:
        """Unsubscribe from events"""
        if subscription_id in self.subscriptions:
            del self.subscriptions[subscription_id]
        elif subscription_id in self.broadcast_subscriptions:
            del self.broadcast_subscriptions[subscription_id]

    def get_event_history(
        self,
        event_type: Optional[EventType] = None,
        since: Optional[datetime] = None,
        limit: Optional[int] = None,
    ) -> List[AgentEvent]:
        """Query event history from outbox"""
        events = []

        # Read all events from outbox
        pattern = os.path.join(self.outbox_dir, '*.json')
        for filepath in sorted(glob(pattern)):
            try:
                event = self._read_event_file(filepath)

                # Apply filters
                if event_type and event.event_type != event_type:
                    continue
                if since and event.timestamp < since:
                    continue

                events.append(event)

                # Check limit
                if limit and len(events) >= limit:
                    break

            except Exception as e:
                # Skip corrupted events
                print(f"Warning: Failed to read event {filepath}: {e}")
                continue

        return events

    def get_events_by_correlation(
        self,
        correlation_id: str,
    ) -> List[AgentEvent]:
        """Get all events with the same correlation ID"""
        events = []

        pattern = os.path.join(self.outbox_dir, '*.json')
        for filepath in sorted(glob(pattern)):
            try:
                event = self._read_event_file(filepath)
                if event.correlation_id == correlation_id:
                    events.append(event)
            except Exception:
                continue

        return events

    def get_events_for_project(
        self,
        project_id: str,
        since: Optional[datetime] = None,
    ) -> List[AgentEvent]:
        """Get all events related to a specific project"""
        events = []

        pattern = os.path.join(self.outbox_dir, '*.json')
        for filepath in sorted(glob(pattern)):
            try:
                event = self._read_event_file(filepath)

                # Check if event is for this project
                if event.get_project_id() != project_id:
                    continue

                # Apply time filter
                if since and event.timestamp < since:
                    continue

                events.append(event)

            except Exception:
                continue

        return events

    def poll(self, timeout_seconds: float = 0) -> List[AgentEvent]:
        """Poll for new events in inbox"""
        events = []
        start_time = time.time()

        while True:
            # Read all events from inbox
            pattern = os.path.join(self.inbox_dir, '*.json')
            filepaths = glob(pattern)

            for filepath in filepaths:
                try:
                    event = self._read_event_file(filepath)
                    events.append(event)

                    # Archive the event (move to archive)
                    self._archive_event(filepath, event)

                except Exception as e:
                    print(f"Warning: Failed to process event {filepath}: {e}")
                    continue

            # Update last poll time
            self.last_poll_time = datetime.now()

            # If we found events or timeout reached, return
            if events or time.time() - start_time >= timeout_seconds:
                break

            # Sleep before next poll
            time.sleep(0.1)

        return events

    def _read_event_file(self, filepath: str) -> AgentEvent:
        """Read event from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
            return AgentEvent.from_dict(data)

    def _archive_event(self, filepath: str, event: AgentEvent) -> None:
        """Move processed event to archive"""
        filename = os.path.basename(filepath)
        archive_path = os.path.join(self.archive_dir, filename)

        try:
            os.rename(filepath, archive_path)
        except Exception as e:
            # If archive fails, just delete to avoid reprocessing
            print(f"Warning: Failed to archive event, deleting: {e}")
            os.remove(filepath)

    def start(self) -> None:
        """Start background polling thread"""
        if self.running:
            return

        self.running = True
        self.poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.poll_thread.start()

    def stop(self) -> None:
        """Stop background polling"""
        self.running = False
        if self.poll_thread:
            self.poll_thread.join(timeout=5.0)

    def is_running(self) -> bool:
        """Check if event bus is running"""
        return self.running

    def _poll_loop(self) -> None:
        """Background polling loop"""
        while self.running:
            try:
                # Poll for new events
                events = self.poll(timeout_seconds=0)

                # Dispatch to subscribers
                for event in events:
                    self._dispatch_event(event)

                # Cleanup old events
                self._cleanup_old_events()

            except Exception as e:
                print(f"Error in poll loop: {e}")

            # Sleep until next poll
            time.sleep(self.poll_interval)

    def _dispatch_event(self, event: AgentEvent) -> None:
        """Dispatch event to registered handlers"""

        # Dispatch to broadcast subscribers
        for handler in self.broadcast_subscriptions.values():
            try:
                handler(event)
            except Exception as e:
                print(f"Error in broadcast handler: {e}")

        # Dispatch to type-specific subscribers
        for subscription_id, (event_type, handler) in self.subscriptions.items():
            if event.event_type == event_type:
                try:
                    handler(event)
                except Exception as e:
                    print(f"Error in handler for {event_type}: {e}")

    def _cleanup_old_events(self) -> None:
        """Remove events older than retention period"""
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)

        # Clean archive
        pattern = os.path.join(self.archive_dir, '*.json')
        for filepath in glob(pattern):
            try:
                # Parse timestamp from filename
                filename = os.path.basename(filepath)
                timestamp_str = filename.split('-')[0]  # YYYYMMDD
                event_date = datetime.strptime(timestamp_str, '%Y%m%d')

                if event_date < cutoff_date:
                    os.remove(filepath)

            except Exception:
                # Skip files with invalid names
                continue

    def get_stats(self) -> Dict[str, int]:
        """Get event bus statistics"""
        return {
            'inbox_count': len(glob(os.path.join(self.inbox_dir, '*.json'))),
            'outbox_count': len(glob(os.path.join(self.outbox_dir, '*.json'))),
            'archive_count': len(glob(os.path.join(self.archive_dir, '*.json'))),
            'subscriptions': len(self.subscriptions),
            'broadcast_subscriptions': len(self.broadcast_subscriptions),
        }
