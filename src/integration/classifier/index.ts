/**
 * Request Classifier Module
 *
 * Exports the two-tier hybrid classification system.
 *
 * @module classifier
 */

export { RuleClassifier } from './RuleClassifier';
export { LLMClassifier } from './LLMClassifier';
export type { LLMClassifierOptions, AnthropicClient } from './LLMClassifier';
export { HybridClassifier } from './HybridClassifier';
export type { HybridClassifierOptions } from './HybridClassifier';
export type {
  RequestType,
  Complexity,
  Urgency,
  SDLCPhase,
  RequestClassification,
  GitContext,
  ClassificationRule,
  TierResult,
  Classifier,
  ClassificationContext,
} from './types';
