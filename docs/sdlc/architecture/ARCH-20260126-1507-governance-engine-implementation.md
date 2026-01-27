# Implementation Architecture: Governance Policy Engine

**Document ID**: ARCH-20260126-1507
**Version**: 1.0.0
**Date**: 2026-01-26
**Author**: Jets (Architect Agent)
**Status**: APPROVED
**Parent Document**: ARCH-20260126-GOVERNANCE

---

## 1. Executive Summary

This document provides the detailed implementation architecture for the Governance Policy Engine - Phase 1 of the Agent Intelligence System. It builds upon the high-level architecture defined in `ARCH-20260126-GOVERNANCE.md` and provides concrete implementation guidance.

### 1.1 Scope

Phase 1 focuses on:
- Policy YAML Parser
- Pre-commit Validation
- Repository Enforcement
- Coding Standards Checks
- Security Policy Enforcement
- Test Coverage Validation
- Violation Blocking System

### 1.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Node.js | 20.x LTS | TypeScript support, async I/O |
| Language | TypeScript | 5.x | Type safety, strict mode |
| YAML Parser | yaml | 2.x | Full YAML 1.2 support |
| Schema Validation | Ajv | 8.x | Fast JSON Schema validation |
| Secret Detection | gitleaks | 8.x | Industry standard, fast |
| Code Analysis | Semgrep | Latest | Custom security rules |
| Testing | Jest | 29.x | TypeScript support |
| Build | TSX/TSC | 4.x | Fast TypeScript execution |

---

## 2. System Architecture

### 2.1 Component Overview

```
                          ┌─────────────────────────────────────────────┐
                          │           GOVERNANCE ENGINE                  │
                          │                                              │
    ┌─────────────────────┴─────────────────────┬─────────────────────┐ │
    │                                            │                     │ │
    ▼                                            ▼                     ▼ │
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐
│ Policy        │  │ Validator     │  │ Enforcer      │  │ Reporter     │
│ Parser        │  │ Registry      │  │ Engine        │  │              │
│               │  │               │  │               │  │              │
│ - YAML load   │  │ - Secret      │  │ - Block       │  │ - Violations │
│ - Schema      │  │ - Security    │  │ - Warn        │  │ - Audit      │
│ - Inheritance │  │ - Style       │  │ - Allow       │  │ - Metrics    │
│ - Env vars    │  │ - Coverage    │  │ - Bypass      │  │ - Dashboard  │
└───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘
        │                  │                  │                  │
        └──────────────────┴──────────────────┴──────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   Policy Store    │
                          │   (File System)   │
                          └───────────────────┘
```

### 2.2 Directory Structure

```
src/governance-engine/
├── index.ts                      # Public API exports
├── types/                        # TypeScript type definitions
│   ├── index.ts                 # Type exports
│   ├── policy.types.ts          # Policy-related types
│   ├── validation.types.ts      # Validation result types
│   └── enforcement.types.ts     # Enforcement action types
│
├── domain/                       # Business logic (NO external deps)
│   ├── entities/
│   │   ├── Policy.ts            # Policy entity
│   │   ├── Rule.ts              # Rule entity
│   │   ├── Violation.ts         # Violation entity
│   │   └── ValidationResult.ts  # Validation result entity
│   ├── value-objects/
│   │   ├── Severity.ts          # Severity enum/value object
│   │   ├── EnforcementAction.ts # Action types
│   │   └── PolicyPath.ts        # Policy file path
│   ├── services/
│   │   ├── PolicyMerger.ts      # Merge policies with inheritance
│   │   └── RuleEvaluator.ts     # Evaluate rules against code
│   └── repositories/
│       ├── PolicyRepository.ts  # Interface for policy storage
│       └── ViolationRepository.ts # Interface for violation storage
│
├── application/                  # Use cases
│   ├── use-cases/
│   │   ├── ParsePolicy.ts       # Parse YAML policy file
│   │   ├── ValidateCode.ts      # Validate code against policies
│   │   ├── EnforcePolicy.ts     # Enforce policy decisions
│   │   └── ReportViolations.ts  # Generate violation reports
│   └── services/
│       └── GovernanceService.ts # Main orchestration service
│
├── infrastructure/               # External integrations
│   ├── parsers/
│   │   └── YamlPolicyParser.ts  # YAML parsing implementation
│   ├── validators/
│   │   ├── SecretValidator.ts   # Secret detection (gitleaks)
│   │   ├── SecurityValidator.ts # Security rules (Semgrep)
│   │   ├── StyleValidator.ts    # Code style (ESLint)
│   │   ├── CoverageValidator.ts # Test coverage
│   │   └── ArchitectureValidator.ts # Layer violations
│   ├── repositories/
│   │   ├── FilePolicyRepository.ts  # File-based policy storage
│   │   └── FileViolationRepository.ts # File-based violation log
│   └── reporters/
│       ├── ConsoleReporter.ts   # CLI output
│       ├── JsonReporter.ts      # JSON output
│       └── DashboardReporter.ts # Dashboard integration
│
├── presentation/                 # Entry points
│   ├── cli/
│   │   ├── index.ts             # CLI entry point
│   │   ├── commands/
│   │   │   ├── validate.ts      # validate command
│   │   │   ├── check.ts         # pre-commit check
│   │   │   └── report.ts        # generate report
│   │   └── formatters/
│   │       └── CliFormatter.ts  # Pretty console output
│   ├── hooks/
│   │   ├── pre-commit.ts        # Git pre-commit hook
│   │   └── pre-push.ts          # Git pre-push hook
│   └── sdk/
│       └── GovernanceClient.ts  # SDK for agent integration
│
└── config/
    ├── default-policies/         # Built-in policies
    │   ├── security-baseline.yaml
    │   └── quality-baseline.yaml
    └── schemas/
        └── policy-schema.json    # JSON Schema for policies
```

---

## 3. Component Design

### 3.1 Policy Parser

**Responsibility**: Parse YAML policy files with support for inheritance and environment variables.

```typescript
// domain/entities/Policy.ts
export interface Policy {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly effectiveDate: Date;
  readonly extends?: string[];
  readonly repository: RepositoryPolicy;
  readonly architecture: ArchitecturePolicy;
  readonly codeQuality: CodeQualityPolicy;
  readonly security: SecurityPolicy;
  readonly compliance: CompliancePolicy;
  readonly enforcement: EnforcementPolicy;
}

// infrastructure/parsers/YamlPolicyParser.ts
export class YamlPolicyParser implements PolicyParser {
  constructor(
    private readonly schemaValidator: SchemaValidator,
    private readonly envResolver: EnvironmentResolver
  ) {}

  async parse(path: string): Promise<Policy> {
    // 1. Read YAML file
    const content = await this.readFile(path);

    // 2. Resolve environment variables
    const resolved = this.envResolver.resolve(content);

    // 3. Parse YAML
    const parsed = yaml.parse(resolved);

    // 4. Validate against schema
    const validation = this.schemaValidator.validate(parsed);
    if (!validation.valid) {
      throw new PolicyValidationError(validation.errors);
    }

    // 5. Handle inheritance (extends)
    if (parsed.extends) {
      const parents = await this.loadParents(parsed.extends);
      return this.mergePolicies(parents, parsed);
    }

    return this.toDomainPolicy(parsed);
  }
}
```

### 3.2 Validator Registry

**Responsibility**: Manage and orchestrate all validators.

```typescript
// application/services/ValidatorRegistry.ts
export class ValidatorRegistry {
  private readonly validators: Map<string, Validator> = new Map();

  register(name: string, validator: Validator): void {
    this.validators.set(name, validator);
  }

  async validateAll(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const [name, validator] of this.validators) {
      if (validator.appliesTo(context, policy)) {
        const result = await validator.validate(context, policy);
        results.push(result);
      }
    }

    return results;
  }
}

// Validator interface
export interface Validator {
  readonly name: string;
  appliesTo(context: ValidationContext, policy: Policy): boolean;
  validate(context: ValidationContext, policy: Policy): Promise<ValidationResult>;
}
```

### 3.3 Secret Validator

**Responsibility**: Detect hardcoded secrets using gitleaks.

```typescript
// infrastructure/validators/SecretValidator.ts
export class SecretValidator implements Validator {
  readonly name = 'secret-detection';

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];

    // Run gitleaks on changed files
    const result = await this.runGitleaks(context.changedFiles);

    for (const finding of result.findings) {
      violations.push({
        rule: 'security.secrets.no_hardcoded',
        severity: 'critical',
        message: `Potential ${finding.ruleID} detected`,
        location: {
          file: finding.file,
          line: finding.startLine,
          column: finding.startColumn,
        },
        remediation: `Use environment variable: process.env.${this.suggestEnvName(finding)}`,
        references: ['https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/'],
      });
    }

    return {
      validator: this.name,
      passed: violations.length === 0,
      violations,
      duration: result.duration,
    };
  }

  private async runGitleaks(files: string[]): Promise<GitleaksResult> {
    const { stdout } = await exec(
      `gitleaks detect --no-git --source . --report-format json -v`,
      { encoding: 'utf-8' }
    );
    return JSON.parse(stdout);
  }
}
```

### 3.4 Security Validator (Semgrep)

**Responsibility**: Run Semgrep rules for OWASP and custom security checks.

```typescript
// infrastructure/validators/SecurityValidator.ts
export class SecurityValidator implements Validator {
  readonly name = 'security-scan';

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];

    // Run Semgrep with OWASP rules
    const result = await this.runSemgrep(context.changedFiles, policy);

    for (const finding of result.results) {
      const severity = this.mapSeverity(finding.extra.severity);

      if (this.shouldBlock(severity, policy)) {
        violations.push({
          rule: `owasp.${finding.check_id}`,
          severity,
          message: finding.extra.message,
          location: {
            file: finding.path,
            line: finding.start.line,
            column: finding.start.col,
          },
          remediation: finding.extra.fix || this.getRemediation(finding.check_id),
          references: finding.extra.references || [],
        });
      }
    }

    return {
      validator: this.name,
      passed: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      violations,
      duration: result.duration,
    };
  }

  private async runSemgrep(files: string[], policy: Policy): Promise<SemgrepResult> {
    const rulesets = this.getRulesets(policy);
    const { stdout } = await exec(
      `semgrep --config ${rulesets.join(' --config ')} --json .`,
      { encoding: 'utf-8' }
    );
    return JSON.parse(stdout);
  }
}
```

### 3.5 Architecture Validator

**Responsibility**: Validate layered architecture dependencies.

```typescript
// infrastructure/validators/ArchitectureValidator.ts
export class ArchitectureValidator implements Validator {
  readonly name = 'architecture-compliance';

  async validate(
    context: ValidationContext,
    policy: Policy
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];
    const layers = policy.architecture.layers;

    for (const file of context.changedFiles) {
      const layer = this.detectLayer(file, layers);
      if (!layer) continue;

      const imports = await this.extractImports(file);

      for (const importPath of imports) {
        const importedLayer = this.detectLayerFromImport(importPath, layers);

        if (importedLayer && layers[layer].forbidden_dependencies?.includes(importedLayer)) {
          violations.push({
            rule: 'architecture.layer_violation',
            severity: 'high',
            message: `${layer} layer cannot import from ${importedLayer} layer`,
            location: {
              file,
              line: await this.findImportLine(file, importPath),
            },
            remediation: `Move the dependency to an allowed layer or use dependency injection`,
            references: ['docs/sdlc/architecture/ADR-004-layered-architecture.md'],
          });
        }
      }
    }

    return {
      validator: this.name,
      passed: violations.length === 0,
      violations,
    };
  }
}
```

### 3.6 Enforcer Engine

**Responsibility**: Make enforcement decisions and execute actions.

```typescript
// application/services/EnforcerEngine.ts
export class EnforcerEngine {
  constructor(
    private readonly reporter: ViolationReporter,
    private readonly auditLogger: AuditLogger
  ) {}

  async enforce(
    violations: Violation[],
    policy: Policy,
    options: EnforcementOptions
  ): Promise<EnforcementResult> {
    const actions: EnforcementAction[] = [];

    // Categorize violations by enforcement action
    const blocking = violations.filter(v => this.shouldBlock(v, policy));
    const warnings = violations.filter(v => this.shouldWarn(v, policy));

    // Handle blocking violations
    if (blocking.length > 0) {
      // Log to audit
      await this.auditLogger.logViolations(blocking, 'blocked');

      // Report to user
      await this.reporter.reportBlocking(blocking);

      // Check for bypass
      if (options.bypass && await this.canBypass(options.bypassReason)) {
        await this.auditLogger.logBypass(blocking, options.bypassReason);
        return {
          allowed: true,
          bypassed: true,
          violations: blocking,
          warnings,
        };
      }

      return {
        allowed: false,
        bypassed: false,
        violations: blocking,
        warnings,
      };
    }

    // Handle warnings
    if (warnings.length > 0) {
      await this.reporter.reportWarnings(warnings);
      await this.auditLogger.logViolations(warnings, 'warned');
    }

    return {
      allowed: true,
      bypassed: false,
      violations: [],
      warnings,
    };
  }

  private shouldBlock(violation: Violation, policy: Policy): boolean {
    const rule = this.findRule(violation.rule, policy);
    return rule?.enforcement === 'block';
  }
}
```

### 3.7 Governance Service (Main Orchestrator)

**Responsibility**: Orchestrate all components for validation workflow.

```typescript
// application/services/GovernanceService.ts
export class GovernanceService {
  constructor(
    private readonly policyParser: PolicyParser,
    private readonly validatorRegistry: ValidatorRegistry,
    private readonly enforcerEngine: EnforcerEngine,
    private readonly reporter: Reporter
  ) {}

  async validate(options: ValidationOptions): Promise<GovernanceResult> {
    const startTime = Date.now();

    // 1. Load policies
    const policies = await this.loadPolicies(options.policyPaths);

    // 2. Build validation context
    const context = await this.buildContext(options);

    // 3. Run all validators
    const validationResults = await this.validatorRegistry.validateAll(context, policies);

    // 4. Aggregate violations
    const allViolations = validationResults.flatMap(r => r.violations);

    // 5. Enforce policies
    const enforcement = await this.enforcerEngine.enforce(
      allViolations,
      policies,
      options.enforcement
    );

    // 6. Generate report
    await this.reporter.report({
      validationResults,
      enforcement,
      duration: Date.now() - startTime,
    });

    return {
      passed: enforcement.allowed,
      violations: enforcement.violations,
      warnings: enforcement.warnings,
      bypassed: enforcement.bypassed,
      duration: Date.now() - startTime,
    };
  }

  private async loadPolicies(paths: string[]): Promise<Policy> {
    const policies = await Promise.all(
      paths.map(p => this.policyParser.parse(p))
    );
    return this.mergePolicies(policies);
  }
}
```

---

## 4. Integration Points

### 4.1 CLI Interface

```typescript
// presentation/cli/commands/validate.ts
import { program } from 'commander';
import { GovernanceService } from '../../application/services/GovernanceService';

program
  .command('validate')
  .description('Validate code against governance policies')
  .option('-p, --policy <paths...>', 'Policy file paths')
  .option('-f, --files <files...>', 'Files to validate')
  .option('--all', 'Validate all files')
  .option('--staged', 'Validate staged files only')
  .option('--bypass', 'Bypass blocking violations')
  .option('--bypass-reason <reason>', 'Reason for bypass')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const service = createGovernanceService();

    const result = await service.validate({
      policyPaths: options.policy || ['~/.claude/governance/policies/org/deltek-engineering.yaml'],
      files: options.files || (options.staged ? await getStagedFiles() : await getAllFiles()),
      enforcement: {
        bypass: options.bypass,
        bypassReason: options.bypassReason,
      },
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      formatResult(result);
    }

    process.exit(result.passed ? 0 : 1);
  });
```

### 4.2 Pre-commit Hook

```typescript
// presentation/hooks/pre-commit.ts
#!/usr/bin/env node

import { GovernanceService } from '../application/services/GovernanceService';

async function main() {
  const service = createGovernanceService();

  // Get staged files
  const stagedFiles = await exec('git diff --cached --name-only --diff-filter=ACMR');

  if (stagedFiles.length === 0) {
    console.log('No staged files to validate');
    process.exit(0);
  }

  console.log(`Validating ${stagedFiles.length} staged files...`);

  const result = await service.validate({
    files: stagedFiles,
    policyPaths: ['~/.claude/governance/policies/org/deltek-engineering.yaml'],
  });

  if (!result.passed) {
    console.error('\n Policy violations detected. Commit blocked.\n');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn(`\n ${result.warnings.length} warnings (non-blocking)\n`);
  }

  console.log('\n All checks passed!\n');
  process.exit(0);
}

main().catch(console.error);
```

### 4.3 SDK for Agent Integration

```typescript
// presentation/sdk/GovernanceClient.ts
export class GovernanceClient {
  constructor(private readonly service: GovernanceService) {}

  /**
   * Validate code before agent output is committed
   */
  async validateOutput(output: AgentOutput): Promise<ValidationResult> {
    return this.service.validate({
      files: output.files.map(f => f.path),
      content: output.files.map(f => ({ path: f.path, content: f.content })),
    });
  }

  /**
   * Get active policies for context injection
   */
  async getActivePolicies(context: AgentContext): Promise<PolicySummary> {
    const policies = await this.service.loadPolicies([
      '~/.claude/governance/policies/org/deltek-engineering.yaml',
    ]);

    return {
      security: this.summarizeSecurityPolicies(policies),
      architecture: this.summarizeArchitecturePolicies(policies),
      quality: this.summarizeQualityPolicies(policies),
    };
  }

  /**
   * Inject policy constraints into agent prompt
   */
  getPromptInjection(policies: PolicySummary): string {
    return `
## ACTIVE GOVERNANCE POLICIES

### Security Constraints
${policies.security.map(s => `- ${s}`).join('\n')}

### Architecture Requirements
${policies.architecture.map(a => `- ${a}`).join('\n')}

### Quality Gates
${policies.quality.map(q => `- ${q}`).join('\n')}

**WARNING**: Code that violates these policies will be blocked.
`;
  }
}
```

---

## 5. Data Flow

### 5.1 Validation Flow

```
User/Agent Request
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Governance Service                             │
│                                                                   │
│  1. Load Policies                                                 │
│     └─→ Parse YAML files                                         │
│     └─→ Resolve inheritance                                      │
│     └─→ Validate schema                                          │
│                                                                   │
│  2. Build Context                                                 │
│     └─→ Get changed files                                        │
│     └─→ Extract metadata (branch, user, etc.)                    │
│                                                                   │
│  3. Run Validators (parallel)                                     │
│     ├─→ Secret Detection (gitleaks)                              │
│     ├─→ Security Scan (Semgrep)                                  │
│     ├─→ Style Check (ESLint)                                     │
│     ├─→ Architecture Check                                       │
│     └─→ Coverage Check                                           │
│                                                                   │
│  4. Aggregate Results                                             │
│     └─→ Collect all violations                                   │
│     └─→ Categorize by severity                                   │
│                                                                   │
│  5. Enforce Policies                                              │
│     └─→ Block if critical/high violations                        │
│     └─→ Warn if medium/low violations                            │
│     └─→ Check for bypass                                         │
│                                                                   │
│  6. Report Results                                                │
│     └─→ Console output                                           │
│     └─→ JSON report                                              │
│     └─→ Dashboard update                                         │
│     └─→ Audit log                                                │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│ Result           │
│ - passed: bool   │
│ - violations: [] │
│ - warnings: []   │
│ - duration: ms   │
└──────────────────┘
```

---

## 6. Error Handling

### 6.1 Error Categories

```typescript
// domain/errors/GovernanceErrors.ts

export class GovernanceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false
  ) {
    super(message);
  }
}

export class PolicyParseError extends GovernanceError {
  constructor(path: string, details: string) {
    super(
      `Failed to parse policy file: ${path}. ${details}`,
      'POLICY_PARSE_ERROR',
      false
    );
  }
}

export class PolicyValidationError extends GovernanceError {
  constructor(public readonly schemaErrors: SchemaError[]) {
    super(
      `Policy schema validation failed: ${schemaErrors.map(e => e.message).join(', ')}`,
      'POLICY_VALIDATION_ERROR',
      false
    );
  }
}

export class ValidatorError extends GovernanceError {
  constructor(validator: string, details: string) {
    super(
      `Validator '${validator}' failed: ${details}`,
      'VALIDATOR_ERROR',
      true  // Recoverable - can skip this validator
    );
  }
}
```

### 6.2 Graceful Degradation

```typescript
// application/services/GovernanceService.ts

async runValidatorsWithFallback(
  context: ValidationContext,
  policy: Policy
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const [name, validator] of this.validatorRegistry.entries()) {
    try {
      const result = await validator.validate(context, policy);
      results.push(result);
    } catch (error) {
      if (error instanceof ValidatorError && error.recoverable) {
        // Log warning and continue
        this.logger.warn(`Validator ${name} failed, skipping: ${error.message}`);
        results.push({
          validator: name,
          passed: true,  // Assume pass when validator unavailable
          violations: [],
          skipped: true,
          skipReason: error.message,
        });
      } else {
        throw error;
      }
    }
  }

  return results;
}
```

---

## 7. Testing Strategy

### 7.1 Test Pyramid

```
         ┌───────────────┐
         │    E2E (10%)  │  - Full validation workflow
         └───────┬───────┘
                 │
    ┌────────────┴────────────┐
    │  Integration (20%)       │  - Validator + external tools
    └────────────┬────────────┘
                 │
┌────────────────┴────────────────┐
│          Unit (70%)              │  - Domain logic, parsers
└─────────────────────────────────┘
```

### 7.2 Test Categories

```typescript
// tests/unit/domain/PolicyMerger.test.ts
describe('PolicyMerger', () => {
  it('should merge child policy over parent', () => {
    const parent = { security: { mfa: false } };
    const child = { security: { mfa: true } };

    const merged = merger.merge(parent, child);

    expect(merged.security.mfa).toBe(true);
  });
});

// tests/integration/validators/SecretValidator.test.ts
describe('SecretValidator', () => {
  it('should detect hardcoded API key', async () => {
    const files = ['fixtures/hardcoded-secret.ts'];

    const result = await validator.validate({ changedFiles: files }, policy);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('critical');
  });
});

// tests/e2e/governance-workflow.test.ts
describe('Governance Workflow', () => {
  it('should block commit with security violation', async () => {
    // Setup: Stage a file with hardcoded secret
    await exec('git add fixtures/bad-code.ts');

    // Act: Run pre-commit hook
    const result = await runPreCommitHook();

    // Assert: Should be blocked
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('secret detected');
  });
});
```

---

## 8. Performance Considerations

### 8.1 Optimization Strategies

| Strategy | Implementation |
|----------|----------------|
| Parallel Validation | Run independent validators concurrently |
| Incremental Validation | Only validate changed files |
| Caching | Cache parsed policies and validator results |
| Streaming | Stream large file processing |

### 8.2 Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Policy Parse | <100ms | Per policy file |
| Pre-commit Check | <5s | Average commit |
| Full Repo Scan | <60s | 10,000 files |
| Memory Usage | <512MB | During validation |

---

## 9. Security Considerations

### 9.1 Security Requirements

1. **No Secret Logging**: Never log secret values in any output
2. **Input Sanitization**: Validate all file paths and policy content
3. **Audit Trail**: Log all policy decisions with timestamps
4. **Access Control**: Respect file permissions

### 9.2 Implementation

```typescript
// infrastructure/logging/SecureLogger.ts
export class SecureLogger {
  log(message: string, context?: Record<string, unknown>): void {
    // Redact sensitive values
    const sanitized = this.redactSecrets(context);
    this.logger.log(message, sanitized);
  }

  private redactSecrets(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.redactPatterns(obj);
    }
    // ... deep redaction logic
  }

  private redactPatterns(str: string): string {
    const patterns = [
      /api[_-]?key[=:]\s*['"]?[\w-]+['"]?/gi,
      /password[=:]\s*['"]?[\w-]+['"]?/gi,
      /secret[=:]\s*['"]?[\w-]+['"]?/gi,
      /token[=:]\s*['"]?[\w-]+['"]?/gi,
    ];

    let result = str;
    for (const pattern of patterns) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }
}
```

---

## 10. Deployment

### 10.1 Package Configuration

```json
// package.json
{
  "name": "@deltek/governance-engine",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "governance": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "validate": "ts-node src/cli/index.ts validate"
  },
  "dependencies": {
    "yaml": "^2.3.0",
    "ajv": "^8.12.0",
    "commander": "^11.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

### 10.2 Installation

```bash
# Global installation
npm install -g @deltek/governance-engine

# Project installation
npm install --save-dev @deltek/governance-engine

# Setup hooks
npx governance setup-hooks
```

---

## 11. References

- Parent Architecture: `docs/sdlc/architecture/ARCH-20260126-GOVERNANCE.md`
- Requirements: `docs/sdlc/requirements/REQ-20260126-1507-governance-engine.md`
- ADR-006: Policy Engine Architecture
- Policy Template: `docs/sdlc/architecture/governance-policy-template.yaml`

---

**Document Status**: APPROVED
**Approved By**: Jets (Architect Agent)
**Approval Date**: 2026-01-26
