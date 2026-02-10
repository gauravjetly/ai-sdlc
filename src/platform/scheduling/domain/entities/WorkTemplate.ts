/**
 * WorkTemplate Entity
 *
 * Defines a reusable template for creating multiple related
 * applications or workflows from a single action.
 */

import { v4 as uuidv4 } from 'uuid';

export interface AppDefinition {
  name: string;
  agentType: string;
  taskType: string;
  parameters: Record<string, unknown>;
  dependsOn: string[];
}

export interface TemplateDependency {
  from: string;
  to: string;
  type: 'hard' | 'soft';
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  defaultValue?: unknown;
  required: boolean;
  options?: string[];
}

export interface WorkTemplateProps {
  id?: string;
  name: string;
  description?: string;
  apps: AppDefinition[];
  dependencies: TemplateDependency[];
  variables: TemplateVariable[];
  category?: string;
  isPublic?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly apps: AppDefinition[];
  readonly dependencies: TemplateDependency[];
  readonly variables: TemplateVariable[];
  readonly category: string;
  readonly isPublic: boolean;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: WorkTemplateProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.description = props.description || '';
    this.apps = props.apps;
    this.dependencies = props.dependencies;
    this.variables = props.variables;
    this.category = props.category || 'custom';
    this.isPublic = props.isPublic || false;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (this.apps.length === 0) {
      throw new Error('Template must have at least one application');
    }

    // Validate dependencies reference existing apps
    const appNames = new Set(this.apps.map(a => a.name));
    for (const dep of this.dependencies) {
      if (!appNames.has(dep.from)) {
        throw new Error(`Dependency source "${dep.from}" is not a defined app`);
      }
      if (!appNames.has(dep.to)) {
        throw new Error(`Dependency target "${dep.to}" is not a defined app`);
      }
    }

    // Validate no circular dependencies
    if (this.hasCircularDependency()) {
      throw new Error('Template contains circular dependencies');
    }
  }

  /**
   * Check for circular dependencies using topological sort (Kahn's algorithm)
   */
  private hasCircularDependency(): boolean {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const app of this.apps) {
      inDegree.set(app.name, 0);
      adjacency.set(app.name, []);
    }

    for (const dep of this.dependencies) {
      adjacency.get(dep.from)!.push(dep.to);
      inDegree.set(dep.to, (inDegree.get(dep.to) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    let processedCount = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      processedCount++;

      for (const neighbor of adjacency.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return processedCount !== this.apps.length;
  }

  /**
   * Get the execution order of apps respecting dependencies
   */
  getExecutionOrder(): AppDefinition[][] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const appMap = new Map<string, AppDefinition>();

    for (const app of this.apps) {
      inDegree.set(app.name, 0);
      adjacency.set(app.name, []);
      appMap.set(app.name, app);
    }

    for (const dep of this.dependencies) {
      adjacency.get(dep.from)!.push(dep.to);
      inDegree.set(dep.to, (inDegree.get(dep.to) || 0) + 1);
    }

    const levels: AppDefinition[][] = [];
    let currentLevel: string[] = [];

    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        currentLevel.push(name);
      }
    }

    while (currentLevel.length > 0) {
      levels.push(currentLevel.map(name => appMap.get(name)!));
      const nextLevel: string[] = [];

      for (const name of currentLevel) {
        for (const neighbor of adjacency.get(name) || []) {
          const newDegree = (inDegree.get(neighbor) || 0) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) {
            nextLevel.push(neighbor);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return levels;
  }

  /**
   * Instantiate the template with provided variable values
   */
  instantiate(variableValues: Record<string, unknown>): AppDefinition[] {
    // Validate required variables
    for (const variable of this.variables) {
      if (variable.required && !(variable.name in variableValues)) {
        throw new Error(`Required variable "${variable.name}" not provided`);
      }
    }

    // Apply variable substitution to app definitions
    return this.apps.map(app => ({
      ...app,
      parameters: this.substituteVariables(app.parameters, variableValues),
    }));
  }

  private substituteVariables(
    params: Record<string, unknown>,
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const varName = value.slice(2, -1);
        result[key] = values[varName] ?? value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.substituteVariables(value as Record<string, unknown>, values);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      apps: this.apps,
      dependencies: this.dependencies,
      variables: this.variables,
      category: this.category,
      isPublic: this.isPublic,
      createdBy: this.createdBy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
