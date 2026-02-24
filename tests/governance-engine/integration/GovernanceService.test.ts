/**
 * Governance Service Integration Tests
 */

import { GovernanceService } from '../../../src/governance-engine/application/services/GovernanceService';
import { ValidationOptions } from '../../../src/governance-engine/types/validation.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('GovernanceService Integration', () => {
  let service: GovernanceService;
  let testDir: string;
  let policyPath: string;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'governance-test-'));

    // Create test policy file
    policyPath = path.join(testDir, 'test-policy.yaml');
    await fs.writeFile(
      policyPath,
      `
version: "1.0.0"
name: "Test Policy"
description: "Integration test policy"

repository:
  allowed_organizations:
    - "github.com/DLTKEngineering"
    - "github.com/test-org"
  branch_naming:
    pattern: "^(feature|bugfix)/.*$"
    error_message: "Invalid branch"
    exceptions:
      - "main"
    enforcement: "warn"
  commit_message:
    pattern: "^(feat|fix):.*$"
    error_message: "Invalid commit"
    enforcement: "warn"
  pull_requests:
    required_approvals: 1
    merge_strategy: "squash"
    delete_branch_on_merge: true

architecture:
  mandatory_pattern: "layered"
  layers:
    domain:
      directory: "src/domain"
      responsibilities:
        - "Business logic"
      allowed_dependencies: []
      forbidden_dependencies:
        - "infrastructure"
        - "presentation"
      forbidden_imports:
        - "express"
        - "axios"
    application:
      directory: "src/application"
      responsibilities:
        - "Use cases"
      allowed_dependencies:
        - "domain"
      forbidden_dependencies:
        - "infrastructure"
    infrastructure:
      directory: "src/infrastructure"
      responsibilities:
        - "External"
      allowed_dependencies:
        - "domain"
      forbidden_dependencies: []

code_quality:
  test_coverage:
    minimum_total: 80
    enforcement: "block"
  linting:
    zero_warnings: true
    zero_errors: true
    enforcement: "block"
  type_safety:
    typescript:
      strict_mode: true
      no_any: true
    enforcement: "block"

security:
  secrets:
    no_hardcoded: true
    enforcement: "block"
  owasp_top_10:
    enforcement: "block"
    checks:
      A03_injection:
        enabled: true

metadata:
  schema_version: "1.0.0"
  override:
    allowed: true
    audit: true
`
    );

    // Create test source files
    await fs.mkdir(path.join(testDir, 'src/domain/entities'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src/application/use-cases'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src/infrastructure'), { recursive: true });

    // Clean domain file
    await fs.writeFile(
      path.join(testDir, 'src/domain/entities/User.ts'),
      `
export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string
  ) {}

  updateName(name: string): User {
    return new User(this.id, name, this.email);
  }
}
`
    );

    // Application file with valid import
    await fs.writeFile(
      path.join(testDir, 'src/application/use-cases/CreateUser.ts'),
      `
import { User } from '../../domain/entities/User';

export class CreateUser {
  execute(name: string, email: string): User {
    const id = Math.random().toString(36);
    return new User(id, name, email);
  }
}
`
    );

    service = new GovernanceService();
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('validate', () => {
    it('should pass validation for clean code', async () => {
      const result = await service.validate({
        policyPaths: [policyPath],
        files: [
          path.join(testDir, 'src/domain/entities/User.ts'),
          path.join(testDir, 'src/application/use-cases/CreateUser.ts'),
        ],
        cwd: testDir,
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect architecture violations', async () => {
      // Create a file with architecture violation
      const badFile = path.join(testDir, 'src/domain/BadService.ts');
      await fs.writeFile(
        badFile,
        `
import express from 'express';
import { something } from '../infrastructure/database';

export class BadService {
  app = express();
}
`
      );

      const result = await service.validate({
        policyPaths: [policyPath],
        files: [badFile],
        cwd: testDir,
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule.includes('architecture'))).toBe(true);

      // Cleanup
      await fs.unlink(badFile);
    });

    it('should detect hardcoded secrets', async () => {
      const secretFile = path.join(testDir, 'src/config.ts');
      await fs.writeFile(
        secretFile,
        `
export const config = {
  apiKey: "sk_live_YOUR_STRIPE_KEY_HERE",
  awsKey: "AKIAIOSFODNN7EXAMPLE",
};
`
      );

      const result = await service.validate({
        policyPaths: [policyPath],
        files: [secretFile],
        cwd: testDir,
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule.includes('secret'))).toBe(true);
      expect(result.violations.some((v) => v.severity === 'critical')).toBe(true);

      // Cleanup
      await fs.unlink(secretFile);
    });

    it('should return summary statistics', async () => {
      const result = await service.validate({
        policyPaths: [policyPath],
        files: [path.join(testDir, 'src/domain/entities/User.ts')],
        cwd: testDir,
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.filesValidated).toBe(1);
      expect(result.summary.validatorsRun).toBeGreaterThan(0);
      expect(result.summary.totalDuration).toBeGreaterThan(0);
    });

    it('should include validator results', async () => {
      const result = await service.validate({
        policyPaths: [policyPath],
        files: [path.join(testDir, 'src/domain/entities/User.ts')],
        cwd: testDir,
      });

      expect(result.validatorResults).toBeDefined();
      expect(Array.isArray(result.validatorResults)).toBe(true);
    });

    it('should support dry run mode', async () => {
      const secretFile = path.join(testDir, 'src/dry-run-test.ts');
      await fs.writeFile(
        secretFile,
        `
const apiKey = "sk_live_YOUR_STRIPE_KEY_HERE";
`
      );

      const result = await service.validate({
        policyPaths: [policyPath],
        files: [secretFile],
        cwd: testDir,
        enforcement: {
          dryRun: true,
        },
      });

      // Should pass because it's dry run, but warnings should include the would-be violation
      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Cleanup
      await fs.unlink(secretFile);
    });

    it('should skip specified validators', async () => {
      const result = await service.validate({
        policyPaths: [policyPath],
        files: [path.join(testDir, 'src/domain/entities/User.ts')],
        cwd: testDir,
        skipValidators: ['secret-validator', 'security-validator'],
      });

      const validatorNames = result.validatorResults.map((r) => r.validator);
      expect(validatorNames).not.toContain('secret-validator');
      expect(validatorNames).not.toContain('security-validator');
    });

    it('should run only specified validators', async () => {
      const result = await service.validate({
        policyPaths: [policyPath],
        files: [path.join(testDir, 'src/domain/entities/User.ts')],
        cwd: testDir,
        validators: ['architecture-validator'],
      });

      expect(result.validatorResults.length).toBe(1);
      expect(result.validatorResults[0].validator).toBe('architecture-validator');
    });
  });

  describe('loadPolicies', () => {
    it('should load policy from path', async () => {
      const policy = await service.loadPolicies([policyPath]);

      expect(policy.name).toBe('Test Policy');
      expect(policy.version).toBe('1.0.0');
    });

    it('should throw when no policies found', async () => {
      await expect(
        service.loadPolicies(['/nonexistent/policy.yaml'])
      ).rejects.toThrow('No policies found');
    });
  });

  describe('getValidators', () => {
    it('should return list of registered validators', () => {
      const validators = service.getValidators();

      expect(Array.isArray(validators)).toBe(true);
      expect(validators.length).toBeGreaterThan(0);
      expect(validators).toContain('secret-validator');
      expect(validators).toContain('architecture-validator');
      expect(validators).toContain('repository-validator');
    });
  });
});
