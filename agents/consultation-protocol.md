# Agent Consultation Protocol

## Overview

The Agent Consultation Protocol enables formal knowledge sharing and collaborative decision-making between AI-SDLC agents. When an agent encounters a decision that benefits from another agent's expertise, it can initiate a consultation request.

## Consultation Types

### 1. Expertise Consultation
Request specialized knowledge from another agent.

```yaml
type: expertise
from: engineer-agent
to: security-agent
topic: "Authentication implementation"
question: "What are the security requirements for OAuth 2.0 PKCE flow?"
context:
  - Implementing mobile app authentication
  - Using Authorization Code flow with PKCE
  - Target: iOS and Android
priority: high
```

### 2. Review Consultation
Request review of work product before proceeding.

```yaml
type: review
from: engineer-agent
to: architect-agent
topic: "Database schema design"
artifact: "docs/sdlc/architecture/schema-design.md"
questions:
  - Is this schema normalized appropriately?
  - Are there scalability concerns?
  - Should we add any indexes?
priority: medium
```

### 3. Validation Consultation
Request validation of assumptions or decisions.

```yaml
type: validation
from: ba-agent
to: customer-agent
topic: "User story acceptance criteria"
assertion: "Users prefer email notifications over in-app"
evidence:
  - Previous user research
  - Industry standards
request: "Validate this assumption for our target users"
```

### 4. Escalation Consultation
Escalate complex issues requiring multiple perspectives.

```yaml
type: escalation
from: qa-agent
to: [engineer-agent, security-agent, architect-agent]
topic: "Critical bug with security implications"
severity: critical
description: "Found SQL injection in user search endpoint"
actions_needed:
  - engineer: Fix the vulnerability
  - security: Assess exposure and impact
  - architect: Review for similar patterns
```

## Protocol Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSULTATION PROTOCOL                        │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐     1. Request      ┌──────────┐
    │ Requesting├────────────────────►│ Consulted│
    │  Agent   │                      │  Agent   │
    └────┬─────┘                      └────┬─────┘
         │                                  │
         │                                  │ 2. Process
         │                                  │    Request
         │                                  ▼
         │                           ┌──────────┐
         │                           │ Analyze  │
         │                           │ Context  │
         │                           └────┬─────┘
         │                                │
         │                                │ 3. Formulate
         │                                │    Response
         │                                ▼
         │     4. Response           ┌──────────┐
         │◄──────────────────────────┤ Response │
         │                           └──────────┘
         │
         │ 5. Acknowledge &
         │    Integrate
         ▼
    ┌──────────┐
    │ Continue │
    │   Work   │
    └──────────┘
```

## Consultation Request Format

```json
{
  "consultation_id": "CONS-2024-001",
  "timestamp": "2024-01-15T10:30:00Z",
  "type": "expertise|review|validation|escalation",
  "priority": "low|medium|high|critical",
  "from": {
    "agent": "engineer-agent",
    "context": "Implementing user authentication",
    "work_item": "SDLC-001"
  },
  "to": {
    "agent": "security-agent",
    "reason": "Security expertise needed for auth implementation"
  },
  "request": {
    "topic": "OAuth 2.0 Security Best Practices",
    "questions": [
      "What token storage method is recommended?",
      "How should refresh tokens be handled?",
      "What are the PKCE requirements?"
    ],
    "context_files": [
      "src/auth/oauth-handler.ts",
      "docs/sdlc/requirements/REQ-001.md"
    ],
    "deadline": "2024-01-15T12:00:00Z"
  },
  "status": "pending|in_progress|completed|declined"
}
```

## Consultation Response Format

```json
{
  "consultation_id": "CONS-2024-001",
  "response_timestamp": "2024-01-15T11:00:00Z",
  "from": "security-agent",
  "response": {
    "answers": [
      {
        "question": "What token storage method is recommended?",
        "answer": "Use secure HTTP-only cookies for web, Keychain for iOS, EncryptedSharedPreferences for Android",
        "confidence": "high",
        "references": [
          "OWASP Token Storage Guidelines",
          "RFC 6819"
        ]
      }
    ],
    "recommendations": [
      "Implement token rotation on refresh",
      "Add rate limiting to token endpoints",
      "Log all authentication events"
    ],
    "warnings": [
      "Avoid storing tokens in localStorage - XSS vulnerable"
    ],
    "follow_up_needed": false
  },
  "learning_generated": {
    "pattern": "OAuth token storage best practices",
    "applies_to": ["engineer-agent", "security-agent"]
  }
}
```

## Agent Expertise Matrix

| Agent | Primary Expertise | Consult For |
|-------|------------------|-------------|
| BA Agent | Requirements, User Stories | Business rules, acceptance criteria |
| Architect (Jets) | System Design, Patterns | Architecture decisions, tech choices |
| Engineer | Implementation, Code | Coding questions, debugging |
| Security | Vulnerabilities, Compliance | Security review, threat modeling |
| QA Agent | Testing, Quality | Test strategies, coverage |
| Atlas Agent | Deployment, Infrastructure | DevOps, CI/CD, monitoring |
| Customer Agent | UAT, Acceptance | User perspective, usability |
| Conductor | Orchestration, Process | Workflow, coordination |
| FinOps | Cost, Budget | Cost implications, optimization |

## Consultation Rules

### 1. When to Consult
- Decisions outside your primary expertise
- High-impact changes affecting other domains
- Ambiguous requirements needing clarification
- Security or compliance implications
- Performance or scalability concerns

### 2. Response Expectations
| Priority | Expected Response Time |
|----------|----------------------|
| Critical | Immediate (blocks work) |
| High | Within current work session |
| Medium | Within same day |
| Low | Within 24 hours |

### 3. Consultation Limits
- Maximum 3 active consultations per agent
- Escalations bypass normal limits
- Consultations auto-expire after 48 hours if unaddressed

## Integration with Memory System

Consultations generate learnings that are stored in the cross-agent memory:

```json
{
  "learning_flows": {
    "security_to_engineer": {
      "examples": [
        {
          "source": "security-agent",
          "consultation_id": "CONS-2024-001",
          "finding": "OAuth token storage guidance",
          "learning": {
            "pattern": "Use platform-specific secure storage",
            "applicability": "All authentication implementations"
          }
        }
      ]
    }
  }
}
```

## Example Consultation Scenarios

### Scenario 1: Security Review Request

```
Engineer → Security:
"I'm implementing file upload. What validation is needed?"

Security Response:
1. Validate file type by magic bytes, not extension
2. Limit file size (recommend 10MB max)
3. Scan for malware before storing
4. Store outside web root
5. Generate random filenames
6. Set Content-Disposition header on download

Learning Generated: "File upload security checklist"
```

### Scenario 2: Architecture Consultation

```
Engineer → Architect:
"Should we use microservices or monolith for this feature?"

Architect Response:
Given the requirements:
- Team size: 5 developers
- Timeline: 3 months
- Complexity: Medium

Recommendation: Modular monolith
- Faster initial development
- Easier debugging
- Can extract to microservices later if needed
- Use clean architecture internally

Learning Generated: "Architecture selection criteria"
```

### Scenario 3: Cross-Team Escalation

```
QA → [Engineer, Security, Architect]:
"Found authentication bypass in admin panel"

Severity: CRITICAL

Engineer Action: Patch the vulnerability
Security Action: Assess data exposure, check logs
Architect Action: Review auth middleware pattern

Resolution: 2-hour coordinated fix
Learning Generated: "Admin authentication hardening pattern"
```

## CLI Integration

```bash
# Create consultation
scripts/consultation.sh create \
  --from engineer \
  --to security \
  --type expertise \
  --topic "API rate limiting" \
  --priority high

# List pending consultations
scripts/consultation.sh list --status pending

# Respond to consultation
scripts/consultation.sh respond CONS-2024-001 \
  --answer "Use token bucket algorithm with 100 req/min"

# View consultation history
scripts/consultation.sh history --agent engineer
```

## Best Practices

1. **Be Specific**: Clear, focused questions get better responses
2. **Provide Context**: Include relevant files and background
3. **Set Appropriate Priority**: Don't over-escalate routine questions
4. **Follow Up**: Acknowledge responses and ask clarifying questions
5. **Generate Learnings**: Extract patterns for future reference
6. **Respect Expertise**: Trust the consulted agent's domain knowledge

## Metrics Tracked

- Consultation response time
- Resolution rate
- Learning patterns generated
- Cross-agent collaboration frequency
- Escalation frequency by type
