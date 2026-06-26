"""
Multi-Agent Debate Engine
==========================
Implements structured adversarial debate between agents before committing
to any major architectural, security, or design decision.

Flow:
  1. Proposer agent presents a position with supporting arguments
  2. Challenger agent argues the opposing position
  3. Up to N rounds of rebuttal
  4. Judge agent evaluates both sides and renders a verdict with confidence
  5. Verdict + full transcript stored in reasoning trace store
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import structlog

log = structlog.get_logger(__name__)


class DebateOutcome(str, Enum):
    PROPOSER_WINS   = "proposer_wins"
    CHALLENGER_WINS = "challenger_wins"
    COMPROMISE      = "compromise"
    INCONCLUSIVE    = "inconclusive"


@dataclass
class DebateArgument:
    role:        str          # "proposer" | "challenger" | "rebuttal"
    round:       int
    content:     str
    evidence:    List[str]    = field(default_factory=list)
    confidence:  float        = 0.0
    timestamp:   float        = field(default_factory=time.time)


@dataclass
class DebateVerdict:
    debate_id:       str
    topic:           str
    outcome:         DebateOutcome
    winning_position: str
    reasoning:       str
    confidence:      float
    compromise_text: Optional[str]
    arguments:       List[DebateArgument]
    duration_s:      float
    tokens_used:     int


class DebateEngine:
    """
    Orchestrates structured multi-agent debates for high-stakes decisions.

    Supports:
      - Architecture decisions (monolith vs microservices, SQL vs NoSQL, etc.)
      - Security trade-offs (convenience vs security)
      - Technology selection debates
      - Design pattern choices
    """

    def __init__(self, llm, memory=None, max_rounds: int = 3):
        self.llm        = llm
        self.memory     = memory
        self.max_rounds = max_rounds

    def debate(
        self,
        topic:        str,
        position_a:   str,
        position_b:   str,
        context:      Dict[str, Any] = None,
        domain:       str = "software_architecture",
    ) -> DebateVerdict:
        """Run a full structured debate and return a verdict."""
        debate_id  = f"debate-{uuid.uuid4().hex[:8]}"
        start_time = time.time()
        arguments: List[DebateArgument] = []
        tokens     = 0

        log.info("debate.start", debate_id=debate_id, topic=topic[:80])

        ctx_str = json.dumps(context or {}, indent=2)[:2000]

        # ── Round 0: Opening statements ───────────────────────────────────────
        prop_opening = self._call_proposer(
            topic, position_a, position_b, ctx_str, "opening", [], domain
        )
        tokens += prop_opening["tokens"]
        arguments.append(DebateArgument(
            role="proposer", round=0,
            content=prop_opening["argument"],
            evidence=prop_opening.get("evidence", []),
            confidence=prop_opening.get("confidence", 0.7),
        ))

        chal_opening = self._call_challenger(
            topic, position_b, position_a, ctx_str, "opening",
            [a.content for a in arguments], domain
        )
        tokens += chal_opening["tokens"]
        arguments.append(DebateArgument(
            role="challenger", round=0,
            content=chal_opening["argument"],
            evidence=chal_opening.get("evidence", []),
            confidence=chal_opening.get("confidence", 0.7),
        ))

        # ── Rounds 1..N: Rebuttals ────────────────────────────────────────────
        for rnd in range(1, self.max_rounds + 1):
            prop_rebuttal = self._call_proposer(
                topic, position_a, position_b, ctx_str, "rebuttal",
                [a.content for a in arguments], domain
            )
            tokens += prop_rebuttal["tokens"]
            arguments.append(DebateArgument(
                role="rebuttal", round=rnd,
                content=prop_rebuttal["argument"],
                evidence=prop_rebuttal.get("evidence", []),
                confidence=prop_rebuttal.get("confidence", 0.7),
            ))

            chal_rebuttal = self._call_challenger(
                topic, position_b, position_a, ctx_str, "rebuttal",
                [a.content for a in arguments], domain
            )
            tokens += chal_rebuttal["tokens"]
            arguments.append(DebateArgument(
                role="rebuttal", round=rnd,
                content=chal_rebuttal["argument"],
                evidence=chal_rebuttal.get("evidence", []),
                confidence=chal_rebuttal.get("confidence", 0.7),
            ))

        # ── Final: Judge verdict ──────────────────────────────────────────────
        verdict_raw = self._call_judge(
            topic, position_a, position_b, ctx_str,
            [a.content for a in arguments], domain
        )
        tokens += verdict_raw["tokens"]

        outcome_map = {
            "a": DebateOutcome.PROPOSER_WINS,
            "b": DebateOutcome.CHALLENGER_WINS,
            "compromise": DebateOutcome.COMPROMISE,
        }
        outcome = outcome_map.get(verdict_raw.get("winner", "").lower(),
                                   DebateOutcome.INCONCLUSIVE)

        winning_pos = position_a if outcome == DebateOutcome.PROPOSER_WINS else (
            position_b if outcome == DebateOutcome.CHALLENGER_WINS else
            verdict_raw.get("compromise", "")
        )

        verdict = DebateVerdict(
            debate_id        = debate_id,
            topic            = topic,
            outcome          = outcome,
            winning_position = winning_pos,
            reasoning        = verdict_raw.get("reasoning", ""),
            confidence       = verdict_raw.get("confidence", 0.0),
            compromise_text  = verdict_raw.get("compromise"),
            arguments        = arguments,
            duration_s       = time.time() - start_time,
            tokens_used      = tokens,
        )

        # Store in memory for future reference
        if self.memory:
            self.memory.episodic.store(
                content=f"Debate: {topic}\nOutcome: {outcome.value}\n"
                        f"Winner: {winning_pos[:200]}\nReasoning: {verdict.reasoning[:500]}",
                metadata={"type": "debate_verdict", "debate_id": debate_id,
                          "outcome": outcome.value, "domain": domain},
            )

        log.info("debate.complete", debate_id=debate_id,
                 outcome=outcome.value, confidence=verdict.confidence)
        return verdict

    # ── Internal LLM calls ────────────────────────────────────────────────────

    def _call_proposer(self, topic, position, opposing, ctx, stage, history, domain):
        history_str = "\n\n".join(f"[{i+1}] {h}" for i, h in enumerate(history[-4:]))
        prompt = f"""You are a senior {domain} expert PROPOSING the following position.

TOPIC: {topic}
YOUR POSITION: {position}
OPPOSING POSITION: {opposing}
CONTEXT: {ctx}
DEBATE HISTORY:
{history_str}

Stage: {stage.upper()}

Present your strongest {stage} for your position. Be specific, cite concrete evidence,
reference industry standards, and address weaknesses in the opposing view.

Respond as JSON:
{{
  "argument": "<your full argument>",
  "evidence": ["<evidence 1>", "<evidence 2>"],
  "confidence": <0.0-1.0>,
  "key_points": ["<point 1>", "<point 2>"]
}}"""
        resp = self.llm.complete(prompt, response_format="json")
        return {**resp.get("parsed", {}), "tokens": resp.get("tokens_used", 0)}

    def _call_challenger(self, topic, position, opposing, ctx, stage, history, domain):
        history_str = "\n\n".join(f"[{i+1}] {h}" for i, h in enumerate(history[-4:]))
        prompt = f"""You are a senior {domain} expert CHALLENGING the following position.

TOPIC: {topic}
YOUR POSITION (challenger): {position}
POSITION YOU ARE CHALLENGING: {opposing}
CONTEXT: {ctx}
DEBATE HISTORY:
{history_str}

Stage: {stage.upper()}

Present your strongest {stage} against the opposing position. Be rigorous, cite failure
cases, scalability limits, security risks, or maintenance costs. Propose your alternative.

Respond as JSON:
{{
  "argument": "<your full argument>",
  "evidence": ["<evidence 1>", "<evidence 2>"],
  "confidence": <0.0-1.0>,
  "key_weaknesses_identified": ["<weakness 1>", "<weakness 2>"]
}}"""
        resp = self.llm.complete(prompt, response_format="json")
        return {**resp.get("parsed", {}), "tokens": resp.get("tokens_used", 0)}

    def _call_judge(self, topic, pos_a, pos_b, ctx, history, domain):
        history_str = "\n\n".join(f"[{i+1}] {h}" for i, h in enumerate(history))
        prompt = f"""You are an impartial senior {domain} judge evaluating a technical debate.

TOPIC: {topic}
POSITION A: {pos_a}
POSITION B: {pos_b}
CONTEXT: {ctx}

FULL DEBATE TRANSCRIPT:
{history_str}

Evaluate both positions objectively. Consider:
1. Technical merit and correctness
2. Scalability and performance implications
3. Security and reliability
4. Operational complexity and maintainability
5. Cost and time-to-market
6. Industry best practices

Respond as JSON:
{{
  "winner": "a" | "b" | "compromise",
  "reasoning": "<detailed reasoning for your verdict>",
  "confidence": <0.0-1.0>,
  "compromise": "<if winner=compromise, describe the hybrid approach>",
  "key_factors": ["<factor 1>", "<factor 2>"],
  "risks_of_chosen_approach": ["<risk 1>", "<risk 2>"],
  "mitigation_strategies": ["<mitigation 1>", "<mitigation 2>"]
}}"""
        resp = self.llm.complete(prompt, response_format="json")
        return {**resp.get("parsed", {}), "tokens": resp.get("tokens_used", 0)}
