"""
Quality Score Value Object - Represents presentation quality metrics

Pure value object with no external dependencies.
"""

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class QualityScore:
    """
    Immutable value object for quality scoring.

    Represents multi-dimensional quality assessment of a presentation.
    """

    overall: float  # 0.0 - 1.0
    content_relevance: float  # 0.0 - 1.0
    visual_quality: float  # 0.0 - 1.0
    brand_compliance: float  # 0.0 - 1.0
    audience_fit: float  # 0.0 - 1.0
    data_accuracy: float  # 0.0 - 1.0

    def __post_init__(self):
        """Validate score ranges"""
        for field_name in ['overall', 'content_relevance', 'visual_quality',
                           'brand_compliance', 'audience_fit', 'data_accuracy']:
            value = getattr(self, field_name)
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"{field_name} must be between 0.0 and 1.0, got {value}")

    def meets_threshold(self, threshold: float = 0.7) -> bool:
        """
        Check if overall score meets threshold.

        Args:
            threshold: Minimum acceptable score (default 0.7)

        Returns:
            True if meets threshold, False otherwise
        """
        return self.overall >= threshold

    def needs_enhancement(self, threshold: float = 0.5) -> bool:
        """
        Check if score is below enhancement threshold.

        Args:
            threshold: Threshold for enhancement (default 0.5)

        Returns:
            True if needs enhancement, False otherwise
        """
        return self.overall < threshold

    def get_breakdown(self) -> Dict[str, float]:
        """
        Get detailed score breakdown.

        Returns:
            Dictionary of all score dimensions
        """
        return {
            'overall': self.overall,
            'content_relevance': self.content_relevance,
            'visual_quality': self.visual_quality,
            'brand_compliance': self.brand_compliance,
            'audience_fit': self.audience_fit,
            'data_accuracy': self.data_accuracy,
        }

    def get_weakest_dimension(self) -> tuple[str, float]:
        """
        Get the weakest scoring dimension.

        Returns:
            Tuple of (dimension_name, score)
        """
        breakdown = self.get_breakdown()
        # Exclude overall from weakness analysis
        dimensions = {k: v for k, v in breakdown.items() if k != 'overall'}
        weakest = min(dimensions.items(), key=lambda x: x[1])
        return weakest

    def get_strongest_dimension(self) -> tuple[str, float]:
        """
        Get the strongest scoring dimension.

        Returns:
            Tuple of (dimension_name, score)
        """
        breakdown = self.get_breakdown()
        # Exclude overall from strength analysis
        dimensions = {k: v for k, v in breakdown.items() if k != 'overall'}
        strongest = max(dimensions.items(), key=lambda x: x[1])
        return strongest

    def to_dict(self) -> Dict[str, float]:
        """
        Convert to dictionary for serialization.

        Returns:
            Dictionary representation
        """
        return self.get_breakdown()

    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> 'QualityScore':
        """
        Create QualityScore from dictionary.

        Args:
            data: Dictionary with score values

        Returns:
            QualityScore instance
        """
        return cls(
            overall=data.get('overall', 0.0),
            content_relevance=data.get('content_relevance', 0.0),
            visual_quality=data.get('visual_quality', 0.0),
            brand_compliance=data.get('brand_compliance', 0.0),
            audience_fit=data.get('audience_fit', 0.0),
            data_accuracy=data.get('data_accuracy', 0.0),
        )

    @classmethod
    def calculate_overall(
        cls,
        content_relevance: float,
        visual_quality: float,
        brand_compliance: float,
        audience_fit: float,
        data_accuracy: float,
    ) -> float:
        """
        Calculate weighted overall score.

        Weights:
        - Content Relevance: 0.25
        - Visual Quality: 0.20
        - Brand Compliance: 0.15
        - Audience Fit: 0.20
        - Data Accuracy: 0.20

        Args:
            content_relevance: Content relevance score
            visual_quality: Visual quality score
            brand_compliance: Brand compliance score
            audience_fit: Audience fit score
            data_accuracy: Data accuracy score

        Returns:
            Weighted overall score
        """
        weights = {
            'content_relevance': 0.25,
            'visual_quality': 0.20,
            'brand_compliance': 0.15,
            'audience_fit': 0.20,
            'data_accuracy': 0.20,
        }

        overall = (
            content_relevance * weights['content_relevance'] +
            visual_quality * weights['visual_quality'] +
            brand_compliance * weights['brand_compliance'] +
            audience_fit * weights['audience_fit'] +
            data_accuracy * weights['data_accuracy']
        )

        return min(max(overall, 0.0), 1.0)  # Clamp to [0.0, 1.0]

    @classmethod
    def create(
        cls,
        content_relevance: float,
        visual_quality: float,
        brand_compliance: float,
        audience_fit: float,
        data_accuracy: float,
    ) -> 'QualityScore':
        """
        Create QualityScore with automatic overall calculation.

        Args:
            content_relevance: Content relevance score
            visual_quality: Visual quality score
            brand_compliance: Brand compliance score
            audience_fit: Audience fit score
            data_accuracy: Data accuracy score

        Returns:
            QualityScore instance with calculated overall
        """
        overall = cls.calculate_overall(
            content_relevance,
            visual_quality,
            brand_compliance,
            audience_fit,
            data_accuracy,
        )

        return cls(
            overall=overall,
            content_relevance=content_relevance,
            visual_quality=visual_quality,
            brand_compliance=brand_compliance,
            audience_fit=audience_fit,
            data_accuracy=data_accuracy,
        )
