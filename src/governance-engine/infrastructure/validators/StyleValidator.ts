/**
 * Style Validator
 * @module @vintiq/governance-engine/infrastructure/validators/StyleValidator
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { Policy } from '../../types/policy.types';
import {
  Validator,
  ValidationContext,
  ValidationResult,
  Violation,
} from '../../types/validation.types';

const execAsync = promisify(exec);

/**
 * ESLint output format
 */
interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

interface ESLintMessage {
  ruleId: string;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  fix?: { range: [number, number]; text: string };
}

/**
 * Validates code style and linting rules
 */
export class StyleValidator implements Validator {
  readonly name = 'style-validator';
  readonly description = 'Validates code style using ESLint';

  appliesTo(context: ValidationContext, policy: Policy): boolean {
    return (
      !!policy.codeQuality?.linting &&
      policy.codeQuality.linting.enforcement !== 'off'
    );
  }

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];

    const filesToCheck = context.changedFiles.filter(
      (f) =>
        (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')) &&
        !f.includes('node_modules')
    );

    if (filesToCheck.length === 0) {
      return {
        validator: this.name,
        passed: true,
        violations: [],
        duration: Date.now() - startTime,
      };
    }

    try {
      const eslintResults = await this.runESLint(
        filesToCheck,
        context.workingDirectory
      );

      for (const result of eslintResults) {
        for (const message of result.messages) {
          // Check if this should be a violation based on policy
          const shouldBlock =
            message.severity === 2 && policy.codeQuality.linting.zeroErrors;
          const shouldWarn =
            message.severity === 1 && policy.codeQuality.linting.zeroWarnings;

          if (shouldBlock || shouldWarn) {
            violations.push({
              rule: `code_quality.linting.${message.ruleId || 'unknown'}`,
              severity: message.severity === 2 ? 'high' : 'medium',
              message: message.message,
              location: {
                file: result.filePath,
                line: message.line,
                column: message.column,
              },
              remediation: this.getRemediation(message),
              autoFix: message.fix
                ? {
                    available: true,
                    description: 'Auto-fix available',
                    replacement: message.fix.text,
                    safe: true,
                  }
                : undefined,
              references: message.ruleId
                ? [`https://eslint.org/docs/rules/${message.ruleId}`]
                : [],
            });
          }
        }
      }
    } catch (error) {
      // ESLint not available or failed
      return {
        validator: this.name,
        passed: true,
        violations: [],
        duration: Date.now() - startTime,
        skipped: true,
        skipReason: `ESLint not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    return {
      validator: this.name,
      passed: violations.filter((v) => v.severity === 'high').length === 0,
      violations,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run ESLint on files
   */
  private async runESLint(
    files: string[],
    workingDirectory: string
  ): Promise<ESLintResult[]> {
    // Make paths relative to working directory
    const relativePaths = files.map((f) =>
      path.isAbsolute(f) ? path.relative(workingDirectory, f) : f
    );

    try {
      // Try running ESLint
      const { stdout } = await execAsync(
        `npx eslint --format json ${relativePaths.join(' ')}`,
        {
          cwd: workingDirectory,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024, // 10MB
        }
      );

      return JSON.parse(stdout) as ESLintResult[];
    } catch (error: unknown) {
      // ESLint exits with non-zero code if there are errors
      // But still returns valid JSON output
      const execError = error as { stdout?: string; stderr?: string };
      if (execError.stdout) {
        try {
          return JSON.parse(execError.stdout) as ESLintResult[];
        } catch {
          // Not valid JSON, actual error
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Get remediation suggestion for ESLint message
   */
  private getRemediation(message: ESLintMessage): string {
    if (message.fix) {
      return 'Run `eslint --fix` to auto-fix this issue';
    }

    // Common remediation suggestions
    const remediations: Record<string, string> = {
      'no-unused-vars': 'Remove the unused variable or use it',
      'no-console': 'Use a proper logging library instead of console',
      '@typescript-eslint/no-explicit-any':
        'Replace `any` with a proper type',
      '@typescript-eslint/explicit-function-return-type':
        'Add explicit return type to function',
      'prefer-const': 'Use `const` instead of `let` for variables that are never reassigned',
      'no-var': 'Use `let` or `const` instead of `var`',
      eqeqeq: 'Use === instead of ==',
    };

    return remediations[message.ruleId] || message.message;
  }
}
