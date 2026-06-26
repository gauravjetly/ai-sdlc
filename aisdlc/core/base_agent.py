"""
AI-SDLC Base Agent
==================
Every SDLC agent inherits from this class.

Built-in capabilities:
  • Model-agnostic LLM calls via LLMGateway
  • 4-layer memory (working / episodic / semantic / procedural)
  • Full ReAct agentic loop with tool use
  • Self-learning: auto-records outcomes to episodic memory
  • NoOps hooks: health reporting, auto-retry, circuit breaker
  • Structured logging and cost tracking
  • Human-in-the-loop (HITL) gate support
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import structlog

from aisdlc.core.llm_gateway import LLMGateway, LLMConfig, LLMResponse, Message, Role, Tool

log = structlog.get_logger(__name__)


class AgentStatus(str, Enum):
    IDLE      = "idle"
    RUNNING   = "running"
    WAITING   = "waiting_hitl"
    COMPLETED = "completed"
    FAILED    = "failed"
    HEALING   = "healing"


@dataclass
class AgentResult:
    agent_id:    str
    agent_type:  str
    success:     bool
    output:      Dict[str, Any]
    artifacts:   List[str]          = field(default_factory=list)
    errors:      List[str]          = field(default_factory=list)
    duration_s:  float              = 0.0
    cost_usd:    float              = 0.0
    tokens_used: int                = 0
    metadata:    Dict[str, Any]     = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "agent_id":   self.agent_id,
            "agent_type": self.agent_type,
            "success":    self.success,
            "output":     self.output,
            "artifacts":  self.artifacts,
            "errors":     self.errors,
            "duration_s": round(self.duration_s, 2),
            "cost_usd":   round(self.cost_usd, 6),
            "tokens_used": self.tokens_used,
            "metadata":   self.metadata,
        }


class BaseAgent(ABC):
    """
    Abstract base for every AI-SDLC agent.

    Subclasses must implement:
      - AGENT_TYPE: str  — unique identifier e.g. "security_agent"
      - SYSTEM_PROMPT: str  — the agent's full persona and instructions
      - get_tools() -> List[Tool]  — tools this agent can call
      - execute(task: Dict, context: Dict) -> AgentResult  — main work method
    """

    AGENT_TYPE:    str = "base_agent"
    SYSTEM_PROMPT: str = "You are an AI-SDLC agent."

    def __init__(
        self,
        llm:          Optional[LLMGateway] = None,
        memory:       Optional[Any]        = None,   # MemorySystem injected at runtime
        hitl_handler: Optional[Callable]   = None,   # Human-in-the-loop callback
        config:       Optional[Dict]       = None,
    ):
        self.id           = f"{self.AGENT_TYPE}-{uuid.uuid4().hex[:8]}"
        self.llm          = llm or LLMGateway.from_env()
        self.memory       = memory
        self.hitl_handler = hitl_handler
        self.config       = config or {}
        self.status       = AgentStatus.IDLE
        self._run_count   = 0
        self._fail_count  = 0
        self._circuit_open = False
        log.info("agent.created", id=self.id, type=self.AGENT_TYPE)

    # ── Abstract interface ────────────────────────────────────────────────────

    @abstractmethod
    def get_tools(self) -> List[Tool]:
        """Return the list of tools this agent can call."""
        ...

    @abstractmethod
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        """
        Main agent work method.
        task    — the specific task payload for this agent
        context — shared project context (PRD, architecture, previous outputs, etc.)
        """
        ...

    # ── Core run method (wraps execute with NoOps capabilities) ──────────────

    def run(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        """
        Run the agent with full NoOps wrapping:
          - Circuit breaker (stops calling a broken agent)
          - Auto-retry with exponential back-off
          - Episodic memory recording
          - Cost and token tracking
          - Status management
        """
        if self._circuit_open:
            log.error("agent.circuit_open", id=self.id)
            return AgentResult(agent_id=self.id, agent_type=self.AGENT_TYPE,
                success=False, output={}, errors=["Circuit breaker open — agent disabled"])

        self.status = AgentStatus.RUNNING
        self._run_count += 1
        start = time.time()
        result: Optional[AgentResult] = None

        max_attempts = self.config.get("max_retries", 2)
        for attempt in range(max_attempts + 1):
            try:
                result = self.execute(task, context)
                result.duration_s  = time.time() - start
                result.cost_usd    = self.llm.stats()["cost_usd"]
                result.tokens_used = self.llm.stats()["tokens"]
                self._fail_count   = 0
                self.status        = AgentStatus.COMPLETED
                self._record_outcome(task, context, result)
                log.info("agent.success", id=self.id, duration=f"{result.duration_s:.1f}s")
                return result
            except Exception as exc:
                self._fail_count += 1
                log.error("agent.error", id=self.id, attempt=attempt, error=str(exc))
                if attempt < max_attempts:
                    wait = 2 ** attempt
                    log.info("agent.retry", wait=wait)
                    time.sleep(wait)
                else:
                    self.status = AgentStatus.FAILED
                    if self._fail_count >= self.config.get("circuit_threshold", 5):
                        self._circuit_open = True
                        log.error("agent.circuit_opened", id=self.id)
                    result = AgentResult(agent_id=self.id, agent_type=self.AGENT_TYPE,
                        success=False, output={}, errors=[str(exc)],
                        duration_s=time.time()-start)
                    self._record_outcome(task, context, result)
                    return result

        return result  # type: ignore

    # ── LLM helpers ──────────────────────────────────────────────────────────

    def think(self, prompt: str, context: Optional[str] = None) -> str:
        """Simple single-turn LLM call with memory context injection."""
        system = self._build_system_prompt(context)
        msgs   = [Message(role=Role.USER, content=prompt)]
        resp   = self.llm.complete(msgs, system_prompt=system)
        return resp.content

    def think_with_tools(self, prompt: str, context: Optional[str] = None,
                         extra_tools: Optional[List[Tool]] = None) -> LLMResponse:
        """Full agentic loop with tool use."""
        system = self._build_system_prompt(context)
        tools  = self.get_tools() + (extra_tools or [])
        msgs   = [Message(role=Role.USER, content=prompt)]
        return self.llm.agentic_loop(msgs, tools, self._execute_tool, system_prompt=system)

    def _build_system_prompt(self, extra_context: Optional[str] = None) -> str:
        """Build the full system prompt with memory context injected."""
        prompt = self.SYSTEM_PROMPT
        if self.memory:
            try:
                mem_ctx = self.memory.build_context(
                    query=extra_context or self.AGENT_TYPE,
                    project_id=self.memory.working.get("project_id"),
                    max_tokens=1500,
                )
                if mem_ctx.strip():
                    prompt += f"\n\n---\n## Memory Context\n{mem_ctx}"
            except Exception as e:
                log.warning("agent.memory_context_error", error=str(e))
        return prompt

    def _execute_tool(self, name: str, args: Dict) -> Any:
        """Dispatch a tool call to the registered tool handlers."""
        handler = getattr(self, f"_tool_{name}", None)
        if handler:
            return handler(**args)
        raise ValueError(f"Unknown tool: {name}")

    # ── HITL gate ─────────────────────────────────────────────────────────────

    def request_human_approval(self, decision: str, payload: Dict) -> bool:
        """
        Request human approval for a critical decision.
        Returns True if approved, False if rejected.
        If no HITL handler is configured, auto-approves (NoOps mode).
        """
        if self.hitl_handler is None:
            log.info("hitl.auto_approved", decision=decision)
            return True
        self.status = AgentStatus.WAITING
        approved = self.hitl_handler(self.id, self.AGENT_TYPE, decision, payload)
        self.status = AgentStatus.RUNNING
        log.info("hitl.decision", decision=decision, approved=approved)
        return approved

    # ── Memory helpers ────────────────────────────────────────────────────────

    def _record_outcome(self, task: Dict, context: Dict, result: AgentResult) -> None:
        """Auto-record the outcome to episodic memory for self-learning."""
        if not self.memory:
            return
        try:
            from aisdlc.memory.memory_system import MemoryImportance
            importance = MemoryImportance.HIGH if result.success else MemoryImportance.CRITICAL
            self.memory.episodic.record_event(
                event_type  = f"{self.AGENT_TYPE}.{'success' if result.success else 'failure'}",
                description = (
                    f"Agent {self.AGENT_TYPE} {'completed' if result.success else 'failed'}. "
                    f"Task: {json.dumps(task)[:200]}. "
                    f"Duration: {result.duration_s:.1f}s. "
                    f"Errors: {result.errors[:3] if result.errors else 'none'}"
                ),
                project_id  = context.get("project_id"),
                agent_id    = self.id,
                metadata    = {"task": task, "success": result.success,
                               "artifacts": result.artifacts},
                importance  = importance,
            )
        except Exception as e:
            log.warning("agent.record_outcome_error", error=str(e))

    def recall(self, query: str, n: int = 5) -> List[str]:
        """Recall relevant knowledge from semantic memory."""
        if not self.memory:
            return []
        try:
            return self.memory.semantic.recall(query, n=n)
        except Exception:
            return []

    # ── Health / NoOps ────────────────────────────────────────────────────────

    def health(self) -> Dict[str, Any]:
        return {
            "id":            self.id,
            "type":          self.AGENT_TYPE,
            "status":        self.status.value,
            "run_count":     self._run_count,
            "fail_count":    self._fail_count,
            "circuit_open":  self._circuit_open,
            "llm_stats":     self.llm.stats(),
        }

    def reset_circuit(self) -> None:
        """Manually reset the circuit breaker (called by self-healing engine)."""
        self._circuit_open = False
        self._fail_count   = 0
        log.info("agent.circuit_reset", id=self.id)
