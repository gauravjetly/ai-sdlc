/**
 * Default Configuration
 *
 * Sensible defaults for the AI-SDLC integration.
 * These values are used when no user or project config is provided.
 *
 * @module config/defaults
 */

import { IntegrationConfig } from './types';

/**
 * The default integration configuration.
 * Matches the configuration schema from the architecture document.
 */
export const DEFAULT_CONFIG: IntegrationConfig = {
  version: '1.0',

  enabled: true,
  autoClassify: true,
  showClassification: false,

  governance: {
    level: 2,
    defaultForNewProjects: 2,
  },

  classification: {
    tier1Enabled: true,
    tier2Enabled: true,
    tier2Model: 'claude-haiku-4-5-20250514',
    confidenceThreshold: 0.7,
    cacheTTL: 300,
  },

  routing: {
    emergencyKeywords: [
      'urgent',
      'critical',
      'production down',
      'outage',
      'data loss',
      'security breach',
    ],
    trivialMaxLength: 80,
    alwaysSDLCFor: ['production', 'main'],
    neverSDLCFor: ['explain', 'what is', 'how does'],
  },

  phases: {
    alwaysRun: ['implementation'],
    level2Phases: ['security', 'testing'],
    level3Phases: ['requirements', 'architecture', 'acceptance'],
    level4Phases: ['cost-analysis'],
  },

  bypass: {
    allowAtLevel1: true,
    allowAtLevel2: true,
    allowAtLevel3: false,
    allowAtLevel4: false,
    bypassTokenEnv: 'AISDLC_BYPASS_TOKEN',
  },

  tracking: {
    logAllRequests: true,
    logClassifications: true,
    logRoutingDecisions: true,
    generateDocumentation: true,
    costTracking: true,
    registryPath: 'docs/sdlc',
  },

  performance: {
    maxClassificationTime: 3000,
    cacheClassifications: true,
    parallelAgentExecution: true,
  },

  ux: {
    showProgress: true,
    showPhaseTransitions: true,
    verboseMode: false,
    colorOutput: true,
  },
};
