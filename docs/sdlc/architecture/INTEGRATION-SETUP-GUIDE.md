# AI-SDLC Integration Setup Guide

## Quick Start (5 minutes)

### Prerequisites
- Claude Code installed and working
- Node.js 18+ installed
- AI-SDLC platform at `/Users/gauravjetly/aisdlc-2.1.0/`

### Step 1: Build the Integration Layer

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/integration
npm install
npm run build
```

### Step 2: Create Default Configuration

```bash
mkdir -p ~/.aisdlc
cp /Users/gauravjetly/aisdlc-2.1.0/src/integration/templates/config.yml ~/.aisdlc/config.yml
```

Edit `~/.aisdlc/config.yml` to set your preferred governance level:

```yaml
governance:
  level: 2  # 1=tracking, 2=light (default), 3=full, 4=audit
```

### Step 3: Configure Claude Code Settings

Add the MCP server and hooks to your Claude Code settings.

**Option A: User-level (applies to all projects)**

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "aisdlc-platform": {
      "command": "node",
      "args": [
        "/Users/gauravjetly/aisdlc-2.1.0/src/integration/mcp-server/index.js"
      ],
      "env": {
        "AISDLC_CONFIG": "~/.aisdlc/config.yml",
        "AISDLC_ROOT": "/Users/gauravjetly/aisdlc-2.1.0"
      }
    }
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/gauravjetly/aisdlc-2.1.0/src/integration/hooks/user-prompt-submit.js"
          }
        ],
        "timeout": 5000
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/gauravjetly/aisdlc-2.1.0/src/integration/hooks/stop.js"
          }
        ],
        "timeout": 3000
      }
    ]
  }
}
```

**Option B: Project-level (applies to one project)**

Create `.claude/settings.json` in your project root with the same content.

### Step 4: Verify Installation

```bash
# Start Claude Code
claude

# Test MCP tools
> What AI-SDLC tools are available?
# Should list aisdlc_* tools

# Test classification
> What is React?
# Should respond immediately (passthrough)

# Test SDLC routing
> Add a user authentication system
# Should announce SDLC workflow
```

### Step 5 (Optional): Create Project Override

For project-specific governance settings:

```bash
cp /Users/gauravjetly/aisdlc-2.1.0/src/integration/templates/project-config.yml .aisdlc.yml
```

Edit `.aisdlc.yml`:

```yaml
governance:
  level: 3  # Full governance for this project

branches:
  governance_overrides:
    main: 3
    production: 4
```

---

## Configuration Reference

### User Configuration: `~/.aisdlc/config.yml`

This file sets your global defaults. Every setting can be overridden per-project.

```yaml
version: "1.0"

# Master switch
enabled: true                    # Set to false to disable all integration

# Governance
governance:
  level: 2                       # 1=tracking, 2=light, 3=full, 4=audit

# Classification behavior
classification:
  tier1_enabled: true            # Rule-based fast classification
  tier2_enabled: true            # LLM-based classification (uses tokens)
  tier2_model: "haiku"           # Model for classification
  confidence_threshold: 0.7      # Below this, classification is uncertain
  cache_ttl: 300                 # Cache similar classifications (seconds)

# Routing
routing:
  emergency_keywords:            # Auto-detect emergency requests
    - "urgent"
    - "critical"
    - "production down"
    - "outage"
    - "data loss"
    - "security breach"
  always_sdlc_for:               # Always route through SDLC
    - "production"
    - "main"
  never_sdlc_for:                # Never route through SDLC
    - "explain"
    - "what is"
    - "how does"

# What the user sees
ux:
  show_classification: false     # Show classification details
  show_progress: true            # Show SDLC progress
  show_phase_transitions: true   # Show phase changes
  verbose_mode: false            # Show everything (debug)
  announcement_style: "standard" # minimal | standard | verbose

# Tracking
tracking:
  log_all_requests: true
  cost_tracking: true
  registry_path: "docs/sdlc"

# Performance
performance:
  max_classification_time: 3000  # ms timeout for classification
  cache_classifications: true
  parallel_agent_execution: true
```

### Project Configuration: `.aisdlc.yml`

Place this in your project root to override settings for one project.

```yaml
# Override governance level
governance:
  level: 3

# Branch-specific governance
branches:
  protected:
    - "main"
    - "production"
  governance_overrides:
    main: 3
    production: 4
    "feature/*": 2

# Project-specific routing
routing:
  always_sdlc_for:
    - "api"
    - "database"
    - "auth"

# Minimum phases for this project
phases:
  always_run:
    - "implementation"
    - "security"
    - "testing"
```

---

## Governance Levels Explained

### Level 1: Tracking Only
Best for: solo developers, prototyping, learning

Everything passes through. All requests are logged for tracking and cost analysis, but nothing is blocked. Security and QA reviews do not run.

### Level 2: Light Governance (Recommended Default)
Best for: small teams, startups, internal tools

Security and QA reviews run but are non-blocking (advisory). You see their findings but can proceed without fixing them. Architecture review runs for complex changes. You can override any finding with a reason.

### Level 3: Full Governance
Best for: production systems, client projects

Security and QA reviews are blocking -- you must address critical findings before proceeding. Architecture review is required for complex changes. Customer acceptance is required for new features. Bypass requires an approval token.

### Level 4: Audit Mode
Best for: regulated industries (healthcare, finance, government)

All gates are blocking with no exceptions. Full audit trail with tamper-evident logging. Compliance checks run. Approval workflows are enforced. No bypasses allowed -- only formal exception workflows.

---

## Common Tasks

### Change governance level
```
> Set governance to level 3
```
Or edit `.aisdlc.yml` and set `governance.level: 3`.

### Check current status
```
> What is the AI-SDLC status?
```
Or use: `/mcp__aisdlc__status`

### Override a governance block
At Level 2: Provide a reason when prompted.
At Level 3: Use a bypass token:
```
> Override governance with token: <your-token>
```

### Disable integration temporarily
Set `enabled: false` in `~/.aisdlc/config.yml`, or remove the hooks from `.claude/settings.json`.

### View request history
```
> Show me the AI-SDLC request history
```
Or check `~/.aisdlc/registry/requests/`.

### Force SDLC for a request
```
> /mcp__aisdlc__start Add input validation to the login form
```

### Skip SDLC for a request
At Level 1-2: The classifier handles this automatically for trivial requests.
At Level 3+: Not possible without a bypass token.

---

## Troubleshooting

### "No AI-SDLC tools found"
- Verify MCP server is configured in `~/.claude/settings.json`
- Check that the path to `index.js` is correct
- Restart Claude Code after configuration changes

### "Hook timeout"
- Default timeout is 5 seconds
- If classification consistently times out, check network (Tier 2 needs LLM API)
- Increase timeout in settings or disable Tier 2 classification

### "Classification seems wrong"
- Enable verbose mode: `ux.verbose_mode: true`
- Check classification logs: `~/.aisdlc/logs/classifier.log`
- Report misclassifications to improve the rules

### "Too much overhead on simple questions"
- Verify Tier 1 rules are matching (check logs)
- Increase Tier 1 confidence threshold
- Ensure classification caching is enabled

### "Governance is too strict"
- Lower the governance level: `governance.level: 2` or `1`
- Use per-branch overrides for feature branches
- Check `.aisdlc.yml` for project-specific overrides

---

## Architecture Reference

For full architecture details, see:
- `/Users/gauravjetly/aisdlc-2.1.0/docs/sdlc/architecture/ARCH-20260216-CLAUDE-AISDLC-INTEGRATION.md`

For design decisions, see:
- `ADR-040-request-classification-strategy.md`
- `ADR-041-smart-routing-architecture.md`
- `ADR-042-governance-level-design.md`
- `ADR-043-integration-layer-choice.md`
- `ADR-044-user-experience-flow.md`
