"""
Master Agent Registry
======================
Central registry for all 50+ AI-SDLC agents.
Provides discovery, instantiation, and routing for the Conductor.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Type

import structlog

log = structlog.get_logger(__name__)

# ── Agent catalog ─────────────────────────────────────────────────────────────

AGENT_CATALOG: Dict[str, Dict[str, Any]] = {

    # ── Core SDLC Agents ──────────────────────────────────────────────────────
    "ideation_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "IdeationAgent",
        "phase":       "ideation",
        "description": "Expands raw idea into product vision, market analysis, success metrics",
        "tags":        ["sdlc", "ideation"],
    },
    "ba_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "BAAgent",
        "phase":       "requirements",
        "description": "Full PRD with epics, user stories, acceptance criteria",
        "tags":        ["sdlc", "requirements"],
    },
    "architect_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "ArchitectAgent",
        "phase":       "architecture",
        "description": "System design, ADRs, tech stack, component diagrams",
        "tags":        ["sdlc", "architecture"],
    },
    "ux_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "UXAgent",
        "phase":       "design",
        "description": "UX research, wireframes, design system, accessibility",
        "tags":        ["sdlc", "design"],
    },
    "engineer_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "EngineerAgent",
        "phase":       "implementation",
        "description": "Full production code with NoOps patterns baked in",
        "tags":        ["sdlc", "engineering"],
    },
    "data_engineer_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "DataEngineerAgent",
        "phase":       "implementation",
        "description": "Data models, pipelines, migrations, and analytics",
        "tags":        ["sdlc", "data"],
    },
    "qa_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "QAAgent",
        "phase":       "testing",
        "description": "Test strategy, unit/integration/e2e tests, coverage",
        "tags":        ["sdlc", "testing"],
    },
    "security_engine": {
        "module":      "aisdlc.security.security_engine",
        "class":       "SecurityEngine",
        "phase":       "security",
        "description": "SAST scanner, secrets detector, zero-trust policy generator",
        "tags":        ["sdlc", "security"],
    },
    "devops_agent": {
        "module":      "aisdlc.agents.all_agents",
        "class":       "DevOpsAgent",
        "phase":       "deployment",
        "description": "CI/CD pipelines, Docker, Kubernetes, monitoring setup",
        "tags":        ["sdlc", "devops"],
    },
    "healing_engine": {
        "module":      "aisdlc.noops.healing_engine",
        "class":       "HealingEngine",
        "phase":       "operations",
        "description": "Self-healing, auto-remediation, circuit breakers, chaos probes",
        "tags":        ["sdlc", "noops", "reliability"],
    },

    # ── Intelligence Layer ────────────────────────────────────────────────────
    "debate_engine": {
        "module":      "aisdlc.intelligence.debate_engine",
        "class":       "DebateEngine",
        "phase":       "architecture",
        "description": "Multi-agent debate for critical architectural decisions",
        "tags":        ["intelligence", "architecture"],
    },
    "adversarial_agent": {
        "module":      "aisdlc.intelligence.reasoning_engine",
        "class":       "AdversarialAgent",
        "phase":       "review",
        "description": "Devil's advocate — breaks designs before code is written",
        "tags":        ["intelligence", "quality"],
    },
    "confidence_scorer": {
        "module":      "aisdlc.intelligence.reasoning_engine",
        "class":       "ConfidenceScorer",
        "phase":       "review",
        "description": "Scores agent outputs; low-confidence triggers human review",
        "tags":        ["intelligence", "quality"],
    },
    "reasoning_trace_store": {
        "module":      "aisdlc.intelligence.reasoning_engine",
        "class":       "ReasoningTraceStore",
        "phase":       "all",
        "description": "Stores full chain-of-thought for every agent decision",
        "tags":        ["intelligence", "audit"],
    },
    "long_horizon_planner": {
        "module":      "aisdlc.intelligence.debate_engine",
        "class":       "LongHorizonPlanner",
        "phase":       "ideation",
        "description": "12-24 month product roadmap planning",
        "tags":        ["intelligence", "planning"],
    },

    # ── Engineering Depth ─────────────────────────────────────────────────────
    "ddd_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "DDDAgent",
        "phase":       "architecture",
        "description": "Domain-Driven Design: bounded contexts, aggregates, ubiquitous language",
        "tags":        ["engineering", "architecture"],
    },
    "api_contract_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "APIContractAgent",
        "phase":       "design",
        "description": "OpenAPI specs, contract testing, breaking change detection",
        "tags":        ["engineering", "api"],
    },
    "db_migration_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "DBMigrationAgent",
        "phase":       "implementation",
        "description": "Safe database migrations with rollback, zero-downtime strategies",
        "tags":        ["engineering", "database"],
    },
    "event_driven_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "EventDrivenAgent",
        "phase":       "architecture",
        "description": "Event-driven architecture, Kafka/RabbitMQ, event sourcing, CQRS",
        "tags":        ["engineering", "messaging"],
    },
    "sdk_generator_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "SDKGeneratorAgent",
        "phase":       "implementation",
        "description": "Auto-generates client SDKs from OpenAPI specs",
        "tags":        ["engineering", "api"],
    },
    "code_review_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "CodeReviewAgent",
        "phase":       "review",
        "description": "Automated code review: bugs, performance, security, style",
        "tags":        ["engineering", "quality"],
    },
    "refactoring_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "RefactoringAgent",
        "phase":       "maintenance",
        "description": "Identifies and executes safe refactoring opportunities",
        "tags":        ["engineering", "quality"],
    },
    "dependency_upgrade_agent": {
        "module":      "aisdlc.agents.engineering_agents",
        "class":       "DependencyUpgradeAgent",
        "phase":       "maintenance",
        "description": "Automated dependency upgrades with compatibility testing",
        "tags":        ["engineering", "security", "maintenance"],
    },

    # ── Security Depth ────────────────────────────────────────────────────────
    "dast_engine": {
        "module":      "aisdlc.security.advanced_security",
        "class":       "DASTEngine",
        "phase":       "security",
        "description": "Dynamic application security testing (runtime scanning)",
        "tags":        ["security"],
    },
    "sbom_agent": {
        "module":      "aisdlc.security.advanced_security",
        "class":       "SBOMAgent",
        "phase":       "security",
        "description": "Software Bill of Materials and supply chain security",
        "tags":        ["security", "compliance"],
    },
    "pen_test_agent": {
        "module":      "aisdlc.security.advanced_security",
        "class":       "PenTestAgent",
        "phase":       "security",
        "description": "Automated penetration testing scenarios and exploit simulation",
        "tags":        ["security"],
    },
    "privacy_agent": {
        "module":      "aisdlc.security.advanced_security",
        "class":       "PrivacyAgent",
        "phase":       "security",
        "description": "GDPR/CCPA compliance, PII detection, data minimization",
        "tags":        ["security", "compliance"],
    },
    "audit_trail_agent": {
        "module":      "aisdlc.security.advanced_security",
        "class":       "AuditTrailAgent",
        "phase":       "security",
        "description": "Immutable audit logging, compliance reporting",
        "tags":        ["security", "compliance"],
    },
    "policy_as_code_agent": {
        "module":      "aisdlc.security.advanced_security",
        "class":       "PolicyAsCodeAgent",
        "phase":       "security",
        "description": "OPA/Rego policies for zero-trust enforcement",
        "tags":        ["security", "compliance"],
    },

    # ── Infrastructure ────────────────────────────────────────────────────────
    "terraform_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "TerraformAgent",
        "phase":       "infrastructure",
        "description": "Terraform/Pulumi IaC generation for multi-cloud",
        "tags":        ["infrastructure"],
    },
    "multi_cloud_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "MultiCloudAgent",
        "phase":       "infrastructure",
        "description": "Multi-cloud strategy, portability, cost optimization",
        "tags":        ["infrastructure"],
    },
    "service_mesh_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "ServiceMeshAgent",
        "phase":       "infrastructure",
        "description": "Istio/Linkerd service mesh configuration",
        "tags":        ["infrastructure", "networking"],
    },
    "cost_forecast_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "CostForecastAgent",
        "phase":       "infrastructure",
        "description": "Cloud cost forecasting and FinOps optimization",
        "tags":        ["infrastructure", "finops"],
    },
    "disaster_recovery_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "DisasterRecoveryAgent",
        "phase":       "infrastructure",
        "description": "DR strategy, RTO/RPO planning, failover automation",
        "tags":        ["infrastructure", "reliability"],
    },
    "gitops_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "GitOpsAgent",
        "phase":       "deployment",
        "description": "ArgoCD/Flux GitOps pipelines for continuous delivery",
        "tags":        ["infrastructure", "devops"],
    },
    "edge_deployment_agent": {
        "module":      "aisdlc.infrastructure.infra_agents",
        "class":       "EdgeDeploymentAgent",
        "phase":       "deployment",
        "description": "Edge computing deployment (CDN, edge functions, IoT)",
        "tags":        ["infrastructure"],
    },

    # ── Observability ─────────────────────────────────────────────────────────
    "otel_agent": {
        "module":      "aisdlc.observability.observability_suite",
        "class":       "OTelAgent",
        "phase":       "implementation",
        "description": "OpenTelemetry instrumentation code generator",
        "tags":        ["observability"],
    },
    "slo_agent": {
        "module":      "aisdlc.observability.observability_suite",
        "class":       "SLOAgent",
        "phase":       "operations",
        "description": "SLO/SLA definition, error budgets, burn rate alerts",
        "tags":        ["observability", "reliability"],
    },
    "incident_response_agent": {
        "module":      "aisdlc.observability.observability_suite",
        "class":       "IncidentResponseAgent",
        "phase":       "operations",
        "description": "Autonomous incident detection, diagnosis, and remediation",
        "tags":        ["observability", "reliability"],
    },
    "capacity_planning_agent": {
        "module":      "aisdlc.observability.observability_suite",
        "class":       "CapacityPlanningAgent",
        "phase":       "operations",
        "description": "Predictive capacity planning with ML-based forecasting",
        "tags":        ["observability", "infrastructure"],
    },
    "bi_agent": {
        "module":      "aisdlc.observability.observability_suite",
        "class":       "BIAgent",
        "phase":       "operations",
        "description": "Business intelligence dashboards and KPI tracking",
        "tags":        ["observability", "analytics"],
    },
    "log_intelligence_agent": {
        "module":      "aisdlc.observability.observability_suite",
        "class":       "LogIntelligenceAgent",
        "phase":       "operations",
        "description": "Log anomaly detection, pattern extraction, root cause analysis",
        "tags":        ["observability"],
    },

    # ── Collaboration ─────────────────────────────────────────────────────────
    "pm_agent": {
        "module":      "aisdlc.collaboration.collaboration_agents",
        "class":       "PMAgent",
        "phase":       "planning",
        "description": "Sprint planning, backlog grooming, velocity tracking",
        "tags":        ["collaboration", "planning"],
    },
    "stakeholder_agent": {
        "module":      "aisdlc.collaboration.collaboration_agents",
        "class":       "StakeholderAgent",
        "phase":       "planning",
        "description": "Automated status reports, executive summaries",
        "tags":        ["collaboration"],
    },
    "documentation_agent": {
        "module":      "aisdlc.collaboration.collaboration_agents",
        "class":       "DocumentationAgent",
        "phase":       "documentation",
        "description": "Auto-generated docs: API, architecture, runbooks, ADRs",
        "tags":        ["collaboration", "documentation"],
    },
    "changelog_agent": {
        "module":      "aisdlc.collaboration.collaboration_agents",
        "class":       "ChangelogAgent",
        "phase":       "release",
        "description": "Semantic versioning, CHANGELOG.md, release notes",
        "tags":        ["collaboration", "release"],
    },
    "multi_repo_agent": {
        "module":      "aisdlc.collaboration.collaboration_agents",
        "class":       "MultiRepoAgent",
        "phase":       "planning",
        "description": "Cross-repository dependency management and coordination",
        "tags":        ["collaboration"],
    },
    "onboarding_agent": {
        "module":      "aisdlc.collaboration.collaboration_agents",
        "class":       "OnboardingAgent",
        "phase":       "documentation",
        "description": "Developer onboarding guides, environment setup, tutorials",
        "tags":        ["collaboration", "documentation"],
    },

    # ── AI/ML Native ──────────────────────────────────────────────────────────
    "ml_pipeline_agent": {
        "module":      "aisdlc.aiml.aiml_agents",
        "class":       "MLPipelineAgent",
        "phase":       "implementation",
        "description": "End-to-end ML pipeline: data → training → serving → monitoring",
        "tags":        ["ai_ml"],
    },
    "prompt_engineering_agent": {
        "module":      "aisdlc.aiml.aiml_agents",
        "class":       "PromptEngineeringAgent",
        "phase":       "implementation",
        "description": "System prompt design, few-shot examples, chain-of-thought",
        "tags":        ["ai_ml"],
    },
    "model_eval_agent": {
        "module":      "aisdlc.aiml.aiml_agents",
        "class":       "ModelEvalAgent",
        "phase":       "testing",
        "description": "LLM/ML model evaluation framework and benchmarking",
        "tags":        ["ai_ml", "testing"],
    },
    "vector_db_agent": {
        "module":      "aisdlc.aiml.aiml_agents",
        "class":       "VectorDBAgent",
        "phase":       "architecture",
        "description": "Vector database design, embedding strategies, RAG architecture",
        "tags":        ["ai_ml", "architecture"],
    },
    "ai_safety_agent": {
        "module":      "aisdlc.aiml.aiml_agents",
        "class":       "AISafetyAgent",
        "phase":       "testing",
        "description": "Bias detection, fairness testing, safety guardrails, red-teaming",
        "tags":        ["ai_ml", "security", "compliance"],
    },
}


# ── Default SDLC Pipeline (full end-to-end) ───────────────────────────────────

FULL_SDLC_PIPELINE = [
    # Phase 1: Ideation & Planning
    "ideation_agent",
    "long_horizon_planner",
    "ba_agent",
    "pm_agent",

    # Phase 2: Architecture & Design
    "ddd_agent",
    "architect_agent",
    "debate_engine",          # debate key architectural decisions
    "adversarial_agent",      # challenge the architecture
    "api_contract_agent",
    "event_driven_agent",
    "ux_agent",

    # Phase 3: Implementation
    "engineer_agent",
    "data_engineer_agent",
    "db_migration_agent",
    "otel_agent",             # instrument while building

    # Phase 4: Testing & Quality
    "qa_agent",
    "code_review_agent",
    "model_eval_agent",       # if AI features present

    # Phase 5: Security
    "security_engine",
    "dast_engine",
    "sbom_agent",
    "pen_test_agent",
    "privacy_agent",
    "policy_as_code_agent",
    "ai_safety_agent",        # if AI features present

    # Phase 6: Infrastructure
    "terraform_agent",
    "service_mesh_agent",
    "disaster_recovery_agent",
    "gitops_agent",

    # Phase 7: Observability
    "slo_agent",
    "capacity_planning_agent",
    "log_intelligence_agent",

    # Phase 8: NoOps
    "healing_engine",

    # Phase 9: Documentation & Release
    "documentation_agent",
    "onboarding_agent",
    "changelog_agent",
    "stakeholder_agent",
]


# ── Registry class ────────────────────────────────────────────────────────────

class AgentRegistry:
    """Central registry for all AI-SDLC agents."""

    def __init__(self):
        self._catalog = AGENT_CATALOG
        self._instances: Dict[str, Any] = {}

    def get_class(self, agent_id: str) -> Optional[Type]:
        """Dynamically import and return the agent class."""
        entry = self._catalog.get(agent_id)
        if not entry:
            log.error("agent.not_found", agent_id=agent_id)
            return None
        try:
            import importlib
            mod = importlib.import_module(entry["module"])
            return getattr(mod, entry["class"])
        except (ImportError, AttributeError) as e:
            log.error("agent.import_failed", agent_id=agent_id, error=str(e))
            return None

    def instantiate(self, agent_id: str, llm_gateway=None,
                    memory_system=None, **kwargs) -> Optional[Any]:
        """Instantiate an agent by ID."""
        cls = self.get_class(agent_id)
        if not cls:
            return None
        try:
            instance = cls(llm_gateway=llm_gateway,
                           memory_system=memory_system, **kwargs)
            self._instances[agent_id] = instance
            return instance
        except Exception as e:
            log.error("agent.instantiate_failed", agent_id=agent_id, error=str(e))
            return None

    def list_agents(self, tags: List[str] = None,
                    phase: str = None) -> List[Dict[str, Any]]:
        """List agents with optional filtering."""
        results = []
        for agent_id, meta in self._catalog.items():
            if tags and not any(t in meta.get("tags", []) for t in tags):
                continue
            if phase and meta.get("phase") != phase:
                continue
            results.append({"id": agent_id, **meta})
        return results

    def get_pipeline(self, template: str = "full") -> List[str]:
        """Get a pre-built agent pipeline."""
        pipelines = {
            "full":       FULL_SDLC_PIPELINE,
            "security":   ["security_engine", "dast_engine", "sbom_agent",
                           "pen_test_agent", "privacy_agent", "policy_as_code_agent"],
            "infra":      ["terraform_agent", "service_mesh_agent",
                           "disaster_recovery_agent", "gitops_agent"],
            "observability": ["otel_agent", "slo_agent", "incident_response_agent",
                              "capacity_planning_agent", "log_intelligence_agent"],
            "ai_ml":      ["ml_pipeline_agent", "prompt_engineering_agent",
                           "model_eval_agent", "vector_db_agent", "ai_safety_agent"],
            "review":     ["code_review_agent", "adversarial_agent",
                           "confidence_scorer", "security_engine"],
        }
        return pipelines.get(template, FULL_SDLC_PIPELINE)

    @property
    def total_agents(self) -> int:
        return len(self._catalog)


# Singleton
registry = AgentRegistry()
