"""
AI-SDLC Self-Learning Engine
==============================
After every project, this engine:
  1. Scans episodic memory for high-value patterns
  2. Extracts reusable knowledge using the LLM
  3. Promotes patterns into semantic/procedural memory
  4. Updates success-rate scores on existing procedures
  5. Generates a "lessons learned" report

This is what makes the system smarter with every build.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import structlog

from aisdlc.core.llm_gateway import LLMGateway, Message, Role
from aisdlc.memory.memory_system import (
    EpisodicMemory, MemoryEntry, MemoryImportance,
    MemorySystem, MemoryType, ProceduralMemory, SemanticMemory,
)

log = structlog.get_logger(__name__)

_EXTRACT_PROMPT = """
You are an AI knowledge extraction engine. Analyze the following SDLC project events
and extract reusable knowledge.

PROJECT EVENTS:
{events}

Extract and return a JSON object with this exact structure:
{{
  "patterns": [
    {{
      "topic": "short topic name",
      "knowledge": "concise reusable fact or best practice (1-3 sentences)",
      "tags": ["tag1", "tag2"],
      "importance": "low|medium|high|critical"
    }}
  ],
  "procedures": [
    {{
      "name": "procedure name",
      "description": "what this procedure does",
      "steps": ["step 1", "step 2", "step 3"],
      "tags": ["tag1", "tag2"],
      "applicable_when": "when to use this procedure"
    }}
  ],
  "anti_patterns": [
    {{
      "topic": "what went wrong",
      "lesson": "what to avoid and why",
      "tags": ["tag1"]
    }}
  ],
  "summary": "2-3 sentence summary of what was learned from this project"
}}

Focus on patterns that will help future projects. Be specific and actionable.
Return ONLY valid JSON, no markdown.
"""


class SelfLearningEngine:
    """
    Autonomous knowledge extraction and memory consolidation engine.
    Runs automatically after each project completes.
    """

    def __init__(self, memory: MemorySystem, llm: Optional[LLMGateway] = None):
        self.memory = memory
        self.llm    = llm or LLMGateway.from_env()

    def learn_from_project(self, project_id: str) -> Dict[str, Any]:
        """
        Extract learnings from a completed project and consolidate into long-term memory.
        Returns a summary of what was learned.
        """
        log.info("learning.start", project_id=project_id)

        # 1. Gather episodic events for this project
        events = self.memory.episodic.project_history(project_id)
        if not events:
            log.info("learning.no_events", project_id=project_id)
            return {"learned": 0, "summary": "No events found"}

        # 2. Format events for LLM extraction
        event_text = "\n".join([
            f"[{e.metadata.get('event_type','event')}] {e.content[:300]}"
            for e in events[:50]  # cap at 50 events
        ])

        # 3. Extract knowledge with LLM
        try:
            resp = self.llm.complete(
                messages=[Message(role=Role.USER,
                    content=_EXTRACT_PROMPT.format(events=event_text))],
                system_prompt="You are an expert knowledge extraction AI. Return only valid JSON."
            )
            extracted = json.loads(resp.content.strip())
        except Exception as e:
            log.error("learning.extract_failed", error=str(e))
            return {"learned": 0, "error": str(e)}

        counts = {"patterns": 0, "procedures": 0, "anti_patterns": 0}

        # 4. Store patterns into semantic memory
        for p in extracted.get("patterns", []):
            try:
                imp = MemoryImportance(p.get("importance", "medium"))
            except ValueError:
                imp = MemoryImportance.MEDIUM
            self.memory.semantic.learn(
                topic=p["topic"], content=p["knowledge"],
                source=f"project:{project_id}", tags=p.get("tags", []),
                importance=imp,
            )
            counts["patterns"] += 1

        # 5. Store procedures into procedural memory
        for proc in extracted.get("procedures", []):
            self.memory.procedural.store_procedure(
                name=proc["name"], description=proc["description"],
                steps=proc.get("steps", []), tags=proc.get("tags", []),
                success_rate=1.0,
            )
            counts["procedures"] += 1

        # 6. Store anti-patterns as critical semantic knowledge
        for ap in extracted.get("anti_patterns", []):
            self.memory.semantic.learn(
                topic=f"ANTI-PATTERN: {ap['topic']}",
                content=ap["lesson"],
                source=f"project:{project_id}",
                tags=ap.get("tags", []) + ["anti-pattern"],
                importance=MemoryImportance.CRITICAL,
            )
            counts["anti_patterns"] += 1

        # 7. Record the learning event itself
        summary = extracted.get("summary", "")
        self.memory.episodic.record(
            event_type="learning.consolidated",
            description=f"Learned from project {project_id}: {summary}",
            project_id=project_id,
            metadata={"counts": counts, "summary": summary},
            importance=MemoryImportance.HIGH,
        )

        result = {
            "project_id":   project_id,
            "learned":      sum(counts.values()),
            "patterns":     counts["patterns"],
            "procedures":   counts["procedures"],
            "anti_patterns": counts["anti_patterns"],
            "summary":      summary,
            "memory_stats": self.memory.stats(),
        }
        log.info("learning.complete", **{k: v for k, v in result.items() if k != "memory_stats"})
        return result

    def seed_noops_knowledge(self) -> None:
        """
        Pre-seed the semantic and procedural memory with NoOps, self-healing,
        and resilience best practices. Called once on first startup.
        """
        log.info("learning.seeding_noops_knowledge")

        # ── Semantic: NoOps Principles ────────────────────────────────────────
        noops_facts = [
            ("NoOps Circuit Breaker",
             "Every service must implement a circuit breaker pattern. Use exponential back-off "
             "with jitter. Open after 5 consecutive failures, half-open after 30s, close after "
             "2 successful probes.",
             ["circuit-breaker", "resilience", "noops"]),
            ("NoOps Health Endpoints",
             "Every service must expose /health/live (liveness), /health/ready (readiness), "
             "and /health/startup (startup probe) endpoints returning {status, version, uptime, checks}.",
             ["health-check", "kubernetes", "noops"]),
            ("NoOps Structured Logging",
             "All logs must be structured JSON with fields: timestamp (ISO8601), level, service, "
             "trace_id, span_id, message, error (if applicable). Never log secrets or PII.",
             ["logging", "observability", "noops"]),
            ("NoOps Distributed Tracing",
             "Instrument every service with OpenTelemetry. Propagate W3C trace context headers. "
             "Export to Jaeger or Tempo. Trace all external calls, DB queries, and message publishes.",
             ["tracing", "opentelemetry", "observability"]),
            ("NoOps Auto-Scaling",
             "Define HPA (Horizontal Pod Autoscaler) for every Kubernetes deployment. Scale on "
             "CPU >70%, memory >80%, or custom metrics. Set minReplicas=2 for HA, maxReplicas based on load tests.",
             ["kubernetes", "auto-scaling", "noops"]),
            ("NoOps Graceful Shutdown",
             "Every service must handle SIGTERM: stop accepting new requests, drain in-flight requests "
             "(max 30s), close DB connections, flush logs, then exit 0.",
             ["graceful-shutdown", "kubernetes", "resilience"]),
            ("NoOps Retry Policy",
             "Retry idempotent operations with exponential back-off: base=100ms, multiplier=2, "
             "max=30s, jitter=±20%, max_attempts=5. Never retry non-idempotent writes without "
             "idempotency keys.",
             ["retry", "resilience", "noops"]),
            ("NoOps Bulkhead Pattern",
             "Isolate critical resources using thread pool bulkheads. Separate pools for: "
             "external API calls, DB queries, background jobs. Prevents one slow dependency "
             "from cascading failures.",
             ["bulkhead", "resilience", "noops"]),
            ("NoOps Chaos Engineering",
             "Every production service must pass chaos probes: random pod kill, network partition "
             "(50ms latency + 10% packet loss), dependency failure (kill downstream services). "
             "Run weekly in staging, monthly in production.",
             ["chaos", "resilience", "noops"]),
            ("NoOps Zero-Trust Security",
             "Every service-to-service call must use mTLS. No service trusts another by default. "
             "Use short-lived certificates (24h TTL). Rotate automatically via cert-manager.",
             ["zero-trust", "security", "mtls"]),
            ("NoOps Immutable Infrastructure",
             "Never patch running containers. Build new image, test, deploy, shift traffic, "
             "then decommission old. Use blue-green or canary deployments. Tag all images with "
             "git SHA + build number.",
             ["immutable", "deployment", "noops"]),
            ("NoOps SLO/SLA Definition",
             "Define SLOs before deployment: availability (99.9% = 8.7h/year downtime), "
             "latency (p50<50ms, p95<200ms, p99<1s), error rate (<0.1%). Alert at 50% error budget burn.",
             ["slo", "sla", "observability"]),
            ("NoOps Database Resilience",
             "Every database must have: connection pooling (PgBouncer/HikariCP), read replicas, "
             "automated failover (<30s RTO), PITR backups (1h RPO), and query timeout enforcement.",
             ["database", "resilience", "noops"]),
            ("Security OWASP Top 10",
             "Every web application must be protected against: injection (parameterized queries), "
             "broken auth (JWT RS256, short TTL), XSS (CSP headers, output encoding), "
             "IDOR (object-level auth), security misconfiguration (hardened defaults).",
             ["security", "owasp", "web"]),
            ("Security Secrets Management",
             "Never hardcode secrets. Use: Vault/AWS Secrets Manager/K8s Secrets. "
             "Rotate secrets automatically every 90 days. Audit all secret access. "
             "Scan all commits for secrets with truffleHog/gitleaks.",
             ["secrets", "security", "noops"]),
        ]

        for topic, content, tags in noops_facts:
            self.memory.semantic.learn(topic, content, source="noops_seed",
                tags=tags, importance=MemoryImportance.HIGH)

        # ── Procedural: NoOps Workflows ───────────────────────────────────────
        procedures = [
            {
                "name": "deploy_with_canary",
                "description": "Zero-downtime canary deployment to Kubernetes",
                "steps": [
                    "Build and push Docker image tagged with git SHA",
                    "Deploy to 5% of pods (canary)",
                    "Monitor error rate and latency for 10 minutes",
                    "If metrics healthy, roll out to 25%, then 50%, then 100%",
                    "If metrics degrade, auto-rollback to previous version",
                    "Update deployment record in episodic memory",
                ],
                "tags": ["deployment", "kubernetes", "canary", "noops"],
            },
            {
                "name": "auto_remediate_high_cpu",
                "description": "Autonomous remediation for high CPU alerts",
                "steps": [
                    "Detect CPU > 85% for 5 minutes via Prometheus alert",
                    "Check if HPA has already scaled — if yes, wait 5 more minutes",
                    "If not scaled, trigger manual HPA scale-up (+2 replicas)",
                    "Profile top CPU-consuming threads/goroutines",
                    "If CPU caused by specific endpoint, enable rate limiting",
                    "Create GitHub issue with profiling data for post-mortem",
                    "Notify via Slack if not resolved within 15 minutes",
                ],
                "tags": ["remediation", "cpu", "noops", "self-healing"],
            },
            {
                "name": "auto_remediate_memory_leak",
                "description": "Autonomous detection and remediation of memory leaks",
                "steps": [
                    "Detect memory growth > 10MB/hour for 2+ hours",
                    "Capture heap dump / memory profile",
                    "Restart pod with graceful drain (zero downtime)",
                    "Analyze heap dump with LLM to identify leak source",
                    "Create GitHub issue with analysis and suggested fix",
                    "Schedule automated fix PR if pattern matches known anti-pattern",
                ],
                "tags": ["memory", "leak", "remediation", "noops"],
            },
            {
                "name": "database_failover",
                "description": "Autonomous database failover procedure",
                "steps": [
                    "Detect primary DB unreachable (3 consecutive health checks)",
                    "Promote read replica to primary (automated via RDS/Patroni)",
                    "Update connection string in service config / Vault",
                    "Trigger rolling restart of affected services",
                    "Verify all services reconnected within 60s",
                    "Alert on-call if failover takes > 30s",
                    "Create post-mortem ticket automatically",
                ],
                "tags": ["database", "failover", "noops", "resilience"],
            },
            {
                "name": "security_incident_response",
                "description": "Autonomous security incident response",
                "steps": [
                    "Detect anomaly: unusual traffic, failed auth spike, or SIEM alert",
                    "Immediately isolate affected service (network policy update)",
                    "Capture forensic snapshot (logs, metrics, network flows)",
                    "Block suspicious IPs at WAF level",
                    "Rotate all credentials for affected service",
                    "Scan for lateral movement in adjacent services",
                    "Generate incident report and notify security team",
                    "Restore service after threat confirmed cleared",
                ],
                "tags": ["security", "incident", "noops", "zero-trust"],
            },
        ]

        for proc in procedures:
            self.memory.procedural.store_procedure(**proc)

        log.info("learning.noops_knowledge_seeded",
            facts=len(noops_facts), procedures=len(procedures))
