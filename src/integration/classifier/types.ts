/**
 * Request Classification Types
 *
 * Defines the classification schema for the two-tier hybrid classifier.
 * See ADR-040 for the classification strategy decision.
 *
 * @module classifier/types
 */

/**
 * The type of user request. Determines routing strategy.
 */
export type RequestType =
  | 'qa'              // Simple question/answer
  | 'explanation'     // Explain concept or code
  | 'code-change'     // New feature, refactor, or code modification
  | 'bug-fix'         // Fix a specific bug or error
  | 'architecture'    // Design or architectural decision
  | 'review'          // Code review, security review
  | 'emergency'       // Production incident, critical fix
  | 'devops'          // Infrastructure, deployment, CI/CD
  | 'documentation'   // Write or update docs
  | 'testing'         // Write or run tests
  | 'configuration';  // Config changes, environment setup

/**
 * Complexity level of the request. Influences phase selection.
 */
export type Complexity = 'trivial' | 'simple' | 'medium' | 'complex' | 'epic';

/**
 * Urgency level of the request. Influences priority and routing.
 */
export type Urgency = 'low' | 'normal' | 'high' | 'critical';

/**
 * SDLC phase identifiers.
 */
export type SDLCPhase =
  | 'requirements'
  | 'architecture'
  | 'ux-design'
  | 'implementation'
  | 'security'
  | 'testing'
  | 'deployment'
  | 'acceptance'
  | 'tracking'
  | 'cost-analysis';

/**
 * The complete classification result for a user request.
 */
export interface RequestClassification {
  /** Unique identifier for this classification */
  id: string;
  /** ISO timestamp of classification */
  timestamp: string;
  /** The original user message */
  userMessage: string;
  /** SHA-256 hash of the user message */
  messageHash: string;

  // Classification results
  /** The detected request type */
  type: RequestType;
  /** The assessed complexity */
  complexity: Complexity;
  /** The assessed urgency */
  urgency: Urgency;
  /** Confidence score from 0.0 to 1.0 */
  confidence: number;

  // Routing decisions
  /** Whether this request should go through SDLC governance */
  requiresSDLC: boolean;
  /** Phases that must run for this request */
  requiredPhases: SDLCPhase[];
  /** Phases that are recommended but not mandatory */
  optionalPhases: SDLCPhase[];
  /** Estimated duration as human-readable string */
  estimatedDuration: string;
  /** Estimated token usage */
  estimatedTokens: number;

  // Context
  /** Technologies detected in the request */
  detectedTechnologies: string[];
  /** Files mentioned or affected */
  affectedFiles: string[];
  /** Git context at the time of classification */
  gitContext: GitContext;

  // Classification metadata
  /** Which classifier produced this result */
  classifierUsed: 'llm' | 'rules' | 'hybrid';
  /** Time taken to classify in milliseconds */
  classificationDuration: number;
  /** Names of rules that matched (Tier 1) */
  rulesMatched: string[];
}

/**
 * Git context available during classification.
 */
export interface GitContext {
  branch: string;
  hasUncommittedChanges: boolean;
  isProtectedBranch: boolean;
}

/**
 * A single classification rule for the rule-based classifier.
 */
export interface ClassificationRule {
  /** Unique name for this rule */
  name: string;
  /** Regex pattern to match against the user message */
  pattern: RegExp;
  /** Additional conditions that must all be true */
  conditions: Array<(message: string) => boolean>;
  /** The classification result if this rule matches */
  result: Partial<Pick<RequestClassification, 'type' | 'complexity' | 'urgency' | 'requiresSDLC'>>;
  /** Confidence level for this rule (0.0 to 1.0) */
  confidence: number;
}

/**
 * Result from a single tier of classification.
 */
export interface TierResult {
  type: RequestType;
  complexity: Complexity;
  urgency: Urgency;
  confidence: number;
  requiresSDLC: boolean;
  requiredPhases: SDLCPhase[];
  reasoning?: string;
  rulesMatched?: string[];
}

/**
 * Interface that all classifiers must implement.
 */
export interface Classifier {
  /**
   * Classify a user message.
   * @param message - The user message to classify
   * @param context - Optional context for the classification
   * @returns The tier result
   */
  classify(message: string, context?: ClassificationContext): Promise<TierResult>;
}

/**
 * Context provided to classifiers for more accurate classification.
 */
export interface ClassificationContext {
  /** Current git branch */
  branch?: string;
  /** Whether there are uncommitted changes */
  hasUncommittedChanges?: boolean;
  /** Project type (e.g., 'typescript', 'python') */
  projectType?: string;
  /** Recent conversation context */
  recentContext?: string;
  /** Protected branch names */
  protectedBranches?: string[];
}
