/**
 * Context Builder Tests
 */

import { ContextBuilder } from '../integration/context-builder';
import { Memory } from '../types';

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder(4000);
  });

  const createMockMemory = (overrides?: Partial<Memory>): Memory => ({
    id: 'TEST-001',
    agent: 'engineer',
    category: 'code-patterns',
    title: 'Test Pattern',
    content: 'This is test content for the memory.',
    metadata: {
      success: true,
      tags: ['test'],
      similarity: 0.85,
    },
    version: 1,
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('buildContext', () => {
    it('should build context from multiple memories', () => {
      const memories: Memory[] = [
        createMockMemory({
          category: 'security-findings',
          title: 'SQL Injection Fix',
          metadata: { success: true, tags: ['security'], similarity: 0.9 },
        }),
        createMockMemory({
          category: 'code-patterns',
          title: 'Authentication Pattern',
          metadata: { success: true, tags: ['auth'], similarity: 0.85 },
        }),
      ];

      const context = contextBuilder.buildContext(memories, 'engineer');

      expect(context.memories).toHaveLength(2);
      expect(context.formattedContext).toContain('RELEVANT MEMORIES');
      expect(context.formattedContext).toContain('Security Findings');
      expect(context.formattedContext).toContain('Proven Code Patterns');
      expect(context.tokenEstimate).toBeGreaterThan(0);
    });

    it('should return empty context for no memories', () => {
      const context = contextBuilder.buildContext([], 'engineer');

      expect(context.memories).toHaveLength(0);
      expect(context.formattedContext).toBe('');
      expect(context.tokenEstimate).toBe(0);
    });

    it('should truncate context if too long', () => {
      const memories: Memory[] = [];
      for (let i = 0; i < 50; i++) {
        memories.push(
          createMockMemory({
            id: `TEST-${i}`,
            content: 'A'.repeat(1000), // Long content
          })
        );
      }

      const context = contextBuilder.buildContext(memories, 'engineer');

      expect(context.tokenEstimate).toBeLessThanOrEqual(4000);
      expect(context.formattedContext).toContain('[Context truncated...]');
    });
  });

  describe('buildMinimalContext', () => {
    it('should build minimal context with titles only', () => {
      const memories: Memory[] = [
        createMockMemory({
          title: 'Pattern 1',
          metadata: { success: true, tags: [], similarity: 0.9 },
        }),
        createMockMemory({
          title: 'Pattern 2',
          metadata: { success: true, tags: [], similarity: 0.8 },
        }),
      ];

      const minimal = contextBuilder.buildMinimalContext(memories);

      expect(minimal).toContain('Pattern 1');
      expect(minimal).toContain('Pattern 2');
      expect(minimal).toContain('90% relevant');
      expect(minimal).toContain('80% relevant');
    });

    it('should return empty string for no memories', () => {
      const minimal = contextBuilder.buildMinimalContext([]);

      expect(minimal).toBe('');
    });
  });
});
