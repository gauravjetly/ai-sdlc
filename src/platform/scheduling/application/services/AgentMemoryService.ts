/**
 * AgentMemoryService
 *
 * Application service for managing persistent agent memory.
 * Provides store/retrieve/search/evict operations with a two-tier
 * cache (in-process LRU + PostgreSQL).
 */

import { AgentMemory, AgentMemoryProps, MemoryStats } from '../../domain/entities/AgentMemory';

/**
 * Repository interface for AgentMemory persistence
 */
export interface IAgentMemoryRepository {
  save(entry: AgentMemory): Promise<void>;
  findByAgentAndKey(agentId: string, contextKey: string): Promise<AgentMemory | null>;
  findAllByAgent(agentId: string, options?: { search?: string; offset?: number; limit?: number }): Promise<{ items: AgentMemory[]; total: number }>;
  update(entry: AgentMemory): Promise<void>;
  delete(agentId: string, contextKey: string): Promise<void>;
  deleteAllByAgent(agentId: string): Promise<number>;
  deleteExpired(): Promise<number>;
  getStats(agentId: string): Promise<MemoryStats>;
  getTotalSizeByAgent(agentId: string): Promise<number>;
}

// In-process LRU cache entry
interface CacheEntry {
  memory: AgentMemory;
  cachedAt: Date;
}

const LRU_MAX_ENTRIES_PER_AGENT = 100;
const LRU_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MEMORY_PER_AGENT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

export class AgentMemoryService {
  private cache: Map<string, CacheEntry> = new Map();

  constructor(private readonly memoryRepository: IAgentMemoryRepository) {}

  /**
   * Store a memory entry for an agent
   */
  async store(
    agentId: string,
    key: string,
    value: Record<string, unknown>,
    ttlMinutes?: number,
  ): Promise<AgentMemory> {
    // Check size limits
    const currentSize = await this.memoryRepository.getTotalSizeByAgent(agentId);
    const entrySize = new TextEncoder().encode(JSON.stringify(value)).length;

    if (currentSize + entrySize > MAX_MEMORY_PER_AGENT_BYTES) {
      throw new Error(
        `Agent memory limit exceeded. Current: ${this.formatBytes(currentSize)}, ` +
        `Entry: ${this.formatBytes(entrySize)}, ` +
        `Limit: ${this.formatBytes(MAX_MEMORY_PER_AGENT_BYTES)}`,
      );
    }

    const expiresAt = ttlMinutes
      ? new Date(Date.now() + ttlMinutes * 60 * 1000)
      : null;

    // Check if entry exists
    const existing = await this.memoryRepository.findByAgentAndKey(agentId, key);

    if (existing) {
      existing.update(value);
      await this.memoryRepository.update(existing);
      this.cacheSet(agentId, key, existing);
      return existing;
    }

    const memory = new AgentMemory({
      agentId,
      contextKey: key,
      contextValue: value,
      expiresAt,
    });

    await this.memoryRepository.save(memory);
    this.cacheSet(agentId, key, memory);

    return memory;
  }

  /**
   * Retrieve a memory entry
   */
  async retrieve(agentId: string, key: string): Promise<Record<string, unknown> | null> {
    // Check L1 cache first
    const cached = this.cacheGet(agentId, key);
    if (cached) {
      const value = cached.access();
      await this.memoryRepository.update(cached);
      return value;
    }

    // Fall back to L2 (database)
    const memory = await this.memoryRepository.findByAgentAndKey(agentId, key);

    if (!memory) {
      return null;
    }

    // Check if expired
    if (memory.isExpired()) {
      await this.memoryRepository.delete(agentId, key);
      return null;
    }

    const value = memory.access();
    await this.memoryRepository.update(memory);

    // Populate cache
    this.cacheSet(agentId, key, memory);

    return value;
  }

  /**
   * Retrieve all memory entries for an agent
   */
  async retrieveAll(
    agentId: string,
    options?: { search?: string; offset?: number; limit?: number },
  ): Promise<{ items: AgentMemory[]; total: number }> {
    return this.memoryRepository.findAllByAgent(agentId, options);
  }

  /**
   * Delete a specific memory entry
   */
  async delete(agentId: string, key: string): Promise<void> {
    await this.memoryRepository.delete(agentId, key);
    this.cacheDelete(agentId, key);
  }

  /**
   * Clear all memory for an agent
   */
  async clearAll(agentId: string): Promise<number> {
    const count = await this.memoryRepository.deleteAllByAgent(agentId);
    this.cacheClearAgent(agentId);
    return count;
  }

  /**
   * Get memory statistics for an agent
   */
  async getStats(agentId: string): Promise<MemoryStats> {
    return this.memoryRepository.getStats(agentId);
  }

  /**
   * Evict expired entries (called periodically)
   */
  async evictExpired(): Promise<number> {
    const count = await this.memoryRepository.deleteExpired();

    // Also clean expired cache entries
    const now = new Date();
    for (const [key, entry] of this.cache) {
      if (entry.memory.isExpired()) {
        this.cache.delete(key);
      }
    }

    return count;
  }

  /**
   * Get a memory snapshot for an agent (used during execution)
   */
  async getMemorySnapshot(agentId: string): Promise<Record<string, unknown>> {
    const { items } = await this.memoryRepository.findAllByAgent(agentId);
    const snapshot: Record<string, unknown> = {};

    for (const item of items) {
      if (!item.isExpired()) {
        snapshot[item.contextKey] = item.contextValue;
      }
    }

    return snapshot;
  }

  // LRU Cache methods

  private cacheKey(agentId: string, contextKey: string): string {
    return `${agentId}:${contextKey}`;
  }

  private cacheGet(agentId: string, key: string): AgentMemory | null {
    const cacheKey = this.cacheKey(agentId, key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.cachedAt.getTime() > LRU_TTL_MS) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.memory;
  }

  private cacheSet(agentId: string, key: string, memory: AgentMemory): void {
    const cacheKey = this.cacheKey(agentId, key);

    // Enforce per-agent LRU limit
    const agentPrefix = `${agentId}:`;
    const agentEntries = Array.from(this.cache.keys()).filter(k => k.startsWith(agentPrefix));

    if (agentEntries.length >= LRU_MAX_ENTRIES_PER_AGENT) {
      // Evict the oldest entry for this agent
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const k of agentEntries) {
        const entry = this.cache.get(k);
        if (entry && entry.cachedAt.getTime() < oldestTime) {
          oldestTime = entry.cachedAt.getTime();
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, { memory, cachedAt: new Date() });
  }

  private cacheDelete(agentId: string, key: string): void {
    this.cache.delete(this.cacheKey(agentId, key));
  }

  private cacheClearAgent(agentId: string): void {
    const agentPrefix = `${agentId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(agentPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }
}
