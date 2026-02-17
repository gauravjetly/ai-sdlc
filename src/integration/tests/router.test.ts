/**
 * Smart Router Tests
 *
 * Tests for all 8 routing strategies and the SmartRouter coordinator.
 */

import { SmartRouter } from '../router/Router';
import { HybridClassifier } from '../classifier/HybridClassifier';
import { RequestClassification } from '../classifier/types';
import { GovernanceLevel } from '../governance/types';

/**
 * Helper: create a minimal RequestClassification for direct strategy testing.
 */
function makeClassification(
  overrides: Partial<RequestClassification>,
): RequestClassification {
  return {
    id: 'test-id',
    timestamp: new Date().toISOString(),
    userMessage: 'test message',
    messageHash: 'abc123',
    type: 'code-change',
    complexity: 'medium',
    urgency: 'normal',
    confidence: 0.85,
    requiresSDLC: true,
    requiredPhases: ['implementation', 'security', 'testing'],
    optionalPhases: [],
    estimatedDuration: '15 minutes',
    estimatedTokens: 15000,
    detectedTechnologies: [],
    affectedFiles: [],
    gitContext: { branch: 'feature/test', hasUncommittedChanges: false, isProtectedBranch: false },
    classifierUsed: 'rules',
    classificationDuration: 5,
    rulesMatched: ['test-rule'],
    ...overrides,
  };
}

describe('SmartRouter', () => {
  let classifier: HybridClassifier;
  let router: SmartRouter;

  beforeEach(() => {
    classifier = new HybridClassifier({ tier2Enabled: false });
    router = new SmartRouter();
  });

  async function classifyAndRoute(message: string, level: GovernanceLevel = 2) {
    const classification = await classifier.classify(message);
    return { classification, decision: router.route(classification, level) };
  }

  describe('Passthrough strategy', () => {
    it('should route Q&A to passthrough', async () => {
      const { decision } = await classifyAndRoute('What is React?');
      expect(decision.strategy).toBe('passthrough');
      expect(decision.agents).toEqual([]);
      expect(decision.phases).toEqual([]);
      expect(decision.blocking).toBe(false);
    });

    it('should route explanations to passthrough', async () => {
      const { decision } = await classifyAndRoute('Explain dependency injection');
      expect(decision.strategy).toBe('passthrough');
    });

    it('should have empty context injection for passthrough', async () => {
      const { decision } = await classifyAndRoute('What is TypeScript?');
      expect(decision.contextInjection).toBe('');
    });
  });

  describe('Emergency strategy', () => {
    it('should route emergencies correctly', async () => {
      const { decision } = await classifyAndRoute('URGENT: production is down');
      expect(decision.strategy).toBe('emergency');
      expect(decision.agents).toContain('ask-tom');
      expect(decision.agents).toContain('engineer');
      expect(decision.parallel).toBe(true);
    });

    it('should include emergency context injection', async () => {
      const { decision } = await classifyAndRoute('Critical: data loss in production');
      expect(decision.contextInjection).toContain('EMERGENCY');
    });
  });

  describe('Trivial strategy', () => {
    it('should route trivial changes to trivial strategy', async () => {
      const { decision } = await classifyAndRoute('Fix the typo in README.md');
      expect(decision.strategy).toBe('trivial');
      expect(decision.agents).toEqual(['engineer']);
      expect(decision.phases).toEqual(['implementation']);
    });

    it('should estimate 1 minute for trivial changes', async () => {
      const { decision } = await classifyAndRoute('Fix spelling error');
      expect(decision.estimatedDuration).toBe('1 minute');
    });
  });

  describe('Documentation strategy', () => {
    it('should route documentation requests', async () => {
      const { decision } = await classifyAndRoute('Write documentation for the API');
      expect(decision.strategy).toBe('documentation');
      expect(decision.agents).toEqual(['engineer']);
    });
  });

  describe('Bug fix strategy', () => {
    it('should route non-trivial bug fixes', async () => {
      const { classification, decision } = await classifyAndRoute(
        'Fix the authentication bug where users cannot log in after password reset. ' +
        'The JWT token validation is not checking expiry correctly.'
      );
      expect(decision.strategy).toBe('bugfix');
      expect(decision.agents).toContain('engineer');
      expect(decision.agents).toContain('qa');
    });

    it('should add security for medium+ complexity at governance 3', async () => {
      const { decision } = await classifyAndRoute(
        'Fix the authentication bug where users cannot log in after password reset. ' +
        'The JWT token validation is not checking expiry correctly.',
        3,
      );
      expect(decision.agents).toContain('security');
    });

    it('should add acceptance for complex bug fix at governance 3', () => {
      const classification = makeClassification({
        type: 'bug-fix',
        complexity: 'complex',
      });
      const decision = router.route(classification, 3);
      expect(decision.strategy).toBe('bugfix');
      expect(decision.agents).toContain('customer');
      expect(decision.phases).toContain('acceptance');
    });

    it('should add acceptance for epic bug fix at governance 3', () => {
      const classification = makeClassification({
        type: 'bug-fix',
        complexity: 'epic',
      });
      const decision = router.route(classification, 3);
      expect(decision.strategy).toBe('bugfix');
      expect(decision.agents).toContain('customer');
    });
  });

  describe('Feature strategy', () => {
    it('should route code changes to feature strategy', async () => {
      const { decision } = await classifyAndRoute(
        'Add user authentication with OAuth 2.0',
      );
      expect(decision.strategy).toBe('feature');
      expect(decision.agents).toContain('engineer');
    });

    it('should include more phases for complex features', async () => {
      // Force a complex classification by using a longer message
      const { classification } = await classifyAndRoute(
        'Add a complete user authentication system with OAuth 2.0 support, MFA, ' +
        'account recovery, session management, and role-based access control',
      );
      // The classification should have more phases
      expect(classification.requiredPhases.length).toBeGreaterThan(1);
    });

    it('should be blocking at governance level 3', async () => {
      const { decision } = await classifyAndRoute(
        'Add user authentication with OAuth 2.0',
        3,
      );
      expect(decision.blocking).toBe(true);
    });

    it('should route simple features with light SDLC', () => {
      const classification = makeClassification({
        type: 'code-change',
        complexity: 'simple',
      });
      const decision = router.route(classification, 2);
      expect(decision.strategy).toBe('feature');
      expect(decision.agents).toContain('engineer');
      expect(decision.agents).toContain('qa');
      // At governance level 2, should add security
      expect(decision.agents).toContain('security');
    });

    it('should route complex features with full SDLC including BA and Jets', () => {
      const classification = makeClassification({
        type: 'code-change',
        complexity: 'complex',
      });
      const decision = router.route(classification, 2);
      expect(decision.strategy).toBe('feature');
      expect(decision.agents).toContain('ba');
      expect(decision.agents).toContain('jets');
      expect(decision.agents).toContain('engineer');
      expect(decision.agents).toContain('security');
      expect(decision.agents).toContain('qa');
      expect(decision.phases).toContain('requirements');
      expect(decision.phases).toContain('architecture');
    });

    it('should add acceptance for complex features at governance 3', () => {
      const classification = makeClassification({
        type: 'code-change',
        complexity: 'complex',
      });
      const decision = router.route(classification, 3);
      expect(decision.agents).toContain('customer');
      expect(decision.phases).toContain('acceptance');
    });

    it('should add finops for epic features', () => {
      const classification = makeClassification({
        type: 'code-change',
        complexity: 'epic',
      });
      const decision = router.route(classification, 3);
      expect(decision.agents).toContain('finops');
      expect(decision.phases).toContain('cost-analysis');
      expect(decision.agents).toContain('customer');
    });

    it('should add requirements for medium features at governance 2', () => {
      const classification = makeClassification({
        type: 'code-change',
        complexity: 'medium',
      });
      const decision = router.route(classification, 2);
      expect(decision.phases).toContain('requirements');
      expect(decision.agents).toContain('ba');
    });

    it('should add acceptance for medium features at governance 3', () => {
      const classification = makeClassification({
        type: 'code-change',
        complexity: 'medium',
      });
      const decision = router.route(classification, 3);
      expect(decision.phases).toContain('acceptance');
      expect(decision.agents).toContain('customer');
    });
  });

  describe('Architecture strategy', () => {
    it('should route architecture requests', async () => {
      const { decision } = await classifyAndRoute(
        'Design a microservices architecture for the order system',
      );
      expect(decision.strategy).toBe('architecture');
      expect(decision.agents).toContain('ba');
      expect(decision.agents).toContain('jets');
      expect(decision.agents).toContain('security');
    });

    it('should add acceptance for architecture at governance 3', () => {
      const classification = makeClassification({
        type: 'architecture',
        complexity: 'complex',
      });
      const decision = router.route(classification, 3);
      expect(decision.strategy).toBe('architecture');
      expect(decision.agents).toContain('customer');
      expect(decision.phases).toContain('acceptance');
    });
  });

  describe('Review strategy', () => {
    it('should route review requests', async () => {
      const { decision } = await classifyAndRoute(
        'Review the security of the authentication code',
      );
      expect(decision.strategy).toBe('review');
      expect(decision.agents).toContain('security');
      expect(decision.agents).toContain('qa');
      expect(decision.parallel).toBe(true);
    });
  });

  describe('Governance level adjustments', () => {
    it('should never block at Level 1', async () => {
      const { decision } = await classifyAndRoute(
        'Add user authentication with OAuth 2.0',
        1,
      );
      expect(decision.blocking).toBe(false);
    });

    it('should block SDLC routes at Level 4', async () => {
      const { decision } = await classifyAndRoute(
        'Add user authentication with OAuth 2.0',
        4,
      );
      expect(decision.blocking).toBe(true);
    });

    it('should not block passthrough at Level 4', async () => {
      const { decision } = await classifyAndRoute('What is React?', 4);
      expect(decision.blocking).toBe(false);
    });
  });

  describe('Keyword overrides', () => {
    it('should force SDLC for "always" keywords', async () => {
      const customRouter = new SmartRouter({
        alwaysSDLCFor: ['database'],
      });
      const classification = await classifier.classify('Update database schema');
      const decision = customRouter.route(classification, 2);
      // Should not be passthrough since "database" forces SDLC
      expect(decision.strategy).not.toBe('passthrough');
    });
  });

  describe('Statistics', () => {
    it('should track route counts', async () => {
      await classifyAndRoute('What is React?');
      await classifyAndRoute('Fix typo');
      await classifyAndRoute('Add auth');

      const stats = router.getStats();
      expect(stats.totalRoutes).toBe(3);
    });
  });

  describe('Strategy registration', () => {
    it('should have 8 built-in strategies', () => {
      const strategies = router.getStrategies();
      expect(strategies.length).toBe(8);
    });

    it('should list strategy names', () => {
      const names = router.getStrategies().map((s) => s.name);
      expect(names).toContain('passthrough');
      expect(names).toContain('emergency');
      expect(names).toContain('trivial');
      expect(names).toContain('documentation');
      expect(names).toContain('bugfix');
      expect(names).toContain('feature');
      expect(names).toContain('architecture');
      expect(names).toContain('review');
    });
  });
});
