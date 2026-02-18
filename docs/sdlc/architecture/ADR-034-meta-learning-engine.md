# ADR-034: Meta-Learning Engine Approach

**Status**: Proposed
**Date**: 2026-02-17
**Author**: Jets (World-Class Architect)
**Context**: ARCH-20260217-EXEC-AGENT-V2

---

## Context

The Exec Agent V1 implements Bayesian learning with Thompson Sampling (ADR-031) using fixed hyperparameters:

- **Signal weights**: Rating=0.40, Quality=0.20, Brand=0.10, Edit=0.15, Reuse=0.10, Agent=0.05
- **Decay rate**: 0.05 per day (~60% weight after 10 days)
- **Shrinkage factor**: 0.10 (Bayesian shrinkage toward global mean)
- **Minimum sample count**: 5 (before acting on learned preferences)

These parameters were chosen based on expert judgment during V1 design. However, as the system collects real feedback data, the optimal hyperparameters may differ from the initial estimates. For example:

- If users rarely provide explicit ratings, the 0.40 weight on the rating signal is wasted
- If project contexts change rapidly, the 0.05 decay rate may be too slow (old preferences linger)
- If the learning system converges too slowly for new audience types, the shrinkage factor may be too aggressive

Without self-tuning, the learning system's performance is capped by the accuracy of initial expert judgment.

## Decision

Implement a **Meta-Learning Controller** at the domain layer that monitors the learning system's own performance and adjusts hyperparameters within bounded safe ranges.

### Key Design Choices

**1. Observation Metrics (What We Monitor)**

| Metric | Definition | Purpose |
|--------|-----------|---------|
| Prediction Error | `|predicted_quality - actual_quality|` averaged over last 10 generations | Measures how well the learning model predicts outcomes |
| Signal Informativeness | Pearson correlation between each signal and quality outcome | Identifies which signals actually predict quality |
| Convergence Rate | Generations until preference std_dev < 0.05 | Measures learning speed |
| Decay Effectiveness | Quality trend comparison between recent and older windows | Determines if forgetting old data helps |

**2. Adjustment Algorithm (What We Change)**

The meta-learning controller runs after every 10 generations:

```
IF prediction_error is DECREASING:
    No adjustment needed (learning is working)

IF prediction_error is INCREASING:
    1. Rebalance signal weights based on informativeness
       new_weight[signal] = normalize(old_weight * (1 + 0.1 * correlation))
    2. Adjust decay rate based on quality trend
       IF recent > older: decay *= 1.05 (forget faster)
       ELSE: decay *= 0.95 (remember more)
    3. Adjust shrinkage based on confidence
       IF low confidence: shrinkage *= 1.1 (more conservative)
       ELSE: shrinkage *= 0.95 (trust data more)
```

**3. Safety Bounds (What Prevents Divergence)**

Every tunable parameter has hard bounds that cannot be exceeded:

| Parameter | Lower Bound | Upper Bound | Rationale |
|-----------|-------------|-------------|-----------|
| Any signal weight | 0.01 | 0.80 | No signal should dominate or be eliminated |
| Decay rate (per day) | 0.01 | 0.20 | Too slow = never learns; too fast = no memory |
| Shrinkage factor | 0.05 | 0.30 | Too low = overfits; too high = ignores data |
| Minimum sample count | 3 | 20 | Too low = acts on noise; too high = never acts |

**4. Revert-on-Degradation Rule**

If quality scores drop for 3 consecutive meta-learning cycles after an adjustment, the controller automatically reverts to the previous hyperparameter set. This prevents sustained degradation.

**5. Domain Layer Implementation**

The MetaLearningController is a pure domain service with zero external dependencies. It receives metrics as input and produces HyperparameterSet as output. The infrastructure layer handles persistence.

## Alternatives Considered

### Alternative A: Fixed Hyperparameters (Status Quo)

Keep the V1 expert-chosen hyperparameters permanently.

- **Pro**: Simple, predictable, no risk of divergence
- **Con**: Cannot adapt to actual usage patterns; performance capped by initial estimates
- **Rejected because**: Real-world data almost always differs from expert assumptions. A system that cannot adapt will plateau.

### Alternative B: Full AutoML Hyperparameter Search

Use techniques like Bayesian Optimization (BO) or grid search to find optimal hyperparameters.

- **Pro**: Could find globally optimal parameters
- **Con**: Requires large sample sizes (100s of generations), high computational cost, complex implementation
- **Rejected because**: The Exec Agent generates presentations infrequently (maybe 5-20 per week). Full AutoML needs orders of magnitude more data.

### Alternative C: Manual Tuning via Configuration File

Expose hyperparameters in a config file and let operators adjust them.

- **Pro**: Full human control
- **Con**: Requires human expertise, attention, and time; does not scale across projects
- **Rejected because**: The goal is autonomous behavior. Manual tuning contradicts the "fully agentic" requirement.

### Alternative D: Neural Network for Meta-Learning

Train a small neural network to predict optimal hyperparameters from generation history.

- **Pro**: Could capture complex non-linear relationships
- **Con**: Requires PyTorch/TensorFlow dependency, significant training data, complex debugging
- **Rejected because**: Adds heavy dependencies for marginal benefit over simple heuristics. The signal space (6 dimensions) is too small for neural approaches to outperform bounded perturbation.

## Consequences

### Positive

- Learning system adapts to actual usage patterns automatically
- Suboptimal initial hyperparameters are corrected within ~100 generations
- Each deployment develops hyperparameters tuned to its specific context
- Safety bounds prevent catastrophic parameter drift
- Revert-on-degradation provides automatic recovery from bad adjustments
- All adjustments are logged for transparency and debugging

### Negative

- Adds complexity to the learning system (new domain service + infrastructure persistence)
- Meta-learning itself needs sufficient data (10+ generations per cycle)
- The perturbation approach (multiply by 1.05/0.95) converges slowly
- Early in the system's life (< 20 generations), meta-learning cannot make meaningful adjustments

### Risks

| Risk | Mitigation |
|------|-----------|
| Oscillating hyperparameters | Bounded adjustment steps (5% per cycle) and revert-on-degradation |
| Slow convergence of meta-learning | Acceptable: meta-learning is a long-term optimization, not critical path |
| Correlation-based rebalancing misidentifies noise as signal | Minimum 10 samples per signal before rebalancing |

## Implementation Notes

**Files to create**:
- `domain/entities/hyperparameter_set.py` -- HyperparameterSet dataclass with bounds
- `domain/services/meta_learning_controller.py` -- Pure domain logic for observation and adjustment
- `infrastructure/meta/meta_learning_analyzer.py` -- Persistence and metric computation

**Integration point**:
- After every 10th call to `BayesianLearningEngine.record_feedback()`, invoke `MetaLearningController.evaluate_and_adjust()`
- Apply adjusted hyperparameters to `BayesianPreferenceModel.decay_rate` and `BayesianLearningEngine.SIGNAL_WEIGHTS`

**Test strategy**:
- Unit test: all hyperparameters stay within bounds after 1000 random adjustment cycles
- Unit test: signal weights always sum to 1.0
- Unit test: revert triggers after 3 consecutive quality drops
- Integration test: 50 synthetic generations converge faster with meta-learning than without
