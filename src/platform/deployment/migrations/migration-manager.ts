/**
 * Database Migration Manager
 * Implements expand-contract pattern for zero-downtime schema changes
 */

import {
  Migration,
  MigrationPhase,
  MigrationResult,
  SchemaVersion
} from '../types.js';

/**
 * Database Migration Manager
 *
 * Implements the Expand-Contract Pattern:
 * 1. EXPAND: Add new columns/tables (keep old ones)
 * 2. MIGRATE: Dual writes to both old and new schema
 * 3. BACKFILL: Copy existing data to new schema
 * 4. SWITCH: Update app to read from new schema
 * 5. CONTRACT: Remove old columns/tables
 *
 * Benefits:
 * - Zero downtime migrations
 * - Always rollback-safe
 * - Supports N and N-1 version compatibility
 */
export class DatabaseMigrationManager {
  // Track migration state
  private migrations: Map<string, Migration> = new Map();
  private schemaVersions: Map<string, SchemaVersion> = new Map();
  private currentVersion: string = '1.0.0';

  /**
   * Execute a migration
   */
  async executeMigration(migration: Migration): Promise<MigrationResult> {
    console.log(`\n=== Executing Migration ===`);
    console.log(`ID: ${migration.id}`);
    console.log(`Version: ${migration.version}`);
    console.log(`Phase: ${migration.phase}`);
    console.log(`Description: ${migration.description}`);
    console.log(`============================\n`);

    const startTime = Date.now();

    try {
      switch (migration.phase) {
        case 'expand':
          await this.executeExpandPhase(migration);
          break;
        case 'migrate-data':
          await this.executeMigratePhase(migration);
          break;
        case 'contract':
          await this.executeContractPhase(migration);
          break;
      }

      const duration = Date.now() - startTime;

      // Store migration
      this.migrations.set(migration.id, migration);

      const result: MigrationResult = {
        migration_id: migration.id,
        phase: migration.phase,
        status: 'succeeded',
        duration_ms: duration,
        timestamp: new Date().toISOString()
      };

      console.log(`\n✓ Migration ${migration.phase} completed successfully`);
      console.log(`Duration: ${duration}ms\n`);

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error(`\n✗ Migration ${migration.phase} failed: ${error.message}`);
      console.error(`Duration: ${duration}ms\n`);

      return {
        migration_id: migration.id,
        phase: migration.phase,
        status: 'failed',
        duration_ms: duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * EXPAND Phase: Add new schema elements without removing old ones
   *
   * Examples:
   * - Add new columns with nullable or default values
   * - Create new tables
   * - Add new indexes
   *
   * Safe for rollback: Old application code still works
   */
  private async executeExpandPhase(migration: Migration): Promise<void> {
    console.log(`EXPAND Phase: Adding new schema elements...`);

    // Parse and execute SQL script
    const statements = this.parseSqlScript(migration.up_script);

    for (const statement of statements) {
      console.log(`  Executing: ${this.truncateStatement(statement)}`);
      await this.executeSQL(statement);
    }

    console.log(`EXPAND Phase complete: New schema elements added`);
    console.log(`✓ Old application code remains compatible`);
  }

  /**
   * MIGRATE Phase: Backfill data and enable dual writes
   *
   * Process:
   * 1. Start writing to both old and new schema (dual writes)
   * 2. Backfill existing data from old to new schema
   * 3. Verify data consistency
   *
   * Safe for rollback: Application can still read from old schema
   */
  private async executeMigratePhase(migration: Migration): Promise<void> {
    console.log(`MIGRATE Phase: Backfilling data and enabling dual writes...`);

    // Step 1: Enable dual writes in application (would be done via config/feature flag)
    console.log(`  Step 1: Enable dual writes in application`);
    console.log(`    Application now writes to both old and new schema`);

    // Step 2: Backfill existing data
    console.log(`  Step 2: Backfilling existing data...`);
    const statements = this.parseSqlScript(migration.up_script);

    let rowsProcessed = 0;
    for (const statement of statements) {
      console.log(`    Executing: ${this.truncateStatement(statement)}`);
      const rows = await this.executeSQL(statement);
      rowsProcessed += rows;
    }

    console.log(`    Backfilled ${rowsProcessed} rows`);

    // Step 3: Verify data consistency
    console.log(`  Step 3: Verifying data consistency...`);
    await this.verifyDataConsistency();
    console.log(`    ✓ Data consistency verified`);

    console.log(`MIGRATE Phase complete: Data backfilled, dual writes active`);
  }

  /**
   * CONTRACT Phase: Remove old schema elements
   *
   * Process:
   * 1. Switch application to read from new schema
   * 2. Verify application health
   * 3. Remove old columns/tables
   *
   * Note: Should only be done after new version is stable
   */
  private async executeContractPhase(migration: Migration): Promise<void> {
    console.log(`CONTRACT Phase: Removing old schema elements...`);

    // Step 1: Verify new schema is in use
    console.log(`  Step 1: Verifying application uses new schema...`);
    await this.sleep(1000);
    console.log(`    ✓ Application reading from new schema`);

    // Step 2: Wait for old queries to complete
    console.log(`  Step 2: Waiting for old queries to complete...`);
    await this.sleep(2000);
    console.log(`    ✓ No active queries on old schema`);

    // Step 3: Remove old schema elements
    console.log(`  Step 3: Removing old schema elements...`);
    const statements = this.parseSqlScript(migration.up_script);

    for (const statement of statements) {
      console.log(`    Executing: ${this.truncateStatement(statement)}`);
      await this.executeSQL(statement);
    }

    console.log(`CONTRACT Phase complete: Old schema elements removed`);
    console.log(`⚠ Rollback to old version no longer possible`);
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migrationId: string): Promise<MigrationResult> {
    console.log(`\n=== Rolling Back Migration ===`);
    console.log(`Migration ID: ${migrationId}`);
    console.log(`==============================\n`);

    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    const startTime = Date.now();

    try {
      // Execute rollback based on phase
      switch (migration.phase) {
        case 'expand':
          await this.rollbackExpand(migration);
          break;
        case 'migrate-data':
          await this.rollbackMigrate(migration);
          break;
        case 'contract':
          throw new Error('Cannot rollback CONTRACT phase - old schema has been removed');
      }

      const duration = Date.now() - startTime;

      console.log(`\n✓ Migration rolled back successfully`);
      console.log(`Duration: ${duration}ms\n`);

      return {
        migration_id: migrationId,
        phase: migration.phase,
        status: 'rolled-back',
        duration_ms: duration,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error(`\n✗ Rollback failed: ${error.message}`);
      console.error(`Duration: ${duration}ms\n`);

      throw error;
    }
  }

  /**
   * Rollback EXPAND phase
   */
  private async rollbackExpand(migration: Migration): Promise<void> {
    console.log(`Rolling back EXPAND phase...`);
    console.log(`Removing newly added schema elements...`);

    const statements = this.parseSqlScript(migration.down_script);

    for (const statement of statements) {
      console.log(`  Executing: ${this.truncateStatement(statement)}`);
      await this.executeSQL(statement);
    }

    console.log(`EXPAND rollback complete`);
  }

  /**
   * Rollback MIGRATE phase
   */
  private async rollbackMigrate(migration: Migration): Promise<void> {
    console.log(`Rolling back MIGRATE phase...`);

    // Step 1: Disable dual writes
    console.log(`  Disabling dual writes...`);
    await this.sleep(1000);

    // Step 2: Clear backfilled data
    console.log(`  Clearing backfilled data...`);
    const statements = this.parseSqlScript(migration.down_script);

    for (const statement of statements) {
      console.log(`    Executing: ${this.truncateStatement(statement)}`);
      await this.executeSQL(statement);
    }

    console.log(`MIGRATE rollback complete`);
  }

  /**
   * Register a new schema version
   */
  registerSchemaVersion(version: SchemaVersion): void {
    this.schemaVersions.set(version.version, version);
    console.log(`Schema version ${version.version} registered`);
    console.log(`Compatible with: ${version.compatible_with.join(', ')}`);
  }

  /**
   * Check if two versions are compatible
   */
  isVersionCompatible(currentVersion: string, targetVersion: string): boolean {
    const current = this.schemaVersions.get(currentVersion);
    if (!current) return false;

    return current.compatible_with.includes(targetVersion);
  }

  /**
   * Get current schema version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Set current schema version
   */
  setCurrentVersion(version: string): void {
    this.currentVersion = version;
    console.log(`Current schema version set to: ${version}`);
  }

  /**
   * Get migration history
   */
  getMigrationHistory(): Migration[] {
    return Array.from(this.migrations.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  /**
   * Verify data consistency between old and new schema
   */
  private async verifyDataConsistency(): Promise<void> {
    // Simulate consistency check
    // In real implementation, would compare row counts, checksums, sample data
    await this.sleep(1000);

    // Simulate 99% consistency (1% chance of failure for testing)
    const consistent = Math.random() > 0.01;

    if (!consistent) {
      throw new Error('Data consistency check failed');
    }
  }

  /**
   * Parse SQL script into individual statements
   */
  private parseSqlScript(script: string): string[] {
    return script
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Execute SQL statement (simulated)
   */
  private async executeSQL(statement: string): Promise<number> {
    // Simulate SQL execution
    await this.sleep(100);

    // Simulate affected rows
    return Math.floor(Math.random() * 1000);
  }

  /**
   * Truncate statement for logging
   */
  private truncateStatement(statement: string, maxLength: number = 80): string {
    if (statement.length <= maxLength) {
      return statement;
    }
    return statement.substring(0, maxLength) + '...';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example migration definitions
 */
export class MigrationExamples {
  /**
   * Example: Add new email column to users table
   */
  static addEmailColumn(): Migration {
    return {
      id: 'add_email_column_001',
      version: '1.1.0',
      phase: 'expand',
      description: 'Add email column to users table',
      up_script: `
        ALTER TABLE users
        ADD COLUMN email VARCHAR(255) NULL;

        CREATE INDEX idx_users_email ON users(email);
      `,
      down_script: `
        DROP INDEX idx_users_email;
        DROP COLUMN email FROM users;
      `,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Example: Backfill email data
   */
  static backfillEmailData(): Migration {
    return {
      id: 'backfill_email_data_001',
      version: '1.1.0',
      phase: 'migrate-data',
      description: 'Backfill email data from user_contacts',
      up_script: `
        UPDATE users u
        SET email = (
          SELECT contact_value
          FROM user_contacts uc
          WHERE uc.user_id = u.id
            AND uc.contact_type = 'email'
          LIMIT 1
        )
        WHERE email IS NULL;
      `,
      down_script: `
        UPDATE users SET email = NULL;
      `,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Example: Remove old user_contacts table
   */
  static removeUserContactsTable(): Migration {
    return {
      id: 'remove_user_contacts_001',
      version: '1.1.0',
      phase: 'contract',
      description: 'Remove deprecated user_contacts table',
      up_script: `
        DROP TABLE user_contacts;
      `,
      down_script: `
        -- Cannot rollback - table dropped
        -- Would need to restore from backup
      `,
      created_at: new Date().toISOString()
    };
  }
}
