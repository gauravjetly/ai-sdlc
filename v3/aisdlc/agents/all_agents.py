"""
AI-SDLC — All 15 Autonomous SDLC Agents
=========================================
Each agent is a fully autonomous specialist that:
  • Has a rich, detailed system prompt encoding deep domain expertise
  • Defines its own tool set for autonomous action
  • Bakes NoOps / self-healing / security into every artifact it produces
  • Records its work to episodic memory for self-learning
  • Can be used standalone or orchestrated by the Conductor

Agents:
  1.  IdeationAgent          — Idea refinement, feasibility, market analysis
  2.  BusinessAnalystAgent   — Requirements, user stories, acceptance criteria
  3.  ArchitectAgent         — System design, ADRs, tech stack selection
  4.  UXDesignAgent          — UX/UI specs, wireframes, accessibility
  5.  EngineerAgent          — Code generation (any language/framework)
  6.  DataEngineerAgent      — Data models, pipelines, migrations
  7.  QAAgent                — Test plans, test code, coverage analysis
  8.  SecurityAgent          — Threat modeling, SAST, secrets scan, policies
  9.  DevOpsAgent            — CI/CD, Docker, K8s manifests, IaC
  10. SelfHealingAgent       — Health monitors, auto-remediation, circuit breakers
  11. ChaosEngineerAgent     — Chaos probes, resilience tests, failure injection
  12. ComplianceAgent        — GDPR, SOC2, HIPAA, PCI-DSS compliance
  13. FinOpsAgent            — Cost estimation, optimization, budget alerts
  14. MaintenanceAgent       — Dependency updates, refactoring, tech debt
  15. ConductorAgent         — Orchestrates all agents end-to-end
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from aisdlc.core.base_agent import AgentResult, BaseAgent
from aisdlc.core.llm_gateway import LLMGateway, Message, Role, Tool


# ── Shared tool definitions ───────────────────────────────────────────────────

def _file_write_tool() -> Tool:
    return Tool("write_file", "Write content to a file in the project workspace",
        {"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},
         "required":["path","content"]})

def _file_read_tool() -> Tool:
    return Tool("read_file", "Read a file from the project workspace",
        {"type":"object","properties":{"path":{"type":"string"}},"required":["path"]})

def _run_command_tool() -> Tool:
    return Tool("run_command", "Execute a shell command in the project sandbox",
        {"type":"object","properties":{"command":{"type":"string"},"cwd":{"type":"string"}},
         "required":["command"]})

def _search_web_tool() -> Tool:
    return Tool("search_web", "Search the web for technical information",
        {"type":"object","properties":{"query":{"type":"string"},"max_results":{"type":"integer","default":5}},
         "required":["query"]})

def _github_tool() -> Tool:
    return Tool("github_action", "Perform GitHub operations (create repo, PR, issue, branch)",
        {"type":"object","properties":{"action":{"type":"string","enum":["create_repo","create_pr","create_issue","create_branch","commit_files"]},"params":{"type":"object"}},
         "required":["action","params"]})

def _memory_store_tool() -> Tool:
    return Tool("store_knowledge", "Store a reusable fact or pattern in semantic memory",
        {"type":"object","properties":{"topic":{"type":"string"},"content":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}},
         "required":["topic","content"]})


# ═══════════════════════════════════════════════════════════════════════════════
# 1. IDEATION AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class IdeationAgent(BaseAgent):
    AGENT_TYPE    = "ideation_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Ideation Agent — an expert product strategist, market analyst, and innovation consultant.

YOUR MISSION: Transform raw ideas into fully validated, actionable product visions ready for engineering.

CAPABILITIES:
- Analyze any idea for technical feasibility, market fit, and competitive landscape
- Identify the core value proposition and target user segments
- Define the MVP scope vs. full product vision
- Estimate high-level effort and complexity
- Identify risks, assumptions, and unknowns
- Produce a structured Product Vision Document (PVD)

NOOPS MINDSET: Every product you define must be designed for autonomous operation from day one.
Flag any feature that would require manual human intervention and suggest autonomous alternatives.

OUTPUT FORMAT: Always produce a structured JSON document with:
{
  "product_name": "...",
  "vision_statement": "...",
  "problem_statement": "...",
  "target_users": [...],
  "value_proposition": "...",
  "mvp_features": [...],
  "full_product_features": [...],
  "technical_feasibility": "high|medium|low",
  "market_opportunity": "...",
  "competitive_landscape": [...],
  "risks": [...],
  "assumptions": [...],
  "success_metrics": [...],
  "estimated_complexity": "small|medium|large|xlarge",
  "recommended_tech_approach": "...",
  "noops_considerations": [...]
}
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_search_web_tool(), _memory_store_tool(), _file_write_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        idea = task.get("idea", task.get("description", ""))
        project_id = context.get("project_id", "unknown")

        prompt = f"""
Analyze this product idea and produce a complete Product Vision Document (PVD).

IDEA: {idea}

ADDITIONAL CONTEXT: {json.dumps(context.get("additional_context", {}), indent=2)}

Produce a comprehensive PVD as a JSON object. Be specific, actionable, and realistic.
Include NoOps considerations — how can this product operate with zero human intervention?
"""
        resp = self.think_with_tools(prompt, context=f"product ideation for: {idea}")

        try:
            # Extract JSON from response
            content = resp.content
            start = content.find("{"); end = content.rfind("}") + 1
            pvd = json.loads(content[start:end]) if start >= 0 else {"raw": content}
        except Exception:
            pvd = {"raw": resp.content}

        # Write PVD to workspace
        workspace = context.get("workspace", f"./projects/{project_id}")
        pvd_path = f"{workspace}/01_ideation/product_vision.json"
        os.makedirs(os.path.dirname(pvd_path), exist_ok=True)
        with open(pvd_path, "w") as f:
            json.dump(pvd, f, indent=2)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=pvd, artifacts=[pvd_path],
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. BUSINESS ANALYST AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class BusinessAnalystAgent(BaseAgent):
    AGENT_TYPE    = "ba_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Business Analyst Agent — an expert requirements engineer and product owner.

YOUR MISSION: Transform product visions into precise, testable, developer-ready requirements.

CAPABILITIES:
- Write comprehensive Epics, User Stories, and Acceptance Criteria (Given/When/Then)
- Define functional and non-functional requirements (NFRs)
- Create data flow diagrams and process flows (as Mermaid diagrams)
- Define API contracts (OpenAPI 3.0 format)
- Identify edge cases, error scenarios, and boundary conditions
- Define SLOs/SLAs for every critical user journey
- Map requirements to business value and priority (MoSCoW)

NOOPS REQUIREMENTS: Every feature must include:
- Automated health check requirements
- Self-healing behavior specifications
- Observability requirements (metrics, logs, traces)
- Auto-scaling trigger conditions
- Graceful degradation behavior

OUTPUT: Produce a structured PRD (Product Requirements Document) in JSON/Markdown.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _file_read_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        pvd = context.get("product_vision", task.get("product_vision", {}))
        project_id = context.get("project_id", "unknown")
        workspace = context.get("workspace", f"./projects/{project_id}")

        prompt = f"""
Based on this Product Vision Document, create a comprehensive Product Requirements Document (PRD).

PRODUCT VISION:
{json.dumps(pvd, indent=2)}

Create a complete PRD with:
1. Executive Summary
2. User Personas (3-5 detailed personas)
3. Epics and User Stories (with Given/When/Then acceptance criteria)
4. Functional Requirements (numbered, testable)
5. Non-Functional Requirements:
   - Performance: response times, throughput
   - Availability: SLO targets (e.g., 99.9%)
   - Security: auth, encryption, compliance
   - Scalability: expected load, growth projections
6. NoOps Requirements for each feature:
   - Health check specifications
   - Self-healing behaviors
   - Observability requirements
7. API Contract outline (REST endpoints)
8. Data Requirements
9. Integration Requirements
10. Out of Scope

Return as a structured JSON document.
"""
        resp = self.think(prompt, context=f"requirements for {pvd.get('product_name','product')}")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            prd = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            prd = {"raw": resp, "product_name": pvd.get("product_name", "unknown")}

        prd_path = f"{workspace}/02_requirements/prd.json"
        os.makedirs(os.path.dirname(prd_path), exist_ok=True)
        with open(prd_path, "w") as f:
            json.dump(prd, f, indent=2)

        # Also write a human-readable markdown version
        md_path = f"{workspace}/02_requirements/prd.md"
        with open(md_path, "w") as f:
            f.write(f"# Product Requirements Document\n\n```json\n{json.dumps(prd, indent=2)}\n```")

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=prd, artifacts=[prd_path, md_path],
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ARCHITECT AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class ArchitectAgent(BaseAgent):
    AGENT_TYPE    = "architect_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Architect Agent — a principal solutions architect with deep expertise in
distributed systems, cloud-native architecture, and enterprise software design.

YOUR MISSION: Design production-grade, NoOps-ready system architectures.

EXPERTISE:
- Microservices, event-driven, CQRS, event sourcing, hexagonal architecture
- Cloud-native: Kubernetes, service mesh (Istio/Linkerd), serverless
- Data architecture: OLTP, OLAP, streaming (Kafka/Pulsar), caching strategies
- Security architecture: zero-trust, mTLS, OAuth2/OIDC, secrets management
- Observability: OpenTelemetry, Prometheus, Grafana, distributed tracing

NOOPS ARCHITECTURE PRINCIPLES (mandatory in every design):
1. Every service has liveness/readiness/startup health probes
2. Circuit breakers on all external dependencies
3. Bulkhead pattern to isolate resource pools
4. Retry with exponential back-off and jitter
5. Graceful degradation and fallback strategies
6. Distributed tracing with W3C trace context propagation
7. Structured JSON logging with correlation IDs
8. Auto-scaling policies (HPA + VPA + KEDA)
9. Zero-downtime deployment (blue-green or canary)
10. Chaos engineering hooks in every service

OUTPUT: Architecture Decision Records (ADRs), C4 diagrams (Mermaid), service catalog,
API gateway config, data flow diagrams, and infrastructure topology.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _search_web_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        prd = context.get("prd", task.get("prd", {}))
        pvd = context.get("product_vision", {})
        project_id = context.get("project_id", "unknown")
        workspace = context.get("workspace", f"./projects/{project_id}")

        product_name = pvd.get("product_name") or prd.get("product_name", "the system")

        prompt = f"""
Design a complete, production-grade, NoOps-ready system architecture for:

PRODUCT: {product_name}

REQUIREMENTS SUMMARY:
{json.dumps(prd, indent=2)[:3000]}

Produce a comprehensive Architecture Document with:

1. ARCHITECTURE OVERVIEW
   - Chosen architectural pattern and justification
   - Key architectural decisions (ADRs)
   - Technology stack with justification

2. SERVICE CATALOG
   For each service:
   - Name, responsibility, technology
   - API endpoints (REST/gRPC/GraphQL)
   - Data stores owned
   - Events published/consumed
   - External dependencies
   - NoOps specs: health endpoints, circuit breakers, retry policy, scaling policy

3. DATA ARCHITECTURE
   - Data models (key entities and relationships)
   - Database technology choices with justification
   - Caching strategy
   - Data flow diagram (Mermaid)

4. INFRASTRUCTURE ARCHITECTURE
   - Kubernetes namespace layout
   - Service mesh configuration
   - Ingress/API gateway setup
   - Secrets management approach
   - Monitoring stack

5. SECURITY ARCHITECTURE
   - Authentication/authorization model
   - Service-to-service security (mTLS)
   - Secrets rotation strategy
   - Network policies

6. NOOPS ARCHITECTURE
   - Self-healing topology
   - Auto-scaling configuration
   - Chaos engineering plan
   - Observability stack

7. C4 CONTEXT DIAGRAM (Mermaid)
8. C4 CONTAINER DIAGRAM (Mermaid)

Return as a structured JSON document with all sections.
"""
        resp = self.think(prompt, context=f"architecture for {product_name}")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            arch = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            arch = {"raw": resp}

        arch_path = f"{workspace}/03_architecture/architecture.json"
        os.makedirs(os.path.dirname(arch_path), exist_ok=True)
        with open(arch_path, "w") as f:
            json.dump(arch, f, indent=2)

        # Write Mermaid diagrams if present
        artifacts = [arch_path]
        if isinstance(arch, dict):
            for key in ["c4_context_diagram", "c4_container_diagram", "data_flow_diagram"]:
                if key in arch and arch[key]:
                    diag_path = f"{workspace}/03_architecture/{key}.mmd"
                    with open(diag_path, "w") as f:
                        f.write(arch[key])
                    artifacts.append(diag_path)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=arch, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 4. UX DESIGN AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class UXDesignAgent(BaseAgent):
    AGENT_TYPE    = "ux_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC UX Design Agent — a senior UX/UI designer and accessibility expert.

YOUR MISSION: Design intuitive, accessible, and production-ready user experiences.

CAPABILITIES:
- Create detailed wireframe specifications (text-based, implementable)
- Define component libraries and design systems
- Write interaction specifications and user flows
- Ensure WCAG 2.1 AA accessibility compliance
- Define responsive breakpoints and mobile-first layouts
- Create error states, loading states, and empty states
- Define micro-interactions and animation specs

NOOPS UX PRINCIPLES:
- Every UI must show real-time system health indicators
- Graceful degradation: define what users see when services are down
- Offline-first: specify what works without connectivity
- Auto-retry indicators: show users when operations are being retried
- Progressive loading: skeleton screens, optimistic updates

OUTPUT: UX specification document with wireframe descriptions, component specs,
user flows (Mermaid), and accessibility checklist.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        prd = context.get("prd", task.get("prd", {}))
        arch = context.get("architecture", {})
        project_id = context.get("project_id", "unknown")
        workspace = context.get("workspace", f"./projects/{project_id}")

        prompt = f"""
Create a comprehensive UX specification for this product.

REQUIREMENTS: {json.dumps(prd, indent=2)[:2000]}
ARCHITECTURE: {json.dumps(arch, indent=2)[:1000]}

Produce a UX Specification Document with:
1. Design System (colors, typography, spacing, components)
2. User Flows (Mermaid diagrams for key journeys)
3. Screen Specifications (for each major screen/view)
4. Component Library (reusable UI components with props)
5. Responsive Design Specs (mobile/tablet/desktop breakpoints)
6. Accessibility Requirements (WCAG 2.1 AA checklist)
7. Error States and Loading States for every async operation
8. NoOps UX: system health indicators, degraded mode UX
9. API Integration Points (what data each screen needs)

Return as structured JSON.
"""
        resp = self.think(prompt, context="UX design")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            ux_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            ux_spec = {"raw": resp}

        ux_path = f"{workspace}/04_ux_design/ux_specification.json"
        os.makedirs(os.path.dirname(ux_path), exist_ok=True)
        with open(ux_path, "w") as f:
            json.dump(ux_spec, f, indent=2)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=ux_spec, artifacts=[ux_path],
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 5. ENGINEER AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class EngineerAgent(BaseAgent):
    AGENT_TYPE    = "engineer_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Engineer Agent — a principal software engineer with mastery of all major
languages, frameworks, and engineering best practices.

YOUR MISSION: Generate production-grade, NoOps-ready code for any software system.

LANGUAGES & FRAMEWORKS: Python, TypeScript/JavaScript, Go, Java, Rust, C#, Ruby, PHP,
React, Next.js, Vue, Angular, FastAPI, Django, Express, NestJS, Spring Boot, .NET, and more.

CODE QUALITY STANDARDS (non-negotiable):
- Every function has type annotations and docstrings
- Every module has comprehensive error handling (no bare except)
- Every external call has timeout, retry, and circuit breaker
- Every secret comes from environment variables or Vault — never hardcoded
- Every service exposes /health/live, /health/ready, /health/startup
- Structured logging (JSON) with trace_id on every log line
- OpenTelemetry instrumentation on every service
- Graceful shutdown handling (SIGTERM/SIGINT)
- Input validation on every API endpoint
- SQL injection prevention (parameterized queries always)
- XSS prevention (output encoding, CSP headers)

NOOPS CODE PATTERNS (bake into every service):
```python
# Circuit breaker
from tenacity import retry, stop_after_attempt, wait_exponential
@retry(stop=stop_after_attempt(5), wait=wait_exponential(min=1, max=30))

# Health endpoint
@app.get("/health/live")
async def liveness(): return {"status": "ok", "service": SERVICE_NAME}

# Graceful shutdown
signal.signal(signal.SIGTERM, lambda s, f: shutdown_event.set())

# Structured logging
logger.info("operation.complete", trace_id=trace_id, duration_ms=duration)
```

OUTPUT: Complete, runnable source code files with tests.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _file_read_tool(), _run_command_tool(),
                _memory_store_tool(), _search_web_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        prd  = context.get("prd", {})
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        service    = task.get("service", "main_service")
        language   = task.get("language", "python")

        prompt = f"""
Generate complete, production-grade, NoOps-ready source code for: {service}

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
REQUIREMENTS: {json.dumps(prd, indent=2)[:1000]}
LANGUAGE/FRAMEWORK: {language}
SERVICE SPEC: {json.dumps(task.get("service_spec", {}), indent=2)}

Generate:
1. Complete service code with all endpoints
2. Data models / schemas
3. Business logic layer
4. Repository/data access layer
5. Health check endpoints (/health/live, /health/ready, /health/startup)
6. OpenTelemetry instrumentation
7. Structured logging setup
8. Circuit breaker on all external calls
9. Graceful shutdown handler
10. Configuration management (env vars + validation)
11. Dockerfile (multi-stage, non-root user, minimal image)
12. Requirements/dependencies file

For each file, return:
{{
  "files": [
    {{"path": "relative/path/file.py", "content": "...full content..."}},
    ...
  ],
  "run_instructions": "how to run locally",
  "env_vars": [{{"name": "VAR", "description": "...", "required": true}}]
}}
"""
        resp = self.think(prompt, context=f"code generation for {service}")

        artifacts = []
        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            result_data = json.loads(resp[start:end]) if start >= 0 else {}
            files = result_data.get("files", [])
            for file_spec in files:
                fpath = f"{workspace}/05_code/{service}/{file_spec['path']}"
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fpath)
        except Exception as e:
            # Fallback: write raw response
            raw_path = f"{workspace}/05_code/{service}/generated_code.txt"
            os.makedirs(os.path.dirname(raw_path), exist_ok=True)
            with open(raw_path, "w") as f:
                f.write(resp)
            artifacts.append(raw_path)
            result_data = {"raw": resp}

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=result_data, artifacts=artifacts,
            metadata={"project_id": project_id, "service": service}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 6. DATA ENGINEER AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class DataEngineerAgent(BaseAgent):
    AGENT_TYPE    = "data_engineer_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Data Engineer Agent — an expert in data modeling, database design,
data pipelines, and data platform engineering.

YOUR MISSION: Design and implement production-grade, self-healing data infrastructure.

EXPERTISE:
- Relational databases: PostgreSQL, MySQL, SQL Server, Oracle
- NoSQL: MongoDB, DynamoDB, Cassandra, Redis
- Data warehouses: Snowflake, BigQuery, Redshift, Databricks
- Streaming: Apache Kafka, Pulsar, Kinesis
- ETL/ELT: dbt, Airflow, Spark, Flink
- Migrations: Alembic, Flyway, Liquibase

NOOPS DATA PRINCIPLES:
- All migrations are idempotent and reversible
- Connection pooling configured for every service
- Read replicas for all read-heavy workloads
- Automated failover with < 30s RTO
- PITR backups with 1-hour RPO
- Query timeout enforcement (no runaway queries)
- Automated index analysis and optimization
- Data quality checks in every pipeline
- Schema evolution without downtime (expand-contract pattern)

OUTPUT: ERD (Mermaid), migration scripts, seed data, pipeline code, backup config.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        prd  = context.get("prd", {})
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")

        prompt = f"""
Design and generate complete data infrastructure for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
REQUIREMENTS: {json.dumps(prd, indent=2)[:1000]}

Generate:
1. Entity-Relationship Diagram (Mermaid erDiagram)
2. Database schema (CREATE TABLE statements with indexes, constraints, comments)
3. Migration scripts (numbered, reversible, idempotent)
4. Seed/fixture data for development
5. Connection pool configuration
6. Database health check queries
7. Backup and recovery configuration
8. Data pipeline code (if applicable)
9. Redis/cache configuration with TTL policies
10. Database monitoring queries (slow query detection, index usage)

Return as structured JSON with file contents.
"""
        resp = self.think(prompt, context="data engineering")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            data_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            data_spec = {"raw": resp}

        data_path = f"{workspace}/06_data/data_architecture.json"
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        with open(data_path, "w") as f:
            json.dump(data_spec, f, indent=2)

        artifacts = [data_path]
        if isinstance(data_spec, dict):
            for key in ["erd_diagram", "schema_sql", "migrations"]:
                if key in data_spec:
                    ext = ".mmd" if "diagram" in key else ".sql"
                    p = f"{workspace}/06_data/{key}{ext}"
                    with open(p, "w") as f:
                        content = data_spec[key]
                        f.write(content if isinstance(content, str) else json.dumps(content, indent=2))
                    artifacts.append(p)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=data_spec, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 7. QA AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class QAAgent(BaseAgent):
    AGENT_TYPE    = "qa_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC QA Agent — an expert in test engineering, quality assurance,
and autonomous testing systems.

YOUR MISSION: Design and implement comprehensive, self-running test suites.

TESTING PYRAMID:
- Unit tests: 70% — fast, isolated, no external dependencies
- Integration tests: 20% — test service boundaries and DB interactions
- E2E tests: 10% — critical user journeys only

NOOPS TESTING PRINCIPLES:
- All tests run autonomously in CI/CD — zero manual intervention
- Flaky test detection and auto-quarantine
- Test coverage gates: minimum 80% line coverage, 70% branch coverage
- Performance regression tests on every PR (p95 latency must not increase > 10%)
- Security regression tests (OWASP ZAP scan on every deploy)
- Contract tests for all service-to-service APIs (Pact)
- Mutation testing for critical business logic
- Chaos tests in staging environment

TEST FRAMEWORKS: pytest, Jest, JUnit, Go test, RSpec, NUnit, Playwright, Cypress,
k6 (load testing), Gatling, Pact (contract testing), Testcontainers.

OUTPUT: Test plan, test code, CI/CD test pipeline config, coverage reports.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _file_read_tool(), _run_command_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        code_artifacts = context.get("code_artifacts", [])
        arch = context.get("architecture", {})
        prd  = context.get("prd", {})
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        service    = task.get("service", "main_service")

        prompt = f"""
Generate a comprehensive, autonomous test suite for: {service}

ARCHITECTURE: {json.dumps(arch, indent=2)[:1500]}
REQUIREMENTS: {json.dumps(prd, indent=2)[:1000]}
CODE ARTIFACTS: {code_artifacts[:10]}

Generate:
1. Unit tests (pytest/Jest) — test every function, mock all dependencies
2. Integration tests — test DB interactions with Testcontainers
3. API tests — test every endpoint (happy path + error cases)
4. Performance tests (k6 script) — load test critical endpoints
5. Contract tests (Pact) — for service-to-service APIs
6. E2E tests (Playwright) — critical user journeys
7. Security tests — OWASP Top 10 checks
8. Test configuration (pytest.ini / jest.config.js)
9. CI/CD test pipeline (GitHub Actions workflow)
10. Coverage configuration with 80% minimum gate

Return as structured JSON with file contents.
"""
        resp = self.think(prompt, context=f"test generation for {service}")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            test_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            test_spec = {"raw": resp}

        test_path = f"{workspace}/07_tests/{service}/test_spec.json"
        os.makedirs(os.path.dirname(test_path), exist_ok=True)
        with open(test_path, "w") as f:
            json.dump(test_spec, f, indent=2)

        artifacts = [test_path]
        if isinstance(test_spec, dict) and "files" in test_spec:
            for file_spec in test_spec.get("files", []):
                fp = f"{workspace}/07_tests/{service}/{file_spec['path']}"
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fp)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=test_spec, artifacts=artifacts,
            metadata={"project_id": project_id, "service": service}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 8. SECURITY AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class SecurityAgent(BaseAgent):
    AGENT_TYPE    = "security_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Security Agent — a principal application security engineer and
threat modeling expert with deep knowledge of offensive and defensive security.

YOUR MISSION: Ensure every system is secure by design, secure by default, and
autonomously self-defending.

SECURITY DOMAINS:
- Application security: OWASP Top 10, SANS Top 25, injection prevention
- Infrastructure security: network policies, pod security, RBAC
- Identity & access: OAuth2/OIDC, JWT, mTLS, zero-trust
- Secrets management: Vault, AWS Secrets Manager, K8s Secrets
- Supply chain security: SBOM, dependency scanning, image signing
- Runtime security: Falco, OPA/Gatekeeper, admission controllers
- Compliance: SOC2, ISO 27001, GDPR, HIPAA, PCI-DSS

NOOPS SECURITY (autonomous security operations):
- Automated secret rotation (every 90 days)
- Continuous vulnerability scanning (Trivy, Snyk, Dependabot)
- Runtime anomaly detection with auto-isolation
- Automated security patching pipeline
- SIEM integration with auto-response playbooks
- Certificate auto-renewal (cert-manager)
- Automated penetration testing in staging

THREAT MODEL: Use STRIDE methodology for every service.

OUTPUT: Threat model, security policies, network policies, RBAC config,
secrets config, security test scripts, compliance checklist.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _run_command_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        prd  = context.get("prd", {})
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        code_path  = task.get("code_path", f"{workspace}/05_code")

        prompt = f"""
Perform a comprehensive security analysis and generate security artifacts for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
REQUIREMENTS: {json.dumps(prd, indent=2)[:1000]}

Generate:
1. STRIDE Threat Model (for each service: Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation)
2. Security Requirements (derived from threat model)
3. Kubernetes Network Policies (deny-all default, allow only required)
4. Kubernetes RBAC (least-privilege roles and bindings)
5. Pod Security Standards (restricted profile)
6. Secrets Management Config (Vault policies or K8s secret specs)
7. mTLS Configuration (Istio PeerAuthentication + DestinationRule)
8. OPA/Gatekeeper Policies (prevent privileged containers, require resource limits)
9. Security Headers (CSP, HSTS, X-Frame-Options, etc.)
10. Automated Security Scanning Pipeline (GitHub Actions with Trivy + Snyk + OWASP ZAP)
11. Incident Response Runbook
12. Security Compliance Checklist (SOC2 Type II controls)

Return as structured JSON with all file contents.
"""
        resp = self.think(prompt, context="security analysis")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            sec_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            sec_spec = {"raw": resp}

        sec_path = f"{workspace}/08_security/security_spec.json"
        os.makedirs(os.path.dirname(sec_path), exist_ok=True)
        with open(sec_path, "w") as f:
            json.dump(sec_spec, f, indent=2)

        artifacts = [sec_path]
        if isinstance(sec_spec, dict) and "files" in sec_spec:
            for file_spec in sec_spec.get("files", []):
                fp = f"{workspace}/08_security/{file_spec['path']}"
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fp)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=sec_spec, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 9. DEVOPS / SRE AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class DevOpsAgent(BaseAgent):
    AGENT_TYPE    = "devops_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC DevOps/SRE Agent — a principal DevOps engineer and Site Reliability
Engineer with expertise in cloud-native infrastructure and NoOps automation.

YOUR MISSION: Build fully automated, self-managing infrastructure and deployment pipelines.

EXPERTISE:
- CI/CD: GitHub Actions, GitLab CI, Jenkins, Tekton, ArgoCD, Flux
- Containers: Docker (multi-stage, distroless, non-root), Podman
- Kubernetes: Helm, Kustomize, Operators, CRDs, admission webhooks
- IaC: Terraform, Pulumi, CDK, Crossplane
- Cloud: AWS, GCP, Azure (cloud-agnostic by default)
- Observability: Prometheus, Grafana, Loki, Tempo, Jaeger, OpenTelemetry
- Service Mesh: Istio, Linkerd, Cilium

NOOPS DEVOPS PRINCIPLES:
- GitOps: all changes via PR, ArgoCD/Flux auto-syncs to cluster
- Immutable infrastructure: never patch, always replace
- Progressive delivery: canary + feature flags (OpenFeature)
- Automated rollback: triggered by error rate > 1% or p95 > SLO
- Self-healing deployments: Kubernetes restarts, HPA, VPA
- Zero-downtime deployments: PodDisruptionBudget, rolling updates
- Automated certificate management: cert-manager with Let's Encrypt
- Automated secret rotation: External Secrets Operator + Vault

OUTPUT: Dockerfiles, K8s manifests, Helm charts, CI/CD pipelines,
Terraform modules, monitoring dashboards (Grafana JSON), alerting rules.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _run_command_tool(), _github_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        services   = task.get("services", arch.get("service_catalog", []))

        prompt = f"""
Generate complete DevOps/SRE infrastructure for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
SERVICES: {json.dumps(services, indent=2)[:1000]}
PROJECT: {project_id}

Generate ALL of the following:

1. DOCKER
   - Multi-stage Dockerfile for each service (distroless final image, non-root user)
   - docker-compose.yml for local development
   - .dockerignore

2. KUBERNETES MANIFESTS (for each service):
   - Deployment (with resource limits, liveness/readiness/startup probes, anti-affinity)
   - Service (ClusterIP + optional LoadBalancer)
   - HorizontalPodAutoscaler (CPU 70%, Memory 80%)
   - PodDisruptionBudget (minAvailable: 1)
   - ConfigMap + Secret (External Secrets Operator)
   - NetworkPolicy (deny-all + allow required)

3. HELM CHART
   - Chart.yaml, values.yaml, templates/

4. CI/CD PIPELINE (GitHub Actions):
   - build.yml: lint, test, build image, push to registry, sign with cosign
   - deploy-staging.yml: deploy to staging, run smoke tests
   - deploy-prod.yml: canary deploy, monitor, auto-rollback
   - security-scan.yml: Trivy, Snyk, OWASP ZAP

5. MONITORING
   - Prometheus rules (alerting on SLO breach, error rate, latency)
   - Grafana dashboard JSON (service overview, SLO dashboard)
   - Loki log aggregation config
   - OpenTelemetry collector config

6. INFRASTRUCTURE AS CODE (Terraform)
   - VPC, subnets, security groups
   - EKS/GKE/AKS cluster
   - RDS with Multi-AZ, automated backups
   - ElastiCache/Memorystore
   - S3/GCS for artifacts

Return as structured JSON with all file contents.
"""
        resp = self.think(prompt, context="devops infrastructure generation")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            devops_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            devops_spec = {"raw": resp}

        devops_path = f"{workspace}/09_devops/devops_spec.json"
        os.makedirs(os.path.dirname(devops_path), exist_ok=True)
        with open(devops_path, "w") as f:
            json.dump(devops_spec, f, indent=2)

        artifacts = [devops_path]
        if isinstance(devops_spec, dict) and "files" in devops_spec:
            for file_spec in devops_spec.get("files", []):
                fp = f"{workspace}/09_devops/{file_spec['path']}"
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fp)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=devops_spec, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 10. SELF-HEALING AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class SelfHealingAgent(BaseAgent):
    AGENT_TYPE    = "self_healing_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Self-Healing Agent — the autonomous operations brain that ensures
every system runs itself with zero human intervention.

YOUR MISSION: Design and implement self-healing capabilities for every service.

SELF-HEALING PATTERNS:
1. Health-based restart: Kubernetes liveness probe triggers pod restart
2. Circuit breaker: stop calling failing dependencies, return cached/default response
3. Retry with back-off: automatically retry transient failures
4. Bulkhead: isolate failures to prevent cascade
5. Fallback: return degraded but functional response when primary fails
6. Cache-aside: serve stale cache when origin is down
7. Queue-based leveling: buffer requests during overload
8. Saga pattern: compensating transactions for distributed failures
9. Idempotency: safe to retry any operation
10. Timeout: never wait forever, always have a deadline

AUTONOMOUS REMEDIATION PLAYBOOKS:
- High CPU: profile → scale → rate-limit → alert
- Memory leak: heap dump → restart → analyze → patch
- DB connection exhaustion: pool drain → restart → tune pool size
- Disk full: log rotation → archive → alert → expand volume
- Certificate expiry: auto-renew via cert-manager → alert if fails
- Dependency down: circuit open → serve fallback → retry probe → alert

OUTPUT: Self-healing code (health monitors, remediation scripts, Kubernetes operators),
runbooks, alerting rules, and autonomous response playbooks.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        services = task.get("services", [])
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        language   = task.get("language", "python")

        prompt = f"""
Generate comprehensive self-healing infrastructure for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
SERVICES: {json.dumps(services, indent=2)[:500]}
LANGUAGE: {language}

Generate ALL self-healing components:

1. HEALTH MONITOR SERVICE
   - Continuous health check loop for all services
   - Prometheus metrics collection
   - Anomaly detection (statistical: 3-sigma rule)
   - Alert routing and escalation

2. REMEDIATION ENGINE
   - Pluggable remediation actions
   - Playbook executor
   - Dry-run mode for safety
   - Audit log of all autonomous actions

3. CIRCUIT BREAKER LIBRARY (in {language})
   - State machine: CLOSED → OPEN → HALF-OPEN
   - Configurable thresholds
   - Metrics integration
   - Fallback function support

4. RETRY DECORATOR (in {language})
   - Exponential back-off with jitter
   - Configurable max attempts
   - Idempotency key support
   - Dead letter queue integration

5. KUBERNETES OPERATOR (Python/Go)
   - Custom Resource: SelfHealingPolicy
   - Controller: watches deployments, applies healing policies
   - Automatic rollback on SLO breach

6. REMEDIATION PLAYBOOKS (YAML)
   - high_cpu.yaml
   - memory_leak.yaml
   - db_connection_exhaustion.yaml
   - service_unavailable.yaml
   - disk_full.yaml
   - certificate_expiry.yaml

7. ALERTMANAGER ROUTES
   - Route alerts to remediation engine
   - Escalation: auto-fix → notify → page

Return as structured JSON with all file contents.
"""
        resp = self.think(prompt, context="self-healing system design")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            healing_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            healing_spec = {"raw": resp}

        healing_path = f"{workspace}/10_self_healing/healing_spec.json"
        os.makedirs(os.path.dirname(healing_path), exist_ok=True)
        with open(healing_path, "w") as f:
            json.dump(healing_spec, f, indent=2)

        artifacts = [healing_path]
        if isinstance(healing_spec, dict) and "files" in healing_spec:
            for file_spec in healing_spec.get("files", []):
                fp = f"{workspace}/10_self_healing/{file_spec['path']}"
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fp)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=healing_spec, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 11. CHAOS ENGINEER AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class ChaosEngineerAgent(BaseAgent):
    AGENT_TYPE    = "chaos_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Chaos Engineer Agent — an expert in resilience testing and
chaos engineering using the principles of the Netflix Chaos Monkey and Google DiRT.

YOUR MISSION: Validate that every system survives failure through systematic chaos experiments.

CHAOS EXPERIMENT TYPES:
1. Pod/process kill: random service termination
2. Network partition: block traffic between services
3. Network degradation: add latency (50-500ms), packet loss (10-50%)
4. Resource exhaustion: CPU spike, memory pressure, disk fill
5. Dependency failure: kill databases, caches, message brokers
6. Clock skew: advance/rewind system time
7. DNS failure: break service discovery
8. Certificate expiry: simulate expired TLS certs
9. Slow consumer: back-pressure in message queues
10. Cascading failure: kill multiple services simultaneously

CHAOS ENGINEERING PRINCIPLES (Chaos Monkey Principles):
- Start in staging, graduate to production
- Define steady state before running experiments
- Vary real-world events
- Run experiments in production (with safeguards)
- Automate experiments to run continuously

TOOLS: Chaos Mesh, LitmusChaos, Gremlin, Toxiproxy, tc (traffic control), stress-ng.

OUTPUT: Chaos experiment definitions (YAML), test scripts, steady-state hypotheses,
automated chaos pipeline, resilience scorecard.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        services = task.get("services", [])
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")

        prompt = f"""
Design a comprehensive chaos engineering program for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
SERVICES: {json.dumps(services, indent=2)[:500]}

Generate:
1. STEADY STATE HYPOTHESES
   - Define what "normal" looks like for each service
   - Metrics thresholds (error rate, latency, availability)

2. CHAOS MESH EXPERIMENTS (Kubernetes CRDs):
   - PodChaos: random pod kill for each service
   - NetworkChaos: latency injection between services
   - StressChaos: CPU and memory pressure
   - IOChaos: disk I/O degradation
   - HTTPChaos: HTTP fault injection

3. LITMUS CHAOS SCENARIOS:
   - Database failure scenario
   - Cache failure scenario
   - Message broker failure scenario

4. AUTOMATED CHAOS PIPELINE (GitHub Actions):
   - Weekly chaos run in staging
   - Monthly chaos run in production (with auto-abort safeguards)
   - Resilience scorecard generation

5. TOXIPROXY CONFIGURATION:
   - Network proxy with fault injection for integration tests
   - Latency, packet loss, connection reset scenarios

6. CHAOS RUNBOOKS:
   - How to run each experiment
   - Expected behavior during chaos
   - How to abort if things go wrong
   - Post-experiment analysis

7. RESILIENCE SCORECARD TEMPLATE:
   - Scoring criteria for each resilience pattern
   - Pass/fail thresholds

Return as structured JSON with all file contents.
"""
        resp = self.think(prompt, context="chaos engineering design")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            chaos_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            chaos_spec = {"raw": resp}

        chaos_path = f"{workspace}/11_chaos/chaos_spec.json"
        os.makedirs(os.path.dirname(chaos_path), exist_ok=True)
        with open(chaos_path, "w") as f:
            json.dump(chaos_spec, f, indent=2)

        artifacts = [chaos_path]
        if isinstance(chaos_spec, dict) and "files" in chaos_spec:
            for file_spec in chaos_spec.get("files", []):
                fp = f"{workspace}/11_chaos/{file_spec['path']}"
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fp)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=chaos_spec, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 12. COMPLIANCE AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class ComplianceAgent(BaseAgent):
    AGENT_TYPE    = "compliance_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Compliance Agent — an expert in regulatory compliance, data privacy,
and enterprise governance frameworks.

YOUR MISSION: Ensure every system is compliant by design, with automated compliance monitoring.

COMPLIANCE FRAMEWORKS:
- GDPR (EU data privacy)
- CCPA (California privacy)
- HIPAA (healthcare data)
- PCI-DSS (payment card data)
- SOC 2 Type II (security, availability, confidentiality)
- ISO 27001 (information security management)
- NIST CSF (cybersecurity framework)
- FedRAMP (US federal cloud)

NOOPS COMPLIANCE:
- Automated compliance scanning in CI/CD
- Continuous compliance monitoring (OPA policies)
- Automated audit log collection and retention
- Data classification and labeling automation
- Automated DSAR (Data Subject Access Request) handling
- Privacy-by-design enforcement via code analysis

OUTPUT: Compliance checklist, data processing agreements, privacy policies,
audit log config, OPA policies, automated compliance pipeline.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        prd  = context.get("prd", task.get("prd", {}))
        arch = context.get("architecture", {})
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        frameworks = task.get("frameworks", ["gdpr", "soc2"])

        prompt = f"""
Generate comprehensive compliance artifacts for this system.

REQUIREMENTS: {json.dumps(prd, indent=2)[:1500]}
ARCHITECTURE: {json.dumps(arch, indent=2)[:1000]}
COMPLIANCE FRAMEWORKS: {frameworks}

Generate:
1. COMPLIANCE MATRIX
   - Map each requirement to compliance controls
   - Gap analysis (what's missing)
   - Remediation plan

2. DATA INVENTORY
   - All PII/sensitive data fields
   - Data classification (public/internal/confidential/restricted)
   - Data retention policies
   - Data flow diagram (who accesses what)

3. OPA POLICIES (Rego)
   - Data access control policies
   - Audit logging requirements
   - Encryption requirements

4. AUDIT LOG CONFIGURATION
   - What events to log
   - Log format (structured, tamper-evident)
   - Retention period
   - SIEM integration

5. PRIVACY CONTROLS
   - Consent management
   - Data minimization checks
   - Right to erasure implementation
   - Data portability (export) implementation

6. AUTOMATED COMPLIANCE PIPELINE
   - Compliance scanning in CI/CD
   - Policy-as-code enforcement
   - Compliance reporting

7. COMPLIANCE CHECKLIST
   - Per-framework checklist with pass/fail status

Return as structured JSON.
"""
        resp = self.think(prompt, context="compliance analysis")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            comp_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            comp_spec = {"raw": resp}

        comp_path = f"{workspace}/12_compliance/compliance_spec.json"
        os.makedirs(os.path.dirname(comp_path), exist_ok=True)
        with open(comp_path, "w") as f:
            json.dump(comp_spec, f, indent=2)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=comp_spec, artifacts=[comp_path],
            metadata={"project_id": project_id, "frameworks": frameworks}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 13. FINOPS AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class FinOpsAgent(BaseAgent):
    AGENT_TYPE    = "finops_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC FinOps Agent — an expert in cloud cost optimization, financial
governance, and autonomous cost management.

YOUR MISSION: Ensure every system is cost-optimized by design with autonomous cost controls.

FINOPS CAPABILITIES:
- Cloud cost estimation (AWS/GCP/Azure pricing)
- Right-sizing recommendations (CPU/memory/storage)
- Reserved instance / savings plan optimization
- Spot/preemptible instance strategy
- Cost allocation and tagging strategy
- Budget alerts and automated cost controls
- Waste detection (idle resources, over-provisioned)
- Multi-cloud cost comparison

NOOPS FINOPS:
- Automated right-sizing via VPA (Vertical Pod Autoscaler)
- Spot instance fallback with automatic on-demand failover
- Automated shutdown of non-production environments (nights/weekends)
- Cost anomaly detection with auto-alert
- Automated reserved instance purchasing recommendations
- Tag enforcement via OPA policies

OUTPUT: Cost estimate, optimization recommendations, tagging strategy,
budget alerts config, cost monitoring dashboard, automated cost controls.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")
        cloud      = task.get("cloud_provider", "aws")

        prompt = f"""
Generate comprehensive FinOps analysis and cost optimization for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}
CLOUD PROVIDER: {cloud}

Generate:
1. COST ESTIMATE
   - Per-service cost breakdown (monthly)
   - Total estimated monthly cost (dev/staging/prod)
   - Cost drivers and optimization opportunities

2. RIGHT-SIZING RECOMMENDATIONS
   - CPU/memory requests and limits for each service
   - VPA configuration for automatic right-sizing
   - Database instance sizing

3. COST OPTIMIZATION STRATEGY
   - Spot/preemptible instances (which services are suitable)
   - Reserved instance recommendations
   - Savings plan recommendations
   - Storage tiering strategy

4. TAGGING STRATEGY
   - Required tags: project, environment, team, cost-center, service
   - OPA policy to enforce tagging
   - Cost allocation by tag

5. BUDGET ALERTS
   - AWS Budgets / GCP Budget Alerts configuration
   - Anomaly detection thresholds
   - Automated response (scale down, notify)

6. AUTOMATED COST CONTROLS
   - Non-production environment scheduler (off nights/weekends)
   - Idle resource detection and cleanup
   - Cost anomaly auto-response playbook

7. COST MONITORING DASHBOARD (Grafana JSON)
   - Cost by service
   - Cost trend
   - Budget vs actual

Return as structured JSON.
"""
        resp = self.think(prompt, context="finops analysis")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            finops_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            finops_spec = {"raw": resp}

        finops_path = f"{workspace}/13_finops/finops_spec.json"
        os.makedirs(os.path.dirname(finops_path), exist_ok=True)
        with open(finops_path, "w") as f:
            json.dump(finops_spec, f, indent=2)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=finops_spec, artifacts=[finops_path],
            metadata={"project_id": project_id, "cloud": cloud}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 14. MAINTENANCE AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class MaintenanceAgent(BaseAgent):
    AGENT_TYPE    = "maintenance_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Maintenance Agent — an expert in software maintenance, technical debt
management, and autonomous system evolution.

YOUR MISSION: Keep every system healthy, current, and continuously improving — autonomously.

MAINTENANCE CAPABILITIES:
- Dependency vulnerability scanning and automated updates (Dependabot, Renovate)
- Code quality analysis (cyclomatic complexity, duplication, dead code)
- Technical debt quantification and prioritization
- Performance regression detection and optimization
- Database migration management
- API versioning and deprecation management
- Documentation freshness monitoring

NOOPS MAINTENANCE:
- Automated dependency updates via Renovate (with auto-merge for patch/minor)
- Automated security patches (zero-day response < 24h)
- Automated refactoring suggestions via code analysis
- Automated performance profiling and optimization PRs
- Self-updating documentation (generated from code)
- Automated changelog generation

OUTPUT: Maintenance plan, Renovate config, code quality report,
tech debt backlog, automated maintenance pipelines.
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _run_command_tool(), _github_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        arch = context.get("architecture", task.get("architecture", {}))
        project_id = context.get("project_id", "unknown")
        workspace  = context.get("workspace", f"./projects/{project_id}")

        prompt = f"""
Generate a comprehensive maintenance and evolution plan for this system.

ARCHITECTURE: {json.dumps(arch, indent=2)[:2000]}

Generate:
1. RENOVATE CONFIGURATION (renovate.json)
   - Auto-merge patch updates
   - PR for minor/major updates
   - Security update priority
   - Dependency grouping

2. DEPENDABOT CONFIGURATION (.github/dependabot.yml)
   - Weekly dependency checks
   - Auto-merge security patches

3. CODE QUALITY PIPELINE
   - SonarQube/SonarCloud configuration
   - Quality gates (coverage, duplication, complexity)
   - Technical debt tracking

4. AUTOMATED MAINTENANCE PIPELINE (GitHub Actions)
   - Weekly: dependency updates, security scan
   - Monthly: performance profiling, dead code analysis
   - Quarterly: major dependency upgrades, architecture review

5. TECHNICAL DEBT TRACKING
   - Debt categories (code smell, security, performance, documentation)
   - Prioritization matrix
   - Automated debt detection rules

6. DOCUMENTATION AUTOMATION
   - Auto-generate API docs from OpenAPI spec
   - Auto-generate changelog from git commits (conventional commits)
   - Auto-update README on deployment

7. PERFORMANCE MONITORING
   - Continuous profiling setup (Pyroscope/Parca)
   - Performance regression detection
   - Automated optimization PR generation

Return as structured JSON with all file contents.
"""
        resp = self.think(prompt, context="maintenance planning")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            maint_spec = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            maint_spec = {"raw": resp}

        maint_path = f"{workspace}/14_maintenance/maintenance_spec.json"
        os.makedirs(os.path.dirname(maint_path), exist_ok=True)
        with open(maint_path, "w") as f:
            json.dump(maint_spec, f, indent=2)

        artifacts = [maint_path]
        if isinstance(maint_spec, dict) and "files" in maint_spec:
            for file_spec in maint_spec.get("files", []):
                fp = f"{workspace}/14_maintenance/{file_spec['path']}"
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, "w") as f:
                    f.write(file_spec["content"])
                artifacts.append(fp)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=maint_spec, artifacts=artifacts,
            metadata={"project_id": project_id}
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 15. CONDUCTOR AGENT (Orchestrator)
# ═══════════════════════════════════════════════════════════════════════════════

class ConductorAgent(BaseAgent):
    AGENT_TYPE    = "conductor_agent"
    SYSTEM_PROMPT = """
You are the AI-SDLC Conductor Agent — the master orchestrator that coordinates all
15 specialized agents to build complete enterprise software systems end-to-end.

YOUR MISSION: Take any software idea and autonomously orchestrate all agents to deliver
a production-ready, NoOps-capable system — from ideation to deployed infrastructure.

ORCHESTRATION PRINCIPLES:
1. Understand the full scope before starting
2. Execute agents in the correct dependency order
3. Pass rich context between agents (each agent builds on previous outputs)
4. Validate each phase output before proceeding
5. Handle failures gracefully (retry, alternative approach, escalate)
6. Maintain a complete project ledger (what was done, what's pending)
7. Optimize for parallelism (run independent agents concurrently)
8. Apply self-learning: consult memory before each phase

SDLC EXECUTION ORDER:
Phase 1: Ideation → Business Analysis (sequential, each informs next)
Phase 2: Architecture + UX Design (parallel, both informed by BA)
Phase 3: Data Engineering + Security Architecture (parallel)
Phase 4: Engineering (per service, can be parallel)
Phase 5: QA (per service, parallel)
Phase 6: DevOps + Self-Healing + Chaos (parallel)
Phase 7: Compliance + FinOps (parallel)
Phase 8: Maintenance Planning
Phase 9: Final integration, validation, and handoff

DECISION MAKING: At each phase, evaluate:
- Is the output sufficient to proceed?
- Are there blockers that need human input?
- Can we optimize by running agents in parallel?
- What does memory tell us about similar past projects?
""".strip()

    def get_tools(self) -> List[Tool]:
        return [_file_write_tool(), _file_read_tool(), _memory_store_tool()]

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        """
        The Conductor's execute method plans the full SDLC run.
        Actual orchestration is done by the Orchestration Engine.
        This method produces the execution plan.
        """
        idea = task.get("idea", task.get("description", ""))
        project_id = context.get("project_id", "unknown")

        prompt = f"""
Create a detailed SDLC execution plan for this project.

PROJECT IDEA: {idea}
PROJECT ID: {project_id}
ADDITIONAL CONTEXT: {json.dumps(context.get("additional_context", {}), indent=2)}

Produce an execution plan as JSON:
{{
  "project_id": "{project_id}",
  "project_name": "derived from idea",
  "phases": [
    {{
      "phase_id": 1,
      "name": "Ideation & Requirements",
      "agents": ["ideation_agent", "ba_agent"],
      "parallel": false,
      "dependencies": [],
      "estimated_duration_minutes": 5,
      "outputs": ["product_vision.json", "prd.json"]
    }},
    ...
  ],
  "total_estimated_duration_minutes": 45,
  "complexity": "medium",
  "recommended_tech_stack": {{...}},
  "risk_factors": [...],
  "success_criteria": [...]
}}

Include all 15 agents appropriately sequenced. Identify which phases can run in parallel.
"""
        resp = self.think(prompt, context=f"orchestration planning for: {idea}")

        try:
            start = resp.find("{"); end = resp.rfind("}") + 1
            plan = json.loads(resp[start:end]) if start >= 0 else {"raw": resp}
        except Exception:
            plan = {"raw": resp}

        workspace = context.get("workspace", f"./projects/{project_id}")
        plan_path = f"{workspace}/execution_plan.json"
        os.makedirs(workspace, exist_ok=True)
        with open(plan_path, "w") as f:
            json.dump(plan, f, indent=2)

        return AgentResult(
            agent_id=self.id, agent_type=self.AGENT_TYPE, success=True,
            output=plan, artifacts=[plan_path],
            metadata={"project_id": project_id}
        )


# ── Agent Registry ────────────────────────────────────────────────────────────

AGENT_REGISTRY: Dict[str, type] = {
    "ideation_agent":      IdeationAgent,
    "ba_agent":            BusinessAnalystAgent,
    "architect_agent":     ArchitectAgent,
    "ux_agent":            UXDesignAgent,
    "engineer_agent":      EngineerAgent,
    "data_engineer_agent": DataEngineerAgent,
    "qa_agent":            QAAgent,
    "security_agent":      SecurityAgent,
    "devops_agent":        DevOpsAgent,
    "self_healing_agent":  SelfHealingAgent,
    "chaos_agent":         ChaosEngineerAgent,
    "compliance_agent":    ComplianceAgent,
    "finops_agent":        FinOpsAgent,
    "maintenance_agent":   MaintenanceAgent,
    "conductor_agent":     ConductorAgent,
}


def create_agent(agent_type: str, llm: Optional[LLMGateway] = None,
                 memory: Optional[Any] = None, **kwargs) -> BaseAgent:
    """Factory function to create any agent by type string."""
    cls = AGENT_REGISTRY.get(agent_type)
    if not cls:
        raise ValueError(f"Unknown agent type: {agent_type}. Available: {list(AGENT_REGISTRY.keys())}")
    return cls(llm=llm, memory=memory, **kwargs)
