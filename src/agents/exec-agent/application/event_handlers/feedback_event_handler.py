"""
Feedback Event Handler

Handles feedback from other agents and customers.
"""

import uuid
from typing import Optional

from ...domain.entities.agent_event import AgentEvent, EventType, AgentType
from ...domain.entities.feedback import Feedback, SignalType
from ...domain.interfaces.event_bus_port import EventBusPort
from ...domain.interfaces.learning_engine_port import LearningEnginePort


class FeedbackEventHandler:
    """
    Handles feedback events for cross-agent learning.

    Responsibilities:
    - Collect customer UAT feedback
    - Process quality gate signals
    - Learn from stakeholder responses
    - Update learning model
    """

    def __init__(
        self,
        event_bus: EventBusPort,
        learning_engine: Optional[LearningEnginePort] = None,
    ):
        """
        Initialize the feedback event handler.

        Args:
            event_bus: Event bus for publishing events
            learning_engine: Optional learning engine for processing feedback
        """
        self.event_bus = event_bus
        self.learning_engine = learning_engine
        self.feedback_collected: list = []

    def on_customer_feedback(self, event: AgentEvent) -> None:
        """
        Handle customer feedback.

        Args:
            event: Customer feedback received event
        """
        project_id = event.get_project_id()
        presentation_id = event.get_presentation_id()

        if not presentation_id:
            print("Note: Customer feedback not specific to presentation")
            return

        print(f"Customer feedback received for presentation: {presentation_id}")

        # Extract feedback details
        rating = event.payload.get('rating')
        comments = event.payload.get('comments', '')
        sentiment = event.payload.get('sentiment', 'neutral')

        # Create feedback entity
        feedback = Feedback(
            presentation_id=presentation_id,
        )

        # Add rating signal if present
        if rating is not None:
            normalized_rating = rating / 5.0  # Assume 1-5 scale
            feedback.add_signal(
                signal_type=SignalType.EXPLICIT_RATING,
                value=normalized_rating,
            )

        # Store feedback
        self.feedback_collected.append({
            'presentation_id': presentation_id,
            'project_id': project_id,
            'rating': rating,
            'comments': comments,
            'sentiment': sentiment,
            'timestamp': event.timestamp,
        })

        # Process with learning engine
        if self.learning_engine:
            try:
                # In full implementation: pass feedback to learning engine
                print(f"Feedback recorded with score: {feedback.get_overall_score():.3f}")
            except Exception as e:
                print(f"Error processing feedback: {e}")

        print(f"Customer feedback processed for {presentation_id}")

    def on_uat_completed(self, event: AgentEvent) -> None:
        """
        Handle UAT completion.

        Args:
            event: UAT completed event
        """
        project_id = event.get_project_id()
        if not project_id:
            return

        # Extract UAT results
        uat_results = event.payload.get('results', {})
        status = uat_results.get('status', 'unknown')
        acceptance_rate = uat_results.get('acceptance_rate', 0.0)

        print(f"UAT completed for {project_id}")
        print(f"  Status: {status}")
        print(f"  Acceptance rate: {acceptance_rate:.1%}")

        # High acceptance rate = positive signal for our presentations
        if acceptance_rate >= 0.80:
            self._publish_learning_insight(
                project_id=project_id,
                insight_type='high_uat_acceptance',
                details={
                    'acceptance_rate': acceptance_rate,
                    'status': status,
                },
            )

    def on_quality_gate_passed(self, event: AgentEvent) -> None:
        """
        Handle quality gate pass - positive signal.

        Args:
            event: Quality gate passed event
        """
        project_id = event.get_project_id()
        if not project_id:
            return

        # Extract quality metrics
        quality_metrics = event.payload.get('metrics', {})
        test_coverage = quality_metrics.get('test_coverage', 0.0)
        code_quality = quality_metrics.get('code_quality_score', 0.0)

        print(f"Quality gate passed for {project_id}")
        print(f"  Test coverage: {test_coverage:.1%}")
        print(f"  Code quality: {code_quality:.2f}")

        # High quality = presentations can emphasize quality achievements
        if test_coverage >= 0.80 and code_quality >= 0.75:
            self._publish_learning_insight(
                project_id=project_id,
                insight_type='high_quality_metrics',
                details={
                    'test_coverage': test_coverage,
                    'code_quality': code_quality,
                },
            )

    def on_tests_failed(self, event: AgentEvent) -> None:
        """
        Handle test failures - negative signal.

        Args:
            event: Tests failed event
        """
        project_id = event.get_project_id()
        if not project_id:
            return

        # Extract failure details
        failures = event.payload.get('failures', {})
        failure_count = failures.get('count', 0)
        failure_rate = failures.get('rate', 0.0)

        print(f"Tests failed for {project_id}")
        print(f"  Failure count: {failure_count}")
        print(f"  Failure rate: {failure_rate:.1%}")

        # High failure rate = caution in status presentations
        if failure_rate >= 0.20:
            print("Note: High test failure rate - presentations should reflect risk")

    def _publish_learning_insight(
        self,
        project_id: str,
        insight_type: str,
        details: dict,
    ) -> None:
        """Publish a learning insight event"""
        event = AgentEvent(
            id=str(uuid.uuid4()),
            event_type=EventType.LEARNING_INSIGHT,
            source_agent=AgentType.EXEC,
            target_agents=[],  # Broadcast
            payload={
                'project_id': project_id,
                'insight_type': insight_type,
                'details': details,
                'source': 'feedback_event_handler',
            },
        )

        self.event_bus.publish(event)
        print(f"Published learning insight: {insight_type}")

    def get_feedback_summary(
        self,
        project_id: Optional[str] = None,
        presentation_id: Optional[str] = None,
    ) -> dict:
        """
        Get feedback summary.

        Args:
            project_id: Optional filter by project
            presentation_id: Optional filter by presentation

        Returns:
            Dictionary with feedback statistics
        """
        feedback = self.feedback_collected

        if project_id:
            feedback = [f for f in feedback if f['project_id'] == project_id]
        if presentation_id:
            feedback = [f for f in feedback if f['presentation_id'] == presentation_id]

        if not feedback:
            return {
                'total': 0,
                'average_rating': 0.0,
                'sentiment': {},
            }

        ratings = [f['rating'] for f in feedback if f['rating'] is not None]
        sentiments = [f['sentiment'] for f in feedback]

        sentiment_counts = {}
        for sentiment in sentiments:
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1

        return {
            'total': len(feedback),
            'average_rating': sum(ratings) / len(ratings) if ratings else 0.0,
            'sentiment': sentiment_counts,
        }
