/**
 * Validation-related type definitions
 * @module @vintiq/governance-engine/types/validation
 */

import { EnforcementLevel } from './policy.types';

/**
 * Context for validation operations
 */
export interface ValidationContext {
  /** Project identifier */
  readonly projectId?: string;
  /** Repository URL or path */
  readonly repository: string;
  /** Current branch name */
  readonly branch: string;
  /** User performing the action */
  readonly user?: string;
  /** Agent type if invoked by agent */
  readonly agentType?: string;
  /** Type of request/operation */
  readonly requestType?: string;
  /** Compliance scopes applicable */
  readonly complianceScopes?: string[];
  /** Files that changed */
  readonly changedFiles: string[];
  /** All files (for full scan) */
  readonly allFiles?: string[];
  /** File contents for in-memory validation */
  readonly fileContents?: FileContent[];
  /** Working directory */
  readonly workingDirectory: string;
  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * File content for validation
 */
export interface FileContent {
  readonly path: string;
  readonly content: string;
  readonly encoding?: 'utf-8' | 'base64';
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Validator that produced this result */
  readonly validator: string;
  /** Whether validation passed */
  readonly passed: boolean;
  /** List of violations found */
  readonly violations: Violation[];
  /** Duration in milliseconds */
  readonly duration?: number;
  /** Whether this validator was skipped */
  readonly skipped?: boolean;
  /** Reason for skipping */
  readonly skipReason?: string;
  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Validation violation
 */
export interface Violation {
  /** Unique violation ID */
  readonly id?: string;
  /** Rule that was violated */
  readonly rule: string;
  /** Severity level */
  readonly severity: ViolationSeverity;
  /** Human-readable message */
  readonly message: string;
  /** Location in code */
  readonly location?: CodeLocation;
  /** Suggested remediation */
  readonly remediation?: string;
  /** Auto-fix available */
  readonly autoFix?: AutoFix;
  /** Reference URLs */
  readonly references?: string[];
  /** CWE identifier if applicable */
  readonly cweId?: string;
  /** OWASP category if applicable */
  readonly owaspCategory?: string;
  /** Additional details */
  readonly details?: Record<string, unknown>;
}

/**
 * Violation severity levels
 */
export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Code location information
 */
export interface CodeLocation {
  /** File path */
  readonly file: string;
  /** Line number (1-based) */
  readonly line: number;
  /** Column number (1-based) */
  readonly column?: number;
  /** End line for ranges */
  readonly endLine?: number;
  /** End column for ranges */
  readonly endColumn?: number;
  /** Code snippet */
  readonly snippet?: string;
}

/**
 * Auto-fix information
 */
export interface AutoFix {
  /** Whether auto-fix is available */
  readonly available: boolean;
  /** Description of the fix */
  readonly description: string;
  /** Replacement content */
  readonly replacement?: string;
  /** Whether fix is safe to auto-apply */
  readonly safe: boolean;
}

/**
 * Warning (non-blocking violation)
 */
export interface ValidationWarning {
  /** Policy that generated warning */
  readonly policy: string;
  /** Rule that generated warning */
  readonly rule: string;
  /** Warning message */
  readonly message: string;
  /** Suggestion for improvement */
  readonly suggestion?: string;
  /** Location if applicable */
  readonly location?: CodeLocation;
}

/**
 * Aggregated validation results
 */
export interface AggregatedValidationResult {
  /** Overall pass/fail */
  readonly passed: boolean;
  /** Total number of violations */
  readonly totalViolations: number;
  /** Violations by severity */
  readonly violationsBySeverity: Record<ViolationSeverity, number>;
  /** Results from each validator */
  readonly validatorResults: ValidationResult[];
  /** Total duration */
  readonly totalDuration: number;
  /** Files validated */
  readonly filesValidated: number;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Policy file paths */
  readonly policyPaths?: string[];
  /** Inline policy to merge */
  readonly inlinePolicy?: Partial<import('./policy.types').Policy>;
  /** Files to validate */
  readonly files?: string[];
  /** Whether to validate all files */
  readonly all?: boolean;
  /** Only validate staged files */
  readonly staged?: boolean;
  /** File contents for in-memory validation */
  readonly fileContents?: FileContent[];
  /** Enforcement options */
  readonly enforcement?: EnforcementOptions;
  /** Validators to run (default: all) */
  readonly validators?: string[];
  /** Validators to skip */
  readonly skipValidators?: string[];
  /** Output format */
  readonly format?: 'console' | 'json' | 'sarif';
  /** Verbose output */
  readonly verbose?: boolean;
  /** Working directory */
  readonly cwd?: string;
}

/**
 * Enforcement options
 */
export interface EnforcementOptions {
  /** Whether to allow bypass */
  readonly bypass?: boolean;
  /** Reason for bypass */
  readonly bypassReason?: string;
  /** Bypass token */
  readonly bypassToken?: string;
  /** Dry run (report only, don't block) */
  readonly dryRun?: boolean;
  /** Minimum severity to block */
  readonly minBlockingSeverity?: ViolationSeverity;
}

/**
 * Validator interface
 */
export interface Validator {
  /** Validator name */
  readonly name: string;
  /** Validator description */
  readonly description: string;
  /** Check if validator applies to context */
  appliesTo(
    context: ValidationContext,
    policy: import('./policy.types').Policy
  ): boolean;
  /** Run validation */
  validate(
    context: ValidationContext,
    policy: import('./policy.types').Policy
  ): Promise<ValidationResult>;
}

/**
 * Validation event for logging/monitoring
 */
export interface ValidationEvent {
  /** Event timestamp */
  readonly timestamp: Date;
  /** Event type */
  readonly type: 'started' | 'completed' | 'failed' | 'skipped';
  /** Validator name */
  readonly validator?: string;
  /** Duration in ms */
  readonly duration?: number;
  /** Number of violations */
  readonly violationCount?: number;
  /** Error if failed */
  readonly error?: Error;
  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**
 * Schema validation error
 */
export interface SchemaError {
  /** Path to invalid property */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Expected value/type */
  readonly expected?: string;
  /** Actual value/type */
  readonly actual?: string;
}

/**
 * Policy validation error
 */
export interface PolicyValidationError {
  /** Policy file path */
  readonly path: string;
  /** Schema errors found */
  readonly errors: SchemaError[];
}
