/**
 * Embedding Service
 *
 * Generates embeddings using OpenAI API with fallback support.
 */

import OpenAI from 'openai';

export interface EmbeddingConfig {
  provider: 'openai' | 'local';
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private config: EmbeddingConfig;

  constructor(config?: EmbeddingConfig) {
    this.config = config || {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
    };

    if (this.config.provider === 'openai') {
      const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('[Embedding] No OpenAI API key provided. Embeddings will fail.');
      } else {
        this.openai = new OpenAI({ apiKey });
      }
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    if (this.config.provider === 'openai') {
      return this.generateOpenAIEmbedding(text);
    }

    throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      throw new Error('Cannot generate embeddings for empty array');
    }

    // Filter out empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error('All texts are empty');
    }

    if (this.config.provider === 'openai') {
      return this.generateOpenAIBatchEmbeddings(validTexts);
    }

    throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Check API key.');
    }

    try {
      const startTime = Date.now();

      const response = await this.openai.embeddings.create({
        model: this.config.model || 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      const duration = Date.now() - startTime;

      console.log(`[Embedding] Generated embedding in ${duration}ms (${response.usage.total_tokens} tokens)`);

      return {
        embedding: response.data[0].embedding,
        model: response.model,
        tokens: response.usage.total_tokens,
      };
    } catch (error) {
      console.error('[Embedding] OpenAI embedding generation failed:', error);

      if (error instanceof Error && 'status' in error) {
        const apiError = error as any;
        if (apiError.status === 401) {
          throw new Error('OpenAI API key is invalid');
        }
        if (apiError.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        }
      }

      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate batch embeddings using OpenAI API
   */
  private async generateOpenAIBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Check API key.');
    }

    try {
      const startTime = Date.now();

      // OpenAI supports up to 2048 inputs per request
      const BATCH_SIZE = 100; // Use smaller batch for safety
      const embeddings: number[][] = [];
      let totalTokens = 0;
      let model = '';

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);

        const response = await this.openai.embeddings.create({
          model: this.config.model || 'text-embedding-3-small',
          input: batch,
          encoding_format: 'float',
        });

        embeddings.push(...response.data.map(d => d.embedding));
        totalTokens += response.usage.total_tokens;
        model = response.model;
      }

      const duration = Date.now() - startTime;

      console.log(`[Embedding] Generated ${embeddings.length} embeddings in ${duration}ms (${totalTokens} tokens)`);

      return {
        embeddings,
        model,
        totalTokens,
      };
    } catch (error) {
      console.error('[Embedding] OpenAI batch embedding generation failed:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize text for embedding
   * Removes excessive whitespace and truncates if needed
   */
  optimizeTextForEmbedding(text: string, maxTokens: number = 8191): string {
    // Remove excessive whitespace
    let optimized = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = optimized.length / 4;

    if (estimatedTokens > maxTokens) {
      // Truncate to approximate token limit
      const maxChars = maxTokens * 4;
      optimized = optimized.substring(0, maxChars) + '...';
      console.warn(`[Embedding] Text truncated to ~${maxTokens} tokens`);
    }

    return optimized;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Validate embedding
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length !== this.config.dimensions) {
      console.warn(`[Embedding] Expected ${this.config.dimensions} dimensions, got ${embedding.length}`);
      return false;
    }

    if (embedding.some(v => typeof v !== 'number' || isNaN(v))) {
      return false;
    }

    return true;
  }
}
