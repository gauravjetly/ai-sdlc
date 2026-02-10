/**
 * Connection Pool Detector
 * Detects connection pool exhaustion
 */

import { createLogger } from '../../utils/logger.js';
import { Issue, IssueType, IssueSeverity, DetectorConfig } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('ConnectionPoolDetector');

export interface ConnectionPoolMetrics {
  service: string;
  namespace: string;
  poolName: string;
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  utilizationPercentage: number;
  queuedRequests: number;
  timeoutErrors: number;
  timestamp: Date;
}

/**
 * Detects connection pool exhaustion
 */
export class ConnectionPoolDetector {
  private config: DetectorConfig;
  private poolHistory: Map<string, ConnectionPoolMetrics[]> = new Map();

  constructor(config: DetectorConfig) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      thresholds: {
        highUtilization: 85, // percentage
        criticalUtilization: 95, // percentage
        maxQueuedRequests: 10,
        maxTimeoutErrors: 5,
        historyWindow: 300000, // 5 minutes
        ...config.thresholds
      },
      ...config
    };

    logger.info('Connection Pool Detector initialized', {
      highUtilization: this.config.thresholds.highUtilization,
      criticalUtilization: this.config.thresholds.criticalUtilization
    });
  }

  /**
   * Detect connection pool issues
   */
  async detect(): Promise<Issue[]> {
    if (!this.config.enabled) {
      return [];
    }

    logger.debug('Detecting connection pool issues');

    try {
      const metrics = await this.getConnectionPoolMetrics();
      const issues: Issue[] = [];

      for (const metric of metrics) {
        this.recordMetric(metric);

        const issue = this.analyzeConnectionPool(metric);
        if (issue) {
          issues.push(issue);
        }
      }

      if (issues.length > 0) {
        logger.warn('Connection pool issues detected', {
          count: issues.length,
          issues: issues.map(i => ({ service: i.resource.name, severity: i.severity }))
        });
      }

      return issues;
    } catch (error) {
      logger.error('Connection pool detection failed', { error });
      return [];
    }
  }

  /**
   * Record connection pool metric
   */
  private recordMetric(metric: ConnectionPoolMetrics): void {
    const key = `${metric.namespace}/${metric.service}/${metric.poolName}`;

    let history = this.poolHistory.get(key) || [];
    history.push(metric);

    // Keep only recent history
    const cutoff = Date.now() - this.config.thresholds.historyWindow;
    history = history.filter(m => m.timestamp.getTime() >= cutoff);

    this.poolHistory.set(key, history);
  }

  /**
   * Analyze connection pool for issues
   */
  private analyzeConnectionPool(metric: ConnectionPoolMetrics): Issue | null {
    const key = `${metric.namespace}/${metric.service}/${metric.poolName}`;
    const history = this.poolHistory.get(key) || [];

    // Check for critical utilization
    if (metric.utilizationPercentage >= this.config.thresholds.criticalUtilization) {
      return {
        id: uuidv4(),
        type: 'connection_pool_exhausted' as IssueType,
        severity: 'critical' as IssueSeverity,
        resource: {
          type: 'service',
          name: metric.service,
          namespace: metric.namespace
        },
        description: `Connection pool nearly exhausted: ${metric.utilizationPercentage.toFixed(1)}% utilization`,
        detectedAt: new Date(),
        metrics: {
          activeConnections: metric.activeConnections,
          idleConnections: metric.idleConnections,
          maxConnections: metric.maxConnections,
          utilizationPercentage: metric.utilizationPercentage,
          queuedRequests: metric.queuedRequests,
          timeoutErrors: metric.timeoutErrors
        },
        metadata: {
          poolName: metric.poolName,
          risk: 'imminent exhaustion'
        }
      };
    }

    // Check for high utilization with queue buildup
    if (
      metric.utilizationPercentage >= this.config.thresholds.highUtilization &&
      metric.queuedRequests >= this.config.thresholds.maxQueuedRequests
    ) {
      return {
        id: uuidv4(),
        type: 'connection_pool_exhausted' as IssueType,
        severity: 'high' as IssueSeverity,
        resource: {
          type: 'service',
          name: metric.service,
          namespace: metric.namespace
        },
        description: `Connection pool under pressure: ${metric.utilizationPercentage.toFixed(1)}% utilization, ${metric.queuedRequests} requests queued`,
        detectedAt: new Date(),
        metrics: {
          activeConnections: metric.activeConnections,
          maxConnections: metric.maxConnections,
          utilizationPercentage: metric.utilizationPercentage,
          queuedRequests: metric.queuedRequests
        },
        metadata: {
          poolName: metric.poolName,
          risk: 'performance degradation'
        }
      };
    }

    // Check for timeout errors
    if (metric.timeoutErrors >= this.config.thresholds.maxTimeoutErrors) {
      const recentErrors = this.countRecentTimeoutErrors(history);

      return {
        id: uuidv4(),
        type: 'connection_pool_exhausted' as IssueType,
        severity: 'high' as IssueSeverity,
        resource: {
          type: 'service',
          name: metric.service,
          namespace: metric.namespace
        },
        description: `High timeout errors: ${recentErrors} in last ${this.config.thresholds.historyWindow / 1000}s`,
        detectedAt: new Date(),
        metrics: {
          activeConnections: metric.activeConnections,
          maxConnections: metric.maxConnections,
          utilizationPercentage: metric.utilizationPercentage,
          timeoutErrors: metric.timeoutErrors,
          recentTimeoutErrors: recentErrors
        },
        metadata: {
          poolName: metric.poolName,
          risk: 'connection timeout'
        }
      };
    }

    // Check for sustained high utilization
    if (history.length >= 5) {
      const avgUtilization = this.calculateAverageUtilization(history);

      if (avgUtilization >= this.config.thresholds.highUtilization) {
        return {
          id: uuidv4(),
          type: 'connection_pool_exhausted' as IssueType,
          severity: 'medium' as IssueSeverity,
          resource: {
            type: 'service',
            name: metric.service,
            namespace: metric.namespace
          },
          description: `Sustained high connection pool utilization: ${avgUtilization.toFixed(1)}% average`,
          detectedAt: new Date(),
          metrics: {
            currentUtilization: metric.utilizationPercentage,
            averageUtilization: avgUtilization,
            maxConnections: metric.maxConnections
          },
          metadata: {
            poolName: metric.poolName,
            risk: 'may need scaling'
          }
        };
      }
    }

    return null;
  }

  /**
   * Count recent timeout errors
   */
  private countRecentTimeoutErrors(history: ConnectionPoolMetrics[]): number {
    return history.reduce((sum, metric) => sum + metric.timeoutErrors, 0);
  }

  /**
   * Calculate average utilization
   */
  private calculateAverageUtilization(history: ConnectionPoolMetrics[]): number {
    if (history.length === 0) return 0;

    const sum = history.reduce((acc, metric) => acc + metric.utilizationPercentage, 0);
    return sum / history.length;
  }

  /**
   * Get connection pool metrics
   * In production, this would query application metrics
   */
  private async getConnectionPoolMetrics(): Promise<ConnectionPoolMetrics[]> {
    // Simulate metrics API call
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return simulated data
    // In production: query Prometheus, application metrics endpoints
    return [];
  }

  /**
   * Clear pool history
   */
  clearHistory(): void {
    this.poolHistory.clear();
    logger.info('Connection pool history cleared');
  }

  /**
   * Get pool statistics
   */
  getStatistics(): {
    poolsMonitored: number;
    poolsWithHighUtilization: number;
    poolsWithTimeoutErrors: number;
  } {
    const poolsMonitored = this.poolHistory.size;

    const poolsWithHighUtilization = Array.from(this.poolHistory.values()).filter(history => {
      const latest = history[history.length - 1];
      return latest && latest.utilizationPercentage >= this.config.thresholds.highUtilization;
    }).length;

    const poolsWithTimeoutErrors = Array.from(this.poolHistory.values()).filter(history => {
      const latest = history[history.length - 1];
      return latest && latest.timeoutErrors >= this.config.thresholds.maxTimeoutErrors;
    }).length;

    return {
      poolsMonitored,
      poolsWithHighUtilization,
      poolsWithTimeoutErrors
    };
  }
}
