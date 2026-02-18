"""
Bayesian Learning Model - Core learning logic

Pure domain entity implementing Bayesian preference learning with Beta distributions.
Thompson Sampling for multi-armed bandit optimization.

NO external dependencies (scipy is only in infrastructure layer).
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Tuple, List, Optional, Any
from enum import Enum
import math


class AudienceType(Enum):
    """Audience types matching presentation.py"""
    C_SUITE = "c-suite"
    VP_DIRECTOR = "vp-director"
    TECHNICAL_LEAD = "tech-lead"
    PROJECT_TEAM = "project-team"
    EXTERNAL_CLIENT = "external"
    BOARD = "board"


class SlideType(Enum):
    """Slide types matching slide.py"""
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


@dataclass
class BetaDistribution:
    """
    Beta distribution for Bayesian learning.

    Represents belief about effectiveness as Beta(alpha, beta).
    """
    alpha: float = 1.0   # Success count + prior
    beta: float = 1.0    # Failure count + prior

    def __post_init__(self):
        """Validate parameters"""
        if self.alpha <= 0 or self.beta <= 0:
            raise ValueError(f"Beta parameters must be positive: alpha={self.alpha}, beta={self.beta}")

    def mean(self) -> float:
        """Expected value (effectiveness score)"""
        return self.alpha / (self.alpha + self.beta)

    def variance(self) -> float:
        """Variance (uncertainty)"""
        n = self.alpha + self.beta
        return (self.alpha * self.beta) / (n * n * (n + 1))

    def std_dev(self) -> float:
        """Standard deviation"""
        return math.sqrt(self.variance())

    def confidence(self) -> float:
        """
        Confidence level (0.0-1.0).

        Higher observation count = higher confidence.
        Normalized to 0-1 range using sigmoid-like function.
        """
        n = self.alpha + self.beta
        # More observations = more confidence
        # Reaches ~0.95 confidence at n=100
        return 1.0 - (1.0 / (1.0 + (n / 10.0)))

    def confidence_interval(self, confidence_level: float = 0.95) -> Tuple[float, float]:
        """
        Calculate confidence interval.

        Args:
            confidence_level: Confidence level (e.g., 0.95 for 95%)

        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        # Simple approximation using +/- 2 standard deviations (~95% CI)
        mean = self.mean()
        std = self.std_dev()
        z_score = 2.0 if confidence_level >= 0.95 else 1.64  # 95% or 90%

        lower = max(0.0, mean - z_score * std)
        upper = min(1.0, mean + z_score * std)

        return (lower, upper)

    def observation_count(self) -> int:
        """Total number of observations (excluding prior)"""
        # Assuming prior strength of 10 (alpha_0 + beta_0 = 10)
        return int(self.alpha + self.beta - 10)

    def update(self, success_weight: float, failure_weight: float) -> 'BetaDistribution':
        """
        Create updated distribution with new evidence.

        Args:
            success_weight: Weighted success evidence
            failure_weight: Weighted failure evidence

        Returns:
            New BetaDistribution with updated parameters
        """
        return BetaDistribution(
            alpha=self.alpha + success_weight,
            beta=self.beta + failure_weight,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'alpha': self.alpha,
            'beta': self.beta,
            'mean': self.mean(),
            'confidence': self.confidence(),
            'observations': self.observation_count(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BetaDistribution':
        """Deserialize from dictionary"""
        return cls(
            alpha=data['alpha'],
            beta=data['beta'],
        )


@dataclass
class EffectivenessScore:
    """
    Effectiveness score for a (audience, slide_type) pair.
    """
    audience_type: AudienceType
    slide_type: SlideType
    distribution: BetaDistribution
    last_updated: datetime = field(default_factory=datetime.now)
    trend: str = "stable"  # "improving", "stable", "declining"

    def effectiveness(self) -> float:
        """Get effectiveness score (0.0-1.0)"""
        return self.distribution.mean()

    def confidence(self) -> float:
        """Get confidence level (0.0-1.0)"""
        return self.distribution.confidence()

    def confidence_interval_95(self) -> Tuple[float, float]:
        """Get 95% confidence interval"""
        return self.distribution.confidence_interval(0.95)

    def is_high_confidence(self, threshold: float = 0.7) -> bool:
        """Check if confidence is above threshold"""
        return self.confidence() >= threshold

    def is_effective(self, threshold: float = 0.7) -> bool:
        """Check if effectiveness is above threshold"""
        return self.effectiveness() >= threshold

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        ci_lower, ci_upper = self.confidence_interval_95()
        return {
            'audience_type': self.audience_type.value,
            'slide_type': self.slide_type.value,
            'effectiveness': self.effectiveness(),
            'confidence': self.confidence(),
            'confidence_interval_95': [ci_lower, ci_upper],
            'observations': self.distribution.observation_count(),
            'distribution': self.distribution.to_dict(),
            'last_updated': self.last_updated.isoformat(),
            'trend': self.trend,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EffectivenessScore':
        """Deserialize from dictionary"""
        return cls(
            audience_type=AudienceType(data['audience_type']),
            slide_type=SlideType(data['slide_type']),
            distribution=BetaDistribution.from_dict(data['distribution']),
            last_updated=datetime.fromisoformat(data['last_updated']),
            trend=data.get('trend', 'stable'),
        )


@dataclass
class BayesianPreferenceModel:
    """
    Bayesian preference learning model.

    Uses Beta distributions to model effectiveness for each (audience, slide_type) pair.
    Thompson Sampling for exploration/exploitation balance.
    """
    # Effectiveness scores indexed by (audience_type.value, slide_type.value)
    scores: Dict[Tuple[str, str], EffectivenessScore] = field(default_factory=dict)

    # Time decay rate (exponential decay for older signals)
    decay_rate: float = 0.05  # ~60% weight after 10 days

    # Prior initialization (expert knowledge)
    priors: Dict[Tuple[str, str], Tuple[float, float]] = field(default_factory=dict)

    def __post_init__(self):
        """Initialize with expert priors if not already set"""
        if not self.priors:
            self._initialize_priors()

    def _initialize_priors(self) -> None:
        """
        Initialize expert-derived priors.

        Strong priors (alpha + beta = 10) based on presentation best practices.
        """
        # C-suite preferences
        self.priors[(AudienceType.C_SUITE.value, SlideType.EXECUTIVE_SUMMARY.value)] = (8.0, 2.0)
        self.priors[(AudienceType.C_SUITE.value, SlideType.KEY_METRICS.value)] = (7.0, 3.0)
        self.priors[(AudienceType.C_SUITE.value, SlideType.COST_BREAKDOWN.value)] = (6.0, 4.0)
        self.priors[(AudienceType.C_SUITE.value, SlideType.ARCHITECTURE_DETAIL.value)] = (2.0, 8.0)
        self.priors[(AudienceType.C_SUITE.value, SlideType.ARCHITECTURE_OVERVIEW.value)] = (3.0, 7.0)

        # Technical lead preferences
        self.priors[(AudienceType.TECHNICAL_LEAD.value, SlideType.ARCHITECTURE_DETAIL.value)] = (8.0, 2.0)
        self.priors[(AudienceType.TECHNICAL_LEAD.value, SlideType.ARCHITECTURE_OVERVIEW.value)] = (5.0, 5.0)
        self.priors[(AudienceType.TECHNICAL_LEAD.value, SlideType.AGENT_PERFORMANCE.value)] = (7.0, 3.0)
        self.priors[(AudienceType.TECHNICAL_LEAD.value, SlideType.SECURITY_POSTURE.value)] = (6.0, 4.0)

        # Default neutral prior for unspecified combinations
        # Will be used when pair is first encountered

    def get_or_create_score(
        self,
        audience_type: AudienceType,
        slide_type: SlideType,
    ) -> EffectivenessScore:
        """
        Get existing effectiveness score or create with prior.

        Args:
            audience_type: Audience type
            slide_type: Slide type

        Returns:
            EffectivenessScore for this pair
        """
        key = (audience_type.value, slide_type.value)

        if key not in self.scores:
            # Initialize with prior or neutral default
            prior = self.priors.get(key, (5.0, 5.0))  # Neutral default
            self.scores[key] = EffectivenessScore(
                audience_type=audience_type,
                slide_type=slide_type,
                distribution=BetaDistribution(alpha=prior[0], beta=prior[1]),
            )

        return self.scores[key]

    def calculate_time_decay(self, timestamp: datetime) -> float:
        """
        Calculate time decay factor for signal.

        Args:
            timestamp: When the feedback was recorded

        Returns:
            Decay factor (0.0-1.0)
        """
        age_days = (datetime.now() - timestamp).days
        return math.exp(-self.decay_rate * age_days)

    def update_from_feedback(
        self,
        audience_type: AudienceType,
        slide_type: SlideType,
        weighted_success: float,
        weighted_failure: float,
        timestamp: datetime,
    ) -> None:
        """
        Update effectiveness score with new feedback.

        Args:
            audience_type: Audience type
            slide_type: Slide type
            weighted_success: Weighted success evidence (0.0-1.0)
            weighted_failure: Weighted failure evidence (0.0-1.0)
            timestamp: When feedback was recorded
        """
        score = self.get_or_create_score(audience_type, slide_type)

        # Apply time decay
        decay = self.calculate_time_decay(timestamp)
        success_evidence = weighted_success * decay
        failure_evidence = weighted_failure * decay

        # Bayesian update
        score.distribution = score.distribution.update(success_evidence, failure_evidence)
        score.last_updated = datetime.now()

    def get_effectiveness_matrix(
        self,
        audience_type: AudienceType,
    ) -> Dict[str, float]:
        """
        Get effectiveness scores for all slide types for an audience.

        Args:
            audience_type: Audience type

        Returns:
            Dict mapping slide_type.value to effectiveness score
        """
        matrix = {}
        for slide_type in SlideType:
            score = self.get_or_create_score(audience_type, slide_type)
            matrix[slide_type.value] = score.effectiveness()

        return matrix

    def get_top_slides(
        self,
        audience_type: AudienceType,
        min_effectiveness: float = 0.6,
        limit: Optional[int] = None,
    ) -> List[Tuple[SlideType, float]]:
        """
        Get top-performing slide types for an audience.

        Args:
            audience_type: Audience type
            min_effectiveness: Minimum effectiveness threshold
            limit: Maximum number of results

        Returns:
            List of (slide_type, effectiveness) tuples, sorted descending
        """
        scores = []
        for slide_type in SlideType:
            score = self.get_or_create_score(audience_type, slide_type)
            eff = score.effectiveness()
            if eff >= min_effectiveness:
                scores.append((slide_type, eff))

        scores.sort(key=lambda x: x[1], reverse=True)

        if limit:
            return scores[:limit]

        return scores

    def to_dict(self) -> Dict[str, Any]:
        """Serialize model to dictionary"""
        return {
            'version': '1.0',
            'updated_at': datetime.now().isoformat(),
            'decay_rate': self.decay_rate,
            'scores': {
                f"{aud}:{slide}": score.to_dict()
                for (aud, slide), score in self.scores.items()
            },
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BayesianPreferenceModel':
        """Deserialize model from dictionary"""
        model = cls(decay_rate=data.get('decay_rate', 0.05))

        # Reconstruct scores
        for key_str, score_data in data.get('scores', {}).items():
            score = EffectivenessScore.from_dict(score_data)
            key = (score.audience_type.value, score.slide_type.value)
            model.scores[key] = score

        return model
