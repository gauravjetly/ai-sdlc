# ADR-034: Tool Discovery Mechanism - Model Context Protocol (MCP)

**Date**: 2026-02-16
**Status**: Proposed
**Deciders**: Jets (Architect), Engineer (Implementation)
**Context**: Agentic AI Platform Transformation

---

## Context

Current agents have a fixed set of tools defined in their agent prompts: Read, Write, Bash, Glob, Grep, WebSearch, and Task. Agents cannot discover new tools, compose tool chains, or adapt their tool usage based on the task at hand.

For agentic behavior, agents need to:
- Discover available tools at runtime
- Understand tool capabilities through schemas
- Compose multiple tools into pipelines
- Use project-specific tools (custom test runners, deploy scripts, etc.)
- Operate safely within tool permissions

The Model Context Protocol (MCP), now an open standard under the Linux Foundation's Agentic AI Foundation (AAIF), provides exactly this capability.

## Decision

**Adopt the Model Context Protocol (MCP) as the standard tool discovery and execution layer. Implement a local MCP server registry that agents can query at runtime.**

### Architecture

```
AGENT REASONING ENGINE
         │
         │ "I need to run the project's test suite"
         │
         ▼
    MCP CLIENT
         │
         │ tools/list
         │
         ▼
    MCP REGISTRY  ──────────────────────────────┐
         │                                      │
         │ Available servers:                    │
         │  - filesystem (built-in)             │
         │  - git (built-in)                    │
         │  - project-test-runner (custom)      │
         │  - database-query (custom)           │
         │  - kubernetes-deploy (custom)        │
         │                                      │
         ▼                                      │
    TOOL SELECTION                              │
         │                                      │
         │ Best match: project-test-runner      │
         │                                      │
         ▼                                      │
    MCP SERVER: project-test-runner             │
         │                                      │
         │ tools/call: run_tests                │
         │ params: { suite: "auth" }            │
         │                                      │
         ▼                                      │
    RESULT returned to agent                    │
         │                                      │
         ▼                                      │
    POLICY CHECK (post-execution)               │
                                                │
    All tool calls logged to audit ◄────────────┘
```

### Built-in MCP Servers

```
CORE MCP SERVERS (shipped with platform):
──────────────────────────────────────────
filesystem    - Read, write, list, search files
git           - Clone, branch, commit, push, PR creation
database      - Query PostgreSQL, schema inspection
web-search    - Search the web for information
shell         - Execute shell commands (sandboxed)
http          - Make HTTP requests (with allowlist)
```

### Custom MCP Server Registration

Projects can register custom MCP servers:

```json
// .aisdlc/mcp-servers.json
{
  "servers": [
    {
      "name": "project-test-runner",
      "command": "npm",
      "args": ["run", "mcp-server:test"],
      "description": "Run project-specific test suites",
      "tools": [
        {
          "name": "run_tests",
          "description": "Execute test suite",
          "inputSchema": {
            "type": "object",
            "properties": {
              "suite": { "type": "string", "enum": ["unit", "integration", "e2e", "auth"] },
              "coverage": { "type": "boolean", "default": true }
            }
          }
        }
      ]
    },
    {
      "name": "project-deploy",
      "command": "node",
      "args": ["scripts/mcp-deploy-server.js"],
      "description": "Deploy to staging or production",
      "tools": [
        {
          "name": "deploy",
          "description": "Deploy the application",
          "inputSchema": {
            "type": "object",
            "properties": {
              "environment": { "type": "string", "enum": ["staging", "production"] },
              "version": { "type": "string" }
            },
            "required": ["environment"]
          }
        }
      ],
      "requiresApproval": ["production"]
    }
  ]
}
```

### Tool Permissions

Each agent has a tool permission profile:

```typescript
interface AgentToolPermissions {
  agentId: AgentId;
  allowedServers: string[];          // Which MCP servers this agent can use
  deniedTools: string[];             // Specific tools that are blocked
  requiresApproval: string[];        // Tools that need human approval
  maxExecutionsPerTask: number;      // Prevent runaway tool usage
  budgetPerTask: {
    maxDuration: number;             // Max seconds for all tool calls
    maxCost: number;                 // Max cost estimate
  };
}

// Default permissions per agent role:
const DEFAULT_PERMISSIONS: Record<AgentId, Partial<AgentToolPermissions>> = {
  engineer: {
    allowedServers: ['filesystem', 'git', 'database', 'shell', 'project-test-runner'],
    deniedTools: ['deploy:production'],
    maxExecutionsPerTask: 50,
  },
  security: {
    allowedServers: ['filesystem', 'git', 'shell', 'http'],
    deniedTools: ['shell:rm', 'database:drop'],
    maxExecutionsPerTask: 30,
  },
  atlas: {
    allowedServers: ['filesystem', 'git', 'shell', 'project-deploy', 'http'],
    requiresApproval: ['deploy:production'],
    maxExecutionsPerTask: 20,
  },
  // ...
};
```

## Alternatives Considered

### 1. Custom Tool Registry (non-MCP)
- **Pro**: Full control, no protocol constraints
- **Con**: No ecosystem, no interoperability, must build everything
- **Rejected**: MCP is becoming the industry standard; building our own would be wasted effort

### 2. LangChain Tools
- **Pro**: Large ecosystem of pre-built tools
- **Con**: Python-specific, tight coupling to LangChain framework
- **Rejected**: We are a TypeScript platform; MCP is language-agnostic

### 3. OpenAI Function Calling Only
- **Pro**: Simple, well-documented
- **Con**: Vendor-specific, no tool discovery, tools defined at prompt time
- **Rejected**: Function calling is the mechanism; MCP is the discovery protocol. They complement each other.

## Consequences

### Positive
- Agents can discover and use project-specific tools at runtime
- Standard protocol means community tools are usable
- Tool permissions provide safety controls
- Tool usage is fully auditable
- Custom MCP servers enable domain-specific tooling

### Negative
- MCP server management adds operational complexity
- Need to handle MCP server failures gracefully
- Custom MCP server development requires project teams to build servers

### Neutral
- Existing Read/Write/Bash/Glob/Grep tools are wrapped as MCP-compatible
- Claude Code's built-in tools remain available in interactive mode

---

**Related ADRs**: ADR-030 (Agent Runtime), ADR-037 (Safety Mechanisms)
