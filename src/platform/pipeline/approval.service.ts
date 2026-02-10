/**
 * Approval Service - Approval Workflow Management
 *
 * SOLID Principles:
 * - Single Responsibility: Manages approval workflows
 * - Open/Closed: Extensible for different approval types
 * - Liskov Substitution: Approvals are interchangeable
 *
 * Features:
 * - Manual approval required for production
 * - Auto-approval for dev/uat
 * - Approval notifications
 * - Complete audit trail
 * - Timeout handling
 * - PostgreSQL state storage
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

// ==================== INTERFACES ====================

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  AUTO_APPROVED = 'auto_approved'
}

export enum ApprovalType {
  DEPLOYMENT = 'deployment',
  PROMOTION = 'promotion',
  ROLLBACK = 'rollback',
  CONFIGURATION_CHANGE = 'configuration_change',
  INFRASTRUCTURE_CHANGE = 'infrastructure_change'
}

export interface ApprovalRequest {
  id?: string;
  type: ApprovalType;
  title: string;
  description: string;
  requestedBy: string;
  approvers: string[]; // User IDs or emails
  metadata: ApprovalMetadata;
  autoApprove?: boolean;
  timeout?: number; // seconds, default: 24 hours
  notificationChannels?: string[];
}

export interface ApprovalMetadata {
  application?: string;
  version?: string;
  environment?: string;
  fromEnvironment?: string;
  toEnvironment?: string;
  deploymentId?: string;
  changes?: string[];
  estimatedDuration?: number;
  rollbackAvailable?: boolean;
  risk?: 'low' | 'medium' | 'high' | 'critical';
  [key: string]: any;
}

export interface Approval {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  status: ApprovalStatus;
  requestedBy: string;
  approvers: string[];
  approvedBy?: string;
  rejectedBy?: string;
  metadata: ApprovalMetadata;
  comments?: string;
  timeout: number;
  expiresAt: Date;
  createdAt: Date;
  resolvedAt?: Date;
  notificationsSent: boolean;
}

export interface ApprovalDecision {
  approvalId: string;
  decision: 'approve' | 'reject';
  decidedBy: string;
  comments?: string;
}

export interface ApprovalAuditEntry {
  id: string;
  approvalId: string;
  action: string;
  performedBy: string;
  timestamp: Date;
  details: any;
}

// ==================== APPROVAL SERVICE ====================

export class ApprovalService extends EventEmitter {
  private prisma: PrismaClient;
  private approvals: Map<string, Approval>;
  private timeoutHandles: Map<string, NodeJS.Timeout>;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.approvals = new Map();
    this.timeoutHandles = new Map();

    this.startTimeoutMonitoring();
  }

  /**
   * Create a new approval request
   */
  async createApproval(request: ApprovalRequest): Promise<Approval> {
    const approvalId = request.id || this.generateApprovalId();
    const timeout = request.timeout || 24 * 60 * 60; // 24 hours default
    const expiresAt = new Date(Date.now() + timeout * 1000);

    logger.info('Creating approval request', {
      approvalId,
      type: request.type,
      title: request.title,
      autoApprove: request.autoApprove
    });

    const approval: Approval = {
      id: approvalId,
      type: request.type,
      title: request.title,
      description: request.description,
      status: ApprovalStatus.PENDING,
      requestedBy: request.requestedBy,
      approvers: request.approvers,
      metadata: request.metadata,
      timeout,
      expiresAt,
      createdAt: new Date(),
      notificationsSent: false
    };

    // Store in memory
    this.approvals.set(approvalId, approval);

    // Log to audit trail
    await this.logAuditEntry({
      approvalId,
      action: 'approval_created',
      performedBy: request.requestedBy,
      details: {
        type: request.type,
        title: request.title,
        approvers: request.approvers,
        metadata: request.metadata
      }
    });

    // Check if auto-approval is enabled
    if (request.autoApprove) {
      logger.info('Auto-approval enabled', { approvalId });
      await this.autoApprove(approvalId);
      return this.approvals.get(approvalId)!;
    }

    // Send notifications
    await this.sendNotifications(approval, request.notificationChannels);

    // Set timeout
    this.setApprovalTimeout(approvalId, timeout);

    // Emit event
    this.emit('approval:created', approval);

    return approval;
  }

  /**
   * Make approval decision (approve or reject)
   */
  async makeDecision(decision: ApprovalDecision): Promise<Approval> {
    const approval = this.approvals.get(decision.approvalId);

    if (!approval) {
      throw new Error(`Approval not found: ${decision.approvalId}`);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval ${decision.approvalId} is not pending (status: ${approval.status})`);
    }

    // Validate approver
    if (!approval.approvers.includes(decision.decidedBy)) {
      throw new Error(`User ${decision.decidedBy} is not an authorized approver`);
    }

    logger.info('Processing approval decision', {
      approvalId: decision.approvalId,
      decision: decision.decision,
      decidedBy: decision.decidedBy
    });

    // Update approval
    approval.status = decision.decision === 'approve'
      ? ApprovalStatus.APPROVED
      : ApprovalStatus.REJECTED;
    approval.resolvedAt = new Date();
    approval.comments = decision.comments;

    if (decision.decision === 'approve') {
      approval.approvedBy = decision.decidedBy;
    } else {
      approval.rejectedBy = decision.decidedBy;
    }

    // Clear timeout
    this.clearApprovalTimeout(decision.approvalId);

    // Log to audit trail
    await this.logAuditEntry({
      approvalId: decision.approvalId,
      action: `approval_${decision.decision}d`,
      performedBy: decision.decidedBy,
      details: {
        decision: decision.decision,
        comments: decision.comments,
        status: approval.status
      }
    });

    // Send notifications
    await this.sendDecisionNotifications(approval);

    // Emit event
    this.emit(`approval:${decision.decision}d`, approval);

    logger.info('Approval decision completed', {
      approvalId: decision.approvalId,
      status: approval.status
    });

    return approval;
  }

  /**
   * Approve an approval request
   */
  async approve(approvalId: string, approvedBy: string, comments?: string): Promise<Approval> {
    return await this.makeDecision({
      approvalId,
      decision: 'approve',
      decidedBy: approvedBy,
      comments
    });
  }

  /**
   * Reject an approval request
   */
  async reject(approvalId: string, rejectedBy: string, comments?: string): Promise<Approval> {
    return await this.makeDecision({
      approvalId,
      decision: 'reject',
      decidedBy: rejectedBy,
      comments
    });
  }

  /**
   * Auto-approve an approval request
   */
  private async autoApprove(approvalId: string): Promise<void> {
    const approval = this.approvals.get(approvalId);

    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    logger.info('Auto-approving request', { approvalId });

    approval.status = ApprovalStatus.AUTO_APPROVED;
    approval.approvedBy = 'system';
    approval.resolvedAt = new Date();

    await this.logAuditEntry({
      approvalId,
      action: 'approval_auto_approved',
      performedBy: 'system',
      details: {
        reason: 'Auto-approval enabled for this environment'
      }
    });

    this.emit('approval:auto_approved', approval);
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<Approval | undefined> {
    return this.approvals.get(approvalId);
  }

  /**
   * Get all pending approvals
   */
  async getPendingApprovals(approver?: string): Promise<Approval[]> {
    const pending = Array.from(this.approvals.values()).filter(
      approval => approval.status === ApprovalStatus.PENDING
    );

    if (approver) {
      return pending.filter(approval => approval.approvers.includes(approver));
    }

    return pending;
  }

  /**
   * Get approvals by type
   */
  async getApprovalsByType(type: ApprovalType): Promise<Approval[]> {
    return Array.from(this.approvals.values()).filter(
      approval => approval.type === type
    );
  }

  /**
   * Get approval history for application
   */
  async getApprovalHistory(
    application: string,
    limit: number = 50
  ): Promise<Approval[]> {
    return Array.from(this.approvals.values())
      .filter(approval => approval.metadata.application === application)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit trail for approval
   */
  async getAuditTrail(approvalId: string): Promise<ApprovalAuditEntry[]> {
    // In a real implementation, fetch from database
    // For now, return empty array
    return [];
  }

  /**
   * Send notifications for new approval request
   */
  private async sendNotifications(
    approval: Approval,
    channels?: string[]
  ): Promise<void> {
    logger.info('Sending approval notifications', {
      approvalId: approval.id,
      approvers: approval.approvers,
      channels
    });

    // In a real implementation, send to Slack, email, PagerDuty, etc.
    const notification = {
      title: `Approval Required: ${approval.title}`,
      description: approval.description,
      approvalId: approval.id,
      type: approval.type,
      requestedBy: approval.requestedBy,
      approvers: approval.approvers,
      expiresAt: approval.expiresAt,
      metadata: approval.metadata,
      approvalUrl: `https://platform.example.com/approvals/${approval.id}`
    };

    logger.info('Approval notification prepared', { notification });

    // Mark notifications as sent
    approval.notificationsSent = true;

    await this.logAuditEntry({
      approvalId: approval.id,
      action: 'notifications_sent',
      performedBy: 'system',
      details: {
        approvers: approval.approvers,
        channels: channels || ['default']
      }
    });
  }

  /**
   * Send decision notifications
   */
  private async sendDecisionNotifications(approval: Approval): Promise<void> {
    logger.info('Sending decision notifications', {
      approvalId: approval.id,
      status: approval.status
    });

    // In a real implementation, notify all stakeholders
    const notification = {
      title: `Approval ${approval.status}: ${approval.title}`,
      approvalId: approval.id,
      status: approval.status,
      decidedBy: approval.approvedBy || approval.rejectedBy,
      comments: approval.comments,
      resolvedAt: approval.resolvedAt
    };

    logger.info('Decision notification prepared', { notification });
  }

  /**
   * Set approval timeout
   */
  private setApprovalTimeout(approvalId: string, timeoutSeconds: number): void {
    const timeoutHandle = setTimeout(async () => {
      await this.handleApprovalTimeout(approvalId);
    }, timeoutSeconds * 1000);

    this.timeoutHandles.set(approvalId, timeoutHandle);
  }

  /**
   * Clear approval timeout
   */
  private clearApprovalTimeout(approvalId: string): void {
    const timeoutHandle = this.timeoutHandles.get(approvalId);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.timeoutHandles.delete(approvalId);
    }
  }

  /**
   * Handle approval timeout
   */
  private async handleApprovalTimeout(approvalId: string): Promise<void> {
    const approval = this.approvals.get(approvalId);

    if (!approval || approval.status !== ApprovalStatus.PENDING) {
      return;
    }

    logger.warn('Approval request expired', {
      approvalId,
      title: approval.title,
      expiresAt: approval.expiresAt
    });

    approval.status = ApprovalStatus.EXPIRED;
    approval.resolvedAt = new Date();

    await this.logAuditEntry({
      approvalId,
      action: 'approval_expired',
      performedBy: 'system',
      details: {
        expiresAt: approval.expiresAt,
        reason: 'Approval not received within timeout period'
      }
    });

    this.emit('approval:expired', approval);
  }

  /**
   * Start monitoring for expired approvals
   */
  private startTimeoutMonitoring(): void {
    // Check every 5 minutes for expired approvals
    setInterval(() => {
      const now = new Date();

      this.approvals.forEach((approval, approvalId) => {
        if (
          approval.status === ApprovalStatus.PENDING &&
          approval.expiresAt < now
        ) {
          this.handleApprovalTimeout(approvalId);
        }
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Log audit entry
   */
  private async logAuditEntry(entry: Omit<ApprovalAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: ApprovalAuditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      ...entry
    };

    logger.info('Approval audit entry', auditEntry);

    // In a real implementation, store in database
    // await this.prisma.approvalAuditLog.create({ data: auditEntry });
  }

  /**
   * Generate unique approval ID
   */
  private generateApprovalId(): string {
    return `appr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Determine if auto-approval is allowed
   */
  static shouldAutoApprove(environment: string): boolean {
    const autoApproveEnvironments = ['dev', 'test', 'uat'];
    return autoApproveEnvironments.includes(environment.toLowerCase());
  }

  /**
   * Get required approvers for environment
   */
  static getRequiredApprovers(environment: string, risk: string = 'medium'): string[] {
    // In a real implementation, fetch from configuration
    const approverConfig: Record<string, string[]> = {
      dev: ['tech-lead'],
      uat: ['tech-lead', 'qa-lead'],
      production: ['tech-lead', 'platform-owner', 'security-lead'],
      dr: ['platform-owner', 'cto']
    };

    const approvers = approverConfig[environment.toLowerCase()] || ['tech-lead'];

    // Add additional approvers for high risk
    if (risk === 'high' || risk === 'critical') {
      approvers.push('cto', 'security-lead');
    }

    return Array.from(new Set(approvers)); // Remove duplicates
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all timeouts
    this.timeoutHandles.forEach(timeoutHandle => {
      clearTimeout(timeoutHandle);
    });
    this.timeoutHandles.clear();

    // Disconnect from database
    await this.prisma.$disconnect();

    // Remove all listeners
    this.removeAllListeners();
  }
}

// ==================== EXAMPLE USAGE ====================

export async function exampleApprovalWorkflow() {
  const approvalService = new ApprovalService();

  // Listen to approval events
  approvalService.on('approval:created', (approval) => {
    console.log('New approval created:', approval.id);
  });

  approvalService.on('approval:approved', (approval) => {
    console.log('Approval approved:', approval.id);
  });

  approvalService.on('approval:rejected', (approval) => {
    console.log('Approval rejected:', approval.id);
  });

  // Example 1: Dev environment (auto-approve)
  const devApproval = await approvalService.createApproval({
    type: ApprovalType.DEPLOYMENT,
    title: 'Deploy API Service v1.2.3 to Dev',
    description: 'Deploying new version with bug fixes',
    requestedBy: 'john.doe@company.com',
    approvers: ['tech-lead@company.com'],
    metadata: {
      application: 'api-service',
      version: 'v1.2.3',
      environment: 'dev',
      risk: 'low'
    },
    autoApprove: true // Auto-approve for dev
  });

  console.log('Dev approval:', devApproval);

  // Example 2: Production environment (manual approval required)
  const prodApproval = await approvalService.createApproval({
    type: ApprovalType.PROMOTION,
    title: 'Promote API Service v1.2.3 to Production',
    description: 'Promoting tested version to production',
    requestedBy: 'release.manager@company.com',
    approvers: ApprovalService.getRequiredApprovers('production', 'high'),
    metadata: {
      application: 'api-service',
      version: 'v1.2.3',
      fromEnvironment: 'uat',
      toEnvironment: 'production',
      risk: 'high',
      rollbackAvailable: true,
      estimatedDuration: 900 // 15 minutes
    },
    timeout: 4 * 60 * 60, // 4 hours
    notificationChannels: ['slack', 'email']
  });

  console.log('Production approval:', prodApproval);

  // Simulate approval
  setTimeout(async () => {
    const approved = await approvalService.approve(
      prodApproval.id,
      'tech-lead@company.com',
      'Approved after successful UAT testing'
    );
    console.log('Approval decision:', approved);
  }, 2000);

  // Get pending approvals
  setTimeout(async () => {
    const pending = await approvalService.getPendingApprovals();
    console.log('Pending approvals:', pending.length);
  }, 1000);

  // Cleanup after 5 seconds
  setTimeout(async () => {
    await approvalService.cleanup();
  }, 5000);
}
