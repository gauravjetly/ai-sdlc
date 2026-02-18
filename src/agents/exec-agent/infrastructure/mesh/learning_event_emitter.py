"""
LearningEventEmitter - Broadcasts exec agent learnings to the agent mesh.

Allows other mesh agents to benefit from presentation effectiveness insights.
Uses the file-based mesh by writing learning event files directly to the mesh
outbox directory, which the TypeScript LearningEngine picks up and propagates.

Architecture: Infrastructure layer only. No domain logic.

Graceful degradation: if the mesh directory does not exist or the subprocess
call fails, the error is logged but never re-raised – the exec agent continues
operating normally.
"""

import json
import logging
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class LearningEventEmitter:
    """
    Emits learning events to the agent mesh using two strategies:

    1. File-based (primary): writes a LearningEvent JSON file to the mesh
       outbox/learning directory so the TypeScript LearningEngine can pick it up.
    2. Shell CLI fallback: calls mesh-cli.sh if the script is available.

    Both strategies are attempted; failure of either is only logged, never raised.
    """

    # Knowledge categories that map to exec agent insights
    PRESENTATION_CATEGORY = "cross-agent-learning"
    QUALITY_CATEGORY = "performance-insight"
    PREFERENCE_CATEGORY = "best-practice"

    def __init__(
        self,
        agent_id: str = "exec",
        mesh_base_path: Optional[Path] = None,
        mesh_cli_path: Optional[Path] = None,
    ) -> None:
        self.agent_id = agent_id
        self._mesh_base = mesh_base_path or (Path.home() / ".claude" / "agent-mesh")
        self._outbox_dir = self._mesh_base / "bus" / agent_id / "outbox"
        self._learning_dir = self._mesh_base / "learning" / "events"
        self._cli_path = mesh_cli_path or (self._mesh_base / "mesh-cli.sh")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def emit_presentation_created(
        self,
        presentation_id: str,
        presentation_type: str,
        project_id: str,
        quality_score: Optional[float] = None,
    ) -> None:
        """
        Notify the mesh that a presentation was successfully created.

        Other agents (conductor, tracker) subscribe to this category to
        update project status dashboards.

        Args:
            presentation_id: Unique presentation identifier (e.g. 'PRES-001').
            presentation_type: Type string (e.g. 'executive_summary').
            project_id: SDLC project identifier.
            quality_score: Optional float 0–1 quality score.
        """
        metadata: Dict[str, Any] = {
            "presentation_id": presentation_id,
            "presentation_type": presentation_type,
            "project_id": project_id,
        }
        if quality_score is not None:
            metadata["quality_score"] = round(quality_score, 4)

        insight = (
            f"Exec agent generated a '{presentation_type}' presentation "
            f"for project '{project_id}' (id={presentation_id})"
        )
        if quality_score is not None:
            insight += f" with quality score {quality_score:.2f}"

        self._emit_learning_event(
            title=f"Presentation Created: {presentation_type} for {project_id}",
            insight=insight,
            category=self.PRESENTATION_CATEGORY,
            confidence="emerging",
            metadata=metadata,
        )

    def emit_quality_score(
        self,
        presentation_id: str,
        score: float,
        dimensions: Dict[str, float],
    ) -> None:
        """
        Share a quality assessment with the mesh so other agents can learn
        what constitutes effective executive communication.

        Args:
            presentation_id: Presentation that was scored.
            score: Overall quality score (0–1).
            dimensions: Per-dimension scores dictionary.
        """
        top_dimensions = sorted(dimensions.items(), key=lambda x: x[1], reverse=True)[:3]
        top_str = ", ".join(f"{k}={v:.2f}" for k, v in top_dimensions)

        insight = (
            f"Executive presentation quality: overall={score:.2f}, "
            f"top dimensions: {top_str}"
        )
        self._emit_learning_event(
            title=f"Presentation Quality Score: {score:.2f}",
            insight=insight,
            category=self.QUALITY_CATEGORY,
            confidence="established" if score >= 0.70 else "emerging",
            metadata={
                "presentation_id": presentation_id,
                "overall_score": score,
                "dimensions": dimensions,
            },
        )

    def emit_learning(
        self,
        insight: str,
        metadata: Optional[Dict[str, Any]] = None,
        category: str = "cross-agent-learning",
        confidence: str = "emerging",
    ) -> None:
        """
        Share a generic learning insight with all agents via the mesh.

        Args:
            insight: Human-readable insight description.
            metadata: Optional structured metadata for the learning.
            category: Knowledge category (default 'cross-agent-learning').
            confidence: One of 'speculative', 'emerging', 'established', 'proven'.
        """
        self._emit_learning_event(
            title=f"Exec Learning: {insight[:80]}",
            insight=insight,
            category=category,
            confidence=confidence,
            metadata=metadata or {},
        )

    def emit_executive_preference(
        self,
        preference_type: str,
        value: Any,
        audience: Optional[str] = None,
    ) -> None:
        """
        Share executive stakeholder preferences with the mesh.

        These are surfaced as best-practice knowledge items so agents like Jets
        and QA can account for exec audience constraints in their outputs.

        Args:
            preference_type: Type of preference (e.g. 'max_bullet_points').
            value: Observed preference value.
            audience: Optional audience type (e.g. 'c-suite').
        """
        audience_str = f" for {audience}" if audience else ""
        insight = f"Executive preference{audience_str}: {preference_type} = {value}"

        self._emit_learning_event(
            title=f"Executive Preference: {preference_type}",
            insight=insight,
            category=self.PREFERENCE_CATEGORY,
            confidence="emerging",
            metadata={
                "preference_type": preference_type,
                "value": value,
                "audience": audience,
            },
        )

    # ------------------------------------------------------------------
    # Private implementation
    # ------------------------------------------------------------------

    def _emit_learning_event(
        self,
        title: str,
        insight: str,
        category: str,
        confidence: str,
        metadata: Dict[str, Any],
    ) -> None:
        """
        Write a learning event to the mesh file system.

        Tries two approaches:
        1. Write a LearningEvent JSON file directly to the mesh learning/events dir.
        2. Call mesh-cli.sh as a subprocess (fallback / additional propagation).

        Neither failure propagates as an exception.
        """
        event_id = f"LE-exec-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now(timezone.utc).isoformat()

        learning_event: Dict[str, Any] = {
            "id": event_id,
            "trigger": "manual",
            "timestamp": timestamp,
            "sourceAgent": self.agent_id,
            "targetAgents": [],
            "learning": {
                "title": title,
                "description": insight,
                "category": category,
                "confidence": confidence,
                "applicability": "exec-agent-insights",
            },
            "context": metadata,
            "propagated": False,
            "propagatedTo": [],
        }

        self._write_learning_file(event_id, learning_event)
        try:
            self._call_mesh_cli_learn(insight, category, confidence)
        except Exception as exc:
            # Secondary channel failure must never propagate
            logger.warning(
                "LearningEventEmitter: mesh-cli channel error: %s", exc
            )

    def _write_learning_file(
        self,
        event_id: str,
        learning_event: Dict[str, Any],
    ) -> None:
        """Write the learning event as a JSON file to the mesh learning directory."""
        if not self._mesh_base.exists():
            logger.debug(
                "LearningEventEmitter: mesh not available at '%s', skipping file write",
                self._mesh_base,
            )
            return

        try:
            self._learning_dir.mkdir(parents=True, exist_ok=True)
            event_file = self._learning_dir / f"{event_id}.json"
            event_file.write_text(
                json.dumps(learning_event, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            logger.info(
                "LearningEventEmitter: wrote learning event '%s' (%s)",
                learning_event["learning"]["title"],
                event_id,
            )
        except OSError as exc:
            logger.warning(
                "LearningEventEmitter: could not write learning file '%s': %s",
                event_id,
                exc,
            )

    def _call_mesh_cli_learn(
        self,
        insight: str,
        category: str,
        confidence: str,
    ) -> None:
        """
        Optionally invoke the mesh-cli.sh shell script to propagate the learning.

        This is a secondary channel; the primary is the file write above.
        If mesh-cli.sh does not exist or fails, only a debug log is emitted.
        """
        if not self._cli_path.exists():
            logger.debug(
                "LearningEventEmitter: mesh-cli.sh not found at '%s', skipping CLI call",
                self._cli_path,
            )
            return

        try:
            result = subprocess.run(
                [
                    "bash",
                    str(self._cli_path),
                    "learn",
                    "--agent", self.agent_id,
                    "--insight", insight[:500],  # guard against oversized args
                    "--category", category,
                    "--confidence", confidence,
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                logger.warning(
                    "LearningEventEmitter: mesh-cli.sh exited with code %d: %s",
                    result.returncode,
                    result.stderr.strip(),
                )
            else:
                logger.debug(
                    "LearningEventEmitter: mesh-cli.sh learn succeeded"
                )
        except subprocess.TimeoutExpired:
            logger.warning("LearningEventEmitter: mesh-cli.sh timed out after 10s")
        except (OSError, subprocess.SubprocessError) as exc:
            logger.warning("LearningEventEmitter: mesh-cli.sh call failed: %s", exc)
