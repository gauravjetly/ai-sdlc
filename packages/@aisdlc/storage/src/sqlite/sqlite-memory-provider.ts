/**
 * SQLite Memory Provider
 *
 * Implements the MemoryService interface using SQLite for local production.
 * Uses keyword-based search (TF-IDF style) instead of pgvector.
 */

import { SQLiteProvider } from './sqlite-provider';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Types (aligned with agent-mesh MemoryService interface)
// ============================================================

export type KnowledgeCategory =
  | 'architecture-decision'
  | 'code-pattern'
  | 'bug-resolution'
  | 'performance-optimization'
  | 'security-finding'
  | 'testing-strategy'
  | 'deployment-procedure'
  | 'user-preference'
  | 'project-context'
  | 'tool-usage'
  | 'process-improvement';

export type KnowledgeConfidence = 'emerging' | 'established' | 'proven' | 'deprecated';

export type AgentId = string;

export interface KnowledgeEvidence {
  type: string;
  description: string;
  source?: string;
  timestamp?: string;
}

export interface CollectiveKnowledge {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  confidence: KnowledgeConfidence;
  sourceAgents: AgentId[];
  applicableAgents: AgentId[];
  evidenceCount: number;
  evidence: KnowledgeEvidence[];
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  accessCount: number;
  version: number;
  supersededBy?: string;
}

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

export interface MemoryServiceStats {
  totalItems: number;
  categories: Record<string, number>;
  agentContributions: Record<string, number>;
  provider: 'file' | 'sqlite' | 'postgres';
}

// ============================================================
// SQLite Memory Provider
// ============================================================

export class SQLiteMemoryProvider {
  private db: SQLiteProvider;

  constructor(db: SQLiteProvider) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    // Database initialization is handled by SQLiteProvider
  }

  /**
   * Store knowledge. Merges if similar item exists.
   */
  async storeKnowledge(input: StoreKnowledgeInput): Promise<CollectiveKnowledge> {
    // Check for existing similar knowledge
    const existing = this.findSimilar(input.title, input.category);

    if (existing) {
      // Merge with existing
      return this.mergeKnowledge(existing, input);
    }

    // Create new knowledge entry
    const id = `knowledge-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const evidence = input.evidence ? [input.evidence] : [];

    this.db.execute(
      `INSERT INTO knowledge (id, category, title, content, confidence,
        source_agents, applicable_agents, evidence_count, evidence,
        tags, status, created_at, updated_at, last_accessed_at, access_count, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, 1)`,
      [
        id,
        input.category,
        input.title,
        input.content,
        input.confidence,
        JSON.stringify([input.sourceAgent]),
        JSON.stringify(input.applicableAgents),
        evidence.length,
        JSON.stringify(evidence),
        JSON.stringify(input.tags),
        now, now, now,
      ]
    );

    return this.getKnowledge(id) as Promise<CollectiveKnowledge>;
  }

  /**
   * Search knowledge using keyword matching.
   */
  async searchKnowledge(options: SearchKnowledgeOptions = {}): Promise<CollectiveKnowledge[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!options.includeDeprecated) {
      conditions.push("status != 'deprecated'");
    }

    if (options.category) {
      conditions.push('category = ?');
      params.push(options.category);
    }

    if (options.confidence) {
      conditions.push('confidence = ?');
      params.push(options.confidence);
    }

    if (options.agent) {
      conditions.push("(applicable_agents LIKE ? OR source_agents LIKE ?)");
      params.push(`%${options.agent}%`, `%${options.agent}%`);
    }

    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        conditions.push("tags LIKE ?");
        params.push(`%"${tag}"%`);
      }
    }

    const limit = options.limit ?? 20;
    let sql: string;

    if (options.query) {
      // Keyword search with ranking
      const searchTerms = options.query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

      if (searchTerms.length > 0) {
        // Build a relevance score using LIKE matching
        const scoreParts: string[] = [];
        const scoreParams: unknown[] = [];
        for (const term of searchTerms) {
          scoreParts.push(`(CASE WHEN LOWER(title) LIKE ? THEN 3 ELSE 0 END)`);
          scoreParams.push(`%${term}%`);
          scoreParts.push(`(CASE WHEN LOWER(content) LIKE ? THEN 1 ELSE 0 END)`);
          scoreParams.push(`%${term}%`);
          scoreParts.push(`(CASE WHEN LOWER(tags) LIKE ? THEN 2 ELSE 0 END)`);
          scoreParams.push(`%${term}%`);
        }

        const scoreExpr = scoreParts.join(' + ');

        // Build WHERE clause that includes the score > 0 condition
        // We add a keyword match condition to WHERE to avoid HAVING on non-aggregate
        const keywordConditions: string[] = [];
        for (const term of searchTerms) {
          keywordConditions.push(
            `(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)`
          );
          params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        }
        // Require at least one term to match
        conditions.push(`(${keywordConditions.join(' OR ')})`);

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Score params come after the WHERE params in the subquery select
        const allParams = [...params, ...scoreParams, limit];

        sql = `SELECT *, (${scoreExpr}) as relevance_score
               FROM knowledge
               ${whereClause}
               ORDER BY relevance_score DESC, updated_at DESC
               LIMIT ?`;

        const result = this.db.query<Record<string, unknown>>(sql, allParams);
        return result.rows.map(row => this.rowToKnowledge(row));
      } else {
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        sql = `SELECT * FROM knowledge ${whereClause} ORDER BY updated_at DESC LIMIT ?`;
        params.push(limit);
      }
    } else {
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      sql = `SELECT * FROM knowledge ${whereClause} ORDER BY updated_at DESC LIMIT ?`;
      params.push(limit);
    }

    const result = this.db.query<Record<string, unknown>>(sql, params);
    return result.rows.map(row => this.rowToKnowledge(row));
  }

  /**
   * Get a specific knowledge item by ID.
   */
  async getKnowledge(id: string): Promise<CollectiveKnowledge | null> {
    const row = this.db.queryOne<Record<string, unknown>>(
      'SELECT * FROM knowledge WHERE id = ?',
      [id]
    );

    if (!row) return null;

    // Update access tracking
    this.db.execute(
      `UPDATE knowledge SET access_count = access_count + 1,
       last_accessed_at = datetime('now') WHERE id = ?`,
      [id]
    );

    return this.rowToKnowledge(row);
  }

  /**
   * Add evidence to existing knowledge.
   */
  async addEvidence(
    knowledgeId: string,
    evidence: KnowledgeEvidence
  ): Promise<CollectiveKnowledge | null> {
    const existing = await this.getKnowledge(knowledgeId);
    if (!existing) return null;

    const updatedEvidence = [...existing.evidence, evidence];
    const newConfidence = this.calculateConfidence(updatedEvidence.length);

    this.db.execute(
      `UPDATE knowledge
       SET evidence = ?, evidence_count = ?, confidence = ?,
           updated_at = datetime('now'), version = version + 1
       WHERE id = ?`,
      [
        JSON.stringify(updatedEvidence),
        updatedEvidence.length,
        newConfidence,
        knowledgeId,
      ]
    );

    return this.getKnowledge(knowledgeId);
  }

  /**
   * Deprecate a knowledge item.
   */
  async deprecateKnowledge(
    id: string,
    reason: string,
    supersededBy?: string
  ): Promise<void> {
    this.db.execute(
      `UPDATE knowledge
       SET status = 'deprecated', confidence = 'deprecated',
           superseded_by = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [supersededBy ?? null, id]
    );
  }

  /**
   * Get knowledge relevant to a specific agent.
   */
  async getAgentRelevantKnowledge(
    agentId: AgentId,
    limit: number = 10
  ): Promise<CollectiveKnowledge[]> {
    const result = this.db.query<Record<string, unknown>>(
      `SELECT * FROM knowledge
       WHERE status = 'active'
         AND (applicable_agents LIKE ? OR source_agents LIKE ?)
       ORDER BY updated_at DESC
       LIMIT ?`,
      [`%"${agentId}"%`, `%"${agentId}"%`, limit]
    );

    return result.rows.map(row => this.rowToKnowledge(row));
  }

  /**
   * Get memory service statistics.
   */
  async getStats(): Promise<MemoryServiceStats> {
    const totalResult = this.db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM knowledge WHERE status = 'active'"
    );

    const categoryResult = this.db.query<{ category: string; count: number }>(
      "SELECT category, COUNT(*) as count FROM knowledge WHERE status = 'active' GROUP BY category"
    );

    const agentResult = this.db.query<{ agent: string; count: number }>(
      `SELECT json_each.value as agent, COUNT(*) as count
       FROM knowledge, json_each(knowledge.source_agents)
       WHERE knowledge.status = 'active'
       GROUP BY json_each.value`
    );

    const categories: Record<string, number> = {};
    for (const row of categoryResult.rows) {
      categories[row.category] = row.count;
    }

    const agentContributions: Record<string, number> = {};
    for (const row of agentResult.rows) {
      agentContributions[row.agent] = row.count;
    }

    return {
      totalItems: totalResult?.count ?? 0,
      categories,
      agentContributions,
      provider: 'sqlite',
    };
  }

  /**
   * Generate an export report.
   */
  async exportReport(): Promise<string> {
    const stats = await this.getStats();
    const recentKnowledge = await this.searchKnowledge({ limit: 10 });

    let report = `# Knowledge Base Report (SQLite)\n\n`;
    report += `**Total Items**: ${stats.totalItems}\n`;
    report += `**Provider**: SQLite (Local Production)\n\n`;

    report += `## Categories\n`;
    for (const [cat, count] of Object.entries(stats.categories)) {
      report += `- ${cat}: ${count}\n`;
    }

    report += `\n## Agent Contributions\n`;
    for (const [agent, count] of Object.entries(stats.agentContributions)) {
      report += `- ${agent}: ${count}\n`;
    }

    report += `\n## Recent Knowledge\n`;
    for (const k of recentKnowledge) {
      report += `- [${k.category}] ${k.title} (${k.confidence})\n`;
    }

    return report;
  }

  /**
   * Shutdown - close database connection.
   */
  async shutdown(): Promise<void> {
    // No-op: SQLiteProvider.close() handles this
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private findSimilar(
    title: string,
    category: KnowledgeCategory
  ): CollectiveKnowledge | null {
    const row = this.db.queryOne<Record<string, unknown>>(
      `SELECT * FROM knowledge
       WHERE category = ? AND LOWER(title) = LOWER(?) AND status = 'active'`,
      [category, title]
    );

    return row ? this.rowToKnowledge(row) : null;
  }

  private async mergeKnowledge(
    existing: CollectiveKnowledge,
    input: StoreKnowledgeInput
  ): Promise<CollectiveKnowledge> {
    const sourceAgents = [...new Set([...existing.sourceAgents, input.sourceAgent])];
    const applicableAgents = [
      ...new Set([...existing.applicableAgents, ...input.applicableAgents]),
    ];
    const tags = [...new Set([...existing.tags, ...input.tags])];
    const evidence = input.evidence
      ? [...existing.evidence, input.evidence]
      : existing.evidence;

    this.db.execute(
      `UPDATE knowledge
       SET content = ?, source_agents = ?, applicable_agents = ?,
           tags = ?, evidence = ?, evidence_count = ?,
           confidence = ?, updated_at = datetime('now'),
           version = version + 1
       WHERE id = ?`,
      [
        input.content,
        JSON.stringify(sourceAgents),
        JSON.stringify(applicableAgents),
        JSON.stringify(tags),
        JSON.stringify(evidence),
        evidence.length,
        this.calculateConfidence(evidence.length),
        existing.id,
      ]
    );

    return this.getKnowledge(existing.id) as Promise<CollectiveKnowledge>;
  }

  private calculateConfidence(evidenceCount: number): KnowledgeConfidence {
    if (evidenceCount >= 5) return 'proven';
    if (evidenceCount >= 2) return 'established';
    return 'emerging';
  }

  private rowToKnowledge(row: Record<string, unknown>): CollectiveKnowledge {
    return {
      id: row.id as string,
      category: row.category as KnowledgeCategory,
      title: row.title as string,
      content: row.content as string,
      confidence: row.confidence as KnowledgeConfidence,
      sourceAgents: this.parseJsonArray(row.source_agents as string),
      applicableAgents: this.parseJsonArray(row.applicable_agents as string),
      evidenceCount: row.evidence_count as number,
      evidence: this.parseJsonArray(row.evidence as string),
      tags: this.parseJsonArray(row.tags as string),
      status: row.status as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lastAccessedAt: row.last_accessed_at as string,
      accessCount: row.access_count as number,
      version: row.version as number,
      supersededBy: row.superseded_by as string | undefined,
    };
  }

  private parseJsonArray(value: string | null | undefined): any[] {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
}
