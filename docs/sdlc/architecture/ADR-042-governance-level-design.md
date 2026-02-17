# ADR-042: Governance Level Design

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Security Agent, Conductor (Orchestrator)
**Related**: ARCH-20260216-CLAUDE-AISDLC-INTEGRATION, ADR-040, ADR-041

---

## Context

Different projects and organizations have different governance needs. A solo developer prototyping an idea needs minimal friction. A team building a production healthcare system needs full audit trails and blocking security reviews. The governance system must be configurable to support this range without requiring different codebases or deployments.

The existing Governance Engine (`src/governance-engine/`) provides policy validation, enforcement, and bypass mechanisms, but it operates at a single level. We need to extend it to support tiered governance with configurable blocking behavior.

## Decision

**We will implement a 4-level governance model where each level progressively increases the number of mandatory gates, their blocking behavior, and the audit requirements.**

### Level Definitions

#### Level 1: Tracking Only
- **Target Users**: Solo developers, rapid prototyping, learning
- **Gates**: None blocking
- **Actions**: Log all requests; generate documentation; track costs
- **Bypass**: Everything is effectively bypassed; all gates are advisory
- **Audit**: Request log only; no decision audit trail
- **Override**: Not needed (nothing blocks)

#### Level 2: Light Governance (Default/Recommended)
- **Target Users**: Small teams, startups, internal tools
- **Gates**: Security review (non-blocking); QA testing (non-blocking); architecture check for complex changes (non-blocking)
- **Actions**: All Level 1 actions; plus gate results as advisories; warnings shown to user
- **Bypass**: Can override any advisory with a reason (logged)
- **Audit**: Request log + governance decision log
- **Override**: Free override with reason string

#### Level 3: Full Governance
- **Target Users**: Production systems, client projects, team development
- **Gates**: Security review (BLOCKING); QA testing (BLOCKING); architecture review for complex changes (BLOCKING); customer acceptance for features (BLOCKING)
- **Actions**: All Level 2 actions; plus blocking enforcement; approval required to proceed past failed gate
- **Bypass**: Requires approval token (HMAC-SHA256 signed)
- **Audit**: Full audit trail with tamper-evident logging
- **Override**: Token-based override; token must be signed by authorized approver

#### Level 4: Audit Mode
- **Target Users**: Regulated industries, government, healthcare, finance
- **Gates**: All Level 3 gates; plus compliance checks (SOC2, HIPAA, etc.); segregation of duties; change approval workflow
- **Actions**: All Level 3 actions; plus compliance validation; approval workflow triggers; retention policies
- **Bypass**: No bypasses allowed; all gates must pass; human approval workflow required for exceptions
- **Audit**: Tamper-evident audit log; hash chain for integrity; configurable retention period
- **Override**: Only through formal exception workflow with multi-party approval

### Gate Behavior Matrix

| Gate | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|---|
| Request logging | Track | Track | Track | Track + hash chain |
| Security review | Skip | Advisory | Blocking | Blocking |
| QA testing | Skip | Advisory | Blocking | Blocking |
| Architecture review | Skip | Advisory (complex only) | Blocking (complex) | Blocking (all) |
| Customer acceptance | Skip | Skip | Blocking (features) | Blocking (all) |
| Compliance check | Skip | Skip | Skip | Blocking |
| Approval workflow | Skip | Skip | Skip | Blocking |
| Cost tracking | Track | Track | Track + alerts | Track + budgets |

### Branch-Level Overrides

Governance level can be overridden per branch:

```yaml
branches:
  protected:
    - "main"
    - "production"
  governance_overrides:
    main: 3          # Level 3 for main branch
    production: 4    # Level 4 for production
    "feature/*": 2   # Level 2 for feature branches
```

This means a developer on a feature branch has Level 2 governance, but merging to main triggers Level 3, and deploying to production requires Level 4.

### Bypass Token System

For Level 3, bypasses require a signed token:

```
Token structure: HMAC-SHA256(secret, data)
Where data = JSON.stringify({
  approver: "lead@team.com",
  reason: "Emergency hotfix for production outage",
  scope: "SDLC-20260216-1430",
  expiresAt: "2026-02-16T23:59:59Z",
  gates: ["security", "qa"]
})
```

The secret is configured via environment variable (`AISDLC_BYPASS_SECRET`).

## Alternatives Considered

### Alternative 1: Binary Governance (On/Off)
- **Description**: Either full governance or none
- **Pros**: Simple; no ambiguity
- **Cons**: Too rigid; users either get everything or nothing; no middle ground
- **Rejected because**: Does not serve the spectrum from solo dev to enterprise. A startup would turn it off; an enterprise would never turn it on if it means the same friction as audit mode for every typo fix.

### Alternative 2: Per-Gate Configuration
- **Description**: Each gate independently configurable as skip/advisory/blocking
- **Pros**: Maximum flexibility; fine-grained control
- **Cons**: Configuration complexity explosion; 6 gates x 4 modes = 4,096 combinations; hard to reason about; easy to misconfigure
- **Rejected because**: Too complex for users to configure correctly. The 4-level model gives 4 well-defined, tested, understandable configurations. Power users can still customize per-project.

### Alternative 3: Role-Based Governance
- **Description**: Governance level tied to user role (junior/senior/lead/admin)
- **Pros**: Aligns with organizational hierarchy; automatic enforcement by role
- **Cons**: Requires user management system; does not account for project risk; junior devs on low-risk projects get unnecessary friction
- **Rejected because**: Claude Code is typically single-user on a developer machine. Multi-user role-based governance is a future enhancement when the platform supports team use.

### Alternative 4: Risk-Based Automatic Governance
- **Description**: System automatically determines governance level based on request risk assessment
- **Pros**: No configuration needed; always appropriate; adapts in real-time
- **Cons**: Risk assessment is subjective; classification errors cascade; user loses control; unpredictable behavior
- **Rejected because**: Users need to know what governance they are under. Automatic level changes would be confusing and undermine trust. However, the classification system does influence which phases run within a given level.

## Consequences

### Positive
- Clear, predictable governance behavior at each level
- Easy to communicate: "This project is Level 2"
- Smooth progression: start at Level 1, move to 3 as project matures
- Branch-level overrides support real workflow patterns
- Existing governance engine reused with level awareness
- Bypass system provides escape hatch with accountability

### Negative
- 4 levels to test and maintain
- Gate behavior must be verified at each level
- Bypass token system adds cryptographic complexity
- Branch-level overrides add configuration surface
- Users may disagree with level recommendations

### Neutral
- Default Level 2 balances governance and developer experience
- Level can be changed at any time via configuration
- All governance decisions are logged regardless of level
- Governance level is visible in the dashboard
