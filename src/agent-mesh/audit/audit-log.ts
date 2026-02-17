/**
 * Audit Log
 *
 * Complete audit trail for all inter-agent communication,
 * knowledge sharing, and learning events. Provides
 * observability and debuggability for the agent mesh.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentId,
  AuditEntry,
  AuditEventType,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
} from '../types';

export interface AuditSearchOptions {
  eventType?: AuditEventType;
  agentId?: AgentId;
  startTime?: string;
  endTime?: string;
  success?: boolean;
  messageId?: string;
  limit?: number;
}

export interface AuditStats {
  totalEvents: number;
  byEventType: Record<string, number>;
  byAgent: Record<string, number>;
  successRate: number;
  averageDuration: number;
  recentErrors: AuditEntry[];
}

export class AuditLog {
  private basePath: string;
  private config: AgentMeshConfig;

  constructor(config: Partial<AgentMeshConfig> = {}) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.basePath = path.join(
      this.config.basePath.replace('~', os.homedir()),
      'audit'
    );
  }

  /**
   * Initialize audit log storage
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
    console.log('[AuditLog] Initialized');
  }

  /**
   * Record an audit event
   */
  async record(
    eventType: AuditEventType,
    agentId: AgentId,
    details: Record<string, any>,
    options?: {
      targetAgentId?: AgentId;
      messageId?: string;
      success?: boolean;
      error?: string;
      duration?: number;
    }
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType,
      agentId,
      targetAgentId: options?.targetAgentId,
      messageId: options?.messageId,
      details,
      success: options?.success !== undefined ? options.success : true,
      error: options?.error,
      duration: options?.duration,
    };

    // Write to date-partitioned file
    const date = new Date().toISOString().split('T')[0];
    const dirPath = path.join(this.basePath, date);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${entry.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');

    return entry;
  }

  /**
   * Search audit entries
   */
  async search(options: AuditSearchOptions = {}): Promise<AuditEntry[]> {
    const results: AuditEntry[] = [];

    // Determine date range
    const startDate = options.startTime
      ? new Date(options.startTime).toISOString().split('T')[0]
      : this.getDateDaysAgo(7);
    const endDate = options.endTime
      ? new Date(options.endTime).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Read date directories
    try {
      const dirs = await fs.readdir(this.basePath, { withFileTypes: true });
      const dateDirs = dirs
        .filter((d) => d.isDirectory() && d.name >= startDate && d.name <= endDate)
        .map((d) => d.name);

      for (const dateDir of dateDirs) {
        const dirPath = path.join(this.basePath, dateDir);
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const content = await fs.readFile(
            path.join(dirPath, file),
            'utf-8'
          );
          const entry: AuditEntry = JSON.parse(content);

          // Apply filters
          if (options.eventType && entry.eventType !== options.eventType) continue;
          if (options.agentId && entry.agentId !== options.agentId) continue;
          if (options.success !== undefined && entry.success !== options.success) continue;
          if (options.messageId && entry.messageId !== options.messageId) continue;

          results.push(entry);
        }
      }
    } catch {
      // Audit directory may not exist yet
    }

    // Sort by timestamp (newest first)
    results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit
    const limit = options.limit || 100;
    return results.slice(0, limit);
  }

  /**
   * Get audit statistics
   */
  async getStats(days: number = 7): Promise<AuditStats> {
    const entries = await this.search({
      startTime: new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString(),
      limit: 10000,
    });

    const byEventType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let successCount = 0;
    let totalDuration = 0;
    let durationCount = 0;
    const recentErrors: AuditEntry[] = [];

    for (const entry of entries) {
      byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
      byAgent[entry.agentId] = (byAgent[entry.agentId] || 0) + 1;

      if (entry.success) successCount++;

      if (entry.duration) {
        totalDuration += entry.duration;
        durationCount++;
      }

      if (!entry.success && recentErrors.length < 10) {
        recentErrors.push(entry);
      }
    }

    return {
      totalEvents: entries.length,
      byEventType,
      byAgent,
      successRate: entries.length > 0 ? successCount / entries.length : 1,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      recentErrors,
    };
  }

  /**
   * Get communication activity between agents
   */
  async getCommunicationGraph(days: number = 7): Promise<
    Array<{
      source: AgentId;
      target: AgentId;
      messageCount: number;
      lastCommunication: string;
    }>
  > {
    const entries = await this.search({
      eventType: 'message-sent',
      startTime: new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString(),
      limit: 10000,
    });

    const edgeMap = new Map<
      string,
      { source: AgentId; target: AgentId; messageCount: number; lastCommunication: string }
    >();

    for (const entry of entries) {
      if (!entry.targetAgentId) continue;

      const key = `${entry.agentId}->${entry.targetAgentId}`;
      const existing = edgeMap.get(key);

      if (existing) {
        existing.messageCount++;
        if (entry.timestamp > existing.lastCommunication) {
          existing.lastCommunication = entry.timestamp;
        }
      } else {
        edgeMap.set(key, {
          source: entry.agentId,
          target: entry.targetAgentId,
          messageCount: 1,
          lastCommunication: entry.timestamp,
        });
      }
    }

    return Array.from(edgeMap.values()).sort(
      (a, b) => b.messageCount - a.messageCount
    );
  }

  /**
   * Generate a human-readable audit report
   */
  async generateReport(days: number = 7): Promise<string> {
    const stats = await this.getStats(days);
    const graph = await this.getCommunicationGraph(days);

    let report = `# Agent Mesh Audit Report\n\n`;
    report += `**Period**: Last ${days} days\n`;
    report += `**Generated**: ${new Date().toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Events**: ${stats.totalEvents}\n`;
    report += `- **Success Rate**: ${(stats.successRate * 100).toFixed(1)}%\n`;
    report += `- **Average Duration**: ${stats.averageDuration.toFixed(0)}ms\n\n`;

    report += `## Events by Type\n\n`;
    report += `| Event Type | Count |\n|---|---|\n`;
    for (const [type, count] of Object.entries(stats.byEventType)) {
      report += `| ${type} | ${count} |\n`;
    }

    report += `\n## Events by Agent\n\n`;
    report += `| Agent | Count |\n|---|---|\n`;
    for (const [agent, count] of Object.entries(stats.byAgent)) {
      report += `| ${agent} | ${count} |\n`;
    }

    report += `\n## Communication Graph\n\n`;
    report += `| Source | Target | Messages | Last Communication |\n|---|---|---|---|\n`;
    for (const edge of graph.slice(0, 20)) {
      report += `| ${edge.source} | ${edge.target} | ${edge.messageCount} | ${edge.lastCommunication.split('T')[0]} |\n`;
    }

    if (stats.recentErrors.length > 0) {
      report += `\n## Recent Errors\n\n`;
      for (const error of stats.recentErrors) {
        report += `- **${error.timestamp}**: ${error.eventType} by ${error.agentId}`;
        if (error.error) report += ` - ${error.error}`;
        report += `\n`;
      }
    }

    return report;
  }

  /**
   * Clean up old audit entries
   */
  async cleanup(): Promise<number> {
    const cutoffDate = this.getDateDaysAgo(this.config.auditRetentionDays);
    let cleaned = 0;

    try {
      const dirs = await fs.readdir(this.basePath, { withFileTypes: true });

      for (const dir of dirs) {
        if (dir.isDirectory() && dir.name < cutoffDate) {
          const dirPath = path.join(this.basePath, dir.name);
          const files = await fs.readdir(dirPath);

          for (const file of files) {
            await fs.unlink(path.join(dirPath, file));
            cleaned++;
          }
          await fs.rmdir(dirPath);
        }
      }
    } catch {
      // Audit directory may not exist
    }

    if (cleaned > 0) {
      console.log(`[AuditLog] Cleaned ${cleaned} entries older than ${cutoffDate}`);
    }

    return cleaned;
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}
