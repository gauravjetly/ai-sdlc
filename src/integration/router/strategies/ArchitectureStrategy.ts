/**
 * Architecture Routing Strategy
 *
 * For architecture decisions, system design, and tech stack evaluations.
 * Routes to BA + Jets (architect) + Security.
 */

import { RequestClassification, SDLCPhase } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision, AgentId } from '../types';

export class ArchitectureStrategy implements RoutingStrategyHandler {
  readonly name = 'architecture' as const;

  matches(classification: RequestClassification): boolean {
    return classification.type === 'architecture';
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    const phases: SDLCPhase[] = ['requirements', 'architecture', 'security'];
    const agents: AgentId[] = ['ba', 'jets', 'security'];

    if (governanceLevel >= 3) {
      phases.push('acceptance');
      agents.push('customer');
    }

    return {
      strategy: 'architecture',
      phases,
      agents,
      governanceLevel,
      sdlcCommand: '/sdlc-start',
      contextInjection: [
        '[AISDLC CONTEXT]',
        `Classification: architecture (${classification.complexity} complexity)`,
        'Strategy: architecture',
        `Required phases: ${phases.join(', ')}`,
        `Governance: Level ${governanceLevel}`,
        'Instructions: Use the aisdlc_start_workflow MCP tool to begin the architecture workflow.',
        '              This will involve BA for requirements, Jets for architecture, and Security for review.',
        '[/AISDLC CONTEXT]',
      ].join('\n'),
      estimatedDuration: '20 minutes',
      blocking: governanceLevel >= 3,
      parallel: false,
    };
  }
}
