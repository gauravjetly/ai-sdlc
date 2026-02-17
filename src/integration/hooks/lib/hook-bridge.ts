/**
 * Hook Bridge
 *
 * Bridges Claude Code hooks to the Phase 1 integration components
 * (classifier, router, governance engine). Provides a single entry
 * point for hooks to classify, route, and apply governance to messages.
 *
 * Designed for minimal latency -- uses the HybridClassifier's fast
 * Tier 1 path for obvious patterns and only invokes Tier 2 (LLM)
 * when confidence is insufficient.
 *
 * @module hooks/lib/hook-bridge
 */

import { HybridClassifier } from '../../classifier';
import { SmartRouter } from '../../router';
import { GovernanceEngine } from '../../governance';
import { RequestClassification, ClassificationContext } from '../../classifier/types';
import { RoutingDecision } from '../../router/types';
import { GovernanceDecision, GovernanceLevel } from '../../governance/types';
import { loadHookConfig, HookConfig } from './config-loader';

/**
 * Complete result from hook bridge processing.
 */
export interface HookBridgeResult {
  classification: RequestClassification;
  route: RoutingDecision;
  governance: GovernanceDecision;
  shouldRoute: boolean;
  processingTime: number;
}

/**
 * HookBridge connects Claude Code hooks to the Phase 1 integration components.
 */
export class HookBridge {
  private classifier: HybridClassifier;
  private router: SmartRouter;
  private governanceEngine: GovernanceEngine;
  private config: HookConfig;

  constructor(config?: HookConfig) {
    this.config = config || loadHookConfig();

    this.classifier = new HybridClassifier({
      tier1Enabled: this.config.classification.tier1Enabled,
      tier2Enabled: this.config.classification.tier2Enabled,
      tier1ConfidenceThreshold: this.config.classification.confidenceThreshold >= 0.9
        ? this.config.classification.confidenceThreshold
        : 0.9,
      cacheTTL: 300000,
      cacheEnabled: true,
    });

    this.router = new SmartRouter();

    this.governanceEngine = new GovernanceEngine({
      level: this.config.governance.level,
    });
  }

  /**
   * Process a user message through the full classification/routing/governance pipeline.
   *
   * @param message - The user message
   * @param context - Optional classification context (git info, etc.)
   * @returns HookBridgeResult with classification, routing, and governance decisions
   */
  async process(
    message: string,
    context?: ClassificationContext,
  ): Promise<HookBridgeResult> {
    const startTime = Date.now();

    // Step 1: Classify the message
    const classification = await this.classifier.classify(message, context);

    // Step 2: Route based on classification
    const route = this.router.route(classification, this.config.governance.level);

    // Step 3: Apply governance
    const governance = this.governanceEngine.evaluate(
      classification,
      context?.branch,
    );

    const processingTime = Date.now() - startTime;

    // Determine if we should route through SDLC
    const shouldRoute = classification.requiresSDLC
      && route.strategy !== 'passthrough'
      && governance.allowed;

    return {
      classification,
      route,
      governance,
      shouldRoute,
      processingTime,
    };
  }

  /**
   * Quick classify-only pass (for monitoring/logging without routing).
   */
  async classifyOnly(
    message: string,
    context?: ClassificationContext,
  ): Promise<RequestClassification> {
    return this.classifier.classify(message, context);
  }

  /**
   * Get the current governance level.
   */
  getGovernanceLevel(): GovernanceLevel {
    return this.governanceEngine.getLevel();
  }

  /**
   * Set the governance level.
   */
  setGovernanceLevel(level: GovernanceLevel): { previous: GovernanceLevel; current: GovernanceLevel } {
    return this.governanceEngine.setLevel(level);
  }

  /**
   * Get combined statistics from all components.
   */
  getStats(): {
    classifier: ReturnType<HybridClassifier['getStats']>;
    router: ReturnType<SmartRouter['getStats']>;
    governance: ReturnType<GovernanceEngine['getStats']>;
  } {
    return {
      classifier: this.classifier.getStats(),
      router: this.router.getStats(),
      governance: this.governanceEngine.getStats(),
    };
  }

  /**
   * Clear the classification cache.
   */
  clearCache(): void {
    this.classifier.clearCache();
  }
}

/**
 * Singleton instance for hook use.
 * Hooks are invoked as separate processes, so this is per-invocation.
 */
let bridgeInstance: HookBridge | null = null;

/**
 * Get or create the singleton HookBridge instance.
 */
export function getHookBridge(config?: HookConfig): HookBridge {
  if (!bridgeInstance) {
    bridgeInstance = new HookBridge(config);
  }
  return bridgeInstance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetHookBridge(): void {
  bridgeInstance = null;
}
