/**
 * Policy Enforcer
 *
 * Orchestrates governance decisions by combining the governance engine,
 * approval workflows, and bypass tokens into a unified enforcement system.
 *
 * Part of Phase 3: Enhanced Governance Engine.
 * See ADR-042 for governance level design.
 *
 * @module governance/policy-enforcer
 */

import { RequestClassification } from '../classifier/types';
import { GovernanceEngine } from './GovernanceEngine';
import {
  GovernanceDecision,
  GovernanceLevel,
  BranchGovernanceOverride,
} from './types';
import { ApprovalWorkflow, ApprovalRequest } from './approval-workflow';
import { BypassTokenManager, TokenValidationResult } from './bypass-token-manager';

/**
 * Result of policy enforcement.
 */
export interface EnforcementResult {
  /** Whether the request is allowed to proceed */
  allowed: boolean;
  /** The raw governance decision */
  governanceDecision: GovernanceDecision;
  /** Whether approval was required */
  requiresApproval: boolean;
  /** The approval request (if created or found) */
  approvalRequest: ApprovalRequest | null;
  /** Whether a bypass token was used */
  bypassTokenUsed: boolean;
  /** Token validation result (if bypass was attempted) */
  tokenValidation: TokenValidationResult | null;
  /** Human-readable summary of the enforcement result */
  summary: string;
  /** Timestamp of the enforcement */
  timestamp: string;
}

/**
 * Input for policy enforcement.
 */
export interface EnforcementInput {
  /** The request classification */
  classification: RequestClassification;
  /** The current git branch */
  branch?: string;
  /** A bypass token (if provided) */
  bypassToken?: string;
  /** An existing approval request ID (if resuming after approval) */
  approvalRequestId?: string;
  /** The requester ID for approval workflows */
  requesterId?: string;
}

/**
 * Configuration for the policy enforcer.
 */
export interface PolicyEnforcerConfig {
  /** Base governance level */
  level?: GovernanceLevel;
  /** Branch-level governance overrides */
  branchOverrides?: BranchGovernanceOverride[];
  /** Bypass token secret (for Level 3) */
  bypassSecret?: string;
  /** Authorized approvers for the approval workflow */
  authorizedApprovers?: string[];
  /** Whether to auto-create approval requests when blocked */
  autoCreateApproval?: boolean;
}

/**
 * PolicyEnforcer unifies governance evaluation, approval workflows,
 * and bypass token validation into a single enforcement decision.
 *
 * Enforcement flow:
 * 1. Evaluate governance gates
 * 2. If blocked and bypass token provided, validate token
 * 3. If blocked and approval request exists, check approval status
 * 4. If blocked and auto-create enabled, create approval request
 * 5. Return unified enforcement result
 */
export class PolicyEnforcer {
  private readonly engine: GovernanceEngine;
  private readonly approvalWorkflow: ApprovalWorkflow;
  private readonly bypassTokenManager: BypassTokenManager | null;
  private readonly autoCreateApproval: boolean;

  constructor(config: PolicyEnforcerConfig = {}) {
    this.engine = new GovernanceEngine({
      level: config.level ?? 2,
      branchOverrides: config.branchOverrides ?? [],
    });

    this.approvalWorkflow = new ApprovalWorkflow({
      authorizedApprovers: config.authorizedApprovers ?? [],
    });

    // Bypass token manager is only created if a secret is available
    let tokenManager: BypassTokenManager | null = null;
    const secret = config.bypassSecret ?? process.env.AISDLC_BYPASS_SECRET;
    if (secret && secret.length >= 32) {
      try {
        tokenManager = new BypassTokenManager(secret);
      } catch {
        tokenManager = null;
      }
    }
    this.bypassTokenManager = tokenManager;

    this.autoCreateApproval = config.autoCreateApproval ?? true;
  }

  /**
   * Enforce governance policy for a classified request.
   *
   * @param input - Enforcement input
   * @returns The enforcement result
   */
  enforce(input: EnforcementInput): EnforcementResult {
    const now = new Date().toISOString();

    // Step 1: Evaluate governance
    const decision = this.engine.evaluate(input.classification, input.branch);

    // If allowed by governance, return immediately
    if (decision.allowed) {
      return {
        allowed: true,
        governanceDecision: decision,
        requiresApproval: false,
        approvalRequest: null,
        bypassTokenUsed: false,
        tokenValidation: null,
        summary: `Governance Level ${decision.level}: All gates passed`,
        timestamp: now,
      };
    }

    // Step 2: If blocked, try bypass token (Level 3)
    if (input.bypassToken && this.bypassTokenManager) {
      const tokenResult = this.bypassTokenManager.validateToken(
        input.bypassToken,
        input.classification.id,
      );

      if (tokenResult.valid) {
        return {
          allowed: true,
          governanceDecision: decision,
          requiresApproval: false,
          approvalRequest: null,
          bypassTokenUsed: true,
          tokenValidation: tokenResult,
          summary: `Governance bypassed with valid token. Reason: ${tokenResult.data?.reason ?? 'unknown'}`,
          timestamp: now,
        };
      }

      // Token was provided but invalid -- include reason
      return {
        allowed: false,
        governanceDecision: decision,
        requiresApproval: true,
        approvalRequest: null,
        bypassTokenUsed: false,
        tokenValidation: tokenResult,
        summary: `Governance BLOCKED. Bypass token invalid: ${tokenResult.reason}`,
        timestamp: now,
      };
    }

    // Step 3: If blocked, check for existing approved approval request
    if (input.approvalRequestId) {
      try {
        const approvalRequest = this.approvalWorkflow.getRequest(input.approvalRequestId);

        if (approvalRequest.status === 'approved') {
          return {
            allowed: true,
            governanceDecision: decision,
            requiresApproval: false,
            approvalRequest,
            bypassTokenUsed: false,
            tokenValidation: null,
            summary: `Governance bypassed with approved request. Approved by: ${approvalRequest.approvedBy}`,
            timestamp: now,
          };
        }

        if (approvalRequest.status === 'rejected') {
          return {
            allowed: false,
            governanceDecision: decision,
            requiresApproval: false,
            approvalRequest,
            bypassTokenUsed: false,
            tokenValidation: null,
            summary: `Approval request rejected by ${approvalRequest.rejectedBy}: ${approvalRequest.rejectionReason}`,
            timestamp: now,
          };
        }

        // Still pending
        return {
          allowed: false,
          governanceDecision: decision,
          requiresApproval: true,
          approvalRequest,
          bypassTokenUsed: false,
          tokenValidation: null,
          summary: `Waiting for approval. Request: ${approvalRequest.id}`,
          timestamp: now,
        };
      } catch {
        // Approval request not found, fall through
      }
    }

    // Step 4: Auto-create approval request if configured
    let approvalRequest: ApprovalRequest | null = null;
    if (this.autoCreateApproval && decision.level >= 3) {
      approvalRequest = this.approvalWorkflow.requestApproval({
        workflowId: input.classification.id,
        requestType: input.classification.type,
        branch: input.branch ?? 'unknown',
        changes: [input.classification.userMessage],
        requesterId: input.requesterId,
        blockedGates: decision.blockedBy,
        governanceLevel: decision.level,
      });
    }

    // Build summary
    const blockedGates = decision.blockedBy.join(', ');
    const overrideInfo = decision.overrideRequiresToken
      ? ' Provide a bypass token or request approval.'
      : decision.overrideAvailable
        ? ' You may override with a reason.'
        : ' This level does not allow bypasses.';

    return {
      allowed: false,
      governanceDecision: decision,
      requiresApproval: decision.level >= 3,
      approvalRequest,
      bypassTokenUsed: false,
      tokenValidation: null,
      summary: `Governance BLOCKED by: ${blockedGates}.${overrideInfo}`,
      timestamp: now,
    };
  }

  /**
   * Get the underlying governance engine.
   */
  getGovernanceEngine(): GovernanceEngine {
    return this.engine;
  }

  /**
   * Get the underlying approval workflow.
   */
  getApprovalWorkflow(): ApprovalWorkflow {
    return this.approvalWorkflow;
  }

  /**
   * Get the underlying bypass token manager (may be null if no secret configured).
   */
  getBypassTokenManager(): BypassTokenManager | null {
    return this.bypassTokenManager;
  }

  /**
   * Format an enforcement result for display.
   */
  formatResult(result: EnforcementResult): string {
    const lines: string[] = [];

    if (result.allowed) {
      lines.push(`[AI-SDLC Governance] ALLOWED`);
      if (result.bypassTokenUsed) {
        lines.push(`  Method: Bypass token`);
        lines.push(`  Reason: ${result.tokenValidation?.data?.reason ?? 'N/A'}`);
      } else if (result.approvalRequest) {
        lines.push(`  Method: Approved request`);
        lines.push(`  Approved by: ${result.approvalRequest.approvedBy}`);
      }
    } else {
      lines.push(`[AI-SDLC Governance] BLOCKED`);
      lines.push(`  Level: ${result.governanceDecision.level}`);
      lines.push(`  Blocked by: ${result.governanceDecision.blockedBy.join(', ')}`);

      if (result.approvalRequest) {
        lines.push('');
        lines.push(`  Approval request created: ${result.approvalRequest.id}`);
        lines.push(`  Status: ${result.approvalRequest.status}`);
      }

      if (result.tokenValidation && !result.tokenValidation.valid) {
        lines.push('');
        lines.push(`  Token validation failed: ${result.tokenValidation.reason}`);
      }
    }

    return lines.join('\n');
  }
}
