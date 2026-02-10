/**
 * Memory Leak Detector
 * Detects memory leaks through trend analysis
 */

import { createLogger } from '../../utils/logger.js';
import { Issue, IssueType, IssueSeverity, DetectorConfig } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('MemoryLeakDetector');

export interface MemoryMetrics {
  podName: string;
  namespace: string;
  containerName: string;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercentage: number;
  timestamp: Date;
}

/**
 * Detects memory leaks through trend analysis
 */
export class MemoryLeakDetector {
  private config: DetectorConfig;
  private memoryHistory: Map<string, MemoryMetrics[]> = new Map();

  constructor(config: DetectorConfig) {
    this.config = {
      checkInterval: 60000, // 1 minute
      thresholds: {
        memoryIncreaseRate: 10, // MB per minute
        minDataPoints: 5,
        trendWindow: 300000, // 5 minutes
        highMemoryThreshold: 85, // percentage
        ...config.thresholds
      },
      ...config
    };

    logger.info('Memory Leak Detector initialized', {
      increaseRate: this.config.thresholds.memoryIncreaseRate,
      highMemoryThreshold: this.config.thresholds.highMemoryThreshold
    });
  }

  /**
   * Detect memory leaks
   */
  async detect(): Promise<Issue[]> {
    if (!this.config.enabled) {
      return [];
    }

    logger.debug('Detecting memory leaks');

    try {
      // Get current memory metrics
      const metrics = await this.getMemoryMetrics();
      const issues: Issue[] = [];

      for (const metric of metrics) {
        this.recordMetric(metric);

        const issue = this.analyzeMemoryTrend(metric);
        if (issue) {
          issues.push(issue);
        }
      }

      if (issues.length > 0) {
        logger.warn('Memory leaks detected', {
          count: issues.length,
          issues: issues.map(i => ({ pod: i.resource.name, severity: i.severity }))
        });
      }

      return issues;
    } catch (error) {
      logger.error('Memory leak detection failed', { error });
      return [];
    }
  }

  /**
   * Record memory metric
   */
  private recordMetric(metric: MemoryMetrics): void {
    const key = `${metric.namespace}/${metric.podName}/${metric.containerName}`;

    let history = this.memoryHistory.get(key) || [];
    history.push(metric);

    // Keep only recent history
    const cutoff = Date.now() - this.config.thresholds.trendWindow;
    history = history.filter(m => m.timestamp.getTime() >= cutoff);

    this.memoryHistory.set(key, history);
  }

  /**
   * Analyze memory trend for leaks
   */
  private analyzeMemoryTrend(currentMetric: MemoryMetrics): Issue | null {
    const key = `${currentMetric.namespace}/${currentMetric.podName}/${currentMetric.containerName}`;
    const history = this.memoryHistory.get(key) || [];

    if (history.length < this.config.thresholds.minDataPoints) {
      return null; // Not enough data
    }

    // Calculate memory growth rate
    const growthRate = this.calculateGrowthRate(history);

    // Check if memory is consistently increasing (potential leak)
    if (growthRate >= this.config.thresholds.memoryIncreaseRate) {
      const severity = this.determineSeverity(currentMetric, growthRate);

      return {
        id: uuidv4(),
        type: 'memory_leak' as IssueType,
        severity,
        resource: {
          type: 'pod',
          name: currentMetric.podName,
          namespace: currentMetric.namespace
        },
        description: `Potential memory leak: growing at ${growthRate.toFixed(2)} MB/min`,
        detectedAt: new Date(),
        metrics: {
          currentMemoryMB: currentMetric.memoryUsageMB,
          memoryLimitMB: currentMetric.memoryLimitMB,
          memoryPercentage: currentMetric.memoryPercentage,
          growthRateMBPerMin: growthRate,
          dataPoints: history.length
        },
        metadata: {
          containerName: currentMetric.containerName,
          trendWindowMs: this.config.thresholds.trendWindow,
          historicalData: history.slice(-5).map(h => ({
            timestamp: h.timestamp,
            memoryMB: h.memoryUsageMB
          }))
        }
      };
    }

    // Check for high memory usage approaching limit
    if (currentMetric.memoryPercentage >= this.config.thresholds.highMemoryThreshold) {
      return {
        id: uuidv4(),
        type: 'memory_leak' as IssueType,
        severity: 'high' as IssueSeverity,
        resource: {
          type: 'pod',
          name: currentMetric.podName,
          namespace: currentMetric.namespace
        },
        description: `High memory usage: ${currentMetric.memoryPercentage.toFixed(1)}% of limit`,
        detectedAt: new Date(),
        metrics: {
          currentMemoryMB: currentMetric.memoryUsageMB,
          memoryLimitMB: currentMetric.memoryLimitMB,
          memoryPercentage: currentMetric.memoryPercentage
        },
        metadata: {
          containerName: currentMetric.containerName,
          approaching: 'OOM risk'
        }
      };
    }

    return null;
  }

  /**
   * Calculate memory growth rate (MB per minute)
   */
  private calculateGrowthRate(history: MemoryMetrics[]): number {
    if (history.length < 2) {
      return 0;
    }

    // Use linear regression for better accuracy
    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i; // time index
      const y = history[i].memoryUsageMB;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    // Calculate slope (growth rate per data point)
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Convert to MB per minute
    const timeWindow = history[n - 1].timestamp.getTime() - history[0].timestamp.getTime();
    const minutesPerDataPoint = timeWindow / (n - 1) / 60000;

    return slope / minutesPerDataPoint;
  }

  /**
   * Determine severity based on metrics
   */
  private determineSeverity(
    metric: MemoryMetrics,
    growthRate: number
  ): IssueSeverity {
    if (metric.memoryPercentage >= 95) {
      return 'critical';
    } else if (metric.memoryPercentage >= 90 || growthRate >= 50) {
      return 'high';
    } else if (growthRate >= 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get memory metrics from Kubernetes
   * In production, this would call metrics-server or Prometheus
   */
  private async getMemoryMetrics(): Promise<MemoryMetrics[]> {
    // Simulate metrics API call
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return simulated data
    // In production: kubectl top pods --all-namespaces
    return [];
  }

  /**
   * Clear memory history
   */
  clearHistory(): void {
    this.memoryHistory.clear();
    logger.info('Memory history cleared');
  }

  /**
   * Get memory statistics
   */
  getStatistics(): {
    podsMonitored: number;
    podsWithHighMemory: number;
    podsWithMemoryTrend: number;
  } {
    const podsMonitored = this.memoryHistory.size;

    const podsWithHighMemory = Array.from(this.memoryHistory.values()).filter(history => {
      const latest = history[history.length - 1];
      return latest && latest.memoryPercentage >= this.config.thresholds.highMemoryThreshold;
    }).length;

    const podsWithMemoryTrend = Array.from(this.memoryHistory.values()).filter(history => {
      if (history.length < this.config.thresholds.minDataPoints) {
        return false;
      }
      const growthRate = this.calculateGrowthRate(history);
      return growthRate >= this.config.thresholds.memoryIncreaseRate;
    }).length;

    return {
      podsMonitored,
      podsWithHighMemory,
      podsWithMemoryTrend
    };
  }
}
