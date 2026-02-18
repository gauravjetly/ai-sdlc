"""
Project Event Handler

Handles project lifecycle events from other agents.
"""

from typing import Optional
import uuid
from datetime import datetime

from ...domain.entities.agent_event import AgentEvent, EventType, AgentType
from ...domain.entities.presentation import PresentationType
from ...domain.interfaces.event_bus_port import EventBusPort


class ProjectEventHandler:
    """
    Handles project lifecycle events from the agent mesh.

    Responsibilities:
    - Auto-generate executive summary when project completes
    - Update architecture diagrams when architecture changes
    - Refresh status slides when project updates
    """

    def __init__(
        self,
        event_bus: EventBusPort,
        presentation_generator: Optional['PresentationGenerator'] = None,
    ):
        """
        Initialize the project event handler.

        Args:
            event_bus: Event bus for publishing events
            presentation_generator: Optional presentation generator service
        """
        self.event_bus = event_bus
        self.presentation_generator = presentation_generator

    def on_project_completed(self, event: AgentEvent) -> None:
        """
        Handle project completion - generate executive summary.

        Args:
            event: Project completed event
        """
        project_id = event.get_project_id()
        if not project_id:
            print("Warning: Project completed event missing project_id")
            return

        print(f"Project completed: {project_id}")
        print("Triggering executive summary generation...")

        # Generate executive summary presentation
        if self.presentation_generator:
            try:
                presentation_id = self.presentation_generator.generate(
                    project_id=project_id,
                    presentation_type=PresentationType.EXECUTIVE_SUMMARY,
                    auto_mode=True,
                )

                # Publish presentation generated event
                self._publish_presentation_generated(
                    presentation_id=presentation_id,
                    project_id=project_id,
                    correlation_id=event.correlation_id,
                )

            except Exception as e:
                print(f"Error generating executive summary: {e}")
                self._publish_generation_failed(project_id, str(e))

        else:
            print("Note: Presentation generator not configured")

    def on_architecture_updated(self, event: AgentEvent) -> None:
        """
        Handle architecture update - regenerate architecture slides.

        Args:
            event: Architecture updated event
        """
        project_id = event.get_project_id()
        if not project_id:
            print("Warning: Architecture updated event missing project_id")
            return

        print(f"Architecture updated for project: {project_id}")
        print("Finding presentations to update...")

        # Find existing presentations for this project
        # For now, just log the event
        # In a full implementation, we would:
        # 1. Query all presentations for this project
        # 2. Regenerate architecture slides
        # 3. Publish presentation updated events

        print(f"Architecture update recorded for {project_id}")

    def on_project_updated(self, event: AgentEvent) -> None:
        """
        Handle project update - refresh status slides.

        Args:
            event: Project updated event
        """
        project_id = event.get_project_id()
        if not project_id:
            return

        print(f"Project updated: {project_id}")

        # Extract what changed from payload
        changes = event.payload.get('changes', [])
        print(f"Changes: {', '.join(changes) if changes else 'general update'}")

        # Check if this warrants a presentation update
        significant_changes = {'status', 'milestone', 'risk', 'cost'}
        if any(change in significant_changes for change in changes):
            print("Significant changes detected, marking for update")
            # In full implementation: trigger presentation refresh

    def _publish_presentation_generated(
        self,
        presentation_id: str,
        project_id: str,
        correlation_id: Optional[str] = None,
    ) -> None:
        """Publish presentation generated event"""
        event = AgentEvent(
            id=str(uuid.uuid4()),
            event_type=EventType.PRESENTATION_GENERATED,
            source_agent=AgentType.EXEC,
            target_agents=[AgentType.CONDUCTOR, AgentType.TRACKER],
            payload={
                'presentation_id': presentation_id,
                'project_id': project_id,
                'presentation_type': 'executive-summary',
            },
            correlation_id=correlation_id,
        )

        self.event_bus.publish(event)
        print(f"Published presentation.generated event: {presentation_id}")

    def _publish_generation_failed(
        self,
        project_id: str,
        error_message: str,
    ) -> None:
        """Publish generation failure event"""
        event = AgentEvent(
            id=str(uuid.uuid4()),
            event_type=EventType.PRESENTATION_UPDATED,
            source_agent=AgentType.EXEC,
            payload={
                'project_id': project_id,
                'status': 'failed',
                'error': error_message,
            },
        )

        self.event_bus.publish(event)
