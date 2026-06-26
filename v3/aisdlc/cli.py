"""
AI-SDLC Command Line Interface
================================
The primary interface for running the AI-SDLC platform from the terminal.

Usage:
  aisdlc run "Build a multi-tenant SaaS CRM"
  aisdlc run "Build a real-time trading platform" --model gpt-4o --provider openai
  aisdlc agent ideation_agent --task '{"idea": "Build a fintech app"}'
  aisdlc security scan ./my-project
  aisdlc memory search "microservices patterns"
  aisdlc mcp start
  aisdlc api start
  aisdlc status proj-abc123
"""
from __future__ import annotations

import json
import os
import sys
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text

console = Console()


def _banner():
    console.print(Panel.fit(
        "[bold cyan]AI-SDLC[/bold cyan] [white]v3.0.0[/white]\n"
        "[dim]Fully Autonomous · Self-Healing · NoOps · Model-Agnostic · 55 MCP Tools[/dim]",
        border_style="cyan"
    ))


@click.group()
@click.version_option("3.0.0", prog_name="aisdlc")
def cli():
    """AI-SDLC: Autonomous AI-powered Software Development Lifecycle Platform."""
    pass


# ── run ───────────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("idea")
@click.option("--project-name", "-n", default=None, help="Project name")
@click.option("--provider", "-p", default=None,
              help="LLM provider: openai, anthropic, google, ollama, openai_compatible")
@click.option("--model", "-m", default=None, help="Model name")
@click.option("--workspace", "-w", default="./projects", help="Workspace directory")
@click.option("--context", "-c", default=None, help="Additional context as JSON string")
@click.option("--phases", default=None, help="Comma-separated phases to run (default: all)")
def run(idea: str, project_name: Optional[str], provider: Optional[str],
        model: Optional[str], workspace: str, context: Optional[str],
        phases: Optional[str]):
    """Run the complete AI-SDLC pipeline for an idea."""
    _banner()

    if provider:
        os.environ["AISDLC_DEFAULT_PROVIDER"] = provider
    if model:
        os.environ["AISDLC_DEFAULT_MODEL"] = model
    os.environ["AISDLC_WORKSPACE"] = workspace

    additional_context = {}
    if context:
        try:
            additional_context = json.loads(context)
        except json.JSONDecodeError:
            console.print("[red]Error: --context must be valid JSON[/red]")
            sys.exit(1)

    console.print(f"\n[bold]Idea:[/bold] {idea}")
    console.print(f"[bold]Provider:[/bold] {provider or os.getenv('AISDLC_DEFAULT_PROVIDER','openai')}")
    console.print(f"[bold]Model:[/bold] {model or os.getenv('AISDLC_DEFAULT_MODEL','gpt-4o')}")
    console.print(f"[bold]Workspace:[/bold] {workspace}\n")

    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.orchestration.conductor import Conductor

        def on_progress(msg: str):
            console.print(f"  {msg}")

        conductor = Conductor(
            llm=LLMGateway.from_env(),
            memory=MemorySystem(),
            workspace_root=workspace,
            on_progress=on_progress,
        )

        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"),
                      console=console) as progress:
            task = progress.add_task("Running SDLC pipeline...", total=None)
            ledger = conductor.run(
                idea=idea,
                project_name=project_name,
                additional_context=additional_context,
            )
            progress.update(task, completed=True)

        # Results table
        table = Table(title="Project Results", show_header=True, header_style="bold cyan")
        table.add_column("Field", style="bold")
        table.add_column("Value")
        table.add_row("Project ID",  ledger.project_id)
        table.add_row("Status",      ledger.status)
        table.add_row("Workspace",   ledger.workspace)
        table.add_row("Artifacts",   str(len(ledger.artifacts)))
        table.add_row("Total Cost",  f"${ledger.total_cost:.4f}")
        table.add_row("Total Tokens", str(ledger.total_tokens))
        table.add_row("Errors",      str(len(ledger.errors)))
        console.print(table)

        if ledger.artifacts:
            console.print("\n[bold]Artifacts:[/bold]")
            for a in ledger.artifacts[:20]:
                console.print(f"  • {a}")
            if len(ledger.artifacts) > 20:
                console.print(f"  ... and {len(ledger.artifacts)-20} more")

        if ledger.errors:
            console.print("\n[bold red]Errors:[/bold red]")
            for e in ledger.errors:
                console.print(f"  [red]• {e}[/red]")

    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]")
        sys.exit(1)


# ── agent ─────────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("agent_type")
@click.option("--task", "-t", required=True, help="Task as JSON string")
@click.option("--context", "-c", default="{}", help="Context as JSON string")
def agent(agent_type: str, task: str, context: str):
    """Run a specific agent on a task."""
    _banner()
    try:
        task_dict    = json.loads(task)
        context_dict = json.loads(context)
    except json.JSONDecodeError as e:
        console.print(f"[red]JSON parse error: {e}[/red]")
        sys.exit(1)

    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.agents.all_agents import create_agent as _create

        a      = _create(agent_type, llm=LLMGateway.from_env(), memory=MemorySystem())
        result = a.run(task_dict, context_dict)

        console.print(f"\n[bold]Agent:[/bold] {agent_type}")
        console.print(f"[bold]Success:[/bold] {'✅' if result.success else '❌'}")
        console.print(f"[bold]Tokens:[/bold] {result.tokens_used}")
        console.print(f"[bold]Cost:[/bold] ${result.cost_usd:.6f}")

        if result.output:
            console.print("\n[bold]Output:[/bold]")
            console.print_json(json.dumps(result.output, default=str))

        if result.artifacts:
            console.print("\n[bold]Artifacts:[/bold]")
            for a_path in result.artifacts:
                console.print(f"  • {a_path}")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)


# ── security ──────────────────────────────────────────────────────────────────

@cli.group()
def security():
    """Security scanning and policy generation."""
    pass


@security.command("scan")
@click.argument("directory")
@click.option("--project-id", default=None)
@click.option("--output", "-o", default=None, help="Output file for report (JSON)")
def security_scan(directory: str, project_id: Optional[str], output: Optional[str]):
    """Run a comprehensive security scan on a directory."""
    _banner()
    try:
        from aisdlc.security.security_engine import SecurityEngine
        import uuid as _uuid

        engine = SecurityEngine()
        pid    = project_id or str(_uuid.uuid4())

        with Progress(SpinnerColumn(), TextColumn("Scanning..."), console=console) as p:
            t = p.add_task("", total=None)
            report = engine.full_scan(directory, pid)
            p.update(t, completed=True)

        # Summary table
        table = Table(title="Security Scan Results", header_style="bold")
        table.add_column("Severity", style="bold")
        table.add_column("Count", justify="right")
        summary = report.summary()
        sev_colors = {"critical": "red", "high": "red", "medium": "yellow",
                      "low": "blue", "info": "dim"}
        for sev, count in summary["by_severity"].items():
            if count > 0:
                table.add_row(f"[{sev_colors[sev]}]{sev.upper()}[/]", str(count))

        console.print(table)
        console.print(f"\n[bold]Score:[/bold] {report.score}/100")
        console.print(f"[bold]Status:[/bold] {'[green]PASSED[/green]' if report.passed else '[red]FAILED[/red]'}")

        if output:
            with open(output, "w") as f:
                json.dump(report.summary(), f, indent=2)
            console.print(f"\nReport saved to: {output}")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)


# ── memory ────────────────────────────────────────────────────────────────────

@cli.group()
def memory():
    """Agent memory management."""
    pass


@memory.command("search")
@click.argument("query")
@click.option("--limit", "-l", default=10)
def memory_search(query: str, limit: int):
    """Search the agent memory."""
    try:
        from aisdlc.memory.memory_system import MemorySystem
        mem     = MemorySystem()
        results = mem.search(query, limit=limit)
        console.print(f"\n[bold]Results for:[/bold] {query}\n")
        for i, r in enumerate(results, 1):
            console.print(f"[bold]{i}.[/bold] {r.get('content','')[:200]}")
            console.print(f"   [dim]Type: {r.get('type','')} | Score: {r.get('score',0):.3f}[/dim]\n")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── mcp ───────────────────────────────────────────────────────────────────────

@cli.group()
def mcp():
    """MCP server management."""
    pass


@mcp.command("start")
@click.option("--transport", default="stdio", type=click.Choice(["stdio", "sse"]))
@click.option("--host", default="0.0.0.0")
@click.option("--port", default=8765, type=int)
def mcp_start(transport: str, host: str, port: int):
    """Start the MCP server."""
    if transport == "sse":
        console.print(f"[bold]Starting MCP server (SSE) on {host}:{port}[/bold]")
    from aisdlc.mcp.server import main as mcp_main
    import sys
    sys.argv = ["mcp", "--transport", transport, "--host", host, "--port", str(port)]
    mcp_main()


# ── api ───────────────────────────────────────────────────────────────────────

@cli.group()
def api():
    """REST API server management."""
    pass


@api.command("start")
@click.option("--host", default="0.0.0.0")
@click.option("--port", default=8000, type=int)
@click.option("--reload", is_flag=True)
def api_start(host: str, port: int, reload: bool):
    """Start the REST API server."""
    console.print(f"[bold]Starting REST API server on {host}:{port}[/bold]")
    import uvicorn
    uvicorn.run("aisdlc.api.server:app", host=host, port=port, reload=reload)


# ── status ────────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("project_id")
@click.option("--workspace", "-w", default="./projects")
def status(project_id: str, workspace: str):
    """Get the status of a project."""
    import os
    lp = os.path.join(workspace, project_id, "project_ledger.json")
    if not os.path.exists(lp):
        console.print(f"[red]Project not found: {project_id}[/red]")
        sys.exit(1)
    with open(lp) as f:
        data = json.load(f)

    table = Table(title=f"Project: {project_id}", header_style="bold cyan")
    table.add_column("Phase")
    table.add_column("Status")
    table.add_column("Artifacts", justify="right")
    for phase in data.get("phases", []):
        status_color = {"completed": "green", "failed": "red",
                        "running": "yellow", "pending": "dim"}.get(phase["status"], "white")
        table.add_row(
            phase["name"],
            f"[{status_color}]{phase['status']}[/]",
            str(len(phase.get("artifacts", []))),
        )
    console.print(table)
    console.print(f"\n[bold]Overall Status:[/bold] {data.get('status')}")
    console.print(f"[bold]Total Artifacts:[/bold] {len(data.get('artifacts', []))}")
    console.print(f"[bold]Total Cost:[/bold] ${data.get('total_cost', 0):.4f}")


# ── noops ─────────────────────────────────────────────────────────────────────

@cli.group()
def noops():
    """NoOps and self-healing configuration generation."""
    pass


@noops.command("generate")
@click.argument("service_name")
@click.option("--language", "-l", default="python",
              type=click.Choice(["python", "node", "go", "java"]))
@click.option("--namespace", "-n", default="default")
@click.option("--output-dir", "-o", default="./noops-output")
def noops_generate(service_name: str, language: str, namespace: str, output_dir: str):
    """Generate NoOps/self-healing configuration for a service."""
    from aisdlc.noops.healing_engine import ResilienceCodeGenerator
    gen   = ResilienceCodeGenerator()
    files = gen.generate_for_service(service_name, language, namespace)
    os.makedirs(output_dir, exist_ok=True)
    for fname, content in files.items():
        fpath = os.path.join(output_dir, fname)
        os.makedirs(os.path.dirname(fpath), exist_ok=True)
        with open(fpath, "w") as f:
            f.write(content)
    console.print(f"[green]Generated {len(files)} files in {output_dir}[/green]")
    for fname in files:
        console.print(f"  • {fname}")


# ── agents (list/info) ───────────────────────────────────────────────────────

@cli.group()
def agents():
    """List and inspect available agents."""
    pass


@agents.command("list")
@click.option("--tags", "-t", default=None, help="Filter by comma-separated tags")
@click.option("--phase", "-p", default=None, help="Filter by SDLC phase")
def agents_list(tags: Optional[str], phase: Optional[str]):
    """List all 50+ available agents."""
    _banner()
    try:
        from aisdlc.core.agent_registry import registry
        tag_list = tags.split(",") if tags else None
        result   = registry.list_agents(tags=tag_list, phase=phase)
        table = Table(title=f"Available Agents ({registry.total_agents} total)", header_style="bold cyan")
        table.add_column("ID", style="bold")
        table.add_column("Name")
        table.add_column("Phase")
        table.add_column("Tags")
        for a in result:
            table.add_row(
                a.get("id", ""),
                a.get("name", ""),
                a.get("phase", ""),
                ", ".join(a.get("tags", [])),
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── templates ─────────────────────────────────────────────────────────────────

@cli.group()
def templates():
    """Project templates management."""
    pass


@templates.command("list")
def templates_list():
    """List all available project templates."""
    _banner()
    try:
        from aisdlc.platform.platform_features import ProjectTemplatesLibrary
        lib = ProjectTemplatesLibrary()
        table = Table(title="Project Templates", header_style="bold cyan")
        table.add_column("ID", style="bold")
        table.add_column("Name")
        table.add_column("Description")
        table.add_column("Tech Stack")
        for t in lib.list_all():
            table.add_row(
                t.template_id,
                t.name,
                t.description[:60] + "..." if len(t.description) > 60 else t.description,
                ", ".join(t.tech_stack[:3]),
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── debate ────────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("question")
@click.option("--options", "-o", default=None, help="Comma-separated options to debate")
@click.option("--rounds", "-r", default=3, type=int)
def debate(question: str, options: Optional[str], rounds: int):
    """Run a multi-agent debate on an architectural decision."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.intelligence.debate_engine import DebateEngine
        opt_list = options.split(",") if options else []
        engine   = DebateEngine(llm_gateway=LLMGateway.from_env())
        with Progress(SpinnerColumn(), TextColumn("Debating..."), console=console) as p:
            t = p.add_task("", total=None)
            result = engine.run({"question": question, "options": opt_list, "rounds": rounds}, {})
            p.update(t, completed=True)
        output = getattr(result, "output", result)
        console.print_json(json.dumps(output, default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── challenge ─────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("design")
def challenge(design: str):
    """Run the adversarial agent to challenge a design."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent("adversarial_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"design": design}, {})
        output = getattr(result, "output", result)
        console.print_json(json.dumps(output, default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── roadmap ───────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("vision")
@click.option("--horizon", "-h", default=12, type=int, help="Months")
@click.option("--output", "-o", default=None, help="Output file")
def roadmap(vision: str, horizon: int, output: Optional[str]):
    """Generate a product roadmap from a vision statement."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.agents.all_agents import create_agent
        agent  = create_agent("long_horizon_planner", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"vision": vision, "horizon": horizon}, {})
        out    = getattr(result, "output", result)
        if output:
            with open(output, "w") as f:
                json.dump(out, f, indent=2, default=str)
            console.print(f"[green]Roadmap saved to {output}[/green]")
        else:
            console.print_json(json.dumps(out, default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── infra ─────────────────────────────────────────────────────────────────────

@cli.group()
def infra():
    """Infrastructure generation commands."""
    pass


@infra.command("terraform")
@click.argument("description")
@click.option("--cloud", "-c", default="aws", type=click.Choice(["aws", "gcp", "azure", "multi"]))
@click.option("--output-dir", "-o", default="./infra-output")
def infra_terraform(description: str, cloud: str, output_dir: str):
    """Generate Terraform/Pulumi IaC for cloud deployments."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.infrastructure.infra_agents import create_agent
        agent  = create_agent("terraform_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"description": description, "cloud": cloud}, {})
        out    = getattr(result, "output", result)
        os.makedirs(output_dir, exist_ok=True)
        if isinstance(out, dict) and "files" in out:
            for fname, content in out["files"].items():
                fpath = os.path.join(output_dir, fname)
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, "w") as f:
                    f.write(content)
            console.print(f"[green]Generated {len(out['files'])} IaC files in {output_dir}[/green]")
        else:
            console.print_json(json.dumps(out, default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


@infra.command("gitops")
@click.argument("description")
@click.option("--tool", "-t", default="argocd", type=click.Choice(["argocd", "flux"]))
def infra_gitops(description: str, tool: str):
    """Configure ArgoCD/Flux GitOps pipelines."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.infrastructure.infra_agents import create_agent
        agent  = create_agent("gitops_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"description": description, "tool": tool}, {})
        console.print_json(json.dumps(getattr(result, "output", result), default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── observe ───────────────────────────────────────────────────────────────────

@cli.group()
def observe():
    """Observability and SLO management."""
    pass


@observe.command("instrument")
@click.argument("description")
@click.option("--language", "-l", default="python")
@click.option("--output-dir", "-o", default="./otel-output")
def observe_instrument(description: str, language: str, output_dir: str):
    """Generate OpenTelemetry instrumentation code."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.observability.observability_suite import create_agent
        agent  = create_agent("otel_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"description": description, "language": language}, {})
        out    = getattr(result, "output", result)
        os.makedirs(output_dir, exist_ok=True)
        if isinstance(out, dict) and "files" in out:
            for fname, content in out["files"].items():
                with open(os.path.join(output_dir, fname), "w") as f:
                    f.write(content)
            console.print(f"[green]Generated OTel instrumentation in {output_dir}[/green]")
        else:
            console.print_json(json.dumps(out, default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


@observe.command("slo")
@click.argument("description")
@click.option("--services", "-s", default=None, help="Comma-separated service names")
def observe_slo(description: str, services: Optional[str]):
    """Define SLOs with error budgets and burn rate alerts."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.observability.observability_suite import create_agent
        svc_list = services.split(",") if services else []
        agent    = create_agent("slo_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result   = agent.run({"description": description, "services": svc_list}, {})
        console.print_json(json.dumps(getattr(result, "output", result), default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── docs ──────────────────────────────────────────────────────────────────────

@cli.group()
def docs():
    """Documentation generation commands."""
    pass


@docs.command("generate")
@click.argument("description")
@click.option("--output-dir", "-o", default="./docs-output")
def docs_generate(description: str, output_dir: str):
    """Auto-generate all project documentation."""
    _banner()
    try:
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.collaboration.collaboration_agents import create_agent
        agent  = create_agent("documentation_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"description": description}, {})
        out    = getattr(result, "output", result)
        os.makedirs(output_dir, exist_ok=True)
        if isinstance(out, dict) and "files" in out:
            for fname, content in out["files"].items():
                fpath = os.path.join(output_dir, fname)
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, "w") as f:
                    f.write(content)
            console.print(f"[green]Generated docs in {output_dir}[/green]")
        else:
            console.print_json(json.dumps(out, default=str))
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


@docs.command("changelog")
@click.option("--since", "-s", default="HEAD~10", help="Git ref to generate changelog from")
@click.option("--version", "-v", default="1.0.0")
def docs_changelog(since: str, version: str):
    """Generate CHANGELOG.md from git commits."""
    _banner()
    try:
        import subprocess
        result = subprocess.run(
            ["git", "log", since + "..HEAD", "--oneline", "--no-merges"],
            capture_output=True, text=True
        )
        commits = [{"message": line} for line in result.stdout.strip().split("\n") if line]
        from aisdlc.core.llm_gateway import LLMGateway
        from aisdlc.memory.memory_system import MemorySystem
        from aisdlc.collaboration.collaboration_agents import create_agent
        agent  = create_agent("changelog_agent", llm=LLMGateway.from_env(), memory=MemorySystem())
        result = agent.run({"commits": commits, "current_version": version}, {})
        out    = getattr(result, "output", result)
        changelog = out.get("changelog", json.dumps(out, default=str))
        with open("CHANGELOG.md", "w") as f:
            f.write(changelog)
        console.print("[green]CHANGELOG.md generated.[/green]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    cli()


if __name__ == "__main__":
    main()
