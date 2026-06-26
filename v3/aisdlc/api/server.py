"""
AI-SDLC REST API Server
=========================
Production-grade FastAPI server exposing all SDLC capabilities via REST.

Endpoints:
  POST /api/v1/projects              — Start a new project (full pipeline)
  GET  /api/v1/projects              — List all projects
  GET  /api/v1/projects/{id}         — Get project status
  POST /api/v1/projects/{id}/phases  — Run a specific phase
  POST /api/v1/agents/run            — Run a specific agent
  POST /api/v1/security/scan         — Security scan
  POST /api/v1/memory/search         — Search agent memory
  POST /api/v1/memory/store          — Store knowledge
  POST /api/v1/noops/generate        — Generate NoOps configs
  GET  /api/v1/health                — Health check
  GET  /api/v1/metrics               — Prometheus metrics
  WebSocket /ws/projects/{id}        — Real-time project progress
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import structlog
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

log = structlog.get_logger(__name__)

# ── Pydantic Models ───────────────────────────────────────────────────────────

class CreateProjectRequest(BaseModel):
    idea:               str
    project_name:       Optional[str] = None
    additional_context: Optional[Dict[str, Any]] = None

class RunPhaseRequest(BaseModel):
    phase:   str
    context: Optional[Dict[str, Any]] = None

class RunAgentRequest(BaseModel):
    agent_type: str
    task:       Dict[str, Any]
    context:    Optional[Dict[str, Any]] = None

class SecurityScanRequest(BaseModel):
    directory:  str
    project_id: Optional[str] = None

class MemorySearchRequest(BaseModel):
    query:       str
    memory_type: str = "all"
    limit:       int = 10

class MemoryStoreRequest(BaseModel):
    content:     str
    memory_type: str = "semantic"
    tags:        List[str] = Field(default_factory=list)

class NoOpsGenerateRequest(BaseModel):
    service_name: str
    language:     str = "python"
    namespace:    str = "default"
    replicas:     int = 2


# ── App Factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title       = "AI-SDLC Platform API",
        description = "Fully autonomous AI-powered Software Development Lifecycle platform",
        version     = "2.0.0",
        docs_url    = "/docs",
        redoc_url   = "/redoc",
    )

    # Middleware
    app.add_middleware(CORSMiddleware,
        allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Lazy-loaded singletons
    _state: Dict[str, Any] = {}
    _ws_connections: Dict[str, List[WebSocket]] = {}

    def get_conductor():
        if "conductor" not in _state:
            from aisdlc.core.llm_gateway import LLMGateway
            from aisdlc.memory.memory_system import MemorySystem
            from aisdlc.orchestration.conductor import Conductor
            mem = MemorySystem()
            _state["memory"]    = mem
            _state["conductor"] = Conductor(
                llm=LLMGateway.from_env(),
                memory=mem,
                workspace_root=os.getenv("AISDLC_WORKSPACE", "./projects"),
                on_progress=lambda msg: asyncio.create_task(
                    _broadcast(msg, _ws_connections)
                ) if asyncio.get_event_loop().is_running() else None,
            )
        return _state["conductor"]

    def get_memory():
        get_conductor()  # Ensures memory is initialized
        return _state["memory"]

    def get_security():
        if "security" not in _state:
            from aisdlc.security.security_engine import SecurityEngine
            _state["security"] = SecurityEngine()
        return _state["security"]

    def get_noops():
        if "noops" not in _state:
            from aisdlc.noops.healing_engine import ResilienceCodeGenerator
            _state["noops"] = ResilienceCodeGenerator()
        return _state["noops"]

    async def _broadcast(msg: str, connections: Dict) -> None:
        for project_id, ws_list in connections.items():
            for ws in ws_list[:]:
                try:
                    await ws.send_json({"type": "progress", "message": msg,
                                        "timestamp": datetime.now(timezone.utc).isoformat()})
                except Exception:
                    ws_list.remove(ws)

    # ── Health ────────────────────────────────────────────────────────────────

    @app.get("/api/v1/health", tags=["System"])
    async def health():
        return {
            "status":    "healthy",
            "version":   "2.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @app.get("/api/v1/metrics", tags=["System"])
    async def metrics():
        """Prometheus-compatible metrics endpoint."""
        conductor = get_conductor()
        stats     = conductor.status()
        lines = [
            "# HELP aisdlc_agents_loaded Number of loaded agents",
            "# TYPE aisdlc_agents_loaded gauge",
            f"aisdlc_agents_loaded {len(stats.get('agents_loaded', []))}",
            "# HELP aisdlc_info Platform info",
            "# TYPE aisdlc_info gauge",
            'aisdlc_info{version="2.0.0"} 1',
        ]
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse("\n".join(lines) + "\n",
                                  media_type="text/plain; version=0.0.4")

    # ── Projects ──────────────────────────────────────────────────────────────

    @app.post("/api/v1/projects", tags=["Projects"], status_code=202)
    async def create_project(req: CreateProjectRequest, background: BackgroundTasks):
        """Start a new project. Runs asynchronously — poll GET /projects/{id} for status."""
        pid = f"proj-{uuid.uuid4().hex[:8]}"
        workspace = os.path.join(os.getenv("AISDLC_WORKSPACE", "./projects"), pid)
        os.makedirs(workspace, exist_ok=True)

        # Write initial ledger
        initial = {
            "project_id":   pid,
            "project_name": req.project_name or pid,
            "idea":         req.idea,
            "workspace":    workspace,
            "status":       "queued",
            "started_at":   datetime.now(timezone.utc).isoformat(),
        }
        with open(os.path.join(workspace, "project_ledger.json"), "w") as f:
            json.dump(initial, f, indent=2)

        def run_pipeline():
            try:
                conductor = get_conductor()
                conductor.run(
                    idea=req.idea,
                    project_name=req.project_name,
                    additional_context=req.additional_context,
                    project_id=pid,
                )
            except Exception as e:
                log.error("project.pipeline_error", project_id=pid, error=str(e))

        background.add_task(run_pipeline)
        return {"project_id": pid, "status": "queued", "workspace": workspace}

    @app.get("/api/v1/projects", tags=["Projects"])
    async def list_projects(status: Optional[str] = None, limit: int = 20):
        workspace_root = os.getenv("AISDLC_WORKSPACE", "./projects")
        projects = []
        if os.path.exists(workspace_root):
            for pid in os.listdir(workspace_root):
                lp = os.path.join(workspace_root, pid, "project_ledger.json")
                if os.path.exists(lp):
                    try:
                        with open(lp) as f:
                            data = json.load(f)
                        if not status or data.get("status") == status:
                            projects.append({
                                "project_id":   data.get("project_id"),
                                "project_name": data.get("project_name"),
                                "idea":         data.get("idea", "")[:100],
                                "status":       data.get("status"),
                                "started_at":   data.get("started_at"),
                                "artifacts":    len(data.get("artifacts", [])),
                            })
                    except Exception:
                        pass
        return {"projects": sorted(projects, key=lambda x: x.get("started_at",""), reverse=True)[:limit],
                "total": len(projects)}

    @app.get("/api/v1/projects/{project_id}", tags=["Projects"])
    async def get_project(project_id: str):
        workspace_root = os.getenv("AISDLC_WORKSPACE", "./projects")
        lp = os.path.join(workspace_root, project_id, "project_ledger.json")
        if not os.path.exists(lp):
            raise HTTPException(404, f"Project not found: {project_id}")
        with open(lp) as f:
            return json.load(f)

    @app.post("/api/v1/projects/{project_id}/phases", tags=["Projects"])
    async def run_phase(project_id: str, req: RunPhaseRequest):
        from aisdlc.mcp.server import AISdlcMCPServer
        srv = AISdlcMCPServer()
        return srv._tool_sdlc_run_phase(project_id, req.phase, req.context)

    # ── Agents ────────────────────────────────────────────────────────────────

    @app.post("/api/v1/agents/run", tags=["Agents"])
    async def run_agent(req: RunAgentRequest):
        from aisdlc.agents.all_agents import create_agent
        conductor = get_conductor()
        agent     = create_agent(req.agent_type, llm=conductor.llm, memory=get_memory())
        result    = agent.run(req.task, req.context or {})
        return {
            "agent_type": result.agent_type,
            "success":    result.success,
            "output":     result.output,
            "artifacts":  result.artifacts,
            "errors":     result.errors,
            "tokens":     result.tokens_used,
            "cost_usd":   result.cost_usd,
        }

    # ── Security ──────────────────────────────────────────────────────────────

    @app.post("/api/v1/security/scan", tags=["Security"])
    async def security_scan(req: SecurityScanRequest):
        security = get_security()
        pid      = req.project_id or str(uuid.uuid4())
        report   = security.full_scan(req.directory, pid)
        return {
            "scan_id":  report.scan_id,
            "score":    report.score,
            "passed":   report.passed,
            "summary":  report.summary(),
            "findings": [
                {"id": f.id, "severity": f.severity.value, "title": f.title,
                 "file": f.file, "line": f.line, "remediation": f.remediation}
                for f in report.findings
            ],
        }

    # ── Memory ────────────────────────────────────────────────────────────────

    @app.post("/api/v1/memory/search", tags=["Memory"])
    async def memory_search(req: MemorySearchRequest):
        memory  = get_memory()
        results = memory.search(req.query, limit=req.limit)
        return {"query": req.query, "results": results, "count": len(results)}

    @app.post("/api/v1/memory/store", tags=["Memory"])
    async def memory_store(req: MemoryStoreRequest):
        memory = get_memory()
        if req.memory_type == "semantic":
            memory.semantic.store(req.content, tags=req.tags)
        elif req.memory_type == "procedural":
            memory.procedural.store(req.content, tags=req.tags)
        return {"stored": True, "memory_type": req.memory_type}

    # ── NoOps ─────────────────────────────────────────────────────────────────

    @app.post("/api/v1/noops/generate", tags=["NoOps"])
    async def generate_noops(req: NoOpsGenerateRequest):
        noops = get_noops()
        files = noops.generate_for_service(req.service_name, req.language, req.namespace)
        return {"service": req.service_name, "files": files, "file_count": len(files)}

    # ── WebSocket ─────────────────────────────────────────────────────────────

    @app.websocket("/ws/projects/{project_id}")
    async def ws_project(websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in _ws_connections:
            _ws_connections[project_id] = []
        _ws_connections[project_id].append(websocket)
        try:
            while True:
                await websocket.receive_text()  # Keep alive
        except WebSocketDisconnect:
            _ws_connections[project_id].remove(websocket)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "aisdlc.api.server:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=os.getenv("API_RELOAD", "false").lower() == "true",
        log_level="info",
    )
