/**
 * Observability Stack Startup
 * Initialize all observability services
 */

import { metricsService } from './metrics.service.js';
import { healthService } from './health.service.js';
import { createEnhancedLogger } from './logger.service.js';

const logger = createEnhancedLogger('ObservabilityStartup');

/**
 * Initialize observability stack
 */
export async function initializeObservability(): Promise<void> {
  try {
    logger.info('Initializing observability stack...');

    // 1. Start metrics collection
    const metricsInterval = Number(process.env.METRICS_COLLECTION_INTERVAL) || 60000;
    metricsService.startCollection(metricsInterval);
    logger.info('Metrics collection started', { intervalMs: metricsInterval });

    // 2. Perform initial health check
    const health = await healthService.getSystemHealth();
    logger.info('Initial health check completed', {
      status: health.status,
      components: Object.entries(health.components).map(([name, comp]) => ({
        name,
        status: comp.status,
      })),
    });

    // 3. Log observability endpoints
    logger.info('Observability endpoints available', {
      metrics_json: '/api/v1/observability/metrics',
      metrics_prometheus: '/api/v1/observability/metrics/prometheus',
      health: '/api/v1/observability/health',
      health_live: '/api/v1/observability/health/live',
      health_ready: '/api/v1/observability/health/ready',
      health_startup: '/api/v1/observability/health/startup',
    });

    logger.info('Observability stack initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize observability stack', error);
    throw error;
  }
}

/**
 * Graceful shutdown of observability stack
 */
export async function shutdownObservability(): Promise<void> {
  try {
    logger.info('Shutting down observability stack...');

    // Stop metrics collection
    metricsService.stopCollection();
    logger.info('Metrics collection stopped');

    // Cleanup health service
    await healthService.cleanup();
    logger.info('Health service cleaned up');

    logger.info('Observability stack shutdown completed');
  } catch (error: any) {
    logger.error('Error during observability shutdown', error);
  }
}

// Handle process signals for graceful shutdown
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down observability...');
    await shutdownObservability();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down observability...');
    await shutdownObservability();
    process.exit(0);
  });
}
