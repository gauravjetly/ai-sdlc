# Claude Code Skills - AI-SDLC Agent Reference

This document lists all available Claude Code skills for the AI-SDLC platform.
Skills are installed at `~/.claude/skills/` and are invokable via slash commands in Claude Code.

---

## Overview

The AI-SDLC platform provides 13 specialized agent skills that cover the complete
software development lifecycle. Each agent is self-learning - it maintains memory
at `~/.claude/agent-memory/` and gets smarter with every task it completes.

---

## All Available Skills

### Orchestration

#### `/conductor` - Full SDLC Orchestrator

Runs the complete SDLC pipeline by coordinating all specialized agents in sequence.

**Location:** `~/.claude/skills/conductor/`

**Usage:**
```bash
/conductor Build a user authentication system with OAuth 2.0 and MFA
/conductor Add real-time notifications to the dashboard
/conductor Create a REST API for the inventory management module
```

**Pipeline executed:**
```
Requirements -> Architecture -> UX -> Implementation -> Security -> QA -> UAT -> Exec Report
```

---

### Phase Agents

#### `/ba-agent` - Business Analyst

Gathers requirements, writes user stories, defines acceptance criteria, performs
stakeholder analysis.

**Location:** `~/.claude/skills/ba-agent/`

**Usage:**
```bash
/ba-agent Gather requirements for user authentication with OAuth 2.0 and MFA
/ba-agent Write user stories for the checkout flow
/ba-agent Define acceptance criteria for the payment module
```

**Outputs:** `docs/sdlc/requirements/REQ-{YYYYMMDD}-{SLUG}.md`

---

#### `/architect-jets` - System Architect

Designs microservices, cloud-native, enterprise, AI/ML, and distributed systems.
Creates Architecture Decision Records (ADRs).

**Location:** `~/.claude/skills/architect-jets/`

**Usage:**
```bash
/architect-jets Design microservices architecture for payment processing
/architect-jets Create ADR for choosing between REST and GraphQL
/architect-jets Review and evolve the authentication service architecture
```

**Outputs:**
- `docs/sdlc/architecture/ARCH-{YYYYMMDD}-{SLUG}.md`
- `docs/sdlc/architecture/ADR-{NNN}-{slug}.md`

---

#### `/ux` - UX/UI Specialist

Handles UX research, wireframes, design systems, accessibility (WCAG 2.1 AAA),
and usability reviews.

**Location:** `~/.claude/skills/ux-agent/`

**Usage:**
```bash
/ux design a customer dashboard
/ux review src/components/
/ux check accessibility
/ux create design system
```

**Outputs:**
- `docs/sdlc/ux/UX-RESEARCH-*.md`
- `docs/sdlc/ux/DESIGN-SYSTEM-*.md`
- `docs/sdlc/ux/WIREFRAMES-*.md`

---

#### `/software-engineer` - Development Specialist

Implements features, fixes bugs, refactors code, writes tests. Follows SOLID
principles and layered architecture.

**Location:** `~/.claude/skills/software-engineer/`

**Usage:**
```bash
/software-engineer Implement JWT authentication middleware
/software-engineer Fix the race condition in the payment processor
/software-engineer Refactor the user service to use repository pattern
```

---

#### `/security-agent` - Security Specialist

Reviews code for OWASP Top 10 vulnerabilities, performs threat modeling (STRIDE),
assesses compliance (GDPR/SOC2/HIPAA).

**Location:** `~/.claude/skills/security-agent/`

**Usage:**
```bash
/security-agent Review src/auth/ for authentication vulnerabilities
/security-agent Threat model the payment processing flow
/security-agent Check compliance with GDPR requirements
```

**Outputs:** `docs/sdlc/security/SECURITY-REVIEW-{YYYYMMDD}-{SLUG}.md`

---

#### `/qa-agent` - QA Specialist

Writes and runs tests (unit, integration, e2e), analyzes coverage, validates
quality gates, performance testing.

**Location:** `~/.claude/skills/qa-agent/`

**Usage:**
```bash
/qa-agent Write comprehensive tests for the payment module
/qa-agent Run full test suite and report coverage gaps
/qa-agent Create e2e tests for the user registration flow
```

**Outputs:** `docs/sdlc/testing/TEST-REPORT-{YYYYMMDD}-{SLUG}.md`

---

#### `/atlas-agent` - DevOps/SRE Specialist

Handles deployments, CI/CD pipelines, monitoring configuration, incident response,
and infrastructure automation.

**Location:** `~/.claude/skills/atlas-agent/`

**Usage:**
```bash
/atlas-agent Set up CI/CD pipeline for the auth service
/atlas-agent Deploy the payment service to staging
/atlas-agent Configure monitoring and alerting for the API gateway
```

---

#### `/customer-agent` - UAT Specialist

Validates business value from the user perspective, runs acceptance testing,
ensures features meet real user needs.

**Location:** `~/.claude/skills/customer-agent/`

**Usage:**
```bash
/customer-agent Validate the checkout flow meets business requirements
/customer-agent Run UAT for the new dashboard feature
/customer-agent Assess business value delivered by the auth module
```

---

#### `/exec-agent` - Executive Presentation Generator

Generates professional Deltek-branded PowerPoint presentations for C-Suite,
architecture reviews, and status reports. Uses Bayesian optimization to improve
quality over time.

**Location:** `~/.claude/skills/exec-agent/`

**Usage:**
```bash
/exec-agent generate SDLC-20260217-001 executive-summary c-suite
/exec-agent generate SDLC-001 architecture tech-lead
/exec-agent generate SDLC-002 status project-team
/exec-agent list
/exec-agent stats
```

**Outputs:** `~/.claude/exec-agent-memory/presentations/*.pptx`

---

### Support & Operations

#### `/ask-tom` - Elite Problem Solver

Systematic root cause analysis and debugging. Never gives up until the problem
is completely solved. Learns from every problem it solves.

**Location:** `~/.claude/skills/ask-tom/`

**Usage:**
```bash
/ask-tom The payment service crashes intermittently under load
/ask-tom Why are tests failing in CI but passing locally?
/ask-tom Find and fix the memory leak in the auth service
```

---

#### `/finops-agent` - Financial Operations

Analyzes infrastructure costs, identifies waste, forecasts budgets, recommends
cost optimizations with ROI analysis.

**Location:** `~/.claude/skills/finops-agent/`

**Usage:**
```bash
/finops-agent Analyze AWS costs for the production environment
/finops-agent Estimate cost of the new microservices architecture
/finops-agent Identify cost optimization opportunities in current infrastructure
```

---

#### `/tracker-agent` - Progress Tracking

Tracks SDLC phase progress across all active projects, identifies blockers,
generates status reports, predicts delivery timelines.

**Location:** `~/.claude/skills/tracker-agent/`

**Usage:**
```bash
/tracker-agent Show current SDLC progress for all active projects
/tracker-agent What are the current blockers?
/tracker-agent Generate sprint status report
```

**Outputs:** `docs/sdlc/tracking/SDLC-STATUS-{YYYYMMDD}.md`

---

## Quick Reference Table

| Command | Agent | Phase | Primary Output |
|---------|-------|-------|----------------|
| `/conductor` | Conductor | All phases | All SDLC artifacts |
| `/ba-agent` | BA Agent | Requirements | `docs/sdlc/requirements/REQ-*.md` |
| `/architect-jets` | Architect Jets | Architecture | `docs/sdlc/architecture/ARCH-*.md` |
| `/ux` | UX Agent | UX Design | `docs/sdlc/ux/*.md` |
| `/software-engineer` | Software Engineer | Development | `src/` code + tests |
| `/security-agent` | Security Agent | Security Review | `docs/sdlc/security/*.md` |
| `/qa-agent` | QA Agent | Testing | `docs/sdlc/testing/*.md` |
| `/atlas-agent` | Atlas Agent | Deployment | CI/CD + runbooks |
| `/customer-agent` | Customer Agent | UAT | UAT report |
| `/exec-agent` | Exec Agent | Reporting | `presentations/*.pptx` |
| `/ask-tom` | Ask Tom | Support | Root cause + fix |
| `/finops-agent` | FinOps Agent | Operations | Cost analysis report |
| `/tracker-agent` | Tracker Agent | Operations | `docs/sdlc/tracking/*.md` |

---

## SDLC Phase Flow

```
[1] Requirements   /ba-agent
        |
        v
[2] Architecture   /architect-jets
        |
        v
[3] UX Design      /ux
        |
        v
[4] Implementation /software-engineer
        |
        v
[5] Security       /security-agent
        |
        v
[6] QA Testing     /qa-agent
        |
        v
[7] UAT            /customer-agent
        |
        v
[8] Deployment     /atlas-agent
        |
        v
[9] Exec Report    /exec-agent
```

Use `/conductor` to run all phases automatically.

---

## Self-Learning Memory Architecture

Each agent stores its memory at `~/.claude/agent-memory/{agent-name}/`:

| Agent | Memory Location |
|-------|----------------|
| BA Agent | `~/.claude/agent-memory/ba/` |
| Architect Jets | `~/.claude/agent-memory/architect/` |
| UX Agent | `~/.claude/agent-memory/ux/` |
| Software Engineer | `~/.claude/agent-memory/engineer/` |
| Security Agent | `~/.claude/agent-memory/security/` |
| QA Agent | `~/.claude/agent-memory/qa/` |
| Atlas Agent | `~/.claude/agent-memory/atlas/` |
| Customer Agent | `~/.claude/agent-memory/customer/` |
| FinOps Agent | `~/.claude/agent-memory/finops/` |
| Tracker Agent | `~/.claude/agent-memory/tracker/` |
| Ask Tom | `~/.claude/agent-memory/ask-tom/` |
| Exec Agent | `~/.claude/exec-agent-memory/` |

---

## Installation

Skills are pre-installed at `~/.claude/skills/`. No additional setup required.

For re-installation or updates, see the AI-SDLC repository:
`/Users/gauravjetly/aisdlc-2.1.0/`

---

*Last updated: 2026-02-18*
*AI-SDLC Platform v2.1.0*
