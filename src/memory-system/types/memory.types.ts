/**
 * Memory Types
 *
 * Core type definitions for the RAG memory system.
 */

export type AgentType =
  | 'ba'          // Business Analyst
  | 'jets'        // Architect
  | 'ux'          // UX/UI Designer
  | 'engineer'    // Software Engineer
  | 'security'    // Security Agent
  | 'qa'          // QA Agent
  | 'atlas'       // Deployment Agent
  | 'customer'    // Customer Agent
  | 'tracker'     // Tracker Agent
  | 'conductor'   // Orchestrator
  | 'ask-tom'     // Problem Solver
  | 'finops';     // Cost Optimization

export type MemoryCategory =
  | 'code-patterns'
  | 'security-findings'
  | 'architecture-decisions'
  | 'test-strategies'
  | 'deployment-patterns'
  | 'compliance-rules'
  | 'failed-approaches'
  | 'vintiq-knowledge'
  | 'cross-agent-learning'
  | 'ux-patterns'
  | 'process-patterns';

export type MemorySeverity = 'critical' | 'high' | 'medium' | 'low';

export type MemoryStatus = 'active' | 'deprecated' | 'archived';

export interface MemoryMetadata {
  // Core metadata
  project?: string;
  phase?: string;
  success: boolean;
  tags: string[];

  // Similarity score (from search results)
  similarity?: number;

  // Category-specific metadata
  severity?: MemorySeverity;
  category?: string;
  cweId?: string;
  language?: string;
  framework?: string;
  patternType?: string;
  qualityScore?: number;
  usageCount?: number;

  // Compliance
  standard?: string;
  requirement?: string;

  // Product knowledge
  product?: string;
  version?: string;

  // Timestamps
  lastUsed?: Date;
  deprecatedAt?: Date;
  deprecationReason?: string;
}

export interface Memory {
  id: string;
  agent: AgentType;
  category: MemoryCategory;
  title: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  version: number;
  status: MemoryStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateMemoryRequest {
  agent: AgentType;
  category: MemoryCategory;
  title: string;
  content: string;
  metadata: MemoryMetadata;
  createdBy?: string;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  metadata?: Partial<MemoryMetadata>;
  status?: MemoryStatus;
}
