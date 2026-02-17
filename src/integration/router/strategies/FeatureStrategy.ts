/**
 * Feature Development Routing Strategy
 *
 * For code changes (new features, refactoring, modifications).
 * Applies light or full SDLC depending on complexity and governance.
 */

import { RequestClassification, SDLCPhase } from '../../classifier/types';
import { GovernanceLevel } from '../../governance/types';
import { RoutingStrategyHandler, RoutingDecision, AgentId } from '../types';

export class FeatureStrategy implements RoutingStrategyHandler {
  readonly name = 'feature' as const;

  matches(classification: RequestClassification): boolean {
    return (
      (classification.type === 'code-change' ||
       classification.type === 'testing' ||
       classification.type === 'configuration') &&
      classification.complexity !== 'trivial'
    );
  }

  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision {
    const isComplex = classification.complexity === 'complex' || classification.complexity === 'epic';
    const isSimple = classification.complexity === 'simple';

    let phases: SDLCPhase[];
    let agents: AgentId[];

    if (isSimple) {
      // Light SDLC for simple changes
      phases = ['implementation', 'testing'];
      agents = ['engineer', 'qa'];

      if (governanceLevel >= 2) {
        phases.splice(1, 0, 'security');
        agents.push('security');
      }
    } else if (isComplex) {
      // Full SDLC for complex changes
      phases = ['requirements', 'architecture', 'implementation', 'security', 'testing'];
      agents = ['ba', 'jets', 'engineer', 'security', 'qa'];

      if (governanceLevel >= 3) {
        phases.push('acceptance');
        agents.push('customer');
      }

      if (classification.complexity === 'epic') {
        phases.push('cost-analysis');
        agents.push('finops');
      }
    } else {
      // Medium complexity -- standard SDLC
      phases = ['implementation', 'security', 'testing'];
      agents = ['engineer', 'security', 'qa'];

      if (governanceLevel >= 2) {
        phases.unshift('requirements');
        agents.unshift('ba');
      }

      if (governanceLevel >= 3) {
        phases.push('acceptance');
        agents.push('customer');
      }
    }

    const durationMap: Record<string, string> = {
      simple: '5 minutes',
      medium: '15 minutes',
      complex: '30 minutes',
      epic: '2 hours',
    };

    const strategyLabel = isSimple ? 'light-sdlc' : 'full-sdlc';

    return {
      strategy: 'feature',
      phases,
      agents,
      governanceLevel,
      sdlcCommand: '/sdlc-start',
      contextInjection: [
        '[AISDLC CONTEXT]',
        `Classification: ${classification.type} (${classification.complexity} complexity)`,
        `Strategy: ${strategyLabel}`,
        `Required phases: ${phases.join(', ')}`,
        `Governance: Level ${governanceLevel}`,
        'Instructions: Use the aisdlc_start_workflow MCP tool to begin the governed workflow.',
        '              Pass the user\'s original request as the description parameter.',
        '[/AISDLC CONTEXT]',
      ].join('\n'),
      estimatedDuration: durationMap[classification.complexity] || '15 minutes',
      blocking: governanceLevel >= 3,
      parallel: isComplex,
    };
  }
}
