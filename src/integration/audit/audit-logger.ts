/**
 * Audit Logger
 *
 * The primary interface for logging audit events. Supports both
 * in-memory storage (development) and pluggable providers for
 * PostgreSQL (production).
 *
 * Features:
 * - Batched writes for performance
 * - Graceful failure handling
 * - Event buffering during provider unavailability
 * - Tamper-evident hash chain for Level 4
 *
 * Part of Phase 3: Persistent Audit Logging.
 *
 * @module audit/audit-logger
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  AuditEvent,
  AuditEventInput,
  AuditEventType,
  AuditQueryFilters,
  AuditQueryResult,
  AuditSummary,
  AuditLogProvider,
} from './types';

/**
 * Configuration for the audit logger.
 */
export interface AuditLoggerConfig {
  /** Storage provider. Defaults to in-memory. */
  provider?: AuditLogProvider;
  /** Enable batch writes. Default: true */
  batchEnabled?: boolean;
  /** Batch size before flush. Default: 10 */
  batchSize?: number;
  /** Batch flush interval in ms. Default: 5000 */
  batchFlushIntervalMs?: number;
  /** Enable tamper-evident hash chain. Default: false (true for Level 4) */
  hashChainEnabled?: boolean;
  /** Maximum buffer size when provider is unavailable. Default: 1000 */
  maxBufferSize?: number;
}

/**
 * In-memory audit log provider for development and testing.
 *
 * Events are stored in insertion order with a monotonic sequence number
 * to guarantee deterministic sort behavior even when timestamps are identical.
 */
export class InMemoryAuditLogProvider implements AuditLogProvider {
  readonly name = 'in-memory';
  private events: Array<AuditEvent & { _insertionOrder: number }> = [];
  private nextOrder: number = 0;

  async log(event: AuditEvent): Promise<void> {
    this.events.push({ ...event, _insertionOrder: this.nextOrder++ });
  }

  async query(filters: AuditQueryFilters): Promise<AuditQueryResult> {
    const start = Date.now();
    let filtered = [...this.events];

    if (filters.startDate) {
      filtered = filtered.filter((e) => new Date(e.timestamp) >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter((e) => new Date(e.timestamp) <= filters.endDate!);
    }
    if (filters.workflowId) {
      filtered = filtered.filter((e) => e.workflowId === filters.workflowId);
    }
    if (filters.userId) {
      filtered = filtered.filter((e) => e.userId === filters.userId);
    }
    if (filters.eventType) {
      filtered = filtered.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      filtered = filtered.filter((e) => filters.eventTypes!.includes(e.eventType));
    }
    if (filters.approvalStatus) {
      filtered = filtered.filter((e) => e.approvalStatus === filters.approvalStatus);
    }
    if (filters.bypassTokenUsed !== undefined) {
      filtered = filtered.filter((e) => e.bypassTokenUsed === filters.bypassTokenUsed);
    }

    // Sort by timestamp with insertion order as tiebreaker for determinism
    const sortOrder = filters.sortOrder ?? 'desc';
    filtered.sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (diff !== 0) {
        return sortOrder === 'asc' ? diff : -diff;
      }
      // Tiebreaker: use insertion order for stable sort when timestamps match
      return sortOrder === 'asc'
        ? a._insertionOrder - b._insertionOrder
        : b._insertionOrder - a._insertionOrder;
    });

    const totalCount = filtered.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    // Strip internal _insertionOrder before returning
    const cleanedEvents: AuditEvent[] = paged.map(({ _insertionOrder, ...event }) => event);

    return {
      events: cleanedEvents,
      totalCount,
      hasMore: offset + limit < totalCount,
      query: {
        filters,
        executionTimeMs: Date.now() - start,
      },
    };
  }

  async getSummary(filters?: Partial<AuditQueryFilters>): Promise<AuditSummary> {
    let events = [...this.events];

    if (filters?.startDate) {
      events = events.filter((e) => new Date(e.timestamp) >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter((e) => new Date(e.timestamp) <= filters.endDate!);
    }

    const eventsByType: Record<string, number> = {};
    const eventsByApprovalStatus: Record<string, number> = {};
    let bypassTokenUsageCount = 0;

    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
      if (event.approvalStatus) {
        eventsByApprovalStatus[event.approvalStatus] =
          (eventsByApprovalStatus[event.approvalStatus] ?? 0) + 1;
      }
      if (event.bypassTokenUsed) {
        bypassTokenUsageCount++;
      }
    }

    const sorted = events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByApprovalStatus,
      bypassTokenUsageCount,
      dateRange: {
        earliest: sorted.length > 0 ? sorted[0].timestamp : null,
        latest: sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null,
      },
    };
  }

  async getById(id: string): Promise<AuditEvent | null> {
    const found = this.events.find((e) => e.id === id);
    if (!found) return null;
    const { _insertionOrder, ...event } = found;
    return event;
  }

  /**
   * Get all events (for testing).
   */
  getAll(): AuditEvent[] {
    return this.events.map(({ _insertionOrder, ...event }) => event);
  }

  /**
   * Clear all events (for testing).
   */
  clear(): void {
    this.events = [];
    this.nextOrder = 0;
  }
}

/**
 * AuditLogger provides a reliable, high-performance audit logging system.
 *
 * Features:
 * - Batched writes for performance (configurable)
 * - Event buffering when provider is unavailable
 * - Tamper-evident hash chain for Level 4 compliance
 * - Query interface with pagination
 * - Export capabilities
 */
export class AuditLogger {
  private readonly provider: AuditLogProvider;
  private readonly batchEnabled: boolean;
  private readonly batchSize: number;
  private readonly batchFlushIntervalMs: number;
  private readonly hashChainEnabled: boolean;
  private readonly maxBufferSize: number;

  private batch: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private lastHash: string = '0'.repeat(64); // Genesis hash
  private eventCount: number = 0;

  constructor(config: AuditLoggerConfig = {}) {
    this.provider = config.provider ?? new InMemoryAuditLogProvider();
    this.batchEnabled = config.batchEnabled ?? true;
    this.batchSize = config.batchSize ?? 10;
    this.batchFlushIntervalMs = config.batchFlushIntervalMs ?? 5000;
    this.hashChainEnabled = config.hashChainEnabled ?? false;
    this.maxBufferSize = config.maxBufferSize ?? 1000;

    // Start batch flush timer
    if (this.batchEnabled && this.batchFlushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(() => {
          // Silently handle flush errors
        });
      }, this.batchFlushIntervalMs);
    }
  }

  /**
   * Log an audit event.
   *
   * @param input - The event input
   * @returns The created audit event
   */
  async log(input: AuditEventInput): Promise<AuditEvent> {
    const now = new Date().toISOString();

    const event: AuditEvent = {
      id: uuidv4(),
      timestamp: now,
      eventType: input.eventType,
      userId: input.userId ?? null,
      requestId: input.requestId ?? null,
      workflowId: input.workflowId ?? null,
      classification: input.classification ?? null,
      routing: input.routing ?? null,
      governanceDecision: input.governanceDecision ?? null,
      approvalStatus: input.approvalStatus ?? null,
      bypassTokenUsed: input.bypassTokenUsed ?? false,
      metadata: input.metadata ?? {},
      createdAt: now,
    };

    // Apply hash chain if enabled (Level 4 tamper detection)
    if (this.hashChainEnabled) {
      const eventData = JSON.stringify(event);
      const hash = createHash('sha256');
      hash.update(this.lastHash);
      hash.update(eventData);
      this.lastHash = hash.digest('hex');
      event.metadata = {
        ...event.metadata,
        _hashChain: this.lastHash,
        _previousHash: event.metadata._hashChain ? this.lastHash : '0'.repeat(64),
        _sequenceNumber: this.eventCount,
      };
    }

    this.eventCount++;

    if (this.batchEnabled) {
      this.batch.push(event);

      if (this.batch.length >= this.batchSize) {
        await this.flush();
      }
    } else {
      await this.provider.log(event);
    }

    return event;
  }

  /**
   * Flush the current batch to the provider.
   */
  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const toFlush = [...this.batch];
    this.batch = [];

    for (const event of toFlush) {
      try {
        await this.provider.log(event);
      } catch {
        // Re-buffer failed events (up to max buffer size)
        if (this.batch.length < this.maxBufferSize) {
          this.batch.push(event);
        }
      }
    }
  }

  /**
   * Query audit events.
   *
   * @param filters - Query filters
   * @returns Query result with events and metadata
   */
  async query(filters: AuditQueryFilters): Promise<AuditQueryResult> {
    // Flush pending events first to ensure consistency
    await this.flush();
    return this.provider.query(filters);
  }

  /**
   * Get audit summary statistics.
   */
  async getSummary(filters?: Partial<AuditQueryFilters>): Promise<AuditSummary> {
    await this.flush();
    return this.provider.getSummary(filters);
  }

  /**
   * Get a single event by ID.
   */
  async getById(id: string): Promise<AuditEvent | null> {
    await this.flush();
    return this.provider.getById(id);
  }

  /**
   * Get the total number of events logged.
   */
  getEventCount(): number {
    return this.eventCount;
  }

  /**
   * Get the last hash in the chain (for Level 4 integrity verification).
   */
  getLastHash(): string {
    return this.lastHash;
  }

  /**
   * Shutdown the logger, flushing remaining events.
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Get the provider name.
   */
  getProviderName(): string {
    return this.provider.name;
  }
}
