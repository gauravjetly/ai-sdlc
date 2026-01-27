/**
 * Policy Repository Interface
 * @module @deltek/governance-engine/domain/repositories/PolicyRepository
 */

import { PolicyEntity } from '../entities/Policy';

/**
 * Repository interface for policy storage and retrieval
 */
export interface PolicyRepository {
  /**
   * Load a policy from path
   */
  load(path: string): Promise<PolicyEntity>;

  /**
   * Load multiple policies
   */
  loadAll(paths: string[]): Promise<PolicyEntity[]>;

  /**
   * Check if policy exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get default policy paths
   */
  getDefaultPaths(): string[];

  /**
   * Clear any cached policies
   */
  clearCache(): void;
}
