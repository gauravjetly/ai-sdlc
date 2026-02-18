"""
Event Bus Port - Interface for inter-agent event communication

Defines the contract for publishing and subscribing to events in the agent mesh.
"""

from abc import ABC, abstractmethod
from typing import Callable, Optional, List
from datetime import datetime

from ..entities.agent_event import AgentEvent, EventType


class EventBusPort(ABC):
    """
    Port interface for event bus communication.

    Implementations can use file-based messaging, message queues, or
    other event distribution mechanisms.
    """

    @abstractmethod
    def publish(self, event: AgentEvent) -> None:
        """
        Publish an event to the mesh.

        Args:
            event: The event to publish

        Raises:
            EventPublishError: If publishing fails
        """
        pass

    @abstractmethod
    def subscribe(
        self,
        event_type: EventType,
        handler: Callable[[AgentEvent], None],
    ) -> str:
        """
        Subscribe to an event type.

        Args:
            event_type: The type of event to subscribe to
            handler: Callback function to handle events

        Returns:
            Subscription ID for later unsubscription

        Raises:
            EventSubscribeError: If subscription fails
        """
        pass

    @abstractmethod
    def subscribe_all(
        self,
        handler: Callable[[AgentEvent], None],
    ) -> str:
        """
        Subscribe to all event types.

        Args:
            handler: Callback function to handle events

        Returns:
            Subscription ID for later unsubscription

        Raises:
            EventSubscribeError: If subscription fails
        """
        pass

    @abstractmethod
    def unsubscribe(self, subscription_id: str) -> None:
        """
        Unsubscribe from events.

        Args:
            subscription_id: ID returned from subscribe()

        Raises:
            EventUnsubscribeError: If unsubscription fails
        """
        pass

    @abstractmethod
    def get_event_history(
        self,
        event_type: Optional[EventType] = None,
        since: Optional[datetime] = None,
        limit: Optional[int] = None,
    ) -> List[AgentEvent]:
        """
        Query event history.

        Args:
            event_type: Optional filter by event type
            since: Optional filter events after this time
            limit: Optional maximum number of events to return

        Returns:
            List of events matching the criteria

        Raises:
            EventQueryError: If query fails
        """
        pass

    @abstractmethod
    def get_events_by_correlation(
        self,
        correlation_id: str,
    ) -> List[AgentEvent]:
        """
        Get all events with the same correlation ID.

        Args:
            correlation_id: The correlation ID to search for

        Returns:
            List of correlated events in chronological order

        Raises:
            EventQueryError: If query fails
        """
        pass

    @abstractmethod
    def get_events_for_project(
        self,
        project_id: str,
        since: Optional[datetime] = None,
    ) -> List[AgentEvent]:
        """
        Get all events related to a specific project.

        Args:
            project_id: The project ID to search for
            since: Optional filter events after this time

        Returns:
            List of project events in chronological order

        Raises:
            EventQueryError: If query fails
        """
        pass

    @abstractmethod
    def poll(self, timeout_seconds: float = 0) -> List[AgentEvent]:
        """
        Poll for new events.

        Args:
            timeout_seconds: How long to wait for events (0 = non-blocking)

        Returns:
            List of new events since last poll

        Raises:
            EventPollError: If polling fails
        """
        pass

    @abstractmethod
    def start(self) -> None:
        """
        Start the event bus (begin processing events).

        Raises:
            EventBusError: If start fails
        """
        pass

    @abstractmethod
    def stop(self) -> None:
        """
        Stop the event bus (cleanup and shutdown).

        Raises:
            EventBusError: If stop fails
        """
        pass

    @abstractmethod
    def is_running(self) -> bool:
        """
        Check if the event bus is running.

        Returns:
            True if running, False otherwise
        """
        pass
