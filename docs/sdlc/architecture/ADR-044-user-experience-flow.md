# ADR-044: User Experience Flow

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), UX Agent, Conductor (Orchestrator)
**Related**: ARCH-20260216-CLAUDE-AISDLC-INTEGRATION, ADR-040, ADR-041, ADR-042, ADR-043

---

## Context

The integration must feel natural, not bureaucratic. Developers will reject any system that adds significant friction to their workflow. The user experience must achieve a difficult balance: invisible for simple interactions, visible but not annoying for governed workflows, and informative without being verbose.

The core tension is: **How much should the user know about the classification and routing happening behind the scenes?**

## Decision

**We will use an "invisible by default, informative on demand" experience model where simple requests pass through with zero visible overhead, SDLC-routed requests show minimal but clear progress indicators, and full details are available through explicit queries.**

### UX Principles

1. **Zero Friction for Q&A**: Simple questions get immediate Claude responses with no visible classification overhead. The hook runs in < 50ms and returns empty (passthrough).

2. **Minimal Announcement for SDLC**: When a request is routed through SDLC, a single brief message announces the workflow without excessive detail:
   ```
   [AI-SDLC] Starting governed workflow (medium complexity, 5 phases)
   ```

3. **Progress on Request**: Phase transitions are shown only if `ux.show_phase_transitions: true`:
   ```
   [AI-SDLC] Phase 2/5: Architecture (Jets)
   ```

4. **Details on Demand**: Full classification, routing, and governance details available via:
   - `/mcp__aisdlc__status` command
   - `@aisdlc://registry` resource
   - Dashboard at Control Center

5. **Clear Governance Feedback**: When governance blocks a request, the message is clear and actionable:
   ```
   [AI-SDLC Governance] This change requires security review (Level 3).
   Security findings: 2 critical (must fix), 1 advisory.
   Fix the critical findings and re-submit, or use /mcp__aisdlc__override
   with an approval token.
   ```

6. **Emergency Mode is Obvious**: Emergency routing is announced prominently:
   ```
   [AI-SDLC EMERGENCY] Routing to Ask Tom for immediate diagnosis.
   Governance gates: SUSPENDED (emergency override).
   Post-incident review will be scheduled automatically.
   ```

### UX Flow by Scenario

#### Scenario A: Simple Question
```
User: "What is dependency injection?"
                                          [Behind the scenes: classified as Q&A in 30ms]
Claude: "Dependency injection is a design pattern where..."
```
The user sees nothing about AI-SDLC. The experience is identical to vanilla Claude Code.

#### Scenario B: Trivial Change
```
User: "Fix the typo in README.md line 42"
                                          [Behind the scenes: classified as trivial in 40ms]
Claude: "I've fixed the typo in README.md. [diff]
         [AI-SDLC] Tracked: REQ-20260216-001 (trivial, no governance required)"
```
A single line at the end acknowledges tracking without interrupting the flow.

#### Scenario C: Feature Request
```
User: "Add user authentication with OAuth 2.0"

[AI-SDLC] Starting governed workflow: SDLC-20260216-1430
  Type: code-change | Complexity: complex | Governance: Level 2
  Phases: Requirements > Architecture > Implementation > Security > QA

[AI-SDLC] Phase 1/5: Requirements (BA Agent)
  Requirements documented: docs/sdlc/requirements/REQ-20260216-1430.md

[AI-SDLC] Phase 2/5: Architecture (Jets Agent)
  Architecture documented: docs/sdlc/architecture/ARCH-20260216-1430.md

[AI-SDLC] Phase 3/5: Implementation (Engineer)
  Files created: src/auth/oauth.ts, src/auth/middleware.ts, ...

[AI-SDLC] Phase 4/5: Security Review
  Result: PASS (0 critical, 1 advisory)
  Advisory: Consider rate-limiting OAuth callback endpoint

[AI-SDLC] Phase 5/5: QA Testing
  Result: PASS (18 tests, all passing, coverage 89%)

[AI-SDLC] Workflow Complete: SDLC-20260216-1430
  Duration: 18 minutes | Tokens: 45,000 | Cost: $0.85
  Full tracking: docs/sdlc/tracking/SDLC-20260216-1430.md
```

Each phase is shown as it completes. The user sees progress and can read each phase's output.

#### Scenario D: Emergency
```
User: "URGENT: Payment API returning 500 errors in production"

[AI-SDLC EMERGENCY] Critical incident detected.
  Routing to Ask Tom for immediate diagnosis.
  Governance: EMERGENCY MODE (gates suspended)

[Ask Tom] Analyzing: Payment API 500 errors
  - Checking recent deployments... found commit abc1234 (2h ago)
  - Checking error logs... PaymentProcessor.validate() NullPointerException
  - Root cause: Missing null check in payment validation after refactor

[Ask Tom] Recommended Fix:
  [code diff]

[Ask Tom] Confidence: 0.92
  Apply this fix? The Engineer agent will implement and test.

[AI-SDLC] Post-incident review scheduled: SDLC-20260216-1500
```

#### Scenario E: Governance Block
```
User: "Deploy the new API version to production"

[AI-SDLC Governance] BLOCKED
  Branch: production (Level 4: Audit Mode)

  Required gates not met:
  - Security review: NOT COMPLETED
  - QA testing: NOT COMPLETED
  - Change approval: NOT REQUESTED

  To proceed:
  1. Complete security review: /mcp__aisdlc__review --type security
  2. Complete QA testing: /mcp__aisdlc__review --type qa
  3. Request approval: /mcp__aisdlc__request_approval

  Governance level for 'production' branch: 4 (Audit Mode)
  This cannot be bypassed.
```

### Configuration Options

```yaml
ux:
  # Show classification result to user
  show_classification: false        # Default: hidden

  # Show SDLC progress messages
  show_progress: true               # Default: show

  # Show phase transition messages
  show_phase_transitions: true      # Default: show

  # Show governance decision details
  show_governance_details: true     # Default: show for blocks

  # Verbose mode (show everything including classification)
  verbose_mode: false               # Default: off

  # Use color in output
  color_output: true                # Default: on

  # Tracking line for trivial changes
  show_tracking_for_trivial: true   # Default: show

  # Announcement format
  announcement_style: "minimal"     # Options: minimal, standard, verbose
```

### Announcement Styles

**Minimal** (for experienced users):
```
[SDLC:complex] Auth feature > 5 phases > starting...
[4/5] Security: PASS
[5/5] QA: PASS (18 tests)
[DONE] 18m | $0.85
```

**Standard** (default):
```
[AI-SDLC] Starting governed workflow: SDLC-20260216-1430
  Type: code-change | Complexity: complex
  ...
```

**Verbose** (for debugging/learning):
```
[AI-SDLC Classification] {
  type: "code-change",
  complexity: "complex",
  confidence: 0.88,
  classifier: "hybrid (rules: 0.7, llm: 0.88)",
  routing: "full-sdlc",
  phases: ["requirements", "architecture", ...],
  governance: { level: 2, gates: [...] }
}
[AI-SDLC] Starting governed workflow...
```

## Alternatives Considered

### Alternative 1: Always Visible (Full Transparency)
- **Description**: Show classification, routing, and governance for every single message
- **Pros**: Full transparency; user always knows what is happening; educational
- **Cons**: Extremely noisy; every Q&A shows classification output; users will disable
- **Rejected because**: "What is React?" should not produce 10 lines of classification output before the actual answer.

### Alternative 2: Always Hidden (Silent Governance)
- **Description**: Never show AI-SDLC activity; governance happens silently
- **Pros**: Zero friction; users do not know the system exists
- **Cons**: Users do not know when governance is applied; cannot debug; no progress feedback for long workflows; surprise blocks
- **Rejected because**: If a 20-minute SDLC workflow runs with no progress indication, the user thinks Claude is stuck. If governance blocks silently, the user does not understand why their request failed.

### Alternative 3: Sidebar/Dashboard Only
- **Description**: All AI-SDLC information shown only in the web dashboard, not in the CLI
- **Pros**: Clean CLI experience; rich dashboard visualization
- **Cons**: Requires the dashboard to be open; CLI-first developers would miss everything; adds friction to check another window
- **Rejected because**: Most developers live in the CLI. The dashboard is supplementary, not primary. Core feedback must be in the CLI where the work happens.

### Alternative 4: Interactive Prompts
- **Description**: Ask the user to confirm classification and routing before proceeding
- **Pros**: User always agrees with the decision; zero false positives; educational
- **Cons**: Every request requires an extra confirmation step; adds friction; defeats auto-classification
- **Rejected because**: "Are you sure this is a code change? [y/n]" for every request is exactly the bureaucracy we are trying to avoid. Only governance blocks should require explicit interaction.

## Consequences

### Positive
- Q&A and trivial requests have zero visible overhead
- SDLC workflows show clear, useful progress
- Governance blocks are actionable and informative
- Users can increase/decrease verbosity per preference
- Emergency mode is unmistakably clear
- Dashboard provides deep details for those who want them

### Negative
- Default verbosity settings may not suit all users
- Phase transition messages add tokens to the conversation
- Announcement format must be maintained across all routing strategies
- Users may not realize governance is active at Level 1 (tracking only)

### Neutral
- Three announcement styles provide flexibility
- Configuration is per-user and per-project
- All UX messages use a consistent `[AI-SDLC]` prefix for recognition
- Verbose mode serves as a debugging tool
