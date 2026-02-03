/**
 * Compute Nodes Index
 * Re-exports all compute-related node components
 */

export { EC2InstanceNode, ec2InstanceMetadata } from './EC2InstanceNode';
export { LambdaFunctionNode, lambdaFunctionMetadata } from './LambdaFunctionNode';
// TODO: Export remaining compute nodes as they are implemented
// export { AutoScalingGroupNode, autoScalingGroupMetadata } from './AutoScalingGroupNode';
// export { ECSClusterNode, ecsClusterMetadata } from './ECSClusterNode';
