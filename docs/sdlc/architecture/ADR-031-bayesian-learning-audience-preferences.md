# ADR-031: Bayesian Learning Approach for Audience Preferences

## Status
Proposed

## Date
2026-02-17

## Context

The Exec Agent must learn from every presentation it generates to continuously improve output quality. The current system records a generation log (timestamp, project ID, type, output path) but never reads from it -- the learning system is write-only.

The redesigned agent needs to answer questions like:
- Which slide types are most effective for C-suite audiences?
- Should architecture diagrams be simplified or detailed for VP-level?
- Do bullet points with specific numbers score higher than qualitative statements?
- What presentation structure leads to fewer post-generation edits?

This requires a learning approach that can:
1. **Start with reasonable defaults** (no cold-start failure)
2. **Update incrementally** from small amounts of feedback
3. **Handle noisy signals** (implicit feedback is unreliable)
4. **Decay old knowledge** (preferences change over time)
5. **Quantify uncertainty** (know when to explore vs exploit)
6. **Run locally** with no ML infrastructure (no GPUs, no training loops)

### Options Considered

1. **Bayesian Updating with Conjugate Priors** -- Use Beta distributions for effectiveness scores. Start with informative priors. Update with each feedback signal. Simple math, runs on CPU, handles uncertainty naturally.

2. **Reinforcement Learning (Multi-Armed Bandit)** -- Thompson Sampling or UCB for slide selection. Explores different options and exploits winners. Requires more feedback data to converge.

3. **Supervised ML (Gradient Boosted Trees)** -- Train a model on (features, score) pairs. Requires scikit-learn dependency and minimum 50-100 training examples before being useful.

4. **Simple Weighted Averages** -- Moving average of past scores per (audience, slide_type). Dead simple but no uncertainty quantification, no prior knowledge, easily dominated by outliers.

5. **Rule-Based System** -- Expert-coded rules for what works per audience. No learning capability but deterministic and immediately useful.

## Decision

We will use **Bayesian Updating with Beta-distribution priors** as the primary learning mechanism, combined with a **rule-based prior initialization**.

### How It Works

For each (audience_type, slide_type) pair, we maintain a Beta(alpha, beta) distribution representing our belief about effectiveness:

```
Prior:      Beta(alpha_0, beta_0)     -- Initialized from expert knowledge
Evidence:   success_count, failure_count  -- Derived from feedback signals
Posterior:  Beta(alpha_0 + successes, beta_0 + failures)

Effectiveness = E[posterior] = alpha / (alpha + beta)
Confidence    = alpha + beta  (higher = more confident)
Uncertainty   = Var[posterior] = alpha*beta / ((alpha+beta)^2 * (alpha+beta+1))
```

### Signal Processing

Raw feedback signals are converted to success/failure events:

```
Signal                    Success Condition           Weight
------------------------------------------------------------------------
Explicit rating (1-5)     rating >= 4                 0.40
Quality score (0-1)       score >= 0.70               0.20
Brand compliance (0-1)    compliance >= 0.95           0.10
Slides not edited         slide not in edited list     0.15
Presentation reused       reuse_flag == True           0.10
Cross-agent reference     referenced == True           0.05
```

Each signal contributes a fractional success or failure:

```python
weighted_success = sum(weight * (1 if success else 0) for signal, weight, success in signals)
weighted_failure = 1.0 - weighted_success

# Apply time decay
age_days = (now - record.timestamp).days
decay = exp(-0.05 * age_days)

# Update Beta distribution
alpha += weighted_success * decay
beta += weighted_failure * decay
```

### Prior Initialization

Expert-derived priors based on presentation best practices:

```python
PRIORS = {
    (AudienceType.C_SUITE, SlideType.EXECUTIVE_SUMMARY): Beta(8, 2),   # Strong prior: very effective
    (AudienceType.C_SUITE, SlideType.ARCHITECTURE_DETAIL): Beta(2, 8), # Strong prior: not effective
    (AudienceType.C_SUITE, SlideType.KEY_METRICS): Beta(7, 3),         # Strong prior: effective
    (AudienceType.TECHNICAL_LEAD, SlideType.ARCHITECTURE_DETAIL): Beta(8, 2),  # Very effective
    (AudienceType.TECHNICAL_LEAD, SlideType.ARCHITECTURE_OVERVIEW): Beta(5, 5), # Neutral
    # ... all combinations initialized
}
```

Using informative priors (alpha_0 + beta_0 = 10) means:
- The system starts with expert knowledge on day one
- After ~10 real feedback signals, data starts dominating the prior
- After ~30 signals, the prior is effectively overridden by evidence

### Exploration vs Exploitation

When selecting slides, we use **Thompson Sampling**:

```python
def should_include_slide(audience_type, slide_type) -> bool:
    alpha, beta = get_posterior(audience_type, slide_type)
    sampled_effectiveness = random.beta(alpha, beta)
    return sampled_effectiveness >= threshold
```

This naturally balances:
- **Exploitation**: High-confidence effective slides are almost always included
- **Exploration**: Uncertain slides are occasionally included to gather more data
- **Elimination**: High-confidence ineffective slides are rarely included

## Consequences

### Positive

- **No cold start**: Informative priors provide good performance from day one
- **Incremental learning**: Each feedback signal improves the model immediately
- **Uncertainty-aware**: The system knows what it knows and what it does not
- **Computationally trivial**: Beta distribution updates are simple arithmetic
- **No ML dependencies**: Pure Python math, no scikit-learn or PyTorch
- **Interpretable**: "C-suite Executive Summary effectiveness: 0.82 (confidence: 85th percentile)" is understandable
- **Noise-tolerant**: Bayesian averaging is robust to individual outlier signals
- **Time-aware**: Exponential decay prevents stale preferences from dominating

### Negative

- **Independent dimensions**: Beta distributions model each (audience, slide_type) independently. Correlations between slide types (e.g., "if you include architecture overview, don't include architecture detail") must be handled separately via rules.
- **Signal quality assumption**: The weighted signal combination assumes signal weights are correct. These weights are manually tuned and may need adjustment. Mitigated by starting conservative and allowing weight tuning as data accumulates.
- **Slow convergence with sparse feedback**: If explicit ratings are rare, convergence relies on implicit signals which are noisier. Mitigated by initializing with strong priors.

### Neutral

- The Beta distribution parameters (alpha, beta per pair) serialize to a small JSON file (~2KB for all combinations)
- The learning engine can be paused/reset without affecting other components
- Insights can be extracted from the distributions (e.g., "biggest confidence gain this week") for the analytics dashboard

## Notes

### Model Serialization

```json
{
  "model_version": "1.0",
  "updated_at": "2026-02-17T10:00:00Z",
  "distributions": {
    "c-suite": {
      "executive-summary": {"alpha": 12.3, "beta": 2.7, "observations": 15},
      "key-metrics": {"alpha": 10.1, "beta": 3.9, "observations": 12},
      "architecture-detail": {"alpha": 2.5, "beta": 9.5, "observations": 8}
    },
    "tech-lead": {
      "architecture-detail": {"alpha": 11.0, "beta": 3.0, "observations": 10},
      "agent-performance": {"alpha": 8.5, "beta": 4.5, "observations": 7}
    }
  }
}
```

### Insight Extraction Example

After 20 generations:
```
INSIGHT: "C-suite audiences show 82% effectiveness for executive summary slides
          (95% CI: [0.71, 0.91]) but only 21% for architecture detail slides
          (95% CI: [0.10, 0.35]). Recommendation: Always include executive summary,
          never include architecture detail for C-suite."
```
