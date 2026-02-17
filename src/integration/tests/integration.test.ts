/**
 * Integration Tests
 *
 * End-to-end tests for the full pipeline:
 * Classify -> Route -> Governance -> Decision
 */

import { HybridClassifier } from '../classifier/HybridClassifier';
import { SmartRouter } from '../router/Router';
import { GovernanceEngine } from '../governance/GovernanceEngine';
import { GovernanceLevel } from '../governance/types';
import { DEFAULT_CONFIG } from '../config/defaults';

describe('Full Pipeline Integration', () => {
  let classifier: HybridClassifier;
  let router: SmartRouter;

  beforeEach(() => {
    classifier = new HybridClassifier({ tier2Enabled: false });
    router = new SmartRouter({
      alwaysSDLCFor: DEFAULT_CONFIG.routing.alwaysSDLCFor,
      neverSDLCFor: DEFAULT_CONFIG.routing.neverSDLCFor,
    });
  });

  async function runPipeline(
    message: string,
    level: GovernanceLevel = 2,
    branch?: string,
  ) {
    const governance = new GovernanceEngine({
      level,
      branchOverrides: [
        { pattern: 'main', level: 3 },
        { pattern: 'production', level: 4 },
      ],
    });

    const classification = await classifier.classify(message, {
      branch: branch || 'feature/test',
      protectedBranches: ['main', 'production'],
    });

    const routingDecision = router.route(classification, governance.getLevel());
    const govDecision = governance.evaluate(classification, branch);

    return { classification, routingDecision, govDecision };
  }

  describe('Scenario: Simple Q&A', () => {
    it('should pass through with zero overhead', async () => {
      const { classification, routingDecision, govDecision } =
        await runPipeline('What is React?');

      expect(classification.type).toBe('qa');
      expect(classification.requiresSDLC).toBe(false);
      expect(routingDecision.strategy).toBe('passthrough');
      expect(routingDecision.agents).toHaveLength(0);
      expect(govDecision.allowed).toBe(true);
    });
  });

  describe('Scenario: Trivial Change', () => {
    it('should use optimized strategy', async () => {
      const { classification, routingDecision, govDecision } =
        await runPipeline('Fix the typo in README.md');

      expect(classification.complexity).toBe('trivial');
      expect(routingDecision.strategy).toBe('trivial');
      expect(routingDecision.agents).toEqual(['engineer']);
      expect(govDecision.allowed).toBe(true);
    });
  });

  describe('Scenario: New Feature at Level 2', () => {
    it('should route through feature strategy with advisories', async () => {
      const { classification, routingDecision, govDecision } =
        await runPipeline('Add user authentication with OAuth 2.0', 2);

      expect(classification.type).toBe('code-change');
      expect(classification.requiresSDLC).toBe(true);
      expect(routingDecision.strategy).toBe('feature');
      expect(routingDecision.agents.length).toBeGreaterThan(0);
      expect(govDecision.allowed).toBe(true);
      // Should have advisories at Level 2
      expect(govDecision.advisories.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Feature on Main Branch (Level 3)', () => {
    it('should block at governance level 3', async () => {
      const { classification, routingDecision, govDecision } =
        await runPipeline('Add user authentication with OAuth 2.0', 2, 'main');

      expect(classification.requiresSDLC).toBe(true);
      expect(govDecision.level).toBe(3); // Branch override
      expect(govDecision.allowed).toBe(false);
      expect(govDecision.blockedBy.length).toBeGreaterThan(0);
      expect(govDecision.overrideAvailable).toBe(true);
      expect(govDecision.overrideRequiresToken).toBe(true);
    });
  });

  describe('Scenario: Feature on Production Branch (Level 4)', () => {
    it('should block without override at Level 4', async () => {
      const { govDecision } =
        await runPipeline('Deploy the new API version', 2, 'production');

      expect(govDecision.level).toBe(4);
      expect(govDecision.allowed).toBe(false);
      expect(govDecision.overrideAvailable).toBe(false);
    });
  });

  describe('Scenario: Emergency', () => {
    it('should route to emergency strategy', async () => {
      const { classification, routingDecision } =
        await runPipeline('URGENT: The payment API is returning 500 errors');

      expect(classification.type).toBe('emergency');
      expect(classification.urgency).toBe('critical');
      expect(routingDecision.strategy).toBe('emergency');
      expect(routingDecision.agents).toContain('ask-tom');
    });
  });

  describe('Scenario: Architecture Decision', () => {
    it('should route to architecture strategy', async () => {
      const { classification, routingDecision } =
        await runPipeline('Design a microservices architecture for the order system');

      expect(classification.type).toBe('architecture');
      expect(routingDecision.strategy).toBe('architecture');
      expect(routingDecision.agents).toContain('jets');
    });
  });

  describe('Scenario: Code Review', () => {
    it('should route to review strategy', async () => {
      const { classification, routingDecision } =
        await runPipeline('Review the security of the authentication implementation');

      expect(classification.type).toBe('review');
      expect(routingDecision.strategy).toBe('review');
      expect(routingDecision.agents).toContain('security');
      expect(routingDecision.agents).toContain('qa');
    });
  });

  describe('Performance across scenarios', () => {
    const scenarios = [
      'What is React?',
      'Fix typo in README',
      'Add user authentication with OAuth 2.0',
      'URGENT: production is down',
      'Design a scalable architecture',
      'Review the security of the code',
      'Write documentation for the API',
      'Deploy to staging',
    ];

    it('should classify and route all scenarios in under 100ms total', async () => {
      const start = Date.now();

      for (const message of scenarios) {
        const classification = await classifier.classify(message);
        router.route(classification, 2);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
