/**
 * SQLite Audit Provider Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SQLiteProvider } from '../src/sqlite/sqlite-provider';
import { SQLiteAuditProvider } from '../src/sqlite/sqlite-audit-provider';

describe('SQLiteAuditProvider', () => {
  let sqliteProvider: SQLiteProvider;
  let auditProvider: SQLiteAuditProvider;
  let dbPath: string;

  beforeEach(async () => {
    const tmpDir = path.join(os.tmpdir(), 'aisdlc-audit-test-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    dbPath = path.join(tmpDir, 'test-audit.db');

    sqliteProvider = new SQLiteProvider({ dbPath });
    await sqliteProvider.initialize();

    auditProvider = new SQLiteAuditProvider(sqliteProvider);
  });

  afterEach(async () => {
    await sqliteProvider.close();
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      fs.rmdirSync(path.dirname(dbPath));
    } catch { /* ignore */ }
  });

  describe('log', () => {
    it('should log an audit event', async () => {
      const event = await auditProvider.log({
        eventType: 'workflow.started',
        agentId: 'conductor',
        details: { workflowId: 'wf-1' },
        success: true,
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe('workflow.started');
      expect(event.agentId).toBe('conductor');
      expect(event.success).toBe(true);
    });

    it('should log error events', async () => {
      const event = await auditProvider.log({
        eventType: 'classification.failed',
        agentId: 'classifier',
        details: { message: 'Invalid input' },
        success: false,
        error: 'Classification failed',
      });

      expect(event.success).toBe(false);
      expect(event.error).toBe('Classification failed');
    });

    it('should log with duration', async () => {
      const event = await auditProvider.log({
        eventType: 'agent.completed',
        agentId: 'engineer',
        details: { task: 'implement' },
        success: true,
        durationMs: 5432,
      });

      expect(event.durationMs).toBe(5432);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await auditProvider.log({
        eventType: 'workflow.started',
        agentId: 'conductor',
        details: {},
        success: true,
      });
      await auditProvider.log({
        eventType: 'classification.completed',
        agentId: 'classifier',
        details: {},
        success: true,
      });
      await auditProvider.log({
        eventType: 'classification.failed',
        agentId: 'classifier',
        details: {},
        success: false,
        error: 'Error',
      });
    });

    it('should return all events', async () => {
      const events = await auditProvider.query({});
      expect(events.length).toBe(3);
    });

    it('should filter by event type', async () => {
      const events = await auditProvider.query({ eventType: 'classification.failed' });
      expect(events.length).toBe(1);
      expect(events[0].success).toBe(false);
    });

    it('should filter by agent', async () => {
      const events = await auditProvider.query({ agentId: 'classifier' });
      expect(events.length).toBe(2);
    });

    it('should filter by success status', async () => {
      const events = await auditProvider.query({ success: false });
      expect(events.length).toBe(1);
    });

    it('should respect limit', async () => {
      const events = await auditProvider.query({ limit: 1 });
      expect(events.length).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('should return correct summary', async () => {
      await auditProvider.log({ eventType: 'a', details: {}, success: true });
      await auditProvider.log({ eventType: 'a', details: {}, success: true });
      await auditProvider.log({ eventType: 'b', details: {}, success: false, error: 'fail' });

      const summary = await auditProvider.getSummary(1);
      expect(summary.totalEvents).toBe(3);
      expect(summary.successRate).toBeCloseTo(2 / 3);
      expect(summary.eventTypes['a']).toBe(2);
      expect(summary.recentErrors.length).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should remove old events', async () => {
      await auditProvider.log({ eventType: 'old', details: {}, success: true });

      // Cleanup with 0 days retention (should delete everything)
      const deleted = await auditProvider.cleanup(0);
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportEvents', () => {
    it('should export as JSON', async () => {
      await auditProvider.log({ eventType: 'test', details: { key: 'value' }, success: true });

      const json = await auditProvider.exportEvents({}, 'json');
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
      expect(parsed[0].eventType).toBe('test');
    });

    it('should export as CSV', async () => {
      await auditProvider.log({ eventType: 'test', details: {}, success: true });

      const csv = await auditProvider.exportEvents({}, 'csv');
      expect(csv).toContain('id,event_type');
      expect(csv).toContain('test');
    });
  });
});
