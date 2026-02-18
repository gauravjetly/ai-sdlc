"""
Presentation Renderer Port - Interface for rendering presentations to files

Defines the contract for rendering Presentation entities to PowerPoint files.
"""

from abc import ABC, abstractmethod
from typing import Optional
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.presentation import Presentation


class PresentationRendererPort(ABC):
    """
    Port interface for presentation rendering.

    Implementations can use python-pptx, other PPTX libraries, or alternative formats.
    """

    @abstractmethod
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
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if renderer is available.

        Returns:
            True if available, False otherwise
        """
        pass

    @abstractmethod
    def get_template_path(self) -> Optional[str]:
        """
        Get path to PowerPoint template.

        Returns:
            Template path if available, None otherwise
        """
        pass
