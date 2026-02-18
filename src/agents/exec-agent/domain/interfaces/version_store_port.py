"""
Version Store Port - Interface for version management

Defines the contract for storing and retrieving presentation versions.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime


class VersionRecord:
    """Version record data class"""

    def __init__(
        self,
        version_hash: str,
        presentation_id: str,
        version: int,
        created_at: datetime,
        parent_hash: Optional[str] = None,
        quality_score: Optional[float] = None,
        file_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.version_hash = version_hash
        self.presentation_id = presentation_id
        self.version = version
        self.created_at = created_at
        self.parent_hash = parent_hash
        self.quality_score = quality_score
        self.file_path = file_path
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'version_hash': self.version_hash,
            'presentation_id': self.presentation_id,
            'version': self.version,
            'created_at': self.created_at.isoformat(),
            'parent_hash': self.parent_hash,
            'quality_score': self.quality_score,
            'file_path': self.file_path,
            'metadata': self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VersionRecord':
        """Deserialize from dictionary"""
        return cls(
            version_hash=data['version_hash'],
            presentation_id=data['presentation_id'],
            version=data['version'],
            created_at=datetime.fromisoformat(data['created_at']),
            parent_hash=data.get('parent_hash'),
            quality_score=data.get('quality_score'),
            file_path=data.get('file_path'),
            metadata=data.get('metadata', {}),
        )


class VersionStorePort(ABC):
    """
    Port interface for version storage.

    Implementations handle content-addressable versioning.
    """

    @abstractmethod
    def create_version(
        self,
        presentation_id: str,
        content_hash: str,
        parent_hash: Optional[str] = None,
        quality_score: Optional[float] = None,
        file_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> VersionRecord:
        """
        Create a new version record.

        Args:
            presentation_id: Presentation ID
            content_hash: SHA-256 hash of content
            parent_hash: Hash of parent version (if any)
            quality_score: Quality score for this version
            file_path: Path to PPTX file
            metadata: Additional metadata

        Returns:
            VersionRecord for the new version
        """
        pass

    @abstractmethod
    def list_versions(
        self,
        presentation_id: str,
    ) -> List[VersionRecord]:
        """
        List all versions for a presentation.

        Args:
            presentation_id: Presentation ID

        Returns:
            List of VersionRecords, sorted by created_at descending
        """
        pass

    @abstractmethod
    def get_version(
        self,
        version_hash: str,
    ) -> Optional[VersionRecord]:
        """
        Get a specific version by hash.

        Args:
            version_hash: Version hash

        Returns:
            VersionRecord or None if not found
        """
        pass

    @abstractmethod
    def get_latest_version(
        self,
        presentation_id: str,
    ) -> Optional[VersionRecord]:
        """
        Get the latest version for a presentation.

        Args:
            presentation_id: Presentation ID

        Returns:
            VersionRecord or None if no versions exist
        """
        pass

    @abstractmethod
    def delete_version(
        self,
        version_hash: str,
    ) -> bool:
        """
        Delete a specific version.

        Args:
            version_hash: Version hash

        Returns:
            True if deleted, False if not found
        """
        pass
