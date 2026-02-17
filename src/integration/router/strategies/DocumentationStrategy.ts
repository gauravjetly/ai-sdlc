/**
 * Documentation Routing Strategy
 *
 * For documentation requests -- minimal governance, single agent.
 */

import { RequestClassification } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision } from '../types';

export class DocumentationStrategy implements RoutingStrategyHandler {
  readonly name = 'documentation' as const;

  matches(classification: RequestClassification): boolean {
    return classification.type === 'documentation';
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    return {
      strategy: 'documentation',
      phases: ['implementation'],
      agents: ['engineer'],
      governanceLevel,
      sdlcCommand: null,
      contextInjection: [
        '[AISDLC CONTEXT]',
        `Classification: ${classification.type} (${classification.complexity} complexity)`,
        'Strategy: documentation',
        'Required phases: implementation',
        'Governance: Level ' + governanceLevel,
        'Instructions: Write or update documentation as requested. Minimal governance applied.',
        '[/AISDLC CONTEXT]',
      ].join('\n'),
      estimatedDuration: '5 minutes',
      blocking: false,
      parallel: false,
    };
  }
}
