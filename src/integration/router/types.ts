/**
 * Smart Router Types
 *
 * Defines routing strategies, decisions, and interfaces for the smart router.
 * See ADR-041 for the routing architecture decision.
 *
 * @module router/types
 */

import { RequestClassification, SDLCPhase, RequestType, Complexity } from '../classifier/types';
import { GovernanceLevel } from '../governance/types';

/**
 * Named routing strategies that map to different workflow patterns.
 */
export type RoutingStrategy =
  | 'passthrough'      // Direct Claude response, log only
  | 'documentation'    // Documentation-focused, minimal governance
  | 'trivial'          // Minimal SDLC, fast path
  | 'bugfix'           // Bug fix workflow
  | 'feature'          // Feature development workflow (light or full)
  | 'architecture'     // Architecture-focused workflow
  | 'review'           // Review-focused workflow
  | 'emergency';       // Fastest resolution path

/**
 * Agent identifiers used in routing.
 */
export type AgentId =
  | 'conductor' | 'ba' | 'jets' | 'ux' | 'engineer'
  | 'security' | 'qa' | 'atlas' | 'customer' | 'ask-tom'
  | 'tracker' | 'finops';

/**
 * The routing decision produced by the smart router.
 */
export interface RoutingDecision {
  /** The selected routing strategy */
  strategy: RoutingStrategy;
  /** SDLC phases to execute */
  phases: SDLCPhase[];
  /** Agents to invoke */
  agents: AgentId[];
  /** The governance level applied */
  governanceLevel: GovernanceLevel;
  /** The SDLC command to invoke (if applicable) */
  sdlcCommand: string | null;
  /** Context to inject into the Claude message */
  contextInjection: string;
  /** Estimated duration as human-readable string */
  estimatedDuration: string;
  /** Whether this routing blocks the user response */
  blocking: boolean;
  /** Whether agents can run in parallel */
  parallel: boolean;
}

/**
 * Interface for a routing strategy implementation.
 */
export interface RoutingStrategyHandler {
  /** The strategy name */
  readonly name: RoutingStrategy;
  /** Determine if this strategy applies to the given classification */
  matches(classification: RequestClassification, governanceLevel: GovernanceLevel): boolean;
  /** Build the routing decision */
  route(classification: RequestClassification, governanceLevel: GovernanceLevel): RoutingDecision;
}

/**
 * Configuration options for the smart router.
 */
export interface RouterOptions {
  /** Custom routing strategy handlers (extends or overrides defaults) */
  customStrategies?: RoutingStrategyHandler[];
  /** Keywords that always trigger SDLC routing */
  alwaysSDLCFor?: string[];
  /** Keywords that never trigger SDLC routing */
  neverSDLCFor?: string[];
  /** Maximum message length considered "trivial" */
  trivialMaxLength?: number;
}
