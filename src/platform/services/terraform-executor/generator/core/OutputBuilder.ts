/**
 * Output Builder
 *
 * Provides a fluent API for constructing Terraform output definitions.
 */

import { OutputDefinition } from './types';

/**
 * Builder for Terraform outputs.tf file
 */
export class OutputBuilder {
  private outputs: OutputDefinition[] = [];

  /**
   * Add an output definition
   */
  add(
    name: string,
    config: {
      description: string;
      value: string;
      sensitive?: boolean;
    }
  ): this {
    this.outputs.push({
      name,
      description: config.description,
      value: config.value,
      sensitive: config.sensitive,
    });
    return this;
  }

  /**
   * Add an ID output (common pattern)
   */
  id(resourceType: string, resourceName: string, description?: string): this {
    return this.add(`${resourceName}_id`, {
      description: description || `ID of the ${resourceType}`,
      value: `${resourceType}.${resourceName}.id`,
    });
  }

  /**
   * Add an ARN output (common pattern)
   */
  arn(resourceType: string, resourceName: string, description?: string): this {
    return this.add(`${resourceName}_arn`, {
      description: description || `ARN of the ${resourceType}`,
      value: `${resourceType}.${resourceName}.arn`,
    });
  }

  /**
   * Add a name output
   */
  name(resourceType: string, resourceName: string, nameAttr = 'name'): this {
    return this.add(`${resourceName}_name`, {
      description: `Name of the ${resourceType}`,
      value: `${resourceType}.${resourceName}.${nameAttr}`,
    });
  }

  /**
   * Check if output exists
   */
  hasOutput(name: string): boolean {
    return this.outputs.some((o) => o.name === name);
  }

  /**
   * Get all output definitions
   */
  getOutputs(): OutputDefinition[] {
    return [...this.outputs];
  }

  /**
   * Build the outputs.tf content
   */
  toString(): string {
    if (this.outputs.length === 0) {
      return '';
    }

    const blocks = this.outputs.map((o) => this.formatOutput(o));
    return blocks.join('\n\n');
  }

  /**
   * Format a single output block
   */
  private formatOutput(output: OutputDefinition): string {
    const lines: string[] = [`output "${output.name}" {`];

    lines.push(`  description = ${JSON.stringify(output.description)}`);
    lines.push(`  value       = ${output.value}`);

    if (output.sensitive) {
      lines.push('  sensitive   = true');
    }

    lines.push('}');
    return lines.join('\n');
  }
}
