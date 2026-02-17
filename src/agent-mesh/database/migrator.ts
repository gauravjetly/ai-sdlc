/**
 * Database Migrator
 *
 * Applies SQL migration files in order, tracking which
 * migrations have been applied in the schema_migrations table.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabasePool } from './connection';

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

export class Migrator {
  private pool: DatabasePool;
  private migrationsDir: string;

  constructor(pool: DatabasePool, migrationsDir?: string) {
    this.pool = pool;
    this.migrationsDir =
      migrationsDir || path.join(__dirname, 'migrations');
  }

  /**
   * Run all pending migrations.
   * Returns the list of newly applied migrations.
   */
  async migrate(): Promise<MigrationRecord[]> {
    // Ensure schema_migrations table exists
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const result = await this.pool.query<MigrationRecord>(
      'SELECT version, name, applied_at::text as applied_at FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(result.rows.map((r) => r.version));

    // Read migration files
    const files = await fs.readdir(this.migrationsDir);
    const sqlFiles = files
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const applied: MigrationRecord[] = [];

    for (const file of sqlFiles) {
      // Extract version number from filename (e.g., "001-initial-schema.sql" -> 1)
      const versionMatch = file.match(/^(\d+)/);
      if (!versionMatch) continue;

      const version = parseInt(versionMatch[1], 10);
      if (appliedVersions.has(version)) {
        continue; // Already applied
      }

      console.log(`[Migrator] Applying migration ${file}...`);

      const sql = await fs.readFile(
        path.join(this.migrationsDir, file),
        'utf-8'
      );

      try {
        await this.pool.query(sql);
        const record: MigrationRecord = {
          version,
          name: file.replace('.sql', ''),
          applied_at: new Date().toISOString(),
        };
        applied.push(record);
        console.log(`[Migrator] Applied migration ${file}`);
      } catch (err) {
        const error = err as Error;
        console.error(`[Migrator] Failed to apply migration ${file}:`, error.message);
        throw error;
      }
    }

    if (applied.length === 0) {
      console.log('[Migrator] All migrations are up to date');
    } else {
      console.log(`[Migrator] Applied ${applied.length} migration(s)`);
    }

    return applied;
  }

  /**
   * Get the current migration version.
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.pool.query<{ version: number }>(
        'SELECT MAX(version) as version FROM schema_migrations'
      );
      return result.rows[0]?.version ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get list of applied migrations.
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await this.pool.query<MigrationRecord>(
        'SELECT version, name, applied_at::text as applied_at FROM schema_migrations ORDER BY version'
      );
      return result.rows;
    } catch {
      return [];
    }
  }
}
