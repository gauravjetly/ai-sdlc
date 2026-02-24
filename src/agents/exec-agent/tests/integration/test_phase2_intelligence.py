"""
Integration test for Phase 2 Intelligence features

Tests the full pipeline with Claude, Mermaid, and PPTX rendering.
"""

import unittest
import sys
from pathlib import Path
from datetime import datetime
import tempfile
import shutil

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.presentation import Presentation, PresentationType, PresentationStatus
from domain.entities.slide import Slide, SlideType, ContentLayout
from domain.entities.audience_profile import AudienceProfile, AudienceType, DetailLevel
from domain.entities.brand_config import BrandConfig

from infrastructure.config.config import Config, DegradationLevel
from infrastructure.claude.claude_content_synthesizer import ClaudeContentSynthesizer
from infrastructure.mermaid.mermaid_diagram_renderer import MermaidDiagramRenderer
from infrastructure.pptx.pptx_presentation_renderer import PptxPresentationRenderer
from infrastructure.resilience.degradation_manager import DegradationManager
from infrastructure.persistence.file_memory_store import FileMemoryStore

from application.services.presentation_generator import PresentationGenerator


class TestPhase2Intelligence(unittest.TestCase):
    """Test Phase 2 intelligence features"""

    def setUp(self):
        """Set up test fixtures"""
        # Create temporary directory for test files
        self.test_dir = tempfile.mkdtemp()
        self.test_config = Config()
        self.test_config.memory_base_path = self.test_dir

    def tearDown(self):
        """Clean up test files"""
        if Path(self.test_dir).exists():
            shutil.rmtree(self.test_dir)

    def test_config_loads_environment(self):
        """Test that config loads from environment"""
        config = Config()

        # Should have default values
        self.assertEqual(config.claude_model, "claude-sonnet-4-5-20250929")
        self.assertEqual(config.claude_max_tokens, 4096)
        self.assertEqual(config.brand_font_family, "Figtree")

        # Should have brand colors
        self.assertIsNotNone(config.brand_colors)
        self.assertEqual(config.brand_colors.primary, "#1742F6")

    def test_config_detects_availability(self):
        """Test availability detection"""
        config = Config()

        # Claude availability depends on API key
        claude_available = config.is_claude_available()
        self.assertIsInstance(claude_available, bool)

        # Template availability depends on file
        template_available = config.is_template_available()
        self.assertIsInstance(template_available, bool)

    def test_claude_synthesizer_initialization(self):
        """Test Claude synthesizer initializes correctly"""
        synthesizer = ClaudeContentSynthesizer(config=self.test_config, cache_dir=self.test_dir)

        # Should report availability based on config
        available = synthesizer.is_available()
        self.assertIsInstance(available, bool)

        # Cache directory should be created
        self.assertTrue(synthesizer.cache_dir.exists())

    def test_claude_synthesizer_fallback(self):
        """Test Claude synthesizer falls back to templates"""
        synthesizer = ClaudeContentSynthesizer(config=self.test_config, cache_dir=self.test_dir)

        # Generate content (will use fallback if Claude not available)
        content = synthesizer.synthesize_slide_content(
            presentation_type="executive-summary",
            slide_type="executive-summary",
            project_data={'id': 'TEST-001', 'name': 'Test Project', 'status': 'active', 'phases': []},
            audience_context={'type': 'c-suite', 'max_bullets': 5, 'max_words_per_bullet': 15, 'interests': ['ROI']},
        )

        # Should return valid content structure
        self.assertIn('headline', content)
        self.assertIn('bullet_points', content)
        self.assertIn('metrics', content)
        self.assertIsInstance(content['bullet_points'], list)

    def test_mermaid_renderer_initialization(self):
        """Test Mermaid renderer initializes correctly"""
        renderer = MermaidDiagramRenderer(config=self.test_config, cache_dir=self.test_dir)

        # Should check availability
        available = renderer.is_available()
        self.assertIsInstance(available, bool)

        # Cache directory should be created
        self.assertTrue(renderer.cache_dir.exists())

    def test_mermaid_renderer_fallback_svg(self):
        """Test Mermaid renderer generates fallback SVG"""
        renderer = MermaidDiagramRenderer(config=self.test_config, cache_dir=self.test_dir)

        mermaid_source = """
        graph TD
            A[Start] --> B[Process]
            B --> C[End]
        """

        # Should return SVG (either from Mermaid or fallback)
        svg_data = renderer.render_to_svg(mermaid_source, {})

        self.assertIsNotNone(svg_data)
        self.assertIsInstance(svg_data, bytes)
        self.assertIn(b'svg', svg_data)

    def test_pptx_renderer_initialization(self):
        """Test PPTX renderer initializes correctly"""
        renderer = PptxPresentationRenderer(config=self.test_config)

        # Should always be available (python-pptx installed)
        self.assertTrue(renderer.is_available())

        # Theme should be initialized
        self.assertIsNotNone(renderer.theme)

    def test_pptx_renderer_creates_presentation(self):
        """Test PPTX renderer creates PowerPoint file"""
        renderer = PptxPresentationRenderer(config=self.test_config)

        # Create test presentation entity
        presentation = Presentation(
            id="test-presentation",
            project_id="TEST-001",
            type=PresentationType.EXECUTIVE_SUMMARY,
            status=PresentationStatus.DRAFT,
            title="Test Presentation",
            audience_profile=AudienceProfile(
                id="c-suite",
                name="C-Suite",
                type=AudienceType.C_SUITE,
                detail_level=DetailLevel.MINIMAL,
            ),
            brand_config=BrandConfig.create_vintiq_brand(),
        )

        # Add a test slide
        slide = Slide(
            id="slide-1",
            type=SlideType.TITLE,
            layout=ContentLayout.TITLE_ONLY,
            title="Test Title",
            order=0,
        )
        slide.set_headline("Test Presentation")
        presentation.add_slide(slide)

        # Render to PPTX
        output_path = Path(self.test_dir) / "test_presentation.pptx"
        success = renderer.render_to_pptx(presentation, str(output_path))

        self.assertTrue(success)
        self.assertTrue(output_path.exists())
        self.assertGreater(output_path.stat().st_size, 0)

    def test_degradation_manager_assesses_capabilities(self):
        """Test degradation manager assesses capabilities correctly"""
        manager = DegradationManager(config=self.test_config, log_dir=self.test_dir)

        # Test full capabilities
        level = manager.assess_capabilities(
            claude_available=True,
            mermaid_available=True,
            template_available=True,
            data_available=True,
        )
        self.assertEqual(level, DegradationLevel.FULL)

        # Test no Claude
        level = manager.assess_capabilities(
            claude_available=False,
            mermaid_available=True,
            template_available=True,
            data_available=True,
        )
        self.assertEqual(level, DegradationLevel.NO_LLM)

        # Test no Mermaid
        level = manager.assess_capabilities(
            claude_available=True,
            mermaid_available=False,
            template_available=True,
            data_available=True,
        )
        self.assertEqual(level, DegradationLevel.NO_DIAGRAMS)

        # Test no template
        level = manager.assess_capabilities(
            claude_available=True,
            mermaid_available=True,
            template_available=False,
            data_available=True,
        )
        self.assertEqual(level, DegradationLevel.NO_TEMPLATE)

        # Test no data
        level = manager.assess_capabilities(
            claude_available=True,
            mermaid_available=True,
            template_available=True,
            data_available=False,
        )
        self.assertEqual(level, DegradationLevel.STALE_DATA)

    def test_degradation_manager_decision_logic(self):
        """Test degradation manager decision logic"""
        manager = DegradationManager(config=self.test_config)

        # Set level to FULL
        manager.current_level = DegradationLevel.FULL
        self.assertTrue(manager.should_use_claude())
        self.assertTrue(manager.should_use_mermaid())
        self.assertTrue(manager.should_use_template())
        self.assertTrue(manager.can_generate_pptx())

        # Set level to NO_LLM
        manager.current_level = DegradationLevel.NO_LLM
        self.assertFalse(manager.should_use_claude())
        self.assertTrue(manager.should_use_mermaid())
        self.assertTrue(manager.should_use_template())
        self.assertTrue(manager.can_generate_pptx())

        # Set level to MINIMAL
        manager.current_level = DegradationLevel.MINIMAL
        self.assertFalse(manager.should_use_claude())
        self.assertFalse(manager.should_use_mermaid())
        self.assertFalse(manager.should_use_template())
        self.assertFalse(manager.can_generate_pptx())

    def test_full_generation_pipeline_with_phase2(self):
        """Test full presentation generation with Phase 2 components"""
        # Initialize all components
        memory_store = FileMemoryStore(base_path=self.test_dir)
        content_synthesizer = ClaudeContentSynthesizer(config=self.test_config, cache_dir=self.test_dir)
        diagram_renderer = MermaidDiagramRenderer(config=self.test_config, cache_dir=self.test_dir)
        presentation_renderer = PptxPresentationRenderer(config=self.test_config)

        # Create generator with all dependencies
        generator = PresentationGenerator(
            memory_store=memory_store,
            content_synthesizer=content_synthesizer,
            diagram_renderer=diagram_renderer,
            presentation_renderer=presentation_renderer,
        )

        # Generate presentation
        project_data = {
            'id': 'TEST-002',
            'name': 'Phase 2 Test Project',
            'status': 'active',
            'phases': [
                {'id': 'phase-1', 'status': 'complete'},
                {'id': 'phase-2', 'status': 'in_progress'},
            ],
        }

        presentation = generator.generate(
            project_id='TEST-002',
            presentation_type=PresentationType.EXECUTIVE_SUMMARY,
            audience_type=AudienceType.C_SUITE,
            project_data=project_data,
        )

        # Verify presentation was created
        self.assertIsNotNone(presentation)
        self.assertEqual(presentation.project_id, 'TEST-002')
        self.assertEqual(presentation.type, PresentationType.EXECUTIVE_SUMMARY)
        self.assertGreater(len(presentation.slides), 0)
        self.assertEqual(presentation.status, PresentationStatus.GENERATED)

        # Verify PPTX was created
        pptx_path = Path(self.test_dir) / "presentations" / presentation.id / "current.pptx"
        if presentation_renderer.is_available():
            self.assertTrue(pptx_path.exists())


if __name__ == '__main__':
    unittest.main()
