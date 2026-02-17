/**
 * Metrics Collector
 *
 * Collects and aggregates performance metrics for the integration system.
 * Tracks classification times, cache hit rates, throughput, and error rates.
 *
 * Part of Phase 3: Performance Optimization.
 *
 * @module performance/metrics-collector
 */

/**
 * A single metric data point.
 */
export interface MetricPoint {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** ISO timestamp */
  timestamp: string;
  /** Optional tags/labels */
  tags: Record<string, string>;
}

/**
 * Aggregated metrics for a time window.
 */
export interface AggregatedMetrics {
  /** Metric name */
  name: string;
  /** Number of data points */
  count: number;
  /** Sum of all values */
  sum: number;
  /** Average value */
  avg: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** P50 (median) value */
  p50: number;
  /** P95 value */
  p95: number;
  /** P99 value */
  p99: number;
  /** Time window start */
  windowStart: string;
  /** Time window end */
  windowEnd: string;
}

/**
 * System-wide performance snapshot.
 */
export interface PerformanceSnapshot {
  /** When the snapshot was taken */
  timestamp: string;
  /** Classification performance */
  classification: {
    avgDurationMs: number;
    p95DurationMs: number;
    totalClassifications: number;
    cacheHitRate: number;
  };
  /** Governance performance */
  governance: {
    avgDecisionTimeMs: number;
    totalDecisions: number;
    blockRate: number;
  };
  /** Audit performance */
  audit: {
    avgWriteTimeMs: number;
    totalEvents: number;
    batchFlushRate: number;
  };
  /** System performance */
  system: {
    uptimeMs: number;
    totalRequests: number;
    errorRate: number;
  };
}

/**
 * MetricsCollector tracks and aggregates performance metrics.
 *
 * Metrics are stored in a sliding window and can be queried
 * for various time ranges.
 */
export class MetricsCollector {
  private readonly metrics: Map<string, MetricPoint[]> = new Map();
  private readonly maxPointsPerMetric: number;
  private readonly startTime: number;
  private totalErrors: number = 0;
  private totalRequests: number = 0;

  constructor(maxPointsPerMetric: number = 10000) {
    this.maxPointsPerMetric = maxPointsPerMetric;
    this.startTime = Date.now();
  }

  /**
   * Record a metric data point.
   *
   * @param name - Metric name (e.g., 'classification.duration')
   * @param value - Metric value
   * @param tags - Optional tags
   */
  record(name: string, value: number, tags: Record<string, string> = {}): void {
    const point: MetricPoint = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const points = this.metrics.get(name)!;
    points.push(point);

    // Trim if exceeds max
    if (points.length > this.maxPointsPerMetric) {
      points.splice(0, points.length - this.maxPointsPerMetric);
    }
  }

  /**
   * Record a request (for throughput tracking).
   */
  recordRequest(): void {
    this.totalRequests++;
  }

  /**
   * Record an error (for error rate tracking).
   */
  recordError(): void {
    this.totalErrors++;
  }

  /**
   * Get aggregated metrics for a named metric within a time window.
   *
   * @param name - Metric name
   * @param windowMs - Time window in milliseconds. Default: last hour
   * @returns Aggregated metrics
   */
  getAggregated(name: string, windowMs: number = 3600000): AggregatedMetrics | null {
    const points = this.metrics.get(name);
    if (!points || points.length === 0) return null;

    const cutoff = Date.now() - windowMs;
    const filtered = points.filter(
      (p) => new Date(p.timestamp).getTime() >= cutoff,
    );

    if (filtered.length === 0) return null;

    const values = filtered.map((p) => p.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);

    return {
      name,
      count: values.length,
      sum,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
      windowStart: new Date(cutoff).toISOString(),
      windowEnd: new Date().toISOString(),
    };
  }

  /**
   * Get a performance snapshot of the entire system.
   */
  getSnapshot(): PerformanceSnapshot {
    const classificationDuration = this.getAggregated('classification.duration');
    const classificationCache = this.getAggregated('classification.cache_hit');
    const governanceDuration = this.getAggregated('governance.decision_time');
    const governanceBlocked = this.getAggregated('governance.blocked');
    const auditWrite = this.getAggregated('audit.write_time');

    return {
      timestamp: new Date().toISOString(),
      classification: {
        avgDurationMs: classificationDuration?.avg ?? 0,
        p95DurationMs: classificationDuration?.p95 ?? 0,
        totalClassifications: classificationDuration?.count ?? 0,
        cacheHitRate: classificationCache?.avg ?? 0,
      },
      governance: {
        avgDecisionTimeMs: governanceDuration?.avg ?? 0,
        totalDecisions: governanceDuration?.count ?? 0,
        blockRate: governanceBlocked?.avg ?? 0,
      },
      audit: {
        avgWriteTimeMs: auditWrite?.avg ?? 0,
        totalEvents: auditWrite?.count ?? 0,
        batchFlushRate: 0,
      },
      system: {
        uptimeMs: Date.now() - this.startTime,
        totalRequests: this.totalRequests,
        errorRate:
          this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0,
      },
    };
  }

  /**
   * Get all metric names.
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear all metrics.
   */
  clear(): void {
    this.metrics.clear();
    this.totalErrors = 0;
    this.totalRequests = 0;
  }

  /**
   * Calculate a percentile from a sorted array.
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }
}
