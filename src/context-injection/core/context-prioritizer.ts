/**
 * Context Prioritizer
 *
 * Enforces token budget by trimming context based on priority.
 */

import { Context, AgentType, TokenBudgetConfig } from '../types/context.types';
import { TokenCounter } from '../utils/token-counter';

export class ContextPrioritizer {
  private static readonly AGENT_TOKEN_BUDGETS: Record<AgentType, number> = {
    conductor: 2000,
    ba: 3000,
    architect: 5000,
    engineer: 4000,
    security: 4000,
    qa: 3000,
    atlas: 2000,
    customer: 2000
  };

  private static readonly DEFAULT_MAX_TOKENS = 20000;

  /**
   * Prioritize context to fit token budget
   */
  prioritize(context: Context, agentType: AgentType, maxTokens?: number): Context {
    const budget = maxTokens || ContextPrioritizer.AGENT_TOKEN_BUDGETS[agentType];

    if (context.totalTokens <= budget) {
      return context;
    }

    console.log(
      `Context exceeds budget: ${context.totalTokens} > ${budget}. Trimming...`
    );

    const config = this.createBudgetConfig(budget);
    const trimmed = this.trimToBudget(context, config);

    return {
      ...trimmed,
      metadata: {
        ...trimmed.metadata,
        trimmed: true
      }
    };
  }

  private createBudgetConfig(budget: number): TokenBudgetConfig {
    return {
      maxTokens: budget,
      allocations: {
        mandatory: Math.floor(budget * 0.15), // 15% - Compliance requirements
        standards: Math.floor(budget * 0.35), // 35% - Org standards
        project: Math.floor(budget * 0.30),   // 30% - Project context
        historical: Math.floor(budget * 0.20) // 20% - Past implementations
      }
    };
  }

  private trimToBudget(context: Context, config: TokenBudgetConfig): Context {
    // Trim historical context first (lowest priority)
    const trimmedHistorical = this.trimHistoricalContext(
      context.historical,
      config.allocations.historical
    );

    // Trim organizational context if needed
    const trimmedOrganizational = this.trimOrganizationalContext(
      context.organizational,
      config.allocations.standards
    );

    // Trim project context if needed
    const trimmedProject = this.trimProjectContext(
      context.project,
      config.allocations.project
    );

    // Live context is always included (small size)
    const newTotalTokens =
      trimmedOrganizational.tokens +
      trimmedProject.tokens +
      trimmedHistorical.reduce((sum, h) => sum + TokenCounter.count(h.content), 0) +
      context.live.tokens;

    return {
      organizational: trimmedOrganizational,
      project: trimmedProject,
      historical: trimmedHistorical,
      live: context.live,
      totalTokens: newTotalTokens,
      metadata: context.metadata
    };
  }

  private trimHistoricalContext(
    historical: Context['historical'],
    maxTokens: number
  ): Context['historical'] {
    // Sort by similarity (relevance)
    const sorted = [...historical].sort((a, b) => b.similarity - a.similarity);

    const trimmed: Context['historical'] = [];
    let currentTokens = 0;

    for (const item of sorted) {
      const itemTokens = TokenCounter.count(item.content);

      if (currentTokens + itemTokens <= maxTokens) {
        trimmed.push(item);
        currentTokens += itemTokens;
      } else {
        // Try to fit summarized version
        const summary = this.summarizeHistoricalItem(item);
        const summaryTokens = TokenCounter.count(summary.content);

        if (currentTokens + summaryTokens <= maxTokens) {
          trimmed.push(summary);
          currentTokens += summaryTokens;
        }
      }
    }

    return trimmed;
  }

  private trimOrganizationalContext(
    org: Context['organizational'],
    maxTokens: number
  ): Context['organizational'] {
    if (org.tokens <= maxTokens) {
      return org;
    }

    // Priority order: security > standards > architecture
    const priorityOrder = [
      { key: 'security' as const, content: org.security },
      { key: 'standards' as const, content: org.standards },
      { key: 'architecture' as const, content: org.architecture },
      { key: 'testing' as const, content: org.testing },
      { key: 'deployment' as const, content: org.deployment }
    ];

    const trimmed: any = { ...org };
    let currentTokens = org.tokens;

    // Trim from lowest priority until we fit
    for (let i = priorityOrder.length - 1; i >= 0 && currentTokens > maxTokens; i--) {
      const item = priorityOrder[i];
      if (item) {
        const itemTokens = TokenCounter.count(item.content);
        const targetTokens = Math.floor(itemTokens * 0.6); // Trim to 60%

        trimmed[item.key] = TokenCounter.smartTruncate(item.content, targetTokens);
        currentTokens -= itemTokens - targetTokens;
      }
    }

    trimmed.tokens = currentTokens;
    return trimmed;
  }

  private trimProjectContext(
    project: Context['project'],
    maxTokens: number
  ): Context['project'] {
    if (project.tokens <= maxTokens) {
      return project;
    }

    // Trim in order: existing code > conventions > architecture > stack
    const trimmed = { ...project };
    let currentTokens = project.tokens;

    if (currentTokens > maxTokens) {
      const existingTokens = TokenCounter.count(project.existing);
      const targetTokens = Math.floor(existingTokens * 0.5);
      trimmed.existing = TokenCounter.smartTruncate(project.existing, targetTokens);
      currentTokens -= existingTokens - targetTokens;
    }

    if (currentTokens > maxTokens) {
      const conventionsTokens = TokenCounter.count(project.conventions);
      const targetTokens = Math.floor(conventionsTokens * 0.7);
      trimmed.conventions = TokenCounter.smartTruncate(project.conventions, targetTokens);
      currentTokens -= conventionsTokens - targetTokens;
    }

    if (currentTokens > maxTokens && project.adrs.length > 3) {
      trimmed.adrs = project.adrs.slice(0, 3); // Keep top 3 ADRs
    }

    trimmed.tokens = currentTokens;
    return trimmed;
  }

  private summarizeHistoricalItem(item: Context['historical'][0]): Context['historical'][0] {
    // Extract first 2-3 sentences
    const sentences = item.content.split(/[.!?]+\s+/);
    const summary = sentences.slice(0, 3).join('. ') + '.';

    return {
      ...item,
      content: summary
    };
  }

  /**
   * Calculate optimal token budget for agent type
   */
  static getTokenBudget(agentType: AgentType): number {
    return this.AGENT_TOKEN_BUDGETS[agentType] || this.DEFAULT_MAX_TOKENS;
  }
}
