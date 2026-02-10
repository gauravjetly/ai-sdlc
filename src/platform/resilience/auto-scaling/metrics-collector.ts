/**
 * Metrics Collector
 * Collects workload metrics for auto-scaling decisions
 */

import { createLogger } from '../../utils/logger.js';
import { WorkloadMetrics } from '../types.js';

const logger = createLogger('MetricsCollector');

/**
 * Collects and aggregates workload metrics
 */
export class MetricsCollector {
  private metricsCache: Map<string, { metrics: WorkloadMetrics; timestamp: number }> = new Map();
  private cacheTTL: number = 30000; // 30 seconds

  /**
   * Get current metrics for a workload
   */
  async getMetrics(
    application: string,
    namespace: string,
    region: string
  ): Promise<WorkloadMetrics> {
    const cacheKey = `${region}:${namespace}:${application}`;

    // Check cache
    const cached = this.metricsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      logger.debug('Returning cached metrics', {
        application,
        age: `${((Date.now() - cached.timestamp) / 1000).toFixed(1)}s`
      });

      return cached.metrics;
    }

    // Fetch fresh metrics
    logger.debug('Fetching fresh metrics', {
      application,
      namespace,
      region
    });

    const metrics = await this.fetchMetrics(application, namespace, region);

    // Update cache
    this.metricsCache.set(cacheKey, {
      metrics,
      timestamp: Date.now()
    });

    return metrics;
  }

  /**
   * Fetch metrics from monitoring system
   * In production, this would integrate with Prometheus, CloudWatch, etc.
   */
  private async fetchMetrics(
    application: string,
    namespace: string,
    region: string
  ): Promise<WorkloadMetrics> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50));

    // In production, query actual metrics from:
    // - Prometheus
    // - CloudWatch
    // - Azure Monitor
    // - Google Cloud Monitoring

    // For now, generate simulated metrics
    const baseLoad = 0.5 + Math.random() * 0.3; // 50-80% base load

    return {
      cpu: Math.floor(baseLoad * 1000), // millicores (0-1000)
      memory: Math.floor(baseLoad * 1024 * 1024 * 1024), // bytes (0-1GB)
      requests: Math.floor(100 + Math.random() * 900), // 100-1000 req/s
      errorRate: Math.random() * 5, // 0-5% error rate
      latencyP99: 100 + Math.floor(Math.random() * 200), // 100-300ms
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get aggregated metrics over a time period
   */
  async getAggregatedMetrics(
    application: string,
    namespace: string,
    region: string,
    periodSeconds: number = 300 // 5 minutes
  ): Promise<{
    avg: WorkloadMetrics;
    min: WorkloadMetrics;
    max: WorkloadMetrics;
    p95: WorkloadMetrics;
  }> {
    logger.debug('Fetching aggregated metrics', {
      application,
      periodSeconds
    });

    // In production, query time-series data from monitoring system
    // For now, return current metrics as aggregates

    const current = await this.getMetrics(application, namespace, region);

    return {
      avg: current,
      min: { ...current, cpu: current.cpu * 0.7, memory: current.memory * 0.7 },
      max: { ...current, cpu: current.cpu * 1.3, memory: current.memory * 1.3 },
      p95: { ...current, cpu: current.cpu * 1.2, memory: current.memory * 1.2 }
    };
  }

  /**
   * Get custom metrics
   * For custom application metrics (e.g., queue length, business metrics)
   */
  async getCustomMetrics(
    application: string,
    metricName: string,
    namespace: string,
    region: string
  ): Promise<number> {
    logger.debug('Fetching custom metric', {
      application,
      metricName,
      namespace,
      region
    });

    // In production, query custom metrics from monitoring system
    // For now, return simulated value

    return Math.random() * 100;
  }

  /**
   * Clear metrics cache
   */
  clearCache(application?: string): void {
    if (application) {
      // Clear specific application
      for (const [key] of this.metricsCache) {
        if (key.includes(application)) {
          this.metricsCache.delete(key);
        }
      }

      logger.debug('Cache cleared for application', { application });
    } else {
      // Clear all
      this.metricsCache.clear();
      logger.debug('Cache cleared (all)');
    }
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttlMs: number): void {
    logger.info('Cache TTL updated', {
      oldTTL: this.cacheTTL,
      newTTL: ttlMs
    });

    this.cacheTTL = ttlMs;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.metricsCache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp
    }));

    return {
      size: this.metricsCache.size,
      entries
    };
  }
}
