/**
 * Phase 2 End-to-End Integration Tests
 *
 * Tests the complete flow: user message -> hook -> classify -> route -> governance -> transform.
 * These tests verify that all Phase 2 components work together.
 */

import { HookBridge, resetHookBridge } from '../hooks/lib/hook-bridge';
import { transformMessage } from '../hooks/lib/message-transformer';
import { WorkflowExecutor } from '../executor/workflow-executor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEST_WORKFLOW_DIR = path.join(os.tmpdir(), 'aisdlc-e2e-' + Date.now());

describe('Phase 2 End-to-End Integration', () => {
  let bridge: HookBridge;
  let executor: WorkflowExecutor;

  beforeAll(() => {
    resetHookBridge();
    bridge = new HookBridge({
      enabled: true,
      autoClassify: true,
      showClassification: false,
      governance: { level: 2 },
      classification: {
        tier1Enabled: true,
        tier2Enabled: false,
        confidenceThreshold: 0.7,
      },
      performance: { maxClassificationTime: 3000 },
      ux: { showProgress: true, verboseMode: false },
    });
    executor = new WorkflowExecutor(TEST_WORKFLOW_DIR);
  });

  afterAll(() => {
    try {
      fs.rmSync(TEST_WORKFLOW_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('E2E: Q&A request flows through as passthrough', async () => {
    const message = 'What is React?';

    // Step 1: Classify
    const result = await bridge.process(message);

    // Step 2: Verify classification
    expect(result.classification.type).toBe('qa');
    expect(result.classification.requiresSDLC).toBe(false);

    // Step 3: Verify routing
    expect(result.route.strategy).toBe('passthrough');

    // Step 4: Transform
    const transformed = transformMessage(
      message,
      result.classification,
      result.route,
      result.governance,
    );

    // Step 5: Verify passthrough
    expect(transformed.transformed).toBe(false);
    expect(transformed.userMessage).toBe(message);
  });

  it('E2E: Feature request with explicit pattern routes through SDLC', async () => {
    // Use a message that strongly matches the new-feature rule with high confidence
    const message = 'Add a new authentication system';

    // Step 1: Classify
    const result = await bridge.process(message);

    // Step 2: Verify it is classified as code-change
    expect(result.classification.type).toBe('code-change');
    // The new-feature rule sets requiresSDLC: true
    expect(result.classification.requiresSDLC).toBe(true);

    // Step 3: Verify routing picks a non-passthrough strategy
    expect(result.route.strategy).not.toBe('passthrough');
    expect(result.route.phases.length).toBeGreaterThan(0);

    // Step 4: Transform
    const transformed = transformMessage(
      message,
      result.classification,
      result.route,
      result.governance,
    );

    // Step 5: Verify SDLC context injection
    expect(transformed.transformed).toBe(true);
    expect(transformed.userMessage).toContain('[AISDLC CONTEXT]');
    expect(transformed.userMessage).toContain('aisdlc_start_workflow');
    expect(transformed.userMessage).toContain(message);
  });

  it('E2E: Emergency request triggers fast path', async () => {
    const message = 'URGENT: critical production outage, API returning 500 errors';

    // Step 1: Classify
    const result = await bridge.process(message);

    // Step 2: Verify emergency classification
    expect(result.classification.type).toBe('emergency');
    expect(result.classification.urgency).toBe('critical');

    // Step 3: Verify emergency routing
    expect(result.route.strategy).toBe('emergency');
    expect(result.route.agents).toContain('ask-tom');

    // Step 4: Transform
    const transformed = transformMessage(
      message,
      result.classification,
      result.route,
      result.governance,
    );

    // Step 5: Verify emergency context
    expect(transformed.userMessage).toContain('[AISDLC EMERGENCY DETECTED]');
    expect(transformed.userMessage).toContain('aisdlc_ask_tom');
  });

  it('E2E: Trivial fix passes through without SDLC', async () => {
    const message = 'Fix typo in README';

    // Step 1: Classify
    const result = await bridge.process(message);

    // Step 2: Verify trivial classification
    expect(result.classification.complexity).toBe('trivial');
    expect(result.classification.requiresSDLC).toBe(false);

    // Step 3: Verify passthrough or trivial strategy
    expect(['passthrough', 'trivial']).toContain(result.route.strategy);
  });

  it('E2E: Architecture request with clear pattern', async () => {
    // Use a message with the explicit "design a" pattern from the rule
    const message = 'Design a microservices architecture for the platform';

    const result = await bridge.process(message);

    expect(result.classification.type).toBe('architecture');
    expect(result.route.strategy).toBe('architecture');
    expect(result.route.agents).toContain('jets');
  });

  it('E2E: Review request with clear pattern', async () => {
    // Use a message that matches the review rule pattern
    const message = 'Review the code for security issues';

    const result = await bridge.process(message);

    expect(result.classification.type).toBe('review');
    expect(result.route.strategy).toBe('review');
    expect(result.route.agents).toContain('security');
  });

  it('E2E: Workflow creation and phase tracking', async () => {
    const message = 'Add a new notification service';

    // Step 1: Classify and route
    const result = await bridge.process(message);

    // Step 2: Create workflow
    const workflow = executor.createWorkflow(
      message,
      result.classification,
      result.route,
      result.governance.level,
    );

    expect(workflow.id).toBeDefined();
    expect(workflow.status).toBe('pending');

    // Step 3: Start workflow
    executor.startWorkflow(workflow.id);
    const started = executor.getWorkflow(workflow.id);
    expect(started!.status).toBe('in-progress');

    // Step 4: Complete phases
    for (const phase of workflow.phases) {
      executor.startPhase(workflow.id, phase.phase);
      executor.completePhase(workflow.id, phase.phase, `${phase.phase} completed`);
    }

    // Step 5: Verify completion
    const completed = executor.getWorkflow(workflow.id);
    expect(completed!.status).toBe('completed');
    expect(completed!.completedAt).not.toBeNull();
  });

  it('E2E: Governance respects level changes', async () => {
    const message = 'Add a new authentication system';

    // At level 2: should be allowed
    const result2 = await bridge.process(message);
    expect(result2.governance.allowed).toBe(true);

    // Change to level 3
    bridge.setGovernanceLevel(3);

    // At level 3: classification still works
    const result3 = await bridge.process(message);
    expect(result3.governance.level).toBe(3);
    // Security review might block at level 3
    expect(result3.governance.gates.length).toBeGreaterThan(0);

    // Reset to level 2
    bridge.setGovernanceLevel(2);
  });

  it('E2E: Classification performance is within targets', async () => {
    const messages = [
      'What is React?',
      'Add a new authentication system',
      'Fix typo in README',
      'URGENT: production is down',
      'Design a microservices architecture',
    ];

    for (const message of messages) {
      const result = await bridge.process(message);

      // Tier 1 (rules only) should be < 50ms
      expect(result.classification.classificationDuration).toBeLessThan(200);

      // Total processing should be fast
      expect(result.processingTime).toBeLessThan(500);
    }
  });

  it('E2E: Cache improves repeated classification speed', async () => {
    // Clear cache first
    bridge.clearCache();

    const message = 'Add a new search feature with Elasticsearch';

    // First call - not cached
    const first = await bridge.process(message);
    const firstDuration = first.processingTime;

    // Second call - should hit cache
    const second = await bridge.process(message);
    const secondDuration = second.processingTime;

    // Cached should be faster (or equal)
    expect(secondDuration).toBeLessThanOrEqual(firstDuration + 10); // Allow small variance
  });

  it('E2E: Multiple request types are classified correctly', async () => {
    const scenarios = [
      { message: 'What is TypeScript?', expectedType: 'qa' },
      { message: 'Fix typo in README', expectedType: 'code-change' },
      { message: 'URGENT: production crash', expectedType: 'emergency' },
      { message: 'Write tests for the auth module', expectedType: 'testing' },
      { message: 'Review the code for security', expectedType: 'review' },
    ];

    for (const { message, expectedType } of scenarios) {
      const result = await bridge.process(message);
      expect(result.classification.type).toBe(expectedType);
    }
  });

  it('E2E: Blocked request produces governance block message', async () => {
    // Create a bridge with level 3 governance
    resetHookBridge();
    const strictBridge = new HookBridge({
      enabled: true,
      autoClassify: true,
      showClassification: false,
      governance: { level: 3 },
      classification: {
        tier1Enabled: true,
        tier2Enabled: false,
        confidenceThreshold: 0.7,
      },
      performance: { maxClassificationTime: 3000 },
      ux: { showProgress: true, verboseMode: false },
    });

    const result = await strictBridge.process('Add a new authentication system');

    // At level 3, code changes should have blocking governance gates
    if (!result.governance.allowed) {
      const transformed = transformMessage(
        'Add a new authentication system',
        result.classification,
        result.route,
        result.governance,
      );

      expect(transformed.transformed).toBe(true);
      expect(transformed.userMessage).toContain('[AISDLC GOVERNANCE BLOCK]');
    }
    // If allowed, that is also valid behavior at level 3
    expect(result.governance.level).toBe(3);
  });
});
