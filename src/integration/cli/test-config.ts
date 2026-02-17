#!/usr/bin/env node
/**
 * CLI Test Harness: Configuration
 *
 * Test configuration loading, validation, and merging.
 *
 * Usage:
 *   npx ts-node src/integration/cli/test-config.ts
 *   npx ts-node src/integration/cli/test-config.ts --paths
 *
 * @module cli/test-config
 */

import { loadIntegrationConfig, DEFAULT_CONFIG, getDefaultPaths } from '../config';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  console.log('=== AI-SDLC Configuration Test ===\n');

  // Show default paths
  const paths = getDefaultPaths();
  console.log('--- Configuration Paths ---');
  console.log(`  User config: ${paths.userConfig}`);
  console.log(`  Project config: ${paths.projectConfig}`);
  console.log('');

  if (args.includes('--paths')) {
    return;
  }

  // Show defaults
  console.log('--- Default Configuration ---');
  console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('');

  // Load merged config
  console.log('--- Loaded Configuration (merged) ---');
  const { config, warnings } = loadIntegrationConfig();

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const w of warnings) {
      console.log(`  - ${w}`);
    }
    console.log('');
  }

  console.log(JSON.stringify(config, null, 2));
  console.log('');

  // Show effective settings
  console.log('--- Effective Settings ---');
  console.log(`  Enabled: ${config.enabled}`);
  console.log(`  Auto-classify: ${config.autoClassify}`);
  console.log(`  Governance level: ${config.governance.level}`);
  console.log(`  Tier 1 (rules): ${config.classification.tier1Enabled}`);
  console.log(`  Tier 2 (LLM): ${config.classification.tier2Enabled}`);
  console.log(`  Tier 2 model: ${config.classification.tier2Model}`);
  console.log(`  Confidence threshold: ${config.classification.confidenceThreshold}`);
  console.log(`  Show progress: ${config.ux.showProgress}`);
  console.log(`  Color output: ${config.ux.colorOutput}`);
  console.log(`  Verbose mode: ${config.ux.verboseMode}`);

  // Show env var overrides
  console.log('\n--- Environment Variables ---');
  const envVars = ['AISDLC_ENABLED', 'AISDLC_GOVERNANCE_LEVEL', 'AISDLC_AUTO_CLASSIFY',
    'AISDLC_VERBOSE', 'AISDLC_TIER2_ENABLED', 'AISDLC_TIER2_MODEL', 'ANTHROPIC_API_KEY'];
  for (const v of envVars) {
    const value = process.env[v];
    console.log(`  ${v}: ${value ? (v.includes('KEY') ? '[SET]' : value) : '[not set]'}`);
  }
}

main().catch(console.error);
