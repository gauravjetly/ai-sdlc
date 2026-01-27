/**
 * Context Injection System Demo
 *
 * Demonstrates the complete context injection pipeline.
 */

import { createContextInjectionSystem } from './index';

async function main() {
  console.log('========================================');
  console.log('Context Injection System Demo');
  console.log('========================================\n');

  // Create the context injection system
  const middleware = createContextInjectionSystem({
    orgName: 'deltek',
    enableCache: true,
    autoCleanupInterval: 60000
  });

  console.log('1. System initialized\n');

  // Example prompt
  const agentName = 'engineer';
  const prompt = 'Build a REST API for user authentication with JWT tokens and refresh token rotation';
  const projectPath = process.cwd();

  console.log('2. Input:');
  console.log(`   Agent: ${agentName}`);
  console.log(`   Prompt: ${prompt}`);
  console.log(`   Project: ${projectPath}\n`);

  // Execute context injection
  console.log('3. Gathering context...\n');

  const startTime = Date.now();
  const result = await middleware.wrapAgentExecution({
    agentName,
    prompt,
    projectPath
  });
  const duration = Date.now() - startTime;

  console.log('4. Context gathered successfully!\n');
  console.log('   Metadata:');
  console.log(`   - Retrieval time: ${result.contextMetadata.retrievalTime}ms`);
  console.log(`   - Total duration: ${duration}ms`);
  console.log(`   - Total tokens: ${result.contextMetadata.totalTokens}`);
  console.log(`   - Trimmed: ${result.contextMetadata.trimmed ? 'Yes' : 'No'}`);
  console.log(`   - Cache hit: ${result.contextMetadata.cacheHit ? 'Yes' : 'No'}\n`);

  console.log('5. Enhanced Prompt Preview:');
  console.log('   ─────────────────────────────────────────');

  // Show first 500 characters
  const preview = result.enhancedPrompt.substring(0, 500);
  console.log(preview);
  console.log('   ...\n');
  console.log(`   Total prompt length: ${result.enhancedPrompt.length} characters\n`);

  // Test cache
  console.log('6. Testing cache...\n');
  const cachedStartTime = Date.now();
  const cachedResult = await middleware.wrapAgentExecution({
    agentName,
    prompt,
    projectPath
  });
  const cachedDuration = Date.now() - cachedStartTime;

  console.log('   Cached retrieval:');
  console.log(`   - Duration: ${cachedDuration}ms`);
  console.log(`   - Cache hit: ${cachedResult.contextMetadata.cacheHit ? 'Yes' : 'No'}`);
  console.log(`   - Speedup: ${Math.round((duration / cachedDuration) * 100) / 100}x faster\n`);

  // Get cache stats
  const stats = middleware.getCacheStats();
  console.log('7. Cache Statistics:');
  console.log(`   - Total entries: ${stats.totalEntries}`);
  console.log(`   - Total hits: ${stats.totalHits}`);
  console.log(`   - Total misses: ${stats.totalMisses}`);
  console.log(`   - Hit rate: ${(stats.hitRate * 100).toFixed(1)}%\n`);

  console.log('========================================');
  console.log('Demo Complete!');
  console.log('========================================\n');
}

// Run demo
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
