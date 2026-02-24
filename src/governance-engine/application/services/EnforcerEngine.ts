/**
 * Enforcer Engine
 * @module @vintiq/governance-engine/application/services/EnforcerEngine
 */

import { v4 as uuidv4 } from 'uuid';
import { Policy } from '../../types/policy.types';
import {
  Violation,
  ViolationSeverity,
  ValidationWarning,
} from '../../types/validation.types';
import {
  EnforcementResult,
  BypassRequest,
  AuditLogEntry,
} from '../../types/enforcement.types';
import { RuleEvaluator } from '../../domain/services/RuleEvaluator';

/**
 * Engine for making and executing enforcement decisions
 */
export class EnforcerEngine {
  private readonly ruleEvaluator: RuleEvaluator;

  constructor() {
    this.ruleEvaluator = new RuleEvaluator();
  }

  /**
   * Enforce policy decisions on violations
   */
  async enforce(
    violations: Violation[],
    policy: Policy,
    options: {
      bypass?: BypassRequest;
      repository: string;
      branch: string;
      user?: string;
      dryRun?: boolean;
      minBlockingSeverity?: ViolationSeverity;
    }
  ): Promise<EnforcementResult> {
    const { bypass, repository, branch, user, dryRun, minBlockingSeverity } = options;

    // Categorize violations
    const blocking = violations.filter((v) =>
      this.shouldBlock(v, policy, minBlockingSeverity)
    );
    const nonBlocking = violations.filter(
      (v) => !this.shouldBlock(v, policy, minBlockingSeverity)
    );

    // Convert non-blocking to warnings
    const warnings: ValidationWarning[] = nonBlocking.map((v) => ({
      policy: policy.name,
      rule: v.rule,
      message: v.message,
      suggestion: v.remediation,
      location: v.location,
    }));

    // Handle bypass request
    if (bypass && blocking.length > 0) {
      const canBypass = await this.validateBypass(bypass, blocking, policy);
      if (canBypass) {
        // Log bypass for audit
        await this.logAudit({
          action: 'bypass',
          violations: blocking,
          bypass,
          repository,
          branch,
          user,
          policy,
        });

        return {
          allowed: true,
          bypassed: true,
          bypassReason: bypass.reason,
          violations: blocking,
          warnings,
          timestamp: new Date(),
          auditId: uuidv4(),
        };
      }
    }

    // Dry run mode - report but don't block
    if (dryRun && blocking.length > 0) {
      return {
        allowed: true,
        bypassed: false,
        violations: [],
        warnings: [
          ...warnings,
          ...blocking.map((v) => ({
            policy: policy.name,
            rule: v.rule,
            message: `[DRY RUN] Would block: ${v.message}`,
            suggestion: v.remediation,
            location: v.location,
          })),
        ],
        timestamp: new Date(),
        auditId: uuidv4(),
      };
    }

    // Log the decision
    await this.logAudit({
      action: blocking.length > 0 ? 'block' : 'allow',
      violations: blocking,
      warnings,
      repository,
      branch,
      user,
      policy,
    });

    return {
      allowed: blocking.length === 0,
      bypassed: false,
      violations: blocking,
      warnings,
      timestamp: new Date(),
      auditId: uuidv4(),
    };
  }

  /**
   * Determine if a violation should block
   */
  private shouldBlock(
    violation: Violation,
    policy: Policy,
    minBlockingSeverity?: ViolationSeverity
  ): boolean {
    // Check severity threshold
    if (minBlockingSeverity) {
      const severityOrder: ViolationSeverity[] = [
        'info',
        'low',
        'medium',
        'high',
        'critical',
      ];
      const violationIndex = severityOrder.indexOf(violation.severity);
      const minIndex = severityOrder.indexOf(minBlockingSeverity);
      if (violationIndex < minIndex) {
        return false;
      }
    }

    // Use rule evaluator to determine if should block
    return this.ruleEvaluator.shouldBlock(violation, policy);
  }

  /**
   * Validate a bypass request
   */
  private async validateBypass(
    bypass: BypassRequest,
    violations: Violation[],
    policy: Policy
  ): Promise<boolean> {
    // Check if bypass is allowed in policy
    if (!policy.metadata?.override?.allowed) {
      console.warn('Bypass not allowed by policy');
      return false;
    }

    // Validate reason is provided
    if (!bypass.reason || bypass.reason.length < 10) {
      console.warn('Bypass reason too short (minimum 10 characters)');
      return false;
    }

    // Check if bypass token is required
    if (
      policy.metadata.override.requiresApprovalFrom &&
      policy.metadata.override.requiresApprovalFrom.length > 0
    ) {
      // Would need to validate against approval system
      // For now, just require a token
      if (!bypass.token) {
        console.warn('Bypass token required');
        return false;
      }
    }

    // Check expiration
    if (bypass.expiresAt && new Date(bypass.expiresAt) < new Date()) {
      console.warn('Bypass has expired');
      return false;
    }

    return true;
  }

  /**
   * Log enforcement decision for audit
   */
  private async logAudit(params: {
    action: 'block' | 'allow' | 'bypass' | 'warn';
    violations: Violation[];
    warnings?: ValidationWarning[];
    bypass?: BypassRequest;
    repository: string;
    branch: string;
    user?: string;
    policy: Policy;
  }): Promise<void> {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      action: params.action,
      repository: params.repository,
      branch: params.branch,
      user: params.user,
      files: params.violations.map((v) => v.location?.file).filter(Boolean) as string[],
      policiesApplied: [params.policy.name],
      violations: params.violations.map((v) => ({
        rule: v.rule,
        severity: v.severity,
        message: v.message,
        file: v.location?.file,
        line: v.location?.line,
      })),
      warnings: params.warnings || [],
      bypass: params.bypass
        ? {
            reason: params.bypass.reason,
            token: params.bypass.token,
            approvedBy: params.bypass.requestedBy,
            violationCount: params.violations.length,
          }
        : undefined,
      duration: 0,
    };

    // Log to console in structured format
    const logEntry = {
      '@timestamp': entry.timestamp.toISOString(),
      'event.action': entry.action,
      'event.outcome': entry.action === 'block' ? 'failure' : 'success',
      'governance.policy': params.policy.name,
      'governance.violations': entry.violations.length,
      'governance.bypass': !!params.bypass,
      'source.repository': entry.repository,
      'source.branch': entry.branch,
      'user.name': entry.user || 'anonymous',
    };

    // Only log if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(logEntry));
    }
  }
}
