/**
 * Agent Memory Hooks
 *
 * Integration hooks for agent execution lifecycle.
 */

import { Memory, AgentType, MemoryCategory, CreateMemoryRequest } from '../types';
import { MemoryRetriever } from '../storage/memory-retriever';
import { MemoryStore } from '../storage/memory-store';

export interface AgentRequest {
  agent: AgentType;
  userRequest: string;
  projectId?: string;
  context?: Record<string, any>;
}

export interface AgentResult {
  agent: AgentType;
  output: string;
  success: boolean;
  projectId?: string;
  category?: MemoryCategory;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class AgentMemoryHooks {
  private retriever: MemoryRetriever;
  private store: MemoryStore;

  constructor(retriever: MemoryRetriever, store: MemoryStore) {
    this.retriever = retriever;
    this.store = store;
  }

  /**
   * Called before agent execution
   * Retrieves relevant memories to provide context
   */
  async preAgentExecution(request: AgentRequest): Promise<Memory[]> {
    console.log(`[AgentHooks] Pre-execution for ${request.agent}: ${request.userRequest.substring(0, 100)}`);

    try {
      // Retrieve relevant memories
      const result = await this.retriever.search({
        query: request.userRequest,
        agent: request.agent,
        limit: 5,
        minSimilarity: 0.7,
        filters: {
          status: 'active',
          project: request.projectId,
        },
      });

      console.log(`[AgentHooks] Retrieved ${result.memories.length} relevant memories`);

      // Also get recent memories from same agent
      const recentMemories = await this.retriever.getByAgent(request.agent, 3);

      // Combine and deduplicate
      const combinedMemories = this.deduplicateMemories([
        ...result.memories,
        ...recentMemories,
      ]);

      return combinedMemories.slice(0, 5);
    } catch (error) {
      console.error('[AgentHooks] Pre-execution failed:', error);
      return [];
    }
  }

  /**
   * Called after agent execution
   * Stores the result as a new memory
   */
  async postAgentExecution(result: AgentResult): Promise<void> {
    console.log(`[AgentHooks] Post-execution for ${result.agent}`);

    // Only store successful executions
    if (!result.success) {
      console.log('[AgentHooks] Skipping memory storage for failed execution');
      return;
    }

    try {
      // Determine category
      const category = result.category || this.categorizeResult(result);

      // Extract title from output
      const title = this.extractTitle(result.output, result.agent);

      // Create memory request
      const memoryRequest: CreateMemoryRequest = {
        agent: result.agent,
        category,
        title,
        content: result.output,
        metadata: {
          project: result.projectId,
          success: result.success,
          tags: result.tags || this.extractTags(result.output),
          ...result.metadata,
        },
        createdBy: result.agent,
      };

      // Store memory
      const memory = await this.store.storeMemory(memoryRequest);

      console.log(`[AgentHooks] Stored memory ${memory.id} for ${result.agent}`);
    } catch (error) {
      console.error('[AgentHooks] Post-execution memory storage failed:', error);
    }
  }

  /**
   * Called when agent encounters an error or anti-pattern
   */
  async captureFailure(
    agent: AgentType,
    failureDescription: string,
    context?: Record<string, any>
  ): Promise<void> {
    console.log(`[AgentHooks] Capturing failure for ${agent}`);

    try {
      const memoryRequest: CreateMemoryRequest = {
        agent,
        category: 'failed-approaches',
        title: this.extractTitle(failureDescription, agent),
        content: failureDescription,
        metadata: {
          success: false,
          tags: ['failure', 'anti-pattern'],
          ...context,
        },
        createdBy: agent,
      };

      await this.store.storeMemory(memoryRequest);
    } catch (error) {
      console.error('[AgentHooks] Failure capture failed:', error);
    }
  }

  /**
   * Get memories for specific context
   */
  async getContextMemories(
    agent: AgentType,
    context: {
      query: string;
      category?: MemoryCategory;
      project?: string;
    }
  ): Promise<Memory[]> {
    try {
      const result = await this.retriever.search({
        query: context.query,
        agent,
        category: context.category,
        limit: 10,
        filters: {
          status: 'active',
          project: context.project,
        },
      });

      return result.memories;
    } catch (error) {
      console.error('[AgentHooks] Get context memories failed:', error);
      return [];
    }
  }

  /**
   * Categorize agent result automatically
   */
  private categorizeResult(result: AgentResult): MemoryCategory {
    const agentCategoryMap: Record<AgentType, MemoryCategory> = {
      ba: 'architecture-decisions',
      jets: 'architecture-decisions',
      ux: 'ux-patterns',
      engineer: 'code-patterns',
      security: 'security-findings',
      qa: 'test-strategies',
      atlas: 'deployment-patterns',
      customer: 'vintiq-knowledge',
      tracker: 'process-patterns',
      conductor: 'process-patterns',
      'ask-tom': 'cross-agent-learning',
      finops: 'process-patterns',
    };

    return agentCategoryMap[result.agent] || 'code-patterns';
  }

  /**
   * Extract title from output
   */
  private extractTitle(output: string, agent: AgentType): string {
    // Look for markdown heading
    const headingMatch = output.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Look for first sentence
    const firstSentence = output.split('\n')[0].trim();
    if (firstSentence.length > 0 && firstSentence.length < 100) {
      return firstSentence;
    }

    // Use first 50 characters
    const truncated = output.substring(0, 50).trim();
    return truncated + (output.length > 50 ? '...' : '');
  }

  /**
   * Extract tags from output content
   */
  private extractTags(output: string): string[] {
    const tags: string[] = [];

    // Common technology keywords
    const keywords = [
      'authentication',
      'authorization',
      'database',
      'api',
      'security',
      'testing',
      'deployment',
      'typescript',
      'javascript',
      'python',
      'go',
      'react',
      'node',
      'express',
      'jwt',
      'oauth',
      'sql',
      'nosql',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
    ];

    const lowerOutput = output.toLowerCase();

    for (const keyword of keywords) {
      if (lowerOutput.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return tags.slice(0, 5); // Limit to 5 tags
  }

  /**
   * Deduplicate memories by ID
   */
  private deduplicateMemories(memories: Memory[]): Memory[] {
    const seen = new Set<string>();
    const unique: Memory[] = [];

    for (const memory of memories) {
      if (!seen.has(memory.id)) {
        seen.add(memory.id);
        unique.push(memory);
      }
    }

    return unique;
  }
}
