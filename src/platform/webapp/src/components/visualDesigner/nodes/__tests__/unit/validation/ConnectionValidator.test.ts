/**
 * ConnectionValidator Tests
 */

import { ConnectionValidator, connectionValidator, CONNECTION_RULES } from '../../../validation/ConnectionValidator';
import { BaseNodeData, AWSServiceType } from '../../../types';

// Mock node data factory
function createMockNode(serviceType: AWSServiceType, name: string): BaseNodeData {
  const categoryMap: Record<AWSServiceType, string> = {
    'security-group': 'security',
    'iam-role': 'security',
    'iam-policy': 'security',
    'kms-key': 'security',
    'load-balancer': 'networking',
    'route53': 'networking',
    'cloudfront': 'networking',
    'vpn-gateway': 'networking',
    'transit-gateway': 'networking',
    'ec2-instance': 'compute',
    'auto-scaling-group': 'compute',
    'ecs-cluster': 'compute',
    'lambda-function': 'compute',
    's3-bucket': 'storage',
    'dynamodb-table': 'storage',
    'elasticache-cluster': 'storage',
    'efs-filesystem': 'storage',
    'cloudwatch-alarm': 'monitoring',
    'sns-topic': 'monitoring',
    'sqs-queue': 'monitoring',
  };

  return {
    id: `${serviceType}-001`,
    name,
    serviceType,
    category: categoryMap[serviceType] as any,
    tags: {},
    status: 'configured',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('ConnectionValidator', () => {
  let validator: ConnectionValidator;

  beforeEach(() => {
    validator = new ConnectionValidator();
  });

  describe('Security Group Connections', () => {
    it('should allow security group to connect to EC2 instance', () => {
      const sgNode = createMockNode('security-group', 'web-sg');
      const ec2Node = createMockNode('ec2-instance', 'web-server');

      const result = validator.isValidConnection(sgNode, ec2Node);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow security group to connect to Lambda function', () => {
      const sgNode = createMockNode('security-group', 'lambda-sg');
      const lambdaNode = createMockNode('lambda-function', 'processor');

      const result = validator.isValidConnection(sgNode, lambdaNode);

      expect(result.valid).toBe(true);
    });

    it('should allow security group to connect to Load Balancer', () => {
      const sgNode = createMockNode('security-group', 'alb-sg');
      const albNode = createMockNode('load-balancer', 'web-alb');

      const result = validator.isValidConnection(sgNode, albNode);

      expect(result.valid).toBe(true);
    });

    it('should NOT allow security group to connect to Route53', () => {
      const sgNode = createMockNode('security-group', 'web-sg');
      const r53Node = createMockNode('route53', 'example.com');

      const result = validator.isValidConnection(sgNode, r53Node);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('INVALID_CONNECTION');
    });
  });

  describe('IAM Role Connections', () => {
    it('should allow IAM role to connect to EC2 instance', () => {
      const roleNode = createMockNode('iam-role', 'ec2-role');
      const ec2Node = createMockNode('ec2-instance', 'web-server');

      const result = validator.isValidConnection(roleNode, ec2Node);

      expect(result.valid).toBe(true);
    });

    it('should allow IAM role to connect to Lambda function', () => {
      const roleNode = createMockNode('iam-role', 'lambda-role');
      const lambdaNode = createMockNode('lambda-function', 'processor');

      const result = validator.isValidConnection(roleNode, lambdaNode);

      expect(result.valid).toBe(true);
    });

    it('should allow IAM role to connect to ECS cluster', () => {
      const roleNode = createMockNode('iam-role', 'ecs-task-role');
      const ecsNode = createMockNode('ecs-cluster', 'app-cluster');

      const result = validator.isValidConnection(roleNode, ecsNode);

      expect(result.valid).toBe(true);
    });
  });

  describe('IAM Policy Connections', () => {
    it('should allow IAM policy to connect to IAM role', () => {
      const policyNode = createMockNode('iam-policy', 's3-access');
      const roleNode = createMockNode('iam-role', 'app-role');

      const result = validator.isValidConnection(policyNode, roleNode);

      expect(result.valid).toBe(true);
    });

    it('should NOT allow IAM policy to connect directly to EC2', () => {
      const policyNode = createMockNode('iam-policy', 's3-access');
      const ec2Node = createMockNode('ec2-instance', 'web-server');

      const result = validator.isValidConnection(policyNode, ec2Node);

      expect(result.valid).toBe(false);
    });
  });

  describe('KMS Key Connections', () => {
    it('should allow KMS key to connect to S3 bucket', () => {
      const kmsNode = createMockNode('kms-key', 'bucket-key');
      const s3Node = createMockNode('s3-bucket', 'data-bucket');

      const result = validator.isValidConnection(kmsNode, s3Node);

      expect(result.valid).toBe(true);
    });

    it('should allow KMS key to connect to DynamoDB table', () => {
      const kmsNode = createMockNode('kms-key', 'table-key');
      const dynamoNode = createMockNode('dynamodb-table', 'users');

      const result = validator.isValidConnection(kmsNode, dynamoNode);

      expect(result.valid).toBe(true);
    });

    it('should allow KMS key to connect to SQS queue', () => {
      const kmsNode = createMockNode('kms-key', 'queue-key');
      const sqsNode = createMockNode('sqs-queue', 'messages');

      const result = validator.isValidConnection(kmsNode, sqsNode);

      expect(result.valid).toBe(true);
    });
  });

  describe('Load Balancer Connections', () => {
    it('should allow Load Balancer to connect to EC2 instance', () => {
      const albNode = createMockNode('load-balancer', 'web-alb');
      const ec2Node = createMockNode('ec2-instance', 'web-server');

      const result = validator.isValidConnection(albNode, ec2Node);

      expect(result.valid).toBe(true);
    });

    it('should allow Load Balancer to connect to Lambda function', () => {
      const albNode = createMockNode('load-balancer', 'api-alb');
      const lambdaNode = createMockNode('lambda-function', 'api-handler');

      const result = validator.isValidConnection(albNode, lambdaNode);

      expect(result.valid).toBe(true);
    });

    it('should allow Load Balancer to connect to Auto Scaling Group', () => {
      const albNode = createMockNode('load-balancer', 'web-alb');
      const asgNode = createMockNode('auto-scaling-group', 'web-asg');

      const result = validator.isValidConnection(albNode, asgNode);

      expect(result.valid).toBe(true);
    });
  });

  describe('Route53 Connections', () => {
    it('should allow Route53 to connect to Load Balancer', () => {
      const r53Node = createMockNode('route53', 'example.com');
      const albNode = createMockNode('load-balancer', 'web-alb');

      const result = validator.isValidConnection(r53Node, albNode);

      expect(result.valid).toBe(true);
    });

    it('should allow Route53 to connect to CloudFront', () => {
      const r53Node = createMockNode('route53', 'cdn.example.com');
      const cfNode = createMockNode('cloudfront', 'cdn-dist');

      const result = validator.isValidConnection(r53Node, cfNode);

      expect(result.valid).toBe(true);
    });

    it('should allow Route53 to connect to S3 website', () => {
      const r53Node = createMockNode('route53', 'static.example.com');
      const s3Node = createMockNode('s3-bucket', 'static-website');

      const result = validator.isValidConnection(r53Node, s3Node);

      expect(result.valid).toBe(true);
    });
  });

  describe('CloudFront Connections', () => {
    it('should allow CloudFront to connect to S3 bucket', () => {
      const cfNode = createMockNode('cloudfront', 'cdn-dist');
      const s3Node = createMockNode('s3-bucket', 'assets');

      const result = validator.isValidConnection(cfNode, s3Node);

      expect(result.valid).toBe(true);
    });

    it('should allow CloudFront to connect to Load Balancer', () => {
      const cfNode = createMockNode('cloudfront', 'cdn-dist');
      const albNode = createMockNode('load-balancer', 'api-alb');

      const result = validator.isValidConnection(cfNode, albNode);

      expect(result.valid).toBe(true);
    });
  });

  describe('Event Source Connections', () => {
    it('should allow S3 to trigger Lambda', () => {
      const s3Node = createMockNode('s3-bucket', 'uploads');
      const lambdaNode = createMockNode('lambda-function', 'processor');

      const result = validator.isValidConnection(s3Node, lambdaNode);

      expect(result.valid).toBe(true);
    });

    it('should allow DynamoDB to trigger Lambda', () => {
      const dynamoNode = createMockNode('dynamodb-table', 'orders');
      const lambdaNode = createMockNode('lambda-function', 'stream-processor');

      const result = validator.isValidConnection(dynamoNode, lambdaNode);

      expect(result.valid).toBe(true);
    });

    it('should allow SQS to trigger Lambda', () => {
      const sqsNode = createMockNode('sqs-queue', 'tasks');
      const lambdaNode = createMockNode('lambda-function', 'worker');

      const result = validator.isValidConnection(sqsNode, lambdaNode);

      expect(result.valid).toBe(true);
    });
  });

  describe('SNS Connections', () => {
    it('should allow SNS to send to Lambda', () => {
      const snsNode = createMockNode('sns-topic', 'notifications');
      const lambdaNode = createMockNode('lambda-function', 'notifier');

      const result = validator.isValidConnection(snsNode, lambdaNode);

      expect(result.valid).toBe(true);
    });

    it('should allow SNS to send to SQS', () => {
      const snsNode = createMockNode('sns-topic', 'notifications');
      const sqsNode = createMockNode('sqs-queue', 'notification-queue');

      const result = validator.isValidConnection(snsNode, sqsNode);

      expect(result.valid).toBe(true);
    });

    it('should allow CloudWatch alarm to send to SNS', () => {
      const cwNode = createMockNode('cloudwatch-alarm', 'cpu-alarm');
      const snsNode = createMockNode('sns-topic', 'alerts');

      const result = validator.isValidConnection(cwNode, snsNode);

      expect(result.valid).toBe(true);
    });
  });

  describe('Helper Methods', () => {
    it('should get valid targets for security group', () => {
      const targets = validator.getValidTargets('security-group');

      expect(targets).toContain('ec2-instance');
      expect(targets).toContain('lambda-function');
      expect(targets).toContain('load-balancer');
      expect(targets).not.toContain('route53');
    });

    it('should get valid sources for EC2 instance', () => {
      const sources = validator.getValidSources('ec2-instance');

      expect(sources).toContain('security-group');
      expect(sources).toContain('iam-role');
      expect(sources).toContain('load-balancer');
    });

    it('should get connection type', () => {
      const connectionType = validator.getConnectionType('security-group', 'ec2-instance');

      expect(connectionType).toBe('security-attachment');
    });

    it('should get connection description', () => {
      const description = validator.getConnectionDescription('iam-role', 'lambda-function');

      expect(description).toContain('execution role');
    });
  });

  describe('Singleton Instance', () => {
    it('should export a working singleton', () => {
      const sgNode = createMockNode('security-group', 'test-sg');
      const ec2Node = createMockNode('ec2-instance', 'test-ec2');

      const result = connectionValidator.isValidConnection(sgNode, ec2Node);

      expect(result.valid).toBe(true);
    });
  });

  describe('Rules Coverage', () => {
    it('should have rules defined', () => {
      expect(CONNECTION_RULES.length).toBeGreaterThan(0);
    });

    it('should have security-related connection rules', () => {
      const securityRules = CONNECTION_RULES.filter(
        r => r.sourceType === 'security-group' || r.sourceType === 'iam-role' || r.sourceType === 'kms-key'
      );
      expect(securityRules.length).toBeGreaterThan(0);
    });

    it('should have networking connection rules', () => {
      const networkRules = CONNECTION_RULES.filter(
        r => r.sourceType === 'load-balancer' || r.sourceType === 'route53' || r.sourceType === 'cloudfront'
      );
      expect(networkRules.length).toBeGreaterThan(0);
    });

    it('should have event source connection rules', () => {
      const eventRules = CONNECTION_RULES.filter(
        r => r.connectionType === 'event-source' || r.connectionType === 'subscription'
      );
      expect(eventRules.length).toBeGreaterThan(0);
    });
  });
});
