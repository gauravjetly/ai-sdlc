/**
 * SQLite Storage Provider
 *
 * Production-grade SQLite database provider for AI-SDLC local production.
 * Uses better-sqlite3 for synchronous, high-performance embedded database.
 *
 * Features:
 * - WAL mode for concurrent read access
 * - Automatic migration on first connection
 * - Parameterized queries (no SQL injection)
 * - JSON column support via SQLite JSON functions
 * - Keyword-based search (TF-IDF style) instead of vector search
 * - Automatic cleanup of old records
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SQLiteProviderOptions {
  dbPath: string;
  walMode?: boolean;
  busyTimeout?: number;
  verbose?: boolean;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export class SQLiteProvider {
  private db: Database.Database | null = null;
  private dbPath: string;
  private walMode: boolean;
  private busyTimeout: number;
  private verbose: boolean;
  private initialized: boolean = false;

  constructor(options: SQLiteProviderOptions) {
    this.dbPath = options.dbPath;
    this.walMode = options.walMode ?? true;
    this.busyTimeout = options.busyTimeout ?? 5000;
    this.verbose = options.verbose ?? false;
  }

  /**
   * Initialize the database connection and run migrations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath, {
      verbose: this.verbose ? (msg: unknown) => console.log('[SQLite]', msg) : undefined,
    });

    // Configure for performance and reliability
    this.db.pragma('journal_mode = WAL');
    this.db.pragma(`busy_timeout = ${this.busyTimeout}`);
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');

    // Set file permissions (owner only) on Unix-like systems
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(this.dbPath, 0o600);
      } catch {
        // Ignore permission errors
      }
    }

    // Run migrations
    await this.runMigrations();

    this.initialized = true;
  }

  /**
   * Run database migrations.
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not opened');

    // Check current migration version
    let currentVersion = 0;
    try {
      const result = this.db.prepare(
        'SELECT MAX(version) as version FROM schema_migrations'
      ).get() as { version: number | null } | undefined;
      currentVersion = result?.version ?? 0;
    } catch {
      // Table does not exist yet, start from 0
      currentVersion = 0;
    }

    // Load and run migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      // Try alternate path for when running from dist/
      const altDir = path.join(__dirname, '..', '..', 'src', 'migrations');
      if (fs.existsSync(altDir)) {
        this.runMigrationDir(altDir, currentVersion);
        return;
      }
      return; // No migrations directory found
    }

    this.runMigrationDir(migrationsDir, currentVersion);
  }

  private runMigrationDir(migrationsDir: string, currentVersion: number): void {
    if (!this.db) throw new Error('Database not opened');

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const versionMatch = file.match(/^(\d+)/);
      if (!versionMatch) continue;

      const version = parseInt(versionMatch[1], 10);
      if (version <= currentVersion) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      this.db.exec(sql);
    }
  }

  /**
   * Execute a query with parameters. Returns rows.
   */
  query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): QueryResult<T> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(sql);
    const isSelect = sql.trimStart().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      const rows = stmt.all(...params) as T[];
      return { rows, rowCount: rows.length };
    } else {
      const result = stmt.run(...params);
      return { rows: [] as T[], rowCount: result.changes };
    }
  }

  /**
   * Execute a single query and return the first row.
   */
  queryOne<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): T | undefined {
    this.ensureInitialized();
    const stmt = this.db!.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE).
   */
  execute(sql: string, params: unknown[] = []): Database.RunResult {
    this.ensureInitialized();
    return this.db!.prepare(sql).run(...params);
  }

  /**
   * Run multiple statements in a transaction.
   */
  transaction<T>(fn: () => T): T {
    this.ensureInitialized();
    return this.db!.transaction(fn)();
  }

  /**
   * Health check - verify database is accessible.
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.ensureInitialized();
      const result = this.queryOne<{ ok: number }>('SELECT 1 as ok');
      return result?.ok === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics.
   */
  getStats(): {
    tables: string[];
    totalRows: Record<string, number>;
    fileSize: number;
    walSize: number;
  } {
    this.ensureInitialized();

    // Get table names
    const tables = this.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).rows.map(r => r.name);

    // Get row counts
    const totalRows: Record<string, number> = {};
    for (const table of tables) {
      const result = this.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM "${table}"`
      );
      totalRows[table] = result?.count ?? 0;
    }

    // Get file sizes
    let fileSize = 0;
    let walSize = 0;
    try {
      if (fs.existsSync(this.dbPath)) {
        fileSize = fs.statSync(this.dbPath).size;
      }
      const walPath = this.dbPath + '-wal';
      if (fs.existsSync(walPath)) {
        walSize = fs.statSync(walPath).size;
      }
    } catch {
      // Ignore stat errors
    }

    return { tables, totalRows, fileSize, walSize };
  }

  /**
   * Generate a new UUID.
   */
  generateId(): string {
    return uuidv4();
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Check if the database is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error(
        'SQLiteProvider not initialized. Call initialize() first.'
      );
    }
  }
}
