/**
 * Generator Orchestrator
 *
 * Main entry point for Terraform code generation.
 * Coordinates the parsing, dependency resolution, and generation process.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  GeneratorInput,
  GeneratorResult,
  GeneratorContext,
  GeneratorOutput,
  ModuleInfo,
  TerraformValidationResult,
  GeneratorError,
  VisualDesignerNode,
  AWS_PROVIDER,
  TERRAFORM_VERSION,
} from '../core/types';
import { GeneratorRegistry } from '../core/GeneratorRegistry';
import { DependencyResolver, DependencyResolutionResult } from './DependencyResolver';

/**
 * Generator Orchestrator
 *
 * Coordinates the entire Terraform generation workflow:
 * 1. Parse input design
 * 2. Resolve dependencies
 * 3. Generate modules for each node
 * 4. Compose root module
 * 5. Validate output
 */
export class GeneratorOrchestrator {
  private dependencyResolver: DependencyResolver;

  constructor() {
    this.dependencyResolver = new DependencyResolver();
  }

  /**
   * Generate Terraform code from visual designer input
   */
  async generate(input: GeneratorInput): Promise<GeneratorResult> {
    const errors: GeneratorError[] = [];
    const modules: ModuleInfo[] = [];

    try {
      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Resolve dependencies
      const resolution = this.dependencyResolver.resolve(input.nodes, input.edges);

      // Step 3: Create output directory
      this.createOutputDirectory(input.outputPath);

      // Step 4: Create generator context
      const context = this.createContext(input, resolution);

      // Step 5: Generate modules for each node
      for (const node of resolution.sortedNodes) {
        try {
          const moduleInfo = await this.generateModule(node, context, input.outputPath);
          modules.push(moduleInfo);
        } catch (error: any) {
          errors.push({
            code: 'GENERATION_ERROR',
            message: error.message,
            nodeId: node.id,
            stack: error.stack,
          });
        }
      }

      // Step 6: Generate root module
      this.generateRootModule(input, modules);

      // Step 7: Generate terraform.tfvars
      this.generateTfvars(input, modules);

      // Step 8: Validate generated code
      const validationResult = await this.validateGeneratedCode(input.outputPath);

      return {
        success: errors.length === 0 && validationResult.valid,
        outputPath: input.outputPath,
        modules,
        validationResult,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        outputPath: input.outputPath,
        modules,
        validationResult: { valid: false, errors: [error.message], warnings: [] },
        errors: [
          {
            code: 'ORCHESTRATION_ERROR',
            message: error.message,
            stack: error.stack,
          },
        ],
      };
    }
  }

  /**
   * Validate input configuration
   */
  private validateInput(input: GeneratorInput): void {
    if (!input.nodes || input.nodes.length === 0) {
      throw new Error('No nodes provided for generation');
    }

    if (!input.projectName) {
      throw new Error('Project name is required');
    }

    if (!input.region) {
      throw new Error('AWS region is required');
    }

    if (!input.outputPath) {
      throw new Error('Output path is required');
    }

    // Check all node types are supported
    for (const node of input.nodes) {
      if (!GeneratorRegistry.has(node.type as any)) {
        throw new Error(`Unsupported node type: ${node.type}`);
      }
    }
  }

  /**
   * Create output directory structure
   */
  private createOutputDirectory(outputPath: string): void {
    const dirs = [
      outputPath,
      path.join(outputPath, 'modules'),
      path.join(outputPath, 'environments', 'dev'),
      path.join(outputPath, 'environments', 'staging'),
      path.join(outputPath, 'environments', 'prod'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Create generator context
   */
  private createContext(
    input: GeneratorInput,
    resolution: DependencyResolutionResult
  ): GeneratorContext {
    return {
      environment: input.environment,
      projectName: input.projectName,
      region: input.region,
      commonTags: input.commonTags || {},
      allNodes: new Map(input.nodes.map((n) => [n.id, n])),
      resolvedDependencies: resolution.resourceReferences,
      outputPath: input.outputPath,
    };
  }

  /**
   * Generate module for a single node
   */
  private async generateModule(
    node: VisualDesignerNode,
    context: GeneratorContext,
    outputPath: string
  ): Promise<ModuleInfo> {
    const generator = GeneratorRegistry.get(node.type as any);
    if (!generator) {
      throw new Error(`No generator found for node type: ${node.type}`);
    }

    // Generate the module
    const output = generator.generate(node.data as any, context);

    // Create module directory
    const moduleName = output.metadata.resourceName;
    const modulePath = path.join(outputPath, 'modules', moduleName);

    if (!fs.existsSync(modulePath)) {
      fs.mkdirSync(modulePath, { recursive: true });
    }

    // Write module files
    fs.writeFileSync(path.join(modulePath, 'main.tf'), output.mainTf);
    fs.writeFileSync(path.join(modulePath, 'variables.tf'), output.variablesTf);
    fs.writeFileSync(path.join(modulePath, 'outputs.tf'), output.outputsTf);
    fs.writeFileSync(path.join(modulePath, 'versions.tf'), output.versionsTf);

    // Write README
    const readme = this.generateModuleReadme(node, output);
    fs.writeFileSync(path.join(modulePath, 'README.md'), readme);

    return {
      name: moduleName,
      path: modulePath,
      resourceType: output.metadata.resourceType,
      nodeId: node.id,
      dependencies: output.dependencies,
      outputs: output.metadata.outputs,
    };
  }

  /**
   * Generate root module that composes all child modules
   */
  private generateRootModule(input: GeneratorInput, modules: ModuleInfo[]): void {
    const rootPath = input.outputPath;

    // Generate main.tf with module calls
    let mainTf = `# Root Module - Generated by Vintiq Catalyst
# Project: ${input.projectName}
# Environment: ${input.environment}
# Generated: ${new Date().toISOString()}

`;

    for (const mod of modules) {
      mainTf += `module "${mod.name}" {
  source = "./modules/${mod.name}"

  # Variables passed from root
  common_tags = var.common_tags
}

`;
    }

    fs.writeFileSync(path.join(rootPath, 'main.tf'), mainTf);

    // Generate variables.tf
    let variablesTf = `# Root Variables

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "${input.environment}"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "${input.region}"
}
`;

    fs.writeFileSync(path.join(rootPath, 'variables.tf'), variablesTf);

    // Generate outputs.tf
    let outputsTf = `# Root Outputs

`;

    for (const mod of modules) {
      for (const output of mod.outputs) {
        outputsTf += `output "${mod.name}_${output.name}" {
  description = "${output.description}"
  value       = module.${mod.name}.${output.name}
${output.sensitive ? '  sensitive   = true\n' : ''}}

`;
      }
    }

    fs.writeFileSync(path.join(rootPath, 'outputs.tf'), outputsTf);

    // Generate versions.tf
    const versionsTf = `terraform {
  required_version = "${TERRAFORM_VERSION}"

  required_providers {
    ${AWS_PROVIDER.name} = {
      source  = "${AWS_PROVIDER.source}"
      version = "${AWS_PROVIDER.version}"
    }
  }

  # Backend configuration - uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "${input.projectName}-terraform-state"
  #   key            = "${input.environment}/terraform.tfstate"
  #   region         = "${input.region}"
  #   encrypt        = true
  #   dynamodb_table = "${input.projectName}-terraform-locks"
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = var.common_tags
  }
}
`;

    fs.writeFileSync(path.join(rootPath, 'versions.tf'), versionsTf);
  }

  /**
   * Generate terraform.tfvars
   */
  private generateTfvars(input: GeneratorInput, modules: ModuleInfo[]): void {
    const tfvars = `# Terraform Variables
# Generated by Vintiq Catalyst
# Project: ${input.projectName}

environment = "${input.environment}"
region      = "${input.region}"

common_tags = {
  Project     = "${input.projectName}"
  Environment = "${input.environment}"
  ManagedBy   = "terraform"
  Generator   = "vintiq-catalyst"
}
`;

    // Write to environment-specific directory
    const envPath = path.join(input.outputPath, 'environments', input.environment);
    fs.writeFileSync(path.join(envPath, 'terraform.tfvars'), tfvars);

    // Also write to root for convenience
    fs.writeFileSync(path.join(input.outputPath, 'terraform.tfvars'), tfvars);
  }

  /**
   * Generate README for a module
   */
  private generateModuleReadme(
    node: VisualDesignerNode,
    output: GeneratorOutput
  ): string {
    return `# ${output.metadata.resourceName}

## Description

Terraform module for ${output.metadata.resourceType}.

## Resources Created

- \`${output.metadata.resourceType}\`

## Inputs

See \`variables.tf\` for all available input variables.

## Outputs

| Name | Description |
|------|-------------|
${output.metadata.outputs.map((o) => `| ${o.name} | ${o.description} |`).join('\n')}

## Usage

\`\`\`hcl
module "${output.metadata.resourceName}" {
  source = "./modules/${output.metadata.resourceName}"

  common_tags = var.common_tags
}
\`\`\`

## Generated by

Vintiq Catalyst - AI-Powered Infrastructure Generator

Generated: ${new Date().toISOString()}
`;
  }

  /**
   * Validate generated Terraform code
   */
  private async validateGeneratedCode(
    outputPath: string
  ): Promise<TerraformValidationResult> {
    // In a real implementation, this would run `terraform validate`
    // For now, we do basic syntax validation

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check all .tf files exist and are non-empty
      const mainTf = path.join(outputPath, 'main.tf');
      const variablesTf = path.join(outputPath, 'variables.tf');
      const outputsTf = path.join(outputPath, 'outputs.tf');
      const versionsTf = path.join(outputPath, 'versions.tf');

      for (const file of [mainTf, variablesTf, outputsTf, versionsTf]) {
        if (!fs.existsSync(file)) {
          errors.push(`Missing file: ${path.basename(file)}`);
        } else {
          const content = fs.readFileSync(file, 'utf-8');
          if (content.trim().length === 0) {
            warnings.push(`Empty file: ${path.basename(file)}`);
          }
        }
      }

      // Check modules directory
      const modulesPath = path.join(outputPath, 'modules');
      if (fs.existsSync(modulesPath)) {
        const modules = fs.readdirSync(modulesPath);
        for (const mod of modules) {
          const modPath = path.join(modulesPath, mod);
          if (fs.statSync(modPath).isDirectory()) {
            const modMain = path.join(modPath, 'main.tf');
            if (!fs.existsSync(modMain)) {
              errors.push(`Module ${mod} missing main.tf`);
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message],
        warnings,
      };
    }
  }

  /**
   * Preview generation for a single node (without writing files)
   */
  previewNode(
    node: VisualDesignerNode,
    context: Partial<GeneratorContext> = {}
  ): GeneratorOutput | null {
    const generator = GeneratorRegistry.get(node.type as any);
    if (!generator) {
      return null;
    }

    const fullContext: GeneratorContext = {
      environment: 'dev',
      projectName: 'preview',
      region: 'us-east-1',
      commonTags: {},
      allNodes: new Map([[node.id, node]]),
      resolvedDependencies: new Map(),
      outputPath: '/tmp/preview',
      ...context,
    };

    return generator.generate(node.data as any, fullContext);
  }
}

// Export singleton instance
export const orchestrator = new GeneratorOrchestrator();
