"""
Unit tests for Bayesian Learning Model
"""

import pytest
from datetime import datetime, timedelta

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from domain.entities.learning_model import (
    BetaDistribution,
    EffectivenessScore,
    BayesianPreferenceModel,
    AudienceType,
    SlideType,
)


def test_beta_distribution_creation():
    """Test creating a Beta distribution"""
    dist = BetaDistribution(alpha=8.0, beta=2.0)

    assert dist.alpha == 8.0
    assert dist.beta == 2.0


def test_beta_distribution_mean():
    """Test Beta distribution mean calculation"""
    dist = BetaDistribution(alpha=8.0, beta=2.0)

    # Mean = alpha / (alpha + beta) = 8 / 10 = 0.8
    assert dist.mean() == 0.8


def test_beta_distribution_confidence():
    """Test confidence calculation based on observation count"""
    # Few observations = low confidence
    dist_low = BetaDistribution(alpha=5.0, beta=5.0)  # 10 total = 0 observations
    # With current formula: 1 - 1/(1 + 10/10) = 1 - 1/2 = 0.5
    assert 0.4 < dist_low.confidence() < 0.6

    # Many observations = high confidence
    dist_high = BetaDistribution(alpha=55.0, beta=45.0)  # 100 total = 90 observations
    assert dist_high.confidence() > 0.8


def test_beta_distribution_update():
    """Test Bayesian update with new evidence"""
    dist = BetaDistribution(alpha=8.0, beta=2.0)

    # Update with strong success evidence
    updated = dist.update(success_weight=2.0, failure_weight=0.0)

    assert updated.alpha == 10.0
    assert updated.beta == 2.0
    assert updated.mean() > dist.mean()


def test_beta_distribution_confidence_interval():
    """Test confidence interval calculation"""
    dist = BetaDistribution(alpha=8.0, beta=2.0)

    lower, upper = dist.confidence_interval(0.95)

    # Mean is 0.8, CI should be around it
    assert lower < 0.8 < upper
    assert lower > 0.0
    assert upper <= 1.0  # Can equal 1.0 due to min/max clamping


def test_effectiveness_score_creation():
    """Test creating an effectiveness score"""
    score = EffectivenessScore(
        audience_type=AudienceType.C_SUITE,
        slide_type=SlideType.EXECUTIVE_SUMMARY,
        distribution=BetaDistribution(alpha=8.0, beta=2.0),
    )

    assert score.audience_type == AudienceType.C_SUITE
    assert score.slide_type == SlideType.EXECUTIVE_SUMMARY
    assert score.effectiveness() == 0.8


def test_effectiveness_score_high_confidence():
    """Test high confidence detection"""
    # Very low confidence (just priors)
    score_low = EffectivenessScore(
        audience_type=AudienceType.C_SUITE,
        slide_type=SlideType.EXECUTIVE_SUMMARY,
        distribution=BetaDistribution(alpha=3.0, beta=3.0),  # Less than prior
    )
    assert not score_low.is_high_confidence(threshold=0.7)

    # High confidence (many observations)
    score_high = EffectivenessScore(
        audience_type=AudienceType.C_SUITE,
        slide_type=SlideType.EXECUTIVE_SUMMARY,
        distribution=BetaDistribution(alpha=50.0, beta=10.0),
    )
    assert score_high.is_high_confidence(threshold=0.7)


def test_bayesian_model_initialization():
    """Test model initialization with priors"""
    model = BayesianPreferenceModel()

    # Check that priors are set
    assert len(model.priors) > 0

    # C-suite should prefer executive summary (strong prior)
    assert model.priors.get((AudienceType.C_SUITE.value, SlideType.EXECUTIVE_SUMMARY.value)) == (8.0, 2.0)


def test_bayesian_model_get_or_create_score():
    """Test getting or creating effectiveness scores"""
    model = BayesianPreferenceModel()

    # Get score for pair with prior
    score = model.get_or_create_score(AudienceType.C_SUITE, SlideType.EXECUTIVE_SUMMARY)

    assert score.audience_type == AudienceType.C_SUITE
    assert score.slide_type == SlideType.EXECUTIVE_SUMMARY
    assert score.distribution.alpha == 8.0  # From prior
    assert score.distribution.beta == 2.0


def test_bayesian_model_time_decay():
    """Test time decay calculation"""
    model = BayesianPreferenceModel()

    # Recent timestamp = high decay factor
    recent = datetime.now() - timedelta(days=1)
    decay_recent = model.calculate_time_decay(recent)
    assert decay_recent > 0.95  # Nearly 1.0

    # Old timestamp = low decay factor
    old = datetime.now() - timedelta(days=30)
    decay_old = model.calculate_time_decay(old)
    assert decay_old < 0.3  # Much lower


def test_bayesian_model_update_from_feedback():
    """Test updating model with feedback"""
    model = BayesianPreferenceModel()

    # Get initial score
    initial_score = model.get_or_create_score(AudienceType.C_SUITE, SlideType.KEY_METRICS)
    initial_mean = initial_score.effectiveness()

    # Update with positive feedback
    model.update_from_feedback(
        audience_type=AudienceType.C_SUITE,
        slide_type=SlideType.KEY_METRICS,
        weighted_success=0.9,
        weighted_failure=0.1,
        timestamp=datetime.now(),
    )

    # Get updated score
    updated_score = model.get_or_create_score(AudienceType.C_SUITE, SlideType.KEY_METRICS)
    updated_mean = updated_score.effectiveness()

    # Mean should increase with positive feedback
    assert updated_mean > initial_mean


def test_bayesian_model_effectiveness_matrix():
    """Test getting effectiveness matrix for an audience"""
    model = BayesianPreferenceModel()

    matrix = model.get_effectiveness_matrix(AudienceType.C_SUITE)

    # Should have entries for all slide types
    assert len(matrix) == len(SlideType)

    # Executive summary should be highly effective for C-suite (from prior)
    assert matrix[SlideType.EXECUTIVE_SUMMARY.value] > 0.7


def test_bayesian_model_top_slides():
    """Test getting top-performing slides"""
    model = BayesianPreferenceModel()

    top_slides = model.get_top_slides(
        audience_type=AudienceType.C_SUITE,
        min_effectiveness=0.6,
        limit=3,
    )

    # Should return up to 3 slides
    assert len(top_slides) <= 3

    # Each should be above threshold
    for slide_type, effectiveness in top_slides:
        assert effectiveness >= 0.6

    # Should be sorted descending
    for i in range(len(top_slides) - 1):
        assert top_slides[i][1] >= top_slides[i + 1][1]


def test_bayesian_model_serialization():
    """Test model serialization and deserialization"""
    original = BayesianPreferenceModel()

    # Make some updates
    original.update_from_feedback(
        audience_type=AudienceType.C_SUITE,
        slide_type=SlideType.KEY_METRICS,
        weighted_success=0.8,
        weighted_failure=0.2,
        timestamp=datetime.now(),
    )

    # Serialize
    data = original.to_dict()

    # Deserialize
    restored = BayesianPreferenceModel.from_dict(data)

    # Check that scores are preserved
    original_score = original.get_or_create_score(AudienceType.C_SUITE, SlideType.KEY_METRICS)
    restored_score = restored.get_or_create_score(AudienceType.C_SUITE, SlideType.KEY_METRICS)

    assert abs(original_score.effectiveness() - restored_score.effectiveness()) < 0.01
