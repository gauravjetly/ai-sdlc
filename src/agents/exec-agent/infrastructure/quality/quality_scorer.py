"""
Quality Scorer - Automated quality assessment

Evaluates presentation quality across 6 dimensions as per ARCH document.
"""

import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.presentation import Presentation, PresentationType
from domain.entities.audience_profile import AudienceProfile, AudienceType, DetailLevel
from domain.value_objects.quality_score import QualityScore


class QualityScorer:
    """
    Automated quality assessment across 6 dimensions.

    Scoring weights from ARCH document:
    1. Content Relevance: 0.25
    2. Visual Quality: 0.20
    3. Brand Compliance: 0.15
    4. Audience Fit: 0.20
    5. Data Accuracy: 0.15
    6. Narrative Quality: 0.05
    """

    # Expected slide counts per detail level
    SLIDE_COUNT_RANGES = {
        DetailLevel.MINIMAL: (3, 5),
        DetailLevel.STANDARD: (7, 10),
        DetailLevel.DETAILED: (12, 18),
        DetailLevel.DEEP_DIVE: (20, 30),
    }

    def __init__(self):
        """Initialize quality scorer"""
        pass

    def score(
        self,
        presentation: Presentation,
        brand_compliance_score: Optional[float] = None,
        data_freshness_hours: Optional[float] = None,
    ) -> QualityScore:
        """
        Score a presentation across all dimensions.

        Args:
            presentation: Presentation to score
            brand_compliance_score: External brand compliance score (0.0-1.0)
            data_freshness_hours: How old the data is in hours

        Returns:
            QualityScore with overall and dimensional scores
        """
        # Score each dimension
        content_relevance = self._score_content_relevance(presentation, data_freshness_hours)
        visual_quality = self._score_visual_quality(presentation)
        brand_compliance = brand_compliance_score if brand_compliance_score is not None else 0.8
        audience_fit = self._score_audience_fit(presentation)
        data_accuracy = self._score_data_accuracy(presentation, data_freshness_hours)
        narrative_quality = self._score_narrative_quality(presentation)

        # Calculate weighted overall score
        weights = {
            'content_relevance': 0.25,
            'visual_quality': 0.20,
            'brand_compliance': 0.15,
            'audience_fit': 0.20,
            'data_accuracy': 0.15,
            'narrative_quality': 0.05,
        }

        overall = (
            content_relevance * weights['content_relevance'] +
            visual_quality * weights['visual_quality'] +
            brand_compliance * weights['brand_compliance'] +
            audience_fit * weights['audience_fit'] +
            data_accuracy * weights['data_accuracy'] +
            narrative_quality * weights['narrative_quality']
        )

        return QualityScore(
            overall=overall,
            content_relevance=content_relevance,
            visual_quality=visual_quality,
            brand_compliance=brand_compliance,
            audience_fit=audience_fit,
            data_accuracy=data_accuracy,
        )

    def _score_content_relevance(
        self,
        presentation: Presentation,
        data_freshness_hours: Optional[float],
    ) -> float:
        """
        Score content relevance.

        Factors:
        - Data recency
        - Slide completeness
        - Content presence
        """
        score = 0.0

        # Data recency (0.4 weight)
        if data_freshness_hours is not None:
            if data_freshness_hours < 24:
                score += 0.4  # Fresh data
            elif data_freshness_hours < 72:
                score += 0.3  # Recent data
            elif data_freshness_hours < 168:
                score += 0.2  # Week-old data
            else:
                score += 0.1  # Stale data
        else:
            score += 0.3  # Unknown = assume reasonable

        # Slide completeness (0.3 weight)
        if presentation.slides:
            score += 0.3
        else:
            score += 0.0

        # All slides have content (0.3 weight)
        slides_with_content = sum(
            1 for slide in presentation.slides
            if slide.content and slide.get_headline()
        )
        if presentation.slides:
            content_ratio = slides_with_content / len(presentation.slides)
            score += 0.3 * content_ratio
        else:
            score += 0.0

        return min(1.0, score)

    def _score_visual_quality(self, presentation: Presentation) -> float:
        """
        Score visual quality.

        Factors:
        - Diagram presence
        - Visual balance (text vs diagrams)
        - Consistent formatting
        """
        score = 0.0

        if not presentation.slides:
            return 0.0

        # Diagram presence (0.4 weight)
        slides_with_diagrams = sum(
            1 for slide in presentation.slides
            if slide.diagrams and len(slide.diagrams) > 0
        )
        diagram_ratio = slides_with_diagrams / len(presentation.slides)
        # Optimal: 30-50% of slides have diagrams
        if 0.3 <= diagram_ratio <= 0.5:
            score += 0.4
        elif 0.2 <= diagram_ratio <= 0.6:
            score += 0.3
        else:
            score += 0.2

        # Visual balance (0.3 weight)
        # Check for slides with both text and visuals
        balanced_slides = sum(
            1 for slide in presentation.slides
            if slide.get_headline() and slide.diagrams and len(slide.diagrams) > 0
        )
        balance_ratio = balanced_slides / len(presentation.slides)
        score += 0.3 * balance_ratio

        # Consistent formatting (0.3 weight)
        # All slides have proper titles
        slides_with_titles = sum(
            1 for slide in presentation.slides
            if slide.title
        )
        title_ratio = slides_with_titles / len(presentation.slides)
        score += 0.3 * title_ratio

        return min(1.0, score)

    def _score_audience_fit(self, presentation: Presentation) -> float:
        """
        Score audience fit.

        Factors:
        - Slide count matches detail level
        - Tone matches audience
        - Content depth appropriate
        """
        score = 0.0

        if not presentation.audience_profile:
            return 0.5  # Neutral if no profile

        audience = presentation.audience_profile

        # Slide count fit (0.5 weight)
        slide_count = len(presentation.slides)
        min_slides, max_slides = self.SLIDE_COUNT_RANGES.get(
            audience.detail_level,
            (7, 10),
        )

        if min_slides <= slide_count <= max_slides:
            score += 0.5  # Perfect fit
        elif min_slides - 2 <= slide_count <= max_slides + 2:
            score += 0.3  # Close enough
        else:
            score += 0.1  # Off-target

        # Content depth (0.3 weight)
        # For now, assume appropriate depth
        # TODO: Implement text density analysis
        score += 0.25

        # Tone match (0.2 weight)
        # For now, assume appropriate tone
        # TODO: Implement tone analysis
        score += 0.15

        return min(1.0, score)

    def _score_data_accuracy(
        self,
        presentation: Presentation,
        data_freshness_hours: Optional[float],
    ) -> float:
        """
        Score data accuracy.

        Factors:
        - Data freshness
        - Metrics presence
        - No contradictions
        """
        score = 0.0

        # Data freshness (0.5 weight)
        if data_freshness_hours is not None:
            if data_freshness_hours < 24:
                score += 0.5
            elif data_freshness_hours < 72:
                score += 0.4
            else:
                score += 0.2
        else:
            score += 0.3

        # Metrics presence (0.3 weight)
        # Check if slides have numerical data
        slides_with_metrics = sum(
            1 for slide in presentation.slides
            if slide.get_metrics()
        )
        if presentation.slides:
            metrics_ratio = slides_with_metrics / len(presentation.slides)
            # Optimal: 40-60% of slides have metrics
            if 0.4 <= metrics_ratio <= 0.6:
                score += 0.3
            else:
                score += 0.15
        else:
            score += 0.15

        # No stale data warnings (0.2 weight)
        # Assume no warnings unless detected
        score += 0.2

        return min(1.0, score)

    def _score_narrative_quality(self, presentation: Presentation) -> float:
        """
        Score narrative quality.

        Factors:
        - Clear headlines
        - Actionable bullet points
        - Logical flow
        """
        score = 0.0

        if not presentation.slides:
            return 0.0

        # Clear headlines (0.4 weight)
        slides_with_headlines = sum(
            1 for slide in presentation.slides
            if slide.get_headline()
        )
        headline_ratio = slides_with_headlines / len(presentation.slides)
        score += 0.4 * headline_ratio

        # Bullet points present (0.3 weight)
        slides_with_bullets = sum(
            1 for slide in presentation.slides
            if slide.get_bullet_points()
        )
        bullet_ratio = slides_with_bullets / len(presentation.slides)
        score += 0.3 * bullet_ratio

        # Logical flow (0.3 weight)
        # Check if slides are ordered properly
        orders = [slide.order for slide in presentation.slides]
        is_ordered = orders == sorted(orders)
        score += 0.3 if is_ordered else 0.15

        return min(1.0, score)

    def meets_threshold(
        self,
        quality_score: QualityScore,
        threshold: float = 0.70,
    ) -> bool:
        """
        Check if quality score meets threshold.

        Args:
            quality_score: QualityScore to check
            threshold: Minimum acceptable score

        Returns:
            True if score >= threshold
        """
        return quality_score.overall >= threshold

    def needs_enhancement(
        self,
        quality_score: QualityScore,
        threshold: float = 0.50,
    ) -> bool:
        """
        Check if presentation needs enhancement.

        Args:
            quality_score: QualityScore to check
            threshold: Threshold below which enhancement is needed

        Returns:
            True if score < threshold
        """
        return quality_score.overall < threshold

    def identify_weak_dimensions(
        self,
        quality_score: QualityScore,
        threshold: float = 0.60,
    ) -> List[str]:
        """
        Identify dimensions scoring below threshold.

        Args:
            quality_score: QualityScore to analyze
            threshold: Minimum acceptable dimensional score

        Returns:
            List of dimension names scoring below threshold
        """
        weak_dimensions = []

        if quality_score.content_relevance < threshold:
            weak_dimensions.append('content_relevance')
        if quality_score.visual_quality < threshold:
            weak_dimensions.append('visual_quality')
        if quality_score.brand_compliance < threshold:
            weak_dimensions.append('brand_compliance')
        if quality_score.audience_fit < threshold:
            weak_dimensions.append('audience_fit')
        if quality_score.data_accuracy < threshold:
            weak_dimensions.append('data_accuracy')
        if quality_score.narrative_quality < threshold:
            weak_dimensions.append('narrative_quality')

        return weak_dimensions
