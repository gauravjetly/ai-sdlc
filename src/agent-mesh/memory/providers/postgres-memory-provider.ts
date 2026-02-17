/**
 * PostgreSQL Memory Provider
 *
 * Implements the MemoryService interface using PostgreSQL with pgvector
 * for semantic vector search. Supports hybrid search (vector + keyword)
 * with Reciprocal Rank Fusion.
 *
 * Key Features:
 * - Vector similarity search using pgvector cosine distance
 * - Keyword search using PostgreSQL full-text search
 * - Hybrid search combining both with RRF
 * - Automatic embedding generation on store
 * - Dual-write to file system for migration safety
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MemoryService,
  StoreKnowledgeInput,
  SearchKnowledgeOptions,
  MemoryServiceStats,
} from '../memory-service';
import { DatabasePool } from '../../database';
import { EmbeddingService } from '../../embedding';
import {
  AgentId,
  CollectiveKnowledge,
  KnowledgeConfidence,
  KnowledgeEvidence,
} from '../../types';

/**
 * Reciprocal Rank Fusion constant (typically 60).
 * Higher values give more weight to lower-ranked results.
 */
const RRF_K = 60;

interface KnowledgeRow {
  id: string;
  category: string;
  title: string;
  content: string;
  confidence: string;
  source_agents: string[];
  applicable_agents: string[];
  evidence_count: number;
  evidence: string; // JSON string
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  access_count: number;
  version: number;
  superseded_by: string | null;
  similarity?: number;
}

export class PostgresMemoryProvider implements MemoryService {
  private pool: DatabasePool;
  private embedding: EmbeddingService;

  constructor(pool: DatabasePool, embedding: EmbeddingService) {
    this.pool = pool;
    this.embedding = embedding;
  }

  async initialize(): Promise<void> {
    // Verify the knowledge table exists
    const result = await this.pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge')"
    );
    const exists = (result.rows[0] as Record<string, boolean>)?.exists;
    if (!exists) {
      throw new Error(
        '[PostgresMemoryProvider] Knowledge table does not exist. Run migrations first.'
      );
    }
    console.log('[PostgresMemoryProvider] Initialized');
  }

  async storeKnowledge(input: StoreKnowledgeInput): Promise<CollectiveKnowledge> {
    // Check for existing similar knowledge
    const existing = await this.findSimilar(input.title, input.category);
    if (existing) {
      return this.mergeKnowledge(existing, input);
    }

    const id = `CK-${uuidv4().split('-')[0]}`;
    const now = new Date().toISOString();

    // Generate embedding for the content
    let embeddingVector: number[] | null = null;
    try {
      const textToEmbed = `${input.title}\n\n${input.content}`;
      embeddingVector = await this.embedding.embed(textToEmbed);
    } catch (err) {
      console.warn('[PostgresMemoryProvider] Failed to generate embedding:', (err as Error).message);
    }

    const evidence: KnowledgeEvidence[] = input.evidence ? [input.evidence] : [];

    const embeddingParam = embeddingVector
      ? `[${embeddingVector.join(',')}]`
      : null;

    await this.pool.query(
      `INSERT INTO knowledge (
        id, category, title, content, embedding, confidence,
        source_agents, applicable_agents, evidence_count, evidence,
        tags, status, created_at, updated_at, last_accessed_at,
        access_count, version
      ) VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id, input.category, input.title, input.content,
        embeddingParam,
        input.confidence,
        input.sourceAgent ? [input.sourceAgent] : [],
        input.applicableAgents,
        evidence.length,
        JSON.stringify(evidence),
        input.tags,
        'active',
        now, now, now,
        0, 1,
      ]
    );

    const knowledge: CollectiveKnowledge = {
      id,
      category: input.category,
      title: input.title,
      content: input.content,
      confidence: input.confidence,
      sourceAgents: [input.sourceAgent],
      applicableAgents: input.applicableAgents,
      evidenceCount: evidence.length,
      evidence,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      version: 1,
      status: 'active',
    };

    console.log(
      `[PostgresMemoryProvider] Stored knowledge: ${id} - ${input.title}`
    );

    return knowledge;
  }

  async searchKnowledge(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    if (!options.query) {
      return this.searchByFilters(options);
    }

    const useHybrid = options.hybrid !== false; // Default to hybrid

    if (useHybrid) {
      return this.hybridSearch(options);
    } else {
      return this.vectorSearch(options);
    }
  }

  async getKnowledge(id: string): Promise<CollectiveKnowledge | null> {
    const result = await this.pool.query<KnowledgeRow>(
      `UPDATE knowledge SET
        last_accessed_at = NOW(),
        access_count = access_count + 1
      WHERE id = $1
      RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.rowToKnowledge(result.rows[0]);
  }

  async addEvidence(
    knowledgeId: string,
    evidence: KnowledgeEvidence
  ): Promise<CollectiveKnowledge | null> {
    // Get current evidence
    const current = await this.pool.query<KnowledgeRow>(
      'SELECT * FROM knowledge WHERE id = $1',
      [knowledgeId]
    );

    if (current.rows.length === 0) return null;

    const row = current.rows[0];
    const existingEvidence: KnowledgeEvidence[] = JSON.parse(row.evidence || '[]');
    existingEvidence.push(evidence);

    const newEvidenceCount = existingEvidence.length;
    const newConfidence = this.calculateConfidence(newEvidenceCount);

    // Add source agent if new
    const sourceAgents = [...row.source_agents];
    if (!sourceAgents.includes(evidence.agentId)) {
      sourceAgents.push(evidence.agentId);
    }

    const result = await this.pool.query<KnowledgeRow>(
      `UPDATE knowledge SET
        evidence = $1,
        evidence_count = $2,
        confidence = $3,
        source_agents = $4,
        version = version + 1,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [
        JSON.stringify(existingEvidence),
        newEvidenceCount,
        newConfidence,
        sourceAgents,
        knowledgeId,
      ]
    );

    if (result.rows.length === 0) return null;
    return this.rowToKnowledge(result.rows[0]);
  }

  async deprecateKnowledge(
    id: string,
    _reason: string,
    supersededBy?: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE knowledge SET
        status = $1,
        superseded_by = $2,
        updated_at = NOW()
      WHERE id = $3`,
      [supersededBy ? 'superseded' : 'deprecated', supersededBy || null, id]
    );
  }

  async getAgentRelevantKnowledge(
    agentId: AgentId,
    limit: number = 10
  ): Promise<CollectiveKnowledge[]> {
    const result = await this.pool.query<KnowledgeRow>(
      `SELECT * FROM knowledge
      WHERE status = 'active'
        AND $1 = ANY(applicable_agents)
      ORDER BY updated_at DESC
      LIMIT $2`,
      [agentId, limit]
    );

    return result.rows.map((row) => this.rowToKnowledge(row));
  }

  async getStats(): Promise<MemoryServiceStats> {
    const total = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM knowledge WHERE status = 'active'"
    );

    const categories = await this.pool.query<{ category: string; count: string }>(
      "SELECT category, COUNT(*) as count FROM knowledge WHERE status = 'active' GROUP BY category"
    );

    const agents = await this.pool.query<{ agent: string; count: string }>(
      `SELECT unnest(source_agents) as agent, COUNT(*) as count
       FROM knowledge WHERE status = 'active'
       GROUP BY agent`
    );

    const categoryMap: Record<string, number> = {};
    for (const row of categories.rows) {
      categoryMap[row.category] = parseInt(row.count, 10);
    }

    const agentMap: Record<string, number> = {};
    for (const row of agents.rows) {
      agentMap[row.agent] = parseInt(row.count, 10);
    }

    return {
      totalItems: parseInt(total.rows[0]?.count || '0', 10),
      categories: categoryMap,
      agentContributions: agentMap,
      provider: 'postgres',
    };
  }

  async exportReport(): Promise<string> {
    const stats = await this.getStats();
    const allKnowledge = await this.searchByFilters({ limit: 1000 });

    let report = `# Collective Knowledge Report (PostgreSQL)\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Total Items**: ${stats.totalItems}\n`;
    report += `**Provider**: PostgreSQL + pgvector\n\n`;

    report += `## By Category\n`;
    for (const [cat, count] of Object.entries(stats.categories)) {
      report += `- ${cat}: ${count}\n`;
    }

    report += `\n## Agent Contributions\n`;
    for (const [agent, count] of Object.entries(stats.agentContributions)) {
      report += `- ${agent}: ${count}\n`;
    }

    report += `\n---\n\n## Knowledge Items\n\n`;
    for (const item of allKnowledge) {
      report += `### ${item.title}\n`;
      report += `- **ID**: ${item.id}\n`;
      report += `- **Category**: ${item.category}\n`;
      report += `- **Confidence**: ${item.confidence}\n`;
      report += `- **Sources**: ${item.sourceAgents.join(', ')}\n\n`;
      report += `${item.content.substring(0, 300)}\n\n---\n\n`;
    }

    return report;
  }

  async shutdown(): Promise<void> {
    // Pool shutdown is managed externally
  }

  // ---- Private Methods ----

  /**
   * Vector similarity search using pgvector.
   */
  private async vectorSearch(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    if (!options.query) return [];

    let embeddingVector: number[];
    try {
      embeddingVector = await this.embedding.embed(options.query);
    } catch (err) {
      console.warn('[PostgresMemoryProvider] Embedding failed, falling back to keyword search');
      return this.keywordSearch(options);
    }

    const limit = options.limit || 10;
    const minSimilarity = options.minSimilarity || 0.3;

    let whereClause = "WHERE status = 'active' AND embedding IS NOT NULL";
    const params: unknown[] = [`[${embeddingVector.join(',')}]`];
    let paramIndex = 2;

    if (options.category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(options.category);
      paramIndex++;
    }

    if (options.agent) {
      whereClause += ` AND $${paramIndex} = ANY(applicable_agents)`;
      params.push(options.agent);
      paramIndex++;
    }

    if (options.confidence) {
      whereClause += ` AND confidence = $${paramIndex}`;
      params.push(options.confidence);
      paramIndex++;
    }

    if (!options.includeDeprecated) {
      whereClause += " AND status = 'active'";
    }

    params.push(minSimilarity, limit);

    const result = await this.pool.query<KnowledgeRow>(
      `SELECT *,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge
      ${whereClause}
        AND 1 - (embedding <=> $1::vector) >= $${paramIndex}
      ORDER BY embedding <=> $1::vector
      LIMIT $${paramIndex + 1}`,
      params
    );

    return result.rows.map((row) => this.rowToKnowledge(row));
  }

  /**
   * Keyword search using PostgreSQL text matching.
   */
  private async keywordSearch(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    if (!options.query) return [];

    const limit = options.limit || 10;
    const queryPattern = `%${options.query}%`;

    let whereClause = "WHERE status = 'active'";
    const params: unknown[] = [queryPattern];
    let paramIndex = 2;

    if (options.category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(options.category);
      paramIndex++;
    }

    if (options.agent) {
      whereClause += ` AND $${paramIndex} = ANY(applicable_agents)`;
      params.push(options.agent);
      paramIndex++;
    }

    params.push(limit);

    const result = await this.pool.query<KnowledgeRow>(
      `SELECT * FROM knowledge
      ${whereClause}
        AND (title ILIKE $1 OR content ILIKE $1 OR $1 = ANY(tags))
      ORDER BY updated_at DESC
      LIMIT $${paramIndex}`,
      params
    );

    return result.rows.map((row) => this.rowToKnowledge(row));
  }

  /**
   * Hybrid search combining vector and keyword with Reciprocal Rank Fusion.
   */
  private async hybridSearch(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    if (!options.query) return [];

    const limit = options.limit || 10;
    const fetchLimit = Math.max(limit * 3, 20); // Fetch more for fusion

    // Run both searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch({ ...options, limit: fetchLimit }),
      this.keywordSearch({ ...options, limit: fetchLimit }),
    ]);

    // Build rank maps
    const vectorRanks = new Map<string, number>();
    vectorResults.forEach((item, index) => {
      vectorRanks.set(item.id, index + 1);
    });

    const keywordRanks = new Map<string, number>();
    keywordResults.forEach((item, index) => {
      keywordRanks.set(item.id, index + 1);
    });

    // Collect all unique IDs
    const allIds = new Set([
      ...vectorResults.map((r) => r.id),
      ...keywordResults.map((r) => r.id),
    ]);

    // Calculate RRF scores
    const scored: Array<{ knowledge: CollectiveKnowledge; rrfScore: number }> = [];

    for (const id of allIds) {
      const vectorRank = vectorRanks.get(id);
      const keywordRank = keywordRanks.get(id);

      let rrfScore = 0;
      if (vectorRank) {
        rrfScore += 1 / (RRF_K + vectorRank);
      }
      if (keywordRank) {
        rrfScore += 1 / (RRF_K + keywordRank);
      }

      // Find the knowledge item
      const knowledge =
        vectorResults.find((r) => r.id === id) ||
        keywordResults.find((r) => r.id === id);

      if (knowledge) {
        scored.push({ knowledge, rrfScore });
      }
    }

    // Sort by RRF score (highest first)
    scored.sort((a, b) => b.rrfScore - a.rrfScore);

    return scored.slice(0, limit).map((s) => s.knowledge);
  }

  /**
   * Search by filters without text query.
   */
  private async searchByFilters(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    const limit = options.limit || 20;

    let whereClause = options.includeDeprecated
      ? 'WHERE 1=1'
      : "WHERE status = 'active'";
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(options.category);
      paramIndex++;
    }

    if (options.agent) {
      whereClause += ` AND $${paramIndex} = ANY(applicable_agents)`;
      params.push(options.agent);
      paramIndex++;
    }

    if (options.confidence) {
      whereClause += ` AND confidence = $${paramIndex}`;
      params.push(options.confidence);
      paramIndex++;
    }

    if (options.tags && options.tags.length > 0) {
      whereClause += ` AND tags && $${paramIndex}`;
      params.push(options.tags);
      paramIndex++;
    }

    params.push(limit);

    const result = await this.pool.query<KnowledgeRow>(
      `SELECT * FROM knowledge
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex}`,
      params
    );

    return result.rows.map((row) => this.rowToKnowledge(row));
  }

  /**
   * Find similar knowledge by title within a category.
   */
  private async findSimilar(
    title: string,
    category: string
  ): Promise<CollectiveKnowledge | null> {
    // Try exact or substring match first
    const result = await this.pool.query<KnowledgeRow>(
      `SELECT * FROM knowledge
      WHERE status = 'active'
        AND category = $1
        AND (
          LOWER(title) = LOWER($2)
          OR LOWER(title) LIKE '%' || LOWER($2) || '%'
          OR LOWER($2) LIKE '%' || LOWER(title) || '%'
        )
      LIMIT 1`,
      [category, title]
    );

    if (result.rows.length > 0) {
      return this.rowToKnowledge(result.rows[0]);
    }

    return null;
  }

  /**
   * Merge new knowledge into an existing item.
   */
  private async mergeKnowledge(
    existing: CollectiveKnowledge,
    input: StoreKnowledgeInput
  ): Promise<CollectiveKnowledge> {
    const sourceAgents = [...existing.sourceAgents];
    if (!sourceAgents.includes(input.sourceAgent)) {
      sourceAgents.push(input.sourceAgent);
    }

    const applicableAgents = [...existing.applicableAgents];
    for (const agent of input.applicableAgents) {
      if (!applicableAgents.includes(agent)) {
        applicableAgents.push(agent);
      }
    }

    const tags = [...existing.tags];
    for (const tag of input.tags) {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    const evidence = [...existing.evidence];
    if (input.evidence) {
      evidence.push(input.evidence);
    }

    let mergedContent = existing.content;
    if (input.content !== existing.content) {
      mergedContent += `\n\n---\nAdditional insight from ${input.sourceAgent}:\n${input.content}`;
    }

    const newConfidence = this.calculateConfidence(evidence.length);

    // Re-generate embedding for the merged content
    let embeddingParam: string | null = null;
    try {
      const textToEmbed = `${existing.title}\n\n${mergedContent}`;
      const embeddingVector = await this.embedding.embed(textToEmbed);
      embeddingParam = `[${embeddingVector.join(',')}]`;
    } catch {
      // Keep existing embedding
    }

    const updateEmbedding = embeddingParam
      ? `, embedding = $9::vector`
      : '';

    const params: unknown[] = [
      mergedContent,
      sourceAgents,
      applicableAgents,
      tags,
      evidence.length,
      JSON.stringify(evidence),
      newConfidence,
      existing.id,
    ];

    if (embeddingParam) {
      params.push(embeddingParam);
    }

    const result = await this.pool.query<KnowledgeRow>(
      `UPDATE knowledge SET
        content = $1,
        source_agents = $2,
        applicable_agents = $3,
        tags = $4,
        evidence_count = $5,
        evidence = $6,
        confidence = $7,
        version = version + 1,
        updated_at = NOW()
        ${updateEmbedding}
      WHERE id = $8
      RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error(`Failed to merge knowledge ${existing.id}`);
    }

    console.log(
      `[PostgresMemoryProvider] Merged knowledge: ${existing.id} ` +
      `(now ${evidence.length} evidence, confidence: ${newConfidence})`
    );

    return this.rowToKnowledge(result.rows[0]);
  }

  private calculateConfidence(evidenceCount: number): KnowledgeConfidence {
    if (evidenceCount >= 5) return 'proven';
    if (evidenceCount >= 3) return 'established';
    if (evidenceCount >= 1) return 'emerging';
    return 'speculative';
  }

  private rowToKnowledge(row: KnowledgeRow): CollectiveKnowledge {
    return {
      id: row.id,
      category: row.category as CollectiveKnowledge['category'],
      title: row.title,
      content: row.content,
      confidence: row.confidence as CollectiveKnowledge['confidence'],
      sourceAgents: row.source_agents as AgentId[],
      applicableAgents: row.applicable_agents as AgentId[],
      evidenceCount: row.evidence_count,
      evidence: JSON.parse(row.evidence || '[]'),
      tags: row.tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
      accessCount: row.access_count,
      version: row.version,
      status: row.status as CollectiveKnowledge['status'],
      supersededBy: row.superseded_by || undefined,
    };
  }
}
