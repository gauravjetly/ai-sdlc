# =============================================================================
# AI-SDLC Multi-Stage Dockerfile
# =============================================================================
# Stages:
#   base    — Common Python base with all dependencies
#   api     — REST API server
#   mcp     — MCP server (stdio + SSE)
#   cli     — CLI tool
# =============================================================================

# ── Base ──────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

LABEL maintainer="AI-SDLC Team"
LABEL description="Fully autonomous AI-powered SDLC platform"
LABEL version="2.0.0"

# Security: run as non-root
RUN groupadd -r aisdlc && useradd -r -g aisdlc -d /app -s /sbin/nologin aisdlc

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl wget build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        openai anthropic google-generativeai \
        fastapi uvicorn[standard] pydantic \
        chromadb redis psycopg2-binary sqlalchemy \
        structlog rich click \
        bandit semgrep \
        httpx aiohttp \
        tiktoken \
        tenacity \
        python-dotenv

# Copy source
COPY aisdlc/ ./aisdlc/

# Create data directory
RUN mkdir -p /data/projects && chown -R aisdlc:aisdlc /data /app

# ── API Server ────────────────────────────────────────────────────────────────
FROM base AS api

USER aisdlc

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["python", "-m", "uvicorn", "aisdlc.api.server:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--log-level", "info"]

# ── MCP Server ────────────────────────────────────────────────────────────────
FROM base AS mcp

USER aisdlc

EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

CMD ["python", "-m", "aisdlc.mcp.server", "--transport", "sse", \
     "--host", "0.0.0.0", "--port", "8765"]

# ── CLI ───────────────────────────────────────────────────────────────────────
FROM base AS cli

USER aisdlc

ENTRYPOINT ["python", "-m", "aisdlc.cli"]
