/**
 * Security Validator
 * @module @deltek/governance-engine/infrastructure/validators/SecurityValidator
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
 * Security patterns to detect (OWASP aligned)
 */
const SECURITY_PATTERNS = [
  // A03:2021 Injection
  {
    name: 'SQL Injection',
    pattern: /(?:query|execute|exec)\s*\(\s*[`'"].*\$\{.*\}|(?:query|execute|exec)\s*\(\s*.*\+.*['"]/gi,
    severity: 'critical' as const,
    rule: 'security.sql_injection',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021',
    remediation: 'Use parameterized queries or prepared statements instead of string concatenation',
  },
  {
    name: 'Command Injection',
    pattern: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*[`'"].*\$\{.*\}|(?:child_process)/gi,
    severity: 'high' as const,
    rule: 'security.command_injection',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021',
    remediation: 'Validate and sanitize all user input before passing to system commands',
  },
  // A02:2021 Cryptographic Failures
  {
    name: 'Weak Crypto - MD5',
    pattern: /createHash\s*\(\s*['"]md5['"]\s*\)/gi,
    severity: 'high' as const,
    rule: 'security.weak_crypto',
    cweId: 'CWE-327',
    owaspCategory: 'A02:2021',
    remediation: 'Use SHA-256 or stronger: createHash("sha256")',
  },
  {
    name: 'Weak Crypto - SHA1',
    pattern: /createHash\s*\(\s*['"]sha1['"]\s*\)/gi,
    severity: 'medium' as const,
    rule: 'security.weak_crypto',
    cweId: 'CWE-327',
    owaspCategory: 'A02:2021',
    remediation: 'Use SHA-256 or stronger: createHash("sha256")',
  },
  // A07:2021 Auth Failures
  {
    name: 'No Password Hashing',
    pattern: /password\s*[:=]\s*(?:req\.body|user)\./gi,
    severity: 'high' as const,
    rule: 'security.no_password_hashing',
    cweId: 'CWE-256',
    owaspCategory: 'A07:2021',
    remediation: 'Use bcrypt or argon2 to hash passwords before storage',
  },
  // A05:2021 Security Misconfiguration
  {
    name: 'Debug Mode',
    pattern: /debug\s*[:=]\s*true|NODE_ENV\s*[:=!]==?\s*['"]development['"]/gi,
    severity: 'medium' as const,
    rule: 'security.debug_mode',
    cweId: 'CWE-489',
    owaspCategory: 'A05:2021',
    remediation: 'Ensure debug mode is disabled in production',
  },
  {
    name: 'CORS Allow All',
    pattern: /cors\s*\(\s*\{[\s\S]*origin\s*:\s*['"]\*['"]/gi,
    severity: 'high' as const,
    rule: 'security.cors_allow_all',
    cweId: 'CWE-942',
    owaspCategory: 'A05:2021',
    remediation: 'Specify allowed origins explicitly instead of using wildcard',
  },
  // A09:2021 Logging Failures
  {
    name: 'Sensitive Data in Logs',
    pattern: /console\.log\s*\(.*(?:password|secret|token|key|credential)/gi,
    severity: 'high' as const,
    rule: 'security.sensitive_logging',
    cweId: 'CWE-532',
    owaspCategory: 'A09:2021',
    remediation: 'Never log sensitive data. Redact passwords, tokens, and keys',
  },
  // Input Validation
  {
    name: 'Unvalidated Input',
    pattern: /eval\s*\(\s*(?:req\.body|req\.query|req\.params)/gi,
    severity: 'critical' as const,
    rule: 'security.unvalidated_input',
    cweId: 'CWE-20',
    owaspCategory: 'A03:2021',
    remediation: 'Never use eval with user input. Validate and sanitize all inputs',
  },
  // Path Traversal
  {
    name: 'Path Traversal',
    pattern: /(?:readFile|readFileSync|createReadStream)\s*\(\s*(?:req\.body|req\.query|req\.params)/gi,
    severity: 'high' as const,
    rule: 'security.path_traversal',
    cweId: 'CWE-22',
    owaspCategory: 'A01:2021',
    remediation: 'Validate file paths and use path.resolve with allowed directories',
  },
];

/**
 * Validates code for security vulnerabilities
 */
export class SecurityValidator implements Validator {
  readonly name = 'security-validator';
  readonly description = 'Validates code for security vulnerabilities (OWASP)';

  appliesTo(context: ValidationContext, policy: Policy): boolean {
    return (
      !!policy.security?.owaspTop10 &&
      policy.security.owaspTop10.enforcement !== 'off'
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
        (f.endsWith('.ts') || f.endsWith('.js')) &&
        !f.includes('node_modules') &&
        !f.includes('.test.') &&
        !f.includes('.spec.')
    );

    for (const file of filesToCheck) {
      try {
        const content = await this.getFileContent(file, context);
        const fileViolations = this.scanContent(file, content, policy);
        violations.push(...fileViolations);
      } catch (error) {
        continue;
      }
    }

    return {
      validator: this.name,
      passed: violations.filter((v) => v.severity === 'critical' || v.severity === 'high').length === 0,
      violations,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Scan file content for security issues
   */
  private scanContent(
    filePath: string,
    content: string,
    policy: Policy
  ): Violation[] {
    const violations: Violation[] = [];
    const lines = content.split('\n');

    for (const securityDef of SECURITY_PATTERNS) {
      // Check if this OWASP category is enabled
      if (!this.isCheckEnabled(securityDef.owaspCategory, policy)) {
        continue;
      }

      securityDef.pattern.lastIndex = 0;
      let match;

      while ((match = securityDef.pattern.exec(content)) !== null) {
        const lineNum = this.getLineNumber(content, match.index);
        const line = lines[lineNum - 1];

        // Skip if in comment
        if (!line || this.isInComment(line)) {
          continue;
        }

        violations.push({
          rule: securityDef.rule,
          severity: securityDef.severity,
          message: `${securityDef.name} vulnerability detected`,
          location: {
            file: filePath,
            line: lineNum,
            snippet: line.trim().substring(0, 100),
          },
          remediation: securityDef.remediation,
          cweId: securityDef.cweId,
          owaspCategory: securityDef.owaspCategory,
          references: [
            `https://cwe.mitre.org/data/definitions/${securityDef.cweId.split('-')[1]}.html`,
            'https://owasp.org/Top10/',
          ],
        });
      }
    }

    return violations;
  }

  /**
   * Check if OWASP category is enabled in policy
   */
  private isCheckEnabled(owaspCategory: string, policy: Policy): boolean {
    if (!policy.security?.owaspTop10?.checks) {
      return true; // Default to enabled
    }

    // Map category to check name
    const categoryMap: Record<string, string> = {
      'A01:2021': 'A01_broken_access_control',
      'A02:2021': 'A02_cryptographic_failures',
      'A03:2021': 'A03_injection',
      'A05:2021': 'A05_security_misconfiguration',
      'A07:2021': 'A07_auth_failures',
      'A09:2021': 'A09_logging_failures',
    };

    const checkName = categoryMap[owaspCategory];
    if (!checkName) return true;

    const check = policy.security.owaspTop10.checks[checkName];
    return check?.enabled !== false;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, charIndex: number): number {
    return content.substring(0, charIndex).split('\n').length;
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
