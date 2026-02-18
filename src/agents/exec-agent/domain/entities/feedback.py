"""
Feedback Domain Entity - Multi-signal feedback data

Pure domain entity with no external dependencies.
Represents all feedback signals collected from presentation generations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional


class FeedbackType(Enum):
    """Type of feedback signal"""
    EXPLICIT = "explicit"      # User-provided rating/comments
    IMPLICIT = "implicit"      # Derived from behavior (edits, reuse, etc.)
    SYSTEM = "system"          # Automated quality scores


class SignalType(Enum):
    """Specific signal types for learning"""
    RATING = "rating"                    # Explicit 1-5 star rating
    QUALITY = "quality"                  # Automated quality score
    BRAND = "brand"                      # Brand compliance score
    EDIT = "edit"                        # Slide edit tracking (inverse)
    REUSE = "reuse"                      # Presentation reuse frequency
    AGENT = "agent"                      # Cross-agent references


@dataclass
class FeedbackSignal:
    """
    Individual feedback signal with value, weight, and confidence.

    Value is normalized to 0.0-1.0 range where 1.0 is best.
    """
    signal_type: SignalType
    value: float                         # 0.0 to 1.0
    weight: float                        # From ADR-031 weights
    confidence: float                    # 0.0 to 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate signal values"""
        if not 0.0 <= self.value <= 1.0:
            raise ValueError(f"Signal value must be 0.0-1.0, got {self.value}")
        if not 0.0 <= self.weight <= 1.0:
            raise ValueError(f"Signal weight must be 0.0-1.0, got {self.weight}")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Signal confidence must be 0.0-1.0, got {self.confidence}")

    def weighted_value(self) -> float:
        """Get weighted signal value"""
        return self.value * self.weight * self.confidence

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'signal_type': self.signal_type.value,
            'value': self.value,
            'weight': self.weight,
            'confidence': self.confidence,
            'metadata': self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FeedbackSignal':
        """Deserialize from dictionary"""
        return cls(
            signal_type=SignalType(data['signal_type']),
            value=data['value'],
            weight=data['weight'],
            confidence=data['confidence'],
            metadata=data.get('metadata', {}),
        )


@dataclass
class Feedback:
    """
    Complete feedback record with multi-signal data.

    Aggregates all feedback signals for a single presentation generation.
    """
    id: str
    presentation_id: str
    feedback_type: FeedbackType
    signals: Dict[str, FeedbackSignal]   # signal_type.value -> FeedbackSignal
    timestamp: datetime = field(default_factory=datetime.now)
    notes: Optional[str] = None

    def add_signal(self, signal: FeedbackSignal) -> None:
        """Add a feedback signal"""
        self.signals[signal.signal_type.value] = signal

    def get_signal(self, signal_type: SignalType) -> Optional[FeedbackSignal]:
        """Get a specific signal by type"""
        return self.signals.get(signal_type.value)

    def has_signal(self, signal_type: SignalType) -> bool:
        """Check if signal type exists"""
        return signal_type.value in self.signals

    def get_weighted_score(self) -> float:
        """
        Calculate overall weighted score from all signals.

        Returns:
            Weighted average of all signals (0.0-1.0)
        """
        if not self.signals:
            return 0.5  # Neutral score if no signals

        total_weighted = sum(signal.weighted_value() for signal in self.signals.values())
        total_weights = sum(signal.weight * signal.confidence for signal in self.signals.values())

        if total_weights == 0:
            return 0.5

        return total_weighted / total_weights

    def get_signal_breakdown(self) -> Dict[str, float]:
        """Get breakdown of signal contributions"""
        return {
            signal_type: signal.weighted_value()
            for signal_type, signal in self.signals.items()
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'id': self.id,
            'presentation_id': self.presentation_id,
            'feedback_type': self.feedback_type.value,
            'signals': {
                signal_type: signal.to_dict()
                for signal_type, signal in self.signals.items()
            },
            'timestamp': self.timestamp.isoformat(),
            'notes': self.notes,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Feedback':
        """Deserialize from dictionary"""
        return cls(
            id=data['id'],
            presentation_id=data['presentation_id'],
            feedback_type=FeedbackType(data['feedback_type']),
            signals={
                signal_type: FeedbackSignal.from_dict(signal_data)
                for signal_type, signal_data in data['signals'].items()
            },
            timestamp=datetime.fromisoformat(data['timestamp']),
            notes=data.get('notes'),
        )
