"""
Unit tests for CollectiveMemoryReader

Tests cover:
  - Returns empty list gracefully when mesh is not available
  - Parses a well-formed collective-intelligence.json (list format)
  - Parses the dict-wrapped format (items / knowledge keys)
  - Filters by knowledge category correctly
  - Filters by slide type via KNOWLEDGE_TO_SLIDE_MAP
  - Skips inactive (deprecated) knowledge items
  - Returns correct knowledge summary statistics
  - Handles unreadable / malformed JSON gracefully
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import pytest

from infrastructure.mesh.collective_memory_reader import CollectiveMemoryReader


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write_ci(path: Path, data: Any) -> None:
    """Write collective intelligence JSON to a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _make_item(
    category: str = "best-practice",
    content: str = "Test content",
    status: str = "active",
    confidence: str = "established",
) -> Dict[str, Any]:
    return {
        "id": f"KI-{hash(content) % 9999:04d}",
        "category": category,
        "title": f"Title: {content[:30]}",
        "content": content,
        "confidence": confidence,
        "status": status,
        "sourceAgents": ["jets"],
        "applicableAgents": ["exec"],
    }


# ---------------------------------------------------------------------------
# Missing / unavailable mesh
# ---------------------------------------------------------------------------


def test_returns_empty_when_ci_file_missing(tmp_path: Path) -> None:
    """All getters should return empty results when the CI file does not exist."""
    ci_path = tmp_path / "nonexistent" / "collective-intelligence.json"
    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)

    assert reader.get_security_insights() == []
    assert reader.get_architecture_patterns() == []
    assert reader.get_requirements_context() == []
    assert reader.get_best_practices() == []
    assert reader.get_all_insights_for_slide_type("SECURITY_POSTURE") == []


def test_knowledge_summary_unavailable_when_file_missing(tmp_path: Path) -> None:
    """Summary should report available=False when CI file does not exist."""
    ci_path = tmp_path / "missing.json"
    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)

    summary = reader.get_knowledge_summary()
    assert summary["available"] is False
    assert summary["total_items"] == 0


# ---------------------------------------------------------------------------
# Malformed JSON
# ---------------------------------------------------------------------------


def test_returns_empty_on_invalid_json(tmp_path: Path) -> None:
    """Malformed JSON should produce empty results, not an exception."""
    ci_path = tmp_path / "ci.json"
    ci_path.write_text("{ not valid json }", encoding="utf-8")
    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)

    assert reader.get_security_insights() == []
    summary = reader.get_knowledge_summary()
    assert summary["available"] is False


# ---------------------------------------------------------------------------
# List format (raw JSON array)
# ---------------------------------------------------------------------------


def test_loads_list_format(tmp_path: Path) -> None:
    """CI file as a raw JSON array should be loaded correctly."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("security-insight", "Never store plaintext passwords"),
        _make_item("best-practice", "Always validate inputs"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    summary = reader.get_knowledge_summary()
    assert summary["available"] is True
    assert summary["total_items"] == 2


def test_filters_by_category(tmp_path: Path) -> None:
    """get_security_insights should only return security-insight items."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("security-insight", "Security insight 1"),
        _make_item("security-insight", "Security insight 2"),
        _make_item("best-practice", "Best practice – should not appear"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_security_insights()
    assert len(results) == 2
    assert all("Security insight" in r for r in results)


def test_skips_inactive_items(tmp_path: Path) -> None:
    """Deprecated / superseded items should not be returned."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("security-insight", "Active item", status="active"),
        _make_item("security-insight", "Deprecated item", status="deprecated"),
        _make_item("security-insight", "Superseded item", status="superseded"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_security_insights()
    assert len(results) == 1
    assert results[0] == "Active item"


# ---------------------------------------------------------------------------
# Dict-wrapped format
# ---------------------------------------------------------------------------


def test_loads_items_key_format(tmp_path: Path) -> None:
    """CI file with top-level 'items' key should be loaded correctly."""
    ci_path = tmp_path / "ci.json"
    data = {
        "version": "1.0",
        "items": [
            _make_item("architecture-decision", "Use event sourcing"),
        ],
    }
    _write_ci(ci_path, data)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_architecture_patterns()
    assert len(results) == 1
    assert results[0] == "Use event sourcing"


def test_loads_knowledge_key_format(tmp_path: Path) -> None:
    """CI file with top-level 'knowledge' key should be loaded correctly."""
    ci_path = tmp_path / "ci.json"
    data = {
        "knowledge": [
            _make_item("performance-insight", "Cache database results"),
        ],
    }
    _write_ci(ci_path, data)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_performance_insights()
    assert len(results) == 1


# ---------------------------------------------------------------------------
# Slide-type filtering
# ---------------------------------------------------------------------------


def test_get_all_insights_for_security_posture_slide(tmp_path: Path) -> None:
    """SECURITY_POSTURE slide should receive security-insight items."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("security-insight", "OWASP Top 10 addressed"),
        _make_item("best-practice", "Should NOT appear for SECURITY_POSTURE"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_all_insights_for_slide_type("SECURITY_POSTURE")
    assert "OWASP Top 10 addressed" in results
    assert "Should NOT appear for SECURITY_POSTURE" not in results


def test_get_all_insights_for_exec_summary_slide(tmp_path: Path) -> None:
    """EXECUTIVE_SUMMARY slide should receive best-practice and cross-agent-learning."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("best-practice", "Lead with metrics"),
        _make_item("cross-agent-learning", "Execs prefer 3 bullets max"),
        _make_item("performance-insight", "Should NOT appear in exec summary"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_all_insights_for_slide_type("EXECUTIVE_SUMMARY")
    assert "Lead with metrics" in results
    assert "Execs prefer 3 bullets max" in results
    # performance-insight is not mapped to EXECUTIVE_SUMMARY
    assert "Should NOT appear in exec summary" not in results


def test_get_all_insights_empty_for_unknown_slide_type(tmp_path: Path) -> None:
    """Unknown slide type should return empty list, not raise."""
    ci_path = tmp_path / "ci.json"
    items = [_make_item("security-insight", "Some insight")]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    results = reader.get_all_insights_for_slide_type("NONEXISTENT_SLIDE_TYPE")
    assert results == []


# ---------------------------------------------------------------------------
# Knowledge summary
# ---------------------------------------------------------------------------


def test_knowledge_summary_counts_by_category(tmp_path: Path) -> None:
    """Summary should count items per category correctly."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("security-insight", "S1"),
        _make_item("security-insight", "S2"),
        _make_item("best-practice", "B1"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    summary = reader.get_knowledge_summary()
    assert summary["available"] is True
    assert summary["total_items"] == 3
    assert summary["by_category"]["security-insight"] == 2
    assert summary["by_category"]["best-practice"] == 1


def test_knowledge_summary_counts_high_confidence(tmp_path: Path) -> None:
    """Summary should count proven and established items as high confidence."""
    ci_path = tmp_path / "ci.json"
    items = [
        _make_item("best-practice", "Proven item", confidence="proven"),
        _make_item("best-practice", "Established item", confidence="established"),
        _make_item("best-practice", "Emerging item", confidence="emerging"),
        _make_item("best-practice", "Speculative item", confidence="speculative"),
    ]
    _write_ci(ci_path, items)

    reader = CollectiveMemoryReader(collective_intelligence_path=ci_path)
    summary = reader.get_knowledge_summary()
    assert summary["high_confidence_items"] == 2
