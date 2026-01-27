# Integration Guide

How to integrate the RAG memory system with AI-SDLC agents.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Request                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Intelligence Gateway                      │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Memory System   │────────▶│  Context Builder │         │
│  │  (Pre-Execution) │         │                  │         │
│  └──────────────────┘         └──────────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Enhanced Agent Prompt                      │
│  Base Prompt + Relevant Memories + User Request             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Execution                           │
│  (Engineer, Security, QA, etc.)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Memory System (Post-Execution)                  │
│  Stores result as new memory for future use                 │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Install Dependencies

Add to your project's `package.json`:

```json
{
  "dependencies": {
    "@aisdlc/memory-system": "file:./src/memory-system"
  }
}
```

Install:

```bash
npm install
```

## Step 2: Initialize Memory System

Create a singleton instance:

```typescript
// src/memory/memory-instance.ts
import { createMemorySystem, MemorySystem } from '@aisdlc/memory-system';

let memorySystemInstance: MemorySystem | null = null;

export async function getMemorySystem(): Promise<MemorySystem> {
  if (!memorySystemInstance) {
    memorySystemInstance = await createMemorySystem({
      vectorDB: {
        path: process.env.CHROMA_DB_PATH,
      },
      embedding: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
      },
    });
  }
  return memorySystemInstance;
}

export async function shutdownMemorySystem(): Promise<void> {
  if (memorySystemInstance) {
    await memorySystemInstance.shutdown();
    memorySystemInstance = null;
  }
}
```

## Step 3: Integrate with Agent Execution

### Option A: Middleware Approach

```typescript
// src/agents/agent-middleware.ts
import { getMemorySystem } from '../memory/memory-instance';
import { AgentType } from '@aisdlc/memory-system';

export async function executeAgentWithMemory(
  agent: AgentType,
  userRequest: string,
  projectId?: string
): Promise<string> {
  const memorySystem = await getMemorySystem();
  const hooks = memorySystem.getHooks();
  const contextBuilder = memorySystem.getContextBuilder();

  // 1. Pre-execution: Get relevant memories
  console.log(`[${agent}] Retrieving relevant memories...`);
  const relevantMemories = await hooks.preAgentExecution({
    agent,
    userRequest,
    projectId,
  });

  console.log(`[${agent}] Found ${relevantMemories.length} relevant memories`);

  // 2. Build enhanced prompt
  const context = contextBuilder.buildContext(relevantMemories, agent);
  const enhancedPrompt = buildPrompt(agent, context.formattedContext, userRequest);

  // 3. Execute agent with enhanced prompt
  console.log(`[${agent}] Executing with ${context.tokenEstimate} tokens of context...`);
  const agentOutput = await executeAgent(agent, enhancedPrompt);

  // 4. Post-execution: Store result
  console.log(`[${agent}] Storing result as memory...`);
  await hooks.postAgentExecution({
    agent,
    output: agentOutput,
    success: true,
    projectId,
  });

  return agentOutput;
}

function buildPrompt(
  agent: AgentType,
  memoryContext: string,
  userRequest: string
): string {
  const basePrompt = getAgentBasePrompt(agent);

  return `
${basePrompt}

${memoryContext}

---

USER REQUEST:
${userRequest}

Please consider the relevant memories above when completing this task.
  `.trim();
}
```

### Option B: Direct Integration

```typescript
// src/agents/engineer-agent.ts
import { getMemorySystem } from '../memory/memory-instance';

export class EngineerAgent {
  async execute(request: string, projectId?: string): Promise<string> {
    const memorySystem = await getMemorySystem();

    // Get relevant memories
    const memories = await memorySystem.getHooks().getContextMemories('engineer', {
      query: request,
      category: 'code-patterns',
      project: projectId,
    });

    // Build context
    const context = memorySystem.getContextBuilder().buildContext(memories, 'engineer');

    // Execute with context
    const output = await this.executeWithContext(request, context.formattedContext);

    // Store result
    await memorySystem.getStore().storeMemory({
      agent: 'engineer',
      category: 'code-patterns',
      title: this.extractTitle(output),
      content: output,
      metadata: {
        success: true,
        tags: this.extractTags(request),
        project: projectId,
      },
    });

    return output;
  }

  private async executeWithContext(request: string, context: string): Promise<string> {
    // Your agent execution logic here
    // This would call Claude API with enhanced prompt
    return 'agent output';
  }

  private extractTitle(output: string): string {
    // Extract meaningful title from output
    const match = output.match(/^#\s+(.+)$/m);
    return match ? match[1] : output.substring(0, 50);
  }

  private extractTags(request: string): string[] {
    // Extract relevant tags from request
    return [];
  }
}
```

## Step 4: Agent-Specific Integration

### Engineer Agent

```typescript
// Before generating code
const codePatterns = await memorySystem.getRetriever().search({
  query: userRequest,
  agent: 'engineer',
  category: 'code-patterns',
  filters: {
    language: 'typescript',
    success: true,
  },
});

// Include security findings
const securityFindings = await memorySystem.getRetriever().search({
  query: userRequest,
  category: 'security-findings',
  filters: {
    severity: 'critical',
  },
});

const allMemories = [...codePatterns.memories, ...securityFindings.memories];
const context = contextBuilder.buildContext(allMemories, 'engineer');
```

### Security Agent

```typescript
// Check for similar past vulnerabilities
const similarVulns = await memorySystem.getRetriever().search({
  query: codeToReview,
  agent: 'security',
  category: 'security-findings',
  minSimilarity: 0.8,
});

if (similarVulns.memories.length > 0) {
  console.log('⚠️ Similar vulnerabilities found in past:');
  similarVulns.memories.forEach(m => {
    console.log(`  - ${m.title} (${m.metadata.severity})`);
  });
}
```

### Architect Agent (Jets)

```typescript
// Get relevant architecture decisions
const adrs = await memorySystem.getRetriever().search({
  query: architectureQuestion,
  agent: 'jets',
  category: 'architecture-decisions',
  filters: {
    project: projectId,
  },
});

// Get anti-patterns to avoid
const antiPatterns = await memorySystem.getRetriever().search({
  query: architectureQuestion,
  category: 'failed-approaches',
});
```

## Step 5: Capture Learnings

### On Success

```typescript
await memorySystem.getHooks().postAgentExecution({
  agent: 'engineer',
  output: implementationCode,
  success: true,
  category: 'code-patterns',
  metadata: {
    language: 'typescript',
    framework: 'express',
    qualityScore: 0.9,
    testCoverage: 92,
  },
});
```

### On Failure

```typescript
await memorySystem.getHooks().captureFailure(
  'engineer',
  `
# Failed Approach: Nested Callbacks for Async Operations

## What We Tried
Used deeply nested callbacks for sequential database operations.

## Why It Failed
- Code became unreadable after 3 levels of nesting
- Error handling was complex and error-prone
- Difficult to test and debug

## Better Alternative
Use async/await for sequential operations or Promise.all() for parallel.

## Example of Failure
\`\`\`typescript
db.query('SELECT...', (err, users) => {
  if (err) return callback(err);
  db.query('INSERT...', (err, result) => {
    if (err) return callback(err);
    db.query('UPDATE...', (err) => {
      // Callback hell!
    });
  });
});
\`\`\`
  `,
  {
    project: projectId,
    tags: ['anti-pattern', 'async', 'callbacks'],
  }
);
```

## Step 6: CLI Integration

Add npm scripts to your project:

```json
{
  "scripts": {
    "memory:search": "memory search",
    "memory:stats": "memory stats",
    "memory:recent": "memory recent"
  }
}
```

Usage:

```bash
npm run memory:search -- "authentication patterns"
npm run memory:stats
npm run memory:recent -- --limit 20
```

## Step 7: Monitoring and Health Checks

```typescript
// src/health/memory-health.ts
import { getMemorySystem } from '../memory/memory-instance';

export async function checkMemorySystemHealth() {
  const memorySystem = await getMemorySystem();
  const health = await memorySystem.healthCheck();

  if (health.status === 'unhealthy') {
    console.error('Memory system unhealthy:', health.details);
    // Alert or take corrective action
  }

  return health;
}

// Periodic health check
setInterval(async () => {
  const health = await checkMemorySystemHealth();
  console.log(`[MemoryHealth] Status: ${health.status}, Memories: ${health.details.totalMemories}`);
}, 60000); // Every minute
```

## Step 8: Testing

### Mock Memory System in Tests

```typescript
// tests/mocks/memory-system.mock.ts
import { MemoryRetriever } from '@aisdlc/memory-system';

export function createMockRetriever(): jest.Mocked<MemoryRetriever> {
  return {
    search: jest.fn().mockResolvedValue({
      memories: [],
      totalFound: 0,
      searchTime: 10,
      query: '',
    }),
    findSimilar: jest.fn().mockResolvedValue([]),
    getByAgent: jest.fn().mockResolvedValue([]),
    // ... other methods
  } as any;
}
```

### Integration Test

```typescript
// tests/integration/memory-integration.test.ts
import { createMemorySystem } from '@aisdlc/memory-system';

describe('Memory System Integration', () => {
  let memorySystem: MemorySystem;

  beforeAll(async () => {
    memorySystem = await createMemorySystem();
  });

  afterAll(async () => {
    await memorySystem.shutdown();
  });

  it('should store and retrieve memories', async () => {
    // Store
    const memory = await memorySystem.getStore().storeMemory({
      agent: 'engineer',
      category: 'code-patterns',
      title: 'Test Pattern',
      content: 'Test content',
      metadata: { success: true, tags: ['test'] },
    });

    // Retrieve
    const result = await memorySystem.getRetriever().search({
      query: 'Test Pattern',
      limit: 1,
    });

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].title).toBe('Test Pattern');
  });
});
```

## Troubleshooting

### Memory System Not Initialized

```typescript
// Add initialization check
const memorySystem = await getMemorySystem();
const health = await memorySystem.healthCheck();

if (health.status === 'unhealthy') {
  console.error('Cannot proceed: memory system unhealthy');
  throw new Error('Memory system initialization failed');
}
```

### Context Too Long

```typescript
// Use minimal context instead
const context = contextBuilder.buildMinimalContext(memories);

// Or reduce number of memories
const result = await retriever.search({
  query,
  limit: 3, // Reduce from 5 to 3
});
```

### Slow Search Performance

```typescript
// Add timeout
const searchPromise = retriever.search(query);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Search timeout')), 5000)
);

const result = await Promise.race([searchPromise, timeoutPromise]);
```

## Best Practices

1. **Initialize Once**: Create singleton memory system instance
2. **Async/Await**: Always await initialization before use
3. **Error Handling**: Wrap memory operations in try-catch
4. **Context Size**: Monitor token usage, truncate if needed
5. **Memory Quality**: Only store successful implementations
6. **Tags**: Use consistent, descriptive tags
7. **Cleanup**: Shutdown memory system on application exit
8. **Monitoring**: Track memory system health and performance
9. **Testing**: Mock memory system in unit tests
10. **Documentation**: Document memories with clear titles and content

## Performance Optimization

### Cache Frequent Queries

```typescript
const cache = new Map<string, SearchResult>();

async function searchWithCache(query: string) {
  if (cache.has(query)) {
    return cache.get(query)!;
  }

  const result = await retriever.search({ query });
  cache.set(query, result);

  return result;
}
```

### Batch Memory Storage

```typescript
// Instead of storing memories one by one
const memories = [];
for (const result of results) {
  memories.push({
    agent: 'engineer',
    category: 'code-patterns',
    title: result.title,
    content: result.content,
    metadata: result.metadata,
  });
}

// Store in batch (implement custom batch method if needed)
await Promise.all(memories.map(m => store.storeMemory(m)));
```

## Next Steps

1. Integrate with your specific agents
2. Set up monitoring and health checks
3. Train agents to use memory context effectively
4. Build feedback loop to improve memory quality
5. Implement memory lifecycle management (archiving old memories)

For questions or issues, see main AI-SDLC documentation.
