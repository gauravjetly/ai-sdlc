/**
 * Health Check Service
 * Deep health checks for all system dependencies
 * Production-ready with proper error handling and timeouts
 */

import { createLogger } from '../utils/logger.js';
import { prisma } from '../infrastructure/database/prisma.client.js';
import Redis from 'ioredis';
import { KubernetesClient } from '../services/deployment/k8s.client.js';
import * as aws from '@aws-sdk/client-sts';
import {
  HealthStatus,
  HealthCheckResult,
  ComponentHealth,
  SystemHealth,
} from './types.js';

const logger = createLogger('HealthService');

export class HealthService {
  private redis?: Redis;
  private k8sClient?: KubernetesClient;
  private awsClient?: aws.STS;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize health check clients
   */
  private initializeClients(): void {
    try {
      // Redis client
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
        });
      }

      // Kubernetes client
      try {
        this.k8sClient = new KubernetesClient();
      } catch (error) {
        logger.warn('Kubernetes client not available', { error });
      }

      // AWS client
      if (process.env.AWS_ACCESS_KEY_ID) {
        this.awsClient = new aws.STS({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });
      }

      logger.info('Health check clients initialized');
    } catch (error: any) {
      logger.error('Failed to initialize health check clients', { error: error.message });
    }
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();

    try {
      // Check all components in parallel
      const [database, redis, kubernetes, aws] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkKubernetesHealth(),
        this.checkAwsHealth(),
      ]);

      // Extract component health from settled promises
      const databaseHealth = database.status === 'fulfilled'
        ? database.value
        : this.createUnhealthyComponent('database', (database.reason as Error)?.message);

      const redisHealth = redis.status === 'fulfilled'
        ? redis.value
        : this.createUnhealthyComponent('redis', (redis.reason as Error)?.message);

      const k8sHealth = kubernetes.status === 'fulfilled'
        ? kubernetes.value
        : this.createUnhealthyComponent('kubernetes', (kubernetes.reason as Error)?.message);

      const awsHealth = aws.status === 'fulfilled'
        ? aws.value
        : this.createUnhealthyComponent('aws', (aws.reason as Error)?.message);

      // Determine overall status
      const components = [databaseHealth, redisHealth, k8sHealth, awsHealth];
      const overallStatus = this.determineOverallStatus(components);

      // Get system metrics
      const metrics = await this.getSystemMetrics();

      const systemHealth: SystemHealth = {
        status: overallStatus,
        timestamp: new Date(),
        uptime_seconds: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        components: {
          database: databaseHealth,
          redis: redisHealth,
          kubernetes: k8sHealth,
          aws: awsHealth,
        },
        metrics,
      };

      const duration = Date.now() - startTime;
      logger.info('System health check completed', {
        status: overallStatus,
        duration_ms: duration,
      });

      return systemHealth;
    } catch (error: any) {
      logger.error('System health check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Liveness probe - is the application running?
   */
  async checkLiveness(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple check - if we can execute this, we're alive
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
      };

      return result;
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Readiness probe - is the application ready to serve traffic?
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check critical dependencies
      const [database, redis] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
      ]);

      const databaseHealthy = database.status === 'fulfilled' && database.value.status === 'healthy';
      const redisHealthy = redis.status === 'fulfilled' && redis.value.status === 'healthy';

      // Application is ready if critical dependencies are healthy
      const isReady = databaseHealthy && redisHealthy;

      const result: HealthCheckResult = {
        status: isReady ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          database: databaseHealthy,
          redis: redisHealthy,
        },
      };

      return result;
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Startup probe - has the application finished initializing?
   */
  async checkStartup(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check if all components are initialized
      const initialized = this.redis !== undefined;

      const result: HealthCheckResult = {
        status: initialized ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          redis_initialized: this.redis !== undefined,
          k8s_initialized: this.k8sClient !== undefined,
          aws_initialized: this.awsClient !== undefined,
        },
      };

      return result;
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // ===========================
  // COMPONENT HEALTH CHECKS
  // ===========================

  /**
   * Check PostgreSQL database health
   */
  async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'database';

    try {
      // Execute a simple query with timeout
      const result = await Promise.race([
        prisma.$queryRaw`SELECT 1 as health_check`,
        this.timeout(5000, 'Database health check timeout'),
      ]);

      // Check connection pool
      const poolStatus = await this.getDatabasePoolStatus();

      return {
        name,
        status: 'healthy',
        message: 'Database connection healthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'postgresql',
          pool: poolStatus,
        },
      };
    } catch (error: any) {
      logger.error('Database health check failed', { error: error.message });

      return {
        name,
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'postgresql',
          error: error.message,
        },
      };
    }
  }

  /**
   * Get database connection pool status
   */
  private async getDatabasePoolStatus(): Promise<any> {
    try {
      // This would query pg_stat_activity or connection pool metrics
      return {
        active_connections: 'N/A',
        idle_connections: 'N/A',
        max_connections: 'N/A',
      };
    } catch (error) {
      return { error: 'Unable to fetch pool status' };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'redis';

    if (!this.redis) {
      return {
        name,
        status: 'unhealthy',
        message: 'Redis client not initialized',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
      };
    }

    try {
      // Ping Redis with timeout
      await Promise.race([
        this.redis.ping(),
        this.timeout(5000, 'Redis health check timeout'),
      ]);

      // Get Redis info
      const info = await this.redis.info('server');
      const lines = info.split('\r\n');
      const version = lines.find((line) => line.startsWith('redis_version:'))?.split(':')[1];

      return {
        name,
        status: 'healthy',
        message: 'Redis connection healthy',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'redis',
          version,
        },
      };
    } catch (error: any) {
      logger.error('Redis health check failed', { error: error.message });

      return {
        name,
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'redis',
          error: error.message,
        },
      };
    }
  }

  /**
   * Check Kubernetes API health
   */
  async checkKubernetesHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'kubernetes';

    if (!this.k8sClient) {
      return {
        name,
        status: 'degraded',
        message: 'Kubernetes client not configured',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
      };
    }

    try {
      // Try to list namespaces (simple API call)
      await Promise.race([
        this.k8sClient.listNamespaces(),
        this.timeout(5000, 'Kubernetes health check timeout'),
      ]);

      return {
        name,
        status: 'healthy',
        message: 'Kubernetes API accessible',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'kubernetes',
        },
      };
    } catch (error: any) {
      logger.error('Kubernetes health check failed', { error: error.message });

      return {
        name,
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'kubernetes',
          error: error.message,
        },
      };
    }
  }

  /**
   * Check AWS API health
   */
  async checkAwsHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'aws';

    if (!this.awsClient) {
      return {
        name,
        status: 'degraded',
        message: 'AWS client not configured',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
      };
    }

    try {
      // Get caller identity (simple API call)
      await Promise.race([
        this.awsClient.getCallerIdentity({}),
        this.timeout(5000, 'AWS health check timeout'),
      ]);

      return {
        name,
        status: 'healthy',
        message: 'AWS API accessible',
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'aws',
          region: process.env.AWS_REGION,
        },
      };
    } catch (error: any) {
      logger.error('AWS health check failed', { error: error.message });

      return {
        name,
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        details: {
          type: 'aws',
          error: error.message,
        },
      };
    }
  }

  // ===========================
  // SYSTEM METRICS
  // ===========================

  /**
   * Get system resource metrics
   */
  private async getSystemMetrics(): Promise<{
    memory_usage_percent: number;
    cpu_usage_percent: number;
    disk_usage_percent: number;
  }> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    // CPU usage would require more complex calculation
    // For now, return placeholder
    return {
      memory_usage_percent: Math.round(memoryPercent * 100) / 100,
      cpu_usage_percent: 0,
      disk_usage_percent: 0,
    };
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Create unhealthy component result
   */
  private createUnhealthyComponent(name: string, message: string): ComponentHealth {
    return {
      name,
      status: 'unhealthy',
      message,
      timestamp: new Date(),
      duration_ms: 0,
    };
  }

  /**
   * Determine overall system status from component statuses
   */
  private determineOverallStatus(components: ComponentHealth[]): HealthStatus {
    const hasUnhealthy = components.some((c) => c.status === 'unhealthy');
    const hasDegraded = components.some((c) => c.status === 'degraded');

    if (hasUnhealthy) {
      return 'unhealthy';
    } else if (hasDegraded) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Timeout helper for health checks
   */
  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    logger.info('Health service cleanup completed');
  }
}

// Singleton instance
export const healthService = new HealthService();
