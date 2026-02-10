/**
 * Security Generators Index
 *
 * Exports all security-related Terraform generators
 */

export { SecurityGroupGenerator } from './SecurityGroupGenerator';
export { IAMRoleGenerator } from './IAMRoleGenerator';
export { IAMPolicyGenerator } from './IAMPolicyGenerator';
export { KMSKeyGenerator } from './KMSKeyGenerator';

// Register all security generators
import { GeneratorRegistry } from '../../core';
import { SecurityGroupGenerator } from './SecurityGroupGenerator';
import { IAMRoleGenerator } from './IAMRoleGenerator';
import { IAMPolicyGenerator } from './IAMPolicyGenerator';
import { KMSKeyGenerator } from './KMSKeyGenerator';

export function registerSecurityGenerators(): void {
  GeneratorRegistry.register(new SecurityGroupGenerator());
  GeneratorRegistry.register(new IAMRoleGenerator());
  GeneratorRegistry.register(new IAMPolicyGenerator());
  GeneratorRegistry.register(new KMSKeyGenerator());
}
