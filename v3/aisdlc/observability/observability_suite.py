"""
Observability Suite
====================
Six observability agents for full-stack visibility and autonomous operations:

  1. OTelAgent            — OpenTelemetry instrumentation code generator
  2. SLOAgent             — SLO/SLA definition, error budget tracking, burn rate alerts
  3. IncidentResponseAgent — Autonomous incident detection, diagnosis, and remediation
  4. CapacityPlanningAgent — Predictive capacity planning with ML-based forecasting
  5. BIAgent              — Business intelligence dashboards and KPI tracking
  6. LogIntelligenceAgent — Log anomaly detection, pattern extraction, root cause analysis
"""
from __future__ import annotations

import json
import uuid
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

from aisdlc.core.base_agent import BaseAgent, AgentResult

log = structlog.get_logger(__name__)


# ── 1. OpenTelemetry Agent ────────────────────────────────────────────────────

class OTelAgent(BaseAgent):
    """
    Generates complete OpenTelemetry instrumentation:
    - Auto-instrumentation setup (zero-code)
    - Manual spans for business operations
    - Custom metrics (counters, histograms, gauges)
    - Structured logging with trace correlation
    - Exemplars linking metrics to traces
    - Collector configuration (OTLP → Jaeger/Tempo/Datadog)
    """

    AGENT_TYPE    = "otel_agent"
    SYSTEM_PROMPT = """You are an OpenTelemetry expert. You instrument applications
for full observability: traces, metrics, and logs. You always:
- Use auto-instrumentation where available (zero-code)
- Add manual spans for all business-critical operations
- Correlate logs with trace IDs (structured logging)
- Define custom metrics for business KPIs (not just technical metrics)
- Configure sampling strategies (head-based for dev, tail-based for prod)
- Use exemplars to link metrics to specific traces
- Export to multiple backends (Jaeger, Prometheus, Loki)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        language     = task.get("language", "python")
        framework    = task.get("framework", "fastapi")
        services     = task.get("services", [])
        backend      = task.get("backend", "jaeger")

        prompt = f"""Generate complete OpenTelemetry instrumentation.

Language: {language}
Framework: {framework}
Services: {json.dumps(services, default=str)[:800]}
Backend: {backend}

Generate:
1. SDK initialization code (tracer, meter, logger providers)
2. Auto-instrumentation setup (HTTP, database, message queue)
3. Manual span instrumentation for business operations
4. Custom business metrics (order_placed_total, payment_latency_ms, etc.)
5. Structured logging with trace/span ID correlation
6. Sampling configuration (head-based + tail-based)
7. OpenTelemetry Collector configuration (OTLP receivers, exporters)
8. Docker Compose for local observability stack (Jaeger, Prometheus, Grafana, Loki)
9. Grafana dashboards JSON (RED metrics: Rate, Errors, Duration)
10. Alerting rules (Prometheus AlertManager)
11. Exemplars configuration (linking metrics to traces)

Respond as JSON with code files as strings."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_otel_files(parsed, task.get("workspace", "."), language)

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {"language": language, "framework": framework, "files": len(arts)},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_otel_files(self, files: Dict, workspace: str, language: str) -> List[str]:
        import os
        arts     = []
        otel_dir = os.path.join(workspace, "observability", "otel")
        os.makedirs(otel_dir, exist_ok=True)

        ext_map = {"python": ".py", "typescript": ".ts", "go": ".go", "java": ".java"}
        default_ext = ext_map.get(language, ".py")

        for key, content in files.items():
            if isinstance(content, str) and content.strip():
                ext  = ".yaml" if any(k in key.lower() for k in ["config", "collector", "compose"]) else (
                       ".json" if "dashboard" in key.lower() else default_ext)
                path = os.path.join(otel_dir, f"{key}{ext}")
                with open(path, "w") as f:
                    f.write(content)
                arts.append(path)

        return arts


# ── 2. SLO Agent ──────────────────────────────────────────────────────────────

@dataclass
class SLO:
    name:          str
    service:       str
    sli_type:      str        # "availability" | "latency" | "error_rate" | "throughput"
    target:        float      # e.g., 0.999 for 99.9%
    window:        str        # "30d" | "7d"
    error_budget:  float      # minutes/month allowed downtime
    alert_rules:   List[str]


@dataclass
class SLOReport:
    report_id:  str
    slos:       List[SLO]
    dashboards: List[str]
    burn_rate_alerts: List[Dict[str, Any]]
    error_budget_policy: str


class SLOAgent(BaseAgent):
    """
    Defines and monitors Service Level Objectives:
    - SLI/SLO/SLA hierarchy definition
    - Error budget calculation and tracking
    - Multi-window burn rate alerts (fast + slow burn)
    - Error budget policy (freeze deployments when budget depleted)
    - Prometheus recording rules for SLO metrics
    """

    AGENT_TYPE    = "slo_agent"
    SYSTEM_PROMPT = """You are an SRE expert in SLO engineering. You define
meaningful SLOs that align engineering work with user happiness. You always:
- Define SLOs from the user's perspective (not infrastructure metrics)
- Use multi-window burn rate alerts (5m fast burn + 1h slow burn)
- Calculate error budgets in minutes/month for intuitive understanding
- Define error budget policies (freeze deployments at 50% budget consumed)
- Use Prometheus recording rules for efficient SLO queries
- Create Grafana dashboards with error budget burn rate visualization
- Align SLOs with business SLAs (SLO should be tighter than SLA)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        services     = task.get("services", [])
        sla_targets  = task.get("sla_targets", {"availability": 0.999})
        architecture = context.get("architecture", {})

        prompt = f"""Define complete SLOs for these services.

Services: {json.dumps(services, default=str)[:800]}
SLA Targets: {json.dumps(sla_targets)[:300]}
Architecture: {json.dumps(architecture, default=str)[:500]}

For each service, define:
1. Availability SLO (target %, error budget in minutes/month)
2. Latency SLO (p50, p95, p99 targets)
3. Error rate SLO (max acceptable error rate)
4. Throughput SLO (min acceptable requests/second)

Also generate:
5. Prometheus recording rules for each SLO
6. Multi-window burn rate alert rules (1h/5m windows)
7. Error budget policy document
8. Grafana dashboard JSON for SLO tracking
9. SLO review cadence and process
10. Incident trigger thresholds (when to page on-call)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        slos = [
            SLO(
                name         = s.get("name", ""),
                service      = s.get("service", ""),
                sli_type     = s.get("sli_type", "availability"),
                target       = float(s.get("target", 0.999)),
                window       = s.get("window", "30d"),
                error_budget = float(s.get("error_budget_minutes", 43.8)),
                alert_rules  = s.get("alert_rules", []),
            )
            for s in parsed.get("slos", [])
        ]

        report = SLOReport(
            report_id            = f"slo-{uuid.uuid4().hex[:8]}",
            slos                 = slos,
            dashboards           = parsed.get("dashboards", []),
            burn_rate_alerts     = parsed.get("burn_rate_alerts", []),
            error_budget_policy  = parsed.get("error_budget_policy", ""),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "report_id":          report.report_id,
                "slos_count":         len(slos),
                "slos":               [s.__dict__ for s in slos],
                "burn_rate_alerts":   report.burn_rate_alerts,
                "error_budget_policy": report.error_budget_policy,
                "prometheus_rules":   parsed.get("prometheus_rules", ""),
                "grafana_dashboard":  parsed.get("grafana_dashboard", ""),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 3. Incident Response Agent ────────────────────────────────────────────────

@dataclass
class IncidentAction:
    step:        int
    action:      str
    command:     Optional[str]
    expected:    str
    rollback:    Optional[str]
    automated:   bool


@dataclass
class IncidentRunbook:
    runbook_id:  str
    title:       str
    severity:    str
    symptoms:    List[str]
    diagnosis:   List[str]
    actions:     List[IncidentAction]
    escalation:  List[str]
    post_mortem: str


class IncidentResponseAgent(BaseAgent):
    """
    Autonomous incident response:
    - Incident detection from alerts
    - Automated diagnosis (log analysis, metric correlation)
    - Runbook execution (automated remediation steps)
    - Escalation when automation fails
    - Post-mortem generation
    - Blameless culture enforcement
    """

    AGENT_TYPE    = "incident_response_agent"
    SYSTEM_PROMPT = """You are an SRE incident commander. You respond to incidents
with speed and precision. You always:
- Triage by user impact, not technical severity
- Diagnose before acting (understand before fixing)
- Take the minimum action needed to restore service
- Document every action taken during the incident
- Communicate status to stakeholders every 15 minutes
- Write blameless post-mortems (focus on systems, not people)
- Identify contributing factors, not just root causes
- Generate actionable follow-up items with owners and due dates"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        alert        = task.get("alert", task.get("description", ""))
        services     = task.get("services", [])
        architecture = context.get("architecture", {})
        metrics      = task.get("current_metrics", {})

        prompt = f"""Generate a complete incident response runbook and autonomous remediation plan.

Alert/Incident: {alert}
Affected Services: {json.dumps(services, default=str)[:500]}
Current Metrics: {json.dumps(metrics, default=str)[:500]}
Architecture: {json.dumps(architecture, default=str)[:800]}

Generate:
1. Incident classification (severity P0-P4, impact assessment)
2. Diagnosis checklist (what to check first, in order)
3. Automated remediation steps (with exact commands)
4. Manual remediation steps (when automation fails)
5. Rollback procedure (how to undo if remediation makes things worse)
6. Escalation matrix (who to page at each severity level)
7. Stakeholder communication template (every 15 min)
8. Post-mortem template (timeline, contributing factors, action items)
9. Prometheus queries to diagnose this specific incident type
10. Automated runbook (Python/shell script for autonomous execution)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        actions = [
            IncidentAction(
                step      = a.get("step", i+1),
                action    = a.get("action", ""),
                command   = a.get("command"),
                expected  = a.get("expected", ""),
                rollback  = a.get("rollback"),
                automated = a.get("automated", False),
            )
            for i, a in enumerate(parsed.get("remediation_steps", []))
        ]

        runbook = IncidentRunbook(
            runbook_id  = f"runbook-{uuid.uuid4().hex[:8]}",
            title       = parsed.get("title", alert[:80]),
            severity    = parsed.get("severity", "P2"),
            symptoms    = parsed.get("symptoms", []),
            diagnosis   = parsed.get("diagnosis_checklist", []),
            actions     = actions,
            escalation  = parsed.get("escalation_matrix", []),
            post_mortem = parsed.get("post_mortem_template", ""),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "runbook_id":      runbook.runbook_id,
                "severity":        runbook.severity,
                "automated_steps": sum(1 for a in actions if a.automated),
                "manual_steps":    sum(1 for a in actions if not a.automated),
                "symptoms":        runbook.symptoms,
                "diagnosis":       runbook.diagnosis,
                "actions":         [a.__dict__ for a in actions],
                "escalation":      runbook.escalation,
                "post_mortem":     runbook.post_mortem,
                "prometheus_queries": parsed.get("prometheus_queries", []),
                "automated_runbook": parsed.get("automated_runbook", ""),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 4. Capacity Planning Agent ────────────────────────────────────────────────

class CapacityPlanningAgent(BaseAgent):
    """
    Predictive capacity planning:
    - Traffic growth forecasting (linear, exponential, seasonal)
    - Resource utilization projections
    - Auto-scaling policy optimization
    - Database capacity planning
    - Storage growth forecasting
    - Cost projection with capacity growth
    """

    AGENT_TYPE    = "capacity_planning_agent"
    SYSTEM_PROMPT = """You are a capacity planning engineer. You predict resource
needs before systems become bottlenecks. You always:
- Analyze historical growth trends (not just current load)
- Plan for 3x peak traffic (unexpected viral events)
- Identify the bottleneck resource (CPU, memory, I/O, network)
- Design auto-scaling policies that respond before saturation
- Plan database capacity separately (harder to scale than compute)
- Include storage growth (logs, user data, audit trails grow forever)
- Model cost growth alongside capacity growth"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        current_metrics  = task.get("current_metrics", {})
        growth_rate      = task.get("monthly_growth_rate", 0.15)
        planning_horizon = task.get("horizon_months", 12)
        architecture     = context.get("architecture", {})

        prompt = f"""Generate a comprehensive capacity plan.

Current Metrics: {json.dumps(current_metrics, default=str)[:1000]}
Monthly Growth Rate: {growth_rate * 100:.0f}%
Planning Horizon: {planning_horizon} months
Architecture: {json.dumps(architecture, default=str)[:800]}

Produce:
1. Traffic forecast (monthly projections for {planning_horizon} months)
2. Resource utilization projections (CPU, memory, storage, network)
3. Bottleneck analysis (which resource hits limit first)
4. Auto-scaling policy recommendations (HPA/KEDA configuration)
5. Database capacity plan (connections, storage, IOPS)
6. Storage growth forecast (with cost projection)
7. CDN and caching impact analysis
8. Infrastructure scaling milestones (when to upgrade)
9. Cost projection alongside capacity growth
10. Capacity testing recommendations (load test targets)

Respond as JSON with specific numbers and dates."""

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


# ── 5. BI Agent ───────────────────────────────────────────────────────────────

class BIAgent(BaseAgent):
    """
    Business Intelligence and analytics:
    - KPI dashboard design
    - Data warehouse schema (star/snowflake)
    - ETL/ELT pipeline design
    - Cohort analysis queries
    - Funnel analysis
    - A/B test statistical analysis
    """

    AGENT_TYPE    = "bi_agent"
    SYSTEM_PROMPT = """You are a data analyst and BI engineer. You turn raw data
into actionable business insights. You always:
- Define KPIs that align with business objectives (not vanity metrics)
- Design star schema data warehouses for analytical queries
- Write efficient SQL for complex analytical queries
- Design cohort analysis to understand user retention
- Build funnel analysis to identify conversion drop-offs
- Apply statistical rigor to A/B test analysis (significance, power)
- Create self-service dashboards that non-technical users can use"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        product_type = task.get("product_type", "SaaS")
        data_sources = task.get("data_sources", [])
        kpi_goals    = task.get("kpi_goals", [])
        db_type      = task.get("db_type", "postgresql")

        prompt = f"""Design a complete BI and analytics system.

Product Type: {product_type}
Data Sources: {json.dumps(data_sources, default=str)[:500]}
KPI Goals: {json.dumps(kpi_goals, default=str)[:500]}
Database: {db_type}

Produce:
1. KPI catalog (metric name, formula, target, owner)
2. Data warehouse schema (fact tables, dimension tables, star schema)
3. ETL/ELT pipeline design (dbt models or SQL transformations)
4. Core analytical SQL queries (cohort retention, funnel, LTV, churn)
5. A/B test framework (experiment design, statistical analysis queries)
6. Grafana/Metabase dashboard specifications
7. Data quality checks (dbt tests)
8. Real-time vs batch analytics decision matrix
9. Data governance (PII masking in analytics, access controls)
10. Executive dashboard (C-suite level metrics)

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


# ── 6. Log Intelligence Agent ─────────────────────────────────────────────────

@dataclass
class LogAnomaly:
    timestamp:   str
    service:     str
    pattern:     str
    severity:    str
    count:       int
    first_seen:  str
    root_cause:  str
    remediation: str


class LogIntelligenceAgent(BaseAgent):
    """
    Intelligent log analysis:
    - Log pattern extraction and clustering
    - Anomaly detection (new error patterns, rate spikes)
    - Root cause analysis from log sequences
    - Log-based alerting rules
    - Log parsing configuration (Logstash/Fluent Bit)
    - Structured logging enforcement
    """

    AGENT_TYPE    = "log_intelligence_agent"
    SYSTEM_PROMPT = """You are a log analysis expert. You extract signal from noise
in application logs. You always:
- Cluster similar log messages to reduce noise
- Detect new error patterns that haven't been seen before
- Correlate log events across services using trace IDs
- Identify log sequences that precede incidents
- Generate Logstash/Fluent Bit parsing configurations
- Define log-based alerting rules (error rate, new error types)
- Enforce structured logging standards (JSON with required fields)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        log_samples  = task.get("log_samples", task.get("description", ""))
        services     = task.get("services", [])
        log_platform = task.get("platform", "elasticsearch")

        prompt = f"""Analyze these logs and generate a complete log intelligence system.

Log Platform: {log_platform}
Services: {json.dumps(services, default=str)[:500]}
Log Samples:
{str(log_samples)[:2000]}

Produce:
1. Log pattern catalog (identified patterns, frequency, severity)
2. Anomaly detection rules (new patterns, rate spikes, error bursts)
3. Root cause analysis for each error pattern
4. Fluent Bit / Logstash parsing configuration
5. Elasticsearch index template / Loki label scheme
6. Log-based alert rules (Prometheus AlertManager / Grafana)
7. Structured logging standard (required fields, format)
8. Log retention policy (by severity and service)
9. Log correlation queries (find related events across services)
10. Dashboard for log analytics (error rate, top errors, new patterns)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        anomalies = [
            LogAnomaly(
                timestamp   = a.get("timestamp", ""),
                service     = a.get("service", ""),
                pattern     = a.get("pattern", ""),
                severity    = a.get("severity", "warning"),
                count       = int(a.get("count", 1)),
                first_seen  = a.get("first_seen", ""),
                root_cause  = a.get("root_cause", ""),
                remediation = a.get("remediation", ""),
            )
            for a in parsed.get("anomalies", [])
        ]

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "anomalies_found":  len(anomalies),
                "critical":         sum(1 for a in anomalies if a.severity == "critical"),
                "anomalies":        [a.__dict__ for a in anomalies],
                "patterns":         parsed.get("patterns", []),
                "alert_rules":      parsed.get("alert_rules", []),
                "fluent_bit_config": parsed.get("fluent_bit_config", ""),
                "logging_standard": parsed.get("logging_standard", {}),
                "retention_policy": parsed.get("retention_policy", {}),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )
