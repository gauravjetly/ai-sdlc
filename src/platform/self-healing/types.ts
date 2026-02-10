/**
 * Type definitions for Self-Healing Engine & Health Monitor
 */

export type IssueType =
  | 'container_crash'
  | 'memory_leak'
  | 'connection_pool_exhausted'
  | 'disk_full'
  | 'high_error_rate'
  | 'slow_response'
  | 'resource_exhaustion';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RemediationAction =
  | 'restart_pod'
  | 'scale_up'
  | 'clear_cache'
  | 'reset_connection_pool'
  | 'clean_disk'
  | 'rollback_deployment'
  | 'increase_limits'
  | 'manual_intervention_required';

export type RemediationStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped';

export type IncidentStatus =
  | 'detected'
  | 'awaiting_approval'
  | 'remediating'
  | 'resolved'
  | 'failed'
  | 'ignored';

export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  resource: {
    type: 'pod' | 'deployment' | 'service' | 'node';
    name: string;
    namespace?: string;
  };
  description: string;
  detectedAt: Date;
  metrics?: {
    [key: string]: number;
  };
  metadata?: {
    [key: string]: any;
  };
}

export interface RemediationPlan {
  issueId: string;
  actions: RemediationAction[];
  estimatedDuration: number; // seconds
  requiresApproval: boolean;
  rollbackPossible: boolean;
}

export interface RemediationResult {
  issueId: string;
  action: RemediationAction;
  status: RemediationStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  success: boolean;
  error?: string;
  details?: {
    [key: string]: any;
  };
}

export interface DetectorConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  thresholds: {
    [key: string]: number;
  };
}

export interface SelfHealingConfig {
  enabled: boolean;
  autoRemediate: boolean;
  requireApprovalFor: IssueSeverity[];
  maxRemediationAttempts: number;
  cooldownPeriod: number; // milliseconds
  detectors: {
    containerCrash: DetectorConfig;
    memoryLeak: DetectorConfig;
    connectionPool: DetectorConfig;
  };
}

export interface SelfHealingMetrics {
  totalIssuesDetected: number;
  issuesRemediated: number;
  issuesAwaitingApproval: number;
  remediationSuccessRate: number;
  averageRemediationTime: number;
  issuesByType: {
    [type: string]: number;
  };
  remediationsByAction: {
    [action: string]: number;
  };
}

export interface SelfHealingIncident {
  id: string;
  issueType: IssueType;
  severity: IssueSeverity;
  resourceType: string;
  resourceName: string;
  namespace?: string;
  description: string;
  detectedAt: Date;
  status: IncidentStatus;
  metrics?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Health Monitor Types

export interface HealthCheckConfig {
  enabled: boolean;
  podCheckInterval: number;
  deploymentCheckInterval: number;
  performanceCheckInterval: number;
  readinessCheckInterval: number;
  thresholds: {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    latency: number;
    restartCount: number;
  };
}

export interface ResourceHealth {
  resourceType: 'pod' | 'deployment' | 'service' | 'node';
  resourceName: string;
  namespace?: string;
  healthy: boolean;
  lastCheck: Date;
  issues: Issue[];
  metrics: {
    [key: string]: any;
  };
}

export interface PodHealth {
  podName: string;
  namespace: string;
  phase: string;
  healthy: boolean;
  issues: Issue[];
  conditions: any[];
  containerStatuses: any[];
  metrics: {
    [key: string]: any;
  };
  lastCheck: Date;
}

export interface DeploymentHealth {
  deploymentName: string;
  namespace: string;
  healthy: boolean;
  issues: Issue[];
  replicas: {
    desired: number;
    ready: number;
    available: number;
    updated: number;
  };
  conditions: any[];
  metrics: {
    [key: string]: any;
  };
  lastCheck: Date;
}

export interface HealthMetrics {
  totalChecks: number;
  failedChecks: number;
  healthyResources: number;
  unhealthyResources: number;
  averageResponseTime: number;
  checksByType: {
    [type: string]: number;
  };
}

// Rate Limiting Types

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Error message when limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: any) => string; // Function to generate unique keys
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

// Retry Logic Types

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error codes/messages to retry
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  totalDuration: number;
  errors: Error[];
}
