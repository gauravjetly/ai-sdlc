/**
 * SQLite Provider Tests
 *
 * Tests the core SQLite database provider including:
 * - Initialization and migration
 * - CRUD operations
 * - Transactions
 * - Health checks
 * - Statistics
 * - Cleanup
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SQLiteProvider } from '../src/sqlite/sqlite-provider';

describe('SQLiteProvider', () => {
  let provider: SQLiteProvider;
  let dbPath: string;

  beforeEach(async () => {
    // Use temp directory for test databases
    const tmpDir = path.join(os.tmpdir(), 'aisdlc-test-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    dbPath = path.join(tmpDir, 'test.db');

    provider = new SQLiteProvider({ dbPath });
    await provider.initialize();
  });

  afterEach(async () => {
    await provider.close();
    // Clean up test files
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      fs.rmdirSync(path.dirname(dbPath));
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should create database file', () => {
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should run migrations', () => {
      const result = provider.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM schema_migrations'
      );
      expect(result).toBeDefined();
      expect(result!.count).toBeGreaterThanOrEqual(0);
    });

    it('should not re-initialize if already initialized', async () => {
      expect(provider.isInitialized()).toBe(true);
      await provider.initialize(); // Should not throw
      expect(provider.isInitialized()).toBe(true);
    });

    it('should create required tables', () => {
      const tables = provider.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const tableNames = tables.rows.map(r => r.name);
      expect(tableNames).toContain('schema_migrations');
    });
  });

  describe('query operations', () => {
    it('should execute SELECT queries', () => {
      const result = provider.query<{ one: number }>('SELECT 1 as one');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].one).toBe(1);
    });

    it('should execute INSERT and return row count', () => {
      // Create a test table
      provider.execute('CREATE TABLE test_items (id TEXT PRIMARY KEY, name TEXT)');

      const result = provider.query(
        "INSERT INTO test_items (id, name) VALUES (?, ?)",
        ['test-1', 'Test Item']
      );
      expect(result.rowCount).toBe(1);
    });

    it('should queryOne and return single row', () => {
      provider.execute('CREATE TABLE test_single (id TEXT PRIMARY KEY, value INTEGER)');
      provider.execute("INSERT INTO test_single VALUES ('a', 42)");

      const result = provider.queryOne<{ id: string; value: number }>(
        'SELECT * FROM test_single WHERE id = ?',
        ['a']
      );
      expect(result).toBeDefined();
      expect(result!.value).toBe(42);
    });

    it('should return undefined for queryOne with no results', () => {
      provider.execute('CREATE TABLE test_empty (id TEXT PRIMARY KEY)');
      const result = provider.queryOne('SELECT * FROM test_empty WHERE id = ?', ['nonexistent']);
      expect(result).toBeUndefined();
    });

    it('should handle parameterized queries safely', () => {
      provider.execute('CREATE TABLE test_safe (id TEXT, data TEXT)');

      // This should NOT cause SQL injection
      const maliciousInput = "'; DROP TABLE test_safe; --";
      provider.execute(
        'INSERT INTO test_safe (id, data) VALUES (?, ?)',
        ['1', maliciousInput]
      );

      const result = provider.queryOne<{ data: string }>(
        'SELECT data FROM test_safe WHERE id = ?',
        ['1']
      );
      expect(result!.data).toBe(maliciousInput);

      // Table should still exist
      const tables = provider.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='test_safe'"
      );
      expect(tables.rows).toHaveLength(1);
    });
  });

  describe('execute', () => {
    it('should return RunResult with changes count', () => {
      provider.execute('CREATE TABLE test_exec (id TEXT, value TEXT)');
      provider.execute("INSERT INTO test_exec VALUES ('1', 'a')");
      provider.execute("INSERT INTO test_exec VALUES ('2', 'b')");

      const result = provider.execute(
        "DELETE FROM test_exec WHERE id = ?",
        ['1']
      );
      expect(result.changes).toBe(1);
    });
  });

  describe('transactions', () => {
    it('should commit on success', () => {
      provider.execute('CREATE TABLE test_txn (id TEXT, value INTEGER)');

      provider.transaction(() => {
        provider.execute("INSERT INTO test_txn VALUES ('1', 10)");
        provider.execute("INSERT INTO test_txn VALUES ('2', 20)");
      });

      const result = provider.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM test_txn'
      );
      expect(result!.count).toBe(2);
    });

    it('should rollback on error', () => {
      provider.execute('CREATE TABLE test_rollback (id TEXT PRIMARY KEY, value INTEGER)');

      try {
        provider.transaction(() => {
          provider.execute("INSERT INTO test_rollback VALUES ('1', 10)");
          throw new Error('Simulated failure');
        });
      } catch {
        // Expected
      }

      const result = provider.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM test_rollback'
      );
      expect(result!.count).toBe(0);
    });
  });

  describe('health check', () => {
    it('should return true when healthy', async () => {
      const healthy = await provider.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false after close', async () => {
      await provider.close();
      const healthy = await provider.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return table information', () => {
      const stats = provider.getStats();
      expect(stats.tables).toBeDefined();
      expect(stats.totalRows).toBeDefined();
      expect(stats.fileSize).toBeGreaterThan(0);
    });
  });

  describe('generateId', () => {
    it('should return unique UUIDs', () => {
      const id1 = provider.generateId();
      const id2 = provider.generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('close', () => {
    it('should close database and reset state', async () => {
      await provider.close();
      expect(provider.isInitialized()).toBe(false);
    });

    it('should throw on operations after close', async () => {
      await provider.close();
      expect(() => provider.query('SELECT 1')).toThrow();
    });
  });
});
