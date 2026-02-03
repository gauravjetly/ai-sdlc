/**
 * Template Type Definitions
 * Defines the structure for pre-built infrastructure templates
 */

import type { TemplateCategory, TemplateVisibility, LayerType } from '@prisma/client';

/**
 * Security rule for Security Groups
 */
export interface SecurityRule {
  id: string;
  protocol: 'tcp' | 'udp' | 'icmp' | '-1';
  fromPort: number;
  toPort: number;
  cidrBlocks?: string[];
  ipv6CidrBlocks?: string[];
  securityGroupIds?: string[];
  prefixListIds?: string[];
  description?: string;
}

/**
 * Load Balancer listener configuration
 */
export interface LoadBalancerListener {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  certificateArn?: string;
  defaultActions: ListenerAction[];
}

export interface ListenerAction {
  type: 'forward' | 'redirect' | 'fixed-response';
  targetGroupArn?: string;
  redirectConfig?: {
    protocol: string;
    port: string;
    host?: string;
    path?: string;
    query?: string;
    statusCode: 'HTTP_301' | 'HTTP_302';
  };
  fixedResponseConfig?: {
    contentType: string;
    messageBody: string;
    statusCode: string;
  };
}

/**
 * Target group configuration
 */
export interface TargetGroup {
  name: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  targetType: 'instance' | 'ip' | 'lambda';
  healthCheck: HealthCheck;
}

export interface HealthCheck {
  enabled: boolean;
  path: string;
  port: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP';
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

/**
 * Scaling policy configuration
 */
export interface ScalingPolicy {
  name: string;
  policyType: 'TargetTrackingScaling' | 'StepScaling' | 'SimpleScaling';
  targetTrackingConfiguration?: {
    predefinedMetricSpecification?: {
      predefinedMetricType: 'ASGAverageCPUUtilization' | 'ASGAverageNetworkIn' | 'ASGAverageNetworkOut' | 'ALBRequestCountPerTarget';
      resourceLabel?: string;
    };
    targetValue: number;
    disableScaleIn?: boolean;
  };
  cooldown?: number;
}

/**
 * Template node definition
 */
export interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/**
 * Template edge definition
 */
export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  label?: string;
}

/**
 * Component summary for metadata
 */
export interface ComponentSummary {
  type: string;
  count: number;
  description: string;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  author: string;
  version: string;
  tested: boolean;
  compliance: string[];
  estimatedCost: {
    dev: number;
    staging?: number;
    prod: number;
    currency: string;
  };
  prerequisites: string[];
  customizationGuide: string;
  deploymentTime: string;
  components: ComponentSummary[];
}

/**
 * Complete template definition
 */
export interface TemplateDefinition {
  name: string;
  description: string;
  category: TemplateCategory;
  visibility: TemplateVisibility;
  layerType: LayerType;
  version: string;
  tags: string[];
  templateData: {
    nodes: TemplateNode[];
    edges: TemplateEdge[];
    metadata: TemplateMetadata;
  };
}

/**
 * Node categories for styling
 */
export type NodeCategory = 'security' | 'networking' | 'compute' | 'storage' | 'monitoring';

/**
 * AWS service types supported
 */
export type AWSServiceType =
  | 'security-group'
  | 'iam-role'
  | 'iam-policy'
  | 'kms-key'
  | 'load-balancer'
  | 'route53'
  | 'cloudfront'
  | 'vpn-gateway'
  | 'transit-gateway'
  | 'ec2-instance'
  | 'auto-scaling-group'
  | 'ecs-cluster'
  | 'eks-cluster'
  | 'lambda-function'
  | 's3-bucket'
  | 'dynamodb-table'
  | 'elasticache-cluster'
  | 'efs-filesystem'
  | 'rds-instance'
  | 'cloudwatch-alarm'
  | 'sns-topic'
  | 'sqs-queue'
  | 'api-gateway'
  | 'cognito-user-pool'
  | 'eventbridge-rule'
  | 'codepipeline'
  | 'codebuild'
  | 'codedeploy'
  | 'ecr-repository'
  | 'guardduty'
  | 'security-hub'
  | 'cloudtrail'
  | 'config-rule'
  | 'kinesis-stream'
  | 'glue-job'
  | 'emr-cluster'
  | 'redshift-cluster'
  | 'athena-workgroup';
