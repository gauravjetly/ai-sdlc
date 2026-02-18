"""
Presentation Entity - Core domain model for presentations

This is a pure domain entity with no external dependencies.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from enum import Enum


class PresentationStatus(Enum):
    """Status of a presentation"""
    DRAFT = "draft"
    GENERATED = "generated"
    REVIEWED = "reviewed"
    PUBLISHED = "published"


class PresentationType(Enum):
    """Type of presentation to generate"""
    EXECUTIVE_SUMMARY = "executive-summary"
    ARCHITECTURE_REVIEW = "architecture-review"
    STATUS_REPORT = "status-report"
    SPRINT_REVIEW = "sprint-review"
    SECURITY_BRIEFING = "security-briefing"
    COST_ANALYSIS = "cost-analysis"
    STAKEHOLDER_UPDATE = "stakeholder-update"
    TECHNICAL_DEEP_DIVE = "technical-deep-dive"


@dataclass
class Presentation:
    """
    Core domain entity for presentations.

    Represents a complete presentation with slides, audience context,
    and brand configuration. This is a pure domain object with business logic only.
    """

    id: str
    project_id: str
    type: PresentationType
    status: PresentationStatus
    title: str
    slides: List['Slide'] = field(default_factory=list)
    audience_profile: Optional['AudienceProfile'] = None
    brand_config: Optional['BrandConfig'] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: int = 1
    version_hash: Optional[str] = None
    parent_version_hash: Optional[str] = None  # For version history tracking
    quality_score: Optional[float] = None      # Overall quality score (0.0-1.0)

    def add_slide(self, slide: 'Slide') -> None:
        """
        Add a slide to the presentation.

        Args:
            slide: The slide to add
        """
        self.slides.append(slide)
        self.updated_at = datetime.now()

    def get_slide_count(self) -> int:
        """Get total number of slides"""
        return len(self.slides)

    def mark_as_generated(self) -> None:
        """Mark presentation as generated"""
        self.status = PresentationStatus.GENERATED
        self.updated_at = datetime.now()

    def mark_as_reviewed(self) -> None:
        """Mark presentation as reviewed"""
        self.status = PresentationStatus.REVIEWED
        self.updated_at = datetime.now()

    def mark_as_published(self) -> None:
        """Mark presentation as published"""
        self.status = PresentationStatus.PUBLISHED
        self.updated_at = datetime.now()

    def get_slide_by_id(self, slide_id: str) -> Optional['Slide']:
        """
        Get a slide by its ID.

        Args:
            slide_id: The slide ID to search for

        Returns:
            The slide if found, None otherwise
        """
        for slide in self.slides:
            if slide.id == slide_id:
                return slide
        return None

    def remove_slide(self, slide_id: str) -> bool:
        """
        Remove a slide by its ID.

        Args:
            slide_id: The slide ID to remove

        Returns:
            True if slide was removed, False if not found
        """
        for i, slide in enumerate(self.slides):
            if slide.id == slide_id:
                self.slides.pop(i)
                self.updated_at = datetime.now()
                return True
        return False

    def reorder_slides(self) -> None:
        """Reorder slides based on their order attribute"""
        self.slides.sort(key=lambda s: s.order)
        self.updated_at = datetime.now()

    def validate(self) -> List[str]:
        """
        Validate the presentation and return list of errors.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        if not self.title:
            errors.append("Presentation title is required")

        if not self.slides:
            errors.append("Presentation must have at least one slide")

        if self.audience_profile is None:
            errors.append("Audience profile is required")

        if self.brand_config is None:
            errors.append("Brand configuration is required")

        # Validate slide order consistency
        orders = [slide.order for slide in self.slides]
        if len(orders) != len(set(orders)):
            errors.append("Slide orders must be unique")

        return errors

    def is_valid(self) -> bool:
        """Check if presentation is valid"""
        return len(self.validate()) == 0
