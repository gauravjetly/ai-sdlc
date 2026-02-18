"""
Brand Configuration Entity - Domain model for brand guidelines

Pure domain entity with no external dependencies.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from pathlib import Path


@dataclass
class BrandConfig:
    """
    Domain entity for brand configuration.

    Represents brand guidelines including colors, typography, and templates.
    Used to ensure brand compliance across all presentations.
    """

    id: str
    name: str
    colors: Dict[str, str] = field(default_factory=dict)
    typography: Dict[str, Dict[str, any]] = field(default_factory=dict)
    template_path: Optional[str] = None
    layout_mappings: Dict[str, int] = field(default_factory=dict)

    def __post_init__(self):
        """Initialize default Deltek brand values if not provided"""
        if not self.colors:
            self.colors = self._get_default_deltek_colors()
        if not self.typography:
            self.typography = self._get_default_deltek_typography()

    @staticmethod
    def _get_default_deltek_colors() -> Dict[str, str]:
        """Get default Deltek brand colors"""
        return {
            "primary_blue": "#1742F6",
            "navy": "#081581",
            "dark_gray": "#3C454E",
            "teal": "#00B6C3",
            "purple": "#6D18F1",
            "magenta": "#C200CC",
            "dela_cyan": "#08E9EB",
            "dela_pink": "#FF5DF2",
            "dela_blue": "#3895FF",
            "dela_purple": "#7A62FF",
            "success": "#00875a",
            "warning": "#ff9800",
            "error": "#d32f2f",
            "white": "#FFFFFF",
            "black": "#000000",
        }

    @staticmethod
    def _get_default_deltek_typography() -> Dict[str, Dict[str, any]]:
        """Get default Deltek typography settings"""
        return {
            "heading": {"font": "Figtree", "weight": "Bold", "size": 32},
            "subheading": {"font": "Figtree", "weight": "SemiBold", "size": 24},
            "body": {"font": "Figtree", "weight": "Regular", "size": 14},
            "caption": {"font": "Figtree", "weight": "Regular", "size": 11},
        }

    def get_color(self, color_name: str) -> Optional[str]:
        """
        Get a color by name.

        Args:
            color_name: Name of the color (e.g., 'primary_blue')

        Returns:
            Hex color string or None if not found
        """
        return self.colors.get(color_name)

    def get_primary_color(self) -> str:
        """Get the primary brand color"""
        return self.colors.get("primary_blue", "#1742F6")

    def get_gradient_colors(self) -> List[str]:
        """Get the Deltek gradient color sequence"""
        return [
            self.colors.get("dela_cyan", "#08E9EB"),
            self.colors.get("dela_pink", "#FF5DF2"),
            self.colors.get("dela_blue", "#3895FF"),
            self.colors.get("dela_purple", "#7A62FF"),
        ]

    def get_accent_colors(self) -> List[str]:
        """Get accent colors for charts and visuals"""
        return [
            self.colors.get("teal", "#00B6C3"),
            self.colors.get("purple", "#6D18F1"),
            self.colors.get("magenta", "#C200CC"),
        ]

    def get_typography(self, style: str) -> Optional[Dict[str, any]]:
        """
        Get typography settings for a style.

        Args:
            style: Typography style (heading, subheading, body, caption)

        Returns:
            Typography settings dictionary or None if not found
        """
        return self.typography.get(style)

    def get_font_family(self) -> str:
        """Get the brand font family"""
        heading = self.typography.get("heading", {})
        return heading.get("font", "Figtree")

    def is_approved_color(self, hex_color: str) -> bool:
        """
        Check if a color is in the approved brand palette.

        Args:
            hex_color: Hex color string to check

        Returns:
            True if color is approved, False otherwise
        """
        hex_color = hex_color.upper()
        return hex_color in [c.upper() for c in self.colors.values()]

    def get_nearest_approved_color(self, hex_color: str) -> str:
        """
        Get the nearest approved color (simplified version).

        Args:
            hex_color: Hex color string

        Returns:
            Nearest approved hex color (returns primary_blue as fallback)
        """
        # Simplified: In real implementation, would use color distance algorithm
        if self.is_approved_color(hex_color):
            return hex_color
        return self.get_primary_color()

    def has_template(self) -> bool:
        """Check if a template path is configured"""
        return self.template_path is not None and self.template_path != ""

    def get_template_path(self) -> Optional[Path]:
        """
        Get the template path as a Path object.

        Returns:
            Path object or None if no template configured
        """
        if self.template_path:
            return Path(self.template_path)
        return None

    def add_layout_mapping(self, slide_type: str, layout_index: int) -> None:
        """
        Add a layout mapping for a slide type.

        Args:
            slide_type: Type of slide
            layout_index: Template layout index
        """
        self.layout_mappings[slide_type] = layout_index

    def get_layout_index(self, slide_type: str, default: int = 0) -> int:
        """
        Get the layout index for a slide type.

        Args:
            slide_type: Type of slide
            default: Default layout index if not found

        Returns:
            Layout index
        """
        return self.layout_mappings.get(slide_type, default)

    def validate(self) -> List[str]:
        """
        Validate the brand configuration and return list of errors.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        if not self.name:
            errors.append("Brand name is required")

        if not self.colors:
            errors.append("Brand colors are required")

        if not self.typography:
            errors.append("Brand typography is required")

        # Validate color format (should be hex)
        for color_name, color_value in self.colors.items():
            if not color_value.startswith("#"):
                errors.append(f"Color {color_name} must be in hex format")

        # Validate typography structure
        required_styles = ["heading", "body"]
        for style in required_styles:
            if style not in self.typography:
                errors.append(f"Typography style '{style}' is required")

        return errors

    def is_valid(self) -> bool:
        """Check if brand configuration is valid"""
        return len(self.validate()) == 0

    @classmethod
    def create_deltek_brand(cls) -> 'BrandConfig':
        """
        Create a default Deltek brand configuration.

        Returns:
            BrandConfig with Deltek defaults
        """
        return cls(
            id="deltek",
            name="Deltek",
            colors=cls._get_default_deltek_colors(),
            typography=cls._get_default_deltek_typography(),
        )
