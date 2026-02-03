/**
 * Environment Management Type Definitions
 * Defines all types for environment configuration, promotion, and variables
 */

// =============================================
// BASE TYPES
// =============================================

export type Environment = 'dev' | 'staging' | 'prod' | 'dr';

export type EnvironmentStatus = 'healthy' | 'warning' | 'error' | 'unknown';

export type PromotionStatus =
  | 'idle'
  | 'validating'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'rolled_back'
  | 'failed';

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export type VariableType = 'plain' | 'secret' | 'reference';

export type DiffFilter =
  | 'all'
  | 'additions'
  | 'deletions'
  | 'modifications'
  | 'compute'
  | 'database'
  | 'network'
  | 'storage';

// =============================================
// ENVIRONMENT METADATA
// =============================================

export interface EnvironmentMetadata {
  id: string;
  name: Environment;
  displayName: string;
  description?: string;
  color: string;
  status: EnvironmentStatus;
  isProtected: boolean;
  approvalRequired: boolean;
  createdAt: Date;
  lastModifiedAt: Date;
  lastDeployedAt?: Date;
  deployedBy?: string;
  resourceCount: number;
}

export const ENVIRONMENT_COLORS: Record<Environment, string> = {
  dev: '#4CAF50',
  staging: '#FF9800',
  prod: '#F44336',
  dr: '#9C27B0',
};

export const ENVIRONMENT_DISPLAY_NAMES: Record<Environment, string> = {
  dev: 'Development',
  staging: 'Staging',
  prod: 'Production',
  dr: 'Disaster Recovery',
};

// =============================================
// CONFIGURATION TYPES
// =============================================

export interface ConfigOverride {
  path: string;
  originalValue: unknown;
  overrideValue: unknown;
  reason?: string;
  modifiedBy: string;
  modifiedAt: Date;
}

export interface ConfigOverrides {
  [path: string]: ConfigOverride;
}

export interface ComputeConfig {
  instanceType: string;
  replicas: number;
  autoScaling: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    targetCPU: number;
  };
  resources: {
    cpu: string;
    memory: string;
  };
}

export interface DatabaseConfig {
  instanceClass: string;
  storageSize: number;
  storageType: string;
  multiAZ: boolean;
  readReplicas: number;
  backupRetention: number;
}

export interface NetworkConfig {
  enableNAT: boolean;
  enableVPN: boolean;
  enablePrivateLink: boolean;
  vpcEndpoints: string[];
}

export interface StorageConfig {
  type: string;
  size: number;
  iops?: number;
  encrypted: boolean;
}

export interface ResourceConfig {
  compute?: ComputeConfig;
  database?: DatabaseConfig;
  network?: NetworkConfig;
  storage?: StorageConfig;
}

export interface EnvironmentConfig {
  metadata: EnvironmentMetadata;
  baseConfig: ResourceConfig;
  overrides: ConfigOverrides;
  variables: EnvironmentVariable[];
  costEstimate: CostEstimate;
}

// =============================================
// COST TYPES
// =============================================

export interface CostBreakdown {
  compute: number;
  database: number;
  network: number;
  storage: number;
  other: number;
}

export interface CostEstimate {
  monthly: number;
  breakdown: CostBreakdown;
  currency: string;
  lastCalculated: Date;
}

export interface CostDelta {
  baseCost: number;
  effectiveCost: number;
  delta: number;
  percentChange: number;
  breakdown: {
    category: string;
    baseCost: number;
    newCost: number;
    delta: number;
  }[];
}

// =============================================
// DIFF TYPES
// =============================================

export interface DiffEntry {
  path: string;
  type: DiffType;
  category: 'compute' | 'database' | 'network' | 'storage' | 'other';
  sourceValue: unknown;
  targetValue: unknown;
  displayName: string;
}

export interface DiffResult {
  source: Environment;
  target: Environment;
  entries: DiffEntry[];
  summary: {
    total: number;
    additions: number;
    deletions: number;
    modifications: number;
  };
  calculatedAt: Date;
}

// =============================================
// PROMOTION TYPES
// =============================================

export interface PromotionChange {
  path: string;
  previousValue: unknown;
  newValue: unknown;
  category: string;
}

export interface PromotionRequest {
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  changes: string[];
  reason?: string;
  requestedBy: string;
}

export interface PromotionResult {
  promotionId: string;
  status: PromotionStatus;
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  changes: PromotionChange[];
  requiresApproval: boolean;
  approvers?: string[];
  approvedBy?: string;
  approvedAt?: Date;
  executedAt?: Date;
  completedAt?: Date;
  error?: string;
  costImpact: CostDelta;
}

export interface PromotionRecord {
  id: string;
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  changes: PromotionChange[];
  status: PromotionStatus;
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
  error?: string;
}

export interface AutoPromoteRule {
  id: string;
  name: string;
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  conditions: {
    allTestsPassing: boolean;
    noSecurityIssues: boolean;
    withinBudget: boolean;
    minWaitTime?: number;
  };
  enabled: boolean;
}

// =============================================
// VARIABLE TYPES
// =============================================

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  type: VariableType;
  description?: string;
  secretArn?: string;
  isRequired: boolean;
  validationPattern?: string;
  defaultValue?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface VariableResolution {
  key: string;
  rawValue: string;
  resolvedValue: string;
  isResolved: boolean;
  unresolvedReferences: string[];
}

export interface BulkImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: {
    key: string;
    error: string;
  }[];
}

// =============================================
// AUDIT TYPES
// =============================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action:
    | 'config_view'
    | 'config_change'
    | 'variable_add'
    | 'variable_change'
    | 'variable_delete'
    | 'promotion_request'
    | 'promotion_approve'
    | 'promotion_reject'
    | 'promotion_execute'
    | 'promotion_rollback';
  actor: {
    userId: string;
    email: string;
    role: string;
  };
  environment: Environment;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================
// ERROR TYPES
// =============================================

export enum EnvironmentErrorCode {
  // Configuration errors
  INVALID_OVERRIDE = 'ENV_001',
  VALIDATION_FAILED = 'ENV_002',
  CONFIG_CONFLICT = 'ENV_003',
  CONFIG_NOT_FOUND = 'ENV_004',

  // Promotion errors
  PROMOTION_BLOCKED = 'ENV_010',
  APPROVAL_REQUIRED = 'ENV_011',
  ROLLBACK_FAILED = 'ENV_012',
  ALREADY_PROMOTED = 'ENV_013',
  PROMOTION_IN_PROGRESS = 'ENV_014',

  // Variable errors
  VARIABLE_NOT_FOUND = 'ENV_020',
  SECRET_ACCESS_DENIED = 'ENV_021',
  INVALID_VARIABLE_NAME = 'ENV_022',
  SECRET_ROTATION_FAILED = 'ENV_023',
  VARIABLE_VALIDATION_FAILED = 'ENV_024',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'ENV_030',
  PRODUCTION_ACCESS_DENIED = 'ENV_031',

  // General errors
  NETWORK_ERROR = 'ENV_040',
  UNKNOWN_ERROR = 'ENV_099',
}

export interface EnvironmentError {
  code: EnvironmentErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================
// COMPONENT PROPS
// =============================================

export interface EnvironmentSwitcherProps {
  variant?: 'tabs' | 'dropdown' | 'chips';
  showStatus?: boolean;
  showMetadata?: boolean;
  allowAddEnvironment?: boolean;
  onEnvironmentChange?: (env: Environment) => void;
  disabled?: boolean;
}

export interface EnvironmentConfigPanelProps {
  environment: Environment;
  readOnly?: boolean;
  showCost?: boolean;
  comparisonEnvironment?: Environment;
  onSave?: () => Promise<void>;
  onOverrideChange?: (path: string, value: unknown) => void;
}

export interface EnvironmentDiffProps {
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  filter?: DiffFilter;
  onSync?: (path: string, direction: 'toSource' | 'toTarget') => void;
  onExport?: (format: 'json' | 'pdf') => void;
}

export interface EnvironmentPromotionProps {
  onPromotionComplete?: (result: PromotionResult) => void;
  showHistory?: boolean;
  autoPromoteRules?: AutoPromoteRule[];
}

export interface EnvironmentVariablesProps {
  environment: Environment;
  readOnly?: boolean;
  secretsManagerIntegration?: boolean;
  onVariableChange?: (key: string, variable: EnvironmentVariable) => void;
  onVariableDelete?: (key: string) => void;
}
