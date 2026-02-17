/**
 * Governance Engine Types
 *
 * Defines governance levels, gates, decisions, and interfaces.
 * See ADR-042 for the governance level design.
 *
 * @module governance/types
 */

/**
 * Governance levels (1-4).
 * 1 = Tracking Only
 * 2 = Light Governance (default)
 * 3 = Full Governance
 * 4 = Audit Mode
 */
export type GovernanceLevel = 1 | 2 | 3 | 4;

/**
 * Human-readable governance level names.
 */
export const GOVERNANCE_LEVEL_NAMES: Record<GovernanceLevel, string> = {
  1: 'Tracking Only',
  2: 'Light Governance',
  3: 'Full Governance',
  4: 'Audit Mode',
};

/**
 * Gate behavior: skip, advisory (non-blocking), or blocking.
 */
export type GateBehavior = 'skip' | 'advisory' | 'blocking';

/**
 * Severity of a gate result.
 */
export type GateSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Names of governance gates.
 */
export type GateName =
  | 'request-logging'
  | 'security-review'
  | 'qa-testing'
  | 'architecture-review'
  | 'customer-acceptance'
  | 'compliance-check'
  | 'approval-workflow'
  | 'cost-tracking';

/**
 * Result of evaluating a single governance gate.
 */
export interface GateResult {
  /** Name of the gate */
  gate: GateName;
  /** Whether the gate passed */
  passed: boolean;
  /** Whether this gate blocks progression (depends on governance level) */
  blocking: boolean;
  /** Severity of the result */
  severity: GateSeverity;
  /** Human-readable message */
  message: string;
  /** Remediation suggestion if gate failed */
  remediation?: string;
}

/**
 * The overall governance decision for a request.
 */
export interface GovernanceDecision {
  /** Whether the request is allowed to proceed */
  allowed: boolean;
  /** The governance level applied */
  level: GovernanceLevel;
  /** Results of all evaluated gates */
  gates: GateResult[];
  /** Whether an override is available for this decision */
  overrideAvailable: boolean;
  /** Whether the override requires a signed token */
  overrideRequiresToken: boolean;
  /** Names of gates that are blocking */
  blockedBy: string[];
  /** Advisory messages (non-blocking) */
  advisories: string[];
  /** Audit entry for this decision */
  auditEntry: GovernanceAuditEntry;
}

/**
 * Audit entry for a governance decision.
 */
export interface GovernanceAuditEntry {
  /** Unique identifier */
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Governance level at time of decision */
  level: GovernanceLevel;
  /** The classification that triggered the decision */
  classificationId: string;
  /** The decision result */
  allowed: boolean;
  /** Gates evaluated */
  gatesEvaluated: string[];
  /** Gates that blocked */
  gatesBlocked: string[];
  /** Whether an override was used */
  overrideUsed: boolean;
  /** Reason for override (if used) */
  overrideReason?: string;
}

/**
 * Gate behavior matrix defining how each gate behaves at each level.
 */
export interface GateBehaviorMatrix {
  [gateName: string]: {
    [level: number]: GateBehavior;
  };
}

/**
 * Branch-level governance override.
 */
export interface BranchGovernanceOverride {
  /** Branch pattern (exact match or wildcard with *) */
  pattern: string;
  /** Governance level for matching branches */
  level: GovernanceLevel;
}
