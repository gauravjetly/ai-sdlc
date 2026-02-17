/**
 * Rule-Based Classifier (Tier 1)
 *
 * Fast, deterministic classification using regex patterns and heuristics.
 * Target: < 50ms classification time.
 *
 * See ADR-040 for the two-tier classification strategy.
 *
 * @module classifier/RuleClassifier
 */

import {
  Classifier,
  ClassificationRule,
  TierResult,
  RequestType,
  Complexity,
  Urgency,
  SDLCPhase,
  ClassificationContext,
} from './types';

/**
 * Built-in classification rules ordered by priority.
 * Rules are evaluated in order; the first high-confidence match wins.
 */
const DEFAULT_RULES: ClassificationRule[] = [
  // Emergency patterns -- highest priority
  {
    name: 'production-emergency',
    pattern: /\b(urgent|critical|production\s+\w*\s*down|outage|500\s+error|crash|data\s+loss|security\s+breach|p0|pager|incident)\b/i,
    conditions: [],
    result: { type: 'emergency', urgency: 'critical', requiresSDLC: true },
    confidence: 0.95,
  },

  // Trivial changes -- must be checked before generic fix/bug patterns
  {
    name: 'trivial-fix',
    pattern: /\b(fix\s+(the\s+)?typo|update\s+(the\s+)?readme|fix\s+(the\s+)?spelling|rename\b|update\s+(the\s+)?comment|fix\s+(the\s+)?whitespace|fix\s+(the\s+)?formatting|add\s+(a\s+)?comment)\b/i,
    conditions: [(msg) => msg.length < 120],
    result: { type: 'code-change', complexity: 'trivial', requiresSDLC: false },
    confidence: 0.92,
  },

  // Review patterns -- must be checked before generic code patterns
  {
    name: 'review-request',
    pattern: /\b(review|audit)\s+(the\s+)?(code|security|performance|implementation|pull\s+request|pr|diff|auth|module)\b/i,
    conditions: [],
    result: { type: 'review', complexity: 'medium', requiresSDLC: true },
    confidence: 0.88,
  },

  // Q&A patterns
  {
    name: 'simple-question',
    pattern: /^(what|why|when|where|who|can you explain|tell me about|describe|what's|whats)\s/i,
    conditions: [
      (msg) => msg.length < 200,
      (msg) => !msg.match(/\b(add|create|implement|build|fix|deploy|write)\b/i),
    ],
    result: { type: 'qa', complexity: 'trivial', requiresSDLC: false },
    confidence: 0.85,
  },
  {
    name: 'explanation-request',
    pattern: /\b(explain|walk me through|how does|what does|what is|clarify|elaborate)\b/i,
    conditions: [
      (msg) => msg.length < 300,
      (msg) => !msg.match(/\b(then (add|create|implement|fix|change))\b/i),
    ],
    result: { type: 'explanation', complexity: 'trivial', requiresSDLC: false },
    confidence: 0.85,
  },
  // "How" questions that are not "how does" (those are explanation)
  {
    name: 'how-question',
    pattern: /^how\s/i,
    conditions: [
      (msg) => msg.length < 200,
      (msg) => msg.endsWith('?') || msg.includes('?'),
      (msg) => !msg.match(/\b(add|create|implement|build|fix|deploy|write)\b/i),
    ],
    result: { type: 'qa', complexity: 'trivial', requiresSDLC: false },
    confidence: 0.83,
  },

  // Documentation patterns
  {
    name: 'documentation-request',
    pattern: /\b(write\s+docs|write\s+documentation|update\s+documentation|add\s+jsdoc|document\s+the|create\s+readme|write\s+a\s+guide)\b/i,
    conditions: [],
    result: { type: 'documentation', complexity: 'simple', requiresSDLC: false },
    confidence: 0.85,
  },

  // Architecture patterns
  {
    name: 'architecture-request',
    pattern: /\b(design\s+a|architect|choose\s+between|evaluate\s+(the\s+)?tech|compare|tech\s+stack|system\s+design|scalab|microservice|monolith|event.driven|cqrs|ddd)\b/i,
    conditions: [],
    result: { type: 'architecture', complexity: 'complex', requiresSDLC: true },
    confidence: 0.82,
  },

  // New feature / code generation patterns
  {
    name: 'new-feature',
    pattern: /\b(add|build|create|implement|develop)\s+(a\s+)?(new\s+)?(user\s+)?(\w+\s+)?(feature|component|service|api|endpoint|module|system|page|function|class|interface|authentication|auth)\b/i,
    conditions: [],
    result: { type: 'code-change', complexity: 'medium', requiresSDLC: true },
    confidence: 0.82,
  },

  // Bug fix patterns
  {
    name: 'bug-fix-simple',
    pattern: /\b(fix|resolve|debug|broken|not\s+working|error|bug|issue|null\s+pointer|exception)\b/i,
    conditions: [(msg) => msg.length < 150],
    result: { type: 'bug-fix', complexity: 'simple', requiresSDLC: false },
    confidence: 0.75,
  },
  {
    name: 'bug-fix-complex',
    pattern: /\b(fix|resolve|debug|broken|not\s+working|error|bug|issue)\b/i,
    conditions: [(msg) => msg.length >= 150],
    result: { type: 'bug-fix', complexity: 'medium', requiresSDLC: true },
    confidence: 0.72,
  },

  // Testing patterns
  {
    name: 'testing-request',
    pattern: /\b(write\s+tests?|add\s+tests?|test\s+coverage|unit\s+test|integration\s+test|e2e\s+test|run\s+tests?)\b/i,
    conditions: [],
    result: { type: 'testing', complexity: 'simple', requiresSDLC: false },
    confidence: 0.82,
  },

  // DevOps patterns
  {
    name: 'devops-request',
    pattern: /\b(deploy|ci\/cd|pipeline|docker|kubernetes|terraform|infrastructure|helm|ansible|github\s+actions)\b/i,
    conditions: [],
    result: { type: 'devops', complexity: 'medium', requiresSDLC: true },
    confidence: 0.78,
  },

  // Configuration patterns
  {
    name: 'configuration-request',
    pattern: /\b(configure|config|settings|environment|env\s+var|\.env|setup|install|initialize)\b/i,
    conditions: [(msg) => msg.length < 200],
    result: { type: 'configuration', complexity: 'simple', requiresSDLC: false },
    confidence: 0.75,
  },

  // Generic code change (catch-all for code requests)
  {
    name: 'generic-code-change',
    pattern: /\b(refactor|modify|change|update|improve|optimize|rewrite|migrate|convert|replace)\b/i,
    conditions: [],
    result: { type: 'code-change', complexity: 'medium', requiresSDLC: true },
    confidence: 0.65,
  },
];

/**
 * Determine required SDLC phases based on type and complexity.
 */
function determinePhases(type: RequestType, complexity: Complexity): SDLCPhase[] {
  const phaseMap: Record<RequestType, Record<string, SDLCPhase[]>> = {
    'qa': { default: [] },
    'explanation': { default: [] },
    'code-change': {
      trivial: ['implementation'],
      simple: ['implementation', 'testing'],
      medium: ['requirements', 'implementation', 'security', 'testing'],
      complex: ['requirements', 'architecture', 'implementation', 'security', 'testing'],
      epic: ['requirements', 'architecture', 'implementation', 'security', 'testing', 'acceptance', 'cost-analysis'],
    },
    'bug-fix': {
      trivial: ['implementation'],
      simple: ['implementation', 'testing'],
      medium: ['implementation', 'security', 'testing'],
      complex: ['implementation', 'security', 'testing', 'acceptance'],
      epic: ['requirements', 'implementation', 'security', 'testing', 'acceptance'],
    },
    'architecture': {
      default: ['requirements', 'architecture', 'security'],
    },
    'review': {
      default: ['security', 'testing'],
    },
    'emergency': {
      default: ['implementation', 'testing'],
    },
    'devops': {
      default: ['implementation', 'security', 'deployment'],
    },
    'documentation': {
      default: ['implementation'],
    },
    'testing': {
      default: ['implementation', 'testing'],
    },
    'configuration': {
      default: ['implementation', 'security'],
    },
  };

  const typePhases = phaseMap[type];
  return typePhases[complexity] || typePhases['default'] || ['implementation'];
}

/**
 * RuleClassifier performs fast, deterministic classification using pattern matching.
 *
 * This is Tier 1 of the hybrid classification pipeline.
 * It runs in under 50ms and handles obvious patterns with high confidence.
 * When confidence is below the threshold (0.9), the result is passed to
 * the LLM classifier (Tier 2) for refinement.
 */
export class RuleClassifier implements Classifier {
  private readonly rules: ClassificationRule[];

  constructor(customRules?: ClassificationRule[]) {
    this.rules = customRules || DEFAULT_RULES;
  }

  /**
   * Classify a user message using rule-based heuristics.
   *
   * @param message - The user message to classify
   * @param context - Optional context (branch, project type, etc.)
   * @returns TierResult with classification and confidence
   */
  async classify(message: string, context?: ClassificationContext): Promise<TierResult> {
    const trimmed = message.trim();

    // Quick heuristics before running rules
    const quickResult = this.quickHeuristics(trimmed);
    if (quickResult && quickResult.confidence >= 0.9) {
      return quickResult;
    }

    // Run all rules and collect matches
    const matches: Array<{ rule: ClassificationRule; confidence: number }> = [];

    for (const rule of this.rules) {
      if (rule.pattern.test(trimmed)) {
        // Check additional conditions
        const conditionsMet = rule.conditions.every((cond) => {
          try {
            return cond(trimmed);
          } catch {
            return false;
          }
        });

        if (conditionsMet) {
          // Adjust confidence based on context
          let adjustedConfidence = rule.confidence;
          adjustedConfidence = this.adjustForContext(adjustedConfidence, rule, context);

          matches.push({ rule, confidence: adjustedConfidence });
        }
      }
    }

    // If no matches, return a low-confidence generic classification
    if (matches.length === 0) {
      return this.defaultClassification(trimmed);
    }

    // Sort by confidence descending and take the best match
    matches.sort((a, b) => b.confidence - a.confidence);
    const best = matches[0];

    const type = best.rule.result.type || 'code-change';
    const complexity = best.rule.result.complexity || this.assessComplexity(trimmed);
    const urgency = best.rule.result.urgency || 'normal';
    const requiresSDLC = best.rule.result.requiresSDLC !== undefined
      ? best.rule.result.requiresSDLC
      : complexity !== 'trivial';

    return {
      type,
      complexity,
      urgency,
      confidence: best.confidence,
      requiresSDLC,
      requiredPhases: requiresSDLC ? determinePhases(type, complexity) : [],
      rulesMatched: matches.map((m) => m.rule.name),
    };
  }

  /**
   * Quick heuristic checks that do not require full rule evaluation.
   */
  private quickHeuristics(message: string): TierResult | null {
    // Very short messages are likely trivial
    if (message.length < 10 && message.endsWith('?')) {
      return {
        type: 'qa',
        complexity: 'trivial',
        urgency: 'low',
        confidence: 0.90,
        requiresSDLC: false,
        requiredPhases: [],
        rulesMatched: ['quick-short-question'],
      };
    }

    // Single word that looks like a question
    if (message.split(/\s+/).length <= 3 && message.endsWith('?')) {
      return {
        type: 'qa',
        complexity: 'trivial',
        urgency: 'low',
        confidence: 0.88,
        requiresSDLC: false,
        requiredPhases: [],
        rulesMatched: ['quick-single-word-question'],
      };
    }

    return null;
  }

  /**
   * Adjust confidence based on additional context.
   */
  private adjustForContext(
    confidence: number,
    rule: ClassificationRule,
    context?: ClassificationContext,
  ): number {
    if (!context) return confidence;

    let adjusted = confidence;

    // If on a protected branch, increase SDLC requirement confidence
    if (
      context.protectedBranches &&
      context.branch &&
      context.protectedBranches.includes(context.branch)
    ) {
      if (rule.result.requiresSDLC) {
        adjusted = Math.min(1.0, adjusted + 0.05);
      }
    }

    // If there are uncommitted changes, code-change confidence increases
    if (context.hasUncommittedChanges && rule.result.type === 'code-change') {
      adjusted = Math.min(1.0, adjusted + 0.03);
    }

    return adjusted;
  }

  /**
   * Assess complexity from message length and keyword density.
   */
  private assessComplexity(message: string): Complexity {
    const wordCount = message.split(/\s+/).length;
    const hasMultipleRequirements = (message.match(/\b(and|also|plus|with|including)\b/gi) || []).length;

    if (wordCount < 10) return 'trivial';
    if (wordCount < 25 && hasMultipleRequirements < 2) return 'simple';
    if (wordCount < 60 && hasMultipleRequirements < 3) return 'medium';
    if (wordCount < 120) return 'complex';
    return 'epic';
  }

  /**
   * Default classification when no rules match.
   */
  private defaultClassification(message: string): TierResult {
    const complexity = this.assessComplexity(message);
    const hasQuestionMark = message.includes('?');
    const hasCodeKeywords = /\b(code|function|class|variable|module|import|export|interface|type)\b/i.test(message);

    if (hasQuestionMark && !hasCodeKeywords) {
      return {
        type: 'qa',
        complexity: 'trivial',
        urgency: 'low',
        confidence: 0.50,
        requiresSDLC: false,
        requiredPhases: [],
        rulesMatched: ['default-question-fallback'],
      };
    }

    return {
      type: 'code-change',
      complexity,
      urgency: 'normal',
      confidence: 0.40,
      requiresSDLC: complexity !== 'trivial',
      requiredPhases: complexity !== 'trivial' ? determinePhases('code-change', complexity) : [],
      rulesMatched: ['default-fallback'],
    };
  }

  /**
   * Get the list of rules (useful for debugging and testing).
   */
  getRules(): ClassificationRule[] {
    return [...this.rules];
  }
}
