"""
Mermaid Diagram Renderer - Converts Mermaid syntax to SVG/PNG

Implements DiagramRendererPort using Mermaid CLI or fallback to simple shapes.
"""

import subprocess
import tempfile
import json
from typing import Optional, Dict
from pathlib import Path
import sys
import hashlib

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.interfaces.diagram_renderer_port import DiagramRendererPort
from infrastructure.config.config import Config, get_config

# Optional dependencies (graceful degradation)
try:
    from PIL import Image
    import io
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None
    io = None


class MermaidDiagramRenderer(DiagramRendererPort):
    """
    Mermaid diagram renderer with graceful degradation.

    Rendering Pipeline:
    1. Try Mermaid CLI (if installed)
    2. Fall back to simple text-based diagrams
    3. Cache all rendered diagrams

    Features:
    - Deltek brand color application
    - SVG and PNG output
    - Diagram caching by content hash
    - Fallback to text representation
    """

    def __init__(self, config: Optional[Config] = None, cache_dir: Optional[str] = None):
        """
        Initialize Mermaid renderer.

        Args:
            config: Configuration instance
            cache_dir: Directory for caching diagrams
        """
        self.config = config or get_config()
        self.cache_dir = Path(cache_dir) if cache_dir else Path(self.config.memory_base_path) / "cache" / "diagrams"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Check if Mermaid CLI is available
        self._mermaid_available = self._check_mermaid_cli()

    def render_to_svg(
        self,
        mermaid_source: str,
        style_config: dict,
    ) -> Optional[bytes]:
        """
        Render Mermaid diagram to SVG.

        Args:
            mermaid_source: Mermaid diagram syntax
            style_config: Style configuration dictionary

        Returns:
            SVG data as bytes, or None if rendering failed
        """
        # Check cache first
        if self.config.cache_diagrams:
            cached = self._check_cache(mermaid_source, 'svg')
            if cached:
                return cached

        # Apply Deltek branding to mermaid source
        branded_source = self._apply_branding(mermaid_source, style_config)

        # Try to render with Mermaid CLI
        if self._mermaid_available:
            svg_data = self._render_with_cli(branded_source, 'svg')
            if svg_data:
                # Cache the result
                if self.config.cache_diagrams:
                    self._cache_diagram(mermaid_source, 'svg', svg_data)
                return svg_data

        # Fallback: generate simple SVG representation
        fallback_svg = self._generate_fallback_svg(mermaid_source)

        # Cache fallback
        if self.config.cache_diagrams:
            self._cache_diagram(mermaid_source, 'svg', fallback_svg)

        return fallback_svg

    def render_to_png(
        self,
        mermaid_source: str,
        style_config: dict,
        width: int = 800,
        height: int = 600,
    ) -> Optional[bytes]:
        """
        Render Mermaid diagram to PNG.

        Args:
            mermaid_source: Mermaid diagram syntax
            style_config: Style configuration dictionary
            width: Image width in pixels
            height: Image height in pixels

        Returns:
            PNG data as bytes, or None if rendering failed
        """
        # Check cache first
        cache_key = f"{width}x{height}"
        if self.config.cache_diagrams:
            cached = self._check_cache(mermaid_source, f'png_{cache_key}')
            if cached:
                return cached

        # Try SVG first, then convert
        svg_data = self.render_to_svg(mermaid_source, style_config)

        if svg_data and PIL_AVAILABLE:
            try:
                # Convert SVG to PNG using cairosvg (if available)
                try:
                    import cairosvg
                    png_data = cairosvg.svg2png(
                        bytestring=svg_data,
                        output_width=width,
                        output_height=height,
                    )

                    # Cache the result
                    if self.config.cache_diagrams:
                        self._cache_diagram(mermaid_source, f'png_{cache_key}', png_data)

                    return png_data

                except ImportError:
                    # cairosvg not available, return SVG
                    pass

            except Exception as e:
                print(f"Failed to convert SVG to PNG: {e}")

        # Return SVG if PNG conversion failed
        return svg_data

    def is_available(self) -> bool:
        """
        Check if Mermaid renderer is available.

        Returns:
            True if Mermaid CLI is installed, False otherwise
        """
        return self._mermaid_available

    def _check_mermaid_cli(self) -> bool:
        """Check if Mermaid CLI (mmdc) is installed"""
        try:
            result = subprocess.run(
                ['mmdc', '--version'],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _apply_branding(self, mermaid_source: str, style_config: dict) -> str:
        """Apply Deltek brand colors to Mermaid diagram"""
        # Get diagram style from config
        diagram_style = self.config.get_diagram_style()

        # Merge with provided style
        merged_style = {**diagram_style, **style_config}

        # Add theme configuration to Mermaid source
        if "%%{init:" not in mermaid_source:
            theme_config = f"""%%{{init: {json.dumps(merged_style)}}}%%
{mermaid_source}"""
            return theme_config

        return mermaid_source

    def _render_with_cli(self, mermaid_source: str, output_format: str) -> Optional[bytes]:
        """Render diagram using Mermaid CLI"""
        try:
            # Create temporary files
            with tempfile.NamedTemporaryFile(mode='w', suffix='.mmd', delete=False) as input_file:
                input_file.write(mermaid_source)
                input_path = input_file.name

            output_ext = 'svg' if output_format == 'svg' else 'png'
            output_path = input_path.replace('.mmd', f'.{output_ext}')

            # Run Mermaid CLI
            result = subprocess.run(
                ['mmdc', '-i', input_path, '-o', output_path, '-b', 'transparent'],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0 and Path(output_path).exists():
                # Read generated file
                with open(output_path, 'rb') as f:
                    data = f.read()

                # Clean up temp files
                Path(input_path).unlink(missing_ok=True)
                Path(output_path).unlink(missing_ok=True)

                return data

            # Clean up on failure
            Path(input_path).unlink(missing_ok=True)
            Path(output_path).unlink(missing_ok=True)

            return None

        except Exception as e:
            print(f"Mermaid CLI rendering failed: {e}")
            return None

    def _generate_fallback_svg(self, mermaid_source: str) -> bytes:
        """Generate simple SVG representation as fallback"""
        # Extract diagram type
        diagram_type = "diagram"
        if "graph" in mermaid_source.lower():
            diagram_type = "Flow Diagram"
        elif "sequenceDiagram" in mermaid_source:
            diagram_type = "Sequence Diagram"
        elif "classDiagram" in mermaid_source:
            diagram_type = "Class Diagram"
        elif "gantt" in mermaid_source:
            diagram_type = "Timeline"

        # Create simple SVG with Deltek branding
        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#FFFFFF"/>
  <rect x="50" y="50" width="700" height="500" fill="#F5F7FA" stroke="{self.config.brand_colors.primary}" stroke-width="2" rx="10"/>
  <text x="400" y="150" font-family="{self.config.brand_font_family}, Arial" font-size="32" fill="{self.config.brand_colors.primary}" text-anchor="middle" font-weight="bold">
    {diagram_type}
  </text>
  <text x="400" y="300" font-family="{self.config.brand_font_family}, Arial" font-size="16" fill="{self.config.brand_colors.text_dark}" text-anchor="middle">
    Diagram rendering in progress
  </text>
  <text x="400" y="330" font-family="{self.config.brand_font_family}, Arial" font-size="14" fill="{self.config.brand_colors.text_light}" text-anchor="middle">
    Install Mermaid CLI (npm install -g @mermaid-js/mermaid-cli)
  </text>
  <text x="400" y="360" font-family="{self.config.brand_font_family}, Arial" font-size="14" fill="{self.config.brand_colors.text_light}" text-anchor="middle">
    for full diagram support
  </text>
</svg>"""

        return svg.encode('utf-8')

    def _check_cache(self, mermaid_source: str, format_key: str) -> Optional[bytes]:
        """Check if cached diagram exists"""
        cache_key = self._get_cache_key(mermaid_source, format_key)
        cache_file = self.cache_dir / f"{cache_key}.cache"

        if cache_file.exists():
            try:
                return cache_file.read_bytes()
            except Exception:
                pass

        return None

    def _cache_diagram(self, mermaid_source: str, format_key: str, data: bytes) -> None:
        """Cache rendered diagram"""
        cache_key = self._get_cache_key(mermaid_source, format_key)
        cache_file = self.cache_dir / f"{cache_key}.cache"

        try:
            cache_file.write_bytes(data)
        except Exception as e:
            print(f"Failed to cache diagram: {e}")

    def _get_cache_key(self, mermaid_source: str, format_key: str) -> str:
        """Generate cache key from Mermaid source"""
        content = f"{format_key}:{mermaid_source}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
