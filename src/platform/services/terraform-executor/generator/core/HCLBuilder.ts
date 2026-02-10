/**
 * HCL Builder
 *
 * Provides a fluent API for constructing HCL (HashiCorp Configuration Language)
 * code blocks. Ensures proper formatting and syntax.
 */

import {
  HCLValue,
  HCLExpression,
  isHCLExpression,
  DynamicBlockConfig,
  LifecycleConfig,
  hclExpr,
} from './types';

/**
 * Main HCL Builder class
 * Entry point for constructing HCL code
 */
export class HCLBuilder {
  private blocks: string[] = [];

  /**
   * Create a resource block
   */
  resource(type: string, name: string): ResourceBuilder {
    const builder = new ResourceBuilder(type, name);
    this.blocks.push(''); // Placeholder, will be replaced
    const index = this.blocks.length - 1;
    builder.onBuild = (content) => {
      this.blocks[index] = content;
    };
    return builder;
  }

  /**
   * Create a data source block
   */
  data(type: string, name: string): DataSourceBuilder {
    const builder = new DataSourceBuilder(type, name);
    this.blocks.push('');
    const index = this.blocks.length - 1;
    builder.onBuild = (content) => {
      this.blocks[index] = content;
    };
    return builder;
  }

  /**
   * Create a locals block
   */
  locals(): LocalsBuilder {
    const builder = new LocalsBuilder();
    this.blocks.push('');
    const index = this.blocks.length - 1;
    builder.onBuild = (content) => {
      this.blocks[index] = content;
    };
    return builder;
  }

  /**
   * Add raw HCL content
   */
  raw(content: string): this {
    this.blocks.push(content);
    return this;
  }

  /**
   * Build the final HCL string
   */
  toString(): string {
    return this.blocks.filter((b) => b.length > 0).join('\n\n');
  }
}

/**
 * Base builder for HCL blocks with attributes
 */
abstract class BlockBuilderBase {
  protected attributes: Map<string, HCLValue> = new Map();
  protected nestedBlocks: string[] = [];
  public onBuild?: (content: string) => void;

  /**
   * Add an attribute
   */
  attribute(name: string, value: HCLValue): this {
    if (value !== undefined && value !== null) {
      this.attributes.set(name, value);
    }
    return this;
  }

  /**
   * Add a nested block
   */
  block(name: string, builderFn: (b: NestedBlockBuilder) => void): this {
    const builder = new NestedBlockBuilder(name);
    builderFn(builder);
    this.nestedBlocks.push(builder.build());
    return this;
  }

  /**
   * Add tags attribute with merge
   */
  tags(tags: Record<string, string>, merge = true): this {
    if (Object.keys(tags).length === 0) {
      return this;
    }

    if (merge) {
      const tagPairs = Object.entries(tags)
        .map(([k, v]) => `    ${formatKey(k)} = ${formatValue(v)}`)
        .join('\n');
      this.attributes.set(
        'tags',
        hclExpr(`merge(var.common_tags, {\n${tagPairs}\n  })`)
      );
    } else {
      this.attributes.set('tags', tags);
    }
    return this;
  }

  /**
   * Format attribute value for HCL output
   */
  protected formatAttribute(name: string, value: HCLValue): string {
    return `  ${formatKey(name)} = ${formatValue(value)}`;
  }

  /**
   * Build attributes section
   */
  protected buildAttributes(): string[] {
    const lines: string[] = [];
    for (const [name, value] of this.attributes) {
      lines.push(this.formatAttribute(name, value));
    }
    return lines;
  }
}

/**
 * Builder for resource blocks
 */
export class ResourceBuilder extends BlockBuilderBase {
  private dynamicBlocks: string[] = [];
  private lifecycleBlock?: string;
  private dependsOnList: string[] = [];
  private countExpr?: string;
  private forEachExpr?: string;

  constructor(
    private type: string,
    private name: string
  ) {
    super();
  }

  /**
   * Add a dynamic block
   */
  dynamicBlock(name: string, config: DynamicBlockConfig): this {
    const iterator = config.iterator || name;
    const content = config.content(iterator);
    const contentLines = Object.entries(content)
      .map(([k, v]) => `      ${formatKey(k)} = ${formatValue(v)}`)
      .join('\n');

    this.dynamicBlocks.push(`  dynamic "${name}" {
    for_each = ${config.forEach}
    iterator = ${iterator}
    content {
${contentLines}
    }
  }`);
    return this;
  }

  /**
   * Add lifecycle block
   */
  lifecycle(config: LifecycleConfig): this {
    const lines: string[] = ['  lifecycle {'];

    if (config.createBeforeDestroy !== undefined) {
      lines.push(`    create_before_destroy = ${config.createBeforeDestroy}`);
    }
    if (config.preventDestroy !== undefined) {
      lines.push(`    prevent_destroy = ${config.preventDestroy}`);
    }
    if (config.ignoreChanges !== undefined) {
      if (config.ignoreChanges === 'all') {
        lines.push('    ignore_changes = all');
      } else {
        lines.push(
          `    ignore_changes = [\n      ${config.ignoreChanges.join(',\n      ')}\n    ]`
        );
      }
    }
    if (config.replaceTriggeredBy !== undefined) {
      lines.push(
        `    replace_triggered_by = [\n      ${config.replaceTriggeredBy.join(',\n      ')}\n    ]`
      );
    }

    lines.push('  }');
    this.lifecycleBlock = lines.join('\n');
    return this;
  }

  /**
   * Add depends_on
   */
  dependsOn(resources: string[]): this {
    this.dependsOnList.push(...resources);
    return this;
  }

  /**
   * Add count meta-argument
   */
  count(expression: string): this {
    this.countExpr = expression;
    return this;
  }

  /**
   * Add for_each meta-argument
   */
  forEach(expression: string): this {
    this.forEachExpr = expression;
    return this;
  }

  /**
   * Build the resource block
   */
  build(): string {
    const lines: string[] = [`resource "${this.type}" "${this.name}" {`];

    // Meta-arguments first
    if (this.countExpr) {
      lines.push(`  count = ${this.countExpr}`);
      lines.push('');
    }
    if (this.forEachExpr) {
      lines.push(`  for_each = ${this.forEachExpr}`);
      lines.push('');
    }

    // Attributes
    lines.push(...this.buildAttributes());

    // Nested blocks
    if (this.nestedBlocks.length > 0) {
      lines.push('');
      lines.push(...this.nestedBlocks);
    }

    // Dynamic blocks
    if (this.dynamicBlocks.length > 0) {
      lines.push('');
      lines.push(...this.dynamicBlocks);
    }

    // Lifecycle block
    if (this.lifecycleBlock) {
      lines.push('');
      lines.push(this.lifecycleBlock);
    }

    // Depends on
    if (this.dependsOnList.length > 0) {
      lines.push('');
      lines.push(`  depends_on = [\n    ${this.dependsOnList.join(',\n    ')}\n  ]`);
    }

    lines.push('}');

    const content = lines.join('\n');
    this.onBuild?.(content);
    return content;
  }
}

/**
 * Builder for data source blocks
 */
export class DataSourceBuilder extends BlockBuilderBase {
  constructor(
    private type: string,
    private name: string
  ) {
    super();
  }

  /**
   * Build the data source block
   */
  build(): string {
    const lines: string[] = [`data "${this.type}" "${this.name}" {`];
    lines.push(...this.buildAttributes());

    if (this.nestedBlocks.length > 0) {
      lines.push('');
      lines.push(...this.nestedBlocks);
    }

    lines.push('}');

    const content = lines.join('\n');
    this.onBuild?.(content);
    return content;
  }
}

/**
 * Builder for nested blocks within resources
 */
export class NestedBlockBuilder extends BlockBuilderBase {
  constructor(private name: string) {
    super();
  }

  /**
   * Build the nested block
   */
  build(): string {
    const lines: string[] = [`  ${this.name} {`];

    for (const [name, value] of this.attributes) {
      lines.push(`    ${formatKey(name)} = ${formatValue(value)}`);
    }

    for (const nested of this.nestedBlocks) {
      lines.push(nested.replace(/^/gm, '  '));
    }

    lines.push('  }');
    return lines.join('\n');
  }
}

/**
 * Builder for locals block
 */
export class LocalsBuilder {
  private locals: Map<string, HCLValue> = new Map();
  public onBuild?: (content: string) => void;

  /**
   * Add a local value
   */
  add(name: string, value: HCLValue): this {
    this.locals.set(name, value);
    return this;
  }

  /**
   * Build the locals block
   */
  build(): string {
    if (this.locals.size === 0) {
      return '';
    }

    const lines: string[] = ['locals {'];
    for (const [name, value] of this.locals) {
      lines.push(`  ${formatKey(name)} = ${formatValue(value)}`);
    }
    lines.push('}');

    const content = lines.join('\n');
    this.onBuild?.(content);
    return content;
  }
}

/**
 * Format a key for HCL output
 */
function formatKey(key: string): string {
  // Keys with special characters need quotes
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return key;
  }
  return `"${key}"`;
}

/**
 * Format a value for HCL output
 */
function formatValue(value: HCLValue, indent = 0): string {
  if (value === null) {
    return 'null';
  }

  if (isHCLExpression(value)) {
    return value.value;
  }

  if (typeof value === 'string') {
    // Check if it's a variable or function reference
    if (value.startsWith('var.') || value.startsWith('local.') || value.startsWith('data.')) {
      return value;
    }
    // Check if it's a resource reference
    if (/^aws_[a-z_]+\.[a-z_]+\./.test(value)) {
      return value;
    }
    // Check if it's a module reference
    if (value.startsWith('module.')) {
      return value;
    }
    // Regular string - quote it
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.map((v) => formatValue(v, indent + 2));
    return `[\n${' '.repeat(indent + 2)}${items.join(`,\n${' '.repeat(indent + 2)}`)}\n${' '.repeat(indent)}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    const items = entries.map(
      ([k, v]) => `${' '.repeat(indent + 2)}${formatKey(k)} = ${formatValue(v, indent + 2)}`
    );
    return `{\n${items.join('\n')}\n${' '.repeat(indent)}}`;
  }

  return String(value);
}

export { formatKey, formatValue, hclExpr };
