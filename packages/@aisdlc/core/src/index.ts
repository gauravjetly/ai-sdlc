/**
 * @aisdlc/core - Shared types, constants, and utilities
 *
 * This package provides the foundational types and configuration
 * used across all AI-SDLC platform packages.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================
// Constants
// ============================================================

export const AISDLC_VERSION = '4.0.0';
export const AISDLC_DIR_NAME = '.aisdlc';
export const DEFAULT_DASHBOARD_PORT = 3030;
export const DEFAULT_DB_FILENAME = 'platform.db';
export const PID_FILENAME = 'dashboard.pid';

/**
 * Get the platform home directory (~/.aisdlc/)
 */
export function getAisdlcHome(): string {
  return path.join(os.homedir(), AISDLC_DIR_NAME);
}

/**
 * Get the data directory (~/.aisdlc/data/)
 */
export function getDataDir(): string {
  return path.join(getAisdlcHome(), 'data');
}

/**
 * Get the database file path (~/.aisdlc/data/platform.db)
 */
export function getDatabasePath(): string {
  return path.join(getDataDir(), DEFAULT_DB_FILENAME);
}

/**
 * Get the config file path (~/.aisdlc/config.json)
 */
export function getConfigPath(): string {
  return path.join(getAisdlcHome(), 'config.json');
}

/**
 * Get the logs directory (~/.aisdlc/logs/)
 */
export function getLogsDir(): string {
  return path.join(getAisdlcHome(), 'logs');
}

/**
 * Get the PID file path (~/.aisdlc/dashboard.pid)
 */
export function getPidPath(): string {
  return path.join(getAisdlcHome(), PID_FILENAME);
}

// ============================================================
// Types
// ============================================================

export type StorageProvider = 'file' | 'sqlite' | 'postgres';
export type EventBusProvider = 'file' | 'memory' | 'bullmq';

export interface PlatformConfig {
  version: string;
  storage: StorageProvider;
  eventBus: EventBusProvider;
  dashboard: {
    port: number;
    host: string;
  };
  database: {
    path: string;
  };
  governance: {
    level: number;
    requireApproval: boolean;
  };
  agents: {
    definitions: string;
  };
  hooks: {
    installed: boolean;
    path: string;
  };
  mcp: {
    configured: boolean;
  };
  initialized: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  version: AISDLC_VERSION,
  storage: 'sqlite',
  eventBus: 'file',
  dashboard: {
    port: DEFAULT_DASHBOARD_PORT,
    host: 'localhost',
  },
  database: {
    path: getDatabasePath(),
  },
  governance: {
    level: 1,
    requireApproval: false,
  },
  agents: {
    definitions: path.join(os.homedir(), '.claude', 'agents'),
  },
  hooks: {
    installed: false,
    path: path.join(os.homedir(), '.claude', 'hooks'),
  },
  mcp: {
    configured: false,
  },
  initialized: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================
// Agent Types
// ============================================================

export type AgentId =
  | 'conductor'
  | 'ba'
  | 'architect'
  | 'ux'
  | 'engineer'
  | 'security'
  | 'qa'
  | 'customer'
  | 'atlas'
  | 'ask-tom'
  | 'tracker'
  | 'finops';

export const ALL_AGENT_IDS: AgentId[] = [
  'conductor',
  'ba',
  'architect',
  'ux',
  'engineer',
  'security',
  'qa',
  'customer',
  'atlas',
  'ask-tom',
  'tracker',
  'finops',
];

export const AGENT_NAMES: Record<AgentId, string> = {
  conductor: 'Conductor',
  ba: 'Business Analyst',
  architect: 'Architect (Jets)',
  ux: 'UX Designer',
  engineer: 'Software Engineer',
  security: 'Security Agent',
  qa: 'QA Agent',
  customer: 'Customer Agent',
  atlas: 'Atlas (DevOps/SRE)',
  'ask-tom': 'Ask Tom (Problem Solver)',
  tracker: 'Tracker',
  finops: 'FinOps Agent',
};

export const AGENT_MODELS: Record<AgentId, string> = {
  conductor: 'opus',
  ba: 'sonnet',
  architect: 'opus',
  ux: 'sonnet',
  engineer: 'sonnet',
  security: 'sonnet',
  qa: 'sonnet',
  customer: 'sonnet',
  atlas: 'sonnet',
  'ask-tom': 'opus',
  tracker: 'haiku',
  finops: 'sonnet',
};

// ============================================================
// Health Check Types
// ============================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  duration?: number;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  overall: HealthStatus;
  timestamp: string;
  checks: HealthCheck[];
  platform: {
    version: string;
    node: string;
    os: string;
    arch: string;
  };
}

// ============================================================
// Configuration Helpers
// ============================================================

/**
 * Load platform configuration from disk
 */
export function loadConfig(): PlatformConfig {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_PLATFORM_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PLATFORM_CONFIG };
    }
  }
  return { ...DEFAULT_PLATFORM_CONFIG };
}

/**
 * Save platform configuration to disk
 */
export function saveConfig(config: PlatformConfig): void {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [
    getAisdlcHome(),
    getDataDir(),
    getLogsDir(),
    path.join(getAisdlcHome(), 'agents'),
    path.join(getAisdlcHome(), 'backups'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
