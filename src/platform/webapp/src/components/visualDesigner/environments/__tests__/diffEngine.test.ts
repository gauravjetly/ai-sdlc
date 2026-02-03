/**
 * Diff Engine Unit Tests
 */

import {
  calculateDiff,
  filterDiff,
  mergeConfigurations,
  getValueAtPath,
  setValueAtPath,
  formatValueForDisplay,
  getDiffColor,
  exportDiffAsJson,
} from '../utils/diffEngine';
import {
  DiffResult,
  DiffFilter,
  Environment,
  EnvironmentConfig,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_DISPLAY_NAMES,
} from '../types';

// Helper to create mock environment config
function createMockConfig(
  env: Environment,
  overrides: Record<string, unknown> = {}
): EnvironmentConfig {
  return {
    metadata: {
      id: env,
      name: env,
      displayName: ENVIRONMENT_DISPLAY_NAMES[env],
      color: ENVIRONMENT_COLORS[env],
      status: 'healthy',
      isProtected: env === 'prod',
      approvalRequired: env === 'prod',
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      resourceCount: 0,
    },
    baseConfig: {
      compute: {
        instanceType: 't3.medium',
        replicas: 2,
        ...((overrides.compute as any) || {}),
      },
      database: {
        instanceClass: 'db.t3.medium',
        storageSize: 100,
        ...((overrides.database as any) || {}),
      },
    },
    overrides: {},
    variables: [],
    costEstimate: {
      monthly: 100,
      breakdown: {
        compute: 50,
        database: 30,
        network: 15,
        storage: 5,
        other: 0,
      },
      currency: 'USD',
      lastCalculated: new Date(),
    },
  };
}

describe('diffEngine', () => {
  describe('getValueAtPath', () => {
    it('returns value at simple path', () => {
      const obj = { foo: 'bar' };
      expect(getValueAtPath(obj, 'foo')).toBe('bar');
    });

    it('returns value at nested path', () => {
      const obj = { a: { b: { c: 'deep' } } };
      expect(getValueAtPath(obj, 'a.b.c')).toBe('deep');
    });

    it('returns undefined for non-existent path', () => {
      const obj = { foo: 'bar' };
      expect(getValueAtPath(obj, 'baz')).toBeUndefined();
    });

    it('returns undefined for partial path', () => {
      const obj = { a: { b: 'value' } };
      expect(getValueAtPath(obj, 'a.b.c')).toBeUndefined();
    });

    it('handles null values', () => {
      const obj = { foo: null };
      expect(getValueAtPath(obj, 'foo.bar')).toBeUndefined();
    });
  });

  describe('setValueAtPath', () => {
    it('sets value at simple path', () => {
      const obj: Record<string, unknown> = {};
      setValueAtPath(obj, 'foo', 'bar');
      expect(obj.foo).toBe('bar');
    });

    it('sets value at nested path', () => {
      const obj: Record<string, unknown> = {};
      setValueAtPath(obj, 'a.b.c', 'deep');
      expect((obj.a as any).b.c).toBe('deep');
    });

    it('overwrites existing value', () => {
      const obj: Record<string, unknown> = { foo: 'old' };
      setValueAtPath(obj, 'foo', 'new');
      expect(obj.foo).toBe('new');
    });

    it('creates nested structure if needed', () => {
      const obj: Record<string, unknown> = {};
      setValueAtPath(obj, 'a.b.c', 'value');
      expect(obj).toEqual({ a: { b: { c: 'value' } } });
    });
  });

  describe('calculateDiff', () => {
    it('returns empty diff for identical configs', () => {
      const config = createMockConfig('dev');
      const result = calculateDiff(config, config);

      expect(result.entries.length).toBe(0);
      expect(result.summary.total).toBe(0);
    });

    it('detects additions', () => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: {
          instanceType: 't3.medium',
          replicas: 2,
          newFeature: 'enabled',
        },
      });

      const result = calculateDiff(source, target);

      const addition = result.entries.find((e) => e.type === 'added');
      expect(addition).toBeDefined();
    });

    it('detects removals', () => {
      const source = createMockConfig('dev', {
        compute: {
          instanceType: 't3.medium',
          replicas: 2,
          extraField: 'value',
        },
      });
      const target = createMockConfig('prod');

      const result = calculateDiff(source, target);

      const removal = result.entries.find((e) => e.type === 'removed');
      expect(removal).toBeDefined();
    });

    it('detects modifications', () => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: { instanceType: 't3.xlarge', replicas: 6 },
      });

      const result = calculateDiff(source, target);

      const modifications = result.entries.filter((e) => e.type === 'modified');
      expect(modifications.length).toBeGreaterThan(0);
    });

    it('correctly categorizes differences', () => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: { instanceType: 't3.xlarge', replicas: 6 },
        database: { instanceClass: 'db.r5.large', storageSize: 500 },
      });

      const result = calculateDiff(source, target);

      const computeDiffs = result.entries.filter((e) => e.category === 'compute');
      const databaseDiffs = result.entries.filter((e) => e.category === 'database');

      expect(computeDiffs.length).toBeGreaterThan(0);
      expect(databaseDiffs.length).toBeGreaterThan(0);
    });

    it('provides accurate summary counts', () => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: { instanceType: 't3.xlarge', replicas: 6, newFeature: true },
      });

      const result = calculateDiff(source, target);

      expect(result.summary.total).toBe(result.entries.length);
      expect(result.summary.additions).toBe(
        result.entries.filter((e) => e.type === 'added').length
      );
      expect(result.summary.modifications).toBe(
        result.entries.filter((e) => e.type === 'modified').length
      );
    });
  });

  describe('filterDiff', () => {
    let diffResult: DiffResult;

    beforeEach(() => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: { instanceType: 't3.xlarge', replicas: 6, newFeature: true },
        database: { instanceClass: 'db.r5.large' },
      });
      diffResult = calculateDiff(source, target);
    });

    it('returns all entries for "all" filter', () => {
      const filtered = filterDiff(diffResult, 'all');
      expect(filtered.length).toBe(diffResult.entries.length);
    });

    it('filters by additions', () => {
      const filtered = filterDiff(diffResult, 'additions');
      expect(filtered.every((e) => e.type === 'added')).toBe(true);
    });

    it('filters by modifications', () => {
      const filtered = filterDiff(diffResult, 'modifications');
      expect(filtered.every((e) => e.type === 'modified')).toBe(true);
    });

    it('filters by category', () => {
      const filtered = filterDiff(diffResult, 'compute');
      expect(filtered.every((e) => e.category === 'compute')).toBe(true);
    });
  });

  describe('mergeConfigurations', () => {
    it('returns base config when no overrides', () => {
      const base = { foo: 'bar', nested: { a: 1 } };
      const overrides = {};

      const result = mergeConfigurations(base, overrides);

      expect(result).toEqual(base);
    });

    it('applies overrides to base config', () => {
      const base = { foo: 'bar', nested: { a: 1 } };
      const overrides = {
        foo: {
          path: 'foo',
          originalValue: 'bar',
          overrideValue: 'baz',
          modifiedBy: 'test',
          modifiedAt: new Date(),
        },
      };

      const result = mergeConfigurations(base, overrides);

      expect(result.foo).toBe('baz');
    });

    it('applies nested overrides', () => {
      const base = { nested: { a: 1, b: 2 } };
      const overrides = {
        'nested.a': {
          path: 'nested.a',
          originalValue: 1,
          overrideValue: 10,
          modifiedBy: 'test',
          modifiedAt: new Date(),
        },
      };

      const result = mergeConfigurations(base, overrides);

      expect((result.nested as any).a).toBe(10);
      expect((result.nested as any).b).toBe(2);
    });

    it('does not mutate original base config', () => {
      const base = { foo: 'bar' };
      const overrides = {
        foo: {
          path: 'foo',
          originalValue: 'bar',
          overrideValue: 'baz',
          modifiedBy: 'test',
          modifiedAt: new Date(),
        },
      };

      mergeConfigurations(base, overrides);

      expect(base.foo).toBe('bar');
    });
  });

  describe('formatValueForDisplay', () => {
    it('formats null/undefined as dash', () => {
      expect(formatValueForDisplay(null)).toBe('-');
      expect(formatValueForDisplay(undefined)).toBe('-');
    });

    it('formats booleans as Enabled/Disabled', () => {
      expect(formatValueForDisplay(true)).toBe('Enabled');
      expect(formatValueForDisplay(false)).toBe('Disabled');
    });

    it('formats numbers with locale formatting', () => {
      expect(formatValueForDisplay(1000)).toBe('1,000');
    });

    it('formats empty arrays as (empty)', () => {
      expect(formatValueForDisplay([])).toBe('(empty)');
    });

    it('formats arrays as comma-separated', () => {
      expect(formatValueForDisplay(['a', 'b', 'c'])).toBe('a, b, c');
    });

    it('formats objects as JSON', () => {
      expect(formatValueForDisplay({ foo: 'bar' })).toBe('{"foo":"bar"}');
    });

    it('formats strings as-is', () => {
      expect(formatValueForDisplay('hello')).toBe('hello');
    });
  });

  describe('getDiffColor', () => {
    it('returns green for added', () => {
      expect(getDiffColor('added')).toBe('#4CAF50');
    });

    it('returns red for removed', () => {
      expect(getDiffColor('removed')).toBe('#F44336');
    });

    it('returns orange for modified', () => {
      expect(getDiffColor('modified')).toBe('#FF9800');
    });

    it('returns grey for unchanged', () => {
      expect(getDiffColor('unchanged')).toBe('#9E9E9E');
    });
  });

  describe('exportDiffAsJson', () => {
    it('exports diff result as valid JSON', () => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: { instanceType: 't3.xlarge' },
      });
      const diffResult = calculateDiff(source, target);

      const json = exportDiffAsJson(diffResult);
      const parsed = JSON.parse(json);

      expect(parsed.source).toBe('dev');
      expect(parsed.target).toBe('prod');
      expect(parsed.summary).toBeDefined();
      expect(parsed.differences).toBeDefined();
    });

    it('includes all differences in export', () => {
      const source = createMockConfig('dev');
      const target = createMockConfig('prod', {
        compute: { instanceType: 't3.xlarge', replicas: 6 },
      });
      const diffResult = calculateDiff(source, target);

      const json = exportDiffAsJson(diffResult);
      const parsed = JSON.parse(json);

      expect(parsed.differences.length).toBe(diffResult.entries.length);
    });
  });
});
