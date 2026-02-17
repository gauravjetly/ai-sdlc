/**
 * Review Routing Strategy
 *
 * For code review, security review, and audit requests.
 * Routes to Security + QA agents for targeted review.
 */

import { RequestClassification, SDLCPhase } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision, AgentId } from '../types';

export class ReviewStrategy implements RoutingStrategyHandler {
  readonly name = 'review' as const;

  matches(classification: RequestClassification): boolean {
    return classification.type === 'review';
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    const phases: SDLCPhase[] = ['security', 'testing'];
    const agents: AgentId[] = ['security', 'qa'];

    return {
      strategy: 'review',
      phases,
      agents,
      governanceLevel,
      sdlcCommand: '/sdlc-review',
      contextInjection: [
        '[AISDLC CONTEXT]',
        `Classification: review (${classification.complexity} complexity)`,
        'Strategy: review',
        `Required phases: ${phases.join(', ')}`,
        `Governance: Level ${governanceLevel}`,
        'Instructions: Use the aisdlc_review_code MCP tool for a targeted code review.',
        '              This will involve Security and QA agents.',
        '[/AISDLC CONTEXT]',
      ].join('\n'),
      estimatedDuration: '10 minutes',
      blocking: governanceLevel >= 3,
      parallel: true,
    };
  }
}
