/**
 * Observability Types
 * Type definitions for metrics, health checks, and monitoring
 */

// ===========================
// METRICS TYPES
// ===========================

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface Counter {
  name: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}

export interface Gauge {
  name: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}

export interface Histogram {
  name: string;
  help: string;
  buckets: number[];
  observations: number[];
  sum: number;
  count: number;
  labels?: Record<string, string>;
}

export interface Summary {
  name: string;
  help: string;
  quantiles: Record<string, number>;
  sum: number;
  count: number;
  labels?: Record<string, string>;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface Metric {
  name: string;
  type: MetricType;
  help: string;
  data: Counter | Gauge | Histogram | Summary;
}

// ===========================
// DEPLOYMENT METRICS
// ===========================

export interface DeploymentMetrics {
  // Counters
  deployments_total: number;
  deployments_success_total: number;
  deployments_failed_total: number;
  deployments_rolled_back_total: number;

  // Gauges
  deployments_active: number;
  deployments_in_progress: number;

  // Histograms
  deployment_duration_seconds: Histogram;
  deployment_rollback_duration_seconds: Histogram;

  // By environment
  by_environment: Record<string, {
    total: number;
    success: number;
    failed: number;
    avg_duration_seconds: number;
  }>;

  // By strategy
  by_strategy: Record<string, {
    total: number;
    success_rate: number;
  }>;
}

// ===========================
// RESOURCE METRICS
// ===========================

export interface ResourceMetrics {
  // CPU metrics
  cpu_usage_percent: Gauge;
  cpu_limit_millicores: Gauge;
  cpu_request_millicores: Gauge;

  // Memory metrics
  memory_usage_bytes: Gauge;
  memory_limit_bytes: Gauge;
  memory_request_bytes: Gauge;

  // Pod metrics
  pods_total: Gauge;
  pods_running: Gauge;
  pods_pending: Gauge;
  pods_failed: Gauge;

  // Node metrics
  nodes_total: Gauge;
  nodes_ready: Gauge;
  nodes_not_ready: Gauge;

  // Container metrics
  container_restarts_total: Counter;

  // By namespace
  by_namespace: Record<string, ResourceMetrics>;
}

// ===========================
// COST METRICS
// ===========================

export interface CostMetrics {
  // Daily costs
  cost_daily_usd: Gauge;
  cost_monthly_projection_usd: Gauge;
  cost_forecast_accuracy_percent: Gauge;

  // By service
  by_service: Record<string, number>;

  // By cloud provider
  by_cloud: Record<string, number>;

  // By environment
  by_environment: Record<string, number>;

  // Cost optimization
  optimization_savings_usd: Gauge;
  waste_detected_usd: Gauge;
}

// ===========================
// AGENT METRICS
// ===========================

export interface AgentMetrics {
  // Execution metrics
  agent_executions_total: Counter;
  agent_execution_duration_seconds: Histogram;
  agent_execution_success_total: Counter;
  agent_execution_failed_total: Counter;

  // By agent type
  by_agent: Record<string, {
    executions: number;
    success_rate: number;
    avg_duration_seconds: number;
  }>;

  // Queue metrics
  agent_queue_length: Gauge;
  agent_queue_wait_time_seconds: Histogram;
}

// ===========================
// SECURITY METRICS
// ===========================

export interface SecurityMetrics {
  // Vulnerability metrics
  vulnerabilities_total: Gauge;
  vulnerabilities_critical: Gauge;
  vulnerabilities_high: Gauge;
  vulnerabilities_medium: Gauge;
  vulnerabilities_low: Gauge;

  // Scan metrics
  security_scans_total: Counter;
  security_scans_duration_seconds: Histogram;

  // Compliance
  compliance_score_percent: Gauge;
  failed_compliance_checks: Gauge;
}

// ===========================
// API METRICS
// ===========================

export interface ApiMetrics {
  // Request metrics
  http_requests_total: Counter;
  http_request_duration_seconds: Histogram;
  http_requests_in_flight: Gauge;

  // Response status
  http_responses_by_status: Record<string, number>;

  // By endpoint
  by_endpoint: Record<string, {
    requests: number;
    avg_duration_ms: number;
    error_rate: number;
  }>;

  // Rate limiting
  rate_limit_exceeded_total: Counter;
}

// ===========================
// HEALTH CHECK TYPES
// ===========================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  duration_ms: number;
  error?: string;
  details?: Record<string, any>;
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  timestamp: Date;
  duration_ms: number;
  details?: Record<string, any>;
  dependencies?: ComponentHealth[];
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime_seconds: number;
  version: string;
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    kubernetes: ComponentHealth;
    aws: ComponentHealth;
  };
  metrics: {
    memory_usage_percent: number;
    cpu_usage_percent: number;
    disk_usage_percent: number;
  };
}

// ===========================
// SLO/SLI TYPES
// ===========================

export interface SLI {
  name: string;
  description: string;
  query: string;
  unit: string;
}

export interface SLO {
  name: string;
  description: string;
  sli: SLI;
  target: number;
  window: string; // e.g., '30d', '7d'
  error_budget: number;
}

export interface SLOStatus {
  slo: SLO;
  current_value: number;
  target_value: number;
  error_budget_remaining: number;
  error_budget_consumed: number;
  status: 'met' | 'at_risk' | 'breached';
  timestamp: Date;
}

// ===========================
// TRACING TYPES
// ===========================

export interface TraceContext {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  trace_flags: number;
}

export interface Span {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  status: 'ok' | 'error' | 'cancelled';
  attributes: Record<string, any>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes: Record<string, any>;
}

// ===========================
// LOG TYPES
// ===========================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredLog {
  level: LogLevel;
  message: string;
  timestamp: Date;
  correlation_id: string;
  trace_id?: string;
  span_id?: string;
  component: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// ===========================
// DASHBOARD TYPES
// ===========================

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap';
  targets: DashboardTarget[];
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DashboardTarget {
  expr: string;
  legendFormat?: string;
  refId: string;
}

export interface Dashboard {
  title: string;
  description: string;
  tags: string[];
  panels: DashboardPanel[];
}

// ===========================
// ALERT TYPES
// ===========================

export interface Alert {
  name: string;
  query: string;
  condition: string;
  threshold: number;
  duration: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  runbook_url?: string;
}

export interface AlertRule {
  alert: Alert;
  enabled: boolean;
  last_triggered?: Date;
  trigger_count: number;
}
