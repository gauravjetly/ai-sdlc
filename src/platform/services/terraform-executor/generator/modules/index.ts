/**
 * Module Generators Index
 *
 * Exports all Terraform generators and registration functions
 */

// Security generators
export * from './security';
export { registerSecurityGenerators } from './security';

// Compute generators
export * from './compute';
export { registerComputeGenerators } from './compute';

// Storage generators
export * from './storage';
export { registerStorageGenerators } from './storage';

// TODO: Network generators
// export * from './network';
// export { registerNetworkGenerators } from './network';

// TODO: Database generators
// export * from './database';
// export { registerDatabaseGenerators } from './database';

// TODO: Networking (CDN/LB) generators
// export * from './networking';
// export { registerNetworkingGenerators } from './networking';

// TODO: Monitoring generators
// export * from './monitoring';
// export { registerMonitoringGenerators } from './monitoring';

import { registerSecurityGenerators } from './security';
import { registerComputeGenerators } from './compute';
import { registerStorageGenerators } from './storage';

/**
 * Register all available generators
 */
export function registerAllGenerators(): void {
  registerSecurityGenerators();
  registerComputeGenerators();
  registerStorageGenerators();

  // TODO: Register remaining generators as implemented
  // registerNetworkGenerators();
  // registerDatabaseGenerators();
  // registerNetworkingGenerators();
  // registerMonitoringGenerators();
}
