/**
 * Request Classifier Tests
 *
 * Comprehensive tests for Tier 1 (rules), Tier 2 (LLM), and Hybrid classifiers.
 */

import { RuleClassifier } from '../classifier/RuleClassifier';
import { LLMClassifier, AnthropicClient } from '../classifier/LLMClassifier';
import { HybridClassifier } from '../classifier/HybridClassifier';
import { TierResult, RequestType, ClassificationContext } from '../classifier/types';

// ============================================================
// Tier 1: RuleClassifier Tests
// ============================================================

describe('RuleClassifier', () => {
  let classifier: RuleClassifier;

  beforeEach(() => {
    classifier = new RuleClassifier();
  });

  describe('Q&A detection', () => {
    it('should classify simple questions as qa', async () => {
      const result = await classifier.classify('What is React?');
      expect(result.type).toBe('qa');
      expect(result.requiresSDLC).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should classify "how does" questions as explanation', async () => {
      const result = await classifier.classify('How does dependency injection work?');
      expect(result.type).toBe('explanation');
      expect(result.requiresSDLC).toBe(false);
    });

    it('should classify "explain" requests as explanation', async () => {
      const result = await classifier.classify('Explain the strategy pattern');
      expect(result.type).toBe('explanation');
      expect(result.requiresSDLC).toBe(false);
    });

    it('should classify very short questions as qa', async () => {
      const result = await classifier.classify('Why?');
      expect(result.type).toBe('qa');
      expect(result.requiresSDLC).toBe(false);
    });
  });

  describe('Emergency detection', () => {
    it('should detect "URGENT" as emergency', async () => {
      const result = await classifier.classify('URGENT: The API is down');
      expect(result.type).toBe('emergency');
      expect(result.urgency).toBe('critical');
      expect(result.requiresSDLC).toBe(true);
    });

    it('should detect "production down" as emergency', async () => {
      const result = await classifier.classify('Production is down, 500 errors everywhere');
      expect(result.type).toBe('emergency');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    it('should detect "critical" as emergency', async () => {
      const result = await classifier.classify('Critical: data loss in the user table');
      expect(result.type).toBe('emergency');
    });

    it('should detect "outage" as emergency', async () => {
      const result = await classifier.classify('We have an outage affecting all customers');
      expect(result.type).toBe('emergency');
    });
  });

  describe('Code change detection', () => {
    it('should detect "add new feature" as code-change', async () => {
      const result = await classifier.classify('Add a new user profile page with avatar upload');
      expect(result.type).toBe('code-change');
      expect(result.requiresSDLC).toBe(true);
    });

    it('should detect "create new api" as code-change', async () => {
      const result = await classifier.classify('Create a new REST API endpoint for user management');
      expect(result.type).toBe('code-change');
    });

    it('should detect "implement" as code-change', async () => {
      const result = await classifier.classify('Implement authentication with OAuth 2.0');
      expect(result.type).toBe('code-change');
    });
  });

  describe('Trivial change detection', () => {
    it('should detect "fix typo" as trivial', async () => {
      const result = await classifier.classify('Fix the typo in README.md');
      expect(result.type).toBe('code-change');
      expect(result.complexity).toBe('trivial');
      expect(result.requiresSDLC).toBe(false);
    });

    it('should detect "update readme" as trivial', async () => {
      const result = await classifier.classify('Update readme formatting');
      expect(result.complexity).toBe('trivial');
    });

    it('should detect "fix spelling" as trivial', async () => {
      const result = await classifier.classify('Fix spelling error');
      expect(result.complexity).toBe('trivial');
    });
  });

  describe('Architecture detection', () => {
    it('should detect "design" as architecture', async () => {
      const result = await classifier.classify('Design a scalable architecture for the notification system');
      expect(result.type).toBe('architecture');
      expect(result.requiresSDLC).toBe(true);
    });

    it('should detect "tech stack" as architecture', async () => {
      const result = await classifier.classify('Evaluate the tech stack for the new project');
      expect(result.type).toBe('architecture');
    });
  });

  describe('Review detection', () => {
    it('should detect "review code" as review', async () => {
      const result = await classifier.classify('Review the security of the authentication code');
      expect(result.type).toBe('review');
      expect(result.requiresSDLC).toBe(true);
    });

    it('should detect "audit" as review', async () => {
      const result = await classifier.classify('Audit the code for security vulnerabilities');
      expect(result.type).toBe('review');
    });
  });

  describe('Bug fix detection', () => {
    it('should detect short bug reports as simple', async () => {
      const result = await classifier.classify('Fix the null pointer error');
      expect(result.type).toBe('bug-fix');
      expect(result.complexity).toBe('simple');
    });

    it('should detect longer bug reports as medium', async () => {
      const result = await classifier.classify(
        'Fix the authentication bug where users cannot log in after password reset. ' +
        'The issue appears to be in the JWT token validation logic where the token ' +
        'expiry is not being checked correctly against the server clock.',
      );
      expect(result.type).toBe('bug-fix');
      expect(result.complexity).toBe('medium');
    });
  });

  describe('Complexity assessment', () => {
    it('should assess short messages as trivial', async () => {
      const result = await classifier.classify('Fix typo');
      expect(result.complexity).toBe('trivial');
    });

    it('should assess moderate messages as medium', async () => {
      const result = await classifier.classify(
        'Add a new user profile page with avatar upload and social media integration including OAuth 2.0',
      );
      expect(['medium', 'complex']).toContain(result.complexity);
    });
  });

  describe('Performance', () => {
    it('should classify in under 50ms', async () => {
      const start = Date.now();
      await classifier.classify('What is React?');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should classify 100 messages in under 500ms', async () => {
      const messages = [
        'What is React?', 'Fix typo', 'Add auth', 'URGENT: down',
        'Review code', 'Design system', 'Deploy', 'Write tests',
        'Update docs', 'Configure CI', 'Refactor auth', 'How does X work?',
      ];

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        await classifier.classify(messages[i % messages.length]);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Context awareness', () => {
    it('should increase confidence on protected branches', async () => {
      const context: ClassificationContext = {
        branch: 'main',
        protectedBranches: ['main', 'production'],
      };

      const withContext = await classifier.classify(
        'Add user authentication with OAuth 2.0',
        context,
      );
      const withoutContext = await classifier.classify(
        'Add user authentication with OAuth 2.0',
      );

      expect(withContext.confidence).toBeGreaterThanOrEqual(withoutContext.confidence);
    });
  });

  describe('Default fallback', () => {
    it('should return low confidence for unrecognized messages', async () => {
      const result = await classifier.classify('The quick brown fox jumps over the lazy dog');
      expect(result.confidence).toBeLessThan(0.7);
    });
  });
});

// ============================================================
// Tier 2: LLMClassifier Tests
// ============================================================

describe('LLMClassifier', () => {
  let classifier: LLMClassifier;

  beforeEach(() => {
    classifier = new LLMClassifier();
  });

  describe('with mock client', () => {
    it('should parse valid JSON responses', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{
              type: 'text',
              text: JSON.stringify({
                type: 'code-change',
                complexity: 'medium',
                urgency: 'normal',
                confidence: 0.88,
                requiresSDLC: true,
                requiredPhases: ['implementation', 'security', 'testing'],
                reasoning: 'New feature request',
              }),
            }],
          }),
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('Add user authentication');

      expect(result.type).toBe('code-change');
      expect(result.complexity).toBe('medium');
      expect(result.confidence).toBe(0.88);
      expect(result.requiresSDLC).toBe(true);
    });

    it('should handle markdown-wrapped JSON responses', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{
              type: 'text',
              text: '```json\n{"type":"qa","complexity":"trivial","urgency":"low","confidence":0.95,"requiresSDLC":false,"requiredPhases":[],"reasoning":"Simple question"}\n```',
            }],
          }),
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('What is React?');

      expect(result.type).toBe('qa');
      expect(result.requiresSDLC).toBe(false);
    });

    it('should validate and coerce invalid enum values', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{
              type: 'text',
              text: JSON.stringify({
                type: 'invalid-type',
                complexity: 'invalid',
                urgency: 'invalid',
                confidence: 0.8,
                requiresSDLC: true,
                requiredPhases: ['implementation'],
              }),
            }],
          }),
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('Something');

      // Should fall back to defaults
      expect(result.type).toBe('code-change');
      expect(result.complexity).toBe('medium');
      expect(result.urgency).toBe('normal');
    });

    it('should clamp confidence to valid range', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{
              type: 'text',
              text: JSON.stringify({
                type: 'qa',
                complexity: 'trivial',
                urgency: 'low',
                confidence: 5.0, // Out of range
                requiresSDLC: false,
                requiredPhases: [],
              }),
            }],
          }),
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('What?');

      expect(result.confidence).toBe(0.7); // Falls back to default
    });

    it('should filter invalid phases', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{
              type: 'text',
              text: JSON.stringify({
                type: 'code-change',
                complexity: 'medium',
                urgency: 'normal',
                confidence: 0.8,
                requiresSDLC: true,
                requiredPhases: ['implementation', 'invalid-phase', 'security'],
              }),
            }],
          }),
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('Add auth');

      expect(result.requiredPhases).toEqual(['implementation', 'security']);
    });
  });

  describe('error handling', () => {
    it('should return fallback on API error', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => {
            throw new Error('API rate limit');
          },
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('Add authentication');

      expect(result.confidence).toBeLessThanOrEqual(0.30);
      expect(result.reasoning).toContain('API rate limit');
    });

    it('should return fallback on JSON parse error', async () => {
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{ type: 'text', text: 'Not valid JSON at all' }],
          }),
        },
      };

      classifier.setClient(mockClient);
      const result = await classifier.classify('Add authentication');

      expect(result.confidence).toBeLessThanOrEqual(0.30);
    });

    it('should gracefully fall back on missing API key without mock client', async () => {
      const original = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const freshClassifier = new LLMClassifier();
      const result = await freshClassifier.classify('test');

      // Should return a low-confidence fallback instead of throwing
      expect(result.confidence).toBeLessThanOrEqual(0.30);
      expect(result.reasoning).toContain('API key');

      if (original) process.env.ANTHROPIC_API_KEY = original;
    });
  });
});

// ============================================================
// Hybrid Classifier Tests
// ============================================================

describe('HybridClassifier', () => {
  describe('with Tier 2 disabled', () => {
    let classifier: HybridClassifier;

    beforeEach(() => {
      classifier = new HybridClassifier({ tier2Enabled: false });
    });

    it('should classify using rules only', async () => {
      const result = await classifier.classify('What is React?');
      expect(result.classifierUsed).toBe('rules');
      expect(result.type).toBe('qa');
    });

    it('should include all metadata fields', async () => {
      const result = await classifier.classify('Add user authentication');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.userMessage).toBe('Add user authentication');
      expect(result.messageHash).toBeDefined();
      expect(result.messageHash).toHaveLength(64); // SHA-256 hex
      expect(result.classificationDuration).toBeGreaterThanOrEqual(0);
    });

    it('should detect technologies in messages', async () => {
      const result = await classifier.classify('Add OAuth authentication to the TypeScript API');
      expect(result.detectedTechnologies).toContain('TypeScript');
      expect(result.detectedTechnologies).toContain('OAuth');
    });

    it('should detect file paths in messages', async () => {
      const result = await classifier.classify('Fix the bug in src/auth/handler.ts');
      expect(result.affectedFiles).toContain('src/auth/handler.ts');
    });

    it('should detect git context', async () => {
      const result = await classifier.classify('Add auth', {
        branch: 'main',
        protectedBranches: ['main', 'production'],
      });
      expect(result.gitContext.branch).toBe('main');
      expect(result.gitContext.isProtectedBranch).toBe(true);
    });
  });

  describe('caching', () => {
    let classifier: HybridClassifier;

    beforeEach(() => {
      classifier = new HybridClassifier({ tier2Enabled: false, cacheEnabled: true });
    });

    it('should cache classifications', async () => {
      const result1 = await classifier.classify('What is React?');
      const result2 = await classifier.classify('What is React?');

      expect(result2.type).toBe(result1.type);
      expect(classifier.getStats().cacheHits).toBe(1);
    });

    it('should not cache different messages', async () => {
      await classifier.classify('What is React?');
      await classifier.classify('What is Angular?');

      expect(classifier.getStats().cacheHits).toBe(0);
      expect(classifier.getStats().cacheSize).toBe(2);
    });

    it('should clear cache', async () => {
      await classifier.classify('What is React?');
      expect(classifier.getStats().cacheSize).toBe(1);

      classifier.clearCache();
      expect(classifier.getStats().cacheSize).toBe(0);
    });
  });

  describe('hybrid with mock LLM', () => {
    it('should use rules when confidence >= threshold', async () => {
      const classifier = new HybridClassifier({
        tier1ConfidenceThreshold: 0.9,
        tier2Enabled: true,
      });

      // Emergency has 0.95 confidence in rules -- should skip LLM
      const result = await classifier.classify('URGENT: production is down');
      expect(result.classifierUsed).toBe('rules');
    });

    it('should use LLM when rules confidence < threshold', async () => {
      const classifier = new HybridClassifier({
        tier1ConfidenceThreshold: 0.9,
        tier2Enabled: true,
      });

      // Set up mock LLM client
      const mockClient: AnthropicClient = {
        messages: {
          create: async () => ({
            content: [{
              type: 'text',
              text: JSON.stringify({
                type: 'code-change',
                complexity: 'complex',
                urgency: 'high',
                confidence: 0.92,
                requiresSDLC: true,
                requiredPhases: ['requirements', 'architecture', 'implementation', 'security', 'testing'],
                reasoning: 'Complex refactoring request',
              }),
            }],
          }),
        },
      };

      classifier.getLLMClassifier().setClient(mockClient);

      // "refactor" matches generic-code-change with 0.65 confidence < 0.9 threshold
      const result = await classifier.classify('Refactor the entire authentication module');
      expect(result.classifierUsed).toBe('hybrid');
    });
  });

  describe('statistics', () => {
    it('should track classification counts', async () => {
      const classifier = new HybridClassifier({ tier2Enabled: false });

      await classifier.classify('What is React?');
      await classifier.classify('Add auth');
      await classifier.classify('Fix bug');

      const stats = classifier.getStats();
      expect(stats.totalClassifications).toBe(3);
    });
  });

  describe('error: both tiers disabled', () => {
    it('should throw when both tiers are disabled', async () => {
      const classifier = new HybridClassifier({
        tier1Enabled: false,
        tier2Enabled: false,
      });

      await expect(classifier.classify('test')).rejects.toThrow(/Both classification tiers are disabled/);
    });
  });
});
