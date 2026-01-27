/**
 * Agent Middleware
 *
 * Integrates context injection into agent execution pipeline.
 */

import { AgentType, ContextRequest } from '../types/context.types';
import { ContextGatherer } from '../core/context-gatherer';
import { ContextPrioritizer } from '../core/context-prioritizer';
import { ContextInjector } from '../core/context-injector';
import { CacheManager, CACHE_TTL } from '../core/cache-manager';

export interface AgentExecutionRequest {
  agentName: AgentType;
  prompt: string;
  projectPath: string;
  requestId?: string;
  skipCache?: boolean;
}

export interface AgentExecutionResult {
  enhancedPrompt: string;
  contextMetadata: {
    retrievalTime: number;
    totalTokens: number;
    trimmed: boolean;
    cacheHit: boolean;
  };
}

export class AgentMiddleware {
  constructor(
    private gatherer: ContextGatherer,
    private prioritizer: ContextPrioritizer,
    private injector: ContextInjector,
    private cache: CacheManager
  ) {}

  /**
   * Wrap agent execution with context injection
   */
  async wrapAgentExecution(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(
      request.agentName,
      request.projectPath,
      request.prompt
    );

    // Try to get from cache
    if (!request.skipCache) {
      const cached = this.cache.get<AgentExecutionResult>(cacheKey);
      if (cached) {
        console.log(`Context cache hit for ${request.agentName}`);
        return {
          ...cached,
          contextMetadata: {
            ...cached.contextMetadata,
            cacheHit: true
          }
        };
      }
    }

    // Gather context
    const context = await this.gatherer.gather({
      userRequest: request.prompt,
      targetAgent: request.agentName,
      projectPath: request.projectPath,
      requestId: request.requestId
    });

    // Prioritize (enforce token budget)
    const prioritized = this.prioritizer.prioritize(context, request.agentName);

    // Inject into prompt
    const enhancedPrompt = await this.injector.inject(request.prompt, prioritized);

    const result: AgentExecutionResult = {
      enhancedPrompt,
      contextMetadata: {
        retrievalTime: Date.now() - startTime,
        totalTokens: prioritized.totalTokens,
        trimmed: prioritized.metadata.trimmed,
        cacheHit: false
      }
    };

    // Cache the result
    this.cache.set(cacheKey, result, CACHE_TTL.FULL_CONTEXT);

    return result;
  }

  /**
   * Execute agent with context injection
   */
  async execute(
    agentName: AgentType,
    prompt: string,
    projectPath: string
  ): Promise<string> {
    const result = await this.wrapAgentExecution({
      agentName,
      prompt,
      projectPath
    });

    console.log(
      `Context injection complete: ${result.contextMetadata.totalTokens} tokens ` +
        `(${result.contextMetadata.retrievalTime}ms, ` +
        `cache: ${result.contextMetadata.cacheHit})`
    );

    return result.enhancedPrompt;
  }

  /**
   * Invalidate cache for project
   */
  invalidateProjectCache(projectPath: string): number {
    const pattern = this.generateCacheKeyPattern('*', projectPath, '*');
    return this.cache.invalidate(pattern);
  }

  /**
   * Invalidate cache for agent
   */
  invalidateAgentCache(agentName: AgentType): number {
    const pattern = this.generateCacheKeyPattern(agentName, '*', '*');
    return this.cache.invalidate(pattern);
  }

  /**
   * Clear all context cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  private generateCacheKey(
    agentName: AgentType,
    projectPath: string,
    prompt: string
  ): string {
    // Use first 100 chars of prompt for key (avoid huge keys)
    const promptHash = this.hashString(prompt.substring(0, 100));
    const pathHash = this.hashString(projectPath);

    return `context:${agentName}:${pathHash}:${promptHash}`;
  }

  private generateCacheKeyPattern(
    agentName: string,
    projectPath: string,
    prompt: string
  ): string {
    const parts = [
      'context',
      agentName === '*' ? '.*' : agentName,
      projectPath === '*' ? '.*' : this.hashString(projectPath),
      prompt === '*' ? '.*' : this.hashString(prompt.substring(0, 100))
    ];

    return parts.join(':');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
