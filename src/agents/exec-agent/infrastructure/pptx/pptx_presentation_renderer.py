"""
PPTX Presentation Renderer - Converts domain Presentation to PowerPoint file

Implements PresentationRendererPort using python-pptx.
"""

import sys
from pathlib import Path
from typing import Optional
from datetime import datetime

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pptx import Presentation as PptxPresentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from domain.interfaces.presentation_renderer_port import PresentationRendererPort
from domain.entities.presentation import Presentation
from domain.entities.slide import Slide, SlideType
from infrastructure.config.config import Config, get_config
from infrastructure.pptx.deltek_theme import DeltekTheme


class PptxPresentationRenderer(PresentationRendererPort):
    """
    PowerPoint presentation renderer.

    Converts domain Presentation entities to .pptx files using python-pptx.

    Features:
    - Deltek brand theme application
    - Template loading (with fallback to blank)
    - Diagram embedding
    - Multiple layout types
    - Content formatting
    """

    def __init__(self, config: Optional[Config] = None):
        """
        Initialize PPTX renderer.

        Args:
            config: Configuration instance
        """
        self.config = config or get_config()
        self.theme = DeltekTheme()

    def render_to_pptx(
        self,
        presentation: Presentation,
        output_path: str,
    ) -> bool:
        """
        Render Presentation entity to PowerPoint file.

        Args:
            presentation: Presentation entity to render
            output_path: Path where PPTX file should be saved

        Returns:
            True if rendering succeeded, False otherwise
        """
        try:
            # Load template or create blank presentation
            prs = self._load_template()

            # Render each slide
            for slide in presentation.slides:
                self._render_slide(prs, slide, presentation)

            # Save presentation
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            prs.save(str(output_file))

            return True

        except Exception as e:
            print(f"Failed to render presentation: {e}")
            return False

    def is_available(self) -> bool:
        """
        Check if renderer is available.

        Returns:
            True (python-pptx is always available if installed)
        """
        return True

    def get_template_path(self) -> Optional[str]:
        """
        Get path to PowerPoint template.

        Returns:
            Template path if available, None otherwise
        """
        return self.config.deltek_template_path if self.config.is_template_available() else None

    def _load_template(self) -> PptxPresentation:
        """Load PowerPoint template or create blank"""
        template_path = self.get_template_path()

        if template_path:
            try:
                return PptxPresentation(template_path)
            except Exception as e:
                print(f"Failed to load template from {template_path}: {e}")

        # Create blank presentation
        prs = PptxPresentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)
        return prs

    def _render_slide(
        self,
        prs: PptxPresentation,
        slide: Slide,
        presentation: Presentation,
    ) -> None:
        """
        Render a single slide.

        Args:
            prs: PowerPoint presentation object
            slide: Slide entity to render
            presentation: Parent presentation entity
        """
        # Select appropriate layout
        layout = self._select_layout(prs, slide.type)

        # Add slide with layout
        pptx_slide = prs.slides.add_slide(layout)

        # Render based on slide type
        if slide.type == SlideType.TITLE:
            self._render_title_slide(pptx_slide, slide, presentation)
        elif slide.type == SlideType.EXECUTIVE_SUMMARY:
            self._render_content_slide(pptx_slide, slide)
        elif slide.type == SlideType.KEY_METRICS:
            self._render_metrics_slide(pptx_slide, slide)
        elif slide.type in [SlideType.ARCHITECTURE_OVERVIEW, SlideType.ARCHITECTURE_DETAIL]:
            self._render_diagram_slide(pptx_slide, slide)
        else:
            self._render_content_slide(pptx_slide, slide)

    def _select_layout(self, prs: PptxPresentation, slide_type: SlideType) -> any:
        """
        Select appropriate layout for slide type.

        Args:
            prs: PowerPoint presentation
            slide_type: Type of slide

        Returns:
            Slide layout object
        """
        layouts = prs.slide_layouts

        # Map slide types to layout indices (common PowerPoint template layouts)
        layout_map = {
            SlideType.TITLE: 0,  # Title slide
            SlideType.EXECUTIVE_SUMMARY: 1,  # Title and content
            SlideType.KEY_METRICS: 3,  # Two content
            SlideType.ARCHITECTURE_OVERVIEW: 6,  # Blank
            SlideType.ARCHITECTURE_DETAIL: 6,  # Blank
            SlideType.STATUS_DASHBOARD: 1,  # Title and content
            SlideType.TIMELINE: 1,  # Title and content
            SlideType.AGENT_PERFORMANCE: 1,  # Title and content
            SlideType.NEXT_STEPS: 1,  # Title and content
        }

        layout_index = layout_map.get(slide_type, 1)

        # Handle case where layout doesn't exist (template has fewer layouts)
        if layout_index >= len(layouts):
            layout_index = min(1, len(layouts) - 1)

        return layouts[layout_index]

    def _render_title_slide(
        self,
        pptx_slide,
        slide: Slide,
        presentation: Presentation,
    ) -> None:
        """Render title slide"""
        # Try to use placeholders from layout
        if len(pptx_slide.shapes) >= 2:
            # Title
            title_shape = pptx_slide.shapes[0]
            if hasattr(title_shape, 'text_frame'):
                title_shape.text = presentation.title

                # Apply Deltek branding
                self.theme.apply_text_style(
                    title_shape.text_frame,
                    self.theme.get_title_style()
                )

            # Subtitle (date + audience)
            subtitle_shape = pptx_slide.shapes[1]
            if hasattr(subtitle_shape, 'text_frame'):
                subtitle_text = f"{datetime.now().strftime('%B %d, %Y')}"
                if presentation.audience_profile:
                    subtitle_text += f"\n{presentation.audience_profile.name}"

                subtitle_shape.text = subtitle_text

                self.theme.apply_text_style(
                    subtitle_shape.text_frame,
                    self.theme.get_body_style()
                )
        else:
            # Fallback: create text box
            self._add_text_box(
                pptx_slide,
                presentation.title,
                left=Inches(0.5),
                top=Inches(2.5),
                width=Inches(9),
                height=Inches(1.5),
                style=self.theme.get_title_style()
            )

    def _render_content_slide(self, pptx_slide, slide: Slide) -> None:
        """Render content slide with title and bullet points"""
        # Title
        if len(pptx_slide.shapes) >= 1:
            title_shape = pptx_slide.shapes[0]
            if hasattr(title_shape, 'text_frame'):
                title_shape.text = slide.title
                self.theme.apply_text_style(
                    title_shape.text_frame,
                    self.theme.get_heading_style()
                )

        # Content
        content_top = Inches(1.5)
        content_left = Inches(0.75)
        content_width = Inches(8.5)

        # Headline
        if slide.content.get('headline'):
            headline_box = pptx_slide.shapes.add_textbox(
                content_left,
                content_top,
                content_width,
                Inches(0.6)
            )
            headline_box.text = slide.content['headline']
            self.theme.apply_text_style(
                headline_box.text_frame,
                {**self.theme.get_body_style(), 'bold': True}
            )
            content_top += Inches(0.8)

        # Bullet points
        bullet_points = slide.content.get('bullet_points', [])
        if bullet_points:
            bullets_box = pptx_slide.shapes.add_textbox(
                content_left,
                content_top,
                content_width,
                Inches(4.0)
            )

            text_frame = bullets_box.text_frame
            text_frame.word_wrap = True

            for i, point in enumerate(bullet_points):
                if i > 0:
                    p = text_frame.add_paragraph()
                else:
                    p = text_frame.paragraphs[0]

                p.text = f"• {point}"
                p.level = 0
                p.space_before = Pt(6)

            self.theme.apply_text_style(
                text_frame,
                self.theme.get_body_style()
            )

    def _render_metrics_slide(self, pptx_slide, slide: Slide) -> None:
        """Render metrics slide with KPI cards"""
        # Title
        if len(pptx_slide.shapes) >= 1:
            title_shape = pptx_slide.shapes[0]
            if hasattr(title_shape, 'text_frame'):
                title_shape.text = slide.title
                self.theme.apply_text_style(
                    title_shape.text_frame,
                    self.theme.get_heading_style()
                )

        # Metrics
        metrics = slide.content.get('metrics', {})
        if metrics:
            # Create grid of metric cards
            metrics_list = list(metrics.items())
            cols = 2
            rows = (len(metrics_list) + cols - 1) // cols

            card_width = Inches(4.0)
            card_height = Inches(1.5)
            spacing = Inches(0.5)
            start_left = Inches(0.75)
            start_top = Inches(2.0)

            for i, (key, value) in enumerate(metrics_list):
                row = i // cols
                col = i % cols

                left = start_left + col * (card_width + spacing)
                top = start_top + row * (card_height + spacing)

                # Create metric card
                card = pptx_slide.shapes.add_shape(
                    1,  # Rectangle
                    left, top, card_width, card_height
                )

                # Apply Deltek branding
                self.theme.apply_shape_fill(card, self.theme.COLOR_BACKGROUND)
                card.line.color.rgb = self.theme.COLOR_PRIMARY

                # Add metric text
                text_frame = card.text_frame
                text_frame.clear()

                # Metric value (large)
                p = text_frame.paragraphs[0]
                p.text = str(value)
                p.alignment = PP_ALIGN.CENTER
                p.font.size = Pt(36)
                p.font.bold = True
                p.font.color.rgb = self.theme.COLOR_PRIMARY

                # Metric label (small)
                p = text_frame.add_paragraph()
                p.text = key
                p.alignment = PP_ALIGN.CENTER
                p.font.size = Pt(14)
                p.font.color.rgb = self.theme.COLOR_TEXT_DARK

    def _render_diagram_slide(self, pptx_slide, slide: Slide) -> None:
        """Render slide with diagram"""
        # Title
        if len(pptx_slide.shapes) >= 1:
            title_shape = pptx_slide.shapes[0]
            if hasattr(title_shape, 'text_frame'):
                title_shape.text = slide.title
                self.theme.apply_text_style(
                    title_shape.text_frame,
                    self.theme.get_heading_style()
                )

        # Diagram placeholder
        # (Actual diagram embedding will be added in future enhancement)
        diagram_area = pptx_slide.shapes.add_textbox(
            Inches(1),
            Inches(2),
            Inches(8),
            Inches(4.5)
        )

        diagram_area.text = "[Architecture Diagram]\n\nDiagram rendering will be added here"
        diagram_area.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        # Style placeholder
        for paragraph in diagram_area.text_frame.paragraphs:
            for run in paragraph.runs:
                run.font.color.rgb = self.theme.COLOR_TEXT_LIGHT
                run.font.size = Pt(16)

    def _add_text_box(
        self,
        pptx_slide,
        text: str,
        left: float,
        top: float,
        width: float,
        height: float,
        style: dict,
    ) -> None:
        """Add styled text box to slide"""
        text_box = pptx_slide.shapes.add_textbox(left, top, width, height)
        text_frame = text_box.text_frame
        text_frame.text = text
        text_frame.word_wrap = True

        self.theme.apply_text_style(text_frame, style)
