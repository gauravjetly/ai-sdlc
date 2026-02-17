/**
 * aisdlc_get_config MCP Tool
 *
 * View the current AI-SDLC platform configuration.
 *
 * @module mcp-server/tools/config
 */

import { loadIntegrationConfig, IntegrationConfig } from '../../config';
import { GovernanceLevel, GOVERNANCE_LEVEL_NAMES } from '../../governance/types';

export const getConfigToolSchema = {
  name: 'aisdlc_get_config',
  description: 'View the current AI-SDLC platform configuration including governance level, classification settings, routing rules, and performance parameters.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      section: {
        type: 'string',
        enum: ['all', 'governance', 'classification', 'routing', 'phases', 'performance', 'ux'],
        description: 'Configuration section to view (default: all)',
      },
    },
    required: [],
  },
};

/**
 * Execute the get-config tool.
 */
export async function executeGetConfig(
  args: { section?: string },
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  try {
    const { config, warnings } = loadIntegrationConfig();
    const section = args.section || 'all';

    let result: Record<string, unknown>;

    if (section === 'all') {
      result = {
        ...config,
        governance: {
          ...config.governance,
          levelName: GOVERNANCE_LEVEL_NAMES[config.governance.level as GovernanceLevel],
        },
        _warnings: warnings.length > 0 ? warnings : undefined,
      };
    } else {
      const sectionData = (config as Record<string, unknown>)[section];
      if (sectionData === undefined) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: `Unknown section: ${section}` }),
          }],
          isError: true,
        };
      }
      result = {
        section,
        config: sectionData,
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Config retrieval failed: ${errorMsg}` }),
      }],
      isError: true,
    };
  }
}
