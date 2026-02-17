/**
 * Hybrid Classifier
 *
 * Combines Tier 1 (rule-based) and Tier 2 (LLM-based) classification.
 * Uses rules for fast, high-confidence decisions and LLM for ambiguous cases.
 *
 * Pipeline:
 * 1. Run Tier 1 (rules) -- always runs, < 50ms
 * 2. If confidence >= threshold (0.9), return immediately
 * 3. If confidence < threshold, run Tier 2 (LLM) -- < 2s
 * 4. Merge results: higher confidence wins, log disagreements
 *
 * See ADR-040 for the classification strategy decision.
 *
 * @module classifier/HybridClassifier
 */

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  Classifier,
  TierResult,
  RequestClassification,
  ClassificationContext,
  GitContext,
} from './types';
import { RuleClassifier } from './RuleClassifier';
import { LLMClassifier, LLMClassifierOptions } from './LLMClassifier';

/**
 * Configuration for the hybrid classifier.
 */
export interface HybridClassifierOptions {
  /** Confidence threshold for Tier 1. Above this, skip Tier 2. Default: 0.9 */
  tier1ConfidenceThreshold?: number;
  /** Whether Tier 1 (rules) is enabled. Default: true */
  tier1Enabled?: boolean;
  /** Whether Tier 2 (LLM) is enabled. Default: true */
  tier2Enabled?: boolean;
  /** LLM classifier options */
  llmOptions?: LLMClassifierOptions;
  /** Cache TTL in milliseconds. Default: 300000 (5 minutes) */
  cacheTTL?: number;
  /** Whether to cache classifications. Default: true */
  cacheEnabled?: boolean;
}

/**
 * A cached classification entry.
 */
interface CacheEntry {
  result: RequestClassification;
  expiresAt: number;
}

/**
 * HybridClassifier orchestrates the two-tier classification pipeline.
 *
 * It always runs Tier 1 first for speed, and only invokes Tier 2 (LLM)
 * when the rule-based confidence is insufficient.
 */
export class HybridClassifier {
  private readonly ruleClassifier: RuleClassifier;
  private readonly llmClassifier: LLMClassifier;
  private readonly tier1Threshold: number;
  private readonly tier1Enabled: boolean;
  private readonly tier2Enabled: boolean;
  private readonly cacheTTL: number;
  private readonly cacheEnabled: boolean;
  private readonly cache: Map<string, CacheEntry>;
  private classificationCount: number;
  private cacheHitCount: number;
  private disagreementCount: number;

  constructor(options: HybridClassifierOptions = {}) {
    this.ruleClassifier = new RuleClassifier();
    this.llmClassifier = new LLMClassifier(options.llmOptions);
    this.tier1Threshold = options.tier1ConfidenceThreshold ?? 0.9;
    this.tier1Enabled = options.tier1Enabled ?? true;
    this.tier2Enabled = options.tier2Enabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 300000; // 5 minutes
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cache = new Map();
    this.classificationCount = 0;
    this.cacheHitCount = 0;
    this.disagreementCount = 0;
  }

  /**
   * Get the underlying LLM classifier (useful for setting mock clients in tests).
   */
  getLLMClassifier(): LLMClassifier {
    return this.llmClassifier;
  }

  /**
   * Get the underlying rule classifier.
   */
  getRuleClassifier(): RuleClassifier {
    return this.ruleClassifier;
  }

  /**
   * Classify a user message through the two-tier pipeline.
   *
   * @param message - The user message to classify
   * @param context - Optional context for classification
   * @returns Full RequestClassification with all metadata
   */
  async classify(
    message: string,
    context?: ClassificationContext,
  ): Promise<RequestClassification> {
    const startTime = Date.now();
    this.classificationCount++;

    const messageHash = this.hashMessage(message);

    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.getCached(messageHash);
      if (cached) {
        this.cacheHitCount++;
        return { ...cached, id: uuidv4(), timestamp: new Date().toISOString() };
      }
    }

    let tier1Result: TierResult | null = null;
    let tier2Result: TierResult | null = null;
    let finalResult: TierResult;
    let classifierUsed: 'rules' | 'llm' | 'hybrid';

    // Tier 1: Rule-based classification (always fast)
    if (this.tier1Enabled) {
      tier1Result = await this.ruleClassifier.classify(message, context);

      // If high confidence, skip Tier 2
      if (tier1Result.confidence >= this.tier1Threshold) {
        finalResult = tier1Result;
        classifierUsed = 'rules';
      } else if (this.tier2Enabled) {
        // Tier 2: LLM classification
        tier2Result = await this.llmClassifier.classify(message, context);
        finalResult = this.mergeResults(tier1Result, tier2Result);
        classifierUsed = 'hybrid';
      } else {
        // Tier 2 disabled, use Tier 1 result as-is
        finalResult = tier1Result;
        classifierUsed = 'rules';
      }
    } else if (this.tier2Enabled) {
      // Tier 1 disabled, only use Tier 2
      tier2Result = await this.llmClassifier.classify(message, context);
      finalResult = tier2Result;
      classifierUsed = 'llm';
    } else {
      // Both tiers disabled -- this should not happen in production
      throw new Error('Both classification tiers are disabled. Enable at least one tier.');
    }

    const duration = Date.now() - startTime;

    const classification = this.buildClassification(
      message,
      messageHash,
      finalResult,
      classifierUsed,
      duration,
      context,
    );

    // Cache the result
    if (this.cacheEnabled) {
      this.setCached(messageHash, classification);
    }

    return classification;
  }

  /**
   * Merge results from Tier 1 and Tier 2.
   * Higher confidence wins for each field.
   * Disagreements are logged.
   */
  private mergeResults(tier1: TierResult, tier2: TierResult): TierResult {
    // Log disagreement if types differ
    if (tier1.type !== tier2.type) {
      this.disagreementCount++;
      console.debug(
        `[HybridClassifier] Tier disagreement: rules="${tier1.type}" (${tier1.confidence.toFixed(2)}) ` +
        `vs LLM="${tier2.type}" (${tier2.confidence.toFixed(2)})`,
      );
    }

    // Higher confidence wins
    if (tier2.confidence > tier1.confidence) {
      return {
        ...tier2,
        rulesMatched: tier1.rulesMatched,
      };
    }

    return tier1;
  }

  /**
   * Build the full RequestClassification from a tier result.
   */
  private buildClassification(
    message: string,
    messageHash: string,
    result: TierResult,
    classifierUsed: 'rules' | 'llm' | 'hybrid',
    duration: number,
    context?: ClassificationContext,
  ): RequestClassification {
    const gitContext: GitContext = {
      branch: context?.branch || 'unknown',
      hasUncommittedChanges: context?.hasUncommittedChanges ?? false,
      isProtectedBranch: this.isProtectedBranch(
        context?.branch,
        context?.protectedBranches,
      ),
    };

    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userMessage: message,
      messageHash,
      type: result.type,
      complexity: result.complexity,
      urgency: result.urgency,
      confidence: result.confidence,
      requiresSDLC: result.requiresSDLC,
      requiredPhases: result.requiredPhases,
      optionalPhases: this.determineOptionalPhases(result),
      estimatedDuration: this.estimateDuration(result),
      estimatedTokens: this.estimateTokens(result),
      detectedTechnologies: this.detectTechnologies(message),
      affectedFiles: this.detectFiles(message),
      gitContext,
      classifierUsed,
      classificationDuration: duration,
      rulesMatched: result.rulesMatched || [],
    };
  }

  /**
   * Determine optional phases based on classification.
   */
  private determineOptionalPhases(result: TierResult): RequestClassification['optionalPhases'] {
    const optional: RequestClassification['optionalPhases'] = [];

    if (result.requiresSDLC) {
      if (!result.requiredPhases.includes('tracking')) {
        optional.push('tracking');
      }
      if (!result.requiredPhases.includes('cost-analysis') && result.complexity !== 'trivial') {
        optional.push('cost-analysis');
      }
    }

    return optional;
  }

  /**
   * Estimate duration based on classification result.
   */
  private estimateDuration(result: TierResult): string {
    if (!result.requiresSDLC) return '5 seconds';

    const durationMap: Record<string, string> = {
      trivial: '1 minute',
      simple: '5 minutes',
      medium: '15 minutes',
      complex: '30 minutes',
      epic: '2 hours',
    };

    if (result.type === 'emergency') return '5 minutes';

    return durationMap[result.complexity] || '15 minutes';
  }

  /**
   * Estimate token usage.
   */
  private estimateTokens(result: TierResult): number {
    if (!result.requiresSDLC) return 500;

    const tokenMap: Record<string, number> = {
      trivial: 1000,
      simple: 5000,
      medium: 15000,
      complex: 45000,
      epic: 100000,
    };

    return tokenMap[result.complexity] || 15000;
  }

  /**
   * Detect technology keywords in the message.
   */
  private detectTechnologies(message: string): string[] {
    const techPatterns: Record<string, RegExp> = {
      TypeScript: /\btypescript|\.ts\b/i,
      JavaScript: /\bjavascript|\.js\b/i,
      React: /\breact|jsx|tsx\b/i,
      Node: /\bnode\.?js|npm|yarn\b/i,
      Python: /\bpython|\.py\b|pip\b/i,
      Docker: /\bdocker|dockerfile|container\b/i,
      PostgreSQL: /\bpostgres|postgresql|pg\b/i,
      Redis: /\bredis\b/i,
      GraphQL: /\bgraphql\b/i,
      REST: /\brest\s+api|restful\b/i,
      AWS: /\baws|s3|ec2|lambda\b/i,
      OAuth: /\boauth|oidc|jwt\b/i,
    };

    const detected: string[] = [];
    for (const [tech, pattern] of Object.entries(techPatterns)) {
      if (pattern.test(message)) {
        detected.push(tech);
      }
    }

    return detected;
  }

  /**
   * Detect file paths mentioned in the message.
   */
  private detectFiles(message: string): string[] {
    const filePattern = /(?:^|\s)((?:[\w.-]+\/)*[\w.-]+\.\w+)(?:\s|$|,|;)/g;
    const files: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = filePattern.exec(message)) !== null) {
      files.push(match[1]);
    }

    return files;
  }

  /**
   * Check if a branch is protected.
   */
  private isProtectedBranch(branch?: string, protectedBranches?: string[]): boolean {
    if (!branch || !protectedBranches) return false;

    return protectedBranches.some((pb) => {
      if (pb.endsWith('*')) {
        return branch.startsWith(pb.slice(0, -1));
      }
      return branch === pb;
    });
  }

  /**
   * Hash a message with SHA-256 for cache keys and registry tracking.
   */
  private hashMessage(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  /**
   * Get a cached classification.
   */
  private getCached(hash: string): RequestClassification | null {
    const entry = this.cache.get(hash);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hash);
      return null;
    }

    return entry.result;
  }

  /**
   * Store a classification in cache.
   */
  private setCached(hash: string, result: RequestClassification): void {
    this.cache.set(hash, {
      result,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Clear the classification cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get classification statistics.
   */
  getStats(): {
    totalClassifications: number;
    cacheHits: number;
    cacheHitRate: number;
    disagreements: number;
    cacheSize: number;
  } {
    return {
      totalClassifications: this.classificationCount,
      cacheHits: this.cacheHitCount,
      cacheHitRate: this.classificationCount > 0
        ? this.cacheHitCount / this.classificationCount
        : 0,
      disagreements: this.disagreementCount,
      cacheSize: this.cache.size,
    };
  }
}
