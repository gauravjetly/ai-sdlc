# AI-SDLC v3.0.0 — Fully Autonomous Agentic Software Factory

> **Build any enterprise software, end-to-end, from a single command.**
> Model-agnostic · Self-healing · NoOps · Self-learning · MCP-ready · Self-hostable

---

## What Is This?

AI-SDLC v3.0.0 is a complete, production-ready, autonomous software development lifecycle platform. You give it an idea. It delivers production-ready, self-healing, fully-observed enterprise software — code, tests, infrastructure, security, documentation, CI/CD, and everything in between — with no human operators required.

```bash
aisdlc run "Build a multi-tenant SaaS CRM for real estate agents" \
  --provider openai --model gpt-4o
```

That single command triggers 15 autonomous agents working in sequence, producing 60+ files across every layer of the stack.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI-SDLC v3.0.0                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              MCP Server (55 tools)  /  REST API              │   │
│  │              CLI  /  Python SDK                              │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │                 Conductor Orchestration                       │   │
│  │   DAG Planner · A2A Protocol · HITL Gates · Feedback Loops   │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────────────────┐   │
│  │                   50+ Autonomous Agents                       │   │
│  │  Ideation · BA · Architect · UX · Data · Security ·          │   │
│  │  Engineer · QA · DevOps · Self-Healing · Chaos · Compliance · │   │
│  │  FinOps · Maintenance · Observability · Debate · Adversarial  │   │
│  │  DDD · API Contract · DB Migration · Event-Driven · SDK Gen  │   │
│  │  DAST · SBOM · Privacy · Policy-as-Code · Terraform · GitOps │   │
│  │  OTel · SLO · Incident Response · ML Pipeline · AI Safety    │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│  ┌──────────┬───────────▼──────────┬──────────────────────────┐    │
│  │ LLM      │  4-Layer Memory      │  Tool Registry            │    │
│  │ Gateway  │  Working · Episodic  │  GitHub · Docker · K8s   │    │
│  │ (any LLM)│  Semantic · Procedural│  Jira · Prometheus · Web │    │
│  └──────────┴──────────────────────┴──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Option 1: Docker Compose (recommended for self-hosting)

```bash
# Clone the repo
git clone https://github.com/gauravjetly/ai-sdlc.git
cd ai-sdlc/v3

# Configure your LLM provider
cp .env.example .env
# Edit .env — set OPENAI_API_KEY (or any other provider)

# Start the full stack
docker compose up -d

# Run your first project
docker compose exec aisdlc aisdlc run "Build a REST API for a task manager" \
  --provider openai --model gpt-4o
```

The stack starts:
- **AI-SDLC API** on `http://localhost:8000`
- **MCP Server** on `http://localhost:8765`
- **ChromaDB** (vector memory) on `http://localhost:8001`
- **Redis** (working memory) on `localhost:6379`
- **PostgreSQL** (project ledger) on `localhost:5432`
- **Prometheus** on `http://localhost:9090`
- **Grafana** on `http://localhost:3000`
- **Nginx** reverse proxy on `http://localhost:80`

### Option 2: Python (local development)

```bash
cd ai-sdlc/v3

# Install
pip install -e .

# Set your LLM provider
export OPENAI_API_KEY="sk-..."
export AISDLC_DEFAULT_PROVIDER="openai"
export AISDLC_DEFAULT_MODEL="gpt-4o"

# Run
aisdlc run "Build a multi-tenant SaaS CRM" --workspace ./my-projects
```

---

## Supported LLM Providers

| Provider | Models | Config |
|---|---|---|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o3 | `OPENAI_API_KEY` |
| **Anthropic** | claude-3-5-sonnet, claude-3-opus, claude-3-haiku | `ANTHROPIC_API_KEY` |
| **Google** | gemini-1.5-pro, gemini-1.5-flash, gemini-2.0 | `GOOGLE_API_KEY` |
| **Ollama** | llama3, mistral, codestral, qwen2.5-coder, any | `OLLAMA_BASE_URL` |
| **Groq** | llama3-70b, mixtral-8x7b | `GROQ_API_KEY` |
| **Any OpenAI-compatible** | Any | `OPENAI_COMPATIBLE_BASE_URL` + `OPENAI_COMPATIBLE_API_KEY` |

---

## Connect via MCP (Claude, Cursor, Windsurf, Continue, etc.)

Any MCP-compatible AI model can use all 55 AI-SDLC tools natively.

### Claude Desktop

```json
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "ai-sdlc": {
      "command": "python3",
      "args": ["-m", "aisdlc.mcp.server", "--transport", "stdio"],
      "cwd": "/path/to/ai-sdlc/v3",
      "env": {
        "AISDLC_DEFAULT_PROVIDER": "openai",
        "AISDLC_DEFAULT_MODEL": "gpt-4o",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### Cursor / Windsurf / Continue

```json
{
  "mcp": {
    "servers": {
      "ai-sdlc": {
        "command": "python3",
        "args": ["-m", "aisdlc.mcp.server", "--transport", "stdio"],
        "cwd": "/path/to/ai-sdlc/v3"
      }
    }
  }
}
```

### HTTP/SSE (for hosted deployments)

```bash
aisdlc mcp start --transport sse --host 0.0.0.0 --port 8765
# Connect at: http://your-host:8765/mcp
```

---

## CLI Reference

```bash
# ── Core ──────────────────────────────────────────────────────────────────────
aisdlc run "Your idea"                              # Full 15-phase pipeline
aisdlc run "Your idea" --provider anthropic \       # Use any LLM
  --model claude-3-5-sonnet-20240620
aisdlc run "Your idea" --phases "ideation,ba,arch"  # Run specific phases only
aisdlc run "Your idea" --template saas-b2b-multitenant

# ── Agents ────────────────────────────────────────────────────────────────────
aisdlc agents list                                  # List all 50+ agents
aisdlc agents list --phase engineering              # Filter by phase
aisdlc agent engineer_agent --task '{"desc":"..."}'  # Run a single agent

# ── Intelligence ──────────────────────────────────────────────────────────────
aisdlc debate "Monolith vs microservices"           # Multi-agent debate
aisdlc challenge "My architecture design..."        # Adversarial review
aisdlc roadmap "Build the next Salesforce" -h 12   # 12-month product roadmap

# ── Security ──────────────────────────────────────────────────────────────────
aisdlc security scan ./my-project                   # SAST + secrets + SBOM
aisdlc security scan ./my-project -o report.json

# ── Infrastructure ────────────────────────────────────────────────────────────
aisdlc infra terraform "3-tier web app" --cloud aws # Terraform/Pulumi IaC
aisdlc infra gitops "payment service" --tool argocd # GitOps pipeline

# ── Observability ─────────────────────────────────────────────────────────────
aisdlc observe instrument "payment service" -l python  # OTel instrumentation
aisdlc observe slo "checkout service"                  # SLO definitions

# ── NoOps ─────────────────────────────────────────────────────────────────────
aisdlc noops generate my-service --language python  # Self-healing configs

# ── Documentation ─────────────────────────────────────────────────────────────
aisdlc docs generate "my project"                   # Full documentation suite
aisdlc docs changelog --since HEAD~20               # CHANGELOG.md from git

# ── Memory ────────────────────────────────────────────────────────────────────
aisdlc memory search "microservices patterns"       # Search agent memory

# ── Templates ─────────────────────────────────────────────────────────────────
aisdlc templates list                               # List project templates

# ── Servers ───────────────────────────────────────────────────────────────────
aisdlc mcp start --transport stdio                  # Start MCP server
aisdlc mcp start --transport sse --port 8765        # Start MCP over HTTP
aisdlc api start --port 8000                        # Start REST API

# ── Status ────────────────────────────────────────────────────────────────────
aisdlc status proj-abc123                           # Check project status
```

---

## The 15 SDLC Phases

| # | Phase | Agent | What It Produces |
|---|---|---|---|
| 1 | **Ideation** | `ideation_agent` | Product vision, market analysis, success metrics |
| 2 | **Business Analysis** | `ba_agent` | PRD, user stories, epics, acceptance criteria |
| 3 | **Architecture** | `architect_agent` | System design, ADRs, tech stack, component diagrams |
| 4 | **UX Design** | `ux_agent` | User journeys, wireframe specs, design system tokens |
| 5 | **Data Engineering** | `data_engineer_agent` | Schema, migrations, ETL pipeline, analytics layer |
| 6 | **Security** | `security_engine` | Threat model, zero-trust policies, compliance checklist |
| 7 | **Engineering** | `engineer_agent` | Production code with NoOps + OTel baked in |
| 8 | **QA & Testing** | `qa_agent` | Unit, integration, E2E, load tests (90%+ coverage) |
| 9 | **DevOps / CI-CD** | `devops_agent` | Dockerfile, K8s, Helm, GitHub Actions, GitOps |
| 10 | **Self-Healing** | `healing_engine` | Circuit breakers, health probes, auto-remediation |
| 11 | **Chaos Engineering** | `chaos_agent` | Litmus/Chaos Monkey experiments, resilience tests |
| 12 | **Compliance** | `compliance_agent` | SOC2, GDPR, HIPAA controls, audit trail |
| 13 | **FinOps** | `finops_agent` | Cost forecast, budget alerts, optimisation recommendations |
| 14 | **Maintenance** | `maintenance_agent` | Dependency upgrade plan, deprecation roadmap |
| 15 | **Observability** | `otel_agent` | OTel instrumentation, SLOs, dashboards, runbooks |

---

## All 50+ Agents

### Core SDLC (15)
`ideation_agent` · `ba_agent` · `architect_agent` · `ux_agent` · `data_engineer_agent` · `security_engine` · `engineer_agent` · `qa_agent` · `devops_agent` · `healing_engine` · `chaos_agent` · `compliance_agent` · `finops_agent` · `maintenance_agent` · `otel_agent`

### Intelligence Layer (5)
`debate_engine` · `adversarial_agent` · `confidence_scorer` · `reasoning_trace_store` · `long_horizon_planner`

### Engineering Depth (8)
`ddd_agent` · `api_contract_agent` · `db_migration_agent` · `event_driven_agent` · `sdk_generator` · `code_review_agent` · `refactoring_agent` · `dependency_upgrade_agent`

### Security Depth (5)
`dast_engine` · `sbom_agent` · `pentest_agent` · `privacy_agent` · `policy_as_code_agent`

### Infrastructure (7)
`terraform_agent` · `multi_cloud_agent` · `service_mesh_agent` · `cost_forecasting_agent` · `dr_agent` · `gitops_agent` · `edge_deployment_agent`

### Observability Suite (6)
`otel_instrumentation_agent` · `slo_agent` · `incident_response_agent` · `capacity_planning_agent` · `bi_agent` · `log_intelligence_agent`

### Collaboration (5)
`pm_agent` · `stakeholder_agent` · `documentation_agent` · `changelog_agent` · `onboarding_agent`

### AI/ML Native (5)
`ml_pipeline_agent` · `prompt_engineering_agent` · `model_evaluation_agent` · `vector_db_agent` · `ai_safety_agent`

---

## NoOps & Self-Healing

Every piece of code the platform generates includes:

- **Circuit breakers** (tenacity / resilience4j) — automatic retry with exponential backoff
- **Health probes** — Kubernetes liveness, readiness, and startup probes
- **Horizontal Pod Autoscaler** — CPU/memory-based auto-scaling
- **Pod Disruption Budgets** — zero-downtime deployments
- **Chaos experiments** — Litmus / Chaos Monkey tests to validate resilience
- **Auto-remediation scripts** — shell + Python scripts that detect and fix common failures
- **OpenTelemetry instrumentation** — traces, metrics, and logs from day one
- **SLO definitions** — error budgets and burn rate alerts in Prometheus
- **Incident runbooks** — step-by-step remediation for every alert

---

## Memory System

The platform uses a 4-layer cognitive memory architecture:

| Layer | Store | Purpose |
|---|---|---|
| **Working** | Redis | Current task context, in-flight agent state |
| **Episodic** | ChromaDB | Project history, past decisions, outcomes |
| **Semantic** | ChromaDB | Reusable patterns, best practices, domain knowledge |
| **Procedural** | ChromaDB | Learned workflows, agent playbooks |

The **Self-Learning Engine** automatically promotes episodic memories into semantic and procedural knowledge after every completed project, making the system smarter over time.

---

## Project Templates

| Template | Description |
|---|---|
| `saas-b2b-multitenant` | Multi-tenant SaaS with per-tenant isolation, billing, RBAC |
| `microservices-platform` | Event-driven microservices with service mesh and GitOps |
| `ml-platform` | ML pipeline with feature store, model registry, and serving |
| `data-platform` | Data lakehouse with ingestion, transformation, and BI layer |
| `api-gateway-platform` | API gateway with rate limiting, auth, and developer portal |

---

## Self-Hosting

The included `docker-compose.yml` spins up the complete production stack:

```
aisdlc-api      — FastAPI REST API (port 8000)
aisdlc-mcp      — MCP server (port 8765)
chromadb        — Vector memory store (port 8001)
redis           — Working memory (port 6379)
postgres        — Project ledger (port 5432)
nginx           — Reverse proxy + TLS (port 80/443)
prometheus      — Metrics (port 9090)
grafana         — Dashboards (port 3000)
```

For production, set these environment variables in your `.env`:

```env
AISDLC_DEFAULT_PROVIDER=openai
AISDLC_DEFAULT_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
REDIS_URL=redis://redis:6379
CHROMA_HOST=chromadb
POSTGRES_URL=postgresql://aisdlc:password@postgres:5432/aisdlc
SECRET_KEY=your-secret-key-here
```

---

## Weekly Analytics Reports

The demo page ships with automated weekly analytics reports via GitHub Actions.

See `scripts/analytics/README.md` for the full setup guide.

Delivers every Monday at 08:00 UTC to:
- GitHub Issues (auto-created, previous week auto-closed)
- Email (SendGrid HTML report with charts)
- Slack (Block Kit summary card)

---

## Repository Structure

```
v3/
├── aisdlc/                     # Core Python package
│   ├── core/                   # LLM gateway, base agent, agent registry
│   ├── agents/                 # All 15 core SDLC agents + engineering agents
│   ├── intelligence/           # Debate engine, reasoning engine, adversarial agent
│   ├── memory/                 # 4-layer memory system
│   ├── learning/               # Self-learning engine
│   ├── orchestration/          # Conductor, DAG planner, A2A protocol, HITL
│   ├── noops/                  # Self-healing engine, chaos, resilience
│   ├── security/               # SAST, DAST, SBOM, privacy, policy-as-code
│   ├── infrastructure/         # Terraform, multi-cloud, service mesh, GitOps
│   ├── observability/          # OTel, SLO, incident response, capacity planning
│   ├── collaboration/          # PM, docs, changelog, onboarding
│   ├── aiml/                   # ML pipeline, prompt engineering, AI safety
│   ├── platform/               # Multi-tenancy, plugins, webhooks, templates
│   ├── tools/                  # GitHub, Docker, K8s, Jira, Prometheus integrations
│   ├── mcp/                    # MCP server (55 tools)
│   ├── api/                    # FastAPI REST API
│   └── cli.py                  # CLI entry point
├── deploy/
│   ├── nginx/                  # Nginx configuration
│   ├── prometheus/             # Prometheus configuration
│   └── postgres/               # Database init SQL
├── demo/
│   └── index.html              # Interactive demo page with analytics
├── scripts/
│   └── analytics/              # Weekly analytics report scripts
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Full self-hosting stack
├── pyproject.toml              # Python package configuration
└── README.md                   # This file
```

---

## Stats

| Metric | Value |
|---|---|
| Python source files | 22 |
| Total lines of code | 13,089 |
| MCP tools | 55 |
| Autonomous agents | 50+ |
| SDLC phases | 15 |
| Supported LLM providers | 6+ |
| Memory layers | 4 |
| Security layers | 7 |
| Infrastructure targets | AWS, GCP, Azure, multi-cloud, edge |

---

## License

MIT — see [LICENSE](../LICENSE) in the root of the repository.

---

*AI-SDLC v3.0.0 — Built autonomously by AI-SDLC itself.*
