#!/usr/bin/env node
/**
 * CLI Test Harness: Governance Engine
 *
 * Test governance evaluation at all 4 levels.
 *
 * Usage:
 *   npx ts-node src/integration/cli/test-governance.ts
 *
 * @module cli/test-governance
 */

import { HybridClassifier } from '../classifier/HybridClassifier';
import { GovernanceEngine } from '../governance/GovernanceEngine';
import { GovernanceLevel, GOVERNANCE_LEVEL_NAMES } from '../governance/types';
import { getActiveGates, getBlockingGates, getAdvisoryGates, canBypass } from '../governance/levels';

const SAMPLE_MESSAGES = [
  'What is React?',
  'Add user authentication with OAuth 2.0',
  'Fix the typo in README.md',
  'URGENT: Production is down',
  'Deploy to production',
];

async function main(): Promise<void> {
  console.log('=== AI-SDLC Governance Engine Test ===\n');

  // Show governance level summary
  console.log('--- Governance Level Summary ---');
  for (const level of [1, 2, 3, 4] as GovernanceLevel[]) {
    const active = getActiveGates(level);
    const blocking = getBlockingGates(level);
    const advisory = getAdvisoryGates(level);
    const bypass = canBypass(level);

    console.log(`\nLevel ${level}: ${GOVERNANCE_LEVEL_NAMES[level]}`);
    console.log(`  Active gates: ${active.length > 0 ? active.join(', ') : 'none'}`);
    console.log(`  Blocking: ${blocking.length > 0 ? blocking.join(', ') : 'none'}`);
    console.log(`  Advisory: ${advisory.length > 0 ? advisory.join(', ') : 'none'}`);
    console.log(`  Bypass: ${bypass.allowed ? (bypass.requiresToken ? 'Yes (token required)' : 'Yes') : 'No'}`);
  }

  console.log('\n--- Governance Evaluation Results ---\n');

  const classifier = new HybridClassifier({ tier2Enabled: false });

  for (const message of SAMPLE_MESSAGES) {
    console.log(`Message: "${message}"`);
    const classification = await classifier.classify(message);
    console.log(`  Classification: ${classification.type} / ${classification.complexity} / requiresSDLC=${classification.requiresSDLC}`);

    for (const level of [1, 2, 3, 4] as GovernanceLevel[]) {
      const engine = new GovernanceEngine({ level });
      const decision = engine.evaluate(classification);

      const status = decision.allowed ? 'ALLOWED' : 'BLOCKED';
      const blocked = decision.blockedBy.length > 0 ? ` (by: ${decision.blockedBy.join(', ')})` : '';
      const advisories = decision.advisories.length > 0 ? ` [${decision.advisories.length} advisories]` : '';
      console.log(`  Level ${level}: ${status}${blocked}${advisories}`);
    }

    console.log('');
  }
}

main().catch(console.error);
