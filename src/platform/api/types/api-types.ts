/**
 * API Type Definitions
 * Common types used across the REST API
 */

import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
  traceId?: string;
  timestamp: string;
}

export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  duration?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}

export type UserRole = 'admin' | 'developer' | 'viewer' | 'operator';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  traceId?: string;
}

// Deployment Types
export interface DeploymentRequest {
  name: string;
  environment: 'dev' | 'uat' | 'prod' | 'dr';
  version: string;
  replicas?: number;
  strategy?: 'rolling' | 'blue-green' | 'canary';
  image: string;
  cluster: string;
  environmentVariables?: Record<string, string>;
}

export interface DeploymentResponse {
  id: string;
  name: string;
  environment: string;
  version: string;
  status: 'pending' | 'deploying' | 'running' | 'failed' | 'rolled-back';
  replicas: number;
  strategy: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Infrastructure Types
export interface InfrastructureProvisionRequest {
  provider: 'aws' | 'oci';
  region: string;
  resources: InfrastructureResource[];
  tags?: Record<string, string>;
}

export interface InfrastructureResource {
  type: 'virtual_network' | 'kubernetes_cluster' | 'managed_database' | 'object_storage';
  name: string;
  config: Record<string, any>;
}

// Security Types
export interface SecurityScanRequest {
  target: string; // deployment ID, image, etc.
  scanType: 'vulnerability' | 'compliance' | 'secrets' | 'all';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface VulnerabilityResult {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  cve?: string;
  affectedComponent: string;
  fixAvailable: boolean;
  fixVersion?: string;
}

// Cost Types
export interface CostAnalysisRequest {
  startDate: string; // ISO 8601
  endDate: string;
  groupBy?: 'service' | 'environment' | 'team' | 'tag';
  provider?: 'aws' | 'oci';
}

export interface CostForecastRequest {
  horizon: 'week' | 'month' | 'quarter' | 'year';
  confidence?: 'low' | 'medium' | 'high';
}

// Observability Types
export interface MetricsQuery {
  metric: string;
  startTime: string;
  endTime: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  groupBy?: string[];
  filters?: Record<string, string>;
}

export interface LogQuery {
  query: string;
  startTime: string;
  endTime: string;
  limit?: number;
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  duration: string; // e.g., "5m", "1h"
  severity: 'info' | 'warning' | 'critical';
  channels: string[]; // notification channels
  enabled: boolean;
}

// Testing Types
export interface TestRunRequest {
  suite: string;
  environment: string;
  parallel?: boolean;
  tags?: string[];
}

export interface TestResult {
  id: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: TestCase[];
  coverage?: CoverageReport;
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface CoverageReport {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

// Release Types
export interface ReleaseRequest {
  name: string;
  version: string;
  environment: string;
  deployments: string[]; // Deployment IDs
  approvers?: string[];
  scheduledAt?: string; // ISO 8601
}

export interface ReleaseResponse {
  id: string;
  name: string;
  version: string;
  environment: string;
  status: 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  approvals: Approval[];
  createdAt: string;
  executedAt?: string;
  completedAt?: string;
}

export interface Approval {
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  timestamp?: string;
}

// Architecture Types
export interface ArchitectureReviewRequest {
  title: string;
  description: string;
  proposedChanges: string[];
  techStack: string[];
  diagrams?: string[]; // URLs to diagrams
  risks?: string[];
}

export interface ADRRequest {
  title: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';
  context: string;
  decision: string;
  consequences: string[];
  alternatives?: string[];
}
