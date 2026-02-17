/**
 * Phase 3: Performance Optimization Tests
 *
 * Tests for classification cache, async processor, batch processor,
 * and metrics collector.
 */

import { ClassificationCache } from '../performance/classification-cache';
import { AsyncProcessor } from '../performance/async-processor';
import { BatchProcessor } from '../performance/batch-processor';
import { MetricsCollector } from '../performance/metrics-collector';

describe('Phase 3: Classification Cache', () => {
  let cache: ClassificationCache<{ type: string; confidence: number }>;

  beforeEach(() => {
    cache = new ClassificationCache({
      maxSize: 10,
      ttlMs: 60000, // 1 minute
    });
  });

  describe('get/set', () => {
    it('should cache and retrieve classification results', () => {
      cache.set('Add authentication', { type: 'code-change', confidence: 0.88 });

      const result = cache.get('Add authentication');

      expect(result).toEqual({ type: 'code-change', confidence: 0.88 });
    });

    it('should return null for cache miss', () => {
      const result = cache.get('Unknown message');

      expect(result).toBeNull();
    });

    it('should use SHA-256 hash for consistent keys', () => {
      const hash1 = cache.hashMessage('test message');
      const hash2 = cache.hashMessage('test message');

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('cache hit from repeated message', () => {
    it('should return cached result for repeated classification', () => {
      const message = 'Add authentication';
      cache.set(message, { type: 'code-change', confidence: 0.88 });

      // Multiple reads should all be cache hits
      for (let i = 0; i < 5; i++) {
        const result = cache.get(message);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('code-change');
      }
    });

    it('should be fast for cache hits (< 10ms)', () => {
      const message = 'Add authentication';
      cache.set(message, { type: 'code-change', confidence: 0.88 });

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        cache.get(message);
      }
      const duration = Date.now() - start;

      // 100 cache lookups should be well under 10ms
      expect(duration).toBeLessThan(10);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      const shortCache = new ClassificationCache<string>({
        maxSize: 10,
        ttlMs: 1, // 1ms TTL
      });

      shortCache.set('test', 'value');

      // Wait for expiration
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Busy wait
      }

      const result = shortCache.get('test');
      expect(result).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when at capacity', () => {
      const smallCache = new ClassificationCache<number>({ maxSize: 3 });

      smallCache.set('msg1', 1);
      smallCache.set('msg2', 2);
      smallCache.set('msg3', 3);

      // Cache is full, adding new entry should evict msg1
      smallCache.set('msg4', 4);

      expect(smallCache.get('msg1')).toBeNull(); // Evicted
      expect(smallCache.get('msg2')).toBe(2);     // Still there
      expect(smallCache.get('msg4')).toBe(4);     // New entry
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('msg1', { type: 'qa', confidence: 0.95 });

      cache.get('msg1');  // Hit
      cache.get('msg1');  // Hit
      cache.get('msg2');  // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
      expect(stats.size).toBe(1);
    });

    it('should track evictions', () => {
      const smallCache = new ClassificationCache<number>({ maxSize: 2 });

      smallCache.set('msg1', 1);
      smallCache.set('msg2', 2);
      smallCache.set('msg3', 3); // Evicts msg1

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
    });
  });

  describe('enable/disable', () => {
    it('should return null when disabled', () => {
      cache.set('msg1', { type: 'qa', confidence: 0.95 });
      cache.setEnabled(false);

      expect(cache.get('msg1')).toBeNull();
    });

    it('should clear cache when disabled', () => {
      cache.set('msg1', { type: 'qa', confidence: 0.95 });
      cache.setEnabled(false);

      expect(cache.getStats().size).toBe(0);
    });
  });
});

describe('Phase 3: Async Processor', () => {
  let processor: AsyncProcessor;

  beforeEach(() => {
    processor = new AsyncProcessor({
      concurrency: 2,
      jobTimeoutMs: 5000,
      maxQueueSize: 50,
    });
  });

  describe('queue and process', () => {
    it('should queue and process a job', async () => {
      processor.registerProcessor<string, string>('classify', async (data) => {
        return `classified: ${data}`;
      });

      const jobId = await processor.queue('classify', 'Add auth');
      const result = await processor.waitForResult<string>(jobId);

      expect(result).toBe('classified: Add auth');
    });

    it('should process multiple jobs concurrently', async () => {
      const order: number[] = [];

      processor.registerProcessor<number, number>('task', async (data) => {
        await new Promise((r) => setTimeout(r, 50));
        order.push(data);
        return data * 2;
      });

      const ids = await Promise.all([
        processor.queue('task', 1),
        processor.queue('task', 2),
        processor.queue('task', 3),
      ]);

      const results = await Promise.all(
        ids.map((id) => processor.waitForResult<number>(id)),
      );

      expect(results).toEqual([2, 4, 6]);
    });

    it('should handle job failures', async () => {
      processor.registerProcessor('failing', async () => {
        throw new Error('Processing failed');
      });

      const jobId = await processor.queue('failing', 'data');

      await expect(processor.waitForResult(jobId)).rejects.toThrow('Processing failed');
    });
  });

  describe('job status', () => {
    it('should track job status transitions', async () => {
      processor.registerProcessor<string, string>('slow', async (data) => {
        await new Promise((r) => setTimeout(r, 100));
        return `done: ${data}`;
      });

      const jobId = await processor.queue('slow', 'test');

      // Should be queued or processing
      const job = processor.getResult(jobId);
      expect(['queued', 'processing']).toContain(job.status);

      // Wait for completion
      await processor.waitForResult(jobId);

      const completed = processor.getResult(jobId);
      expect(completed.status).toBe('completed');
      expect(completed.durationMs).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should reject queue for unregistered processor', async () => {
      await expect(processor.queue('unknown', 'data')).rejects.toThrow('No processor registered');
    });

    it('should reject getResult for unknown job', () => {
      expect(() => processor.getResult('unknown-id')).toThrow('not found');
    });
  });

  describe('events', () => {
    it('should emit job lifecycle events', async () => {
      const events: string[] = [];
      processor.on((event) => events.push(event.type));

      processor.registerProcessor<string, string>('task', async (data) => data);

      const jobId = await processor.queue('task', 'test');
      await processor.waitForResult(jobId);

      expect(events).toContain('queued');
      expect(events).toContain('started');
      expect(events).toContain('completed');
    });
  });

  describe('statistics', () => {
    it('should provide queue statistics', async () => {
      processor.registerProcessor<string, string>('task', async (data) => data);

      await processor.queue('task', 'test1');
      await processor.queue('task', 'test2');

      // Wait for all to complete
      await new Promise((r) => setTimeout(r, 100));

      const stats = processor.getStats();
      expect(stats.totalJobs).toBe(2);
      expect(stats.completed).toBe(2);
    });
  });
});

describe('Phase 3: Batch Processor', () => {
  it('should process a batch of messages', async () => {
    const cache = new ClassificationCache<string>();
    const batch = new BatchProcessor<string>({}, cache);

    const result = await batch.processBatch(
      ['msg1', 'msg2', 'msg3'],
      async (msg) => `classified: ${msg}`,
    );

    expect(result.items.length).toBe(3);
    expect(result.processed).toBe(3);
    expect(result.cacheHits).toBe(0);
    expect(result.items[0].result).toBe('classified: msg1');
  });

  it('should use cache for repeated messages', async () => {
    const cache = new ClassificationCache<string>();
    const batch = new BatchProcessor<string>({}, cache);

    // First batch populates cache
    await batch.processBatch(
      ['msg1', 'msg2'],
      async (msg) => `classified: ${msg}`,
    );

    // Second batch should get cache hits
    const result = await batch.processBatch(
      ['msg1', 'msg2', 'msg3'],
      async (msg) => `classified: ${msg}`,
    );

    expect(result.cacheHits).toBe(2);
    expect(result.processed).toBe(1);
    expect(result.items[0].fromCache).toBe(true);
    expect(result.items[2].fromCache).toBe(false);
  });

  it('should reject batches exceeding max size', async () => {
    const batch = new BatchProcessor<string>({ maxBatchSize: 2 });

    await expect(
      batch.processBatch(['m1', 'm2', 'm3'], async (m) => m),
    ).rejects.toThrow('exceeds maximum');
  });
});

describe('Phase 3: Metrics Collector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  describe('record and aggregate', () => {
    it('should record metric data points', () => {
      metrics.record('classification.duration', 120);
      metrics.record('classification.duration', 80);
      metrics.record('classification.duration', 200);

      const agg = metrics.getAggregated('classification.duration');

      expect(agg).not.toBeNull();
      expect(agg!.count).toBe(3);
      expect(agg!.avg).toBeCloseTo(133.33, 0);
      expect(agg!.min).toBe(80);
      expect(agg!.max).toBe(200);
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.record('latency', i);
      }

      const agg = metrics.getAggregated('latency');

      expect(agg!.p50).toBe(50);
      expect(agg!.p95).toBe(95);
      expect(agg!.p99).toBe(99);
    });
  });

  describe('getSnapshot', () => {
    it('should return a performance snapshot', () => {
      metrics.record('classification.duration', 120);
      metrics.record('governance.decision_time', 5);
      metrics.record('audit.write_time', 2);
      metrics.recordRequest();
      metrics.recordRequest();
      metrics.recordError();

      const snapshot = metrics.getSnapshot();

      expect(snapshot.classification.avgDurationMs).toBe(120);
      expect(snapshot.governance.avgDecisionTimeMs).toBe(5);
      expect(snapshot.system.totalRequests).toBe(2);
      expect(snapshot.system.errorRate).toBe(0.5);
      // uptimeMs can be 0 when constructor and getSnapshot run in the same ms
      expect(snapshot.system.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof snapshot.system.uptimeMs).toBe('number');
    });
  });

  describe('metric names', () => {
    it('should return all recorded metric names', () => {
      metrics.record('metric.a', 1);
      metrics.record('metric.b', 2);

      const names = metrics.getMetricNames();
      expect(names).toContain('metric.a');
      expect(names).toContain('metric.b');
    });
  });
});
