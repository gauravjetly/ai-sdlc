/**
 * CLI Formatter
 * @module @vintiq/governance-engine/cli/formatters/CliFormatter
 */

import { GovernanceResult, GovernanceSummary } from '../../../types/enforcement.types';
import { Violation, ValidationWarning } from '../../../types/validation.types';

/**
 * ANSI color codes
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Severity to color mapping
 */
const severityColors: Record<string, string> = {
  critical: colors.red + colors.bright,
  high: colors.red,
  medium: colors.yellow,
  low: colors.cyan,
  info: colors.dim,
};

/**
 * Formats governance results for CLI output
 */
export class CliFormatter {
  private readonly verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Print header
   */
  printHeader(title: string): void {
    console.log('');
    console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}  ${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
    console.log('');
  }

  /**
   * Print governance result
   */
  printResult(result: GovernanceResult): void {
    // Print violations
    if (result.violations.length > 0) {
      this.printViolations(result.violations);
    }

    // Print warnings
    if (result.warnings.length > 0 && this.verbose) {
      this.printWarnings(result.warnings);
    }

    // Print summary
    this.printSummary(result.summary, result.passed, result.bypassed);
  }

  /**
   * Print violations
   */
  private printViolations(violations: Violation[]): void {
    console.log(`${colors.red}${colors.bright}VIOLATIONS FOUND:${colors.reset}`);
    console.log('');

    for (const violation of violations) {
      const color = severityColors[violation.severity] || colors.white;

      console.log(`${color}[${violation.severity.toUpperCase()}]${colors.reset} ${violation.rule}`);
      console.log(`  ${colors.bright}${violation.message}${colors.reset}`);

      if (violation.location) {
        console.log(
          `  ${colors.dim}at ${violation.location.file}:${violation.location.line}${colors.reset}`
        );
        if (violation.location.snippet) {
          console.log(`  ${colors.dim}> ${violation.location.snippet}${colors.reset}`);
        }
      }

      if (violation.remediation) {
        console.log(`  ${colors.cyan}Fix: ${violation.remediation}${colors.reset}`);
      }

      console.log('');
    }
  }

  /**
   * Print warnings
   */
  private printWarnings(warnings: ValidationWarning[]): void {
    console.log(`${colors.yellow}WARNINGS:${colors.reset}`);
    console.log('');

    for (const warning of warnings) {
      console.log(`${colors.yellow}[WARN]${colors.reset} ${warning.rule}`);
      console.log(`  ${warning.message}`);
      if (warning.suggestion) {
        console.log(`  ${colors.dim}Suggestion: ${warning.suggestion}${colors.reset}`);
      }
      console.log('');
    }
  }

  /**
   * Print summary
   */
  private printSummary(
    summary: GovernanceSummary,
    passed: boolean,
    bypassed: boolean
  ): void {
    console.log('');
    console.log(`${colors.dim}----------------------------------------${colors.reset}`);
    console.log(`${colors.bright}SUMMARY${colors.reset}`);
    console.log('');

    console.log(`  Files validated:    ${summary.filesValidated}`);
    console.log(`  Validators run:     ${summary.validatorsRun}`);
    if (summary.validatorsSkipped > 0) {
      console.log(`  Validators skipped: ${summary.validatorsSkipped}`);
    }
    console.log(`  Duration:           ${summary.totalDuration}ms`);
    console.log('');

    if (summary.totalViolations > 0) {
      console.log(`  ${colors.bright}Violations:${colors.reset}`);
      if (summary.violationsBySeverity.critical > 0) {
        console.log(`    ${colors.red}Critical: ${summary.violationsBySeverity.critical}${colors.reset}`);
      }
      if (summary.violationsBySeverity.high > 0) {
        console.log(`    ${colors.red}High:     ${summary.violationsBySeverity.high}${colors.reset}`);
      }
      if (summary.violationsBySeverity.medium > 0) {
        console.log(`    ${colors.yellow}Medium:   ${summary.violationsBySeverity.medium}${colors.reset}`);
      }
      if (summary.violationsBySeverity.low > 0) {
        console.log(`    ${colors.cyan}Low:      ${summary.violationsBySeverity.low}${colors.reset}`);
      }
      console.log('');
    }

    console.log(`${colors.dim}----------------------------------------${colors.reset}`);

    if (passed) {
      if (bypassed) {
        console.log(`${colors.yellow}${colors.bright}BYPASSED${colors.reset} - Violations bypassed with authorization`);
      } else if (summary.totalViolations === 0) {
        console.log(`${colors.green}${colors.bright}PASSED${colors.reset} - All checks passed!`);
      } else {
        console.log(`${colors.green}${colors.bright}PASSED${colors.reset} - No blocking violations`);
      }
    } else {
      console.log(`${colors.red}${colors.bright}FAILED${colors.reset} - Blocking violations detected`);
      console.log('');
      console.log(`${colors.dim}Fix the violations above or use --bypass with a valid reason.${colors.reset}`);
    }

    console.log('');
  }

  /**
   * Print detailed report
   */
  printDetailedReport(result: GovernanceResult): void {
    this.printResult(result);

    console.log('');
    console.log(`${colors.bright}VALIDATOR DETAILS:${colors.reset}`);
    console.log('');

    for (const validatorResult of result.validatorResults) {
      const status = validatorResult.passed
        ? `${colors.green}PASS${colors.reset}`
        : `${colors.red}FAIL${colors.reset}`;

      console.log(
        `  ${status} ${validatorResult.validator} ` +
        `(${validatorResult.violations.length} violations, ${validatorResult.duration}ms)`
      );

      if (validatorResult.skipped) {
        console.log(`    ${colors.dim}Skipped: ${validatorResult.skipReason}${colors.reset}`);
      }
    }

    console.log('');
  }

  /**
   * Print error
   */
  printError(message: string): void {
    console.log('');
    console.log(`${colors.red}${colors.bright}ERROR:${colors.reset} ${message}`);
    console.log('');
  }

  /**
   * Print info
   */
  printInfo(message: string): void {
    console.log(`${colors.blue}INFO:${colors.reset} ${message}`);
  }
}
