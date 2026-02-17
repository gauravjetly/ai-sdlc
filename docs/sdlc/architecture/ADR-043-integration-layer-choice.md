# ADR-043: Integration Layer Choice (Hooks + MCP Hybrid)

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Engineer, Atlas (DevOps)
**Related**: ARCH-20260216-CLAUDE-AISDLC-INTEGRATION, ADR-040, ADR-041

---

## Context

The AI-SDLC platform must integrate with Claude Code to become the default "operating system" for development work. Claude Code provides several integration points: Hooks (UserPromptSubmit, Stop, PreToolUse, PostToolUse), MCP Servers (tools, resources, prompts), CLAUDE.md (static project instructions), and CLI wrappers. We must choose which integration mechanisms to use and how they work together.

## Decision

**We will use a hybrid approach: Claude Code Hooks for request interception and classification, combined with an MCP Server for SDLC tool exposure and workflow execution.**

### Architecture

```
User Message
     |
     v
[UserPromptSubmit Hook]     <-- HOOKS: Intercept, classify, route
     |
     |-- passthrough? --> [Claude directly]
     |
     |-- SDLC needed? --> [Inject context + MCP instructions]
     |                         |
     |                         v
     |                    [Claude + MCP Server]  <-- MCP: Execute SDLC workflows
     |                         |
     |                    [aisdlc_start_workflow]
     |                    [aisdlc_review_code]
     |                    [aisdlc_ask_tom]
     |                         |
     v                         v
[Stop Hook]               [Agent Mesh executes workflow]
     |
     v
[Log completion, cost tracking]
```

### Hook Responsibilities (Interception Layer)

1. **UserPromptSubmit Hook**: Runs on every user message
   - Classifies the request (Tier 1 rules, Tier 2 LLM)
   - Applies governance rules
   - If passthrough: returns empty (no transformation)
   - If SDLC: injects context into the message instructing Claude to use MCP tools
   - If blocked: returns blocking message with governance explanation

2. **Stop Hook**: Runs after Claude finishes responding
   - Logs completion to request registry
   - Updates workflow status if SDLC was active
   - Triggers post-completion governance checks
   - Updates cost tracking

3. **PostToolUse (Write) Hook**: Runs after file writes
   - Logs file changes for audit trail
   - Triggers regression checks if configured

### MCP Server Responsibilities (Execution Layer)

1. **Tools**: 8+ callable tools for Claude to invoke
   - `aisdlc_classify`: Classify a request
   - `aisdlc_start_workflow`: Start governed SDLC workflow
   - `aisdlc_review_code`: Code/security review
   - `aisdlc_ask_tom`: Problem solving
   - `aisdlc_get_status`: Workflow status
   - `aisdlc_check_governance`: Governance validation
   - `aisdlc_search_memory`: Collective memory search
   - `aisdlc_get_config`: Platform configuration

2. **Resources**: @-mentionable context
   - `aisdlc://registry`: All tracked work items
   - `aisdlc://memory/{category}`: Collective knowledge
   - `aisdlc://config`: Current configuration
   - `aisdlc://health`: System health

3. **Prompts**: /-commands
   - `/mcp__aisdlc__start`: Start SDLC workflow
   - `/mcp__aisdlc__review`: Code review
   - `/mcp__aisdlc__status`: Check status
   - `/mcp__aisdlc__config`: View/modify config

### Why Hybrid

Hooks and MCP serve complementary purposes:

| Capability | Hooks | MCP | Why This Split |
|---|---|---|---|
| Intercept ALL messages | Yes | No | Only hooks can run before Claude sees the message |
| Block messages | Yes | No | Only hooks can prevent Claude from processing |
| Expose tools to Claude | No | Yes | MCP is the standard for tool exposure |
| Expose resources | No | Yes | MCP resources are @-mentionable |
| Expose commands | No | Yes | MCP prompts become / commands |
| Inject context | Yes | No | Hooks can modify the message Claude sees |
| Execute workflows | No | Yes | MCP tools are the execution mechanism |

Neither alone is sufficient. Hooks cannot expose tools. MCP cannot intercept messages.

### Transport

- **Hooks**: Command-line scripts (Node.js) invoked by Claude Code
- **MCP Server**: stdio transport (local process, no network)

Both run locally with no network exposure.

## Alternatives Considered

### Alternative 1: MCP Server Only
- **Description**: Use only an MCP server, rely on CLAUDE.md instructions to trigger tools
- **Pros**: Simpler setup; single integration point; standard protocol
- **Cons**: Cannot intercept messages automatically; relies on Claude choosing to call tools; no blocking capability; Claude must be "told" to use SDLC every time via CLAUDE.md instructions (fragile)
- **Rejected because**: Without hooks, the system cannot automatically classify and route. Claude might ignore CLAUDE.md instructions for simple messages, and there is no way to enforce governance. The classification must happen BEFORE Claude processes the message.

### Alternative 2: Hooks Only
- **Description**: Use only Claude Code hooks, no MCP server
- **Pros**: Full control over message flow; simpler than MCP server
- **Cons**: Cannot expose tools for Claude to call; cannot provide resources for @ mentions; cannot add / commands; hooks can only inject text, not callable functions
- **Rejected because**: Without MCP, Claude cannot invoke SDLC workflows as tool calls. The only option would be to transform every message into a `/sdlc-start` command, which is brittle and loses the tool-based interaction model.

### Alternative 3: CLI Wrapper Only
- **Description**: Replace `claude` command with `aisdlc` wrapper script
- **Pros**: Total control; can preprocess and postprocess everything
- **Cons**: Requires users to change their workflow; does not integrate with Claude Code's native features; loses IDE integration; breaks auto-update; maintenance burden
- **Rejected because**: Wrapping the CLI creates a fragile dependency. Claude Code updates would break the wrapper. Users would need to remember to use `aisdlc` instead of `claude`. Not sustainable.

### Alternative 4: Claude Code Extension / Plugin
- **Description**: Build a Claude Code extension (if supported)
- **Pros**: Deep integration; first-class feature
- **Cons**: Claude Code does not currently support a plugin/extension API; would depend on Anthropic adding this capability
- **Rejected because**: No extension API exists. The hooks + MCP approach uses documented, supported integration points.

### Alternative 5: CLAUDE.md Prompt Engineering Only
- **Description**: Put all classification and routing logic in CLAUDE.md instructions
- **Pros**: Zero infrastructure; no hooks; no MCP server; just a text file
- **Cons**: Cannot enforce anything; Claude may ignore instructions; no audit trail; no blocking; classification quality depends entirely on prompt engineering; no caching
- **Rejected because**: Prompt engineering cannot guarantee enforcement. "Always check governance before writing code" is a suggestion, not a gate. The system needs deterministic interception and enforcement.

## Consequences

### Positive
- Automatic interception via hooks means zero user friction
- MCP tools give Claude first-class access to SDLC capabilities
- Resources and prompts enhance the natural Claude Code experience
- Governance can block before Claude processes (hooks)
- SDLC execution uses standard tool-calling (MCP)
- Both mechanisms are documented Claude Code features

### Negative
- Two integration mechanisms to develop and maintain
- Hook scripts must be fast (< 5 second timeout)
- MCP server must be reliable (Claude shows errors if tools fail)
- Context injection adds tokens to every SDLC-routed message
- Setup requires configuring both hooks and MCP in settings.json

### Neutral
- Hooks run as child processes (Node.js scripts)
- MCP server runs as a persistent local process (stdio)
- Both can be disabled independently for debugging
- Installation can be automated with a setup script
