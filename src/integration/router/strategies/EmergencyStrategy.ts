/**
 * Emergency Routing Strategy
 *
 * For production incidents and critical issues.
 * Routes to Ask Tom for immediate diagnosis + Engineer for fix.
 * Governance gates are suspended in emergency mode.
 */

import { RequestClassification, SDLCPhase } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision, AgentId } from '../types';

export class EmergencyStrategy implements RoutingStrategyHandler {
  readonly name = 'emergency' as const;

  matches(classification: RequestClassification): boolean {
    return classification.type === 'emergency';
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    const phases: SDLCPhase[] = ['implementation', 'testing'];
    const agents: AgentId[] = ['ask-tom', 'engineer'];

    return {
      strategy: 'emergency',
      phases,
      agents,
      governanceLevel,
      sdlcCommand: null,
      contextInjection: [
        '[AISDLC EMERGENCY]',
        'Classification: emergency (critical urgency)',
        'Strategy: emergency',
        'Governance: EMERGENCY MODE (gates suspended)',
        'Instructions: Use the aisdlc_ask_tom MCP tool immediately for this critical issue.',
        '              Ask Tom will perform root cause analysis and recommend an immediate fix.',
        '              Post-incident review will be scheduled automatically.',
        '[/AISDLC EMERGENCY]',
      ].join('\n'),
      estimatedDuration: '5 minutes',
      blocking: false,
      parallel: true,
    };
  }
}
