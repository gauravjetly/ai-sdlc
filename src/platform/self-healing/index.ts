/**
 * Self-Healing & Resilience Module
 * Auto-remediation, health monitoring, retry logic, and rate limiting
 */

export { SelfHealingService } from './self-healing.service.js';
export { HealthMonitorService } from './health-monitor.service.js';
export {
  withRetry,
  withRetryAndCircuitBreaker,
  Retry,
  RetryCircuitBreaker,
  DEFAULT_RETRY_CONFIG,
} from './retry-logic.js';
export {
  RateLimiter,
  TokenBucketRateLimiter,
  AdaptiveRateLimiter,
  RateLimit,
  rateLimitMiddleware,
  DEFAULT_RATE_LIMIT_CONFIG,
} from './rate-limiter.js';

export * from './types.js';

/**
 * Initialize self-healing system
 */
import { SelfHealingService } from './self-healing.service.js';
import { HealthMonitorService } from './health-monitor.service.js';
import { WebSocketServer } from '../infrastructure/websocket/server.js';
import {
  SelfHealingConfig,
  HealthCheckConfig,
} from './types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SelfHealingModule');

/**
 * Default configurations
 */
export const DEFAULT_SELF_HEALING_CONFIG: SelfHealingConfig = {
  enabled: true,
  autoRemediate: true,
  requireApprovalFor: ['critical'],
  maxRemediationAttempts: 3,
  cooldownPeriod: 300000, // 5 minutes
  detectors: {
    containerCrash: {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      thresholds: {
        restartCount: 5,
      },
    },
    memoryLeak: {
      enabled: true,
      checkInterval: 60000, // 1 minute
      thresholds: {
        memoryUsage: 90, // 90%
      },
    },
    connectionPool: {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      thresholds: {
        poolUtilization: 95, // 95%
      },
    },
  },
};

export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enabled: true,
  podCheckInterval: 30000, // 30 seconds
  deploymentCheckInterval: 60000, // 1 minute
  performanceCheckInterval: 60000, // 1 minute
  readinessCheckInterval: 30000, // 30 seconds
  thresholds: {
    cpuUsage: 80, // 80%
    memoryUsage: 85, // 85%
    errorRate: 5, // 5%
    latency: 2000, // 2 seconds
    restartCount: 5,
  },
};

/**
 * Initialize self-healing and health monitoring
 */
export function initializeSelfHealing(
  selfHealingConfig: Partial<SelfHealingConfig> = {},
  healthCheckConfig: Partial<HealthCheckConfig> = {},
  websocket?: WebSocketServer
): {
  selfHealingService: SelfHealingService;
  healthMonitorService: HealthMonitorService;
} {
  logger.info('Initializing self-healing system');

  const finalHealthCheckConfig: HealthCheckConfig = {
    ...DEFAULT_HEALTH_CHECK_CONFIG,
    ...healthCheckConfig,
  };

  const finalSelfHealingConfig: SelfHealingConfig = {
    ...DEFAULT_SELF_HEALING_CONFIG,
    ...selfHealingConfig,
  };

  // Initialize health monitor
  const healthMonitorService = new HealthMonitorService(
    finalHealthCheckConfig,
    websocket
  );

  // Initialize self-healing service
  const selfHealingService = new SelfHealingService(
    finalSelfHealingConfig,
    healthMonitorService,
    websocket
  );

  logger.info('Self-healing system initialized', {
    autoRemediate: finalSelfHealingConfig.autoRemediate,
    healthChecksEnabled: finalHealthCheckConfig.enabled,
  });

  return {
    selfHealingService,
    healthMonitorService,
  };
}
