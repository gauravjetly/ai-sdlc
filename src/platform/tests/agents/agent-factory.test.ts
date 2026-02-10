/**
 * Agent Factory Tests
 */

import { AgentFactory } from '../../agents/agent-factory';
import { AgentType } from '../../orchestration/types/orchestration-types';

// Mock MCP Client
jest.mock('../../mcp/client/mcp-client');

describe('AgentFactory', () => {
  afterEach(async () => {
    await AgentFactory.shutdownAll();
  });

  describe('Agent Creation', () => {
    it('should create developer agent', () => {
      const agent = AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Developer Agent',
        description: 'Test developer agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getConfig().id).toBe('dev-1');
      expect(agent.getAgentType()).toBe(AgentType.DEVELOPER);
    });

    it('should create SRE agent', () => {
      const agent = AgentFactory.createAgent(AgentType.SRE, {
        id: 'sre-1',
        name: 'SRE Agent',
        description: 'Test SRE agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.SRE);
    });

    it('should create security agent', () => {
      const agent = AgentFactory.createAgent(AgentType.SECURITY, {
        id: 'sec-1',
        name: 'Security Agent',
        description: 'Test security agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.SECURITY);
    });

    it('should create QA agent', () => {
      const agent = AgentFactory.createAgent(AgentType.QA, {
        id: 'qa-1',
        name: 'QA Agent',
        description: 'Test QA agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.QA);
    });

    it('should create release manager agent', () => {
      const agent = AgentFactory.createAgent(AgentType.RELEASE_MANAGER, {
        id: 'rm-1',
        name: 'Release Manager Agent',
        description: 'Test release manager agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.RELEASE_MANAGER);
    });

    it('should create architect agent', () => {
      const agent = AgentFactory.createAgent(AgentType.ARCHITECT, {
        id: 'arch-1',
        name: 'Architect Agent',
        description: 'Test architect agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.ARCHITECT);
    });

    it('should create FinOps agent', () => {
      const agent = AgentFactory.createAgent(AgentType.FINOPS, {
        id: 'finops-1',
        name: 'FinOps Agent',
        description: 'Test FinOps agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.FINOPS);
    });

    it('should create conductor agent', () => {
      const agent = AgentFactory.createAgent('conductor', {
        id: 'conductor-1',
        name: 'Conductor Agent',
        description: 'Test conductor agent',
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(agent).toBeDefined();
      expect(agent.getConfig().id).toBe('conductor-1');
    });
  });

  describe('Agent Retrieval', () => {
    it('should get agent by ID', () => {
      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Developer Agent',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      const agent = AgentFactory.getAgent('dev-1');
      expect(agent).toBeDefined();
      expect(agent?.getConfig().id).toBe('dev-1');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = AgentFactory.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });

    it('should get all agents', () => {
      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Dev 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      AgentFactory.createAgent(AgentType.SRE, {
        id: 'sre-1',
        name: 'SRE 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      const agents = AgentFactory.getAllAgents();
      expect(agents).toHaveLength(2);
    });

    it('should get agents by type', () => {
      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Dev 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-2',
        name: 'Dev 2',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      AgentFactory.createAgent(AgentType.SRE, {
        id: 'sre-1',
        name: 'SRE 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      const devAgents = AgentFactory.getAgentsByType(AgentType.DEVELOPER);
      expect(devAgents).toHaveLength(2);

      const sreAgents = AgentFactory.getAgentsByType(AgentType.SRE);
      expect(sreAgents).toHaveLength(1);
    });
  });

  describe('Agent Removal', () => {
    it('should remove agent by ID', async () => {
      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Developer Agent',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      await AgentFactory.removeAgent('dev-1');

      const agent = AgentFactory.getAgent('dev-1');
      expect(agent).toBeUndefined();
    });
  });

  describe('Agent Team Creation', () => {
    it('should create complete agent team', async () => {
      const team = await AgentFactory.createAgentTeam({
        enableScheduling: false,
        enableEventTriggers: false
      });

      expect(team.developer).toBeDefined();
      expect(team.sre).toBeDefined();
      expect(team.security).toBeDefined();
      expect(team.qa).toBeDefined();
      expect(team.releaseManager).toBeDefined();
      expect(team.architect).toBeDefined();
      expect(team.finops).toBeDefined();
      expect(team.conductor).toBeDefined();

      // Verify all agents are initialized
      expect(await team.developer.healthCheck()).toBe(true);
      expect(await team.sre.healthCheck()).toBe(true);
      expect(await team.security.healthCheck()).toBe(true);
      expect(await team.qa.healthCheck()).toBe(true);
    }, 30000); // Increase timeout for initialization
  });

  describe('Health Checks', () => {
    it('should perform health check on all agents', async () => {
      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Dev 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      AgentFactory.createAgent(AgentType.SRE, {
        id: 'sre-1',
        name: 'SRE 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      await AgentFactory.initializeAll();

      const healthStatus = await AgentFactory.healthCheckAll();

      expect(healthStatus.agents).toHaveLength(2);
      expect(healthStatus.healthy).toBe(2);
      expect(healthStatus.unhealthy).toBe(0);
    }, 30000);
  });

  describe('Shutdown', () => {
    it('should shutdown all agents', async () => {
      AgentFactory.createAgent(AgentType.DEVELOPER, {
        id: 'dev-1',
        name: 'Dev 1',
        description: 'Test',
        enableScheduling: false,
        enableEventTriggers: false
      });

      await AgentFactory.initializeAll();
      await AgentFactory.shutdownAll();

      const agents = AgentFactory.getAllAgents();
      expect(agents).toHaveLength(0);
    });
  });
});
