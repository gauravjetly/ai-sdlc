"""
Learning Record Value Objects - Records for the learning system

Pure value objects with no external dependencies.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any


@dataclass(frozen=True)
class LearningRecord:
    """
    Immutable record of a presentation generation for learning.

    Captures all relevant data from a generation to feed the learning engine.
    """

    id: str
    presentation_id: str
    timestamp: datetime
    project_id: str
    presentation_type: str
    audience_type: str
    slides_generated: List[str]  # List of SlideType names
    quality_score_overall: float
    quality_score_breakdown: Dict[str, float]
    brand_compliance_score: float
    generation_time_seconds: float
    template_version: str
    data_snapshot_hash: str

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary for serialization.

        Returns:
            Dictionary representation
        """
        return {
            'id': self.id,
            'presentation_id': self.presentation_id,
            'timestamp': self.timestamp.isoformat(),
            'project_id': self.project_id,
            'presentation_type': self.presentation_type,
            'audience_type': self.audience_type,
            'slides_generated': self.slides_generated,
            'quality_score_overall': self.quality_score_overall,
            'quality_score_breakdown': self.quality_score_breakdown,
            'brand_compliance_score': self.brand_compliance_score,
            'generation_time_seconds': self.generation_time_seconds,
            'template_version': self.template_version,
            'data_snapshot_hash': self.data_snapshot_hash,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LearningRecord':
        """
        Create LearningRecord from dictionary.

        Args:
            data: Dictionary with record data

        Returns:
            LearningRecord instance
        """
        return cls(
            id=data['id'],
            presentation_id=data['presentation_id'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            project_id=data['project_id'],
            presentation_type=data['presentation_type'],
            audience_type=data['audience_type'],
            slides_generated=data['slides_generated'],
            quality_score_overall=data['quality_score_overall'],
            quality_score_breakdown=data['quality_score_breakdown'],
            brand_compliance_score=data['brand_compliance_score'],
            generation_time_seconds=data['generation_time_seconds'],
            template_version=data['template_version'],
            data_snapshot_hash=data['data_snapshot_hash'],
        )


@dataclass(frozen=True)
class FeedbackRecord:
    """
    Immutable record of feedback on a presentation.

    Captures explicit and implicit feedback signals for learning.
    """

    id: str
    timestamp: datetime
    presentation_id: str
    generation_record_id: str
    audience_type: str
    explicit_rating: Optional[int] = None  # 1-5 stars
    explicit_notes: Optional[str] = None
    slides_edited: List[str] = field(default_factory=list)  # slide IDs
    slides_deleted: List[str] = field(default_factory=list)  # slide IDs
    slides_reordered: bool = False
    was_shared: bool = False
    was_reused: bool = False
    time_spent_viewing_seconds: Optional[int] = None

    def has_explicit_feedback(self) -> bool:
        """Check if explicit feedback was provided"""
        return self.explicit_rating is not None or self.explicit_notes is not None

    def has_edits(self) -> bool:
        """Check if user made edits"""
        return len(self.slides_edited) > 0 or len(self.slides_deleted) > 0 or self.slides_reordered

    def get_edit_rate(self, total_slides: int) -> float:
        """
        Calculate edit rate (proportion of slides edited).

        Args:
            total_slides: Total number of slides in presentation

        Returns:
            Edit rate between 0.0 and 1.0
        """
        if total_slides == 0:
            return 0.0
        return len(self.slides_edited) / total_slides

    def get_satisfaction_signal(self, total_slides: int) -> float:
        """
        Calculate satisfaction signal from all feedback.

        Combines explicit rating, edit rate, reuse, and sharing into a single signal.

        Args:
            total_slides: Total number of slides in presentation

        Returns:
            Satisfaction score between 0.0 and 1.0
        """
        signals = []

        # Explicit rating signal (0.0 to 1.0)
        if self.explicit_rating is not None:
            signals.append((self.explicit_rating - 1) / 4.0)  # Convert 1-5 to 0-1

        # Edit signal (inverse - fewer edits = better)
        if total_slides > 0:
            edit_rate = self.get_edit_rate(total_slides)
            signals.append(1.0 - edit_rate)

        # Reuse signal
        if self.was_reused:
            signals.append(1.0)

        # Sharing signal
        if self.was_shared:
            signals.append(0.8)

        # Average all available signals
        return sum(signals) / len(signals) if signals else 0.5

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary for serialization.

        Returns:
            Dictionary representation
        """
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'presentation_id': self.presentation_id,
            'generation_record_id': self.generation_record_id,
            'audience_type': self.audience_type,
            'explicit_rating': self.explicit_rating,
            'explicit_notes': self.explicit_notes,
            'slides_edited': self.slides_edited,
            'slides_deleted': self.slides_deleted,
            'slides_reordered': self.slides_reordered,
            'was_shared': self.was_shared,
            'was_reused': self.was_reused,
            'time_spent_viewing_seconds': self.time_spent_viewing_seconds,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FeedbackRecord':
        """
        Create FeedbackRecord from dictionary.

        Args:
            data: Dictionary with feedback data

        Returns:
            FeedbackRecord instance
        """
        return cls(
            id=data['id'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            presentation_id=data['presentation_id'],
            generation_record_id=data['generation_record_id'],
            audience_type=data['audience_type'],
            explicit_rating=data.get('explicit_rating'),
            explicit_notes=data.get('explicit_notes'),
            slides_edited=data.get('slides_edited', []),
            slides_deleted=data.get('slides_deleted', []),
            slides_reordered=data.get('slides_reordered', False),
            was_shared=data.get('was_shared', False),
            was_reused=data.get('was_reused', False),
            time_spent_viewing_seconds=data.get('time_spent_viewing_seconds'),
        )
