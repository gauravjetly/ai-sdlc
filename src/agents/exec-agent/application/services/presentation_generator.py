"""
Presentation Generator - Application service for generating presentations

Orchestrates the presentation generation pipeline using dependency injection.
"""

from typing import Dict, Any, List
from datetime import datetime
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.presentation import Presentation, PresentationType, PresentationStatus
from domain.entities.slide import Slide, SlideType, ContentLayout
from domain.entities.audience_profile import AudienceProfile, AudienceType, DetailLevel
from domain.entities.brand_config import BrandConfig
from domain.interfaces.content_synthesizer_port import ContentSynthesizerPort
from domain.interfaces.memory_store_port import MemoryStorePort
from domain.value_objects.quality_score import QualityScore


class PresentationGenerator:
    """
    Application service for generating presentations.

    Uses dependency injection to remain testable and follow clean architecture.
    """

    def __init__(
        self,
        memory_store: MemoryStorePort,
        content_synthesizer: ContentSynthesizerPort = None,
        diagram_renderer: 'DiagramRendererPort' = None,
        presentation_renderer: 'PresentationRendererPort' = None,
    ):
        """
        Initialize presentation generator.

        Args:
            memory_store: Memory store implementation
            content_synthesizer: Optional content synthesizer (Phase 2)
            diagram_renderer: Optional diagram renderer (Phase 2)
            presentation_renderer: Optional PPTX renderer (Phase 2)
        """
        self.memory_store = memory_store
        self.content_synthesizer = content_synthesizer
        self.diagram_renderer = diagram_renderer
        self.presentation_renderer = presentation_renderer

    def generate(
        self,
        project_id: str,
        presentation_type: PresentationType,
        audience_type: AudienceType,
        project_data: Dict[str, Any],
    ) -> Presentation:
        """
        Generate a presentation.

        Args:
            project_id: Project identifier
            presentation_type: Type of presentation to generate
            audience_type: Target audience type
            project_data: Project data for content generation

        Returns:
            Generated Presentation entity
        """
        # Create unique presentation ID
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        presentation_id = f"{project_id}_{presentation_type.value}_{timestamp}"

        # Load or create audience profile
        audience_profile = self._get_audience_profile(audience_type)

        # Load or create brand config
        brand_config = self._get_brand_config()

        # Create presentation entity
        presentation = Presentation(
            id=presentation_id,
            project_id=project_id,
            type=presentation_type,
            status=PresentationStatus.DRAFT,
            title=project_data.get("name", "Project Presentation"),
            audience_profile=audience_profile,
            brand_config=brand_config,
        )

        # Generate slides based on presentation type
        slides = self._generate_slides(
            presentation_type,
            audience_profile,
            project_data,
        )

        # Add slides to presentation
        for slide in slides:
            presentation.add_slide(slide)

        # Mark as generated
        presentation.mark_as_generated()

        # Save presentation
        self._save_presentation(presentation)

        # Render to PPTX if renderer is available
        if self.presentation_renderer and self.presentation_renderer.is_available():
            output_path = f"{self.memory_store.base_path}/presentations/{presentation.id}/current.pptx"
            self.presentation_renderer.render_to_pptx(presentation, output_path)

        return presentation

    def _get_audience_profile(self, audience_type: AudienceType) -> AudienceProfile:
        """
        Get or create audience profile.

        Args:
            audience_type: Type of audience

        Returns:
            AudienceProfile entity
        """
        # Try to load from memory
        profile_data = self.memory_store.load_audience_profile(audience_type.value)

        if profile_data:
            # Reconstruct from saved data
            return AudienceProfile(
                id=profile_data['id'],
                name=profile_data['name'],
                type=AudienceType(profile_data['type']),
                detail_level=DetailLevel(profile_data['detail_level']),
                interests=profile_data.get('interests', []),
                preferences=profile_data.get('preferences', {}),
                technical_depth=profile_data.get('technical_depth', 0.5),
            )

        # Create default profile
        profiles = {
            AudienceType.C_SUITE: AudienceProfile(
                id="c-suite",
                name="C-Suite Executives",
                type=AudienceType.C_SUITE,
                detail_level=DetailLevel.MINIMAL,
                interests=["ROI", "strategic outcomes", "risk", "cost"],
                technical_depth=0.2,
            ),
            AudienceType.TECHNICAL_LEAD: AudienceProfile(
                id="tech-lead",
                name="Technical Leads",
                type=AudienceType.TECHNICAL_LEAD,
                detail_level=DetailLevel.DETAILED,
                interests=["architecture", "performance", "scalability", "tech stack"],
                technical_depth=0.9,
            ),
            AudienceType.VP_DIRECTOR: AudienceProfile(
                id="vp-director",
                name="VP/Director Level",
                type=AudienceType.VP_DIRECTOR,
                detail_level=DetailLevel.STANDARD,
                interests=["strategy", "execution", "metrics", "team performance"],
                technical_depth=0.5,
            ),
        }

        profile = profiles.get(audience_type, profiles[AudienceType.VP_DIRECTOR])

        # Save for future use
        self.memory_store.save_audience_profile(profile.id, {
            'id': profile.id,
            'name': profile.name,
            'type': profile.type.value,
            'detail_level': profile.detail_level.value,
            'interests': profile.interests,
            'preferences': profile.preferences,
            'technical_depth': profile.technical_depth,
        })

        return profile

    def _get_brand_config(self) -> BrandConfig:
        """
        Get or create brand configuration.

        Returns:
            BrandConfig entity
        """
        # Try to load Vintiq brand from memory
        config_data = self.memory_store.load_brand_config("vintiq")

        if config_data:
            return BrandConfig(
                id=config_data['id'],
                name=config_data['name'],
                colors=config_data.get('colors', {}),
                typography=config_data.get('typography', {}),
                template_path=config_data.get('template_path'),
                layout_mappings=config_data.get('layout_mappings', {}),
            )

        # Create default Vintiq brand
        brand = BrandConfig.create_vintiq_brand()

        # Save for future use
        self.memory_store.save_brand_config(brand.id, {
            'id': brand.id,
            'name': brand.name,
            'colors': brand.colors,
            'typography': brand.typography,
            'template_path': brand.template_path,
            'layout_mappings': brand.layout_mappings,
        })

        return brand

    def _generate_slides(
        self,
        presentation_type: PresentationType,
        audience_profile: AudienceProfile,
        project_data: Dict[str, Any],
    ) -> List[Slide]:
        """
        Generate slides based on presentation type and audience.

        Args:
            presentation_type: Type of presentation
            audience_profile: Target audience profile
            project_data: Project data for content

        Returns:
            List of Slide entities
        """
        slides = []

        # Define slide sequences for each presentation type
        slide_sequences = {
            PresentationType.EXECUTIVE_SUMMARY: [
                SlideType.TITLE,
                SlideType.EXECUTIVE_SUMMARY,
                SlideType.KEY_METRICS,
                SlideType.ARCHITECTURE_OVERVIEW,
                SlideType.STATUS_DASHBOARD,
                SlideType.TIMELINE,
                SlideType.NEXT_STEPS,
            ],
            PresentationType.STATUS_REPORT: [
                SlideType.TITLE,
                SlideType.STATUS_DASHBOARD,
                SlideType.KEY_METRICS,
                SlideType.AGENT_PERFORMANCE,
                SlideType.TIMELINE,
                SlideType.NEXT_STEPS,
            ],
        }

        # Get slide sequence for this presentation type
        slide_types = slide_sequences.get(
            presentation_type,
            slide_sequences[PresentationType.EXECUTIVE_SUMMARY]
        )

        # Generate each slide
        for order, slide_type in enumerate(slide_types):
            slide = self._create_slide(
                slide_type,
                order,
                audience_profile,
                project_data,
            )
            slides.append(slide)

        return slides

    def _create_slide(
        self,
        slide_type: SlideType,
        order: int,
        audience_profile: AudienceProfile,
        project_data: Dict[str, Any],
    ) -> Slide:
        """
        Create a single slide.

        Args:
            slide_type: Type of slide
            order: Slide order
            audience_profile: Target audience
            project_data: Project data

        Returns:
            Slide entity
        """
        slide_id = f"slide-{order}-{slide_type.value}"

        # Determine layout based on slide type
        layout = self._get_layout_for_slide_type(slide_type)

        # Create slide with appropriate title
        slide = Slide(
            id=slide_id,
            type=slide_type,
            layout=layout,
            title=self._get_slide_title(slide_type, project_data),
            order=order,
        )

        # Add content based on slide type
        if slide_type == SlideType.TITLE:
            slide.set_headline(f"{project_data.get('name', 'Project')} - {datetime.now().strftime('%B %d, %Y')}")

        elif slide_type == SlideType.EXECUTIVE_SUMMARY:
            slide.set_bullet_points(self._generate_summary_points(project_data))

        elif slide_type == SlideType.KEY_METRICS:
            slide.set_metrics(self._calculate_metrics(project_data))

        elif slide_type == SlideType.NEXT_STEPS:
            slide.set_bullet_points(self._generate_next_steps(project_data))

        return slide

    def _get_layout_for_slide_type(self, slide_type: SlideType) -> ContentLayout:
        """Get appropriate layout for slide type"""
        layout_map = {
            SlideType.TITLE: ContentLayout.TITLE_ONLY,
            SlideType.ARCHITECTURE_OVERVIEW: ContentLayout.FULL_DIAGRAM,
            SlideType.ARCHITECTURE_DETAIL: ContentLayout.FULL_DIAGRAM,
            SlideType.KEY_METRICS: ContentLayout.GRID,
        }
        return layout_map.get(slide_type, ContentLayout.TITLE_CONTENT)

    def _get_slide_title(self, slide_type: SlideType, project_data: Dict[str, Any]) -> str:
        """Get title for slide type"""
        titles = {
            SlideType.TITLE: project_data.get("name", "Project Presentation"),
            SlideType.EXECUTIVE_SUMMARY: "Executive Summary",
            SlideType.KEY_METRICS: "Key Performance Indicators",
            SlideType.ARCHITECTURE_OVERVIEW: "System Architecture Overview",
            SlideType.STATUS_DASHBOARD: "Project Status Dashboard",
            SlideType.TIMELINE: "Project Timeline",
            SlideType.NEXT_STEPS: "Next Steps & Recommendations",
            SlideType.AGENT_PERFORMANCE: "Agent Performance Metrics",
        }
        return titles.get(slide_type, slide_type.value.replace("-", " ").title())

    def _generate_summary_points(self, project_data: Dict[str, Any]) -> List[str]:
        """Generate executive summary bullet points"""
        return [
            f"Project {project_data.get('id', 'N/A')} is currently {project_data.get('status', 'active')}",
            f"{len(project_data.get('phases', []))} development phases orchestrated by AI agents",
            "Automated quality assurance, security scanning, and deployment",
            "Real-time monitoring and cost optimization enabled",
            "Self-learning agents improving efficiency with each iteration",
        ]

    def _generate_next_steps(self, project_data: Dict[str, Any]) -> List[str]:
        """Generate next steps recommendations"""
        return [
            "Continue monitoring agent performance and optimization opportunities",
            "Review and approve completed phases for production deployment",
            "Schedule stakeholder demo of completed features",
            "Plan next sprint priorities based on current velocity",
            "Update documentation and runbooks for operational team",
        ]

    def _calculate_metrics(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key performance indicators"""
        phases = project_data.get("phases", [])
        total = len(phases)
        completed = len([p for p in phases if p.get("status") == "complete"])

        return {
            "Total Phases": total,
            "Completed": completed,
            "In Progress": total - completed,
            "Success Rate": f"{(completed / total * 100):.0f}%" if total > 0 else "0%",
        }

    def _save_presentation(self, presentation: Presentation) -> None:
        """
        Save presentation to memory store.

        Args:
            presentation: Presentation entity to save
        """
        # Convert to dictionary
        presentation_data = {
            'id': presentation.id,
            'project_id': presentation.project_id,
            'type': presentation.type.value,
            'status': presentation.status.value,
            'title': presentation.title,
            'created_at': presentation.created_at.isoformat(),
            'updated_at': presentation.updated_at.isoformat(),
            'version': presentation.version,
            'slides': [
                {
                    'id': slide.id,
                    'type': slide.type.value,
                    'layout': slide.layout.value,
                    'title': slide.title,
                    'content': slide.content,
                    'order': slide.order,
                    'relevance_score': slide.relevance_score,
                }
                for slide in presentation.slides
            ],
        }

        self.memory_store.save_presentation(presentation.id, presentation_data)
