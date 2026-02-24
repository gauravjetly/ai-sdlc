/**
 * Severity value object
 * @module @vintiq/governance-engine/domain/value-objects/Severity
 */

import { ViolationSeverity } from '../../types/validation.types';

/**
 * Severity priority order (lower = more severe)
 */
const SEVERITY_PRIORITY: Record<ViolationSeverity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  info: 5,
};

/**
 * Severity value object with comparison and utility methods
 */
export class Severity {
  private constructor(private readonly value: ViolationSeverity) {
    if (!SEVERITY_PRIORITY[value]) {
      throw new Error(`Invalid severity: ${value}`);
    }
  }

  /**
   * Create a Severity from string value
   */
  static from(value: string): Severity {
    const normalized = value.toLowerCase() as ViolationSeverity;
    return new Severity(normalized);
  }

  /**
   * Create critical severity
   */
  static critical(): Severity {
    return new Severity('critical');
  }

  /**
   * Create high severity
   */
  static high(): Severity {
    return new Severity('high');
  }

  /**
   * Create medium severity
   */
  static medium(): Severity {
    return new Severity('medium');
  }

  /**
   * Create low severity
   */
  static low(): Severity {
    return new Severity('low');
  }

  /**
   * Create info severity
   */
  static info(): Severity {
    return new Severity('info');
  }

  /**
   * Get the string value
   */
  toString(): ViolationSeverity {
    return this.value;
  }

  /**
   * Get numeric priority (lower = more severe)
   */
  get priority(): number {
    return SEVERITY_PRIORITY[this.value];
  }

  /**
   * Check if this severity is more severe than another
   */
  isMoreSevereThan(other: Severity): boolean {
    return this.priority < other.priority;
  }

  /**
   * Check if this severity is at least as severe as another
   */
  isAtLeast(other: Severity): boolean {
    return this.priority <= other.priority;
  }

  /**
   * Check if this severity should block
   */
  shouldBlock(): boolean {
    return this.value === 'critical' || this.value === 'high';
  }

  /**
   * Check equality
   */
  equals(other: Severity): boolean {
    return this.value === other.value;
  }

  /**
   * Get display color for terminal output
   */
  getColor(): string {
    const colors: Record<ViolationSeverity, string> = {
      critical: '\x1b[31m', // Red
      high: '\x1b[91m', // Light red
      medium: '\x1b[33m', // Yellow
      low: '\x1b[36m', // Cyan
      info: '\x1b[90m', // Gray
    };
    return colors[this.value];
  }

  /**
   * Get display icon/emoji
   */
  getIcon(): string {
    const icons: Record<ViolationSeverity, string> = {
      critical: '[CRITICAL]',
      high: '[HIGH]',
      medium: '[MEDIUM]',
      low: '[LOW]',
      info: '[INFO]',
    };
    return icons[this.value];
  }
}
