/**
 * Configuration Diff Engine
 * Calculates differences between environment configurations
 */

import {
  DiffEntry,
  DiffResult,
  DiffType,
  DiffFilter,
  Environment,
  EnvironmentConfig,
  ConfigOverrides,
} from '../types';

/**
 * Get all paths from a nested object
 */
function getAllPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAllPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}

/**
 * Get value at a path in nested object
 */
export function getValueAtPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set value at a path in nested object
 */
export function setValueAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Determine the category of a path
 */
function getCategoryFromPath(
  path: string
): 'compute' | 'database' | 'network' | 'storage' | 'other' {
  const firstPart = path.split('.')[0];

  switch (firstPart) {
    case 'compute':
    case 'instanceType':
    case 'replicas':
    case 'autoScaling':
    case 'resources':
      return 'compute';
    case 'database':
    case 'instanceClass':
    case 'storageSize':
    case 'readReplicas':
      return 'database';
    case 'network':
    case 'vpc':
    case 'subnet':
    case 'securityGroup':
      return 'network';
    case 'storage':
    case 's3':
    case 'ebs':
      return 'storage';
    default:
      return 'other';
  }
}

/**
 * Generate display name from path
 */
function getDisplayNameFromPath(path: string): string {
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1];

  // Convert camelCase to Title Case
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Compare two values for equality
 */
function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => areValuesEqual(item, b[index]));
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b as object);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) =>
      areValuesEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

/**
 * Calculate the diff between two environment configurations
 */
export function calculateDiff(
  sourceConfig: EnvironmentConfig,
  targetConfig: EnvironmentConfig
): DiffResult {
  const entries: DiffEntry[] = [];

  // Get effective configurations (base + overrides)
  const sourceEffective = mergeConfigurations(
    sourceConfig.baseConfig,
    sourceConfig.overrides
  );
  const targetEffective = mergeConfigurations(
    targetConfig.baseConfig,
    targetConfig.overrides
  );

  // Get all unique paths
  const sourcePaths = getAllPaths(sourceEffective as Record<string, unknown>);
  const targetPaths = getAllPaths(targetEffective as Record<string, unknown>);
  const allPaths = [...new Set([...sourcePaths, ...targetPaths])];

  // Compare each path
  for (const path of allPaths) {
    const sourceValue = getValueAtPath(
      sourceEffective as Record<string, unknown>,
      path
    );
    const targetValue = getValueAtPath(
      targetEffective as Record<string, unknown>,
      path
    );

    let diffType: DiffType;

    if (sourceValue === undefined && targetValue !== undefined) {
      diffType = 'removed';
    } else if (sourceValue !== undefined && targetValue === undefined) {
      diffType = 'added';
    } else if (!areValuesEqual(sourceValue, targetValue)) {
      diffType = 'modified';
    } else {
      diffType = 'unchanged';
    }

    // Only include non-unchanged entries in diff
    if (diffType !== 'unchanged') {
      entries.push({
        path,
        type: diffType,
        category: getCategoryFromPath(path),
        sourceValue,
        targetValue,
        displayName: getDisplayNameFromPath(path),
      });
    }
  }

  // Sort entries by category and path
  entries.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.path.localeCompare(b.path);
  });

  return {
    source: sourceConfig.metadata.name,
    target: targetConfig.metadata.name,
    entries,
    summary: {
      total: entries.length,
      additions: entries.filter((e) => e.type === 'added').length,
      deletions: entries.filter((e) => e.type === 'removed').length,
      modifications: entries.filter((e) => e.type === 'modified').length,
    },
    calculatedAt: new Date(),
  };
}

/**
 * Filter diff entries based on filter criteria
 */
export function filterDiff(
  diffResult: DiffResult,
  filter: DiffFilter
): DiffEntry[] {
  if (filter === 'all') {
    return diffResult.entries;
  }

  return diffResult.entries.filter((entry) => {
    switch (filter) {
      case 'additions':
        return entry.type === 'added';
      case 'deletions':
        return entry.type === 'removed';
      case 'modifications':
        return entry.type === 'modified';
      case 'compute':
      case 'database':
      case 'network':
      case 'storage':
        return entry.category === filter;
      default:
        return true;
    }
  });
}

/**
 * Merge base configuration with overrides
 */
export function mergeConfigurations(
  base: Record<string, unknown>,
  overrides: ConfigOverrides
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(base));

  for (const [path, override] of Object.entries(overrides)) {
    setValueAtPath(result, path, override.overrideValue);
  }

  return result;
}

/**
 * Format a value for display
 */
export function formatValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled';
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '(empty)';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Get the diff color based on diff type
 */
export function getDiffColor(type: DiffType): string {
  switch (type) {
    case 'added':
      return '#4CAF50'; // Green
    case 'removed':
      return '#F44336'; // Red
    case 'modified':
      return '#FF9800'; // Orange
    case 'unchanged':
    default:
      return '#9E9E9E'; // Grey
  }
}

/**
 * Get the diff icon based on diff type
 */
export function getDiffIcon(type: DiffType): string {
  switch (type) {
    case 'added':
      return '+';
    case 'removed':
      return '-';
    case 'modified':
      return '~';
    case 'unchanged':
    default:
      return '=';
  }
}

/**
 * Export diff as JSON
 */
export function exportDiffAsJson(diffResult: DiffResult): string {
  return JSON.stringify(
    {
      source: diffResult.source,
      target: diffResult.target,
      calculatedAt: diffResult.calculatedAt.toISOString(),
      summary: diffResult.summary,
      differences: diffResult.entries.map((entry) => ({
        path: entry.path,
        type: entry.type,
        category: entry.category,
        source: entry.sourceValue,
        target: entry.targetValue,
      })),
    },
    null,
    2
  );
}
