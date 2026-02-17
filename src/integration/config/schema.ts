/**
 * Configuration Schema
 *
 * Zod schemas for validating configuration files.
 * Provides type-safe validation with helpful error messages.
 *
 * @module config/schema
 */

import { z } from 'zod';

/**
 * Governance configuration schema.
 */
const governanceSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  defaultForNewProjects: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  // snake_case aliases from YAML
  default_for_new_projects: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
}).strict().optional();

/**
 * Classification configuration schema.
 */
const classificationSchema = z.object({
  tier1Enabled: z.boolean().optional(),
  tier2Enabled: z.boolean().optional(),
  tier2Model: z.string().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  cacheTTL: z.number().min(0).optional(),
  // snake_case aliases
  tier1_enabled: z.boolean().optional(),
  tier2_enabled: z.boolean().optional(),
  tier2_model: z.string().optional(),
  confidence_threshold: z.number().min(0).max(1).optional(),
  cache_ttl: z.number().min(0).optional(),
}).strict().optional();

/**
 * Routing configuration schema.
 */
const routingSchema = z.object({
  emergencyKeywords: z.array(z.string()).optional(),
  trivialMaxLength: z.number().min(10).max(500).optional(),
  alwaysSDLCFor: z.array(z.string()).optional(),
  neverSDLCFor: z.array(z.string()).optional(),
  // snake_case aliases
  emergency_keywords: z.array(z.string()).optional(),
  trivial_max_length: z.number().min(10).max(500).optional(),
  always_sdlc_for: z.array(z.string()).optional(),
  never_sdlc_for: z.array(z.string()).optional(),
}).strict().optional();

/**
 * Phase configuration schema.
 */
const phaseSchema = z.object({
  alwaysRun: z.array(z.string()).optional(),
  level2Phases: z.array(z.string()).optional(),
  level3Phases: z.array(z.string()).optional(),
  level4Phases: z.array(z.string()).optional(),
  // snake_case aliases
  always_run: z.array(z.string()).optional(),
  level_2_phases: z.array(z.string()).optional(),
  level_3_phases: z.array(z.string()).optional(),
  level_4_phases: z.array(z.string()).optional(),
}).strict().optional();

/**
 * Bypass configuration schema.
 */
const bypassSchema = z.object({
  allowAtLevel1: z.boolean().optional(),
  allowAtLevel2: z.boolean().optional(),
  allowAtLevel3: z.boolean().optional(),
  allowAtLevel4: z.boolean().optional(),
  bypassTokenEnv: z.string().optional(),
  // snake_case aliases
  allow_at_level_1: z.boolean().optional(),
  allow_at_level_2: z.boolean().optional(),
  allow_at_level_3: z.boolean().optional(),
  allow_at_level_4: z.boolean().optional(),
  bypass_token_env: z.string().optional(),
}).strict().optional();

/**
 * Tracking configuration schema.
 */
const trackingSchema = z.object({
  logAllRequests: z.boolean().optional(),
  logClassifications: z.boolean().optional(),
  logRoutingDecisions: z.boolean().optional(),
  generateDocumentation: z.boolean().optional(),
  costTracking: z.boolean().optional(),
  registryPath: z.string().optional(),
  // snake_case aliases
  log_all_requests: z.boolean().optional(),
  log_classifications: z.boolean().optional(),
  log_routing_decisions: z.boolean().optional(),
  generate_documentation: z.boolean().optional(),
  cost_tracking: z.boolean().optional(),
  registry_path: z.string().optional(),
}).strict().optional();

/**
 * Performance configuration schema.
 */
const performanceSchema = z.object({
  maxClassificationTime: z.number().min(500).max(10000).optional(),
  cacheClassifications: z.boolean().optional(),
  parallelAgentExecution: z.boolean().optional(),
  // snake_case aliases
  max_classification_time: z.number().min(500).max(10000).optional(),
  cache_classifications: z.boolean().optional(),
  parallel_agent_execution: z.boolean().optional(),
}).strict().optional();

/**
 * UX configuration schema.
 */
const uxSchema = z.object({
  showProgress: z.boolean().optional(),
  showPhaseTransitions: z.boolean().optional(),
  verboseMode: z.boolean().optional(),
  colorOutput: z.boolean().optional(),
  // snake_case aliases
  show_progress: z.boolean().optional(),
  show_phase_transitions: z.boolean().optional(),
  verbose_mode: z.boolean().optional(),
  color_output: z.boolean().optional(),
}).strict().optional();

/**
 * Branch configuration schema (project-level only).
 */
export const branchSchema = z.object({
  protected: z.array(z.string()).optional(),
  governanceOverrides: z.record(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])).optional(),
  governance_overrides: z.record(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])).optional(),
}).strict().optional();

/**
 * Complete configuration file schema.
 * Accepts both camelCase and snake_case keys.
 */
export const configSchema = z.object({
  version: z.string().optional(),
  enabled: z.boolean().optional(),
  autoClassify: z.boolean().optional(),
  auto_classify: z.boolean().optional(),
  showClassification: z.boolean().optional(),
  show_classification: z.boolean().optional(),
  governance: governanceSchema,
  classification: classificationSchema,
  routing: routingSchema,
  phases: phaseSchema,
  bypass: bypassSchema,
  tracking: trackingSchema,
  performance: performanceSchema,
  ux: uxSchema,
  branches: branchSchema,
}).strict();

/**
 * Validate a configuration object against the schema.
 * @returns The validated config or throws a ZodError
 */
export function validateConfig(config: unknown): z.infer<typeof configSchema> {
  return configSchema.parse(config);
}

/**
 * Safely validate a config, returning errors instead of throwing.
 */
export function safeValidateConfig(config: unknown): {
  success: boolean;
  data?: z.infer<typeof configSchema>;
  errors?: string[];
} {
  const result = configSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`,
    ),
  };
}
