"""
AI-SDLC LLM Gateway — Model-Agnostic, Provider-Agnostic
=========================================================
Single entry point for ALL LLM calls across the platform.

Supported providers (set AISDLC_LLM_PROVIDER env var):
  openai            → GPT-4o, GPT-4o-mini, o1, o3, o4-mini …
  anthropic         → Claude 3.5 Sonnet/Haiku, Claude 3 Opus, Claude 4 …
  gemini / google   → Gemini 1.5 Pro/Flash, Gemini 2.0 …
  mistral           → Mistral Large/Small/Codestral …
  ollama            → Any local model (Llama 3, Phi-3, Mistral, Qwen …)
  groq              → Llama 3.1/3.3 on Groq (ultra-fast)
  together          → Together AI (Llama, Mixtral, DBRX …)
  azure_openai      → Azure-hosted OpenAI
  bedrock           → AWS Bedrock (Claude, Llama, Titan …)
  cohere            → Cohere Command R/R+
  openai_compatible → Any OpenAI-compatible endpoint (vLLM, LM Studio …)
"""
from __future__ import annotations

import json, logging, os, time, uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

import structlog

log = structlog.get_logger(__name__)


# ── Data Models ───────────────────────────────────────────────────────────────

class Role(str, Enum):
    SYSTEM    = "system"
    USER      = "user"
    ASSISTANT = "assistant"
    TOOL      = "tool"


@dataclass
class Message:
    role:         Role
    content:      str
    tool_calls:   Optional[List[Dict]] = None
    tool_call_id: Optional[str]        = None
    name:         Optional[str]        = None

    def to_dict(self) -> Dict:
        d: Dict[str, Any] = {"role": self.role.value, "content": self.content}
        if self.tool_calls:   d["tool_calls"]   = self.tool_calls
        if self.tool_call_id: d["tool_call_id"] = self.tool_call_id
        if self.name:         d["name"]         = self.name
        return d


@dataclass
class Tool:
    """A callable tool / function the LLM may invoke."""
    name:        str
    description: str
    parameters:  Dict[str, Any]   # JSON Schema

    def openai_fmt(self) -> Dict:
        return {"type": "function", "function": {
            "name": self.name, "description": self.description,
            "parameters": self.parameters}}

    def anthropic_fmt(self) -> Dict:
        return {"name": self.name, "description": self.description,
                "input_schema": self.parameters}


@dataclass
class LLMResponse:
    content:       str
    tool_calls:    Optional[List[Dict]] = None
    finish_reason: str                  = "stop"
    model:         str                  = ""
    usage:         Dict[str, int]       = field(default_factory=dict)
    raw:           Any                  = None
    latency_ms:    float                = 0.0
    cost_usd:      float                = 0.0


@dataclass
class LLMConfig:
    provider:     str           = "openai"
    model:        str           = "gpt-4o"
    api_key:      Optional[str] = None
    base_url:     Optional[str] = None
    timeout:      int           = 120
    temperature:  float         = 0.1
    max_tokens:   int           = 8192
    top_p:        float         = 1.0
    max_retries:  int           = 3
    retry_delay:  float         = 2.0


# ── Cost table (USD / 1M tokens) ─────────────────────────────────────────────

_COSTS: Dict[str, Tuple[float, float]] = {
    "gpt-4o": (2.50, 10.00), "gpt-4o-mini": (0.15, 0.60),
    "gpt-4-turbo": (10.00, 30.00), "gpt-3.5-turbo": (0.50, 1.50),
    "o1": (15.00, 60.00), "o1-mini": (3.00, 12.00),
    "o3": (10.00, 40.00), "o3-mini": (1.10, 4.40), "o4-mini": (1.10, 4.40),
    "claude-3-5-sonnet-20241022": (3.00, 15.00),
    "claude-3-5-haiku-20241022": (0.80, 4.00),
    "claude-3-opus-20240229": (15.00, 75.00),
    "claude-opus-4-5": (15.00, 75.00), "claude-sonnet-4-5": (3.00, 15.00),
    "gemini-1.5-pro": (1.25, 5.00), "gemini-1.5-flash": (0.075, 0.30),
    "gemini-2.0-flash": (0.10, 0.40),
    "mistral-large-latest": (2.00, 6.00), "mistral-small-latest": (0.20, 0.60),
    "llama-3.1-70b-versatile": (0.59, 0.79), "llama-3.1-8b-instant": (0.05, 0.08),
}

def _cost(model: str, inp: int, out: int) -> float:
    m = model.lower()
    for k, (ci, co) in _COSTS.items():
        if k in m or m in k:
            return (inp * ci + out * co) / 1_000_000
    return 0.0


# ── Provider Adapters ─────────────────────────────────────────────────────────

class _Adapter(ABC):
    @abstractmethod
    def complete(self, msgs: List[Message], tools: Optional[List[Tool]], cfg: LLMConfig) -> LLMResponse: ...
    def _key(self, cfg: LLMConfig, env: str) -> str:
        k = cfg.api_key or os.environ.get(env, "")
        if not k:
            raise ValueError(f"API key missing. Set cfg.api_key or {env} env var.")
        return k


class _OpenAIAdapter(_Adapter):
    def complete(self, msgs, tools, cfg) -> LLMResponse:
        from openai import OpenAI, AzureOpenAI
        kw: Dict[str, Any] = {}
        if cfg.base_url: kw["base_url"] = cfg.base_url
        if cfg.provider == "azure_openai":
            client = AzureOpenAI(api_key=self._key(cfg,"AZURE_OPENAI_API_KEY"),
                azure_endpoint=cfg.base_url or os.environ.get("AZURE_OPENAI_ENDPOINT",""),
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION","2024-08-01-preview"),
                timeout=cfg.timeout)
        elif cfg.provider == "groq":
            client = OpenAI(api_key=self._key(cfg,"GROQ_API_KEY"),
                base_url="https://api.groq.com/openai/v1", timeout=cfg.timeout)
        elif cfg.provider == "together":
            client = OpenAI(api_key=self._key(cfg,"TOGETHER_API_KEY"),
                base_url="https://api.together.xyz/v1", timeout=cfg.timeout)
        else:
            client = OpenAI(api_key=cfg.api_key or os.environ.get("OPENAI_API_KEY",""),
                timeout=cfg.timeout, **kw)
        payload: Dict[str,Any] = {"model":cfg.model,"messages":[m.to_dict() for m in msgs],
            "temperature":cfg.temperature,"max_tokens":cfg.max_tokens,"top_p":cfg.top_p}
        if tools:
            payload["tools"] = [t.openai_fmt() for t in tools]
            payload["tool_choice"] = "auto"
        t0 = time.time(); resp = client.chat.completions.create(**payload)
        lat = (time.time()-t0)*1000
        ch = resp.choices[0]; msg = ch.message
        tcs = None
        if msg.tool_calls:
            tcs = [{"id":tc.id,"type":"function","function":{"name":tc.function.name,"arguments":tc.function.arguments}} for tc in msg.tool_calls]
        usage = {}
        if resp.usage:
            usage = {"input_tokens":resp.usage.prompt_tokens,"output_tokens":resp.usage.completion_tokens,"total_tokens":resp.usage.total_tokens}
        return LLMResponse(content=msg.content or "",tool_calls=tcs,finish_reason=ch.finish_reason or "stop",
            model=resp.model,usage=usage,raw=resp,latency_ms=lat,
            cost_usd=_cost(cfg.model,usage.get("input_tokens",0),usage.get("output_tokens",0)))


class _AnthropicAdapter(_Adapter):
    def complete(self, msgs, tools, cfg) -> LLMResponse:
        import anthropic
        client = anthropic.Anthropic(api_key=self._key(cfg,"ANTHROPIC_API_KEY"),timeout=cfg.timeout)
        system = ""; conv = []
        for m in msgs:
            if m.role == Role.SYSTEM: system = m.content
            else: conv.append(m.to_dict())
        payload: Dict[str,Any] = {"model":cfg.model,"max_tokens":cfg.max_tokens,
            "messages":conv,"temperature":cfg.temperature}
        if system: payload["system"] = system
        if tools: payload["tools"] = [t.anthropic_fmt() for t in tools]
        t0 = time.time(); resp = client.messages.create(**payload)
        lat = (time.time()-t0)*1000
        content = ""; tcs = None
        for blk in resp.content:
            if blk.type == "text": content = blk.text
            elif blk.type == "tool_use":
                if tcs is None: tcs = []
                tcs.append({"id":blk.id,"type":"function","function":{"name":blk.name,"arguments":json.dumps(blk.input)}})
        usage = {"input_tokens":resp.usage.input_tokens,"output_tokens":resp.usage.output_tokens,
            "total_tokens":resp.usage.input_tokens+resp.usage.output_tokens}
        return LLMResponse(content=content,tool_calls=tcs,finish_reason=resp.stop_reason or "stop",
            model=resp.model,usage=usage,raw=resp,latency_ms=lat,
            cost_usd=_cost(cfg.model,usage["input_tokens"],usage["output_tokens"]))


class _GeminiAdapter(_Adapter):
    def complete(self, msgs, tools, cfg) -> LLMResponse:
        import google.generativeai as genai
        genai.configure(api_key=self._key(cfg,"GOOGLE_API_KEY"))
        system = None; conv = []
        for m in msgs:
            if m.role == Role.SYSTEM: system = m.content
            elif m.role == Role.USER: conv.append({"role":"user","parts":[m.content]})
            elif m.role == Role.ASSISTANT: conv.append({"role":"model","parts":[m.content]})
        model = genai.GenerativeModel(cfg.model, system_instruction=system)
        gen_cfg = genai.GenerationConfig(temperature=cfg.temperature,max_output_tokens=cfg.max_tokens)
        t0 = time.time(); resp = model.generate_content(conv,generation_config=gen_cfg)
        lat = (time.time()-t0)*1000
        um = resp.usage_metadata
        usage = {"input_tokens":getattr(um,"prompt_token_count",0),
            "output_tokens":getattr(um,"candidates_token_count",0),
            "total_tokens":getattr(um,"total_token_count",0)}
        return LLMResponse(content=resp.text or "",finish_reason="stop",model=cfg.model,
            usage=usage,raw=resp,latency_ms=lat,
            cost_usd=_cost(cfg.model,usage["input_tokens"],usage["output_tokens"]))


class _OllamaAdapter(_Adapter):
    def complete(self, msgs, tools, cfg) -> LLMResponse:
        c = LLMConfig(provider="openai_compatible",model=cfg.model,api_key="ollama",
            base_url=cfg.base_url or "http://localhost:11434/v1",
            temperature=cfg.temperature,max_tokens=cfg.max_tokens,timeout=cfg.timeout)
        r = _OpenAIAdapter().complete(msgs, tools, c)
        r.cost_usd = 0.0; return r


class _LiteLLMAdapter(_Adapter):
    """Catch-all: Bedrock, Cohere, Vertex AI, Replicate, HuggingFace, and 100+ more."""
    def complete(self, msgs, tools, cfg) -> LLMResponse:
        import litellm
        payload: Dict[str,Any] = {"model":cfg.model,"messages":[m.to_dict() for m in msgs],
            "temperature":cfg.temperature,"max_tokens":cfg.max_tokens}
        if cfg.api_key: payload["api_key"] = cfg.api_key
        if cfg.base_url: payload["api_base"] = cfg.base_url
        if tools: payload["tools"] = [t.openai_fmt() for t in tools]; payload["tool_choice"] = "auto"
        t0 = time.time(); resp = litellm.completion(**payload)
        lat = (time.time()-t0)*1000
        ch = resp.choices[0]; msg = ch.message
        tcs = None
        if getattr(msg,"tool_calls",None):
            tcs = [{"id":tc.id,"type":"function","function":{"name":tc.function.name,"arguments":tc.function.arguments}} for tc in msg.tool_calls]
        usage = {"input_tokens":getattr(resp.usage,"prompt_tokens",0),
            "output_tokens":getattr(resp.usage,"completion_tokens",0),
            "total_tokens":getattr(resp.usage,"total_tokens",0)}
        return LLMResponse(content=msg.content or "",tool_calls=tcs,finish_reason=ch.finish_reason or "stop",
            model=resp.model or cfg.model,usage=usage,raw=resp,latency_ms=lat,
            cost_usd=_cost(cfg.model,usage["input_tokens"],usage["output_tokens"]))


_ADAPTERS: Dict[str, type] = {
    "openai": _OpenAIAdapter, "openai_compatible": _OpenAIAdapter,
    "azure_openai": _OpenAIAdapter, "groq": _OpenAIAdapter, "together": _OpenAIAdapter,
    "anthropic": _AnthropicAdapter, "claude": _AnthropicAdapter,
    "gemini": _GeminiAdapter, "google": _GeminiAdapter,
    "ollama": _OllamaAdapter,
    "mistral": _LiteLLMAdapter, "bedrock": _LiteLLMAdapter,
    "cohere": _LiteLLMAdapter, "vertex_ai": _LiteLLMAdapter,
    "huggingface": _LiteLLMAdapter, "replicate": _LiteLLMAdapter,
}


# ── Main Gateway ──────────────────────────────────────────────────────────────

class LLMGateway:
    """
    The single, model-agnostic LLM entry point for all AI-SDLC agents.
    Change provider/model in config or env vars — zero code changes needed.
    """

    def __init__(self, config: LLMConfig):
        self.config  = config
        self._adapter: _Adapter = _ADAPTERS.get(config.provider.lower(), _LiteLLMAdapter)()
        self._calls = 0; self._tokens = 0; self._cost = 0.0
        log.info("llm_gateway.init", provider=config.provider, model=config.model)

    def complete(self, messages: List[Message], tools: Optional[List[Tool]] = None,
                 system_prompt: Optional[str] = None) -> LLMResponse:
        full = list(messages)
        if system_prompt and (not full or full[0].role != Role.SYSTEM):
            full.insert(0, Message(role=Role.SYSTEM, content=system_prompt))
        last_err = None
        for attempt in range(self.config.max_retries):
            try:
                r = self._adapter.complete(full, tools, self.config)
                self._calls += 1; self._tokens += r.usage.get("total_tokens",0); self._cost += r.cost_usd
                log.debug("llm.complete", model=r.model, tokens=r.usage.get("total_tokens"),
                    cost=f"${r.cost_usd:.5f}", ms=f"{r.latency_ms:.0f}")
                return r
            except Exception as e:
                last_err = e
                if attempt < self.config.max_retries - 1:
                    wait = self.config.retry_delay * (2 ** attempt)
                    log.warning("llm.retry", attempt=attempt+1, error=str(e), wait=wait)
                    time.sleep(wait)
        raise RuntimeError(f"LLM failed after {self.config.max_retries} attempts: {last_err}")

    def agentic_loop(self, messages: List[Message], tools: List[Tool],
                     executor: Callable[[str, Dict], Any],
                     system_prompt: Optional[str] = None, max_rounds: int = 25) -> LLMResponse:
        """Full ReAct loop: model calls tools until it produces a final text answer."""
        current = list(messages)
        for rnd in range(max_rounds):
            resp = self.complete(current, tools, system_prompt)
            if not resp.tool_calls:
                log.info("agentic_loop.done", rounds=rnd+1); return resp
            current.append(Message(role=Role.ASSISTANT, content=resp.content or "", tool_calls=resp.tool_calls))
            for tc in resp.tool_calls:
                name = tc["function"]["name"]
                try: args = json.loads(tc["function"]["arguments"])
                except: args = {}
                log.info("tool.call", name=name)
                try:
                    result = executor(name, args)
                    result_str = json.dumps(result) if not isinstance(result, str) else result
                except Exception as e:
                    result_str = f"ERROR: {e}"; log.error("tool.error", name=name, error=str(e))
                current.append(Message(role=Role.TOOL, content=result_str,
                    tool_call_id=tc["id"], name=name))
        log.warning("agentic_loop.max_rounds", max=max_rounds)
        return resp  # type: ignore

    def stats(self) -> Dict[str, Any]:
        return {"provider": self.config.provider, "model": self.config.model,
                "calls": self._calls, "tokens": self._tokens, "cost_usd": round(self._cost, 6)}

    @classmethod
    def from_env(cls) -> "LLMGateway":
        return cls(LLMConfig(
            provider=os.environ.get("AISDLC_LLM_PROVIDER", "openai"),
            model=os.environ.get("AISDLC_LLM_MODEL", "gpt-4o"),
            api_key=os.environ.get("AISDLC_LLM_API_KEY"),
            base_url=os.environ.get("AISDLC_LLM_BASE_URL"),
            temperature=float(os.environ.get("AISDLC_LLM_TEMPERATURE", "0.1")),
            max_tokens=int(os.environ.get("AISDLC_LLM_MAX_TOKENS", "8192")),
        ))

    @classmethod
    def for_provider(cls, provider: str, model: str, **kw) -> "LLMGateway":
        return cls(LLMConfig(provider=provider, model=model, **kw))
