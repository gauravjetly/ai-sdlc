/**
 * Phase 3: Enhanced Governance Tests
 *
 * Tests for approval workflows, bypass tokens (HMAC-SHA256),
 * and the unified policy enforcer.
 */

import { ApprovalWorkflow, ApprovalRequest } from '../governance/approval-workflow';
import { BypassTokenManager } from '../governance/bypass-token-manager';
import { PolicyEnforcer } from '../governance/policy-enforcer';
import { HybridClassifier } from '../classifier/HybridClassifier';

// Test secret must be >= 32 characters
const TEST_SECRET = 'test-bypass-secret-that-is-at-least-32-chars-long!!';

describe('Phase 3: Approval Workflows', () => {
  let workflow: ApprovalWorkflow;

  beforeEach(() => {
    workflow = new ApprovalWorkflow({
      authorizedApprovers: ['admin', 'lead'],
      allowSelfApproval: false,
    });
  });

  describe('requestApproval', () => {
    it('should create a pending approval request', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['Add authentication'],
        requesterId: 'dev1',
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.workflowId).toBe('WF-001');
      expect(request.requestType).toBe('code-change');
      expect(request.branch).toBe('main');
      expect(request.changes).toEqual(['Add authentication']);
      expect(request.requesterId).toBe('dev1');
      expect(request.approvedBy).toBeNull();
      expect(request.rejectedBy).toBeNull();
    });

    it('should emit approval_requested event', () => {
      const events: string[] = [];
      workflow.on((event) => events.push(event.type));

      workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
      });

      expect(events).toContain('approval_requested');
    });

    it('should set expiration time', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        expiresIn: 60000, // 1 minute
      });

      const expiresAt = new Date(request.expiresAt);
      const createdAt = new Date(request.createdAt);
      const diff = expiresAt.getTime() - createdAt.getTime();

      expect(diff).toBeGreaterThanOrEqual(59000);
      expect(diff).toBeLessThanOrEqual(61000);
    });
  });

  describe('approve', () => {
    it('should approve a pending request', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      const approved = workflow.approve(request.id, 'admin');

      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('admin');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should prevent self-approval', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'admin',
      });

      expect(() => workflow.approve(request.id, 'admin')).toThrow('Self-approval');
    });

    it('should prevent unauthorized approvers', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      expect(() => workflow.approve(request.id, 'random-user')).toThrow('not an authorized approver');
    });

    it('should not approve already approved requests', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      workflow.approve(request.id, 'admin');

      expect(() => workflow.approve(request.id, 'lead')).toThrow("'approved'");
    });

    it('should emit approval_approved event', () => {
      const events: string[] = [];
      workflow.on((event) => events.push(event.type));

      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      workflow.approve(request.id, 'admin');

      expect(events).toContain('approval_approved');
    });
  });

  describe('reject', () => {
    it('should reject a pending request with reason', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      const rejected = workflow.reject(request.id, 'admin', 'Needs more tests');

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectedBy).toBe('admin');
      expect(rejected.rejectionReason).toBe('Needs more tests');
    });

    it('should require a rejection reason', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      expect(() => workflow.reject(request.id, 'admin', '')).toThrow('Rejection reason is required');
    });
  });

  describe('getPendingRequests', () => {
    it('should return only pending requests', () => {
      workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test1'],
        requesterId: 'dev1',
      });

      const req2 = workflow.requestApproval({
        workflowId: 'WF-002',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test2'],
        requesterId: 'dev1',
      });

      workflow.approve(req2.id, 'admin');

      const pending = workflow.getPendingRequests();
      expect(pending.length).toBe(1);
      expect(pending[0].workflowId).toBe('WF-001');
    });
  });

  describe('isWorkflowApproved', () => {
    it('should return true when workflow has approved request', () => {
      const request = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      expect(workflow.isWorkflowApproved('WF-001')).toBe(false);
      workflow.approve(request.id, 'admin');
      expect(workflow.isWorkflowApproved('WF-001')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should track approval statistics', () => {
      const req1 = workflow.requestApproval({
        workflowId: 'WF-001',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      const req2 = workflow.requestApproval({
        workflowId: 'WF-002',
        requestType: 'code-change',
        branch: 'main',
        changes: ['test'],
        requesterId: 'dev1',
      });

      workflow.approve(req1.id, 'admin');
      workflow.reject(req2.id, 'lead', 'Not ready');

      const stats = workflow.getStats();
      expect(stats.total).toBe(2);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.approvalRate).toBe(0.5);
    });
  });
});

describe('Phase 3: Bypass Token Manager (HMAC-SHA256)', () => {
  let tokenManager: BypassTokenManager;

  beforeEach(() => {
    tokenManager = new BypassTokenManager(TEST_SECRET);
  });

  describe('constructor', () => {
    it('should require a secret of at least 32 characters', () => {
      expect(() => new BypassTokenManager('short')).toThrow('at least 32 characters');
    });

    it('should accept a valid secret', () => {
      const manager = new BypassTokenManager(TEST_SECRET);
      expect(manager).toBeDefined();
    });
  });

  describe('generateToken', () => {
    it('should generate a hex-encoded HMAC-SHA256 token', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Emergency hotfix',
      });

      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should require a workflow ID', () => {
      expect(() =>
        tokenManager.generateToken({
          workflowId: '',
          reason: 'test',
        }),
      ).toThrow('workflowId is required');
    });

    it('should require a reason', () => {
      expect(() =>
        tokenManager.generateToken({
          workflowId: 'WF-001',
          reason: '',
        }),
      ).toThrow('reason is required');
    });

    it('should generate unique tokens for different requests', () => {
      const token1 = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Emergency hotfix 1',
      });

      const token2 = tokenManager.generateToken({
        workflowId: 'WF-002',
        reason: 'Emergency hotfix 2',
      });

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateToken', () => {
    it('should validate a fresh token', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Emergency hotfix',
      });

      const result = tokenManager.validateToken(token, 'WF-001');

      expect(result.valid).toBe(true);
      expect(result.data?.workflowId).toBe('WF-001');
      expect(result.data?.reason).toBe('Emergency hotfix');
    });

    it('should enforce single-use (consume token after first validation)', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Emergency hotfix',
      });

      // First use: valid
      const result1 = tokenManager.validateToken(token, 'WF-001');
      expect(result1.valid).toBe(true);

      // Second use: invalid (already consumed)
      const result2 = tokenManager.validateToken(token, 'WF-001');
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain('single-use');
    });

    it('should reject tokens for wrong workflow', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Emergency hotfix',
      });

      const result = tokenManager.validateToken(token, 'WF-002');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('WF-001');
    });

    it('should reject expired tokens', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Emergency hotfix',
        expiresIn: -1000, // Already expired
      });

      const result = tokenManager.validateToken(token, 'WF-001');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should reject unknown tokens', () => {
      const result = tokenManager.validateToken('invalid-token', 'WF-001');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should validate gate scope', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'Bypass security only',
        gates: ['security-review'],
      });

      // Should validate for covered gate
      const result1 = tokenManager.validateToken(token, 'WF-001', 'security-review');
      expect(result1.valid).toBe(true);

      // Generate another token to test uncovered gate
      const token2 = tokenManager.generateToken({
        workflowId: 'WF-002',
        reason: 'Bypass security only',
        gates: ['security-review'],
      });

      const result2 = tokenManager.validateToken(token2, 'WF-002', 'qa-testing');
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain('does not cover gate');
    });
  });

  describe('isTokenValid', () => {
    it('should check validity without consuming', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'test',
      });

      // Check without consuming
      expect(tokenManager.isTokenValid(token, 'WF-001')).toBe(true);

      // Should still be valid (not consumed)
      expect(tokenManager.isTokenValid(token, 'WF-001')).toBe(true);
    });
  });

  describe('revokeToken', () => {
    it('should revoke an unused token', () => {
      const token = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'test',
      });

      expect(tokenManager.revokeToken(token)).toBe(true);

      // Token should now be invalid
      const result = tokenManager.validateToken(token, 'WF-001');
      expect(result.valid).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should track token statistics', () => {
      const token1 = tokenManager.generateToken({
        workflowId: 'WF-001',
        reason: 'test1',
      });

      tokenManager.generateToken({
        workflowId: 'WF-002',
        reason: 'test2',
      });

      tokenManager.validateToken(token1, 'WF-001'); // Use token1

      const stats = tokenManager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.used).toBe(1);
      expect(stats.unused).toBe(1);
    });
  });
});

describe('Phase 3: Policy Enforcer', () => {
  let classifier: HybridClassifier;

  beforeEach(() => {
    classifier = new HybridClassifier({ tier2Enabled: false });
  });

  describe('Level 1 & 2: No approval required', () => {
    it('should allow requests at Level 1', async () => {
      const enforcer = new PolicyEnforcer({ level: 1 });
      const classification = await classifier.classify('Add authentication');

      const result = enforcer.enforce({ classification });

      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should allow requests at Level 2 with advisories', async () => {
      const enforcer = new PolicyEnforcer({ level: 2 });
      const classification = await classifier.classify('Add authentication');

      const result = enforcer.enforce({ classification });

      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe('Level 3: Blocking with bypass/approval', () => {
    it('should block code changes at Level 3', async () => {
      const enforcer = new PolicyEnforcer({
        level: 3,
        bypassSecret: TEST_SECRET,
        autoCreateApproval: false,
      });
      const classification = await classifier.classify('Add authentication');

      const result = enforcer.enforce({ classification, branch: 'main' });

      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it('should allow bypass with valid token at Level 3', async () => {
      const enforcer = new PolicyEnforcer({
        level: 3,
        bypassSecret: TEST_SECRET,
      });
      const classification = await classifier.classify('Add authentication');

      // Generate bypass token
      const tokenManager = enforcer.getBypassTokenManager()!;
      const token = tokenManager.generateToken({
        workflowId: classification.id,
        reason: 'Emergency production fix',
      });

      const result = enforcer.enforce({
        classification,
        branch: 'main',
        bypassToken: token,
      });

      expect(result.allowed).toBe(true);
      expect(result.bypassTokenUsed).toBe(true);
    });

    it('should auto-create approval request when blocked at Level 3', async () => {
      const enforcer = new PolicyEnforcer({
        level: 3,
        bypassSecret: TEST_SECRET,
        autoCreateApproval: true,
      });
      const classification = await classifier.classify('Add authentication');

      const result = enforcer.enforce({ classification, branch: 'main' });

      expect(result.allowed).toBe(false);
      expect(result.approvalRequest).not.toBeNull();
      expect(result.approvalRequest!.status).toBe('pending');
    });

    it('should allow after approval request is approved', async () => {
      const enforcer = new PolicyEnforcer({
        level: 3,
        bypassSecret: TEST_SECRET,
        autoCreateApproval: true,
        authorizedApprovers: ['admin'],
      });
      const classification = await classifier.classify('Add authentication');

      // First enforcement creates approval request
      const result1 = enforcer.enforce({
        classification,
        branch: 'main',
        requesterId: 'dev1',
      });
      expect(result1.allowed).toBe(false);
      const approvalId = result1.approvalRequest!.id;

      // Admin approves
      const approvalWorkflow = enforcer.getApprovalWorkflow();
      approvalWorkflow.approve(approvalId, 'admin');

      // Second enforcement with approval ID should pass
      const result2 = enforcer.enforce({
        classification,
        branch: 'main',
        approvalRequestId: approvalId,
      });

      expect(result2.allowed).toBe(true);
      expect(result2.approvalRequest!.status).toBe('approved');
    });
  });

  describe('Level 4: No bypass allowed', () => {
    it('should block without override option at Level 4', async () => {
      const enforcer = new PolicyEnforcer({
        level: 4,
        bypassSecret: TEST_SECRET,
      });
      const classification = await classifier.classify('Add authentication');

      const result = enforcer.enforce({ classification, branch: 'production' });

      expect(result.allowed).toBe(false);
      expect(result.governanceDecision.overrideAvailable).toBe(false);
    });
  });

  describe('Q&A passthrough', () => {
    it('should allow Q&A at all levels', async () => {
      for (const level of [1, 2, 3, 4] as const) {
        const enforcer = new PolicyEnforcer({ level, bypassSecret: TEST_SECRET });
        const classification = await classifier.classify('What is React?');

        const result = enforcer.enforce({ classification });

        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('formatResult', () => {
    it('should format allowed result', async () => {
      const enforcer = new PolicyEnforcer({ level: 1 });
      const classification = await classifier.classify('What is React?');
      const result = enforcer.enforce({ classification });

      const formatted = enforcer.formatResult(result);
      expect(formatted).toContain('ALLOWED');
    });

    it('should format blocked result', async () => {
      const enforcer = new PolicyEnforcer({
        level: 3,
        bypassSecret: TEST_SECRET,
        autoCreateApproval: false,
      });
      const classification = await classifier.classify('Add authentication');
      const result = enforcer.enforce({ classification });

      const formatted = enforcer.formatResult(result);
      expect(formatted).toContain('BLOCKED');
      expect(formatted).toContain('Level: 3');
    });
  });
});
