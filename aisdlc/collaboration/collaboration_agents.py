"""
Collaboration Agents
=====================
Six agents that handle the human side of software delivery:

  1. PMAgent               — Sprint planning, backlog grooming, velocity tracking
  2. StakeholderAgent      — Automated status reports, executive summaries, demos
  3. DocumentationAgent    — Auto-generated docs (API, architecture, runbooks, ADRs)
  4. ChangelogAgent        — Semantic versioning, CHANGELOG.md, release notes
  5. MultiRepoAgent        — Cross-repository dependency management and coordination
  6. OnboardingAgent       — Developer onboarding guides, environment setup, tutorials
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

from aisdlc.core.base_agent import BaseAgent, AgentResult

log = structlog.get_logger(__name__)


# ── 1. PM Agent ───────────────────────────────────────────────────────────────

@dataclass
class Sprint:
    sprint_id:   str
    number:      int
    goal:        str
    stories:     List[Dict[str, Any]]
    capacity:    int        # story points
    committed:   int
    start_date:  str
    end_date:    str
    risks:       List[str]


class PMAgent(BaseAgent):
    """
    Autonomous project management:
    - Sprint planning from backlog
    - Story point estimation (Planning Poker simulation)
    - Velocity tracking and forecasting
    - Risk identification and mitigation
    - Dependency mapping between stories
    - Jira/Linear ticket creation
    """

    AGENT_TYPE    = "pm_agent"
    SYSTEM_PROMPT = """You are an experienced Agile project manager and Scrum Master.
You run efficient sprints that deliver value. You always:
- Write sprint goals that are outcome-focused (not task-focused)
- Estimate stories using Fibonacci sequence (1,2,3,5,8,13,21)
- Never commit to more than 80% of team velocity (buffer for unknowns)
- Identify dependencies between stories before sprint planning
- Flag stories with unclear acceptance criteria (block them)
- Track velocity trends to improve forecasting accuracy
- Escalate blockers within 24 hours"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        backlog       = task.get("backlog", [])
        team_velocity = task.get("team_velocity", 40)
        sprint_number = task.get("sprint_number", 1)
        team_size     = task.get("team_size", 5)
        sprint_length = task.get("sprint_days", 14)

        prompt = f"""Plan a complete sprint from this backlog.

Team Velocity: {team_velocity} story points
Sprint Number: {sprint_number}
Team Size: {team_size} engineers
Sprint Length: {sprint_length} days
Backlog:
{json.dumps(backlog, default=str, indent=2)[:2000]}

Produce:
1. Sprint goal (one sentence, outcome-focused)
2. Selected stories (prioritized, with estimates, ordered by value/risk)
3. Dependency map (which stories block others)
4. Capacity calculation (team_size × sprint_days × focus_factor)
5. Risk register (what could prevent sprint goal)
6. Definition of Done checklist
7. Daily standup template
8. Sprint review agenda
9. Retrospective format
10. Jira ticket format for each story (title, description, ACs, estimate)

Commit to max 80% of velocity. Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        stories = parsed.get("selected_stories", [])
        sprint  = Sprint(
            sprint_id  = f"sprint-{uuid.uuid4().hex[:8]}",
            number     = sprint_number,
            goal       = parsed.get("sprint_goal", ""),
            stories    = stories,
            capacity   = int(team_velocity * 0.8),
            committed  = sum(s.get("points", 0) for s in stories),
            start_date = parsed.get("start_date", ""),
            end_date   = parsed.get("end_date", ""),
            risks      = parsed.get("risks", []),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "sprint_id":       sprint.sprint_id,
                "sprint_goal":     sprint.goal,
                "committed_points": sprint.committed,
                "capacity":        sprint.capacity,
                "utilization":     f"{sprint.committed/sprint.capacity*100:.0f}%",
                "stories":         sprint.stories,
                "risks":           sprint.risks,
                "dependencies":    parsed.get("dependencies", []),
                "dod_checklist":   parsed.get("dod_checklist", []),
                "jira_tickets":    parsed.get("jira_tickets", []),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 2. Stakeholder Communication Agent ───────────────────────────────────────

class StakeholderAgent(BaseAgent):
    """
    Automated stakeholder communication:
    - Weekly status reports (executive-level)
    - Sprint review presentations
    - Risk escalation communications
    - Demo scripts and talking points
    - Roadmap update emails
    """

    AGENT_TYPE    = "stakeholder_agent"
    SYSTEM_PROMPT = """You are a technical program manager who communicates complex
technical work to non-technical stakeholders. You always:
- Lead with business impact, not technical details
- Use plain language (no jargon without explanation)
- Quantify progress (% complete, velocity, burn-down)
- Be transparent about risks and delays (no surprises)
- Provide clear asks (what decisions or resources are needed)
- Keep executive updates to 1 page maximum
- Use the BLUF format (Bottom Line Up Front)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        report_type  = task.get("report_type", "weekly_status")
        sprint_data  = context.get("sprint_data", task.get("sprint_data", {}))
        audience     = task.get("audience", "executive")
        project_name = task.get("project_name", "Project")

        prompt = f"""Generate a {report_type} communication for {audience} stakeholders.

Project: {project_name}
Report Type: {report_type}
Audience: {audience}
Sprint/Project Data: {json.dumps(sprint_data, default=str, indent=2)[:1500]}

Generate:
1. Executive summary (3 sentences max, BLUF format)
2. Progress this period (what was delivered, with business value)
3. Metrics dashboard (velocity, burn-down, quality metrics)
4. Risks and issues (RAG status: Red/Amber/Green)
5. Next period plan (what will be delivered)
6. Asks/decisions needed from stakeholders
7. Demo highlights (what to show in sprint review)
8. Email subject line and body
9. Slack/Teams message (shorter version)
10. Presentation slide outline (5 slides max)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 3. Documentation Agent ────────────────────────────────────────────────────

class DocumentationAgent(BaseAgent):
    """
    Auto-generates all project documentation:
    - API documentation (from OpenAPI spec)
    - Architecture Decision Records (ADRs)
    - System architecture documentation
    - Operational runbooks
    - Developer guides
    - Onboarding documentation
    """

    AGENT_TYPE    = "documentation_agent"
    SYSTEM_PROMPT = """You are a technical writer who produces documentation that
developers actually read and use. You always:
- Write for the reader's context (beginner vs expert)
- Use examples over abstract descriptions
- Keep docs close to code (docs-as-code)
- Include 'why' not just 'what' and 'how'
- Write ADRs that capture the decision context and alternatives considered
- Generate runbooks with exact commands (no ambiguity)
- Keep docs up-to-date with code changes (automated where possible)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        doc_type     = task.get("doc_type", "all")
        codebase     = context.get("codebase_summary", task.get("description", ""))
        api_spec     = context.get("openapi_spec", "")
        architecture = context.get("architecture", {})
        project_name = task.get("project_name", "Project")

        prompt = f"""Generate comprehensive documentation for this project.

Project: {project_name}
Documentation Type: {doc_type}
Architecture: {json.dumps(architecture, default=str)[:1000]}
API Spec: {str(api_spec)[:500]}
Codebase Summary: {str(codebase)[:500]}

Generate:
1. README.md (project overview, quick start, architecture diagram description)
2. CONTRIBUTING.md (development setup, PR process, coding standards)
3. Architecture Decision Records (3 key ADRs with context, decision, consequences)
4. API Reference documentation (from spec, with examples)
5. System architecture document (components, interactions, data flows)
6. Operational runbook (deployment, scaling, troubleshooting)
7. Developer guide (local setup, testing, debugging)
8. Security guide (authentication, authorization, secrets management)
9. Monitoring guide (dashboards, alerts, on-call procedures)
10. Glossary (domain terms and technical terms)

Respond as JSON with each doc as a markdown string."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_docs(parsed, task.get("workspace", "."))

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {"docs_generated": len(arts)},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_docs(self, docs: Dict, workspace: str) -> List[str]:
        import os
        arts    = []
        doc_dir = os.path.join(workspace, "docs")
        os.makedirs(doc_dir, exist_ok=True)

        filename_map = {
            "readme":        "README.md",
            "contributing":  "CONTRIBUTING.md",
            "architecture":  "docs/ARCHITECTURE.md",
            "api_reference": "docs/API_REFERENCE.md",
            "runbook":       "docs/RUNBOOK.md",
            "developer":     "docs/DEVELOPER_GUIDE.md",
            "security":      "docs/SECURITY.md",
            "monitoring":    "docs/MONITORING.md",
            "glossary":      "docs/GLOSSARY.md",
        }

        for key, content in docs.items():
            if isinstance(content, str) and content.strip():
                fname = filename_map.get(key.lower(), f"docs/{key}.md")
                path  = os.path.join(workspace, fname)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "w") as f:
                    f.write(content)
                arts.append(path)

        # Write ADRs
        adrs = docs.get("adrs", [])
        if isinstance(adrs, list):
            adr_dir = os.path.join(workspace, "docs", "adr")
            os.makedirs(adr_dir, exist_ok=True)
            for i, adr in enumerate(adrs):
                if isinstance(adr, dict):
                    content = f"# ADR-{i+1:04d}: {adr.get('title', '')}\n\n"
                    content += f"**Status:** {adr.get('status', 'Accepted')}\n\n"
                    content += f"## Context\n{adr.get('context', '')}\n\n"
                    content += f"## Decision\n{adr.get('decision', '')}\n\n"
                    content += f"## Consequences\n{adr.get('consequences', '')}\n"
                    path = os.path.join(adr_dir, f"ADR-{i+1:04d}.md")
                    with open(path, "w") as f:
                        f.write(content)
                    arts.append(path)

        return arts


# ── 4. Changelog Agent ────────────────────────────────────────────────────────

class ChangelogAgent(BaseAgent):
    """
    Manages semantic versioning and changelogs:
    - Conventional Commits parsing
    - Semantic version bump determination
    - CHANGELOG.md generation (Keep a Changelog format)
    - GitHub Release notes
    - Migration guides for breaking changes
    """

    AGENT_TYPE    = "changelog_agent"
    SYSTEM_PROMPT = """You are a release engineer. You manage semantic versioning
and communicate changes clearly. You always:
- Use Conventional Commits (feat, fix, chore, docs, refactor, test, perf)
- Apply SemVer rules: breaking=major, feat=minor, fix=patch
- Write changelogs for users (not developers)
- Highlight breaking changes prominently
- Include migration guides for every breaking change
- Group changes by category (Added, Changed, Deprecated, Removed, Fixed, Security)
- Link to relevant issues and PRs"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        commits      = task.get("commits", [])
        current_ver  = task.get("current_version", "1.0.0")
        project_name = task.get("project_name", "Project")

        prompt = f"""Generate a complete release changelog and determine the next version.

Project: {project_name}
Current Version: {current_ver}
Commits since last release:
{json.dumps(commits, default=str, indent=2)[:2000]}

Produce:
1. Next semantic version (based on commit types)
2. CHANGELOG.md entry (Keep a Changelog format)
3. GitHub Release notes (markdown, user-friendly)
4. Breaking changes list (with migration guide for each)
5. Conventional Commits summary (feat count, fix count, breaking count)
6. Release announcement (blog post intro paragraph)
7. Migration guide (if breaking changes exist)
8. Upgrade command (pip install, npm install, etc.)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 5. Multi-Repo Agent ───────────────────────────────────────────────────────

class MultiRepoAgent(BaseAgent):
    """
    Cross-repository coordination:
    - Dependency graph across repositories
    - Coordinated releases (release trains)
    - Breaking change propagation
    - Monorepo vs polyrepo trade-off analysis
    - Shared library version management
    """

    AGENT_TYPE    = "multi_repo_agent"
    SYSTEM_PROMPT = """You are a platform engineering expert managing multi-repository
systems. You coordinate changes across repositories safely. You always:
- Map the full dependency graph before making changes
- Coordinate breaking changes with a release train
- Use semantic versioning for all shared libraries
- Automate dependency updates with Renovate/Dependabot
- Test integration across repositories in CI
- Document the dependency graph for new engineers"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        repositories = task.get("repositories", [])
        change       = task.get("change", task.get("description", ""))
        org          = task.get("org", "")

        prompt = f"""Coordinate a change across multiple repositories.

Organization: {org}
Repositories: {json.dumps(repositories, default=str, indent=2)[:1500]}
Change to Propagate: {change}

Produce:
1. Dependency graph (which repos depend on which)
2. Change impact analysis (which repos are affected)
3. Propagation order (which repos to update first)
4. Coordinated PR plan (PR per repo, with dependencies)
5. Integration test plan (how to test cross-repo compatibility)
6. Release train schedule (coordinated release order)
7. Rollback plan (how to revert across all repos)
8. Renovate/Dependabot configuration for automated updates
9. Shared library versioning strategy
10. Repository topology recommendation (monorepo vs polyrepo analysis)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 6. Developer Onboarding Agent ─────────────────────────────────────────────

class OnboardingAgent(BaseAgent):
    """
    Generates personalized developer onboarding:
    - Environment setup scripts (automated, idempotent)
    - Codebase tour (architecture walkthrough)
    - First-week task plan (graduated complexity)
    - Team conventions guide
    - Troubleshooting FAQ
    - Mentorship pairing suggestions
    """

    AGENT_TYPE    = "onboarding_agent"
    SYSTEM_PROMPT = """You are a developer experience (DX) engineer. You create
onboarding experiences that make new engineers productive in their first week.
You always:
- Automate environment setup (one command to be productive)
- Provide a guided codebase tour (start with the most important files)
- Give a first task that is meaningful but bounded (not trivial, not overwhelming)
- Document all the 'tribal knowledge' that isn't in the codebase
- Create a 30/60/90 day success plan
- Pair new engineers with mentors for their first month"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        project_name  = task.get("project_name", "Project")
        tech_stack    = task.get("tech_stack", [])
        team_size     = task.get("team_size", 10)
        engineer_role = task.get("role", "backend_engineer")
        architecture  = context.get("architecture", {})

        prompt = f"""Generate a complete developer onboarding experience.

Project: {project_name}
Role: {engineer_role}
Tech Stack: {json.dumps(tech_stack, default=str)[:500]}
Team Size: {team_size}
Architecture: {json.dumps(architecture, default=str)[:800]}

Generate:
1. Environment setup script (bash, idempotent, works on macOS and Linux)
2. Day 1 checklist (accounts, tools, introductions)
3. Codebase tour guide (most important files/directories with explanations)
4. Architecture overview (how the system works, in plain language)
5. Team conventions guide (coding style, PR process, communication norms)
6. First week task plan (graduated from simple to complex)
7. 30/60/90 day success criteria
8. Troubleshooting FAQ (top 10 issues new engineers face)
9. Glossary of domain and technical terms
10. Mentorship pairing guide

Respond as JSON with scripts as strings."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_onboarding(parsed, task.get("workspace", "."), project_name)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {"docs_generated": len(arts)},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_onboarding(self, data: Dict, workspace: str, project: str) -> List[str]:
        import os
        arts       = []
        onboard_dir = os.path.join(workspace, "docs", "onboarding")
        os.makedirs(onboard_dir, exist_ok=True)

        if "setup_script" in data and isinstance(data["setup_script"], str):
            path = os.path.join(onboard_dir, "setup.sh")
            with open(path, "w") as f:
                f.write("#!/usr/bin/env bash\nset -euo pipefail\n\n")
                f.write(data["setup_script"])
            import stat
            os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)
            arts.append(path)

        for key in ["day1_checklist", "codebase_tour", "conventions",
                    "first_week_plan", "faq", "glossary"]:
            if key in data and isinstance(data[key], (str, list, dict)):
                content = data[key] if isinstance(data[key], str) else json.dumps(data[key], indent=2)
                path    = os.path.join(onboard_dir, f"{key}.md")
                with open(path, "w") as f:
                    f.write(f"# {key.replace('_', ' ').title()}\n\n{content}")
                arts.append(path)

        return arts
