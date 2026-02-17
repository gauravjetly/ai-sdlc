/**
 * Database Connection Pool
 *
 * Manages PostgreSQL connections using a connection pool.
 * Provides health checks, graceful shutdown, and query execution.
 */

import { DatabaseConfig } from '../config';

/**
 * Minimal abstraction over pg.Pool to avoid tight coupling.
 * In production, this wraps the 'pg' module.
 * For testing, it can be replaced with a mock.
 */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface DatabasePool {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>;
  end(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

/**
 * Create a PostgreSQL connection pool.
 *
 * This function dynamically imports 'pg' so that file-based mode
 * does not require the pg dependency to be installed.
 */
export async function createDatabasePool(
  config: DatabaseConfig
): Promise<DatabasePool> {
  // Dynamic import to avoid requiring 'pg' when not needed
  const { Pool } = await import('pg');

  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err: Error) => {
    console.error('[Database] Unexpected pool error:', err.message);
  });

  // Verify connectivity
  try {
    const client = await pool.connect();
    client.release();
    console.log(
      `[Database] Connected to PostgreSQL at ${config.host}:${config.port}/${config.database}`
    );
  } catch (err) {
    const error = err as Error;
    console.error('[Database] Failed to connect:', error.message);
    throw error;
  }

  return {
    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<T>> {
      const start = Date.now();
      try {
        const result = await pool.query(text, values);
        const duration = Date.now() - start;
        if (duration > 1000) {
          console.warn(`[Database] Slow query (${duration}ms): ${text.substring(0, 100)}`);
        }
        return {
          rows: result.rows as T[],
          rowCount: result.rowCount ?? 0,
        };
      } catch (err) {
        const error = err as Error;
        console.error(`[Database] Query error: ${error.message}`);
        throw error;
      }
    },

    async end(): Promise<void> {
      await pool.end();
      console.log('[Database] Connection pool closed');
    },

    async healthCheck(): Promise<boolean> {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
  };
}
