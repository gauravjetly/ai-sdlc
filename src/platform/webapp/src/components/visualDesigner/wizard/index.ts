/**
 * Visual Designer Wizard Barrel Export
 */

// Main Components
export { WizardDrawer } from './WizardDrawer';
export type { WizardDrawerProps } from './WizardDrawer';

// Role Wizards
export { NetworkArchitectWizard } from './roles';
export type { NetworkArchitectWizardProps } from './roles';

export { DevOpsWizard } from './roles/DevOpsWizard';
export type { DevOpsWizardProps } from './roles/DevOpsWizard';

// Step Components - Network
export {
  VPCConfigurationStep,
  SubnetDesignStep,
  RoutingConfigurationStep,
  SecurityGroupsStep,
  NetworkValidationStep,
} from './steps/network';

// Step Components - DevOps
export {
  CICDPipelineStep,
  MonitoringObservabilityStep,
  ServiceConnectionsStep,
  InfrastructureAsCodeStep,
  DevOpsValidationStep,
} from './steps/devops';

// Shared Components
export {
  FormField,
  TagsEditor,
  CIDRInput,
  ValidationAlert,
  StepActions,
} from './shared';

// Hooks
export { useNetworkValidation, useCIDRCalculator, useDevOpsValidation } from './hooks';

// Utils
export * from './utils';
