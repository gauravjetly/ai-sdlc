"""
Diagram Renderer Port - Interface for diagram rendering

Defines the contract for rendering diagrams to various formats.
"""

from abc import ABC, abstractmethod
from typing import Optional


class DiagramRendererPort(ABC):
    """
    Port interface for diagram rendering.

    Implementations can use Mermaid, Graphviz, or native shapes.
    """

    @abstractmethod
    def render_to_svg(
        self,
        mermaid_source: str,
        style_config: dict,
    ) -> Optional[bytes]:
        """
        Render Mermaid diagram to SVG.

        Args:
            mermaid_source: Mermaid diagram syntax
            style_config: Style configuration dictionary

        Returns:
            SVG data as bytes, or None if rendering failed
        """
        pass

    @abstractmethod
    def render_to_png(
        self,
        mermaid_source: str,
        style_config: dict,
        width: int = 800,
        height: int = 600,
    ) -> Optional[bytes]:
        """
        Render Mermaid diagram to PNG.

        Args:
            mermaid_source: Mermaid diagram syntax
            style_config: Style configuration dictionary
            width: Image width in pixels
            height: Image height in pixels

        Returns:
            PNG data as bytes, or None if rendering failed
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if renderer is available.

        Returns:
            True if available, False otherwise
        """
        pass
