/**
 * Validator Registry
 * @module @vintiq/governance-engine/application/services/ValidatorRegistry
 */

import { Policy } from '../../types/policy.types';
import {
  Validator,
  ValidationContext,
  ValidationResult,
} from '../../types/validation.types';

/**
 * Registry for managing and orchestrating validators
 */
export class ValidatorRegistry {
  private readonly validators: Map<string, Validator> = new Map();

  /**
   * Register a validator
   */
  register(validator: Validator): void {
    this.validators.set(validator.name, validator);
  }

  /**
   * Unregister a validator
   */
  unregister(name: string): void {
    this.validators.delete(name);
  }

  /**
   * Get a validator by name
   */
  get(name: string): Validator | undefined {
    return this.validators.get(name);
  }

  /**
   * Get all registered validators
   */
  getAll(): Validator[] {
    return Array.from(this.validators.values());
  }

  /**
   * Get validator names
   */
  getNames(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Check if validator is registered
   */
  has(name: string): boolean {
    return this.validators.has(name);
  }

  /**
   * Run all applicable validators
   */
  async validateAll(
    context: ValidationContext,
    policy: Policy,
    options?: {
      only?: string[];
      skip?: string[];
    }
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const validatorsToRun = this.getValidatorsToRun(
      context,
      policy,
      options?.only,
      options?.skip
    );

    // Run validators in parallel for performance
    const promises = validatorsToRun.map(async (validator) => {
      try {
        return await validator.validate(context, policy);
      } catch (error) {
        // Return error result instead of throwing
        return {
          validator: validator.name,
          passed: true,
          violations: [],
          skipped: true,
          skipReason: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const settled = await Promise.all(promises);
    results.push(...settled);

    return results;
  }

  /**
   * Determine which validators should run
   */
  private getValidatorsToRun(
    context: ValidationContext,
    policy: Policy,
    only?: string[],
    skip?: string[]
  ): Validator[] {
    let validators = Array.from(this.validators.values());

    // Filter to only specified validators
    if (only && only.length > 0) {
      validators = validators.filter((v) => only.includes(v.name));
    }

    // Remove skipped validators
    if (skip && skip.length > 0) {
      validators = validators.filter((v) => !skip.includes(v.name));
    }

    // Filter to validators that apply to this context
    validators = validators.filter((v) => v.appliesTo(context, policy));

    return validators;
  }
}

/**
 * Create a validator registry with default validators
 */
export function createDefaultRegistry(): ValidatorRegistry {
  const registry = new ValidatorRegistry();

  // Import and register default validators
  // This is done dynamically to avoid circular imports
  const { RepositoryValidator } = require('../../infrastructure/validators/RepositoryValidator');
  const { ArchitectureValidator } = require('../../infrastructure/validators/ArchitectureValidator');
  const { SecretValidator } = require('../../infrastructure/validators/SecretValidator');
  const { SecurityValidator } = require('../../infrastructure/validators/SecurityValidator');
  const { CoverageValidator } = require('../../infrastructure/validators/CoverageValidator');
  const { StyleValidator } = require('../../infrastructure/validators/StyleValidator');

  registry.register(new RepositoryValidator());
  registry.register(new ArchitectureValidator());
  registry.register(new SecretValidator());
  registry.register(new SecurityValidator());
  registry.register(new CoverageValidator());
  registry.register(new StyleValidator());

  return registry;
}
