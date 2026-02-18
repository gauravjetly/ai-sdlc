"""
Unit tests for LearningEventEmitter

Tests cover:
  - emit_presentation_created writes a valid learning event file
  - emit_quality_score writes the score and dimensions into the event
  - emit_learning writes a generic insight
  - emit_executive_preference writes preference data
  - All methods handle missing mesh directory gracefully (no exception)
  - Subprocess failure (mesh-cli.sh not found) is handled gracefully
  - Failed subprocess exit code is handled gracefully
  - Written learning events have the expected JSON structure
"""

import json
import subprocess
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

import pytest

from infrastructure.mesh.learning_event_emitter import LearningEventEmitter


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def mesh_base(tmp_path: Path) -> Path:
    """Create a temporary mesh base directory."""
    base = tmp_path / "agent-mesh"
    base.mkdir(parents=True)
    return base


@pytest.fixture()
def emitter(mesh_base: Path) -> LearningEventEmitter:
    """LearningEventEmitter with a controlled mesh_base."""
    return LearningEventEmitter(
        agent_id="exec",
        mesh_base_path=mesh_base,
    )


@pytest.fixture()
def emitter_no_mesh(tmp_path: Path) -> LearningEventEmitter:
    """Emitter pointing to a mesh directory that does NOT exist."""
    return LearningEventEmitter(
        agent_id="exec",
        mesh_base_path=tmp_path / "nonexistent-mesh",
    )


def _load_latest_event(learning_dir: Path) -> Dict[str, Any]:
    """Helper: load the most recently written learning event JSON."""
    event_files = sorted(learning_dir.glob("LE-exec-*.json"))
    assert len(event_files) > 0, "No learning event files found"
    return json.loads(event_files[-1].read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Graceful degradation (mesh not available)
# ---------------------------------------------------------------------------


def test_emit_presentation_created_no_mesh_does_not_raise(
    emitter_no_mesh: LearningEventEmitter,
) -> None:
    """emit_presentation_created should not raise when mesh dir is missing."""
    emitter_no_mesh.emit_presentation_created(
        presentation_id="PRES-001",
        presentation_type="executive_summary",
        project_id="PROJ-1",
    )


def test_emit_quality_score_no_mesh_does_not_raise(
    emitter_no_mesh: LearningEventEmitter,
) -> None:
    emitter_no_mesh.emit_quality_score(
        presentation_id="PRES-001",
        score=0.85,
        dimensions={"content": 0.9, "brand": 0.8},
    )


def test_emit_learning_no_mesh_does_not_raise(
    emitter_no_mesh: LearningEventEmitter,
) -> None:
    emitter_no_mesh.emit_learning("Some insight about executive presentations")


def test_emit_executive_preference_no_mesh_does_not_raise(
    emitter_no_mesh: LearningEventEmitter,
) -> None:
    emitter_no_mesh.emit_executive_preference(
        preference_type="max_bullet_points",
        value=5,
        audience="c-suite",
    )


# ---------------------------------------------------------------------------
# File output verification
# ---------------------------------------------------------------------------


def test_emit_presentation_created_writes_event_file(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """A learning event JSON file should appear in the mesh learning/events dir."""
    emitter.emit_presentation_created(
        presentation_id="PRES-001",
        presentation_type="executive_summary",
        project_id="PROJ-1",
    )

    learning_dir = mesh_base / "learning" / "events"
    assert learning_dir.exists()

    event = _load_latest_event(learning_dir)
    assert event["sourceAgent"] == "exec"
    assert event["propagated"] is False
    assert "executive_summary" in event["learning"]["title"]
    assert "PROJ-1" in event["learning"]["description"]


def test_emit_presentation_created_includes_quality_score(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """Quality score should appear in the event metadata when provided."""
    emitter.emit_presentation_created(
        presentation_id="PRES-002",
        presentation_type="status_report",
        project_id="PROJ-2",
        quality_score=0.78,
    )

    learning_dir = mesh_base / "learning" / "events"
    event = _load_latest_event(learning_dir)
    assert event["context"].get("quality_score") == pytest.approx(0.78, abs=1e-4)


def test_emit_quality_score_writes_dimensions(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """Quality dimensions should be stored in event context."""
    dims = {"content": 0.88, "brand": 0.92, "clarity": 0.80}
    emitter.emit_quality_score(
        presentation_id="PRES-003",
        score=0.87,
        dimensions=dims,
    )

    learning_dir = mesh_base / "learning" / "events"
    event = _load_latest_event(learning_dir)
    assert event["context"]["dimensions"] == dims
    assert event["context"]["overall_score"] == pytest.approx(0.87, abs=1e-4)


def test_emit_learning_uses_provided_category(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """emit_learning should use the supplied category."""
    emitter.emit_learning(
        insight="C-suite prefers at most 4 bullet points per slide",
        category="best-practice",
        confidence="established",
    )

    learning_dir = mesh_base / "learning" / "events"
    event = _load_latest_event(learning_dir)
    assert event["learning"]["category"] == "best-practice"
    assert event["learning"]["confidence"] == "established"


def test_emit_executive_preference_stores_preference_data(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """Executive preference details should appear in the event context."""
    emitter.emit_executive_preference(
        preference_type="max_bullet_points",
        value=4,
        audience="c-suite",
    )

    learning_dir = mesh_base / "learning" / "events"
    event = _load_latest_event(learning_dir)
    ctx = event["context"]
    assert ctx["preference_type"] == "max_bullet_points"
    assert ctx["value"] == 4
    assert ctx["audience"] == "c-suite"


def test_event_file_is_valid_json(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """Every written event file must be valid JSON with required fields."""
    emitter.emit_learning("Test insight")
    learning_dir = mesh_base / "learning" / "events"
    for event_file in learning_dir.glob("LE-exec-*.json"):
        data = json.loads(event_file.read_text(encoding="utf-8"))
        assert "id" in data
        assert "timestamp" in data
        assert "sourceAgent" in data
        assert "learning" in data
        assert "title" in data["learning"]
        assert "description" in data["learning"]
        assert "category" in data["learning"]


# ---------------------------------------------------------------------------
# Subprocess (mesh-cli.sh) failure handling
# ---------------------------------------------------------------------------


def test_subprocess_not_found_does_not_raise(
    emitter: LearningEventEmitter,
) -> None:
    """When mesh-cli.sh does not exist, emit_learning should not raise."""
    # cli_path points to a non-existent file
    emitter._cli_path = Path("/nonexistent/mesh-cli.sh")
    emitter.emit_learning("Test insight")  # must not raise


def test_subprocess_failure_does_not_raise(
    emitter: LearningEventEmitter, mesh_base: Path
) -> None:
    """Non-zero exit code from mesh-cli.sh should be logged, not raised."""
    cli_path = mesh_base / "mesh-cli.sh"
    cli_path.write_text("#!/bin/bash\nexit 1\n", encoding="utf-8")
    cli_path.chmod(0o755)
    emitter._cli_path = cli_path

    emitter.emit_learning("Some insight")  # must not raise


def test_subprocess_timeout_does_not_raise(
    emitter: LearningEventEmitter,
) -> None:
    """A subprocess.TimeoutExpired raised inside _call_mesh_cli_learn should not propagate."""
    # Patch _call_mesh_cli_learn directly so we can inject the exception without
    # fighting the read-only Path.exists attribute on Python 3.14.
    with patch.object(
        emitter,
        "_call_mesh_cli_learn",
        side_effect=subprocess.TimeoutExpired(cmd="bash", timeout=10),
    ):
        emitter.emit_learning("Test")  # must not raise
