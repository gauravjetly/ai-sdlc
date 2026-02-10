# Security Review v2: Multi-Project Orchestration Layer

**ID**: SECURITY-REVIEW-20260210-0011-v2
**Status**: APPROVED (with conditions)
**Date**: 2026-02-10
**Reviewer**: Security Agent
**Extends**: SECURITY-REVIEW-20260210-0011 (v1 findings still apply)

---

## 1. Scope

This review covers the v2 multi-project orchestration layer added on top of the v1 scheduling module:

| File | Purpose |
|------|---------|
| `scheduling/domain/entities/ScheduledProject.ts` | Project entity with 7-phase lifecycle |
| `scheduling/application/services/ProjectOrchestrationService.ts` | Orchestration, agent allocation, dashboard |
| `scheduling/presentation/routes/project-routes.ts` | Express API routes for projects |
| `scheduling/presentation/dto/project-dto.ts` | Zod validation schemas |
| `webapp/src/components/scheduling/MultiProjectDashboard.tsx` | React dashboard component |

---

## 2. Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | -- |
| High | 1 | Conditional |
| Medium | 3 | Conditional |
| Low | 2 | Accepted |
| Informational | 3 | Noted |

---

## 3. Detailed Findings

### FINDING-V2-001: Missing Authentication Enforcement on Lifecycle Endpoints [HIGH]

**Location**: `project-routes.ts` lines 135-146 (start, cancel endpoints)

**Issue**: The `/projects/:id/start`, `/projects/:id/cancel`, and `/projects/:id/phases/:phase/complete` endpoints do not enforce authentication or authorization. Any request can start, cancel, or advance any project. The `createdBy` field is only populated on create.

**Risk**: Unauthorized users could manipulate project lifecycle, cancel others' projects, or force-advance phases to bypass quality gates.

**Remediation**:
- Add authentication middleware to all project routes
- Implement authorization check: only project creator, admin, or assigned agent can modify a project
- The `POST /scheduler/process` admin endpoint must require elevated privileges

**Condition**: This MUST be implemented before production deployment.

---

### FINDING-V2-002: Scheduler Admin Endpoint Lacks Access Control [MEDIUM]

**Location**: `project-routes.ts` line 259

**Issue**: `POST /projects/scheduler/process` triggers the scheduling loop. This is an administrative action that should only be callable by the system scheduler or admin users, but has no access control.

**Risk**: An attacker could trigger excessive agent allocations, cause resource exhaustion, or interfere with fair scheduling.

**Remediation**: Restrict to admin role or system-internal calls only. Consider removing from public API entirely and using an internal timer.

---

### FINDING-V2-003: Agent Pool Shared Resource Contention [MEDIUM]

**Location**: `ProjectOrchestrationService.ts` lines 213-246 (processReadyProjects)

**Issue**: The agent allocation loop is not atomic. Between reading active projects and assigning agents, another concurrent call could assign the same agent to a different project (race condition).

**Risk**: Two projects could receive the same agent simultaneously, leading to undefined behavior, data corruption, or agent overload.

**Remediation**:
- Use database-level locking (SELECT FOR UPDATE) or Redis-based distributed lock on agent allocation
- Ensure `processReadyProjects()` runs with mutual exclusion
- The `onAgentReleased()` method has the same race condition and should also lock

---

### FINDING-V2-004: Error Messages May Leak Internal State [MEDIUM]

**Location**: `project-routes.ts` lines 271-283 (error handler)

**Issue**: The error handler uses string matching (`includes('required')`, `includes('not found')`) to classify errors. Domain errors that happen to contain these substrings could be misclassified. More importantly, unhandled errors fall through to a generic 500 response, but `console.error` logs the full error message which could contain sensitive data.

**Risk**: Log injection; sensitive state exposure in error logs.

**Remediation**:
- Use typed error classes (e.g., `ValidationError`, `NotFoundError`) instead of string matching
- Sanitize error messages before logging to prevent log injection
- Never include stack traces in API responses (already correct in current code)

---

### FINDING-V2-005: Frontend Fetch Without CSRF Protection [LOW]

**Location**: `MultiProjectDashboard.tsx` lines (fetch calls)

**Issue**: The dashboard makes POST requests (`createProject`) using `fetch` without CSRF tokens.

**Risk**: If the API is cookie-authenticated, a malicious site could trigger project creation via cross-site request forgery.

**Remediation**: Use CSRF tokens in all state-changing requests, or ensure API uses token-based auth (Bearer tokens in Authorization header) which is inherently CSRF-resistant.

---

### FINDING-V2-006: Input Validation on Path Parameter (Phase) [LOW]

**Location**: `project-routes.ts` lines 179-183

**Issue**: The phase URL parameter is validated via Zod enum, which is good. However, the raw `req.params.phase` is included directly in the error message response.

**Risk**: Minor reflected content -- an attacker could craft a URL with a long or special-character phase parameter that gets reflected in the response.

**Remediation**: Truncate or sanitize `req.params.phase` in the error response to prevent any reflection attacks. Current risk is low since Zod rejects invalid input before reaching business logic.

---

### FINDING-V2-007: Delivery Date Can Be Set in the Past [INFORMATIONAL]

**Location**: `project-dto.ts` line 21

**Issue**: `deliveryDate` is validated as a datetime string but not checked against current date. Projects could be created with past delivery dates, which would immediately show as "behind" on the dashboard.

**Note**: This may be intentional for importing historical data, but should be validated in the UI.

---

### FINDING-V2-008: No Rate Limiting on Project Creation [INFORMATIONAL]

**Location**: `project-routes.ts` line 86

**Issue**: No rate limiting on `POST /projects`. A malicious or buggy client could create thousands of projects.

**Note**: Rate limiting should be applied at the API gateway level. The v1 security review (FINDING-003) already flagged API-wide rate limiting as a condition.

---

### FINDING-V2-009: Dashboard Returns All Projects (Potential Data Exposure) [INFORMATIONAL]

**Location**: `ProjectOrchestrationService.ts` line 275 (getDashboard)

**Issue**: The dashboard query retrieves up to 100 projects regardless of who is requesting. In a multi-tenant environment, one user could see another user's projects.

**Note**: Implement tenant/user-scoped queries when multi-tenancy is enabled. Currently acceptable for single-tenant deployments.

---

## 4. Positive Security Observations

1. **Zod Validation**: All API inputs are validated with Zod schemas before reaching business logic. Schema definitions include max lengths, enum restrictions, and sensible defaults. This is strong input validation.

2. **Domain Validation**: The `ScheduledProject` entity enforces business invariants (e.g., cannot skip phases, cannot start without completing previous, cannot cancel completed projects). This defense-in-depth prevents invalid state transitions even if the API layer is bypassed.

3. **Agent Release on Phase Completion**: `completePhase()` sets `assignedAgentId = null`, preventing dangling agent references.

4. **No Direct SQL**: All data access goes through repository interfaces, preventing SQL injection.

5. **Async Error Handling**: All route handlers are wrapped in `asyncHandler` which properly catches and forwards errors to the error middleware.

6. **Frontend Security**: The React dashboard does not use `dangerouslySetInnerHTML` and properly handles state. No XSS vectors identified.

---

## 5. Verdict

**APPROVED** with the following conditions that must be addressed before production:

| # | Condition | Priority | Deadline |
|---|-----------|----------|----------|
| 1 | Add authentication/authorization to all project lifecycle endpoints (FINDING-V2-001) | HIGH | Before staging |
| 2 | Restrict scheduler/process endpoint to admin/system only (FINDING-V2-002) | MEDIUM | Before staging |
| 3 | Implement distributed locking for agent allocation to prevent race conditions (FINDING-V2-003) | MEDIUM | Before production |
| 4 | Replace string-based error classification with typed error classes (FINDING-V2-004) | MEDIUM | Before production |

These conditions are tracked in the SDLC tracking file SDLC-20260210-0011.

---

## 6. Comparison with v1 Review

The v1 security review (SECURITY-REVIEW-20260210-0011) identified 3 conditions:
1. Log sanitization -- still applies
2. RBAC -- reinforced by FINDING-V2-001 (more critical in v2 with project lifecycle)
3. API rate limiting -- reinforced by FINDING-V2-008

The v2 layer does not introduce any new critical vulnerabilities. The primary concern is the shared agent pool race condition (FINDING-V2-003) which is new to the multi-project architecture.
