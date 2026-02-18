"""
Learning Engine Port - Interface for the learning system

Defines the contract for Bayesian learning engine implementations.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.entities.feedback import Feedback
from domain.entities.learning_model import (
    AudienceType,
    SlideType,
    BayesianPreferenceModel,
    EffectivenessScore,
)


class LearningInsights:
    """Learning insights data class"""

    def __init__(
        self,
        total_generations: int,
        total_feedback: int,
        average_quality: float,
        top_patterns: List[Dict[str, Any]],
        effectiveness_matrix: Dict[str, Dict[str, float]],
    ):
        self.total_generations = total_generations
        self.total_feedback = total_feedback
        self.average_quality = average_quality
        self.top_patterns = top_patterns
        self.effectiveness_matrix = effectiveness_matrix

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'total_generations': self.total_generations,
            'total_feedback': self.total_feedback,
            'average_quality': self.average_quality,
            'top_patterns': self.top_patterns,
            'effectiveness_matrix': self.effectiveness_matrix,
        }


class PresentationParams:
    """Optimized presentation parameters"""

    def __init__(
        self,
        recommended_slides: List[Tuple[SlideType, float]],
        detail_level: str,
        diagram_complexity: str,
        content_style: str,
    ):
        self.recommended_slides = recommended_slides
        self.detail_level = detail_level
        self.diagram_complexity = diagram_complexity
        self.content_style = content_style

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'recommended_slides': [
                (slide_type.value, score)
                for slide_type, score in self.recommended_slides
            ],
            'detail_level': self.detail_level,
            'diagram_complexity': self.diagram_complexity,
            'content_style': self.content_style,
        }


class AudienceContext:
    """Context for audience-based optimization"""

    def __init__(
        self,
        audience_type: AudienceType,
        presentation_type: str,
        industry: Optional[str] = None,
    ):
        self.audience_type = audience_type
        self.presentation_type = presentation_type
        self.industry = industry

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'audience_type': self.audience_type.value,
            'presentation_type': self.presentation_type,
            'industry': self.industry,
        }


class LearningEnginePort(ABC):
    """
    Port interface for the learning engine.

    Implementations must provide Bayesian learning capabilities.
    """

    @abstractmethod
    def record_feedback(self, feedback: Feedback) -> None:
        """
        Record feedback from a presentation.

        Args:
            feedback: Feedback with multi-signal data
        """
        pass

    @abstractmethod
    def get_optimized_params(
        self,
        context: AudienceContext,
    ) -> PresentationParams:
        """
        Get optimized presentation parameters based on learned preferences.

        Args:
            context: Audience and presentation context

        Returns:
            PresentationParams with recommendations
        """
        pass

    @abstractmethod
    def get_learning_insights(self) -> LearningInsights:
        """
        Get insights from the learning system.

        Returns:
            LearningInsights with statistics and patterns
        """
        pass

    @abstractmethod
    def get_effectiveness_score(
        self,
        audience_type: AudienceType,
        slide_type: SlideType,
    ) -> EffectivenessScore:
        """
        Get effectiveness score for a specific (audience, slide_type) pair.

        Args:
            audience_type: Audience type
            slide_type: Slide type

        Returns:
            EffectivenessScore with distribution and confidence
        """
        pass

    @abstractmethod
    def get_model(self) -> BayesianPreferenceModel:
        """
        Get the underlying Bayesian model.

        Returns:
            BayesianPreferenceModel
        """
        pass

    @abstractmethod
    def save_model(self) -> None:
        """
        Persist the learning model to storage.
        """
        pass

    @abstractmethod
    def load_model(self) -> None:
        """
        Load the learning model from storage.
        """
        pass
