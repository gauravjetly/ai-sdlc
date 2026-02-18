#!/usr/bin/env python3
"""
Demo script for Phase 2 Intelligence features

Demonstrates Claude API integration, Mermaid rendering, and PPTX generation.
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from infrastructure.config.config import Config, get_config
from infrastructure.claude.claude_content_synthesizer import ClaudeContentSynthesizer
from infrastructure.mermaid.mermaid_diagram_renderer import MermaidDiagramRenderer
from infrastructure.pptx.pptx_presentation_renderer import PptxPresentationRenderer
from infrastructure.resilience.degradation_manager import DegradationManager
from infrastructure.persistence.file_memory_store import FileMemoryStore

from application.services.presentation_generator import PresentationGenerator

from domain.entities.presentation import PresentationType
from domain.entities.audience_profile import AudienceType


def print_banner(text):
    """Print a banner"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70 + "\n")


def check_system_capabilities():
    """Check and display system capabilities"""
    print_banner("PHASE 2: System Capabilities Check")

    config = get_config()

    print(f"Claude API: {'✅ Available' if config.is_claude_available() else '❌ Not configured (will use template fallback)'}")
    print(f"Deltek Template: {'✅ Found' if config.is_template_available() else '❌ Not found (will use programmatic slides)'}")

    # Check Mermaid
    mermaid_renderer = MermaidDiagramRenderer(config)
    print(f"Mermaid CLI: {'✅ Available' if mermaid_renderer.is_available() else '❌ Not installed (will use placeholder SVG)'}")

    # Check PPTX
    pptx_renderer = PptxPresentationRenderer(config)
    print(f"PPTX Rendering: {'✅ Available' if pptx_renderer.is_available() else '❌ Not available'}")

    print("\nConfiguration:")
    print(f"  Memory Path: {config.memory_base_path}")
    print(f"  Cache LLM: {config.cache_llm_responses}")
    print(f"  Cache Diagrams: {config.cache_diagrams}")
    print(f"  Brand Font: {config.brand_font_family}")
    print(f"  Primary Color: {config.brand_colors.primary}")

    return config


def demonstrate_degradation_manager():
    """Demonstrate graceful degradation"""
    print_banner("PHASE 2: Graceful Degradation System")

    config = get_config()
    manager = DegradationManager(config)

    # Assess current capabilities
    level = manager.assess_capabilities(
        claude_available=config.is_claude_available(),
        mermaid_available=MermaidDiagramRenderer(config).is_available(),
        template_available=config.is_template_available(),
        data_available=True,
    )

    print(f"Current Degradation Level: {level.name} (Level {level.value})")
    print(f"Description: {manager.get_degradation_message(level)}")

    print("\nCapability Decisions:")
    print(f"  Use Claude: {manager.should_use_claude()}")
    print(f"  Use Mermaid: {manager.should_use_mermaid()}")
    print(f"  Use Template: {manager.should_use_template()}")
    print(f"  Can Generate PPTX: {manager.can_generate_pptx()}")

    # Show all degradation levels
    print("\nAll Degradation Levels:")
    from infrastructure.config.config import DegradationLevel
    for deg_level in DegradationLevel:
        print(f"  {deg_level.value}. {deg_level.name}: {manager.get_degradation_message(deg_level)}")


def demonstrate_content_synthesis():
    """Demonstrate Claude content synthesis"""
    print_banner("PHASE 2: Content Synthesis with Claude API")

    config = get_config()
    synthesizer = ClaudeContentSynthesizer(config)

    print(f"Claude Available: {synthesizer.is_available()}")
    print("Generating slide content...")

    # Generate content for an executive summary slide
    content = synthesizer.synthesize_slide_content(
        presentation_type="executive-summary",
        slide_type="executive-summary",
        project_data={
            'id': 'DEMO-001',
            'name': 'AI-SDLC Platform Demo',
            'status': 'active',
            'phases': [
                {'id': 'phase-1', 'status': 'complete'},
                {'id': 'phase-2', 'status': 'in_progress'},
            ],
        },
        audience_context={
            'type': 'c-suite',
            'max_bullets': 5,
            'max_words_per_bullet': 15,
            'interests': ['ROI', 'strategic outcomes'],
        },
    )

    print("\nGenerated Content:")
    print(f"  Headline: {content.get('headline', 'N/A')}")
    print(f"  Bullet Points ({len(content.get('bullet_points', []))}):")
    for i, bullet in enumerate(content.get('bullet_points', [])[:3], 1):
        print(f"    {i}. {bullet}")
    if len(content.get('bullet_points', [])) > 3:
        print(f"    ... and {len(content['bullet_points']) - 3} more")


def demonstrate_mermaid_rendering():
    """Demonstrate Mermaid diagram rendering"""
    print_banner("PHASE 2: Mermaid Diagram Rendering")

    config = get_config()
    renderer = MermaidDiagramRenderer(config)

    print(f"Mermaid Available: {renderer.is_available()}")
    print("Rendering diagram...")

    mermaid_source = """
    graph TD
        A[Start] --> B[Process]
        B --> C{Decision}
        C -->|Yes| D[Success]
        C -->|No| E[Retry]
        E --> B
        D --> F[End]
    """

    svg_data = renderer.render_to_svg(mermaid_source, {})

    if svg_data:
        print(f"\nDiagram rendered: {len(svg_data)} bytes")
        print(f"Format: {'SVG (Mermaid)' if renderer.is_available() else 'SVG (Fallback Placeholder)'}")
    else:
        print("\nFailed to render diagram")


def generate_demo_presentation():
    """Generate a complete demo presentation"""
    print_banner("PHASE 2: Full Presentation Generation")

    # Initialize all components
    config = get_config()
    memory_store = FileMemoryStore()
    content_synthesizer = ClaudeContentSynthesizer(config)
    diagram_renderer = MermaidDiagramRenderer(config)
    presentation_renderer = PptxPresentationRenderer(config)

    # Create generator
    generator = PresentationGenerator(
        memory_store=memory_store,
        content_synthesizer=content_synthesizer,
        diagram_renderer=diagram_renderer,
        presentation_renderer=presentation_renderer,
    )

    print("Generating presentation...")

    # Generate presentation
    project_data = {
        'id': 'DEMO-PHASE2',
        'name': 'Phase 2 Intelligence Demo',
        'status': 'active',
        'phases': [
            {'id': 'foundation', 'status': 'complete'},
            {'id': 'intelligence', 'status': 'complete'},
            {'id': 'learning', 'status': 'planned'},
        ],
    }

    presentation = generator.generate(
        project_id='DEMO-PHASE2',
        presentation_type=PresentationType.EXECUTIVE_SUMMARY,
        audience_type=AudienceType.C_SUITE,
        project_data=project_data,
    )

    print(f"\n✅ Presentation Generated!")
    print(f"  ID: {presentation.id}")
    print(f"  Title: {presentation.title}")
    print(f"  Type: {presentation.type.value}")
    print(f"  Audience: {presentation.audience_profile.name}")
    print(f"  Slides: {len(presentation.slides)}")
    print(f"  Status: {presentation.status.value}")

    # Check if PPTX was created
    pptx_path = Path(config.memory_base_path) / "presentations" / presentation.id / "current.pptx"
    if pptx_path.exists():
        print(f"\n📄 PowerPoint File: {pptx_path}")
        print(f"  Size: {pptx_path.stat().st_size:,} bytes")
    else:
        print(f"\n⚠️ PowerPoint file not created (renderer may not be available)")

    return presentation


def main():
    """Main demo function"""
    print("\n" + "=" * 70)
    print("  EXEC AGENT - PHASE 2 INTELLIGENCE DEMO")
    print("=" * 70)

    try:
        # 1. Check system capabilities
        config = check_system_capabilities()

        # 2. Demonstrate degradation manager
        demonstrate_degradation_manager()

        # 3. Demonstrate content synthesis
        demonstrate_content_synthesis()

        # 4. Demonstrate Mermaid rendering
        demonstrate_mermaid_rendering()

        # 5. Generate full presentation
        presentation = generate_demo_presentation()

        print_banner("Demo Complete")
        print("All Phase 2 features demonstrated successfully!")
        print("\nNext Steps:")
        print("  - Set ANTHROPIC_API_KEY for Claude integration")
        print("  - Install Mermaid CLI: npm install -g @mermaid-js/mermaid-cli")
        print("  - Place Deltek template in Downloads folder")
        print("  - Run tests: python -m unittest tests.integration.test_phase2_intelligence")

    except Exception as e:
        print(f"\n❌ Error during demo: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
