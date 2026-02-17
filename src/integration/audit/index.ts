/**
 * Audit Logging Module
 *
 * Phase 3: Persistent audit logging with in-memory and PostgreSQL support.
 *
 * @module audit
 */

export { AuditLogger, InMemoryAuditLogProvider } from './audit-logger';
export type { AuditLoggerConfig } from './audit-logger';

export { AuditExporter } from './audit-exporter';
export type { ExportFormat, ExportOptions, ExportResult } from './audit-exporter';

export type {
  AuditEvent,
  AuditEventInput,
  AuditEventType,
  AuditQueryFilters,
  AuditQueryResult,
  AuditSummary,
  AuditLogProvider,
} from './types';
