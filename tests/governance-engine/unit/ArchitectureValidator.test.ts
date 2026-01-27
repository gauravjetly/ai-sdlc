/**
 * Architecture Validator Unit Tests
 */

import { ArchitectureValidator } from '../../../src/governance-engine/infrastructure/validators/ArchitectureValidator';
import { Policy } from '../../../src/governance-engine/types/policy.types';
import { ValidationContext } from '../../../src/governance-engine/types/validation.types';

describe('ArchitectureValidator', () => {
  let validator: ArchitectureValidator;

  const createMockPolicy = (): Policy => ({
    id: 'test',
    version: '1.0.0',
    name: 'Test',
    description: '',
    effectiveDate: new Date(),
    lastUpdated: new Date(),
    repository: {} as any,
    architecture: {
      mandatoryPattern: 'layered',
      layers: {
        domain: {
          directory: 'src/domain',
          responsibilities: ['Business logic'],
          allowedDependencies: [],
          forbiddenDependencies: ['infrastructure', 'presentation', 'application'],
          forbiddenImports: ['express', 'typeorm', 'axios'],
        },
        application: {
          directory: 'src/application',
          responsibilities: ['Use cases'],
          allowedDependencies: ['domain'],
          forbiddenDependencies: ['infrastructure', 'presentation'],
        },
        infrastructure: {
          directory: 'src/infrastructure',
          responsibilities: ['External integrations'],
          allowedDependencies: ['domain'],
          forbiddenDependencies: ['presentation'],
        },
        presentation: {
          directory: 'src/presentation',
          responsibilities: ['API'],
          allowedDependencies: ['application', 'domain'],
          forbiddenDependencies: ['infrastructure'],
        },
      },
      principles: {},
    },
    codeQuality: {} as any,
    security: {} as any,
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
    validator = new ArchitectureValidator();
  });

  describe('appliesTo', () => {
    it('should apply when architecture layers are defined', () => {
      const policy = createMockPolicy();
      const context = createMockContext([]);

      expect(validator.appliesTo(context, policy)).toBe(true);
    });

    it('should not apply when no layers defined', () => {
      const policy = createMockPolicy();
      policy.architecture.layers = {};
      const context = createMockContext([]);

      expect(validator.appliesTo(context, policy)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass when no violations', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/domain/entities/User.ts'], [
        {
          path: 'src/domain/entities/User.ts',
          content: `
            export class User {
              constructor(public id: string, public name: string) {}
            }
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect domain importing from infrastructure', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/domain/services/UserService.ts'], [
        {
          path: 'src/domain/services/UserService.ts',
          content: `
            import { UserRepository } from '../../infrastructure/repositories/UserRepository';

            export class UserService {
              constructor(private repo: UserRepository) {}
            }
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].rule).toBe('architecture.layer_violation');
      expect(result.violations[0].message).toContain('domain');
      expect(result.violations[0].message).toContain('infrastructure');
    });

    it('should detect domain importing forbidden packages', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/domain/services/UserService.ts'], [
        {
          path: 'src/domain/services/UserService.ts',
          content: `
            import express from 'express';
            import axios from 'axios';

            export class UserService {}
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(2);
      expect(result.violations.some((v) => v.message.includes('express'))).toBe(true);
      expect(result.violations.some((v) => v.message.includes('axios'))).toBe(true);
    });

    it('should detect application importing from infrastructure', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/application/use-cases/CreateUser.ts'], [
        {
          path: 'src/application/use-cases/CreateUser.ts',
          content: `
            import { DatabaseClient } from '../../infrastructure/database/client';

            export class CreateUser {}
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain('application');
      expect(result.violations[0].message).toContain('infrastructure');
    });

    it('should allow valid layer dependencies', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/application/use-cases/CreateUser.ts'], [
        {
          path: 'src/application/use-cases/CreateUser.ts',
          content: `
            import { User } from '../../domain/entities/User';
            import { UserRepository } from '../../domain/repositories/UserRepository';

            export class CreateUser {
              constructor(private repo: UserRepository) {}

              execute(name: string): User {
                return new User('id', name);
              }
            }
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
    });

    it('should skip non-typescript files', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/domain/README.md'], [
        {
          path: 'src/domain/README.md',
          content: '# Domain Layer\nimport { something } from "../infrastructure"',
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
    });

    it('should handle CommonJS requires', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/domain/services/UserService.ts'], [
        {
          path: 'src/domain/services/UserService.ts',
          content: `
            const db = require('../../infrastructure/database');

            module.exports = { UserService: class {} };
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations[0].rule).toBe('architecture.layer_violation');
    });

    it('should provide remediation suggestions', async () => {
      const policy = createMockPolicy();
      const context = createMockContext(['src/domain/services/UserService.ts'], [
        {
          path: 'src/domain/services/UserService.ts',
          content: `
            import { UserRepository } from '../../infrastructure/repositories/UserRepository';
          `,
        },
      ]);

      const result = await validator.validate(context, policy);

      expect(result.violations[0].remediation).toBeDefined();
      expect(result.violations[0].remediation).toContain('dependency injection');
    });
  });
});
