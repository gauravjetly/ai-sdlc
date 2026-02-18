"""
Memory Store Port - Interface for persistence

Defines the contract for storing and retrieving agent memory.
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any


class MemoryStorePort(ABC):
    """
    Port interface for memory persistence.

    Implementations can use files, databases, or other storage mechanisms.
    """

    @abstractmethod
    def save_presentation(
        self,
        presentation_id: str,
        presentation_data: Dict[str, Any],
    ) -> None:
        """
        Save presentation data.

        Args:
            presentation_id: Unique presentation identifier
            presentation_data: Presentation data dictionary
        """
        pass

    @abstractmethod
    def load_presentation(
        self,
        presentation_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Load presentation data.

        Args:
            presentation_id: Unique presentation identifier

        Returns:
            Presentation data dictionary or None if not found
        """
        pass

    @abstractmethod
    def list_presentations(
        self,
        project_id: Optional[str] = None,
    ) -> List[str]:
        """
        List all presentation IDs, optionally filtered by project.

        Args:
            project_id: Optional project ID to filter by

        Returns:
            List of presentation IDs
        """
        pass

    @abstractmethod
    def save_learning_record(
        self,
        record: Dict[str, Any],
    ) -> None:
        """
        Save a learning record.

        Args:
            record: Learning record dictionary
        """
        pass

    @abstractmethod
    def load_learning_records(
        self,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Load learning records.

        Args:
            limit: Optional limit on number of records

        Returns:
            List of learning record dictionaries
        """
        pass

    @abstractmethod
    def save_audience_profile(
        self,
        audience_id: str,
        profile_data: Dict[str, Any],
    ) -> None:
        """
        Save audience profile.

        Args:
            audience_id: Unique audience identifier
            profile_data: Audience profile data dictionary
        """
        pass

    @abstractmethod
    def load_audience_profile(
        self,
        audience_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Load audience profile.

        Args:
            audience_id: Unique audience identifier

        Returns:
            Audience profile data dictionary or None if not found
        """
        pass

    @abstractmethod
    def save_brand_config(
        self,
        brand_id: str,
        config_data: Dict[str, Any],
    ) -> None:
        """
        Save brand configuration.

        Args:
            brand_id: Unique brand identifier
            config_data: Brand configuration data dictionary
        """
        pass

    @abstractmethod
    def load_brand_config(
        self,
        brand_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Load brand configuration.

        Args:
            brand_id: Unique brand identifier

        Returns:
            Brand configuration data dictionary or None if not found
        """
        pass

    @abstractmethod
    def read_json(self, path: str) -> Optional[Dict[str, Any]]:
        """
        Read JSON data from arbitrary path.

        Args:
            path: Relative path within memory store

        Returns:
            Dictionary data or None if not found
        """
        pass

    @abstractmethod
    def write_json(self, path: str, data: Dict[str, Any]) -> None:
        """
        Write JSON data to arbitrary path.

        Args:
            path: Relative path within memory store
            data: Dictionary data to write
        """
        pass
