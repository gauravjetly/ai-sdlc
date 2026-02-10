/**
 * Auto-Scaler
 * Horizontal Pod Autoscaler for automatic scaling based on metrics
 */

import { createLogger } from '../../utils/logger.js';
import {
  AutoScaleConfig,
  ScaleResult,
  WorkloadMetrics
} from '../types.js';
import { MetricsCollector } from './metrics-collector.js';
import { ScalingPolicies } from './scaling-policies.js';

const logger = createLogger('AutoScaler');

/**
 * Automatic horizontal scaling for workloads
 */
export class AutoScaler {
  private metricsCollector: MetricsCollector;
  private scalingPolicies: ScalingPolicies;
  private lastScaleUpTime: Map<string, number> = new Map();
  private lastScaleDownTime: Map<string, number> = new Map();

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.scalingPolicies = new ScalingPolicies();

    logger.info('Auto-Scaler initialized');
  }

  /**
   * Scale workload based on current metrics
   */
  async scale(config: AutoScaleConfig): Promise<ScaleResult> {
    const startTime = Date.now();

    logger.info('Starting auto-scale evaluation', {
      application: config.application,
      currentReplicas: config.currentReplicas,
      min: config.minReplicas,
      max: config.maxReplicas
    });

    // Get current metrics
    const metrics = await this.metricsCollector.getMetrics(
      config.application,
      config.namespace,
      config.region
    );

    logger.debug('Metrics collected', {
      application: config.application,
      cpu: metrics.cpu,
      memory: metrics.memory,
      requests: metrics.requests,
      errorRate: metrics.errorRate
    });

    // Calculate resource utilization
    const cpuUtil = this.calculateUtilization(
      metrics.cpu,
      this.parseCPU(config.resourceLimits.cpu)
    );

    const memoryUtil = this.calculateUtilization(
      metrics.memory,
      this.parseMemory(config.resourceLimits.memory)
    );

    logger.debug('Utilization calculated', {
      application: config.application,
      cpuUtilization: `${cpuUtil.toFixed(2)}%`,
      memoryUtilization: `${memoryUtil.toFixed(2)}%`,
      targetCPU: `${config.targetCPUUtilization}%`,
      targetMemory: `${config.targetMemoryUtilization}%`
    });

    // Determine scaling action
    let desiredReplicas = config.currentReplicas;
    let action: ScaleResult['action'] = 'no-change';
    let reason: string | undefined;

    // Check if should scale up
    if (this.shouldScaleUp(cpuUtil, memoryUtil, config)) {
      if (this.isInCooldown(config.application, 'scale-up', config.scaleUpCooldownSeconds)) {
        action = 'in-cooldown';
        reason = 'Scale-up in cooldown period';

        logger.info('Scale-up skipped (cooldown)', {
          application: config.application
        });
      } else if (config.currentReplicas >= config.maxReplicas) {
        action = 'at-limit';
        reason = 'Already at maximum replicas';

        logger.warn('Scale-up limited', {
          application: config.application,
          current: config.currentReplicas,
          max: config.maxReplicas
        });
      } else {
        desiredReplicas = this.calculateScaleUp(
          config.currentReplicas,
          cpuUtil,
          memoryUtil,
          config
        );

        desiredReplicas = Math.min(desiredReplicas, config.maxReplicas);

        if (desiredReplicas > config.currentReplicas) {
          await this.executeScale(config.application, config.namespace, desiredReplicas);
          this.lastScaleUpTime.set(config.application, Date.now());

          action = 'scaled-up';
          reason = `High utilization (CPU: ${cpuUtil.toFixed(1)}%, Memory: ${memoryUtil.toFixed(1)}%)`;

          logger.info('Scaled up', {
            application: config.application,
            from: config.currentReplicas,
            to: desiredReplicas,
            reason
          });
        }
      }
    }
    // Check if should scale down
    else if (this.shouldScaleDown(cpuUtil, memoryUtil, config)) {
      if (this.isInCooldown(config.application, 'scale-down', config.scaleDownCooldownSeconds)) {
        action = 'in-cooldown';
        reason = 'Scale-down in cooldown period';

        logger.info('Scale-down skipped (cooldown)', {
          application: config.application
        });
      } else if (config.currentReplicas <= config.minReplicas) {
        action = 'at-limit';
        reason = 'Already at minimum replicas';

        logger.info('Scale-down limited', {
          application: config.application,
          current: config.currentReplicas,
          min: config.minReplicas
        });
      } else {
        desiredReplicas = this.calculateScaleDown(
          config.currentReplicas,
          cpuUtil,
          memoryUtil,
          config
        );

        desiredReplicas = Math.max(desiredReplicas, config.minReplicas);

        if (desiredReplicas < config.currentReplicas) {
          await this.executeScale(config.application, config.namespace, desiredReplicas);
          this.lastScaleDownTime.set(config.application, Date.now());

          action = 'scaled-down';
          reason = `Low utilization (CPU: ${cpuUtil.toFixed(1)}%, Memory: ${memoryUtil.toFixed(1)}%)`;

          logger.info('Scaled down', {
            application: config.application,
            from: config.currentReplicas,
            to: desiredReplicas,
            reason
          });
        }
      }
    } else {
      logger.debug('No scaling needed', {
        application: config.application,
        cpuUtilization: cpuUtil.toFixed(2),
        memoryUtilization: memoryUtil.toFixed(2)
      });
    }

    const duration = Date.now() - startTime;

    return {
      currentReplicas: action === 'no-change' || action === 'in-cooldown' || action === 'at-limit'
        ? config.currentReplicas
        : desiredReplicas,
      desiredReplicas: desiredReplicas !== config.currentReplicas ? desiredReplicas : undefined,
      action,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if should scale up
   */
  private shouldScaleUp(
    cpuUtil: number,
    memoryUtil: number,
    config: AutoScaleConfig
  ): boolean {
    return (
      cpuUtil > config.targetCPUUtilization ||
      memoryUtil > config.targetMemoryUtilization
    );
  }

  /**
   * Check if should scale down
   */
  private shouldScaleDown(
    cpuUtil: number,
    memoryUtil: number,
    config: AutoScaleConfig
  ): boolean {
    // Scale down if both CPU and memory are significantly below target
    const cpuThreshold = config.targetCPUUtilization * 0.5; // 50% of target
    const memoryThreshold = config.targetMemoryUtilization * 0.6; // 60% of target

    return cpuUtil < cpuThreshold && memoryUtil < memoryThreshold;
  }

  /**
   * Calculate scale-up replica count
   */
  private calculateScaleUp(
    currentReplicas: number,
    cpuUtil: number,
    memoryUtil: number,
    config: AutoScaleConfig
  ): number {
    // Use the higher utilization to determine scale factor
    const maxUtil = Math.max(cpuUtil, memoryUtil);
    const targetUtil = Math.max(config.targetCPUUtilization, config.targetMemoryUtilization);

    // Calculate desired replicas based on utilization
    const ratio = maxUtil / targetUtil;
    let desired = Math.ceil(currentReplicas * ratio);

    // Apply conservative scaling (max 50% increase at a time)
    desired = Math.min(desired, Math.ceil(currentReplicas * 1.5));

    return desired;
  }

  /**
   * Calculate scale-down replica count
   */
  private calculateScaleDown(
    currentReplicas: number,
    cpuUtil: number,
    memoryUtil: number,
    config: AutoScaleConfig
  ): number {
    // Use the average utilization for scale-down
    const avgUtil = (cpuUtil + memoryUtil) / 2;
    const targetUtil = (config.targetCPUUtilization + config.targetMemoryUtilization) / 2;

    // Calculate desired replicas based on utilization
    const ratio = avgUtil / targetUtil;
    let desired = Math.ceil(currentReplicas * ratio);

    // Apply conservative scaling (max 30% decrease at a time)
    desired = Math.max(desired, Math.floor(currentReplicas * 0.7));

    return desired;
  }

  /**
   * Check if in cooldown period
   */
  private isInCooldown(
    application: string,
    action: 'scale-up' | 'scale-down',
    cooldownSeconds: number
  ): boolean {
    const lastScaleTime = action === 'scale-up'
      ? this.lastScaleUpTime.get(application)
      : this.lastScaleDownTime.get(application);

    if (!lastScaleTime) return false;

    const timeSinceLastScale = (Date.now() - lastScaleTime) / 1000; // Convert to seconds
    return timeSinceLastScale < cooldownSeconds;
  }

  /**
   * Execute scaling operation
   */
  private async executeScale(
    application: string,
    namespace: string,
    replicas: number
  ): Promise<void> {
    // In production, this would call Kubernetes API to update replica count
    logger.info('Executing scale operation', {
      application,
      namespace,
      replicas
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Parse CPU resource string to millicores
   */
  private parseCPU(cpu: string): number {
    if (cpu.endsWith('m')) {
      return parseInt(cpu.slice(0, -1));
    }
    return parseInt(cpu) * 1000; // Convert cores to millicores
  }

  /**
   * Parse memory resource string to bytes
   */
  private parseMemory(memory: string): number {
    const units: Record<string, number> = {
      'Ki': 1024,
      'Mi': 1024 * 1024,
      'Gi': 1024 * 1024 * 1024,
      'K': 1000,
      'M': 1000 * 1000,
      'G': 1000 * 1000 * 1000
    };

    for (const [suffix, multiplier] of Object.entries(units)) {
      if (memory.endsWith(suffix)) {
        return parseInt(memory.slice(0, -suffix.length)) * multiplier;
      }
    }

    return parseInt(memory); // Assume bytes if no suffix
  }

  /**
   * Calculate utilization percentage
   */
  private calculateUtilization(current: number, limit: number): number {
    if (limit === 0) return 0;
    return (current / limit) * 100;
  }

  /**
   * Get scaling history
   */
  getScalingHistory(application: string): {
    lastScaleUp?: string;
    lastScaleDown?: string;
  } {
    const lastScaleUp = this.lastScaleUpTime.get(application);
    const lastScaleDown = this.lastScaleDownTime.get(application);

    return {
      lastScaleUp: lastScaleUp ? new Date(lastScaleUp).toISOString() : undefined,
      lastScaleDown: lastScaleDown ? new Date(lastScaleDown).toISOString() : undefined
    };
  }

  /**
   * Reset cooldown for testing or manual intervention
   */
  resetCooldown(application: string): void {
    logger.info('Resetting cooldown', { application });

    this.lastScaleUpTime.delete(application);
    this.lastScaleDownTime.delete(application);
  }
}
