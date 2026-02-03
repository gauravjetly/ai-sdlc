/**
 * Template Registry
 * Exports all pre-built infrastructure templates
 */

import { createThreeTierWebTemplate } from './three-tier-web';
import { createMicroservicesEKSTemplate } from './microservices-eks';
import { createNetworkFoundationTemplate } from './network-foundation';
import { createServerlessBackendTemplate } from './serverless-backend';
import { createDataAnalyticsTemplate } from './data-analytics';
import { createSecurityBaselineTemplate } from './security-baseline';
import { createCICDPipelineTemplate } from './cicd-pipeline';
import type { TemplateDefinition } from './types';

/**
 * All available templates
 */
export const TEMPLATES: TemplateDefinition[] = [
  createThreeTierWebTemplate(),
  createMicroservicesEKSTemplate(),
  createNetworkFoundationTemplate(),
  createServerlessBackendTemplate(),
  createDataAnalyticsTemplate(),
  createSecurityBaselineTemplate(),
  createCICDPipelineTemplate(),
];

/**
 * Get template by name
 */
export function getTemplateByName(name: string): TemplateDefinition | undefined {
  return TEMPLATES.find(t => t.name === name);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  return TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by layer type
 */
export function getTemplatesByLayerType(layerType: string): TemplateDefinition[] {
  return TEMPLATES.filter(t => t.layerType === layerType);
}

/**
 * Get template count
 */
export function getTemplateCount(): number {
  return TEMPLATES.length;
}

// Re-export types
export * from './types';

// Re-export individual template creators
export { createThreeTierWebTemplate } from './three-tier-web';
export { createMicroservicesEKSTemplate } from './microservices-eks';
export { createNetworkFoundationTemplate } from './network-foundation';
export { createServerlessBackendTemplate } from './serverless-backend';
export { createDataAnalyticsTemplate } from './data-analytics';
export { createSecurityBaselineTemplate } from './security-baseline';
export { createCICDPipelineTemplate } from './cicd-pipeline';

// Re-export utilities
export * from './utils/node-factory';
export * from './utils/edge-factory';
