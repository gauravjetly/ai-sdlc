/**
 * Organizational Context Loader
 *
 * Loads Deltek-wide organizational standards, policies, and conventions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { OrganizationalContext } from '../types/context.types';
import { TokenCounter } from '../utils/token-counter';

export class OrgContextLoader {
  private basePath: string;

  constructor(orgName: string = 'deltek') {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    this.basePath = path.join(homeDir, '.claude', 'org-context', orgName);
  }

  /**
   * Load complete organizational context
   */
  async load(): Promise<OrganizationalContext> {
    try {
      const [standards, security, libraries, architecture, deployment, testing] =
        await Promise.all([
          this.loadFile('coding-standards.md'),
          this.loadFile('security-policies.md'),
          this.loadJSON<string[]>('approved-libraries.json'),
          this.loadFile('architecture-patterns.md'),
          this.loadFile('deployment-procedures.md'),
          this.loadFile('testing-requirements.md')
        ]);

      const content = [standards, security, architecture, deployment, testing].join('\n\n');

      return {
        standards,
        security,
        libraries,
        architecture,
        deployment,
        testing,
        tokens: TokenCounter.count(content),
        priority: 2
      };
    } catch (error) {
      console.warn('Failed to load organizational context:', error);
      return this.getDefaultOrgContext();
    }
  }

  /**
   * Load specific standard by name
   */
  async loadStandard(name: string): Promise<string> {
    return this.loadFile(`${name}.md`);
  }

  /**
   * Check if organizational context exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize organizational context with defaults
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });

    const defaults = {
      'coding-standards.md': this.getDefaultCodingStandards(),
      'security-policies.md': this.getDefaultSecurityPolicies(),
      'approved-libraries.json': JSON.stringify(this.getDefaultLibraries(), null, 2),
      'architecture-patterns.md': this.getDefaultArchitecturePatterns(),
      'deployment-procedures.md': this.getDefaultDeploymentProcedures(),
      'testing-requirements.md': this.getDefaultTestingRequirements()
    };

    await Promise.all(
      Object.entries(defaults).map(([filename, content]) =>
        fs.writeFile(path.join(this.basePath, filename), content, 'utf-8')
      )
    );
  }

  private async loadFile(filename: string): Promise<string> {
    const filePath = path.join(this.basePath, filename);
    return fs.readFile(filePath, 'utf-8');
  }

  private async loadJSON<T>(filename: string): Promise<T> {
    const content = await this.loadFile(filename);
    return JSON.parse(content);
  }

  private getDefaultOrgContext(): OrganizationalContext {
    return {
      standards: this.getDefaultCodingStandards(),
      security: this.getDefaultSecurityPolicies(),
      libraries: this.getDefaultLibraries(),
      architecture: this.getDefaultArchitecturePatterns(),
      deployment: this.getDefaultDeploymentProcedures(),
      testing: this.getDefaultTestingRequirements(),
      tokens: 0,
      priority: 2
    };
  }

  private getDefaultCodingStandards(): string {
    return `# Deltek Coding Standards

## General Principles
- Follow SOLID principles
- Write self-documenting code
- Keep functions small (<20 lines ideal)
- Use meaningful names
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)

## Architecture
- Layered architecture (mandatory)
- Dependencies flow inward only
- Domain layer has NO external dependencies
- Use dependency injection

## Code Quality
- TypeScript: Strict mode enabled
- Test coverage: >80% on domain/application layers
- Lint: Zero warnings
- No magic numbers or strings
`;
  }

  private getDefaultSecurityPolicies(): string {
    return `# Deltek Security Policies

## Input Validation
- Validate ALL inputs at system boundaries
- Use schema validation libraries (joi, zod)
- Sanitize output based on context

## Authentication & Authorization
- Multi-factor authentication required for production
- JWT tokens with 15-minute expiry
- Refresh token rotation mandatory
- Role-based access control (RBAC)

## Data Protection
- Encryption at rest: AES-256
- Encryption in transit: TLS 1.3
- No sensitive data in logs
- Secure secret management (never hardcode)

## Security Testing
- SAST scans in CI/CD pipeline
- No critical/high vulnerabilities in production
- Regular dependency updates
`;
  }

  private getDefaultLibraries(): string[] {
    return [
      'express',
      'fastify',
      'joi',
      'zod',
      'jest',
      'winston',
      'pino',
      'typescript',
      'eslint',
      'prettier'
    ];
  }

  private getDefaultArchitecturePatterns(): string {
    return `# Deltek Architecture Patterns

## Preferred Architecture
**Layered Architecture** (mandatory for backend services)

### Layers
1. **Presentation**: API controllers, validators, DTOs
2. **Application**: Use cases, orchestration
3. **Domain**: Business logic (NO external deps)
4. **Infrastructure**: Repositories, external APIs

### Rules
- Dependencies flow inward only (presentation -> application -> domain)
- Domain layer is pure business logic
- Infrastructure implements domain interfaces

## Design Patterns
- Repository: For data access abstraction
- Factory: For complex object creation
- Strategy: For runtime algorithm selection
- Observer: For event-driven communication
`;
  }

  private getDefaultDeploymentProcedures(): string {
    return `# Deltek Deployment Procedures

## CI/CD Pipeline
1. Lint and type check
2. Run unit tests (>80% coverage)
3. Run integration tests
4. Security scanning (SAST/DAST)
5. Build Docker image
6. Deploy to staging
7. Automated smoke tests
8. Manual approval for production
9. Deploy to production (blue/green)

## Rollback Plan
- Keep previous version ready
- Automated rollback on health check failure
- Database migrations must be backward compatible
`;
  }

  private getDefaultTestingRequirements(): string {
    return `# Deltek Testing Requirements

## Coverage Targets
- Domain layer: >90%
- Application layer: >80%
- Presentation layer: >70%
- Infrastructure: Integration tests

## Test Types
1. **Unit Tests**: Business logic, pure functions
2. **Integration Tests**: Database, external APIs
3. **E2E Tests**: Critical user journeys
4. **Performance Tests**: Load testing for key endpoints

## Test Structure (AAA Pattern)
- Arrange: Set up test data
- Act: Execute the operation
- Assert: Verify the outcome
`;
  }
}
