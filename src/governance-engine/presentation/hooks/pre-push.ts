#!/usr/bin/env node
/**
 * Pre-push Hook
 * @module @vintiq/governance-engine/hooks/pre-push
 *
 * More thorough check before pushing to remote
 */

import { GovernanceService } from '../../application/services/GovernanceService';
import { CliFormatter } from '../cli/formatters/CliFormatter';

async function main(): Promise<void> {
  const service = new GovernanceService();
  const formatter = new CliFormatter(false);

  formatter.printHeader('Pre-push Governance Check');

  try {
    // Run full validation on all tracked files
    const result = await service.validate({
      all: true,
    });

    formatter.printResult(result);

    if (!result.passed) {
      console.log('');
      console.log('Push blocked due to policy violations.');
      console.log('Fix the issues above before pushing.');
      console.log('');
      process.exit(1);
    }

    console.log('All governance checks passed!');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message.includes('No policies found')) {
      console.log('Warning: No governance policies configured. Skipping checks.');
      process.exit(0);
    }

    formatter.printError(error instanceof Error ? error.message : 'Unknown error');
    process.exit(2);
  }
}

main().catch((error) => {
  console.error('Pre-push hook failed:', error);
  process.exit(2);
});
