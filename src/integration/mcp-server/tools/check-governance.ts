/**
 * aisdlc_check_governance MCP Tool
 *
 * Check governance requirements for a request or change.
 *
 * @module mcp-server/tools/check-governance
 */

import { GovernanceEngine } from '../../governance';
import { HybridClassifier } from '../../classifier';
import { GovernanceLevel } from '../../governance/types';

export const checkGovernanceToolSchema = {
  name: 'aisdlc_check_governance',
  description: 'Check if a request or change meets governance requirements at the current governance level. Returns gate results, blocking status, and remediation guidance. Can also be used to set the governance level.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string',
        description: 'The request or change description to check against governance',
      },
      branch: {
        type: 'string',
        description: 'Target git branch (may affect governance level)',
      },
      setLevel: {
        type: 'number',
        enum: [1, 2, 3, 4],
        description: 'Set governance level instead of checking (1=tracking, 2=light, 3=full, 4=audit)',
      },
    },
    required: [],
  },
};

/**
 * Execute the check-governance tool.
 */
export async function executeCheckGovernance(
  args: { message?: string; branch?: string; setLevel?: number },
  classifier: HybridClassifier,
  governanceEngine: GovernanceEngine,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    // If setLevel is provided, change governance level
    if (args.setLevel !== undefined) {
      const level = args.setLevel as GovernanceLevel;
      const result = governanceEngine.setLevel(level);
      const LEVEL_NAMES: Record<number, string> = {
        1: 'Tracking Only',
        2: 'Light Governance',
        3: 'Full Governance',
        4: 'Audit Mode',
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'governance-level-changed',
            previous: { level: result.previous, name: LEVEL_NAMES[result.previous] },
            current: { level: result.current, name: LEVEL_NAMES[result.current] },
            changes: describeGovernanceChanges(result.previous, result.current),
          }, null, 2),
        }],
      };
    }

    // If message is provided, check governance for it
    if (args.message) {
      const classification = await classifier.classify(args.message, {
        branch: args.branch,
      });

      const governance = governanceEngine.evaluate(classification, args.branch);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            allowed: governance.allowed,
            level: governance.level,
            gates: governance.gates.map(g => ({
              gate: g.gate,
              passed: g.passed,
              blocking: g.blocking,
              severity: g.severity,
              message: g.message,
              remediation: g.remediation,
            })),
            blockedBy: governance.blockedBy,
            advisories: governance.advisories,
            overrideAvailable: governance.overrideAvailable,
            overrideRequiresToken: governance.overrideRequiresToken,
            classification: {
              type: classification.type,
              complexity: classification.complexity,
              requiresSDLC: classification.requiresSDLC,
            },
          }, null, 2),
        }],
      };
    }

    // No message or setLevel -- return current governance status
    const stats = governanceEngine.getStats();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          currentLevel: stats.level,
          levelName: stats.levelName,
          totalDecisions: stats.totalDecisions,
          blockedCount: stats.blockedCount,
          blockRate: `${(stats.blockRate * 100).toFixed(1)}%`,
          blockingGates: stats.blockingGates,
        }, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Governance check failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}

/**
 * Describe what changes when governance level changes.
 */
function describeGovernanceChanges(previous: GovernanceLevel, current: GovernanceLevel): string[] {
  const changes: string[] = [];

  if (current > previous) {
    if (current >= 2 && previous < 2) {
      changes.push('Security and QA reviews are now advisory');
    }
    if (current >= 3 && previous < 3) {
      changes.push('Security reviews are now BLOCKING');
      changes.push('QA testing is now BLOCKING');
      changes.push('Architecture review required for complex changes');
      changes.push('Customer acceptance required for new features');
      changes.push('Override requires approval token');
    }
    if (current >= 4 && previous < 4) {
      changes.push('Every change requires approval workflow');
      changes.push('Full audit trail with tamper detection');
      changes.push('Compliance checks enforced');
      changes.push('No bypass available');
    }
  } else if (current < previous) {
    if (current < 4 && previous >= 4) {
      changes.push('Audit mode disabled');
      changes.push('Compliance checks relaxed');
    }
    if (current < 3 && previous >= 3) {
      changes.push('Security reviews changed to advisory (non-blocking)');
      changes.push('QA testing changed to advisory (non-blocking)');
      changes.push('Override no longer requires token');
    }
    if (current < 2 && previous >= 2) {
      changes.push('All reviews disabled (tracking only)');
    }
  }

  return changes;
}
