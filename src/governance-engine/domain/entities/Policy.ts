/**
 * Policy domain entity
 * @module @vintiq/governance-engine/domain/entities/Policy
 */

import {
  Policy as PolicyType,
  RepositoryPolicy,
  ArchitecturePolicy,
  CodeQualityPolicy,
  SecurityPolicy,
  CompliancePolicy,
  DocumentationPolicy,
  EnforcementPolicy,
  PolicyMetadata,
  EnforcementLevel,
} from '../../types/policy.types';

/**
 * Policy domain entity representing governance rules
 */
export class PolicyEntity implements PolicyType {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly effectiveDate: Date;
  readonly lastUpdated: Date;
  readonly owner?: string;
  readonly extends?: string[];
  readonly repository: RepositoryPolicy;
  readonly architecture: ArchitecturePolicy;
  readonly codeQuality: CodeQualityPolicy;
  readonly security: SecurityPolicy;
  readonly compliance: CompliancePolicy;
  readonly documentation: DocumentationPolicy;
  readonly enforcement: EnforcementPolicy;
  readonly metadata: PolicyMetadata;

  private constructor(props: PolicyType) {
    this.id = props.id;
    this.version = props.version;
    this.name = props.name;
    this.description = props.description;
    this.effectiveDate = props.effectiveDate;
    this.lastUpdated = props.lastUpdated;
    this.owner = props.owner;
    this.extends = props.extends;
    this.repository = props.repository;
    this.architecture = props.architecture;
    this.codeQuality = props.codeQuality;
    this.security = props.security;
    this.compliance = props.compliance;
    this.documentation = props.documentation;
    this.enforcement = props.enforcement;
    this.metadata = props.metadata;
  }

  /**
   * Create a Policy entity from raw data
   */
  static create(props: PolicyType): PolicyEntity {
    return new PolicyEntity(props);
  }

  /**
   * Check if policy is currently effective
   */
  isEffective(): boolean {
    const now = new Date();
    return this.effectiveDate <= now;
  }

  /**
   * Check if a repository is allowed
   */
  isRepositoryAllowed(repoUrl: string): boolean {
    const allowed = this.repository.allowedOrganizations;
    return allowed.some((org) => repoUrl.includes(org));
  }

  /**
   * Check if branch name is valid
   */
  isBranchNameValid(branchName: string): { valid: boolean; message?: string } {
    const rule = this.repository.branchNaming;

    // Check exceptions first
    if (rule.exceptions?.includes(branchName)) {
      return { valid: true };
    }

    // Check pattern
    const regex = new RegExp(rule.pattern);
    if (!regex.test(branchName)) {
      return {
        valid: false,
        message: rule.errorMessage,
      };
    }

    return { valid: true };
  }

  /**
   * Check if commit message is valid
   */
  isCommitMessageValid(message: string): { valid: boolean; message?: string } {
    const rule = this.repository.commitMessage;
    const regex = new RegExp(rule.pattern);

    if (!regex.test(message)) {
      return {
        valid: false,
        message: rule.errorMessage,
      };
    }

    return { valid: true };
  }

  /**
   * Get minimum test coverage for a layer
   */
  getMinCoverage(layer?: string): number {
    if (layer && this.codeQuality.testCoverage.byLayer?.[layer]) {
      return this.codeQuality.testCoverage.byLayer[layer];
    }
    return this.codeQuality.testCoverage.minimumTotal;
  }

  /**
   * Get enforcement level for a rule
   */
  getEnforcementLevel(ruleCategory: string, ruleName: string): EnforcementLevel {
    // Navigate to the rule and return its enforcement level
    // Default to 'warn' if not found
    const paths: Record<string, () => EnforcementLevel | undefined> = {
      'repository.branchNaming': () => this.repository.branchNaming.enforcement,
      'repository.commitMessage': () => this.repository.commitMessage.enforcement,
      'codeQuality.testCoverage': () => this.codeQuality.testCoverage.enforcement,
      'codeQuality.linting': () => this.codeQuality.linting.enforcement,
      'codeQuality.typeSafety': () => this.codeQuality.typeSafety.enforcement,
      'security.inputValidation': () => this.security.inputValidation.enforcement,
      'security.sqlInjection': () => this.security.sqlInjection.enforcement,
      'security.secrets': () => this.security.secrets.enforcement,
      'security.owaspTop10': () => this.security.owaspTop10.enforcement,
    };

    const key = `${ruleCategory}.${ruleName}`;
    const getter = paths[key];

    if (getter) {
      return getter() || 'warn';
    }

    return 'warn';
  }

  /**
   * Check if layer dependency is allowed
   */
  isLayerDependencyAllowed(fromLayer: string, toLayer: string): boolean {
    const layerConfig = this.architecture.layers[fromLayer];
    if (!layerConfig) {
      return true; // Unknown layer, allow
    }

    // Check forbidden
    if (layerConfig.forbiddenDependencies.includes(toLayer)) {
      return false;
    }

    // Check allowed (if defined, must be in list)
    if (
      layerConfig.allowedDependencies.length > 0 &&
      !layerConfig.allowedDependencies.includes(toLayer)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get applicable compliance requirements
   */
  getApplicableCompliance(tags: string[]): string[] {
    const applicable: string[] = [];

    const complianceTypes = ['dcaa', 'sox', 'gdpr', 'hipaa', 'pciDss'] as const;

    for (const type of complianceTypes) {
      const req = this.compliance[type];
      if (req?.appliesTo?.tags?.some((t) => tags.includes(t))) {
        applicable.push(type);
      }
    }

    return applicable;
  }

  /**
   * Convert to plain object
   */
  toObject(): PolicyType {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      description: this.description,
      effectiveDate: this.effectiveDate,
      lastUpdated: this.lastUpdated,
      owner: this.owner,
      extends: this.extends,
      repository: this.repository,
      architecture: this.architecture,
      codeQuality: this.codeQuality,
      security: this.security,
      compliance: this.compliance,
      documentation: this.documentation,
      enforcement: this.enforcement,
      metadata: this.metadata,
    };
  }
}
