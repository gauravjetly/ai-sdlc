/**
 * SQLite Audit Log Provider
 *
 * Stores audit events in SQLite for local production.
 * Implements the same interface as the integration AuditLogProvider.
 */

import { SQLiteProvider } from './sqlite-provider';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEvent {
  id: string;
  eventType: string;
  agentId?: string;
  taskId?: string;
  workflowId?: string;
  traceId?: string;
  details: Record<string, unknown>;
  success: boolean;
  error?: string;
  durationMs?: number;
  createdAt: string;
}

export interface AuditQueryFilters {
  eventType?: string;
  agentId?: string;
  workflowId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  success?: boolean;
}

export interface AuditSummary {
  totalEvents: number;
  successRate: number;
  eventTypes: Record<string, number>;
  agentActivity: Record<string, number>;
  recentErrors: AuditEvent[];
}

export class SQLiteAuditProvider {
  private db: SQLiteProvider;

  constructor(db: SQLiteProvider) {
    this.db = db;
  }

  /**
   * Log an audit event.
   */
  async log(event: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent> {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO audit_log (id, event_type, agent_id, task_id, workflow_id,
        trace_id, details, success, error, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        event.eventType,
        event.agentId ?? null,
        event.taskId ?? null,
        event.workflowId ?? null,
        event.traceId ?? null,
        JSON.stringify(event.details),
        event.success ? 1 : 0,
        event.error ?? null,
        event.durationMs ?? null,
        now,
      ]
    );

    return {
      id,
      ...event,
      createdAt: now,
    };
  }

  /**
   * Query audit events with filters.
   */
  async query(filters: AuditQueryFilters = {}): Promise<AuditEvent[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.eventType) {
      conditions.push('event_type = ?');
      params.push(filters.eventType);
    }

    if (filters.agentId) {
      conditions.push('agent_id = ?');
      params.push(filters.agentId);
    }

    if (filters.workflowId) {
      conditions.push('workflow_id = ?');
      params.push(filters.workflowId);
    }

    if (filters.from) {
      conditions.push('created_at >= ?');
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push('created_at <= ?');
      params.push(filters.to);
    }

    if (filters.success !== undefined) {
      conditions.push('success = ?');
      params.push(filters.success ? 1 : 0);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const result = this.db.query<Record<string, unknown>>(
      `SELECT * FROM audit_log ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return result.rows.map(row => this.rowToEvent(row));
  }

  /**
   * Get audit summary for a time period.
   */
  async getSummary(days: number = 7): Promise<AuditSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const totalResult = this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM audit_log WHERE created_at >= ?',
      [since]
    );

    const successResult = this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM audit_log WHERE created_at >= ? AND success = 1',
      [since]
    );

    const typeResult = this.db.query<{ event_type: string; count: number }>(
      `SELECT event_type, COUNT(*) as count FROM audit_log
       WHERE created_at >= ? GROUP BY event_type ORDER BY count DESC`,
      [since]
    );

    const agentResult = this.db.query<{ agent_id: string; count: number }>(
      `SELECT agent_id, COUNT(*) as count FROM audit_log
       WHERE created_at >= ? AND agent_id IS NOT NULL
       GROUP BY agent_id ORDER BY count DESC`,
      [since]
    );

    const errorResult = this.db.query<Record<string, unknown>>(
      `SELECT * FROM audit_log
       WHERE created_at >= ? AND success = 0
       ORDER BY created_at DESC LIMIT 10`,
      [since]
    );

    const total = totalResult?.count ?? 0;
    const successCount = successResult?.count ?? 0;

    const eventTypes: Record<string, number> = {};
    for (const row of typeResult.rows) {
      eventTypes[row.event_type] = row.count;
    }

    const agentActivity: Record<string, number> = {};
    for (const row of agentResult.rows) {
      agentActivity[row.agent_id] = row.count;
    }

    return {
      totalEvents: total,
      successRate: total > 0 ? successCount / total : 1,
      eventTypes,
      agentActivity,
      recentErrors: errorResult.rows.map(row => this.rowToEvent(row)),
    };
  }

  /**
   * Cleanup old audit events.
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoff = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const result = this.db.execute(
      'DELETE FROM audit_log WHERE created_at < ?',
      [cutoff]
    );

    return result.changes;
  }

  /**
   * Export audit events in a given format.
   */
  async exportEvents(
    filters: AuditQueryFilters,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const events = await this.query({ ...filters, limit: 10000 });

    if (format === 'csv') {
      const header = 'id,event_type,agent_id,workflow_id,success,error,created_at\n';
      const rows = events.map(e =>
        `"${e.id}","${e.eventType}","${e.agentId ?? ''}","${e.workflowId ?? ''}",${e.success},"${e.error ?? ''}","${e.createdAt}"`
      ).join('\n');
      return header + rows;
    }

    return JSON.stringify(events, null, 2);
  }

  private rowToEvent(row: Record<string, unknown>): AuditEvent {
    return {
      id: row.id as string,
      eventType: row.event_type as string,
      agentId: row.agent_id as string | undefined,
      taskId: row.task_id as string | undefined,
      workflowId: row.workflow_id as string | undefined,
      traceId: row.trace_id as string | undefined,
      details: this.parseJson(row.details as string),
      success: row.success === 1,
      error: row.error as string | undefined,
      durationMs: row.duration_ms as number | undefined,
      createdAt: row.created_at as string,
    };
  }

  private parseJson(value: string | null | undefined): Record<string, unknown> {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}
