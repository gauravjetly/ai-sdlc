#!/usr/bin/env node
/**
 * CLI Test Harness: Router
 *
 * Test the smart router with classifications at different governance levels.
 *
 * Usage:
 *   npx ts-node src/integration/cli/test-router.ts
 *   npx ts-node src/integration/cli/test-router.ts --level 3
 *
 * @module cli/test-router
 */

import { HybridClassifier } from '../classifier/HybridClassifier';
import { SmartRouter } from '../router/Router';
import { GovernanceLevel } from '../governance/types';

const SAMPLE_MESSAGES = [
  'What is React?',
  'Fix the typo in README.md',
  'Add user authentication with OAuth 2.0',
  'URGENT: Production database is down',
  'Review the security of the auth module',
  'Design a scalable architecture for notifications',
  'Fix the null pointer in UserService',
  'Write documentation for the API endpoints',
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const levelArg = args.indexOf('--level');
  const governanceLevel: GovernanceLevel = levelArg >= 0
    ? (parseInt(args[levelArg + 1], 10) as GovernanceLevel) || 2
    : 2;

  console.log(`=== AI-SDLC Smart Router Test (Governance Level ${governanceLevel}) ===\n`);

  const classifier = new HybridClassifier({ tier2Enabled: false });
  const router = new SmartRouter();

  console.log('| Message | Type | Strategy | Agents | Phases | Blocking | Duration |');
  console.log('|---------|------|----------|--------|--------|----------|----------|');

  for (const message of SAMPLE_MESSAGES) {
    const classification = await classifier.classify(message);
    const decision = router.route(classification, governanceLevel);

    const truncated = message.length > 40 ? message.slice(0, 37) + '...' : message;
    console.log(
      `| ${truncated.padEnd(40)} | ${classification.type.padEnd(13)} | ${decision.strategy.padEnd(14)} | ${decision.agents.join(',').padEnd(20) || 'none'.padEnd(20)} | ${decision.phases.length} | ${decision.blocking ? 'YES' : 'NO '} | ${decision.estimatedDuration} |`,
    );
  }

  console.log('');
  const stats = router.getStats();
  console.log(`Total routes: ${stats.totalRoutes}`);
  console.log(`Strategies available: ${stats.strategyCount}`);

  // Show available strategies
  console.log('\nRegistered strategies:');
  for (const strategy of router.getStrategies()) {
    console.log(`  - ${strategy.name}`);
  }
}

main().catch(console.error);
