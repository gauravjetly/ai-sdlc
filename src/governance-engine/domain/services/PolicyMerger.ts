/**
 * Policy Merger Service
 * @module @vintiq/governance-engine/domain/services/PolicyMerger
 */

import { Policy } from '../../types/policy.types';
import { PolicyEntity } from '../entities/Policy';

/**
 * Service for merging multiple policies with inheritance
 */
export class PolicyMerger {
  /**
   * Merge multiple policies into one
   * Later policies override earlier ones
   */
  merge(policies: PolicyEntity[]): PolicyEntity {
    if (policies.length === 0) {
      throw new Error('At least one policy is required');
    }

    const firstPolicy = policies[0];
    if (!firstPolicy) {
      throw new Error('First policy is undefined');
    }

    if (policies.length === 1) {
      return firstPolicy;
    }

    let merged: Policy = firstPolicy.toObject();

    for (let i = 1; i < policies.length; i++) {
      const policy = policies[i];
      if (!policy) {
        throw new Error(`Policy at index ${i} is undefined`);
      }
      merged = this.deepMerge(merged, policy.toObject());
    }

    return PolicyEntity.create(merged);
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T>(base: T, override: T): T {
    if (override === undefined || override === null) {
      return base;
    }

    if (base === undefined || base === null) {
      return override;
    }

    if (Array.isArray(override)) {
      // Arrays replace entirely (don't merge)
      return override;
    }

    if (typeof override === 'object' && typeof base === 'object') {
      const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };

      for (const key of Object.keys(override as Record<string, unknown>)) {
        const baseValue = (base as Record<string, unknown>)[key];
        const overrideValue = (override as Record<string, unknown>)[key];
        result[key] = this.deepMerge(baseValue, overrideValue);
      }

      return result as T;
    }

    return override;
  }
}
