"""
Audience Profile Entity - Domain model for audience preferences

Pure domain entity with no external dependencies.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
from enum import Enum


class AudienceType(Enum):
    """Type of audience for the presentation"""
    C_SUITE = "c-suite"  # CEO, CTO, CFO - high-level, outcome-focused
    VP_DIRECTOR = "vp-director"  # VP Eng, Director PM - strategic + some detail
    TECHNICAL_LEAD = "tech-lead"  # Architects, leads - deep technical content
    PROJECT_TEAM = "project-team"  # Developers, QA - operational detail
    EXTERNAL_CLIENT = "external"  # Clients - polished, business-focused
    BOARD = "board"  # Board members - financial, strategic


class DetailLevel(Enum):
    """Level of detail for presentation content"""
    MINIMAL = 1  # 3-5 slides, key metrics only
    STANDARD = 2  # 7-10 slides, balanced detail
    DETAILED = 3  # 12-18 slides, comprehensive
    DEEP_DIVE = 4  # 20+ slides, exhaustive


@dataclass
class AudienceProfile:
    """
    Domain entity for audience profiles.

    Represents the preferences and characteristics of a target audience.
    Used to customize presentation content, style, and detail level.
    """

    id: str
    name: str
    type: AudienceType
    detail_level: DetailLevel
    interests: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    technical_depth: float = 0.5  # 0.0 = non-technical, 1.0 = highly technical

    def __post_init__(self):
        """Validate technical_depth range"""
        if not 0.0 <= self.technical_depth <= 1.0:
            raise ValueError("technical_depth must be between 0.0 and 1.0")

    def is_technical_audience(self) -> bool:
        """Check if audience is technical"""
        return self.type in [AudienceType.TECHNICAL_LEAD, AudienceType.PROJECT_TEAM]

    def is_executive_audience(self) -> bool:
        """Check if audience is executive level"""
        return self.type in [AudienceType.C_SUITE, AudienceType.BOARD]

    def is_external_audience(self) -> bool:
        """Check if audience is external"""
        return self.type == AudienceType.EXTERNAL_CLIENT

    def get_max_bullet_points(self) -> int:
        """
        Get recommended maximum bullet points per slide.

        Returns:
            Maximum number of bullet points based on audience type
        """
        if self.is_executive_audience():
            return 3
        elif self.type == AudienceType.VP_DIRECTOR:
            return 5
        else:
            return 7

    def get_max_words_per_bullet(self) -> int:
        """
        Get recommended maximum words per bullet point.

        Returns:
            Maximum words per bullet based on audience type
        """
        if self.is_executive_audience():
            return 15
        elif self.type == AudienceType.VP_DIRECTOR:
            return 20
        else:
            return 30

    def get_recommended_slide_count(self) -> tuple[int, int]:
        """
        Get recommended slide count range for this audience.

        Returns:
            Tuple of (min_slides, max_slides)
        """
        ranges = {
            DetailLevel.MINIMAL: (3, 5),
            DetailLevel.STANDARD: (7, 10),
            DetailLevel.DETAILED: (12, 18),
            DetailLevel.DEEP_DIVE: (20, 30),
        }
        return ranges.get(self.detail_level, (7, 10))

    def get_tone(self) -> str:
        """
        Get recommended tone for content.

        Returns:
            Tone descriptor (executive, technical, client-facing)
        """
        if self.is_executive_audience():
            return "executive"
        elif self.is_external_audience():
            return "client-facing"
        elif self.is_technical_audience():
            return "technical"
        else:
            return "balanced"

    def add_interest(self, interest: str) -> None:
        """
        Add an interest to the audience profile.

        Args:
            interest: Topic or area of interest
        """
        if interest not in self.interests:
            self.interests.append(interest)

    def remove_interest(self, interest: str) -> None:
        """
        Remove an interest from the audience profile.

        Args:
            interest: Topic or area of interest to remove
        """
        if interest in self.interests:
            self.interests.remove(interest)

    def set_preference(self, key: str, value: Any) -> None:
        """
        Set a preference for the audience.

        Args:
            key: Preference key
            value: Preference value
        """
        self.preferences[key] = value

    def get_preference(self, key: str, default: Any = None) -> Any:
        """
        Get a preference value.

        Args:
            key: Preference key
            default: Default value if key not found

        Returns:
            Preference value or default
        """
        return self.preferences.get(key, default)

    def validate(self) -> List[str]:
        """
        Validate the audience profile and return list of errors.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        if not self.name:
            errors.append("Audience name is required")

        if not 0.0 <= self.technical_depth <= 1.0:
            errors.append("technical_depth must be between 0.0 and 1.0")

        return errors

    def is_valid(self) -> bool:
        """Check if audience profile is valid"""
        return len(self.validate()) == 0
