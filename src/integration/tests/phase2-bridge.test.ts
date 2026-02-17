/**
 * Phase 2 Bridge and Executor Tests
 *
 * Tests the hook-MCP bridge and workflow executor.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HookMCPBridge, resetBridge } from '../bridge/hook-mcp-bridge';
import { WorkflowExecutor } from '../executor/workflow-executor';
import { ProgressTracker } from '../executor/progress-tracker';
import { HybridClassifier } from '../classifier';
import { SmartRouter } from '../router';

// Test directories
const TEST_BRIDGE_DIR = path.join(os.tmpdir(), 'aisdlc-test-bridge-' + Date.now());
const TEST_WORKFLOW_DIR = path.join(os.tmpdir(), 'aisdlc-test-workflows-' + Date.now());
const TEST_EVENTS_DIR = path.join(os.tmpdir(), 'aisdlc-test-events-' + Date.now());

// --- Bridge Tests ---

describe('HookMCPBridge', () => {
  let bridge: HookMCPBridge;

  beforeEach(() => {
    resetBridge();
    bridge = new HookMCPBridge(TEST_BRIDGE_DIR);
  });

  afterAll(() => {
    try {
      fs.rmSync(TEST_BRIDGE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should store and retrieve classifications', () => {
    const shared = {
      messageHash: 'test-hash-1',
      classification: {} as any,
      route: {} as any,
      governance: {} as any,
      timestamp: new Date().toISOString(),
      ttl: 300000,
    };

    bridge.storeClassification(shared);
    const retrieved = bridge.getClassification('test-hash-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.messageHash).toBe('test-hash-1');
  });

  it('should return null for expired cache entries', () => {
    const shared = {
      messageHash: 'test-hash-expired',
      classification: {} as any,
      route: {} as any,
      governance: {} as any,
      timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      ttl: 300000, // 5 min TTL
    };

    bridge.storeClassification(shared);
    const retrieved = bridge.getClassification('test-hash-expired');
    expect(retrieved).toBeNull();
  });

  it('should return null for missing cache entries', () => {
    const retrieved = bridge.getClassification('nonexistent');
    expect(retrieved).toBeNull();
  });

  it('should send and read messages', () => {
    bridge.sendMessage({
      id: 'msg-1',
      timestamp: new Date().toISOString(),
      source: 'hook',
      type: 'classification',
      payload: { test: true },
    });

    const messages = bridge.readMessages('mcp');
    expect(messages.length).toBe(1);
    expect(messages[0].id).toBe('msg-1');
    expect(messages[0].source).toBe('hook');
  });

  it('should acknowledge (delete) messages', () => {
    bridge.sendMessage({
      id: 'msg-to-delete',
      timestamp: new Date().toISOString(),
      source: 'hook',
      type: 'classification',
      payload: {},
    });

    bridge.acknowledgeMessage('msg-to-delete');
    const messages = bridge.readMessages('mcp');
    expect(messages.find(m => m.id === 'msg-to-delete')).toBeUndefined();
  });

  it('should report bridge statistics', () => {
    const stats = bridge.getStats();
    expect(stats.bridgeDir).toBe(TEST_BRIDGE_DIR);
    expect(stats.cachedClassifications).toBeGreaterThanOrEqual(0);
    expect(stats.pendingMessages).toBeGreaterThanOrEqual(0);
  });

  it('should clean up expired cache entries', () => {
    // Store an expired entry
    const shared = {
      messageHash: 'test-cleanup',
      classification: {} as any,
      route: {} as any,
      governance: {} as any,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      ttl: 300000,
    };
    bridge.storeClassification(shared);

    const cleaned = bridge.cleanupCache();
    expect(cleaned).toBeGreaterThanOrEqual(1);
  });
});

// --- Workflow Executor Tests ---

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;
  const classifier = new HybridClassifier({ tier1Enabled: true, tier2Enabled: false });
  const router = new SmartRouter();

  beforeEach(() => {
    executor = new WorkflowExecutor(TEST_WORKFLOW_DIR);
  });

  afterAll(() => {
    try {
      fs.rmSync(TEST_WORKFLOW_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create a workflow', async () => {
    const classification = await classifier.classify('Add user authentication');
    const route = router.route(classification, 2);

    const workflow = executor.createWorkflow(
      'Add user authentication',
      classification,
      route,
      2,
    );

    expect(workflow.id).toMatch(/^SDLC-/);
    expect(workflow.status).toBe('pending');
    expect(workflow.phases.length).toBeGreaterThan(0);
    expect(workflow.description).toBe('Add user authentication');
  });

  it('should start a workflow', async () => {
    const classification = await classifier.classify('Build a search feature');
    const route = router.route(classification, 2);
    const workflow = executor.createWorkflow('Build a search feature', classification, route, 2);

    const started = executor.startWorkflow(workflow.id);
    expect(started).not.toBeNull();
    expect(started!.status).toBe('in-progress');
    expect(started!.startedAt).not.toBeNull();
  });

  it('should track phase execution', async () => {
    const classification = await classifier.classify('Add file upload capability');
    const route = router.route(classification, 2);
    const workflow = executor.createWorkflow('Add file upload', classification, route, 2);

    executor.startWorkflow(workflow.id);

    // Start first phase
    const firstPhase = workflow.phases[0].phase;
    executor.startPhase(workflow.id, firstPhase);

    const afterStart = executor.getWorkflow(workflow.id)!;
    expect(afterStart.phases[0].status).toBe('in-progress');

    // Complete first phase
    executor.completePhase(workflow.id, firstPhase, 'Phase completed successfully');

    const afterComplete = executor.getWorkflow(workflow.id)!;
    expect(afterComplete.phases[0].status).toBe('completed');
    expect(afterComplete.phases[0].output).toBe('Phase completed successfully');
  });

  it('should mark workflow as blocked when a phase fails', async () => {
    const classification = await classifier.classify('Create a new API endpoint');
    const route = router.route(classification, 2);
    const workflow = executor.createWorkflow('Create API', classification, route, 2);

    executor.startWorkflow(workflow.id);
    const firstPhase = workflow.phases[0].phase;
    executor.failPhase(workflow.id, firstPhase, 'Build failed');

    const afterFail = executor.getWorkflow(workflow.id)!;
    expect(afterFail.status).toBe('blocked');
    expect(afterFail.phases[0].error).toBe('Build failed');
  });

  it('should list workflows', async () => {
    const workflows = executor.listWorkflows();
    expect(workflows).toBeInstanceOf(Array);
  });

  it('should get next pending phase', async () => {
    const classification = await classifier.classify('Add dashboard component');
    const route = router.route(classification, 2);
    const workflow = executor.createWorkflow('Add dashboard', classification, route, 2);

    const nextPhase = executor.getNextPhase(workflow.id);
    expect(nextPhase).not.toBeNull();
    expect(nextPhase!.status).toBe('pending');
  });

  it('should format workflow status for display', async () => {
    const classification = await classifier.classify('Build notification system');
    const route = router.route(classification, 2);
    const workflow = executor.createWorkflow('Build notifications', classification, route, 2);

    const formatted = executor.formatWorkflowStatus(workflow);
    expect(formatted).toContain('Workflow:');
    expect(formatted).toContain(workflow.id);
    expect(formatted).toContain('Phases:');
  });

  it('should return null for non-existent workflow', () => {
    const workflow = executor.getWorkflow('SDLC-NONEXISTENT');
    expect(workflow).toBeNull();
  });
});

// --- Progress Tracker Tests ---

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker(TEST_EVENTS_DIR);
  });

  afterAll(() => {
    try {
      fs.rmSync(TEST_EVENTS_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should record progress events', () => {
    tracker.recordEvent({
      timestamp: new Date().toISOString(),
      workflowId: 'SDLC-TEST',
      type: 'phase-start',
      phase: 'implementation',
      agent: 'engineer',
      message: 'Starting implementation',
      progress: 0.2,
    });

    const events = tracker.getWorkflowEvents('SDLC-TEST');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].workflowId).toBe('SDLC-TEST');
  });

  it('should compute workflow progress', () => {
    const workflow = {
      phases: [
        { phase: 'implementation' as any, status: 'completed' as any, agent: 'engineer' as any, startedAt: null, completedAt: null, output: null, error: null },
        { phase: 'security' as any, status: 'in-progress' as any, agent: 'security' as any, startedAt: null, completedAt: null, output: null, error: null },
        { phase: 'testing' as any, status: 'pending' as any, agent: 'qa' as any, startedAt: null, completedAt: null, output: null, error: null },
      ],
    } as any;

    const progress = tracker.calculateProgress(workflow);
    expect(progress).toBeCloseTo(1 / 3, 2);
  });

  it('should compute aggregate statistics', () => {
    const workflows = [
      {
        status: 'completed',
        createdAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date().toISOString(),
        phases: [
          { phase: 'implementation', status: 'completed' },
          { phase: 'testing', status: 'completed' },
        ],
      },
    ] as any[];

    const stats = tracker.computeStats(workflows);
    expect(stats.totalWorkflows).toBe(1);
    expect(stats.completedToday).toBe(1);
  });
});
