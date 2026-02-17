#!/usr/bin/env node
/**
 * AI-SDLC MCP Server
 *
 * Model Context Protocol server that exposes AI-SDLC capabilities as tools,
 * resources, and prompts within Claude Code.
 *
 * Transport: stdio (local process, no network exposure)
 *
 * Tools:
 * - aisdlc_classify: Classify a user request
 * - aisdlc_start_workflow: Start governed SDLC workflow
 * - aisdlc_review_code: Initiate code review
 * - aisdlc_ask_tom: Problem solving and root cause analysis
 * - aisdlc_get_status: Workflow status
 * - aisdlc_check_governance: Governance validation
 * - aisdlc_search_memory: Collective memory search
 * - aisdlc_get_config: Platform configuration
 *
 * Resources:
 * - aisdlc://registry: All tracked work items
 * - aisdlc://health: System health status
 * - aisdlc://config: Current configuration
 *
 * @see ADR-043 for the hybrid hooks + MCP architecture decision
 * @see ARCH-20260216-CLAUDE-AISDLC-INTEGRATION Section 3.2.4
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { HybridClassifier } from '../classifier';
import { SmartRouter } from '../router';
import { GovernanceEngine } from '../governance';
import { loadIntegrationConfig } from '../config';

// Tool implementations
import { classifyToolSchema, executeClassify } from './tools/classify';
import { startWorkflowToolSchema, executeStartWorkflow } from './tools/start-workflow';
import { reviewCodeToolSchema, executeReviewCode } from './tools/review-code';
import { askTomToolSchema, executeAskTom } from './tools/ask-tom';
import { getStatusToolSchema, executeGetStatus } from './tools/get-status';
import { checkGovernanceToolSchema, executeCheckGovernance } from './tools/check-governance';
import { searchMemoryToolSchema, executeSearchMemory } from './tools/search-memory';
import { getConfigToolSchema, executeGetConfig } from './tools/config';

// Resource implementations
import { registryResource, readRegistry } from './resources/registry';
import { healthResource, checkHealth } from './resources/health';
import { configResource, readConfig } from './resources/config-resource';

// Load configuration
const { config } = loadIntegrationConfig();

// Initialize Phase 1 components
const classifier = new HybridClassifier({
  tier1Enabled: config.classification.tier1Enabled,
  tier2Enabled: config.classification.tier2Enabled,
  cacheEnabled: config.performance.cacheClassifications,
});

const router = new SmartRouter({
  alwaysSDLCFor: config.routing.alwaysSDLCFor,
  neverSDLCFor: config.routing.neverSDLCFor,
  trivialMaxLength: config.routing.trivialMaxLength,
});

const governanceEngine = new GovernanceEngine({
  level: config.governance.level,
});

// Create MCP server
const server = new Server(
  {
    name: 'aisdlc-platform',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// === TOOLS ===

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    classifyToolSchema,
    startWorkflowToolSchema,
    reviewCodeToolSchema,
    askTomToolSchema,
    getStatusToolSchema,
    checkGovernanceToolSchema,
    searchMemoryToolSchema,
    getConfigToolSchema,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'aisdlc_classify':
      return executeClassify(
        args as { message: string; branch?: string; projectType?: string },
        classifier,
      );

    case 'aisdlc_start_workflow':
      return executeStartWorkflow(
        args as { description: string; type?: string; governance?: number; branch?: string },
        classifier,
        router,
        governanceEngine,
      );

    case 'aisdlc_review_code':
      return executeReviewCode(
        args as { path: string; type?: string; severity?: string },
      );

    case 'aisdlc_ask_tom':
      return executeAskTom(
        args as { problem: string; context?: string; urgency?: string },
      );

    case 'aisdlc_get_status':
      return executeGetStatus(
        args as { workflowId?: string },
      );

    case 'aisdlc_check_governance':
      return executeCheckGovernance(
        args as { message?: string; branch?: string; setLevel?: number },
        classifier,
        governanceEngine,
      );

    case 'aisdlc_search_memory':
      return executeSearchMemory(
        args as { query: string; category?: string },
      );

    case 'aisdlc_get_config':
      return executeGetConfig(
        args as { section?: string },
      );

    default:
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ error: `Unknown tool: ${name}` }),
        }],
        isError: true,
      };
  }
});

// === RESOURCES ===

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    registryResource,
    healthResource,
    configResource,
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'aisdlc://registry':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: readRegistry(),
        }],
      };

    case 'aisdlc://health':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: checkHealth(),
        }],
      };

    case 'aisdlc://config':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: readConfig(),
        }],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// === PROMPTS ===

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'aisdlc_start',
      description: 'Start a governed SDLC workflow for a new feature, bug fix, or change',
      arguments: [
        { name: 'description', description: 'What needs to be built or changed', required: true },
      ],
    },
    {
      name: 'aisdlc_review',
      description: 'Review code for quality, security, or both',
      arguments: [
        { name: 'path', description: 'File or directory to review', required: true },
        { name: 'type', description: 'Review type: security, quality, or full', required: false },
      ],
    },
    {
      name: 'aisdlc_status',
      description: 'Check the status of active and recent SDLC workflows',
      arguments: [],
    },
    {
      name: 'aisdlc_config',
      description: 'View or modify the AI-SDLC platform configuration',
      arguments: [
        { name: 'section', description: 'Config section to view', required: false },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'aisdlc_start':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Start an SDLC workflow for: ${args?.description || 'a new feature'}\n\nUse the aisdlc_start_workflow tool with this description.`,
          },
        }],
      };

    case 'aisdlc_review':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Review the code at: ${args?.path || 'src/'}\nReview type: ${args?.type || 'full'}\n\nUse the aisdlc_review_code tool.`,
          },
        }],
      };

    case 'aisdlc_status':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: 'Check the status of all SDLC workflows.\n\nUse the aisdlc_get_status tool.',
          },
        }],
      };

    case 'aisdlc_config':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `View AI-SDLC configuration${args?.section ? ` (section: ${args.section})` : ''}.\n\nUse the aisdlc_get_config tool.`,
          },
        }],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// === START SERVER ===

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup (to stderr so it does not interfere with MCP protocol on stdout)
  console.error('[aisdlc-platform] MCP server started');
  console.error(`[aisdlc-platform] Governance level: ${config.governance.level}`);
  console.error(`[aisdlc-platform] Tools: 8, Resources: 3, Prompts: 4`);
}

main().catch((error) => {
  console.error('[aisdlc-platform] Fatal error:', error);
  process.exit(1);
});
