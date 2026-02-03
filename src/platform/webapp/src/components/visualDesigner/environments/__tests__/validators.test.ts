/**
 * Validator Utility Tests
 */

import {
  validateVariableKey,
  validateVariableValue,
  validateEnvironmentConfig,
  validatePromotionRequest,
  validateBulkImport,
  findUnresolvedReferences,
  checkEnvironmentPermission,
} from '../utils/validators';
import { Environment, EnvironmentErrorCode } from '../types';

describe('validators', () => {
  describe('validateVariableKey', () => {
    it('rejects empty key', () => {
      const result = validateVariableKey('');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(EnvironmentErrorCode.INVALID_VARIABLE_NAME);
    });

    it('accepts valid uppercase key', () => {
      const result = validateVariableKey('DATABASE_URL');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('warns about lowercase keys', () => {
      const result = validateVariableKey('database_url');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns about reserved names', () => {
      const result = validateVariableKey('PATH');
      expect(result.warnings.some((w) => w.message.includes('reserved'))).toBe(true);
    });

    it('rejects keys exceeding max length', () => {
      const longKey = 'A'.repeat(257);
      const result = validateVariableKey(longKey);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateVariableValue', () => {
    it('warns when plain variable looks like a secret', () => {
      const result = validateVariableValue('mypassword123', {
        key: 'PASSWORD',
        type: 'plain',
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.message.includes('sensitive'))
      ).toBe(true);
    });

    it('does not warn for actual secrets', () => {
      const result = validateVariableValue('mypassword123', {
        key: 'PASSWORD',
        type: 'secret',
      });
      expect(
        result.warnings.filter((w) => w.message.includes('sensitive')).length
      ).toBe(0);
    });

    it('validates against pattern', () => {
      const result = validateVariableValue('invalid', {
        key: 'PORT',
        type: 'plain',
        validationPattern: '^\\d+$',
      });
      expect(result.isValid).toBe(false);
    });

    it('accepts value matching pattern', () => {
      const result = validateVariableValue('8080', {
        key: 'PORT',
        type: 'plain',
        validationPattern: '^\\d+$',
      });
      expect(result.isValid).toBe(true);
    });

    it('warns about unresolved references in plain type', () => {
      const result = validateVariableValue('${UNRESOLVED_VAR}', {
        key: 'URL',
        type: 'plain',
      });
      expect(
        result.warnings.some((w) => w.message.includes('unresolved'))
      ).toBe(true);
    });
  });

  describe('findUnresolvedReferences', () => {
    it('finds single reference', () => {
      const refs = findUnresolvedReferences('${VAR_NAME}');
      expect(refs).toEqual(['VAR_NAME']);
    });

    it('finds multiple references', () => {
      const refs = findUnresolvedReferences('${HOST}:${PORT}');
      expect(refs).toEqual(['HOST', 'PORT']);
    });

    it('returns empty array for no references', () => {
      const refs = findUnresolvedReferences('plain value');
      expect(refs).toEqual([]);
    });

    it('handles nested references', () => {
      const refs = findUnresolvedReferences('${A}/${B}/${C}');
      expect(refs).toEqual(['A', 'B', 'C']);
    });
  });

  describe('validatePromotionRequest', () => {
    const createMockConfig = (env: Environment, isProtected = false) => ({
      metadata: {
        id: env,
        name: env,
        displayName: env,
        color: '#000',
        status: 'healthy' as const,
        isProtected,
        approvalRequired: isProtected,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        resourceCount: 0,
      },
      baseConfig: {},
      overrides: {},
      variables: [],
      costEstimate: {
        monthly: 0,
        breakdown: { compute: 0, database: 0, network: 0, storage: 0, other: 0 },
        currency: 'USD',
        lastCalculated: new Date(),
      },
    });

    it('rejects promotion to same environment', () => {
      const result = validatePromotionRequest(
        {
          sourceEnvironment: 'dev',
          targetEnvironment: 'dev',
          changes: ['path1'],
          requestedBy: 'user',
        },
        createMockConfig('dev'),
        createMockConfig('dev')
      );
      expect(result.isValid).toBe(false);
    });

    it('allows valid promotion path (dev -> staging)', () => {
      const result = validatePromotionRequest(
        {
          sourceEnvironment: 'dev',
          targetEnvironment: 'staging',
          changes: ['path1'],
          requestedBy: 'user',
        },
        createMockConfig('dev'),
        createMockConfig('staging')
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid promotion path (dev -> prod)', () => {
      const result = validatePromotionRequest(
        {
          sourceEnvironment: 'dev',
          targetEnvironment: 'prod',
          changes: ['path1'],
          requestedBy: 'user',
        },
        createMockConfig('dev'),
        createMockConfig('prod', true)
      );
      expect(result.isValid).toBe(false);
    });

    it('warns about protected environment', () => {
      const result = validatePromotionRequest(
        {
          sourceEnvironment: 'staging',
          targetEnvironment: 'prod',
          changes: ['path1'],
          reason: 'This is a detailed reason for promotion',
          requestedBy: 'user',
        },
        createMockConfig('staging'),
        createMockConfig('prod', true)
      );
      expect(
        result.warnings.some((w) => w.code === EnvironmentErrorCode.APPROVAL_REQUIRED)
      ).toBe(true);
    });

    it('rejects empty changes', () => {
      const result = validatePromotionRequest(
        {
          sourceEnvironment: 'dev',
          targetEnvironment: 'staging',
          changes: [],
          requestedBy: 'user',
        },
        createMockConfig('dev'),
        createMockConfig('staging')
      );
      expect(result.isValid).toBe(false);
    });

    it('requires reason for production promotion', () => {
      const result = validatePromotionRequest(
        {
          sourceEnvironment: 'staging',
          targetEnvironment: 'prod',
          changes: ['path1'],
          requestedBy: 'user',
        },
        createMockConfig('staging'),
        createMockConfig('prod', true)
      );
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('reason'))
      ).toBe(true);
    });
  });

  describe('validateBulkImport', () => {
    it('rejects non-array input', () => {
      const result = validateBulkImport('not an array' as any);
      expect(result.isValid).toBe(false);
    });

    it('rejects empty array', () => {
      const result = validateBulkImport([]);
      expect(result.isValid).toBe(false);
    });

    it('accepts valid import data', () => {
      const result = validateBulkImport([
        { key: 'VAR1', value: 'value1' },
        { key: 'VAR2', value: 'value2' },
      ]);
      expect(result.isValid).toBe(true);
    });

    it('rejects items without key', () => {
      const result = validateBulkImport([
        { key: '', value: 'value1' },
        { key: 'VAR2', value: 'value2' },
      ]);
      expect(result.isValid).toBe(false);
    });

    it('rejects duplicate keys', () => {
      const result = validateBulkImport([
        { key: 'VAR1', value: 'value1' },
        { key: 'VAR1', value: 'value2' },
      ]);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('duplicate'))
      ).toBe(true);
    });

    it('warns about large imports', () => {
      const largeImport = Array.from({ length: 150 }, (_, i) => ({
        key: `VAR${i}`,
        value: `value${i}`,
      }));
      const result = validateBulkImport(largeImport);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('checkEnvironmentPermission', () => {
    it('allows developer read on dev', () => {
      expect(checkEnvironmentPermission('dev', 'read', 'developer')).toBe(true);
    });

    it('allows developer write on dev', () => {
      expect(checkEnvironmentPermission('dev', 'write', 'developer')).toBe(true);
    });

    it('denies developer write on prod', () => {
      expect(checkEnvironmentPermission('prod', 'write', 'developer')).toBe(false);
    });

    it('allows admin approve on prod', () => {
      expect(checkEnvironmentPermission('prod', 'approve', 'admin')).toBe(true);
    });

    it('denies devops approve on prod', () => {
      expect(checkEnvironmentPermission('prod', 'approve', 'devops')).toBe(false);
    });

    it('allows devops promote on staging', () => {
      expect(checkEnvironmentPermission('staging', 'promote', 'devops')).toBe(true);
    });

    it('returns false for unknown role', () => {
      expect(checkEnvironmentPermission('dev', 'read', 'unknown')).toBe(false);
    });
  });
});
