/**
 * Governance Engine Tests
 *
 * Tests for all 4 governance levels, gate behavior matrix, and policy evaluation.
 */

import { GovernanceEngine } from '../governance/GovernanceEngine';
import {
  getGateBehavior,
  getBlockingGates,
  getAdvisoryGates,
  getActiveGates,
  canBypass,
} from '../governance/levels';
import { evaluateGate, resolveGovernanceLevel } from '../governance/policies';
import { GovernanceLevel, GateName, GOVERNANCE_LEVEL_NAMES } from '../governance/types';
import { HybridClassifier } from '../classifier/HybridClassifier';

describe('Governance Levels', () => {
  describe('Gate behavior matrix', () => {
    it('should skip all gates at Level 1 except request-logging which is also skip', () => {
      const active = getActiveGates(1);
      expect(active).toHaveLength(0);
    });

    it('should have advisory gates at Level 2', () => {
      const advisory = getAdvisoryGates(2);
      expect(advisory).toContain('security-review');
      expect(advisory).toContain('qa-testing');
      expect(advisory).toContain('architecture-review');
    });

    it('should have blocking gates at Level 3', () => {
      const blocking = getBlockingGates(3);
      expect(blocking).toContain('security-review');
      expect(blocking).toContain('qa-testing');
      expect(blocking).toContain('architecture-review');
      expect(blocking).toContain('customer-acceptance');
    });

    it('should have all gates blocking at Level 4', () => {
      const blocking = getBlockingGates(4);
      expect(blocking).toContain('security-review');
      expect(blocking).toContain('qa-testing');
      expect(blocking).toContain('architecture-review');
      expect(blocking).toContain('customer-acceptance');
      expect(blocking).toContain('compliance-check');
      expect(blocking).toContain('approval-workflow');
      expect(blocking).toContain('request-logging');
      expect(blocking).toContain('cost-tracking');
    });

    it('should return correct behavior for each gate-level combination', () => {
      expect(getGateBehavior('security-review', 1)).toBe('skip');
      expect(getGateBehavior('security-review', 2)).toBe('advisory');
      expect(getGateBehavior('security-review', 3)).toBe('blocking');
      expect(getGateBehavior('security-review', 4)).toBe('blocking');
    });
  });

  describe('Bypass rules', () => {
    it('should allow bypass at Level 1 without token', () => {
      const result = canBypass(1);
      expect(result.allowed).toBe(true);
      expect(result.requiresToken).toBe(false);
    });

    it('should allow bypass at Level 2 without token', () => {
      const result = canBypass(2);
      expect(result.allowed).toBe(true);
      expect(result.requiresToken).toBe(false);
    });

    it('should allow bypass at Level 3 with token', () => {
      const result = canBypass(3);
      expect(result.allowed).toBe(true);
      expect(result.requiresToken).toBe(true);
    });

    it('should not allow bypass at Level 4', () => {
      const result = canBypass(4);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Level names', () => {
    it('should have correct names', () => {
      expect(GOVERNANCE_LEVEL_NAMES[1]).toBe('Tracking Only');
      expect(GOVERNANCE_LEVEL_NAMES[2]).toBe('Light Governance');
      expect(GOVERNANCE_LEVEL_NAMES[3]).toBe('Full Governance');
      expect(GOVERNANCE_LEVEL_NAMES[4]).toBe('Audit Mode');
    });
  });
});

describe('GovernanceEngine', () => {
  let classifier: HybridClassifier;

  beforeEach(() => {
    classifier = new HybridClassifier({ tier2Enabled: false });
  });

  describe('Level 1: Tracking Only', () => {
    it('should allow all requests', async () => {
      const engine = new GovernanceEngine({ level: 1 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);

      expect(decision.allowed).toBe(true);
      expect(decision.blockedBy).toHaveLength(0);
    });

    it('should allow even emergency requests', async () => {
      const engine = new GovernanceEngine({ level: 1 });
      const classification = await classifier.classify('URGENT: production is down');
      const decision = engine.evaluate(classification);

      expect(decision.allowed).toBe(true);
    });
  });

  describe('Level 2: Light Governance', () => {
    it('should allow Q&A without gates', async () => {
      const engine = new GovernanceEngine({ level: 2 });
      const classification = await classifier.classify('What is React?');
      const decision = engine.evaluate(classification);

      expect(decision.allowed).toBe(true);
    });

    it('should have advisories for code changes', async () => {
      const engine = new GovernanceEngine({ level: 2 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);

      // At Level 2, security and QA are advisory (non-blocking)
      expect(decision.allowed).toBe(true);
      expect(decision.advisories.length).toBeGreaterThan(0);
    });
  });

  describe('Level 3: Full Governance', () => {
    it('should block code changes that need security review', async () => {
      const engine = new GovernanceEngine({ level: 3 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);

      // At Level 3, security and QA are blocking
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy.length).toBeGreaterThan(0);
    });

    it('should offer override with token', async () => {
      const engine = new GovernanceEngine({ level: 3 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);

      expect(decision.overrideAvailable).toBe(true);
      expect(decision.overrideRequiresToken).toBe(true);
    });
  });

  describe('Level 4: Audit Mode', () => {
    it('should block everything that requires SDLC', async () => {
      const engine = new GovernanceEngine({ level: 4 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);

      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy.length).toBeGreaterThan(0);
    });

    it('should not allow override', async () => {
      const engine = new GovernanceEngine({ level: 4 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);

      expect(decision.overrideAvailable).toBe(false);
    });

    it('should still allow Q&A', async () => {
      const engine = new GovernanceEngine({ level: 4 });
      const classification = await classifier.classify('What is React?');
      const decision = engine.evaluate(classification);

      expect(decision.allowed).toBe(true);
    });
  });

  describe('Branch-level overrides', () => {
    it('should apply higher governance for protected branches', async () => {
      const engine = new GovernanceEngine({
        level: 2,
        branchOverrides: [
          { pattern: 'main', level: 3 },
          { pattern: 'production', level: 4 },
        ],
      });

      const classification = await classifier.classify('Add user authentication');

      // Feature branch: Level 2 (allowed)
      const featureDecision = engine.evaluate(classification, 'feature/auth');
      expect(featureDecision.allowed).toBe(true);

      // Main branch: Level 3 (blocked)
      const mainDecision = engine.evaluate(classification, 'main');
      expect(mainDecision.allowed).toBe(false);
      expect(mainDecision.level).toBe(3);
    });

    it('should support wildcard branch patterns', async () => {
      const engine = new GovernanceEngine({
        level: 2,
        branchOverrides: [
          { pattern: 'release/*', level: 3 },
        ],
      });

      const classification = await classifier.classify('Add user authentication');

      const releaseDecision = engine.evaluate(classification, 'release/v2.0');
      expect(releaseDecision.level).toBe(3);
    });
  });

  describe('Level management', () => {
    it('should get the current level', () => {
      const engine = new GovernanceEngine({ level: 3 });
      expect(engine.getLevel()).toBe(3);
    });

    it('should set the level', () => {
      const engine = new GovernanceEngine({ level: 2 });
      const change = engine.setLevel(3);
      expect(change.previous).toBe(2);
      expect(change.current).toBe(3);
      expect(engine.getLevel()).toBe(3);
    });

    it('should return correct level name', () => {
      const engine = new GovernanceEngine({ level: 2 });
      expect(engine.getLevelName()).toBe('Light Governance');
    });
  });

  describe('Statistics', () => {
    it('should track decision counts', async () => {
      const engine = new GovernanceEngine({ level: 2 });

      const qa = await classifier.classify('What is React?');
      const code = await classifier.classify('Add auth');

      engine.evaluate(qa);
      engine.evaluate(code);

      const stats = engine.getStats();
      expect(stats.totalDecisions).toBe(2);
    });
  });

  describe('formatDecision', () => {
    it('should format allowed decisions', async () => {
      const engine = new GovernanceEngine({ level: 1 });
      const classification = await classifier.classify('What is React?');
      const decision = engine.evaluate(classification);
      const formatted = engine.formatDecision(decision);

      expect(formatted).toContain('ALLOWED');
    });

    it('should format blocked decisions with remediation', async () => {
      const engine = new GovernanceEngine({ level: 3 });
      const classification = await classifier.classify('Add user authentication');
      const decision = engine.evaluate(classification);
      const formatted = engine.formatDecision(decision);

      expect(formatted).toContain('BLOCKED');
      expect(formatted).toContain('Level: 3');
    });
  });
});

describe('Policy: resolveGovernanceLevel', () => {
  it('should return base level when no overrides', () => {
    expect(resolveGovernanceLevel(2, 'main', [])).toBe(2);
  });

  it('should return base level when no branch', () => {
    expect(
      resolveGovernanceLevel(2, undefined, [{ pattern: 'main', level: 3 }]),
    ).toBe(2);
  });

  it('should apply override when branch matches', () => {
    expect(
      resolveGovernanceLevel(2, 'main', [{ pattern: 'main', level: 4 }]),
    ).toBe(4);
  });

  it('should apply wildcard override', () => {
    expect(
      resolveGovernanceLevel(2, 'release/v1.0', [
        { pattern: 'release/*', level: 3 },
      ]),
    ).toBe(3);
  });
});
