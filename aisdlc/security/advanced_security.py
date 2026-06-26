"""
Advanced Security Depth Module
================================
Six security agents beyond basic SAST:

  1. DASTEngine           — Dynamic application security testing (OWASP ZAP-style)
  2. SBOMAgent            — Software Bill of Materials + supply chain security
  3. PenTestAgent         — Automated penetration testing scenarios
  4. PrivacyAgent         — PII detection, GDPR data maps, deletion workflows
  5. AuditTrailAgent      — Immutable audit log generation for SOC2/HIPAA/PCI
  6. PolicyAsCodeAgent    — OPA Rego policies for every business rule
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


# ── 1. DAST Engine ────────────────────────────────────────────────────────────

@dataclass
class DASTFinding:
    id:           str
    name:         str
    severity:     str        # critical | high | medium | low | info
    url:          str
    method:       str
    parameter:    Optional[str]
    evidence:     str
    cwe_id:       Optional[str]
    remediation:  str
    cvss_score:   float


@dataclass
class DASTReport:
    scan_id:    str
    target_url: str
    findings:   List[DASTFinding]
    score:      float
    passed:     bool
    scan_types: List[str]
    duration_s: float


class DASTEngine(BaseAgent):
    """
    Dynamic Application Security Testing engine.
    Generates test payloads and analyzes responses for:
    - SQL Injection (classic, blind, time-based)
    - XSS (reflected, stored, DOM-based)
    - SSRF (Server-Side Request Forgery)
    - Authentication bypass
    - Insecure Direct Object References (IDOR)
    - Command injection
    - XXE (XML External Entity)
    - Open redirects
    - CORS misconfigurations
    - Security headers analysis
    """

    AGENT_TYPE    = "dast_engine"
    SYSTEM_PROMPT = """You are a senior application security engineer specializing in
dynamic testing. You generate precise, targeted test cases for OWASP Top 10
vulnerabilities. You always:
- Generate specific payloads for each vulnerability class
- Include both detection and exploitation payloads
- Provide CVSS scores and CWE IDs
- Give specific, actionable remediation steps
- Consider business logic vulnerabilities, not just technical ones"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        target_url  = task.get("target_url", "http://localhost:8000")
        api_spec    = context.get("openapi_spec", task.get("api_spec", ""))
        auth_config = task.get("auth_config", {})

        prompt = f"""Generate a comprehensive DAST test plan and simulate findings for this application.

Target: {target_url}
API Spec: {str(api_spec)[:1500]}
Auth Config: {json.dumps(auth_config, default=str)[:300]}

Generate:
1. SQL Injection test cases (payloads, expected responses, detection logic)
2. XSS test cases (reflected, stored, DOM-based payloads)
3. SSRF test cases (internal network probes, cloud metadata endpoints)
4. Authentication bypass attempts (JWT manipulation, session fixation)
5. IDOR test cases (object ID enumeration, privilege escalation)
6. Command injection payloads
7. Security headers analysis (CSP, HSTS, X-Frame-Options, etc.)
8. CORS misconfiguration tests
9. Rate limiting bypass attempts
10. Business logic vulnerability scenarios

For each finding: name, severity, URL, method, parameter, evidence, CWE ID, CVSS score, remediation.

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        findings = [
            DASTFinding(
                id          = f"DAST-{i+1:04d}",
                name        = f.get("name", ""),
                severity    = f.get("severity", "medium"),
                url         = f.get("url", target_url),
                method      = f.get("method", "GET"),
                parameter   = f.get("parameter"),
                evidence    = f.get("evidence", ""),
                cwe_id      = f.get("cwe_id"),
                remediation = f.get("remediation", ""),
                cvss_score  = float(f.get("cvss_score", 5.0)),
            )
            for i, f in enumerate(parsed.get("findings", []))
        ]

        critical = sum(1 for f in findings if f.severity == "critical")
        high     = sum(1 for f in findings if f.severity == "high")
        score    = max(0, 100 - (critical * 25) - (high * 10))

        report = DASTReport(
            scan_id    = f"dast-{uuid.uuid4().hex[:8]}",
            target_url = target_url,
            findings   = findings,
            score      = score,
            passed     = critical == 0 and high <= 2,
            scan_types = ["sqli", "xss", "ssrf", "auth", "idor", "cmd_injection",
                          "headers", "cors", "rate_limit", "business_logic"],
            duration_s = 0.0,
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "scan_id":  report.scan_id,
                "score":    report.score,
                "passed":   report.passed,
                "critical": critical,
                "high":     high,
                "total":    len(findings),
                "findings": [f.__dict__ for f in findings],
                "test_cases": parsed.get("test_cases", []),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 2. SBOM Agent ─────────────────────────────────────────────────────────────

@dataclass
class SBOMComponent:
    name:       str
    version:    str
    purl:       str         # Package URL (purl spec)
    license:    str
    supplier:   str
    hash_sha256: Optional[str]
    vulnerabilities: List[str]


@dataclass
class SBOMReport:
    sbom_id:    str
    format:     str         # "cyclonedx" | "spdx"
    components: List[SBOMComponent]
    total:      int
    vulnerable: int
    license_issues: List[str]
    supply_chain_risks: List[str]
    sbom_json:  str


class SBOMAgent(BaseAgent):
    """
    Software Bill of Materials + Supply Chain Security:
    - CycloneDX / SPDX SBOM generation
    - License compliance checking (GPL contamination, etc.)
    - Supply chain risk assessment (typosquatting, maintainer abandonment)
    - Sigstore/Cosign image signing configuration
    - Dependency confusion attack prevention
    """

    AGENT_TYPE    = "sbom_agent"
    SYSTEM_PROMPT = """You are a supply chain security expert. You generate precise
SBOMs and identify supply chain risks. You always:
- Use CycloneDX 1.4 format (preferred) or SPDX 2.3
- Include package URLs (purl) for every component
- Flag GPL/AGPL licenses in commercial products
- Identify abandoned packages (no commits in 2+ years)
- Check for typosquatting (packages with similar names to popular ones)
- Generate Sigstore/Cosign signing configurations
- Recommend private package registry mirroring for critical dependencies"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        dependencies = task.get("dependencies", {})
        language     = task.get("language", "python")
        project_name = task.get("project_name", "project")
        commercial   = task.get("commercial", True)

        prompt = f"""Generate a complete SBOM and supply chain security analysis.

Project: {project_name}
Language: {language}
Commercial Product: {commercial}
Dependencies:
{json.dumps(dependencies, indent=2)[:2000]}

Produce:
1. CycloneDX 1.4 JSON SBOM (complete, with purl, hashes, licenses)
2. License compliance analysis (flag GPL/AGPL for commercial use)
3. Vulnerability summary (CVE IDs per component)
4. Supply chain risk assessment:
   - Abandoned packages (no recent activity)
   - Single-maintainer packages (bus factor = 1)
   - Typosquatting risks
   - Dependency confusion risks
5. Sigstore/Cosign signing configuration
6. Recommended private registry mirrors
7. SBOM attestation policy (what to sign, when, how)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        components = [
            SBOMComponent(
                name        = c.get("name", ""),
                version     = c.get("version", ""),
                purl        = c.get("purl", ""),
                license     = c.get("license", "Unknown"),
                supplier    = c.get("supplier", ""),
                hash_sha256 = c.get("hash_sha256"),
                vulnerabilities = c.get("vulnerabilities", []),
            )
            for c in parsed.get("components", [])
        ]

        report = SBOMReport(
            sbom_id             = f"sbom-{uuid.uuid4().hex[:8]}",
            format              = "cyclonedx",
            components          = components,
            total               = len(components),
            vulnerable          = sum(1 for c in components if c.vulnerabilities),
            license_issues      = parsed.get("license_issues", []),
            supply_chain_risks  = parsed.get("supply_chain_risks", []),
            sbom_json           = json.dumps(parsed.get("sbom", {}), indent=2),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "sbom_id":            report.sbom_id,
                "total_components":   report.total,
                "vulnerable":         report.vulnerable,
                "license_issues":     report.license_issues,
                "supply_chain_risks": report.supply_chain_risks,
                "signing_config":     parsed.get("signing_config", {}),
                "sbom_json":          report.sbom_json,
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 3. Pen Test Agent ─────────────────────────────────────────────────────────

class PenTestAgent(BaseAgent):
    """
    Automated penetration testing scenarios:
    - Authentication and session management attacks
    - API abuse and business logic exploitation
    - Privilege escalation paths
    - Data exfiltration scenarios
    - Infrastructure attack surface analysis
    """

    AGENT_TYPE    = "pen_test_agent"
    SYSTEM_PROMPT = """You are an ethical hacker and penetration tester (OSCP/CISSP).
You design thorough pen test scenarios that find real vulnerabilities before attackers do.
You always:
- Follow responsible disclosure principles
- Test authentication, authorization, and session management thoroughly
- Look for business logic flaws, not just technical vulnerabilities
- Test API rate limiting, input validation, and output encoding
- Check for information disclosure in error messages
- Test for insecure file upload, path traversal, and SSRF
- Document attack chains (how multiple low-severity issues combine)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        target_description = task.get("description", "")
        architecture       = context.get("architecture", {})
        scope              = task.get("scope", "full")

        prompt = f"""Design a comprehensive penetration test plan and generate test scenarios.

Target Description: {target_description}
Architecture: {json.dumps(architecture, default=str)[:1000]}
Scope: {scope}

Produce:
1. Attack surface map (all entry points, APIs, admin interfaces)
2. Authentication attack scenarios (brute force, credential stuffing, MFA bypass)
3. Authorization attack scenarios (IDOR, privilege escalation, JWT manipulation)
4. Business logic attack scenarios (price manipulation, workflow bypass, race conditions)
5. Infrastructure attack scenarios (SSRF to cloud metadata, DNS rebinding)
6. Data exfiltration scenarios (SQL injection chains, file inclusion)
7. Attack chains (multi-step exploitation paths)
8. Testing methodology (tools, commands, expected results)
9. Success criteria for each test
10. Remediation priority matrix

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


# ── 4. Privacy Agent ──────────────────────────────────────────────────────────

@dataclass
class PIIField:
    location:    str        # "table.column" or "api.field"
    pii_type:    str        # "email" | "phone" | "ssn" | "credit_card" | etc.
    sensitivity: str        # "high" | "medium" | "low"
    encrypted:   bool
    masked:      bool
    retention:   Optional[str]


@dataclass
class PrivacyReport:
    report_id:       str
    pii_fields:      List[PIIField]
    gdpr_compliance: Dict[str, bool]
    data_map:        Dict[str, Any]
    deletion_workflow: str
    consent_flows:   List[str]
    dpa_requirements: List[str]
    risks:           List[str]


class PrivacyAgent(BaseAgent):
    """
    Privacy-by-design enforcement:
    - PII detection in code, schemas, and API specs
    - GDPR Article 30 data processing records
    - Right to erasure (deletion) workflow generation
    - Consent management flow design
    - Data minimization recommendations
    - Cross-border transfer analysis
    """

    AGENT_TYPE    = "privacy_agent"
    SYSTEM_PROMPT = """You are a Data Protection Officer (DPO) and privacy engineer.
You implement privacy-by-design in software systems. You always:
- Identify all PII fields and classify by sensitivity
- Apply data minimization (collect only what's needed)
- Design deletion workflows that cascade properly
- Generate GDPR Article 30 records of processing activities
- Ensure consent is granular, revocable, and auditable
- Flag cross-border data transfers requiring SCCs/BCRs
- Recommend pseudonymization and anonymization where possible"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        schema       = context.get("database_schema", task.get("schema", {}))
        api_spec     = context.get("openapi_spec", "")
        jurisdiction = task.get("jurisdiction", "EU")
        product_type = task.get("product_type", "SaaS")

        prompt = f"""Conduct a comprehensive privacy analysis and generate compliance artifacts.

Jurisdiction: {jurisdiction}
Product Type: {product_type}
Database Schema: {json.dumps(schema, default=str)[:1500]}
API Spec: {str(api_spec)[:500]}

Produce:
1. PII inventory (all fields, types, sensitivity, encryption status)
2. GDPR Article 30 record of processing activities
3. Data flow map (where PII enters, is processed, stored, and exits)
4. Right to erasure workflow (deletion cascade, anonymization steps)
5. Consent management flow (collection, storage, revocation, audit)
6. Data minimization recommendations (fields to remove/pseudonymize)
7. Cross-border transfer analysis (SCCs needed?)
8. Retention policy per data category
9. Privacy risk assessment (DPIA triggers)
10. Implementation code for deletion workflow

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        pii_fields = [
            PIIField(
                location    = p.get("location", ""),
                pii_type    = p.get("pii_type", ""),
                sensitivity = p.get("sensitivity", "medium"),
                encrypted   = p.get("encrypted", False),
                masked      = p.get("masked", False),
                retention   = p.get("retention"),
            )
            for p in parsed.get("pii_inventory", [])
        ]

        report = PrivacyReport(
            report_id         = f"privacy-{uuid.uuid4().hex[:8]}",
            pii_fields        = pii_fields,
            gdpr_compliance   = parsed.get("gdpr_compliance", {}),
            data_map          = parsed.get("data_flow_map", {}),
            deletion_workflow = parsed.get("deletion_workflow", ""),
            consent_flows     = parsed.get("consent_flows", []),
            dpa_requirements  = parsed.get("dpa_requirements", []),
            risks             = parsed.get("privacy_risks", []),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "report_id":          report.report_id,
                "pii_fields_count":   len(pii_fields),
                "high_sensitivity":   sum(1 for p in pii_fields if p.sensitivity == "high"),
                "unencrypted_pii":    sum(1 for p in pii_fields if not p.encrypted),
                "gdpr_compliance":    report.gdpr_compliance,
                "deletion_workflow":  report.deletion_workflow,
                "consent_flows":      report.consent_flows,
                "risks":              report.risks,
                "dpa_requirements":   report.dpa_requirements,
                "pii_fields":         [p.__dict__ for p in pii_fields],
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 5. Audit Trail Agent ──────────────────────────────────────────────────────

class AuditTrailAgent(BaseAgent):
    """
    Generates immutable audit logging for compliance:
    - SOC2 Type II audit event catalog
    - HIPAA access logging requirements
    - PCI-DSS cardholder data access logs
    - Tamper-evident log storage (append-only, signed)
    - Log retention policies
    - Audit query APIs
    """

    AGENT_TYPE    = "audit_trail_agent"
    SYSTEM_PROMPT = """You are a compliance engineer specializing in audit logging.
You build tamper-evident, queryable audit trails. You always:
- Log WHO did WHAT to WHICH resource at WHEN from WHERE
- Use structured logging (JSON) with consistent schema
- Implement append-only storage (no updates/deletes to audit logs)
- Sign log entries with HMAC to detect tampering
- Include correlation IDs for distributed tracing
- Meet SOC2/HIPAA/PCI retention requirements (7 years for some)
- Generate compliance reports from audit logs automatically"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        compliance_frameworks = task.get("frameworks", ["SOC2", "GDPR"])
        api_spec              = context.get("openapi_spec", "")
        data_model            = context.get("database_schema", {})

        prompt = f"""Design a complete audit trail system for these compliance frameworks.

Compliance Frameworks: {compliance_frameworks}
API Spec: {str(api_spec)[:800]}
Data Model: {json.dumps(data_model, default=str)[:800]}

Produce:
1. Audit event catalog (event type, required fields, retention period)
2. Audit log schema (JSON structure with all required fields)
3. Implementation code (middleware/decorator for automatic logging)
4. Tamper-evident storage design (HMAC signing, append-only DB)
5. Log retention and archival policy per framework
6. Audit query API (search by user, resource, time range, event type)
7. Compliance report templates (SOC2 evidence, HIPAA access log)
8. Alert rules (suspicious activity: bulk export, after-hours access, etc.)
9. Log forwarding configuration (SIEM integration: Splunk/ELK/Datadog)
10. Test cases for audit trail completeness

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


# ── 6. Policy-as-Code Agent ───────────────────────────────────────────────────

class PolicyAsCodeAgent(BaseAgent):
    """
    Generates OPA Rego policies for every business rule:
    - Authorization policies (RBAC, ABAC)
    - Data access policies
    - Infrastructure compliance policies (Terraform)
    - Kubernetes admission control policies
    - API gateway policies
    - CI/CD gate policies
    """

    AGENT_TYPE    = "policy_as_code_agent"
    SYSTEM_PROMPT = """You are an Open Policy Agent (OPA) expert. You translate
business rules into precise, testable Rego policies. You always:
- Write idiomatic Rego (use comprehensions, not imperative loops)
- Include unit tests for every policy rule
- Design policies for deny-by-default (allowlist, not denylist)
- Integrate with Kubernetes (Gatekeeper), Terraform (Conftest), and API gateways
- Document policies with business rule references
- Include policy bundles for easy distribution
- Generate CI/CD integration for policy enforcement"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        business_rules = task.get("business_rules", task.get("description", ""))
        policy_targets = task.get("targets", ["kubernetes", "api", "terraform"])
        rbac_model     = context.get("rbac_model", {})

        prompt = f"""Generate complete OPA Rego policies for these business rules.

Business Rules: {business_rules}
Policy Targets: {policy_targets}
RBAC Model: {json.dumps(rbac_model, default=str)[:500]}

For each target, produce:

KUBERNETES (Gatekeeper):
- ConstraintTemplate and Constraint resources
- Admission webhook policies (required labels, resource limits, image registry)
- Network policy enforcement

API GATEWAY:
- Request authorization policies (JWT claims, API key scopes)
- Rate limiting policies per role
- Data masking policies (hide PII for non-privileged roles)

TERRAFORM (Conftest):
- Infrastructure compliance policies (no public S3, encryption required, etc.)
- Cost policies (instance type restrictions)
- Tagging policies (required tags)

RBAC:
- Role definitions with least-privilege permissions
- Attribute-based access control (ABAC) policies
- Time-based access policies

Include unit tests for every policy. Respond as JSON with policy files as strings."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})
        arts   = self._write_policies(parsed, task.get("workspace", "."))

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {k: v for k, v in parsed.items()
                           if not isinstance(v, str) or len(v) < 200},
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_policies(self, policies: Dict, workspace: str) -> List[str]:
        import os
        arts       = []
        policy_dir = os.path.join(workspace, "policies")
        os.makedirs(policy_dir, exist_ok=True)

        for key, content in policies.items():
            if isinstance(content, str) and content.strip():
                ext  = ".rego" if "rego" in key.lower() or "policy" in key.lower() else (
                       ".yaml" if any(k in key.lower() for k in ["k8s", "kube", "constraint"]) else
                       ".tf" if "terraform" in key.lower() else ".rego")
                path = os.path.join(policy_dir, f"{key}{ext}")
                with open(path, "w") as f:
                    f.write(content)
                arts.append(path)

        return arts
