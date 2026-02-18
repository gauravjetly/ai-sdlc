"""
Template Loader Port - Interface for loading presentation templates

Defines the contract for template loading with fallback strategies.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class TemplateLoaderPort(ABC):
    """
    Port interface for template loading.

    Implementations handle template files, caching, and fallbacks.
    """

    @abstractmethod
    def load_template(
        self,
        template_path: Optional[str] = None,
    ) -> Optional[Any]:
        """
        Load presentation template.

        Args:
            template_path: Optional path to template file

        Returns:
            Template object (implementation-specific) or None if failed
        """
        pass

    @abstractmethod
    def get_layout_index(
        self,
        template: Any,
        slide_type: str,
    ) -> int:
        """
        Get layout index for a slide type.

        Args:
            template: Template object
            slide_type: Type of slide

        Returns:
            Layout index (0-based)
        """
        pass

    @abstractmethod
    def get_layout_count(
        self,
        template: Any,
    ) -> int:
        """
        Get number of layouts in template.

        Args:
            template: Template object

        Returns:
            Number of layouts
        """
        pass

    @abstractmethod
    def save_layout_mapping(
        self,
        template_id: str,
        mappings: Dict[str, int],
    ) -> None:
        """
        Save layout mappings for a template.

        Args:
            template_id: Unique template identifier
            mappings: Dictionary of slide_type -> layout_index
        """
        pass

    @abstractmethod
    def load_layout_mapping(
        self,
        template_id: str,
    ) -> Optional[Dict[str, int]]:
        """
        Load layout mappings for a template.

        Args:
            template_id: Unique template identifier

        Returns:
            Dictionary of slide_type -> layout_index or None
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if template loader is available.

        Returns:
            True if available, False otherwise
        """
        pass
