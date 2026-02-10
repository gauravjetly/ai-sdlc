/**
 * Type definitions for Resilience & High Availability components
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type ScaleDirection = 'up' | 'down' | 'none';

export interface MultiAZConfig {
  region: string;
  minAvailabilityZones: number;
  zoneBalancingStrategy: 'equal' | 'weighted' | 'priority';
  podAntiAffinityRequired: boolean;
}

export interface WorkloadConfig {
  application: string;
  replicas: number;
  region: string;
  environment: string;
  resourceRequirements: {
    cpu: string;
    memory: string;
  };
}

export interface Distribution {
  zones: ZoneDistribution[];
  totalPods: number;
  strategy: string;
}

export interface ZoneDistribution {
  zone: string;
  pods: number;
  capacity: number;
  utilization: number;
}

export interface AffinityRules {
  podAntiAffinity: {
    requiredDuringSchedulingIgnoredDuringExecution: Array<{
      labelSelector: {
        matchExpressions: Array<{
          key: string;
          operator: string;
          values: string[];
        }>;
      };
      topologyKey: string;
    }>;
  };
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
  errorRateThreshold?: number;
  volumeThreshold?: number;
  rollingWindowSize?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveSuccesses: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  errorRate: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastStateChange: number;
  halfOpenCalls: number;
}

export type FallbackFunction<T> = (error: Error) => Promise<T>;

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastStateChange: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

export interface AutoScaleConfig {
  application: string;
  namespace: string;
  currentReplicas: number;
  minReplicas: number;
  maxReplicas: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  resourceLimits: {
    cpu: number;
    memory: number;
  };
}

export interface ScaleResult {
  application: string;
  previousReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  action: 'scaled_up' | 'scaled_down' | 'no_change';
  reason: string;
  timestamp: Date;
}

export interface Metrics {
  cpu: number;
  memory: number;
  requestRate: number;
  errorRate: number;
  latencyP99: number;
  timestamp: Date;
}

export interface FailoverConfig {
  primaryEndpoint: string;
  secondaryEndpoint: string;
  primaryTargetGroup: string;
  secondaryTargetGroup: string;
  domain: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  failureThreshold: number;
  recoveryTime: number;
}

export interface HealthStatus {
  healthy: boolean;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastCheckTime: Date;
  responseTime: number;
  statusCode?: number;
  error?: string;
}

export interface FailoverEvent {
  type: 'initiated' | 'completed' | 'failed' | 'reverted';
  timestamp: Date;
  fromEndpoint: string;
  toEndpoint: string;
  reason: string;
  duration: number;
}

export interface ResilienceMetrics {
  circuitBreakers: {
    [name: string]: CircuitBreakerState;
  };
  autoScaling: {
    [application: string]: ScaleResult;
  };
  failovers: FailoverEvent[];
  multiAZ: {
    distributions: Distribution[];
  };
  uptime: number;
  availability: number;
}

export interface ResilienceConfig {
  multiAZ: MultiAZConfig;
  circuitBreaker: CircuitBreakerConfig;
  autoScaling: {
    enabled: boolean;
    checkInterval: number;
    policies: AutoScaleConfig[];
  };
  failover: {
    enabled: boolean;
    monitorInterval: number;
    configs: FailoverConfig[];
  };
}
