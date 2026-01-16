# AI-SDLC: Enterprise Software Development Framework for Claude Agents

**Version**: 1.0  
**Purpose**: Mandatory framework for Claude AI agents building or reshaping enterprise-grade software  
**Enforcement**: Include in system prompts, project knowledge, or agent instructions

---

## Framework Philosophy

**No shortcuts. No hallucinations. No technical debt by default.**

This framework ensures Claude agents produce software that is:
- **Production-ready**: Not prototypes, not demos—real deployable code
- **Enterprise-grade**: Security, scalability, observability, and compliance built-in
- **Maintainable**: Clean architecture, documentation, and test coverage
- **Auditable**: Every decision documented with rationale

---

## Mandatory Pre-Flight Checklist

Before writing ANY code, Claude agents MUST complete:

```
□ UNDERSTAND: What problem are we solving? For whom?
□ SCOPE: What's in/out of scope? What are the constraints?
□ ARCHITECTURE: What patterns fit this problem domain?
□ DEPENDENCIES: What exists? What integrates?
□ NON-FUNCTIONALS: Performance, security, compliance requirements?
□ SUCCESS CRITERIA: How do we know when we're done?
```

**If any item is unclear, ASK before proceeding.**

---

## Phase 1: DISCOVER — Requirements Engineering

### 1.1 Problem Definition

**Mandatory outputs:**
- Problem statement (one paragraph, specific and measurable)
- Stakeholder identification
- Business value quantification

**Template:**
```markdown
## Problem Statement
[WHO] needs [WHAT] because [WHY], which currently results in [IMPACT].

## Stakeholders
| Role | Interest | Influence | Key Concerns |
|------|----------|-----------|--------------|
| ... | ... | ... | ... |

## Business Value
- Current state cost/pain: [quantified]
- Target state benefit: [quantified]
- Success metrics: [specific, measurable]
```

### 1.2 Requirements Gathering

**Functional Requirements Format:**
```markdown
## FR-001: [Requirement Title]
- **Description**: What the system must do
- **Acceptance Criteria**: Given/When/Then format
- **Priority**: P0 (Must) | P1 (Should) | P2 (Could)
- **Dependencies**: Related requirements
```

**Non-Functional Requirements (MANDATORY for enterprise):**

| Category | Requirement | Target | Measurement |
|----------|-------------|--------|-------------|
| **Performance** | Response time | < 200ms p95 | APM metrics |
| **Availability** | Uptime SLA | 99.95% | Synthetic monitoring |
| **Scalability** | Concurrent users | 10,000+ | Load testing |
| **Security** | Auth standard | OAuth 2.0 / OIDC | Security audit |
| **Compliance** | Data residency | Regional | Architecture review |
| **Observability** | Log retention | 90 days | Logging platform |
| **Recovery** | RTO/RPO | 4hr / 1hr | DR testing |

---

## Phase 2: DESIGN — Architecture First

### 2.1 Architecture Decision Records (ADRs)

**Every significant decision MUST have an ADR:**

```markdown
# ADR-001: [Decision Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue we're seeing that motivates this decision?

## Decision
What is the change we're proposing and/or doing?

## Consequences
### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Mitigation: [how we address it]

### Neutral
- Side effect that's neither good nor bad

## Alternatives Considered
| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| ... | ... | ... | ... |
```

### 2.2 Layered Architecture Model

**All enterprise software MUST use layered architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  UI Components | API Gateway | Controllers | View Models     │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                         │
│  Use Cases | Application Services | DTOs | Orchestration     │
├─────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                            │
│  Entities | Value Objects | Domain Services | Aggregates     │
├─────────────────────────────────────────────────────────────┤
│                  INFRASTRUCTURE LAYER                        │
│  Repositories | External APIs | Messaging | Persistence      │
└─────────────────────────────────────────────────────────────┘
```

**Layer Rules:**
- Dependencies point INWARD only (Infrastructure → Domain, not reverse)
- Domain layer has ZERO external dependencies
- Application layer orchestrates, doesn't contain business logic
- Infrastructure implements interfaces defined by inner layers

### 2.3 Required Architecture Artifacts

**Before coding, produce:**

1. **Context Diagram**: System boundaries and external actors
2. **Component Diagram**: Internal structure and relationships
3. **Data Model**: Entities, relationships, storage strategy
4. **Sequence Diagrams**: Key workflows (happy path + error paths)
5. **Deployment Diagram**: Infrastructure, environments, networking

---

## Phase 3: DEVELOP — Code Standards

### 3.1 Project Structure (Language-Agnostic Pattern)

```
project-root/
├── docs/                      # Documentation
│   ├── adr/                   # Architecture Decision Records
│   ├── api/                   # API documentation
│   └── runbooks/              # Operational runbooks
├── src/                       # Source code
│   ├── presentation/          # UI, API controllers
│   ├── application/           # Use cases, app services
│   ├── domain/                # Business logic, entities
│   └── infrastructure/        # External integrations
├── tests/                     # Test code
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── scripts/                   # Build, deploy, utility scripts
├── config/                    # Configuration files
│   ├── local/
│   ├── dev/
│   ├── staging/
│   └── prod/
├── .github/                   # CI/CD workflows
│   └── workflows/
├── docker/                    # Container definitions
├── terraform/                 # Infrastructure as Code
│   └── modules/
└── README.md                  # Project overview
```

### 3.2 Code Quality Gates (MANDATORY)

**Every PR/commit must pass:**

| Gate | Requirement | Tool Examples |
|------|-------------|---------------|
| **Linting** | Zero warnings | ESLint, Pylint, Golangci-lint |
| **Formatting** | Consistent style | Prettier, Black, gofmt |
| **Type Safety** | Strict typing | TypeScript strict, mypy, Go |
| **Security Scan** | Zero high/critical | Snyk, Semgrep, Dependabot |
| **Unit Tests** | >80% coverage | Jest, pytest, go test |
| **Integration Tests** | Critical paths covered | Testcontainers |
| **Documentation** | Public APIs documented | OpenAPI, JSDoc, docstrings |

### 3.3 Coding Principles

**SOLID Principles (MANDATORY):**
- **S**ingle Responsibility: One class = one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many specific interfaces > one general
- **D**ependency Inversion: Depend on abstractions, not concretions

**Additional Enterprise Principles:**
- **DRY**: Don't Repeat Yourself (but don't over-abstract prematurely)
- **YAGNI**: You Aren't Gonna Need It (no speculative features)
- **KISS**: Keep It Simple, Stupid (simplest solution that works)
- **Fail Fast**: Validate early, fail loudly with clear errors

### 3.4 Error Handling Pattern

**Standard error response structure:**
```json
{
  "error": {
    "code": "ERR_VALIDATION_FAILED",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must be a valid email address"
      }
    ],
    "traceId": "abc123-def456",
    "timestamp": "2025-01-14T10:30:00Z",
    "documentation": "https://docs.example.com/errors/ERR_VALIDATION_FAILED"
  }
}
```

**Error handling rules:**
1. Never expose internal errors to users (no stack traces)
2. Always include trace IDs for debugging
3. Log full details server-side, return safe summary client-side
4. Use error codes that map to documentation
5. Handle ALL error cases explicitly (no silent failures)

---

## Phase 4: SECURE — Security by Design

### 4.1 Security Requirements Checklist

```
□ Authentication: OAuth 2.0 / OIDC / SAML implemented
□ Authorization: RBAC or ABAC with least privilege
□ Data Encryption: TLS 1.3 in transit, AES-256 at rest
□ Secrets Management: No hardcoded secrets, use vault
□ Input Validation: Whitelist validation on all inputs
□ Output Encoding: Context-appropriate encoding
□ Dependency Scanning: Automated CVE detection
□ Security Headers: CSP, HSTS, X-Frame-Options, etc.
□ Audit Logging: Who did what, when, from where
□ Rate Limiting: API throttling implemented
```

### 4.2 OWASP Top 10 Mitigations

| Risk | Mitigation | Implementation |
|------|------------|----------------|
| Injection | Parameterized queries | ORM/prepared statements |
| Broken Auth | MFA, session management | OAuth 2.0 + refresh tokens |
| Sensitive Data | Encryption, masking | TLS, column encryption |
| XXE | Disable external entities | Parser configuration |
| Broken Access | RBAC enforcement | Authorization middleware |
| Misconfiguration | Hardened defaults | Infrastructure as Code |
| XSS | Output encoding | Framework escaping |
| Insecure Deserialization | Type validation | Schema validation |
| Vulnerable Components | Dependency scanning | Automated updates |
| Insufficient Logging | Centralized logging | SIEM integration |

### 4.3 Data Classification

**Classify all data fields:**

| Classification | Examples | Handling |
|----------------|----------|----------|
| **Public** | Marketing content | No restrictions |
| **Internal** | Employee names | Auth required |
| **Confidential** | Customer PII | Encryption + RBAC |
| **Restricted** | Credentials, keys | Vault + audit + MFA |

---

## Phase 5: TEST — Quality Assurance

### 5.1 Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  Few, slow, expensive
                    │   Tests   │  Test user journeys
                    ├───────────┤
                    │Integration│  Some, medium cost
                    │   Tests   │  Test component interaction
                    ├───────────┤
                    │   Unit    │  Many, fast, cheap
                    │   Tests   │  Test business logic
                    └───────────┘
```

### 5.2 Test Coverage Requirements

| Test Type | Coverage Target | What to Test |
|-----------|-----------------|--------------|
| **Unit** | >80% line coverage | Domain logic, pure functions |
| **Integration** | Critical paths | API contracts, DB operations |
| **E2E** | Happy paths + key errors | User journeys, workflows |
| **Security** | OWASP Top 10 | Penetration, vulnerability |
| **Performance** | SLA targets | Load, stress, endurance |
| **Accessibility** | WCAG 2.1 AA | Screen readers, keyboard nav |

### 5.3 Test Structure (AAA Pattern)

```python
def test_user_registration_creates_account():
    # Arrange: Set up test data and dependencies
    user_data = {"email": "test@example.com", "name": "Test User"}
    repository = InMemoryUserRepository()
    service = UserRegistrationService(repository)
    
    # Act: Execute the behavior being tested
    result = service.register(user_data)
    
    # Assert: Verify the expected outcome
    assert result.success is True
    assert repository.find_by_email("test@example.com") is not None
```

---

## Phase 6: DEPLOY — CI/CD Pipeline

### 6.1 Pipeline Stages (MANDATORY)

```yaml
Pipeline:
  Build:
    - Compile/Bundle
    - Run linting
    - Run unit tests
    - Generate artifacts
    
  Security:
    - SAST scan
    - Dependency scan
    - Secret detection
    - Container scan
    
  Test:
    - Integration tests
    - Performance tests
    - Security tests
    
  Deploy-Dev:
    - Deploy to dev
    - Smoke tests
    - Manual gate
    
  Deploy-Staging:
    - Deploy to staging
    - Full E2E tests
    - Security scan
    - Manual approval
    
  Deploy-Prod:
    - Blue/green or canary
    - Health checks
    - Rollback ready
    - Notify stakeholders
```

### 6.2 Environment Promotion Rules

| Environment | Auto-Deploy | Approval | Tests Required |
|-------------|-------------|----------|----------------|
| **Dev** | Yes, on commit | None | Unit + lint |
| **Staging** | Yes, on PR merge | None | All automated |
| **Production** | Manual trigger | Required | All + manual QA |

### 6.3 Rollback Strategy

**Every deployment MUST have:**
1. **Automated health checks** (within 5 minutes)
2. **One-click rollback** capability
3. **Database migration rollback** scripts
4. **Feature flags** for new functionality
5. **Runbook** for manual intervention

---

## Phase 7: OPERATE — Production Readiness

### 7.1 Observability Stack (MANDATORY)

```
┌─────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│     METRICS     │     LOGS        │       TRACES            │
│  (Prometheus)   │  (ELK/Loki)     │   (Jaeger/Zipkin)       │
├─────────────────┼─────────────────┼─────────────────────────┤
│ - Response time │ - Structured    │ - Request flow          │
│ - Error rate    │ - Correlated    │ - Latency breakdown     │
│ - Throughput    │ - Searchable    │ - Dependency map        │
│ - Saturation    │ - Retained      │ - Error propagation     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 7.2 Alerting Rules

**Every service MUST have alerts for:**

| Metric | Warning | Critical | Response |
|--------|---------|----------|----------|
| Error rate | >1% | >5% | Page on-call |
| Latency p95 | >500ms | >2s | Auto-scale |
| Availability | <99.9% | <99.5% | Page + escalate |
| CPU | >70% | >90% | Auto-scale |
| Memory | >80% | >95% | Investigate leak |
| Disk | >70% | >85% | Cleanup/expand |

### 7.3 Runbook Template

```markdown
# Runbook: [Service Name] - [Scenario]

## Overview
Brief description of the alert/incident type

## Impact
What breaks when this happens? Who is affected?

## Detection
How do we know this is happening?

## Diagnosis
### Step 1: Check [X]
```bash
command to run
```
Expected output: [description]

### Step 2: Check [Y]
...

## Resolution
### Option A: [Most Common Fix]
1. Step 1
2. Step 2
3. Verify fix

### Option B: [Alternative]
...

## Escalation
- L1: On-call engineer
- L2: Team lead
- L3: Architecture/Platform team

## Prevention
What changes would prevent this in the future?
```

---

## Phase 8: ITERATE — Continuous Improvement

### 8.1 Technical Debt Management

**Debt Classification:**

| Type | Example | Priority | Payback Timeline |
|------|---------|----------|------------------|
| **Critical** | Security vulnerability | P0 | Immediate |
| **High** | Missing tests for critical path | P1 | This sprint |
| **Medium** | Outdated dependency | P2 | This quarter |
| **Low** | Code style inconsistency | P3 | Opportunistic |

**Rule**: Never ship new features with >20% tech debt ratio

### 8.2 Retrospective Triggers

**Conduct architecture review when:**
- Performance degrades >20% from baseline
- Incident count increases >50% month-over-month
- New capability requires >3 service changes
- Team velocity drops >25%
- Security audit finds >2 medium issues

### 8.3 Documentation Maintenance

**Keep current:**
- README (project setup, running locally)
- API documentation (OpenAPI spec)
- Architecture diagrams (quarterly review)
- ADRs (add new, mark deprecated)
- Runbooks (after every incident)

---

## Quick Reference: Agent Commands

### Starting a New Project
```
1. Complete Pre-Flight Checklist (Phase 0)
2. Document requirements using FR/NFR templates (Phase 1)
3. Create architecture artifacts (Phase 2)
4. Set up project structure (Phase 3)
5. Implement with quality gates (Phase 3)
6. Security review (Phase 4)
7. Test coverage verification (Phase 5)
8. CI/CD pipeline setup (Phase 6)
9. Observability implementation (Phase 7)
10. Handoff documentation (Phase 8)
```

### Reshaping Existing Application
```
1. Document current state (architecture, pain points)
2. Define target state with ADRs for changes
3. Create migration plan with phases
4. Implement incrementally with feature flags
5. Maintain backward compatibility
6. Add missing tests before refactoring
7. Monitor metrics during rollout
8. Clean up after successful migration
```

### Code Review Checklist
```
□ Follows layered architecture
□ SOLID principles applied
□ Error handling complete
□ Security considerations addressed
□ Tests added/updated
□ Documentation updated
□ No hardcoded values
□ Logging appropriate
□ Performance acceptable
□ Backward compatible
```

---

## Enforcement Instructions for Agents

**Include in agent system prompt or project knowledge:**

```
You MUST follow the AI-SDLC framework for all software development tasks:

BEFORE CODING:
- Complete the Pre-Flight Checklist
- Document requirements (FR + NFR)
- Create architecture artifacts (diagrams, ADRs)

DURING CODING:
- Follow the project structure template
- Apply SOLID principles
- Implement error handling pattern
- Address security requirements
- Write tests (unit, integration, e2e)

BEFORE DELIVERY:
- Pass all quality gates
- Complete security checklist
- Set up observability
- Create runbook for operations
- Update all documentation

If requirements are unclear, ASK before proceeding.
If you're unsure about architecture, DOCUMENT the decision in an ADR.
If you find existing technical debt, REPORT it before adding more.
```

---

## Appendix: Technology-Specific Guidelines

### For Python Projects
- Use type hints (mypy strict mode)
- Format with Black + isort
- Lint with Ruff or Pylint
- Test with pytest + coverage
- Package with Poetry or uv

### For TypeScript/Node Projects
- Enable strict mode in tsconfig
- Format with Prettier
- Lint with ESLint (strict rules)
- Test with Jest or Vitest
- Use dependency injection (tsyringe, inversify)

### For .NET Projects
- Use nullable reference types
- Format with dotnet format
- Analyze with Roslyn analyzers
- Test with xUnit + FluentAssertions
- Follow Clean Architecture pattern

### For Go Projects
- Use golangci-lint (strict preset)
- Format with gofmt
- Test with go test + testify
- Structure with cmd/, internal/, pkg/
- Handle errors explicitly (no panic in libraries)

---

*Framework Version: 1.0 | Last Updated: January 2025*
