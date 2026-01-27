/**
 * Violation Repository Interface
 * @module @deltek/governance-engine/domain/repositories/ViolationRepository
 */

import { Violation } from '../../types/validation.types';
import { AuditLogEntry } from '../../types/enforcement.types';

/**
 * Repository interface for violation storage
 */
export interface ViolationRepository {
  /**
   * Save violations to audit log
   */
  save(entry: AuditLogEntry): Promise<void>;

  /**
   * Get violations for a project
   */
  getByProject(projectId: string, limit?: number): Promise<AuditLogEntry[]>;

  /**
   * Get violations by severity
   */
  getBySeverity(severity: string, limit?: number): Promise<AuditLogEntry[]>;

  /**
   * Get recent violations
   */
  getRecent(limit?: number): Promise<AuditLogEntry[]>;

  /**
   * Get statistics
   */
  getStatistics(projectId?: string): Promise<ViolationStatistics>;
}

/**
 * Violation statistics
 */
export interface ViolationStatistics {
  totalViolations: number;
  bySeverity: Record<string, number>;
  byRule: Record<string, number>;
  byProject: Record<string, number>;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}
