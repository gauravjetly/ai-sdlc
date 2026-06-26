"""
Engineering Depth Agents
=========================
Eight specialized engineering agents that go beyond basic code generation:

  1. DDDAgent              — Domain-Driven Design: bounded contexts, aggregates, domain events
  2. APIContractAgent      — OpenAPI 3.1, GraphQL schema, AsyncAPI event contracts
  3. DBMigrationAgent      — Alembic/Flyway migrations, zero-downtime strategies
  4. EventDrivenAgent      — Kafka/RabbitMQ/EventBridge schemas, consumer groups, DLQs
  5. SDKGeneratorAgent     — Typed client SDKs in Python, TypeScript, Go, Java
  6. CodeReviewAgent       — SOLID principles, complexity, conventions, security
  7. RefactoringAgent      — Code smell detection, technical debt, anti-pattern removal
  8. DependencyUpgradeAgent — CVE monitoring, automated upgrade PRs
"""
from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

from aisdlc.core.base_agent import BaseAgent, AgentResult

log = structlog.get_logger(__name__)


# ── 1. Domain-Driven Design Agent ────────────────────────────────────────────

class DDDAgent(BaseAgent):
    """
    Produces a complete DDD model:
    - Bounded contexts with explicit boundaries
    - Aggregates, entities, value objects
    - Domain events and commands
    - Context map (relationships between bounded contexts)
    - Ubiquitous language glossary
    """

    AGENT_TYPE   = "ddd_agent"
    SYSTEM_PROMPT = """You are a Domain-Driven Design expert with 15+ years building
enterprise systems. You produce precise, implementation-ready DDD models that map
directly to code structure. You always:
- Identify bounded contexts based on business capabilities, NOT technical layers
- Define aggregates that enforce invariants and business rules
- Name domain events in past tense (OrderPlaced, PaymentFailed)
- Build a ubiquitous language that business and engineering share
- Identify context relationships: partnership, customer-supplier, anti-corruption layer
- Ensure aggregates are small, consistent, and transactionally isolated"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        requirements = task.get("requirements", task.get("description", ""))
        domain       = task.get("domain", "")

        prompt = f"""Analyze these requirements and produce a complete DDD model.

Domain: {domain}
Requirements:
{requirements}

Produce:
1. Bounded Contexts (name, responsibility, team ownership)
2. For each context: Aggregates, Entities, Value Objects
3. Domain Events (past tense, with payload schema)
4. Commands (imperative, with validation rules)
5. Context Map (relationships: Partnership/Customer-Supplier/Conformist/ACL/OHS)
6. Ubiquitous Language Glossary (20+ terms)
7. Repository interfaces per aggregate
8. Domain service interfaces for cross-aggregate operations

Respond as JSON with full detail for each section."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        # Generate directory structure
        structure = self._generate_directory_structure(parsed)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {**parsed, "directory_structure": structure},
            artifacts   = self._write_ddd_artifacts(parsed, task.get("workspace", ".")),
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _generate_directory_structure(self, model: Dict) -> str:
        contexts = model.get("bounded_contexts", [])
        lines    = ["src/", "  domain/"]
        for ctx in contexts[:5]:
            name = ctx.get("name", "context").lower().replace(" ", "_")
            lines += [
                f"    {name}/",
                f"      aggregates/",
                f"      entities/",
                f"      value_objects/",
                f"      events/",
                f"      commands/",
                f"      repositories/",
                f"      services/",
            ]
        return "\n".join(lines)

    def _write_ddd_artifacts(self, model: Dict, workspace: str) -> List[str]:
        import os
        artifacts = []
        ddd_dir   = os.path.join(workspace, "docs", "ddd")
        os.makedirs(ddd_dir, exist_ok=True)

        path = os.path.join(ddd_dir, "domain_model.json")
        with open(path, "w") as f:
            json.dump(model, f, indent=2)
        artifacts.append(path)

        # Ubiquitous language as markdown
        glossary = model.get("ubiquitous_language", {})
        if glossary:
            md_path = os.path.join(ddd_dir, "ubiquitous_language.md")
            lines   = ["# Ubiquitous Language Glossary\n"]
            for term, definition in (glossary.items() if isinstance(glossary, dict)
                                     else [(g.get("term",""), g.get("definition",""))
                                           for g in glossary]):
                lines.append(f"## {term}\n{definition}\n")
            with open(md_path, "w") as f:
                f.write("\n".join(lines))
            artifacts.append(md_path)

        return artifacts


# ── 2. API Contract Agent ─────────────────────────────────────────────────────

class APIContractAgent(BaseAgent):
    """
    Contract-first API design:
    - OpenAPI 3.1 specification
    - GraphQL schema (SDL)
    - AsyncAPI 2.6 for event-driven contracts
    - Postman collection
    - Contract test stubs
    """

    AGENT_TYPE    = "api_contract_agent"
    SYSTEM_PROMPT = """You are an API design expert specializing in contract-first development.
You produce precise, versioned API contracts that prevent integration failures.
You always:
- Use OpenAPI 3.1 with full schema definitions and examples
- Design RESTful resources with proper HTTP semantics
- Include authentication, rate limiting, and error response schemas
- Version APIs from day one (/v1/, /v2/)
- Generate AsyncAPI specs for event-driven interfaces
- Include pagination, filtering, and sorting conventions
- Define SLAs (response time, availability) in the contract"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        description   = task.get("description", "")
        ddd_model     = context.get("ddd_model", {})
        service_name  = task.get("service_name", "api")

        prompt = f"""Design a complete API contract for this service.

Service: {service_name}
Description: {description}
DDD Model Context: {json.dumps(ddd_model, default=str)[:1000]}

Produce:
1. OpenAPI 3.1 YAML specification (complete, with all schemas, examples, security)
2. GraphQL SDL schema (if applicable)
3. AsyncAPI spec for any event-driven endpoints
4. API versioning strategy
5. Authentication scheme (JWT/OAuth2/API Key)
6. Rate limiting headers and policies
7. Error response schema (RFC 7807 Problem Details)
8. Pagination convention (cursor-based preferred)
9. Webhook event catalog
10. Breaking change policy

Respond as JSON with each spec as a string field."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_contracts(parsed, task.get("workspace", "."), service_name)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_contracts(self, contracts: Dict, workspace: str, service: str) -> List[str]:
        import os
        arts    = []
        api_dir = os.path.join(workspace, "contracts", service)
        os.makedirs(api_dir, exist_ok=True)

        for key, content in contracts.items():
            if not isinstance(content, str) or not content.strip():
                continue
            ext  = ".yaml" if "openapi" in key.lower() or "asyncapi" in key.lower() else (
                   ".graphql" if "graphql" in key.lower() else ".json")
            path = os.path.join(api_dir, f"{key}{ext}")
            with open(path, "w") as f:
                f.write(content)
            arts.append(path)

        return arts


# ── 3. DB Migration Agent ─────────────────────────────────────────────────────

class DBMigrationAgent(BaseAgent):
    """
    Database migration specialist:
    - Alembic (Python) / Flyway (Java) / Liquibase migration scripts
    - Zero-downtime migration strategies
    - Schema drift detection
    - Rollback plans
    - Data backfill scripts
    """

    AGENT_TYPE    = "db_migration_agent"
    SYSTEM_PROMPT = """You are a database reliability engineer specializing in safe,
zero-downtime schema migrations. You always:
- Use expand-contract pattern for zero-downtime changes
- Never drop columns in the same migration as removing code
- Add indexes CONCURRENTLY to avoid table locks
- Write idempotent migrations (safe to re-run)
- Include rollback scripts for every migration
- Test migrations on a copy of production data first
- Document the business reason for every schema change"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        schema_changes = task.get("schema_changes", task.get("description", ""))
        db_type        = task.get("db_type", "postgresql")
        framework      = task.get("framework", "alembic")
        current_schema = context.get("current_schema", {})

        prompt = f"""Generate complete database migration scripts.

Database: {db_type}
Migration Framework: {framework}
Schema Changes Required: {schema_changes}
Current Schema: {json.dumps(current_schema, default=str)[:1000]}

Produce:
1. Migration script (up) — with zero-downtime strategy
2. Rollback script (down) — complete reversal
3. Data backfill script (if needed)
4. Index creation scripts (CONCURRENTLY)
5. Migration strategy explanation (expand-contract steps)
6. Pre-migration checklist
7. Post-migration validation queries
8. Estimated migration duration and lock impact
9. Monitoring queries to watch during migration

Use {framework} format. Respond as JSON with each script as a string."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_migrations(parsed, task.get("workspace", "."), framework)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_migrations(self, scripts: Dict, workspace: str, framework: str) -> List[str]:
        import os
        arts    = []
        mig_dir = os.path.join(workspace, "migrations")
        os.makedirs(mig_dir, exist_ok=True)
        ts      = str(int(__import__("time").time()))

        ext_map = {"alembic": ".py", "flyway": ".sql", "liquibase": ".xml"}
        ext     = ext_map.get(framework, ".sql")

        for key, content in scripts.items():
            if isinstance(content, str) and content.strip():
                fname = f"{ts}_{key}{ext}"
                path  = os.path.join(mig_dir, fname)
                with open(path, "w") as f:
                    f.write(content)
                arts.append(path)

        return arts


# ── 4. Event-Driven Architecture Agent ───────────────────────────────────────

class EventDrivenAgent(BaseAgent):
    """
    Designs complete event-driven architecture:
    - Kafka/RabbitMQ/EventBridge/Pulsar topic design
    - Event schema registry (Avro/Protobuf/JSON Schema)
    - Consumer group strategies
    - Dead-letter queue (DLQ) handling
    - Saga patterns for distributed transactions
    - Event sourcing and CQRS patterns
    """

    AGENT_TYPE    = "event_driven_agent"
    SYSTEM_PROMPT = """You are an event-driven architecture expert. You design
fault-tolerant, scalable messaging systems. You always:
- Design events as immutable facts in past tense
- Use schema registry to prevent breaking changes
- Design for at-least-once delivery with idempotent consumers
- Implement DLQ with alerting and replay capability
- Use saga pattern for distributed transactions (not 2PC)
- Partition topics by entity ID for ordering guarantees
- Plan for consumer lag monitoring and auto-scaling"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        description  = task.get("description", "")
        broker       = task.get("broker", "kafka")
        ddd_events   = context.get("domain_events", [])

        prompt = f"""Design a complete event-driven architecture.

Message Broker: {broker}
System Description: {description}
Domain Events from DDD: {json.dumps(ddd_events, default=str)[:1000]}

Produce:
1. Topic/Exchange design (name, partitions, retention, replication)
2. Event schema definitions (Avro/JSON Schema for each event type)
3. Producer configurations (acks, retries, idempotence)
4. Consumer group strategies (parallelism, offset management)
5. Dead-letter queue design and replay mechanism
6. Saga choreography patterns for multi-step workflows
7. Schema evolution strategy (backward/forward compatibility)
8. Monitoring: consumer lag alerts, throughput dashboards
9. {broker} configuration YAML/properties
10. Python/TypeScript producer and consumer code templates

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_eda_artifacts(parsed, task.get("workspace", "."), broker)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_eda_artifacts(self, design: Dict, workspace: str, broker: str) -> List[str]:
        import os
        arts    = []
        eda_dir = os.path.join(workspace, "docs", "event-driven")
        os.makedirs(eda_dir, exist_ok=True)

        path = os.path.join(eda_dir, "event_architecture.json")
        with open(path, "w") as f:
            json.dump(design, f, indent=2)
        arts.append(path)

        for key in ["producer_config", "consumer_config", f"{broker}_config"]:
            if key in design and isinstance(design[key], str):
                ext  = ".yaml" if "yaml" in design[key][:20].lower() else ".properties"
                path = os.path.join(eda_dir, f"{key}{ext}")
                with open(path, "w") as f:
                    f.write(design[key])
                arts.append(path)

        return arts


# ── 5. SDK Generator Agent ────────────────────────────────────────────────────

class SDKGeneratorAgent(BaseAgent):
    """
    Generates typed client SDKs from API contracts:
    - Python SDK (with async support, type hints, Pydantic models)
    - TypeScript SDK (with full types, fetch/axios)
    - Go SDK (idiomatic, with context support)
    - Java SDK (with Spring Boot integration)
    """

    AGENT_TYPE    = "sdk_generator_agent"
    SYSTEM_PROMPT = """You are an SDK engineering expert. You generate production-quality
client SDKs that developers love. You always:
- Generate fully typed SDKs with IDE autocompletion support
- Include retry logic with exponential backoff
- Add request/response logging (opt-in)
- Support async/await patterns natively
- Include comprehensive docstrings and examples
- Generate Pydantic/TypeScript interface models from OpenAPI schemas
- Add authentication helpers (token refresh, API key injection)
- Include pagination helpers (auto-iterate pages)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        api_spec    = context.get("openapi_spec", task.get("api_spec", ""))
        service     = task.get("service_name", "api")
        languages   = task.get("languages", ["python", "typescript"])

        sdks    = {}
        total_t = 0
        total_c = 0.0

        for lang in languages:
            prompt = f"""Generate a complete, production-quality {lang} SDK for this API.

Service Name: {service}
API Spec: {str(api_spec)[:2000]}

Requirements:
- Full type safety ({lang}-idiomatic types)
- Async support (async/await)
- Retry with exponential backoff (3 retries, jitter)
- Authentication: Bearer token + API key support
- Pagination helper (auto-iterate all pages)
- Request/response logging (configurable)
- Error classes hierarchy (APIError, AuthError, RateLimitError, etc.)
- Complete README with usage examples
- Unit test stubs

Generate the complete SDK code. Respond as JSON with file paths as keys and code as values."""

            resp    = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                        response_format="json")
            sdks[lang] = resp.get("parsed", {})
            total_t   += resp.get("tokens_used", 0)
            total_c   += resp.get("cost_usd", 0.0)

        arts = self._write_sdks(sdks, task.get("workspace", "."), service)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(sdks),
            output      = {"sdks": list(sdks.keys()), "files_per_sdk":
                           {lang: len(files) for lang, files in sdks.items()}},
            artifacts   = arts,
            tokens_used = total_t,
            cost_usd    = total_c,
        )

    def _write_sdks(self, sdks: Dict, workspace: str, service: str) -> List[str]:
        import os
        arts = []
        for lang, files in sdks.items():
            if not isinstance(files, dict):
                continue
            sdk_dir = os.path.join(workspace, "sdks", lang, service)
            os.makedirs(sdk_dir, exist_ok=True)
            for fname, content in files.items():
                if isinstance(content, str):
                    path = os.path.join(sdk_dir, fname)
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    with open(path, "w") as f:
                        f.write(content)
                    arts.append(path)
        return arts


# ── 6. Code Review Agent ──────────────────────────────────────────────────────

@dataclass
class CodeReviewComment:
    file:       str
    line:       Optional[int]
    severity:   str        # "blocker" | "major" | "minor" | "suggestion"
    category:   str        # "solid" | "security" | "performance" | "style" | "test"
    message:    str
    suggestion: str


@dataclass
class CodeReviewReport:
    review_id:    str
    files_reviewed: int
    blockers:     int
    majors:       int
    minors:       int
    score:        float     # 0-100
    approved:     bool
    comments:     List[CodeReviewComment]
    summary:      str
    praise:       List[str]


class CodeReviewAgent(BaseAgent):
    """
    Reviews code against:
    - SOLID principles
    - Cyclomatic complexity thresholds
    - Security patterns (OWASP Top 10)
    - Test coverage requirements
    - Project conventions
    - Performance anti-patterns
    """

    AGENT_TYPE    = "code_review_agent"
    SYSTEM_PROMPT = """You are a principal engineer conducting a thorough code review.
You are constructive, specific, and educational. You always:
- Check SOLID principles (Single Responsibility, Open/Closed, etc.)
- Flag cyclomatic complexity > 10 as a blocker
- Identify N+1 query patterns, missing indexes, inefficient loops
- Check for missing error handling and edge cases
- Verify test coverage for business logic
- Flag security issues (injection, auth, secrets in code)
- Praise good patterns to reinforce positive behavior
- Provide specific, actionable suggestions with code examples"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        code_files  = task.get("files", {})
        conventions = context.get("conventions", {})
        pr_title    = task.get("pr_title", "Code Review")

        files_str = "\n\n".join(
            f"=== {fname} ===\n{content[:1500]}"
            for fname, content in (code_files.items() if isinstance(code_files, dict)
                                   else [("code", str(code_files))])
        )[:4000]

        prompt = f"""Conduct a thorough code review.

PR Title: {pr_title}
Conventions: {json.dumps(conventions, default=str)[:500]}

Code to Review:
{files_str}

Review against:
1. SOLID principles (flag violations with specific line references)
2. Security (OWASP Top 10, secrets, injection, auth)
3. Performance (N+1, missing indexes, memory leaks, inefficient algorithms)
4. Error handling (missing try/catch, unhandled promises, no logging)
5. Test quality (missing edge cases, no assertions, brittle tests)
6. Code style and readability (naming, complexity, duplication)

For each comment: file, line (if known), severity (blocker/major/minor/suggestion),
category, message, and a specific code suggestion.

Score 0-100. Approve if no blockers and score >= 70.

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        comments = [
            CodeReviewComment(
                file       = c.get("file", "unknown"),
                line       = c.get("line"),
                severity   = c.get("severity", "minor"),
                category   = c.get("category", "style"),
                message    = c.get("message", ""),
                suggestion = c.get("suggestion", ""),
            )
            for c in parsed.get("comments", [])
        ]

        blockers = sum(1 for c in comments if c.severity == "blocker")
        majors   = sum(1 for c in comments if c.severity == "major")
        score    = parsed.get("score", 75.0)

        report = CodeReviewReport(
            review_id      = f"review-{uuid.uuid4().hex[:8]}",
            files_reviewed = len(code_files) if isinstance(code_files, dict) else 1,
            blockers       = blockers,
            majors         = majors,
            minors         = sum(1 for c in comments if c.severity == "minor"),
            score          = score,
            approved       = blockers == 0 and score >= 70,
            comments       = comments,
            summary        = parsed.get("summary", ""),
            praise         = parsed.get("praise", []),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "review_id":  report.review_id,
                "score":      report.score,
                "approved":   report.approved,
                "blockers":   report.blockers,
                "majors":     report.majors,
                "summary":    report.summary,
                "comments":   [c.__dict__ for c in comments],
                "praise":     report.praise,
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 7. Refactoring Agent ──────────────────────────────────────────────────────

class RefactoringAgent(BaseAgent):
    """
    Detects and applies refactoring opportunities:
    - Code smell detection (God class, Feature Envy, Data Clumps, etc.)
    - Extract method/class/interface
    - Replace conditional with polymorphism
    - Introduce design patterns where beneficial
    - Technical debt quantification
    """

    AGENT_TYPE    = "refactoring_agent"
    SYSTEM_PROMPT = """You are a refactoring expert who transforms legacy code into
clean, maintainable code. You always:
- Identify code smells using Martin Fowler's catalog
- Apply the Boy Scout Rule (leave code cleaner than you found it)
- Preserve behavior while improving structure (safe refactoring)
- Introduce design patterns only where they genuinely simplify
- Quantify technical debt in developer-hours
- Prioritize refactoring by ROI (impact vs effort)
- Write the refactored code, not just suggestions"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        code        = task.get("code", task.get("description", ""))
        language    = task.get("language", "python")
        debt_budget = task.get("debt_budget_hours", 40)

        prompt = f"""Analyze this {language} code and produce a complete refactoring plan with implementation.

Code:
{str(code)[:3000]}

Technical Debt Budget: {debt_budget} developer-hours

Produce:
1. Code smell catalog (smell name, location, severity, debt estimate in hours)
2. Refactoring opportunities (prioritized by ROI)
3. Refactored code for the top 3 highest-impact changes
4. Design patterns to introduce (with before/after code)
5. Total technical debt estimate
6. 30/60/90 day refactoring roadmap
7. Metrics to track improvement (complexity, test coverage, duplication %)

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


# ── 8. Dependency Upgrade Agent ───────────────────────────────────────────────

@dataclass
class DependencyVulnerability:
    package:     str
    current:     str
    safe_version: str
    cve_ids:     List[str]
    severity:    str
    description: str
    breaking:    bool


@dataclass
class UpgradePlan:
    plan_id:         str
    vulnerabilities: List[DependencyVulnerability]
    safe_upgrades:   List[Dict[str, str]]
    breaking_upgrades: List[Dict[str, str]]
    migration_notes: Dict[str, str]
    pr_description:  str
    test_commands:   List[str]


class DependencyUpgradeAgent(BaseAgent):
    """
    Monitors and upgrades dependencies:
    - CVE scanning via OSV/NVD databases
    - Safe vs breaking change classification
    - Automated upgrade PR generation
    - Migration guides for breaking changes
    - Compatibility matrix analysis
    """

    AGENT_TYPE    = "dependency_upgrade_agent"
    SYSTEM_PROMPT = """You are a dependency management expert. You keep projects
secure and up-to-date. You always:
- Prioritize security patches (CVEs) over feature upgrades
- Distinguish safe (patch/minor) from breaking (major) upgrades
- Test upgrades in isolation before combining them
- Write migration guides for breaking changes
- Pin transitive dependencies that have known vulnerabilities
- Use lockfiles (poetry.lock, package-lock.json) correctly"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        dependencies = task.get("dependencies", {})
        language     = task.get("language", "python")
        lockfile     = task.get("lockfile", "")

        prompt = f"""Analyze these {language} dependencies and produce a complete upgrade plan.

Current Dependencies:
{json.dumps(dependencies, indent=2)[:2000]}

Lockfile excerpt:
{lockfile[:500]}

Produce:
1. CVE scan results (package, CVE IDs, severity, description)
2. Available upgrades (current → latest, breaking flag)
3. Safe upgrades (can apply immediately, no breaking changes)
4. Breaking upgrades (require code changes, with migration guide)
5. Deprecated packages (need replacement)
6. PR title and description for automated upgrade PR
7. Test commands to verify upgrade safety
8. Updated requirements/package.json content

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        vulns = [
            DependencyVulnerability(
                package      = v.get("package", ""),
                current      = v.get("current", ""),
                safe_version = v.get("safe_version", ""),
                cve_ids      = v.get("cve_ids", []),
                severity     = v.get("severity", "medium"),
                description  = v.get("description", ""),
                breaking     = v.get("breaking", False),
            )
            for v in parsed.get("vulnerabilities", [])
        ]

        plan = UpgradePlan(
            plan_id           = f"upgrade-{uuid.uuid4().hex[:8]}",
            vulnerabilities   = vulns,
            safe_upgrades     = parsed.get("safe_upgrades", []),
            breaking_upgrades = parsed.get("breaking_upgrades", []),
            migration_notes   = parsed.get("migration_notes", {}),
            pr_description    = parsed.get("pr_description", ""),
            test_commands     = parsed.get("test_commands", []),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "plan_id":            plan.plan_id,
                "critical_cves":      sum(1 for v in vulns if v.severity == "critical"),
                "safe_upgrades":      len(plan.safe_upgrades),
                "breaking_upgrades":  len(plan.breaking_upgrades),
                "vulnerabilities":    [v.__dict__ for v in vulns],
                "safe_upgrades_list": plan.safe_upgrades,
                "pr_description":     plan.pr_description,
                "test_commands":      plan.test_commands,
                "updated_deps":       parsed.get("updated_requirements", ""),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )
