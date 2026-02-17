/**
 * Hook-to-MCP Bridge
 *
 * Connects the Claude Code hook layer to the MCP server layer.
 * Provides shared state between hooks (which run as separate processes)
 * and the MCP server (which runs as a persistent process).
 *
 * Communication is via file-based IPC using a shared state directory.
 *
 * @module bridge/hook-mcp-bridge
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RequestClassification } from '../classifier/types';
import { RoutingDecision } from '../router/types';
import { GovernanceDecision } from '../governance/types';

/**
 * Shared state directory for hook-MCP communication.
 */
const BRIDGE_DIR = path.join(os.homedir(), '.aisdlc', 'bridge');

/**
 * A bridge message passed between hook and MCP layers.
 */
export interface BridgeMessage {
  id: string;
  timestamp: string;
  source: 'hook' | 'mcp';
  type: 'classification' | 'routing' | 'governance' | 'workflow-start' | 'workflow-complete';
  payload: Record<string, unknown>;
}

/**
 * A cached classification shared between hook and MCP.
 */
export interface SharedClassification {
  messageHash: string;
  classification: RequestClassification;
  route: RoutingDecision;
  governance: GovernanceDecision;
  timestamp: string;
  ttl: number;
}

/**
 * HookMCPBridge manages shared state between hooks and MCP server.
 */
export class HookMCPBridge {
  private readonly bridgeDir: string;
  private readonly cacheDir: string;
  private readonly messageDir: string;

  constructor(bridgeDir?: string) {
    this.bridgeDir = bridgeDir || BRIDGE_DIR;
    this.cacheDir = path.join(this.bridgeDir, 'cache');
    this.messageDir = path.join(this.bridgeDir, 'messages');

    this.ensureDirectories();
  }

  /**
   * Store a classification result for the MCP server to retrieve.
   */
  storeClassification(shared: SharedClassification): void {
    const filePath = path.join(this.cacheDir, `${shared.messageHash}.json`);
    fs.writeFileSync(filePath, JSON.stringify(shared, null, 2));
  }

  /**
   * Retrieve a cached classification by message hash.
   */
  getClassification(messageHash: string): SharedClassification | null {
    const filePath = path.join(this.cacheDir, `${messageHash}.json`);

    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const shared = JSON.parse(content) as SharedClassification;

      // Check TTL
      const age = Date.now() - new Date(shared.timestamp).getTime();
      if (age > shared.ttl) {
        fs.unlinkSync(filePath);
        return null;
      }

      return shared;
    } catch {
      return null;
    }
  }

  /**
   * Send a message from hook to MCP (or vice versa).
   */
  sendMessage(message: BridgeMessage): void {
    const filePath = path.join(this.messageDir, `${message.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(message, null, 2));
  }

  /**
   * Read pending messages for a target (hook or mcp).
   */
  readMessages(target: 'hook' | 'mcp', limit = 50): BridgeMessage[] {
    if (!fs.existsSync(this.messageDir)) return [];

    const files = fs.readdirSync(this.messageDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .slice(0, limit);

    const messages: BridgeMessage[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.messageDir, file), 'utf-8');
        const message = JSON.parse(content) as BridgeMessage;
        // Only return messages FROM the other side
        if (message.source !== target) {
          messages.push(message);
        }
      } catch {
        // Skip corrupt files
      }
    }

    return messages;
  }

  /**
   * Acknowledge (delete) a processed message.
   */
  acknowledgeMessage(messageId: string): void {
    const filePath = path.join(this.messageDir, `${messageId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Clean up expired cache entries.
   */
  cleanupCache(): number {
    if (!fs.existsSync(this.cacheDir)) return 0;

    let cleaned = 0;
    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.cacheDir, file), 'utf-8');
        const shared = JSON.parse(content) as SharedClassification;
        const age = Date.now() - new Date(shared.timestamp).getTime();

        if (age > shared.ttl) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          cleaned++;
        }
      } catch {
        // Delete corrupt files
        try {
          fs.unlinkSync(path.join(this.cacheDir, file));
          cleaned++;
        } catch {
          // Ignore
        }
      }
    }

    return cleaned;
  }

  /**
   * Get bridge statistics.
   */
  getStats(): {
    cachedClassifications: number;
    pendingMessages: number;
    bridgeDir: string;
  } {
    let cachedClassifications = 0;
    let pendingMessages = 0;

    try {
      if (fs.existsSync(this.cacheDir)) {
        cachedClassifications = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json')).length;
      }
      if (fs.existsSync(this.messageDir)) {
        pendingMessages = fs.readdirSync(this.messageDir).filter(f => f.endsWith('.json')).length;
      }
    } catch {
      // Ignore read errors
    }

    return {
      cachedClassifications,
      pendingMessages,
      bridgeDir: this.bridgeDir,
    };
  }

  /**
   * Ensure bridge directories exist.
   */
  private ensureDirectories(): void {
    for (const dir of [this.bridgeDir, this.cacheDir, this.messageDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
}

/**
 * Singleton bridge instance.
 */
let bridgeInstance: HookMCPBridge | null = null;

/**
 * Get or create the singleton bridge instance.
 */
export function getBridge(bridgeDir?: string): HookMCPBridge {
  if (!bridgeInstance) {
    bridgeInstance = new HookMCPBridge(bridgeDir);
  }
  return bridgeInstance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetBridge(): void {
  bridgeInstance = null;
}
