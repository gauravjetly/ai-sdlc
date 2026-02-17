/**
 * aisdlc://health Resource
 *
 * MCP resource providing system health status.
 *
 * @module mcp-server/resources/health
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const healthResource = {
  uri: 'aisdlc://health',
  name: 'System Health',
  description: 'AI-SDLC platform health status and diagnostics',
  mimeType: 'application/json',
};

/**
 * Check system health.
 */
export function checkHealth(): string {
  const checks: Record<string, { status: string; details?: string }> = {};

  // Check config directory
  const configDir = path.join(os.homedir(), '.aisdlc');
  checks['config-directory'] = {
    status: fs.existsSync(configDir) ? 'healthy' : 'missing',
    details: configDir,
  };

  // Check registry directory
  const registryDir = path.join(configDir, 'registry');
  checks['registry-directory'] = {
    status: fs.existsSync(registryDir) ? 'healthy' : 'missing',
    details: registryDir,
  };

  // Check agent memory
  const memoryDir = path.join(os.homedir(), '.claude', 'agent-memory');
  checks['agent-memory'] = {
    status: fs.existsSync(memoryDir) ? 'healthy' : 'missing',
    details: memoryDir,
  };

  // Check SDLC registry
  const sdlcRegistry = path.join(os.homedir(), '.claude', 'sdlc-registry');
  checks['sdlc-registry'] = {
    status: fs.existsSync(sdlcRegistry) ? 'healthy' : 'missing',
    details: sdlcRegistry,
  };

  // Overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  return JSON.stringify({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    platform: {
      os: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
    },
  }, null, 2);
}
