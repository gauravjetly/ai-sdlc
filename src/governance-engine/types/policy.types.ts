/**
 * Policy-related type definitions
 * @module @vintiq/governance-engine/types/policy
 */

/**
 * Complete policy definition loaded from YAML
 */
export interface Policy {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly effectiveDate: Date;
  readonly lastUpdated: Date;
  readonly owner?: string;
  readonly extends?: string[];
  readonly repository: RepositoryPolicy;
  readonly architecture: ArchitecturePolicy;
  readonly codeQuality: CodeQualityPolicy;
  readonly security: SecurityPolicy;
  readonly compliance: CompliancePolicy;
  readonly documentation: DocumentationPolicy;
  readonly enforcement: EnforcementPolicy;
  readonly metadata: PolicyMetadata;
}

/**
 * Repository governance rules
 */
export interface RepositoryPolicy {
  readonly allowedOrganizations: string[];
  readonly naming?: NamingRule;
  readonly branchNaming: BranchNamingRule;
  readonly commitMessage: CommitMessageRule;
  readonly pullRequests: PullRequestPolicy;
  readonly protectedBranches: ProtectedBranch[];
}

/**
 * Naming convention rule
 */
export interface NamingRule {
  readonly pattern: string;
  readonly maxLength?: number;
  readonly examples?: string[];
  readonly errorMessage: string;
}

/**
 * Branch naming rule
 */
export interface BranchNamingRule extends NamingRule {
  readonly exceptions?: string[];
  readonly enforcement: EnforcementLevel;
}

/**
 * Commit message rule
 */
export interface CommitMessageRule extends NamingRule {
  readonly types?: Record<string, string>;
  readonly enforcement: EnforcementLevel;
}

/**
 * Pull request policy
 */
export interface PullRequestPolicy {
  readonly requiredApprovals: number;
  readonly requiredReviewers?: RequiredReviewer[];
  readonly requiredChecks?: RequiredCheck[];
  readonly mergeStrategy: 'merge' | 'squash' | 'rebase';
  readonly deleteBranchOnMerge: boolean;
  readonly requireLinearHistory?: boolean;
}

/**
 * Required reviewer specification
 */
export interface RequiredReviewer {
  readonly role: string;
  readonly count: number;
  readonly requiredFor?: string | string[];
}

/**
 * Required check specification
 */
export interface RequiredCheck {
  readonly name: string;
  readonly required: boolean;
  readonly threshold?: number;
}

/**
 * Protected branch configuration
 */
export interface ProtectedBranch {
  readonly name: string;
  readonly enforceAdmins: boolean;
  readonly requireSignedCommits?: boolean;
  readonly requireStatusChecks?: boolean;
  readonly requireUpToDate?: boolean;
  readonly dismissStaleReviews?: boolean;
  readonly allowedPushers?: string[];
}

/**
 * Architecture policy
 */
export interface ArchitecturePolicy {
  readonly mandatoryPattern: 'layered' | 'hexagonal' | 'clean';
  readonly layers: Record<string, LayerPolicy>;
  readonly principles: ArchitecturePrinciples;
  readonly dry?: DryPolicy;
  readonly yagni?: YagniPolicy;
}

/**
 * Layer-specific policy
 */
export interface LayerPolicy {
  readonly directory: string;
  readonly responsibilities: string[];
  readonly allowedDependencies: string[];
  readonly forbiddenDependencies: string[];
  readonly allowedImports?: string[];
  readonly forbiddenImports?: string[];
  readonly notes?: string;
}

/**
 * SOLID principles enforcement
 */
export interface ArchitecturePrinciples {
  readonly singleResponsibility?: PrinciplePolicy;
  readonly openClosed?: PrinciplePolicy;
  readonly liskovSubstitution?: PrinciplePolicy;
  readonly interfaceSegregation?: PrinciplePolicy;
  readonly dependencyInversion?: PrinciplePolicy;
}

/**
 * Individual principle policy
 */
export interface PrinciplePolicy {
  readonly enforcement: EnforcementLevel;
  readonly violationsBlock?: boolean;
  readonly notes?: string;
}

/**
 * DRY principle policy
 */
export interface DryPolicy {
  readonly enforcement: EnforcementLevel;
  readonly maxDuplicationLines: number;
  readonly allowedExceptions?: string[];
}

/**
 * YAGNI principle policy
 */
export interface YagniPolicy {
  readonly enforcement: EnforcementLevel;
  readonly checkUnusedExports?: boolean;
}

/**
 * Code quality policy
 */
export interface CodeQualityPolicy {
  readonly testCoverage: TestCoveragePolicy;
  readonly linting: LintingPolicy;
  readonly typeSafety: TypeSafetyPolicy;
  readonly complexity: ComplexityPolicy;
  readonly naming: CodeNamingPolicy;
  readonly errorHandling?: ErrorHandlingPolicy;
}

/**
 * Test coverage requirements
 */
export interface TestCoveragePolicy {
  readonly minimumTotal: number;
  readonly byLayer?: Record<string, number>;
  readonly enforcement: EnforcementLevel;
  readonly excludePatterns?: string[];
}

/**
 * Linting policy
 */
export interface LintingPolicy {
  readonly zeroWarnings: boolean;
  readonly zeroErrors: boolean;
  readonly enforcement: EnforcementLevel;
  readonly configs?: Record<string, string>;
}

/**
 * Type safety policy (TypeScript)
 */
export interface TypeSafetyPolicy {
  readonly typescript?: TypeScriptPolicy;
  readonly enforcement: EnforcementLevel;
}

/**
 * TypeScript-specific settings
 */
export interface TypeScriptPolicy {
  readonly strictMode: boolean;
  readonly noAny: boolean;
  readonly noImplicitAny: boolean;
  readonly noExplicitAny?: boolean;
  readonly strictNullChecks?: boolean;
  readonly strictFunctionTypes?: boolean;
}

/**
 * Code complexity limits
 */
export interface ComplexityPolicy {
  readonly cyclomatic?: ComplexityLimit;
  readonly cognitive?: ComplexityLimit;
  readonly functionLength?: ComplexityLimit;
  readonly fileLength?: ComplexityLimit;
  readonly nestingDepth?: ComplexityLimit;
}

/**
 * Individual complexity limit
 */
export interface ComplexityLimit {
  readonly max: number;
  readonly enforcement: EnforcementLevel;
}

/**
 * Code naming conventions
 */
export interface CodeNamingPolicy {
  readonly files?: NamingConvention;
  readonly classes?: NamingConvention;
  readonly functions?: NamingConvention;
  readonly constants?: NamingConvention;
  readonly interfaces?: NamingConvention;
  readonly types?: NamingConvention;
  readonly enforcement: EnforcementLevel;
}

/**
 * Naming convention specification
 */
export interface NamingConvention {
  readonly pattern: 'camelCase' | 'PascalCase' | 'kebab-case' | 'UPPER_SNAKE_CASE' | 'snake_case';
  readonly prefix?: string;
  readonly exceptions?: string[];
}

/**
 * Error handling policy
 */
export interface ErrorHandlingPolicy {
  readonly noEmptyCatch: boolean;
  readonly requireErrorType: boolean;
  readonly noThrowLiteral: boolean;
  readonly preferResultType?: boolean;
  readonly enforcement: EnforcementLevel;
}

/**
 * Security policy
 */
export interface SecurityPolicy {
  readonly authentication: AuthenticationPolicy;
  readonly authorization: AuthorizationPolicy;
  readonly encryption: EncryptionPolicy;
  readonly inputValidation: InputValidationPolicy;
  readonly sqlInjection: SqlInjectionPolicy;
  readonly secrets: SecretsPolicy;
  readonly dependencies: DependencyPolicy;
  readonly owaspTop10: OwaspPolicy;
}

/**
 * Authentication requirements
 */
export interface AuthenticationPolicy {
  readonly required: boolean;
  readonly methods?: AuthMethodPolicy;
  readonly mfa?: MfaPolicy;
  readonly session?: SessionPolicy;
  readonly tokens?: TokenPolicy;
}

/**
 * Allowed authentication methods
 */
export interface AuthMethodPolicy {
  readonly preferred?: string[];
  readonly acceptable?: string[];
  readonly forbidden?: string[];
}

/**
 * MFA policy
 */
export interface MfaPolicy {
  readonly requiredFor?: string[];
  readonly methods?: string[];
}

/**
 * Session policy
 */
export interface SessionPolicy {
  readonly maxDurationSeconds: number;
  readonly idleTimeoutSeconds: number;
  readonly secureCookies: boolean;
  readonly httponlyCookies: boolean;
  readonly samesite?: 'strict' | 'lax' | 'none';
}

/**
 * Token policy
 */
export interface TokenPolicy {
  readonly accessToken?: AccessTokenPolicy;
  readonly refreshToken?: RefreshTokenPolicy;
}

/**
 * Access token policy
 */
export interface AccessTokenPolicy {
  readonly type: string;
  readonly maxExpirySeconds: number;
  readonly algorithm: string;
}

/**
 * Refresh token policy
 */
export interface RefreshTokenPolicy {
  readonly rotation: boolean;
  readonly maxLifetimeDays: number;
  readonly secureStorage: boolean;
}

/**
 * Authorization policy
 */
export interface AuthorizationPolicy {
  readonly model: 'RBAC' | 'ABAC' | 'PBAC';
  readonly requireOnAllEndpoints: boolean;
  readonly defaultDeny: boolean;
  readonly auditAccessDecisions?: boolean;
}

/**
 * Encryption policy
 */
export interface EncryptionPolicy {
  readonly atRest?: EncryptionAtRestPolicy;
  readonly inTransit?: EncryptionInTransitPolicy;
  readonly algorithms?: AlgorithmPolicy;
}

/**
 * Encryption at rest policy
 */
export interface EncryptionAtRestPolicy {
  readonly algorithm: string;
  readonly keyManagement: string;
  readonly requiredFor?: string[];
}

/**
 * Encryption in transit policy
 */
export interface EncryptionInTransitPolicy {
  readonly minimumTls: string;
  readonly required: boolean;
  readonly certificateValidation?: boolean;
}

/**
 * Approved/forbidden algorithms
 */
export interface AlgorithmPolicy {
  readonly approved?: ApprovedAlgorithms;
  readonly forbidden?: string[];
}

/**
 * Approved algorithms by type
 */
export interface ApprovedAlgorithms {
  readonly symmetric?: string[];
  readonly asymmetric?: string[];
  readonly hashing?: string[];
  readonly password?: string[];
}

/**
 * Input validation policy
 */
export interface InputValidationPolicy {
  readonly required: boolean;
  readonly validateOnBoundary: boolean;
  readonly sanitizeOutput: boolean;
  readonly enforcement: EnforcementLevel;
  readonly patterns?: Record<string, string>;
}

/**
 * SQL injection prevention policy
 */
export interface SqlInjectionPolicy {
  readonly parameterizedQueriesOnly: boolean;
  readonly noStringConcatenation: boolean;
  readonly ormRequired?: boolean;
  readonly enforcement: EnforcementLevel;
}

/**
 * Secrets management policy
 */
export interface SecretsPolicy {
  readonly noHardcoded: boolean;
  readonly detectionTools?: string[];
  readonly management?: SecretsManagementPolicy;
  readonly rotation?: SecretsRotationPolicy;
  readonly enforcement: EnforcementLevel;
}

/**
 * Secrets management service
 */
export interface SecretsManagementPolicy {
  readonly service: string;
  readonly alternatives?: string[];
}

/**
 * Secrets rotation policy
 */
export interface SecretsRotationPolicy {
  readonly apiKeys?: string;
  readonly databasePasswords?: string;
  readonly certificates?: string;
}

/**
 * Dependency security policy
 */
export interface DependencyPolicy {
  readonly vulnerabilityScanning: boolean;
  readonly scanFrequency: string;
  readonly blockingThresholds?: DependencyThresholds;
  readonly maxDaysToRemediate?: RemediationTimeline;
  readonly tools?: Record<string, string[]>;
}

/**
 * CVSS blocking thresholds
 */
export interface DependencyThresholds {
  readonly cvssCritical?: number;
  readonly cvssHigh?: number;
  readonly cvssMedium?: number | null;
}

/**
 * Remediation timelines
 */
export interface RemediationTimeline {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

/**
 * OWASP Top 10 policy
 */
export interface OwaspPolicy {
  readonly enforcement: EnforcementLevel;
  readonly checks: Record<string, OwaspCheck>;
}

/**
 * Individual OWASP check
 */
export interface OwaspCheck {
  readonly enabled: boolean;
  readonly rules?: string[];
}

/**
 * Compliance requirements
 */
export interface CompliancePolicy {
  readonly dcaa?: ComplianceRequirement;
  readonly sox?: ComplianceRequirement;
  readonly gdpr?: ComplianceRequirement;
  readonly hipaa?: ComplianceRequirement;
  readonly pciDss?: ComplianceRequirement;
}

/**
 * Individual compliance requirement
 */
export interface ComplianceRequirement {
  readonly appliesTo?: ComplianceApplicability;
  readonly requirements?: ComplianceItem[];
  readonly enforcement: EnforcementLevel;
}

/**
 * When compliance applies
 */
export interface ComplianceApplicability {
  readonly tags?: string[];
  readonly products?: string[];
}

/**
 * Compliance item
 */
export interface ComplianceItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly implementation?: string;
}

/**
 * Documentation policy
 */
export interface DocumentationPolicy {
  readonly requiredFiles?: RequiredFile[];
  readonly adr?: AdrPolicy;
  readonly codeDocumentation?: CodeDocumentationPolicy;
}

/**
 * Required file specification
 */
export interface RequiredFile {
  readonly path: string;
  readonly requiredSections?: string[];
  readonly when?: string;
  readonly format?: string;
  readonly enforcement: EnforcementLevel;
}

/**
 * ADR policy
 */
export interface AdrPolicy {
  readonly requiredFor?: string[];
  readonly location: string;
  readonly format: string;
  readonly template?: AdrTemplate;
  readonly enforcement: EnforcementLevel;
}

/**
 * ADR template
 */
export interface AdrTemplate {
  readonly sections: string[];
}

/**
 * Code documentation policy
 */
export interface CodeDocumentationPolicy {
  readonly publicApiDocs: boolean;
  readonly complexLogicComments: boolean;
  readonly jsdocRequiredFor?: string[];
  readonly noTodoInProduction: boolean;
  readonly enforcement: EnforcementLevel;
}

/**
 * Enforcement configuration
 */
export interface EnforcementPolicy {
  readonly preGeneration?: EnforcementCheck[];
  readonly duringGeneration?: EnforcementCheck[];
  readonly postGeneration?: EnforcementCheck[];
}

/**
 * Individual enforcement check
 */
export interface EnforcementCheck {
  readonly check: string;
  readonly action: 'block' | 'warn' | 'info';
  readonly condition?: string;
  readonly message: string;
  readonly autoFix?: boolean;
  readonly fixTemplate?: string;
}

/**
 * Policy metadata
 */
export interface PolicyMetadata {
  readonly schemaVersion: string;
  readonly testMode?: boolean;
  readonly rollout?: RolloutPolicy;
  readonly override?: OverridePolicy;
}

/**
 * Rollout configuration
 */
export interface RolloutPolicy {
  readonly percentage: number;
  readonly excludeProjects?: string[];
}

/**
 * Override configuration
 */
export interface OverridePolicy {
  readonly allowed: boolean;
  readonly requiresApprovalFrom?: string[];
  readonly audit: boolean;
}

/**
 * Enforcement level
 */
export type EnforcementLevel = 'block' | 'warn' | 'info' | 'off';

/**
 * Raw YAML policy before parsing
 */
export interface RawPolicy {
  version: string;
  name: string;
  description?: string;
  effective_date?: string;
  last_updated?: string;
  owner?: string;
  extends?: string[];
  repository?: unknown;
  architecture?: unknown;
  code_quality?: unknown;
  security?: unknown;
  compliance?: unknown;
  documentation?: unknown;
  enforcement?: unknown;
  metadata?: unknown;
}
