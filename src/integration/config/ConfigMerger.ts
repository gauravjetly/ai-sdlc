/**
 * Configuration Merger
 *
 * Merges configuration from multiple sources in priority order:
 * 1. Defaults (lowest priority)
 * 2. User-level config (~/.aisdlc/config.yml)
 * 3. Project-level config (.aisdlc.yml)
 * 4. Environment variables (highest priority)
 *
 * @module config/ConfigMerger
 */

import { IntegrationConfig, PartialIntegrationConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';

/**
 * Normalize snake_case keys to camelCase.
 * YAML files typically use snake_case; TypeScript uses camelCase.
 */
function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = normalizeKeys(value as Record<string, unknown>);
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Deep merge two objects. Source values override target values.
 * Arrays are replaced, not concatenated.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    const targetValue = (result as Record<string, unknown>)[key];

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      // Direct assignment for primitives and arrays
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Merge multiple configuration sources into a single IntegrationConfig.
 *
 * @param sources - Configuration objects in priority order (lowest first)
 * @returns The merged IntegrationConfig
 */
export function mergeConfigs(
  ...sources: Array<Record<string, unknown> | null | undefined>
): IntegrationConfig {
  let result = { ...DEFAULT_CONFIG } as Record<string, unknown>;

  for (const source of sources) {
    if (!source) continue;

    // Normalize snake_case to camelCase
    const normalized = normalizeKeys(source);

    // Deep merge
    result = deepMerge(result, normalized);
  }

  return result as unknown as IntegrationConfig;
}

/**
 * Load and merge configuration from all sources.
 *
 * @param userConfig - Parsed user-level config (or null)
 * @param projectConfig - Parsed project-level config (or null)
 * @param envOverrides - Environment variable overrides
 * @returns Fully merged IntegrationConfig
 */
export function buildConfig(
  userConfig: Record<string, unknown> | null,
  projectConfig: Record<string, unknown> | null,
  envOverrides: Record<string, unknown>,
): IntegrationConfig {
  return mergeConfigs(userConfig, projectConfig, envOverrides);
}
