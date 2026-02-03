/**
 * Node Components Barrel Export
 * Custom node types for the Visual Designer
 */

// Base component
export { BaseNode, LAYER_COLORS } from './BaseNode';
export type { BaseNodeData, BaseNodeProps } from './BaseNode';

// Node type registry
export {
  nodeTypes,
  NODE_DEFINITIONS,
  getNodesByLayer,
  getNodesByCategory,
  getCategories,
} from './nodeTypes';
export type { NodeDefinition } from './nodeTypes';

// Individual node exports (for direct imports if needed)
export {
  // Network Layer
  VPCNode,
  SubnetNode,
  SecurityGroupNode,
  NATGatewayNode,
  IGWNode,
  RouteTableNode,
  TransitGatewayNode,

  // Platform Layer - Compute
  EC2Node,
  EKSNode,
  ECSNode,
  LambdaNode,
  FargateNode,

  // Platform Layer - Database
  RDSNode,
  DynamoDBNode,
  ElastiCacheNode,
  DocumentDBNode,

  // Platform Layer - Storage
  S3Node,
  EFSNode,

  // Platform Layer - Load Balancing
  ALBNode,
  NLBNode,
  APIGatewayNode,

  // Platform Layer - Messaging
  SQSNode,
  SNSNode,
  EventBridgeNode,

  // DevOps Layer
  CloudWatchNode,
  XRayNode,
  SecretsManagerNode,
  KMSNode,
  IAMNode,
  WAFNode,
  CodePipelineNode,
} from './nodeTypes';
