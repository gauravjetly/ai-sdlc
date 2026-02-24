# RAG Memory System - Quick Start

Get up and running in 5 minutes.

## Prerequisites

```bash
# Check Node.js version (18+ required)
node --version

# Set OpenAI API key
export OPENAI_API_KEY="sk-your-api-key-here"
```

## Installation

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/memory-system
npm install
npm run build
```

## Test Installation

```bash
npm test
```

Expected output: All tests passing ✅

## Quick Usage

### 1. Programmatic API

```typescript
import { createMemorySystem } from '@aisdlc/memory-system';

// Initialize
const system = await createMemorySystem();

// Store
await system.getStore().storeMemory({
  agent: 'engineer',
  category: 'code-patterns',
  title: 'My Pattern',
  content: 'Details here...',
  metadata: { success: true, tags: ['test'] },
});

// Search
const result = await system.getRetriever().search({
  query: 'authentication patterns',
  limit: 5,
});

console.log(result.memories);
```

### 2. CLI Usage

```bash
# Search
memory search "authentication" --agent engineer --limit 5

# Stats
memory stats

# Recent
memory recent --limit 10

# Popular
memory popular

# Get specific memory
memory get PATTERN-20240126-abc123
```

## Common Operations

### Store a Security Finding

```typescript
await system.getStore().storeMemory({
  agent: 'security',
  category: 'security-findings',
  title: 'SQL Injection in User Query',
  content: 'Found SQL injection vulnerability...',
  metadata: {
    success: false,
    severity: 'critical',
    cweId: 'CWE-89',
    tags: ['sql', 'injection', 'security'],
  },
});
```

### Search with Filters

```typescript
const result = await system.getRetriever().search({
  query: 'authentication',
  agent: 'engineer',
  category: 'code-patterns',
  minSimilarity: 0.7,
  filters: {
    language: 'typescript',
    success: true,
  },
});
```

### Build Context for Agent

```typescript
const hooks = system.getHooks();

// Before execution
const memories = await hooks.preAgentExecution({
  agent: 'engineer',
  userRequest: 'Build auth API',
});

// Build formatted context
const context = system.getContextBuilder().buildContext(memories, 'engineer');

// Use in prompt
const prompt = `${basePrompt}\n\n${context.formattedContext}\n\n${userRequest}`;
```

## Agent Integration Pattern

```typescript
// Pre-execution hook
async function beforeAgentExecution(agentName, userRequest) {
  const system = await getMemorySystem();
  const memories = await system.getHooks().preAgentExecution({
    agent: agentName,
    userRequest,
  });
  const context = system.getContextBuilder().buildContext(memories, agentName);
  return context.formattedContext;
}

// Post-execution hook
async function afterAgentExecution(agentName, output, success) {
  const system = await getMemorySystem();
  await system.getHooks().postAgentExecution({
    agent: agentName,
    output,
    success,
  });
}
```

## CLI Quick Reference

```bash
# Search
memory search <query> [options]
  -a, --agent <agent>           Filter by agent
  -c, --category <category>     Filter by category
  -l, --limit <number>          Number of results (default: 5)
  -m, --min-similarity <number> Min similarity (default: 0.7)
  --format <format>             Output format (full|minimal|context)

# Similar
memory similar <memory-id> [-l <limit>]

# Recent
memory recent [-l <limit>] [-a <agent>]

# Popular
memory popular [-l <limit>]

# Stats
memory stats

# Get
memory get <memory-id>
```

## Environment Variables

```bash
# Required
export OPENAI_API_KEY="sk-..."

# Optional (with defaults)
export CHROMA_DB_PATH="~/.claude/governance/memory/chromadb"
export MEMORY_SOURCE_PATH="~/.claude/governance/memory/source"
```

## Agents

- `ba` - Business Analyst
- `jets` - Architect
- `engineer` - Software Engineer
- `security` - Security Agent
- `qa` - QA Agent
- `atlas` - Deployment Agent
- `customer` - Customer Agent
- `tracker` - Tracker Agent

## Categories

- `code-patterns` - Implementation patterns
- `security-findings` - Security issues
- `architecture-decisions` - ADRs
- `test-strategies` - Testing approaches
- `deployment-patterns` - Deployment configs
- `compliance-rules` - Compliance requirements
- `failed-approaches` - Anti-patterns
- `vintiq-knowledge` - Vintiq product knowledge

## Troubleshooting

### "ChromaDB client not initialized"
```typescript
await memorySystem.initialize();
```

### "OpenAI API key is invalid"
```bash
export OPENAI_API_KEY="your-actual-key"
```

### "No results found"
- Lower `minSimilarity` threshold
- Try broader search query
- Check if memories exist: `memory stats`

### Tests failing
```bash
# Clean install
rm -rf node_modules
npm install
npm run build
npm test
```

## Health Check

```typescript
const health = await system.healthCheck();
console.log(health.status); // 'healthy' or 'unhealthy'
console.log(health.details);
```

## Run Example

```bash
cd examples
ts-node basic-usage.ts
```

## Full Documentation

- **User Guide:** README.md
- **Integration Guide:** INTEGRATION.md
- **Technical Summary:** IMPLEMENTATION_SUMMARY.md
- **Delivery Report:** /Users/gauravjetly/aisdlc-2.1.0/MEMORY_SYSTEM_DELIVERY.md

## Support

Questions? See README.md "Troubleshooting" section or contact AI-SDLC team.

---

**You're all set! Start building intelligent agents with memory.** 🚀
