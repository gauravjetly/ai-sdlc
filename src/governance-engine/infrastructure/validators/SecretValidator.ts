/**
 * Secret Validator
 * @module @vintiq/governance-engine/infrastructure/validators/SecretValidator
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Policy } from '../../types/policy.types';
import {
  Validator,
  ValidationContext,
  ValidationResult,
  Violation,
} from '../../types/validation.types';

/**
 * Common secret patterns to detect
 */
const SECRET_PATTERNS = [
  {
    name: 'AWS Access Key',
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    severity: 'critical' as const,
  },
  {
    name: 'AWS Secret Key',
    pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
    severity: 'critical' as const,
    requiresContext: true,
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    severity: 'critical' as const,
  },
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    severity: 'critical' as const,
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd|token)\s*[:=]\s*['"]?([a-zA-Z0-9_!@#$%^&*()-]{8,})['"]?/gi,
    severity: 'critical' as const,
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g,
    severity: 'critical' as const,
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]*\.eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*/g,
    severity: 'high' as const,
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
    severity: 'critical' as const,
  },
  {
    name: 'Heroku API Key',
    pattern: /[h|H]eroku.*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi,
    severity: 'critical' as const,
  },
  {
    name: 'Database Connection String',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^:\s]+:[^@\s]+@[^/\s]+/gi,
    severity: 'critical' as const,
  },
];

/**
 * Paths to exclude from secret scanning
 */
const EXCLUDED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '__snapshots__',
  '*.test.ts',
  '*.spec.ts',
  '*.md',
  'package-lock.json',
  'yarn.lock',
];

/**
 * Validates that no hardcoded secrets are present in code
 */
export class SecretValidator implements Validator {
  readonly name = 'secret-validator';
  readonly description = 'Detects hardcoded secrets and credentials';

  appliesTo(context: ValidationContext, policy: Policy): boolean {
    return policy.security?.secrets?.noHardcoded === true;
  }

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];

    const filesToCheck = context.changedFiles.filter(
      (f) => !this.isExcluded(f)
    );

    for (const file of filesToCheck) {
      try {
        const content = await this.getFileContent(file, context);
        const fileViolations = this.scanContent(file, content);
        violations.push(...fileViolations);
      } catch (error) {
        // Skip files we can't read
        continue;
      }
    }

    return {
      validator: this.name,
      passed: violations.length === 0,
      violations,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Check if file should be excluded from scanning
   */
  private isExcluded(filePath: string): boolean {
    return EXCLUDED_PATHS.some((pattern) => {
      if (pattern.startsWith('*')) {
        return filePath.endsWith(pattern.slice(1));
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Scan file content for secrets
   */
  private scanContent(filePath: string, content: string): Violation[] {
    const violations: Violation[] = [];
    const lines = content.split('\n');

    for (const secretDef of SECRET_PATTERNS) {
      // Reset regex lastIndex
      secretDef.pattern.lastIndex = 0;
      let match;

      while ((match = secretDef.pattern.exec(content)) !== null) {
        // Skip if in comment
        const lineNum = this.getLineNumber(content, match.index);
        const line = lines[lineNum - 1];

        if (!line || this.isInComment(line)) {
          continue;
        }

        // Skip if looks like placeholder
        const matchText = match[0];
        if (this.looksLikePlaceholder(matchText)) {
          continue;
        }

        violations.push({
          rule: 'security.secrets.no_hardcoded',
          severity: secretDef.severity,
          message: `Potential ${secretDef.name} detected`,
          location: {
            file: filePath,
            line: lineNum,
            snippet: this.redactSecret(line.trim()),
          },
          remediation: this.getRemediation(secretDef.name),
          references: [
            'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
          ],
          cweId: 'CWE-798',
          owaspCategory: 'A07:2021',
        });
      }
    }

    return violations;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, charIndex: number): number {
    const lines = content.substring(0, charIndex).split('\n');
    return lines.length;
  }

  /**
   * Check if text is in a comment
   */
  private isInComment(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('#')
    );
  }

  /**
   * Check if match looks like a placeholder
   */
  private looksLikePlaceholder(text: string): boolean {
    const placeholders = [
      'your-',
      'YOUR_',
      'xxx',
      'XXX',
      'example',
      'EXAMPLE',
      'placeholder',
      'PLACEHOLDER',
      '<',
      '>',
      '${',
      'process.env',
      'import.meta.env',
    ];
    return placeholders.some((p) => text.toLowerCase().includes(p.toLowerCase()));
  }

  /**
   * Redact secret value for safe display
   */
  private redactSecret(line: string): string {
    // Redact values after = or :
    return line.replace(
      /([:=]\s*['"]?)([^'"]+)(['"]?)/g,
      (_, prefix, value, suffix) => {
        if (value.length > 8) {
          return `${prefix}${value.substring(0, 4)}****${suffix}`;
        }
        return `${prefix}****${suffix}`;
      }
    );
  }

  /**
   * Get remediation suggestion for secret type
   */
  private getRemediation(secretType: string): string {
    const remediations: Record<string, string> = {
      'AWS Access Key':
        'Use environment variables or AWS Secrets Manager. Example: process.env.AWS_ACCESS_KEY_ID',
      'AWS Secret Key':
        'Use environment variables or AWS Secrets Manager. Example: process.env.AWS_SECRET_ACCESS_KEY',
      'GitHub Token':
        'Use environment variables or GitHub Actions secrets. Example: process.env.GITHUB_TOKEN',
      'Generic API Key':
        'Use environment variables. Example: process.env.API_KEY',
      'Generic Secret':
        'Use environment variables or a secrets manager. Example: process.env.SECRET',
      'Private Key':
        'Store private keys in a secure key management system, not in code',
      'JWT Token':
        'Generate tokens dynamically, do not hardcode',
      'Slack Token':
        'Use environment variables. Example: process.env.SLACK_TOKEN',
      'Database Connection String':
        'Use environment variables. Example: process.env.DATABASE_URL',
    };

    return (
      remediations[secretType] ||
      'Use environment variables instead of hardcoding secrets'
    );
  }

  /**
   * Get file content from context or filesystem
   */
  private async getFileContent(
    filePath: string,
    context: ValidationContext
  ): Promise<string> {
    if (context.fileContents) {
      const fileContent = context.fileContents.find(
        (f) => f.path === filePath
      );
      if (fileContent) {
        return fileContent.content;
      }
    }

    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(context.workingDirectory, filePath);

    return fs.readFile(fullPath, 'utf-8');
  }
}
