"""
Configuration Management for Exec Agent

Loads configuration from environment variables and provides defaults.
"""

import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict
from pathlib import Path


class DegradationLevel(Enum):
    """Graceful degradation levels"""
    FULL = 0  # Full intelligence (Claude + Mermaid + PPTX)
    NO_LLM = 1  # Template-based content
    NO_DIAGRAMS = 2  # Simplified shapes
    NO_TEMPLATE = 3  # Programmatic slides
    STALE_DATA = 4  # Use last snapshot
    MINIMAL = 5  # Emergency stub


@dataclass
class DelekBrandColors:
    """Vintiq brand color palette"""
    primary: str = "#1742F6"  # Vintiq Blue
    navy: str = "#081581"  # Dark Blue
    teal: str = "#00B6C3"
    purple: str = "#6D18F1"
    magenta: str = "#C200CC"
    gradient_start: str = "#08E9EB"
    gradient_end_1: str = "#FF5DF2"
    gradient_end_2: str = "#3895FF"
    gradient_end_3: str = "#7A62FF"
    text_dark: str = "#3C454E"
    text_light: str = "#8a9bac"


@dataclass
class Config:
    """
    Central configuration for Exec Agent.

    Loads settings from environment variables with sensible defaults.
    """

    # Claude API
    claude_api_key: Optional[str] = None
    claude_model: str = "claude-sonnet-4-5-20250929"
    claude_max_tokens: int = 4096
    claude_timeout_seconds: int = 30

    # Vintiq Template
    vintiq_template_path: Optional[str] = None

    # Brand Guidelines
    brand_colors: DelekBrandColors = None
    brand_font_family: str = "Figtree"
    brand_font_fallback: str = "Arial"

    # Cache Settings
    cache_llm_responses: bool = True
    cache_diagrams: bool = True
    cache_ttl_seconds: int = 3600  # 1 hour

    # Degradation Settings
    max_degradation_level: DegradationLevel = DegradationLevel.MINIMAL
    retry_attempts: int = 3
    retry_backoff_seconds: int = 2

    # Memory Paths
    memory_base_path: str = None
    sdlc_docs_path: str = None

    # Logging
    log_level: str = "INFO"
    log_to_file: bool = True

    def __post_init__(self):
        """Initialize configuration from environment"""
        if self.brand_colors is None:
            self.brand_colors = DelekBrandColors()

        # Load from environment
        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY", self.claude_api_key)
        self.claude_model = os.getenv("CLAUDE_MODEL", self.claude_model)

        # Vintiq template
        template_env = os.getenv("VINTIQ_TEMPLATE_PATH")
        if template_env:
            self.vintiq_template_path = template_env
        else:
            # Check default location
            default_path = Path.home() / "Downloads" / "Vintiq PowerPoint Guidelines 2" / "Vintiq PPT Template and Guidelines 011426.potx"
            if default_path.exists():
                self.vintiq_template_path = str(default_path)

        # Memory paths
        if self.memory_base_path is None:
            self.memory_base_path = str(Path.home() / ".claude" / "exec-agent-memory")

        if self.sdlc_docs_path is None:
            # Try to find aisdlc docs path
            cwd = Path.cwd()
            potential_paths = [
                cwd / "docs" / "sdlc",
                cwd.parent.parent.parent / "docs" / "sdlc",
                Path.home() / "aisdlc-2.1.0" / "docs" / "sdlc",
            ]
            for path in potential_paths:
                if path.exists():
                    self.sdlc_docs_path = str(path)
                    break

        # Log level
        self.log_level = os.getenv("LOG_LEVEL", self.log_level)

    def is_claude_available(self) -> bool:
        """Check if Claude API is configured"""
        return self.claude_api_key is not None and len(self.claude_api_key) > 0

    def is_template_available(self) -> bool:
        """Check if Vintiq template is available"""
        if self.vintiq_template_path is None:
            return False
        return Path(self.vintiq_template_path).exists()

    def get_brand_color(self, name: str) -> str:
        """
        Get brand color by name.

        Args:
            name: Color name (primary, navy, teal, etc.)

        Returns:
            Hex color code
        """
        return getattr(self.brand_colors, name, self.brand_colors.primary)

    def get_diagram_style(self) -> Dict:
        """
        Get diagram style configuration.

        Returns:
            Dictionary with Mermaid style settings
        """
        return {
            "theme": "base",
            "themeVariables": {
                "primaryColor": self.brand_colors.primary,
                "primaryTextColor": "#FFFFFF",
                "primaryBorderColor": self.brand_colors.navy,
                "lineColor": self.brand_colors.primary,
                "secondaryColor": self.brand_colors.teal,
                "tertiaryColor": self.brand_colors.purple,
                "background": "#FFFFFF",
                "mainBkg": self.brand_colors.primary,
                "secondBkg": self.brand_colors.teal,
                "fontFamily": self.brand_font_family,
            }
        }


# Global configuration instance
_config_instance: Optional[Config] = None


def get_config() -> Config:
    """
    Get global configuration instance.

    Returns:
        Config instance (singleton)
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
    return _config_instance


def reload_config() -> Config:
    """
    Reload configuration from environment.

    Returns:
        New Config instance
    """
    global _config_instance
    _config_instance = Config()
    return _config_instance
