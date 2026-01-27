/**
 * Violation domain entity
 * @module @deltek/governance-engine/domain/entities/Violation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Violation as ViolationType,
  ViolationSeverity,
  CodeLocation,
  AutoFix,
} from '../../types/validation.types';
import { Severity } from '../value-objects/Severity';

/**
 * Violation domain entity representing a policy violation
 */
export class ViolationEntity implements ViolationType {
  readonly id: string;
  readonly rule: string;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly location?: CodeLocation;
  readonly remediation?: string;
  readonly autoFix?: AutoFix;
  readonly references?: string[];
  readonly cweId?: string;
  readonly owaspCategory?: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;

  private constructor(props: ViolationType & { timestamp?: Date }) {
    this.id = props.id || uuidv4();
    this.rule = props.rule;
    this.severity = props.severity;
    this.message = props.message;
    this.location = props.location;
    this.remediation = props.remediation;
    this.autoFix = props.autoFix;
    this.references = props.references;
    this.cweId = props.cweId;
    this.owaspCategory = props.owaspCategory;
    this.details = props.details;
    this.timestamp = props.timestamp || new Date();
  }

  /**
   * Create a new Violation
   */
  static create(props: Omit<ViolationType, 'id'>): ViolationEntity {
    return new ViolationEntity(props);
  }

  /**
   * Create a critical violation
   */
  static critical(
    rule: string,
    message: string,
    options?: Partial<ViolationType>
  ): ViolationEntity {
    return new ViolationEntity({
      rule,
      message,
      severity: 'critical',
      ...options,
    });
  }

  /**
   * Create a high severity violation
   */
  static high(
    rule: string,
    message: string,
    options?: Partial<ViolationType>
  ): ViolationEntity {
    return new ViolationEntity({
      rule,
      message,
      severity: 'high',
      ...options,
    });
  }

  /**
   * Create a medium severity violation
   */
  static medium(
    rule: string,
    message: string,
    options?: Partial<ViolationType>
  ): ViolationEntity {
    return new ViolationEntity({
      rule,
      message,
      severity: 'medium',
      ...options,
    });
  }

  /**
   * Create a low severity violation
   */
  static low(
    rule: string,
    message: string,
    options?: Partial<ViolationType>
  ): ViolationEntity {
    return new ViolationEntity({
      rule,
      message,
      severity: 'low',
      ...options,
    });
  }

  /**
   * Get severity as value object
   */
  getSeverity(): Severity {
    return Severity.from(this.severity);
  }

  /**
   * Check if this violation should block
   */
  shouldBlock(): boolean {
    return this.getSeverity().shouldBlock();
  }

  /**
   * Check if auto-fix is available
   */
  hasAutoFix(): boolean {
    return this.autoFix?.available === true;
  }

  /**
   * Check if auto-fix is safe to apply
   */
  isAutoFixSafe(): boolean {
    return this.autoFix?.safe === true;
  }

  /**
   * Format for display
   */
  format(options?: { color?: boolean; verbose?: boolean }): string {
    const severity = this.getSeverity();
    const color = options?.color ? severity.getColor() : '';
    const reset = options?.color ? '\x1b[0m' : '';

    let output = `${color}${severity.getIcon()}${reset} ${this.rule}: ${this.message}`;

    if (this.location) {
      output += `\n  at ${this.location.file}:${this.location.line}`;
      if (this.location.column) {
        output += `:${this.location.column}`;
      }
    }

    if (options?.verbose) {
      if (this.remediation) {
        output += `\n  Fix: ${this.remediation}`;
      }
      if (this.cweId) {
        output += `\n  CWE: ${this.cweId}`;
      }
      if (this.references?.length) {
        output += `\n  Refs: ${this.references.join(', ')}`;
      }
    }

    return output;
  }

  /**
   * Convert to plain object
   */
  toObject(): ViolationType {
    return {
      id: this.id,
      rule: this.rule,
      severity: this.severity,
      message: this.message,
      location: this.location,
      remediation: this.remediation,
      autoFix: this.autoFix,
      references: this.references,
      cweId: this.cweId,
      owaspCategory: this.owaspCategory,
      details: this.details,
    };
  }

  /**
   * Convert to audit format
   */
  toAudit(): {
    rule: string;
    severity: ViolationSeverity;
    message: string;
    file?: string;
    line?: number;
  } {
    return {
      rule: this.rule,
      severity: this.severity,
      message: this.message,
      file: this.location?.file,
      line: this.location?.line,
    };
  }
}
