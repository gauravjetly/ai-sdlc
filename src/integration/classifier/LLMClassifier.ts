/**
 * LLM-Based Classifier (Tier 2)
 *
 * Uses Claude API (Haiku model by default) for accurate, context-aware
 * classification when Tier 1 rules lack sufficient confidence.
 * Target: < 2 seconds classification time.
 *
 * See ADR-040 for the two-tier classification strategy.
 *
 * @module classifier/LLMClassifier
 */

import {
  Classifier,
  TierResult,
  RequestType,
  Complexity,
  Urgency,
  SDLCPhase,
  ClassificationContext,
} from './types';

/**
 * The prompt template for LLM classification.
 * Uses structured JSON output for reliable parsing.
 */
const CLASSIFICATION_PROMPT = `You are a request classifier for an AI-powered SDLC platform.

Analyze the following user message and classify it. Consider the context provided.

USER MESSAGE:
{userMessage}

CONTEXT:
- Git branch: {branch}
- Uncommitted changes: {uncommittedChanges}
- Project type: {projectType}
- Recent conversation: {recentContext}

Respond with ONLY this JSON structure (no markdown, no code fences, no explanation):
{
  "type": "one of: qa, explanation, code-change, bug-fix, architecture, review, emergency, devops, documentation, testing, configuration",
  "complexity": "one of: trivial, simple, medium, complex, epic",
  "urgency": "one of: low, normal, high, critical",
  "confidence": 0.85,
  "requiresSDLC": true,
  "requiredPhases": ["implementation", "security", "testing"],
  "reasoning": "brief explanation"
}

CLASSIFICATION RULES:
1. Q&A and explanations NEVER require SDLC
2. Trivial changes (typos, comments, formatting) do NOT require SDLC
3. Any new feature or significant code change REQUIRES SDLC
4. Bug fixes require SDLC unless trivial (one-line fix)
5. Architecture decisions ALWAYS require SDLC
6. Emergency items require SDLC with abbreviated phases
7. If the message mentions "production", "deploy", or "release", increase urgency
8. If complexity is "epic", all phases are required`;

/**
 * Valid request types for runtime validation.
 */
const VALID_TYPES: RequestType[] = [
  'qa', 'explanation', 'code-change', 'bug-fix', 'architecture',
  'review', 'emergency', 'devops', 'documentation', 'testing', 'configuration',
];

const VALID_COMPLEXITY: Complexity[] = ['trivial', 'simple', 'medium', 'complex', 'epic'];
const VALID_URGENCY: Urgency[] = ['low', 'normal', 'high', 'critical'];
const VALID_PHASES: SDLCPhase[] = [
  'requirements', 'architecture', 'ux-design', 'implementation',
  'security', 'testing', 'deployment', 'acceptance', 'tracking', 'cost-analysis',
];

/**
 * Configuration options for the LLM classifier.
 */
export interface LLMClassifierOptions {
  /** Anthropic API key. If not provided, reads from ANTHROPIC_API_KEY env var. */
  apiKey?: string;
  /** Model to use for classification. Default: 'claude-haiku-4-5-20250514' */
  model?: string;
  /** Maximum tokens in the response. Default: 500 */
  maxTokens?: number;
  /** Timeout in milliseconds. Default: 5000 */
  timeout?: number;
}

/**
 * Interface for the Anthropic API client (to allow mocking in tests).
 */
export interface AnthropicClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    }): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

/**
 * LLMClassifier uses Claude API for accurate, context-aware classification.
 *
 * This is Tier 2 of the hybrid classification pipeline.
 * It provides higher accuracy than rules alone at the cost of 1-2 seconds latency.
 * Only invoked when Tier 1 confidence is below the threshold.
 */
export class LLMClassifier implements Classifier {
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly timeout: number;
  private client: AnthropicClient | null;
  private readonly apiKey: string | undefined;

  constructor(options: LLMClassifierOptions = {}) {
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = options.model || 'claude-haiku-4-5-20250514';
    this.maxTokens = options.maxTokens || 500;
    this.timeout = options.timeout || 5000;
    this.client = null;
  }

  /**
   * Set a custom API client (useful for testing with mocks).
   */
  setClient(client: AnthropicClient): void {
    this.client = client;
  }

  /**
   * Get or lazily create the Anthropic client.
   */
  private async getClient(): Promise<AnthropicClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.apiKey) {
      throw new Error(
        'LLMClassifier requires an Anthropic API key. ' +
        'Set ANTHROPIC_API_KEY environment variable or pass apiKey option.',
      );
    }

    // Dynamic import to avoid requiring the SDK at module load time
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.client = new Anthropic({ apiKey: this.apiKey }) as unknown as AnthropicClient;
      return this.client;
    } catch {
      throw new Error(
        'Failed to load @anthropic-ai/sdk. Install it with: npm install @anthropic-ai/sdk',
      );
    }
  }

  /**
   * Classify a user message using the LLM.
   *
   * @param message - The user message to classify
   * @param context - Optional context for more accurate classification
   * @returns TierResult with classification and confidence
   */
  async classify(message: string, context?: ClassificationContext): Promise<TierResult> {
    const prompt = this.buildPrompt(message, context);

    try {
      const client = await this.getClient();

      const response = await Promise.race([
        client.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
        this.createTimeout(),
      ]);

      const text = this.extractText(response);
      return this.parseResponse(text);
    } catch (error) {
      // On any LLM error, return a low-confidence fallback
      return this.fallbackClassification(message, error);
    }
  }

  /**
   * Build the classification prompt with context interpolation.
   */
  private buildPrompt(message: string, context?: ClassificationContext): string {
    return CLASSIFICATION_PROMPT
      .replace('{userMessage}', message)
      .replace('{branch}', context?.branch || 'unknown')
      .replace('{uncommittedChanges}', String(context?.hasUncommittedChanges ?? 'unknown'))
      .replace('{projectType}', context?.projectType || 'unknown')
      .replace('{recentContext}', context?.recentContext || 'none');
  }

  /**
   * Create a timeout promise for the API call.
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`LLM classification timed out after ${this.timeout}ms`)), this.timeout);
    });
  }

  /**
   * Extract text content from the API response.
   */
  private extractText(response: { content: Array<{ type: string; text?: string }> }): string {
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || !textBlock.text) {
      throw new Error('No text content in LLM response');
    }
    return textBlock.text.trim();
  }

  /**
   * Parse and validate the JSON response from the LLM.
   */
  private parseResponse(text: string): TierResult {
    // Strip potential markdown code fences
    let jsonText = text;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${text.slice(0, 200)}`);
    }

    // Validate and coerce fields
    const type = this.validateEnum(parsed.type, VALID_TYPES, 'code-change') as RequestType;
    const complexity = this.validateEnum(parsed.complexity, VALID_COMPLEXITY, 'medium') as Complexity;
    const urgency = this.validateEnum(parsed.urgency, VALID_URGENCY, 'normal') as Urgency;
    const confidence = this.validateNumber(parsed.confidence, 0, 1, 0.7);
    const requiresSDLC = typeof parsed.requiresSDLC === 'boolean' ? parsed.requiresSDLC : true;
    const requiredPhases = this.validatePhases(parsed.requiredPhases);
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined;

    return {
      type,
      complexity,
      urgency,
      confidence,
      requiresSDLC,
      requiredPhases,
      reasoning,
    };
  }

  /**
   * Validate a value is one of the allowed enum values.
   */
  private validateEnum<T>(value: unknown, valid: T[], fallback: T): T {
    if (typeof value === 'string' && (valid as unknown[]).includes(value)) {
      return value as T;
    }
    return fallback;
  }

  /**
   * Validate a number is within a range.
   */
  private validateNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value === 'number' && value >= min && value <= max) {
      return value;
    }
    return fallback;
  }

  /**
   * Validate and filter SDLC phases.
   */
  private validatePhases(value: unknown): SDLCPhase[] {
    if (!Array.isArray(value)) return ['implementation'];
    return value.filter((v) => VALID_PHASES.includes(v as SDLCPhase)) as SDLCPhase[];
  }

  /**
   * Fallback classification when the LLM call fails.
   */
  private fallbackClassification(message: string, error: unknown): TierResult {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[LLMClassifier] LLM classification failed: ${errorMsg}. Using fallback.`);

    // Use basic heuristics for the fallback
    const hasQuestion = message.includes('?');
    const isShort = message.length < 80;

    if (hasQuestion && isShort) {
      return {
        type: 'qa',
        complexity: 'trivial',
        urgency: 'low',
        confidence: 0.30,
        requiresSDLC: false,
        requiredPhases: [],
        reasoning: `LLM fallback due to error: ${errorMsg}`,
      };
    }

    return {
      type: 'code-change',
      complexity: 'medium',
      urgency: 'normal',
      confidence: 0.30,
      requiresSDLC: true,
      requiredPhases: ['implementation', 'security', 'testing'],
      reasoning: `LLM fallback due to error: ${errorMsg}`,
    };
  }
}
