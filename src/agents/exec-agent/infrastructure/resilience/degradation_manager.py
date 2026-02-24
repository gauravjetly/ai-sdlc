"""
Degradation Manager - Handles graceful degradation of capabilities

Implements 6-level fallback system when services are unavailable.
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import sys

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from infrastructure.config.config import Config, DegradationLevel, get_config


class DegradationManager:
    """
    Manages graceful degradation across 6 levels.

    Levels:
    0. FULL: Claude + Mermaid + PPTX with template
    1. NO_LLM: Template-based content + Mermaid + PPTX
    2. NO_DIAGRAMS: Template content + Simple shapes + PPTX
    3. NO_TEMPLATE: Programmatic slides only
    4. STALE_DATA: Use last known data snapshot
    5. MINIMAL: Emergency stub (JSON export)
    """

    def __init__(self, config: Optional[Config] = None, log_dir: Optional[str] = None):
        """
        Initialize degradation manager.

        Args:
            config: Configuration instance
            log_dir: Directory for logging degradation events
        """
        self.config = config or get_config()
        self.log_dir = Path(log_dir) if log_dir else Path(self.config.memory_base_path) / "logs" / "degradation"
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Current degradation level
        self.current_level = DegradationLevel.FULL

        # Track degradation events
        self.degradation_log = []

    def assess_capabilities(
        self,
        claude_available: bool,
        mermaid_available: bool,
        template_available: bool,
        data_available: bool,
    ) -> DegradationLevel:
        """
        Assess available capabilities and determine degradation level.

        Args:
            claude_available: Is Claude API available?
            mermaid_available: Is Mermaid CLI available?
            template_available: Is PowerPoint template available?
            data_available: Is project data available?

        Returns:
            Appropriate degradation level
        """
        # Determine degradation level
        if not data_available:
            level = DegradationLevel.STALE_DATA
        elif not claude_available and not mermaid_available and not template_available:
            level = DegradationLevel.MINIMAL
        elif not template_available:
            level = DegradationLevel.NO_TEMPLATE
        elif not mermaid_available:
            level = DegradationLevel.NO_DIAGRAMS
        elif not claude_available:
            level = DegradationLevel.NO_LLM
        else:
            level = DegradationLevel.FULL

        # Log if degradation changed
        if level != self.current_level:
            self._log_degradation_event(self.current_level, level, {
                'claude_available': claude_available,
                'mermaid_available': mermaid_available,
                'template_available': template_available,
                'data_available': data_available,
            })

        self.current_level = level
        return level

    def get_degradation_message(self, level: DegradationLevel) -> str:
        """
        Get human-readable message for degradation level.

        Args:
            level: Degradation level

        Returns:
            Description of what's degraded
        """
        messages = {
            DegradationLevel.FULL: "Full intelligence enabled (Claude + Mermaid + Template)",
            DegradationLevel.NO_LLM: "Template-based content (Mermaid + Template available)",
            DegradationLevel.NO_DIAGRAMS: "Simple shapes for diagrams (Template available)",
            DegradationLevel.NO_TEMPLATE: "Programmatic slides without template",
            DegradationLevel.STALE_DATA: "Using last known data snapshot",
            DegradationLevel.MINIMAL: "Emergency mode - JSON export only",
        }

        return messages.get(level, "Unknown degradation level")

    def should_use_claude(self) -> bool:
        """Check if Claude should be used at current level"""
        return self.current_level.value < DegradationLevel.NO_LLM.value

    def should_use_mermaid(self) -> bool:
        """Check if Mermaid should be used at current level"""
        return self.current_level.value < DegradationLevel.NO_DIAGRAMS.value

    def should_use_template(self) -> bool:
        """Check if template should be used at current level"""
        return self.current_level.value < DegradationLevel.NO_TEMPLATE.value

    def can_generate_pptx(self) -> bool:
        """Check if PPTX generation is possible"""
        return self.current_level.value < DegradationLevel.MINIMAL.value

    def get_fallback_strategy(self, capability: str) -> str:
        """
        Get fallback strategy for a capability.

        Args:
            capability: Capability name (claude, mermaid, template, data)

        Returns:
            Description of fallback strategy
        """
        strategies = {
            'claude': "Use template-based content with data interpolation",
            'mermaid': "Use python-pptx native shapes for simple diagrams",
            'template': "Generate programmatic slides with Vintiq branding",
            'data': "Use last known data snapshot with warning banners",
        }

        return strategies.get(capability, "No fallback available")

    def export_emergency_json(
        self,
        presentation_data: Dict[str, Any],
        output_path: str,
    ) -> bool:
        """
        Export presentation as JSON when PPTX generation is not possible.

        Args:
            presentation_data: Presentation data dictionary
            output_path: Where to save JSON file

        Returns:
            True if export succeeded
        """
        try:
            output_file = Path(output_path).with_suffix('.json')
            output_file.parent.mkdir(parents=True, exist_ok=True)

            export_data = {
                'metadata': {
                    'exported_at': datetime.now().isoformat(),
                    'degradation_level': self.current_level.name,
                    'reason': 'PPTX generation unavailable',
                },
                'presentation': presentation_data,
            }

            with open(output_file, 'w') as f:
                json.dump(export_data, f, indent=2)

            return True

        except Exception as e:
            print(f"Failed to export emergency JSON: {e}")
            return False

    def _log_degradation_event(
        self,
        from_level: DegradationLevel,
        to_level: DegradationLevel,
        context: Dict[str, Any],
    ) -> None:
        """Log degradation event for learning"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'from_level': from_level.name,
            'to_level': to_level.name,
            'context': context,
        }

        self.degradation_log.append(event)

        # Save to file
        log_file = self.log_dir / f"degradation_{datetime.now().strftime('%Y%m%d')}.json"

        try:
            # Load existing log if it exists
            existing_log = []
            if log_file.exists():
                with open(log_file, 'r') as f:
                    existing_log = json.load(f)

            # Append new event
            existing_log.append(event)

            # Save updated log
            with open(log_file, 'w') as f:
                json.dump(existing_log, f, indent=2)

        except Exception as e:
            print(f"Failed to log degradation event: {e}")

    def get_degradation_stats(self) -> Dict[str, Any]:
        """
        Get statistics about degradation events.

        Returns:
            Dictionary with degradation statistics
        """
        if not self.degradation_log:
            return {
                'total_events': 0,
                'current_level': self.current_level.name,
            }

        # Count events by level
        level_counts = {}
        for event in self.degradation_log:
            to_level = event['to_level']
            level_counts[to_level] = level_counts.get(to_level, 0) + 1

        return {
            'total_events': len(self.degradation_log),
            'current_level': self.current_level.name,
            'level_distribution': level_counts,
            'most_recent_event': self.degradation_log[-1] if self.degradation_log else None,
        }
