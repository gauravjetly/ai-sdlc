# Phase 3: Bayesian Preference Learning System

## Overview

Phase 3 implements a self-learning system that makes the Exec Agent progressively smarter at understanding audience preferences and optimizing presentation quality over time.

## Implementation Status

### Completed Components

#### Domain Layer
- `domain/entities/feedback.py` - Multi-signal feedback entity
- `domain/entities/learning_model.py` - Bayesian preference model with Beta distributions
- `domain/interfaces/learning_engine_port.py` - Learning engine port interface
- `domain/interfaces/version_store_port.py` - Version management port
- Updated `domain/entities/presentation.py` - Added version tracking fields

#### Infrastructure Layer
- `infrastructure/learning/bayesian_learning_engine.py` - Thompson Sampling implementation
- `infrastructure/quality/quality_scorer.py` - 6-dimensional quality assessment
- Updated `infrastructure/persistence/file_memory_store.py` - Added JSON read/write methods

#### Application Layer
- `application/services/version_manager.py` - Content-addressable versioning

#### Tests
- `tests/unit/domain/test_feedback.py` - Feedback entity tests
- `tests/unit/domain/test_learning_model.py` - Bayesian model tests

### Dependencies Added
- `scipy>=1.11.0` - Beta distribution sampling for Thompson Sampling
- `numpy>=1.24.0` - Numerical operations

## Architecture

### Bayesian Learning Model

The learning system uses **Beta distributions** for each (audience_type, slide_type) pair to model effectiveness:

```
Beta(α, β) where:
- α = success count + prior_α
- β = failure count + prior_β
- Mean effectiveness = α / (α + β)
- Confidence ∝ (α + β)
```

### Multi-Signal Feedback Aggregation

Feedback signals are weighted according to ADR-031:

| Signal | Weight | Description |
|--------|--------|-------------|
| Explicit Rating | 40% | User 1-5 star rating |
| Quality Score | 20% | Automated quality assessment |
| Brand Compliance | 10% | Brand validation score |
| Edit Tracking | 15% | Inverse of edit rate |
| Reuse | 10% | Presentation reuse frequency |
| Cross-Agent | 5% | References from other agents |

### Thompson Sampling

For slide selection, the system uses **Thompson Sampling**:

1. For each slide type, sample from its Beta posterior distribution
2. Sort slides by sampled values
3. Include slides above threshold

This naturally balances:
- **Exploitation**: High-confidence effective slides are usually included
- **Exploration**: Uncertain slides are occasionally included to gather data
- **Elimination**: High-confidence ineffective slides are rarely included

## Key Features

### 1. Prior Initialization

The model starts with expert-derived priors:

```python
# C-suite preferences
(C_SUITE, EXECUTIVE_SUMMARY): Beta(8, 2)  # Strong prior: very effective
(C_SUITE, ARCHITECTURE_DETAIL): Beta(2, 8)  # Strong prior: not effective

# Technical lead preferences
(TECHNICAL_LEAD, ARCHITECTURE_DETAIL): Beta(8, 2)  # Very effective
```

Priors are based on presentation best practices and provide good performance from day one.

### 2. Time Decay

Older feedback signals have less influence using exponential decay:

```
decay_factor = exp(-0.05 * age_in_days)
```

This ensures the model adapts to changing preferences over time.

### 3. Quality Scoring

Presentations are scored across 6 dimensions:

| Dimension | Weight | Factors |
|-----------|--------|---------|
| Content Relevance | 25% | Data recency, completeness, audience alignment |
| Visual Quality | 20% | Diagram presence, visual balance, formatting |
| Brand Compliance | 15% | Color/font adherence, template usage |
| Audience Fit | 20% | Slide count, tone, content depth |
| Data Accuracy | 15% | Freshness, metrics presence, no contradictions |
| Narrative Quality | 5% | Headlines, bullets, logical flow |

**Thresholds**:
- Auto-release: Overall score ≥ 0.70
- Enhancement needed: Overall score < 0.50

### 4. Version Management

Content-addressable versioning using SHA-256:

```
version_hash = SHA256(presentation_content)
```

Each version records:
- Version hash (content identifier)
- Parent version hash (for history)
- Quality score
- File path to PPTX
- Creation timestamp
- Metadata

## Usage Examples

### Recording Feedback

```python
from domain.entities.feedback import Feedback, FeedbackSignal, FeedbackType, SignalType

feedback = Feedback(
    id="fb-001",
    presentation_id="pres-001",
    feedback_type=FeedbackType.EXPLICIT,
    signals={},
)

# Add explicit rating signal
feedback.add_signal(FeedbackSignal(
    signal_type=SignalType.RATING,
    value=0.8,  # 4 out of 5 stars
    weight=0.4,
    confidence=1.0,
    metadata={'rating': 4},
))

# Add quality score signal
feedback.add_signal(FeedbackSignal(
    signal_type=SignalType.QUALITY,
    value=0.75,
    weight=0.2,
    confidence=1.0,
))

# Record to learning engine
learning_engine.record_feedback(feedback)
```

### Getting Optimized Parameters

```python
from domain.interfaces.learning_engine_port import AudienceContext
from domain.entities.learning_model import AudienceType

context = AudienceContext(
    audience_type=AudienceType.C_SUITE,
    presentation_type="executive-summary",
    industry="software",
)

params = learning_engine.get_optimized_params(context)

print(f"Detail level: {params.detail_level}")
print(f"Diagram complexity: {params.diagram_complexity}")
print(f"Top slides: {params.recommended_slides[:5]}")
```

### Scoring Quality

```python
from infrastructure.quality.quality_scorer import QualityScorer

scorer = QualityScorer()

quality_score = scorer.score(
    presentation=presentation,
    brand_compliance_score=0.95,
    data_freshness_hours=6.0,
)

print(f"Overall quality: {quality_score.overall:.2f}")
print(f"Content relevance: {quality_score.content_relevance:.2f}")
print(f"Visual quality: {quality_score.visual_quality:.2f}")

if scorer.meets_threshold(quality_score, threshold=0.70):
    print("✓ Quality meets release threshold")
```

### Version Management

```python
from application.services.version_manager import VersionManager

version_record = version_manager.create_version(
    presentation=presentation,
    file_path="/path/to/presentation.pptx",
)

print(f"Version hash: {version_record.version_hash}")
print(f"Quality score: {version_record.quality_score}")

# List all versions
versions = version_manager.list_versions(presentation.id)
for v in versions:
    print(f"{v.version}: {v.version_hash[:8]}... (score: {v.quality_score:.2f})")
```

### Learning Insights

```python
insights = learning_engine.get_learning_insights()

print(f"Total generations: {insights.total_generations}")
print(f"Total feedback: {insights.total_feedback}")
print(f"Average quality: {insights.average_quality:.2f}")

print("\nTop patterns:")
for pattern in insights.top_patterns:
    print(f"  {pattern['audience']}: {pattern['top_slides']}")

print("\nEffectiveness matrix:")
for audience, matrix in insights.effectiveness_matrix.items():
    top_slides = sorted(matrix.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"  {audience}: {top_slides}")
```

## Testing

### Run Unit Tests

```bash
# Test feedback entity
pytest tests/unit/domain/test_feedback.py -v

# Test learning model
pytest tests/unit/domain/test_learning_model.py -v

# Run all Phase 3 tests
pytest tests/unit/domain/test_feedback.py tests/unit/domain/test_learning_model.py -v
```

### Expected Results

All tests should pass:

```
tests/unit/domain/test_feedback.py::test_feedback_signal_creation PASSED
tests/unit/domain/test_feedback.py::test_feedback_signal_weighted_value PASSED
tests/unit/domain/test_feedback.py::test_feedback_weighted_score PASSED
tests/unit/domain/test_learning_model.py::test_beta_distribution_mean PASSED
tests/unit/domain/test_learning_model.py::test_bayesian_model_update_from_feedback PASSED
...
```

## Storage Structure

Learning data is stored in the memory directory:

```
~/.claude/exec-agent-memory/
├── learning/
│   ├── model-default.json          # Bayesian model state
│   ├── records.json                # Feedback records
│   └── insights.json               # Extracted insights (future)
├── presentations/
│   └── {presentation_id}/
│       ├── versions/
│       │   ├── {hash}.json         # Version metadata
│       │   └── {hash}.pptx         # Version file
│       └── feedback/
│           └── {feedback_id}.json  # Feedback records
```

## Configuration

### Bayesian Model Parameters

```python
# Time decay rate (exponential)
decay_rate = 0.05  # ~60% weight after 10 days

# Quality thresholds
auto_release_threshold = 0.70
enhancement_threshold = 0.50

# Thompson Sampling
min_slide_threshold = 0.4  # Minimum sampled value to include slide

# Signal weights (from ADR-031)
SIGNAL_WEIGHTS = {
    SignalType.RATING: 0.40,
    SignalType.QUALITY: 0.20,
    SignalType.BRAND: 0.10,
    SignalType.EDIT: 0.15,
    SignalType.REUSE: 0.10,
    SignalType.AGENT: 0.05,
}
```

## Learning Convergence

The system learns progressively:

| Feedback Count | Model State | Behavior |
|----------------|-------------|----------|
| 0-5 | Prior-dominated | Uses expert priors |
| 5-20 | Early learning | Priors + data mixed |
| 20-50 | Active learning | Data starts dominating |
| 50+ | Mature | Data-driven, high confidence |

With strong priors (α + β = 10), the model:
- Starts with good performance (expert knowledge)
- Adapts after ~10 feedback signals per pair
- Becomes data-driven after ~30 signals

## Next Steps (Phase 4)

1. **Agent Mesh Integration**:
   - Subscribe to project events
   - Trigger auto-generation on updates
   - Share learning insights

2. **Edit Tracking**:
   - Monitor post-generation edits
   - Infer dissatisfaction from modifications
   - Learn from corrections

3. **Cross-Agent Learning**:
   - Detect when other agents reference presentations
   - Track reuse patterns
   - Identify universally effective content

4. **Analytics Dashboard**:
   - Visualize learning progress
   - Show effectiveness trends
   - Display confidence intervals

## Troubleshooting

### scipy ImportError

If scipy is not available:

```bash
cd /path/to/exec-agent
source venv/bin/activate
pip install scipy numpy
```

The system has a fallback using mean + random noise if scipy is unavailable.

### Low Confidence Scores

If all effectiveness scores have low confidence:

1. Record more feedback (need 10+ per audience/slide pair)
2. Check that feedback signals are being properly recorded
3. Verify time decay isn't too aggressive (default: 0.05)

### Model Not Learning

If the model isn't improving:

1. Check feedback records: `cat ~/.claude/exec-agent-memory/learning/records.json`
2. Verify signals have appropriate weights
3. Ensure `learning_engine.save_model()` is being called
4. Check that signals have confidence > 0

## Performance

### Computational Cost

- **Feedback recording**: O(1) - Simple Beta update
- **Thompson Sampling**: O(n) where n = number of slide types (~13)
- **Quality scoring**: O(m) where m = number of slides
- **Model serialization**: < 100ms (small JSON file)

### Memory Usage

- **Bayesian model**: ~2-5 KB (all audience/slide pairs)
- **Feedback records**: ~1 KB per record
- **Version metadata**: ~500 bytes per version

## References

- **ADR-031**: Bayesian Learning Approach for Audience Preferences
- **ARCH-20260217-EXEC-AGENT**: Complete architecture document
- **Thompson Sampling**: [Wikipedia](https://en.wikipedia.org/wiki/Thompson_sampling)
- **Beta Distribution**: [Wikipedia](https://en.wikipedia.org/wiki/Beta_distribution)

## License

Part of the AI-SDLC framework. See project root for license.
