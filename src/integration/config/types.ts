/**
 * Configuration System Types
 *
 * Defines the configuration schema for the AI-SDLC integration.
 * Configuration is hierarchical: defaults < user config < project config < env vars.
 *
 * @module config/types
 */

import { GovernanceLevel } from '../governance/types';

/**
 * The complete integration configuration.
 */
export interface IntegrationConfig {
  /** Config format version */
  version: string;

  /** Master kill switch */
  enabled: boolean;
  /** Auto-classify all requests */
  autoClassify: boolean;
  /** Show classification result to user */
  showClassification: boolean;

  /** Governance configuration */
  governance: GovernanceConfig;

  /** Classification configuration */
  classification: ClassificationConfig;

  /** Routing configuration */
  routing: RoutingConfig;

  /** Phase configuration */
  phases: PhaseConfig;

  /** Bypass configuration */
  bypass: BypassConfig;

  /** Tracking configuration */
  tracking: TrackingConfig;

  /** Performance configuration */
  performance: PerformanceConfig;

  /** User experience configuration */
  ux: UXConfig;
}

export interface GovernanceConfig {
  /** Active governance level (1-4) */
  level: GovernanceLevel;
  /** Default level for new projects */
  defaultForNewProjects: GovernanceLevel;
}

export interface ClassificationConfig {
  /** Enable Tier 1 (rule-based) classification */
  tier1Enabled: boolean;
  /** Enable Tier 2 (LLM-based) classification */
  tier2Enabled: boolean;
  /** Model for Tier 2 classification */
  tier2Model: string;
  /** Confidence threshold below which user confirmation is requested */
  confidenceThreshold: number;
  /** Cache TTL in seconds */
  cacheTTL: number;
}

export interface RoutingConfig {
  /** Keywords that trigger emergency routing */
  emergencyKeywords: string[];
  /** Maximum message length considered trivial */
  trivialMaxLength: number;
  /** Keywords that always trigger SDLC */
  alwaysSDLCFor: string[];
  /** Keywords that never trigger SDLC */
  neverSDLCFor: string[];
}

export interface PhaseConfig {
  /** Minimum phases that always run */
  alwaysRun: string[];
  /** Additional phases for Level 2 */
  level2Phases: string[];
  /** Additional phases for Level 3 */
  level3Phases: string[];
  /** Additional phases for Level 4 */
  level4Phases: string[];
}

export interface BypassConfig {
  /** Allow bypass at Level 1 */
  allowAtLevel1: boolean;
  /** Allow bypass at Level 2 */
  allowAtLevel2: boolean;
  /** Allow bypass at Level 3 (requires token) */
  allowAtLevel3: boolean;
  /** Allow bypass at Level 4 */
  allowAtLevel4: boolean;
  /** Environment variable name for bypass token */
  bypassTokenEnv: string;
}

export interface TrackingConfig {
  /** Log all requests to registry */
  logAllRequests: boolean;
  /** Log classification results */
  logClassifications: boolean;
  /** Log routing decisions */
  logRoutingDecisions: boolean;
  /** Auto-generate documentation */
  generateDocumentation: boolean;
  /** Enable cost tracking */
  costTracking: boolean;
  /** Registry output path */
  registryPath: string;
}

export interface PerformanceConfig {
  /** Maximum classification time in ms before fallback to rules */
  maxClassificationTime: number;
  /** Cache classification results */
  cacheClassifications: boolean;
  /** Allow parallel agent execution */
  parallelAgentExecution: boolean;
}

export interface UXConfig {
  /** Show SDLC progress messages */
  showProgress: boolean;
  /** Show phase transition messages */
  showPhaseTransitions: boolean;
  /** Verbose mode (show everything) */
  verboseMode: boolean;
  /** Use colored output */
  colorOutput: boolean;
}

/**
 * Partial config used for project-level overrides.
 * Any field can be omitted; only specified fields override defaults.
 */
export type PartialIntegrationConfig = {
  [K in keyof IntegrationConfig]?: IntegrationConfig[K] extends object
    ? Partial<IntegrationConfig[K]>
    : IntegrationConfig[K];
};

/**
 * Branch protection configuration (project-level).
 */
export interface BranchConfig {
  /** Protected branch names */
  protected: string[];
  /** Governance level overrides per branch */
  governanceOverrides: Record<string, GovernanceLevel>;
}
