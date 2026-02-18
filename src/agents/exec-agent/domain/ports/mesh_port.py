"""
Mesh Port Interfaces - Domain layer contracts for agent mesh integration.

These abstract base classes (ports) define what the domain layer needs from
the agent mesh.  Infrastructure layer (CollectiveMemoryReader, EventStreamClient,
LearningEventEmitter) implements these ports.

No external dependencies are imported here – this is pure domain code.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List


class EventStreamPort(ABC):
    """
    Port for receiving events from the agent mesh.

    Domain contract: the domain does not care whether events come from a
    file-based inbox, a message queue, or any other transport.
    """

    @abstractmethod
    def subscribe(
        self,
        event_type: str,
        handler: Callable[[Dict[str, Any]], None],
    ) -> None:
        """
        Register a callback to be invoked when an event of the given type arrives.

        Args:
            event_type: Event type string to filter on, or '*' for all events.
            handler: Callable receiving the full parsed message dictionary.
        """
        ...

    @abstractmethod
    def start_polling(self, interval: int = 15) -> None:
        """
        Start background polling / listening for events.

        Args:
            interval: Polling interval in seconds for file-based implementations.
        """
        ...

    @abstractmethod
    def stop(self) -> None:
        """Stop listening and release any background resources."""
        ...


class CollectiveMemoryPort(ABC):
    """
    Port for reading shared cross-agent knowledge from collective memory.

    Domain contract: the domain queries insights without knowing where they
    are stored (file, database, or any other store).
    """

    @abstractmethod
    def get_insights_for_slide_type(self, slide_type: str) -> List[str]:
        """
        Return a list of insight strings relevant to the given slide type.

        Args:
            slide_type: A SlideType value string, e.g. 'SECURITY_POSTURE'.

        Returns:
            List of human-readable insight strings, empty when none available.
        """
        ...

    @abstractmethod
    def get_knowledge_summary(self) -> Dict[str, Any]:
        """
        Return a summary of available collective knowledge.

        Returns:
            Dictionary with keys: available (bool), total_items (int),
            by_category (dict), high_confidence_items (int).
        """
        ...


class LearningEmitterPort(ABC):
    """
    Port for emitting learning events to the agent mesh.

    Domain contract: the domain publishes insights without knowing how they
    reach other agents (file write, HTTP, shell script, etc.).
    """

    @abstractmethod
    def emit_learning(
        self,
        insight: str,
        metadata: Dict[str, Any],
        category: str = "cross-agent-learning",
    ) -> None:
        """
        Broadcast a learning insight to all interested mesh agents.

        Args:
            insight: Human-readable insight description.
            metadata: Structured data accompanying the insight.
            category: Knowledge category for routing/filtering.
        """
        ...

    @abstractmethod
    def emit_presentation_created(
        self,
        presentation_id: str,
        presentation_type: str,
        project_id: str,
    ) -> None:
        """
        Notify the mesh that a presentation was successfully created.

        Args:
            presentation_id: Unique identifier for the presentation.
            presentation_type: Type of presentation generated.
            project_id: SDLC project this presentation belongs to.
        """
        ...
