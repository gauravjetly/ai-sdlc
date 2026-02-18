"""
Bayesian Learning Engine - Thompson Sampling implementation

Implements the learning engine using scipy for Beta distribution sampling.
Multi-signal aggregation with weights from ADR-031.
"""

import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import random

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.interfaces.learning_engine_port import (
    LearningEnginePort,
    LearningInsights,
    PresentationParams,
    AudienceContext,
)
from domain.interfaces.memory_store_port import MemoryStorePort
from domain.entities.feedback import Feedback, SignalType
from domain.entities.learning_model import (
    AudienceType,
    SlideType,
    BayesianPreferenceModel,
    EffectivenessScore,
)

try:
    from scipy.stats import beta as scipy_beta
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("WARNING: scipy not available, using fallback random sampling")


class BayesianLearningEngine(LearningEnginePort):
    """
    Bayesian learning engine with Thompson Sampling.

    Uses Beta distributions for each (audience, slide_type) pair.
    Multi-signal feedback aggregation with ADR-031 weights.
    """

    # Signal weights from ADR-031
    SIGNAL_WEIGHTS = {
        SignalType.RATING: 0.40,      # Explicit rating
        SignalType.QUALITY: 0.20,     # Quality score
        SignalType.BRAND: 0.10,       # Brand compliance
        SignalType.EDIT: 0.15,        # Edit tracking (inverse)
        SignalType.REUSE: 0.10,       # Reuse frequency
        SignalType.AGENT: 0.05,       # Cross-agent references
    }

    def __init__(
        self,
        memory_store: MemoryStorePort,
        model_id: str = "default",
    ):
        """
        Initialize learning engine.

        Args:
            memory_store: Memory store for persistence
            model_id: Model identifier for storage
        """
        self.memory_store = memory_store
        self.model_id = model_id
        self.model = BayesianPreferenceModel()

        # Statistics
        self.total_feedback_count = 0
        self.total_generation_count = 0

        # Load existing model if available
        self.load_model()

    def record_feedback(self, feedback: Feedback) -> None:
        """
        Record feedback and update Bayesian model.

        Args:
            feedback: Feedback with multi-signal data
        """
        # Aggregate weighted signals
        weighted_success = 0.0
        weighted_failure = 0.0

        for signal_type, signal in feedback.signals.items():
            weight = self.SIGNAL_WEIGHTS.get(SignalType(signal_type), 0.0)

            # Apply weight and confidence
            contribution = signal.value * weight * signal.confidence

            # Success or failure based on signal value
            if signal.value >= 0.5:
                weighted_success += contribution
            else:
                weighted_failure += contribution

        # Normalize to 0-1 range
        total_weight = weighted_success + weighted_failure
        if total_weight > 0:
            weighted_success /= total_weight
            weighted_failure /= total_weight
        else:
            # Neutral if no valid signals
            weighted_success = 0.5
            weighted_failure = 0.5

        # TODO: Extract audience_type and slide_types from feedback metadata
        # For now, we need to enhance the Feedback entity to include this info
        # This is a placeholder implementation

        self.total_feedback_count += 1

        # Save feedback record
        feedback_data = feedback.to_dict()
        self._save_feedback_record(feedback_data)

        # Auto-save model after feedback
        self.save_model()

    def get_optimized_params(
        self,
        context: AudienceContext,
    ) -> PresentationParams:
        """
        Get optimized presentation parameters using Thompson Sampling.

        Args:
            context: Audience and presentation context

        Returns:
            PresentationParams with recommendations
        """
        audience_type = context.audience_type

        # Thompson Sampling: sample from posterior for each slide type
        slide_samples = []
        for slide_type in SlideType:
            score = self.model.get_or_create_score(audience_type, slide_type)
            distribution = score.distribution

            # Sample from Beta distribution
            if SCIPY_AVAILABLE:
                sampled_value = scipy_beta.rvs(distribution.alpha, distribution.beta)
            else:
                # Fallback: use mean with small random noise
                sampled_value = distribution.mean() + (random.random() - 0.5) * 0.1

            slide_samples.append((slide_type, sampled_value))

        # Sort by sampled value (exploration/exploitation balance)
        slide_samples.sort(key=lambda x: x[1], reverse=True)

        # Filter to reasonable threshold
        recommended_slides = [
            (slide_type, score)
            for slide_type, score in slide_samples
            if score >= 0.4  # Minimum threshold
        ]

        # Determine detail level based on audience
        detail_levels = {
            AudienceType.C_SUITE: "minimal",
            AudienceType.BOARD: "minimal",
            AudienceType.VP_DIRECTOR: "standard",
            AudienceType.EXTERNAL_CLIENT: "standard",
            AudienceType.TECHNICAL_LEAD: "detailed",
            AudienceType.PROJECT_TEAM: "detailed",
        }
        detail_level = detail_levels.get(audience_type, "standard")

        # Determine diagram complexity
        diagram_complexity = "simplified" if audience_type in [
            AudienceType.C_SUITE,
            AudienceType.BOARD,
        ] else "detailed"

        # Determine content style
        content_styles = {
            AudienceType.C_SUITE: "executive",
            AudienceType.BOARD: "executive",
            AudienceType.VP_DIRECTOR: "strategic",
            AudienceType.EXTERNAL_CLIENT: "client-facing",
            AudienceType.TECHNICAL_LEAD: "technical",
            AudienceType.PROJECT_TEAM: "technical",
        }
        content_style = content_styles.get(audience_type, "balanced")

        return PresentationParams(
            recommended_slides=recommended_slides,
            detail_level=detail_level,
            diagram_complexity=diagram_complexity,
            content_style=content_style,
        )

    def get_learning_insights(self) -> LearningInsights:
        """
        Get insights from the learning system.

        Returns:
            LearningInsights with statistics and patterns
        """
        # Calculate average quality from recent feedback
        recent_feedback = self._load_recent_feedback(limit=50)
        avg_quality = sum(
            f.get('weighted_score', 0.5)
            for f in recent_feedback
        ) / max(len(recent_feedback), 1)

        # Identify top patterns
        top_patterns = []

        # For each audience type, find top-performing slides
        for audience_type in AudienceType:
            top_slides = self.model.get_top_slides(
                audience_type,
                min_effectiveness=0.7,
                limit=3,
            )

            if top_slides:
                pattern = {
                    'audience': audience_type.value,
                    'top_slides': [
                        {'slide_type': slide_type.value, 'effectiveness': eff}
                        for slide_type, eff in top_slides
                    ],
                }
                top_patterns.append(pattern)

        # Build effectiveness matrix for all audiences
        effectiveness_matrix = {}
        for audience_type in AudienceType:
            matrix = self.model.get_effectiveness_matrix(audience_type)
            effectiveness_matrix[audience_type.value] = matrix

        return LearningInsights(
            total_generations=self.total_generation_count,
            total_feedback=self.total_feedback_count,
            average_quality=avg_quality,
            top_patterns=top_patterns,
            effectiveness_matrix=effectiveness_matrix,
        )

    def get_effectiveness_score(
        self,
        audience_type: AudienceType,
        slide_type: SlideType,
    ) -> EffectivenessScore:
        """
        Get effectiveness score for a specific pair.

        Args:
            audience_type: Audience type
            slide_type: Slide type

        Returns:
            EffectivenessScore with distribution and confidence
        """
        return self.model.get_or_create_score(audience_type, slide_type)

    def get_model(self) -> BayesianPreferenceModel:
        """
        Get the underlying Bayesian model.

        Returns:
            BayesianPreferenceModel
        """
        return self.model

    def save_model(self) -> None:
        """
        Persist the learning model to storage.
        """
        model_data = self.model.to_dict()
        model_data['total_feedback_count'] = self.total_feedback_count
        model_data['total_generation_count'] = self.total_generation_count

        # Save to learning directory
        self.memory_store.write_json(
            path=f"learning/model-{self.model_id}.json",
            data=model_data,
        )

    def load_model(self) -> None:
        """
        Load the learning model from storage.
        """
        model_data = self.memory_store.read_json(
            path=f"learning/model-{self.model_id}.json",
        )

        if model_data:
            self.model = BayesianPreferenceModel.from_dict(model_data)
            self.total_feedback_count = model_data.get('total_feedback_count', 0)
            self.total_generation_count = model_data.get('total_generation_count', 0)

    def _save_feedback_record(self, feedback_data: Dict[str, Any]) -> None:
        """Save feedback record to memory store"""
        # Append to feedback log
        try:
            self.memory_store.save_learning_record(feedback_data)
        except Exception as e:
            print(f"Warning: Failed to save feedback record: {e}")

    def _load_recent_feedback(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Load recent feedback records"""
        try:
            return self.memory_store.load_learning_records(limit=limit)
        except Exception:
            return []
