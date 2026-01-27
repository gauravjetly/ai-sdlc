# Context Injection System

AI-SDLC Context Injection System that provides context-aware prompts for all AI agents.

## Overview

This system automatically injects relevant organizational, project, historical, and live context into AI agent prompts, ensuring agents have the information they need to make Deltek-compliant decisions.

## Features

- **4 Context Sources**: Organizational standards, project configuration, historical memory, live codebase state
- **Token Budget Management**: Automatically prioritizes and trims context to fit within 20K token budget
- **Smart Caching**: 5-minute cache with configurable TTL per source type
- **Agent-Specific Budgets**: Different token allocations per agent type
- **Performance Optimized**: Parallel context loading, sub-second retrieval times

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Request                          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Agent Middleware                           │
│  ┌────────────────────────────────────────────────┐    │
│  │         Check Cache (5 min TTL)                │    │
│  └───────────────┬────────────────────────────────┘    │
│                  │ Cache Miss                          │
│                  ▼                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │      Context Gatherer (Parallel Load)          │    │
│  │                                                 │    │
│  │  ┌────────────┬────────────┬──────────────┐   │    │
│  │  │  Org       │  Project   │  Historical  │   │    │
│  │  │  Context   │  Context   │  Context     │   │    │
│  │  │            │            │              │   │    │
│  │  │  • Standards│ • Stack   │ • Learnings  │   │    │
│  │  │  • Security│ • ADRs     │ • Bug Fixes  │   │    │
│  │  │  • Patterns│ • Existing │ • Patterns   │   │    │
│  │  └────────────┴────────────┴──────────────┘   │    │
│  │                                                 │    │
│  │  ┌────────────────────────────────────────┐   │    │
│  │  │         Live Context                    │   │    │
│  │  │  • Git branch, commits                  │   │    │
│  │  │  • Dependencies                         │   │    │
│  │  │  • Recent changes                       │   │    │
│  │  └────────────────────────────────────────┘   │    │
│  └───────────────┬────────────────────────────────┘    │
│                  │                                      │
│                  ▼                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │      Context Prioritizer                       │    │
│  │  • Enforce token budget                        │    │
│  │  • Trim by priority (P4 → P3 → P2)            │    │
│  │  • Preserve mandatory context (P1)             │    │
│  └───────────────┬────────────────────────────────┘    │
│                  │                                      │
│                  ▼                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │      Context Injector                          │    │
│  │  • Format context sections                     │    │
│  │  • Inject into prompt                          │    │
│  │  • Add metadata                                │    │
│  └───────────────┬────────────────────────────────┘    │
│                  │                                      │
└──────────────────┼──────────────────────────────────────┘
                   │
                   ▼
         Enhanced Agent Prompt
```

## Installation

```bash
cd src/context-injection
npm install
npm run build
```

## Usage

### Quick Start

```typescript
import { createContextInjectionSystem } from '@deltek/context-injection';

// Create the system
const middleware = createContextInjectionSystem({
  orgName: 'deltek',
  enableCache: true,
  autoCleanupInterval: 60000
});

// Use with an agent
const enhancedPrompt = await middleware.execute(
  'engineer',
  'Build a REST API with authentication',
  '/path/to/project'
);

console.log(enhancedPrompt);
// Original prompt + Deltek context injected
```

### Advanced Usage

```typescript
import {
  ContextGatherer,
  ContextPrioritizer,
  ContextInjector,
  CacheManager,
  OrgContextLoader,
  ProjectContextLoader,
  HistoricalContextLoader,
  LiveContextLoader,
  AgentMiddleware
} from '@deltek/context-injection';

// Initialize loaders
const orgLoader = new OrgContextLoader('deltek');
const projectLoader = new ProjectContextLoader();
const historicalLoader = new HistoricalContextLoader();
const liveLoader = new LiveContextLoader();

// Create gatherer
const gatherer = new ContextGatherer(
  orgLoader,
  projectLoader,
  historicalLoader,
  liveLoader
);

// Create prioritizer and injector
const prioritizer = new ContextPrioritizer();
const injector = new ContextInjector();

// Create cache
const cache = new CacheManager();

// Create middleware
const middleware = new AgentMiddleware(
  gatherer,
  prioritizer,
  injector,
  cache
);

// Execute
const result = await middleware.wrapAgentExecution({
  agentName: 'engineer',
  prompt: 'Build user authentication',
  projectPath: process.cwd()
});

console.log('Enhanced Prompt:', result.enhancedPrompt);
console.log('Metadata:', result.contextMetadata);
```

## Configuration

### Agent Token Budgets

```typescript
const AGENT_TOKEN_BUDGETS = {
  conductor: 2000,   // Workflow orchestration
  ba: 3000,          // Business analysis
  architect: 5000,   // Architecture decisions (needs more context)
  engineer: 4000,    // Implementation
  security: 4000,    // Security review
  qa: 3000,          // Testing
  atlas: 2000,       // Documentation
  customer: 2000     // Customer-facing
};
```

### Cache TTLs

```typescript
const CACHE_TTL = {
  ORG_CONTEXT: 24 * 60 * 60 * 1000,    // 24 hours
  PROJECT_CONTEXT: 60 * 60 * 1000,     // 1 hour
  HISTORICAL_CONTEXT: 5 * 60 * 1000,   // 5 minutes
  LIVE_CONTEXT: 30 * 1000,             // 30 seconds
  FULL_CONTEXT: 5 * 60 * 1000          // 5 minutes
};
```

## Organizational Context

The system loads organizational context from `~/.claude/org-context/deltek/`:

```
~/.claude/org-context/deltek/
├── coding-standards.md          # SOLID, naming, patterns
├── security-policies.md         # Auth, encryption, compliance
├── architecture-patterns.md     # Layered architecture, design patterns
├── approved-libraries.json      # Whitelisted dependencies
├── deployment-procedures.md     # CI/CD, rollback, monitoring
└── testing-requirements.md      # Coverage, test types, best practices
```

### Initialize Organizational Context

```typescript
import { OrgContextLoader } from '@deltek/context-injection';

const loader = new OrgContextLoader('deltek');

// Check if exists
const exists = await loader.exists();

if (!exists) {
  // Initialize with defaults
  await loader.initialize();
}
```

## Project Context

Project-specific context is loaded from `.claude/context/` in your project:

```
.claude/context/
├── tech-stack.yaml      # Runtime, framework, database
├── architecture.md      # Project architecture details
└── conventions.md       # Team coding conventions
```

### Initialize Project Context

```typescript
import { ProjectContextLoader } from '@deltek/context-injection';

const loader = new ProjectContextLoader();

await loader.initialize('/path/to/project');
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## API Reference

### `createContextInjectionSystem(config)`

Creates a fully configured context injection system.

**Parameters:**
- `config.orgName` (string): Organization name (default: 'deltek')
- `config.enableCache` (boolean): Enable caching (default: true)
- `config.autoCleanupInterval` (number): Cache cleanup interval in ms (default: 60000)

**Returns:** `AgentMiddleware`

### `AgentMiddleware`

#### `execute(agentName, prompt, projectPath)`

Inject context into prompt and return enhanced prompt.

**Parameters:**
- `agentName` (AgentType): Target agent name
- `prompt` (string): Original prompt
- `projectPath` (string): Path to project

**Returns:** `Promise<string>`

#### `wrapAgentExecution(request)`

Full execution with metadata.

**Parameters:**
- `request.agentName` (AgentType): Target agent
- `request.prompt` (string): Original prompt
- `request.projectPath` (string): Project path
- `request.requestId` (string, optional): Request ID for tracking
- `request.skipCache` (boolean, optional): Skip cache lookup

**Returns:** `Promise<AgentExecutionResult>`

```typescript
{
  enhancedPrompt: string;
  contextMetadata: {
    retrievalTime: number;    // Milliseconds
    totalTokens: number;      // Token count
    trimmed: boolean;         // Was context trimmed?
    cacheHit: boolean;        // Was cache used?
  };
}
```

## Context Priority Levels

| Priority | Sources                      | Budget | Trimming          |
|----------|------------------------------|--------|-------------------|
| P1       | Active policies, compliance  | 15%    | Never trimmed     |
| P2       | Org standards, security      | 35%    | Trimmed last      |
| P3       | Project config, conventions  | 30%    | Trimmed if needed |
| P4       | Historical learnings         | 20%    | Trimmed first     |

## Performance

- Context retrieval: <500ms (with cache: <50ms)
- Token counting: ~1ms per 1000 tokens
- Cache hit rate: ~80% in typical usage
- Memory footprint: <10MB

## Examples

See `tests/context-injection.test.ts` for comprehensive examples.

## Troubleshooting

### Context not loading

```bash
# Check if organizational context exists
ls -la ~/.claude/org-context/deltek/

# Initialize if missing
node -e "
const { OrgContextLoader } = require('./dist');
const loader = new OrgContextLoader('deltek');
loader.initialize().then(() => console.log('Initialized'));
"
```

### Token budget exceeded

Increase agent-specific budget or reduce context verbosity:

```typescript
const prioritizer = new ContextPrioritizer();
const result = prioritizer.prioritize(context, 'engineer', 6000); // Increase budget
```

### Cache not working

```typescript
// Clear cache
middleware.clearCache();

// Check cache stats
const stats = middleware.getCacheStats();
console.log('Hit rate:', stats.hitRate);
```

## Contributing

1. Follow Deltek coding standards
2. Write tests for all new features
3. Maintain >80% test coverage
4. Update documentation

## License

MIT

## Support

- GitHub Issues: https://github.com/DLTKEngineering/context-injection/issues
- Email: engineering@deltek.com
