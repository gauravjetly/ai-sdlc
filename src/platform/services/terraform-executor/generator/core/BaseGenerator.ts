/**
 * Base Generator
 *
 * Abstract base class for all Terraform module generators.
 * Implements Template Method pattern for consistent generation workflow.
 */

import {
  AWSServiceType,
  NodeCategory,
  BaseNodeData,
  GeneratorContext,
  GeneratorOutput,
  GeneratorMetadata,
  ResourceOutput,
  CostEstimate,
  AWS_PROVIDER,
  TERRAFORM_VERSION,
  RESOURCE_NAME_PATTERN,
  MAX_RESOURCE_NAME_LENGTH,
  hclExpr,
} from './types';
import { HCLBuilder } from './HCLBuilder';
import { VariableBuilder } from './VariableBuilder';
import { OutputBuilder } from './OutputBuilder';

/**
 * Abstract base class for all Terraform generators
 *
 * Subclasses must implement:
 * - terraformResourceType
 * - nodeServiceType
 * - category
 * - generateMainTF()
 * - generateVariablesTF()
 * - generateOutputsTF()
 * - getResourceOutputs()
 */
export abstract class BaseGenerator<T extends BaseNodeData> {
  /**
   * The Terraform resource type (e.g., 'aws_vpc')
   */
  abstract readonly terraformResourceType: string;

  /**
   * The AWS service type from visual designer (e.g., 'vpc')
   */
  abstract readonly nodeServiceType: AWSServiceType;

  /**
   * The category this generator belongs to
   */
  abstract readonly category: NodeCategory;

  /**
   * Template method - defines the generation workflow
   * This method should not be overridden
   */
  generate(node: T, context: GeneratorContext): GeneratorOutput {
    // Step 1: Validate the node
    this.validateNode(node);

    // Step 2: Resolve dependencies
    const dependencies = this.resolveDependencies(node, context);

    // Step 3: Generate all files
    const output: GeneratorOutput = {
      mainTf: this.generateMainTF(node, context),
      variablesTf: this.generateVariablesTF(node, context),
      outputsTf: this.generateOutputsTF(node, context),
      versionsTf: this.generateVersionsTF(),
      dependencies,
      metadata: this.getMetadata(node),
    };

    return output;
  }

  /**
   * Generate the main.tf content
   * Must be implemented by subclasses
   */
  protected abstract generateMainTF(node: T, context: GeneratorContext): string;

  /**
   * Generate the variables.tf content
   * Must be implemented by subclasses
   */
  protected abstract generateVariablesTF(node: T, context: GeneratorContext): string;

  /**
   * Generate the outputs.tf content
   * Must be implemented by subclasses
   */
  protected abstract generateOutputsTF(node: T, context: GeneratorContext): string;

  /**
   * Get the list of outputs this resource provides
   * Must be implemented by subclasses
   */
  protected abstract getResourceOutputs(): ResourceOutput[];

  /**
   * Get estimated monthly cost for this resource
   * Override in subclasses to provide cost estimates
   */
  protected getEstimatedCost(node: T): CostEstimate | undefined {
    return undefined;
  }

  /**
   * Validate the node has required properties
   * Can be overridden by subclasses for additional validation
   */
  protected validateNode(node: T): void {
    if (!node) {
      throw new Error('Node is required');
    }

    if (!node.id) {
      throw new Error('Node ID is required');
    }

    if (!node.name) {
      throw new Error('Node name is required');
    }
  }

  /**
   * Resolve dependencies for this node
   * Can be overridden by subclasses for custom dependency handling
   */
  protected resolveDependencies(node: T, context: GeneratorContext): string[] {
    const dependencies: string[] = [];

    // Check for VPC dependency
    if ('vpcId' in node && typeof node.vpcId === 'string' && node.vpcId) {
      dependencies.push(node.vpcId);
    }

    // Check for subnet dependency
    if ('subnetId' in node && typeof node.subnetId === 'string' && node.subnetId) {
      dependencies.push(node.subnetId);
    }

    // Check for subnet IDs (array)
    if ('subnetIds' in node && Array.isArray(node.subnetIds)) {
      dependencies.push(...node.subnetIds);
    }

    // Check for security group dependencies
    if ('securityGroupIds' in node && Array.isArray(node.securityGroupIds)) {
      dependencies.push(...node.securityGroupIds);
    }

    // Check for IAM role dependency
    if ('role' in node && typeof node.role === 'string' && node.role) {
      dependencies.push(node.role);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Generate the versions.tf content
   * Common for all generators
   */
  protected generateVersionsTF(): string {
    return `terraform {
  required_version = "${TERRAFORM_VERSION}"

  required_providers {
    ${AWS_PROVIDER.name} = {
      source  = "${AWS_PROVIDER.source}"
      version = "${AWS_PROVIDER.version}"
    }
  }
}`;
  }

  /**
   * Get metadata about the generated resource
   */
  protected getMetadata(node: T): GeneratorMetadata {
    return {
      resourceType: this.terraformResourceType,
      resourceName: this.sanitizeResourceName(node.name),
      category: this.category,
      outputs: this.getResourceOutputs(),
      estimatedCost: this.getEstimatedCost(node),
    };
  }

  /**
   * Sanitize a name for use as a Terraform resource name
   */
  protected sanitizeResourceName(name: string): string {
    // Replace non-alphanumeric characters with underscores
    let sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    // Ensure it starts with a letter
    if (!/^[a-z]/.test(sanitized)) {
      sanitized = 'r_' + sanitized;
    }

    // Truncate if too long
    if (sanitized.length > MAX_RESOURCE_NAME_LENGTH) {
      sanitized = sanitized.substring(0, MAX_RESOURCE_NAME_LENGTH);
    }

    return sanitized;
  }

  /**
   * Format tags for HCL output with common tag merge
   */
  protected formatTags(
    tags: Record<string, string>,
    context: GeneratorContext,
    additionalTags?: Record<string, string>
  ): string {
    const allTags = {
      Name: tags.Name || context.projectName,
      Environment: context.environment,
      ManagedBy: 'terraform',
      Project: context.projectName,
      ...tags,
      ...additionalTags,
    };

    const tagPairs = Object.entries(allTags)
      .map(([k, v]) => `    ${this.formatKey(k)} = "${v}"`)
      .join('\n');

    return `merge(var.common_tags, {\n${tagPairs}\n  })`;
  }

  /**
   * Format a key for HCL (quote if necessary)
   */
  protected formatKey(key: string): string {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return key;
    }
    return `"${key}"`;
  }

  /**
   * Create HCL expression reference
   */
  protected ref(expression: string): ReturnType<typeof hclExpr> {
    return hclExpr(expression);
  }

  /**
   * Create variable reference
   */
  protected varRef(name: string): ReturnType<typeof hclExpr> {
    return hclExpr(`var.${name}`);
  }

  /**
   * Create local reference
   */
  protected localRef(name: string): ReturnType<typeof hclExpr> {
    return hclExpr(`local.${name}`);
  }

  /**
   * Create a reference to another resource's attribute
   */
  protected resourceRef(
    resourceType: string,
    resourceName: string,
    attribute: string
  ): string {
    return `${resourceType}.${resourceName}.${attribute}`;
  }

  /**
   * Create a reference to a module output
   */
  protected moduleRef(moduleName: string, output: string): string {
    return `module.${moduleName}.${output}`;
  }

  /**
   * Get a reference to a dependency
   */
  protected getDependencyRef(
    nodeId: string,
    context: GeneratorContext,
    attribute: string = 'id'
  ): string {
    const dep = context.resolvedDependencies.get(nodeId);
    if (dep) {
      if (dep.modulePath) {
        return this.moduleRef(dep.resourceName, `${dep.resourceName}_${attribute}`);
      }
      return `${dep.terraformReference}.${attribute}`;
    }
    // Fallback - assume it's a variable
    return `var.${nodeId}_${attribute}`;
  }

  /**
   * Create new HCL builder
   */
  protected buildHCL(): HCLBuilder {
    return new HCLBuilder();
  }

  /**
   * Create new variable builder
   */
  protected buildVariable(): VariableBuilder {
    return new VariableBuilder();
  }

  /**
   * Create new output builder
   */
  protected buildOutput(): OutputBuilder {
    return new OutputBuilder();
  }
}
