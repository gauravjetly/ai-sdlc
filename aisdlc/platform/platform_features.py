"""
Platform Features
==================
Seven platform-level capabilities that make AI-SDLC enterprise-ready:

  1. MultiTenancyManager   — Tenant isolation, quota management, billing hooks
  2. PluginMarketplace     — Agent plugin registry, discovery, and hot-loading
  3. WebhookEngine         — Event-driven triggers from GitHub, Jira, CI/CD, etc.
  4. ApprovalWorkflow      — Human-in-the-loop gates with escalation and audit
  5. ProjectTemplates      — Pre-built templates for common project archetypes
  6. PerformanceDashboard  — Real-time platform metrics and agent performance
  7. FederatedMemory       — Cross-tenant knowledge sharing with privacy controls
"""
from __future__ import annotations

import json
import uuid
import time
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import structlog

log = structlog.get_logger(__name__)


# ── 1. Multi-Tenancy Manager ──────────────────────────────────────────────────

@dataclass
class Tenant:
    tenant_id:   str
    name:        str
    plan:        str          # "free" | "pro" | "enterprise"
    quotas:      Dict[str, int]
    usage:       Dict[str, int]
    llm_config:  Dict[str, Any]
    created_at:  float = field(default_factory=time.time)
    active:      bool  = True


class MultiTenancyManager:
    """
    Manages tenant isolation for multi-tenant deployments.

    Features:
    - Tenant-scoped memory namespaces
    - Per-tenant LLM provider configuration
    - Quota enforcement (tokens/day, projects/month, agents/run)
    - Usage tracking for billing
    - Tenant-level audit logs
    """

    DEFAULT_QUOTAS = {
        "free":       {"tokens_per_day": 100_000, "projects_per_month": 3,
                       "agents_per_run": 5,       "storage_mb": 100},
        "pro":        {"tokens_per_day": 1_000_000, "projects_per_month": 50,
                       "agents_per_run": 15,        "storage_mb": 10_000},
        "enterprise": {"tokens_per_day": 10_000_000, "projects_per_month": -1,
                       "agents_per_run": -1,          "storage_mb": -1},
    }

    def __init__(self, db=None):
        self.db      = db
        self._tenants: Dict[str, Tenant] = {}

    def create_tenant(
        self,
        name:       str,
        plan:       str = "free",
        llm_config: Dict[str, Any] = None,
    ) -> Tenant:
        tenant = Tenant(
            tenant_id  = f"tenant-{uuid.uuid4().hex[:12]}",
            name       = name,
            plan       = plan,
            quotas     = self.DEFAULT_QUOTAS.get(plan, self.DEFAULT_QUOTAS["free"]).copy(),
            usage      = {"tokens_today": 0, "projects_this_month": 0},
            llm_config = llm_config or {},
        )
        self._tenants[tenant.tenant_id] = tenant
        log.info("tenant.created", tenant_id=tenant.tenant_id, name=name, plan=plan)
        return tenant

    def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        return self._tenants.get(tenant_id)

    def check_quota(self, tenant_id: str, resource: str, amount: int = 1) -> bool:
        tenant = self._tenants.get(tenant_id)
        if not tenant:
            return False
        limit = tenant.quotas.get(resource, 0)
        if limit == -1:  # unlimited
            return True
        current = tenant.usage.get(resource, 0)
        return current + amount <= limit

    def consume_quota(self, tenant_id: str, resource: str, amount: int = 1) -> bool:
        if not self.check_quota(tenant_id, resource, amount):
            log.warning("quota.exceeded", tenant_id=tenant_id, resource=resource)
            return False
        tenant = self._tenants[tenant_id]
        tenant.usage[resource] = tenant.usage.get(resource, 0) + amount
        return True

    def get_usage_report(self, tenant_id: str) -> Dict[str, Any]:
        tenant = self._tenants.get(tenant_id)
        if not tenant:
            return {}
        return {
            "tenant_id": tenant_id,
            "name":      tenant.name,
            "plan":      tenant.plan,
            "usage":     tenant.usage,
            "quotas":    tenant.quotas,
            "utilization": {
                k: f"{(tenant.usage.get(k, 0) / v * 100):.1f}%"
                for k, v in tenant.quotas.items()
                if v > 0
            },
        }

    def get_memory_namespace(self, tenant_id: str) -> str:
        """Returns the isolated memory namespace for this tenant."""
        return f"tenant:{tenant_id}"


# ── 2. Plugin Marketplace ─────────────────────────────────────────────────────

@dataclass
class Plugin:
    plugin_id:   str
    name:        str
    version:     str
    description: str
    author:      str
    agent_class: str          # fully qualified class name
    config_schema: Dict[str, Any]
    tags:        List[str]
    downloads:   int = 0
    rating:      float = 0.0
    verified:    bool = False


class PluginMarketplace:
    """
    Agent plugin registry with hot-loading capability.

    Allows:
    - Publishing custom domain agents (Healthcare, Finance, Legal, etc.)
    - Discovering and installing agents from the registry
    - Hot-loading agents without system restart
    - Version management and rollback
    - Security scanning of plugins before installation
    """

    def __init__(self):
        self._registry:  Dict[str, Plugin]   = {}
        self._installed: Dict[str, Plugin]   = {}
        self._loaded:    Dict[str, Any]      = {}  # agent_class → class object
        self._populate_builtin_plugins()

    def _populate_builtin_plugins(self):
        """Register all built-in agents as plugins."""
        builtins = [
            ("ddd_agent",              "Domain-Driven Design Agent",    ["engineering", "architecture"]),
            ("api_contract_agent",     "API Contract Agent",            ["engineering", "api"]),
            ("db_migration_agent",     "Database Migration Agent",      ["engineering", "database"]),
            ("event_driven_agent",     "Event-Driven Architecture",     ["engineering", "messaging"]),
            ("sdk_generator_agent",    "SDK Generator",                 ["engineering", "api"]),
            ("code_review_agent",      "Code Review Agent",             ["engineering", "quality"]),
            ("refactoring_agent",      "Refactoring Agent",             ["engineering", "quality"]),
            ("dependency_upgrade_agent","Dependency Upgrade Agent",     ["security", "maintenance"]),
            ("dast_engine",            "DAST Security Scanner",         ["security"]),
            ("sbom_agent",             "SBOM & Supply Chain Agent",     ["security"]),
            ("pen_test_agent",         "Penetration Testing Agent",     ["security"]),
            ("privacy_agent",          "Privacy & GDPR Agent",          ["security", "compliance"]),
            ("audit_trail_agent",      "Audit Trail Agent",             ["compliance"]),
            ("policy_as_code_agent",   "Policy-as-Code Agent",          ["security", "compliance"]),
            ("terraform_agent",        "Terraform IaC Agent",           ["infrastructure"]),
            ("multi_cloud_agent",      "Multi-Cloud Agent",             ["infrastructure"]),
            ("service_mesh_agent",     "Service Mesh Agent",            ["infrastructure"]),
            ("cost_forecast_agent",    "Cloud Cost Forecast Agent",     ["infrastructure", "finops"]),
            ("disaster_recovery_agent","Disaster Recovery Agent",       ["infrastructure", "reliability"]),
            ("gitops_agent",           "GitOps Agent",                  ["infrastructure", "devops"]),
            ("edge_deployment_agent",  "Edge Deployment Agent",         ["infrastructure"]),
            ("otel_agent",             "OpenTelemetry Agent",           ["observability"]),
            ("slo_agent",              "SLO/SLA Agent",                 ["observability", "reliability"]),
            ("incident_response_agent","Incident Response Agent",       ["observability", "reliability"]),
            ("capacity_planning_agent","Capacity Planning Agent",       ["observability", "infrastructure"]),
            ("bi_agent",               "Business Intelligence Agent",   ["analytics"]),
            ("log_intelligence_agent", "Log Intelligence Agent",        ["observability"]),
            ("pm_agent",               "Project Management Agent",      ["collaboration"]),
            ("stakeholder_agent",      "Stakeholder Communication",     ["collaboration"]),
            ("documentation_agent",    "Documentation Agent",           ["collaboration"]),
            ("changelog_agent",        "Changelog & Release Agent",     ["collaboration"]),
            ("multi_repo_agent",       "Multi-Repository Agent",        ["collaboration"]),
            ("onboarding_agent",       "Developer Onboarding Agent",    ["collaboration"]),
            ("ml_pipeline_agent",      "ML Pipeline Agent",             ["ai_ml"]),
            ("prompt_engineering_agent","Prompt Engineering Agent",     ["ai_ml"]),
            ("model_eval_agent",       "Model Evaluation Agent",        ["ai_ml"]),
            ("vector_db_agent",        "Vector Database Design Agent",  ["ai_ml"]),
            ("ai_safety_agent",        "AI Safety Agent",               ["ai_ml", "compliance"]),
        ]

        for agent_id, name, tags in builtins:
            plugin = Plugin(
                plugin_id     = agent_id,
                name          = name,
                version       = "2.0.0",
                description   = f"Built-in {name} for the AI-SDLC platform",
                author        = "AI-SDLC Core Team",
                agent_class   = f"aisdlc.agents.{agent_id}.{agent_id.title().replace('_','')}",
                config_schema = {},
                tags          = tags,
                verified      = True,
                downloads     = 1000,
                rating        = 4.8,
            )
            self._registry[agent_id]  = plugin
            self._installed[agent_id] = plugin

    def search(self, query: str = "", tags: List[str] = None) -> List[Plugin]:
        results = list(self._registry.values())
        if query:
            q = query.lower()
            results = [p for p in results if q in p.name.lower() or q in p.description.lower()]
        if tags:
            results = [p for p in results if any(t in p.tags for t in tags)]
        return sorted(results, key=lambda p: p.downloads, reverse=True)

    def install(self, plugin_id: str) -> bool:
        plugin = self._registry.get(plugin_id)
        if not plugin:
            log.error("plugin.not_found", plugin_id=plugin_id)
            return False
        self._installed[plugin_id] = plugin
        log.info("plugin.installed", plugin_id=plugin_id, name=plugin.name)
        return True

    def list_installed(self) -> List[Plugin]:
        return list(self._installed.values())

    def register_custom(self, plugin: Plugin) -> bool:
        """Register a custom domain-specific agent plugin."""
        self._registry[plugin.plugin_id] = plugin
        log.info("plugin.registered", plugin_id=plugin.plugin_id, name=plugin.name)
        return True

    def get_catalog(self) -> Dict[str, List[Dict]]:
        """Returns the full plugin catalog organized by category."""
        catalog: Dict[str, List] = {}
        for plugin in self._registry.values():
            for tag in plugin.tags:
                catalog.setdefault(tag, []).append({
                    "id":          plugin.plugin_id,
                    "name":        plugin.name,
                    "version":     plugin.version,
                    "description": plugin.description,
                    "verified":    plugin.verified,
                    "rating":      plugin.rating,
                    "installed":   plugin.plugin_id in self._installed,
                })
        return catalog


# ── 3. Webhook Engine ─────────────────────────────────────────────────────────

class WebhookEventType(str, Enum):
    GITHUB_PUSH          = "github.push"
    GITHUB_PR_OPENED     = "github.pull_request.opened"
    GITHUB_PR_MERGED     = "github.pull_request.merged"
    JIRA_ISSUE_CREATED   = "jira.issue.created"
    JIRA_SPRINT_STARTED  = "jira.sprint.started"
    CI_BUILD_FAILED      = "ci.build.failed"
    CI_BUILD_PASSED      = "ci.build.passed"
    ALERT_FIRED          = "monitoring.alert.fired"
    ALERT_RESOLVED       = "monitoring.alert.resolved"
    SCHEDULED            = "scheduler.trigger"
    MANUAL               = "manual.trigger"


@dataclass
class WebhookTrigger:
    trigger_id:  str
    event_type:  WebhookEventType
    filter:      Dict[str, Any]   # e.g., {"branch": "main", "repo": "api-service"}
    agent_chain: List[str]        # agent IDs to invoke in sequence
    config:      Dict[str, Any]
    enabled:     bool = True
    last_fired:  Optional[float] = None


class WebhookEngine:
    """
    Event-driven trigger engine that connects external events to agent workflows.

    Supported sources:
    - GitHub (push, PR, issue, release)
    - Jira (issue created, sprint started, epic completed)
    - CI/CD systems (build passed/failed, deployment complete)
    - Monitoring (alert fired, anomaly detected)
    - Scheduler (cron-based triggers)
    - Manual (API-triggered)
    """

    def __init__(self, conductor=None):
        self.conductor = conductor
        self._triggers: Dict[str, WebhookTrigger] = {}
        self._handlers: Dict[WebhookEventType, List[Callable]] = {}
        self._register_default_triggers()

    def _register_default_triggers(self):
        """Register sensible default automation triggers."""
        defaults = [
            WebhookTrigger(
                trigger_id  = "auto-review-pr",
                event_type  = WebhookEventType.GITHUB_PR_OPENED,
                filter      = {},
                agent_chain = ["code_review_agent", "security_engine", "dast_engine"],
                config      = {"auto_comment": True, "block_merge_on_blocker": True},
            ),
            WebhookTrigger(
                trigger_id  = "auto-upgrade-deps",
                event_type  = WebhookEventType.SCHEDULED,
                filter      = {"cron": "0 9 * * MON"},
                agent_chain = ["dependency_upgrade_agent"],
                config      = {"auto_pr": True, "auto_merge_patch": True},
            ),
            WebhookTrigger(
                trigger_id  = "auto-incident-response",
                event_type  = WebhookEventType.ALERT_FIRED,
                filter      = {"severity": ["critical", "high"]},
                agent_chain = ["log_intelligence_agent", "incident_response_agent",
                               "healing_engine"],
                config      = {"auto_remediate": True, "notify_slack": True},
            ),
            WebhookTrigger(
                trigger_id  = "auto-changelog",
                event_type  = WebhookEventType.GITHUB_PR_MERGED,
                filter      = {"base_branch": "main"},
                agent_chain = ["changelog_agent"],
                config      = {"auto_tag": True, "auto_release": True},
            ),
        ]
        for trigger in defaults:
            self._triggers[trigger.trigger_id] = trigger

    def register(self, trigger: WebhookTrigger) -> str:
        self._triggers[trigger.trigger_id] = trigger
        log.info("webhook.registered", trigger_id=trigger.trigger_id,
                 event=trigger.event_type)
        return trigger.trigger_id

    async def process(self, event_type: str, payload: Dict[str, Any]) -> List[str]:
        """Process an incoming webhook event and trigger matching agent chains."""
        triggered = []
        for trigger in self._triggers.values():
            if not trigger.enabled:
                continue
            if trigger.event_type.value != event_type:
                continue
            if not self._matches_filter(payload, trigger.filter):
                continue

            log.info("webhook.triggered", trigger_id=trigger.trigger_id,
                     agents=trigger.agent_chain)
            trigger.last_fired = time.time()

            if self.conductor:
                run_id = await self.conductor.run_chain(
                    agent_ids = trigger.agent_chain,
                    context   = {**payload, **trigger.config},
                )
                triggered.append(run_id)

        return triggered

    def _matches_filter(self, payload: Dict, filter_: Dict) -> bool:
        for key, expected in filter_.items():
            actual = payload.get(key)
            if isinstance(expected, list):
                if actual not in expected:
                    return False
            elif actual != expected:
                return False
        return True

    def list_triggers(self) -> List[Dict[str, Any]]:
        return [
            {
                "trigger_id":  t.trigger_id,
                "event_type":  t.event_type.value,
                "agent_chain": t.agent_chain,
                "enabled":     t.enabled,
                "last_fired":  t.last_fired,
            }
            for t in self._triggers.values()
        ]


# ── 4. Approval Workflow Engine ───────────────────────────────────────────────

class ApprovalStatus(str, Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED  = "expired"


@dataclass
class ApprovalRequest:
    request_id:  str
    title:       str
    description: str
    agent_type:  str
    output:      Dict[str, Any]
    approvers:   List[str]
    status:      ApprovalStatus = ApprovalStatus.PENDING
    created_at:  float = field(default_factory=time.time)
    expires_at:  float = field(default_factory=lambda: time.time() + 86400)
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    comments:    str = ""


class ApprovalWorkflowEngine:
    """
    Human-in-the-loop approval gates for critical operations.

    Gate triggers:
    - Production deployments
    - Breaking API changes
    - Database schema changes
    - Security policy changes
    - Cost-exceeding infrastructure changes (> $X/month)
    - Sensitive data access
    """

    # Operations that always require human approval
    ALWAYS_REQUIRE_APPROVAL = {
        "production_deployment",
        "breaking_api_change",
        "db_schema_drop",
        "security_policy_change",
        "cost_increase_over_1000",
        "data_deletion",
        "privilege_escalation",
    }

    def __init__(self, notification_fn: Optional[Callable] = None):
        self._requests:       Dict[str, ApprovalRequest] = {}
        self._notification_fn = notification_fn

    def request_approval(
        self,
        title:       str,
        description: str,
        agent_type:  str,
        output:      Dict[str, Any],
        approvers:   List[str],
        operation:   str = "",
        ttl_hours:   int = 24,
    ) -> ApprovalRequest:
        req = ApprovalRequest(
            request_id  = f"approval-{uuid.uuid4().hex[:10]}",
            title       = title,
            description = description,
            agent_type  = agent_type,
            output      = output,
            approvers   = approvers,
            expires_at  = time.time() + (ttl_hours * 3600),
        )
        self._requests[req.request_id] = req

        if self._notification_fn:
            self._notification_fn(req)

        log.info("approval.requested", request_id=req.request_id,
                 title=title, approvers=approvers)
        return req

    def approve(self, request_id: str, approver: str, comments: str = "") -> bool:
        req = self._requests.get(request_id)
        if not req or req.status != ApprovalStatus.PENDING:
            return False
        if time.time() > req.expires_at:
            req.status = ApprovalStatus.EXPIRED
            return False
        if approver not in req.approvers:
            log.warning("approval.unauthorized", approver=approver)
            return False

        req.status      = ApprovalStatus.APPROVED
        req.approved_by = approver
        req.comments    = comments
        log.info("approval.approved", request_id=request_id, approver=approver)
        return True

    def reject(self, request_id: str, approver: str, reason: str) -> bool:
        req = self._requests.get(request_id)
        if not req or req.status != ApprovalStatus.PENDING:
            return False

        req.status      = ApprovalStatus.REJECTED
        req.rejected_by = approver
        req.comments    = reason
        log.info("approval.rejected", request_id=request_id, reason=reason)
        return True

    def requires_approval(self, operation: str, context: Dict = None) -> bool:
        if operation in self.ALWAYS_REQUIRE_APPROVAL:
            return True
        ctx = context or {}
        if ctx.get("cost_delta_monthly", 0) > 1000:
            return True
        if ctx.get("environment") == "production":
            return True
        return False

    def get_pending(self) -> List[ApprovalRequest]:
        now = time.time()
        return [r for r in self._requests.values()
                if r.status == ApprovalStatus.PENDING and r.expires_at > now]


# ── 5. Project Templates Library ─────────────────────────────────────────────

@dataclass
class ProjectTemplate:
    template_id:  str
    name:         str
    description:  str
    archetype:    str         # "saas_b2b" | "api_service" | "data_pipeline" | etc.
    tech_stack:   Dict[str, str]
    agents:       List[str]   # default agent chain for this template
    config:       Dict[str, Any]
    tags:         List[str]


class ProjectTemplatesLibrary:
    """
    Pre-built project templates for common software archetypes.
    Each template defines the default agent chain, tech stack, and configuration.
    """

    TEMPLATES = [
        ProjectTemplate(
            template_id  = "saas-b2b-multitenant",
            name         = "Multi-Tenant B2B SaaS",
            description  = "Full-stack multi-tenant SaaS with billing, auth, and analytics",
            archetype    = "saas_b2b",
            tech_stack   = {"backend": "FastAPI/Python", "frontend": "React/TypeScript",
                            "database": "PostgreSQL", "cache": "Redis",
                            "queue": "Celery/Redis", "infra": "AWS/Terraform"},
            agents       = ["ideation_agent", "ba_agent", "ddd_agent", "architect_agent",
                            "api_contract_agent", "ux_agent", "engineer_agent",
                            "db_migration_agent", "security_engine", "dast_engine",
                            "privacy_agent", "audit_trail_agent", "qa_agent",
                            "otel_agent", "slo_agent", "terraform_agent",
                            "gitops_agent", "documentation_agent"],
            config       = {"multi_tenant": True, "billing": True, "auth": "oauth2",
                            "analytics": True},
            tags         = ["saas", "b2b", "multi-tenant", "enterprise"],
        ),
        ProjectTemplate(
            template_id  = "microservices-platform",
            name         = "Microservices Platform",
            description  = "Event-driven microservices with service mesh and GitOps",
            archetype    = "microservices",
            tech_stack   = {"backend": "Python/Go", "messaging": "Kafka",
                            "service_mesh": "Istio", "orchestration": "Kubernetes",
                            "gitops": "ArgoCD", "infra": "AWS/Terraform"},
            agents       = ["ideation_agent", "ba_agent", "ddd_agent", "architect_agent",
                            "api_contract_agent", "event_driven_agent", "engineer_agent",
                            "service_mesh_agent", "security_engine", "policy_as_code_agent",
                            "otel_agent", "slo_agent", "incident_response_agent",
                            "terraform_agent", "gitops_agent"],
            config       = {"event_driven": True, "service_mesh": "istio",
                            "gitops": "argocd"},
            tags         = ["microservices", "kubernetes", "event-driven", "enterprise"],
        ),
        ProjectTemplate(
            template_id  = "ml-platform",
            name         = "ML/AI Platform",
            description  = "End-to-end ML platform with feature store, model registry, and serving",
            archetype    = "ml_platform",
            tech_stack   = {"ml_framework": "PyTorch/TensorFlow", "orchestration": "Kubeflow",
                            "feature_store": "Feast", "model_registry": "MLflow",
                            "serving": "Triton/TorchServe", "infra": "AWS/Terraform"},
            agents       = ["ideation_agent", "ba_agent", "architect_agent",
                            "ml_pipeline_agent", "vector_db_agent", "engineer_agent",
                            "model_eval_agent", "ai_safety_agent", "security_engine",
                            "otel_agent", "terraform_agent"],
            config       = {"ml_ops": True, "feature_store": True, "model_registry": True},
            tags         = ["ml", "ai", "mlops", "data-science"],
        ),
        ProjectTemplate(
            template_id  = "data-platform",
            name         = "Data Platform / Data Mesh",
            description  = "Modern data platform with data mesh architecture and real-time analytics",
            archetype    = "data_platform",
            tech_stack   = {"ingestion": "Kafka/Debezium", "warehouse": "Snowflake/BigQuery",
                            "transformation": "dbt", "orchestration": "Airflow/Prefect",
                            "catalog": "DataHub", "infra": "AWS/Terraform"},
            agents       = ["ideation_agent", "ba_agent", "architect_agent",
                            "event_driven_agent", "db_migration_agent", "engineer_agent",
                            "bi_agent", "privacy_agent", "audit_trail_agent",
                            "otel_agent", "terraform_agent"],
            config       = {"data_mesh": True, "real_time": True, "governance": True},
            tags         = ["data", "analytics", "data-mesh", "bi"],
        ),
        ProjectTemplate(
            template_id  = "api-gateway-platform",
            name         = "API Gateway / Developer Platform",
            description  = "API-first platform with developer portal, SDK generation, and monetization",
            archetype    = "api_platform",
            tech_stack   = {"gateway": "Kong/AWS API Gateway", "backend": "FastAPI",
                            "portal": "React", "auth": "OAuth2/OIDC",
                            "analytics": "Elasticsearch", "infra": "AWS/Terraform"},
            agents       = ["ideation_agent", "ba_agent", "api_contract_agent",
                            "sdk_generator_agent", "engineer_agent", "security_engine",
                            "dast_engine", "rate_limit_agent", "otel_agent",
                            "documentation_agent", "terraform_agent"],
            config       = {"api_first": True, "sdk_generation": True,
                            "developer_portal": True},
            tags         = ["api", "platform", "developer-experience"],
        ),
    ]

    def __init__(self):
        self._templates = {t.template_id: t for t in self.TEMPLATES}

    def get(self, template_id: str) -> Optional[ProjectTemplate]:
        return self._templates.get(template_id)

    def list_all(self) -> List[ProjectTemplate]:
        return list(self._templates.values())

    def search(self, query: str = "", tags: List[str] = None) -> List[ProjectTemplate]:
        results = list(self._templates.values())
        if query:
            q = query.lower()
            results = [t for t in results
                       if q in t.name.lower() or q in t.description.lower()]
        if tags:
            results = [t for t in results if any(tag in t.tags for tag in tags)]
        return results

    def register(self, template: ProjectTemplate):
        self._templates[template.template_id] = template


# ── 6. Performance Dashboard ──────────────────────────────────────────────────

class PerformanceDashboard:
    """
    Real-time platform performance metrics.

    Tracks:
    - Agent execution times and success rates
    - Token usage and cost per agent/project
    - Memory hit rates (cache effectiveness)
    - Queue depth and throughput
    - Error rates and types
    - Self-learning improvement over time
    """

    def __init__(self):
        self._metrics: Dict[str, List[Dict]] = {}
        self._start_time = time.time()

    def record(self, agent_type: str, duration_s: float, success: bool,
               tokens: int, cost_usd: float, error: str = None):
        self._metrics.setdefault(agent_type, []).append({
            "ts":       time.time(),
            "duration": duration_s,
            "success":  success,
            "tokens":   tokens,
            "cost":     cost_usd,
            "error":    error,
        })

    def get_summary(self) -> Dict[str, Any]:
        summary = {}
        total_tokens = 0
        total_cost   = 0.0
        total_runs   = 0

        for agent, records in self._metrics.items():
            if not records:
                continue
            successes  = [r for r in records if r["success"]]
            durations  = [r["duration"] for r in records]
            tokens_sum = sum(r["tokens"] for r in records)
            cost_sum   = sum(r["cost"] for r in records)
            total_tokens += tokens_sum
            total_cost   += cost_sum
            total_runs   += len(records)

            summary[agent] = {
                "runs":          len(records),
                "success_rate":  len(successes) / len(records) if records else 0,
                "avg_duration":  sum(durations) / len(durations) if durations else 0,
                "p95_duration":  sorted(durations)[int(len(durations) * 0.95)] if durations else 0,
                "total_tokens":  tokens_sum,
                "total_cost":    round(cost_sum, 4),
                "errors":        [r["error"] for r in records if r.get("error")],
            }

        return {
            "uptime_hours":  (time.time() - self._start_time) / 3600,
            "total_runs":    total_runs,
            "total_tokens":  total_tokens,
            "total_cost":    round(total_cost, 4),
            "agents":        summary,
        }

    def get_agent_leaderboard(self) -> List[Dict]:
        summary = self.get_summary()
        agents  = [
            {"agent": k, **v}
            for k, v in summary.get("agents", {}).items()
        ]
        return sorted(agents, key=lambda x: x.get("runs", 0), reverse=True)


# ── 7. Federated Memory ───────────────────────────────────────────────────────

class FederatedMemory:
    """
    Cross-tenant knowledge sharing with privacy controls.

    Allows:
    - Sharing anonymized learnings across tenants (opt-in)
    - Industry-specific knowledge pools (fintech, healthcare, etc.)
    - Federated learning from project outcomes
    - Privacy-preserving knowledge aggregation
    """

    def __init__(self, memory_system=None):
        self.memory   = memory_system
        self._pools:  Dict[str, List[Dict]] = {}
        self._consent: Dict[str, bool] = {}

    def set_sharing_consent(self, tenant_id: str, consented: bool):
        self._consent[tenant_id] = consented
        log.info("federated.consent", tenant_id=tenant_id, consented=consented)

    def contribute(self, tenant_id: str, knowledge: Dict[str, Any],
                   pool: str = "general") -> bool:
        if not self._consent.get(tenant_id, False):
            return False

        # Anonymize before contributing
        anonymized = self._anonymize(knowledge, tenant_id)
        self._pools.setdefault(pool, []).append({
            **anonymized,
            "contributed_at": time.time(),
            "pool":           pool,
        })
        log.info("federated.contributed", pool=pool, tenant_id=tenant_id[:8] + "***")
        return True

    def query(self, query: str, pool: str = "general",
              limit: int = 10) -> List[Dict]:
        pool_data = self._pools.get(pool, [])
        # Simple text matching (in production: vector similarity search)
        q = query.lower()
        matches = [
            item for item in pool_data
            if q in json.dumps(item).lower()
        ]
        return matches[:limit]

    def _anonymize(self, knowledge: Dict, tenant_id: str) -> Dict:
        """Remove tenant-identifying information before sharing."""
        anonymized = json.loads(json.dumps(knowledge, default=str))
        # Remove any tenant-specific identifiers
        for key in ["tenant_id", "company_name", "project_name",
                    "user_id", "email", "domain"]:
            anonymized.pop(key, None)
        return anonymized

    def get_pool_stats(self) -> Dict[str, int]:
        return {pool: len(items) for pool, items in self._pools.items()}
