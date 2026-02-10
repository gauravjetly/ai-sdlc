/**
 * Agent Registry
 *
 * Manages registration and retrieval of agents
 */

import { Agent, AgentConfig } from '../types/orchestration-types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('AgentRegistry');

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  /**
   * Register an agent
   */
  register(agent: Agent): void {
    if (this.agents.has(agent.config.id)) {
      logger.warn(`Agent already registered: ${agent.config.id}, replacing...`);
    }

    this.agents.set(agent.config.id, agent);
    logger.info(`Agent registered: ${agent.config.id} (${agent.config.name})`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    if (this.agents.has(agentId)) {
      this.agents.delete(agentId);
      logger.info(`Agent unregistered: ${agentId}`);
    }
  }

  /**
   * Get an agent by ID
   */
  get(agentId: string): Agent | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  /**
   * Check if agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * List all registered agents
   */
  list(): AgentConfig[] {
    return Array.from(this.agents.values()).map(agent => agent.config);
  }

  /**
   * List agents by type
   */
  listByType(type: string): AgentConfig[] {
    return this.list().filter(config => config.type === type);
  }

  /**
   * List enabled agents
   */
  listEnabled(): AgentConfig[] {
    return this.list().filter(config => config.enabled);
  }

  /**
   * Get total count of registered agents
   */
  count(): number {
    return this.agents.size;
  }

  /**
   * Initialize all agents
   */
  async initializeAll(): Promise<void> {
    logger.info(`Initializing ${this.agents.size} agents...`);

    const initPromises = Array.from(this.agents.values()).map(agent =>
      agent.initialize().catch(error => {
        logger.error(`Failed to initialize agent ${agent.config.id}:`, error);
      })
    );

    await Promise.all(initPromises);
    logger.info('All agents initialized');
  }

  /**
   * Health check all agents
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [agentId, agent] of this.agents) {
      try {
        const healthy = await agent.healthCheck();
        results.set(agentId, healthy);
      } catch (error) {
        logger.error(`Health check failed for agent ${agentId}:`, error);
        results.set(agentId, false);
      }
    }

    return results;
  }

  /**
   * Clear all registered agents
   */
  clear(): void {
    this.agents.clear();
    logger.info('All agents unregistered');
  }
}
