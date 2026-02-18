"""
Security Event Handler

Handles security-related events from the security agent.
"""

import uuid
from typing import Optional

from ...domain.entities.agent_event import AgentEvent, EventType, AgentType
from ...domain.interfaces.event_bus_port import EventBusPort


class SecurityEventHandler:
    """
    Handles security events from the agent mesh.

    Responsibilities:
    - Track vulnerability discoveries
    - Update security posture slides
    - Record security fixes for learning
    """

    def __init__(
        self,
        event_bus: EventBusPort,
    ):
        """
        Initialize the security event handler.

        Args:
            event_bus: Event bus for publishing events
        """
        self.event_bus = event_bus
        self.vulnerabilities_tracked: dict = {}

    def on_vulnerability_found(self, event: AgentEvent) -> None:
        """
        Handle vulnerability discovery.

        Args:
            event: Vulnerability found event
        """
        project_id = event.get_project_id()
        if not project_id:
            print("Warning: Vulnerability event missing project_id")
            return

        # Extract vulnerability details
        vuln_id = event.payload.get('vulnerability_id')
        severity = event.payload.get('severity', 'unknown')
        title = event.payload.get('title', 'Unknown vulnerability')

        print(f"Vulnerability found in {project_id}: {title} ({severity})")

        # Track vulnerability
        if vuln_id:
            self.vulnerabilities_tracked[vuln_id] = {
                'project_id': project_id,
                'severity': severity,
                'title': title,
                'discovered_at': event.timestamp,
                'status': 'open',
            }

        # In full implementation:
        # 1. Find presentations for this project
        # 2. Add/update security slide with vulnerability details
        # 3. Publish presentation updated event

        print(f"Security tracking updated for {project_id}")

    def on_vulnerability_fixed(self, event: AgentEvent) -> None:
        """
        Handle vulnerability fix.

        Args:
            event: Vulnerability fixed event
        """
        project_id = event.get_project_id()
        vuln_id = event.payload.get('vulnerability_id')

        if vuln_id and vuln_id in self.vulnerabilities_tracked:
            self.vulnerabilities_tracked[vuln_id]['status'] = 'fixed'
            self.vulnerabilities_tracked[vuln_id]['fixed_at'] = event.timestamp

            print(f"Vulnerability {vuln_id} marked as fixed")

            # Publish learning event about security fix
            self._publish_learning_insight(
                project_id=project_id,
                insight_type='security_fix',
                details={
                    'vulnerability_id': vuln_id,
                    'time_to_fix': (
                        event.timestamp
                        - self.vulnerabilities_tracked[vuln_id]['discovered_at']
                    ).total_seconds() / 3600,  # hours
                },
            )

    def on_security_scan_completed(self, event: AgentEvent) -> None:
        """
        Handle security scan completion.

        Args:
            event: Security scan completed event
        """
        project_id = event.get_project_id()
        if not project_id:
            return

        # Extract scan results
        scan_results = event.payload.get('results', {})
        vulnerabilities_found = scan_results.get('vulnerabilities_count', 0)
        security_score = scan_results.get('security_score', 0.0)

        print(f"Security scan completed for {project_id}")
        print(f"  Vulnerabilities: {vulnerabilities_found}")
        print(f"  Security score: {security_score:.2f}")

        # In full implementation:
        # 1. Update security posture slides
        # 2. Generate security briefing if issues found
        # 3. Record security metrics for learning

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
                'source': 'security_event_handler',
            },
        )

        self.event_bus.publish(event)
        print(f"Published learning insight: {insight_type}")

    def get_vulnerability_summary(self, project_id: Optional[str] = None) -> dict:
        """
        Get vulnerability summary.

        Args:
            project_id: Optional filter by project

        Returns:
            Dictionary with vulnerability counts and status
        """
        all_vulns = self.vulnerabilities_tracked.values()

        if project_id:
            all_vulns = [v for v in all_vulns if v['project_id'] == project_id]

        open_vulns = [v for v in all_vulns if v['status'] == 'open']
        fixed_vulns = [v for v in all_vulns if v['status'] == 'fixed']

        # Count by severity
        severity_counts = {}
        for vuln in open_vulns:
            severity = vuln['severity']
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        return {
            'total': len(all_vulns),
            'open': len(open_vulns),
            'fixed': len(fixed_vulns),
            'by_severity': severity_counts,
        }
