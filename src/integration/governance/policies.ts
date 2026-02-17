/**
 * Governance Policy Evaluation
 *
 * Evaluates governance policies against request classifications.
 * Determines which gates apply and whether they pass or fail.
 *
 * @module governance/policies
 */

import { RequestClassification, SDLCPhase } from '../classifier/types';
import {
  GovernanceLevel,
  GateName,
  GateResult,
  GateSeverity,
  BranchGovernanceOverride,
} from './types';
import { getGateBehavior, canBypass } from './levels';

/**
 * Evaluate a specific gate for a classification.
 *
 * Note: In Phase 1, gate evaluation is policy-based (does the gate apply?).
 * Actual gate execution (running security scans, QA tests, etc.) happens
 * in Phase 2+ when the MCP server orchestrates agent workflows.
 */
export function evaluateGate(
  gate: GateName,
  level: GovernanceLevel,
  classification: RequestClassification,
): GateResult {
  const behavior = getGateBehavior(gate, level);

  // If gate is skipped at this level, it passes automatically
  if (behavior === 'skip') {
    return {
      gate,
      passed: true,
      blocking: false,
      severity: 'info',
      message: `${gate}: Skipped at Level ${level}`,
    };
  }

  const isBlocking = behavior === 'blocking';

  // Gate-specific evaluation logic
  switch (gate) {
    case 'security-review':
      return evaluateSecurityGate(gate, isBlocking, classification);
    case 'qa-testing':
      return evaluateQAGate(gate, isBlocking, classification);
    case 'architecture-review':
      return evaluateArchitectureGate(gate, isBlocking, classification);
    case 'customer-acceptance':
      return evaluateAcceptanceGate(gate, isBlocking, classification);
    case 'compliance-check':
      return evaluateComplianceGate(gate, isBlocking, classification);
    case 'approval-workflow':
      return evaluateApprovalGate(gate, isBlocking, classification);
    case 'cost-tracking':
      return evaluateCostGate(gate, isBlocking, classification);
    case 'request-logging':
      return {
        gate,
        passed: true,
        blocking: isBlocking,
        severity: 'info',
        message: 'Request logged to registry',
      };
    default:
      return {
        gate,
        passed: true,
        blocking: false,
        severity: 'info',
        message: `Unknown gate: ${gate}`,
      };
  }
}

/**
 * Security review gate evaluation.
 * At this stage, we determine if security review is required.
 * The actual review happens during agent execution.
 */
function evaluateSecurityGate(
  gate: GateName,
  isBlocking: boolean,
  classification: RequestClassification,
): GateResult {
  const needsReview = classification.requiredPhases.includes('security') ||
    classification.type === 'code-change' ||
    classification.type === 'bug-fix' ||
    classification.type === 'devops';

  if (!needsReview) {
    return {
      gate,
      passed: true,
      blocking: isBlocking,
      severity: 'info',
      message: 'Security review not required for this request type',
    };
  }

  // Security review is required but not yet completed (pending)
  return {
    gate,
    passed: false,
    blocking: isBlocking,
    severity: isBlocking ? 'error' : 'warning',
    message: isBlocking
      ? 'Security review is REQUIRED and must pass before proceeding'
      : 'Security review is RECOMMENDED (advisory)',
    remediation: 'Run security review: /sdlc-review --type security',
  };
}

/**
 * QA testing gate evaluation.
 */
function evaluateQAGate(
  gate: GateName,
  isBlocking: boolean,
  classification: RequestClassification,
): GateResult {
  const needsTesting = classification.requiredPhases.includes('testing') ||
    classification.type === 'code-change' ||
    classification.type === 'bug-fix';

  if (!needsTesting) {
    return {
      gate,
      passed: true,
      blocking: isBlocking,
      severity: 'info',
      message: 'QA testing not required for this request type',
    };
  }

  return {
    gate,
    passed: false,
    blocking: isBlocking,
    severity: isBlocking ? 'error' : 'warning',
    message: isBlocking
      ? 'QA testing is REQUIRED and must pass before proceeding'
      : 'QA testing is RECOMMENDED (advisory)',
    remediation: 'Run tests: npm test',
  };
}

/**
 * Architecture review gate evaluation.
 */
function evaluateArchitectureGate(
  gate: GateName,
  isBlocking: boolean,
  classification: RequestClassification,
): GateResult {
  const needsReview =
    classification.type === 'architecture' ||
    classification.complexity === 'complex' ||
    classification.complexity === 'epic';

  if (!needsReview) {
    return {
      gate,
      passed: true,
      blocking: isBlocking,
      severity: 'info',
      message: 'Architecture review not required (complexity is below threshold)',
    };
  }

  return {
    gate,
    passed: false,
    blocking: isBlocking,
    severity: isBlocking ? 'error' : 'warning',
    message: isBlocking
      ? 'Architecture review is REQUIRED for complex changes'
      : 'Architecture review is RECOMMENDED for complex changes (advisory)',
    remediation: 'Request architecture review from Jets agent',
  };
}

/**
 * Customer acceptance gate evaluation.
 */
function evaluateAcceptanceGate(
  gate: GateName,
  isBlocking: boolean,
  classification: RequestClassification,
): GateResult {
  const needsAcceptance = classification.type === 'code-change' &&
    (classification.complexity === 'complex' || classification.complexity === 'epic');

  if (!needsAcceptance) {
    return {
      gate,
      passed: true,
      blocking: isBlocking,
      severity: 'info',
      message: 'Customer acceptance not required for this change type/complexity',
    };
  }

  return {
    gate,
    passed: false,
    blocking: isBlocking,
    severity: isBlocking ? 'error' : 'warning',
    message: 'Customer acceptance required for feature changes',
    remediation: 'Run acceptance testing with Customer agent',
  };
}

/**
 * Compliance check gate evaluation.
 */
function evaluateComplianceGate(
  gate: GateName,
  isBlocking: boolean,
  _classification: RequestClassification,
): GateResult {
  // Compliance checks always apply at Level 4
  return {
    gate,
    passed: false,
    blocking: isBlocking,
    severity: isBlocking ? 'critical' : 'warning',
    message: 'Compliance check required (SOC2, HIPAA, etc.)',
    remediation: 'Complete compliance validation before proceeding',
  };
}

/**
 * Approval workflow gate evaluation.
 */
function evaluateApprovalGate(
  gate: GateName,
  isBlocking: boolean,
  _classification: RequestClassification,
): GateResult {
  return {
    gate,
    passed: false,
    blocking: isBlocking,
    severity: isBlocking ? 'critical' : 'warning',
    message: 'Change approval workflow required',
    remediation: 'Request approval through the change management workflow',
  };
}

/**
 * Cost tracking gate evaluation.
 */
function evaluateCostGate(
  gate: GateName,
  isBlocking: boolean,
  classification: RequestClassification,
): GateResult {
  // Cost tracking gate passes if estimated tokens are within budget
  // In Phase 1, we always pass this gate as there is no budget tracking yet
  return {
    gate,
    passed: true,
    blocking: isBlocking,
    severity: 'info',
    message: `Cost tracking: estimated ${classification.estimatedTokens} tokens`,
  };
}

/**
 * Resolve the effective governance level considering branch overrides.
 */
export function resolveGovernanceLevel(
  baseLevel: GovernanceLevel,
  branch: string | undefined,
  overrides: BranchGovernanceOverride[],
): GovernanceLevel {
  if (!branch || overrides.length === 0) return baseLevel;

  for (const override of overrides) {
    if (matchesBranch(branch, override.pattern)) {
      return override.level;
    }
  }

  return baseLevel;
}

/**
 * Check if a branch name matches a pattern (supports trailing wildcard).
 */
function matchesBranch(branch: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    return branch.startsWith(pattern.slice(0, -1));
  }
  if (pattern.endsWith('*')) {
    return branch.startsWith(pattern.slice(0, -1));
  }
  return branch === pattern;
}
