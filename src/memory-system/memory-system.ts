/**
 * Memory System
 *
 * Main facade for the RAG memory system.
 */

import { VectorDBClient, VectorDBConfig } from './vector-db/chromadb-client';
import { EmbeddingService, EmbeddingConfig } from './vector-db/embedding-service';
import { MemoryStore, StoreConfig } from './storage/memory-store';
import { MemoryRetriever, RetrievalConfig } from './storage/memory-retriever';
import { AgentMemoryHooks } from './integration/agent-hooks';
import { ContextBuilder } from './integration/context-builder';

export interface MemorySystemConfig {
  vectorDB?: VectorDBConfig;
  embedding?: EmbeddingConfig;
  storage?: StoreConfig;
  retrieval?: RetrievalConfig;
}

/**
 * Main Memory System class
 * Provides a unified interface to all memory system components
 */
export class MemorySystem {
  private vectorDB: VectorDBClient;
  private embedder: EmbeddingService;
  private store: MemoryStore;
  private retriever: MemoryRetriever;
  private hooks: AgentMemoryHooks;
  private contextBuilder: ContextBuilder;
  private initialized: boolean = false;

  constructor(config?: MemorySystemConfig) {
    // Initialize components
    this.vectorDB = new VectorDBClient(config?.vectorDB);
    this.embedder = new EmbeddingService(config?.embedding);
    this.store = new MemoryStore(this.vectorDB, this.embedder, config?.storage);
    this.retriever = new MemoryRetriever(
      this.vectorDB,
      this.embedder,
      this.store,
      config?.retrieval
    );
    this.hooks = new AgentMemoryHooks(this.retriever, this.store);
    this.contextBuilder = new ContextBuilder();
  }

  /**
   * Initialize the memory system
   * Must be called before using the system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[MemorySystem] Already initialized');
      return;
    }

    console.log('[MemorySystem] Initializing...');

    try {
      // Initialize vector database
      await this.vectorDB.initialize();

      this.initialized = true;
      console.log('[MemorySystem] Initialization complete');
    } catch (error) {
      console.error('[MemorySystem] Initialization failed:', error);
      throw new Error(`Failed to initialize memory system: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the memory store
   */
  getStore(): MemoryStore {
    this.ensureInitialized();
    return this.store;
  }

  /**
   * Get the memory retriever
   */
  getRetriever(): MemoryRetriever {
    this.ensureInitialized();
    return this.retriever;
  }

  /**
   * Get agent hooks
   */
  getHooks(): AgentMemoryHooks {
    this.ensureInitialized();
    return this.hooks;
  }

  /**
   * Get context builder
   */
  getContextBuilder(): ContextBuilder {
    this.ensureInitialized();
    return this.contextBuilder;
  }

  /**
   * Get vector database client
   */
  getVectorDB(): VectorDBClient {
    this.ensureInitialized();
    return this.vectorDB;
  }

  /**
   * Get embedding service
   */
  getEmbedder(): EmbeddingService {
    this.ensureInitialized();
    return this.embedder;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      this.ensureInitialized();

      // Check vector DB
      const collections = await this.vectorDB.listCollections();

      // Count memories
      let totalMemories = 0;
      for (const collection of collections) {
        const count = await this.vectorDB.getCollectionCount(collection);
        totalMemories += count;
      }

      return {
        status: 'healthy',
        details: {
          initialized: this.initialized,
          collections: collections.length,
          totalMemories,
          collectionNames: collections,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Shutdown the memory system
   */
  async shutdown(): Promise<void> {
    console.log('[MemorySystem] Shutting down...');

    try {
      await this.vectorDB.close();
      this.initialized = false;
      console.log('[MemorySystem] Shutdown complete');
    } catch (error) {
      console.error('[MemorySystem] Shutdown error:', error);
    }
  }

  /**
   * Ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Memory system not initialized. Call initialize() first.');
    }
  }
}

/**
 * Create and initialize a memory system instance
 */
export async function createMemorySystem(config?: MemorySystemConfig): Promise<MemorySystem> {
  const system = new MemorySystem(config);
  await system.initialize();
  return system;
}
