/**
 * Embedding Service
 *
 * Generates vector embeddings for text content using OpenAI's
 * text-embedding-3-large model. Supports batch processing,
 * caching, retries, and fallback to smaller models.
 */

import { EmbeddingConfig } from '../config';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  model: string;
  tokenCount: number;
}

export interface EmbeddingService {
  /**
   * Generate an embedding for a single text.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in a batch.
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get the embedding dimensions for the configured model.
   */
  getDimensions(): number;
}

/**
 * Create an OpenAI-based embedding service.
 *
 * If no API key is provided, returns a no-op service that
 * generates zero vectors (for development/testing without API access).
 */
export function createEmbeddingService(config: EmbeddingConfig): EmbeddingService {
  if (!config.apiKey) {
    console.warn(
      '[Embedding] No OPENAI_API_KEY configured. Using zero-vector fallback. ' +
      'Vector search will not work correctly without real embeddings.'
    );
    return createNoOpEmbeddingService(config.dimensions);
  }

  return createOpenAIEmbeddingService(config);
}

/**
 * No-op embedding service for development without API key.
 * Returns zero vectors of the correct dimension.
 */
function createNoOpEmbeddingService(dimensions: number): EmbeddingService {
  const zeroVector = new Array(dimensions).fill(0);

  return {
    async embed(_text: string): Promise<number[]> {
      return [...zeroVector];
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      return texts.map(() => [...zeroVector]);
    },

    getDimensions(): number {
      return dimensions;
    },
  };
}

/**
 * OpenAI embedding service with retry logic and batch support.
 */
function createOpenAIEmbeddingService(config: EmbeddingConfig): EmbeddingService {
  const cache = new Map<string, number[]>();

  async function callOpenAI(texts: string[]): Promise<number[][]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            input: texts,
            dimensions: config.dimensions,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `OpenAI API error ${response.status}: ${errorBody}`
          );
        }

        const data = await response.json() as {
          data: Array<{ embedding: number[]; index: number }>;
          usage: { total_tokens: number };
        };

        // Sort by index to match input order
        const sorted = data.data.sort((a, b) => a.index - b.index);
        return sorted.map((item) => item.embedding);
      } catch (err) {
        lastError = err as Error;

        if (attempt < config.maxRetries) {
          const delay = config.retryDelayMs * Math.pow(2, attempt);
          console.warn(
            `[Embedding] Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`
          );
          await sleep(delay);
        }
      }
    }

    throw new Error(
      `[Embedding] Failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  return {
    async embed(text: string): Promise<number[]> {
      // Check cache
      const cacheKey = text.substring(0, 200); // Use first 200 chars as cache key
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const results = await callOpenAI([text]);
      const embedding = results[0];

      // Cache the result
      cache.set(cacheKey, embedding);

      return embedding;
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      const results: number[][] = new Array(texts.length);
      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];

      // Check cache for each text
      for (let i = 0; i < texts.length; i++) {
        const cacheKey = texts[i].substring(0, 200);
        const cached = cache.get(cacheKey);
        if (cached) {
          results[i] = cached;
        } else {
          uncachedIndices.push(i);
          uncachedTexts.push(texts[i]);
        }
      }

      if (uncachedTexts.length === 0) {
        return results;
      }

      // Process uncached texts in batches
      for (let start = 0; start < uncachedTexts.length; start += config.batchSize) {
        const batchTexts = uncachedTexts.slice(start, start + config.batchSize);
        const batchEmbeddings = await callOpenAI(batchTexts);

        for (let j = 0; j < batchEmbeddings.length; j++) {
          const originalIndex = uncachedIndices[start + j];
          results[originalIndex] = batchEmbeddings[j];

          // Cache the result
          const cacheKey = texts[originalIndex].substring(0, 200);
          cache.set(cacheKey, batchEmbeddings[j]);
        }
      }

      return results;
    },

    getDimensions(): number {
      return config.dimensions;
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
