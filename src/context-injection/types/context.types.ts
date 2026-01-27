/**
 * Context Types for AI-SDLC Context Injection System
 *
 * Defines all interfaces for context gathering, prioritization, and injection.
 */

export interface Context {
  organizational: OrganizationalContext;
  project: ProjectContext;
  historical: HistoricalContext[];
  live: LiveContext;
  totalTokens: number;
  metadata: ContextMetadata;
}

export interface OrganizationalContext {
  standards: string;
  security: string;
  libraries: string[];
  architecture: string;
  deployment: string;
  testing: string;
  tokens: number;
  priority: 2;
}

export interface ProjectContext {
  stack: string;
  architecture: string;
  existing: string;
  conventions: string;
  adrs: ADRSummary[];
  tokens: number;
  priority: 3;
}

export interface ADRSummary {
  id: string;
  title: string;
  decision: string;
  relevance: number;
}

export interface HistoricalContext {
  similarity: number;
  content: string;
  source: string;
  type: 'implementation' | 'bug-fix' | 'anti-pattern' | 'best-practice';
  timestamp?: string;
}

export interface LiveContext {
  branch: string;
  lastCommit: string;
  openPRs: number;
  dependencies: Record<string, string>;
  recentChanges: string[];
  tokens: number;
}

export interface ContextMetadata {
  retrievalTime: number;
  sourcesUsed: string[];
  cacheHit: boolean;
  trimmed: boolean;
  requestId: string;
  timestamp: string;
}

export interface ContextRequest {
  userRequest: string;
  targetAgent: AgentType;
  projectPath: string;
  tokenBudget?: number;
  requestId?: string;
}

export type AgentType =
  | 'conductor'
  | 'ba'
  | 'architect'
  | 'engineer'
  | 'security'
  | 'qa'
  | 'atlas'
  | 'customer';

export interface ContextSection {
  content: string;
  tokens: number;
  priority: 1 | 2 | 3 | 4;
  sources: ContextSource[];
}

export interface ContextSource {
  type: 'standard' | 'memory' | 'project' | 'policy';
  id: string;
  name: string;
  relevanceScore: number;
}

export interface EnhancedContext extends Context {
  sections: {
    mandatory: ContextSection;
    deltekStandards: ContextSection;
    projectContext: ContextSection;
    historicalContext: ContextSection;
  };
}

export interface TokenBudgetConfig {
  maxTokens: number;
  allocations: {
    mandatory: number;    // Priority 1
    standards: number;    // Priority 2
    project: number;      // Priority 3
    historical: number;   // Priority 4
  };
}

export interface MemorySearchOptions {
  query: string;
  agent: string;
  limit: number;
  minSimilarity: number;
}

export interface MemorySearchResult {
  memories: HistoricalContext[];
  totalFound: number;
}
