# Changelog

All notable changes to AI-SDLC are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.0.0] — 2025-01-19

### Added — Intelligence Layer
- **Multi-Agent Debate Engine** (`aisdlc/intelligence/debate_engine.py`) — multiple expert agents argue opposing positions; Conductor selects the winner with evidence
- **Adversarial Agent** — dedicated Devil's Advocate that attacks every design before code is written
- **Confidence Scorer** — every agent output carries a confidence score; low-confidence outputs trigger human review
- **Reasoning Trace Store** — full chain-of-thought stored for every decision; complete auditability for enterprise compliance
- **Long-Horizon Planner** — 12–24 month product roadmap with milestones, dependencies, and resource estimates

### Added — Engineering Depth (8 new agents)
- `ddd_agent` — Domain-Driven Design: bounded contexts, aggregates, domain events, ubiquitous language
- `api_contract_agent` — OpenAPI 3.1 specs, contract tests, breaking change detection, mock servers
- `db_migration_agent` — Zero-downtime migrations, rollback scripts, validation queries
- `event_driven_agent` — Kafka/RabbitMQ topology, event sourcing, CQRS, saga patterns
- `sdk_generator` — Auto-generates Python, TypeScript, Go, Java SDKs from OpenAPI specs
- `code_review_agent` — Automated code review with security, performance, and maintainability feedback
- `refactoring_agent` — Identifies and applies refactoring opportunities (SOLID, DRY, clean architecture)
- `dependency_upgrade_agent` — Automated dependency upgrade PRs with compatibility analysis

### Added — Security Depth (5 new agents)
- `dast_engine` — Dynamic Application Security Testing with OWASP ZAP integration
- `sbom_agent` — Software Bill of Materials generation (SPDX, CycloneDX) and supply chain analysis
- `pentest_agent` — Automated penetration testing scenarios and remediation guidance
- `privacy_agent` — GDPR/CCPA data flow mapping, PII detection, consent management
- `policy_as_code_agent` — OPA/Rego policy generation, admission controllers, governance rules

### Added — Infrastructure (7 new agents)
- `terraform_agent` — Terraform and Pulumi IaC generation for AWS, GCP, Azure
- `multi_cloud_agent` — Multi-cloud and hybrid cloud architecture patterns
- `service_mesh_agent` — Istio/Linkerd service mesh configuration, mTLS, traffic management
- `cost_forecasting_agent` — Cloud cost forecasting, budget alerts, rightsizing recommendations
- `dr_agent` — Disaster recovery runbooks, RTO/RPO planning, backup strategies
- `gitops_agent` — ArgoCD/Flux GitOps pipeline configuration, progressive delivery
- `edge_deployment_agent` — Edge computing deployment patterns (Cloudflare Workers, Lambda@Edge)

### Added — Observability Suite (6 new agents)
- `otel_instrumentation_agent` — Auto-instruments code with OpenTelemetry traces, metrics, and logs
- `slo_agent` — SLO/SLA definitions, error budgets, burn rate alerts in Prometheus
- `incident_response_agent` — Autonomous incident detection, diagnosis, and remediation
- `capacity_planning_agent` — Traffic forecasting, capacity recommendations, scaling policies
- `bi_agent` — Business intelligence dashboards, KPI definitions, data visualisation
- `log_intelligence_agent` — Log pattern analysis, anomaly detection, structured logging

### Added — Collaboration (5 new agents)
- `pm_agent` — Sprint planning, backlog grooming, velocity tracking, stakeholder updates
- `stakeholder_agent` — Executive summaries, progress reports, risk communications
- `documentation_agent` — Full documentation suite: API docs, user guides, runbooks, ADRs
- `changelog_agent` — Automated CHANGELOG.md generation from git history
- `onboarding_agent` — Developer onboarding guides, local setup scripts, architecture tours

### Added — AI/ML Native (5 new agents)
- `ml_pipeline_agent` — ML pipeline design: feature store, training, evaluation, serving
- `prompt_engineering_agent` — Prompt optimisation, few-shot examples, chain-of-thought patterns
- `model_evaluation_agent` — LLM evaluation harnesses, benchmark suites, regression testing
- `vector_db_agent` — Vector database design, embedding strategies, RAG architecture
- `ai_safety_agent` — Bias detection, fairness auditing, responsible AI controls

### Added — Platform Features
- **Multi-tenancy** — Per-tenant isolation, RBAC, resource quotas, billing integration
- **Plugin/Marketplace System** — Domain-specific agent plugins (Healthcare, Finance, Legal, etc.)
- **Webhook Trigger Engine** — Event-driven pipeline triggers from GitHub, Jira, Slack, and custom webhooks
- **Approval Workflow Engine** — Configurable human-in-the-loop gates with Slack/email notifications
- **Project Templates Library** — 5 pre-built templates: SaaS B2B, microservices, ML platform, data platform, API gateway
- **Performance Dashboard** — Real-time metrics: agent throughput, token usage, cost, latency
- **Federated Memory** — Cross-project knowledge sharing with privacy controls

### Added — Analytics & Reporting
- **Interactive demo page** (`demo/index.html`) — Live terminal demo, pipeline visualisation, analytics dashboard
- **Weekly analytics reports** (`scripts/analytics/`) — Automated GitHub Actions workflow delivering reports to GitHub Issues, email (SendGrid), and Slack every Monday

### Changed — Core Architecture
- **LLM Gateway** now supports 6+ providers: OpenAI, Anthropic, Google, Ollama, Groq, any OpenAI-compatible endpoint
- **Memory System** upgraded to 4 layers: Working (Redis), Episodic, Semantic, Procedural (all ChromaDB)
- **Self-Learning Engine** promotes episodic memories into reusable semantic/procedural knowledge after every project
- **Conductor** upgraded with full DAG planner, A2A protocol, HITL gates, and feedback loops
- **MCP Server** now exposes 55 tools (up from 12 in v2.0)
- **Agent Registry** centralises all 50+ agents with metadata, capabilities, and routing
- **REST API** upgraded to FastAPI with full OpenAPI docs, auth, rate limiting, and WebSocket support

### Added — NoOps & Self-Healing (all generated code includes)
- Circuit breakers with exponential backoff (tenacity / resilience4j)
- Kubernetes liveness, readiness, and startup health probes
- Horizontal Pod Autoscaler with CPU/memory-based scaling
- Pod Disruption Budgets for zero-downtime deployments
- Chaos experiments (Litmus / Chaos Monkey) for resilience validation
- Auto-remediation scripts for common failure scenarios
- OpenTelemetry instrumentation from day one
- SLO definitions with error budgets and burn rate alerts
- Incident runbooks for every generated alert

---

## [2.0.0] — 2025-01-15

### Added
- Complete Python rewrite of the platform (replacing TypeScript-only implementation)
- Model-agnostic LLM Gateway
- 15 core SDLC agents with full system prompts
- 4-layer cognitive memory system (Working, Episodic, Semantic, Procedural)
- Self-Learning Engine
- Conductor orchestration engine with DAG planner
- NoOps self-healing engine
- Security engine (SAST, secrets detection, zero-trust policy generator)
- Tool registry (GitHub, filesystem, code execution, Docker, K8s, Jira, Prometheus)
- MCP server (12 tools)
- FastAPI REST server
- CLI entry point
- Docker Compose self-hosting stack
- Nginx, Prometheus, Grafana, PostgreSQL configuration

---

## [1.x.x] — Prior to 2025-01-15

Original TypeScript implementation with:
- Agent markdown prompts (Conductor, BA, Architect, Engineer, Security, QA, UX, Customer, Tracker)
- TypeScript platform with 102 REST APIs
- ChromaDB memory system
- Context injection
- Governance engine
- Scheduling system
- Company-specific branding (Vintiq/Deltek)
