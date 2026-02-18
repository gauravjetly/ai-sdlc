"""
Event Orchestrator

Coordinates all event subscriptions and handlers for the Exec Agent.
"""

from typing import Optional

from ...domain.interfaces.event_bus_port import EventBusPort
from ...domain.entities.agent_event import EventType
from ..event_handlers.project_event_handler import ProjectEventHandler
from ..event_handlers.security_event_handler import SecurityEventHandler
from ..event_handlers.feedback_event_handler import FeedbackEventHandler


class EventOrchestrator:
    """
    Central coordinator for event handling.

    Manages all event subscriptions and routes events to appropriate handlers.
    """

    def __init__(
        self,
        event_bus: EventBusPort,
        project_handler: ProjectEventHandler,
        security_handler: SecurityEventHandler,
        feedback_handler: FeedbackEventHandler,
    ):
        """
        Initialize the event orchestrator.

        Args:
            event_bus: Event bus for subscriptions
            project_handler: Handler for project events
            security_handler: Handler for security events
            feedback_handler: Handler for feedback events
        """
        self.event_bus = event_bus
        self.project_handler = project_handler
        self.security_handler = security_handler
        self.feedback_handler = feedback_handler

        # Track subscription IDs
        self.subscription_ids: list = []

    def start(self) -> None:
        """
        Subscribe to all relevant events and start event processing.
        """
        print("Starting Event Orchestrator...")

        # Subscribe to project events
        sub_id = self.event_bus.subscribe(
            EventType.PROJECT_COMPLETED,
            self.project_handler.on_project_completed,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.PROJECT_COMPLETED.value}")

        sub_id = self.event_bus.subscribe(
            EventType.PROJECT_UPDATED,
            self.project_handler.on_project_updated,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.PROJECT_UPDATED.value}")

        sub_id = self.event_bus.subscribe(
            EventType.ARCHITECTURE_UPDATED,
            self.project_handler.on_architecture_updated,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.ARCHITECTURE_UPDATED.value}")

        # Subscribe to security events
        sub_id = self.event_bus.subscribe(
            EventType.SECURITY_SCAN_COMPLETED,
            self.security_handler.on_security_scan_completed,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.SECURITY_SCAN_COMPLETED.value}")

        sub_id = self.event_bus.subscribe(
            EventType.VULNERABILITY_FOUND,
            self.security_handler.on_vulnerability_found,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.VULNERABILITY_FOUND.value}")

        sub_id = self.event_bus.subscribe(
            EventType.VULNERABILITY_FIXED,
            self.security_handler.on_vulnerability_fixed,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.VULNERABILITY_FIXED.value}")

        # Subscribe to feedback events
        sub_id = self.event_bus.subscribe(
            EventType.UAT_COMPLETED,
            self.feedback_handler.on_uat_completed,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.UAT_COMPLETED.value}")

        sub_id = self.event_bus.subscribe(
            EventType.FEEDBACK_RECEIVED,
            self.feedback_handler.on_customer_feedback,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.FEEDBACK_RECEIVED.value}")

        sub_id = self.event_bus.subscribe(
            EventType.QUALITY_GATE_PASSED,
            self.feedback_handler.on_quality_gate_passed,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.QUALITY_GATE_PASSED.value}")

        sub_id = self.event_bus.subscribe(
            EventType.TESTS_FAILED,
            self.feedback_handler.on_tests_failed,
        )
        self.subscription_ids.append(sub_id)
        print(f"  Subscribed to {EventType.TESTS_FAILED.value}")

        # Start the event bus
        self.event_bus.start()
        print(f"Event Orchestrator started with {len(self.subscription_ids)} subscriptions")

    def stop(self) -> None:
        """
        Unsubscribe from all events and stop event processing.
        """
        print("Stopping Event Orchestrator...")

        # Unsubscribe from all events
        for sub_id in self.subscription_ids:
            try:
                self.event_bus.unsubscribe(sub_id)
            except Exception as e:
                print(f"Warning: Failed to unsubscribe {sub_id}: {e}")

        self.subscription_ids.clear()

        # Stop the event bus
        self.event_bus.stop()
        print("Event Orchestrator stopped")

    def is_running(self) -> bool:
        """
        Check if the orchestrator is running.

        Returns:
            True if event bus is running and subscriptions are active
        """
        return self.event_bus.is_running() and len(self.subscription_ids) > 0

    def get_stats(self) -> dict:
        """
        Get orchestrator statistics.

        Returns:
            Dictionary with subscription and handler statistics
        """
        return {
            'running': self.is_running(),
            'subscriptions': len(self.subscription_ids),
            'event_bus_stats': self.event_bus.get_stats() if hasattr(self.event_bus, 'get_stats') else {},
            'vulnerabilities_tracked': len(self.security_handler.vulnerabilities_tracked),
            'feedback_collected': len(self.feedback_handler.feedback_collected),
        }
