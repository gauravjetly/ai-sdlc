/**
 * Context Injection System Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createContextInjectionSystem } from '../index';
import { ContextGatherer } from '../core/context-gatherer';
import { ContextPrioritizer } from '../core/context-prioritizer';
import { TokenCounter } from '../utils/token-counter';
import { CacheManager, CACHE_TTL } from '../core/cache-manager';
import { OrgContextLoader } from '../sources/org-context-loader';
import { ProjectContextLoader } from '../sources/project-context-loader';

describe('Context Injection System', () => {
  describe('TokenCounter', () => {
    it('should count tokens accurately', () => {
      const text = 'Hello world, this is a test';
      const tokens = TokenCounter.count(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should handle empty text', () => {
      expect(TokenCounter.count('')).toBe(0);
    });

    it('should truncate text to fit token budget', () => {
      const text = 'a'.repeat(1000);
      const truncated = TokenCounter.truncate(text, 50);
      const tokens = TokenCounter.count(truncated);
      expect(tokens).toBeLessThanOrEqual(50);
    });

    it('should smart truncate at sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const truncated = TokenCounter.smartTruncate(text, 10);
      expect(truncated).toContain('.');
    });
  });

  describe('CacheManager', () => {
    let cache: CacheManager;

    beforeEach(() => {
      cache = new CacheManager();
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1', 1000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100);
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    it('should track cache hits and misses', () => {
      cache.set('key1', 'value1', 1000);
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should invalidate keys matching pattern', () => {
      cache.set('user:1', 'data1', 1000);
      cache.set('user:2', 'data2', 1000);
      cache.set('post:1', 'data3', 1000);

      const invalidated = cache.invalidate('user:.*');
      expect(invalidated).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('post:1')).toBe('data3');
    });

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 1000);

      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should use getOrFetch pattern', async () => {
      let fetchCalls = 0;
      const fetchFn = async () => {
        fetchCalls++;
        return 'fetched-value';
      };

      const result1 = await cache.getOrFetch('key1', fetchFn, 1000);
      expect(result1).toBe('fetched-value');
      expect(fetchCalls).toBe(1);

      const result2 = await cache.getOrFetch('key1', fetchFn, 1000);
      expect(result2).toBe('fetched-value');
      expect(fetchCalls).toBe(1); // Should not fetch again
    });
  });

  describe('ContextPrioritizer', () => {
    let prioritizer: ContextPrioritizer;

    beforeEach(() => {
      prioritizer = new ContextPrioritizer();
    });

    it('should return context as-is if within budget', () => {
      const context = createMockContext(1000);
      const prioritized = prioritizer.prioritize(context, 'engineer', 5000);

      expect(prioritized.totalTokens).toBe(context.totalTokens);
      expect(prioritized.metadata.trimmed).toBe(false);
    });

    it('should trim context when exceeding budget', () => {
      const context = createMockContext(10000);
      const prioritized = prioritizer.prioritize(context, 'engineer', 4000);

      expect(prioritized.totalTokens).toBeLessThan(context.totalTokens);
      expect(prioritized.metadata.trimmed).toBe(true);
    });

    it('should trim historical context first', () => {
      const context = createMockContext(10000);
      const originalHistoricalCount = context.historical.length;

      const prioritized = prioritizer.prioritize(context, 'engineer', 4000);

      expect(prioritized.historical.length).toBeLessThanOrEqual(
        originalHistoricalCount
      );
    });

    it('should use agent-specific token budgets', () => {
      const architectBudget = ContextPrioritizer.getTokenBudget('architect');
      const conductorBudget = ContextPrioritizer.getTokenBudget('conductor');

      expect(architectBudget).toBe(5000);
      expect(conductorBudget).toBe(2000);
      expect(architectBudget).toBeGreaterThan(conductorBudget);
    });
  });

  describe('Integration Tests', () => {
    it('should create context injection system', () => {
      const middleware = createContextInjectionSystem({
        orgName: 'deltek',
        enableCache: true
      });

      expect(middleware).toBeDefined();
      expect(middleware.execute).toBeDefined();
    });

    it('should handle context injection end-to-end', async () => {
      const middleware = createContextInjectionSystem({
        orgName: 'deltek',
        enableCache: false
      });

      const result = await middleware.wrapAgentExecution({
        agentName: 'engineer',
        prompt: 'Build a REST API with authentication',
        projectPath: process.cwd()
      });

      expect(result.enhancedPrompt).toContain('Build a REST API with authentication');
      expect(result.enhancedPrompt).toContain('Deltek');
      expect(result.contextMetadata.totalTokens).toBeGreaterThan(0);
    });

    it('should cache context between requests', async () => {
      const middleware = createContextInjectionSystem({
        orgName: 'deltek',
        enableCache: true
      });

      const request = {
        agentName: 'engineer' as const,
        prompt: 'Test prompt',
        projectPath: process.cwd()
      };

      const result1 = await middleware.wrapAgentExecution(request);
      expect(result1.contextMetadata.cacheHit).toBe(false);

      const result2 = await middleware.wrapAgentExecution(request);
      expect(result2.contextMetadata.cacheHit).toBe(true);

      expect(result1.contextMetadata.retrievalTime).toBeGreaterThan(
        result2.contextMetadata.retrievalTime
      );
    });
  });
});

// Test helpers
function createMockContext(totalTokens: number): any {
  const tokensPerSection = Math.floor(totalTokens / 4);

  return {
    organizational: {
      standards: 'x'.repeat(tokensPerSection * 4),
      security: 'x'.repeat(tokensPerSection * 4),
      libraries: ['lib1', 'lib2'],
      architecture: 'x'.repeat(tokensPerSection * 4),
      deployment: 'x'.repeat(tokensPerSection * 4),
      testing: 'x'.repeat(tokensPerSection * 4),
      tokens: tokensPerSection,
      priority: 2
    },
    project: {
      stack: 'x'.repeat(tokensPerSection * 4),
      architecture: 'x'.repeat(tokensPerSection * 4),
      existing: 'x'.repeat(tokensPerSection * 4),
      conventions: 'x'.repeat(tokensPerSection * 4),
      adrs: [],
      tokens: tokensPerSection,
      priority: 3
    },
    historical: Array(10).fill({
      similarity: 0.8,
      content: 'x'.repeat(tokensPerSection * 4 / 10),
      source: 'test',
      type: 'implementation'
    }),
    live: {
      branch: 'main',
      lastCommit: 'test',
      openPRs: 0,
      dependencies: {},
      recentChanges: [],
      tokens: tokensPerSection
    },
    totalTokens,
    metadata: {
      retrievalTime: 100,
      sourcesUsed: [],
      cacheHit: false,
      trimmed: false,
      requestId: 'test',
      timestamp: new Date().toISOString()
    }
  };
}
