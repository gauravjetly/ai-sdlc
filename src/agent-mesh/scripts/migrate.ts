/**
 * Database Migration Script
 *
 * Usage: npx ts-node scripts/migrate.ts
 *
 * Runs all pending SQL migrations against the configured PostgreSQL database.
 */

import { loadPlatformConfig } from '../config';
import { createDatabasePool } from '../database/connection';
import { Migrator } from '../database/migrator';

async function main(): Promise<void> {
  const config = loadPlatformConfig();

  console.log('Connecting to PostgreSQL...');
  console.log(`  Host: ${config.database.host}:${config.database.port}`);
  console.log(`  Database: ${config.database.database}`);

  const pool = await createDatabasePool(config.database);

  try {
    const migrator = new Migrator(pool);
    const applied = await migrator.migrate();

    if (applied.length > 0) {
      console.log('\nApplied migrations:');
      for (const m of applied) {
        console.log(`  - ${m.name} (version ${m.version})`);
      }
    }

    const currentVersion = await migrator.getCurrentVersion();
    console.log(`\nCurrent schema version: ${currentVersion}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
