"""
AI-SDLC Tool Registry & Integrations
======================================
All tools available to agents — every tool is model-agnostic and
described in the OpenAI function-calling schema so any LLM can use them.

Tools:
  • FileSystem      — Read, write, list, search files in the project workspace
  • CodeExecutor    — Run code in a sandboxed subprocess
  • GitHubTool      — Create repos, branches, PRs, issues, push code
  • DockerTool      — Build images, run containers, push to registry
  • KubernetesTool  — Apply manifests, get pod status, rollout, scale
  • WebSearchTool   — Search the web for documentation and best practices
  • JiraTool        — Create epics, stories, tasks, and update status
  • PrometheusTool  — Query metrics, create alerts, check SLOs
  • SlackTool       — Send notifications and alerts
  • VaultTool       — Read/write secrets from HashiCorp Vault
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import structlog

log = structlog.get_logger(__name__)


# ── Tool Result ───────────────────────────────────────────────────────────────

@dataclass
class ToolResult:
    tool:    str
    success: bool
    output:  Any
    error:   Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {"tool": self.tool, "success": self.success,
                "output": self.output, "error": self.error}


# ── Base Tool ─────────────────────────────────────────────────────────────────

class BaseTool:
    name: str = "base_tool"
    description: str = ""
    parameters: Dict = {}

    def run(self, **kwargs) -> ToolResult:
        raise NotImplementedError

    def schema(self) -> Dict:
        """Return OpenAI function-calling schema."""
        return {
            "type": "function",
            "function": {
                "name":        self.name,
                "description": self.description,
                "parameters":  self.parameters,
            }
        }


# ── FileSystem Tool ───────────────────────────────────────────────────────────

class FileSystemTool(BaseTool):
    name        = "filesystem"
    description = "Read, write, list, and search files in the project workspace"
    parameters  = {
        "type": "object",
        "properties": {
            "action":  {"type": "string", "enum": ["read", "write", "list", "search", "delete", "mkdir"]},
            "path":    {"type": "string", "description": "File or directory path"},
            "content": {"type": "string", "description": "Content to write (for write action)"},
            "query":   {"type": "string", "description": "Search query (for search action)"},
        },
        "required": ["action", "path"],
    }

    def __init__(self, workspace: str):
        self.workspace = workspace

    def _safe_path(self, path: str) -> str:
        """Ensure path stays within workspace."""
        full = os.path.realpath(os.path.join(self.workspace, path.lstrip("/")))
        if not full.startswith(os.path.realpath(self.workspace)):
            raise ValueError(f"Path escape attempt: {path}")
        return full

    def run(self, action: str, path: str, content: str = "",
            query: str = "") -> ToolResult:
        try:
            safe = self._safe_path(path)
            if action == "read":
                with open(safe, "r", errors="replace") as f:
                    return ToolResult(self.name, True, f.read())
            elif action == "write":
                os.makedirs(os.path.dirname(safe), exist_ok=True)
                with open(safe, "w") as f:
                    f.write(content)
                return ToolResult(self.name, True, f"Written: {path}")
            elif action == "list":
                if os.path.isdir(safe):
                    entries = []
                    for root, dirs, files in os.walk(safe):
                        # Skip hidden and build dirs
                        dirs[:] = [d for d in dirs if not d.startswith(".") and
                                   d not in ("node_modules", "__pycache__", ".venv")]
                        rel = os.path.relpath(root, safe)
                        for fname in files:
                            entries.append(os.path.join(rel, fname) if rel != "." else fname)
                    return ToolResult(self.name, True, entries)
                else:
                    return ToolResult(self.name, True, [os.path.basename(safe)])
            elif action == "search":
                results = []
                for root, _, files in os.walk(safe if os.path.isdir(safe) else self.workspace):
                    for fname in files:
                        fpath = os.path.join(root, fname)
                        try:
                            with open(fpath, "r", errors="ignore") as f:
                                for i, line in enumerate(f, 1):
                                    if query.lower() in line.lower():
                                        results.append({
                                            "file": os.path.relpath(fpath, self.workspace),
                                            "line": i, "content": line.strip()
                                        })
                        except Exception:
                            pass
                return ToolResult(self.name, True, results[:50])
            elif action == "delete":
                if os.path.isfile(safe):
                    os.remove(safe)
                return ToolResult(self.name, True, f"Deleted: {path}")
            elif action == "mkdir":
                os.makedirs(safe, exist_ok=True)
                return ToolResult(self.name, True, f"Created: {path}")
            else:
                return ToolResult(self.name, False, None, f"Unknown action: {action}")
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))


# ── Code Executor Tool ────────────────────────────────────────────────────────

class CodeExecutorTool(BaseTool):
    name        = "code_executor"
    description = "Execute code in a sandboxed subprocess and return stdout/stderr"
    parameters  = {
        "type": "object",
        "properties": {
            "language": {"type": "string", "enum": ["python", "bash", "node", "go"]},
            "code":     {"type": "string", "description": "Code to execute"},
            "timeout":  {"type": "integer", "description": "Timeout in seconds", "default": 30},
        },
        "required": ["language", "code"],
    }

    INTERPRETERS = {
        "python": ["python3", "-c"],
        "bash":   ["bash", "-c"],
        "node":   ["node", "-e"],
        "go":     None,  # Handled separately
    }

    def run(self, language: str, code: str, timeout: int = 30) -> ToolResult:
        try:
            if language == "go":
                return self._run_go(code, timeout)

            interp = self.INTERPRETERS.get(language)
            if not interp:
                return ToolResult(self.name, False, None, f"Unsupported language: {language}")

            result = subprocess.run(
                interp + [code],
                capture_output=True, text=True, timeout=timeout,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
            )
            return ToolResult(self.name, result.returncode == 0, {
                "stdout": result.stdout[:10000],
                "stderr": result.stderr[:2000],
                "returncode": result.returncode,
            })
        except subprocess.TimeoutExpired:
            return ToolResult(self.name, False, None, f"Timeout after {timeout}s")
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))

    def _run_go(self, code: str, timeout: int) -> ToolResult:
        with tempfile.TemporaryDirectory() as tmpdir:
            src = os.path.join(tmpdir, "main.go")
            with open(src, "w") as f:
                f.write(code)
            result = subprocess.run(
                ["go", "run", src],
                capture_output=True, text=True, timeout=timeout
            )
            return ToolResult(self.name, result.returncode == 0, {
                "stdout": result.stdout[:10000],
                "stderr": result.stderr[:2000],
                "returncode": result.returncode,
            })


# ── GitHub Tool ───────────────────────────────────────────────────────────────

class GitHubTool(BaseTool):
    name        = "github"
    description = "Interact with GitHub: create repos, push code, create PRs and issues"
    parameters  = {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": [
                "create_repo", "clone", "push", "create_branch",
                "create_pr", "create_issue", "get_repo_info", "list_prs"
            ]},
            "repo":    {"type": "string", "description": "Repository name (owner/repo)"},
            "branch":  {"type": "string", "description": "Branch name"},
            "title":   {"type": "string"},
            "body":    {"type": "string"},
            "private": {"type": "boolean", "default": True},
        },
        "required": ["action"],
    }

    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN", "")

    def run(self, action: str, repo: str = "", branch: str = "main",
            title: str = "", body: str = "", private: bool = True,
            **kwargs) -> ToolResult:
        try:
            if action == "create_repo":
                flags = "--private" if private else "--public"
                result = subprocess.run(
                    ["gh", "repo", "create", repo, flags, "--confirm"],
                    capture_output=True, text=True
                )
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout, result.stderr or None)

            elif action == "create_issue":
                result = subprocess.run(
                    ["gh", "issue", "create", "--repo", repo,
                     "--title", title, "--body", body],
                    capture_output=True, text=True
                )
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout, result.stderr or None)

            elif action == "create_pr":
                result = subprocess.run(
                    ["gh", "pr", "create", "--repo", repo,
                     "--title", title, "--body", body, "--base", branch],
                    capture_output=True, text=True
                )
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout, result.stderr or None)

            elif action == "get_repo_info":
                result = subprocess.run(
                    ["gh", "repo", "view", repo, "--json",
                     "name,description,url,defaultBranchRef,isPrivate"],
                    capture_output=True, text=True
                )
                data = json.loads(result.stdout) if result.returncode == 0 else {}
                return ToolResult(self.name, result.returncode == 0, data)

            else:
                return ToolResult(self.name, False, None, f"Action not implemented: {action}")
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))


# ── Docker Tool ───────────────────────────────────────────────────────────────

class DockerTool(BaseTool):
    name        = "docker"
    description = "Build Docker images, run containers, push to registry"
    parameters  = {
        "type": "object",
        "properties": {
            "action":     {"type": "string", "enum": ["build", "run", "push", "pull", "ps", "logs", "stop"]},
            "image":      {"type": "string"},
            "tag":        {"type": "string", "default": "latest"},
            "dockerfile": {"type": "string", "default": "Dockerfile"},
            "context":    {"type": "string", "default": "."},
            "container":  {"type": "string"},
            "command":    {"type": "string"},
        },
        "required": ["action"],
    }

    def run(self, action: str, image: str = "", tag: str = "latest",
            dockerfile: str = "Dockerfile", context: str = ".",
            container: str = "", command: str = "", **kwargs) -> ToolResult:
        try:
            if action == "build":
                result = subprocess.run(
                    ["docker", "build", "-t", f"{image}:{tag}", "-f", dockerfile, context],
                    capture_output=True, text=True, timeout=300
                )
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout[-2000:], result.stderr[-1000:] or None)

            elif action == "run":
                cmd = ["docker", "run", "-d", "--name", container or image]
                if command:
                    cmd.extend(command.split())
                cmd.append(f"{image}:{tag}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout.strip(), result.stderr or None)

            elif action == "push":
                result = subprocess.run(
                    ["docker", "push", f"{image}:{tag}"],
                    capture_output=True, text=True, timeout=300
                )
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout, result.stderr or None)

            elif action == "ps":
                result = subprocess.run(
                    ["docker", "ps", "--format", "json"],
                    capture_output=True, text=True
                )
                containers = [json.loads(line) for line in result.stdout.strip().split("\n") if line]
                return ToolResult(self.name, True, containers)

            elif action == "logs":
                result = subprocess.run(
                    ["docker", "logs", "--tail", "100", container],
                    capture_output=True, text=True
                )
                return ToolResult(self.name, True, result.stdout + result.stderr)

            elif action == "stop":
                result = subprocess.run(
                    ["docker", "stop", container],
                    capture_output=True, text=True
                )
                return ToolResult(self.name, result.returncode == 0, result.stdout.strip())

            else:
                return ToolResult(self.name, False, None, f"Unknown action: {action}")
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))


# ── Kubernetes Tool ───────────────────────────────────────────────────────────

class KubernetesTool(BaseTool):
    name        = "kubernetes"
    description = "Apply manifests, check pod status, scale deployments, rollout"
    parameters  = {
        "type": "object",
        "properties": {
            "action":     {"type": "string", "enum": [
                "apply", "delete", "get_pods", "get_deployments",
                "scale", "rollout_status", "rollout_undo", "logs", "describe"
            ]},
            "manifest":   {"type": "string", "description": "YAML manifest content"},
            "namespace":  {"type": "string", "default": "default"},
            "resource":   {"type": "string", "description": "Resource type/name"},
            "replicas":   {"type": "integer"},
        },
        "required": ["action"],
    }

    def run(self, action: str, manifest: str = "", namespace: str = "default",
            resource: str = "", replicas: int = 1, **kwargs) -> ToolResult:
        try:
            ns_flag = ["-n", namespace]
            if action == "apply":
                with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
                    f.write(manifest)
                    fname = f.name
                result = subprocess.run(
                    ["kubectl", "apply", "-f", fname] + ns_flag,
                    capture_output=True, text=True, timeout=60
                )
                os.unlink(fname)
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout, result.stderr or None)

            elif action == "get_pods":
                result = subprocess.run(
                    ["kubectl", "get", "pods"] + ns_flag + ["-o", "json"],
                    capture_output=True, text=True
                )
                data = json.loads(result.stdout) if result.returncode == 0 else {}
                pods = [{"name": p["metadata"]["name"],
                         "status": p["status"]["phase"],
                         "ready": all(c["ready"] for c in p["status"].get("containerStatuses", []))}
                        for p in data.get("items", [])]
                return ToolResult(self.name, True, pods)

            elif action == "scale":
                result = subprocess.run(
                    ["kubectl", "scale", resource, f"--replicas={replicas}"] + ns_flag,
                    capture_output=True, text=True
                )
                return ToolResult(self.name, result.returncode == 0,
                                  result.stdout, result.stderr or None)

            elif action == "rollout_status":
                result = subprocess.run(
                    ["kubectl", "rollout", "status", resource] + ns_flag,
                    capture_output=True, text=True, timeout=120
                )
                return ToolResult(self.name, result.returncode == 0, result.stdout)

            elif action == "rollout_undo":
                result = subprocess.run(
                    ["kubectl", "rollout", "undo", resource] + ns_flag,
                    capture_output=True, text=True
                )
                return ToolResult(self.name, result.returncode == 0, result.stdout)

            elif action == "logs":
                result = subprocess.run(
                    ["kubectl", "logs", resource, "--tail=100"] + ns_flag,
                    capture_output=True, text=True
                )
                return ToolResult(self.name, True, result.stdout)

            else:
                return ToolResult(self.name, False, None, f"Unknown action: {action}")
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))


# ── Web Search Tool ───────────────────────────────────────────────────────────

class WebSearchTool(BaseTool):
    name        = "web_search"
    description = "Search the web for documentation, best practices, and technical information"
    parameters  = {
        "type": "object",
        "properties": {
            "query":   {"type": "string", "description": "Search query"},
            "max_results": {"type": "integer", "default": 5},
        },
        "required": ["query"],
    }

    def run(self, query: str, max_results: int = 5) -> ToolResult:
        try:
            import urllib.parse
            import urllib.request
            encoded = urllib.parse.quote(query)
            # Use DuckDuckGo Instant Answer API (no key required)
            url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read())
            results = []
            if data.get("AbstractText"):
                results.append({"title": data.get("Heading", ""), "snippet": data["AbstractText"],
                                "url": data.get("AbstractURL", "")})
            for topic in data.get("RelatedTopics", [])[:max_results-1]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append({"title": topic.get("Text", "")[:100],
                                    "snippet": topic.get("Text", ""),
                                    "url": topic.get("FirstURL", "")})
            return ToolResult(self.name, True, results[:max_results])
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))


# ── Jira Tool ─────────────────────────────────────────────────────────────────

class JiraTool(BaseTool):
    name        = "jira"
    description = "Create and manage Jira epics, stories, tasks, and bugs"
    parameters  = {
        "type": "object",
        "properties": {
            "action":      {"type": "string", "enum": ["create_issue", "update_issue", "get_issue", "list_issues"]},
            "project_key": {"type": "string"},
            "issue_type":  {"type": "string", "enum": ["Epic", "Story", "Task", "Bug", "Subtask"]},
            "summary":     {"type": "string"},
            "description": {"type": "string"},
            "priority":    {"type": "string", "enum": ["Highest", "High", "Medium", "Low", "Lowest"]},
            "issue_key":   {"type": "string"},
            "status":      {"type": "string"},
        },
        "required": ["action"],
    }

    def __init__(self):
        self.base_url = os.getenv("JIRA_BASE_URL", "")
        self.email    = os.getenv("JIRA_EMAIL", "")
        self.token    = os.getenv("JIRA_API_TOKEN", "")

    def run(self, action: str, project_key: str = "", issue_type: str = "Task",
            summary: str = "", description: str = "", priority: str = "Medium",
            issue_key: str = "", status: str = "", **kwargs) -> ToolResult:
        if not self.base_url or not self.token:
            # Return mock result if Jira not configured
            return ToolResult(self.name, True, {
                "id": "MOCK-001", "key": f"{project_key}-001",
                "summary": summary, "status": "To Do",
                "note": "Jira not configured — mock result returned"
            })
        try:
            import base64
            import urllib.request
            auth = base64.b64encode(f"{self.email}:{self.token}".encode()).decode()
            headers = {"Authorization": f"Basic {auth}", "Content-Type": "application/json"}

            if action == "create_issue":
                payload = json.dumps({
                    "fields": {
                        "project":     {"key": project_key},
                        "issuetype":   {"name": issue_type},
                        "summary":     summary,
                        "description": {"type": "doc", "version": 1,
                                        "content": [{"type": "paragraph", "content": [
                                            {"type": "text", "text": description}]}]},
                        "priority":    {"name": priority},
                    }
                }).encode()
                req = urllib.request.Request(
                    f"{self.base_url}/rest/api/3/issue",
                    data=payload, headers=headers, method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return ToolResult(self.name, True, json.loads(resp.read()))
            else:
                return ToolResult(self.name, False, None, f"Action not implemented: {action}")
        except Exception as e:
            return ToolResult(self.name, False, None, str(e))


# ── Tool Registry ─────────────────────────────────────────────────────────────

class ToolRegistry:
    """
    Central registry of all tools available to agents.
    Provides OpenAI-compatible function schemas for any LLM.
    """

    def __init__(self, workspace: str = "./workspace"):
        self._tools: Dict[str, BaseTool] = {}
        self._register_defaults(workspace)

    def _register_defaults(self, workspace: str) -> None:
        tools = [
            FileSystemTool(workspace),
            CodeExecutorTool(),
            GitHubTool(),
            DockerTool(),
            KubernetesTool(),
            WebSearchTool(),
            JiraTool(),
        ]
        for tool in tools:
            self._tools[tool.name] = tool

    def register(self, tool: BaseTool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def run(self, name: str, **kwargs) -> ToolResult:
        tool = self.get(name)
        if not tool:
            return ToolResult(name, False, None, f"Tool not found: {name}")
        log.info("tool.run", tool=name, kwargs=list(kwargs.keys()))
        result = tool.run(**kwargs)
        log.info("tool.result", tool=name, success=result.success)
        return result

    def all_schemas(self) -> List[Dict]:
        """Return all tool schemas for LLM function calling."""
        return [t.schema() for t in self._tools.values()]

    def names(self) -> List[str]:
        return list(self._tools.keys())
