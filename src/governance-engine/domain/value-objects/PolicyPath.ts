/**
 * PolicyPath value object
 * @module @vintiq/governance-engine/domain/value-objects/PolicyPath
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Value object representing a policy file path with resolution logic
 */
export class PolicyPath {
  private readonly resolvedPath: string;

  private constructor(inputPath: string) {
    this.resolvedPath = this.resolvePath(inputPath);
  }

  /**
   * Create a PolicyPath from string
   */
  static from(inputPath: string): PolicyPath {
    if (!inputPath) {
      throw new Error('Policy path cannot be empty');
    }
    return new PolicyPath(inputPath);
  }

  /**
   * Create from default policy location
   */
  static default(): PolicyPath {
    return new PolicyPath('~/.claude/governance/policies/org/vintiq-engineering.yaml');
  }

  /**
   * Get the resolved absolute path
   */
  toString(): string {
    return this.resolvedPath;
  }

  /**
   * Get the directory containing this policy
   */
  get directory(): string {
    return path.dirname(this.resolvedPath);
  }

  /**
   * Get the filename without extension
   */
  get name(): string {
    return path.basename(this.resolvedPath, path.extname(this.resolvedPath));
  }

  /**
   * Get the file extension
   */
  get extension(): string {
    return path.extname(this.resolvedPath);
  }

  /**
   * Check if this is a YAML file
   */
  isYaml(): boolean {
    const ext = this.extension.toLowerCase();
    return ext === '.yaml' || ext === '.yml';
  }

  /**
   * Resolve a path relative to this policy's directory
   */
  resolve(relativePath: string): PolicyPath {
    const resolved = path.resolve(this.directory, relativePath);
    return PolicyPath.from(resolved);
  }

  /**
   * Check equality
   */
  equals(other: PolicyPath): boolean {
    return this.resolvedPath === other.resolvedPath;
  }

  /**
   * Resolve path with home directory and environment variable expansion
   */
  private resolvePath(inputPath: string): string {
    let resolved = inputPath;

    // Expand ~ to home directory
    if (resolved.startsWith('~/')) {
      resolved = path.join(os.homedir(), resolved.slice(2));
    } else if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }

    // Expand environment variables ${VAR} or $VAR
    resolved = resolved.replace(/\$\{([^}]+)\}/g, (_, name) => {
      return process.env[name] || '';
    });
    resolved = resolved.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_, name) => {
      return process.env[name] || '';
    });

    // Make absolute if relative
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(process.cwd(), resolved);
    }

    return resolved;
  }
}
