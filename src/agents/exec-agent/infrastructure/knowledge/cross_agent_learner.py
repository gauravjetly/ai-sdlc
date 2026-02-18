"""
Cross-Agent Learner

Learns from other agents' experiences and insights.
"""

from typing import Dict, List, Optional
from datetime import datetime
import json

from ...domain.entities.agent_event import AgentEvent, EventType


class CrossAgentLearner:
    """
    Learn from other agents in the mesh.

    Collects insights from BA, Jets, Security, QA, Customer, and other agents
    to improve presentation generation.
    """

    def __init__(self):
        """Initialize the cross-agent learner"""
        self.learnings: List[Dict] = []

    def on_ba_feedback(self, event: AgentEvent) -> None:
        """
        BA Agent learned something about requirements.

        Extract presentation-relevant insights.

        Args:
            event: Event from BA agent
        """
        learning = {
            'source': 'ba',
            'timestamp': event.timestamp.isoformat(),
            'insight_type': 'requirements',
            'details': event.payload,
        }

        # Extract presentation insights
        if 'stakeholder_preferences' in event.payload:
            learning['presentation_insight'] = (
                "Stakeholder prefers specific requirement detail level"
            )

        self.learnings.append(learning)
        print(f"Learned from BA: {learning.get('presentation_insight', 'general')}")

    def on_jets_architecture_insight(self, event: AgentEvent) -> None:
        """
        Jets (Architect) shared architecture insights.

        Args:
            event: Event from Jets agent
        """
        learning = {
            'source': 'jets',
            'timestamp': event.timestamp.isoformat(),
            'insight_type': 'architecture',
            'details': event.payload,
        }

        # Extract diagram preferences
        if 'diagram_style' in event.payload:
            learning['presentation_insight'] = (
                f"Preferred diagram style: {event.payload['diagram_style']}"
            )

        self.learnings.append(learning)
        print(f"Learned from Jets: {learning.get('presentation_insight', 'architecture')}")

    def on_customer_rejection(self, event: AgentEvent) -> None:
        """
        Customer rejected a deliverable - analyze root cause.

        Args:
            event: Customer rejection event
        """
        learning = {
            'source': 'customer',
            'timestamp': event.timestamp.isoformat(),
            'insight_type': 'rejection',
            'details': event.payload,
            'severity': 'high',
        }

        # Analyze rejection reasons
        reasons = event.payload.get('reasons', [])
        if any('unclear' in r.lower() or 'confusing' in r.lower() for r in reasons):
            learning['presentation_insight'] = (
                "Presentations should emphasize clarity and simplicity"
            )

        self.learnings.append(learning)
        print(f"Learned from customer rejection: {len(reasons)} reasons")

    def on_qa_failure(self, event: AgentEvent) -> None:
        """
        QA found issues - update quality expectations.

        Args:
            event: QA failure event
        """
        learning = {
            'source': 'qa',
            'timestamp': event.timestamp.isoformat(),
            'insight_type': 'quality_issue',
            'details': event.payload,
        }

        # Extract quality insights
        failure_types = event.payload.get('failure_types', [])
        if failure_types:
            learning['presentation_insight'] = (
                f"Quality issues in: {', '.join(failure_types)}"
            )

        self.learnings.append(learning)
        print(f"Learned from QA: {len(failure_types)} failure types")

    def on_security_vulnerability(self, event: AgentEvent) -> None:
        """
        Security found vulnerabilities - adjust messaging.

        Args:
            event: Security vulnerability event
        """
        severity = event.payload.get('severity', 'unknown')

        learning = {
            'source': 'security',
            'timestamp': event.timestamp.isoformat(),
            'insight_type': 'security_vulnerability',
            'severity': severity,
            'details': event.payload,
        }

        if severity in ['high', 'critical']:
            learning['presentation_insight'] = (
                "Security slides should emphasize vulnerability remediation"
            )

        self.learnings.append(learning)
        print(f"Learned from Security: {severity} vulnerability")

    def get_insights_for_audience(self, audience_type: str) -> List[Dict]:
        """
        Get learnings relevant to a specific audience.

        Args:
            audience_type: Type of audience (c-suite, tech-lead, etc.)

        Returns:
            List of relevant insights
        """
        # Filter learnings based on audience
        relevant = []

        for learning in self.learnings:
            # All customer feedback is relevant
            if learning['source'] == 'customer':
                relevant.append(learning)

            # BA insights for executive audiences
            elif learning['source'] == 'ba' and audience_type in ['c-suite', 'vp-director']:
                relevant.append(learning)

            # Architecture insights for technical audiences
            elif learning['source'] == 'jets' and audience_type in ['tech-lead', 'project-team']:
                relevant.append(learning)

            # Security for all audiences
            elif learning['source'] == 'security':
                relevant.append(learning)

        return relevant

    def get_pattern_insights(self) -> List[Dict]:
        """
        Extract pattern insights from all learnings.

        Returns:
            List of pattern insights
        """
        patterns = []

        # Count learning sources
        source_counts = {}
        for learning in self.learnings:
            source = learning['source']
            source_counts[source] = source_counts.get(source, 0) + 1

        # Identify trends
        if source_counts.get('customer', 0) > 5:
            patterns.append({
                'pattern': 'high_customer_feedback',
                'insight': 'Customer engagement is high',
                'recommendation': 'Continue current presentation style',
            })

        if source_counts.get('security', 0) > 3:
            patterns.append({
                'pattern': 'frequent_security_issues',
                'insight': 'Security findings are frequent',
                'recommendation': 'Emphasize security posture in all presentations',
            })

        return patterns

    def export_learnings(self) -> Dict:
        """
        Export all learnings for collective memory.

        Returns:
            Dictionary with all learnings
        """
        return {
            'learnings': self.learnings,
            'total_count': len(self.learnings),
            'by_source': self._count_by_source(),
            'by_insight_type': self._count_by_insight_type(),
            'exported_at': datetime.now().isoformat(),
        }

    def _count_by_source(self) -> Dict[str, int]:
        """Count learnings by source agent"""
        counts = {}
        for learning in self.learnings:
            source = learning['source']
            counts[source] = counts.get(source, 0) + 1
        return counts

    def _count_by_insight_type(self) -> Dict[str, int]:
        """Count learnings by insight type"""
        counts = {}
        for learning in self.learnings:
            insight_type = learning['insight_type']
            counts[insight_type] = counts.get(insight_type, 0) + 1
        return counts

    def get_stats(self) -> Dict:
        """Get learner statistics"""
        return {
            'total_learnings': len(self.learnings),
            'by_source': self._count_by_source(),
            'by_insight_type': self._count_by_insight_type(),
            'patterns_detected': len(self.get_pattern_insights()),
        }
