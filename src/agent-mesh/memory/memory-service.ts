/**
 * Memory Service Interface
 *
 * Abstraction layer for knowledge storage and retrieval.
 * Supports two providers:
 *   - FileMemoryProvider: Uses existing file-based CollectiveMemory
 *   - PostgresMemoryProvider: Uses PostgreSQL with pgvector for semantic search
 *
 * Provider is selected by the STORAGE environment variable.
 */

import {
  AgentId,
  CollectiveKnowledge,
  KnowledgeCategory,
  KnowledgeConfidence,
  KnowledgeEvidence,
} from '../types';

export interface StoreKnowledgeInput {
  category: KnowledgeCategory;
  title: string;
  content: string;
  confidence: KnowledgeConfidence;
  sourceAgent: AgentId;
  applicableAgents: AgentId[];
  tags: string[];
  evidence?: KnowledgeEvidence;
}

export interface SearchKnowledgeOptions {
  query?: string;
  category?: KnowledgeCategory;
  agent?: AgentId;
  confidence?: KnowledgeConfidence;
  tags?: string[];
  limit?: number;
  minSimilarity?: number;
  hybrid?: boolean;
  includeDeprecated?: boolean;
}

export interface KnowledgeSearchResult {
  knowledge: CollectiveKnowledge;
  score: number;
  matchType: 'vector' | 'keyword' | 'hybrid';
}

export interface MemoryServiceStats {
  totalItems: number;
  categories: Record<string, number>;
  agentContributions: Record<string, number>;
  provider: 'file' | 'postgres';
}

/**
 * MemoryService interface - the contract that both providers implement.
 */
export interface MemoryService {
  /**
   * Initialize the memory service (create tables, directories, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Store a new piece of knowledge. Merges if similar exists.
   */
  storeKnowledge(input: StoreKnowledgeInput): Promise<CollectiveKnowledge>;

  /**
   * Search for knowledge items.
   */
  searchKnowledge(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]>;

  /**
   * Get a specific knowledge item by ID.
   */
  getKnowledge(id: string): Promise<CollectiveKnowledge | null>;

  /**
   * Add evidence to an existing knowledge item.
   */
  addEvidence(knowledgeId: string, evidence: KnowledgeEvidence): Promise<CollectiveKnowledge | null>;

  /**
   * Deprecate a knowledge item.
   */
  deprecateKnowledge(id: string, reason: string, supersededBy?: string): Promise<void>;

  /**
   * Get knowledge relevant to a specific agent.
   */
  getAgentRelevantKnowledge(agentId: AgentId, limit?: number): Promise<CollectiveKnowledge[]>;

  /**
   * Get statistics about the memory store.
   */
  getStats(): Promise<MemoryServiceStats>;

  /**
   * Generate an export report.
   */
  exportReport(): Promise<string>;

  /**
   * Shutdown the service (close connections, etc.)
   */
  shutdown(): Promise<void>;
}
