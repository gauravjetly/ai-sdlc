/**
 * MCP Type Definitions
 *
 * Core types for the Model Context Protocol implementation
 */

import { z } from 'zod';

/**
 * Tool definition structure
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
}

/**
 * Tool with execution handler
 */
export interface Tool extends ToolDefinition {
  handler: (args: any) => Promise<any>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * MCP Server capabilities
 */
export interface MCPCapabilities {
  tools: {};
  resources?: {};
  prompts?: {};
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
}

/**
 * Deployment resource
 */
export interface DeploymentResource {
  id: string;
  application: string;
  version: string;
  environment: 'dev' | 'uat' | 'prod' | 'dr';
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolling_back';
  strategy?: 'rolling' | 'blue-green' | 'canary';
  replicas?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Infrastructure workflow
 */
export interface InfrastructureWorkflow {
  id: string;
  name: string;
  cloud: 'aws' | 'oci' | 'azure' | 'gcp';
  environment: 'dev' | 'uat' | 'prod' | 'dr';
  status: 'provisioning' | 'provisioned' | 'failed' | 'destroying';
  resources: InfrastructureResource[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Infrastructure resource
 */
export interface InfrastructureResource {
  type: string;
  name: string;
  id?: string;
  status: 'pending' | 'creating' | 'available' | 'failed' | 'deleting';
  properties?: Record<string, any>;
}

/**
 * Security scan result
 */
export interface SecurityScanResult {
  id: string;
  target: string;
  scanType: 'vulnerabilities' | 'compliance' | 'secrets' | 'all';
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  createdAt: Date;
}

/**
 * Security finding
 */
export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  cve?: string;
  recommendation: string;
  affectedComponent: string;
}

/**
 * Cost report
 */
export interface CostReport {
  id: string;
  period: string;
  cloud: 'aws' | 'oci' | 'azure' | 'gcp';
  totalCost: number;
  breakdown: CostBreakdown[];
  trends: CostTrend[];
}

/**
 * Cost breakdown by service
 */
export interface CostBreakdown {
  service: string;
  cost: number;
  percentage: number;
  resources: number;
}

/**
 * Cost trend
 */
export interface CostTrend {
  date: string;
  cost: number;
  forecast?: number;
}

/**
 * Observability metrics
 */
export interface ObservabilityMetrics {
  timestamp: Date;
  service: string;
  metrics: {
    cpu: number;
    memory: number;
    requests: number;
    errors: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
}

/**
 * Release deployment
 */
export interface Release {
  id: string;
  version: string;
  application: string;
  environment: 'dev' | 'uat' | 'prod' | 'dr';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  strategy: 'rolling' | 'blue-green' | 'canary';
  stages: ReleaseStage[];
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Release stage
 */
export interface ReleaseStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  logs?: string[];
}

/**
 * Test execution result
 */
export interface TestResult {
  id: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  status: 'passed' | 'failed' | 'skipped';
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  failures?: TestFailure[];
}

/**
 * Test failure
 */
export interface TestFailure {
  test: string;
  message: string;
  stack?: string;
}

/**
 * Architecture validation result
 */
export interface ArchitectureValidation {
  id: string;
  target: string;
  status: 'valid' | 'invalid' | 'warning';
  violations: ArchitectureViolation[];
  metrics: {
    coupling: number;
    cohesion: number;
    complexity: number;
  };
}

/**
 * Architecture violation
 */
export interface ArchitectureViolation {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  location: string;
  recommendation: string;
}
