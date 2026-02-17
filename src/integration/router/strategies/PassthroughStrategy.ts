/**
 * Passthrough Routing Strategy
 *
 * For Q&A, explanations, and other non-code requests.
 * Zero overhead -- message passes directly to Claude.
 */

import { RequestClassification } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision } from '../types';

export class PassthroughStrategy implements RoutingStrategyHandler {
  readonly name = 'passthrough' as const;

  matches(classification: RequestClassification): boolean {
    return (
      classification.type === 'qa' ||
      classification.type === 'explanation'
    );
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    return {
      strategy: 'passthrough',
      phases: [],
      agents: [],
      governanceLevel,
      sdlcCommand: null,
      contextInjection: '',
      estimatedDuration: '5 seconds',
      blocking: false,
      parallel: false,
    };
  }
}
