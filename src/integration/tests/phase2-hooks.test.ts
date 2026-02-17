/**
 * Phase 2 Hook System Tests
 *
 * Tests the hook bridge, message transformer, and config loader
 * that form the hook interception layer.
 */

import { HookBridge, resetHookBridge } from '../hooks/lib/hook-bridge';
import {
  transformMessage,
  createPassthroughResult,
} from '../hooks/lib/message-transformer';
import {
  loadHookConfig,
  clearConfigCache,
} from '../hooks/lib/config-loader';
import { RequestClassification } from '../classifier/types';
import { RoutingDecision } from '../router/types';
import { GovernanceDecision } from '../governance/types';

// --- Config Loader Tests ---

describe('Config Loader', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  it('should return default config when no files exist', () => {
    const config = loadHookConfig();
    expect(config.enabled).toBe(true);
    expect(config.autoClassify).toBe(true);
    expect(config.governance.level).toBe(2);
  });

  it('should respect environment variable kill switch', () => {
    process.env.AISDLC_ENABLED = 'false';
    clearConfigCache();
    const config = loadHookConfig();
    expect(config.enabled).toBe(false);
    delete process.env.AISDLC_ENABLED;
  });

  it('should respect governance level from environment', () => {
    process.env.AISDLC_GOVERNANCE_LEVEL = '3';
    clearConfigCache();
    const config = loadHookConfig();
    expect(config.governance.level).toBe(3);
    delete process.env.AISDLC_GOVERNANCE_LEVEL;
  });

  it('should cache config for subsequent calls', () => {
    const config1 = loadHookConfig();
    const config2 = loadHookConfig();
    expect(config1).toBe(config2); // Same reference due to caching
  });
});

// --- Hook Bridge Tests ---

describe('HookBridge', () => {
  let bridge: HookBridge;

  beforeEach(() => {
    resetHookBridge();
    bridge = new HookBridge({
      enabled: true,
      autoClassify: true,
      showClassification: false,
      governance: { level: 2 },
      classification: {
        tier1Enabled: true,
        tier2Enabled: false, // Disable LLM for testing
        confidenceThreshold: 0.7,
      },
      performance: { maxClassificationTime: 3000 },
      ux: { showProgress: true, verboseMode: false },
    });
  });

  it('should classify a simple Q&A as passthrough', async () => {
    const result = await bridge.process('What is React?');
    expect(result.classification.type).toBe('qa');
    expect(result.classification.requiresSDLC).toBe(false);
    expect(result.shouldRoute).toBe(false);
  });

  it('should classify a feature request as code-change requiring SDLC', async () => {
    const result = await bridge.process('Add authentication with OAuth 2.0');
    expect(result.classification.type).toBe('code-change');
    expect(result.classification.requiresSDLC).toBe(true);
    expect(result.route.strategy).not.toBe('passthrough');
  });

  it('should classify an emergency with critical urgency', async () => {
    const result = await bridge.process('URGENT: production database is down');
    expect(result.classification.urgency).toBe('critical');
    expect(result.route.strategy).toBe('emergency');
  });

  it('should classify a trivial fix as not requiring SDLC', async () => {
    const result = await bridge.process('Fix typo in README');
    expect(result.classification.complexity).toBe('trivial');
    expect(result.classification.requiresSDLC).toBe(false);
  });

  it('should return processing time', async () => {
    const result = await bridge.process('What is React?');
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
    expect(result.processingTime).toBeLessThan(1000); // Should be fast for rules
  });

  it('should provide combined statistics', () => {
    const stats = bridge.getStats();
    expect(stats.classifier).toBeDefined();
    expect(stats.router).toBeDefined();
    expect(stats.governance).toBeDefined();
  });

  it('should allow changing governance level', () => {
    const result = bridge.setGovernanceLevel(3);
    expect(result.previous).toBe(2);
    expect(result.current).toBe(3);
    expect(bridge.getGovernanceLevel()).toBe(3);
  });
});

// --- Message Transformer Tests ---

describe('Message Transformer', () => {
  const baseClassification: RequestClassification = {
    id: 'test-1',
    timestamp: new Date().toISOString(),
    userMessage: 'Add authentication',
    messageHash: 'abc123',
    type: 'code-change',
    complexity: 'medium',
    urgency: 'normal',
    confidence: 0.9,
    requiresSDLC: true,
    requiredPhases: ['implementation', 'security', 'testing'],
    optionalPhases: ['tracking'],
    estimatedDuration: '15 minutes',
    estimatedTokens: 15000,
    detectedTechnologies: ['TypeScript'],
    affectedFiles: [],
    gitContext: { branch: 'main', hasUncommittedChanges: false, isProtectedBranch: true },
    classifierUsed: 'rules',
    classificationDuration: 5,
    rulesMatched: ['new-feature'],
  };

  const passthroughRoute: RoutingDecision = {
    strategy: 'passthrough',
    phases: [],
    agents: [],
    governanceLevel: 2,
    sdlcCommand: null,
    contextInjection: '',
    estimatedDuration: '5 seconds',
    blocking: false,
    parallel: false,
  };

  const sdlcRoute: RoutingDecision = {
    strategy: 'feature',
    phases: ['implementation', 'security', 'testing'],
    agents: ['engineer', 'security', 'qa'],
    governanceLevel: 2,
    sdlcCommand: '/sdlc-start',
    contextInjection: '',
    estimatedDuration: '15 minutes',
    blocking: false,
    parallel: false,
  };

  const allowedGovernance: GovernanceDecision = {
    allowed: true,
    level: 2,
    gates: [],
    overrideAvailable: false,
    overrideRequiresToken: false,
    blockedBy: [],
    advisories: [],
    auditEntry: {
      id: 'audit-1',
      timestamp: new Date().toISOString(),
      level: 2,
      classificationId: 'test-1',
      allowed: true,
      gatesEvaluated: [],
      gatesBlocked: [],
      overrideUsed: false,
    },
  };

  const blockedGovernance: GovernanceDecision = {
    ...allowedGovernance,
    allowed: false,
    blockedBy: ['security-review'],
    gates: [{
      gate: 'security-review',
      passed: false,
      blocking: true,
      severity: 'error',
      message: 'Security review required',
      remediation: 'Complete security review before proceeding',
    }],
    overrideAvailable: true,
    overrideRequiresToken: true,
  };

  it('should not transform passthrough messages', () => {
    const qaClassification = { ...baseClassification, type: 'qa' as const, requiresSDLC: false };
    const result = transformMessage('What is React?', qaClassification, passthroughRoute);
    expect(result.transformed).toBe(false);
    expect(result.userMessage).toBe('What is React?');
  });

  it('should inject SDLC context for routed messages', () => {
    const result = transformMessage('Add authentication', baseClassification, sdlcRoute, allowedGovernance);
    expect(result.transformed).toBe(true);
    expect(result.userMessage).toContain('[AISDLC CONTEXT]');
    expect(result.userMessage).toContain('code-change');
    expect(result.userMessage).toContain('aisdlc_start_workflow');
    expect(result.userMessage).toContain('Add authentication');
  });

  it('should format blocked messages with governance info', () => {
    const result = transformMessage('Deploy to production', baseClassification, sdlcRoute, blockedGovernance);
    expect(result.transformed).toBe(true);
    expect(result.userMessage).toContain('[AISDLC GOVERNANCE BLOCK]');
    expect(result.userMessage).toContain('security-review');
    expect(result.userMessage).toContain('Remediation');
  });

  it('should handle emergency routing', () => {
    const emergencyRoute: RoutingDecision = {
      ...sdlcRoute,
      strategy: 'emergency',
      agents: ['ask-tom', 'engineer'],
    };
    const emergencyClassification = {
      ...baseClassification,
      type: 'emergency' as const,
      urgency: 'critical' as const,
    };
    const result = transformMessage('URGENT: API down', emergencyClassification, emergencyRoute, allowedGovernance);
    expect(result.userMessage).toContain('[AISDLC EMERGENCY DETECTED]');
    expect(result.userMessage).toContain('aisdlc_ask_tom');
  });

  it('should create passthrough result', () => {
    const result = createPassthroughResult('hello');
    expect(result.transformed).toBe(false);
    expect(result.userMessage).toBe('hello');
    expect(result.metadata).toEqual({});
  });
});
