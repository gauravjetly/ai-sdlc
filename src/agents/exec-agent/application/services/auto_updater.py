"""
Auto-Updater Service

Automatically updates presentations when source data changes.
"""

import uuid
from typing import Optional
from datetime import datetime

from ...domain.entities.agent_event import AgentEvent, EventType, AgentType
from ...domain.entities.presentation import PresentationType
from ...domain.interfaces.event_bus_port import EventBusPort
from ...domain.interfaces.memory_store_port import MemoryStorePort


class AutoUpdater:
    """
    Monitors for changes and triggers presentation updates.

    Responsibilities:
    - Regenerate presentations when source data changes
    - Identify what changed (architecture, status, security)
    - Preserve manual edits where possible
    - Version updates appropriately
    """

    def __init__(
        self,
        memory_store: MemoryStorePort,
        event_bus: EventBusPort,
        presentation_generator: Optional['PresentationGenerator'] = None,
    ):
        """
        Initialize the auto-updater.

        Args:
            memory_store: Memory store for presentation data
            event_bus: Event bus for publishing events
            presentation_generator: Optional presentation generator service
        """
        self.memory_store = memory_store
        self.event_bus = event_bus
        self.presentation_generator = presentation_generator

    def update_presentation(
        self,
        presentation_id: str,
        trigger_event: AgentEvent,
    ) -> Optional[str]:
        """
        Regenerate presentation based on new data.

        Args:
            presentation_id: The presentation to update
            trigger_event: The event that triggered the update

        Returns:
            New presentation ID if updated, None if failed
        """
        print(f"Auto-updating presentation {presentation_id}")
        print(f"  Triggered by: {trigger_event.event_type.value}")

        # Load existing presentation
        presentation_data = self.memory_store.load_presentation(presentation_id)
        if not presentation_data:
            print(f"Warning: Presentation {presentation_id} not found")
            return None

        # Identify what changed
        changes = self._identify_changes(trigger_event)
        print(f"  Changes detected: {', '.join(changes)}")

        # Regenerate affected slides only
        # For now, we regenerate the entire presentation
        # In full implementation: selective slide regeneration

        if self.presentation_generator:
            try:
                # Generate updated version
                project_id = presentation_data.get('project_id')
                presentation_type = PresentationType(presentation_data.get('type'))

                new_presentation_id = self.presentation_generator.generate(
                    project_id=project_id,
                    presentation_type=presentation_type,
                    auto_mode=True,
                    parent_presentation_id=presentation_id,
                )

                # Publish update event
                self._publish_update_event(
                    original_id=presentation_id,
                    updated_id=new_presentation_id,
                    changes=changes,
                    trigger_event=trigger_event,
                )

                print(f"  Updated presentation: {new_presentation_id}")
                return new_presentation_id

            except Exception as e:
                print(f"Error updating presentation: {e}")
                return None

        return None

    def _identify_changes(self, event: AgentEvent) -> list:
        """
        Identify what changed based on the event.

        Args:
            event: The trigger event

        Returns:
            List of change types
        """
        changes = []

        if event.event_type in [
            EventType.ARCHITECTURE_UPDATED,
            EventType.ADR_CREATED,
        ]:
            changes.append('architecture')

        if event.event_type in [
            EventType.PROJECT_UPDATED,
            EventType.BUILD_COMPLETED,
        ]:
            changes.append('status')

        if event.event_type in [
            EventType.SECURITY_SCAN_COMPLETED,
            EventType.VULNERABILITY_FOUND,
            EventType.VULNERABILITY_FIXED,
        ]:
            changes.append('security')

        if event.event_type in [
            EventType.TESTS_COMPLETED,
            EventType.TESTS_FAILED,
            EventType.QUALITY_GATE_PASSED,
        ]:
            changes.append('quality')

        if event.event_type in [
            EventType.DEPLOYMENT_COMPLETED,
            EventType.DEPLOYMENT_FAILED,
        ]:
            changes.append('deployment')

        return changes

    def _publish_update_event(
        self,
        original_id: str,
        updated_id: str,
        changes: list,
        trigger_event: AgentEvent,
    ) -> None:
        """Publish presentation updated event"""
        event = AgentEvent(
            id=str(uuid.uuid4()),
            event_type=EventType.PRESENTATION_UPDATED,
            source_agent=AgentType.EXEC,
            target_agents=[AgentType.CONDUCTOR, AgentType.TRACKER],
            payload={
                'original_presentation_id': original_id,
                'updated_presentation_id': updated_id,
                'changes': changes,
                'trigger': trigger_event.event_type.value,
            },
            correlation_id=trigger_event.correlation_id,
        )

        self.event_bus.publish(event)
        print(f"Published presentation.updated event")

    def enable_auto_update(
        self,
        presentation_id: str,
        update_on_events: Optional[list] = None,
    ) -> None:
        """
        Enable auto-update for a presentation.

        Args:
            presentation_id: The presentation to enable auto-update for
            update_on_events: Optional list of event types to trigger updates
        """
        if update_on_events is None:
            update_on_events = [
                EventType.ARCHITECTURE_UPDATED.value,
                EventType.PROJECT_UPDATED.value,
                EventType.SECURITY_SCAN_COMPLETED.value,
            ]

        # Store auto-update configuration
        config = {
            'enabled': True,
            'presentation_id': presentation_id,
            'update_on_events': update_on_events,
            'enabled_at': datetime.now().isoformat(),
        }

        self.memory_store.write_json(
            f'auto-update/{presentation_id}.json',
            config,
        )

        print(f"Auto-update enabled for {presentation_id}")

    def disable_auto_update(self, presentation_id: str) -> None:
        """
        Disable auto-update for a presentation.

        Args:
            presentation_id: The presentation to disable auto-update for
        """
        config = self.memory_store.read_json(
            f'auto-update/{presentation_id}.json'
        )

        if config:
            config['enabled'] = False
            config['disabled_at'] = datetime.now().isoformat()

            self.memory_store.write_json(
                f'auto-update/{presentation_id}.json',
                config,
            )

            print(f"Auto-update disabled for {presentation_id}")

    def is_auto_update_enabled(self, presentation_id: str) -> bool:
        """
        Check if auto-update is enabled for a presentation.

        Args:
            presentation_id: The presentation to check

        Returns:
            True if auto-update is enabled
        """
        config = self.memory_store.read_json(
            f'auto-update/{presentation_id}.json'
        )

        return config and config.get('enabled', False)
