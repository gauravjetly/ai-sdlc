/**
 * Smart Router
 *
 * Maps classifications to routing strategies and produces routing decisions.
 * Uses the Strategy Pattern with ordered evaluation to select the best strategy.
 *
 * See ADR-041 for the routing architecture decision.
 *
 * @module router/Router
 */

import { RequestClassification } from '../classifier/types';
import { GovernanceLevel } from '../governance/types';
import {
  RoutingDecision,
  RoutingStrategyHandler,
  RouterOptions,
} from './types';
import {
  PassthroughStrategy,
  DocumentationStrategy,
  TrivialStrategy,
  BugFixStrategy,
  FeatureStrategy,
  ArchitectureStrategy,
  ReviewStrategy,
  EmergencyStrategy,
} from './strategies';

/**
 * SmartRouter evaluates classification results against an ordered list of
 * routing strategies and produces a RoutingDecision.
 *
 * Strategies are evaluated in priority order:
 * 1. Emergency (highest priority -- critical incidents)
 * 2. Passthrough (Q&A, explanations -- zero overhead)
 * 3. Trivial (trivial changes -- minimal overhead)
 * 4. Documentation (documentation requests)
 * 5. Architecture (architecture decisions)
 * 6. Review (code/security reviews)
 * 7. BugFix (bug fixes)
 * 8. Feature (code changes -- catch-all)
 */
export class SmartRouter {
  private readonly strategies: RoutingStrategyHandler[];
  private readonly alwaysSDLCFor: string[];
  private readonly neverSDLCFor: string[];
  private routeCount: number;

  constructor(options: RouterOptions = {}) {
    // Built-in strategies in priority order
    const builtIn: RoutingStrategyHandler[] = [
      new EmergencyStrategy(),
      new PassthroughStrategy(),
      new TrivialStrategy(),
      new DocumentationStrategy(),
      new ArchitectureStrategy(),
      new ReviewStrategy(),
      new BugFixStrategy(),
      new FeatureStrategy(),
    ];

    // Allow custom strategies to be prepended (higher priority)
    this.strategies = [
      ...(options.customStrategies || []),
      ...builtIn,
    ];

    this.alwaysSDLCFor = options.alwaysSDLCFor || [];
    this.neverSDLCFor = options.neverSDLCFor || [];
    this.routeCount = 0;
  }

  /**
   * Route a classification to the appropriate strategy.
   *
   * @param classification - The classification result from the classifier
   * @param governanceLevel - The active governance level
   * @returns RoutingDecision with strategy, phases, agents, and context
   */
  route(
    classification: RequestClassification,
    governanceLevel: GovernanceLevel = 2,
  ): RoutingDecision {
    this.routeCount++;

    // Check keyword overrides
    const keywordOverride = this.checkKeywordOverrides(classification);
    if (keywordOverride !== null) {
      classification = { ...classification, requiresSDLC: keywordOverride };
    }

    // Find the first matching strategy
    for (const strategy of this.strategies) {
      if (strategy.matches(classification, governanceLevel)) {
        const decision = strategy.route(classification, governanceLevel);

        // Apply governance-level phase adjustments
        return this.applyGovernanceAdjustments(decision, governanceLevel);
      }
    }

    // Fallback: if no strategy matches, use feature strategy
    const fallback = new FeatureStrategy();
    const decision = fallback.route(classification, governanceLevel);
    return this.applyGovernanceAdjustments(decision, governanceLevel);
  }

  /**
   * Check if keyword overrides should force SDLC on or off.
   */
  private checkKeywordOverrides(classification: RequestClassification): boolean | null {
    const message = classification.userMessage.toLowerCase();

    // Check "always SDLC" keywords
    for (const keyword of this.alwaysSDLCFor) {
      if (message.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // Check "never SDLC" keywords
    for (const keyword of this.neverSDLCFor) {
      if (message.includes(keyword.toLowerCase())) {
        return false;
      }
    }

    return null;
  }

  /**
   * Adjust the routing decision based on governance level.
   */
  private applyGovernanceAdjustments(
    decision: RoutingDecision,
    governanceLevel: GovernanceLevel,
  ): RoutingDecision {
    // At Level 1 (tracking only), nothing is blocking
    if (governanceLevel === 1) {
      return { ...decision, blocking: false };
    }

    // At Level 4 (audit), everything with SDLC is blocking
    if (governanceLevel === 4 && decision.phases.length > 0) {
      return { ...decision, blocking: true };
    }

    return decision;
  }

  /**
   * Get the list of registered strategies.
   */
  getStrategies(): RoutingStrategyHandler[] {
    return [...this.strategies];
  }

  /**
   * Get routing statistics.
   */
  getStats(): { totalRoutes: number; strategyCount: number } {
    return {
      totalRoutes: this.routeCount,
      strategyCount: this.strategies.length,
    };
  }
}
