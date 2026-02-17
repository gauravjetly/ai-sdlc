/**
 * Configuration System Tests
 *
 * Tests for config loading, validation, merging, and environment overrides.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DEFAULT_CONFIG } from '../config/defaults';
import { mergeConfigs, buildConfig } from '../config/ConfigMerger';
import { loadYAMLFile, loadEnvOverrides } from '../config/ConfigLoader';
import { validateConfig, safeValidateConfig } from '../config/schema';
import { IntegrationConfig } from '../config/types';

describe('Default Configuration', () => {
  it('should have all required fields', () => {
    expect(DEFAULT_CONFIG.version).toBe('1.0');
    expect(DEFAULT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CONFIG.governance.level).toBe(2);
    expect(DEFAULT_CONFIG.classification.tier1Enabled).toBe(true);
    expect(DEFAULT_CONFIG.classification.tier2Enabled).toBe(true);
    expect(DEFAULT_CONFIG.routing.emergencyKeywords).toContain('urgent');
    expect(DEFAULT_CONFIG.phases.alwaysRun).toContain('implementation');
    expect(DEFAULT_CONFIG.bypass.allowAtLevel1).toBe(true);
    expect(DEFAULT_CONFIG.bypass.allowAtLevel4).toBe(false);
    expect(DEFAULT_CONFIG.tracking.logAllRequests).toBe(true);
    expect(DEFAULT_CONFIG.performance.maxClassificationTime).toBe(3000);
    expect(DEFAULT_CONFIG.ux.showProgress).toBe(true);
  });

  it('should default to Level 2 governance', () => {
    expect(DEFAULT_CONFIG.governance.level).toBe(2);
    expect(DEFAULT_CONFIG.governance.defaultForNewProjects).toBe(2);
  });

  it('should have correct classification defaults', () => {
    expect(DEFAULT_CONFIG.classification.confidenceThreshold).toBe(0.7);
    expect(DEFAULT_CONFIG.classification.cacheTTL).toBe(300);
  });
});

describe('Configuration Merging', () => {
  it('should return defaults when no overrides', () => {
    const config = mergeConfigs();
    expect(config.governance.level).toBe(2);
    expect(config.enabled).toBe(true);
  });

  it('should override top-level values', () => {
    const config = mergeConfigs({ enabled: false });
    expect(config.enabled).toBe(false);
    // Other values should remain default
    expect(config.governance.level).toBe(2);
  });

  it('should deep merge nested objects', () => {
    const config = mergeConfigs({ governance: { level: 3 } });
    expect(config.governance.level).toBe(3);
    // Other governance fields should remain default
    expect(config.governance.defaultForNewProjects).toBe(2);
  });

  it('should replace arrays', () => {
    const config = mergeConfigs({
      routing: { emergencyKeywords: ['custom-keyword'] },
    });
    expect(config.routing.emergencyKeywords).toEqual(['custom-keyword']);
  });

  it('should merge multiple sources in order', () => {
    const config = mergeConfigs(
      { governance: { level: 3 } },      // User config
      { governance: { level: 4 } },      // Project config
    );
    expect(config.governance.level).toBe(4);
  });

  it('should skip null sources', () => {
    const config = mergeConfigs(null, undefined, { governance: { level: 3 } });
    expect(config.governance.level).toBe(3);
  });

  describe('snake_case to camelCase normalization', () => {
    it('should normalize snake_case keys', () => {
      const config = mergeConfigs({
        auto_classify: false,
        classification: {
          tier1_enabled: false,
          confidence_threshold: 0.8,
        },
        ux: {
          show_progress: false,
          verbose_mode: true,
        },
      });

      expect(config.autoClassify).toBe(false);
      expect(config.classification.tier1Enabled).toBe(false);
      expect(config.classification.confidenceThreshold).toBe(0.8);
      expect(config.ux.showProgress).toBe(false);
      expect(config.ux.verboseMode).toBe(true);
    });
  });
});

describe('Configuration Validation', () => {
  it('should validate a correct config', () => {
    const result = safeValidateConfig({
      enabled: true,
      governance: { level: 2 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid governance level', () => {
    const result = safeValidateConfig({
      governance: { level: 5 },
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject confidence threshold out of range', () => {
    const result = safeValidateConfig({
      classification: { confidenceThreshold: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it('should accept snake_case keys', () => {
    const result = safeValidateConfig({
      auto_classify: true,
      governance: { level: 2 },
      classification: { tier1_enabled: true },
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty config', () => {
    const result = safeValidateConfig({});
    expect(result.success).toBe(true);
  });
});

describe('YAML File Loading', () => {
  const tmpDir = path.join(os.tmpdir(), 'aisdlc-config-test-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', () => {
    const result = loadYAMLFile(path.join(tmpDir, 'nonexistent.yml'));
    expect(result).toBeNull();
  });

  it('should load a valid YAML file', () => {
    const filePath = path.join(tmpDir, 'valid.yml');
    fs.writeFileSync(filePath, 'governance:\n  level: 3\nenabled: true\n');

    const result = loadYAMLFile(filePath);
    expect(result).toEqual({ governance: { level: 3 }, enabled: true });
  });

  it('should return null for empty file', () => {
    const filePath = path.join(tmpDir, 'empty.yml');
    fs.writeFileSync(filePath, '');

    const result = loadYAMLFile(filePath);
    expect(result).toBeNull();
  });

  it('should throw for invalid YAML', () => {
    const filePath = path.join(tmpDir, 'invalid.yml');
    fs.writeFileSync(filePath, 'invalid: yaml: content: [broken');

    expect(() => loadYAMLFile(filePath)).toThrow();
  });
});

describe('Environment Variable Overrides', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AISDLC_')) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('should override enabled', () => {
    process.env.AISDLC_ENABLED = 'false';
    const overrides = loadEnvOverrides();
    expect(overrides.enabled).toBe(false);
  });

  it('should override governance level', () => {
    process.env.AISDLC_GOVERNANCE_LEVEL = '3';
    const overrides = loadEnvOverrides();
    expect(overrides.governance).toEqual({ level: 3 });
  });

  it('should override verbose mode', () => {
    process.env.AISDLC_VERBOSE = 'true';
    const overrides = loadEnvOverrides();
    expect(overrides.ux).toEqual({ verboseMode: true });
  });

  it('should override tier2 settings', () => {
    process.env.AISDLC_TIER2_ENABLED = 'false';
    process.env.AISDLC_TIER2_MODEL = 'custom-model';
    const overrides = loadEnvOverrides();
    expect(overrides.classification).toEqual({
      tier2Enabled: false,
      tier2Model: 'custom-model',
    });
  });

  it('should ignore invalid governance level', () => {
    process.env.AISDLC_GOVERNANCE_LEVEL = '5';
    const overrides = loadEnvOverrides();
    expect(overrides.governance).toBeUndefined();
  });

  it('should return empty when no AISDLC_ env vars set', () => {
    // Clear all AISDLC_ vars
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AISDLC_')) delete process.env[key];
    }
    const overrides = loadEnvOverrides();
    expect(Object.keys(overrides)).toHaveLength(0);
  });
});

describe('buildConfig (full pipeline)', () => {
  it('should produce valid config from all sources', () => {
    const userConfig = { governance: { level: 2 } };
    const projectConfig = { governance: { level: 3 } };
    const envOverrides = {};

    const config = buildConfig(
      userConfig as Record<string, unknown>,
      projectConfig as Record<string, unknown>,
      envOverrides,
    );

    // Project config (level 3) should override user config (level 2)
    expect(config.governance.level).toBe(3);
    // Other values should be defaults
    expect(config.enabled).toBe(true);
    expect(config.classification.tier1Enabled).toBe(true);
  });

  it('should apply env overrides last', () => {
    const config = buildConfig(
      { governance: { level: 2 } } as Record<string, unknown>,
      { governance: { level: 3 } } as Record<string, unknown>,
      { governance: { level: 4 } },
    );

    expect(config.governance.level).toBe(4);
  });
});
