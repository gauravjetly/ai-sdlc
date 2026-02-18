"""
Diagram Entity - Domain model for diagrams

Pure domain entity for diagram data with no rendering logic.
"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum


class DiagramType(Enum):
    """Type of diagram to generate"""
    SYSTEM_ARCHITECTURE = "system-architecture"
    DATA_FLOW = "data-flow"
    DEPLOYMENT = "deployment"
    SEQUENCE = "sequence"
    COMPONENT = "component"
    GANTT = "gantt"
    PIE_CHART = "pie-chart"
    BAR_CHART = "bar-chart"
    FLOWCHART = "flowchart"
    ENTITY_RELATIONSHIP = "entity-relationship"


@dataclass
class DiagramStyle:
    """
    Style configuration for diagrams.

    Defines colors, fonts, and visual properties for diagram rendering.
    """

    background_color: str = "#FFFFFF"
    primary_color: str = "#1742F6"  # Deltek Blue
    secondary_color: str = "#081581"  # Navy
    accent_color: str = "#00B6C3"  # Teal
    font_family: str = "Figtree"
    font_size: int = 12
    line_width: int = 2
    node_shape: str = "rounded"
    edge_style: str = "solid"


@dataclass
class Diagram:
    """
    Domain entity for diagrams.

    Represents diagram data and metadata. Rendering is delegated to infrastructure layer.
    """

    id: str
    type: DiagramType
    mermaid_source: str
    style: DiagramStyle
    svg_data: Optional[bytes] = None
    png_data: Optional[bytes] = None
    width: int = 800
    height: int = 600

    def has_rendered_svg(self) -> bool:
        """Check if diagram has been rendered to SVG"""
        return self.svg_data is not None

    def has_rendered_png(self) -> bool:
        """Check if diagram has been rendered to PNG"""
        return self.png_data is not None

    def get_source_hash(self) -> str:
        """
        Get a hash of the Mermaid source for caching.

        Returns:
            Hash string (simplified version, real impl would use hashlib)
        """
        # Simple hash for domain layer (no hashlib import)
        return str(hash(self.mermaid_source + str(self.style.primary_color)))

    def validate(self) -> list[str]:
        """
        Validate the diagram and return list of errors.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        if not self.mermaid_source:
            errors.append(f"Diagram {self.id}: mermaid_source is required")

        if self.width <= 0:
            errors.append(f"Diagram {self.id}: width must be positive")

        if self.height <= 0:
            errors.append(f"Diagram {self.id}: height must be positive")

        return errors

    def is_valid(self) -> bool:
        """Check if diagram is valid"""
        return len(self.validate()) == 0
