/**
 * Core Type Definitions for Terraform Module Generators
 *
 * This file defines all TypeScript interfaces and types used throughout
 * the generator system.
 */

// Re-export node types from visual designer
export type {
  AWSServiceType,
  NodeCategory,
  BaseNodeData,
  ValidationResult,
  ValidationMessage,
} from '../../../../webapp/src/components/visualDesigner/nodes/types';

/**
 * Environment type for deployment context
 */
export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Terraform primitive types
 */
export type TerraformType =
  | 'string'
  | 'number'
  | 'bool'
  | 'list(string)'
  | 'list(number)'
  | 'map(string)'
  | 'map(any)'
  | 'set(string)'
  | 'object'
  | 'any';

/**
 * HCL value types for code generation
 */
export type HCLValue =
  | string
  | number
  | boolean
  | null
  | HCLValue[]
  | { [key: string]: HCLValue }
  | HCLExpression;

/**
 * HCL expression (unquoted reference or function call)
 */
export interface HCLExpression {
  __hcl_expression: true;
  value: string;
}

/**
 * Create an HCL expression (will not be quoted in output)
 */
export function hclExpr(value: string): HCLExpression {
  return { __hcl_expression: true, value };
}

/**
 * Check if value is an HCL expression
 */
export function isHCLExpression(value: unknown): value is HCLExpression {
  return typeof value === 'object' && value !== null && '__hcl_expression' in value;
}

/**
 * Visual Designer Node representation
 */
export interface VisualDesignerNode {
  id: string;
  type: string;
  data: BaseNodeData;
  position: { x: number; y: number };
}

/**
 * Connection between nodes in visual designer
 */
export interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Context passed to generators during code generation
 */
export interface GeneratorContext {
  /** Deployment environment */
  environment: Environment;
  /** Project name for naming resources */
  projectName: string;
  /** AWS region */
  region: string;
  /** Tags to apply to all resources */
  commonTags: Record<string, string>;
  /** Map of all nodes in the design */
  allNodes: Map<string, VisualDesignerNode>;
  /** Resolved dependency references */
  resolvedDependencies: Map<string, ResourceReference>;
  /** Output directory path */
  outputPath: string;
}

/**
 * Reference to a terraform resource
 */
export interface ResourceReference {
  /** Node ID this reference points to */
  nodeId: string;
  /** Terraform resource type (e.g., aws_vpc) */
  resourceType: string;
  /** Resource name in terraform */
  resourceName: string;
  /** Full terraform reference (e.g., aws_vpc.main.id) */
  terraformReference: string;
  /** Module path if in different module */
  modulePath?: string;
}

/**
 * Output from a single generator
 */
export interface GeneratorOutput {
  /** Content for main.tf */
  mainTf: string;
  /** Content for variables.tf */
  variablesTf: string;
  /** Content for outputs.tf */
  outputsTf: string;
  /** Content for versions.tf */
  versionsTf: string;
  /** List of dependency node IDs */
  dependencies: string[];
  /** Metadata about the generated resource */
  metadata: GeneratorMetadata;
}

/**
 * Metadata about a generated resource
 */
export interface GeneratorMetadata {
  /** Terraform resource type */
  resourceType: string;
  /** Resource name (sanitized for terraform) */
  resourceName: string;
  /** Node category */
  category: string;
  /** List of outputs this resource provides */
  outputs: ResourceOutput[];
  /** Estimated monthly cost */
  estimatedCost?: CostEstimate;
}

/**
 * Output definition for a resource
 */
export interface ResourceOutput {
  /** Output name */
  name: string;
  /** Terraform type */
  type: TerraformType;
  /** Description */
  description: string;
  /** Whether this output is sensitive */
  sensitive?: boolean;
}

/**
 * Cost estimate for a resource
 */
export interface CostEstimate {
  /** Hourly cost in USD */
  hourly: number;
  /** Monthly cost in USD (based on 730 hours) */
  monthly: number;
  /** Currency */
  currency: 'USD';
}

/**
 * Variable definition for variables.tf
 */
export interface VariableDefinition {
  /** Variable name */
  name: string;
  /** Terraform type */
  type: TerraformType;
  /** Description */
  description: string;
  /** Default value (optional) */
  default?: HCLValue;
  /** Whether variable is sensitive */
  sensitive?: boolean;
  /** Validation rules */
  validation?: ValidationRule[];
}

/**
 * Validation rule for a variable
 */
export interface ValidationRule {
  /** Condition expression */
  condition: string;
  /** Error message */
  errorMessage: string;
}

/**
 * Output definition for outputs.tf
 */
export interface OutputDefinition {
  /** Output name */
  name: string;
  /** Description */
  description: string;
  /** Value expression */
  value: string;
  /** Whether output is sensitive */
  sensitive?: boolean;
}

/**
 * Input to the generator orchestrator
 */
export interface GeneratorInput {
  /** All nodes in the design */
  nodes: VisualDesignerNode[];
  /** Connections between nodes */
  edges: Connection[];
  /** Target environment */
  environment: Environment;
  /** Project name */
  projectName: string;
  /** AWS region */
  region: string;
  /** Common tags for all resources */
  commonTags?: Record<string, string>;
  /** Output directory path */
  outputPath: string;
}

/**
 * Result from the generator orchestrator
 */
export interface GeneratorResult {
  /** Whether generation was successful */
  success: boolean;
  /** Output directory path */
  outputPath: string;
  /** List of generated modules */
  modules: ModuleInfo[];
  /** Validation result */
  validationResult: TerraformValidationResult;
  /** Errors encountered during generation */
  errors?: GeneratorError[];
  /** Warnings */
  warnings?: string[];
}

/**
 * Information about a generated module
 */
export interface ModuleInfo {
  /** Module name */
  name: string;
  /** Module path */
  path: string;
  /** Terraform resource type */
  resourceType: string;
  /** Node ID this module was generated from */
  nodeId: string;
  /** Dependencies on other modules */
  dependencies: string[];
  /** Outputs provided by this module */
  outputs: ResourceOutput[];
}

/**
 * Terraform validation result
 */
export interface TerraformValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Generator error
 */
export interface GeneratorError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Node ID where error occurred */
  nodeId?: string;
  /** Property that caused the error */
  property?: string;
  /** Stack trace */
  stack?: string;
}

/**
 * Dynamic block configuration
 */
export interface DynamicBlockConfig {
  /** For_each expression */
  forEach: string;
  /** Iterator variable name (default: block name) */
  iterator?: string;
  /** Content block builder */
  content: (iterator: string) => Record<string, HCLValue>;
}

/**
 * Lifecycle configuration
 */
export interface LifecycleConfig {
  createBeforeDestroy?: boolean;
  preventDestroy?: boolean;
  ignoreChanges?: string[] | 'all';
  replaceTriggeredBy?: string[];
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  source: string;
  version: string;
}

/**
 * AWS Provider configuration
 */
export const AWS_PROVIDER: ProviderConfig = {
  name: 'aws',
  source: 'hashicorp/aws',
  version: '~> 5.0',
};

/**
 * Terraform version requirement
 */
export const TERRAFORM_VERSION = '>= 1.5.0';

/**
 * Resource name sanitization pattern
 */
export const RESOURCE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Maximum resource name length
 */
export const MAX_RESOURCE_NAME_LENGTH = 64;
