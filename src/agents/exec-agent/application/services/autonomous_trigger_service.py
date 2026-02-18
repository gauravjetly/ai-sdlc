"""
AutonomousTriggerService - Watches SDLC events and autonomously triggers
presentation generation when relevant events occur.

This is an application-layer service that coordinates between the
EventStreamClient (infrastructure) and PresentationGenerator (application).
It encodes the Phase A trigger rules that map SDLC events to presentation types.

Architecture:
  - Application layer: orchestrates domain and infrastructure.
  - No direct file-system access (delegates to EventStreamClient).
  - Cooldown management prevents generation storms.

Graceful degradation: if the mesh is not running the EventStreamClient returns
no events and the trigger service simply waits, never raising exceptions.
"""

import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Protocol, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Trigger rules
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TriggerRule:
    """
    Immutable rule mapping an SDLC event type to a presentation action.

    Fields:
        event_type:         SDLC event type string to match.
        presentation_type:  Presentation type to generate.
        delay_seconds:      Seconds to wait before triggering (0 = immediate).
        cooldown_minutes:   Minimum interval between re-triggering the same rule
                            for the same project.
        priority:           'critical' | 'high' | 'normal' | 'low'.
        rule_id:            Unique rule identifier.
    """

    event_type: str
    presentation_type: str
    delay_seconds: int = 0
    cooldown_minutes: int = 60
    priority: str = "normal"
    rule_id: str = ""


# Initial rule set for Phase A (subset of the full 12 rules defined in V2 architecture)
TRIGGER_RULES: List[TriggerRule] = [
    TriggerRule(
        rule_id="R-001",
        event_type="project.completed",
        presentation_type="executive_summary",
        delay_seconds=0,
        cooldown_minutes=60,
        priority="high",
    ),
    TriggerRule(
        rule_id="R-002",
        event_type="architecture.updated",
        presentation_type="architecture_overview",
        delay_seconds=30,
        cooldown_minutes=120,
        priority="normal",
    ),
    TriggerRule(
        rule_id="R-003",
        event_type="security.vulnerability_found",
        presentation_type="executive_summary",
        delay_seconds=0,
        cooldown_minutes=30,
        priority="high",
    ),
    TriggerRule(
        rule_id="R-007",
        event_type="tests.failed",
        presentation_type="status_report",
        delay_seconds=0,
        cooldown_minutes=60,
        priority="normal",
    ),
    TriggerRule(
        rule_id="R-008",
        event_type="deployment.completed",
        presentation_type="status_report",
        delay_seconds=0,
        cooldown_minutes=30,
        priority="low",
    ),
    TriggerRule(
        rule_id="R-012",
        event_type="sprint.completed",
        presentation_type="executive_summary",
        delay_seconds=0,
        cooldown_minutes=0,
        priority="normal",
    ),
]


# ---------------------------------------------------------------------------
# Protocol for PresentationGenerator (dependency inversion)
# ---------------------------------------------------------------------------

class PresentationGeneratorPort(Protocol):
    """
    Minimal protocol required by AutonomousTriggerService.
    The real PresentationGenerator in application/services satisfies this.
    """

    def generate(
        self,
        project_id: str,
        presentation_type: str,
        auto_mode: bool = True,
    ) -> Optional[str]:
        """Generate a presentation and return its path (or None on failure)."""
        ...


# ---------------------------------------------------------------------------
# EventStreamClientPort (dependency inversion)
# ---------------------------------------------------------------------------

class EventStreamClientPort(Protocol):
    """Minimal protocol for the EventStreamClient."""

    def subscribe(
        self,
        event_type: str,
        handler: Callable[[Dict[str, Any]], None],
    ) -> None: ...

    def start_polling(self, interval_seconds: int = 15) -> None: ...

    def stop(self) -> None: ...


# ---------------------------------------------------------------------------
# AutonomousTriggerService
# ---------------------------------------------------------------------------

class AutonomousTriggerService:
    """
    Subscribes to SDLC events via EventStreamClient and autonomously triggers
    presentation generation for matching trigger rules.

    Cooldown management:
        Each (project_id, rule_id) pair is tracked independently.
        If a cooldown is active, the trigger is suppressed and logged.

    Thread safety:
        Cooldown records are protected by a threading.Lock.
        Presentation generation is dispatched to a daemon thread to avoid
        blocking the polling loop.
    """

    def __init__(
        self,
        event_client: EventStreamClientPort,
        generator: PresentationGeneratorPort,
        rules: Optional[List[TriggerRule]] = None,
        poll_interval_seconds: int = 15,
    ) -> None:
        self._event_client = event_client
        self._generator = generator
        self._rules = rules if rules is not None else TRIGGER_RULES
        self._poll_interval = poll_interval_seconds
        # Cooldown store: key = (project_id, rule_id), value = last_executed datetime
        self._cooldowns: Dict[Tuple[str, str], datetime] = {}
        self._cooldown_lock = threading.Lock()
        self._active_generations: int = 0
        self._max_concurrent: int = 3
        self._gen_lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """
        Subscribe to all trigger event types and start the event polling loop.

        Safe to call multiple times (idempotent).
        """
        for rule in self._rules:
            # Bind each rule into its own closure to avoid late-binding issues
            self._subscribe_rule(rule)

        self._event_client.start_polling(interval_seconds=self._poll_interval)
        logger.info(
            "AutonomousTriggerService: started with %d rules, polling every %ds",
            len(self._rules),
            self._poll_interval,
        )

    def stop(self) -> None:
        """Stop the event stream polling."""
        self._event_client.stop()
        logger.info("AutonomousTriggerService: stopped")

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _subscribe_rule(self, rule: TriggerRule) -> None:
        """Register the event handler for a single rule."""

        def handler(message: Dict[str, Any], _rule: TriggerRule = rule) -> None:
            self._handle_event(message, _rule)

        handler.__name__ = f"trigger_{rule.rule_id}"
        self._event_client.subscribe(rule.event_type, handler)

    def _handle_event(
        self,
        message: Dict[str, Any],
        rule: TriggerRule,
    ) -> None:
        """
        Called when an event matching a rule's event_type arrives.

        Extracts the project_id, checks cooldown, and dispatches generation.
        """
        project_id = self._extract_project_id(message)
        if not project_id:
            logger.debug(
                "AutonomousTriggerService: rule %s event has no project_id – skipping",
                rule.rule_id,
            )
            return

        if self._is_in_cooldown(project_id, rule.rule_id):
            logger.debug(
                "AutonomousTriggerService: rule %s suppressed for project '%s' (cooldown active)",
                rule.rule_id,
                project_id,
            )
            return

        logger.info(
            "AutonomousTriggerService: rule %s triggered for project '%s' – "
            "generating '%s'",
            rule.rule_id,
            project_id,
            rule.presentation_type,
        )

        self._record_cooldown(project_id, rule.rule_id)

        # Dispatch to background thread to avoid blocking the polling loop
        delay = rule.delay_seconds
        gen_thread = threading.Thread(
            target=self._generate_with_delay,
            args=(project_id, rule.presentation_type, delay),
            daemon=True,
            name=f"exec-gen-{rule.rule_id}-{project_id}",
        )
        gen_thread.start()

    def _generate_with_delay(
        self,
        project_id: str,
        presentation_type: str,
        delay_seconds: int,
    ) -> None:
        """Run in a daemon thread: optionally wait, then call the generator."""
        if delay_seconds > 0:
            import time
            time.sleep(delay_seconds)

        with self._gen_lock:
            if self._active_generations >= self._max_concurrent:
                logger.warning(
                    "AutonomousTriggerService: max concurrent generations (%d) "
                    "reached, dropping generation for '%s'",
                    self._max_concurrent,
                    project_id,
                )
                return
            self._active_generations += 1

        try:
            output_path = self._generator.generate(
                project_id=project_id,
                presentation_type=presentation_type,
                auto_mode=True,
            )
            if output_path:
                logger.info(
                    "AutonomousTriggerService: generated '%s' for project '%s' -> '%s'",
                    presentation_type,
                    project_id,
                    output_path,
                )
            else:
                logger.warning(
                    "AutonomousTriggerService: generator returned no path for '%s'/'%s'",
                    project_id,
                    presentation_type,
                )
        except Exception as exc:
            logger.error(
                "AutonomousTriggerService: generation failed for '%s'/'%s': %s",
                project_id,
                presentation_type,
                exc,
                exc_info=True,
            )
        finally:
            with self._gen_lock:
                self._active_generations -= 1

    def _extract_project_id(self, message: Dict[str, Any]) -> Optional[str]:
        """
        Attempt to extract project_id from various message structures.

        The mesh wraps events in AgentMessage; the project_id may be at the
        top level, inside 'context', or inside a decoded 'content' dict.
        """
        # Direct key
        if "project_id" in message:
            return message["project_id"]

        # Nested in context
        context = message.get("context") or {}
        if "projectId" in context:
            return context["projectId"]
        if "project_id" in context:
            return context["project_id"]

        # Decoded content payload
        decoded = message.get("_decoded_content") or {}
        if "project_id" in decoded:
            return decoded["project_id"]
        payload = decoded.get("payload") or {}
        if "project_id" in payload:
            return payload["project_id"]

        return None

    def _is_in_cooldown(self, project_id: str, rule_id: str) -> bool:
        """
        Return True if the rule+project combination is still within its cooldown window.
        """
        # Find cooldown_minutes for the rule
        rule = next((r for r in self._rules if r.rule_id == rule_id), None)
        if rule is None or rule.cooldown_minutes <= 0:
            return False

        with self._cooldown_lock:
            last_exec = self._cooldowns.get((project_id, rule_id))

        if last_exec is None:
            return False

        cutoff = last_exec + timedelta(minutes=rule.cooldown_minutes)
        return datetime.now(timezone.utc) < cutoff

    def _record_cooldown(self, project_id: str, rule_id: str) -> None:
        """Record the execution time for cooldown tracking."""
        with self._cooldown_lock:
            self._cooldowns[(project_id, rule_id)] = datetime.now(timezone.utc)
