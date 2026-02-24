/**
 * Governance Service
 * @module @vintiq/governance-engine/application/services/GovernanceService
 */

import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Policy } from '../../types/policy.types';
import {
  ValidationContext,
  ValidationOptions,
  ValidationResult,
  ViolationSeverity,
} from '../../types/validation.types';
import {
  GovernanceResult,
  GovernanceSummary,
} from '../../types/enforcement.types';
import { PolicyEntity } from '../../domain/entities/Policy';
import { PolicyMerger } from '../../domain/services/PolicyMerger';
import { YamlPolicyParser } from '../../infrastructure/parsers/YamlPolicyParser';
import { ValidatorRegistry, createDefaultRegistry } from './ValidatorRegistry';
import { EnforcerEngine } from './EnforcerEngine';

const execAsync = promisify(exec);

/**
 * Default policy paths to search
 */
const DEFAULT_POLICY_PATHS = [
  '~/.claude/governance/policies/org/vintiq-engineering.yaml',
  '.governance/policy.yaml',
  'governance-policy.yaml',
];

/**
 * Main orchestration service for governance validation
 */
export class GovernanceService {
  private readonly policyParser: YamlPolicyParser;
  private readonly policyMerger: PolicyMerger;
  private readonly validatorRegistry: ValidatorRegistry;
  private readonly enforcerEngine: EnforcerEngine;

  constructor(validatorRegistry?: ValidatorRegistry) {
    this.policyParser = new YamlPolicyParser();
    this.policyMerger = new PolicyMerger();
    this.validatorRegistry = validatorRegistry || createDefaultRegistry();
    this.enforcerEngine = new EnforcerEngine();
  }

  /**
   * Run full governance validation
   */
  async validate(options: ValidationOptions): Promise<GovernanceResult> {
    const startTime = Date.now();

    // 1. Load and merge policies
    const policy = await this.loadPolicies(options.policyPaths);

    // 2. Build validation context
    const context = await this.buildContext(options);

    // 3. Run all validators
    const validatorResults = await this.validatorRegistry.validateAll(
      context,
      policy,
      {
        only: options.validators,
        skip: options.skipValidators,
      }
    );

    // 4. Aggregate violations
    const allViolations = validatorResults.flatMap((r) => r.violations);

    // 5. Enforce policies
    const enforcement = await this.enforcerEngine.enforce(
      allViolations,
      policy,
      {
        bypass: options.enforcement?.bypass
          ? {
              reason: options.enforcement.bypassReason || 'No reason provided',
              token: options.enforcement.bypassToken,
              requestedBy: context.user || 'anonymous',
            }
          : undefined,
        repository: context.repository,
        branch: context.branch,
        user: context.user,
        dryRun: options.enforcement?.dryRun,
        minBlockingSeverity: options.enforcement?.minBlockingSeverity,
      }
    );

    // 6. Generate summary
    const summary = this.generateSummary(
      validatorResults,
      context,
      Date.now() - startTime
    );

    return {
      passed: enforcement.allowed,
      violations: enforcement.violations,
      warnings: enforcement.warnings,
      bypassed: enforcement.bypassed,
      bypassDetails: enforcement.bypassed
        ? {
            requestedBy: context.user || 'anonymous',
            reason: options.enforcement?.bypassReason || '',
            violationsBypassed: enforcement.violations,
          }
        : undefined,
      duration: Date.now() - startTime,
      validatorResults,
      summary,
    };
  }

  /**
   * Load policies from paths
   */
  async loadPolicies(paths?: string[]): Promise<PolicyEntity> {
    const policyPaths = paths || DEFAULT_POLICY_PATHS;
    const loadedPolicies: PolicyEntity[] = [];

    for (const policyPath of policyPaths) {
      try {
        const policy = await this.policyParser.parse(policyPath);
        loadedPolicies.push(policy);
      } catch (error) {
        // Skip missing policies
        if (
          error instanceof Error &&
          !error.message.includes('ENOENT')
        ) {
          throw error;
        }
      }
    }

    if (loadedPolicies.length === 0) {
      throw new Error(
        `No policies found. Searched: ${policyPaths.join(', ')}`
      );
    }

    // Merge all loaded policies
    return this.policyMerger.merge(loadedPolicies);
  }

  /**
   * Build validation context from options
   */
  private async buildContext(
    options: ValidationOptions
  ): Promise<ValidationContext> {
    const workingDirectory = options.cwd || process.cwd();
    let files: string[] = [];
    let branch = 'unknown';
    let repository = 'unknown';

    // Get files to validate
    if (options.files && options.files.length > 0) {
      files = options.files;
    } else if (options.staged) {
      files = await this.getStagedFiles(workingDirectory);
    } else if (options.all) {
      files = await this.getAllFiles(workingDirectory);
    } else {
      // Default to staged files
      files = await this.getStagedFiles(workingDirectory);
      if (files.length === 0) {
        // Fall back to all tracked files
        files = await this.getAllFiles(workingDirectory);
      }
    }

    // Get git info
    try {
      const { stdout: branchOutput } = await execAsync(
        'git rev-parse --abbrev-ref HEAD',
        { cwd: workingDirectory }
      );
      branch = branchOutput.trim();
    } catch {
      // Not a git repo
    }

    try {
      const { stdout: remoteOutput } = await execAsync(
        'git remote get-url origin',
        { cwd: workingDirectory }
      );
      repository = remoteOutput.trim();
    } catch {
      // No remote
      repository = workingDirectory;
    }

    return {
      repository,
      branch,
      changedFiles: files,
      allFiles: options.all ? files : undefined,
      fileContents: options.fileContents,
      workingDirectory,
      user: process.env.USER || process.env.USERNAME,
      metadata: {},
    };
  }

  /**
   * Get staged files from git
   */
  private async getStagedFiles(cwd: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        'git diff --cached --name-only --diff-filter=ACMR',
        { cwd }
      );
      return stdout
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get all tracked files from git
   */
  private async getAllFiles(cwd: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git ls-files', { cwd });
      return stdout
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(
    results: ValidationResult[],
    context: ValidationContext,
    duration: number
  ): GovernanceSummary {
    const allViolations = results.flatMap((r) => r.violations);

    const violationsBySeverity: Record<ViolationSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const violationsByRule: Record<string, number> = {};

    for (const violation of allViolations) {
      violationsBySeverity[violation.severity]++;
      violationsByRule[violation.rule] =
        (violationsByRule[violation.rule] || 0) + 1;
    }

    const allWarnings = results.filter((r) => !r.passed && r.violations.length === 0);

    return {
      filesValidated: context.changedFiles.length,
      totalViolations: allViolations.length,
      violationsBySeverity,
      violationsByRule,
      totalWarnings: allWarnings.length,
      validatorsRun: results.filter((r) => !r.skipped).length,
      validatorsSkipped: results.filter((r) => r.skipped).length,
      totalDuration: duration,
    };
  }

  /**
   * Get registered validators
   */
  getValidators(): string[] {
    return this.validatorRegistry.getNames();
  }

  /**
   * Clear policy cache
   */
  clearCache(): void {
    this.policyParser.clearCache();
  }
}
