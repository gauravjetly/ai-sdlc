# RAG Memory System

Semantic memory system for AI-SDLC agents with vector search capabilities.

## Features

- **Semantic Search**: Find memories by meaning, not just keywords
- **Hybrid Storage**: Vector database (ChromaDB) + human-readable Markdown files
- **Agent Integration**: Pre/post execution hooks for automatic memory capture
- **Rich Metadata**: Filter by agent, category, project, tags, and more
- **Usage Tracking**: Track which patterns are most successful
- **CLI Tools**: Search and manage memories from command line

## Architecture

```
memory-system/
├── types/              # TypeScript type definitions
├── vector-db/          # ChromaDB client + embedding service
├── storage/            # Memory store + retriever
├── integration/        # Agent hooks + context builder
├── cli/                # Command-line tools
└── tests/              # Unit tests
```

## Installation

```bash
cd src/memory-system
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
export OPENAI_API_KEY="your-api-key"
```

Optional configuration:

```bash
export CHROMA_DB_PATH="~/.claude/governance/memory/chromadb"
export MEMORY_SOURCE_PATH="~/.claude/governance/memory/source"
```

## Usage

### Programmatic API

```typescript
import { createMemorySystem } from '@aisdlc/memory-system';

// Initialize
const memorySystem = await createMemorySystem();

// Store a memory
await memorySystem.getStore().storeMemory({
  agent: 'engineer',
  category: 'code-patterns',
  title: 'OAuth 2.0 Authentication Pattern',
  content: 'Detailed implementation...',
  metadata: {
    success: true,
    tags: ['authentication', 'oauth', 'security'],
    language: 'typescript',
    framework: 'express',
  },
});

// Search memories
const result = await memorySystem.getRetriever().search({
  query: 'How to implement secure authentication?',
  agent: 'engineer',
  limit: 5,
  minSimilarity: 0.7,
});

console.log(`Found ${result.memories.length} memories`);
result.memories.forEach(memory => {
  console.log(`- ${memory.title} (${Math.round(memory.metadata.similarity! * 100)}% relevant)`);
});
```

### Agent Integration

```typescript
import { AgentMemoryHooks } from '@aisdlc/memory-system';

const hooks = memorySystem.getHooks();

// Before agent execution
const relevantMemories = await hooks.preAgentExecution({
  agent: 'engineer',
  userRequest: 'Build authentication API',
  projectId: 'my-project',
});

// Inject into agent prompt
const context = memorySystem.getContextBuilder().buildContext(relevantMemories, 'engineer');
const enhancedPrompt = `${basePrompt}\n\n${context.formattedContext}\n\n${userRequest}`;

// After agent execution
await hooks.postAgentExecution({
  agent: 'engineer',
  output: agentOutput,
  success: true,
  projectId: 'my-project',
  tags: ['authentication', 'api'],
});
```

### CLI Tools

```bash
# Search memories
memory search "authentication patterns" --agent engineer --limit 5

# Find similar memories
memory similar SEC-20240315-abc123 --limit 3

# Show recent memories
memory recent --limit 10

# Show most used patterns
memory popular --limit 10

# Get statistics
memory stats

# Get specific memory
memory get PATTERN-20240315-abc123
```

## Memory Categories

- **code-patterns**: Proven implementation patterns
- **security-findings**: Security vulnerabilities and fixes
- **architecture-decisions**: ADRs and design choices
- **test-strategies**: Testing approaches that worked
- **deployment-patterns**: Deployment and infrastructure patterns
- **compliance-rules**: Regulatory compliance implementations
- **failed-approaches**: Anti-patterns to avoid
- **vintiq-knowledge**: Vintiq product-specific knowledge

## Agents

- **ba**: Business Analyst
- **jets**: Architect
- **engineer**: Software Engineer
- **security**: Security Agent
- **qa**: QA Agent
- **atlas**: Deployment Agent
- **customer**: Customer Agent
- **tracker**: Tracker Agent

## Memory Storage

Memories are stored in two formats:

1. **Vector Database (ChromaDB)**: For semantic search
2. **Markdown Files**: Human-readable, git-trackable

Storage location: `~/.claude/governance/memory/source/`

Example memory file:

```markdown
---
id: SEC-20240315-abc123
agent: security
category: security-findings
version: 1
status: active
created: 2024-03-15T10:30:00Z
updated: 2024-03-15T10:30:00Z
severity: critical
cweId: CWE-798
tags:
  - jwt
  - authentication
  - vulnerability
---

# JWT Without Expiry Vulnerability

## Summary
JWT tokens issued without expiration claim remain valid indefinitely...

## Remediation
Always set token expiration:
...
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev

# Lint
npm run lint

# Format
npm run format
```

## API Reference

### MemorySystem

Main facade for the memory system.

**Methods:**
- `initialize()`: Initialize the system
- `getStore()`: Get memory store
- `getRetriever()`: Get memory retriever
- `getHooks()`: Get agent hooks
- `getContextBuilder()`: Get context builder
- `healthCheck()`: Check system health
- `shutdown()`: Shutdown the system

### MemoryStore

Store and manage memories.

**Methods:**
- `storeMemory(request)`: Store new memory
- `updateMemory(id, updates)`: Update existing memory
- `deleteMemory(id, reason)`: Soft delete memory
- `getMemory(id)`: Get memory by ID
- `incrementUsageCount(id)`: Increment usage counter

### MemoryRetriever

Search and retrieve memories.

**Methods:**
- `search(query)`: Semantic search
- `findSimilar(memoryId, limit)`: Find similar memories
- `getByAgent(agent, limit)`: Get memories by agent
- `getByCategory(category, limit)`: Get memories by category
- `getRecent(limit)`: Get recent memories
- `getMostUsed(limit)`: Get most used memories

### AgentMemoryHooks

Integration hooks for agents.

**Methods:**
- `preAgentExecution(request)`: Get context before execution
- `postAgentExecution(result)`: Store result after execution
- `captureFailure(agent, description)`: Capture failures
- `getContextMemories(agent, context)`: Get specific context

### ContextBuilder

Build formatted context from memories.

**Methods:**
- `buildContext(memories, agent)`: Build full context
- `buildMinimalContext(memories)`: Build minimal context (titles only)

## Performance

- **Embedding generation**: ~100-200ms per text (OpenAI API)
- **Vector search**: <100ms for <100K vectors
- **Memory storage**: ~500ms (embedding + vector DB + file write)
- **Context building**: <50ms

## Limitations

- ChromaDB: Optimized for <1M vectors (sufficient for our needs)
- OpenAI embeddings: Requires API key and internet connection
- File storage: Performance may degrade with >10K files per category

## Migration to Pinecone

If scale requires migration to Pinecone:

1. Export all memories: `memory export --output /tmp/memories.json`
2. Create Pinecone index with matching dimensions
3. Batch upload to Pinecone
4. Update configuration to use Pinecone client
5. Verify data integrity

## Troubleshooting

**"ChromaDB client not initialized"**
- Call `await memorySystem.initialize()` before using

**"OpenAI API key is invalid"**
- Set `OPENAI_API_KEY` environment variable
- Verify API key is valid

**"Search returns no results"**
- Check minimum similarity threshold (default 0.7)
- Try lowering `minSimilarity` parameter
- Verify memories exist: `memory stats`

**"Context too long"**
- Reduce number of memories retrieved
- Use `buildMinimalContext()` instead of `buildContext()`
- Adjust `maxContextLength` in ContextBuilder

## License

MIT

## Contributing

See main AI-SDLC repository for contribution guidelines.
