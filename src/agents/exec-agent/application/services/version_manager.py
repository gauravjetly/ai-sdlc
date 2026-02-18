"""
Version Manager - Content-addressable versioning for presentations

Handles version creation, history tracking, and rollback operations.
"""

import sys
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.presentation import Presentation
from domain.interfaces.version_store_port import VersionStorePort, VersionRecord
from domain.interfaces.memory_store_port import MemoryStorePort


class VersionManager:
    """
    Manages presentation versions with content-addressable storage.
    """

    def __init__(
        self,
        version_store: VersionStorePort,
        memory_store: MemoryStorePort,
    ):
        """
        Initialize version manager.

        Args:
            version_store: Version storage implementation
            memory_store: Memory storage for presentations
        """
        self.version_store = version_store
        self.memory_store = memory_store

    def create_version(
        self,
        presentation: Presentation,
        file_path: Optional[str] = None,
    ) -> VersionRecord:
        """
        Create a new version from a presentation.

        Args:
            presentation: Presentation to version
            file_path: Path to PPTX file (if generated)

        Returns:
            VersionRecord for the new version
        """
        # Calculate content hash
        content_hash = self._calculate_content_hash(presentation)

        # Check if this exact version already exists
        existing = self.version_store.get_version(content_hash)
        if existing:
            return existing

        # Create version record
        version_record = self.version_store.create_version(
            presentation_id=presentation.id,
            content_hash=content_hash,
            parent_hash=presentation.parent_version_hash,
            quality_score=presentation.quality_score,
            file_path=file_path,
            metadata={
                'project_id': presentation.project_id,
                'type': presentation.type.value,
                'slide_count': len(presentation.slides),
                'created_at': presentation.created_at.isoformat(),
            },
        )

        # Update presentation with new version hash
        presentation.version_hash = content_hash
        presentation.version += 1

        return version_record

    def list_versions(self, presentation_id: str) -> List[VersionRecord]:
        """
        List all versions for a presentation.

        Args:
            presentation_id: Presentation ID

        Returns:
            List of VersionRecords, sorted newest first
        """
        return self.version_store.list_versions(presentation_id)

    def get_latest_version(self, presentation_id: str) -> Optional[VersionRecord]:
        """
        Get the latest version for a presentation.

        Args:
            presentation_id: Presentation ID

        Returns:
            Latest VersionRecord or None
        """
        return self.version_store.get_latest_version(presentation_id)

    def _calculate_content_hash(self, presentation: Presentation) -> str:
        """
        Calculate SHA-256 hash of presentation content.

        Args:
            presentation: Presentation to hash

        Returns:
            SHA-256 hex digest
        """
        # Create string representation of key content
        content_parts = [
            presentation.id,
            presentation.title,
            str(presentation.type.value),
            str(len(presentation.slides)),
        ]

        # Add slide content
        for slide in presentation.slides:
            content_parts.append(slide.id)
            content_parts.append(slide.title)
            if slide.content:
                content_parts.append(str(slide.content.headline or ''))
                content_parts.append(str(slide.content.bullet_points or []))

        # Hash the combined content
        content_str = '|'.join(content_parts)
        return hashlib.sha256(content_str.encode('utf-8')).hexdigest()
