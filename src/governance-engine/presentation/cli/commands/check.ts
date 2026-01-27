/**
 * Check Command (Pre-commit)
 * @module @deltek/governance-engine/cli/commands/check
 */

import { Command } from 'commander';
import { GovernanceService } from '../../../application/services/GovernanceService';
import { CliFormatter } from '../formatters/CliFormatter';

export const checkCommand = new Command('check')
  .description('Run pre-commit governance check (alias for validate --staged)')
  .option('-p, --policy <paths...>', 'Policy file paths')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    const service = new GovernanceService();
    const formatter = new CliFormatter(options.verbose);

    try {
      if (!options.json) {
        formatter.printHeader('Pre-commit Governance Check');
      }

      const result = await service.validate({
        policyPaths: options.policy,
        staged: true,
        verbose: options.verbose,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        formatter.printResult(result);
      }

      process.exit(result.passed ? 0 : 1);
    } catch (error) {
      if (options.json) {
        console.log(
          JSON.stringify({
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      } else {
        formatter.printError(error instanceof Error ? error.message : 'Unknown error');
      }
      process.exit(2);
    }
  });
