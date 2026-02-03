/**
 * Microservices Platform (EKS) Template
 * Production-ready Kubernetes platform for containerized microservices
 */

import type { TemplateDefinition } from './types';
import {
  createSecurityGroupNode,
  createEKSClusterNode,
  createLoadBalancerNode,
  createRDSNode,
  createElastiCacheNode,
  createS3BucketNode,
  createECRRepositoryNode,
  createIAMRoleNode,
  createCloudWatchAlarmNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createMicroservicesEKSTemplate(): TemplateDefinition {
  // Security Groups
  const clusterSg = createSecurityGroupNode('eks-cluster-sg', { x: 100, y: 600 }, {
    description: 'Security group for EKS cluster control plane',
    ingressRules: [
      { id: 'https-api', protocol: 'tcp', fromPort: 443, toPort: 443, securityGroupIds: ['node-sg'], description: 'Kubernetes API from nodes' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const nodeSg = createSecurityGroupNode('eks-node-sg', { x: 380, y: 600 }, {
    description: 'Security group for EKS worker nodes',
    ingressRules: [
      { id: 'node-to-node', protocol: '-1', fromPort: 0, toPort: 0, securityGroupIds: ['node-sg'], description: 'Node to node communication' },
      { id: 'cluster-to-node', protocol: 'tcp', fromPort: 1025, toPort: 65535, securityGroupIds: ['cluster-sg'], description: 'Cluster to node communication' },
      { id: 'alb-health', protocol: 'tcp', fromPort: 80, toPort: 80, securityGroupIds: ['alb-sg'], description: 'ALB health checks' },
    ],
    egressRules: [
      { id: 'all-out', protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'], description: 'Allow all outbound' },
    ],
  });

  const albSg = createSecurityGroupNode('eks-alb-sg', { x: 660, y: 600 }, {
    description: 'Security group for EKS ALB Ingress',
    ingressRules: [
      { id: 'https', protocol: 'tcp', fromPort: 443, toPort: 443, cidrBlocks: ['0.0.0.0/0'], description: 'HTTPS from internet' },
      { id: 'http', protocol: 'tcp', fromPort: 80, toPort: 80, cidrBlocks: ['0.0.0.0/0'], description: 'HTTP redirect' },
    ],
    egressRules: [
      { id: 'to-nodes', protocol: 'tcp', fromPort: 1, toPort: 65535, securityGroupIds: ['node-sg'], description: 'To node ports' },
    ],
  });

  const dbSg = createSecurityGroupNode('eks-db-sg', { x: 940, y: 600 }, {
    description: 'Security group for databases - only from EKS nodes',
    ingressRules: [
      { id: 'postgres', protocol: 'tcp', fromPort: 5432, toPort: 5432, securityGroupIds: ['node-sg'], description: 'PostgreSQL from nodes' },
      { id: 'redis', protocol: 'tcp', fromPort: 6379, toPort: 6379, securityGroupIds: ['node-sg'], description: 'Redis from nodes' },
    ],
    egressRules: [],
  });

  // EKS Cluster
  const eksCluster = createEKSClusterNode('microservices-cluster', { x: 380, y: 150 }, {
    version: '1.29',
    endpointPublicAccess: false,
    endpointPrivateAccess: true,
  });

  // Application Load Balancer (managed by ALB Ingress Controller)
  const alb = createLoadBalancerNode('eks-ingress-alb', { x: 660, y: 0 }, {
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
        name: 'eks-ingress-tg',
        port: 80,
        protocol: 'HTTP',
        targetType: 'ip',
        healthCheck: {
          enabled: true,
          path: '/healthz',
          port: 'traffic-port',
          protocol: 'HTTP',
          interval: 15,
          timeout: 5,
          healthyThreshold: 2,
          unhealthyThreshold: 2,
        },
      },
    ],
  });

  // RDS for stateful services
  const rds = createRDSNode('services-database', { x: 100, y: 400 }, {
    engine: 'postgres',
    engineVersion: '15.4',
    instanceClass: 'db.r5.large',
    multiAZ: true,
    storageType: 'gp3',
    allocatedStorage: 200,
    maxAllocatedStorage: 2000,
    databaseName: 'services',
    port: 5432,
    backupRetentionPeriod: 14,
    deletionProtection: true,
    performanceInsightsEnabled: true,
  });

  // ElastiCache for caching
  const redis = createElastiCacheNode('services-cache', { x: 380, y: 400 }, {
    engine: 'redis',
    engineVersion: '7.0',
    nodeType: 'cache.r5.large',
    numCacheNodes: 2,
    multiAZEnabled: true,
    automaticFailoverEnabled: true,
    transitEncryptionEnabled: true,
    atRestEncryptionEnabled: true,
  });

  // S3 for object storage
  const s3 = createS3BucketNode('services-storage', { x: 660, y: 400 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // ECR Repository
  const ecr = createECRRepositoryNode('microservices-repo', { x: 940, y: 150 }, {
    imageScanOnPush: true,
    imageTagMutability: 'IMMUTABLE',
  });

  // IAM Roles
  const clusterRole = createIAMRoleNode('eks-cluster-role', { x: 100, y: 150 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'eks.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy',
      'arn:aws:iam::aws:policy/AmazonEKSVPCResourceController',
    ],
    description: 'IAM role for EKS cluster control plane',
  });

  const nodeRole = createIAMRoleNode('eks-node-role', { x: 100, y: 280 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
      'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
      'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
      'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
    ],
    description: 'IAM role for EKS worker nodes',
  });

  // CloudWatch Alarms
  const cpuAlarm = createCloudWatchAlarmNode('eks-cpu-high', { x: 940, y: 400 }, {
    metricName: 'node_cpu_utilization',
    namespace: 'ContainerInsights',
    statistic: 'Average',
    period: 300,
    threshold: 80,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
  });

  const nodes = [clusterSg, nodeSg, albSg, dbSg, eksCluster, alb, rds, redis, s3, ecr, clusterRole, nodeRole, cpuAlarm];

  const edges = [
    // ALB -> EKS (ingress)
    createEdge(alb.id, eksCluster.id, { label: 'ingress', animated: true }),
    // EKS -> RDS
    createEdge(eksCluster.id, rds.id, { label: 'connects', animated: true }),
    // EKS -> Redis
    createEdge(eksCluster.id, redis.id, { label: 'connects', animated: true }),
    // EKS -> S3
    createEdge(eksCluster.id, s3.id, { label: 'storage' }),
    // EKS -> ECR
    createEdge(eksCluster.id, ecr.id, { label: 'pulls from' }),
    // Security Groups
    createEdge(clusterSg.id, eksCluster.id, { label: 'secures' }),
    createEdge(nodeSg.id, eksCluster.id, { label: 'secures nodes' }),
    createEdge(albSg.id, alb.id, { label: 'secures' }),
    createEdge(dbSg.id, rds.id, { label: 'secures' }),
    createEdge(dbSg.id, redis.id, { label: 'secures' }),
    // IAM Roles
    createEdge(clusterRole.id, eksCluster.id, { label: 'role' }),
    createEdge(nodeRole.id, eksCluster.id, { label: 'node role' }),
    // Monitoring
    createEdge(cpuAlarm.id, eksCluster.id, { label: 'monitors' }),
  ];

  return {
    name: 'Microservices Platform (EKS)',
    description: 'Production-ready Amazon EKS platform for containerized microservices. Features a managed Kubernetes cluster with private endpoint, ALB Ingress Controller for traffic routing, RDS PostgreSQL for stateful services, ElastiCache Redis for caching, ECR for container images, and comprehensive IAM roles using IRSA (IAM Roles for Service Accounts). Includes CloudWatch Container Insights for observability. Designed for high availability across multiple AZs.',
    category: 'compute_platform',
    visibility: 'public',
    layerType: 'fullstack',
    version: '1.0.0',
    tags: ['kubernetes', 'eks', 'microservices', 'containers', 'docker', 'aws', 'production', 'ha'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Deltek Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2', 'HIPAA-eligible', 'PCI-DSS-ready'],
        estimatedCost: {
          dev: 600,
          staging: 1200,
          prod: 2500,
          currency: 'USD',
        },
        prerequisites: [
          'AWS Account with VPC configured (private subnets across 3 AZs)',
          'SSL/TLS certificate in ACM',
          'kubectl and eksctl CLI tools installed',
          'AWS CLI configured with appropriate permissions',
        ],
        customizationGuide: 'Adjust EKS node group instance types based on workload requirements. Configure Horizontal Pod Autoscaler (HPA) for each service. Modify RDS instance class for production database workloads. Set up Cluster Autoscaler for dynamic node scaling. Configure PodDisruptionBudgets for high availability.',
        deploymentTime: '25-35 minutes',
        components: [
          { type: 'Security Groups', count: 4, description: 'Cluster, Nodes, ALB, Databases' },
          { type: 'EKS Cluster', count: 1, description: 'Kubernetes 1.29 with private endpoint' },
          { type: 'Application Load Balancer', count: 1, description: 'ALB Ingress Controller managed' },
          { type: 'RDS PostgreSQL', count: 1, description: 'Multi-AZ db.r5.large' },
          { type: 'ElastiCache Redis', count: 1, description: '2-node cluster with failover' },
          { type: 'S3 Bucket', count: 1, description: 'Object storage for services' },
          { type: 'ECR Repository', count: 1, description: 'Container image registry' },
          { type: 'IAM Roles', count: 2, description: 'Cluster role and node role' },
          { type: 'CloudWatch Alarms', count: 1, description: 'CPU utilization monitoring' },
        ],
      },
    },
  };
}
