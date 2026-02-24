/**
 * Repository Validator
 * @module @vintiq/governance-engine/infrastructure/validators/RepositoryValidator
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Policy } from '../../types/policy.types';
import {
  Validator,
  ValidationContext,
  ValidationResult,
  Violation,
} from '../../types/validation.types';

const execAsync = promisify(exec);

/**
 * Validates repository policies including allowed organizations,
 * branch naming, and commit message format
 */
export class RepositoryValidator implements Validator {
  readonly name = 'repository-validator';
  readonly description = 'Validates repository policies';

  appliesTo(context: ValidationContext, policy: Policy): boolean {
    return (
      !!policy.repository &&
      (policy.repository.allowedOrganizations.length > 0 ||
        !!policy.repository.branchNaming ||
        !!policy.repository.commitMessage)
    );
  }

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];

    // Check allowed organizations
    if (policy.repository.allowedOrganizations.length > 0) {
      const repoViolation = this.checkAllowedOrganizations(
        context.repository,
        policy.repository.allowedOrganizations
      );
      if (repoViolation) {
        violations.push(repoViolation);
      }
    }

    // Check branch naming
    if (policy.repository.branchNaming) {
      const branchViolation = this.checkBranchNaming(
        context.branch,
        policy.repository.branchNaming.pattern,
        policy.repository.branchNaming.exceptions || [],
        policy.repository.branchNaming.errorMessage
      );
      if (branchViolation) {
        violations.push(branchViolation);
      }
    }

    // Check commit message (if we can get it)
    if (policy.repository.commitMessage && context.metadata?.commitMessage) {
      const commitViolation = this.checkCommitMessage(
        context.metadata.commitMessage as string,
        policy.repository.commitMessage.pattern,
        policy.repository.commitMessage.errorMessage
      );
      if (commitViolation) {
        violations.push(commitViolation);
      }
    }

    return {
      validator: this.name,
      passed: violations.length === 0,
      violations,
      duration: Date.now() - startTime,
    };
  }

  private checkAllowedOrganizations(
    repoUrl: string,
    allowedOrgs: string[]
  ): Violation | null {
    const isAllowed = allowedOrgs.some((org) => repoUrl.includes(org));

    if (!isAllowed) {
      return {
        rule: 'repository.allowed_organizations',
        severity: 'critical',
        message: `Repository "${repoUrl}" is not in the allowed organizations`,
        remediation: `Use a repository from one of these organizations: ${allowedOrgs.join(', ')}`,
        references: ['docs/sdlc/architecture/governance-policy-template.yaml'],
      };
    }

    return null;
  }

  private checkBranchNaming(
    branch: string,
    pattern: string,
    exceptions: string[],
    errorMessage: string
  ): Violation | null {
    // Check exceptions first
    if (exceptions.includes(branch)) {
      return null;
    }

    // Check pattern match for wildcard exceptions
    for (const exception of exceptions) {
      if (exception.includes('*')) {
        const regexPattern = exception.replace(/\*/g, '.*');
        if (new RegExp(`^${regexPattern}$`).test(branch)) {
          return null;
        }
      }
    }

    // Check main pattern
    const regex = new RegExp(pattern);
    if (!regex.test(branch)) {
      return {
        rule: 'repository.branch_naming',
        severity: 'medium',
        message: `Branch name "${branch}" does not follow naming convention`,
        remediation: errorMessage || `Branch must match pattern: ${pattern}`,
        details: {
          branch,
          pattern,
          examples: [
            'feature/JIRA-123-add-oauth-support',
            'bugfix/JIRA-456-fix-null-pointer',
          ],
        },
      };
    }

    return null;
  }

  private checkCommitMessage(
    message: string,
    pattern: string,
    errorMessage: string
  ): Violation | null {
    const regex = new RegExp(pattern);
    if (!regex.test(message)) {
      return {
        rule: 'repository.commit_message',
        severity: 'low',
        message: `Commit message does not follow convention`,
        remediation: errorMessage || `Commit message must match pattern: ${pattern}`,
        details: {
          message,
          pattern,
          examples: [
            'feat(auth): implement OAuth 2.0 with PKCE',
            'fix(security): remediate SQL injection vulnerability',
          ],
        },
      };
    }

    return null;
  }

  /**
   * Get current branch name from git
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get repository remote URL
   */
  async getRemoteUrl(): Promise<string> {
    try {
      const { stdout } = await execAsync('git remote get-url origin');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }
}
