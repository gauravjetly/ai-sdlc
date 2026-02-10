/**
 * Node Type Registry
 * Defines all available node types for the Visual Designer
 */

import React, { memo, ComponentType } from 'react';
import { NodeProps } from '@xyflow/react';
import {
  Cloud as VPCIcon,
  Dashboard as SubnetIcon,
  Security as SecurityGroupIcon,
  Router as NATIcon,
  Language as IGWIcon,
  Dns as RouteTableIcon,
  Hub as TransitGatewayIcon,
  Computer as EC2Icon,
  ViewInAr as EKSIcon,
  Widgets as ECSIcon,
  Functions as LambdaIcon,
  Memory as FargateIcon,
  Storage as RDSIcon,
  TableChart as DynamoDBIcon,
  Speed as ElastiCacheIcon,
  Description as DocumentDBIcon,
  CloudQueue as S3Icon,
  Folder as EFSIcon,
  AccountTree as ALBIcon,
  CallSplit as NLBIcon,
  Api as APIGatewayIcon,
  Email as SQSIcon,
  Notifications as SNSIcon,
  Event as EventBridgeIcon,
  Insights as CloudWatchIcon,
  BugReport as XRayIcon,
  VpnKey as SecretsIcon,
  EnhancedEncryption as KMSIcon,
  AdminPanelSettings as IAMIcon,
  Shield as WAFIcon,
  PlayArrow as CodePipelineIcon,
} from '@mui/icons-material';
import BaseNode, { BaseNodeData } from './BaseNode';
import { LayerType } from '../../../contexts/DesignWizardContext';

// Node definition interface
export interface NodeDefinition {
  type: string;
  label: string;
  layer: LayerType;
  icon: React.ComponentType;
  description: string;
  category: string;
  defaultConfig: Record<string, any>;
}

// Create a memoized node component factory
function createNodeComponent(
  icon: React.ReactElement,
  serviceName: string,
  layer: LayerType
): ComponentType<NodeProps<BaseNodeData>> {
  return memo(function CustomNode(props: NodeProps<BaseNodeData>) {
    return (
      <BaseNode
        {...props}
        icon={icon}
        serviceName={serviceName}
        data={{ ...props.data, layer }}
      />
    );
  });
}

// Network Layer Nodes
export const VPCNode = createNodeComponent(<VPCIcon />, 'Amazon VPC', 'network');
export const SubnetNode = createNodeComponent(<SubnetIcon />, 'VPC Subnet', 'network');
export const SecurityGroupNode = createNodeComponent(<SecurityGroupIcon />, 'Security Group', 'network');
export const NATGatewayNode = createNodeComponent(<NATIcon />, 'NAT Gateway', 'network');
export const IGWNode = createNodeComponent(<IGWIcon />, 'Internet Gateway', 'network');
export const RouteTableNode = createNodeComponent(<RouteTableIcon />, 'Route Table', 'network');
export const TransitGatewayNode = createNodeComponent(<TransitGatewayIcon />, 'Transit Gateway', 'network');

// Platform Layer - Compute Nodes
export const EC2Node = createNodeComponent(<EC2Icon />, 'EC2 Instance', 'platform');
export const EKSNode = createNodeComponent(<EKSIcon />, 'EKS Cluster', 'platform');
export const ECSNode = createNodeComponent(<ECSIcon />, 'ECS Service', 'platform');
export const LambdaNode = createNodeComponent(<LambdaIcon />, 'Lambda Function', 'platform');
export const FargateNode = createNodeComponent(<FargateIcon />, 'Fargate Task', 'platform');

// Platform Layer - Database Nodes
export const RDSNode = createNodeComponent(<RDSIcon />, 'RDS Database', 'platform');
export const DynamoDBNode = createNodeComponent(<DynamoDBIcon />, 'DynamoDB Table', 'platform');
export const ElastiCacheNode = createNodeComponent(<ElastiCacheIcon />, 'ElastiCache', 'platform');
export const DocumentDBNode = createNodeComponent(<DocumentDBIcon />, 'DocumentDB', 'platform');

// Platform Layer - Storage Nodes
export const S3Node = createNodeComponent(<S3Icon />, 'S3 Bucket', 'platform');
export const EFSNode = createNodeComponent(<EFSIcon />, 'EFS File System', 'platform');

// Platform Layer - Load Balancing Nodes
export const ALBNode = createNodeComponent(<ALBIcon />, 'Application LB', 'platform');
export const NLBNode = createNodeComponent(<NLBIcon />, 'Network LB', 'platform');
export const APIGatewayNode = createNodeComponent(<APIGatewayIcon />, 'API Gateway', 'platform');

// Platform Layer - Messaging Nodes
export const SQSNode = createNodeComponent(<SQSIcon />, 'SQS Queue', 'platform');
export const SNSNode = createNodeComponent(<SNSIcon />, 'SNS Topic', 'platform');
export const EventBridgeNode = createNodeComponent(<EventBridgeIcon />, 'EventBridge', 'platform');

// DevOps Layer Nodes
export const CloudWatchNode = createNodeComponent(<CloudWatchIcon />, 'CloudWatch', 'devops');
export const XRayNode = createNodeComponent(<XRayIcon />, 'X-Ray', 'devops');
export const SecretsManagerNode = createNodeComponent(<SecretsIcon />, 'Secrets Manager', 'devops');
export const KMSNode = createNodeComponent(<KMSIcon />, 'KMS', 'devops');
export const IAMNode = createNodeComponent(<IAMIcon />, 'IAM', 'devops');
export const WAFNode = createNodeComponent(<WAFIcon />, 'WAF', 'devops');
export const CodePipelineNode = createNodeComponent(<CodePipelineIcon />, 'CodePipeline', 'devops');

// Node type registry for ReactFlow
export const nodeTypes = {
  // Network Layer
  vpc: VPCNode,
  subnet: SubnetNode,
  securityGroup: SecurityGroupNode,
  natGateway: NATGatewayNode,
  igw: IGWNode,
  routeTable: RouteTableNode,
  transitGateway: TransitGatewayNode,

  // Platform Layer - Compute
  ec2: EC2Node,
  eks: EKSNode,
  ecs: ECSNode,
  lambda: LambdaNode,
  fargate: FargateNode,

  // Platform Layer - Database
  rds: RDSNode,
  dynamodb: DynamoDBNode,
  elasticache: ElastiCacheNode,
  documentdb: DocumentDBNode,

  // Platform Layer - Storage
  s3: S3Node,
  efs: EFSNode,

  // Platform Layer - Load Balancing
  alb: ALBNode,
  nlb: NLBNode,
  apiGateway: APIGatewayNode,

  // Platform Layer - Messaging
  sqs: SQSNode,
  sns: SNSNode,
  eventBridge: EventBridgeNode,

  // DevOps Layer
  cloudwatch: CloudWatchNode,
  xray: XRayNode,
  secretsManager: SecretsManagerNode,
  kms: KMSNode,
  iam: IAMNode,
  waf: WAFNode,
  codepipeline: CodePipelineNode,
};

// Node definitions for palette
export const NODE_DEFINITIONS: NodeDefinition[] = [
  // Network Layer
  {
    type: 'vpc',
    label: 'VPC',
    layer: 'network',
    icon: VPCIcon,
    description: 'Virtual Private Cloud - isolated network environment',
    category: 'network',
    defaultConfig: { cidr: '10.0.0.0/16', enableDnsHostnames: true },
  },
  {
    type: 'subnet',
    label: 'Subnet',
    layer: 'network',
    icon: SubnetIcon,
    description: 'VPC subnet for organizing resources',
    category: 'network',
    defaultConfig: { cidr: '10.0.1.0/24', public: false },
  },
  {
    type: 'securityGroup',
    label: 'Security Group',
    layer: 'network',
    icon: SecurityGroupIcon,
    description: 'Virtual firewall for controlling traffic',
    category: 'network',
    defaultConfig: { rules: [] },
  },
  {
    type: 'natGateway',
    label: 'NAT Gateway',
    layer: 'network',
    icon: NATIcon,
    description: 'Network address translation for private subnets',
    category: 'network',
    defaultConfig: { connectivityType: 'public' },
  },
  {
    type: 'igw',
    label: 'Internet Gateway',
    layer: 'network',
    icon: IGWIcon,
    description: 'Gateway for internet access',
    category: 'network',
    defaultConfig: {},
  },
  {
    type: 'routeTable',
    label: 'Route Table',
    layer: 'network',
    icon: RouteTableIcon,
    description: 'Routing rules for network traffic',
    category: 'network',
    defaultConfig: { routes: [] },
  },
  {
    type: 'transitGateway',
    label: 'Transit Gateway',
    layer: 'network',
    icon: TransitGatewayIcon,
    description: 'Connect VPCs and on-premises networks',
    category: 'network',
    defaultConfig: {},
  },

  // Compute
  {
    type: 'ec2',
    label: 'EC2 Instance',
    layer: 'platform',
    icon: EC2Icon,
    description: 'Virtual server in the cloud',
    category: 'compute',
    defaultConfig: { instanceType: 't3.micro', ami: 'ami-latest' },
  },
  {
    type: 'eks',
    label: 'EKS Cluster',
    layer: 'platform',
    icon: EKSIcon,
    description: 'Managed Kubernetes service',
    category: 'compute',
    defaultConfig: { version: '1.28', nodeGroups: [] },
  },
  {
    type: 'ecs',
    label: 'ECS Service',
    layer: 'platform',
    icon: ECSIcon,
    description: 'Container orchestration service',
    category: 'compute',
    defaultConfig: { launchType: 'FARGATE' },
  },
  {
    type: 'lambda',
    label: 'Lambda',
    layer: 'platform',
    icon: LambdaIcon,
    description: 'Serverless compute function',
    category: 'compute',
    defaultConfig: { runtime: 'nodejs18.x', memory: 128, timeout: 30 },
  },
  {
    type: 'fargate',
    label: 'Fargate',
    layer: 'platform',
    icon: FargateIcon,
    description: 'Serverless containers',
    category: 'compute',
    defaultConfig: { cpu: 256, memory: 512 },
  },

  // Database
  {
    type: 'rds',
    label: 'RDS',
    layer: 'platform',
    icon: RDSIcon,
    description: 'Relational database service',
    category: 'database',
    defaultConfig: { engine: 'postgres', instanceClass: 'db.t3.micro', multiAZ: false },
  },
  {
    type: 'dynamodb',
    label: 'DynamoDB',
    layer: 'platform',
    icon: DynamoDBIcon,
    description: 'NoSQL database service',
    category: 'database',
    defaultConfig: { billingMode: 'PAY_PER_REQUEST' },
  },
  {
    type: 'elasticache',
    label: 'ElastiCache',
    layer: 'platform',
    icon: ElastiCacheIcon,
    description: 'In-memory caching service',
    category: 'database',
    defaultConfig: { engine: 'redis', nodeType: 'cache.t3.micro' },
  },
  {
    type: 'documentdb',
    label: 'DocumentDB',
    layer: 'platform',
    icon: DocumentDBIcon,
    description: 'MongoDB-compatible document database',
    category: 'database',
    defaultConfig: { instanceClass: 'db.t3.medium' },
  },

  // Storage
  {
    type: 's3',
    label: 'S3 Bucket',
    layer: 'platform',
    icon: S3Icon,
    description: 'Object storage service',
    category: 'storage',
    defaultConfig: { versioning: false, encryption: true },
  },
  {
    type: 'efs',
    label: 'EFS',
    layer: 'platform',
    icon: EFSIcon,
    description: 'Elastic file system',
    category: 'storage',
    defaultConfig: { performanceMode: 'generalPurpose' },
  },

  // Load Balancing
  {
    type: 'alb',
    label: 'ALB',
    layer: 'platform',
    icon: ALBIcon,
    description: 'Application load balancer',
    category: 'loadBalancing',
    defaultConfig: { scheme: 'internet-facing' },
  },
  {
    type: 'nlb',
    label: 'NLB',
    layer: 'platform',
    icon: NLBIcon,
    description: 'Network load balancer',
    category: 'loadBalancing',
    defaultConfig: { scheme: 'internal' },
  },
  {
    type: 'apiGateway',
    label: 'API Gateway',
    layer: 'platform',
    icon: APIGatewayIcon,
    description: 'REST and WebSocket API service',
    category: 'loadBalancing',
    defaultConfig: { type: 'REST' },
  },

  // Messaging
  {
    type: 'sqs',
    label: 'SQS',
    layer: 'platform',
    icon: SQSIcon,
    description: 'Message queue service',
    category: 'messaging',
    defaultConfig: { fifo: false },
  },
  {
    type: 'sns',
    label: 'SNS',
    layer: 'platform',
    icon: SNSIcon,
    description: 'Pub/sub messaging service',
    category: 'messaging',
    defaultConfig: {},
  },
  {
    type: 'eventBridge',
    label: 'EventBridge',
    layer: 'platform',
    icon: EventBridgeIcon,
    description: 'Event bus for application integration',
    category: 'messaging',
    defaultConfig: {},
  },

  // DevOps
  {
    type: 'cloudwatch',
    label: 'CloudWatch',
    layer: 'devops',
    icon: CloudWatchIcon,
    description: 'Monitoring and observability',
    category: 'monitoring',
    defaultConfig: { alarms: [] },
  },
  {
    type: 'xray',
    label: 'X-Ray',
    layer: 'devops',
    icon: XRayIcon,
    description: 'Distributed tracing',
    category: 'monitoring',
    defaultConfig: {},
  },
  {
    type: 'secretsManager',
    label: 'Secrets Manager',
    layer: 'devops',
    icon: SecretsIcon,
    description: 'Secrets management service',
    category: 'security',
    defaultConfig: { rotationEnabled: false },
  },
  {
    type: 'kms',
    label: 'KMS',
    layer: 'devops',
    icon: KMSIcon,
    description: 'Key management service',
    category: 'security',
    defaultConfig: { keySpec: 'SYMMETRIC_DEFAULT' },
  },
  {
    type: 'iam',
    label: 'IAM Role',
    layer: 'devops',
    icon: IAMIcon,
    description: 'Identity and access management',
    category: 'security',
    defaultConfig: { policies: [] },
  },
  {
    type: 'waf',
    label: 'WAF',
    layer: 'devops',
    icon: WAFIcon,
    description: 'Web application firewall',
    category: 'security',
    defaultConfig: { rules: [] },
  },
  {
    type: 'codepipeline',
    label: 'CodePipeline',
    layer: 'devops',
    icon: CodePipelineIcon,
    description: 'CI/CD pipeline service',
    category: 'cicd',
    defaultConfig: { stages: [] },
  },
];

// Get nodes by layer
export function getNodesByLayer(layer: LayerType): NodeDefinition[] {
  return NODE_DEFINITIONS.filter((node) => node.layer === layer);
}

// Get nodes by category
export function getNodesByCategory(category: string): NodeDefinition[] {
  return NODE_DEFINITIONS.filter((node) => node.category === category);
}

// Get all categories
export function getCategories(): string[] {
  const categories = new Set(NODE_DEFINITIONS.map((node) => node.category));
  return Array.from(categories);
}

export default nodeTypes;
