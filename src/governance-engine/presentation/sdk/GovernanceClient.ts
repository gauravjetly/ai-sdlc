/**
 * Governance Client SDK
 * @module @deltek/governance-engine/sdk/GovernanceClient
 *
 * SDK for integrating governance validation into agent workflows
 */

import { GovernanceService } from '../../application/services/GovernanceService';
import { PolicyEntity } from '../../domain/entities/Policy';
import { Policy } from '../../types/policy.types';
import {
  ValidationOptions,
  ValidationResult,
  FileContent,
} from '../../types/validation.types';
import { GovernanceResult } from '../../types/enforcement.types';

/**
 * Agent output structure
 */
export interface AgentOutput {
  agentType: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Policy summary for agents
 */
export interface PolicySummary {
  security: string[];
  architecture: string[];
  quality: string[];
  compliance: string[];
}

/**
 * SDK client for governance integration
 */
export class GovernanceClient {
  private readonly service: GovernanceService;
  private cachedPolicy: PolicyEntity | null = null;

  constructor() {
    this.service = new GovernanceService();
  }

  /**
   * Validate agent output before committing
   */
  async validateOutput(output: AgentOutput): Promise<GovernanceResult> {
    const fileContents: FileContent[] = output.files.map((f) => ({
      path: f.path,
      content: f.content,
    }));

    return this.service.validate({
      files: output.files.map((f) => f.path),
      fileContents,
    });
  }

  /**
   * Validate specific files
   */
  async validateFiles(files: string[]): Promise<GovernanceResult> {
    return this.service.validate({ files });
  }

  /**
   * Run pre-commit validation
   */
  async validatePreCommit(): Promise<GovernanceResult> {
    return this.service.validate({ staged: true });
  }

  /**
   * Run full validation
   */
  async validateAll(): Promise<GovernanceResult> {
    return this.service.validate({ all: true });
  }

  /**
   * Get active policies for context injection
   */
  async getActivePolicies(): Promise<PolicySummary> {
    const policy = await this.loadPolicy();
    return this.summarizePolicies(policy);
  }

  /**
   * Get prompt injection text for agent context
   */
  async getPromptInjection(): Promise<string> {
    const policies = await this.getActivePolicies();
    return this.formatPromptInjection(policies);
  }

  /**
   * Check if specific file pattern is allowed
   */
  async isFileAllowed(filePath: string): Promise<boolean> {
    const policy = await this.loadPolicy();
    // Check if file is in an allowed location based on architecture
    const layers = Object.keys(policy.architecture.layers);
    return layers.some((layer) => {
      const layerConfig = policy.architecture.layers[layer];
      return layerConfig && filePath.includes(layerConfig.directory);
    });
  }

  /**
   * Check if repository is allowed
   */
  async isRepositoryAllowed(repoUrl: string): Promise<boolean> {
    const policy = await this.loadPolicy();
    return policy.isRepositoryAllowed(repoUrl);
  }

  /**
   * Get layer for file path
   */
  async getFileLayer(filePath: string): Promise<string | null> {
    const policy = await this.loadPolicy();
    const layers = policy.architecture.layers;

    for (const [layerName, config] of Object.entries(layers)) {
      if (filePath.includes(config.directory)) {
        return layerName;
      }
    }

    return null;
  }

  /**
   * Get layer dependencies
   */
  async getLayerDependencies(layer: string): Promise<{
    allowed: string[];
    forbidden: string[];
  }> {
    const policy = await this.loadPolicy();
    const layerConfig = policy.architecture.layers[layer];

    if (!layerConfig) {
      return { allowed: [], forbidden: [] };
    }

    return {
      allowed: layerConfig.allowedDependencies,
      forbidden: layerConfig.forbiddenDependencies,
    };
  }

  /**
   * Clear policy cache
   */
  clearCache(): void {
    this.cachedPolicy = null;
    this.service.clearCache();
  }

  /**
   * Load and cache policy
   */
  private async loadPolicy(): Promise<PolicyEntity> {
    if (!this.cachedPolicy) {
      this.cachedPolicy = await this.service.loadPolicies();
    }
    return this.cachedPolicy;
  }

  /**
   * Summarize policies for agent context
   */
  private summarizePolicies(policy: PolicyEntity): PolicySummary {
    return {
      security: this.summarizeSecurityPolicies(policy),
      architecture: this.summarizeArchitecturePolicies(policy),
      quality: this.summarizeQualityPolicies(policy),
      compliance: this.summarizeCompliancePolicies(policy),
    };
  }

  /**
   * Summarize security policies
   */
  private summarizeSecurityPolicies(policy: PolicyEntity): string[] {
    const rules: string[] = [];

    if (policy.security.secrets.noHardcoded) {
      rules.push('No hardcoded secrets - use environment variables');
    }

    if (policy.security.sqlInjection.parameterizedQueriesOnly) {
      rules.push('Use parameterized queries only - no string concatenation');
    }

    if (policy.security.inputValidation.required) {
      rules.push('Validate all inputs at system boundaries');
    }

    if (policy.security.encryption.inTransit?.required) {
      rules.push(`TLS ${policy.security.encryption.inTransit.minimumTls}+ required`);
    }

    return rules;
  }

  /**
   * Summarize architecture policies
   */
  private summarizeArchitecturePolicies(policy: PolicyEntity): string[] {
    const rules: string[] = [];

    rules.push(`Architecture pattern: ${policy.architecture.mandatoryPattern}`);

    const layers = Object.keys(policy.architecture.layers);
    rules.push(`Layers: ${layers.join(', ')}`);

    // Domain purity rule
    const domainLayer = policy.architecture.layers['domain'];
    if (domainLayer?.forbiddenDependencies?.length) {
      rules.push('Domain layer must have NO external dependencies');
    }

    return rules;
  }

  /**
   * Summarize quality policies
   */
  private summarizeQualityPolicies(policy: PolicyEntity): string[] {
    const rules: string[] = [];

    rules.push(`Minimum test coverage: ${policy.codeQuality.testCoverage.minimumTotal}%`);

    if (policy.codeQuality.linting.zeroErrors) {
      rules.push('Zero linting errors required');
    }

    if (policy.codeQuality.typeSafety.typescript?.strictMode) {
      rules.push('TypeScript strict mode required');
    }

    return rules;
  }

  /**
   * Summarize compliance policies
   */
  private summarizeCompliancePolicies(policy: PolicyEntity): string[] {
    const rules: string[] = [];

    if (policy.compliance.gdpr) {
      rules.push('GDPR compliance required for EU data');
    }

    if (policy.compliance.sox) {
      rules.push('SOX compliance required for financial operations');
    }

    if (policy.compliance.hipaa) {
      rules.push('HIPAA compliance required for PHI');
    }

    return rules;
  }

  /**
   * Format policies for prompt injection
   */
  private formatPromptInjection(policies: PolicySummary): string {
    const lines: string[] = [];

    lines.push('## ACTIVE GOVERNANCE POLICIES');
    lines.push('');
    lines.push('**WARNING**: Code that violates these policies will be BLOCKED.');
    lines.push('');

    lines.push('### Security Constraints');
    for (const rule of policies.security) {
      lines.push(`- ${rule}`);
    }
    lines.push('');

    lines.push('### Architecture Requirements');
    for (const rule of policies.architecture) {
      lines.push(`- ${rule}`);
    }
    lines.push('');

    lines.push('### Quality Gates');
    for (const rule of policies.quality) {
      lines.push(`- ${rule}`);
    }
    lines.push('');

    if (policies.compliance.length > 0) {
      lines.push('### Compliance Requirements');
      for (const rule of policies.compliance) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Create a new governance client instance
 */
export function createGovernanceClient(): GovernanceClient {
  return new GovernanceClient();
}
