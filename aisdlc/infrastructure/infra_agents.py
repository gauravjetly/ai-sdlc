"""
Infrastructure Agents
======================
Seven infrastructure-as-code and platform engineering agents:

  1. TerraformAgent      — Production-grade Terraform modules for AWS/Azure/GCP
  2. MultiCloudAgent     — Equivalent IaC across all three major clouds
  3. ServiceMeshAgent    — Istio/Linkerd configuration with traffic policies
  4. CostForecastAgent   — Pre-provisioning cloud cost estimation
  5. DisasterRecoveryAgent — RTO/RPO design, backup strategies, failover runbooks
  6. GitOpsAgent         — ArgoCD/Flux with sync policies and drift detection
  7. EdgeDeploymentAgent — Cloudflare Workers, Lambda@Edge, K8s edge configs
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

from aisdlc.core.base_agent import BaseAgent, AgentResult

log = structlog.get_logger(__name__)


# ── 1. Terraform Agent ────────────────────────────────────────────────────────

class TerraformAgent(BaseAgent):
    """
    Generates production-grade Terraform IaC:
    - Modular structure (modules/, environments/)
    - Remote state (S3 + DynamoDB locking)
    - Workspace-based environment management
    - Drift detection configuration
    - Sentinel/OPA policy integration
    - Complete variable validation
    """

    AGENT_TYPE    = "terraform_agent"
    SYSTEM_PROMPT = """You are a Terraform expert (HashiCorp Certified) who writes
production-grade infrastructure as code. You always:
- Use modules for reusable infrastructure components
- Separate environments (dev/staging/prod) with workspaces or directories
- Use remote state with locking (S3 + DynamoDB for AWS)
- Validate all variables with type constraints and validation rules
- Tag all resources consistently (environment, team, cost-center, project)
- Use data sources instead of hardcoded IDs
- Enable versioning and encryption on all storage resources
- Output all resource IDs and endpoints needed by applications"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        architecture = context.get("architecture", task.get("description", ""))
        cloud        = task.get("cloud", "aws")
        environment  = task.get("environment", "production")
        services     = task.get("services", [])

        prompt = f"""Generate complete, production-grade Terraform IaC.

Cloud Provider: {cloud}
Environment: {environment}
Architecture: {json.dumps(architecture, default=str)[:1500]}
Services to provision: {services}

Generate a complete Terraform project:
1. Root module (main.tf, variables.tf, outputs.tf, versions.tf)
2. Backend configuration (remote state with locking)
3. Networking module (VPC, subnets, security groups, NAT gateway)
4. Compute module (ECS/EKS/Lambda as appropriate)
5. Database module (RDS/Aurora with Multi-AZ, encryption, backups)
6. Storage module (S3 with versioning, encryption, lifecycle rules)
7. Monitoring module (CloudWatch/Azure Monitor alarms and dashboards)
8. IAM module (least-privilege roles and policies)
9. DNS module (Route53/Azure DNS with health checks)
10. CDN module (CloudFront/Azure CDN)
11. tfvars files for dev/staging/prod
12. Makefile with plan/apply/destroy targets
13. GitHub Actions CI/CD for Terraform

Respond as JSON with file paths as keys and Terraform HCL as values."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_terraform(parsed, task.get("workspace", "."), cloud)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {"files_generated": len(arts), "cloud": cloud},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_terraform(self, files: Dict, workspace: str, cloud: str) -> List[str]:
        import os
        arts   = []
        tf_dir = os.path.join(workspace, "infrastructure", "terraform", cloud)
        os.makedirs(tf_dir, exist_ok=True)

        for fpath, content in files.items():
            if isinstance(content, str) and content.strip():
                full_path = os.path.join(tf_dir, fpath)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w") as f:
                    f.write(content)
                arts.append(full_path)

        return arts


# ── 2. Multi-Cloud Agent ──────────────────────────────────────────────────────

class MultiCloudAgent(BaseAgent):
    """
    Generates equivalent IaC for AWS, Azure, and GCP simultaneously.
    Produces a cloud-agnostic abstraction layer and migration guides.
    """

    AGENT_TYPE    = "multi_cloud_agent"
    SYSTEM_PROMPT = """You are a multi-cloud architect who designs cloud-agnostic
infrastructure. You always:
- Generate equivalent configurations for AWS, Azure, and GCP
- Identify services with no direct equivalent (and suggest alternatives)
- Design a cloud-agnostic abstraction layer (Terraform modules, Pulumi components)
- Document lock-in risks for each cloud-specific service used
- Provide cost comparison across clouds for the same workload
- Design for active-active multi-cloud (not just DR failover)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        architecture = context.get("architecture", task.get("description", ""))
        primary      = task.get("primary_cloud", "aws")
        secondary    = task.get("secondary_clouds", ["azure", "gcp"])

        prompt = f"""Generate multi-cloud infrastructure configurations.

Primary Cloud: {primary}
Secondary Clouds: {secondary}
Architecture: {json.dumps(architecture, default=str)[:1500]}

Produce:
1. Service mapping table (AWS ↔ Azure ↔ GCP equivalents)
2. Terraform configurations for each cloud (modular, reusable)
3. Cloud-agnostic abstraction layer (common interface)
4. Cost comparison table (estimated monthly cost per cloud)
5. Lock-in risk assessment (which services create vendor lock-in)
6. Multi-cloud networking design (VPN/interconnect between clouds)
7. Data sovereignty considerations per cloud/region
8. Migration guide (primary → secondary cloud)
9. Active-active deployment strategy
10. Cloud-specific gotchas and limitations

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


# ── 3. Service Mesh Agent ─────────────────────────────────────────────────────

class ServiceMeshAgent(BaseAgent):
    """
    Configures Istio/Linkerd service mesh:
    - mTLS between all services
    - Traffic management (canary, blue/green, circuit breaking)
    - Observability (distributed tracing, metrics, access logs)
    - Security policies (AuthorizationPolicy, PeerAuthentication)
    - Ingress gateway configuration
    """

    AGENT_TYPE    = "service_mesh_agent"
    SYSTEM_PROMPT = """You are an Istio/Linkerd expert. You configure service meshes
for zero-trust networking and advanced traffic management. You always:
- Enable strict mTLS (PeerAuthentication: STRICT) for all namespaces
- Define AuthorizationPolicies with least-privilege (deny all, then allow)
- Configure circuit breakers with appropriate thresholds
- Set up distributed tracing (Jaeger/Zipkin) with 100% sampling in staging
- Design canary deployments with traffic weight shifting
- Configure retry policies and timeouts for all services
- Enable access logging to a centralized log aggregator"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        services     = task.get("services", [])
        mesh_type    = task.get("mesh", "istio")
        namespace    = task.get("namespace", "default")
        architecture = context.get("architecture", {})

        prompt = f"""Generate complete {mesh_type} service mesh configuration.

Services: {json.dumps(services, default=str)[:1000]}
Namespace: {namespace}
Architecture: {json.dumps(architecture, default=str)[:800]}

Generate:
1. PeerAuthentication (strict mTLS for all services)
2. AuthorizationPolicy (deny-all default, then per-service allowlists)
3. DestinationRule (circuit breaker, connection pool, load balancing per service)
4. VirtualService (traffic routing, retries, timeouts, fault injection)
5. Gateway (ingress with TLS termination)
6. ServiceEntry (external service registration)
7. Canary deployment configuration (10% → 50% → 100% traffic shift)
8. Distributed tracing configuration (Jaeger)
9. Kiali dashboard configuration
10. Prometheus metrics scraping for mesh telemetry

Respond as JSON with Kubernetes YAML manifests as strings."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_mesh_configs(parsed, task.get("workspace", "."), mesh_type)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {"mesh": mesh_type, "files": len(arts)},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_mesh_configs(self, configs: Dict, workspace: str, mesh: str) -> List[str]:
        import os
        arts     = []
        mesh_dir = os.path.join(workspace, "infrastructure", "mesh", mesh)
        os.makedirs(mesh_dir, exist_ok=True)

        for key, content in configs.items():
            if isinstance(content, str) and content.strip():
                path = os.path.join(mesh_dir, f"{key}.yaml")
                with open(path, "w") as f:
                    f.write(content)
                arts.append(path)

        return arts


# ── 4. Cost Forecast Agent ────────────────────────────────────────────────────

@dataclass
class CostForecast:
    forecast_id:    str
    cloud:          str
    monthly_total:  float
    annual_total:   float
    breakdown:      List[Dict[str, Any]]
    optimization:   List[Dict[str, Any]]
    savings_potential: float
    confidence:     str


class CostForecastAgent(BaseAgent):
    """
    Pre-provisioning cloud cost estimation:
    - Per-service cost breakdown
    - Reserved instance vs on-demand analysis
    - Spot instance opportunities
    - Right-sizing recommendations
    - Cost anomaly detection rules
    - Budget alert thresholds
    """

    AGENT_TYPE    = "cost_forecast_agent"
    SYSTEM_PROMPT = """You are a FinOps engineer and cloud cost optimization expert.
You estimate cloud costs before provisioning and find savings opportunities. You always:
- Provide itemized cost breakdown per service/resource
- Compare on-demand vs reserved vs spot pricing
- Identify over-provisioned resources (right-sizing)
- Calculate ROI of reserved instances (1yr vs 3yr)
- Set up cost anomaly detection with appropriate thresholds
- Design tagging strategies for cost allocation
- Estimate data transfer costs (often underestimated)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        architecture = context.get("architecture", task.get("description", ""))
        cloud        = task.get("cloud", "aws")
        region       = task.get("region", "us-east-1")
        traffic      = task.get("expected_traffic", "1000 req/s peak")
        team_size    = task.get("team_size", 10)

        prompt = f"""Estimate complete cloud infrastructure costs.

Cloud: {cloud} ({region})
Architecture: {json.dumps(architecture, default=str)[:1500]}
Expected Traffic: {traffic}
Team Size: {team_size}

Produce:
1. Monthly cost breakdown per service (compute, storage, network, database, etc.)
2. On-demand vs reserved instance comparison (1yr, 3yr savings)
3. Spot instance opportunities (which workloads are spot-safe)
4. Right-sizing recommendations (over-provisioned resources)
5. Data transfer cost analysis (often the hidden cost)
6. Cost optimization roadmap (quick wins vs long-term)
7. Budget alert thresholds (50%, 80%, 100% of budget)
8. Cost anomaly detection rules
9. Tagging strategy for cost allocation by team/feature
10. Total Cost of Ownership (TCO) comparison vs on-premises

Provide specific dollar amounts (USD/month). Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        forecast = CostForecast(
            forecast_id       = f"cost-{uuid.uuid4().hex[:8]}",
            cloud             = cloud,
            monthly_total     = parsed.get("monthly_total", 0.0),
            annual_total      = parsed.get("annual_total", 0.0),
            breakdown         = parsed.get("breakdown", []),
            optimization      = parsed.get("optimization", []),
            savings_potential = parsed.get("savings_potential", 0.0),
            confidence        = parsed.get("confidence", "medium"),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "forecast_id":       forecast.forecast_id,
                "monthly_total_usd": forecast.monthly_total,
                "annual_total_usd":  forecast.annual_total,
                "savings_potential": forecast.savings_potential,
                "confidence":        forecast.confidence,
                "breakdown":         forecast.breakdown,
                "optimization":      forecast.optimization,
                "budget_alerts":     parsed.get("budget_alerts", []),
                "tagging_strategy":  parsed.get("tagging_strategy", {}),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 5. Disaster Recovery Agent ────────────────────────────────────────────────

class DisasterRecoveryAgent(BaseAgent):
    """
    Designs and tests disaster recovery:
    - RTO/RPO target definition and validation
    - Backup strategies (full, incremental, continuous)
    - Failover runbooks (automated and manual)
    - DR testing schedule and procedures
    - Multi-region active-passive and active-active designs
    """

    AGENT_TYPE    = "disaster_recovery_agent"
    SYSTEM_PROMPT = """You are a disaster recovery architect. You design systems
that survive any failure. You always:
- Define RTO (Recovery Time Objective) and RPO (Recovery Point Objective) per service
- Design backup strategies that meet RPO requirements
- Automate failover (no manual steps in the critical path)
- Test DR quarterly with documented runbooks
- Use chaos engineering to validate DR procedures
- Design for the 'unknown unknown' (not just known failure modes)
- Document the human escalation path when automation fails"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        architecture = context.get("architecture", task.get("description", ""))
        rto_target   = task.get("rto_minutes", 15)
        rpo_target   = task.get("rpo_minutes", 5)
        cloud        = task.get("cloud", "aws")

        prompt = f"""Design a complete disaster recovery strategy.

Architecture: {json.dumps(architecture, default=str)[:1500]}
RTO Target: {rto_target} minutes
RPO Target: {rpo_target} minutes
Cloud: {cloud}

Produce:
1. Service criticality matrix (RTO/RPO per service)
2. Backup strategy per data store (frequency, retention, cross-region)
3. Failover architecture (active-passive or active-active per service)
4. Automated failover runbook (step-by-step with commands)
5. Manual failover runbook (when automation fails)
6. DR testing schedule and test scenarios
7. Infrastructure as code for DR environment
8. Data replication configuration (database, object storage)
9. DNS failover configuration (Route53/Azure Traffic Manager)
10. Post-failover validation checklist
11. Estimated recovery time per failure scenario

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


# ── 6. GitOps Agent ───────────────────────────────────────────────────────────

class GitOpsAgent(BaseAgent):
    """
    Sets up GitOps with ArgoCD or Flux:
    - Application manifests and AppProject definitions
    - Sync policies (automated, self-heal, prune)
    - Drift detection and alerting
    - Rollback automation
    - Multi-cluster management
    - Secret management (Sealed Secrets / External Secrets Operator)
    """

    AGENT_TYPE    = "gitops_agent"
    SYSTEM_PROMPT = """You are a GitOps expert with deep ArgoCD and Flux experience.
You implement true GitOps where Git is the single source of truth. You always:
- Use App-of-Apps pattern for managing multiple applications
- Enable automated sync with self-healing (drift correction)
- Configure prune to remove resources deleted from Git
- Use Sealed Secrets or External Secrets Operator for secret management
- Set up notifications for sync failures and drift detection
- Implement progressive delivery (canary/blue-green) via Argo Rollouts
- Separate application config from infrastructure config repositories"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        services     = task.get("services", [])
        gitops_tool  = task.get("tool", "argocd")
        clusters     = task.get("clusters", ["production", "staging"])
        git_repo     = task.get("git_repo", "https://github.com/org/gitops")

        prompt = f"""Generate complete GitOps configuration.

Tool: {gitops_tool}
Services: {json.dumps(services, default=str)[:800]}
Clusters: {clusters}
GitOps Repo: {git_repo}

Generate:
1. App-of-Apps root application manifest
2. Per-service Application manifests (with sync policy, health checks)
3. AppProject definitions (RBAC, source repos, destinations)
4. Automated sync configuration (prune, self-heal, retry)
5. Notification configuration (Slack/email on sync failure, drift)
6. Sealed Secrets / External Secrets Operator configuration
7. Argo Rollouts progressive delivery (canary with analysis)
8. Multi-cluster ApplicationSet
9. Repository structure (recommended gitops repo layout)
10. CI/CD integration (image updater, automated PR on new image)

Respond as JSON with YAML manifests as strings."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_gitops(parsed, task.get("workspace", "."), gitops_tool)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {"tool": gitops_tool, "files": len(arts)},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_gitops(self, configs: Dict, workspace: str, tool: str) -> List[str]:
        import os
        arts      = []
        gitops_dir = os.path.join(workspace, "gitops", tool)
        os.makedirs(gitops_dir, exist_ok=True)

        for key, content in configs.items():
            if isinstance(content, str) and content.strip():
                path = os.path.join(gitops_dir, f"{key}.yaml")
                with open(path, "w") as f:
                    f.write(content)
                arts.append(path)

        return arts


# ── 7. Edge Deployment Agent ──────────────────────────────────────────────────

class EdgeDeploymentAgent(BaseAgent):
    """
    Generates edge computing configurations:
    - Cloudflare Workers (JavaScript/WASM)
    - Lambda@Edge (Node.js)
    - Kubernetes edge node configs (K3s)
    - CDN cache rules and purge strategies
    - Edge-side rendering (ESR) configurations
    - Global load balancing with health checks
    """

    AGENT_TYPE    = "edge_deployment_agent"
    SYSTEM_PROMPT = """You are an edge computing expert. You deploy workloads as
close to users as possible for minimum latency. You always:
- Identify which workloads benefit from edge deployment
- Design stateless edge functions (no shared state)
- Use KV stores for edge-side caching
- Implement smart routing (geo-routing, A/B testing at edge)
- Configure CDN cache rules with appropriate TTLs
- Design cache invalidation strategies
- Monitor edge performance with real user metrics (RUM)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        description  = task.get("description", "")
        platform     = task.get("platform", "cloudflare")
        regions      = task.get("regions", ["us", "eu", "asia"])
        services     = task.get("services", [])

        prompt = f"""Generate complete edge deployment configuration.

Platform: {platform}
Target Regions: {regions}
Services: {json.dumps(services, default=str)[:800]}
Description: {description}

Generate:
1. Edge function code (authentication, rate limiting, A/B testing, geo-routing)
2. CDN cache rules (what to cache, TTLs, cache keys, Vary headers)
3. Cache invalidation strategy (tag-based, path-based, event-driven)
4. KV store configuration for edge-side state
5. Geo-routing rules (route users to nearest origin)
6. DDoS protection rules
7. Bot detection and mitigation
8. Real User Monitoring (RUM) configuration
9. Edge-side rendering configuration
10. Deployment pipeline for edge functions

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
