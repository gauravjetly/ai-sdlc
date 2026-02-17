/**
 * Governance Engine
 *
 * Evaluates governance policies for request classifications.
 * Determines if a request is allowed to proceed based on the
 * configured governance level and applicable gates.
 *
 * See ADR-042 for the governance level design.
 *
 * @module governance/GovernanceEngine
 */

import { v4 as uuidv4 } from 'uuid';
import { RequestClassification } from '../classifier/types';
import {
  GovernanceLevel,
  GovernanceDecision,
  GateResult,
  GovernanceAuditEntry,
  BranchGovernanceOverride,
  GOVERNANCE_LEVEL_NAMES,
} from './types';
import { getActiveGates, canBypass, getBlockingGates } from './levels';
import { evaluateGate, resolveGovernanceLevel } from './policies';

/**
 * Options for the governance engine.
 */
export interface GovernanceEngineOptions {
  /** Base governance level. Default: 2 */
  level?: GovernanceLevel;
  /** Branch-level governance overrides */
  branchOverrides?: BranchGovernanceOverride[];
}

/**
 * GovernanceEngine evaluates whether a classified request is allowed to proceed
 * based on the configured governance level and applicable gates.
 */
export class GovernanceEngine {
  private level: GovernanceLevel;
  private readonly branchOverrides: BranchGovernanceOverride[];
  private decisionCount: number;
  private blockCount: number;

  constructor(options: GovernanceEngineOptions = {}) {
    this.level = options.level ?? 2;
    this.branchOverrides = options.branchOverrides ?? [];
    this.decisionCount = 0;
    this.blockCount = 0;
  }

  /**
   * Evaluate governance for a classification.
   *
   * @param classification - The classification to evaluate
   * @param branch - The current git branch (for branch-level overrides)
   * @returns GovernanceDecision with gate results and overall allowed/blocked status
   */
  evaluate(
    classification: RequestClassification,
    branch?: string,
  ): GovernanceDecision {
    this.decisionCount++;

    // Resolve effective level (base + branch overrides)
    const effectiveLevel = resolveGovernanceLevel(
      this.level,
      branch,
      this.branchOverrides,
    );

    // If the request does not require SDLC, allow it
    if (!classification.requiresSDLC) {
      return this.createAllowedDecision(effectiveLevel, classification, []);
    }

    // Evaluate all active gates at this level
    const activeGateNames = getActiveGates(effectiveLevel);
    const gateResults: GateResult[] = activeGateNames.map((gate) =>
      evaluateGate(gate, effectiveLevel, classification),
    );

    // Check for blocking failures
    const blockingFailures = gateResults.filter(
      (g) => g.blocking && !g.passed,
    );
    const advisories = gateResults.filter(
      (g) => !g.blocking && !g.passed,
    );

    const allowed = blockingFailures.length === 0;

    if (!allowed) {
      this.blockCount++;
    }

    const bypassInfo = canBypass(effectiveLevel);

    const auditEntry: GovernanceAuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level: effectiveLevel,
      classificationId: classification.id,
      allowed,
      gatesEvaluated: activeGateNames,
      gatesBlocked: blockingFailures.map((g) => g.gate),
      overrideUsed: false,
    };

    return {
      allowed,
      level: effectiveLevel,
      gates: gateResults,
      overrideAvailable: !allowed && bypassInfo.allowed,
      overrideRequiresToken: bypassInfo.requiresToken,
      blockedBy: blockingFailures.map((g) => g.gate),
      advisories: advisories.map((g) => g.message),
      auditEntry,
    };
  }

  /**
   * Create a decision that allows the request.
   */
  private createAllowedDecision(
    level: GovernanceLevel,
    classification: RequestClassification,
    gateResults: GateResult[],
  ): GovernanceDecision {
    return {
      allowed: true,
      level,
      gates: gateResults,
      overrideAvailable: false,
      overrideRequiresToken: false,
      blockedBy: [],
      advisories: [],
      auditEntry: {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        level,
        classificationId: classification.id,
        allowed: true,
        gatesEvaluated: [],
        gatesBlocked: [],
        overrideUsed: false,
      },
    };
  }

  /**
   * Get the current governance level.
   */
  getLevel(): GovernanceLevel {
    return this.level;
  }

  /**
   * Set the governance level.
   */
  setLevel(level: GovernanceLevel): { previous: GovernanceLevel; current: GovernanceLevel } {
    const previous = this.level;
    this.level = level;
    return { previous, current: level };
  }

  /**
   * Get the human-readable name of the current governance level.
   */
  getLevelName(): string {
    return GOVERNANCE_LEVEL_NAMES[this.level];
  }

  /**
   * Get governance statistics.
   */
  getStats(): {
    level: GovernanceLevel;
    levelName: string;
    totalDecisions: number;
    blockedCount: number;
    blockRate: number;
    blockingGates: string[];
  } {
    return {
      level: this.level,
      levelName: this.getLevelName(),
      totalDecisions: this.decisionCount,
      blockedCount: this.blockCount,
      blockRate: this.decisionCount > 0 ? this.blockCount / this.decisionCount : 0,
      blockingGates: getBlockingGates(this.level),
    };
  }

  /**
   * Format a governance decision for user display.
   */
  formatDecision(decision: GovernanceDecision): string {
    if (decision.allowed) {
      const advisoryLines = decision.advisories.map((a) => `  Advisory: ${a}`);
      if (advisoryLines.length === 0) {
        return `[AI-SDLC Governance] ALLOWED (Level ${decision.level}: ${GOVERNANCE_LEVEL_NAMES[decision.level]})`;
      }
      return [
        `[AI-SDLC Governance] ALLOWED with advisories (Level ${decision.level}: ${GOVERNANCE_LEVEL_NAMES[decision.level]})`,
        ...advisoryLines,
      ].join('\n');
    }

    const lines = [
      '[AI-SDLC Governance] BLOCKED',
      `  Level: ${decision.level} (${GOVERNANCE_LEVEL_NAMES[decision.level]})`,
      '',
      '  Required gates not met:',
    ];

    for (const gate of decision.gates.filter((g) => g.blocking && !g.passed)) {
      lines.push(`  - ${gate.gate}: ${gate.message}`);
      if (gate.remediation) {
        lines.push(`    Fix: ${gate.remediation}`);
      }
    }

    if (decision.overrideAvailable) {
      lines.push('');
      if (decision.overrideRequiresToken) {
        lines.push('  To override: Provide an approval token.');
      } else {
        lines.push('  To override: Provide a reason for bypass.');
      }
    } else {
      lines.push('');
      lines.push('  This cannot be bypassed at the current governance level.');
    }

    return lines.join('\n');
  }
}
