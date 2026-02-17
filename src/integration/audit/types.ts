/**
 * Audit Logging Types
 *
 * Defines the event types, filters, and interfaces for the audit logging system.
 * Supports both in-memory (development) and PostgreSQL (production) storage.
 *
 * Part of Phase 3: Persistent Audit Logging.
 *
 * @module audit/types
 */

/**
 * Types of audit events that can be logged.
 */
export type AuditEventType =
  | 'classification'
  | 'routing_decision'
  | 'governance_decision'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'bypass_token_generated'
  | 'bypass_token_used'
  | 'bypass_token_rejected'
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'phase_started'
  | 'phase_completed'
  | 'phase_failed'
  | 'config_changed'
  | 'system_error';

/**
 * A single audit event.
 */
export interface AuditEvent {
  /** Unique identifier */
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Type of event */
  eventType: AuditEventType;
  /** User who triggered the event */
  userId: string | null;
  /** Associated request ID */
  requestId: string | null;
  /** Associated workflow ID */
  workflowId: string | null;
  /** Classification data (if applicable) */
  classification: Record<string, unknown> | null;
  /** Routing data (if applicable) */
  routing: Record<string, unknown> | null;
  /** Governance decision data (if applicable) */
  governanceDecision: Record<string, unknown> | null;
  /** Approval status (if applicable) */
  approvalStatus: string | null;
  /** Whether a bypass token was used */
  bypassTokenUsed: boolean;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** When the event was created (separate from event timestamp) */
  createdAt: string;
}

/**
 * Input for creating an audit event.
 */
export interface AuditEventInput {
  eventType: AuditEventType;
  userId?: string;
  requestId?: string;
  workflowId?: string;
  classification?: Record<string, unknown>;
  routing?: Record<string, unknown>;
  governanceDecision?: Record<string, unknown>;
  approvalStatus?: string;
  bypassTokenUsed?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Filters for querying audit events.
 */
export interface AuditQueryFilters {
  /** Start date (inclusive) */
  startDate?: Date;
  /** End date (inclusive) */
  endDate?: Date;
  /** Filter by workflow ID */
  workflowId?: string;
  /** Filter by user ID */
  userId?: string;
  /** Filter by event type */
  eventType?: AuditEventType;
  /** Filter by event types (multiple) */
  eventTypes?: AuditEventType[];
  /** Filter by approval status */
  approvalStatus?: string;
  /** Filter by bypass token usage */
  bypassTokenUsed?: boolean;
  /** Pagination: offset */
  offset?: number;
  /** Pagination: limit */
  limit?: number;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of an audit query.
 */
export interface AuditQueryResult {
  /** Matching events */
  events: AuditEvent[];
  /** Total count (before pagination) */
  totalCount: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Query metadata */
  query: {
    filters: AuditQueryFilters;
    executionTimeMs: number;
  };
}

/**
 * Summary statistics for audit events.
 */
export interface AuditSummary {
  /** Total events */
  totalEvents: number;
  /** Events by type */
  eventsByType: Record<string, number>;
  /** Events by approval status */
  eventsByApprovalStatus: Record<string, number>;
  /** Bypass token usage count */
  bypassTokenUsageCount: number;
  /** Date range */
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

/**
 * Interface for audit log storage providers.
 */
export interface AuditLogProvider {
  /** Log an event */
  log(event: AuditEvent): Promise<void>;
  /** Query events */
  query(filters: AuditQueryFilters): Promise<AuditQueryResult>;
  /** Get summary statistics */
  getSummary(filters?: Partial<AuditQueryFilters>): Promise<AuditSummary>;
  /** Get a single event by ID */
  getById(id: string): Promise<AuditEvent | null>;
  /** Provider name */
  readonly name: string;
}
