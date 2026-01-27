/**
 * Basic Usage Example
 *
 * Demonstrates how to use the memory system.
 */

import { createMemorySystem } from '../memory-system';

async function main() {
  console.log('RAG Memory System - Basic Usage Example\n');

  // 1. Initialize the memory system
  console.log('1. Initializing memory system...');
  const memorySystem = await createMemorySystem();
  console.log('   ✓ Memory system initialized\n');

  // 2. Check health
  console.log('2. Checking system health...');
  const health = await memorySystem.healthCheck();
  console.log(`   ✓ Status: ${health.status}`);
  console.log(`   ✓ Collections: ${health.details.collections}`);
  console.log(`   ✓ Total memories: ${health.details.totalMemories}\n`);

  // 3. Store a memory
  console.log('3. Storing a new memory...');
  const memory = await memorySystem.getStore().storeMemory({
    agent: 'engineer',
    category: 'code-patterns',
    title: 'JWT Authentication with Refresh Tokens',
    content: `
# JWT Authentication Pattern

## Overview
Implement secure authentication using JWT access tokens with refresh token rotation.

## Implementation
1. Access tokens: Short-lived (15 minutes)
2. Refresh tokens: Long-lived (7 days), rotated on use
3. Store refresh tokens hashed in database
4. Implement token revocation endpoint

## Security Considerations
- Always set token expiry
- Use HTTPS only
- Store refresh tokens securely
- Implement rate limiting on token endpoints

## Example Code
\`\`\`typescript
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
\`\`\`

## Results
- Successfully implemented in 3 projects
- No security incidents
- 92% test coverage achieved
    `,
    metadata: {
      success: true,
      tags: ['authentication', 'jwt', 'security', 'typescript'],
      language: 'typescript',
      framework: 'express',
      qualityScore: 0.92,
    },
    createdBy: 'example-script',
  });

  console.log(`   ✓ Stored memory: ${memory.id}`);
  console.log(`   ✓ Title: ${memory.title}\n`);

  // 4. Search for related memories
  console.log('4. Searching for authentication-related memories...');
  const searchResult = await memorySystem.getRetriever().search({
    query: 'How to implement secure user authentication?',
    agent: 'engineer',
    limit: 3,
    minSimilarity: 0.5, // Lower threshold for demo
  });

  console.log(`   ✓ Found ${searchResult.memories.length} memories in ${searchResult.searchTime}ms`);
  searchResult.memories.forEach((m, i) => {
    const similarity = Math.round((m.metadata.similarity || 0) * 100);
    console.log(`   ${i + 1}. ${m.title} (${similarity}% relevant)`);
  });
  console.log('');

  // 5. Build context for agent
  console.log('5. Building context from memories...');
  const context = memorySystem.getContextBuilder().buildContext(
    searchResult.memories,
    'engineer'
  );
  console.log(`   ✓ Context built: ${context.tokenEstimate} tokens`);
  console.log(`   ✓ Preview:\n`);
  console.log(context.formattedContext.substring(0, 500) + '...\n');

  // 6. Simulate agent execution with hooks
  console.log('6. Simulating agent execution with hooks...');

  // Pre-execution: Get relevant context
  const preExecutionMemories = await memorySystem.getHooks().preAgentExecution({
    agent: 'engineer',
    userRequest: 'Build OAuth 2.0 authentication',
    projectId: 'example-project',
  });

  console.log(`   ✓ Pre-execution: Retrieved ${preExecutionMemories.length} relevant memories`);

  // Simulate agent doing work...
  const agentOutput = `
# OAuth 2.0 Implementation Complete

Implemented OAuth 2.0 authentication with the following features:
- Authorization code flow with PKCE
- Refresh token rotation
- Token revocation endpoint
- Integration with Auth0

All tests passing with 89% coverage.
  `;

  // Post-execution: Store result
  await memorySystem.getHooks().postAgentExecution({
    agent: 'engineer',
    output: agentOutput,
    success: true,
    projectId: 'example-project',
    category: 'code-patterns',
    tags: ['oauth', 'authentication', 'auth0'],
  });

  console.log('   ✓ Post-execution: Stored agent result as new memory\n');

  // 7. Show statistics
  console.log('7. Final statistics...');
  const finalHealth = await memorySystem.healthCheck();
  console.log(`   ✓ Total memories: ${finalHealth.details.totalMemories}`);
  console.log(`   ✓ Collections: ${finalHealth.details.collectionNames.join(', ')}\n`);

  // 8. Cleanup
  console.log('8. Shutting down...');
  await memorySystem.shutdown();
  console.log('   ✓ Memory system shut down gracefully\n');

  console.log('Example complete! ✨');
}

// Run the example
if (require.main === module) {
  main().catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

export { main };
