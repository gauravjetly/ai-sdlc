/**
 * Data Migration Script
 *
 * Migrates existing file-based collective memory data to PostgreSQL.
 * Generates embeddings for each knowledge item.
 *
 * Usage: npx ts-node scripts/migrate-data.ts
 *
 * This script is idempotent - it can be run multiple times safely.
 * Existing items in PostgreSQL are skipped.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { loadPlatformConfig } from '../config';
import { createDatabasePool } from '../database/connection';
import { createEmbeddingService } from '../embedding';
import { CollectiveKnowledge } from '../types';

interface MigrationReport {
  totalFiles: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

async function main(): Promise<void> {
  const config = loadPlatformConfig();

  if (config.storage !== 'postgres') {
    console.log('STORAGE is not set to "postgres". Setting it temporarily for migration.');
  }

  console.log('Starting data migration from file-based to PostgreSQL...\n');

  const pool = await createDatabasePool(config.database);
  const embedding = createEmbeddingService(config.embedding);

  const basePath = path.join(os.homedir(), '.claude', 'agent-mesh', 'collective-memory', 'knowledge');
  const report: MigrationReport = {
    totalFiles: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all category directories
    let categories: string[];
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      categories = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      console.log('No existing collective memory found at:', basePath);
      console.log('Nothing to migrate.');
      return;
    }

    console.log(`Found ${categories.length} categories to scan.\n`);

    for (const category of categories) {
      const categoryPath = path.join(basePath, category);
      const files = await fs.readdir(categoryPath);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      console.log(`Processing category "${category}": ${jsonFiles.length} files`);

      for (const file of jsonFiles) {
        report.totalFiles++;

        try {
          const content = await fs.readFile(
            path.join(categoryPath, file),
            'utf-8'
          );
          const knowledge: CollectiveKnowledge = JSON.parse(content);

          // Check if already exists in PostgreSQL
          const existing = await pool.query(
            'SELECT id FROM knowledge WHERE id = $1',
            [knowledge.id]
          );

          if (existing.rows.length > 0) {
            report.skipped++;
            continue;
          }

          // Generate embedding
          let embeddingParam: string | null = null;
          try {
            const textToEmbed = `${knowledge.title}\n\n${knowledge.content}`;
            const embeddingVector = await embedding.embed(textToEmbed);
            embeddingParam = `[${embeddingVector.join(',')}]`;
          } catch (err) {
            console.warn(`  Warning: Could not generate embedding for ${knowledge.id}`);
          }

          // Insert into PostgreSQL
          await pool.query(
            `INSERT INTO knowledge (
              id, category, title, content, embedding, confidence,
              source_agents, applicable_agents, evidence_count, evidence,
              tags, status, created_at, updated_at, last_accessed_at,
              access_count, version, superseded_by
            ) VALUES (
              $1, $2, $3, $4, $5::vector, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18
            )`,
            [
              knowledge.id,
              knowledge.category,
              knowledge.title,
              knowledge.content,
              embeddingParam,
              knowledge.confidence,
              knowledge.sourceAgents,
              knowledge.applicableAgents,
              knowledge.evidenceCount,
              JSON.stringify(knowledge.evidence),
              knowledge.tags,
              knowledge.status,
              knowledge.createdAt,
              knowledge.updatedAt,
              knowledge.lastAccessedAt,
              knowledge.accessCount,
              knowledge.version,
              knowledge.supersededBy || null,
            ]
          );

          report.migrated++;
        } catch (err) {
          const error = err as Error;
          report.failed++;
          report.errors.push({ id: file, error: error.message });
          console.error(`  Error migrating ${file}: ${error.message}`);
        }
      }
    }

    // Print report
    console.log('\n========================================');
    console.log('  DATA MIGRATION REPORT');
    console.log('========================================');
    console.log(`  Total files scanned: ${report.totalFiles}`);
    console.log(`  Successfully migrated: ${report.migrated}`);
    console.log(`  Skipped (already exist): ${report.skipped}`);
    console.log(`  Failed: ${report.failed}`);

    if (report.errors.length > 0) {
      console.log('\n  Errors:');
      for (const err of report.errors) {
        console.log(`    - ${err.id}: ${err.error}`);
      }
    }

    console.log('========================================\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Data migration failed:', err);
  process.exit(1);
});
