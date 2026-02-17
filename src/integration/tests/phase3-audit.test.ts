/**
 * Phase 3: Audit Logging Tests
 *
 * Tests for the audit logger, query system, and CSV/JSON exporter.
 */

import { AuditLogger, InMemoryAuditLogProvider } from '../audit/audit-logger';
import { AuditExporter } from '../audit/audit-exporter';
import { AuditEventType } from '../audit/types';

describe('Phase 3: Audit Logger', () => {
  let provider: InMemoryAuditLogProvider;
  let logger: AuditLogger;

  beforeEach(() => {
    provider = new InMemoryAuditLogProvider();
    logger = new AuditLogger({
      provider,
      batchEnabled: false, // Disable batching for test simplicity
    });
  });

  afterEach(async () => {
    await logger.shutdown();
  });

  describe('log', () => {
    it('should log a governance decision event', async () => {
      const event = await logger.log({
        eventType: 'governance_decision',
        userId: 'dev1',
        workflowId: 'WF-001',
        governanceDecision: { level: 3, allowed: false, blockedBy: ['security-review'] },
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe('governance_decision');
      expect(event.userId).toBe('dev1');
      expect(event.workflowId).toBe('WF-001');
      expect(event.governanceDecision).toEqual({
        level: 3,
        allowed: false,
        blockedBy: ['security-review'],
      });
    });

    it('should log classification events', async () => {
      const event = await logger.log({
        eventType: 'classification',
        classification: {
          type: 'code-change',
          complexity: 'medium',
          confidence: 0.88,
        },
      });

      expect(event.eventType).toBe('classification');
      expect(event.classification).toBeDefined();
    });

    it('should log approval events', async () => {
      const event = await logger.log({
        eventType: 'approval_approved',
        workflowId: 'WF-001',
        approvalStatus: 'approved',
        metadata: { approvedBy: 'admin' },
      });

      expect(event.eventType).toBe('approval_approved');
      expect(event.approvalStatus).toBe('approved');
    });

    it('should log bypass token events', async () => {
      const event = await logger.log({
        eventType: 'bypass_token_used',
        workflowId: 'WF-001',
        bypassTokenUsed: true,
        metadata: { reason: 'Emergency fix' },
      });

      expect(event.bypassTokenUsed).toBe(true);
    });

    it('should increment event count', async () => {
      await logger.log({ eventType: 'classification' });
      await logger.log({ eventType: 'routing_decision' });
      await logger.log({ eventType: 'governance_decision' });

      expect(logger.getEventCount()).toBe(3);
    });
  });

  describe('hash chain (Level 4)', () => {
    it('should maintain hash chain when enabled', async () => {
      const hashLogger = new AuditLogger({
        provider: new InMemoryAuditLogProvider(),
        batchEnabled: false,
        hashChainEnabled: true,
      });

      const event1 = await hashLogger.log({ eventType: 'classification' });
      const event2 = await hashLogger.log({ eventType: 'governance_decision' });

      expect(event1.metadata._hashChain).toBeDefined();
      expect(event2.metadata._hashChain).toBeDefined();
      expect(event1.metadata._hashChain).not.toBe(event2.metadata._hashChain);

      // Last hash should match
      expect(hashLogger.getLastHash()).toBe(event2.metadata._hashChain);

      await hashLogger.shutdown();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await logger.log({ eventType: 'classification', workflowId: 'WF-001', userId: 'dev1' });
      await logger.log({ eventType: 'governance_decision', workflowId: 'WF-001', userId: 'dev1' });
      await logger.log({ eventType: 'approval_requested', workflowId: 'WF-001', userId: 'dev1' });
      await logger.log({ eventType: 'classification', workflowId: 'WF-002', userId: 'dev2' });
      await logger.log({ eventType: 'bypass_token_used', workflowId: 'WF-003', bypassTokenUsed: true });
    });

    it('should query all events', async () => {
      const result = await logger.query({});

      expect(result.events.length).toBe(5);
      expect(result.totalCount).toBe(5);
    });

    it('should filter by event type', async () => {
      const result = await logger.query({ eventType: 'classification' });

      expect(result.events.length).toBe(2);
      expect(result.events.every((e) => e.eventType === 'classification')).toBe(true);
    });

    it('should filter by workflow ID', async () => {
      const result = await logger.query({ workflowId: 'WF-001' });

      expect(result.events.length).toBe(3);
    });

    it('should filter by user ID', async () => {
      const result = await logger.query({ userId: 'dev2' });

      expect(result.events.length).toBe(1);
      expect(result.events[0].workflowId).toBe('WF-002');
    });

    it('should filter by bypass token usage', async () => {
      const result = await logger.query({ bypassTokenUsed: true });

      expect(result.events.length).toBe(1);
      expect(result.events[0].workflowId).toBe('WF-003');
    });

    it('should support pagination', async () => {
      const page1 = await logger.query({ limit: 2, offset: 0 });
      const page2 = await logger.query({ limit: 2, offset: 2 });

      expect(page1.events.length).toBe(2);
      expect(page1.hasMore).toBe(true);
      expect(page2.events.length).toBe(2);
      expect(page2.hasMore).toBe(true);
    });

    it('should support sort order', async () => {
      const descResult = await logger.query({ sortOrder: 'desc' });
      const ascResult = await logger.query({ sortOrder: 'asc' });

      // Both should return all 5 events
      expect(descResult.events.length).toBe(5);
      expect(ascResult.events.length).toBe(5);

      // The event IDs should be in reverse order
      const descIds = descResult.events.map((e) => e.id);
      const ascIds = ascResult.events.map((e) => e.id);
      expect(descIds).toEqual(ascIds.reverse());
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', async () => {
      await logger.log({ eventType: 'classification' });
      await logger.log({ eventType: 'classification' });
      await logger.log({ eventType: 'governance_decision' });
      await logger.log({ eventType: 'approval_approved', approvalStatus: 'approved' });
      await logger.log({ eventType: 'bypass_token_used', bypassTokenUsed: true });

      const summary = await logger.getSummary();

      expect(summary.totalEvents).toBe(5);
      expect(summary.eventsByType['classification']).toBe(2);
      expect(summary.eventsByType['governance_decision']).toBe(1);
      expect(summary.eventsByApprovalStatus['approved']).toBe(1);
      expect(summary.bypassTokenUsageCount).toBe(1);
    });
  });

  describe('batching', () => {
    it('should batch events and flush', async () => {
      const batchProvider = new InMemoryAuditLogProvider();
      const batchLogger = new AuditLogger({
        provider: batchProvider,
        batchEnabled: true,
        batchSize: 3,
        batchFlushIntervalMs: 0, // Disable timer for test
      });

      await batchLogger.log({ eventType: 'classification' });
      await batchLogger.log({ eventType: 'classification' });

      // Not flushed yet (batch size is 3)
      expect(batchProvider.getAll().length).toBe(0);

      // Third event triggers flush
      await batchLogger.log({ eventType: 'classification' });

      expect(batchProvider.getAll().length).toBe(3);

      await batchLogger.shutdown();
    });
  });
});

describe('Phase 3: Audit Exporter', () => {
  let logger: AuditLogger;
  let exporter: AuditExporter;

  beforeEach(async () => {
    logger = new AuditLogger({
      provider: new InMemoryAuditLogProvider(),
      batchEnabled: false,
    });

    await logger.log({
      eventType: 'classification',
      userId: 'dev1',
      workflowId: 'WF-001',
    });
    await logger.log({
      eventType: 'governance_decision',
      userId: 'dev1',
      workflowId: 'WF-001',
      approvalStatus: 'approved',
    });
    await logger.log({
      eventType: 'bypass_token_used',
      userId: 'dev2',
      workflowId: 'WF-002',
      bypassTokenUsed: true,
    });

    exporter = new AuditExporter(logger);
  });

  afterEach(async () => {
    await logger.shutdown();
  });

  describe('exportToCSV', () => {
    it('should export events to CSV format', async () => {
      const csv = await exporter.exportToCSV();

      expect(csv).toContain('id,timestamp,eventType,userId,requestId,workflowId,approvalStatus,bypassTokenUsed');
      expect(csv.split('\n').length).toBe(4); // Header + 3 rows
    });

    it('should include correct data in CSV', async () => {
      const csv = await exporter.exportToCSV();
      const lines = csv.split('\n');

      // Check that data values are present
      expect(lines.some((l) => l.includes('classification'))).toBe(true);
      expect(lines.some((l) => l.includes('governance_decision'))).toBe(true);
      expect(lines.some((l) => l.includes('bypass_token_used'))).toBe(true);
    });

    it('should filter CSV export', async () => {
      const csv = await exporter.exportToCSV({ workflowId: 'WF-001' });
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // Header + 2 rows
    });
  });

  describe('exportToJSON', () => {
    it('should export events to JSON format', async () => {
      const json = await exporter.exportToJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
    });

    it('should include correct structure in JSON', async () => {
      const json = await exporter.exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('eventType');
    });
  });

  describe('export with options', () => {
    it('should support custom delimiter', async () => {
      const result = await exporter.export({
        format: 'csv',
        delimiter: '\t',
      });

      expect(result.data).toContain('\t');
      expect(result.format).toBe('csv');
    });

    it('should include metadata when requested', async () => {
      const result = await exporter.export({
        format: 'json',
        includeMetadata: true,
      });

      const parsed = JSON.parse(result.data);
      expect(parsed[0]).toHaveProperty('metadata');
    });

    it('should report event count', async () => {
      const result = await exporter.export({});

      expect(result.eventCount).toBe(3);
      expect(result.exportedAt).toBeDefined();
    });
  });
});
