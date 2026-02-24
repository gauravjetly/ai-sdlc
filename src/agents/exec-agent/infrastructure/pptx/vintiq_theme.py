"""
Vintiq Theme - Brand guidelines for PowerPoint

Provides Vintiq-specific styling for presentations.
"""

from typing import Dict
from dataclasses import dataclass
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor


@dataclass
class VintiqTheme:
    """
    Vintiq Consultancy brand theme for PowerPoint presentations.

    Contains colors, fonts, and layout specifications.
    """

    # Brand Colors (RGB tuples)
    COLOR_PRIMARY = RGBColor(243, 146, 25)   # #F39219 Vintiq Orange
    COLOR_NAVY = RGBColor(18, 14, 58)         # #120E3A Vintiq Dark Navy
    COLOR_MAGENTA = RGBColor(219, 0, 100)     # #DB0064 Vintiq Magenta
    COLOR_ORANGE_MID = RGBColor(239, 132, 51) # #EF8433 Vintiq Orange Mid
    COLOR_ORANGE_RED = RGBColor(231, 94, 85)  # #E75E55 Vintiq Orange-Red
    COLOR_TEXT_DARK = RGBColor(18, 14, 58)    # #120E3A Navy
    COLOR_TEXT_LIGHT = RGBColor(138, 155, 172) # #8a9bac
    COLOR_WHITE = RGBColor(255, 255, 255)
    COLOR_BACKGROUND = RGBColor(245, 247, 250) # #F5F7FA

    # Gradient Colors (orange → magenta)
    GRADIENT_COLORS = [
        RGBColor(243, 146, 25),  # #F39219
        RGBColor(239, 132, 51),  # #EF8433
        RGBColor(231, 94, 85),   # #E75E55
        RGBColor(219, 0, 100),   # #DB0064
    ]

    # Typography
    FONT_FAMILY = "Figtree"
    FONT_FALLBACK = "Arial"

    # Font sizes
    FONT_SIZE_TITLE = Pt(44)
    FONT_SIZE_HEADING = Pt(32)
    FONT_SIZE_SUBHEADING = Pt(24)
    FONT_SIZE_BODY = Pt(18)
    FONT_SIZE_CAPTION = Pt(14)

    # Layout dimensions
    MARGIN_TOP = Inches(0.5)
    MARGIN_LEFT = Inches(0.5)
    MARGIN_RIGHT = Inches(0.5)
    MARGIN_BOTTOM = Inches(0.5)

    CONTENT_WIDTH = Inches(9.0)
    CONTENT_HEIGHT = Inches(6.5)

    @classmethod
    def get_slide_dimensions(cls) -> Dict[str, float]:
        """Get standard slide dimensions"""
        return {
            'width': Inches(10),
            'height': Inches(7.5),
        }

    @classmethod
    def get_title_style(cls) -> Dict:
        """Get title text style"""
        return {
            'font_name': cls.FONT_FAMILY,
            'font_size': cls.FONT_SIZE_TITLE,
            'font_color': cls.COLOR_PRIMARY,
            'bold': True,
            'alignment': PP_ALIGN.LEFT,
        }

    @classmethod
    def get_heading_style(cls) -> Dict:
        """Get heading text style"""
        return {
            'font_name': cls.FONT_FAMILY,
            'font_size': cls.FONT_SIZE_HEADING,
            'font_color': cls.COLOR_PRIMARY,
            'bold': True,
            'alignment': PP_ALIGN.LEFT,
        }

    @classmethod
    def get_body_style(cls) -> Dict:
        """Get body text style"""
        return {
            'font_name': cls.FONT_FAMILY,
            'font_size': cls.FONT_SIZE_BODY,
            'font_color': cls.COLOR_TEXT_DARK,
            'bold': False,
            'alignment': PP_ALIGN.LEFT,
        }

    @classmethod
    def apply_text_style(cls, text_frame, style_dict: Dict) -> None:
        """
        Apply text style to a text frame.

        Args:
            text_frame: python-pptx text frame
            style_dict: Style dictionary with font properties
        """
        for paragraph in text_frame.paragraphs:
            paragraph.alignment = style_dict.get('alignment', PP_ALIGN.LEFT)

            for run in paragraph.runs:
                run.font.name = style_dict.get('font_name', cls.FONT_FAMILY)
                run.font.size = style_dict.get('font_size', cls.FONT_SIZE_BODY)
                run.font.bold = style_dict.get('bold', False)

                color = style_dict.get('font_color', cls.COLOR_TEXT_DARK)
                run.font.color.rgb = color

    @classmethod
    def apply_shape_fill(cls, shape, color: RGBColor = None) -> None:
        """
        Apply solid fill to shape.

        Args:
            shape: python-pptx shape
            color: RGB color (uses primary if None)
        """
        color = color or cls.COLOR_PRIMARY
        shape.fill.solid()
        shape.fill.fore_color.rgb = color

    @classmethod
    def get_chart_colors(cls) -> list:
        """Get list of colors for charts"""
        return [
            cls.COLOR_PRIMARY,
            cls.COLOR_ORANGE_MID,
            cls.COLOR_ORANGE_RED,
            cls.COLOR_MAGENTA,
            cls.COLOR_NAVY,
        ]
