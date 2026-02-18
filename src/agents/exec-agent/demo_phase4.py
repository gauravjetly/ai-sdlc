#!/usr/bin/env python3
"""
Phase 4 Demo - Agent Mesh Integration

Demonstrates the event-driven agent coordination system for the Exec Agent.
"""

import sys
import os
import time
import uuid
from datetime import datetime

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from domain.entities.agent_event import AgentEvent, EventType, AgentType
from infrastructure.event_bus.file_event_bus import FileEventBus
from application.event_handlers.project_event_handler import ProjectEventHandler
from application.event_handlers.security_event_handler import SecurityEventHandler
from application.event_handlers.feedback_event_handler import FeedbackEventHandler
from application.services.event_orchestrator import EventOrchestrator
from infrastructure.knowledge.knowledge_graph import KnowledgeGraph
from infrastructure.knowledge.cross_agent_learner import CrossAgentLearner


def print_banner(title: str):
    """Print a formatted banner"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def demo_event_publishing():
    """Demo 1: Event Publishing"""
    print_banner("DEMO 1: Event Publishing")

    # Create event bus
    event_bus = FileEventBus(
        events_dir="/tmp/exec-agent-demo/events",
        poll_interval=0.5,
    )

    print("Creating events for the agent mesh...\n")

    # Event 1: Project completed
    event1 = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        target_agents=[AgentType.EXEC, AgentType.TRACKER],
        payload={
            'project_id': 'DEMO-001',
            'project_name': 'AI-SDLC Dashboard',
            'status': 'completed',
            'completion_date': datetime.now().isoformat(),
        },
        correlation_id='workflow-demo-1',
    )

    print(f"Publishing: {event1}")
    event_bus.publish(event1)
    print(f"  ✓ Published to {len(event1.target_agents)} agents\n")

    # Event 2: Architecture updated
    event2 = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.ARCHITECTURE_UPDATED,
        source_agent=AgentType.JETS,
        target_agents=[AgentType.EXEC],
        payload={
            'project_id': 'DEMO-001',
            'architecture_version': '2.0',
            'changes': ['Added caching layer', 'Updated API gateway'],
        },
        correlation_id='workflow-demo-1',
    )

    print(f"Publishing: {event2}")
    event_bus.publish(event2)
    print(f"  ✓ Published\n")

    # Event 3: Security scan completed
    event3 = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.SECURITY_SCAN_COMPLETED,
        source_agent=AgentType.SECURITY,
        target_agents=[],  # Broadcast
        payload={
            'project_id': 'DEMO-001',
            'results': {
                'vulnerabilities_count': 2,
                'security_score': 0.85,
                'scan_date': datetime.now().isoformat(),
            },
        },
    )

    print(f"Publishing: {event3}")
    event_bus.publish(event3)
    print(f"  ✓ Published (broadcast)\n")

    stats = event_bus.get_stats()
    print("Event Bus Statistics:")
    print(f"  Outbox: {stats['outbox_count']} events")
    print(f"  Inbox: {stats['inbox_count']} events")


def demo_event_subscription():
    """Demo 2: Event Subscription and Handling"""
    print_banner("DEMO 2: Event Subscription and Handling")

    # Create event bus
    event_bus = FileEventBus(
        events_dir="/tmp/exec-agent-demo/events",
        poll_interval=0.5,
    )

    # Create handlers
    project_handler = ProjectEventHandler(event_bus)
    security_handler = SecurityEventHandler(event_bus)
    feedback_handler = FeedbackEventHandler(event_bus)

    # Create orchestrator
    orchestrator = EventOrchestrator(
        event_bus=event_bus,
        project_handler=project_handler,
        security_handler=security_handler,
        feedback_handler=feedback_handler,
    )

    print("Starting Event Orchestrator...\n")
    orchestrator.start()
    print(f"  ✓ Subscribed to {len(orchestrator.subscription_ids)} event types\n")

    # Simulate receiving events
    print("Simulating incoming events...\n")

    # Simulate project completed event
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        payload={'project_id': 'DEMO-002'},
    )
    event_bus.publish(event)
    print("  → PROJECT_COMPLETED event published")

    time.sleep(0.5)

    # Simulate vulnerability found
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.VULNERABILITY_FOUND,
        source_agent=AgentType.SECURITY,
        payload={
            'project_id': 'DEMO-002',
            'vulnerability_id': 'VULN-001',
            'severity': 'high',
            'title': 'SQL Injection in API endpoint',
        },
    )
    event_bus.publish(event)
    print("  → VULNERABILITY_FOUND event published")

    time.sleep(0.5)

    # Simulate customer feedback
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.FEEDBACK_RECEIVED,
        source_agent=AgentType.CUSTOMER,
        payload={
            'project_id': 'DEMO-002',
            'presentation_id': 'PRES-001',
            'rating': 4,
            'sentiment': 'positive',
            'comments': 'Clear and concise presentation',
        },
    )
    event_bus.publish(event)
    print("  → FEEDBACK_RECEIVED event published")

    time.sleep(1.0)

    # Check stats
    stats = orchestrator.get_stats()
    print(f"\nOrchestrator Statistics:")
    print(f"  Running: {stats['running']}")
    print(f"  Subscriptions: {stats['subscriptions']}")
    print(f"  Vulnerabilities tracked: {stats['vulnerabilities_tracked']}")
    print(f"  Feedback collected: {stats['feedback_collected']}")

    # Stop orchestrator
    print("\nStopping Event Orchestrator...")
    orchestrator.stop()
    print("  ✓ Stopped")


def demo_knowledge_graph():
    """Demo 3: Knowledge Graph"""
    print_banner("DEMO 3: Knowledge Graph")

    # Create knowledge graph
    kg = KnowledgeGraph(storage_path="/tmp/exec-agent-demo/knowledge")

    print("Building knowledge graph...\n")

    # Add project entity
    kg.add_entity(
        entity_type='project',
        entity_id='DEMO-001',
        attributes={
            'name': 'AI-SDLC Dashboard',
            'status': 'completed',
            'team_size': 5,
        },
    )
    print("  ✓ Added project entity")

    # Add architecture entity
    kg.add_entity(
        entity_type='architecture',
        entity_id='ARCH-001',
        attributes={
            'style': 'microservices',
            'components': 12,
            'version': '2.0',
        },
    )
    print("  ✓ Added architecture entity")

    # Add presentation entity
    kg.add_entity(
        entity_type='presentation',
        entity_id='PRES-001',
        attributes={
            'type': 'executive-summary',
            'slide_count': 8,
            'quality_score': 0.85,
        },
    )
    print("  ✓ Added presentation entity")

    # Add relationships
    kg.add_relationship(
        from_id='project:DEMO-001',
        relation='has_architecture',
        to_id='architecture:ARCH-001',
    )
    print("  ✓ Added relationship: project → architecture")

    kg.add_relationship(
        from_id='presentation:PRES-001',
        relation='generated_for',
        to_id='project:DEMO-001',
    )
    print("  ✓ Added relationship: presentation → project")

    # Query knowledge
    print("\nQuerying knowledge graph...\n")

    # Find all presentations
    presentations = kg.query({'type': 'presentation'})
    print(f"  Presentations: {len(presentations)}")

    # Find relationships
    rels = kg.get_relationships(from_id='project:DEMO-001')
    print(f"  Project relationships: {len(rels)}")
    for rel in rels:
        print(f"    - {rel['relation']} → {rel['to']}")

    # Get stats
    stats = kg.get_stats()
    print(f"\nKnowledge Graph Statistics:")
    print(f"  Total entities: {stats['total_entities']}")
    print(f"  Total relationships: {stats['total_relationships']}")
    print(f"  Entity types: {stats['entity_types']}")


def demo_cross_agent_learning():
    """Demo 4: Cross-Agent Learning"""
    print_banner("DEMO 4: Cross-Agent Learning")

    # Create cross-agent learner
    learner = CrossAgentLearner()

    print("Learning from other agents...\n")

    # BA feedback
    ba_event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.LEARNING_INSIGHT,
        source_agent=AgentType.BA,
        payload={
            'stakeholder_preferences': {
                'detail_level': 'high',
                'format': 'visual',
            },
        },
    )
    learner.on_ba_feedback(ba_event)
    print("  ✓ Learned from BA Agent")

    # Jets architecture insight
    jets_event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.LEARNING_INSIGHT,
        source_agent=AgentType.JETS,
        payload={
            'diagram_style': 'simplified',
            'detail_level': 'overview',
        },
    )
    learner.on_jets_architecture_insight(jets_event)
    print("  ✓ Learned from Jets Agent")

    # Customer rejection
    customer_event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.FEEDBACK_RECEIVED,
        source_agent=AgentType.CUSTOMER,
        payload={
            'status': 'rejected',
            'reasons': ['Unclear requirements', 'Missing key features'],
        },
    )
    learner.on_customer_rejection(customer_event)
    print("  ✓ Learned from Customer rejection")

    # Security vulnerability
    security_event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.VULNERABILITY_FOUND,
        source_agent=AgentType.SECURITY,
        payload={
            'severity': 'high',
            'category': 'injection',
        },
    )
    learner.on_security_vulnerability(security_event)
    print("  ✓ Learned from Security Agent")

    # Get insights
    print("\nExtracted Insights:")

    c_suite_insights = learner.get_insights_for_audience('c-suite')
    print(f"\n  C-Suite audience insights: {len(c_suite_insights)}")
    for insight in c_suite_insights[:2]:
        print(f"    - {insight.get('presentation_insight', insight['insight_type'])}")

    tech_insights = learner.get_insights_for_audience('tech-lead')
    print(f"\n  Tech Lead audience insights: {len(tech_insights)}")
    for insight in tech_insights[:2]:
        print(f"    - {insight.get('presentation_insight', insight['insight_type'])}")

    # Get stats
    stats = learner.get_stats()
    print(f"\nCross-Agent Learner Statistics:")
    print(f"  Total learnings: {stats['total_learnings']}")
    print(f"  By source: {stats['by_source']}")
    print(f"  Patterns detected: {stats['patterns_detected']}")


def demo_full_workflow():
    """Demo 5: Full SDLC Cycle Simulation"""
    print_banner("DEMO 5: Full SDLC Cycle Simulation")

    print("Simulating complete AI-SDLC workflow with Exec Agent coordination...\n")

    # Create components
    event_bus = FileEventBus(
        events_dir="/tmp/exec-agent-demo/workflow",
        poll_interval=0.5,
    )
    kg = KnowledgeGraph(storage_path="/tmp/exec-agent-demo/workflow-knowledge")
    learner = CrossAgentLearner()

    # Create handlers with all components
    project_handler = ProjectEventHandler(event_bus)
    security_handler = SecurityEventHandler(event_bus)
    feedback_handler = FeedbackEventHandler(event_bus)

    orchestrator = EventOrchestrator(
        event_bus=event_bus,
        project_handler=project_handler,
        security_handler=security_handler,
        feedback_handler=feedback_handler,
    )

    # Start orchestrator
    orchestrator.start()

    correlation_id = f"workflow-{uuid.uuid4()}"

    print("Step 1: Project Created")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.PROJECT_CREATED,
        source_agent=AgentType.CONDUCTOR,
        payload={'project_id': 'WORKFLOW-001', 'name': 'Feature Implementation'},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    kg.add_entity('project', 'WORKFLOW-001', {'name': 'Feature Implementation', 'status': 'active'})
    time.sleep(0.3)

    print("Step 2: Architecture Designed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.ARCHITECTURE_DESIGNED,
        source_agent=AgentType.JETS,
        payload={'project_id': 'WORKFLOW-001', 'architecture_id': 'ARCH-W001'},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    kg.add_entity('architecture', 'ARCH-W001', {'style': 'layered'})
    kg.add_relationship('project:WORKFLOW-001', 'has_architecture', 'architecture:ARCH-W001')
    time.sleep(0.3)

    print("Step 3: Code Committed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.CODE_COMMITTED,
        source_agent=AgentType.ENGINEER,
        payload={'project_id': 'WORKFLOW-001', 'commit_count': 15},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    time.sleep(0.3)

    print("Step 4: Security Scan Completed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.SECURITY_SCAN_COMPLETED,
        source_agent=AgentType.SECURITY,
        payload={'project_id': 'WORKFLOW-001', 'results': {'vulnerabilities_count': 0, 'security_score': 0.95}},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    time.sleep(0.3)

    print("Step 5: Tests Completed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.TESTS_COMPLETED,
        source_agent=AgentType.QA,
        payload={'project_id': 'WORKFLOW-001', 'test_coverage': 0.92, 'all_passed': True},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    time.sleep(0.3)

    print("Step 6: Quality Gate Passed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.QUALITY_GATE_PASSED,
        source_agent=AgentType.QA,
        payload={'project_id': 'WORKFLOW-001', 'metrics': {'test_coverage': 0.92, 'code_quality_score': 0.88}},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    time.sleep(0.3)

    print("Step 7: Deployment Completed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.DEPLOYMENT_COMPLETED,
        source_agent=AgentType.ATLAS,
        payload={'project_id': 'WORKFLOW-001', 'environment': 'production'},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    time.sleep(0.3)

    print("Step 8: UAT Completed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.UAT_COMPLETED,
        source_agent=AgentType.CUSTOMER,
        payload={'project_id': 'WORKFLOW-001', 'results': {'status': 'accepted', 'acceptance_rate': 0.95}},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    time.sleep(0.3)

    print("Step 9: Project Completed")
    event = AgentEvent(
        id=str(uuid.uuid4()),
        event_type=EventType.PROJECT_COMPLETED,
        source_agent=AgentType.CONDUCTOR,
        target_agents=[AgentType.EXEC],
        payload={'project_id': 'WORKFLOW-001', 'status': 'completed'},
        correlation_id=correlation_id,
    )
    event_bus.publish(event)
    print("  → Exec Agent would generate executive summary here")
    time.sleep(0.5)

    # Get final stats
    print("\n" + "-" * 80)
    print("Workflow Complete - Final Statistics:")
    print("-" * 80)

    orchestrator_stats = orchestrator.get_stats()
    print(f"\nEvent Orchestrator:")
    print(f"  Events processed: {orchestrator_stats['event_bus_stats'].get('archive_count', 0)}")
    print(f"  Feedback collected: {orchestrator_stats['feedback_collected']}")

    kg_stats = kg.get_stats()
    print(f"\nKnowledge Graph:")
    print(f"  Entities: {kg_stats['total_entities']}")
    print(f"  Relationships: {kg_stats['total_relationships']}")

    # Get correlated events
    correlated_events = event_bus.get_events_by_correlation(correlation_id)
    print(f"\nCorrelated Events: {len(correlated_events)}")
    print(f"  Workflow traced: {correlation_id[:24]}...")

    # Stop orchestrator
    orchestrator.stop()
    print("\n✓ Workflow simulation complete")


def main():
    """Run all demos"""
    print("\n")
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print("║" + "  PHASE 4 DEMO: Agent Mesh Integration & Event-Driven Learning".center(78) + "║")
    print("║" + "  Exec Agent - Executive Presentation Specialist".center(78) + "║")
    print("║" + " " * 78 + "║")
    print("╚" + "═" * 78 + "╝")

    try:
        demo_event_publishing()
        input("\nPress Enter to continue to next demo...")

        demo_event_subscription()
        input("\nPress Enter to continue to next demo...")

        demo_knowledge_graph()
        input("\nPress Enter to continue to next demo...")

        demo_cross_agent_learning()
        input("\nPress Enter to continue to final demo...")

        demo_full_workflow()

        print_banner("ALL DEMOS COMPLETE")
        print("Phase 4 implementation successfully demonstrates:")
        print("  ✓ Event publishing to the agent mesh")
        print("  ✓ Event subscription and handling")
        print("  ✓ Knowledge graph for shared memory")
        print("  ✓ Cross-agent learning")
        print("  ✓ Full SDLC workflow coordination")
        print("\nExec Agent is now fully integrated with the AI-SDLC agent mesh!")

    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        print(f"\n\nError during demo: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
