/**
 * Container Crash Detector
 * Detects container crashes and restart loops
 */

import { createLogger } from '../../utils/logger.js';
import { Issue, IssueType, IssueSeverity, DetectorConfig } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('ContainerCrashDetector');

export interface ContainerStatus {
  name: string;
  namespace: string;
  podName: string;
  restartCount: number;
  lastRestartTime?: Date;
  state: 'running' | 'waiting' | 'terminated';
  exitCode?: number;
  reason?: string;
  message?: string;
}

/**
 * Detects container crashes and crash loops
 */
export class ContainerCrashDetector {
  private config: DetectorConfig;
  private crashHistory: Map<string, ContainerStatus[]> = new Map();

  constructor(config: DetectorConfig) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      thresholds: {
        maxRestarts: 5,
        crashLoopWindow: 300000, // 5 minutes
        ...config.thresholds
      },
      ...config
    };

    logger.info('Container Crash Detector initialized', {
      maxRestarts: this.config.thresholds.maxRestarts,
      crashLoopWindow: this.config.thresholds.crashLoopWindow
    });
  }

  /**
   * Detect container crashes
   */
  async detect(): Promise<Issue[]> {
    if (!this.config.enabled) {
      return [];
    }

    logger.debug('Detecting container crashes');

    try {
      // Simulate getting container statuses from K8s
      const containerStatuses = await this.getContainerStatuses();
      const issues: Issue[] = [];

      for (const status of containerStatuses) {
        const issue = this.analyzeContainer(status);
        if (issue) {
          issues.push(issue);
        }
      }

      if (issues.length > 0) {
        logger.warn('Container crashes detected', {
          count: issues.length,
          issues: issues.map(i => ({ pod: i.resource.name, type: i.type }))
        });
      }

      return issues;
    } catch (error) {
      logger.error('Container crash detection failed', { error });
      return [];
    }
  }

  /**
   * Analyze individual container
   */
  private analyzeContainer(status: ContainerStatus): Issue | null {
    const key = `${status.namespace}/${status.podName}/${status.name}`;

    // Store status in history
    let history = this.crashHistory.get(key) || [];
    history.push(status);

    // Keep only recent history
    const cutoff = Date.now() - this.config.thresholds.crashLoopWindow;
    history = history.filter(h => {
      const timestamp = h.lastRestartTime?.getTime() || Date.now();
      return timestamp >= cutoff;
    });

    this.crashHistory.set(key, history);

    // Check for excessive restarts
    if (status.restartCount >= this.config.thresholds.maxRestarts) {
      return {
        id: uuidv4(),
        type: 'container_crash' as IssueType,
        severity: this.determineSeverity(status),
        resource: {
          type: 'pod',
          name: status.podName,
          namespace: status.namespace
        },
        description: `Container ${status.name} has restarted ${status.restartCount} times`,
        detectedAt: new Date(),
        metrics: {
          restartCount: status.restartCount,
          exitCode: status.exitCode || 0
        },
        metadata: {
          containerName: status.name,
          state: status.state,
          reason: status.reason,
          message: status.message,
          lastRestartTime: status.lastRestartTime
        }
      };
    }

    // Check for crash loop (multiple restarts in short window)
    const recentRestarts = history.length;
    if (recentRestarts >= 3) {
      return {
        id: uuidv4(),
        type: 'container_crash' as IssueType,
        severity: 'critical' as IssueSeverity,
        resource: {
          type: 'pod',
          name: status.podName,
          namespace: status.namespace
        },
        description: `Container ${status.name} in crash loop: ${recentRestarts} restarts in ${this.config.thresholds.crashLoopWindow / 1000}s`,
        detectedAt: new Date(),
        metrics: {
          recentRestarts,
          restartCount: status.restartCount
        },
        metadata: {
          containerName: status.name,
          crashLoopDetected: true,
          windowMs: this.config.thresholds.crashLoopWindow
        }
      };
    }

    return null;
  }

  /**
   * Determine severity based on container status
   */
  private determineSeverity(status: ContainerStatus): IssueSeverity {
    if (status.restartCount >= 10) {
      return 'critical';
    } else if (status.restartCount >= 5) {
      return 'high';
    } else if (status.reason === 'OOMKilled') {
      return 'high';
    } else {
      return 'medium';
    }
  }

  /**
   * Get container statuses from Kubernetes
   * In production, this would call K8s API
   */
  private async getContainerStatuses(): Promise<ContainerStatus[]> {
    // Simulate K8s API call
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return simulated data for now
    // In production: kubectl get pods --all-namespaces -o json
    return [];
  }

  /**
   * Clear crash history
   */
  clearHistory(): void {
    this.crashHistory.clear();
    logger.info('Crash history cleared');
  }

  /**
   * Get crash statistics
   */
  getStatistics(): {
    totalContainersMonitored: number;
    containersWithRestarts: number;
    crashLoopCount: number;
  } {
    const totalContainersMonitored = this.crashHistory.size;
    const containersWithRestarts = Array.from(this.crashHistory.values()).filter(
      history => history.some(h => h.restartCount > 0)
    ).length;

    const crashLoopCount = Array.from(this.crashHistory.values()).filter(history => {
      const cutoff = Date.now() - this.config.thresholds.crashLoopWindow;
      const recentRestarts = history.filter(h => {
        const timestamp = h.lastRestartTime?.getTime() || Date.now();
        return timestamp >= cutoff;
      }).length;
      return recentRestarts >= 3;
    }).length;

    return {
      totalContainersMonitored,
      containersWithRestarts,
      crashLoopCount
    };
  }
}
