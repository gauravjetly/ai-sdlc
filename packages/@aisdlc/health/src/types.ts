/**
 * Health Check Types
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  duration: number;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  overall: HealthStatus;
  timestamp: string;
  checks: HealthCheck[];
  platform: {
    version: string;
    node: string;
    os: string;
    arch: string;
  };
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
}
