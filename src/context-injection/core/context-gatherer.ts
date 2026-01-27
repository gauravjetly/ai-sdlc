/**
 * Context Gatherer
 *
 * Orchestrates loading context from all sources in parallel.
 */

import { Context, ContextRequest } from '../types/context.types';
import { OrgContextLoader } from '../sources/org-context-loader';
import { ProjectContextLoader } from '../sources/project-context-loader';
import { HistoricalContextLoader } from '../sources/historical-context-loader';
import { LiveContextLoader } from '../sources/live-context-loader';
import { TokenCounter } from '../utils/token-counter';
import { v4 as uuidv4 } from 'uuid';

export class ContextGatherer {
  constructor(
    private orgLoader: OrgContextLoader,
    private projectLoader: ProjectContextLoader,
    private historicalLoader: HistoricalContextLoader,
    private liveLoader: LiveContextLoader
  ) {}

  /**
   * Gather all context for agent request
   */
  async gather(request: ContextRequest): Promise<Context> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();

    try {
      // Load all contexts in parallel for performance
      const [organizational, project, historical, live] = await Promise.all([
        this.orgLoader.load(),
        this.projectLoader.load(request.projectPath),
        this.historicalLoader.load(request.userRequest, request.targetAgent),
        this.liveLoader.load(request.projectPath)
      ]);

      const totalTokens = this.calculateTotalTokens({
        organizational,
        project,
        historical,
        live
      });

      const retrievalTime = Date.now() - startTime;

      return {
        organizational,
        project,
        historical,
        live,
        totalTokens,
        metadata: {
          retrievalTime,
          sourcesUsed: this.getSourcesUsed({ organizational, project, historical }),
          cacheHit: false,
          trimmed: false,
          requestId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Context gathering failed:', error);
      throw new Error(`Failed to gather context: ${error}`);
    }
  }

  /**
   * Gather only organizational context
   */
  async gatherOrganizational(): Promise<Context['organizational']> {
    return this.orgLoader.load();
  }

  /**
   * Gather only project context
   */
  async gatherProject(projectPath: string): Promise<Context['project']> {
    return this.projectLoader.load(projectPath);
  }

  /**
   * Gather only historical context
   */
  async gatherHistorical(query: string, agent: string): Promise<Context['historical']> {
    return this.historicalLoader.load(query, agent);
  }

  /**
   * Gather only live context
   */
  async gatherLive(projectPath: string): Promise<Context['live']> {
    return this.liveLoader.load(projectPath);
  }

  private calculateTotalTokens(context: {
    organizational: Context['organizational'];
    project: Context['project'];
    historical: Context['historical'];
    live: Context['live'];
  }): number {
    const orgTokens = context.organizational.tokens;
    const projectTokens = context.project.tokens;
    const historicalTokens = context.historical.reduce(
      (total, h) => total + TokenCounter.count(h.content),
      0
    );
    const liveTokens = context.live.tokens;

    return orgTokens + projectTokens + historicalTokens + liveTokens;
  }

  private getSourcesUsed(context: {
    organizational: Context['organizational'];
    project: Context['project'];
    historical: Context['historical'];
  }): string[] {
    const sources: string[] = [];

    if (context.organizational.standards) sources.push('org-standards');
    if (context.organizational.security) sources.push('org-security');
    if (context.organizational.architecture) sources.push('org-architecture');

    if (context.project.stack) sources.push('project-stack');
    if (context.project.architecture) sources.push('project-architecture');
    if (context.project.adrs.length > 0) sources.push('project-adrs');

    if (context.historical.length > 0) sources.push('historical-memory');

    return sources;
  }
}
