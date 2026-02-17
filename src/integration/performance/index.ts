/**
 * Performance Optimization Module
 *
 * Phase 3: Classification caching, async processing, batch operations,
 * and metrics collection.
 *
 * @module performance
 */

export { ClassificationCache } from './classification-cache';
export type { CacheStats, ClassificationCacheConfig } from './classification-cache';

export { AsyncProcessor } from './async-processor';
export type {
  AsyncJob,
  JobStatus,
  JobProcessor,
  AsyncProcessorConfig,
  JobEvent,
  JobEventListener,
} from './async-processor';

export { BatchProcessor } from './batch-processor';
export type {
  BatchItem,
  BatchResult,
  SingleProcessor,
  BatchProcessorConfig,
} from './batch-processor';

export { MetricsCollector } from './metrics-collector';
export type {
  MetricPoint,
  AggregatedMetrics,
  PerformanceSnapshot,
} from './metrics-collector';
