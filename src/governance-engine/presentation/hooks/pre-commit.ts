#!/usr/bin/env node
/**
 * Pre-commit Hook
 * @module @deltek/governance-engine/hooks/pre-commit
 *
 * Install this hook:
 *   cp src/governance-engine/presentation/hooks/pre-commit.ts .husky/pre-commit
 *   # or
 *   npx governance setup-hooks
 */

import { GovernanceService } from '../../application/services/GovernanceService';
import { CliFormatter } from '../cli/formatters/CliFormatter';

async function main(): Promise<void> {
  const service = new GovernanceService();
  const formatter = new CliFormatter(false);

  formatter.printHeader('Pre-commit Governance Check');

  try {
    const result = await service.validate({
      staged: true,
    });

    formatter.printResult(result);

    if (!result.passed) {
      console.log('');
      console.log('Commit blocked due to policy violations.');
      console.log('Fix the issues above or use:');
      console.log('  git commit --no-verify    # Skip hooks (not recommended)');
      console.log('  governance validate --bypass --bypass-reason "reason"');
      console.log('');
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.log(`${result.warnings.length} warnings (non-blocking)`);
    }

    console.log('All governance checks passed!');
    process.exit(0);
  } catch (error) {
    // If no policies found or other setup issue, warn but don't block
    if (error instanceof Error && error.message.includes('No policies found')) {
      console.log('Warning: No governance policies configured. Skipping checks.');
      console.log('Configure policies at ~/.claude/governance/policies/');
      process.exit(0);
    }

    formatter.printError(error instanceof Error ? error.message : 'Unknown error');
    process.exit(2);
  }
}

main().catch((error) => {
  console.error('Pre-commit hook failed:', error);
  process.exit(2);
});
