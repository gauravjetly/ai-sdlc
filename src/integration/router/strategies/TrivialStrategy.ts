/**
 * Trivial Routing Strategy
 *
 * For trivial changes (typos, comments, formatting).
 * Single agent, minimal tracking.
 */

import { RequestClassification } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision } from '../types';

export class TrivialStrategy implements RoutingStrategyHandler {
  readonly name = 'trivial' as const;

  matches(classification: RequestClassification): boolean {
    return (
      classification.complexity === 'trivial' &&
      classification.type !== 'emergency' &&
      classification.type !== 'qa' &&
      classification.type !== 'explanation'
    );
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    return {
      strategy: 'trivial',
      phases: ['implementation'],
      agents: ['engineer'],
      governanceLevel,
      sdlcCommand: null,
      contextInjection: [
        '[AISDLC CONTEXT]',
        `Classification: ${classification.type} (trivial complexity)`,
        'Strategy: optimized',
        'Required phases: implementation only',
        `Governance: Level ${governanceLevel} (minimal for trivial changes)`,
        'Instructions: Make the trivial change. No full SDLC workflow needed.',
        '[/AISDLC CONTEXT]',
      ].join('\n'),
      estimatedDuration: '1 minute',
      blocking: false,
      parallel: false,
    };
  }
}
