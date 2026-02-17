/**
 * Smart Router Module
 *
 * Exports the smart router and all routing strategies.
 *
 * @module router
 */

export { SmartRouter } from './Router';
export type {
  RoutingStrategy,
  RoutingDecision,
  RoutingStrategyHandler,
  RouterOptions,
  AgentId,
} from './types';
export {
  PassthroughStrategy,
  DocumentationStrategy,
  TrivialStrategy,
  BugFixStrategy,
  FeatureStrategy,
  ArchitectureStrategy,
  ReviewStrategy,
  EmergencyStrategy,
} from './strategies';
