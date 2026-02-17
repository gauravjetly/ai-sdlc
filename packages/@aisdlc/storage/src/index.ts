/**
 * @aisdlc/storage - Storage providers for AI-SDLC Local Production
 *
 * Provides:
 * - SQLiteProvider: Embedded database (zero-config)
 * - SQLiteMemoryProvider: Knowledge storage via SQLite
 * - SQLiteAuditProvider: Audit logging via SQLite
 * - LRUCache: In-memory cache (replaces Redis)
 */

export { SQLiteProvider } from './sqlite/sqlite-provider';
export type { SQLiteProviderOptions, QueryResult } from './sqlite/sqlite-provider';

export { SQLiteMemoryProvider } from './sqlite/sqlite-memory-provider';
export type {
  KnowledgeCategory,
  KnowledgeConfidence,
  AgentId,
  KnowledgeEvidence,
  CollectiveKnowledge,
  StoreKnowledgeInput,
  SearchKnowledgeOptions,
  MemoryServiceStats,
} from './sqlite/sqlite-memory-provider';

export { SQLiteAuditProvider } from './sqlite/sqlite-audit-provider';
export type {
  AuditEvent,
  AuditQueryFilters,
  AuditSummary,
} from './sqlite/sqlite-audit-provider';

export { LRUCache } from './memory-cache/lru-cache';
export type { CacheEntry, CacheStats, LRUCacheOptions } from './memory-cache/lru-cache';
