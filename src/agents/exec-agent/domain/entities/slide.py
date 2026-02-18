"""
Slide Entity - Domain model for individual slides

Pure domain entity with no external dependencies.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum


class SlideType(Enum):
    """Type of slide content"""
    TITLE = "title"
    EXECUTIVE_SUMMARY = "executive-summary"
    KEY_METRICS = "key-metrics"
    ARCHITECTURE_OVERVIEW = "architecture-overview"
    ARCHITECTURE_DETAIL = "architecture-detail"
    STATUS_DASHBOARD = "status-dashboard"
    TIMELINE = "timeline"
    AGENT_PERFORMANCE = "agent-performance"
    COST_BREAKDOWN = "cost-breakdown"
    RISK_MATRIX = "risk-matrix"
    SECURITY_POSTURE = "security-posture"
    NEXT_STEPS = "next-steps"
    APPENDIX = "appendix"
    CONTENT = "content"
    DIAGRAM = "diagram"
    METRICS = "metrics"
    SUMMARY = "summary"


class ContentLayout(Enum):
    """Layout style for slide content"""
    TITLE_ONLY = "title_only"
    TITLE_CONTENT = "title_content"
    TWO_COLUMN = "two_column"
    FULL_DIAGRAM = "full_diagram"
    GRID = "grid"
    BLANK = "blank"


@dataclass
class Slide:
    """
    Domain entity for a single slide.

    Represents the content, layout, and visual elements of a presentation slide.
    """

    id: str
    type: SlideType
    layout: ContentLayout
    title: str
    content: Dict[str, Any] = field(default_factory=dict)
    diagrams: List['Diagram'] = field(default_factory=list)
    notes: str = ""
    order: int = 0
    relevance_score: float = 1.0

    def add_diagram(self, diagram: 'Diagram') -> None:
        """
        Add a diagram to the slide.

        Args:
            diagram: The diagram to add
        """
        self.diagrams.append(diagram)

    def set_content(self, key: str, value: Any) -> None:
        """
        Set content for the slide.

        Args:
            key: Content key (e.g., 'headline', 'bullet_points', 'metrics')
            value: Content value
        """
        self.content[key] = value

    def get_content(self, key: str, default: Any = None) -> Any:
        """
        Get content from the slide.

        Args:
            key: Content key to retrieve
            default: Default value if key not found

        Returns:
            Content value or default
        """
        return self.content.get(key, default)

    def has_diagrams(self) -> bool:
        """Check if slide has any diagrams"""
        return len(self.diagrams) > 0

    def get_diagram_count(self) -> int:
        """Get number of diagrams on the slide"""
        return len(self.diagrams)

    def set_bullet_points(self, points: List[str]) -> None:
        """
        Set bullet points for the slide.

        Args:
            points: List of bullet point strings
        """
        self.content['bullet_points'] = points

    def get_bullet_points(self) -> List[str]:
        """Get bullet points from the slide"""
        return self.content.get('bullet_points', [])

    def set_headline(self, headline: str) -> None:
        """
        Set the headline/subtitle for the slide.

        Args:
            headline: Headline text
        """
        self.content['headline'] = headline

    def get_headline(self) -> str:
        """Get the headline from the slide"""
        return self.content.get('headline', '')

    def set_metrics(self, metrics: Dict[str, Any]) -> None:
        """
        Set metrics data for the slide.

        Args:
            metrics: Dictionary of metric names to values
        """
        self.content['metrics'] = metrics

    def get_metrics(self) -> Dict[str, Any]:
        """Get metrics from the slide"""
        return self.content.get('metrics', {})

    def set_narrative(self, narrative: str) -> None:
        """
        Set narrative text for the slide.

        Args:
            narrative: Narrative text
        """
        self.content['narrative'] = narrative

    def get_narrative(self) -> str:
        """Get narrative text from the slide"""
        return self.content.get('narrative', '')

    def validate(self) -> List[str]:
        """
        Validate the slide and return list of errors.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        if not self.title:
            errors.append(f"Slide {self.id}: title is required")

        if self.order < 0:
            errors.append(f"Slide {self.id}: order must be non-negative")

        if not 0.0 <= self.relevance_score <= 1.0:
            errors.append(f"Slide {self.id}: relevance_score must be between 0.0 and 1.0")

        # Validate content based on slide type
        if self.type == SlideType.KEY_METRICS and not self.get_metrics():
            errors.append(f"Slide {self.id}: KEY_METRICS slide must have metrics data")

        if self.type in [SlideType.ARCHITECTURE_OVERVIEW, SlideType.ARCHITECTURE_DETAIL]:
            if self.layout != ContentLayout.FULL_DIAGRAM and not self.has_diagrams():
                errors.append(f"Slide {self.id}: Architecture slide should have diagrams")

        return errors

    def is_valid(self) -> bool:
        """Check if slide is valid"""
        return len(self.validate()) == 0
