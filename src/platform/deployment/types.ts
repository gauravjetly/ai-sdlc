/**
 * Deployment Strategy Types
 * Comprehensive type definitions for zero-downtime deployments
 */

/**
 * Deployment strategy types supported by the platform
 */
export type DeploymentStrategyType = 'rolling' | 'blue-green' | 'canary';

/**
 * Deployment status lifecycle
 */
export type DeploymentStatus =
  | 'pending'
  | 'in-progress'
  | 'promoting'
  | 'succeeded'
  | 'failed'
  | 'rolled-back'
  | 'paused';

/**
 * Environment identifier for blue-green deployments
 */
export type Environment = 'blue' | 'green';

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    readiness: boolean;
    liveness: boolean;
    startup?: boolean;
  };
  message?: string;
  timestamp: string;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  endpoint: string;
  port: number;
  path: string;
  protocol: 'http' | 'https' | 'tcp';
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
  success_threshold: number;
  initial_delay_seconds?: number;
}

/**
 * Resource limits for containers
 */
export interface ResourceRequirements {
  cpu: string; // e.g., "500m", "1"
  memory: string; // e.g., "512Mi", "1Gi"
  ephemeral_storage?: string;
}

/**
 * Rolling deployment specific options
 */
export interface RollingDeploymentOptions {
  max_unavailable: string | number; // "20%" or 2
  max_surge: string | number; // "20%" or 2
  progress_deadline_seconds: number;
  min_ready_seconds?: number;
}

/**
 * Blue-green deployment specific options
 */
export interface BlueGreenDeploymentOptions {
  monitoring_period_seconds: number; // Time to monitor before finalizing
  auto_rollback_on_error: boolean;
  cleanup_delay_seconds: number; // Time before cleaning up old environment
  smoke_tests?: SmokeTest[];
}

/**
 * Canary deployment specific options
 */
export interface CanaryDeploymentOptions {
  stages: CanaryStage[];
  metrics: CanaryMetrics;
  auto_promotion: boolean;
  auto_rollback: boolean;
}

/**
 * Canary deployment stage
 */
export interface CanaryStage {
  traffic_percent: number;
  duration_seconds: number;
}

/**
 * Metrics thresholds for canary deployments
 */
export interface CanaryMetrics {
  error_rate_threshold: number; // 0.01 = 1%
  latency_p99_threshold_ms: number;
  success_rate_threshold: number; // 0.999 = 99.9%
  request_duration_seconds?: number; // How long to collect metrics
}

/**
 * Smoke test definition
 */
export interface SmokeTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expected_status: number;
  timeout_ms: number;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Strategy-specific options
 */
export type StrategyOptions =
  | RollingDeploymentOptions
  | BlueGreenDeploymentOptions
  | CanaryDeploymentOptions;

/**
 * Complete deployment configuration
 */
export interface DeploymentConfig {
  application: string;
  version: string;
  environment: string; // dev, test, prod
  replicas: number;
  image: string;
  namespace?: string;
  healthCheck: HealthCheckConfig;
  resources?: {
    requests?: ResourceRequirements;
    limits?: ResourceRequirements;
  };
  strategy: {
    type: DeploymentStrategyType;
    options: StrategyOptions;
  };
  environmentVariables?: Record<string, string>;
  secrets?: string[]; // References to Kubernetes secrets
  volumes?: VolumeConfig[];
}

/**
 * Volume configuration
 */
export interface VolumeConfig {
  name: string;
  type: 'configmap' | 'secret' | 'pvc' | 'emptydir';
  source: string; // Name of the source resource
  mount_path: string;
  read_only?: boolean;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  deploymentId: string;
  status: DeploymentStatus;
  version: string;
  message?: string;
  timestamp: string;
  metrics?: DeploymentMetrics;
  rollback_available: boolean;
}

/**
 * Deployment metrics
 */
export interface DeploymentMetrics {
  duration_seconds: number;
  replicas_updated: number;
  replicas_total: number;
  error_count: number;
  success_rate: number;
  average_response_time_ms?: number;
}

/**
 * Deployment status query result
 */
export interface DeploymentStatusResult {
  deploymentId: string;
  application: string;
  version: string;
  status: DeploymentStatus;
  strategy: DeploymentStrategyType;
  started_at: string;
  completed_at?: string;
  current_stage?: string;
  progress_percent: number;
  replicas: {
    desired: number;
    current: number;
    ready: number;
    updated: number;
  };
  conditions: DeploymentCondition[];
  events: DeploymentEvent[];
}

/**
 * Deployment condition
 */
export interface DeploymentCondition {
  type: 'Progressing' | 'Available' | 'ReplicaFailure';
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  last_update: string;
}

/**
 * Deployment event
 */
export interface DeploymentEvent {
  timestamp: string;
  type: 'Normal' | 'Warning' | 'Error';
  reason: string;
  message: string;
}

/**
 * Traffic routing configuration
 */
export interface TrafficRouting {
  service_name: string;
  namespace: string;
  stable_weight: number; // 0-100
  canary_weight: number; // 0-100
  load_balancer_type: 'internal' | 'external' | 'service-mesh';
}

/**
 * Rollback configuration
 */
export interface RollbackConfig {
  to_version?: string; // If not specified, rollback to previous
  reason: string;
  force?: boolean;
}

/**
 * Database migration phase
 */
export type MigrationPhase = 'expand' | 'migrate-data' | 'contract';

/**
 * Database migration definition
 */
export interface Migration {
  id: string;
  version: string;
  phase: MigrationPhase;
  description: string;
  up_script: string;
  down_script: string; // For rollback
  created_at: string;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  migration_id: string;
  phase: MigrationPhase;
  status: 'succeeded' | 'failed' | 'rolled-back';
  duration_ms: number;
  error?: string;
  timestamp: string;
}

/**
 * Schema version compatibility
 */
export interface SchemaVersion {
  version: string;
  compatible_with: string[]; // List of compatible versions (N and N-1)
  migrations: Migration[];
  deployed_at?: string;
}

/**
 * Deployment strategy interface
 */
export interface IDeploymentStrategy {
  readonly name: DeploymentStrategyType;

  /**
   * Execute deployment with the configured strategy
   */
  deploy(config: DeploymentConfig): Promise<DeploymentResult>;

  /**
   * Rollback to previous version
   */
  rollback(deploymentId: string, config?: RollbackConfig): Promise<void>;

  /**
   * Get current deployment status
   */
  getStatus(deploymentId: string): Promise<DeploymentStatusResult>;

  /**
   * Pause an in-progress deployment
   */
  pause(deploymentId: string): Promise<void>;

  /**
   * Resume a paused deployment
   */
  resume(deploymentId: string): Promise<void>;
}

/**
 * Pod information
 */
export interface PodInfo {
  name: string;
  ready: boolean;
  status: string;
  restarts: number;
  age: string;
  ip?: string;
  node?: string;
}

/**
 * Deployment history entry
 */
export interface DeploymentHistoryEntry {
  revision: number;
  deploymentId: string;
  version: string;
  strategy: DeploymentStrategyType;
  deployed_at: string;
  deployed_by: string;
  status: DeploymentStatus;
  duration_seconds?: number;
  rollback_from?: string; // If this was a rollback, the version it rolled back from
}
