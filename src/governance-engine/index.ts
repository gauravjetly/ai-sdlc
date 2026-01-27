/**
 * Governance Engine
 * @module @deltek/governance-engine
 *
 * Deltek Engineering Governance Policy Engine
 * Enforces coding standards, security policies, and architectural compliance
 *
 * @example
 * ```typescript
 * import { GovernanceService, GovernanceClient } from '@deltek/governance-engine';
 *
 * // CLI-style usage
 * const service = new GovernanceService();
 * const result = await service.validate({ staged: true });
 *
 * // Agent integration
 * const client = new GovernanceClient();
 * const policies = await client.getPromptInjection();
 * ```
 */

// Types
export * from './types/policy.types';
export * from './types/validation.types';
export * from './types/enforcement.types';

// Domain Entities
export { PolicyEntity } from './domain/entities/Policy';
export { ViolationEntity } from './domain/entities/Violation';

// Domain Value Objects
export { Severity } from './domain/value-objects/Severity';
export { PolicyPath } from './domain/value-objects/PolicyPath';

// Domain Services
export { PolicyMerger } from './domain/services/PolicyMerger';
export { RuleEvaluator } from './domain/services/RuleEvaluator';

// Infrastructure - Parsers
export {
  YamlPolicyParser,
  PolicyParseError,
  PolicySchemaError,
  type PolicyParser,
} from './infrastructure/parsers/YamlPolicyParser';

// Infrastructure - Validators
export {
  RepositoryValidator,
  ArchitectureValidator,
  SecretValidator,
  SecurityValidator,
  CoverageValidator,
  StyleValidator,
} from './infrastructure/validators';

// Application Services
export { GovernanceService } from './application/services/GovernanceService';
export {
  ValidatorRegistry,
  createDefaultRegistry,
} from './application/services/ValidatorRegistry';
export { EnforcerEngine } from './application/services/EnforcerEngine';

// SDK
export {
  GovernanceClient,
  createGovernanceClient,
  type AgentOutput,
  type PolicySummary,
} from './presentation/sdk/GovernanceClient';

// CLI Formatter (for custom CLI tools)
export { CliFormatter } from './presentation/cli/formatters/CliFormatter';

/**
 * Quick validation helper
 */
export async function validate(options?: {
  files?: string[];
  staged?: boolean;
  all?: boolean;
  policyPaths?: string[];
}): Promise<import('./types/enforcement.types').GovernanceResult> {
  const { GovernanceService } = await import('./application/services/GovernanceService');
  const service = new GovernanceService();
  return service.validate(options || { staged: true });
}

/**
 * Quick policy check helper
 */
export async function checkPolicy(repoUrl: string): Promise<boolean> {
  const { GovernanceClient } = await import('./presentation/sdk/GovernanceClient');
  const client = new GovernanceClient();
  return client.isRepositoryAllowed(repoUrl);
}
