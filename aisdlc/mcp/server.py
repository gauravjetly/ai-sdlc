"""
AI-SDLC MCP Server
====================
Exposes all AI-SDLC capabilities as Model Context Protocol (MCP) tools.
Any MCP-compatible AI model (Claude, GPT-4, Cursor, Continue, etc.) can
connect to this server and use the full SDLC pipeline as native tools.

Transport: stdio (default) or SSE (HTTP)
Protocol:  MCP 2024-11-05

Tools exposed:
  • sdlc_run_full_pipeline     — Run the complete SDLC pipeline end-to-end
  • sdlc_run_phase             — Run a specific SDLC phase
  • sdlc_get_project_status    — Get project status and artifacts
  • sdlc_list_projects         — List all projects
  • sdlc_memory_search         — Search the agent memory
  • sdlc_memory_store          — Store knowledge in agent memory
  • sdlc_security_scan         — Run a security scan on code
  • sdlc_generate_noops_config — Generate NoOps/self-healing configs
  • sdlc_generate_agent_prompt — Generate a specialized agent prompt
  • sdlc_run_agent             — Run a specific agent on a task
  • sdlc_create_github_repo    — Create a GitHub repo with best practices
  • sdlc_generate_architecture — Generate system architecture document
  • sdlc_generate_prd          — Generate a Product Requirements Document
  • sdlc_generate_tests        — Generate comprehensive test suite
  • sdlc_generate_cicd         — Generate CI/CD pipeline configuration
  • sdlc_deploy_to_k8s         — Generate Kubernetes deployment manifests
  • sdlc_health_check          — Check the health of the SDLC platform
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

import structlog

log = structlog.get_logger(__name__)


# ── MCP Protocol Types ────────────────────────────────────────────────────────

class MCPError(Exception):
    def __init__(self, code: int, message: str, data: Any = None):
        self.code    = code
        self.message = message
        self.data    = data
        super().__init__(message)

    PARSE_ERROR      = -32700
    INVALID_REQUEST  = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS   = -32602
    INTERNAL_ERROR   = -32603


def _ok(id: Any, result: Any) -> Dict:
    return {"jsonrpc": "2.0", "id": id, "result": result}

def _err(id: Any, code: int, message: str, data: Any = None) -> Dict:
    err: Dict[str, Any] = {"code": code, "message": message}
    if data:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": id, "error": err}


# ── Tool Definitions ──────────────────────────────────────────────────────────

MCP_TOOLS = [
    {
        "name": "sdlc_run_full_pipeline",
        "description": (
            "Run the complete AI-SDLC pipeline end-to-end for any software idea. "
            "This autonomously executes all 15 agents: Ideation → BA → Architecture → "
            "UX → Data Engineering → Security → Engineering → QA → DevOps → "
            "Self-Healing → Chaos Engineering → Compliance → FinOps → Maintenance. "
            "Returns a complete project with all artifacts, code, tests, and deployment configs."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "idea": {
                    "type": "string",
                    "description": "The software idea or project description to build"
                },
                "project_name": {
                    "type": "string",
                    "description": "Optional project name (auto-generated if not provided)"
                },
                "additional_context": {
                    "type": "object",
                    "description": "Optional additional context (tech stack preferences, constraints, etc.)"
                },
            },
            "required": ["idea"],
        },
    },
    {
        "name": "sdlc_run_phase",
        "description": (
            "Run a specific SDLC phase for an existing project. "
            "Phases: ideation, business_analysis, architecture, ux_design, "
            "data_engineering, security, engineering, qa, devops, self_healing, "
            "chaos, compliance, finops, maintenance"
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Existing project ID"},
                "phase":      {"type": "string", "description": "Phase name to run"},
                "context":    {"type": "object", "description": "Additional context for the phase"},
            },
            "required": ["project_id", "phase"],
        },
    },
    {
        "name": "sdlc_run_agent",
        "description": (
            "Run a specific AI agent on a task. Available agents: "
            "ideation_agent, ba_agent, architect_agent, ux_agent, engineer_agent, "
            "data_engineer_agent, qa_agent, security_agent, devops_agent, "
            "self_healing_agent, chaos_agent, compliance_agent, finops_agent, "
            "maintenance_agent"
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent_type": {"type": "string", "description": "Agent type to run"},
                "task":       {"type": "object", "description": "Task description and parameters"},
                "context":    {"type": "object", "description": "Project context"},
            },
            "required": ["agent_type", "task"],
        },
    },
    {
        "name": "sdlc_get_project_status",
        "description": "Get the current status, phases, and artifacts for a project",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Project ID"},
            },
            "required": ["project_id"],
        },
    },
    {
        "name": "sdlc_list_projects",
        "description": "List all projects managed by this AI-SDLC instance",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by status (running/completed/failed)"},
                "limit":  {"type": "integer", "description": "Max projects to return", "default": 20},
            },
        },
    },
    {
        "name": "sdlc_memory_search",
        "description": (
            "Search the AI-SDLC agent memory for relevant knowledge, patterns, "
            "and past project experiences. The memory contains lessons learned "
            "from all previous projects."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query":       {"type": "string", "description": "Search query"},
                "memory_type": {"type": "string",
                                "enum": ["semantic", "episodic", "procedural", "all"],
                                "default": "all"},
                "limit":       {"type": "integer", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "sdlc_memory_store",
        "description": "Store new knowledge or a lesson learned in the agent memory",
        "inputSchema": {
            "type": "object",
            "properties": {
                "content":     {"type": "string", "description": "Knowledge to store"},
                "memory_type": {"type": "string",
                                "enum": ["semantic", "procedural"],
                                "default": "semantic"},
                "tags":        {"type": "array", "items": {"type": "string"}},
            },
            "required": ["content"],
        },
    },
    {
        "name": "sdlc_security_scan",
        "description": (
            "Run a comprehensive security scan on a code directory or file. "
            "Detects: hardcoded secrets, SAST vulnerabilities, dependency CVEs, "
            "insecure configurations. Returns findings with severity and remediation."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "directory":   {"type": "string", "description": "Directory path to scan"},
                "project_id":  {"type": "string", "description": "Project ID for tracking"},
                "scan_types":  {"type": "array", "items": {"type": "string"},
                                "description": "Types: secrets, sast, dependencies"},
            },
            "required": ["directory"],
        },
    },
    {
        "name": "sdlc_generate_noops_config",
        "description": (
            "Generate complete NoOps/self-healing configuration for a service. "
            "Produces: Kubernetes deployment with HPA/PDB, health probes, "
            "circuit breakers, auto-remediation playbooks, Prometheus alerts, "
            "and chaos engineering tests."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "service_name": {"type": "string"},
                "language":     {"type": "string", "enum": ["python", "node", "go", "java"], "default": "python"},
                "namespace":    {"type": "string", "default": "default"},
                "replicas":     {"type": "integer", "default": 2},
            },
            "required": ["service_name"],
        },
    },
    {
        "name": "sdlc_generate_architecture",
        "description": (
            "Generate a complete system architecture document for a software project. "
            "Includes: component diagram, data flow, API design, database schema, "
            "scalability strategy, and technology recommendations."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "idea":        {"type": "string", "description": "Project description"},
                "constraints": {"type": "object", "description": "Tech stack, budget, team size constraints"},
            },
            "required": ["idea"],
        },
    },
    {
        "name": "sdlc_generate_prd",
        "description": (
            "Generate a comprehensive Product Requirements Document (PRD) from an idea. "
            "Includes: executive summary, user personas, user stories, acceptance criteria, "
            "non-functional requirements, and success metrics."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "idea":       {"type": "string", "description": "Product idea"},
                "target_users": {"type": "string", "description": "Target user description"},
                "constraints": {"type": "string", "description": "Business constraints"},
            },
            "required": ["idea"],
        },
    },
    {
        "name": "sdlc_generate_tests",
        "description": (
            "Generate a comprehensive test suite for a codebase. "
            "Produces: unit tests, integration tests, E2E tests, load tests, "
            "chaos tests, and security tests with full coverage targets."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "code_path":   {"type": "string", "description": "Path to source code"},
                "framework":   {"type": "string", "description": "Test framework (pytest, jest, etc.)"},
                "coverage_target": {"type": "integer", "default": 80},
            },
            "required": ["code_path"],
        },
    },
    {
        "name": "sdlc_generate_cicd",
        "description": (
            "Generate a complete CI/CD pipeline configuration. "
            "Supports: GitHub Actions, GitLab CI, Jenkins, CircleCI. "
            "Includes: build, test, security scan, deploy, rollback stages."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "platform":    {"type": "string",
                                "enum": ["github_actions", "gitlab_ci", "jenkins", "circleci"],
                                "default": "github_actions"},
                "services":    {"type": "array", "items": {"type": "string"}},
                "registry":    {"type": "string", "description": "Container registry URL"},
                "k8s_cluster": {"type": "string", "description": "Kubernetes cluster name"},
            },
        },
    },
    {
        "name": "sdlc_deploy_to_k8s",
        "description": (
            "Generate complete Kubernetes deployment manifests with zero-trust security. "
            "Produces: Deployment, Service, Ingress, HPA, PDB, NetworkPolicy, "
            "RBAC, mTLS (Istio), and monitoring configs."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "services":   {"type": "array", "items": {"type": "string"}},
                "namespace":  {"type": "string", "default": "default"},
                "domain":     {"type": "string", "description": "Domain for ingress"},
                "registry":   {"type": "string", "description": "Container registry"},
            },
            "required": ["services"],
        },
    },
    {
        "name": "sdlc_health_check",
        "description": "Check the health and status of the AI-SDLC platform",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
]


# ── MCP Server ────────────────────────────────────────────────────────────────

class AISdlcMCPServer:
    """
    AI-SDLC MCP Server.

    Implements the Model Context Protocol over stdio.
    Start with: python -m aisdlc.mcp.server
    """

    SERVER_INFO = {
        "name":    "ai-sdlc",
        "version": "2.0.0",
    }

    CAPABILITIES = {
        "tools": {},
    }

    def __init__(self):
        self._conductor = None
        self._memory    = None
        self._security  = None
        self._noops     = None
        self._projects: Dict[str, Any] = {}
        self._initialized = False

    def _lazy_init(self) -> None:
        """Lazy-initialize heavy components on first use."""
        if self._initialized:
            return
        try:
            from aisdlc.core.llm_gateway import LLMGateway
            from aisdlc.memory.memory_system import MemorySystem
            from aisdlc.orchestration.conductor import Conductor
            from aisdlc.security.security_engine import SecurityEngine
            from aisdlc.noops.healing_engine import ResilienceCodeGenerator

            self._memory    = MemorySystem()
            self._conductor = Conductor(
                llm=LLMGateway.from_env(),
                memory=self._memory,
                workspace_root=os.getenv("AISDLC_WORKSPACE", "./projects"),
                on_progress=lambda msg: log.info("progress", msg=msg),
            )
            self._security  = SecurityEngine()
            self._noops     = ResilienceCodeGenerator()
            self._initialized = True
            log.info("mcp.initialized")
        except Exception as e:
            log.error("mcp.init_failed", error=str(e))
            raise

    # ── Message dispatch ──────────────────────────────────────────────────────

    def handle_message(self, msg: Dict) -> Optional[Dict]:
        """Handle a single JSON-RPC message."""
        method = msg.get("method", "")
        id_    = msg.get("id")
        params = msg.get("params", {})

        try:
            if method == "initialize":
                return _ok(id_, {
                    "protocolVersion": "2024-11-05",
                    "capabilities":    self.CAPABILITIES,
                    "serverInfo":      self.SERVER_INFO,
                })

            elif method == "notifications/initialized":
                return None  # No response for notifications

            elif method == "tools/list":
                return _ok(id_, {"tools": MCP_TOOLS})

            elif method == "tools/call":
                return self._handle_tool_call(id_, params)

            elif method == "ping":
                return _ok(id_, {})

            else:
                return _err(id_, MCPError.METHOD_NOT_FOUND, f"Method not found: {method}")

        except MCPError as e:
            return _err(id_, e.code, e.message, e.data)
        except Exception as e:
            log.error("mcp.unhandled_error", error=str(e), traceback=traceback.format_exc())
            return _err(id_, MCPError.INTERNAL_ERROR, str(e))

    def _handle_tool_call(self, id_: Any, params: Dict) -> Dict:
        """Dispatch a tool call to the appropriate handler."""
        tool_name = params.get("name", "")
        args      = params.get("arguments", {})

        handler = getattr(self, f"_tool_{tool_name}", None)
        if not handler:
            raise MCPError(MCPError.METHOD_NOT_FOUND, f"Tool not found: {tool_name}")

        try:
            result = handler(**args)
            return _ok(id_, {
                "content": [{"type": "text", "text": json.dumps(result, indent=2, default=str)}],
                "isError": False,
            })
        except Exception as e:
            log.error("tool.error", tool=tool_name, error=str(e))
            return _ok(id_, {
                "content": [{"type": "text", "text": f"Error: {str(e)}"}],
                "isError": True,
            })

    # ── Tool Handlers ─────────────────────────────────────────────────────────

    def _tool_sdlc_run_full_pipeline(self, idea: str,
                                     project_name: Optional[str] = None,
                                     additional_context: Optional[Dict] = None) -> Dict:
        self._lazy_init()
        ledger = self._conductor.run(
            idea=idea,
            project_name=project_name,
            additional_context=additional_context,
        )
        self._projects[ledger.project_id] = ledger
        return {
            "project_id":   ledger.project_id,
            "project_name": ledger.project_name,
            "status":       ledger.status,
            "workspace":    ledger.workspace,
            "artifacts":    ledger.artifacts[:20],
            "total_artifacts": len(ledger.artifacts),
            "total_cost":   ledger.total_cost,
            "total_tokens": ledger.total_tokens,
            "phases":       [{"id": p.id, "name": p.name, "status": p.status.value}
                             for p in ledger.phases],
            "errors":       ledger.errors,
        }

    def _tool_sdlc_run_agent(self, agent_type: str, task: Dict,
                              context: Optional[Dict] = None) -> Dict:
        self._lazy_init()
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent(agent_type, llm=self._conductor.llm, memory=self._memory)
        result = agent.run(task, context or {})
        return {
            "agent_type": result.agent_type,
            "success":    result.success,
            "output":     result.output,
            "artifacts":  result.artifacts,
            "errors":     result.errors,
            "tokens":     result.tokens_used,
            "cost":       result.cost_usd,
        }

    def _tool_sdlc_get_project_status(self, project_id: str) -> Dict:
        workspace = os.path.join(
            os.getenv("AISDLC_WORKSPACE", "./projects"), project_id
        )
        ledger_path = os.path.join(workspace, "project_ledger.json")
        if os.path.exists(ledger_path):
            with open(ledger_path) as f:
                return json.load(f)
        if project_id in self._projects:
            return self._projects[project_id].to_dict()
        return {"error": f"Project not found: {project_id}"}

    def _tool_sdlc_list_projects(self, status: Optional[str] = None,
                                  limit: int = 20) -> Dict:
        workspace_root = os.getenv("AISDLC_WORKSPACE", "./projects")
        projects = []
        if os.path.exists(workspace_root):
            for pid in os.listdir(workspace_root):
                ledger_path = os.path.join(workspace_root, pid, "project_ledger.json")
                if os.path.exists(ledger_path):
                    try:
                        with open(ledger_path) as f:
                            data = json.load(f)
                        if not status or data.get("status") == status:
                            projects.append({
                                "project_id":   data.get("project_id"),
                                "project_name": data.get("project_name"),
                                "status":       data.get("status"),
                                "started_at":   data.get("started_at"),
                                "artifacts":    len(data.get("artifacts", [])),
                            })
                    except Exception:
                        pass
        return {"projects": projects[:limit], "total": len(projects)}

    def _tool_sdlc_memory_search(self, query: str,
                                  memory_type: str = "all",
                                  limit: int = 10) -> Dict:
        self._lazy_init()
        results = self._memory.search(query, limit=limit)
        return {"query": query, "results": results, "count": len(results)}

    def _tool_sdlc_memory_store(self, content: str,
                                 memory_type: str = "semantic",
                                 tags: Optional[List[str]] = None) -> Dict:
        self._lazy_init()
        if memory_type == "semantic":
            self._memory.semantic.store(content, tags=tags or [])
        elif memory_type == "procedural":
            self._memory.procedural.store(content, tags=tags or [])
        return {"stored": True, "memory_type": memory_type}

    def _tool_sdlc_security_scan(self, directory: str,
                                  project_id: Optional[str] = None,
                                  scan_types: Optional[List[str]] = None) -> Dict:
        self._lazy_init()
        pid    = project_id or str(uuid.uuid4())
        report = self._security.full_scan(directory, pid)
        return {
            "scan_id":   report.scan_id,
            "score":     report.score,
            "passed":    report.passed,
            "summary":   report.summary(),
            "findings":  [
                {"id": f.id, "type": f.type, "severity": f.severity.value,
                 "title": f.title, "file": f.file, "line": f.line,
                 "remediation": f.remediation}
                for f in report.findings[:50]
            ],
        }

    def _tool_sdlc_generate_noops_config(self, service_name: str,
                                          language: str = "python",
                                          namespace: str = "default",
                                          replicas: int = 2) -> Dict:
        self._lazy_init()
        files = self._noops.generate_for_service(service_name, language, namespace)
        return {
            "service":   service_name,
            "language":  language,
            "namespace": namespace,
            "files":     files,
            "file_count": len(files),
        }

    def _tool_sdlc_generate_architecture(self, idea: str,
                                          constraints: Optional[Dict] = None) -> Dict:
        self._lazy_init()
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent("architect_agent", llm=self._conductor.llm, memory=self._memory)
        result = agent.run({"idea": idea}, {"idea": idea, **(constraints or {})})
        return {"architecture": result.output, "artifacts": result.artifacts}

    def _tool_sdlc_generate_prd(self, idea: str,
                                  target_users: str = "",
                                  constraints: str = "") -> Dict:
        self._lazy_init()
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent("ba_agent", llm=self._conductor.llm, memory=self._memory)
        result = agent.run(
            {"idea": idea, "target_users": target_users, "constraints": constraints},
            {"idea": idea}
        )
        return {"prd": result.output, "artifacts": result.artifacts}

    def _tool_sdlc_generate_tests(self, code_path: str,
                                   framework: str = "pytest",
                                   coverage_target: int = 80) -> Dict:
        self._lazy_init()
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent("qa_agent", llm=self._conductor.llm, memory=self._memory)
        result = agent.run(
            {"code_path": code_path, "framework": framework, "coverage_target": coverage_target},
            {"code_path": code_path}
        )
        return {"tests": result.output, "artifacts": result.artifacts}

    def _tool_sdlc_generate_cicd(self, platform: str = "github_actions",
                                   services: Optional[List[str]] = None,
                                   registry: str = "",
                                   k8s_cluster: str = "") -> Dict:
        self._lazy_init()
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent("devops_agent", llm=self._conductor.llm, memory=self._memory)
        result = agent.run(
            {"platform": platform, "services": services or [], "registry": registry},
            {"services": services or []}
        )
        return {"cicd": result.output, "artifacts": result.artifacts}

    def _tool_sdlc_deploy_to_k8s(self, services: List[str],
                                   namespace: str = "default",
                                   domain: str = "",
                                   registry: str = "") -> Dict:
        self._lazy_init()
        artifacts = self._security.generate_security_artifacts(services, namespace)
        noops_files = {}
        for svc in services:
            noops_files.update(self._noops.generate_for_service(svc, namespace=namespace))
        return {
            "namespace":       namespace,
            "services":        services,
            "security_files":  list(artifacts.keys()),
            "noops_files":     list(noops_files.keys()),
            "artifacts":       {**artifacts, **noops_files},
        }

    def _tool_sdlc_run_phase(self, project_id: str, phase: str,
                              context: Optional[Dict] = None) -> Dict:
        self._lazy_init()
        from aisdlc.agents.all_agents import create_agent
        phase_agent_map = {
            "ideation":           "ideation_agent",
            "business_analysis":  "ba_agent",
            "architecture":       "architect_agent",
            "ux_design":          "ux_agent",
            "data_engineering":   "data_engineer_agent",
            "security":           "security_agent",
            "engineering":        "engineer_agent",
            "qa":                 "qa_agent",
            "devops":             "devops_agent",
            "self_healing":       "self_healing_agent",
            "chaos":              "chaos_agent",
            "compliance":         "compliance_agent",
            "finops":             "finops_agent",
            "maintenance":        "maintenance_agent",
        }
        agent_type = phase_agent_map.get(phase)
        if not agent_type:
            return {"error": f"Unknown phase: {phase}. Valid: {list(phase_agent_map.keys())}"}
        agent  = create_agent(agent_type, llm=self._conductor.llm, memory=self._memory)
        ctx    = context or {}
        ctx["project_id"] = project_id
        result = agent.run({"idea": ctx.get("idea", "")}, ctx)
        return {
            "phase":     phase,
            "success":   result.success,
            "output":    result.output,
            "artifacts": result.artifacts,
            "errors":    result.errors,
        }

    def _tool_sdlc_health_check(self) -> Dict:
        status: Dict[str, Any] = {
            "status":    "healthy",
            "version":   "2.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {},
        }
        # Check LLM
        try:
            from aisdlc.core.llm_gateway import LLMGateway
            gw = LLMGateway.from_env()
            status["components"]["llm"] = {"status": "ok", "provider": gw.default_provider}
        except Exception as e:
            status["components"]["llm"] = {"status": "error", "error": str(e)}
            status["status"] = "degraded"
        # Check memory
        try:
            from aisdlc.memory.memory_system import MemorySystem
            mem = MemorySystem()
            status["components"]["memory"] = {"status": "ok"}
        except Exception as e:
            status["components"]["memory"] = {"status": "error", "error": str(e)}
        # Check workspace
        workspace = os.getenv("AISDLC_WORKSPACE", "./projects")
        os.makedirs(workspace, exist_ok=True)
        status["components"]["workspace"] = {"status": "ok", "path": workspace}
        return status

    # ── stdio Transport ───────────────────────────────────────────────────────

    def run_stdio(self) -> None:
        """Run the MCP server over stdio (default MCP transport)."""
        log.info("mcp.server.starting", transport="stdio")
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                msg    = json.loads(line)
                result = self.handle_message(msg)
                if result is not None:
                    print(json.dumps(result), flush=True)
            except json.JSONDecodeError as e:
                print(json.dumps(_err(None, MCPError.PARSE_ERROR, str(e))), flush=True)
            except Exception as e:
                log.error("mcp.stdio.error", error=str(e))
                print(json.dumps(_err(None, MCPError.INTERNAL_ERROR, str(e))), flush=True)

    # ── SSE/HTTP Transport ────────────────────────────────────────────────────

    def create_sse_app(self):
        """Create a FastAPI app for SSE transport (HTTP-based MCP)."""
        from fastapi import FastAPI, Request
        from fastapi.responses import JSONResponse, StreamingResponse
        import asyncio

        app = FastAPI(title="AI-SDLC MCP Server", version="2.0.0")

        @app.get("/health")
        async def health():
            return {"status": "ok", "server": "ai-sdlc-mcp", "version": "2.0.0"}

        @app.post("/mcp")
        async def mcp_endpoint(request: Request):
            body   = await request.json()
            result = self.handle_message(body)
            return JSONResponse(result or {})

        @app.get("/mcp/tools")
        async def list_tools():
            return {"tools": MCP_TOOLS}

        return app


# ── Entry Point ───────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI-SDLC MCP Server")
    parser.add_argument("--transport", choices=["stdio", "sse"], default="stdio")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    server = AISdlcMCPServer()

    if args.transport == "stdio":
        server.run_stdio()
    else:
        import uvicorn
        app = server.create_sse_app()
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
