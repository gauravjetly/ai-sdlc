/**
 * Base Types for AWS Node Components
 * Defines the foundational type system for all visual designer nodes
 */

/**
 * Node categories for color-coding and organization
 */
export type NodeCategory =
  | 'security'
  | 'networking'
  | 'compute'
  | 'storage'
  | 'monitoring';

/**
 * AWS service identifiers for each node type
 */
export type AWSServiceType =
  // Security
  | 'security-group'
  | 'iam-role'
  | 'iam-policy'
  | 'kms-key'
  // Networking
  | 'load-balancer'
  | 'route53'
  | 'cloudfront'
  | 'vpn-gateway'
  | 'transit-gateway'
  // Compute
  | 'ec2-instance'
  | 'auto-scaling-group'
  | 'ecs-cluster'
  | 'lambda-function'
  // Storage
  | 's3-bucket'
  | 'dynamodb-table'
  | 'elasticache-cluster'
  | 'efs-filesystem'
  // Monitoring
  | 'cloudwatch-alarm'
  | 'sns-topic'
  | 'sqs-queue';

/**
 * Connection handle types for typed connections
 */
export type HandleType =
  | 'vpc-attachment'
  | 'subnet-placement'
  | 'security-attachment'
  | 'iam-role'
  | 'encryption'
  | 'target'
  | 'trigger'
  | 'notification'
  | 'dns-alias'
  | 'origin';

/**
 * Node configuration status
 */
export type NodeStatus =
  | 'unconfigured'
  | 'configured'
  | 'warning'
  | 'error'
  | 'deployed';

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation message for a node
 */
export interface ValidationMessage {
  code: string;
  message: string;
  field?: string;
  severity: ValidationSeverity;
}

/**
 * Validation result for a node
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

/**
 * Connection point definition
 */
export interface HandleDefinition {
  id: string;
  type: HandleType;
  position: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  maxConnections?: number;
}

/**
 * Base interface for all node data
 */
export interface BaseNodeData {
  id: string;
  name: string;
  serviceType: AWSServiceType;
  category: NodeCategory;
  tags: Record<string, string>;
  status: NodeStatus;
  validationResult?: ValidationResult;
  estimatedMonthlyCost?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Node metadata for registry
 */
export interface NodeMetadata {
  serviceType: AWSServiceType;
  category: NodeCategory;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  handles: {
    inputs: HandleDefinition[];
    outputs: HandleDefinition[];
  };
  defaultData: Partial<BaseNodeData>;
  terraformResource: string;
  awsDocUrl: string;
}

/**
 * Connection rule definition
 */
export interface ConnectionRule {
  sourceType: AWSServiceType;
  targetType: AWSServiceType;
  sourceHandle: HandleType;
  targetHandle: HandleType;
  connectionType: string;
  description: string;
  maxConnections?: number;
  validator?: (source: BaseNodeData, target: BaseNodeData) => ValidationResult;
}

/**
 * Cost estimate interface
 */
export interface CostEstimate {
  hourly: number;
  monthly: number;
  yearly: number;
  breakdown: CostBreakdownItem[];
  currency: 'USD';
}

/**
 * Cost breakdown item
 */
export interface CostBreakdownItem {
  component: string;
  description: string;
  hourly: number;
  monthly: number;
  unit: string;
  quantity: number;
}
