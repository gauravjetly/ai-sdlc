/**
 * Validate Command
 * @module @vintiq/governance-engine/cli/commands/validate
 */

import { Command } from 'commander';
import { GovernanceService } from '../../../application/services/GovernanceService';
import { CliFormatter } from '../formatters/CliFormatter';

export const validateCommand = new Command('validate')
  .description('Validate code against governance policies')
  .option('-p, --policy <paths...>', 'Policy file paths')
  .option('-f, --files <files...>', 'Specific files to validate')
  .option('--all', 'Validate all tracked files')
  .option('--staged', 'Validate only staged files (default)')
  .option('--bypass', 'Bypass blocking violations (requires reason)')
  .option('--bypass-reason <reason>', 'Reason for bypass')
  .option('--bypass-token <token>', 'Bypass authorization token')
  .option('--dry-run', 'Report violations without blocking')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Verbose output')
  .option('-v, --validators <validators...>', 'Specific validators to run')
  .option('--skip <validators...>', 'Validators to skip')
  .action(async (options) => {
    const service = new GovernanceService();
    const formatter = new CliFormatter(options.verbose);

    try {
      if (!options.json) {
        formatter.printHeader('Governance Validation');
      }

      const result = await service.validate({
        policyPaths: options.policy,
        files: options.files,
        all: options.all,
        staged: options.staged ?? true,
        enforcement: {
          bypass: options.bypass,
          bypassReason: options.bypassReason,
          bypassToken: options.bypassToken,
          dryRun: options.dryRun,
        },
        validators: options.validators,
        skipValidators: options.skip,
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
