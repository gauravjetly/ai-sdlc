"""
Claude Content Synthesizer - LLM-based content generation

Implements ContentSynthesizerPort using Anthropic Claude API.
"""

import json
import time
from typing import Dict, Any, Optional
import sys
from pathlib import Path
import hashlib

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from domain.interfaces.content_synthesizer_port import ContentSynthesizerPort
from infrastructure.config.config import Config, get_config

# Optional Claude SDK import (graceful degradation if not available)
try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    anthropic = None


class ClaudeContentSynthesizer(ContentSynthesizerPort):
    """
    LLM-based content synthesizer using Claude API.

    Features:
    - Structured prompts for each slide type
    - Audience-aware content generation
    - Response caching by content hash
    - Retry logic with exponential backoff
    - Graceful degradation to template-based fallback
    """

    def __init__(self, config: Optional[Config] = None, cache_dir: Optional[str] = None):
        """
        Initialize Claude content synthesizer.

        Args:
            config: Configuration instance (uses global if None)
            cache_dir: Directory for caching responses
        """
        self.config = config or get_config()
        self.cache_dir = Path(cache_dir) if cache_dir else Path(self.config.memory_base_path) / "cache" / "llm"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Initialize Claude client if available
        self.client = None
        if CLAUDE_AVAILABLE and self.config.is_claude_available():
            self.client = anthropic.Anthropic(api_key=self.config.claude_api_key)

    def synthesize_slide_content(
        self,
        presentation_type: str,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Synthesize content for a slide using Claude API.

        Args:
            presentation_type: Type of presentation
            slide_type: Type of slide
            project_data: Raw project data
            audience_context: Audience preferences and context

        Returns:
            Dictionary with slide content
        """
        # Check cache first
        if self.config.cache_llm_responses:
            cached = self._check_cache(presentation_type, slide_type, project_data, audience_context)
            if cached:
                return cached

        # If Claude is not available, fall back to template-based
        if not self.is_available():
            return self._template_fallback(slide_type, project_data, audience_context)

        # Build prompt
        prompt = self._build_prompt(presentation_type, slide_type, project_data, audience_context)
        system_prompt = self._build_system_prompt(audience_context)

        # Call Claude with retry
        response = self._call_claude_with_retry(prompt, system_prompt)

        if response is None:
            # Fall back to templates
            return self._template_fallback(slide_type, project_data, audience_context)

        # Parse response
        content = self._parse_response(response, slide_type)

        # Cache the result
        if self.config.cache_llm_responses:
            self._cache_response(presentation_type, slide_type, project_data, audience_context, content)

        return content

    def generate_executive_summary(self, project_data: Dict[str, Any]) -> str:
        """
        Generate executive summary text.

        Args:
            project_data: Raw project data

        Returns:
            Executive summary text
        """
        if not self.is_available():
            return self._generate_template_summary(project_data)

        prompt = f"""Generate a concise executive summary for this project:

Project: {project_data.get('name', 'Unknown Project')}
ID: {project_data.get('id', 'N/A')}
Status: {project_data.get('status', 'active')}
Phases: {len(project_data.get('phases', []))}

Create a 2-3 sentence executive summary focusing on:
1. What has been accomplished
2. Current status
3. Key outcomes or next steps

Be concise and outcome-focused."""

        system_prompt = "You are an executive presentation writer for Vintiq. Write clear, concise, business-focused summaries."

        response = self._call_claude_with_retry(prompt, system_prompt)

        if response is None:
            return self._generate_template_summary(project_data)

        return response.strip()

    def is_available(self) -> bool:
        """
        Check if Claude synthesizer is available.

        Returns:
            True if Claude API is configured and SDK is installed
        """
        return CLAUDE_AVAILABLE and self.client is not None

    def _build_system_prompt(self, audience_context: Dict[str, Any]) -> str:
        """Build system prompt based on audience"""
        audience_type = audience_context.get('type', 'vp-director')
        detail_level = audience_context.get('detail_level', 2)
        technical_depth = audience_context.get('technical_depth', 0.5)

        prompts = {
            'c-suite': "You are an executive presentation writer for Vintiq. Focus on high-level outcomes, ROI, and strategic impact. Be concise and business-focused.",
            'tech-lead': "You are a technical presentation writer for Vintiq. Include architecture details, technical decisions, and implementation specifics.",
            'vp-director': "You are a strategic presentation writer for Vintiq. Balance business context with technical overview.",
        }

        base_prompt = prompts.get(audience_type, prompts['vp-director'])

        if detail_level == 1:
            base_prompt += " Keep content minimal - 3-5 key points maximum."
        elif detail_level >= 3:
            base_prompt += " Provide detailed content with comprehensive coverage."

        return base_prompt

    def _build_prompt(
        self,
        presentation_type: str,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
    ) -> str:
        """Build specific prompt for slide type"""
        max_bullets = audience_context.get('max_bullets', 5)
        max_words = audience_context.get('max_words_per_bullet', 20)

        prompt = f"""Generate content for a "{slide_type}" slide in a "{presentation_type}" presentation.

Project Data:
- Name: {project_data.get('name', 'Unknown')}
- ID: {project_data.get('id', 'N/A')}
- Status: {project_data.get('status', 'active')}
- Phases: {len(project_data.get('phases', []))}

Requirements:
- Maximum {max_bullets} bullet points
- Maximum {max_words} words per bullet point
- Focus on {', '.join(audience_context.get('interests', ['key outcomes']))}

Return a JSON object with this structure:
{{
    "headline": "Clear, action-oriented headline",
    "bullet_points": ["Point 1", "Point 2", ...],
    "metrics": {{"metric_name": "value"}},
    "narrative": "Optional supporting narrative"
}}

Be specific, use numbers where applicable, and focus on outcomes."""

        return prompt

    def _call_claude_with_retry(
        self,
        prompt: str,
        system_prompt: str,
        max_retries: Optional[int] = None,
    ) -> Optional[str]:
        """
        Call Claude API with retry logic.

        Args:
            prompt: User prompt
            system_prompt: System prompt
            max_retries: Maximum retry attempts (uses config if None)

        Returns:
            Response text, or None if all retries failed
        """
        if not self.is_available():
            return None

        max_retries = max_retries or self.config.retry_attempts

        for attempt in range(max_retries):
            try:
                message = self.client.messages.create(
                    model=self.config.claude_model,
                    max_tokens=self.config.claude_max_tokens,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    timeout=self.config.claude_timeout_seconds,
                )

                # Extract text from response
                if message.content and len(message.content) > 0:
                    return message.content[0].text

                return None

            except Exception as e:
                if attempt < max_retries - 1:
                    # Exponential backoff
                    wait_time = self.config.retry_backoff_seconds * (2 ** attempt)
                    time.sleep(wait_time)
                else:
                    # All retries failed
                    print(f"Claude API call failed after {max_retries} attempts: {e}")
                    return None

        return None

    def _parse_response(self, response: str, slide_type: str) -> Dict[str, Any]:
        """Parse Claude response into structured content"""
        try:
            # Try to parse as JSON
            if "{" in response and "}" in response:
                # Extract JSON from response
                start = response.find("{")
                end = response.rfind("}") + 1
                json_str = response[start:end]
                content = json.loads(json_str)
                return content
        except json.JSONDecodeError:
            pass

        # Fallback: treat as plain text
        lines = [line.strip() for line in response.split("\n") if line.strip()]
        return {
            'headline': lines[0] if lines else f"Content for {slide_type}",
            'bullet_points': lines[1:6] if len(lines) > 1 else [],
            'metrics': {},
            'narrative': response,
        }

    def _template_fallback(
        self,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate template-based content without LLM"""
        templates = {
            'executive-summary': {
                'headline': f"Executive Summary - {project_data.get('name', 'Project')}",
                'bullet_points': [
                    f"Project {project_data.get('id', 'N/A')} currently {project_data.get('status', 'active')}",
                    f"{len(project_data.get('phases', []))} development phases orchestrated by AI agents",
                    "Automated quality assurance and security scanning enabled",
                    "Real-time monitoring and cost optimization in place",
                ],
                'metrics': {},
                'narrative': "AI-SDLC automated development lifecycle in progress.",
            },
            'key-metrics': {
                'headline': "Key Performance Indicators",
                'bullet_points': [
                    f"Total Phases: {len(project_data.get('phases', []))}",
                    f"Project Status: {project_data.get('status', 'Active').title()}",
                    "Automated Agent Orchestration: Enabled",
                ],
                'metrics': {
                    'Total Phases': len(project_data.get('phases', [])),
                    'Status': project_data.get('status', 'active'),
                },
                'narrative': "",
            },
            'next-steps': {
                'headline': "Next Steps & Recommendations",
                'bullet_points': [
                    "Continue monitoring agent performance metrics",
                    "Review completed phases for deployment approval",
                    "Schedule stakeholder demo of new features",
                    "Plan next sprint priorities",
                ],
                'metrics': {},
                'narrative': "",
            },
        }

        return templates.get(slide_type, {
            'headline': f"Content for {slide_type}",
            'bullet_points': ["Content generation in progress"],
            'metrics': {},
            'narrative': "",
        })

    def _generate_template_summary(self, project_data: Dict[str, Any]) -> str:
        """Generate template-based executive summary"""
        return (
            f"Project {project_data.get('name', 'Unknown')} ({project_data.get('id', 'N/A')}) "
            f"is currently {project_data.get('status', 'active')} with "
            f"{len(project_data.get('phases', []))} phases orchestrated by AI agents. "
            "Automated development lifecycle with quality assurance and security scanning enabled."
        )

    def _check_cache(
        self,
        presentation_type: str,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Check if cached response exists"""
        cache_key = self._get_cache_key(presentation_type, slide_type, project_data, audience_context)
        cache_file = self.cache_dir / f"{cache_key}.json"

        if cache_file.exists():
            # Check TTL
            cache_age = time.time() - cache_file.stat().st_mtime
            if cache_age < self.config.cache_ttl_seconds:
                try:
                    with open(cache_file, 'r') as f:
                        return json.load(f)
                except Exception:
                    pass

        return None

    def _cache_response(
        self,
        presentation_type: str,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
        content: Dict[str, Any],
    ) -> None:
        """Cache synthesized content"""
        cache_key = self._get_cache_key(presentation_type, slide_type, project_data, audience_context)
        cache_file = self.cache_dir / f"{cache_key}.json"

        try:
            with open(cache_file, 'w') as f:
                json.dump(content, f, indent=2)
        except Exception as e:
            print(f"Failed to cache response: {e}")

    def _get_cache_key(
        self,
        presentation_type: str,
        slide_type: str,
        project_data: Dict[str, Any],
        audience_context: Dict[str, Any],
    ) -> str:
        """Generate cache key from inputs"""
        # Create hash of inputs
        inputs = {
            'presentation_type': presentation_type,
            'slide_type': slide_type,
            'project_id': project_data.get('id', ''),
            'project_status': project_data.get('status', ''),
            'phase_count': len(project_data.get('phases', [])),
            'audience_type': audience_context.get('type', ''),
        }

        input_str = json.dumps(inputs, sort_keys=True)
        return hashlib.sha256(input_str.encode()).hexdigest()[:16]
