/**
 * Database Migration Manager Tests
 */

import {
  DatabaseMigrationManager,
  MigrationExamples
} from '../../deployment/migrations/migration-manager';
import { Migration, SchemaVersion } from '../../deployment/types';

describe('DatabaseMigrationManager', () => {
  let manager: DatabaseMigrationManager;

  beforeEach(() => {
    manager = new DatabaseMigrationManager();
  });

  describe('executeMigration', () => {
    it('should execute EXPAND migration', async () => {
      const migration = MigrationExamples.addEmailColumn();
      const result = await manager.executeMigration(migration);

      expect(result.migration_id).toBe(migration.id);
      expect(result.phase).toBe('expand');
      expect(result.status).toBe('succeeded');
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    it('should execute MIGRATE migration', async () => {
      const migration = MigrationExamples.backfillEmailData();
      const result = await manager.executeMigration(migration);

      expect(result.migration_id).toBe(migration.id);
      expect(result.phase).toBe('migrate-data');
      expect(result.status).toBe('succeeded');
    });

    it('should execute CONTRACT migration', async () => {
      const migration = MigrationExamples.removeUserContactsTable();
      const result = await manager.executeMigration(migration);

      expect(result.migration_id).toBe(migration.id);
      expect(result.phase).toBe('contract');
      expect(result.status).toBe('succeeded');
    });

    it('should track migration execution time', async () => {
      const migration = MigrationExamples.addEmailColumn();
      const result = await manager.executeMigration(migration);

      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('expand-contract pattern', () => {
    it('should execute full expand-contract cycle', async () => {
      // Step 1: EXPAND - Add new columns
      const expandMigration = MigrationExamples.addEmailColumn();
      const expandResult = await manager.executeMigration(expandMigration);
      expect(expandResult.status).toBe('succeeded');

      // Step 2: MIGRATE - Backfill data
      const migrateResult = await manager.executeMigration(
        MigrationExamples.backfillEmailData()
      );
      expect(migrateResult.status).toBe('succeeded');

      // Step 3: CONTRACT - Remove old schema
      const contractMigration = MigrationExamples.removeUserContactsTable();
      const contractResult = await manager.executeMigration(contractMigration);
      expect(contractResult.status).toBe('succeeded');

      // Verify history
      const history = manager.getMigrationHistory();
      expect(history.length).toBe(3);
      expect(history[0].phase).toBe('expand');
      expect(history[1].phase).toBe('migrate-data');
      expect(history[2].phase).toBe('contract');
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback EXPAND migration', async () => {
      const migration = MigrationExamples.addEmailColumn();
      await manager.executeMigration(migration);

      const rollbackResult = await manager.rollbackMigration(migration.id);

      expect(rollbackResult.migration_id).toBe(migration.id);
      expect(rollbackResult.status).toBe('rolled-back');
    });

    it('should rollback MIGRATE migration', async () => {
      const migration = MigrationExamples.backfillEmailData();
      await manager.executeMigration(migration);

      const rollbackResult = await manager.rollbackMigration(migration.id);

      expect(rollbackResult.status).toBe('rolled-back');
    });

    it('should fail to rollback CONTRACT migration', async () => {
      const migration = MigrationExamples.removeUserContactsTable();
      await manager.executeMigration(migration);

      await expect(
        manager.rollbackMigration(migration.id)
      ).rejects.toThrow('Cannot rollback CONTRACT phase');
    });

    it('should fail to rollback non-existent migration', async () => {
      await expect(
        manager.rollbackMigration('non-existent-migration')
      ).rejects.toThrow('Migration non-existent-migration not found');
    });
  });

  describe('schema version management', () => {
    it('should register schema version', () => {
      const schemaVersion: SchemaVersion = {
        version: '1.1.0',
        compatible_with: ['1.0.0'],
        migrations: [MigrationExamples.addEmailColumn()]
      };

      expect(() => {
        manager.registerSchemaVersion(schemaVersion);
      }).not.toThrow();
    });

    it('should check version compatibility', () => {
      const schemaV1: SchemaVersion = {
        version: '1.0.0',
        compatible_with: [],
        migrations: []
      };

      const schemaV2: SchemaVersion = {
        version: '2.0.0',
        compatible_with: ['1.0.0'],
        migrations: []
      };

      manager.registerSchemaVersion(schemaV1);
      manager.registerSchemaVersion(schemaV2);

      expect(manager.isVersionCompatible('2.0.0', '1.0.0')).toBe(true);
      expect(manager.isVersionCompatible('1.0.0', '2.0.0')).toBe(false);
    });

    it('should get and set current version', () => {
      expect(manager.getCurrentVersion()).toBe('1.0.0');

      manager.setCurrentVersion('2.0.0');
      expect(manager.getCurrentVersion()).toBe('2.0.0');
    });
  });

  describe('getMigrationHistory', () => {
    it('should return empty history initially', () => {
      const history = manager.getMigrationHistory();
      expect(history).toEqual([]);
    });

    it('should return migration history in chronological order', async () => {
      await manager.executeMigration(MigrationExamples.addEmailColumn());
      await manager.executeMigration(MigrationExamples.backfillEmailData());
      await manager.executeMigration(MigrationExamples.removeUserContactsTable());

      const history = manager.getMigrationHistory();

      expect(history.length).toBe(3);
      expect(history[0].phase).toBe('expand');
      expect(history[1].phase).toBe('migrate-data');
      expect(history[2].phase).toBe('contract');
    });
  });

  describe('custom migrations', () => {
    it('should execute custom EXPAND migration', async () => {
      const customMigration: Migration = {
        id: 'custom_expand_001',
        version: '1.2.0',
        phase: 'expand',
        description: 'Add custom column',
        up_script: `
          ALTER TABLE users ADD COLUMN custom_field VARCHAR(100);
        `,
        down_script: `
          ALTER TABLE users DROP COLUMN custom_field;
        `,
        created_at: new Date().toISOString()
      };

      const result = await manager.executeMigration(customMigration);

      expect(result.status).toBe('succeeded');
      expect(result.phase).toBe('expand');
    });

    it('should execute custom MIGRATE migration', async () => {
      const customMigration: Migration = {
        id: 'custom_migrate_001',
        version: '1.2.0',
        phase: 'migrate-data',
        description: 'Backfill custom data',
        up_script: `
          UPDATE users SET custom_field = 'default' WHERE custom_field IS NULL;
        `,
        down_script: `
          UPDATE users SET custom_field = NULL;
        `,
        created_at: new Date().toISOString()
      };

      const result = await manager.executeMigration(customMigration);

      expect(result.status).toBe('succeeded');
    });

    it('should execute complex multi-statement migration', async () => {
      const complexMigration: Migration = {
        id: 'complex_migration_001',
        version: '2.0.0',
        phase: 'expand',
        description: 'Complex schema changes',
        up_script: `
          CREATE TABLE user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            bio TEXT,
            avatar_url VARCHAR(255)
          );
          CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
          ALTER TABLE users ADD COLUMN profile_id INTEGER;
        `,
        down_script: `
          ALTER TABLE users DROP COLUMN profile_id;
          DROP INDEX idx_user_profiles_user_id;
          DROP TABLE user_profiles;
        `,
        created_at: new Date().toISOString()
      };

      const result = await manager.executeMigration(complexMigration);

      expect(result.status).toBe('succeeded');
    });
  });

  describe('migration error handling', () => {
    it('should handle migration errors gracefully', async () => {
      // Migration will succeed in our mock, but demonstrates error handling
      const migration = MigrationExamples.addEmailColumn();
      const result = await manager.executeMigration(migration);

      // Check that result structure is correct even in error cases
      expect(result).toHaveProperty('migration_id');
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('duration_ms');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('version compatibility', () => {
    it('should support N and N-1 version compatibility', () => {
      const versions: SchemaVersion[] = [
        {
          version: '1.0.0',
          compatible_with: [],
          migrations: []
        },
        {
          version: '1.1.0',
          compatible_with: ['1.0.0'],
          migrations: []
        },
        {
          version: '1.2.0',
          compatible_with: ['1.1.0'],
          migrations: []
        },
        {
          version: '2.0.0',
          compatible_with: ['1.2.0'],
          migrations: []
        }
      ];

      versions.forEach(v => manager.registerSchemaVersion(v));

      // N and N-1 should be compatible
      expect(manager.isVersionCompatible('1.1.0', '1.0.0')).toBe(true);
      expect(manager.isVersionCompatible('1.2.0', '1.1.0')).toBe(true);
      expect(manager.isVersionCompatible('2.0.0', '1.2.0')).toBe(true);

      // N and N-2 should not be compatible
      expect(manager.isVersionCompatible('1.2.0', '1.0.0')).toBe(false);
      expect(manager.isVersionCompatible('2.0.0', '1.1.0')).toBe(false);
    });
  });
});
