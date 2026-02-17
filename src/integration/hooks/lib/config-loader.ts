/**
 * Hook Configuration Loader
 *
 * Loads the AI-SDLC integration configuration for use within Claude Code hooks.
 * This is a lightweight loader designed for fast hook startup time.
 *
 * @module hooks/lib/config-loader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Minimal configuration structure needed by hooks.
 * Full config is loaded from the integration module; this is
 * a fast subset for hook decisions.
 */
export interface HookConfig {
  enabled: boolean;
  autoClassify: boolean;
  showClassification: boolean;
  governance: {
    level: 1 | 2 | 3 | 4;
  };
  classification: {
    tier1Enabled: boolean;
    tier2Enabled: boolean;
    confidenceThreshold: number;
  };
  performance: {
    maxClassificationTime: number;
  };
  ux: {
    showProgress: boolean;
    verboseMode: boolean;
  };
}

const DEFAULT_HOOK_CONFIG: HookConfig = {
  enabled: true,
  autoClassify: true,
  showClassification: false,
  governance: { level: 2 },
  classification: {
    tier1Enabled: true,
    tier2Enabled: true,
    confidenceThreshold: 0.7,
  },
  performance: { maxClassificationTime: 3000 },
  ux: { showProgress: true, verboseMode: false },
};

/**
 * Cache for loaded configuration.
 */
let cachedConfig: HookConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Load configuration with caching for fast repeated access.
 *
 * Tries to load from:
 * 1. Environment variable AISDLC_CONFIG (path to YAML)
 * 2. ~/.aisdlc/config.yml
 * 3. .aisdlc.yml in project root
 * Falls back to defaults if no config found.
 */
export function loadHookConfig(): HookConfig {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  let config = { ...DEFAULT_HOOK_CONFIG };

  try {
    // Try to load user config
    const userConfigPath = path.join(os.homedir(), '.aisdlc', 'config.yml');
    const rawConfig = loadJsonSafe(userConfigPath.replace('.yml', '.json'));
    if (rawConfig) {
      config = mergeConfig(config, rawConfig);
    }

    // Try to load project config
    const projectConfigPath = path.join(process.cwd(), '.aisdlc.json');
    const projectConfig = loadJsonSafe(projectConfigPath);
    if (projectConfig) {
      config = mergeConfig(config, projectConfig);
    }

    // Environment overrides (fastest to check)
    if (process.env.AISDLC_ENABLED === 'false') {
      config.enabled = false;
    }
    if (process.env.AISDLC_GOVERNANCE_LEVEL) {
      const level = parseInt(process.env.AISDLC_GOVERNANCE_LEVEL, 10);
      if (level >= 1 && level <= 4) {
        config.governance.level = level as 1 | 2 | 3 | 4;
      }
    }
  } catch {
    // On any error, use defaults -- hooks must never fail to load config
  }

  cachedConfig = config;
  cacheTimestamp = now;
  return config;
}

/**
 * Clear the configuration cache (useful for testing).
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

/**
 * Load a JSON file safely, returning null if not found.
 */
function loadJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Merge a partial config into the base config.
 */
function mergeConfig(
  base: HookConfig,
  override: Record<string, unknown>,
): HookConfig {
  const result = { ...base };

  if (typeof override.enabled === 'boolean') result.enabled = override.enabled;
  if (typeof override.autoClassify === 'boolean') result.autoClassify = override.autoClassify;
  if (typeof override.showClassification === 'boolean') result.showClassification = override.showClassification;

  if (override.governance && typeof override.governance === 'object') {
    const gov = override.governance as Record<string, unknown>;
    if (typeof gov.level === 'number' && gov.level >= 1 && gov.level <= 4) {
      result.governance = { level: gov.level as 1 | 2 | 3 | 4 };
    }
  }

  if (override.classification && typeof override.classification === 'object') {
    const cls = override.classification as Record<string, unknown>;
    result.classification = { ...result.classification };
    if (typeof cls.tier1Enabled === 'boolean') result.classification.tier1Enabled = cls.tier1Enabled;
    if (typeof cls.tier2Enabled === 'boolean') result.classification.tier2Enabled = cls.tier2Enabled;
    if (typeof cls.confidenceThreshold === 'number') result.classification.confidenceThreshold = cls.confidenceThreshold;
  }

  if (override.performance && typeof override.performance === 'object') {
    const perf = override.performance as Record<string, unknown>;
    result.performance = { ...result.performance };
    if (typeof perf.maxClassificationTime === 'number') result.performance.maxClassificationTime = perf.maxClassificationTime;
  }

  if (override.ux && typeof override.ux === 'object') {
    const ux = override.ux as Record<string, unknown>;
    result.ux = { ...result.ux };
    if (typeof ux.showProgress === 'boolean') result.ux.showProgress = ux.showProgress;
    if (typeof ux.verboseMode === 'boolean') result.ux.verboseMode = ux.verboseMode;
  }

  return result;
}
