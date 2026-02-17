/**
 * Collective Memory System
 *
 * Shared knowledge base that all agents can read from and contribute to.
 * This is the "hive mind" layer -- knowledge discovered by one agent
 * becomes available to all relevant agents.
 *
 * Architecture:
 * - File-based storage for durability and debuggability
 * - Knowledge items stored as individual JSON files
 * - Index maintained for fast lookups
 * - Relevance scoring for retrieval
 * - Version tracking for knowledge evolution
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentId,
  CollectiveKnowledge,
  KnowledgeCategory,
  KnowledgeConfidence,
  KnowledgeEvidence,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
} from '../types';

export interface AddKnowledgeOptions {
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
  agent?: AgentId;           // Filter by applicable agent
  confidence?: KnowledgeConfidence;
  tags?: string[];
  limit?: number;
  includeDeprecated?: boolean;
}

export interface KnowledgeIndex {
  lastUpdated: string;
  totalItems: number;
  categories: Record<string, number>;
  agentContributions: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
}

export class CollectiveMemory {
  private basePath: string;
  private knowledgePath: string;
  private indexPath: string;
  private config: AgentMeshConfig;
  private index: KnowledgeIndex | null = null;

  constructor(config: Partial<AgentMeshConfig> = {}) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.basePath = this.config.basePath.replace('~', os.homedir());
    this.knowledgePath = path.join(this.basePath, 'collective-memory', 'knowledge');
    this.indexPath = path.join(this.basePath, 'collective-memory', 'index.json');
  }

  /**
   * Initialize collective memory storage
   */
  async initialize(): Promise<void> {
    // Create directories for each category
    const categories: KnowledgeCategory[] = [
      'cross-agent-learning',
      'error-pattern',
      'best-practice',
      'anti-pattern',
      'architecture-decision',
      'security-insight',
      'performance-insight',
      'process-improvement',
      'conflict-resolution',
      'integration-pattern',
    ];

    for (const category of categories) {
      await fs.mkdir(path.join(this.knowledgePath, category), { recursive: true });
    }

    // Load or create index
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      this.index = JSON.parse(data);
      console.log(`[CollectiveMemory] Loaded index with ${this.index?.totalItems} items`);
    } catch {
      this.index = {
        lastUpdated: new Date().toISOString(),
        totalItems: 0,
        categories: {},
        agentContributions: {},
        topTags: [],
      };
      await this.persistIndex();
      console.log('[CollectiveMemory] Created new index');
    }
  }

  /**
   * Add new knowledge to the collective memory
   */
  async addKnowledge(options: AddKnowledgeOptions): Promise<CollectiveKnowledge> {
    // Check for duplicate/similar knowledge
    const existing = await this.findSimilar(options.title, options.category);
    if (existing) {
      // Merge: add evidence and bump confidence
      return await this.mergeKnowledge(existing, options);
    }

    const knowledge: CollectiveKnowledge = {
      id: `CK-${uuidv4().split('-')[0]}`,
      category: options.category,
      title: options.title,
      content: options.content,
      confidence: options.confidence,
      sourceAgents: [options.sourceAgent],
      applicableAgents: options.applicableAgents,
      evidenceCount: options.evidence ? 1 : 0,
      evidence: options.evidence ? [options.evidence] : [],
      tags: options.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accessCount: 0,
      version: 1,
      status: 'active',
    };

    // Save to file
    const filePath = path.join(
      this.knowledgePath,
      knowledge.category,
      `${knowledge.id}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(knowledge, null, 2), 'utf-8');

    // Update index
    await this.updateIndex(knowledge, 'add');

    console.log(
      `[CollectiveMemory] Added knowledge: ${knowledge.id} - ${knowledge.title} ` +
      `(from ${options.sourceAgent}, applicable to ${options.applicableAgents.join(', ')})`
    );

    return knowledge;
  }

  /**
   * Search collective knowledge
   */
  async search(options: SearchKnowledgeOptions = {}): Promise<CollectiveKnowledge[]> {
    const results: CollectiveKnowledge[] = [];
    const categories = options.category
      ? [options.category]
      : await this.getCategories();

    for (const category of categories) {
      const categoryPath = path.join(this.knowledgePath, category);

      try {
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const content = await fs.readFile(
            path.join(categoryPath, file),
            'utf-8'
          );
          const knowledge: CollectiveKnowledge = JSON.parse(content);

          // Apply filters
          if (!options.includeDeprecated && knowledge.status !== 'active') {
            continue;
          }

          if (options.agent && !knowledge.applicableAgents.includes(options.agent)) {
            continue;
          }

          if (options.confidence && knowledge.confidence !== options.confidence) {
            continue;
          }

          if (options.tags && options.tags.length > 0) {
            const hasMatchingTag = options.tags.some((tag) =>
              knowledge.tags.includes(tag)
            );
            if (!hasMatchingTag) continue;
          }

          if (options.query) {
            const relevanceScore = this.calculateRelevance(knowledge, options.query);
            if (relevanceScore === 0) continue;
          }

          results.push(knowledge);
        }
      } catch {
        // Category directory may not exist
      }
    }

    // Sort by relevance then by recency
    if (options.query) {
      results.sort((a, b) => {
        const scoreA = this.calculateRelevance(a, options.query!);
        const scoreB = this.calculateRelevance(b, options.query!);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } else {
      results.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    // Apply limit
    const limit = options.limit || 20;
    return results.slice(0, limit);
  }

  /**
   * Get knowledge relevant to a specific agent
   */
  async getAgentRelevantKnowledge(
    agentId: AgentId,
    limit: number = 10
  ): Promise<CollectiveKnowledge[]> {
    return this.search({
      agent: agentId,
      limit,
    });
  }

  /**
   * Get knowledge by ID
   */
  async getKnowledge(id: string): Promise<CollectiveKnowledge | null> {
    const categories = await this.getCategories();

    for (const category of categories) {
      const filePath = path.join(this.knowledgePath, category, `${id}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const knowledge: CollectiveKnowledge = JSON.parse(content);

        // Update access tracking
        knowledge.lastAccessedAt = new Date().toISOString();
        knowledge.accessCount += 1;
        await fs.writeFile(filePath, JSON.stringify(knowledge, null, 2), 'utf-8');

        return knowledge;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Add evidence to existing knowledge
   */
  async addEvidence(
    knowledgeId: string,
    evidence: KnowledgeEvidence
  ): Promise<CollectiveKnowledge | null> {
    const knowledge = await this.getKnowledgeRaw(knowledgeId);
    if (!knowledge) return null;

    knowledge.evidence.push(evidence);
    knowledge.evidenceCount = knowledge.evidence.length;
    knowledge.updatedAt = new Date().toISOString();
    knowledge.version += 1;

    // Add source agent if new
    if (!knowledge.sourceAgents.includes(evidence.agentId)) {
      knowledge.sourceAgents.push(evidence.agentId);
    }

    // Upgrade confidence based on evidence count
    knowledge.confidence = this.calculateConfidence(knowledge.evidenceCount);

    await this.saveKnowledge(knowledge);
    return knowledge;
  }

  /**
   * Deprecate knowledge
   */
  async deprecateKnowledge(
    id: string,
    reason: string,
    supersededBy?: string
  ): Promise<void> {
    const knowledge = await this.getKnowledgeRaw(id);
    if (!knowledge) return;

    knowledge.status = supersededBy ? 'superseded' : 'deprecated';
    knowledge.supersededBy = supersededBy;
    knowledge.updatedAt = new Date().toISOString();

    await this.saveKnowledge(knowledge);
    await this.updateIndex(knowledge, 'update');

    console.log(`[CollectiveMemory] Deprecated knowledge ${id}: ${reason}`);
  }

  /**
   * Get the knowledge index (summary statistics)
   */
  async getIndex(): Promise<KnowledgeIndex> {
    if (!this.index) {
      await this.rebuildIndex();
    }
    return this.index!;
  }

  /**
   * Export all knowledge as a formatted report
   */
  async exportReport(): Promise<string> {
    const allKnowledge = await this.search({ limit: 1000 });
    const index = await this.getIndex();

    let report = `# Collective Knowledge Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Total Items**: ${index.totalItems}\n\n`;
    report += `## Statistics\n\n`;

    report += `### By Category\n`;
    for (const [category, count] of Object.entries(index.categories)) {
      report += `- ${category}: ${count}\n`;
    }

    report += `\n### Agent Contributions\n`;
    for (const [agent, count] of Object.entries(index.agentContributions)) {
      report += `- ${agent}: ${count}\n`;
    }

    report += `\n### Top Tags\n`;
    for (const { tag, count } of index.topTags.slice(0, 10)) {
      report += `- ${tag}: ${count}\n`;
    }

    report += `\n---\n\n## Knowledge Items\n\n`;

    for (const knowledge of allKnowledge) {
      report += `### ${knowledge.title}\n`;
      report += `- **ID**: ${knowledge.id}\n`;
      report += `- **Category**: ${knowledge.category}\n`;
      report += `- **Confidence**: ${knowledge.confidence}\n`;
      report += `- **Sources**: ${knowledge.sourceAgents.join(', ')}\n`;
      report += `- **Applicable To**: ${knowledge.applicableAgents.join(', ')}\n`;
      report += `- **Evidence Count**: ${knowledge.evidenceCount}\n`;
      report += `- **Version**: ${knowledge.version}\n\n`;
      report += `${knowledge.content}\n\n---\n\n`;
    }

    return report;
  }

  // ---- Private Methods ----

  private async findSimilar(
    title: string,
    category: KnowledgeCategory
  ): Promise<CollectiveKnowledge | null> {
    const categoryPath = path.join(this.knowledgePath, category);

    try {
      const files = await fs.readdir(categoryPath);
      const lowerTitle = title.toLowerCase();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(
          path.join(categoryPath, file),
          'utf-8'
        );
        const knowledge: CollectiveKnowledge = JSON.parse(content);

        if (knowledge.status !== 'active') continue;

        // Check title similarity (simple containment check)
        const existingLower = knowledge.title.toLowerCase();
        if (
          existingLower === lowerTitle ||
          existingLower.includes(lowerTitle) ||
          lowerTitle.includes(existingLower)
        ) {
          return knowledge;
        }
      }
    } catch {
      // Directory may not exist
    }

    return null;
  }

  private async mergeKnowledge(
    existing: CollectiveKnowledge,
    newOptions: AddKnowledgeOptions
  ): Promise<CollectiveKnowledge> {
    // Add source agent
    if (!existing.sourceAgents.includes(newOptions.sourceAgent)) {
      existing.sourceAgents.push(newOptions.sourceAgent);
    }

    // Add applicable agents
    for (const agent of newOptions.applicableAgents) {
      if (!existing.applicableAgents.includes(agent)) {
        existing.applicableAgents.push(agent);
      }
    }

    // Add tags
    for (const tag of newOptions.tags) {
      if (!existing.tags.includes(tag)) {
        existing.tags.push(tag);
      }
    }

    // Add evidence
    if (newOptions.evidence) {
      existing.evidence.push(newOptions.evidence);
      existing.evidenceCount = existing.evidence.length;
    }

    // Merge content
    if (newOptions.content !== existing.content) {
      existing.content += `\n\n---\nAdditional insight from ${newOptions.sourceAgent}:\n${newOptions.content}`;
    }

    // Upgrade confidence
    existing.confidence = this.calculateConfidence(existing.evidenceCount);

    existing.updatedAt = new Date().toISOString();
    existing.version += 1;

    await this.saveKnowledge(existing);
    await this.updateIndex(existing, 'update');

    console.log(
      `[CollectiveMemory] Merged knowledge: ${existing.id} ` +
      `(now ${existing.evidenceCount} evidence, confidence: ${existing.confidence})`
    );

    return existing;
  }

  private calculateRelevance(
    knowledge: CollectiveKnowledge,
    query: string
  ): number {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    let score = 0;

    // Title match (highest weight)
    const lowerTitle = knowledge.title.toLowerCase();
    if (lowerTitle === lowerQuery) score += 10;
    else if (lowerTitle.includes(lowerQuery)) score += 5;
    else {
      for (const word of words) {
        if (word.length > 2 && lowerTitle.includes(word)) score += 2;
      }
    }

    // Content match
    const lowerContent = knowledge.content.toLowerCase();
    for (const word of words) {
      if (word.length > 2 && lowerContent.includes(word)) score += 1;
    }

    // Tag match
    for (const tag of knowledge.tags) {
      if (lowerQuery.includes(tag.toLowerCase())) score += 3;
    }

    // Boost by confidence
    const confidenceBoost: Record<KnowledgeConfidence, number> = {
      proven: 2,
      established: 1.5,
      emerging: 1,
      speculative: 0.5,
    };
    score *= confidenceBoost[knowledge.confidence];

    // Boost by evidence count
    score += Math.min(knowledge.evidenceCount * 0.5, 3);

    return score;
  }

  private calculateConfidence(evidenceCount: number): KnowledgeConfidence {
    if (evidenceCount >= 5) return 'proven';
    if (evidenceCount >= 3) return 'established';
    if (evidenceCount >= 1) return 'emerging';
    return 'speculative';
  }

  private async getKnowledgeRaw(id: string): Promise<CollectiveKnowledge | null> {
    const categories = await this.getCategories();
    for (const category of categories) {
      const filePath = path.join(this.knowledgePath, category, `${id}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch {
        continue;
      }
    }
    return null;
  }

  private async saveKnowledge(knowledge: CollectiveKnowledge): Promise<void> {
    const filePath = path.join(
      this.knowledgePath,
      knowledge.category,
      `${knowledge.id}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(knowledge, null, 2), 'utf-8');
  }

  private async getCategories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.knowledgePath, {
        withFileTypes: true,
      });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  private async updateIndex(
    knowledge: CollectiveKnowledge,
    operation: 'add' | 'update'
  ): Promise<void> {
    if (!this.index) {
      this.index = {
        lastUpdated: new Date().toISOString(),
        totalItems: 0,
        categories: {},
        agentContributions: {},
        topTags: [],
      };
    }

    if (operation === 'add') {
      this.index.totalItems += 1;
    }

    // Update category counts
    this.index.categories[knowledge.category] =
      (this.index.categories[knowledge.category] || 0) + (operation === 'add' ? 1 : 0);

    // Update agent contributions
    for (const agent of knowledge.sourceAgents) {
      this.index.agentContributions[agent] =
        (this.index.agentContributions[agent] || 0) + (operation === 'add' ? 1 : 0);
    }

    // Update tag counts
    const tagCounts: Record<string, number> = {};
    for (const item of this.index.topTags) {
      tagCounts[item.tag] = item.count;
    }
    for (const tag of knowledge.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + (operation === 'add' ? 1 : 0);
    }
    this.index.topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    this.index.lastUpdated = new Date().toISOString();
    await this.persistIndex();
  }

  private async persistIndex(): Promise<void> {
    if (!this.index) return;
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  private async rebuildIndex(): Promise<void> {
    this.index = {
      lastUpdated: new Date().toISOString(),
      totalItems: 0,
      categories: {},
      agentContributions: {},
      topTags: [],
    };

    const categories = await this.getCategories();
    const tagCounts: Record<string, number> = {};

    for (const category of categories) {
      const categoryPath = path.join(this.knowledgePath, category);
      try {
        const files = await fs.readdir(categoryPath);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));

        this.index.categories[category] = jsonFiles.length;
        this.index.totalItems += jsonFiles.length;

        for (const file of jsonFiles) {
          const content = await fs.readFile(
            path.join(categoryPath, file),
            'utf-8'
          );
          const knowledge: CollectiveKnowledge = JSON.parse(content);

          for (const agent of knowledge.sourceAgents) {
            this.index.agentContributions[agent] =
              (this.index.agentContributions[agent] || 0) + 1;
          }

          for (const tag of knowledge.tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      } catch {
        continue;
      }
    }

    this.index.topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    await this.persistIndex();
    console.log(`[CollectiveMemory] Index rebuilt: ${this.index.totalItems} items`);
  }
}
