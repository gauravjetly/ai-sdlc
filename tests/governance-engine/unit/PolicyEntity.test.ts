/**
 * Policy Entity Unit Tests
 */

import { PolicyEntity } from '../../../src/governance-engine/domain/entities/Policy';
import { Policy } from '../../../src/governance-engine/types/policy.types';

describe('PolicyEntity', () => {
  const createMockPolicy = (overrides?: Partial<Policy>): Policy => ({
    id: 'test-policy',
    version: '1.0.0',
    name: 'Test Policy',
    description: 'Test policy description',
    effectiveDate: new Date('2026-01-01'),
    lastUpdated: new Date('2026-01-26'),
    owner: 'test@example.com',
    repository: {
      allowedOrganizations: ['github.com/DLTKEngineering'],
      branchNaming: {
        pattern: '^(feature|bugfix)/[A-Z]+-[0-9]+-.*$',
        errorMessage: 'Invalid branch name',
        exceptions: ['main', 'develop'],
        enforcement: 'block',
      },
      commitMessage: {
        pattern: '^(feat|fix|docs).*$',
        errorMessage: 'Invalid commit message',
        enforcement: 'warn',
      },
      pullRequests: {
        requiredApprovals: 2,
        mergeStrategy: 'squash',
        deleteBranchOnMerge: true,
      },
      protectedBranches: [
        { name: 'main', enforceAdmins: true },
      ],
    },
    architecture: {
      mandatoryPattern: 'layered',
      layers: {
        domain: {
          directory: 'src/domain',
          responsibilities: ['Business logic'],
          allowedDependencies: [],
          forbiddenDependencies: ['infrastructure', 'presentation'],
          forbiddenImports: ['express', 'typeorm'],
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
      principles: {
        dependencyInversion: {
          enforcement: 'strict',
          violationsBlock: true,
        },
      },
    },
    codeQuality: {
      testCoverage: {
        minimumTotal: 80,
        byLayer: {
          domain: 90,
          application: 80,
        },
        enforcement: 'block',
      },
      linting: {
        zeroWarnings: true,
        zeroErrors: true,
        enforcement: 'block',
      },
      typeSafety: {
        typescript: {
          strictMode: true,
          noAny: true,
          noImplicitAny: true,
        },
        enforcement: 'block',
      },
      complexity: {},
      naming: {
        enforcement: 'warn',
      },
    },
    security: {
      authentication: { required: true },
      authorization: {
        model: 'RBAC',
        requireOnAllEndpoints: true,
        defaultDeny: true,
      },
      encryption: {},
      inputValidation: {
        required: true,
        validateOnBoundary: true,
        sanitizeOutput: true,
        enforcement: 'block',
      },
      sqlInjection: {
        parameterizedQueriesOnly: true,
        noStringConcatenation: true,
        enforcement: 'block',
      },
      secrets: {
        noHardcoded: true,
        enforcement: 'block',
      },
      dependencies: {
        vulnerabilityScanning: true,
        scanFrequency: 'daily',
      },
      owaspTop10: {
        enforcement: 'block',
        checks: {},
      },
    },
    compliance: {},
    documentation: {},
    enforcement: {},
    metadata: {
      schemaVersion: '1.0.0',
      override: {
        allowed: true,
        requiresApprovalFrom: ['security-team'],
        audit: true,
      },
    },
    ...overrides,
  });

  describe('create', () => {
    it('should create a policy entity from props', () => {
      const props = createMockPolicy();
      const entity = PolicyEntity.create(props);

      expect(entity.id).toBe('test-policy');
      expect(entity.name).toBe('Test Policy');
      expect(entity.version).toBe('1.0.0');
    });
  });

  describe('isEffective', () => {
    it('should return true when effective date is in the past', () => {
      const props = createMockPolicy({
        effectiveDate: new Date('2020-01-01'),
      });
      const entity = PolicyEntity.create(props);

      expect(entity.isEffective()).toBe(true);
    });

    it('should return false when effective date is in the future', () => {
      const props = createMockPolicy({
        effectiveDate: new Date('2030-01-01'),
      });
      const entity = PolicyEntity.create(props);

      expect(entity.isEffective()).toBe(false);
    });
  });

  describe('isRepositoryAllowed', () => {
    it('should return true for allowed organizations', () => {
      const entity = PolicyEntity.create(createMockPolicy());

      expect(entity.isRepositoryAllowed('https://github.com/DLTKEngineering/my-repo')).toBe(true);
    });

    it('should return false for disallowed organizations', () => {
      const entity = PolicyEntity.create(createMockPolicy());

      expect(entity.isRepositoryAllowed('https://github.com/other-org/repo')).toBe(false);
    });
  });

  describe('isBranchNameValid', () => {
    const entity = PolicyEntity.create(createMockPolicy());

    it('should accept valid branch names', () => {
      expect(entity.isBranchNameValid('feature/JIRA-123-add-feature')).toEqual({ valid: true });
      expect(entity.isBranchNameValid('bugfix/JIRA-456-fix-bug')).toEqual({ valid: true });
    });

    it('should accept exception branches', () => {
      expect(entity.isBranchNameValid('main')).toEqual({ valid: true });
      expect(entity.isBranchNameValid('develop')).toEqual({ valid: true });
    });

    it('should reject invalid branch names', () => {
      const result = entity.isBranchNameValid('my-branch');
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('isCommitMessageValid', () => {
    const entity = PolicyEntity.create(createMockPolicy());

    it('should accept valid commit messages', () => {
      expect(entity.isCommitMessageValid('feat: add new feature')).toEqual({ valid: true });
      expect(entity.isCommitMessageValid('fix: resolve bug')).toEqual({ valid: true });
      expect(entity.isCommitMessageValid('docs: update readme')).toEqual({ valid: true });
    });

    it('should reject invalid commit messages', () => {
      const result = entity.isCommitMessageValid('updated stuff');
      expect(result.valid).toBe(false);
    });
  });

  describe('getMinCoverage', () => {
    const entity = PolicyEntity.create(createMockPolicy());

    it('should return total minimum when no layer specified', () => {
      expect(entity.getMinCoverage()).toBe(80);
    });

    it('should return layer-specific coverage when layer specified', () => {
      expect(entity.getMinCoverage('domain')).toBe(90);
      expect(entity.getMinCoverage('application')).toBe(80);
    });

    it('should return total minimum for unknown layers', () => {
      expect(entity.getMinCoverage('unknown')).toBe(80);
    });
  });

  describe('isLayerDependencyAllowed', () => {
    const entity = PolicyEntity.create(createMockPolicy());

    it('should allow valid dependencies', () => {
      expect(entity.isLayerDependencyAllowed('application', 'domain')).toBe(true);
      expect(entity.isLayerDependencyAllowed('infrastructure', 'domain')).toBe(true);
    });

    it('should deny forbidden dependencies', () => {
      expect(entity.isLayerDependencyAllowed('domain', 'infrastructure')).toBe(false);
      expect(entity.isLayerDependencyAllowed('domain', 'presentation')).toBe(false);
      expect(entity.isLayerDependencyAllowed('application', 'infrastructure')).toBe(false);
    });

    it('should allow for unknown layers', () => {
      expect(entity.isLayerDependencyAllowed('unknown', 'domain')).toBe(true);
    });
  });

  describe('toObject', () => {
    it('should return plain object representation', () => {
      const props = createMockPolicy();
      const entity = PolicyEntity.create(props);
      const obj = entity.toObject();

      expect(obj.id).toBe('test-policy');
      expect(obj.name).toBe('Test Policy');
      expect(obj).toEqual(expect.objectContaining({
        id: 'test-policy',
        version: '1.0.0',
        name: 'Test Policy',
      }));
    });
  });
});
