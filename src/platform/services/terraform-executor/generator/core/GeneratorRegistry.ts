/**
 * Generator Registry
 *
 * Singleton registry for all Terraform generators.
 * Implements Strategy pattern for generator selection based on node type.
 */

import { AWSServiceType, NodeCategory, BaseNodeData } from './types';
import { BaseGenerator } from './BaseGenerator';

/**
 * Registry entry with generator instance and metadata
 */
interface RegistryEntry {
  generator: BaseGenerator<any>;
  serviceType: AWSServiceType;
  category: NodeCategory;
  terraformResourceType: string;
}

/**
 * Generator Registry - Singleton
 *
 * Central registry for all Terraform generators.
 * Provides lookup by service type and category.
 */
class GeneratorRegistryClass {
  private static _instance: GeneratorRegistryClass;
  private generators: Map<AWSServiceType, RegistryEntry> = new Map();
  private initialized = false;

  /**
   * Private constructor for singleton
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): GeneratorRegistryClass {
    if (!GeneratorRegistryClass._instance) {
      GeneratorRegistryClass._instance = new GeneratorRegistryClass();
    }
    return GeneratorRegistryClass._instance;
  }

  /**
   * Register a generator for a service type
   */
  register<T extends BaseNodeData>(generator: BaseGenerator<T>): void {
    const entry: RegistryEntry = {
      generator,
      serviceType: generator.nodeServiceType,
      category: generator.category,
      terraformResourceType: generator.terraformResourceType,
    };

    this.generators.set(generator.nodeServiceType, entry);
  }

  /**
   * Get a generator by service type
   */
  get<T extends BaseNodeData>(
    serviceType: AWSServiceType
  ): BaseGenerator<T> | undefined {
    const entry = this.generators.get(serviceType);
    return entry?.generator as BaseGenerator<T> | undefined;
  }

  /**
   * Check if a generator exists for a service type
   */
  has(serviceType: AWSServiceType): boolean {
    return this.generators.has(serviceType);
  }

  /**
   * Get all registered generators
   */
  getAll(): BaseGenerator<any>[] {
    return Array.from(this.generators.values()).map((e) => e.generator);
  }

  /**
   * Get generators by category
   */
  getByCategory(category: NodeCategory): BaseGenerator<any>[] {
    return Array.from(this.generators.values())
      .filter((e) => e.category === category)
      .map((e) => e.generator);
  }

  /**
   * Get all supported service types
   */
  getSupportedTypes(): AWSServiceType[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Get the Terraform resource type for a service type
   */
  getTerraformResourceType(serviceType: AWSServiceType): string | undefined {
    return this.generators.get(serviceType)?.terraformResourceType;
  }

  /**
   * Get count of registered generators
   */
  get count(): number {
    return this.generators.size;
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.generators.clear();
    this.initialized = false;
  }

  /**
   * Check if registry has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark registry as initialized
   */
  markInitialized(): void {
    this.initialized = true;
  }
}

// Export singleton instance
export const GeneratorRegistry = GeneratorRegistryClass.getInstance();

// Export class for testing
export { GeneratorRegistryClass };

/**
 * Decorator for auto-registering generators
 * Usage: @RegisterGenerator()
 */
export function RegisterGenerator() {
  return function <T extends { new (...args: any[]): BaseGenerator<any> }>(
    constructor: T
  ) {
    // Auto-register when the class is loaded
    const instance = new constructor();
    GeneratorRegistry.register(instance);
    return constructor;
  };
}
