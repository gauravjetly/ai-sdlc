/**
 * Failover Manager
 * Automatic failover with <2 min recovery time
 */

import { createLogger } from '../../utils/logger.js';
import {
  FailoverConfig,
  HealthStatus,
  FailoverEvent
} from '../types.js';

const logger = createLogger('FailoverManager');

/**
 * Manages automatic failover between primary and secondary endpoints
 */
export class FailoverManager {
  private config: FailoverConfig;
  private primaryHealth: HealthStatus;
  private secondaryHealth: HealthStatus;
  private isFailedOver: boolean = false;
  private failoverHistory: FailoverEvent[] = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private lastHealthCheck: Date = new Date();

  constructor(config: FailoverConfig) {
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      healthCheckTimeout: 5000, // 5 seconds
      failureThreshold: 3,
      recoveryTime: 120000, // 2 minutes
      ...config
    };

    this.primaryHealth = {
      healthy: true,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastCheckTime: new Date(),
      responseTime: 0
    };

    this.secondaryHealth = {
      healthy: true,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastCheckTime: new Date(),
      responseTime: 0
    };

    logger.info('Failover Manager initialized', {
      domain: this.config.domain,
      primaryEndpoint: this.config.primaryEndpoint,
      secondaryEndpoint: this.config.secondaryEndpoint
    });
  }

  /**
   * Start automatic health monitoring
   */
  start(): void {
    logger.info('Starting health monitoring', {
      interval: this.config.healthCheckInterval
    });

    this.healthCheckTimer = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval
    );

    // Perform initial health check
    this.performHealthChecks().catch(error => {
      logger.error('Initial health check failed', { error });
    });
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      logger.info('Health monitoring stopped');
    }
  }

  /**
   * Perform health checks on both endpoints
   */
  private async performHealthChecks(): Promise<void> {
    logger.debug('Performing health checks');

    const [primaryResult, secondaryResult] = await Promise.allSettled([
      this.checkEndpointHealth(this.config.primaryEndpoint),
      this.checkEndpointHealth(this.config.secondaryEndpoint)
    ]);

    // Update primary health
    if (primaryResult.status === 'fulfilled') {
      this.updateHealthStatus(this.primaryHealth, true, primaryResult.value);
    } else {
      this.updateHealthStatus(this.primaryHealth, false, {
        responseTime: 0,
        error: primaryResult.reason?.message
      });
    }

    // Update secondary health
    if (secondaryResult.status === 'fulfilled') {
      this.updateHealthStatus(this.secondaryHealth, true, secondaryResult.value);
    } else {
      this.updateHealthStatus(this.secondaryHealth, false, {
        responseTime: 0,
        error: secondaryResult.reason?.message
      });
    }

    this.lastHealthCheck = new Date();

    // Evaluate failover conditions
    await this.evaluateFailover();
  }

  /**
   * Check health of a single endpoint
   */
  private async checkEndpointHealth(endpoint: string): Promise<{
    responseTime: number;
    statusCode?: number;
  }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.healthCheckTimeout
      );

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'FailoverManager/1.0'
        }
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.debug('Health check succeeded', {
        endpoint,
        responseTime,
        statusCode: response.status
      });

      return {
        responseTime,
        statusCode: response.status
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.warn('Health check failed', {
        endpoint,
        responseTime,
        error: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Update health status based on check result
   */
  private updateHealthStatus(
    health: HealthStatus,
    success: boolean,
    result: { responseTime: number; statusCode?: number; error?: string }
  ): void {
    health.lastCheckTime = new Date();
    health.responseTime = result.responseTime;

    if (success) {
      health.consecutiveSuccesses++;
      health.consecutiveFailures = 0;
      health.healthy = true;
      health.statusCode = result.statusCode;
      health.error = undefined;
    } else {
      health.consecutiveFailures++;
      health.consecutiveSuccesses = 0;
      health.error = result.error;

      // Mark as unhealthy if threshold reached
      if (health.consecutiveFailures >= this.config.failureThreshold) {
        health.healthy = false;
      }
    }
  }

  /**
   * Evaluate if failover is needed
   */
  private async evaluateFailover(): Promise<void> {
    const primaryHealthy = this.primaryHealth.healthy;
    const secondaryHealthy = this.secondaryHealth.healthy;

    // Failover to secondary if primary is down
    if (!this.isFailedOver && !primaryHealthy && secondaryHealthy) {
      logger.warn('Primary endpoint unhealthy, initiating failover', {
        primaryFailures: this.primaryHealth.consecutiveFailures,
        secondaryHealth: 'healthy'
      });

      await this.executeFailover('primary_unhealthy');
    }

    // Failback to primary if it recovers
    if (this.isFailedOver && primaryHealthy) {
      logger.info('Primary endpoint recovered, initiating failback', {
        primarySuccesses: this.primaryHealth.consecutiveSuccesses
      });

      await this.executeFailback('primary_recovered');
    }

    // Alert if both endpoints are unhealthy
    if (!primaryHealthy && !secondaryHealthy) {
      logger.error('CRITICAL: Both endpoints unhealthy', {
        primaryFailures: this.primaryHealth.consecutiveFailures,
        secondaryFailures: this.secondaryHealth.consecutiveFailures
      });
    }
  }

  /**
   * Execute failover to secondary
   */
  private async executeFailover(reason: string): Promise<void> {
    const startTime = Date.now();

    logger.info('Executing failover', {
      from: this.config.primaryEndpoint,
      to: this.config.secondaryEndpoint,
      reason
    });

    const event: FailoverEvent = {
      type: 'initiated',
      timestamp: new Date(),
      fromEndpoint: this.config.primaryEndpoint,
      toEndpoint: this.config.secondaryEndpoint,
      reason,
      duration: 0
    };

    try {
      // Update DNS or load balancer to point to secondary
      await this.updateTrafficRouting(
        this.config.secondaryTargetGroup,
        this.config.primaryTargetGroup
      );

      this.isFailedOver = true;

      const duration = Date.now() - startTime;

      const completeEvent: FailoverEvent = {
        ...event,
        type: 'completed',
        duration
      };

      this.failoverHistory.push(completeEvent);

      logger.info('Failover completed', {
        duration,
        recoveryTimeMs: duration,
        recoveryTimeSec: (duration / 1000).toFixed(2),
        targetRecoveryTime: this.config.recoveryTime
      });

      // Verify recovery time meets SLA
      if (duration > this.config.recoveryTime) {
        logger.warn('Failover exceeded target recovery time', {
          actual: duration,
          target: this.config.recoveryTime,
          exceededBy: duration - this.config.recoveryTime
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      const failedEvent: FailoverEvent = {
        ...event,
        type: 'failed',
        duration
      };

      this.failoverHistory.push(failedEvent);

      logger.error('Failover failed', {
        error: (error as Error).message,
        duration
      });

      throw error;
    }
  }

  /**
   * Execute failback to primary
   */
  private async executeFailback(reason: string): Promise<void> {
    const startTime = Date.now();

    logger.info('Executing failback', {
      from: this.config.secondaryEndpoint,
      to: this.config.primaryEndpoint,
      reason
    });

    const event: FailoverEvent = {
      type: 'initiated',
      timestamp: new Date(),
      fromEndpoint: this.config.secondaryEndpoint,
      toEndpoint: this.config.primaryEndpoint,
      reason,
      duration: 0
    };

    try {
      // Update DNS or load balancer to point back to primary
      await this.updateTrafficRouting(
        this.config.primaryTargetGroup,
        this.config.secondaryTargetGroup
      );

      this.isFailedOver = false;

      const duration = Date.now() - startTime;

      const revertEvent: FailoverEvent = {
        ...event,
        type: 'reverted',
        duration
      };

      this.failoverHistory.push(revertEvent);

      logger.info('Failback completed', {
        duration,
        recoveryTimeMs: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Failback failed', {
        error: (error as Error).message,
        duration
      });

      throw error;
    }
  }

  /**
   * Update traffic routing (DNS/Load Balancer)
   * In real implementation, this would call cloud provider APIs
   */
  private async updateTrafficRouting(
    activeTargetGroup: string,
    inactiveTargetGroup: string
  ): Promise<void> {
    logger.info('Updating traffic routing', {
      activeTargetGroup,
      inactiveTargetGroup,
      domain: this.config.domain
    });

    // Simulate DNS/LB update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, this would:
    // 1. Update Route53 DNS records
    // 2. Or update ALB/NLB target group weights
    // 3. Or update API Gateway stages
    // 4. Verify propagation
  }

  /**
   * Force manual failover
   */
  async forceFailover(): Promise<void> {
    if (this.isFailedOver) {
      throw new Error('Already failed over to secondary');
    }

    await this.executeFailover('manual_trigger');
  }

  /**
   * Force manual failback
   */
  async forceFailback(): Promise<void> {
    if (!this.isFailedOver) {
      throw new Error('Not currently failed over');
    }

    await this.executeFailback('manual_trigger');
  }

  /**
   * Get current failover status
   */
  getStatus(): {
    isFailedOver: boolean;
    activeEndpoint: string;
    primaryHealth: HealthStatus;
    secondaryHealth: HealthStatus;
    lastHealthCheck: Date;
    failoverHistory: FailoverEvent[];
  } {
    return {
      isFailedOver: this.isFailedOver,
      activeEndpoint: this.isFailedOver
        ? this.config.secondaryEndpoint
        : this.config.primaryEndpoint,
      primaryHealth: { ...this.primaryHealth },
      secondaryHealth: { ...this.secondaryHealth },
      lastHealthCheck: this.lastHealthCheck,
      failoverHistory: [...this.failoverHistory]
    };
  }

  /**
   * Get health status
   */
  getHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    primary: HealthStatus;
    secondary: HealthStatus;
  } {
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!this.primaryHealth.healthy && !this.secondaryHealth.healthy) {
      overall = 'unhealthy';
    } else if (!this.primaryHealth.healthy || !this.secondaryHealth.healthy) {
      overall = 'degraded';
    }

    return {
      overall,
      primary: { ...this.primaryHealth },
      secondary: { ...this.secondaryHealth }
    };
  }

  /**
   * Clear failover history
   */
  clearHistory(): void {
    this.failoverHistory = [];
    logger.info('Failover history cleared');
  }
}
