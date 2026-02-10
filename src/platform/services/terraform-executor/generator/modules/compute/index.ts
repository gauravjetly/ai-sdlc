/**
 * Compute Generators Index
 *
 * Exports all compute-related Terraform generators
 */

export { EC2Generator } from './EC2Generator';
export { LambdaGenerator } from './LambdaGenerator';

// Register all compute generators
import { GeneratorRegistry } from '../../core';
import { EC2Generator } from './EC2Generator';
import { LambdaGenerator } from './LambdaGenerator';

export function registerComputeGenerators(): void {
  GeneratorRegistry.register(new EC2Generator());
  GeneratorRegistry.register(new LambdaGenerator());
  // TODO: Add EKS, ECS, AutoScalingGroup generators
}
