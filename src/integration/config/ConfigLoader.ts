/**
 * Configuration Loader
 *
 * Loads configuration from YAML files at user and project levels.
 * Supports:
 * - User-level: ~/.aisdlc/config.yml
 * - Project-level: .aisdlc.yml (project root)
 * - Environment variables: AISDLC_*
 *
 * @module config/ConfigLoader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import { safeValidateConfig } from './schema';

/**
 * Locations where configuration files are searched.
 */
export interface ConfigPaths {
  /** User-level config path */
  userConfig: string;
  /** Project-level config path */
  projectConfig: string;
}

/**
 * Default configuration file paths.
 */
export function getDefaultPaths(projectRoot?: string): ConfigPaths {
  return {
    userConfig: path.join(os.homedir(), '.aisdlc', 'config.yml'),
    projectConfig: path.join(projectRoot || process.cwd(), '.aisdlc.yml'),
  };
}

/**
 * Load a YAML configuration file.
 *
 * @param filePath - Absolute path to the YAML file
 * @returns Parsed config object, or null if file does not exist
 * @throws If the file exists but is not valid YAML
 */
export function loadYAMLFile(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) {
      return null;
    }

    const parsed = yaml.parse(content);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config from ${filePath}: ${msg}`);
  }
}

/**
 * Load and validate a configuration file.
 *
 * @param filePath - Absolute path to the YAML file
 * @returns Validated config object, or null if file does not exist
 */
export function loadAndValidate(filePath: string): {
  config: Record<string, unknown> | null;
  errors: string[];
} {
  const raw = loadYAMLFile(filePath);
  if (raw === null) {
    return { config: null, errors: [] };
  }

  const validation = safeValidateConfig(raw);
  if (validation.success) {
    return { config: validation.data as Record<string, unknown>, errors: [] };
  }

  return { config: raw, errors: validation.errors || [] };
}

/**
 * Load environment variable overrides.
 * Environment variables use the AISDLC_ prefix.
 *
 * Supported env vars:
 * - AISDLC_ENABLED: boolean
 * - AISDLC_GOVERNANCE_LEVEL: number (1-4)
 * - AISDLC_AUTO_CLASSIFY: boolean
 * - AISDLC_VERBOSE: boolean
 * - AISDLC_TIER2_ENABLED: boolean
 * - AISDLC_TIER2_MODEL: string
 */
export function loadEnvOverrides(): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  const boolEnv = (key: string): boolean | undefined => {
    const val = process.env[key];
    if (val === undefined) return undefined;
    return val.toLowerCase() === 'true' || val === '1';
  };

  const numEnv = (key: string): number | undefined => {
    const val = process.env[key];
    if (val === undefined) return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) ? undefined : num;
  };

  const strEnv = (key: string): string | undefined => {
    return process.env[key] || undefined;
  };

  // Top-level overrides
  const enabled = boolEnv('AISDLC_ENABLED');
  if (enabled !== undefined) overrides.enabled = enabled;

  const autoClassify = boolEnv('AISDLC_AUTO_CLASSIFY');
  if (autoClassify !== undefined) overrides.autoClassify = autoClassify;

  // Governance overrides
  const govLevel = numEnv('AISDLC_GOVERNANCE_LEVEL');
  if (govLevel !== undefined && govLevel >= 1 && govLevel <= 4) {
    overrides.governance = { level: govLevel };
  }

  // Classification overrides
  const tier2Enabled = boolEnv('AISDLC_TIER2_ENABLED');
  const tier2Model = strEnv('AISDLC_TIER2_MODEL');
  if (tier2Enabled !== undefined || tier2Model !== undefined) {
    overrides.classification = {
      ...(tier2Enabled !== undefined ? { tier2Enabled } : {}),
      ...(tier2Model !== undefined ? { tier2Model } : {}),
    };
  }

  // UX overrides
  const verbose = boolEnv('AISDLC_VERBOSE');
  if (verbose !== undefined) {
    overrides.ux = { verboseMode: verbose };
  }

  return overrides;
}
