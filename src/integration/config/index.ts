/**
 * Configuration System Module
 *
 * Provides a single entry point for loading, validating, and merging
 * the AI-SDLC integration configuration.
 *
 * Usage:
 *   import { loadIntegrationConfig } from './config';
 *   const config = loadIntegrationConfig();
 *
 * @module config
 */

export { DEFAULT_CONFIG } from './defaults';
export { loadYAMLFile, loadAndValidate, loadEnvOverrides, getDefaultPaths } from './ConfigLoader';
export type { ConfigPaths } from './ConfigLoader';
export { mergeConfigs, buildConfig } from './ConfigMerger';
export { configSchema, validateConfig, safeValidateConfig, branchSchema } from './schema';
export type {
  IntegrationConfig,
  PartialIntegrationConfig,
  GovernanceConfig,
  ClassificationConfig,
  RoutingConfig,
  PhaseConfig,
  BypassConfig,
  TrackingConfig,
  PerformanceConfig,
  UXConfig,
  BranchConfig,
} from './types';

import { loadAndValidate, loadEnvOverrides, getDefaultPaths } from './ConfigLoader';
import { buildConfig } from './ConfigMerger';
import { IntegrationConfig } from './types';

/**
 * Load the complete integration configuration from all sources.
 *
 * Resolution order (lowest to highest priority):
 * 1. Built-in defaults
 * 2. User config (~/.aisdlc/config.yml)
 * 3. Project config (.aisdlc.yml)
 * 4. Environment variables (AISDLC_*)
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Fully resolved IntegrationConfig
 */
export function loadIntegrationConfig(projectRoot?: string): {
  config: IntegrationConfig;
  warnings: string[];
} {
  const paths = getDefaultPaths(projectRoot);
  const warnings: string[] = [];

  // Load user config
  const userResult = loadAndValidate(paths.userConfig);
  if (userResult.errors.length > 0) {
    warnings.push(
      `User config warnings (${paths.userConfig}): ${userResult.errors.join('; ')}`,
    );
  }

  // Load project config
  const projectResult = loadAndValidate(paths.projectConfig);
  if (projectResult.errors.length > 0) {
    warnings.push(
      `Project config warnings (${paths.projectConfig}): ${projectResult.errors.join('; ')}`,
    );
  }

  // Load env overrides
  const envOverrides = loadEnvOverrides();

  // Merge all sources
  const config = buildConfig(
    userResult.config,
    projectResult.config,
    envOverrides,
  );

  return { config, warnings };
}
