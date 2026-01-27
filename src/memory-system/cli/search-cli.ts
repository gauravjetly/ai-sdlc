#!/usr/bin/env node
/**
 * Memory Search CLI
 *
 * Command-line tool for searching the memory system.
 */

import { Command } from 'commander';
import { VectorDBClient } from '../vector-db/chromadb-client';
import { EmbeddingService } from '../vector-db/embedding-service';
import { MemoryStore } from '../storage/memory-store';
import { MemoryRetriever } from '../storage/memory-retriever';
import { ContextBuilder } from '../integration/context-builder';
import { AgentType, MemoryCategory } from '../types';

const program = new Command();

// Initialize services
let vectorDB: VectorDBClient;
let embedder: EmbeddingService;
let memoryStore: MemoryStore;
let retriever: MemoryRetriever;
let contextBuilder: ContextBuilder;

async function initializeServices() {
  if (vectorDB) return; // Already initialized

  console.log('Initializing memory system...');

  vectorDB = new VectorDBClient();
  await vectorDB.initialize();

  embedder = new EmbeddingService();
  memoryStore = new MemoryStore(vectorDB, embedder);
  retriever = new MemoryRetriever(vectorDB, embedder, memoryStore);
  contextBuilder = new ContextBuilder();

  console.log('Memory system ready.\n');
}

program
  .name('memory')
  .description('CLI tool for searching and managing agent memories')
  .version('1.0.0');

program
  .command('search <query>')
  .description('Search memories by semantic query')
  .option('-a, --agent <agent>', 'Filter by agent (ba, jets, engineer, security, qa, atlas, customer, tracker)')
  .option('-c, --category <category>', 'Filter by category')
  .option('-l, --limit <number>', 'Number of results', '5')
  .option('-m, --min-similarity <number>', 'Minimum similarity score (0-1)', '0.7')
  .option('-p, --project <project>', 'Filter by project')
  .option('--format <format>', 'Output format (full, minimal, context)', 'full')
  .action(async (query: string, options: any) => {
    try {
      await initializeServices();

      const result = await retriever.search({
        query,
        agent: options.agent as AgentType,
        category: options.category as MemoryCategory,
        limit: parseInt(options.limit),
        minSimilarity: parseFloat(options.minSimilarity),
        filters: {
          project: options.project,
          status: 'active',
        },
      });

      console.log(`Found ${result.totalFound} memories in ${result.searchTime}ms\n`);

      if (result.memories.length === 0) {
        console.log('No memories found matching your query.');
        return;
      }

      // Format output
      if (options.format === 'minimal') {
        result.memories.forEach((m, i) => {
          const similarity = Math.round((m.metadata.similarity || 0) * 100);
          console.log(`${i + 1}. [${m.agent}/${m.category}] ${m.title} (${similarity}%)`);
        });
      } else if (options.format === 'context') {
        const context = contextBuilder.buildContext(result.memories, options.agent || 'engineer');
        console.log(context.formattedContext);
      } else {
        // Full format
        result.memories.forEach((m, i) => {
          const similarity = Math.round((m.metadata.similarity || 0) * 100);
          console.log(`\n${'='.repeat(80)}`);
          console.log(`${i + 1}. ${m.title} (${similarity}% relevant)`);
          console.log(`${'='.repeat(80)}`);
          console.log(`ID: ${m.id}`);
          console.log(`Agent: ${m.agent}`);
          console.log(`Category: ${m.category}`);
          console.log(`Created: ${m.createdAt.toISOString()}`);
          console.log(`Status: ${m.status}`);
          if (m.metadata.usageCount) {
            console.log(`Usage Count: ${m.metadata.usageCount}`);
          }
          console.log(`\nContent:\n${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`);
        });
      }
    } catch (error) {
      console.error('Search failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('similar <memory-id>')
  .description('Find memories similar to a given memory')
  .option('-l, --limit <number>', 'Number of results', '5')
  .action(async (memoryId: string, options: any) => {
    try {
      await initializeServices();

      const similar = await retriever.findSimilar(memoryId, parseInt(options.limit));

      console.log(`Found ${similar.length} similar memories\n`);

      similar.forEach((m, i) => {
        const similarity = Math.round((m.metadata.similarity || 0) * 100);
        console.log(`${i + 1}. [${m.category}] ${m.title} (${similarity}%)`);
      });
    } catch (error) {
      console.error('Similar search failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('recent')
  .description('Show recent memories')
  .option('-l, --limit <number>', 'Number of results', '10')
  .option('-a, --agent <agent>', 'Filter by agent')
  .action(async (options: any) => {
    try {
      await initializeServices();

      const recent = await retriever.getRecent(parseInt(options.limit));

      console.log(`Recent ${recent.length} memories\n`);

      recent.forEach((m, i) => {
        const date = m.createdAt.toISOString().split('T')[0];
        console.log(`${i + 1}. [${date}] [${m.agent}/${m.category}] ${m.title}`);
      });
    } catch (error) {
      console.error('Recent fetch failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('popular')
  .description('Show most used memories')
  .option('-l, --limit <number>', 'Number of results', '10')
  .action(async (options: any) => {
    try {
      await initializeServices();

      const popular = await retriever.getMostUsed(parseInt(options.limit));

      console.log(`Most used ${popular.length} memories\n`);

      popular.forEach((m, i) => {
        const usageCount = m.metadata.usageCount || 0;
        console.log(`${i + 1}. [${usageCount} uses] [${m.category}] ${m.title}`);
      });
    } catch (error) {
      console.error('Popular fetch failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show memory system statistics')
  .action(async () => {
    try {
      await initializeServices();

      const collections = await vectorDB.listCollections();

      console.log('Memory System Statistics\n');
      console.log(`Collections: ${collections.length}\n`);

      for (const collection of collections) {
        const count = await vectorDB.getCollectionCount(collection);
        console.log(`  ${collection}: ${count} memories`);
      }
    } catch (error) {
      console.error('Stats failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('get <memory-id>')
  .description('Get a specific memory by ID')
  .action(async (memoryId: string) => {
    try {
      await initializeServices();

      const memory = await memoryStore.getMemory(memoryId);

      if (!memory) {
        console.log(`Memory ${memoryId} not found.`);
        return;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(memory.title);
      console.log(`${'='.repeat(80)}`);
      console.log(`ID: ${memory.id}`);
      console.log(`Agent: ${memory.agent}`);
      console.log(`Category: ${memory.category}`);
      console.log(`Status: ${memory.status}`);
      console.log(`Created: ${memory.createdAt.toISOString()}`);
      console.log(`Updated: ${memory.updatedAt.toISOString()}`);
      console.log(`Version: ${memory.version}`);
      if (memory.metadata.usageCount) {
        console.log(`Usage Count: ${memory.metadata.usageCount}`);
      }
      if (memory.metadata.tags) {
        console.log(`Tags: ${memory.metadata.tags.join(', ')}`);
      }
      console.log(`\nContent:\n${memory.content}`);
    } catch (error) {
      console.error('Get failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
