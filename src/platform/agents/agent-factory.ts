/**
 * Agent Factory
 *
 * Factory pattern for creating and managing agent instances
 */

import { BaseAgent } from './base-agent';
import { DeveloperAgent, DeveloperAgentConfig } from './developer-agent';
import { SREAgent, SREAgentConfig } from './sre-agent';
import { SecurityAgent, SecurityAgentConfig } from './security-agent';
import { QAAgent, QAAgentConfig } from './qa-agent';
import { ReleaseManagerAgent, ReleaseManagerAgentConfig } from './release-manager-agent';
import { ArchitectAgent, ArchitectAgentConfig } from './architect-agent';
import { FinOpsAgent, FinOpsAgentConfig } from './finops-agent';
import { ConductorAgent, ConductorAgentConfig } from './conductor-agent';
import { AgentType } from '../orchestration/types/orchestration-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('AgentFactory');

/**
 * Agent configuration map
 */
export type AgentConfigMap = {
  [AgentType.DEVELOPER]: DeveloperAgentConfig;
  [AgentType.SRE]: SREAgentConfig;
  [AgentType.SECURITY]: SecurityAgentConfig;
  [AgentType.QA]: QAAgentConfig;
  [AgentType.RELEASE_MANAGER]: ReleaseManagerAgentConfig;
  [AgentType.ARCHITECT]: ArchitectAgentConfig;
  [AgentType.FINOPS]: FinOpsAgentConfig;
  conductor: ConductorAgentConfig;
};

/**
 * Agent Factory
 * Creates agent instances based on type
 */
export class AgentFactory {
  private static agents: Map<string, BaseAgent> = new Map();

  /**
   * Create an agent instance
   */
  static createAgent<T extends keyof AgentConfigMap>(
    type: T,
    config: AgentConfigMap[T]
  ): BaseAgent {
    logger.info('Creating agent', { type, id: config.id });

    let agent: BaseAgent;

    switch (type) {
      case AgentType.DEVELOPER:
        agent = new DeveloperAgent(config as DeveloperAgentConfig);
        break;

      case AgentType.SRE:
        agent = new SREAgent(config as SREAgentConfig);
        break;

      case AgentType.SECURITY:
        agent = new SecurityAgent(config as SecurityAgentConfig);
        break;

      case AgentType.QA:
        agent = new QAAgent(config as QAAgentConfig);
        break;

      case AgentType.RELEASE_MANAGER:
        agent = new ReleaseManagerAgent(config as ReleaseManagerAgentConfig);
        break;

      case AgentType.ARCHITECT:
        agent = new ArchitectAgent(config as ArchitectAgentConfig);
        break;

      case AgentType.FINOPS:
        agent = new FinOpsAgent(config as FinOpsAgentConfig);
        break;

      case 'conductor':
        agent = new ConductorAgent(config as ConductorAgentConfig);
        break;

      default:
        throw new Error(`Unknown agent type: ${type}`);
    }

    // Store agent instance
    this.agents.set(config.id, agent);

    logger.info('Agent created', {
      type,
      id: config.id,
      name: config.name
    });

    return agent;
  }

  /**
   * Get an agent by ID
   */
  static getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Remove an agent
   */
  static async removeAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);

    if (agent) {
      await agent.shutdown();
      this.agents.delete(id);

      logger.info('Agent removed', { id });
    }
  }

  /**
   * Get all agents
   */
  static getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  static getAgentsByType(type: AgentType | 'conductor'): BaseAgent[] {
    return this.getAllAgents().filter(agent => {
      const agentType = agent.getConfig().type;
      return agentType === type;
    });
  }

  /**
   * Initialize all agents
   */
  static async initializeAll(): Promise<void> {
    logger.info('Initializing all agents', {
      count: this.agents.size
    });

    const initPromises = Array.from(this.agents.values()).map(agent =>
      agent.initialize().catch(error => {
        logger.error('Failed to initialize agent', {
          agentId: agent.getConfig().id,
          error: error.message
        });
      })
    );

    await Promise.all(initPromises);

    logger.info('All agents initialized');
  }

  /**
   * Shutdown all agents
   */
  static async shutdownAll(): Promise<void> {
    logger.info('Shutting down all agents', {
      count: this.agents.size
    });

    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.shutdown().catch(error => {
        logger.error('Failed to shutdown agent', {
          agentId: agent.getConfig().id,
          error: error.message
        });
      })
    );

    await Promise.all(shutdownPromises);

    this.agents.clear();

    logger.info('All agents shut down');
  }

  /**
   * Health check all agents
   */
  static async healthCheckAll(): Promise<{
    healthy: number;
    unhealthy: number;
    agents: Array<{ id: string; name: string; healthy: boolean }>;
  }> {
    const results = await Promise.all(
      Array.from(this.agents.values()).map(async agent => {
        const config = agent.getConfig();
        const healthy = await agent.healthCheck();

        return {
          id: config.id,
          name: config.name,
          healthy
        };
      })
    );

    const healthy = results.filter(r => r.healthy).length;
    const unhealthy = results.filter(r => !r.healthy).length;

    return {
      healthy,
      unhealthy,
      agents: results
    };
  }

  /**
   * Create a complete agent team
   */
  static async createAgentTeam(config: {
    mcpServerCommand?: string;
    enableScheduling?: boolean;
    enableEventTriggers?: boolean;
  }): Promise<{
    developer: DeveloperAgent;
    sre: SREAgent;
    security: SecurityAgent;
    qa: QAAgent;
    releaseManager: ReleaseManagerAgent;
    architect: ArchitectAgent;
    finops: FinOpsAgent;
    conductor: ConductorAgent;
  }> {
    logger.info('Creating complete agent team');

    const baseConfig = {
      mcpServerCommand: config.mcpServerCommand,
      enableScheduling: config.enableScheduling !== false,
      enableEventTriggers: config.enableEventTriggers !== false
    };

    // Create all agents
    const developer = this.createAgent(AgentType.DEVELOPER, {
      id: 'developer-agent-1',
      name: 'Developer Agent',
      description: 'Software engineering and deployment automation',
      ...baseConfig
    }) as DeveloperAgent;

    const sre = this.createAgent(AgentType.SRE, {
      id: 'sre-agent-1',
      name: 'SRE Agent',
      description: 'Site reliability and performance monitoring',
      ...baseConfig
    }) as SREAgent;

    const security = this.createAgent(AgentType.SECURITY, {
      id: 'security-agent-1',
      name: 'Security Agent',
      description: 'Security scanning and compliance validation',
      ...baseConfig
    }) as SecurityAgent;

    const qa = this.createAgent(AgentType.QA, {
      id: 'qa-agent-1',
      name: 'QA Agent',
      description: 'Quality assurance and test automation',
      ...baseConfig
    }) as QAAgent;

    const releaseManager = this.createAgent(AgentType.RELEASE_MANAGER, {
      id: 'release-manager-agent-1',
      name: 'Release Manager Agent',
      description: 'Release orchestration and deployment management',
      ...baseConfig
    }) as ReleaseManagerAgent;

    const architect = this.createAgent(AgentType.ARCHITECT, {
      id: 'architect-agent-1',
      name: 'Architect Agent',
      description: 'Architecture review and design validation',
      ...baseConfig
    }) as ArchitectAgent;

    const finops = this.createAgent(AgentType.FINOPS, {
      id: 'finops-agent-1',
      name: 'FinOps Agent',
      description: 'Cost optimization and financial operations',
      ...baseConfig
    }) as FinOpsAgent;

    const conductor = this.createAgent('conductor', {
      id: 'conductor-agent-1',
      name: 'Conductor Agent',
      description: 'Multi-agent workflow orchestration',
      ...baseConfig
    }) as ConductorAgent;

    // Register all agents with conductor
    conductor.registerAgent(developer.getConfig().id, developer);
    conductor.registerAgent(sre.getConfig().id, sre);
    conductor.registerAgent(security.getConfig().id, security);
    conductor.registerAgent(qa.getConfig().id, qa);
    conductor.registerAgent(releaseManager.getConfig().id, releaseManager);
    conductor.registerAgent(architect.getConfig().id, architect);
    conductor.registerAgent(finops.getConfig().id, finops);

    // Initialize all agents
    await this.initializeAll();

    logger.info('Agent team created and initialized');

    return {
      developer,
      sre,
      security,
      qa,
      releaseManager,
      architect,
      finops,
      conductor
    };
  }
}

export default AgentFactory;
