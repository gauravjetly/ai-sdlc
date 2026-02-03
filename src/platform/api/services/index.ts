/**
 * Backend Services Index
 * Export all services for the Infrastructure Designer module
 */

// Core Services
export { WorkflowManager, workflowManager } from './WorkflowManager.js';
export { TemplateService, templateService } from './TemplateService.js';
export { DesignService, designService } from './DesignService.js';

// New Services
export { ValidationService, validationService, ValidationCodes } from './ValidationService.js';
export { CostEstimationService, costEstimationService } from './CostEstimationService.js';
export { TerraformGenerator, terraformGenerator } from './TerraformGenerator.js';
export { LayerDeploymentOrchestrator, layerDeploymentOrchestrator } from './LayerDeploymentOrchestrator.js';

// Types re-exported for convenience
export type {
  ValidationReport,
  QuotaCheck,
  PolicyValidation,
} from './ValidationService.js';

export type {
  CostComparison,
  Optimization,
  BudgetStatus,
  CostForecast,
} from './CostEstimationService.js';

export type {
  TerraformCode,
  TerraformVariables,
  TerraformOutputs,
  BackendConfig,
  StateConfig,
} from './TerraformGenerator.js';

export type {
  DeploymentStatus,
  DependencyGraph,
  DeploymentContext,
} from './LayerDeploymentOrchestrator.js';
