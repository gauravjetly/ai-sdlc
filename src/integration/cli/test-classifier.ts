#!/usr/bin/env node
/**
 * CLI Test Harness: Classifier
 *
 * Test the request classifier with various messages.
 *
 * Usage:
 *   npx ts-node src/integration/cli/test-classifier.ts "What is React?"
 *   npx ts-node src/integration/cli/test-classifier.ts --batch
 *
 * @module cli/test-classifier
 */

import { HybridClassifier } from '../classifier/HybridClassifier';
import { RuleClassifier } from '../classifier/RuleClassifier';
import { RequestClassification } from '../classifier/types';

const SAMPLE_MESSAGES = [
  'What is React?',
  'Explain how dependency injection works',
  'Fix the typo in README.md',
  'Add user authentication with OAuth 2.0 and MFA',
  'URGENT: The payment API is returning 500 errors in production',
  'Review the security of src/auth/handler.ts',
  'Design a microservices architecture for the order system',
  'Fix the null pointer exception in UserService.validate()',
  'Deploy the latest version to staging',
  'Write unit tests for the PaymentProcessor class',
  'Update the docker-compose.yml to add Redis',
  'Refactor the authentication module to use the strategy pattern',
  'Write API documentation for the user endpoints',
  'Configure the CI/CD pipeline for GitHub Actions',
  'Create a new REST endpoint for user profiles with avatar upload',
];

function formatClassification(result: RequestClassification): string {
  const lines = [
    `  Type: ${result.type}`,
    `  Complexity: ${result.complexity}`,
    `  Urgency: ${result.urgency}`,
    `  Confidence: ${result.confidence.toFixed(2)}`,
    `  Requires SDLC: ${result.requiresSDLC}`,
    `  Phases: ${result.requiredPhases.length > 0 ? result.requiredPhases.join(', ') : 'none'}`,
    `  Classifier: ${result.classifierUsed}`,
    `  Duration: ${result.classificationDuration}ms`,
    `  Rules matched: ${result.rulesMatched.length > 0 ? result.rulesMatched.join(', ') : 'none'}`,
  ];

  if (result.detectedTechnologies.length > 0) {
    lines.push(`  Technologies: ${result.detectedTechnologies.join(', ')}`);
  }

  return lines.join('\n');
}

async function runSingle(message: string): Promise<void> {
  console.log('=== AI-SDLC Request Classifier Test ===\n');

  // Tier 1 only
  console.log('--- Tier 1 (Rules Only) ---');
  const ruleClassifier = new RuleClassifier();
  const startRule = Date.now();
  const ruleResult = await ruleClassifier.classify(message);
  const ruleTime = Date.now() - startRule;
  console.log(`Message: "${message}"`);
  console.log(`  Type: ${ruleResult.type}`);
  console.log(`  Confidence: ${ruleResult.confidence.toFixed(2)}`);
  console.log(`  Time: ${ruleTime}ms`);
  console.log(`  Rules: ${(ruleResult.rulesMatched || []).join(', ') || 'none'}`);
  console.log('');

  // Hybrid (Tier 1 + Tier 2 disabled for offline testing)
  console.log('--- Hybrid (Tier 1 + Tier 2 disabled) ---');
  const classifier = new HybridClassifier({ tier2Enabled: false });
  const result = await classifier.classify(message);
  console.log(`Message: "${message}"`);
  console.log(formatClassification(result));
  console.log('');
}

async function runBatch(): Promise<void> {
  console.log('=== AI-SDLC Classifier Batch Test ===\n');

  const classifier = new HybridClassifier({ tier2Enabled: false });

  const results: Array<{ message: string; result: RequestClassification }> = [];
  let totalTime = 0;

  for (const message of SAMPLE_MESSAGES) {
    const result = await classifier.classify(message);
    results.push({ message, result });
    totalTime += result.classificationDuration;
  }

  // Summary table
  console.log('| # | Message (truncated) | Type | Complexity | SDLC | Conf | Time |');
  console.log('|---|---------------------|------|------------|------|------|------|');

  for (let i = 0; i < results.length; i++) {
    const { message, result } = results[i];
    const truncated = message.length > 50 ? message.slice(0, 47) + '...' : message;
    console.log(
      `| ${i + 1} | ${truncated.padEnd(50)} | ${result.type.padEnd(13)} | ${result.complexity.padEnd(7)} | ${result.requiresSDLC ? 'YES' : 'NO '} | ${result.confidence.toFixed(2)} | ${result.classificationDuration}ms |`,
    );
  }

  console.log('');
  console.log(`Total: ${results.length} messages classified in ${totalTime}ms`);
  console.log(`Average: ${(totalTime / results.length).toFixed(1)}ms per message`);

  // Stats
  const stats = classifier.getStats();
  console.log(`Cache hits: ${stats.cacheHits}`);
  console.log(`Disagreements: ${stats.disagreements}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--batch')) {
    await runBatch();
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    await runSingle(args.join(' '));
  } else {
    console.log('Usage:');
    console.log('  npx ts-node src/integration/cli/test-classifier.ts "Your message here"');
    console.log('  npx ts-node src/integration/cli/test-classifier.ts --batch');
    console.log('');
    // Default: run batch
    await runBatch();
  }
}

main().catch(console.error);
