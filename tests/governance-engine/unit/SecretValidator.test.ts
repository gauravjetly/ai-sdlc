/**
 * Secret Validator Unit Tests
 */

import { SecretValidator } from '../../../src/governance-engine/infrastructure/validators/SecretValidator';
import { Policy } from '../../../src/governance-engine/types/policy.types';
import { ValidationContext } from '../../../src/governance-engine/types/validation.types';

describe('SecretValidator', () => {
  let validator: SecretValidator;

  const createMockPolicy = (): Policy => ({
    id: 'test',
    version: '1.0.0',
    name: 'Test',
    description: '',
    effectiveDate: new Date(),
    lastUpdated: new Date(),
    repository: {} as any,
    architecture: {} as any,
    codeQuality: {} as any,
    security: {
      secrets: {
        noHardcoded: true,
        enforcement: 'block',
      },
    } as any,
    compliance: {},
    documentation: {},
    enforcement: {},
    metadata: { schemaVersion: '1.0.0' },
  });

  const createMockContext = (files: string[], fileContents?: Array<{ path: string; content: string }>): ValidationContext => ({
    repository: 'test-repo',
    branch: 'main',
    changedFiles: files,
    workingDirectory: '/test',
    fileContents,
  });

  beforeEach(() => {
    validator = new SecretValidator();
  });

  describe('appliesTo', () => {
    it('should apply when noHardcoded is true', () => {
      const policy = createMockPolicy();
      const context = createMockContext([]);

      expect(validator.appliesTo(context, policy)).toBe(true);
    });

    it('should not apply when noHardcoded is false', () => {
      const policy = createMockPolicy();
      policy.security.secrets.noHardcoded = false;
      const context = createMockContext([]);

      expect(validator.appliesTo(context, policy)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass when no secrets found', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['test.ts'], [
        { path: 'test.ts', content: 'const x = 1;' },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect AWS access keys', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: 'const key = "AKIAIOSFODNN7EXAMPLE";',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].rule).toBe('security.secrets.no_hardcoded');
    });

    it('should detect generic API keys', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: 'const apiKey = "sk_live_abcdef1234567890abcdef";',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should detect GitHub tokens', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: 'const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.message.includes('GitHub'))).toBe(true);
    });

    it('should detect database connection strings', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: 'const db = "mongodb://user:password123@localhost:27017/db";',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.message.includes('Database'))).toBe(true);
    });

    it('should skip placeholder values', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: `
            const apiKey = process.env.API_KEY;
            const example = "your-api-key-here";
            const placeholder = "<API_KEY>";
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
    });

    it('should skip comments', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: `
            // const apiKey = "AKIAIOSFODNN7EXAMPLE";
            /* const token = "ghp_xxxx"; */
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
    });

    it('should skip excluded files', async () => {
      const policy = createMockPolicy();
      const context = createMockContext([
        'node_modules/pkg/index.js',
        'secret.test.ts',
      ], [
        { path: 'node_modules/pkg/index.js', content: 'const key = "AKIAIOSFODNN7EXAMPLE";' },
        { path: 'secret.test.ts', content: 'const key = "AKIAIOSFODNN7EXAMPLE";' },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
    });

    it('should provide remediation suggestions', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: 'const apiKey = "sk_live_abcdef1234567890abcdef";',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.violations[0].remediation).toBeDefined();
      expect(result.violations[0].remediation).toContain('environment variable');
    });

    it('should include CWE and OWASP references', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['config.ts'], [
        {
          path: 'config.ts',
          content: 'const apiKey = "sk_live_abcdef1234567890abcdef";',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.violations[0].cweId).toBe('CWE-798');
      expect(result.violations[0].owaspCategory).toBe('A07:2021');
    });
  });
});
