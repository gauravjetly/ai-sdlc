"""
File Memory Store - File-based implementation of MemoryStorePort

Implements persistent storage using JSON files.
"""

from pathlib import Path
from typing import Optional, List, Dict, Any
import sys

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.interfaces.memory_store_port import MemoryStorePort
from infrastructure.persistence.json_serializer import JsonSerializer


class FileMemoryStore(MemoryStorePort):
    """
    File-based implementation of memory store.

    Storage structure:
    ~/.claude/exec-agent-memory/
    ├── presentations/
    │   └── {presentation_id}.json
    ├── learning/
    │   └── records.json (array of records)
    ├── audiences/
    │   └── {audience_id}.json
    └── brand/
        └── {brand_id}.json
    """

    def __init__(self, base_path: Optional[Path] = None):
        """
        Initialize file memory store.

        Args:
            base_path: Base directory for storage (defaults to ~/.claude/exec-agent-memory)
        """
        if base_path is None:
            base_path = Path.home() / ".claude" / "exec-agent-memory"
        elif isinstance(base_path, str):
            base_path = Path(base_path)

        self.base_path = base_path
        self.presentations_dir = base_path / "presentations"
        self.learning_dir = base_path / "learning"
        self.audiences_dir = base_path / "audiences"
        self.brand_dir = base_path / "brand"

        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Create all required directories"""
        self.presentations_dir.mkdir(parents=True, exist_ok=True)
        self.learning_dir.mkdir(parents=True, exist_ok=True)
        self.audiences_dir.mkdir(parents=True, exist_ok=True)
        self.brand_dir.mkdir(parents=True, exist_ok=True)

    def save_presentation(
        self,
        presentation_id: str,
        presentation_data: Dict[str, Any],
    ) -> None:
        """
        Save presentation data to JSON file.

        Args:
            presentation_id: Unique presentation identifier
            presentation_data: Presentation data dictionary
        """
        file_path = self.presentations_dir / f"{presentation_id}.json"
        JsonSerializer.save_json(presentation_data, file_path)

    def load_presentation(
        self,
        presentation_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Load presentation data from JSON file.

        Args:
            presentation_id: Unique presentation identifier

        Returns:
            Presentation data dictionary or None if not found
        """
        file_path = self.presentations_dir / f"{presentation_id}.json"
        return JsonSerializer.load_json(file_path)

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
        presentation_ids = []

        for file_path in self.presentations_dir.glob("*.json"):
            pres_id = file_path.stem

            # If filtering by project, load and check
            if project_id is not None:
                data = self.load_presentation(pres_id)
                if data and data.get("project_id") == project_id:
                    presentation_ids.append(pres_id)
            else:
                presentation_ids.append(pres_id)

        return sorted(presentation_ids)

    def save_learning_record(
        self,
        record: Dict[str, Any],
    ) -> None:
        """
        Append learning record to records file.

        Args:
            record: Learning record dictionary
        """
        file_path = self.learning_dir / "records.json"
        JsonSerializer.append_json_array(record, file_path)

    def load_learning_records(
        self,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Load learning records from file.

        Args:
            limit: Optional limit on number of records (most recent)

        Returns:
            List of learning record dictionaries
        """
        file_path = self.learning_dir / "records.json"
        records = JsonSerializer.load_json(file_path)

        if records is None:
            return []

        if not isinstance(records, list):
            return []

        # Return most recent records if limit specified
        if limit is not None:
            return records[-limit:]

        return records

    def save_audience_profile(
        self,
        audience_id: str,
        profile_data: Dict[str, Any],
    ) -> None:
        """
        Save audience profile to JSON file.

        Args:
            audience_id: Unique audience identifier
            profile_data: Audience profile data dictionary
        """
        file_path = self.audiences_dir / f"{audience_id}.json"
        JsonSerializer.save_json(profile_data, file_path)

    def load_audience_profile(
        self,
        audience_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Load audience profile from JSON file.

        Args:
            audience_id: Unique audience identifier

        Returns:
            Audience profile data dictionary or None if not found
        """
        file_path = self.audiences_dir / f"{audience_id}.json"
        return JsonSerializer.load_json(file_path)

    def save_brand_config(
        self,
        brand_id: str,
        config_data: Dict[str, Any],
    ) -> None:
        """
        Save brand configuration to JSON file.

        Args:
            brand_id: Unique brand identifier
            config_data: Brand configuration data dictionary
        """
        file_path = self.brand_dir / f"{brand_id}.json"
        JsonSerializer.save_json(config_data, file_path)

    def load_brand_config(
        self,
        brand_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Load brand configuration from JSON file.

        Args:
            brand_id: Unique brand identifier

        Returns:
            Brand configuration data dictionary or None if not found
        """
        file_path = self.brand_dir / f"{brand_id}.json"
        return JsonSerializer.load_json(file_path)

    def read_json(self, path: str) -> Optional[Dict[str, Any]]:
        """
        Read JSON data from arbitrary path.

        Args:
            path: Relative path within memory store

        Returns:
            Dictionary data or None if not found
        """
        file_path = self.base_path / path
        return JsonSerializer.load_json(file_path)

    def write_json(self, path: str, data: Dict[str, Any]) -> None:
        """
        Write JSON data to arbitrary path.

        Args:
            path: Relative path within memory store
            data: Dictionary data to write
        """
        file_path = self.base_path / path
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        JsonSerializer.save_json(data, file_path)

    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics.

        Returns:
            Dictionary with storage stats
        """
        return {
            "base_path": str(self.base_path),
            "presentation_count": len(list(self.presentations_dir.glob("*.json"))),
            "audience_count": len(list(self.audiences_dir.glob("*.json"))),
            "brand_count": len(list(self.brand_dir.glob("*.json"))),
            "learning_records": len(self.load_learning_records()),
        }
