/**
 * Repository Validator Unit Tests
 */

import { RepositoryValidator } from '../../../src/governance-engine/infrastructure/validators/RepositoryValidator';
import { Policy } from '../../../src/governance-engine/types/policy.types';
import { ValidationContext } from '../../../src/governance-engine/types/validation.types';

describe('RepositoryValidator', () => {
  let validator: RepositoryValidator;

  const createMockPolicy = (): Policy => ({
    id: 'test',
    version: '1.0.0',
    name: 'Test',
    description: '',
    effectiveDate: new Date(),
    lastUpdated: new Date(),
    repository: {
      allowedOrganizations: [
        'github.com/DLTKEngineering',
        'github.com/deltek-internal',
      ],
      branchNaming: {
        pattern: '^(feature|bugfix|hotfix)/[A-Z]+-[0-9]+-[a-z0-9-]+$',
        errorMessage: 'Branch must follow pattern: {type}/{JIRA-ticket}-{description}',
        exceptions: ['main', 'develop', 'release/*'],
        enforcement: 'block',
      },
      commitMessage: {
        pattern: '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\\([a-z-]+\\))?: .{10,}$',
        errorMessage: 'Commit must follow Conventional Commits format',
        enforcement: 'warn',
      },
      pullRequests: {
        requiredApprovals: 2,
        mergeStrategy: 'squash',
        deleteBranchOnMerge: true,
      },
      protectedBranches: [],
    },
    architecture: {} as any,
    codeQuality: {} as any,
    security: {} as any,
    compliance: {},
    documentation: {},
    enforcement: {},
    metadata: { schemaVersion: '1.0.0' },
  });

  const createMockContext = (overrides?: Partial<ValidationContext>): ValidationContext => ({
    repository: 'https://github.com/DLTKEngineering/my-project',
    branch: 'feature/JIRA-123-add-new-feature',
    changedFiles: [],
    workingDirectory: '/test',
    ...overrides,
  });

  beforeEach(() => {
    validator = new RepositoryValidator();
  });

  describe('appliesTo', () => {
    it('should apply when repository policy exists', () => {
      const policy = createMockPolicy();
      const context = createMockContext();

      expect(validator.appliesTo(context, policy)).toBe(true);
    });
  });

  describe('validate - allowed organizations', () => {
    it('should pass for allowed organizations', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        repository: 'https://github.com/DLTKEngineering/my-project',
      });

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(true);
      expect(result.violations.filter((v) => v.rule === 'repository.allowed_organizations')).toHaveLength(0);
    });

    it('should fail for disallowed organizations', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        repository: 'https://github.com/some-other-org/project',
      });

      const result = await validator.validate(context, policy);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === 'repository.allowed_organizations')).toBe(true);
      expect(result.violations[0].severity).toBe('critical');
    });

    it('should pass for alternative allowed organization', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        repository: 'https://github.com/deltek-internal/internal-tool',
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.filter((v) => v.rule === 'repository.allowed_organizations')).toHaveLength(0);
    });
  });

  describe('validate - branch naming', () => {
    it('should pass for valid feature branches', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        branch: 'feature/JIRA-123-add-oauth-support',
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.filter((v) => v.rule === 'repository.branch_naming')).toHaveLength(0);
    });

    it('should pass for valid bugfix branches', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        branch: 'bugfix/JIRA-456-fix-null-pointer',
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.filter((v) => v.rule === 'repository.branch_naming')).toHaveLength(0);
    });

    it('should pass for exception branches', async () => {
      const policy = createMockPolicy();

      for (const branch of ['main', 'develop']) {
        const context = createMockContext({ branch });
        const result = await validator.validate(context, policy);
        expect(result.violations.filter((v) => v.rule === 'repository.branch_naming')).toHaveLength(0);
      }
    });

    it('should fail for invalid branch names', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        branch: 'my-feature-branch',
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.some((v) => v.rule === 'repository.branch_naming')).toBe(true);
    });

    it('should fail for missing ticket number', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        branch: 'feature/add-new-thing',
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.some((v) => v.rule === 'repository.branch_naming')).toBe(true);
    });
  });

  describe('validate - commit message', () => {
    it('should pass for valid commit messages', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        metadata: {
          commitMessage: 'feat(auth): implement OAuth 2.0 with PKCE support',
        },
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.filter((v) => v.rule === 'repository.commit_message')).toHaveLength(0);
    });

    it('should pass for fix commits', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        metadata: {
          commitMessage: 'fix: resolve race condition in user service',
        },
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.filter((v) => v.rule === 'repository.commit_message')).toHaveLength(0);
    });

    it('should fail for invalid commit messages', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        metadata: {
          commitMessage: 'updated stuff',
        },
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.some((v) => v.rule === 'repository.commit_message')).toBe(true);
    });

    it('should skip commit message check if not provided', async () => {
      const policy = createMockPolicy();
      const context = createMockContext({
        metadata: {},
      });

      const result = await validator.validate(context, policy);

      expect(result.violations.filter((v) => v.rule === 'repository.commit_message')).toHaveLength(0);
    });
  });
});
