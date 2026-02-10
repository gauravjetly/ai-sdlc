/**
 * Terraform Module Generator
 *
 * Main entry point for the Terraform code generation system.
 * Converts visual designer node configurations into production-ready
 * Terraform HCL code.
 *
 * @module terraform-generator
 */

// Core exports
export * from './core';

// Orchestrator exports
export * from './orchestrator';

// Module generators
export * from './modules';
export { registerAllGenerators } from './modules';

// Re-export main classes for convenience
export { BaseGenerator, GeneratorRegistry, HCLBuilder, VariableBuilder, OutputBuilder } from './core';
export { GeneratorOrchestrator, orchestrator, DependencyResolver } from './orchestrator';

// Initialize generators on import
import { registerAllGenerators } from './modules';
import { GeneratorRegistry } from './core';

// Auto-register all generators if not already initialized
if (!GeneratorRegistry.isInitialized()) {
  registerAllGenerators();
  GeneratorRegistry.markInitialized();
}

/**
 * Quick start: Generate Terraform from visual designer export
 *
 * @example
 * ```typescript
 * import { generateTerraform } from './generator';
 *
 * const result = await generateTerraform({
 *   nodes: visualDesignerNodes,
 *   edges: connections,
 *   environment: 'dev',
 *   projectName: 'my-project',
 *   region: 'us-east-1',
 *   outputPath: './terraform',
 * });
 *
 * if (result.success) {
 *   console.log('Generated modules:', result.modules.map(m => m.name));
 * }
 * ```
 */
export async function generateTerraform(input: import('./core').GeneratorInput) {
  const { orchestrator } = await import('./orchestrator');
  return orchestrator.generate(input);
}

/**
 * Preview Terraform for a single node
 *
 * @example
 * ```typescript
 * import { previewNode } from './generator';
 *
 * const preview = previewNode({
 *   id: 'vpc-1',
 *   type: 'vpc',
 *   data: { name: 'my-vpc', cidrBlock: '10.0.0.0/16' },
 *   position: { x: 0, y: 0 },
 * });
 *
 * console.log(preview.mainTf);
 * ```
 */
export function previewNode(node: import('./core').VisualDesignerNode) {
  const { orchestrator } = require('./orchestrator');
  return orchestrator.previewNode(node);
}

/**
 * Get list of supported AWS node types
 */
export function getSupportedNodeTypes(): string[] {
  return GeneratorRegistry.getSupportedTypes();
}

/**
 * Check if a node type is supported
 */
export function isNodeTypeSupported(nodeType: string): boolean {
  return GeneratorRegistry.has(nodeType as any);
}
