# ADR-006: Policy Engine Architecture

**Date**: 2026-01-26
**Status**: PROPOSED
**Deciders**: Jets (Architect), Security Team, Engineering Leadership
**Technical Story**: Agent Intelligence & Governance System - Policy Component

---

## Context and Problem Statement

Currently, Vintiq engineering policies exist only in documentation. Compliance is enforced through manual code reviews and post-commit scanning. This creates several problems:

1. **Late Detection**: Policy violations found after code is written, requiring rework
2. **Inconsistent Enforcement**: Different reviewers interpret policies differently
3. **Human Overhead**: Reviewers must remember all policies during review
4. **No Agent Awareness**: AI agents generate code without knowing organizational rules

We need a **Policy-as-Code** engine that:
- Defines policies in machine-readable format
- Validates code and decisions in real-time
- Blocks non-compliant actions before they happen
- Provides clear feedback on violations and remediation

## Decision Drivers

1. **Governance by Default**: Agents cannot bypass policies
2. **Developer Experience**: Clear, actionable violation messages
3. **Flexibility**: Support org, project, and agent-level policies
4. **Performance**: <500ms policy evaluation time
5. **Auditability**: Full log of policy decisions
6. **Maintainability**: Policies defined in human-readable format

## Considered Options

### Option 1: Custom YAML-Based Policy Engine (Selected)

**Description**: Purpose-built policy engine using YAML definitions with a custom evaluation runtime.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    POLICY DEFINITION LAYER                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  YAML Policy Files                                       │    │
│  │  ├── org/vintiq-engineering.yaml                        │    │
│  │  ├── project/{id}/overrides.yaml                        │    │
│  │  └── agent/{type}/policies.yaml                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POLICY PARSER                                 │
│  - Validates YAML syntax                                        │
│  - Resolves inheritance (extends)                               │
│  - Merges org + project + agent policies                        │
│  - Caches compiled policies                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVALUATION ENGINE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Pre-Check    │  │ Stream Check │  │ Post-Check   │         │
│  │ Evaluator    │  │ Evaluator    │  │ Evaluator    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ENFORCEMENT LAYER                             │
│  - Block if critical/high violation                             │
│  - Warn if medium/low violation                                 │
│  - Log all decisions                                            │
│  - Store in memory for learning                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**:
- Full control over policy syntax and semantics
- Optimized for AI agent use cases
- YAML is human-readable and Git-friendly
- No external dependencies
- Can evolve with our needs

**Cons**:
- Must build and maintain evaluation engine
- No ecosystem of existing policies
- Testing infrastructure needed

### Option 2: Open Policy Agent (OPA) with Rego

**Description**: CNCF-graduated policy engine using Rego language.

**Pros**:
- Industry standard for policy-as-code
- Rich ecosystem and tooling
- Battle-tested at scale
- Strong community support
- Integrates with Kubernetes, Terraform, etc.

**Cons**:
- Rego language has steep learning curve
- Overkill for our specific use case
- Primarily designed for infrastructure policies
- Adding another runtime dependency
- Harder for non-engineers to write policies

**Example Rego Policy**:
```rego
package vintiq.security

deny[msg] {
    input.code contains "password"
    input.code contains "="
    msg := "Potential hardcoded password detected"
}
```

### Option 3: Semgrep for Code Analysis

**Description**: Static analysis tool with custom rule support.

**Pros**:
- Excellent for code pattern matching
- Large rule library
- Fast analysis
- Good IDE integration

**Cons**:
- Only covers code analysis (not architecture, process)
- Limited to pattern matching (no contextual policies)
- Requires Semgrep server for some features
- Not designed for real-time streaming analysis

### Option 4: JSON Schema + Custom Validators

**Description**: JSON Schema for structure validation plus custom validator functions.

**Pros**:
- Standard format
- Simple validation
- Good tooling support

**Cons**:
- Limited expressive power
- Cannot handle complex policy logic
- Not suitable for code analysis
- Would need many custom validators anyway

## Decision Outcome

**Chosen Option**: **Custom YAML-Based Policy Engine**

### Rationale

1. **Agent-Specific Requirements**: OPA and Semgrep are designed for different use cases. We need policies that understand AI agent workflows, not just Kubernetes resources or static code.

2. **Developer Experience**: YAML is familiar to our team. Rego would require training and has a steeper learning curve for policy authors.

3. **Real-Time Streaming**: We need to evaluate policies during agent generation (streaming), not just before or after. OPA doesn't naturally support this.

4. **Evolution Flexibility**: Building our own engine allows us to add agent-specific features like "memory-aware policies" that can reference past decisions.

5. **Integration Simplicity**: Direct Python integration without additional services to deploy and maintain.

### Hybrid Approach

We will **integrate Semgrep** for code-specific policies while using our custom engine for:
- Architecture policies
- Repository policies
- Process policies
- Compliance policies
- Agent-specific policies

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLICY ENGINE                                 │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ Custom YAML Engine     │  │ Semgrep Integration    │        │
│  │                        │  │                        │        │
│  │ - Architecture         │  │ - Code patterns        │        │
│  │ - Repository           │  │ - Security vulns       │        │
│  │ - Process              │  │ - Style checks         │        │
│  │ - Compliance           │  │                        │        │
│  │ - Agent-specific       │  │                        │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                  │
│  Results merged into unified PolicyResult                       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Policy YAML Schema

```yaml
# policy-schema.yaml

$schema: "http://json-schema.org/draft-07/schema#"
title: "Vintiq Policy Definition"

properties:
  version:
    type: string
    pattern: "^\\d+\\.\\d+\\.\\d+$"

  name:
    type: string
    minLength: 3

  description:
    type: string

  effective_date:
    type: string
    format: date

  extends:
    type: array
    items:
      type: string

  repository:
    type: object
    properties:
      allowed_organizations:
        type: array
        items:
          type: string
      branch_naming:
        type: object
        properties:
          pattern:
            type: string
          error_message:
            type: string
      # ... more repository rules

  architecture:
    type: object
    properties:
      mandatory_pattern:
        type: string
        enum: [layered, hexagonal, clean, microservices]
      layers:
        type: object
      principles:
        type: object

  security:
    type: object
    properties:
      authentication:
        type: object
      authorization:
        type: object
      encryption:
        type: object
      input_validation:
        type: object
      secrets:
        type: object
      owasp_top_10:
        type: object

  code_quality:
    type: object
    properties:
      test_coverage:
        type: object
      linting:
        type: object
      complexity:
        type: object

  compliance:
    type: object
    additionalProperties:
      type: object
      properties:
        applies_to:
          type: array
        requirements:
          type: array
        enforcement:
          type: string
          enum: [block, warn, info]

  enforcement:
    type: object
    properties:
      pre_generation:
        type: array
      during_generation:
        type: array
      post_generation:
        type: array
```

### Policy Engine API

```typescript
// policy-engine.ts

interface PolicyEngine {
    /**
     * Initialize engine with policy files
     */
    initialize(policyPaths: string[]): Promise<void>;

    /**
     * Pre-generation check - validate before agent starts
     */
    preCheck(context: PolicyContext): Promise<PolicyResult>;

    /**
     * Stream check - validate during generation (real-time)
     */
    streamCheck(chunk: CodeChunk, context: PolicyContext): PolicyResult;

    /**
     * Post-generation check - validate completed output
     */
    postCheck(output: GenerationOutput, context: PolicyContext): Promise<PolicyResult>;

    /**
     * Get explanation for a violation
     */
    explainViolation(violationId: string): ViolationExplanation;

    /**
     * List active policies for context
     */
    getActivePolicies(context: PolicyContext): Policy[];

    /**
     * Validate policy file syntax
     */
    validatePolicy(policyYaml: string): ValidationResult;

    /**
     * Hot-reload policies without restart
     */
    reloadPolicies(): Promise<void>;
}

interface PolicyContext {
    projectId: string;
    repository: string;
    branch: string;
    user: UserContext;
    agentType: AgentType;
    requestType: RequestType;
    complianceScopes: string[];
    vintiqProducts?: string[];
}

interface PolicyResult {
    allowed: boolean;
    violations: PolicyViolation[];
    warnings: PolicyWarning[];
    suggestions: PolicySuggestion[];
    appliedPolicies: string[];
    evaluationTime: number;
    auditId: string;
}

interface PolicyViolation {
    id: string;
    policyName: string;
    ruleName: string;
    severity: "critical" | "high" | "medium" | "low";
    category: ViolationCategory;
    message: string;
    location?: CodeLocation;
    remediation: string;
    references: string[];
    autoFixAvailable: boolean;
}

type ViolationCategory =
    | "security"
    | "architecture"
    | "code_quality"
    | "compliance"
    | "repository"
    | "documentation";
```

### Evaluation Flow

```python
# policy_evaluator.py

class PolicyEvaluator:
    def __init__(self, policies: List[Policy]):
        self.policies = policies
        self.semgrep = SemgrepRunner()

    def pre_check(self, context: PolicyContext) -> PolicyResult:
        """Validate before agent starts generating."""
        violations = []

        # Check repository policies
        for policy in self.get_repository_policies():
            if not self.check_repository_allowed(context.repository, policy):
                violations.append(PolicyViolation(
                    severity="critical",
                    category="repository",
                    message=f"Repository {context.repository} not in allowed list"
                ))

        # Check user authorization
        for policy in self.get_auth_policies():
            if not self.check_user_authorized(context.user, context.agentType, policy):
                violations.append(PolicyViolation(
                    severity="critical",
                    category="security",
                    message=f"User {context.user.id} not authorized for {context.agentType}"
                ))

        # Check required context exists
        for policy in self.get_context_policies():
            missing = self.check_required_context(context, policy)
            if missing:
                violations.append(PolicyViolation(
                    severity="high",
                    category="process",
                    message=f"Missing required context: {missing}"
                ))

        return PolicyResult(
            allowed=not any(v.severity in ["critical", "high"] for v in violations),
            violations=violations
        )

    def stream_check(self, chunk: CodeChunk, context: PolicyContext) -> PolicyResult:
        """Validate code as it's being generated."""
        violations = []

        # Fast checks for streaming (must be <50ms)

        # Check for hardcoded secrets
        secret_patterns = self.get_secret_patterns()
        for pattern in secret_patterns:
            if pattern.matches(chunk.content):
                violations.append(PolicyViolation(
                    severity="critical",
                    category="security",
                    message="Potential hardcoded secret detected",
                    autoFixAvailable=True
                ))

        # Check for SQL injection patterns
        if self.detect_sql_injection_risk(chunk.content):
            violations.append(PolicyViolation(
                severity="critical",
                category="security",
                message="Potential SQL injection vulnerability"
            ))

        return PolicyResult(
            allowed=not any(v.severity == "critical" for v in violations),
            violations=violations
        )

    def post_check(self, output: GenerationOutput, context: PolicyContext) -> PolicyResult:
        """Comprehensive validation of completed output."""
        violations = []

        # Run Semgrep for code analysis
        semgrep_results = self.semgrep.scan(output.files)
        violations.extend(self.convert_semgrep_results(semgrep_results))

        # Check test coverage
        if output.coverage:
            coverage_policy = self.get_coverage_policy()
            if output.coverage.total < coverage_policy.minimum_total:
                violations.append(PolicyViolation(
                    severity="high" if coverage_policy.enforcement == "block" else "medium",
                    category="code_quality",
                    message=f"Test coverage {output.coverage.total}% below minimum {coverage_policy.minimum_total}%"
                ))

        # Check architecture compliance
        arch_violations = self.check_architecture_compliance(output.files, context)
        violations.extend(arch_violations)

        # Check compliance requirements
        for scope in context.complianceScopes:
            compliance_violations = self.check_compliance(output, scope)
            violations.extend(compliance_violations)

        return PolicyResult(
            allowed=not any(v.severity in ["critical", "high"] for v in violations),
            violations=violations
        )
```

### Policy Inheritance Model

```
Organization Policies (Base)
        │
        ├── extends: base-security.yaml
        ├── extends: base-quality.yaml
        │
        ▼
Project Policies (Override/Extend)
        │
        ├── Inherit all org policies
        ├── Override specific rules
        ├── Add project-specific rules
        │
        ▼
Agent Policies (Additional)
        │
        ├── Inherit org + project policies
        ├── Add agent-specific constraints
```

Example:
```yaml
# Organization level: vintiq-engineering.yaml
security:
  secrets:
    no_hardcoded: true
    detection_tools: [gitleaks]
  test_coverage:
    minimum_total: 80

# Project level: project-auth-service/overrides.yaml
extends:
  - vintiq-engineering.yaml

security:
  test_coverage:
    minimum_total: 90  # Override: stricter for auth service

compliance:
  hipaa:
    applies_to: [this_project]
    requirements:
      - "PHI encryption required"
```

## Consequences

### Positive

1. **Governance by Default**: Every agent action validated against policies
2. **Clear Feedback**: Developers get specific violation messages with remediation
3. **Audit Trail**: All policy decisions logged for compliance
4. **Flexibility**: YAML is easy to write, review, and version control
5. **Performance**: Custom engine optimized for our use case

### Negative

1. **Development Effort**: Must build and maintain the engine
2. **No Ecosystem**: Cannot leverage existing policy libraries
3. **Testing Burden**: Need comprehensive tests for policy logic

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Policy logic bugs | Extensive unit tests + staging validation |
| Performance issues | Caching + async evaluation where possible |
| Policy conflicts | Clear inheritance rules + conflict detection |
| Maintenance burden | Keep engine simple, invest in tooling |

## Compliance

- **SOC2**: Policy enforcement provides audit evidence
- **GDPR**: Policies can enforce data handling rules
- **DCAA**: Policies can require audit trail compliance

## Links

- Architecture Document: ARCH-20260126-GOVERNANCE.md
- [Open Policy Agent](https://www.openpolicyagent.org/)
- [Semgrep](https://semgrep.dev/)
