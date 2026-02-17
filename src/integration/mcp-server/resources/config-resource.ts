/**
 * aisdlc://config Resource
 *
 * MCP resource providing current configuration.
 *
 * @module mcp-server/resources/config-resource
 */

import { loadIntegrationConfig } from '../../config';
import { GOVERNANCE_LEVEL_NAMES } from '../../governance/types';
import { GovernanceLevel } from '../../governance/types';

export const configResource = {
  uri: 'aisdlc://config',
  name: 'Platform Configuration',
  description: 'Current AI-SDLC platform configuration and settings',
  mimeType: 'application/json',
};

/**
 * Read current configuration.
 */
export function readConfig(): string {
  try {
    const { config, warnings } = loadIntegrationConfig();
    return JSON.stringify({
      ...config,
      governance: {
        ...config.governance,
        levelName: GOVERNANCE_LEVEL_NAMES[config.governance.level as GovernanceLevel],
      },
      _warnings: warnings.length > 0 ? warnings : undefined,
    }, null, 2);
  } catch {
    return JSON.stringify({ error: 'Failed to load configuration' });
  }
}
