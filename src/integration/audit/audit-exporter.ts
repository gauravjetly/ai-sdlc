/**
 * Audit Exporter
 *
 * Exports audit events to CSV and JSON formats for compliance reporting.
 * Supports filtering, date ranges, and streaming for large datasets.
 *
 * Part of Phase 3: Persistent Audit Logging.
 *
 * @module audit/audit-exporter
 */

import { AuditEvent, AuditQueryFilters } from './types';
import { AuditLogger } from './audit-logger';

/**
 * Export format options.
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Options for audit export.
 */
export interface ExportOptions {
  /** Export format. Default: csv */
  format?: ExportFormat;
  /** Query filters for the export */
  filters?: AuditQueryFilters;
  /** Include metadata in export. Default: false */
  includeMetadata?: boolean;
  /** CSV delimiter. Default: , */
  delimiter?: string;
  /** Include header row in CSV. Default: true */
  includeHeader?: boolean;
}

/**
 * Result of an audit export.
 */
export interface ExportResult {
  /** The exported data as a string */
  data: string;
  /** The format of the export */
  format: ExportFormat;
  /** Number of events exported */
  eventCount: number;
  /** Export timestamp */
  exportedAt: string;
  /** Filters applied */
  filters: AuditQueryFilters;
}

/** CSV column definitions. */
const CSV_COLUMNS = [
  'id',
  'timestamp',
  'eventType',
  'userId',
  'requestId',
  'workflowId',
  'approvalStatus',
  'bypassTokenUsed',
] as const;

/** Extended CSV columns when metadata is included. */
const CSV_COLUMNS_WITH_METADATA = [
  ...CSV_COLUMNS,
  'classification',
  'routing',
  'governanceDecision',
  'metadata',
] as const;

/**
 * AuditExporter exports audit events to CSV and JSON formats.
 */
export class AuditExporter {
  private readonly logger: AuditLogger;

  constructor(logger: AuditLogger) {
    this.logger = logger;
  }

  /**
   * Export audit events to the specified format.
   *
   * @param options - Export options
   * @returns The export result
   */
  async export(options: ExportOptions = {}): Promise<ExportResult> {
    const format = options.format ?? 'csv';
    const filters: AuditQueryFilters = {
      ...options.filters,
      limit: options.filters?.limit ?? 10000, // Default higher limit for exports
    };

    const queryResult = await this.logger.query(filters);

    let data: string;
    if (format === 'csv') {
      data = this.toCSV(queryResult.events, options);
    } else {
      data = this.toJSON(queryResult.events, options);
    }

    return {
      data,
      format,
      eventCount: queryResult.events.length,
      exportedAt: new Date().toISOString(),
      filters,
    };
  }

  /**
   * Export audit events to CSV format.
   *
   * @param filters - Query filters
   * @returns CSV string
   */
  async exportToCSV(filters?: AuditQueryFilters): Promise<string> {
    const result = await this.export({
      format: 'csv',
      filters,
      includeHeader: true,
    });
    return result.data;
  }

  /**
   * Export audit events to JSON format.
   *
   * @param filters - Query filters
   * @returns JSON string
   */
  async exportToJSON(filters?: AuditQueryFilters): Promise<string> {
    const result = await this.export({
      format: 'json',
      filters,
    });
    return result.data;
  }

  /**
   * Convert events to CSV format.
   */
  private toCSV(events: AuditEvent[], options: ExportOptions): string {
    const delimiter = options.delimiter ?? ',';
    const columns = options.includeMetadata ? CSV_COLUMNS_WITH_METADATA : CSV_COLUMNS;
    const lines: string[] = [];

    // Header
    if (options.includeHeader !== false) {
      lines.push(columns.join(delimiter));
    }

    // Data rows
    for (const event of events) {
      const values = columns.map((col) => {
        const value = event[col as keyof AuditEvent];
        return this.csvEscapeValue(value, delimiter);
      });
      lines.push(values.join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Convert events to JSON format.
   */
  private toJSON(events: AuditEvent[], options: ExportOptions): string {
    if (!options.includeMetadata) {
      // Strip detailed metadata for compact export
      const compact = events.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.eventType,
        userId: event.userId,
        requestId: event.requestId,
        workflowId: event.workflowId,
        approvalStatus: event.approvalStatus,
        bypassTokenUsed: event.bypassTokenUsed,
      }));
      return JSON.stringify(compact, null, 2);
    }
    return JSON.stringify(events, null, 2);
  }

  /**
   * Escape a value for CSV format.
   */
  private csvEscapeValue(value: unknown, delimiter: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      const json = JSON.stringify(value);
      return `"${json.replace(/"/g, '""')}"`;
    }

    const str = String(value);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}
