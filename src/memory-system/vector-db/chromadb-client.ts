/**
 * ChromaDB Client
 *
 * Wrapper for ChromaDB operations with error handling and logging.
 */

import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import * as path from 'path';
import * as os from 'os';
import { Memory, MemoryMetadata } from '../types';

export interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  document: string;
  metadata: Record<string, any>;
  distance: number;
  similarity: number;
}

export interface VectorDBConfig {
  path?: string;
  host?: string;
  port?: number;
}

export class VectorDBClient {
  private client: ChromaClient | null = null;
  private collections: Map<string, Collection> = new Map();
  private config: VectorDBConfig;

  constructor(config?: VectorDBConfig) {
    this.config = config || {
      path: path.join(os.homedir(), '.claude', 'governance', 'memory', 'chromadb'),
    };
  }

  /**
   * Initialize the ChromaDB client
   */
  async initialize(): Promise<void> {
    try {
      this.client = new ChromaClient({
        path: this.config.path,
      });

      console.log(`[VectorDB] Initialized ChromaDB at ${this.config.path}`);
    } catch (error) {
      console.error('[VectorDB] Failed to initialize ChromaDB:', error);
      throw new Error(`Failed to initialize ChromaDB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get or create a collection
   */
  async getOrCreateCollection(name: string): Promise<Collection> {
    if (!this.client) {
      throw new Error('ChromaDB client not initialized. Call initialize() first.');
    }

    // Return cached collection if exists
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    try {
      // Try to get existing collection
      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: { createdAt: new Date().toISOString() },
      });

      this.collections.set(name, collection);
      console.log(`[VectorDB] Collection ready: ${name}`);

      return collection;
    } catch (error) {
      console.error(`[VectorDB] Failed to get/create collection ${name}:`, error);
      throw new Error(`Failed to get/create collection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add documents to a collection
   */
  async addDocuments(
    collectionName: string,
    documents: VectorDocument[]
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const ids = documents.map(doc => doc.id);
      const contents = documents.map(doc => doc.content);
      const embeddings = documents.map(doc => doc.embedding);
      const metadatas = documents.map(doc => this.sanitizeMetadata(doc.metadata));

      // Check if embeddings are provided
      if (embeddings.every(e => e !== undefined)) {
        await collection.add({
          ids,
          documents: contents,
          embeddings: embeddings as number[][],
          metadatas,
        });
      } else {
        // Let ChromaDB generate embeddings
        await collection.add({
          ids,
          documents: contents,
          metadatas,
        });
      }

      console.log(`[VectorDB] Added ${documents.length} documents to ${collectionName}`);
    } catch (error) {
      console.error(`[VectorDB] Failed to add documents to ${collectionName}:`, error);
      throw new Error(`Failed to add documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a document in a collection
   */
  async updateDocument(
    collectionName: string,
    document: VectorDocument
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      if (document.embedding) {
        await collection.update({
          ids: [document.id],
          documents: [document.content],
          embeddings: [document.embedding],
          metadatas: [this.sanitizeMetadata(document.metadata)],
        });
      } else {
        await collection.update({
          ids: [document.id],
          documents: [document.content],
          metadatas: [this.sanitizeMetadata(document.metadata)],
        });
      }

      console.log(`[VectorDB] Updated document ${document.id} in ${collectionName}`);
    } catch (error) {
      console.error(`[VectorDB] Failed to update document:`, error);
      throw new Error(`Failed to update document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search a collection by query text
   */
  async search(
    collectionName: string,
    query: string,
    limit: number = 5,
    whereFilter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const results = await collection.query({
        queryTexts: [query],
        nResults: limit,
        where: whereFilter,
        include: [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Distances],
      });

      // Transform results
      const searchResults: VectorSearchResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances?.[0]?.[i] || 0;
          searchResults.push({
            id: results.ids[0][i],
            document: results.documents?.[0]?.[i] as string || '',
            metadata: results.metadatas?.[0]?.[i] as Record<string, any> || {},
            distance,
            similarity: 1 - distance, // Convert distance to similarity
          });
        }
      }

      console.log(`[VectorDB] Search in ${collectionName} returned ${searchResults.length} results`);
      return searchResults;
    } catch (error) {
      console.error(`[VectorDB] Search failed in ${collectionName}:`, error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search by embedding vector
   */
  async searchByEmbedding(
    collectionName: string,
    embedding: number[],
    limit: number = 5,
    whereFilter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const results = await collection.query({
        queryEmbeddings: [embedding],
        nResults: limit,
        where: whereFilter,
        include: [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Distances],
      });

      // Transform results
      const searchResults: VectorSearchResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances?.[0]?.[i] || 0;
          searchResults.push({
            id: results.ids[0][i],
            document: results.documents?.[0]?.[i] as string || '',
            metadata: results.metadatas?.[0]?.[i] as Record<string, any> || {},
            distance,
            similarity: 1 - distance,
          });
        }
      }

      return searchResults;
    } catch (error) {
      console.error(`[VectorDB] Embedding search failed:`, error);
      throw new Error(`Embedding search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a document from a collection
   */
  async deleteDocument(collectionName: string, id: string): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      await collection.delete({ ids: [id] });
      console.log(`[VectorDB] Deleted document ${id} from ${collectionName}`);
    } catch (error) {
      console.error(`[VectorDB] Failed to delete document:`, error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get collection count
   */
  async getCollectionCount(collectionName: string): Promise<number> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const count = await collection.count();
      return count;
    } catch (error) {
      console.error(`[VectorDB] Failed to get collection count:`, error);
      return 0;
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    if (!this.client) {
      throw new Error('ChromaDB client not initialized');
    }

    try {
      const collections = await this.client.listCollections();
      return collections.map(c => c.name);
    } catch (error) {
      console.error('[VectorDB] Failed to list collections:', error);
      return [];
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not initialized');
    }

    try {
      await this.client.deleteCollection({ name });
      this.collections.delete(name);
      console.log(`[VectorDB] Deleted collection: ${name}`);
    } catch (error) {
      console.error(`[VectorDB] Failed to delete collection ${name}:`, error);
      throw new Error(`Failed to delete collection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sanitize metadata for ChromaDB
   * ChromaDB only supports string, number, and boolean values
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (Array.isArray(value)) {
        sanitized[key] = JSON.stringify(value);
      } else if (typeof value === 'object') {
        sanitized[key] = JSON.stringify(value);
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    this.collections.clear();
    this.client = null;
    console.log('[VectorDB] Client closed');
  }
}
