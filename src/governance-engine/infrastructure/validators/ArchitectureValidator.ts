/**
 * Architecture Validator
 * @module @deltek/governance-engine/infrastructure/validators/ArchitectureValidator
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Policy, LayerPolicy } from '../../types/policy.types';
import {
  Validator,
  ValidationContext,
  ValidationResult,
  Violation,
} from '../../types/validation.types';

/**
 * Validates layered architecture dependencies
 * Ensures domain layer has no external dependencies
 * Enforces layer boundaries
 */
export class ArchitectureValidator implements Validator {
  readonly name = 'architecture-validator';
  readonly description = 'Validates layered architecture compliance';

  appliesTo(context: ValidationContext, policy: Policy): boolean {
    return (
      !!policy.architecture &&
      !!policy.architecture.layers &&
      Object.keys(policy.architecture.layers).length > 0
    );
  }

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];

    const layers = policy.architecture.layers;
    const filesToCheck = context.changedFiles.filter(
      (f) => f.endsWith('.ts') || f.endsWith('.js')
    );

    for (const file of filesToCheck) {
      const layer = this.detectLayer(file, layers);
      if (!layer) continue;

      const layerConfig = layers[layer];
      if (!layerConfig) continue;

      try {
        const content = await this.getFileContent(file, context);
        const imports = this.extractImports(content);

        for (const importPath of imports) {
          // Check for forbidden dependencies (layer imports)
          const importedLayer = this.detectLayerFromImport(importPath, layers);
          if (
            importedLayer &&
            layerConfig.forbiddenDependencies?.includes(importedLayer)
          ) {
            violations.push({
              rule: 'architecture.layer_violation',
              severity: 'high',
              message: `${layer} layer cannot import from ${importedLayer} layer`,
              location: {
                file,
                line: this.findImportLine(content, importPath),
              },
              remediation: `Move the dependency to an allowed layer or use dependency injection.
${layer} can only import from: ${layerConfig.allowedDependencies?.join(', ') || 'none'}`,
              references: ['docs/sdlc/architecture/ADR-004-layered-architecture.md'],
            });
          }

          // Check for forbidden imports (specific packages)
          if (layerConfig.forbiddenImports) {
            for (const forbidden of layerConfig.forbiddenImports) {
              if (importPath.includes(forbidden)) {
                violations.push({
                  rule: 'architecture.forbidden_import',
                  severity: 'high',
                  message: `${layer} layer cannot import "${forbidden}"`,
                  location: {
                    file,
                    line: this.findImportLine(content, importPath),
                  },
                  remediation: `The ${layer} layer must remain pure. Move this import to the infrastructure layer.`,
                  references: ['docs/sdlc/architecture/ARCH-20260126-GOVERNANCE.md'],
                });
              }
            }
          }
        }
      } catch (error) {
        // Skip files we can't read
        continue;
      }
    }

    return {
      validator: this.name,
      passed: violations.length === 0,
      violations,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Detect which layer a file belongs to
   */
  private detectLayer(
    filePath: string,
    layers: Record<string, LayerPolicy>
  ): string | null {
    for (const [layerName, config] of Object.entries(layers)) {
      const dir = config.directory;
      if (filePath.includes(dir) || filePath.includes(`/${layerName}/`)) {
        return layerName;
      }
    }
    return null;
  }

  /**
   * Detect layer from import path
   */
  private detectLayerFromImport(
    importPath: string,
    layers: Record<string, LayerPolicy>
  ): string | null {
    // Handle relative imports
    if (importPath.startsWith('.') || importPath.startsWith('..')) {
      for (const [layerName, config] of Object.entries(layers)) {
        if (
          importPath.includes(config.directory) ||
          importPath.includes(`/${layerName}/`)
        ) {
          return layerName;
        }
      }
    }

    return null;
  }

  /**
   * Extract import statements from file content
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // ES6 imports
    const es6Pattern = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6Pattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath) {
        imports.push(importPath);
      }
    }

    // CommonJS requires
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requirePattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath) {
        imports.push(importPath);
      }
    }

    return imports;
  }

  /**
   * Find line number of import statement
   */
  private findImportLine(content: string, importPath: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.includes(importPath)) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get file content from context or filesystem
   */
  private async getFileContent(
    filePath: string,
    context: ValidationContext
  ): Promise<string> {
    // Check if content is provided in context
    if (context.fileContents) {
      const fileContent = context.fileContents.find(
        (f) => f.path === filePath
      );
      if (fileContent) {
        return fileContent.content;
      }
    }

    // Read from filesystem
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(context.workingDirectory, filePath);

    return fs.readFile(fullPath, 'utf-8');
  }
}
