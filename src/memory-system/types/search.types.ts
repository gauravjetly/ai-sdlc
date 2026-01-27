/**
 * Search Types
 *
 * Type definitions for memory search operations.
 */

import { AgentType, Memory, MemoryCategory, MemorySeverity, MemoryStatus } from './memory.types';

export interface SearchQuery {
  query: string;
  agent?: AgentType;
  category?: MemoryCategory;
  limit?: number;
  minSimilarity?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  project?: string;
  severity?: MemorySeverity;
  status?: MemoryStatus;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  success?: boolean;
  language?: string;
  framework?: string;
  product?: string;
}

export interface SearchResult {
  memories: Memory[];
  totalFound: number;
  searchTime: number;
  query: string;
}

export interface SimilarMemoryRequest {
  memoryId: string;
  limit?: number;
  minSimilarity?: number;
}

export interface BulkSearchQuery {
  queries: string[];
  agent?: AgentType;
  category?: MemoryCategory;
  limit?: number;
  minSimilarity?: number;
}

export interface BulkSearchResult {
  results: SearchResult[];
  totalTime: number;
}

export interface MemoryStatistics {
  totalMemories: number;
  byAgent: Record<AgentType, number>;
  byCategory: Record<MemoryCategory, number>;
  byStatus: Record<MemoryStatus, number>;
  averageQualityScore?: number;
  mostUsedPatterns: Array<{
    id: string;
    title: string;
    usageCount: number;
  }>;
}
