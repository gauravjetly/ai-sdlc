"""
CLI Commands for Exec Agent

Simple command-line interface for Phase 1.
"""

import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.presentation import PresentationType
from domain.entities.audience_profile import AudienceType
from application.services.presentation_generator import PresentationGenerator
from infrastructure.persistence.file_memory_store import FileMemoryStore


def generate_presentation(project_id: str, pres_type: str = "executive-summary", audience: str = "vp-director"):
    """
    Generate a presentation.

    Args:
        project_id: Project identifier
        pres_type: Presentation type
        audience: Audience type
    """
    print(f"Generating {pres_type} presentation for {audience}...")

    # Initialize infrastructure
    memory_store = FileMemoryStore()

    # Initialize application service
    generator = PresentationGenerator(
        memory_store=memory_store,
    )

    # Map string inputs to enums
    try:
        presentation_type = PresentationType(pres_type)
    except ValueError:
        presentation_type = PresentationType.EXECUTIVE_SUMMARY

    try:
        audience_type = AudienceType(audience)
    except ValueError:
        audience_type = AudienceType.VP_DIRECTOR

    # Sample project data
    project_data = {
        "id": project_id,
        "name": f"Project {project_id}",
        "status": "in_progress",
        "phases": [
            {"name": "Phase 1", "status": "complete"},
            {"name": "Phase 2", "status": "in_progress"},
            {"name": "Phase 3", "status": "pending"},
        ],
    }

    # Generate presentation
    presentation = generator.generate(
        project_id=project_id,
        presentation_type=presentation_type,
        audience_type=audience_type,
        project_data=project_data,
    )

    print(f"Presentation generated successfully!")
    print(f"  ID: {presentation.id}")
    print(f"  Title: {presentation.title}")
    print(f"  Slides: {presentation.get_slide_count()}")
    print(f"  Status: {presentation.status.value}")
    print(f"  Audience: {presentation.audience_profile.name}")

    # Show storage stats
    stats = memory_store.get_storage_stats()
    print(f"\nMemory Store Stats:")
    print(f"  Total Presentations: {stats['presentation_count']}")
    print(f"  Storage Path: {stats['base_path']}")

    return presentation


def list_presentations():
    """List all presentations in memory store"""
    print("Listing presentations...")

    memory_store = FileMemoryStore()
    presentation_ids = memory_store.list_presentations()

    if not presentation_ids:
        print("No presentations found.")
        return

    print(f"Found {len(presentation_ids)} presentations:")
    for pres_id in presentation_ids:
        data = memory_store.load_presentation(pres_id)
        if data:
            print(f"  - {pres_id}")
            print(f"      Project: {data.get('project_id')}")
            print(f"      Type: {data.get('type')}")
            print(f"      Slides: {len(data.get('slides', []))}")


def show_stats():
    """Show memory store statistics"""
    memory_store = FileMemoryStore()
    stats = memory_store.get_storage_stats()

    print("Exec Agent Memory Store Statistics")
    print("=" * 50)
    print(f"Base Path: {stats['base_path']}")
    print(f"Presentations: {stats['presentation_count']}")
    print(f"Audiences: {stats['audience_count']}")
    print(f"Brands: {stats['brand_count']}")
    print(f"Learning Records: {stats['learning_records']}")


def main():
    """Main CLI entry point"""
    if len(sys.argv) < 2:
        print("Exec Agent - Phase 1: Foundation")
        print("\nUsage:")
        print("  python commands.py generate <project_id> [type] [audience]")
        print("  python commands.py list")
        print("  python commands.py stats")
        print("\nPresentation Types:")
        print("  - executive-summary")
        print("  - status-report")
        print("  - architecture-review")
        print("\nAudience Types:")
        print("  - c-suite")
        print("  - vp-director")
        print("  - tech-lead")
        print("  - project-team")
        print("  - external")
        return

    command = sys.argv[1]

    if command == "generate":
        if len(sys.argv) < 3:
            print("Error: project_id required")
            print("Usage: python commands.py generate <project_id> [type] [audience]")
            return

        project_id = sys.argv[2]
        pres_type = sys.argv[3] if len(sys.argv) > 3 else "executive-summary"
        audience = sys.argv[4] if len(sys.argv) > 4 else "vp-director"

        generate_presentation(project_id, pres_type, audience)

    elif command == "list":
        list_presentations()

    elif command == "stats":
        show_stats()

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
