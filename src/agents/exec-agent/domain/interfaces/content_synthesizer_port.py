"""
Content Synthesizer Port - Interface for content generation

Defines the contract for content synthesis (can be LLM or rule-based).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class ContentSynthesizerPort(ABC):
    """
    Port interface for content synthesis.

    Implementations can use LLMs, templates, or rule-based generation.
    """

    @abstractmethod
    def synthesize_slide_content(
        self,
        presentation_type: str,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Synthesize content for a slide.

        Args:
            presentation_type: Type of presentation
            slide_type: Type of slide
            project_data: Raw project data
            audience_context: Audience preferences and context

        Returns:
            Dictionary with slide content:
            {
                'headline': str,
                'bullet_points': List[str],
                'metrics': Dict[str, Any],
                'narrative': str
            }
        """
        pass

    @abstractmethod
    def generate_executive_summary(
        self,
        project_data: Dict[str, Any],
    ) -> str:
        """
        Generate executive summary text.

        Args:
            project_data: Raw project data

        Returns:
            Executive summary text
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if synthesizer is available.

        Returns:
            True if available, False otherwise
        """
        pass
