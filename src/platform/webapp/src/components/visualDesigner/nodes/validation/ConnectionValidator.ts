/**
 * ConnectionValidator
 * Validates connections between nodes based on predefined rules
 */

import {
  AWSServiceType,
  HandleType,
  ValidationResult,
  ValidationMessage,
  BaseNodeData,
  ConnectionRule,
} from '../types';

/**
 * Connection rules matrix
 * Defines which node types can connect to which other node types
 */
const CONNECTION_RULES: ConnectionRule[] = [
  // =============================================
  // SECURITY GROUP CONNECTIONS
  // =============================================
  {
    sourceType: 'security-group',
    targetType: 'ec2-instance',
    sourceHandle: 'security-attachment',
    targetHandle: 'security-attachment',
    connectionType: 'security-attachment',
    description: 'Attach security group to EC2 instance',
  },
  {
    sourceType: 'security-group',
    targetType: 'lambda-function',
    sourceHandle: 'security-attachment',
    targetHandle: 'security-attachment',
    connectionType: 'security-attachment',
    description: 'Attach security group to Lambda function (VPC)',
  },
  {
    sourceType: 'security-group',
    targetType: 'load-balancer',
    sourceHandle: 'security-attachment',
    targetHandle: 'security-attachment',
    connectionType: 'security-attachment',
    description: 'Attach security group to Application Load Balancer',
  },
  {
    sourceType: 'security-group',
    targetType: 'ecs-cluster',
    sourceHandle: 'security-attachment',
    targetHandle: 'security-attachment',
    connectionType: 'security-attachment',
    description: 'Attach security group to ECS tasks',
  },
  {
    sourceType: 'security-group',
    targetType: 'elasticache-cluster',
    sourceHandle: 'security-attachment',
    targetHandle: 'security-attachment',
    connectionType: 'security-attachment',
    description: 'Attach security group to ElastiCache cluster',
  },
  {
    sourceType: 'security-group',
    targetType: 'efs-filesystem',
    sourceHandle: 'security-attachment',
    targetHandle: 'security-attachment',
    connectionType: 'security-attachment',
    description: 'Attach security group to EFS mount targets',
  },

  // =============================================
  // IAM ROLE CONNECTIONS
  // =============================================
  {
    sourceType: 'iam-role',
    targetType: 'ec2-instance',
    sourceHandle: 'iam-role',
    targetHandle: 'iam-role',
    connectionType: 'instance-profile',
    description: 'Assign IAM role to EC2 via instance profile',
  },
  {
    sourceType: 'iam-role',
    targetType: 'lambda-function',
    sourceHandle: 'iam-role',
    targetHandle: 'iam-role',
    connectionType: 'execution-role',
    description: 'Assign execution role to Lambda function',
  },
  {
    sourceType: 'iam-role',
    targetType: 'ecs-cluster',
    sourceHandle: 'iam-role',
    targetHandle: 'iam-role',
    connectionType: 'task-role',
    description: 'Assign task role to ECS tasks',
  },

  // =============================================
  // IAM POLICY CONNECTIONS
  // =============================================
  {
    sourceType: 'iam-policy',
    targetType: 'iam-role',
    sourceHandle: 'iam-role',
    targetHandle: 'iam-role',
    connectionType: 'policy-attachment',
    description: 'Attach IAM policy to role',
  },

  // =============================================
  // KMS KEY CONNECTIONS
  // =============================================
  {
    sourceType: 'kms-key',
    targetType: 's3-bucket',
    sourceHandle: 'encryption',
    targetHandle: 'encryption',
    connectionType: 'encryption',
    description: 'Encrypt S3 bucket with KMS key',
  },
  {
    sourceType: 'kms-key',
    targetType: 'dynamodb-table',
    sourceHandle: 'encryption',
    targetHandle: 'encryption',
    connectionType: 'encryption',
    description: 'Encrypt DynamoDB table with KMS key',
  },
  {
    sourceType: 'kms-key',
    targetType: 'efs-filesystem',
    sourceHandle: 'encryption',
    targetHandle: 'encryption',
    connectionType: 'encryption',
    description: 'Encrypt EFS file system with KMS key',
  },
  {
    sourceType: 'kms-key',
    targetType: 'sqs-queue',
    sourceHandle: 'encryption',
    targetHandle: 'encryption',
    connectionType: 'encryption',
    description: 'Encrypt SQS queue with KMS key',
  },
  {
    sourceType: 'kms-key',
    targetType: 'sns-topic',
    sourceHandle: 'encryption',
    targetHandle: 'encryption',
    connectionType: 'encryption',
    description: 'Encrypt SNS topic with KMS key',
  },

  // =============================================
  // LOAD BALANCER CONNECTIONS
  // =============================================
  {
    sourceType: 'load-balancer',
    targetType: 'ec2-instance',
    sourceHandle: 'target',
    targetHandle: 'target',
    connectionType: 'target-registration',
    description: 'Register EC2 instance as load balancer target',
  },
  {
    sourceType: 'load-balancer',
    targetType: 'ecs-cluster',
    sourceHandle: 'target',
    targetHandle: 'target',
    connectionType: 'target-registration',
    description: 'Register ECS service as load balancer target',
  },
  {
    sourceType: 'load-balancer',
    targetType: 'lambda-function',
    sourceHandle: 'target',
    targetHandle: 'target',
    connectionType: 'target-registration',
    description: 'Register Lambda function as ALB target',
  },
  {
    sourceType: 'load-balancer',
    targetType: 'auto-scaling-group',
    sourceHandle: 'target',
    targetHandle: 'target',
    connectionType: 'target-registration',
    description: 'Register ASG as load balancer target',
  },

  // =============================================
  // ROUTE53 CONNECTIONS
  // =============================================
  {
    sourceType: 'route53',
    targetType: 'load-balancer',
    sourceHandle: 'dns-alias',
    targetHandle: 'dns-alias',
    connectionType: 'alias-record',
    description: 'Create Route53 alias record for load balancer',
  },
  {
    sourceType: 'route53',
    targetType: 'cloudfront',
    sourceHandle: 'dns-alias',
    targetHandle: 'dns-alias',
    connectionType: 'alias-record',
    description: 'Create Route53 alias record for CloudFront distribution',
  },
  {
    sourceType: 'route53',
    targetType: 's3-bucket',
    sourceHandle: 'dns-alias',
    targetHandle: 'dns-alias',
    connectionType: 'alias-record',
    description: 'Create Route53 alias record for S3 website',
  },

  // =============================================
  // CLOUDFRONT CONNECTIONS
  // =============================================
  {
    sourceType: 'cloudfront',
    targetType: 's3-bucket',
    sourceHandle: 'origin',
    targetHandle: 'origin',
    connectionType: 'origin',
    description: 'Set S3 bucket as CloudFront origin',
  },
  {
    sourceType: 'cloudfront',
    targetType: 'load-balancer',
    sourceHandle: 'origin',
    targetHandle: 'origin',
    connectionType: 'origin',
    description: 'Set load balancer as CloudFront origin',
  },

  // =============================================
  // EVENT/NOTIFICATION CONNECTIONS
  // =============================================
  {
    sourceType: 's3-bucket',
    targetType: 'lambda-function',
    sourceHandle: 'trigger',
    targetHandle: 'trigger',
    connectionType: 'event-source',
    description: 'Trigger Lambda from S3 events',
  },
  {
    sourceType: 'dynamodb-table',
    targetType: 'lambda-function',
    sourceHandle: 'trigger',
    targetHandle: 'trigger',
    connectionType: 'event-source',
    description: 'Trigger Lambda from DynamoDB streams',
  },
  {
    sourceType: 'sqs-queue',
    targetType: 'lambda-function',
    sourceHandle: 'trigger',
    targetHandle: 'trigger',
    connectionType: 'event-source',
    description: 'Trigger Lambda from SQS queue',
  },
  {
    sourceType: 'sns-topic',
    targetType: 'lambda-function',
    sourceHandle: 'notification',
    targetHandle: 'notification',
    connectionType: 'subscription',
    description: 'Subscribe Lambda to SNS topic',
  },
  {
    sourceType: 'sns-topic',
    targetType: 'sqs-queue',
    sourceHandle: 'notification',
    targetHandle: 'notification',
    connectionType: 'subscription',
    description: 'Subscribe SQS queue to SNS topic',
  },
  {
    sourceType: 'cloudwatch-alarm',
    targetType: 'sns-topic',
    sourceHandle: 'notification',
    targetHandle: 'notification',
    connectionType: 'alarm-action',
    description: 'Send CloudWatch alarm notifications to SNS topic',
  },

  // =============================================
  // VPC NETWORKING CONNECTIONS
  // =============================================
  {
    sourceType: 'transit-gateway',
    targetType: 'vpn-gateway',
    sourceHandle: 'vpc-attachment',
    targetHandle: 'vpc-attachment',
    connectionType: 'vpn-attachment',
    description: 'Attach VPN gateway to Transit Gateway',
  },
];

/**
 * ConnectionValidator class
 * Validates connections between nodes based on predefined rules
 */
export class ConnectionValidator {
  private rules: ConnectionRule[];
  private ruleIndex: Map<string, ConnectionRule[]>;

  constructor(rules: ConnectionRule[] = CONNECTION_RULES) {
    this.rules = rules;
    this.ruleIndex = this.buildIndex(rules);
  }

  /**
   * Build index for fast rule lookup
   */
  private buildIndex(rules: ConnectionRule[]): Map<string, ConnectionRule[]> {
    const index = new Map<string, ConnectionRule[]>();

    rules.forEach(rule => {
      // Index by source type
      const sourceKey = `source:${rule.sourceType}`;
      if (!index.has(sourceKey)) index.set(sourceKey, []);
      index.get(sourceKey)!.push(rule);

      // Index by target type
      const targetKey = `target:${rule.targetType}`;
      if (!index.has(targetKey)) index.set(targetKey, []);
      index.get(targetKey)!.push(rule);

      // Index by source-target pair
      const pairKey = `${rule.sourceType}->${rule.targetType}`;
      if (!index.has(pairKey)) index.set(pairKey, []);
      index.get(pairKey)!.push(rule);
    });

    return index;
  }

  /**
   * Validate a connection between two nodes
   */
  isValidConnection(
    sourceNode: BaseNodeData,
    targetNode: BaseNodeData,
    sourceHandle?: string,
    targetHandle?: string
  ): ValidationResult {
    const pairKey = `${sourceNode.serviceType}->${targetNode.serviceType}`;
    const matchingRules = this.ruleIndex.get(pairKey) || [];

    // No rules found for this pair
    if (matchingRules.length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: 'INVALID_CONNECTION',
            message: `Cannot connect ${this.getDisplayName(sourceNode.serviceType)} to ${this.getDisplayName(targetNode.serviceType)}`,
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }

    // Find matching rule with handle types if specified
    let rule = matchingRules[0];
    if (sourceHandle || targetHandle) {
      const handleMatch = matchingRules.find(
        r =>
          (!sourceHandle || r.sourceHandle === sourceHandle) &&
          (!targetHandle || r.targetHandle === targetHandle)
      );
      if (handleMatch) {
        rule = handleMatch;
      }
    }

    // Run custom validator if defined
    if (rule.validator) {
      return rule.validator(sourceNode, targetNode);
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Get all valid target types for a source node type
   */
  getValidTargets(sourceType: AWSServiceType): AWSServiceType[] {
    const sourceRules = this.ruleIndex.get(`source:${sourceType}`) || [];
    return [...new Set(sourceRules.map(r => r.targetType))];
  }

  /**
   * Get all valid source types for a target node type
   */
  getValidSources(targetType: AWSServiceType): AWSServiceType[] {
    const targetRules = this.ruleIndex.get(`target:${targetType}`) || [];
    return [...new Set(targetRules.map(r => r.sourceType))];
  }

  /**
   * Get connection type for a source-target pair
   */
  getConnectionType(
    sourceType: AWSServiceType,
    targetType: AWSServiceType
  ): string | undefined {
    const pairKey = `${sourceType}->${targetType}`;
    const rules = this.ruleIndex.get(pairKey);
    return rules?.[0]?.connectionType;
  }

  /**
   * Get connection description for a source-target pair
   */
  getConnectionDescription(
    sourceType: AWSServiceType,
    targetType: AWSServiceType
  ): string | undefined {
    const pairKey = `${sourceType}->${targetType}`;
    const rules = this.ruleIndex.get(pairKey);
    return rules?.[0]?.description;
  }

  /**
   * Get display name for service type
   */
  private getDisplayName(serviceType: AWSServiceType): string {
    const displayNames: Record<AWSServiceType, string> = {
      'security-group': 'Security Group',
      'iam-role': 'IAM Role',
      'iam-policy': 'IAM Policy',
      'kms-key': 'KMS Key',
      'load-balancer': 'Load Balancer',
      'route53': 'Route 53',
      'cloudfront': 'CloudFront',
      'vpn-gateway': 'VPN Gateway',
      'transit-gateway': 'Transit Gateway',
      'ec2-instance': 'EC2 Instance',
      'auto-scaling-group': 'Auto Scaling Group',
      'ecs-cluster': 'ECS Cluster',
      'lambda-function': 'Lambda Function',
      's3-bucket': 'S3 Bucket',
      'dynamodb-table': 'DynamoDB Table',
      'elasticache-cluster': 'ElastiCache Cluster',
      'efs-filesystem': 'EFS File System',
      'cloudwatch-alarm': 'CloudWatch Alarm',
      'sns-topic': 'SNS Topic',
      'sqs-queue': 'SQS Queue',
    };
    return displayNames[serviceType] || serviceType;
  }
}

// Export singleton instance
export const connectionValidator = new ConnectionValidator();

// Export rules for testing
export { CONNECTION_RULES };
