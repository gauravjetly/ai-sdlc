/**
 * Enforcement-related type definitions
 * @module @vintiq/governance-engine/types/enforcement
 */

import { Violation, ViolationSeverity, ValidationWarning, ValidationResult } from './validation.types';
import { EnforcementLevel } from './policy.types';

/**
 * Enforcement action type
 */
export type EnforcementAction = 'block' | 'warn' | 'allow' | 'bypass';

/**
 * Result of enforcement decision
 */
export interface EnforcementResult {
  /** Whether the action is allowed to proceed */
  readonly allowed: boolean;
  /** Whether bypass was used */
  readonly bypassed: boolean;
  /** Bypass reason if provided */
  readonly bypassReason?: string;
  /** Blocking violations */
  readonly violations: Violation[];
  /** Non-blocking warnings */
  readonly warnings: ValidationWarning[];
  /** Enforcement decision timestamp */
  readonly timestamp: Date;
  /** Decision audit ID */
  readonly auditId?: string;
}

/**
 * Governance operation result
 */
export interface GovernanceResult {
  /** Whether all checks passed */
  readonly passed: boolean;
  /** Blocking violations */
  readonly violations: Violation[];
  /** Non-blocking warnings */
  readonly warnings: ValidationWarning[];
  /** Whether bypass was used */
  readonly bypassed: boolean;
  /** Bypass details */
  readonly bypassDetails?: BypassDetails;
  /** Total duration in ms */
  readonly duration: number;
  /** Individual validator results */
  readonly validatorResults: ValidationResult[];
  /** Summary statistics */
  readonly summary: GovernanceSummary;
}

/**
 * Bypass details for audit
 */
export interface BypassDetails {
  /** Who requested bypass */
  readonly requestedBy: string;
  /** Reason provided */
  readonly reason: string;
  /** Violations bypassed */
  readonly violationsBypassed: Violation[];
  /** Bypass token used */
  readonly token?: string;
  /** Bypass expiration */
  readonly expiresAt?: Date;
}

/**
 * Governance summary statistics
 */
export interface GovernanceSummary {
  /** Total files validated */
  readonly filesValidated: number;
  /** Total violations found */
  readonly totalViolations: number;
  /** Violations by severity */
  readonly violationsBySeverity: Record<ViolationSeverity, number>;
  /** Violations by rule */
  readonly violationsByRule: Record<string, number>;
  /** Total warnings */
  readonly totalWarnings: number;
  /** Validators run */
  readonly validatorsRun: number;
  /** Validators skipped */
  readonly validatorsSkipped: number;
  /** Total duration */
  readonly totalDuration: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique entry ID */
  readonly id: string;
  /** Timestamp */
  readonly timestamp: Date;
  /** Action type */
  readonly action: 'validate' | 'block' | 'warn' | 'bypass' | 'allow';
  /** Project identifier */
  readonly projectId?: string;
  /** Repository */
  readonly repository: string;
  /** Branch */
  readonly branch: string;
  /** User who triggered */
  readonly user?: string;
  /** Agent type if applicable */
  readonly agentType?: string;
  /** Files involved */
  readonly files: string[];
  /** Policies applied */
  readonly policiesApplied: string[];
  /** Violations found */
  readonly violations: AuditViolation[];
  /** Warnings found */
  readonly warnings: ValidationWarning[];
  /** Bypass info if bypassed */
  readonly bypass?: AuditBypass;
  /** Duration in ms */
  readonly duration: number;
}

/**
 * Violation info for audit (simplified)
 */
export interface AuditViolation {
  readonly rule: string;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
}

/**
 * Bypass info for audit
 */
export interface AuditBypass {
  readonly reason: string;
  readonly token?: string;
  readonly approvedBy?: string;
  readonly violationCount: number;
}

/**
 * Enforcement decision context
 */
export interface EnforcementDecisionContext {
  /** Violations to enforce */
  readonly violations: Violation[];
  /** Policy being enforced */
  readonly policy: import('./policy.types').Policy;
  /** User context */
  readonly user?: string;
  /** Repository context */
  readonly repository: string;
  /** Branch context */
  readonly branch: string;
  /** Bypass request */
  readonly bypassRequest?: BypassRequest;
}

/**
 * Bypass request
 */
export interface BypassRequest {
  /** Reason for bypass */
  readonly reason: string;
  /** Token if required */
  readonly token?: string;
  /** Specific violations to bypass */
  readonly violations?: string[];
  /** Requestor */
  readonly requestedBy: string;
  /** Expiration */
  readonly expiresAt?: Date;
}

/**
 * Report format options
 */
export interface ReportOptions {
  /** Output format */
  readonly format: 'console' | 'json' | 'sarif' | 'markdown' | 'html';
  /** Output path (if file) */
  readonly outputPath?: string;
  /** Include code snippets */
  readonly includeSnippets?: boolean;
  /** Include remediation suggestions */
  readonly includeRemediation?: boolean;
  /** Include references */
  readonly includeReferences?: boolean;
  /** Verbosity level */
  readonly verbosity?: 'minimal' | 'normal' | 'verbose';
}

/**
 * Report generated by reporter
 */
export interface Report {
  /** Report format */
  readonly format: string;
  /** Report content */
  readonly content: string;
  /** Report file path if written */
  readonly filePath?: string;
  /** Generation timestamp */
  readonly generatedAt: Date;
}

/**
 * Dashboard update payload
 */
export interface DashboardUpdate {
  /** Project ID */
  readonly projectId: string;
  /** SDLC tracking ID */
  readonly sdlcId?: string;
  /** Update type */
  readonly type: 'validation_started' | 'validation_completed' | 'violation_detected' | 'bypass_used';
  /** Timestamp */
  readonly timestamp: Date;
  /** Payload data */
  readonly data: Record<string, unknown>;
}

/**
 * Metric for monitoring
 */
export interface GovernanceMetric {
  /** Metric name */
  readonly name: string;
  /** Metric value */
  readonly value: number;
  /** Metric type */
  readonly type: 'counter' | 'gauge' | 'histogram';
  /** Labels */
  readonly labels?: Record<string, string>;
  /** Timestamp */
  readonly timestamp: Date;
}
