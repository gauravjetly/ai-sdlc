/**
 * Batch Processor
 *
 * Processes multiple classification requests in a single batch
 * for improved throughput. Uses the classification cache to avoid
 * redundant processing.
 *
 * Part of Phase 3: Performance Optimization.
 *
 * @module performance/batch-processor
 */

import { ClassificationCache } from './classification-cache';

/**
 * A single item in a batch classification request.
 */
export interface BatchItem<T = unknown> {
  /** Unique identifier for this item */
  id: string;
  /** The input message */
  message: string;
  /** The classification result (populated after processing) */
  result: T | null;
  /** Whether this result came from cache */
  fromCache: boolean;
  /** Processing time in ms */
  durationMs: number;
}

/**
 * Result of a batch classification.
 */
export interface BatchResult<T = unknown> {
  /** All batch items with results */
  items: BatchItem<T>[];
  /** Number of cache hits */
  cacheHits: number;
  /** Number of items processed (not from cache) */
  processed: number;
  /** Total processing time in ms */
  totalDurationMs: number;
  /** Average processing time per item in ms */
  avgDurationMs: number;
}

/**
 * Function that processes a single message and returns a result.
 */
export type SingleProcessor<T> = (message: string) => Promise<T>;

/**
 * Configuration for the batch processor.
 */
export interface BatchProcessorConfig {
  /** Maximum batch size. Default: 20 */
  maxBatchSize?: number;
  /** Whether to use caching. Default: true */
  useCache?: boolean;
  /** Concurrency for parallel processing within batch. Default: 5 */
  concurrency?: number;
}

const DEFAULT_MAX_BATCH_SIZE = 20;
const DEFAULT_CONCURRENCY = 5;

/**
 * BatchProcessor handles batch classification with caching support.
 *
 * Features:
 * - Process multiple messages in a single call
 * - Cache integration (skip already-classified messages)
 * - Controlled concurrency within batch
 * - Per-item timing and cache hit tracking
 */
export class BatchProcessor<T = unknown> {
  private readonly cache: ClassificationCache<T> | null;
  private readonly maxBatchSize: number;
  private readonly concurrency: number;

  constructor(
    config: BatchProcessorConfig = {},
    cache?: ClassificationCache<T>,
  ) {
    this.maxBatchSize = config.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;
    this.concurrency = config.concurrency ?? DEFAULT_CONCURRENCY;
    this.cache = config.useCache !== false && cache ? cache : null;
  }

  /**
   * Process a batch of messages using the provided processor function.
   *
   * @param messages - Array of messages to process
   * @param processor - Function to process each message
   * @returns Batch result with all items
   */
  async processBatch(
    messages: string[],
    processor: SingleProcessor<T>,
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();

    if (messages.length > this.maxBatchSize) {
      throw new Error(
        `Batch size ${messages.length} exceeds maximum ${this.maxBatchSize}`,
      );
    }

    // Build batch items
    const items: BatchItem<T>[] = messages.map((message, index) => ({
      id: `batch-${index}`,
      message,
      result: null,
      fromCache: false,
      durationMs: 0,
    }));

    let cacheHits = 0;
    const toProcess: BatchItem<T>[] = [];

    // Check cache first
    for (const item of items) {
      if (this.cache) {
        const cached = this.cache.get(item.message);
        if (cached !== null) {
          item.result = cached;
          item.fromCache = true;
          item.durationMs = 0;
          cacheHits++;
          continue;
        }
      }
      toProcess.push(item);
    }

    // Process uncached items with controlled concurrency
    if (toProcess.length > 0) {
      await this.processWithConcurrency(toProcess, processor);
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      items,
      cacheHits,
      processed: toProcess.length,
      totalDurationMs,
      avgDurationMs: items.length > 0 ? totalDurationMs / items.length : 0,
    };
  }

  /**
   * Process items with controlled concurrency.
   */
  private async processWithConcurrency(
    items: BatchItem<T>[],
    processor: SingleProcessor<T>,
  ): Promise<void> {
    const chunks = this.chunk(items, this.concurrency);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item) => {
          const itemStart = Date.now();
          try {
            const result = await processor(item.message);
            item.result = result;
            item.durationMs = Date.now() - itemStart;

            // Cache the result
            if (this.cache) {
              this.cache.set(item.message, result);
            }
          } catch (error) {
            item.durationMs = Date.now() - itemStart;
            // Item result remains null on failure
          }
        }),
      );
    }
  }

  /**
   * Split an array into chunks of a given size.
   */
  private chunk<U>(array: U[], size: number): U[][] {
    const chunks: U[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
