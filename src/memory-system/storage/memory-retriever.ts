/**
 * Memory Retriever
 *
 * Retrieves memories using semantic search with filtering and ranking.
 */

import { Memory, SearchQuery, SearchResult, SearchFilters, MemoryCategory } from '../types';
import { VectorDBClient, VectorSearchResult } from '../vector-db/chromadb-client';
import { EmbeddingService } from '../vector-db/embedding-service';
import { MemoryStore } from './memory-store';

export interface RetrievalConfig {
  defaultLimit?: number;
  defaultMinSimilarity?: number;
  recencyWeight?: number; // 0-1, how much to weight recent memories
  qualityWeight?: number; // 0-1, how much to weight quality scores
}

export class MemoryRetriever {
  private vectorDB: VectorDBClient;
  private embedder: EmbeddingService;
  private memoryStore: MemoryStore;
  private config: RetrievalConfig;

  constructor(
    vectorDB: VectorDBClient,
    embedder: EmbeddingService,
    memoryStore: MemoryStore,
    config?: RetrievalConfig
  ) {
    this.vectorDB = vectorDB;
    this.embedder = embedder;
    this.memoryStore = memoryStore;
    this.config = {
      defaultLimit: 5,
      defaultMinSimilarity: 0.7,
      recencyWeight: 0.2,
      qualityWeight: 0.1,
      ...config,
    };
  }

  /**
   * Search memories by query
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      console.log(`[MemoryRetriever] Searching: "${query.query}"`);

      // 1. Generate query embedding
      const embeddingResult = await this.embedder.generateEmbedding(query.query);

      // 2. Determine collections to search
      const collections = this.getCollectionsToSearch(query.category);

      // 3. Search each collection
      const allResults: VectorSearchResult[] = [];

      for (const collection of collections) {
        const whereFilter = this.buildWhereFilter(query);
        const results = await this.vectorDB.searchByEmbedding(
          collection,
          embeddingResult.embedding,
          query.limit || this.config.defaultLimit! * 2, // Get more for ranking
          whereFilter
        );
        allResults.push(...results);
      }

      // 4. Load full memory objects
      const memories = await this.loadMemoriesFromResults(allResults);

      // 5. Filter by criteria
      const filteredMemories = this.filterMemories(memories, query);

      // 6. Rank and sort
      const rankedMemories = this.rankMemories(filteredMemories, query);

      // 7. Apply limit
      const limit = query.limit || this.config.defaultLimit!;
      const limitedMemories = rankedMemories.slice(0, limit);

      // 8. Increment usage counts
      await this.incrementUsageCounts(limitedMemories);

      const searchTime = Date.now() - startTime;

      console.log(
        `[MemoryRetriever] Found ${limitedMemories.length} memories in ${searchTime}ms`
      );

      return {
        memories: limitedMemories,
        totalFound: rankedMemories.length,
        searchTime,
        query: query.query,
      };
    } catch (error) {
      console.error('[MemoryRetriever] Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find similar memories to a given memory
   */
  async findSimilar(memoryId: string, limit: number = 5): Promise<Memory[]> {
    try {
      const memory = await this.memoryStore.getMemory(memoryId);

      if (!memory || !memory.embedding) {
        throw new Error(`Memory ${memoryId} not found or has no embedding`);
      }

      const collectionName = this.getCollectionName(memory.category);

      const results = await this.vectorDB.searchByEmbedding(
        collectionName,
        memory.embedding,
        limit + 1 // Get one extra to exclude self
      );

      // Filter out the original memory
      const similarResults = results.filter(r => r.id !== memoryId);

      const memories = await this.loadMemoriesFromResults(similarResults);

      return memories.slice(0, limit);
    } catch (error) {
      console.error('[MemoryRetriever] Find similar failed:', error);
      return [];
    }
  }

  /**
   * Get memories by agent
   */
  async getByAgent(agent: string, limit: number = 10): Promise<Memory[]> {
    // Search across all collections with agent filter
    return this.search({
      query: '*', // Match all
      limit,
      filters: { status: 'active' },
    }).then(result =>
      result.memories.filter(m => m.agent === agent)
    );
  }

  /**
   * Get memories by category
   */
  async getByCategory(category: MemoryCategory, limit: number = 10): Promise<Memory[]> {
    return this.search({
      query: '*',
      category,
      limit,
      filters: { status: 'active' },
    }).then(result => result.memories);
  }

  /**
   * Get recent memories
   */
  async getRecent(limit: number = 10): Promise<Memory[]> {
    const result = await this.search({
      query: '*',
      limit: limit * 2, // Get more to ensure we have enough after sorting
    });

    // Sort by creation date
    const sorted = result.memories.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return sorted.slice(0, limit);
  }

  /**
   * Get most used memories
   */
  async getMostUsed(limit: number = 10): Promise<Memory[]> {
    const result = await this.search({
      query: '*',
      limit: limit * 2,
    });

    // Sort by usage count
    const sorted = result.memories.sort(
      (a, b) => (b.metadata.usageCount || 0) - (a.metadata.usageCount || 0)
    );

    return sorted.slice(0, limit);
  }

  /**
   * Build ChromaDB where filter from search query
   */
  private buildWhereFilter(query: SearchQuery): Record<string, any> | undefined {
    if (!query.filters) {
      return undefined;
    }

    const where: Record<string, any> = {};
    const filters = query.filters;

    if (filters.project) {
      where.project = filters.project;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    if (filters.language) {
      where.language = filters.language;
    }

    if (filters.framework) {
      where.framework = filters.framework;
    }

    if (filters.product) {
      where.product = filters.product;
    }

    if (query.agent) {
      where.agent = query.agent;
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  /**
   * Load full memory objects from vector search results
   */
  private async loadMemoriesFromResults(
    results: VectorSearchResult[]
  ): Promise<Memory[]> {
    const memories: Memory[] = [];

    for (const result of results) {
      const memory = await this.memoryStore.getMemory(result.id);

      if (memory) {
        // Add similarity score to metadata
        memory.metadata.similarity = result.similarity;
        memories.push(memory);
      }
    }

    return memories;
  }

  /**
   * Filter memories by additional criteria
   */
  private filterMemories(memories: Memory[], query: SearchQuery): Memory[] {
    let filtered = memories;

    // Filter by minimum similarity
    const minSimilarity = query.minSimilarity || this.config.defaultMinSimilarity!;
    filtered = filtered.filter(m => (m.metadata.similarity || 0) >= minSimilarity);

    // Filter by date range
    if (query.filters?.dateFrom) {
      filtered = filtered.filter(m => m.createdAt >= query.filters!.dateFrom!);
    }

    if (query.filters?.dateTo) {
      filtered = filtered.filter(m => m.createdAt <= query.filters!.dateTo!);
    }

    // Filter by tags
    if (query.filters?.tags && query.filters.tags.length > 0) {
      filtered = filtered.filter(m => {
        const memoryTags = m.metadata.tags || [];
        return query.filters!.tags!.some(tag => memoryTags.includes(tag));
      });
    }

    return filtered;
  }

  /**
   * Rank memories by relevance, recency, and quality
   */
  private rankMemories(memories: Memory[], query: SearchQuery): Memory[] {
    const now = Date.now();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in ms

    const scored = memories.map(memory => {
      // Base score from similarity
      let score = memory.metadata.similarity || 0;

      // Recency bonus
      if (this.config.recencyWeight! > 0) {
        const age = now - memory.createdAt.getTime();
        const recencyScore = Math.max(0, 1 - age / maxAge);
        score += recencyScore * this.config.recencyWeight!;
      }

      // Quality bonus
      if (this.config.qualityWeight! > 0 && memory.metadata.qualityScore) {
        score += memory.metadata.qualityScore * this.config.qualityWeight!;
      }

      // Usage bonus (popular patterns)
      if (memory.metadata.usageCount && memory.metadata.usageCount > 10) {
        score += 0.05; // Small bonus for frequently used patterns
      }

      return { memory, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.memory);
  }

  /**
   * Increment usage counts for retrieved memories (async, don't await)
   */
  private async incrementUsageCounts(memories: Memory[]): Promise<void> {
    for (const memory of memories) {
      this.memoryStore.incrementUsageCount(memory.id).catch(error => {
        console.error(`[MemoryRetriever] Failed to increment usage for ${memory.id}:`, error);
      });
    }
  }

  /**
   * Get collections to search based on category filter
   */
  private getCollectionsToSearch(category?: MemoryCategory): string[] {
    if (category) {
      return [this.getCollectionName(category)];
    }

    // Search all collections
    return [
      'code_patterns',
      'security_findings',
      'architecture_decisions',
      'test_strategies',
      'deployment_patterns',
      'compliance_rules',
      'failed_approaches',
      'deltek_knowledge',
    ];
  }

  /**
   * Get collection name from category
   */
  private getCollectionName(category: MemoryCategory): string {
    return category.replace(/-/g, '_');
  }
}
