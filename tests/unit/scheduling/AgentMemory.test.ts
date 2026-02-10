/**
 * Unit Tests for AgentMemory Entity
 */

import { AgentMemory } from '../../../src/platform/scheduling/domain/entities/AgentMemory';

function createTestMemory(overrides: Partial<any> = {}): AgentMemory {
  return new AgentMemory({
    agentId: 'developer-agent-1',
    contextKey: 'auth.patterns.oauth2',
    contextValue: {
      pattern: 'OAuth 2.0 with PKCE',
      libraries: ['passport', 'jose'],
      decisions: ['Use refresh token rotation', 'Store tokens in HTTP-only cookies'],
    },
    ...overrides,
  });
}

describe('AgentMemory', () => {
  describe('Construction', () => {
    it('should create a valid memory entry', () => {
      const memory = createTestMemory();
      expect(memory.id).toBeDefined();
      expect(memory.agentId).toBe('developer-agent-1');
      expect(memory.contextKey).toBe('auth.patterns.oauth2');
      expect(memory.sizeBytes).toBeGreaterThan(0);
      expect(memory.accessCount).toBe(0);
    });

    it('should throw if agentId is empty', () => {
      expect(() => createTestMemory({ agentId: '' })).toThrow('Agent ID is required');
    });

    it('should throw if contextKey is empty', () => {
      expect(() => createTestMemory({ contextKey: '' })).toThrow('Context key is required');
    });

    it('should throw if contextKey exceeds 500 characters', () => {
      expect(() => createTestMemory({ contextKey: 'a'.repeat(501) })).toThrow('Context key must be 500 characters or less');
    });

    it('should calculate size correctly', () => {
      const memory = createTestMemory({
        contextValue: { simple: 'value' },
      });
      expect(memory.sizeBytes).toBe(new TextEncoder().encode(JSON.stringify({ simple: 'value' })).length);
    });
  });

  describe('access', () => {
    it('should increment access count', () => {
      const memory = createTestMemory();
      expect(memory.accessCount).toBe(0);

      memory.access();
      expect(memory.accessCount).toBe(1);

      memory.access();
      expect(memory.accessCount).toBe(2);
    });

    it('should update lastAccessedAt', () => {
      const memory = createTestMemory();
      const before = memory.lastAccessedAt;

      // Wait a tiny bit to ensure timestamp difference
      memory.access();
      expect(memory.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should return the context value', () => {
      const memory = createTestMemory();
      const value = memory.access();
      expect(value).toHaveProperty('pattern', 'OAuth 2.0 with PKCE');
    });
  });

  describe('update', () => {
    it('should update the stored value', () => {
      const memory = createTestMemory();
      const newValue = { updated: true, data: 'new' };
      memory.update(newValue);
      expect(memory.contextValue).toEqual(newValue);
    });

    it('should recalculate size after update', () => {
      const memory = createTestMemory();
      const originalSize = memory.sizeBytes;

      memory.update({ tiny: 'v' });
      expect(memory.sizeBytes).toBeLessThan(originalSize);
    });
  });

  describe('isExpired', () => {
    it('should return false when no expiry set', () => {
      const memory = createTestMemory();
      expect(memory.isExpired()).toBe(false);
    });

    it('should return true when past expiry', () => {
      const memory = createTestMemory({
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });
      expect(memory.isExpired()).toBe(true);
    });

    it('should return false when before expiry', () => {
      const memory = createTestMemory({
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      });
      expect(memory.isExpired()).toBe(false);
    });
  });

  describe('isStale', () => {
    it('should return false for recently accessed entries', () => {
      const memory = createTestMemory();
      expect(memory.isStale()).toBe(false);
    });

    it('should return true for entries not accessed in 30+ days', () => {
      const memory = createTestMemory({
        lastAccessedAt: new Date(Date.now() - 31 * 86400000), // 31 days ago
      });
      expect(memory.isStale()).toBe(true);
    });

    it('should support custom stale threshold', () => {
      const memory = createTestMemory({
        lastAccessedAt: new Date(Date.now() - 8 * 86400000), // 8 days ago
      });
      expect(memory.isStale(7)).toBe(true);
      expect(memory.isStale(10)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields', () => {
      const memory = createTestMemory();
      const json = memory.toJSON();

      expect(json.id).toBeDefined();
      expect(json.agentId).toBe('developer-agent-1');
      expect(json.contextKey).toBe('auth.patterns.oauth2');
      expect(json.contextValue).toHaveProperty('pattern');
      expect(json.sizeBytes).toBeGreaterThan(0);
      expect(json.accessCount).toBe(0);
    });
  });
});
