/**
 * Test Factories Index
 *
 * Export all test data factories for easy import.
 */

export { TemplateFactory } from './template.factory';
export type { Template, TemplateNode, TemplateEdge, TemplateMetadata } from './template.factory';

export { NodeFactory } from './node.factory';
export type { InfraNode, NodeData, NodeType } from './node.factory';

export { DesignFactory } from './design.factory';
export type {
  Design,
  DesignEdge,
  Layer,
  Environment,
  DesignMetadata,
  DeploymentRecord,
} from './design.factory';
