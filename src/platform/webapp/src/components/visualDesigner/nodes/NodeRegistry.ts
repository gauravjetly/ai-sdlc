/**
 * NodeRegistry
 * Central registry for all AWS node types
 * Provides registration, lookup, and ReactFlow node type generation
 */

import { ComponentType } from 'react';
import { NodeProps } from 'reactflow';
import { AWSServiceType, NodeMetadata, NodeCategory, BaseNodeData } from './types';

// Import all node components and metadata
import { SecurityGroupNode, securityGroupMetadata } from './security/SecurityGroupNode';
import { IAMRoleNode, iamRoleMetadata } from './security/IAMRoleNode';
import { IAMPolicyNode, iamPolicyMetadata } from './security/IAMPolicyNode';
import { KMSKeyNode, kmsKeyMetadata } from './security/KMSKeyNode';
import { EC2InstanceNode, ec2InstanceMetadata } from './compute/EC2InstanceNode';
import { LambdaFunctionNode, lambdaFunctionMetadata } from './compute/LambdaFunctionNode';

/**
 * Registry entry with component and metadata
 */
interface RegistryEntry {
  metadata: NodeMetadata;
  component: ComponentType<NodeProps<any>>;
}

/**
 * NodeRegistry class - Singleton pattern
 */
class NodeRegistryClass {
  private nodes: Map<AWSServiceType, RegistryEntry> = new Map();
  private initialized = false;

  /**
   * Register a node type
   */
  register(
    metadata: NodeMetadata,
    component: ComponentType<NodeProps<any>>
  ): void {
    this.nodes.set(metadata.serviceType, { metadata, component });
  }

  /**
   * Get metadata for a service type
   */
  getMetadata(serviceType: AWSServiceType): NodeMetadata | undefined {
    return this.nodes.get(serviceType)?.metadata;
  }

  /**
   * Get component for a service type
   */
  getComponent(serviceType: AWSServiceType): ComponentType<NodeProps<any>> | undefined {
    return this.nodes.get(serviceType)?.component;
  }

  /**
   * Get all nodes by category
   */
  getByCategory(category: NodeCategory): NodeMetadata[] {
    return Array.from(this.nodes.values())
      .filter(entry => entry.metadata.category === category)
      .map(entry => entry.metadata);
  }

  /**
   * Get all registered nodes
   */
  getAll(): NodeMetadata[] {
    return Array.from(this.nodes.values()).map(entry => entry.metadata);
  }

  /**
   * Get all service types
   */
  getServiceTypes(): AWSServiceType[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get ReactFlow node types object
   */
  getReactFlowNodeTypes(): Record<string, ComponentType<NodeProps<any>>> {
    const types: Record<string, ComponentType<NodeProps<any>>> = {};
    for (const [serviceType, entry] of this.nodes) {
      types[serviceType] = entry.component;
    }
    return types;
  }

  /**
   * Get default data for a service type
   */
  getDefaultData(serviceType: AWSServiceType): Partial<BaseNodeData> | undefined {
    return this.nodes.get(serviceType)?.metadata.defaultData;
  }

  /**
   * Check if a service type is registered
   */
  has(serviceType: AWSServiceType): boolean {
    return this.nodes.has(serviceType);
  }

  /**
   * Get count of registered nodes
   */
  get count(): number {
    return this.nodes.size;
  }

  /**
   * Initialize registry with all node types
   */
  initialize(): void {
    if (this.initialized) return;

    // Security nodes
    this.register(securityGroupMetadata, SecurityGroupNode);
    this.register(iamRoleMetadata, IAMRoleNode);
    this.register(iamPolicyMetadata, IAMPolicyNode);
    this.register(kmsKeyMetadata, KMSKeyNode);

    // Compute nodes
    this.register(ec2InstanceMetadata, EC2InstanceNode);
    this.register(lambdaFunctionMetadata, LambdaFunctionNode);

    // TODO: Register remaining nodes as they are implemented
    // Networking nodes
    // this.register(loadBalancerMetadata, LoadBalancerNode);
    // this.register(route53Metadata, Route53Node);
    // this.register(cloudFrontMetadata, CloudFrontNode);
    // this.register(vpnGatewayMetadata, VPNGatewayNode);
    // this.register(transitGatewayMetadata, TransitGatewayNode);

    // Compute nodes (remaining)
    // this.register(autoScalingGroupMetadata, AutoScalingGroupNode);
    // this.register(ecsClusterMetadata, ECSClusterNode);

    // Storage nodes
    // this.register(s3BucketMetadata, S3BucketNode);
    // this.register(dynamoDBMetadata, DynamoDBNode);
    // this.register(elastiCacheMetadata, ElastiCacheNode);
    // this.register(efsMetadata, EFSNode);

    // Monitoring nodes
    // this.register(cloudWatchMetadata, CloudWatchNode);
    // this.register(snsTopicMetadata, SNSTopicNode);
    // this.register(sqsQueueMetadata, SQSQueueNode);

    this.initialized = true;
  }
}

// Export singleton instance
export const NodeRegistry = new NodeRegistryClass();

// Initialize on import
NodeRegistry.initialize();

// Export class for testing
export { NodeRegistryClass };
