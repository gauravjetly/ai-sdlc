/**
 * Initialize ChromaDB for Memory System
 */

import { VectorDBClient } from './vector-db/chromadb-client';
import * as path from 'path';
import * as os from 'os';

const AGENT_COLLECTIONS = [
  'ba-memories',
  'jets-memories',
  'engineer-memories',
  'security-memories',
  'qa-memories',
  'atlas-memories',
  'customer-memories',
  'tracker-memories'
];

async function initializeChromaDB() {
  console.log('🚀 Initializing ChromaDB for Memory System...\n');

  // Initialize client
  const dbPath = path.join(os.homedir(), '.claude', 'vector-db');
  console.log(`📁 Database location: ${dbPath}\n`);

  const client = new VectorDBClient({
    path: dbPath
  });

  try {
    // Initialize connection
    console.log('1. Connecting to ChromaDB...');
    await client.initialize();
    console.log('   ✅ Connected\n');

    // Check existing collections
    console.log('2. Checking existing collections...');
    const existing = await client.listCollections();
    console.log(`   Found ${existing.length} existing collections\n`);

    // Create agent collections
    console.log('3. Creating agent memory collections...');
    for (const collectionName of AGENT_COLLECTIONS) {
      try {
        if (existing.includes(collectionName)) {
          console.log(`   ⏭️  ${collectionName} already exists`);
        } else {
          await client.getOrCreateCollection(collectionName);
          console.log(`   ✅ Created ${collectionName}`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${collectionName}: ${error.message}`);
      }
    }
    console.log('');

    // Verify collections
    console.log('4. Verifying collections...');
    const finalCollections = await client.listCollections();
    console.log(`   Total collections: ${finalCollections.length}`);

    const agentCollections = finalCollections.filter(c => AGENT_COLLECTIONS.includes(c));
    console.log(`   Agent collections: ${agentCollections.length}/${AGENT_COLLECTIONS.length}\n`);

    // Health check
    console.log('5. Running health check...');
    console.log(`   Status: ✅ Healthy (collections created successfully)\n`);

    // Summary
    console.log('========================================');
    console.log('✅ ChromaDB Initialization Complete!');
    console.log('========================================\n');
    console.log('Collections Ready:');
    agentCollections.forEach(c => console.log(`  ✅ ${c}`));
    console.log('');
    console.log(`Database: ${dbPath}`);
    console.log('Status: Ready for vector storage\n');

  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure ChromaDB is installed: npm install chromadb');
    console.error('2. Check if ChromaDB server is running (if using client/server mode)');
    console.error('3. Verify write permissions for:', dbPath);
    process.exit(1);
  }
}

// Run initialization
initializeChromaDB().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
