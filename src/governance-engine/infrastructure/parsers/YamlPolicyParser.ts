/**
 * YAML Policy Parser
 * @module @deltek/governance-engine/infrastructure/parsers/YamlPolicyParser
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Policy, RawPolicy, PrinciplePolicy, ComplexityLimit, EnforcementLevel } from '../../types/policy.types';
import { PolicyPath } from '../../domain/value-objects/PolicyPath';
import { PolicyEntity } from '../../domain/entities/Policy';
import { policySchema } from '../../config/schemas/policy-schema';

/**
 * Error thrown when policy parsing fails
 */
export class PolicyParseError extends Error {
  constructor(
    public readonly path: string,
    public readonly details: string,
    public readonly cause?: Error
  ) {
    super(`Failed to parse policy file: ${path}. ${details}`);
    this.name = 'PolicyParseError';
  }
}

/**
 * Error thrown when policy schema validation fails
 */
export class PolicySchemaError extends Error {
  constructor(
    public readonly path: string,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(
      `Policy schema validation failed: ${path}. ` +
        errors.map((e) => `${e.path}: ${e.message}`).join('; ')
    );
    this.name = 'PolicySchemaError';
  }
}

/**
 * Interface for policy parser
 */
export interface PolicyParser {
  parse(policyPath: string): Promise<PolicyEntity>;
  parseContent(content: string, sourcePath?: string): Promise<PolicyEntity>;
}

/**
 * YAML Policy Parser implementation
 *
 * Features:
 * - YAML 1.2 support
 * - JSON Schema validation
 * - Policy inheritance (extends)
 * - Environment variable substitution
 */
export class YamlPolicyParser implements PolicyParser {
  private readonly ajv: Ajv;
  private readonly validateSchema: ReturnType<Ajv['compile']>;
  private readonly cache: Map<string, PolicyEntity> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      useDefaults: true,
    });
    addFormats(this.ajv);
    this.validateSchema = this.ajv.compile(policySchema);
  }

  /**
   * Parse a policy file from path
   */
  async parse(policyPath: string): Promise<PolicyEntity> {
    const resolvedPath = PolicyPath.from(policyPath).toString();

    // Check cache
    if (this.cache.has(resolvedPath)) {
      return this.cache.get(resolvedPath)!;
    }

    try {
      // Read file
      const content = await fs.readFile(resolvedPath, 'utf-8');

      // Parse and validate
      const policy = await this.parseContent(content, resolvedPath);

      // Cache result
      this.cache.set(resolvedPath, policy);

      return policy;
    } catch (error) {
      if (error instanceof PolicyParseError || error instanceof PolicySchemaError) {
        throw error;
      }
      throw new PolicyParseError(
        resolvedPath,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse policy from string content
   */
  async parseContent(content: string, sourcePath?: string): Promise<PolicyEntity> {
    // Resolve environment variables
    const resolved = this.resolveEnvironmentVariables(content);

    // Parse YAML
    let parsed: RawPolicy;
    try {
      parsed = yaml.parse(resolved);
    } catch (error) {
      throw new PolicyParseError(
        sourcePath || 'inline',
        `Invalid YAML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate schema
    const valid = this.validateSchema(parsed);
    if (!valid && this.validateSchema.errors) {
      throw new PolicySchemaError(
        sourcePath || 'inline',
        this.validateSchema.errors.map((e) => ({
          path: e.instancePath || '/',
          message: e.message || 'Unknown validation error',
        }))
      );
    }

    // Handle inheritance
    let mergedPolicy = parsed;
    if (parsed.extends && parsed.extends.length > 0) {
      const parentPolicies = await this.loadParentPolicies(
        parsed.extends,
        sourcePath
      );
      mergedPolicy = this.mergePolicies(parentPolicies, parsed);
    }

    // Convert to domain entity
    return this.toDomainPolicy(mergedPolicy, sourcePath);
  }

  /**
   * Clear the parser cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Resolve environment variables in content
   * Supports ${VAR}, ${VAR:-default}, $VAR
   */
  private resolveEnvironmentVariables(content: string): string {
    // ${VAR:-default} syntax
    let resolved = content.replace(
      /\$\{([A-Z_][A-Z0-9_]*):-([^}]*)\}/gi,
      (_, name, defaultValue) => {
        return process.env[name] || defaultValue;
      }
    );

    // ${VAR} syntax
    resolved = resolved.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/gi, (_, name) => {
      const value = process.env[name];
      if (value === undefined) {
        console.warn(`Warning: Environment variable ${name} is not set`);
        return '';
      }
      return value;
    });

    // $VAR syntax (only for word boundaries)
    resolved = resolved.replace(
      /\$([A-Z_][A-Z0-9_]*)\b/gi,
      (_, name) => process.env[name] || ''
    );

    return resolved;
  }

  /**
   * Load parent policies for inheritance
   */
  private async loadParentPolicies(
    extends_: string[],
    childPath?: string
  ): Promise<RawPolicy[]> {
    const parents: RawPolicy[] = [];
    const baseDir = childPath ? path.dirname(childPath) : process.cwd();

    for (const parentPath of extends_) {
      const resolvedParent = path.isAbsolute(parentPath)
        ? parentPath
        : path.resolve(baseDir, parentPath);

      try {
        const parentContent = await fs.readFile(resolvedParent, 'utf-8');
        const parentResolved = this.resolveEnvironmentVariables(parentContent);
        const parentParsed = yaml.parse(parentResolved) as RawPolicy;

        // Recursively load grandparent policies
        if (parentParsed.extends && parentParsed.extends.length > 0) {
          const grandparents = await this.loadParentPolicies(
            parentParsed.extends,
            resolvedParent
          );
          parents.push(...grandparents);
        }

        parents.push(parentParsed);
      } catch (error) {
        throw new PolicyParseError(
          resolvedParent,
          `Failed to load parent policy: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return parents;
  }

  /**
   * Merge parent policies with child (child overrides parents)
   */
  private mergePolicies(parents: RawPolicy[], child: RawPolicy): RawPolicy {
    // Start with empty base
    let merged: RawPolicy = {
      version: '1.0.0',
      name: 'Merged Policy',
    };

    // Apply parents in order
    for (const parent of parents) {
      const mergedResult = this.deepMerge(merged, parent);
      if (typeof mergedResult === 'object' && mergedResult !== null && !Array.isArray(mergedResult)) {
        merged = mergedResult as RawPolicy;
      }
    }

    // Apply child (overrides)
    const finalResult = this.deepMerge(merged, child);
    if (typeof finalResult === 'object' && finalResult !== null && !Array.isArray(finalResult)) {
      merged = finalResult as RawPolicy;
    }

    // Remove extends from merged result
    delete merged.extends;

    return merged;
  }

  /**
   * Deep merge objects (target wins on conflicts)
   */
  private deepMerge(base: unknown, target: unknown): unknown {
    if (target === undefined) {
      return base;
    }

    if (base === undefined || base === null) {
      return target;
    }

    if (Array.isArray(target)) {
      // Arrays replace, don't merge
      return target;
    }

    if (typeof target === 'object' && typeof base === 'object') {
      const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
      for (const key of Object.keys(target as Record<string, unknown>)) {
        result[key] = this.deepMerge(
          (base as Record<string, unknown>)[key],
          (target as Record<string, unknown>)[key]
        );
      }
      return result;
    }

    return target;
  }

  /**
   * Convert raw policy to domain entity
   */
  private toDomainPolicy(raw: RawPolicy, sourcePath?: string): PolicyEntity {
    const id =
      raw.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
      sourcePath?.split('/').pop()?.replace('.yaml', '') ||
      'policy';

    return PolicyEntity.create({
      id,
      version: raw.version || '1.0.0',
      name: raw.name || 'Unnamed Policy',
      description: raw.description || '',
      effectiveDate: raw.effective_date
        ? new Date(raw.effective_date)
        : new Date(),
      lastUpdated: raw.last_updated ? new Date(raw.last_updated) : new Date(),
      owner: raw.owner,
      extends: raw.extends,
      repository: this.parseRepository(raw.repository),
      architecture: this.parseArchitecture(raw.architecture),
      codeQuality: this.parseCodeQuality(raw.code_quality),
      security: this.parseSecurity(raw.security),
      compliance: this.parseCompliance(raw.compliance),
      documentation: this.parseDocumentation(raw.documentation),
      enforcement: this.parseEnforcement(raw.enforcement),
      metadata: this.parseMetadata(raw.metadata),
    });
  }

  // Parser helper methods for each section
  private parseRepository(raw: unknown): Policy['repository'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      allowedOrganizations: (r.allowed_organizations as string[]) || [],
      naming: r.naming as Policy['repository']['naming'],
      branchNaming: {
        pattern:
          (r.branch_naming as Record<string, unknown>)?.pattern as string ||
          '.*',
        examples: (r.branch_naming as Record<string, unknown>)?.examples as string[],
        errorMessage:
          (r.branch_naming as Record<string, unknown>)?.error_message as string ||
          'Invalid branch name',
        exceptions: (r.branch_naming as Record<string, unknown>)?.exceptions as string[],
        enforcement:
          ((r.branch_naming as Record<string, unknown>)?.enforcement as string) as Policy['repository']['branchNaming']['enforcement'] ||
          'warn',
      },
      commitMessage: {
        pattern:
          (r.commit_message as Record<string, unknown>)?.pattern as string ||
          '.*',
        examples: (r.commit_message as Record<string, unknown>)?.examples as string[],
        errorMessage:
          (r.commit_message as Record<string, unknown>)?.error_message as string ||
          'Invalid commit message',
        types: (r.commit_message as Record<string, unknown>)?.types as Record<string, string>,
        enforcement:
          ((r.commit_message as Record<string, unknown>)?.enforcement as string) as Policy['repository']['commitMessage']['enforcement'] ||
          'warn',
      },
      pullRequests: this.parsePullRequests(r.pull_requests),
      protectedBranches: ((r.protected_branches as unknown[]) || []).map(
        (b) => this.parseProtectedBranch(b)
      ),
    };
  }

  private parsePullRequests(raw: unknown): Policy['repository']['pullRequests'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      requiredApprovals: (r.required_approvals as number) || 1,
      requiredReviewers: (r.required_reviewers as Policy['repository']['pullRequests']['requiredReviewers']) || [],
      requiredChecks: (r.required_checks as Policy['repository']['pullRequests']['requiredChecks']) || [],
      mergeStrategy: (r.merge_strategy as 'merge' | 'squash' | 'rebase') || 'squash',
      deleteBranchOnMerge: (r.delete_branch_on_merge as boolean) ?? true,
      requireLinearHistory: r.require_linear_history as boolean,
    };
  }

  private parseProtectedBranch(raw: unknown): Policy['repository']['protectedBranches'][0] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      name: (r.name as string) || 'main',
      enforceAdmins: (r.enforce_admins as boolean) ?? true,
      requireSignedCommits: r.require_signed_commits as boolean,
      requireStatusChecks: r.require_status_checks as boolean,
      requireUpToDate: r.require_up_to_date as boolean,
      dismissStaleReviews: r.dismiss_stale_reviews as boolean,
      allowedPushers: r.allowed_pushers as string[],
    };
  }

  private parseArchitecture(raw: unknown): Policy['architecture'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      mandatoryPattern: (r.mandatory_pattern as 'layered' | 'hexagonal' | 'clean') || 'layered',
      layers: this.parseLayers(r.layers),
      principles: this.parsePrinciples(r.principles),
      dry: r.dry as Policy['architecture']['dry'],
      yagni: r.yagni as Policy['architecture']['yagni'],
    };
  }

  private parseLayers(raw: unknown): Policy['architecture']['layers'] {
    const r = (raw || {}) as Record<string, unknown>;
    const layers: Policy['architecture']['layers'] = {};

    for (const [name, config] of Object.entries(r)) {
      const c = config as Record<string, unknown>;
      layers[name] = {
        directory: (c.directory as string) || `src/${name}`,
        responsibilities: (c.responsibilities as string[]) || [],
        allowedDependencies: (c.allowed_dependencies as string[]) || [],
        forbiddenDependencies: (c.forbidden_dependencies as string[]) || [],
        allowedImports: c.allowed_imports as string[],
        forbiddenImports: c.forbidden_imports as string[],
        notes: c.notes as string,
      };
    }

    return layers;
  }

  private parsePrinciples(raw: unknown): Policy['architecture']['principles'] {
    const r = (raw || {}) as Record<string, unknown>;
    const mapPrinciple = (p: unknown): PrinciplePolicy | undefined => {
      if (!p) return undefined;
      const pr = p as Record<string, unknown>;
      return {
        enforcement: ((pr.enforcement as string) || 'warn') as EnforcementLevel,
        violationsBlock: pr.violations_block as boolean,
        notes: pr.notes as string,
      };
    };

    return {
      singleResponsibility: mapPrinciple(r.single_responsibility),
      openClosed: mapPrinciple(r.open_closed),
      liskovSubstitution: mapPrinciple(r.liskov_substitution),
      interfaceSegregation: mapPrinciple(r.interface_segregation),
      dependencyInversion: mapPrinciple(r.dependency_inversion),
    };
  }

  private parseCodeQuality(raw: unknown): Policy['codeQuality'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      testCoverage: this.parseTestCoverage(r.test_coverage),
      linting: this.parseLinting(r.linting),
      typeSafety: this.parseTypeSafety(r.type_safety),
      complexity: this.parseComplexity(r.complexity),
      naming: this.parseNaming(r.naming),
      errorHandling: r.error_handling as Policy['codeQuality']['errorHandling'],
    };
  }

  private parseTestCoverage(raw: unknown): Policy['codeQuality']['testCoverage'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      minimumTotal: (r.minimum_total as number) || 80,
      byLayer: r.by_layer as Record<string, number>,
      enforcement: (r.enforcement as string) as Policy['codeQuality']['testCoverage']['enforcement'] || 'block',
      excludePatterns: r.exclude_patterns as string[],
    };
  }

  private parseLinting(raw: unknown): Policy['codeQuality']['linting'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      zeroWarnings: (r.zero_warnings as boolean) ?? true,
      zeroErrors: (r.zero_errors as boolean) ?? true,
      enforcement: (r.enforcement as string) as Policy['codeQuality']['linting']['enforcement'] || 'block',
      configs: r.configs as Record<string, string>,
    };
  }

  private parseTypeSafety(raw: unknown): Policy['codeQuality']['typeSafety'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      typescript: r.typescript as Policy['codeQuality']['typeSafety']['typescript'],
      enforcement: (r.enforcement as string) as Policy['codeQuality']['typeSafety']['enforcement'] || 'block',
    };
  }

  private parseComplexity(raw: unknown): Policy['codeQuality']['complexity'] {
    const r = (raw || {}) as Record<string, unknown>;
    const mapLimit = (l: unknown): ComplexityLimit | undefined => {
      if (!l) return undefined;
      const lr = l as Record<string, unknown>;
      return {
        max: (lr.max as number) || 10,
        enforcement: ((lr.enforcement as string) || 'warn') as EnforcementLevel,
      };
    };

    return {
      cyclomatic: mapLimit(r.cyclomatic),
      cognitive: mapLimit(r.cognitive),
      functionLength: mapLimit(r.function_length),
      fileLength: mapLimit(r.file_length),
      nestingDepth: mapLimit(r.nesting_depth),
    };
  }

  private parseNaming(raw: unknown): Policy['codeQuality']['naming'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      files: r.files as Policy['codeQuality']['naming']['files'],
      classes: r.classes as Policy['codeQuality']['naming']['classes'],
      functions: r.functions as Policy['codeQuality']['naming']['functions'],
      constants: r.constants as Policy['codeQuality']['naming']['constants'],
      interfaces: r.interfaces as Policy['codeQuality']['naming']['interfaces'],
      types: r.types as Policy['codeQuality']['naming']['types'],
      enforcement: (r.enforcement as string) as Policy['codeQuality']['naming']['enforcement'] || 'warn',
    };
  }

  private parseSecurity(raw: unknown): Policy['security'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      authentication: r.authentication as Policy['security']['authentication'] || { required: true },
      authorization: r.authorization as Policy['security']['authorization'] || {
        model: 'RBAC',
        requireOnAllEndpoints: true,
        defaultDeny: true,
      },
      encryption: r.encryption as Policy['security']['encryption'] || {},
      inputValidation: {
        required: true,
        validateOnBoundary: true,
        sanitizeOutput: true,
        enforcement: 'block' as const,
        ...(r.input_validation as object || {}),
      },
      sqlInjection: {
        parameterizedQueriesOnly: true,
        noStringConcatenation: true,
        enforcement: 'block' as const,
        ...(r.sql_injection as object || {}),
      },
      secrets: {
        noHardcoded: true,
        enforcement: 'block' as const,
        ...(r.secrets as object || {}),
      },
      dependencies: r.dependencies as Policy['security']['dependencies'] || {
        vulnerabilityScanning: true,
        scanFrequency: 'daily',
      },
      owaspTop10: r.owasp_top_10 as Policy['security']['owaspTop10'] || {
        enforcement: 'block' as const,
        checks: {},
      },
    };
  }

  private parseCompliance(raw: unknown): Policy['compliance'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      dcaa: r.dcaa as Policy['compliance']['dcaa'],
      sox: r.sox as Policy['compliance']['sox'],
      gdpr: r.gdpr as Policy['compliance']['gdpr'],
      hipaa: r.hipaa as Policy['compliance']['hipaa'],
      pciDss: r.pci_dss as Policy['compliance']['pciDss'],
    };
  }

  private parseDocumentation(raw: unknown): Policy['documentation'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      requiredFiles: r.required_files as Policy['documentation']['requiredFiles'],
      adr: r.adr as Policy['documentation']['adr'],
      codeDocumentation: r.code_documentation as Policy['documentation']['codeDocumentation'],
    };
  }

  private parseEnforcement(raw: unknown): Policy['enforcement'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      preGeneration: r.pre_generation as Policy['enforcement']['preGeneration'],
      duringGeneration: r.during_generation as Policy['enforcement']['duringGeneration'],
      postGeneration: r.post_generation as Policy['enforcement']['postGeneration'],
    };
  }

  private parseMetadata(raw: unknown): Policy['metadata'] {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      schemaVersion: (r.schema_version as string) || '1.0.0',
      testMode: r.test_mode as boolean,
      rollout: r.rollout as Policy['metadata']['rollout'],
      override: r.override as Policy['metadata']['override'],
    };
  }
}
