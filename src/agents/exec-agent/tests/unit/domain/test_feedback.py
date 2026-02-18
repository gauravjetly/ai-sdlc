"""
Unit tests for Feedback domain entity
"""

import pytest
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from domain.entities.feedback import (
    Feedback,
    FeedbackSignal,
    FeedbackType,
    SignalType,
)


def test_feedback_signal_creation():
    """Test creating a feedback signal"""
    signal = FeedbackSignal(
        signal_type=SignalType.RATING,
        value=0.8,
        weight=0.4,
        confidence=1.0,
        metadata={'rating': 4},
    )

    assert signal.signal_type == SignalType.RATING
    assert signal.value == 0.8
    assert signal.weight == 0.4
    assert signal.confidence == 1.0


def test_feedback_signal_weighted_value():
    """Test weighted value calculation"""
    signal = FeedbackSignal(
        signal_type=SignalType.RATING,
        value=0.8,
        weight=0.4,
        confidence=1.0,
    )

    assert abs(signal.weighted_value() - 0.32) < 0.001  # 0.8 * 0.4 * 1.0


def test_feedback_signal_validation():
    """Test signal value validation"""
    with pytest.raises(ValueError):
        FeedbackSignal(
            signal_type=SignalType.RATING,
            value=1.5,  # Invalid: > 1.0
            weight=0.4,
            confidence=1.0,
        )


def test_feedback_creation():
    """Test creating feedback with signals"""
    feedback = Feedback(
        id="fb-001",
        presentation_id="pres-001",
        feedback_type=FeedbackType.EXPLICIT,
        signals={},
    )

    assert feedback.id == "fb-001"
    assert feedback.presentation_id == "pres-001"
    assert feedback.feedback_type == FeedbackType.EXPLICIT


def test_feedback_add_signal():
    """Test adding signals to feedback"""
    feedback = Feedback(
        id="fb-001",
        presentation_id="pres-001",
        feedback_type=FeedbackType.EXPLICIT,
        signals={},
    )

    signal = FeedbackSignal(
        signal_type=SignalType.RATING,
        value=0.8,
        weight=0.4,
        confidence=1.0,
    )

    feedback.add_signal(signal)

    assert feedback.has_signal(SignalType.RATING)
    assert feedback.get_signal(SignalType.RATING) == signal


def test_feedback_weighted_score():
    """Test calculating overall weighted score"""
    feedback = Feedback(
        id="fb-001",
        presentation_id="pres-001",
        feedback_type=FeedbackType.EXPLICIT,
        signals={},
    )

    # Add multiple signals
    feedback.add_signal(FeedbackSignal(
        signal_type=SignalType.RATING,
        value=0.8,
        weight=0.4,
        confidence=1.0,
    ))

    feedback.add_signal(FeedbackSignal(
        signal_type=SignalType.QUALITY,
        value=0.7,
        weight=0.2,
        confidence=1.0,
    ))

    # weighted_score = (0.8 * 0.4 * 1.0 + 0.7 * 0.2 * 1.0) / (0.4 * 1.0 + 0.2 * 1.0)
    # = (0.32 + 0.14) / 0.6 = 0.46 / 0.6 = 0.7666...
    score = feedback.get_weighted_score()
    assert 0.76 < score < 0.77


def test_feedback_serialization():
    """Test feedback to_dict and from_dict"""
    original = Feedback(
        id="fb-001",
        presentation_id="pres-001",
        feedback_type=FeedbackType.EXPLICIT,
        signals={},
        notes="Great presentation!",
    )

    original.add_signal(FeedbackSignal(
        signal_type=SignalType.RATING,
        value=0.8,
        weight=0.4,
        confidence=1.0,
    ))

    # Serialize
    data = original.to_dict()

    # Deserialize
    restored = Feedback.from_dict(data)

    assert restored.id == original.id
    assert restored.presentation_id == original.presentation_id
    assert restored.feedback_type == original.feedback_type
    assert restored.notes == original.notes
    assert restored.has_signal(SignalType.RATING)
