"""
Reasoning Engine
=================
Three components:
  1. ReasoningTraceStore   — Stores every agent chain-of-thought for auditability
  2. ConfidenceScorer      — Scores every agent output; flags low-confidence for HITL
  3. AdversarialAgent      — Devil's advocate that stress-tests every design decision
  4. LongHorizonPlanner    — Plans 12-24 month product roadmap from current state
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

log = structlog.get_logger(__name__)


# ── Reasoning Trace Store ─────────────────────────────────────────────────────

@dataclass
class ReasoningTrace:
    trace_id:    str
    agent_type:  str
    task:        str
    steps:       List[Dict[str, Any]]
    conclusion:  str
    confidence:  float
    tokens_used: int
    duration_s:  float
    timestamp:   float = field(default_factory=time.time)


class ReasoningTraceStore:
    """
    Immutable audit log of every agent reasoning chain.
    Stored in memory (semantic layer) and optionally in a structured DB.
    """

    def __init__(self, memory=None, db_url: Optional[str] = None):
        self.memory  = memory
        self.db_url  = db_url
        self._traces: Dict[str, ReasoningTrace] = {}

    def record(
        self,
        agent_type:  str,
        task:        str,
        steps:       List[Dict[str, Any]],
        conclusion:  str,
        confidence:  float,
        tokens_used: int,
        duration_s:  float,
    ) -> ReasoningTrace:
        trace = ReasoningTrace(
            trace_id    = f"trace-{uuid.uuid4().hex[:10]}",
            agent_type  = agent_type,
            task        = task[:500],
            steps       = steps,
            conclusion  = conclusion[:1000],
            confidence  = confidence,
            tokens_used = tokens_used,
            duration_s  = duration_s,
        )
        self._traces[trace.trace_id] = trace

        if self.memory:
            self.memory.episodic.store(
                content=f"Agent: {agent_type}\nTask: {task[:200]}\n"
                        f"Conclusion: {conclusion[:300]}\nConfidence: {confidence:.2f}",
                metadata={
                    "type":       "reasoning_trace",
                    "trace_id":   trace.trace_id,
                    "agent_type": agent_type,
                    "confidence": confidence,
                },
            )

        log.debug("trace.recorded", trace_id=trace.trace_id,
                  agent=agent_type, confidence=confidence)
        return trace

    def get(self, trace_id: str) -> Optional[ReasoningTrace]:
        return self._traces.get(trace_id)

    def search(self, agent_type: str = None, min_confidence: float = 0.0) -> List[ReasoningTrace]:
        results = list(self._traces.values())
        if agent_type:
            results = [t for t in results if t.agent_type == agent_type]
        results = [t for t in results if t.confidence >= min_confidence]
        return sorted(results, key=lambda t: t.timestamp, reverse=True)

    def export_audit_log(self) -> List[Dict[str, Any]]:
        return [
            {
                "trace_id":    t.trace_id,
                "agent_type":  t.agent_type,
                "task":        t.task,
                "conclusion":  t.conclusion,
                "confidence":  t.confidence,
                "tokens_used": t.tokens_used,
                "duration_s":  t.duration_s,
                "timestamp":   t.timestamp,
                "steps_count": len(t.steps),
            }
            for t in sorted(self._traces.values(), key=lambda x: x.timestamp)
        ]


# ── Confidence Scorer ─────────────────────────────────────────────────────────

@dataclass
class ConfidenceResult:
    score:           float          # 0.0 – 1.0
    requires_review: bool
    factors:         Dict[str, float]
    explanation:     str
    suggestions:     List[str]


class ConfidenceScorer:
    """
    Multi-factor confidence scoring for agent outputs.

    Factors:
      - completeness:   Does the output cover all required sections?
      - specificity:    Are recommendations concrete and actionable?
      - consistency:    Is the output internally consistent?
      - evidence:       Are claims backed by references or examples?
      - risk_awareness: Does the output acknowledge trade-offs and risks?
    """

    REVIEW_THRESHOLD = 0.65

    def __init__(self, llm):
        self.llm = llm

    def score(
        self,
        agent_type:      str,
        task:            Dict[str, Any],
        output:          Dict[str, Any],
        expected_fields: List[str] = None,
    ) -> ConfidenceResult:
        """Score an agent output and flag if human review is needed."""

        # Structural completeness check (fast, no LLM)
        completeness = self._check_completeness(output, expected_fields or [])

        # LLM-based quality assessment
        quality = self._llm_quality_check(agent_type, task, output)

        factors = {
            "completeness":   completeness,
            "specificity":    quality.get("specificity", 0.7),
            "consistency":    quality.get("consistency", 0.7),
            "evidence":       quality.get("evidence", 0.6),
            "risk_awareness": quality.get("risk_awareness", 0.6),
        }

        # Weighted average
        weights = {
            "completeness":   0.25,
            "specificity":    0.25,
            "consistency":    0.20,
            "evidence":       0.15,
            "risk_awareness": 0.15,
        }
        score = sum(factors[k] * weights[k] for k in factors)

        return ConfidenceResult(
            score           = round(score, 3),
            requires_review = score < self.REVIEW_THRESHOLD,
            factors         = factors,
            explanation     = quality.get("explanation", ""),
            suggestions     = quality.get("suggestions", []),
        )

    def _check_completeness(self, output: Dict, expected: List[str]) -> float:
        if not expected:
            return 0.8 if output else 0.0
        present = sum(1 for f in expected if f in output and output[f])
        return present / len(expected) if expected else 0.8

    def _llm_quality_check(self, agent_type, task, output) -> Dict:
        prompt = f"""You are a quality assessor for AI agent outputs.

Agent Type: {agent_type}
Task Summary: {json.dumps(task, default=str)[:500]}
Output Summary: {json.dumps(output, default=str)[:1000]}

Score this output on each dimension from 0.0 to 1.0:
- specificity: Are recommendations concrete and actionable (not vague)?
- consistency: Is the output internally consistent with no contradictions?
- evidence: Are claims backed by examples, references, or reasoning?
- risk_awareness: Does it acknowledge trade-offs, risks, and limitations?

Also provide:
- explanation: One sentence summary of quality
- suggestions: Up to 3 specific improvements

Respond as JSON:
{{
  "specificity": <float>,
  "consistency": <float>,
  "evidence": <float>,
  "risk_awareness": <float>,
  "explanation": "<string>",
  "suggestions": ["<s1>", "<s2>"]
}}"""
        try:
            resp = self.llm.complete(prompt, response_format="json")
            return resp.get("parsed", {})
        except Exception:
            return {"specificity": 0.6, "consistency": 0.7,
                    "evidence": 0.5, "risk_awareness": 0.6,
                    "explanation": "Quality check unavailable", "suggestions": []}


# ── Adversarial Agent ─────────────────────────────────────────────────────────

@dataclass
class AdversarialReport:
    report_id:       str
    target_agent:    str
    target_output:   str
    attack_vectors:  List[Dict[str, Any]]
    critical_gaps:   List[str]
    risk_score:      float          # 0.0 (safe) – 1.0 (critically flawed)
    recommendations: List[str]
    verdict:         str            # "approved" | "needs_revision" | "rejected"


class AdversarialAgent:
    """
    Devil's Advocate agent that stress-tests every design decision.

    Attack vectors:
      - Edge cases and boundary conditions
      - Failure modes and cascading failures
      - Security vulnerabilities
      - Scalability bottlenecks
      - Operational complexity traps
      - Hidden assumptions
      - Missing error handling
      - Race conditions and concurrency issues
    """

    REJECTION_THRESHOLD  = 0.75
    REVISION_THRESHOLD   = 0.40

    def __init__(self, llm, memory=None):
        self.llm    = llm
        self.memory = memory

    def challenge(
        self,
        target_agent:  str,
        output:        Dict[str, Any],
        context:       Dict[str, Any] = None,
        attack_depth:  str = "standard",   # "light" | "standard" | "deep"
    ) -> AdversarialReport:
        """Challenge an agent's output and produce an adversarial report."""

        report_id  = f"adv-{uuid.uuid4().hex[:8]}"
        output_str = json.dumps(output, default=str, indent=2)[:3000]
        ctx_str    = json.dumps(context or {}, default=str)[:1000]

        attack_instructions = {
            "light":    "Focus on the top 3 most critical issues only.",
            "standard": "Identify all significant issues across 5+ attack vectors.",
            "deep":     "Exhaustively probe every assumption, edge case, and failure mode.",
        }[attack_depth]

        prompt = f"""You are an adversarial AI agent — a Devil's Advocate whose job is to
find every flaw, gap, risk, and failure mode in the following agent output.

Target Agent: {target_agent}
Context: {ctx_str}
Output to Challenge:
{output_str}

{attack_instructions}

Attack vectors to probe:
1. Edge cases and boundary conditions
2. Failure modes and cascading failures
3. Security vulnerabilities (injection, auth bypass, data exposure)
4. Scalability bottlenecks (N+1 queries, single points of failure, memory leaks)
5. Operational complexity (deployment complexity, observability gaps, runbook gaps)
6. Hidden assumptions (assumes specific infra, assumes team expertise, etc.)
7. Missing error handling and recovery paths
8. Race conditions, concurrency, and distributed systems issues
9. Data consistency and integrity risks
10. Cost and performance traps

For each attack vector, rate severity: critical | high | medium | low

Respond as JSON:
{{
  "attack_vectors": [
    {{
      "vector": "<name>",
      "severity": "critical|high|medium|low",
      "description": "<what is wrong>",
      "exploit_scenario": "<how this could fail in production>",
      "remediation": "<specific fix>"
    }}
  ],
  "critical_gaps": ["<gap 1>", "<gap 2>"],
  "risk_score": <0.0-1.0>,
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "verdict": "approved|needs_revision|rejected",
  "verdict_reasoning": "<why>"
}}"""

        resp   = self.llm.complete(prompt, response_format="json")
        parsed = resp.get("parsed", {})

        report = AdversarialReport(
            report_id       = report_id,
            target_agent    = target_agent,
            target_output   = output_str[:500],
            attack_vectors  = parsed.get("attack_vectors", []),
            critical_gaps   = parsed.get("critical_gaps", []),
            risk_score      = parsed.get("risk_score", 0.3),
            recommendations = parsed.get("recommendations", []),
            verdict         = parsed.get("verdict", "needs_revision"),
        )

        log.info("adversarial.complete", report_id=report_id,
                 target=target_agent, verdict=report.verdict,
                 risk_score=report.risk_score,
                 critical_count=sum(1 for v in report.attack_vectors
                                    if v.get("severity") == "critical"))
        return report


# ── Long-Horizon Planner ──────────────────────────────────────────────────────

@dataclass
class RoadmapMilestone:
    quarter:     str
    theme:       str
    objectives:  List[str]
    key_results: List[str]
    risks:       List[str]
    dependencies: List[str]


@dataclass
class ProductRoadmap:
    roadmap_id:  str
    product:     str
    horizon:     str          # "6m" | "12m" | "24m"
    milestones:  List[RoadmapMilestone]
    north_star:  str
    success_metrics: List[str]
    investment_areas: List[str]
    tokens_used: int


class LongHorizonPlanner:
    """
    Plans a 6–24 month product roadmap from the current project state,
    ensuring architecture decisions are future-proof.
    """

    def __init__(self, llm, memory=None):
        self.llm    = llm
        self.memory = memory

    def plan(
        self,
        product_name:    str,
        current_state:   Dict[str, Any],
        business_goals:  List[str],
        horizon:         str = "12m",
        constraints:     List[str] = None,
    ) -> ProductRoadmap:
        """Generate a long-horizon product roadmap."""

        state_str       = json.dumps(current_state, default=str, indent=2)[:2000]
        goals_str       = "\n".join(f"- {g}" for g in business_goals)
        constraints_str = "\n".join(f"- {c}" for c in (constraints or []))

        quarters = {"6m": 2, "12m": 4, "24m": 8}[horizon]

        prompt = f"""You are a Chief Product Officer and Principal Architect planning a
{horizon} product roadmap for {product_name}.

Current State:
{state_str}

Business Goals:
{goals_str}

Constraints:
{constraints_str}

Plan {quarters} quarterly milestones. Each milestone must:
- Have a clear theme (e.g., "Foundation", "Scale", "Intelligence", "Enterprise")
- Define 3-5 objectives with measurable key results (OKR format)
- Identify architectural decisions required this quarter
- List risks and dependencies

Also define:
- North Star metric (the single metric that matters most)
- 5 success metrics for the full horizon
- Top 3 investment areas (where to focus engineering effort)

Respond as JSON:
{{
  "north_star": "<metric>",
  "success_metrics": ["<m1>", "<m2>", "<m3>", "<m4>", "<m5>"],
  "investment_areas": ["<area 1>", "<area 2>", "<area 3>"],
  "milestones": [
    {{
      "quarter": "Q1 2025",
      "theme": "<theme>",
      "objectives": ["<obj 1>", "<obj 2>"],
      "key_results": ["<kr 1>", "<kr 2>"],
      "risks": ["<risk 1>"],
      "dependencies": ["<dep 1>"]
    }}
  ]
}}"""

        resp   = self.llm.complete(prompt, response_format="json")
        parsed = resp.get("parsed", {})

        milestones = [
            RoadmapMilestone(
                quarter      = m.get("quarter", f"Q{i+1}"),
                theme        = m.get("theme", ""),
                objectives   = m.get("objectives", []),
                key_results  = m.get("key_results", []),
                risks        = m.get("risks", []),
                dependencies = m.get("dependencies", []),
            )
            for i, m in enumerate(parsed.get("milestones", []))
        ]

        roadmap = ProductRoadmap(
            roadmap_id       = f"roadmap-{uuid.uuid4().hex[:8]}",
            product          = product_name,
            horizon          = horizon,
            milestones       = milestones,
            north_star       = parsed.get("north_star", ""),
            success_metrics  = parsed.get("success_metrics", []),
            investment_areas = parsed.get("investment_areas", []),
            tokens_used      = resp.get("tokens_used", 0),
        )

        if self.memory:
            self.memory.semantic.store(
                content=f"Roadmap for {product_name} ({horizon}): "
                        f"North Star: {roadmap.north_star}. "
                        f"Milestones: {', '.join(m.theme for m in milestones)}",
                metadata={"type": "product_roadmap", "product": product_name,
                          "horizon": horizon},
            )

        log.info("roadmap.complete", product=product_name, horizon=horizon,
                 milestones=len(milestones))
        return roadmap
