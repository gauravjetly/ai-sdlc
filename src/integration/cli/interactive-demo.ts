#!/usr/bin/env node
/**
 * Interactive Demo
 *
 * Interactive CLI demo of the AI-SDLC integration pipeline:
 * Classify -> Route -> Governance -> Display decision.
 *
 * Usage:
 *   npx ts-node src/integration/cli/interactive-demo.ts
 *
 * @module cli/interactive-demo
 */

import * as readline from 'readline';
import { HybridClassifier } from '../classifier/HybridClassifier';
import { SmartRouter } from '../router/Router';
import { GovernanceEngine } from '../governance/GovernanceEngine';
import { GovernanceLevel, GOVERNANCE_LEVEL_NAMES } from '../governance/types';
import { loadIntegrationConfig } from '../config';

async function main(): Promise<void> {
  console.log('=====================================================');
  console.log('  AI-SDLC Integration - Interactive Demo');
  console.log('=====================================================');
  console.log('');
  console.log('This demo simulates the full classification pipeline.');
  console.log('Type a message and see how it would be classified,');
  console.log('routed, and governed.');
  console.log('');
  console.log('Commands:');
  console.log('  /level <1-4>  - Change governance level');
  console.log('  /stats        - Show classifier/router statistics');
  console.log('  /config       - Show current configuration');
  console.log('  /quit         - Exit');
  console.log('');

  // Load config
  const { config, warnings } = loadIntegrationConfig();
  if (warnings.length > 0) {
    for (const w of warnings) {
      console.log(`[Warning] ${w}`);
    }
  }

  // Initialize components
  const classifier = new HybridClassifier({
    tier2Enabled: false, // Offline mode for demo
  });
  const router = new SmartRouter({
    alwaysSDLCFor: config.routing.alwaysSDLCFor,
    neverSDLCFor: config.routing.neverSDLCFor,
  });
  const governance = new GovernanceEngine({
    level: config.governance.level,
  });

  console.log(`[Config] Governance Level: ${governance.getLevel()} (${governance.getLevelName()})`);
  console.log(`[Config] Tier 1 (rules): enabled | Tier 2 (LLM): disabled (offline demo)`);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You > ',
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      handleCommand(input, governance, classifier, router, config);
      rl.prompt();
      return;
    }

    // Classify
    const classification = await classifier.classify(input, {
      branch: 'main',
      hasUncommittedChanges: false,
      projectType: 'typescript',
    });

    // Route
    const decision = router.route(classification, governance.getLevel());

    // Governance
    const govDecision = governance.evaluate(classification, 'main');

    // Display results
    console.log('');
    console.log('--- Classification ---');
    console.log(`  Type: ${classification.type}`);
    console.log(`  Complexity: ${classification.complexity}`);
    console.log(`  Urgency: ${classification.urgency}`);
    console.log(`  Confidence: ${classification.confidence.toFixed(2)}`);
    console.log(`  Requires SDLC: ${classification.requiresSDLC}`);
    console.log(`  Classifier: ${classification.classifierUsed}`);
    console.log(`  Time: ${classification.classificationDuration}ms`);

    if (classification.detectedTechnologies.length > 0) {
      console.log(`  Technologies: ${classification.detectedTechnologies.join(', ')}`);
    }

    console.log('');
    console.log('--- Routing Decision ---');
    console.log(`  Strategy: ${decision.strategy}`);
    console.log(`  Agents: ${decision.agents.length > 0 ? decision.agents.join(', ') : 'none (passthrough)'}`);
    console.log(`  Phases: ${decision.phases.length > 0 ? decision.phases.join(', ') : 'none'}`);
    console.log(`  Blocking: ${decision.blocking}`);
    console.log(`  Est. Duration: ${decision.estimatedDuration}`);

    if (decision.contextInjection) {
      console.log('');
      console.log('--- Context Injection ---');
      console.log(decision.contextInjection);
    }

    console.log('');
    console.log('--- Governance ---');
    console.log(governance.formatDecision(govDecision));

    console.log('');
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

function handleCommand(
  input: string,
  governance: GovernanceEngine,
  classifier: HybridClassifier,
  router: SmartRouter,
  config: ReturnType<typeof loadIntegrationConfig>['config'],
): void {
  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case '/level': {
      const level = parseInt(parts[1], 10) as GovernanceLevel;
      if (level >= 1 && level <= 4) {
        const change = governance.setLevel(level);
        console.log(`[Config] Governance level changed: ${change.previous} -> ${change.current} (${GOVERNANCE_LEVEL_NAMES[change.current]})`);
      } else {
        console.log('[Error] Level must be 1-4');
      }
      break;
    }
    case '/stats': {
      const cStats = classifier.getStats();
      const rStats = router.getStats();
      const gStats = governance.getStats();

      console.log('--- Classifier Stats ---');
      console.log(`  Total: ${cStats.totalClassifications}`);
      console.log(`  Cache hits: ${cStats.cacheHits} (${(cStats.cacheHitRate * 100).toFixed(0)}%)`);
      console.log(`  Disagreements: ${cStats.disagreements}`);

      console.log('--- Router Stats ---');
      console.log(`  Total routes: ${rStats.totalRoutes}`);
      console.log(`  Strategies: ${rStats.strategyCount}`);

      console.log('--- Governance Stats ---');
      console.log(`  Level: ${gStats.level} (${gStats.levelName})`);
      console.log(`  Decisions: ${gStats.totalDecisions}`);
      console.log(`  Blocked: ${gStats.blockedCount} (${(gStats.blockRate * 100).toFixed(0)}%)`);
      break;
    }
    case '/config': {
      console.log(JSON.stringify(config, null, 2));
      break;
    }
    case '/quit':
    case '/exit':
    case '/q': {
      console.log('Goodbye!');
      process.exit(0);
    }
    default:
      console.log(`Unknown command: ${cmd}. Try /level, /stats, /config, or /quit.`);
  }
}

main().catch(console.error);
