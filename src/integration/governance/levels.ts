/**
 * Governance Level Definitions
 *
 * Defines the gate behavior matrix for all 4 governance levels.
 * See ADR-042 for the governance level design.
 *
 * @module governance/levels
 */

import { GovernanceLevel, GateBehavior, GateName, GateBehaviorMatrix } from './types';

/**
 * Gate behavior matrix: defines how each gate behaves at each governance level.
 *
 * | Gate                  | Level 1   | Level 2   | Level 3   | Level 4   |
 * |-----------------------|-----------|-----------|-----------|-----------|
 * | request-logging       | skip      | skip      | skip      | blocking  |
 * | security-review       | skip      | advisory  | blocking  | blocking  |
 * | qa-testing            | skip      | advisory  | blocking  | blocking  |
 * | architecture-review   | skip      | advisory  | blocking  | blocking  |
 * | customer-acceptance   | skip      | skip      | blocking  | blocking  |
 * | compliance-check      | skip      | skip      | skip      | blocking  |
 * | approval-workflow     | skip      | skip      | skip      | blocking  |
 * | cost-tracking         | skip      | skip      | advisory  | blocking  |
 */
export const GATE_BEHAVIOR_MATRIX: GateBehaviorMatrix = {
  'request-logging': {
    1: 'skip',
    2: 'skip',
    3: 'skip',
    4: 'blocking',
  },
  'security-review': {
    1: 'skip',
    2: 'advisory',
    3: 'blocking',
    4: 'blocking',
  },
  'qa-testing': {
    1: 'skip',
    2: 'advisory',
    3: 'blocking',
    4: 'blocking',
  },
  'architecture-review': {
    1: 'skip',
    2: 'advisory',
    3: 'blocking',
    4: 'blocking',
  },
  'customer-acceptance': {
    1: 'skip',
    2: 'skip',
    3: 'blocking',
    4: 'blocking',
  },
  'compliance-check': {
    1: 'skip',
    2: 'skip',
    3: 'skip',
    4: 'blocking',
  },
  'approval-workflow': {
    1: 'skip',
    2: 'skip',
    3: 'skip',
    4: 'blocking',
  },
  'cost-tracking': {
    1: 'skip',
    2: 'skip',
    3: 'advisory',
    4: 'blocking',
  },
};

/**
 * Get the gate behavior for a specific gate at a specific governance level.
 */
export function getGateBehavior(gate: GateName, level: GovernanceLevel): GateBehavior {
  const matrix = GATE_BEHAVIOR_MATRIX[gate];
  if (!matrix) return 'skip';
  return (matrix[level] as GateBehavior) || 'skip';
}

/**
 * Get all gates that are blocking at a specific governance level.
 */
export function getBlockingGates(level: GovernanceLevel): GateName[] {
  const blocking: GateName[] = [];

  for (const [gate, behaviors] of Object.entries(GATE_BEHAVIOR_MATRIX)) {
    if (behaviors[level] === 'blocking') {
      blocking.push(gate as GateName);
    }
  }

  return blocking;
}

/**
 * Get all gates that are advisory at a specific governance level.
 */
export function getAdvisoryGates(level: GovernanceLevel): GateName[] {
  const advisory: GateName[] = [];

  for (const [gate, behaviors] of Object.entries(GATE_BEHAVIOR_MATRIX)) {
    if (behaviors[level] === 'advisory') {
      advisory.push(gate as GateName);
    }
  }

  return advisory;
}

/**
 * Get all active gates (non-skip) at a specific governance level.
 */
export function getActiveGates(level: GovernanceLevel): GateName[] {
  const active: GateName[] = [];

  for (const [gate, behaviors] of Object.entries(GATE_BEHAVIOR_MATRIX)) {
    if (behaviors[level] !== 'skip') {
      active.push(gate as GateName);
    }
  }

  return active;
}

/**
 * Check if bypasses are allowed at a specific governance level.
 */
export function canBypass(level: GovernanceLevel): { allowed: boolean; requiresToken: boolean } {
  switch (level) {
    case 1:
      return { allowed: true, requiresToken: false };
    case 2:
      return { allowed: true, requiresToken: false };
    case 3:
      return { allowed: true, requiresToken: true };
    case 4:
      return { allowed: false, requiresToken: false };
    default:
      return { allowed: false, requiresToken: false };
  }
}
