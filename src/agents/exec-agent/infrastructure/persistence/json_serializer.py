"""
JSON Serializer - Utility for serializing domain objects

Handles conversion between domain objects and JSON.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime


class JsonSerializer:
    """Utility class for JSON serialization and deserialization"""

    @staticmethod
    def serialize_datetime(dt: datetime) -> str:
        """
        Serialize datetime to ISO format string.

        Args:
            dt: Datetime object

        Returns:
            ISO format string
        """
        return dt.isoformat()

    @staticmethod
    def deserialize_datetime(dt_str: str) -> datetime:
        """
        Deserialize ISO format string to datetime.

        Args:
            dt_str: ISO format string

        Returns:
            Datetime object
        """
        return datetime.fromisoformat(dt_str)

    @staticmethod
    def save_json(data: Dict[str, Any], file_path: Path) -> None:
        """
        Save dictionary to JSON file.

        Args:
            data: Data dictionary
            file_path: Path to JSON file
        """
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write JSON with pretty formatting
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    @staticmethod
    def load_json(file_path: Path) -> Optional[Dict[str, Any]]:
        """
        Load dictionary from JSON file.

        Args:
            file_path: Path to JSON file

        Returns:
            Data dictionary or None if file doesn't exist
        """
        if not file_path.exists():
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

    @staticmethod
    def append_json_array(data: Dict[str, Any], file_path: Path) -> None:
        """
        Append dictionary to JSON array file.

        Args:
            data: Data dictionary to append
            file_path: Path to JSON file (should contain an array)
        """
        # Load existing array
        existing = JsonSerializer.load_json(file_path)
        if existing is None:
            existing = []
        elif not isinstance(existing, list):
            raise ValueError(f"File {file_path} does not contain a JSON array")

        # Append new data
        existing.append(data)

        # Save updated array
        JsonSerializer.save_json(existing, file_path)
