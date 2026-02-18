"""
CollectiveMemoryReader - Reads collective intelligence from the agent mesh.

Absorbs cross-agent knowledge to enrich presentation slide content.
Designed for graceful degradation: returns empty results when the mesh or
collective intelligence file is not present.

Architecture: Infrastructure layer only. No business logic here.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Knowledge-to-slide-type mapping
# ---------------------------------------------------------------------------

# Maps knowledge categories (as stored in collective-intelligence.json) to the
# presentation slide types they can enrich.  Slide types match SlideType enum
# values used in the domain layer.
KNOWLEDGE_TO_SLIDE_MAP: Dict[str, List[str]] = {
    "security-insight":       ["SECURITY_POSTURE", "RISK_MATRIX"],
    "architecture-decision":  ["ARCHITECTURE_OVERVIEW", "ARCHITECTURE_DETAIL"],
    "performance-insight":    ["KEY_METRICS", "AGENT_PERFORMANCE"],
    "error-pattern":          ["RISK_MATRIX", "STATUS_DASHBOARD"],
    "best-practice":          ["NEXT_STEPS", "EXECUTIVE_SUMMARY"],
    "process-improvement":    ["TIMELINE", "NEXT_STEPS"],
    "integration-pattern":    ["ARCHITECTURE_DETAIL"],
    "cross-agent-learning":   ["EXECUTIVE_SUMMARY", "NEXT_STEPS"],
}


class CollectiveMemoryReader:
    """
    Reads ~/.claude/agent-mesh/knowledge/collective-intelligence.json.

    The file is written by the TypeScript mesh LearningEngine and contains
    shared insights from all mesh agents.  This reader is a thin adapter that
    translates the JSON schema into Python-friendly dictionaries and filters
    by relevance to specific slide types.

    All methods return empty lists / dicts when:
    - The mesh directory does not exist.
    - The collective intelligence file is missing or unreadable.
    - The file contains invalid JSON.

    None of these conditions raise exceptions.
    """

    def __init__(
        self,
        collective_intelligence_path: Optional[Path] = None,
    ) -> None:
        if collective_intelligence_path is not None:
            self._ci_path = collective_intelligence_path
        else:
            self._ci_path = (
                Path.home() / ".claude" / "agent-mesh" / "knowledge" / "collective-intelligence.json"
            )

    # ------------------------------------------------------------------
    # Targeted getters (convenience methods)
    # ------------------------------------------------------------------

    def get_security_insights(self) -> List[str]:
        """
        Return security insight strings from the Security agent.

        Returns:
            List of plain-text insight descriptions, empty if none available.
        """
        return self._get_content_by_category("security-insight")

    def get_architecture_patterns(self) -> List[str]:
        """
        Return architecture pattern strings from the Jets agent.

        Returns:
            List of plain-text pattern descriptions, empty if none available.
        """
        return self._get_content_by_category("architecture-decision")

    def get_requirements_context(self) -> List[str]:
        """
        Return requirements and stakeholder context from the BA agent.

        Returns:
            List of plain-text context strings, empty if none available.
        """
        return self._get_content_by_category("cross-agent-learning")

    def get_performance_insights(self) -> List[str]:
        """
        Return performance insights relevant to metrics slides.

        Returns:
            List of plain-text insight descriptions.
        """
        return self._get_content_by_category("performance-insight")

    def get_best_practices(self) -> List[str]:
        """
        Return best practice strings for next-steps and exec-summary slides.

        Returns:
            List of plain-text best practice descriptions.
        """
        return self._get_content_by_category("best-practice")

    # ------------------------------------------------------------------
    # Slide-type-oriented getter
    # ------------------------------------------------------------------

    def get_all_insights_for_slide_type(self, slide_type: str) -> List[str]:
        """
        Return all relevant insights for a specific slide type.

        Looks up which knowledge categories enrich the given slide type via
        KNOWLEDGE_TO_SLIDE_MAP and returns a merged, deduplicated list.

        Args:
            slide_type: A SlideType value string, e.g. 'SECURITY_POSTURE'.

        Returns:
            Deduplicated list of insight strings relevant to this slide type.
        """
        knowledge_items = self._load_collective_intelligence()
        if not knowledge_items:
            return []

        relevant_categories = [
            cat
            for cat, slide_types in KNOWLEDGE_TO_SLIDE_MAP.items()
            if slide_type in slide_types
        ]

        seen: set = set()
        results: List[str] = []
        for item in knowledge_items:
            if item.get("category") not in relevant_categories:
                continue
            if item.get("status", "active") != "active":
                continue
            content = item.get("content", "").strip()
            if content and content not in seen:
                seen.add(content)
                results.append(content)

        return results

    # ------------------------------------------------------------------
    # Summary / diagnostic
    # ------------------------------------------------------------------

    def get_knowledge_summary(self) -> Dict[str, Any]:
        """
        Return a summary of available collective knowledge.

        Useful for diagnostics, logging, and the CLI status command.

        Returns:
            Dictionary with keys:
              - available (bool): Whether the mesh knowledge file was found.
              - total_items (int): Total knowledge records loaded.
              - by_category (dict): Count per knowledge category.
              - high_confidence_items (int): Count of 'proven' or 'established' items.
        """
        knowledge_items = self._load_collective_intelligence()

        if knowledge_items is None:
            return {
                "available": False,
                "total_items": 0,
                "by_category": {},
                "high_confidence_items": 0,
            }

        by_category: Dict[str, int] = {}
        high_confidence = 0
        for item in knowledge_items:
            category = item.get("category", "unknown")
            by_category[category] = by_category.get(category, 0) + 1
            if item.get("confidence") in ("proven", "established"):
                high_confidence += 1

        return {
            "available": True,
            "total_items": len(knowledge_items),
            "by_category": by_category,
            "high_confidence_items": high_confidence,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_collective_intelligence(self) -> Optional[List[Dict[str, Any]]]:
        """
        Load and parse the collective intelligence JSON file.

        Returns:
            List of knowledge item dicts, or None if the file cannot be read.
        """
        if not self._ci_path.exists():
            logger.debug(
                "CollectiveMemoryReader: collective intelligence file not found at '%s'",
                self._ci_path,
            )
            return None

        try:
            raw = self._ci_path.read_text(encoding="utf-8")
            data = json.loads(raw)
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning(
                "CollectiveMemoryReader: could not read '%s': %s",
                self._ci_path,
                exc,
            )
            return None

        # The TypeScript mesh may store items under a top-level 'items' or
        # 'knowledge' key, or the file may be a raw JSON array.
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ("items", "knowledge", "entries"):
                if key in data and isinstance(data[key], list):
                    return data[key]

        logger.warning(
            "CollectiveMemoryReader: unexpected JSON structure in '%s'", self._ci_path
        )
        return None

    def _get_content_by_category(self, category: str) -> List[str]:
        """
        Return content strings from knowledge items matching the given category.

        Args:
            category: Knowledge category string to filter by.

        Returns:
            List of content strings, empty if none found.
        """
        knowledge_items = self._load_collective_intelligence()
        if not knowledge_items:
            return []

        results: List[str] = []
        for item in knowledge_items:
            if item.get("category") != category:
                continue
            if item.get("status", "active") != "active":
                continue
            content = item.get("content", "").strip()
            if content:
                results.append(content)

        return results
