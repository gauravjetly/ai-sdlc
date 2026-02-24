/**
 * Report Command
 * @module @vintiq/governance-engine/cli/commands/report
 */

import { Command } from 'commander';
import { GovernanceService } from '../../../application/services/GovernanceService';
import { CliFormatter } from '../formatters/CliFormatter';

export const reportCommand = new Command('report')
  .description('Generate governance compliance report')
  .option('-p, --policy <paths...>', 'Policy file paths')
  .option('-o, --output <path>', 'Output file path')
  .option('--format <format>', 'Output format (console, json, markdown)', 'console')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    const service = new GovernanceService();
    const formatter = new CliFormatter(options.verbose);

    try {
      formatter.printHeader('Governance Compliance Report');

      const result = await service.validate({
        policyPaths: options.policy,
        all: true,
        verbose: options.verbose,
      });

      if (options.format === 'json') {
        const report = {
          generatedAt: new Date().toISOString(),
          summary: result.summary,
          violations: result.violations,
          warnings: result.warnings,
          validatorResults: result.validatorResults.map((r) => ({
            validator: r.validator,
            passed: r.passed,
            violationCount: r.violations.length,
            duration: r.duration,
          })),
        };

        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, JSON.stringify(report, null, 2));
          console.log(`Report written to: ${options.output}`);
        } else {
          console.log(JSON.stringify(report, null, 2));
        }
      } else if (options.format === 'markdown') {
        const markdown = generateMarkdownReport(result);
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, markdown);
          console.log(`Report written to: ${options.output}`);
        } else {
          console.log(markdown);
        }
      } else {
        formatter.printDetailedReport(result);
      }

      process.exit(result.passed ? 0 : 1);
    } catch (error) {
      formatter.printError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(2);
    }
  });

/**
 * Generate markdown report
 */
function generateMarkdownReport(result: import('../../../types/enforcement.types').GovernanceResult): string {
  const lines: string[] = [];

  lines.push('# Governance Compliance Report');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push(`**Status**: ${result.passed ? 'PASSED' : 'FAILED'}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Files Validated | ${result.summary.filesValidated} |`);
  lines.push(`| Total Violations | ${result.summary.totalViolations} |`);
  lines.push(`| Critical | ${result.summary.violationsBySeverity.critical} |`);
  lines.push(`| High | ${result.summary.violationsBySeverity.high} |`);
  lines.push(`| Medium | ${result.summary.violationsBySeverity.medium} |`);
  lines.push(`| Low | ${result.summary.violationsBySeverity.low} |`);
  lines.push(`| Validators Run | ${result.summary.validatorsRun} |`);
  lines.push(`| Duration | ${result.summary.totalDuration}ms |`);
  lines.push('');

  if (result.violations.length > 0) {
    lines.push('## Violations');
    lines.push('');

    for (const violation of result.violations) {
      lines.push(`### ${violation.severity.toUpperCase()}: ${violation.rule}`);
      lines.push('');
      lines.push(`**Message**: ${violation.message}`);
      if (violation.location) {
        lines.push(`**Location**: ${violation.location.file}:${violation.location.line}`);
      }
      if (violation.remediation) {
        lines.push(`**Remediation**: ${violation.remediation}`);
      }
      lines.push('');
    }
  }

  if (result.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');

    for (const warning of result.warnings) {
      lines.push(`- **${warning.rule}**: ${warning.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
