/**
 * Environment Management Components Barrel Export
 *
 * This module provides UI components for managing multi-environment
 * configurations in the Infrastructure Designer.
 *
 * Components:
 * - EnvironmentSwitcher: Switch between dev/staging/prod environments
 * - EnvironmentConfigPanel: View and edit environment configurations
 * - EnvironmentDiff: Visual diff between environment configurations
 * - EnvironmentPromotion: Promote configurations between environments
 * - EnvironmentVariables: Manage environment-specific variables
 */

// Components
export { EnvironmentSwitcher } from './EnvironmentSwitcher';
export { EnvironmentConfigPanel } from './EnvironmentConfigPanel';
export { EnvironmentDiff } from './EnvironmentDiff';
export { EnvironmentPromotion } from './EnvironmentPromotion';
export { EnvironmentVariables } from './EnvironmentVariables';

// Types
export * from './types';

// Utilities
export * from './utils';
