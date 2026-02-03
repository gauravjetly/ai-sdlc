/**
 * Three-Tier Web Application Template
 * Classic 3-tier architecture with web, application, and database layers
 */

import type { TemplateDefinition } from './types';
import {
  createSecurityGroupNode,
  createLoadBalancerNode,
  createAutoScalingGroupNode,
  createRDSNode,
  createElastiCacheNode,
  createS3BucketNode,
  createCloudFrontNode,
  createIAMRoleNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createThreeTierWebTemplate(): TemplateDefinition {
  // Create Security Group nodes
  const webSg = createSecurityGroupNode('web-sg', { x: 100, y: 750 }, {
    description: 'Security group for web tier ALB - allows HTTPS/HTTP from internet',
    ingressRules: [
      { id: 'https', protocol: 'tcp', fromPort: 443, toPort: 443, cidrBlocks: ['0.0.0.0/0'], description: 'HTTPS from internet' },
      { id: 'http', protocol: 'tcp', fromPort: 80, toPort: 80, cidrBlocks: ['0.0.0.0/0'], description: 'HTTP redirect' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const appSg = createSecurityGroupNode('app-sg', { x: 380, y: 750 }, {
    description: 'Security group for application tier - allows traffic from ALB only',
    ingressRules: [
      { id: 'from-alb', protocol: 'tcp', fromPort: 8080, toPort: 8080, securityGroupIds: ['web-sg'], description: 'HTTP from ALB' },
      { id: 'ssh-bastion', protocol: 'tcp', fromPort: 22, toPort: 22, securityGroupIds: ['bastion-sg'], description: 'SSH from bastion' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const dbSg = createSecurityGroupNode('db-sg', { x: 660, y: 750 }, {
    description: 'Security group for database tier - PostgreSQL from app tier only',
    ingressRules: [
      { id: 'postgres', protocol: 'tcp', fromPort: 5432, toPort: 5432, securityGroupIds: ['app-sg'], description: 'PostgreSQL from app tier' },
    ],
    egressRules: [],
  });

  const cacheSg = createSecurityGroupNode('cache-sg', { x: 940, y: 750 }, {
    description: 'Security group for cache tier - Redis from app tier only',
    ingressRules: [
      { id: 'redis', protocol: 'tcp', fromPort: 6379, toPort: 6379, securityGroupIds: ['app-sg'], description: 'Redis from app tier' },
    ],
    egressRules: [],
  });

  // Create CloudFront CDN
  const cdn = createCloudFrontNode('cdn-distribution', { x: 560, y: 0 }, {
    priceClass: 'PriceClass_100',
    defaultRootObject: 'index.html',
  });

  // Create Application Load Balancer
  const alb = createLoadBalancerNode('web-alb', { x: 560, y: 150 }, {
    type: 'application',
    scheme: 'internet-facing',
    listeners: [
      {
        port: 443,
        protocol: 'HTTPS',
        certificateArn: '${ACM_CERTIFICATE_ARN}',
        defaultActions: [{ type: 'forward' }],
      },
      {
        port: 80,
        protocol: 'HTTP',
        defaultActions: [{
          type: 'redirect',
          redirectConfig: {
            protocol: 'HTTPS',
            port: '443',
            statusCode: 'HTTP_301',
          },
        }],
      },
    ],
    targetGroups: [
      {
        name: 'app-tg',
        port: 8080,
        protocol: 'HTTP',
        targetType: 'instance',
        healthCheck: {
          enabled: true,
          path: '/health',
          port: '8080',
          protocol: 'HTTP',
          interval: 30,
          timeout: 5,
          healthyThreshold: 2,
          unhealthyThreshold: 2,
        },
      },
    ],
  });

  // Create Auto Scaling Group
  const asg = createAutoScalingGroupNode('app-asg', { x: 560, y: 300 }, {
    minSize: 2,
    maxSize: 10,
    desiredCapacity: 2,
    instanceType: 't3.medium',
    healthCheckType: 'ELB',
    scalingPolicies: [
      {
        name: 'cpu-target-tracking',
        policyType: 'TargetTrackingScaling',
        targetTrackingConfiguration: {
          predefinedMetricSpecification: {
            predefinedMetricType: 'ASGAverageCPUUtilization',
          },
          targetValue: 70,
        },
      },
      {
        name: 'alb-request-tracking',
        policyType: 'TargetTrackingScaling',
        targetTrackingConfiguration: {
          predefinedMetricSpecification: {
            predefinedMetricType: 'ALBRequestCountPerTarget',
          },
          targetValue: 1000,
        },
      },
    ],
  });

  // Create RDS PostgreSQL
  const rds = createRDSNode('app-database', { x: 380, y: 500 }, {
    engine: 'postgres',
    engineVersion: '15.4',
    instanceClass: 'db.t3.medium',
    multiAZ: true,
    storageType: 'gp3',
    allocatedStorage: 100,
    maxAllocatedStorage: 1000,
    databaseName: 'appdb',
    port: 5432,
    backupRetentionPeriod: 7,
    deletionProtection: true,
    performanceInsightsEnabled: true,
  });

  // Create ElastiCache Redis
  const redis = createElastiCacheNode('app-cache', { x: 740, y: 500 }, {
    engine: 'redis',
    engineVersion: '7.0',
    nodeType: 'cache.t3.medium',
    numCacheNodes: 2,
    multiAZEnabled: true,
    automaticFailoverEnabled: true,
    transitEncryptionEnabled: true,
    atRestEncryptionEnabled: true,
  });

  // Create S3 Bucket for static assets
  const s3 = createS3BucketNode('static-assets', { x: 940, y: 150 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // Create IAM Role for EC2 instances
  const iamRole = createIAMRoleNode('ec2-app-role', { x: 100, y: 450 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
      'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy',
      'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
    ],
    description: 'IAM role for application EC2 instances',
  });

  const nodes = [webSg, appSg, dbSg, cacheSg, cdn, alb, asg, rds, redis, s3, iamRole];

  // Create edges
  const edges = [
    // CloudFront -> ALB (dynamic content)
    createEdge(cdn.id, alb.id, { label: 'origin' }),
    // CloudFront -> S3 (static content)
    createEdge(cdn.id, s3.id, { label: 'origin' }),
    // ALB -> ASG
    createEdge(alb.id, asg.id, { label: 'targets', animated: true }),
    // ASG -> RDS
    createEdge(asg.id, rds.id, { label: 'connects', animated: true }),
    // ASG -> Redis
    createEdge(asg.id, redis.id, { label: 'connects', animated: true }),
    // Security Group attachments
    createEdge(webSg.id, alb.id, { label: 'secures' }),
    createEdge(appSg.id, asg.id, { label: 'secures' }),
    createEdge(dbSg.id, rds.id, { label: 'secures' }),
    createEdge(cacheSg.id, redis.id, { label: 'secures' }),
    // IAM Role -> ASG
    createEdge(iamRole.id, asg.id, { label: 'role' }),
  ];

  return {
    name: 'Three-Tier Web Application',
    description: 'Production-ready 3-tier architecture with web, application, and database layers. Includes CloudFront CDN for global content delivery, Application Load Balancer with HTTPS termination, Auto Scaling Group for horizontal scaling, RDS PostgreSQL with Multi-AZ for high availability, ElastiCache Redis cluster for session management and caching, and S3 for static assets. Follows AWS Well-Architected Framework best practices for security, reliability, and performance.',
    category: 'fullstack',
    visibility: 'public',
    layerType: 'fullstack',
    version: '1.0.0',
    tags: ['web', 'postgresql', 'redis', 'ha', 'aws', 'three-tier', 'production', 'cloudfront', 'alb'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Deltek Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2', 'HIPAA-eligible', 'PCI-DSS-ready'],
        estimatedCost: {
          dev: 450,
          staging: 650,
          prod: 1200,
          currency: 'USD',
        },
        prerequisites: [
          'AWS Account with VPC configured (public/private subnets across 3 AZs)',
          'SSL/TLS certificate in ACM for your domain',
          'Route53 hosted zone (optional, for custom domain)',
          'SSH key pair for EC2 instance access',
        ],
        customizationGuide: 'Adjust ASG instance type (t3.medium -> m5.large) and scaling policies based on expected load. Modify RDS instance class for production workloads (db.t3.medium -> db.r5.large). Configure CloudFront behaviors for your application-specific caching needs. Update security group rules to match your network requirements.',
        deploymentTime: '15-20 minutes',
        components: [
          { type: 'Security Groups', count: 4, description: 'Web tier, App tier, Database tier, Cache tier' },
          { type: 'CloudFront Distribution', count: 1, description: 'Global CDN with S3 and ALB origins' },
          { type: 'Application Load Balancer', count: 1, description: 'HTTPS termination, HTTP->HTTPS redirect' },
          { type: 'Auto Scaling Group', count: 1, description: '2-10 t3.medium instances with CPU and request-based scaling' },
          { type: 'RDS PostgreSQL', count: 1, description: 'Multi-AZ db.t3.medium with Performance Insights' },
          { type: 'ElastiCache Redis', count: 1, description: '2-node cluster with automatic failover' },
          { type: 'S3 Bucket', count: 1, description: 'Static assets with versioning and encryption' },
          { type: 'IAM Role', count: 1, description: 'EC2 instance role with SSM, CloudWatch, S3 access' },
        ],
      },
    },
  };
}
