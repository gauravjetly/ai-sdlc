/**
 * Resilience Orchestrator
 * Coordinates all resilience components: circuit breakers, multi-AZ, auto-scaling, failover
 */

import { createLogger } from '../utils/logger.js';
import { CircuitBreaker } from './circuit-breaker/circuit-breaker.js';
import { MultiAZManager } from './multi-az/multi-az-manager.js';
import { AutoScaler } from './auto-scaling/auto-scaler.js';
import { FailoverManager } from './failover/failover-manager.js';
import {
  ResilienceConfig,
  ResilienceMetrics,
  CircuitBreakerConfig,
  AutoScaleConfig,
  FailoverConfig,
  WorkloadConfig
} from './types.js';

const logger = createLogger('ResilienceOrchestrator');

/**
 * Main orchestrator for resilience and high availability
 */
export class ResilienceOrchestrator {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private multiAZManagers: Map<string, MultiAZManager> = new Map();
  private autoScalers: Map<string, AutoScaler> = new Map();
  private failoverManagers: Map<string, FailoverManager> = new Map();
  private config: ResilienceConfig;
  private startTime: Date;
  private totalRequests: number = 0;
  private successfulRequests: number = 0;

  constructor(config: ResilienceConfig) {
    this.config = config;
    this.startTime = new Date();

    logger.info('Resilience Orchestrator initialized', {
      multiAZEnabled: config.multiAZ ? 'yes' : 'no',
      autoScalingEnabled: config.autoScaling?.enabled ? 'yes' : 'no',
      failoverEnabled: config.failover?.enabled ? 'yes' : 'no'
    });

    this.initialize();
  }

  /**
   * Initialize all resilience components
   */
  private initialize(): void {
    // Initialize circuit breaker
    if (this.config.circuitBreaker) {
      this.registerCircuitBreaker(this.config.circuitBreaker);
    }

    // Initialize auto scaling
    if (this.config.autoScaling?.enabled && this.config.autoScaling.policies) {
      this.config.autoScaling.policies.forEach(policy => {
        this.registerAutoScaler(policy);
      });

      // Start auto scaling monitor
      this.startAutoScalingMonitor();
    }

    // Initialize failover managers
    if (this.config.failover?.enabled && this.config.failover.configs) {
      this.config.failover.configs.forEach(config => {
        this.registerFailoverManager(config);
      });
    }
  }

  /**
   * Register a circuit breaker
   */
  registerCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    if (this.circuitBreakers.has(config.name)) {
      logger.warn('Circuit breaker already registered', { name: config.name });
      return this.circuitBreakers.get(config.name)!;
    }

    const circuitBreaker = new CircuitBreaker(config);
    this.circuitBreakers.set(config.name, circuitBreaker);

    logger.info('Circuit breaker registered', { name: config.name });

    return circuitBreaker;
  }

  /**
   * Register a multi-AZ manager
   */
  registerMultiAZManager(workload: WorkloadConfig): MultiAZManager {
    const key = `${workload.application}-${workload.environment}`;

    if (this.multiAZManagers.has(key)) {
      logger.warn('Multi-AZ manager already registered', { key });
      return this.multiAZManagers.get(key)!;
    }

    const manager = new MultiAZManager(this.config.multiAZ);
    this.multiAZManagers.set(key, manager);

    logger.info('Multi-AZ manager registered', { key });

    return manager;
  }

  /**
   * Register an auto scaler
   */
  registerAutoScaler(config: AutoScaleConfig): AutoScaler {
    const key = `${config.application}-${config.namespace}`;

    if (this.autoScalers.has(key)) {
      logger.warn('Auto scaler already registered', { key });
      return this.autoScalers.get(key)!;
    }

    const autoScaler = new AutoScaler(config);
    this.autoScalers.set(key, autoScaler);

    logger.info('Auto scaler registered', { key });

    return autoScaler;
  }

  /**
   * Register a failover manager
   */
  registerFailoverManager(config: FailoverConfig): FailoverManager {
    const key = config.domain;

    if (this.failoverManagers.has(key)) {
      logger.warn('Failover manager already registered', { key });
      return this.failoverManagers.get(key)!;
    }

    const manager = new FailoverManager(config);
    manager.start(); // Start health monitoring

    this.failoverManagers.set(key, manager);

    logger.info('Failover manager registered', { key });

    return manager;
  }

  /**
   * Start auto scaling monitor
   */
  private startAutoScalingMonitor(): void {
    if (!this.config.autoScaling?.enabled) return;

    const interval = this.config.autoScaling.checkInterval || 60000; // 1 minute

    setInterval(() => {
      this.checkAutoScaling();
    }, interval);

    logger.info('Auto scaling monitor started', { interval });
  }

  /**
   * Check auto scaling for all registered scalers
   */
  private async checkAutoScaling(): Promise<void> {
    logger.debug('Checking auto scaling', {
      scalerCount: this.autoScalers.size
    });

    const results = await Promise.allSettled(
      Array.from(this.autoScalers.values()).map(scaler =>
        scaler.evaluateScaling()
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error('Auto scaling evaluation failed', {
          error: result.reason
        });
      }
    });
  }

  /**
   * Execute function with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    name: string,
    fn: () => Promise<T>,
    fallback?: (error: Error) => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(name);

    if (!circuitBreaker) {
      throw new Error(`Circuit breaker '${name}' not found`);
    }

    this.totalRequests++;

    try {
      const result = await circuitBreaker.execute(fn, fallback);
      this.successfulRequests++;
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deploy workload with multi-AZ distribution
   */
  async deployMultiAZ(workload: WorkloadConfig): Promise<void> {
    const key = `${workload.application}-${workload.environment}`;
    let manager = this.multiAZManagers.get(key);

    if (!manager) {
      manager = this.registerMultiAZManager(workload);
    }

    logger.info('Deploying workload with multi-AZ', {
      application: workload.application,
      environment: workload.environment,
      replicas: workload.replicas
    });

    await manager.distributeWorkload(workload);
  }

  /**
   * Get resilience metrics
   */
  getMetrics(): ResilienceMetrics {
    const circuitBreakerStats: { [name: string]: any } = {};
    this.circuitBreakers.forEach((cb, name) => {
      circuitBreakerStats[name] = cb.getStats();
    });

    const autoScalingStats: { [key: string]: any } = {};
    this.autoScalers.forEach((scaler, key) => {
      autoScalingStats[key] = scaler.getStatus();
    });

    const failoverEvents = Array.from(this.failoverManagers.values())
      .flatMap(manager => manager.getStatus().failoverHistory);

    const distributions = Array.from(this.multiAZManagers.values())
      .map(manager => {
        // Get distribution info
        return {
          zones: [],
          totalPods: 0,
          strategy: 'equal'
        };
      });

    // Calculate uptime
    const uptimeMs = Date.now() - this.startTime.getTime();
    const uptime = uptimeMs / 1000 / 60; // minutes

    // Calculate availability
    const availability =
      this.totalRequests > 0
        ? (this.successfulRequests / this.totalRequests) * 100
        : 100;

    return {
      circuitBreakers: circuitBreakerStats,
      autoScaling: autoScalingStats,
      failovers: failoverEvents,
      multiAZ: {
        distributions
      },
      uptime,
      availability
    };
  }

  /**
   * Get health status
   */
  getHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      circuitBreakers: any;
      failovers: any;
      autoScaling: any;
    };
  } {
    const circuitBreakerHealth: any = {};
    let openCircuits = 0;

    this.circuitBreakers.forEach((cb, name) => {
      const stats = cb.getStats();
      circuitBreakerHealth[name] = {
        state: stats.state,
        errorRate: stats.errorRate
      };

      if (stats.state === 'OPEN') {
        openCircuits++;
      }
    });

    const failoverHealth: any = {};
    let unhealthyFailovers = 0;

    this.failoverManagers.forEach((manager, key) => {
      const health = manager.getHealth();
      failoverHealth[key] = health.overall;

      if (health.overall === 'unhealthy') {
        unhealthyFailovers++;
      }
    });

    const autoScalingHealth: any = {};
    this.autoScalers.forEach((scaler, key) => {
      const status = scaler.getStatus();
      autoScalingHealth[key] = {
        currentReplicas: status.currentReplicas,
        targetReplicas: status.targetReplicas
      };
    });

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (unhealthyFailovers > 0 || openCircuits > this.circuitBreakers.size / 2) {
      overall = 'unhealthy';
    } else if (openCircuits > 0 || unhealthyFailovers > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      components: {
        circuitBreakers: circuitBreakerHealth,
        failovers: failoverHealth,
        autoScaling: autoScalingHealth
      }
    };
  }

  /**
   * Shutdown all components gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down resilience orchestrator');

    // Stop all failover managers
    this.failoverManagers.forEach(manager => {
      manager.stop();
    });

    // Clear all maps
    this.circuitBreakers.clear();
    this.multiAZManagers.clear();
    this.autoScalers.clear();
    this.failoverManagers.clear();

    logger.info('Resilience orchestrator shut down');
  }

  /**
   * Get circuit breaker by name
   */
  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Get failover manager by domain
   */
  getFailoverManager(domain: string): FailoverManager | undefined {
    return this.failoverManagers.get(domain);
  }

  /**
   * Get auto scaler by key
   */
  getAutoScaler(application: string, namespace: string): AutoScaler | undefined {
    const key = `${application}-${namespace}`;
    return this.autoScalers.get(key);
  }
}

/**
 * Export singleton instance
 */
let orchestratorInstance: ResilienceOrchestrator | null = null;

export function createResilienceOrchestrator(
  config: ResilienceConfig
): ResilienceOrchestrator {
  if (orchestratorInstance) {
    logger.warn('Resilience orchestrator already exists, returning existing instance');
    return orchestratorInstance;
  }

  orchestratorInstance = new ResilienceOrchestrator(config);
  return orchestratorInstance;
}

export function getResilienceOrchestrator(): ResilienceOrchestrator | null {
  return orchestratorInstance;
}
