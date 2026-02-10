/**
 * Variable Builder
 *
 * Provides a fluent API for constructing Terraform variable definitions.
 */

import { VariableDefinition, TerraformType, HCLValue, ValidationRule } from './types';
import { formatValue } from './HCLBuilder';

/**
 * Patterns that indicate a variable should be marked sensitive
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /api_key/i,
  /auth_token/i,
  /credential/i,
  /private_key/i,
];

/**
 * Builder for Terraform variables.tf file
 */
export class VariableBuilder {
  private variables: VariableDefinition[] = [];

  /**
   * Add a variable definition
   */
  add(
    name: string,
    config: {
      type: TerraformType;
      description: string;
      default?: HCLValue;
      sensitive?: boolean;
      validation?: ValidationRule[];
    }
  ): this {
    const sensitive = config.sensitive ?? this.shouldBeSensitive(name);

    this.variables.push({
      name,
      type: config.type,
      description: config.description,
      default: config.default,
      sensitive,
      validation: config.validation,
    });

    return this;
  }

  /**
   * Add a string variable
   */
  string(
    name: string,
    description: string,
    defaultValue?: string,
    sensitive?: boolean
  ): this {
    return this.add(name, {
      type: 'string',
      description,
      default: defaultValue,
      sensitive,
    });
  }

  /**
   * Add a number variable
   */
  number(
    name: string,
    description: string,
    defaultValue?: number,
    validation?: ValidationRule[]
  ): this {
    return this.add(name, {
      type: 'number',
      description,
      default: defaultValue,
      validation,
    });
  }

  /**
   * Add a boolean variable
   */
  bool(name: string, description: string, defaultValue?: boolean): this {
    return this.add(name, {
      type: 'bool',
      description,
      default: defaultValue,
    });
  }

  /**
   * Add a list(string) variable
   */
  listString(
    name: string,
    description: string,
    defaultValue?: string[]
  ): this {
    return this.add(name, {
      type: 'list(string)',
      description,
      default: defaultValue,
    });
  }

  /**
   * Add a map(string) variable
   */
  mapString(
    name: string,
    description: string,
    defaultValue?: Record<string, string>
  ): this {
    return this.add(name, {
      type: 'map(string)',
      description,
      default: defaultValue,
    });
  }

  /**
   * Add common_tags variable
   */
  commonTags(): this {
    return this.add('common_tags', {
      type: 'map(string)',
      description: 'Common tags to apply to all resources',
      default: {},
    });
  }

  /**
   * Add environment variable
   */
  environment(): this {
    return this.add('environment', {
      type: 'string',
      description: 'Deployment environment (dev, staging, prod)',
      validation: [
        {
          condition: 'contains(["dev", "staging", "prod"], var.environment)',
          errorMessage: 'Environment must be one of: dev, staging, prod',
        },
      ],
    });
  }

  /**
   * Check if all variables are present
   */
  hasVariable(name: string): boolean {
    return this.variables.some((v) => v.name === name);
  }

  /**
   * Get all variable definitions
   */
  getVariables(): VariableDefinition[] {
    return [...this.variables];
  }

  /**
   * Build the variables.tf content
   */
  toString(): string {
    if (this.variables.length === 0) {
      return '';
    }

    const blocks = this.variables.map((v) => this.formatVariable(v));
    return blocks.join('\n\n');
  }

  /**
   * Format a single variable block
   */
  private formatVariable(variable: VariableDefinition): string {
    const lines: string[] = [`variable "${variable.name}" {`];

    lines.push(`  description = ${JSON.stringify(variable.description)}`);
    lines.push(`  type        = ${variable.type}`);

    if (variable.default !== undefined) {
      const defaultStr = formatValue(variable.default, 2);
      // Handle multi-line defaults
      if (defaultStr.includes('\n')) {
        lines.push(`  default     = ${defaultStr}`);
      } else {
        lines.push(`  default     = ${defaultStr}`);
      }
    }

    if (variable.sensitive) {
      lines.push('  sensitive   = true');
    }

    if (variable.validation && variable.validation.length > 0) {
      for (const rule of variable.validation) {
        lines.push('');
        lines.push('  validation {');
        lines.push(`    condition     = ${rule.condition}`);
        lines.push(`    error_message = ${JSON.stringify(rule.errorMessage)}`);
        lines.push('  }');
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Check if a variable name indicates sensitive data
   */
  private shouldBeSensitive(name: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(name));
  }
}
