/**
 * Approval Workflow System
 *
 * Manages approval requests for Level 3+ governance.
 * When a governance gate blocks a request, an approval workflow
 * is created that must be approved or rejected by an authorized approver.
 *
 * Part of Phase 3: Enhanced Governance Engine.
 * See ADR-042 for governance level design.
 *
 * @module governance/approval-workflow
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Status of an approval request.
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

/**
 * An approval request created when governance blocks a workflow.
 */
export interface ApprovalRequest {
  /** Unique identifier for this approval request */
  id: string;
  /** The workflow that triggered the approval request */
  workflowId: string;
  /** Type of change being approved */
  requestType: string;
  /** Branch where the change is being made */
  branch: string;
  /** Description of changes requiring approval */
  changes: string[];
  /** Who requested the approval */
  requesterId: string;
  /** Current status */
  status: ApprovalStatus;
  /** Who approved (if approved) */
  approvedBy: string | null;
  /** When approved */
  approvedAt: string | null;
  /** Who rejected (if rejected) */
  rejectedBy: string | null;
  /** When rejected */
  rejectedAt: string | null;
  /** Reason for rejection */
  rejectionReason: string | null;
  /** Gates that require approval */
  blockedGates: string[];
  /** Governance level that triggered the approval */
  governanceLevel: number;
  /** When the approval request was created */
  createdAt: string;
  /** When the approval request expires */
  expiresAt: string;
}

/**
 * Input for creating an approval request.
 */
export interface ApprovalRequestInput {
  workflowId: string;
  requestType: string;
  branch: string;
  changes: string[];
  requesterId?: string;
  blockedGates?: string[];
  governanceLevel?: number;
  /** Expiration time in milliseconds from now. Default: 24 hours */
  expiresIn?: number;
}

/**
 * Listener for approval workflow events.
 */
export type ApprovalEventListener = (event: ApprovalEvent) => void;

/**
 * Events emitted by the approval workflow system.
 */
export interface ApprovalEvent {
  type: 'approval_requested' | 'approval_approved' | 'approval_rejected' | 'approval_expired' | 'approval_cancelled';
  request: ApprovalRequest;
  timestamp: string;
}

/**
 * Configuration for approval workflow.
 */
export interface ApprovalWorkflowConfig {
  /** Default expiration time in milliseconds. Default: 24 hours */
  defaultExpirationMs?: number;
  /** List of authorized approver IDs */
  authorizedApprovers?: string[];
  /** Whether to allow self-approval. Default: false */
  allowSelfApproval?: boolean;
}

const DEFAULT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * ApprovalWorkflow manages the creation, approval, and rejection
 * of approval requests for governance-blocked workflows.
 */
export class ApprovalWorkflow {
  private readonly requests: Map<string, ApprovalRequest> = new Map();
  private readonly workflowIndex: Map<string, string[]> = new Map();
  private readonly listeners: ApprovalEventListener[] = [];
  private readonly config: Required<ApprovalWorkflowConfig>;

  constructor(config: ApprovalWorkflowConfig = {}) {
    this.config = {
      defaultExpirationMs: config.defaultExpirationMs ?? DEFAULT_EXPIRATION_MS,
      authorizedApprovers: config.authorizedApprovers ?? [],
      allowSelfApproval: config.allowSelfApproval ?? false,
    };
  }

  /**
   * Create a new approval request.
   *
   * @param input - The approval request details
   * @returns The created approval request
   */
  requestApproval(input: ApprovalRequestInput): ApprovalRequest {
    const id = uuidv4();
    const now = new Date();
    const expiresIn = input.expiresIn ?? this.config.defaultExpirationMs;

    const request: ApprovalRequest = {
      id,
      workflowId: input.workflowId,
      requestType: input.requestType,
      branch: input.branch,
      changes: input.changes,
      requesterId: input.requesterId ?? 'unknown',
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      blockedGates: input.blockedGates ?? [],
      governanceLevel: input.governanceLevel ?? 3,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + expiresIn).toISOString(),
    };

    this.requests.set(id, request);

    // Index by workflow ID for fast lookup
    const existing = this.workflowIndex.get(input.workflowId) ?? [];
    existing.push(id);
    this.workflowIndex.set(input.workflowId, existing);

    this.emit({
      type: 'approval_requested',
      request,
      timestamp: now.toISOString(),
    });

    return request;
  }

  /**
   * Approve a pending approval request.
   *
   * @param requestId - The approval request ID
   * @param approverId - The ID of the approver
   * @throws Error if request not found, not pending, expired, or approver not authorized
   */
  approve(requestId: string, approverId: string): ApprovalRequest {
    const request = this.getRequest(requestId);

    this.validateRequestForAction(request, approverId);

    request.status = 'approved';
    request.approvedBy = approverId;
    request.approvedAt = new Date().toISOString();

    this.emit({
      type: 'approval_approved',
      request,
      timestamp: request.approvedAt,
    });

    return request;
  }

  /**
   * Reject a pending approval request.
   *
   * @param requestId - The approval request ID
   * @param rejectorId - The ID of the rejector
   * @param reason - The reason for rejection
   * @throws Error if request not found, not pending, or expired
   */
  reject(requestId: string, rejectorId: string, reason: string): ApprovalRequest {
    const request = this.getRequest(requestId);

    this.validateRequestForAction(request, rejectorId);

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    request.status = 'rejected';
    request.rejectedBy = rejectorId;
    request.rejectedAt = new Date().toISOString();
    request.rejectionReason = reason;

    this.emit({
      type: 'approval_rejected',
      request,
      timestamp: request.rejectedAt,
    });

    return request;
  }

  /**
   * Cancel a pending approval request.
   *
   * @param requestId - The approval request ID
   * @throws Error if request not found or not pending
   */
  cancel(requestId: string): ApprovalRequest {
    const request = this.getRequest(requestId);

    if (request.status !== 'pending') {
      throw new Error(`Cannot cancel request in '${request.status}' status`);
    }

    request.status = 'cancelled';

    this.emit({
      type: 'approval_cancelled',
      request,
      timestamp: new Date().toISOString(),
    });

    return request;
  }

  /**
   * Get an approval request by ID.
   *
   * @param requestId - The approval request ID
   * @returns The approval request
   * @throws Error if not found
   */
  getRequest(requestId: string): ApprovalRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request '${requestId}' not found`);
    }
    return request;
  }

  /**
   * Get all approval requests for a workflow.
   *
   * @param workflowId - The workflow ID
   * @returns Array of approval requests
   */
  getRequestsForWorkflow(workflowId: string): ApprovalRequest[] {
    const ids = this.workflowIndex.get(workflowId) ?? [];
    return ids.map((id) => this.requests.get(id)!).filter(Boolean);
  }

  /**
   * Get all pending approval requests.
   *
   * @returns Array of pending approval requests
   */
  getPendingRequests(): ApprovalRequest[] {
    const pending: ApprovalRequest[] = [];
    const now = new Date();

    for (const request of this.requests.values()) {
      if (request.status === 'pending') {
        // Check expiration
        if (new Date(request.expiresAt) <= now) {
          request.status = 'expired';
          this.emit({
            type: 'approval_expired',
            request,
            timestamp: now.toISOString(),
          });
        } else {
          pending.push(request);
        }
      }
    }

    return pending;
  }

  /**
   * Check if a workflow has an approved request.
   *
   * @param workflowId - The workflow ID
   * @returns True if the workflow has at least one approved request
   */
  isWorkflowApproved(workflowId: string): boolean {
    const requests = this.getRequestsForWorkflow(workflowId);
    return requests.some((r) => r.status === 'approved');
  }

  /**
   * Register an event listener.
   *
   * @param listener - The listener function
   */
  on(listener: ApprovalEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener.
   *
   * @param listener - The listener function to remove
   */
  off(listener: ApprovalEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get approval workflow statistics.
   */
  getStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    cancelled: number;
    approvalRate: number;
  } {
    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let expired = 0;
    let cancelled = 0;

    for (const request of this.requests.values()) {
      total++;
      switch (request.status) {
        case 'pending':
          pending++;
          break;
        case 'approved':
          approved++;
          break;
        case 'rejected':
          rejected++;
          break;
        case 'expired':
          expired++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    }

    const decided = approved + rejected;
    const approvalRate = decided > 0 ? approved / decided : 0;

    return { total, pending, approved, rejected, expired, cancelled, approvalRate };
  }

  /**
   * Validate a request can be acted upon.
   */
  private validateRequestForAction(request: ApprovalRequest, actorId: string): void {
    if (request.status !== 'pending') {
      throw new Error(`Cannot act on request in '${request.status}' status`);
    }

    // Check expiration
    if (new Date(request.expiresAt) <= new Date()) {
      request.status = 'expired';
      throw new Error('Approval request has expired');
    }

    // Check self-approval
    if (!this.config.allowSelfApproval && actorId === request.requesterId) {
      throw new Error('Self-approval is not allowed');
    }

    // Check authorized approvers (if configured)
    if (this.config.authorizedApprovers.length > 0) {
      if (!this.config.authorizedApprovers.includes(actorId)) {
        throw new Error(`'${actorId}' is not an authorized approver`);
      }
    }
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: ApprovalEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors should not break the workflow
      }
    }
  }
}
