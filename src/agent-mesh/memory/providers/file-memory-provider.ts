/**
 * File-Based Memory Provider
 *
 * Wraps the existing CollectiveMemory class to implement the
 * MemoryService interface. This preserves full backward compatibility
 * with the original file-based storage system.
 */

import {
  MemoryService,
  StoreKnowledgeInput,
  SearchKnowledgeOptions,
  MemoryServiceStats,
} from '../memory-service';
import { CollectiveMemory, AddKnowledgeOptions } from '../collective-memory';
import {
  AgentId,
  CollectiveKnowledge,
  KnowledgeEvidence,
  AgentMeshConfig,
} from '../../types';

export class FileMemoryProvider implements MemoryService {
  private collectiveMemory: CollectiveMemory;

  constructor(config: Partial<AgentMeshConfig> = {}) {
    this.collectiveMemory = new CollectiveMemory(config);
  }

  async initialize(): Promise<void> {
    await this.collectiveMemory.initialize();
    console.log('[FileMemoryProvider] Initialized');
  }

  async storeKnowledge(input: StoreKnowledgeInput): Promise<CollectiveKnowledge> {
    const options: AddKnowledgeOptions = {
      category: input.category,
      title: input.title,
      content: input.content,
      confidence: input.confidence,
      sourceAgent: input.sourceAgent,
      applicableAgents: input.applicableAgents,
      tags: input.tags,
      evidence: input.evidence,
    };
    return this.collectiveMemory.addKnowledge(options);
  }

  async searchKnowledge(options: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    return this.collectiveMemory.search({
      query: options.query,
      category: options.category,
      agent: options.agent,
      confidence: options.confidence,
      tags: options.tags,
      limit: options.limit,
      includeDeprecated: options.includeDeprecated,
    });
  }

  async getKnowledge(id: string): Promise<CollectiveKnowledge | null> {
    return this.collectiveMemory.getKnowledge(id);
  }

  async addEvidence(
    knowledgeId: string,
    evidence: KnowledgeEvidence
  ): Promise<CollectiveKnowledge | null> {
    return this.collectiveMemory.addEvidence(knowledgeId, evidence);
  }

  async deprecateKnowledge(
    id: string,
    reason: string,
    supersededBy?: string
  ): Promise<void> {
    await this.collectiveMemory.deprecateKnowledge(id, reason, supersededBy);
  }

  async getAgentRelevantKnowledge(
    agentId: AgentId,
    limit: number = 10
  ): Promise<CollectiveKnowledge[]> {
    return this.collectiveMemory.getAgentRelevantKnowledge(agentId, limit);
  }

  async getStats(): Promise<MemoryServiceStats> {
    const index = await this.collectiveMemory.getIndex();
    return {
      totalItems: index.totalItems,
      categories: index.categories,
      agentContributions: index.agentContributions,
      provider: 'file',
    };
  }

  async exportReport(): Promise<string> {
    return this.collectiveMemory.exportReport();
  }

  async shutdown(): Promise<void> {
    // No-op for file-based provider
  }

  /**
   * Expose the underlying CollectiveMemory for backward compatibility.
   */
  getCollectiveMemory(): CollectiveMemory {
    return this.collectiveMemory;
  }
}
