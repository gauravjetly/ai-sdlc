/**
 * Bug Fix Routing Strategy
 *
 * For bug fixes -- engineer + QA, optional security review.
 */

import { RequestClassification, SDLCPhase } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision, AgentId } from '../types';

export class BugFixStrategy implements RoutingStrategyHandler {
  readonly name = 'bugfix' as const;

  matches(classification: RequestClassification): boolean {
    return classification.type === 'bug-fix' && classification.complexity !== 'trivial';
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    const phases: SDLCPhase[] = ['implementation', 'testing'];
    const agents: AgentId[] = ['engineer', 'qa'];

    // Add security review for medium+ complexity or higher governance
    if (classification.complexity !== 'simple' || governanceLevel >= 3) {
      phases.splice(1, 0, 'security');
      agents.push('security');
    }

    // Add acceptance for complex+ at governance level 3+
    if (classification.complexity === 'complex' || classification.complexity === 'epic') {
      if (governanceLevel >= 3) {
        phases.push('acceptance');
        agents.push('customer');
      }
    }

    const durationMap: Record<string, string> = {
      simple: '5 minutes',
      medium: '15 minutes',
      complex: '30 minutes',
      epic: '1 hour',
    };

    return {
      strategy: 'bugfix',
      phases,
      agents,
      governanceLevel,
      sdlcCommand: '/sdlc-start',
      contextInjection: [
        '[AISDLC CONTEXT]',
        `Classification: bug-fix (${classification.complexity} complexity)`,
        'Strategy: bugfix',
        `Required phases: ${phases.join(', ')}`,
        `Governance: Level ${governanceLevel}`,
        'Instructions: Use the aisdlc_start_workflow MCP tool to begin the bug fix workflow.',
        '              Pass the user\'s original request as the description parameter.',
        '[/AISDLC CONTEXT]',
      ].join('\n'),
      estimatedDuration: durationMap[classification.complexity] || '15 minutes',
      blocking: governanceLevel >= 3,
      parallel: false,
    };
  }
}
