/**
 * Developer Agent Tests
 */

import { DeveloperAgent } from '../../agents/developer-agent';
import { AgentType } from '../../orchestration/types/orchestration-types';

// Mock MCP Client
jest.mock('../../mcp/client/mcp-client', () => {
  return {
    PlatformMCPClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue([]),
      deployApplication: jest.fn().mockResolvedValue({
        deployment_id: 'dep-123',
        status: 'in_progress'
      }),
      runTests: jest.fn().mockResolvedValue({
        total: 100,
        passed: 98,
        failed: 2,
        skipped: 0,
        duration: 5000,
        coverage: { percentage: 85 }
      }),
      analyzeDependencies: jest.fn().mockResolvedValue({
        total_dependencies: 50,
        outdated_dependencies: 5,
        outdated_packages: ['package-1', 'package-2']
      }),
      getCodeCoverage: jest.fn().mockResolvedValue({
        percentage: 85,
        meets_threshold: true
      }),
      rollbackDeployment: jest.fn().mockResolvedValue({
        status: 'success'
      }),
      getLogs: jest.fn().mockResolvedValue({
        entries: []
      }),
      callTool: jest.fn().mockResolvedValue({
        quality_score: 85,
        issues_found: 5
      })
    }))
  };
});

describe('DeveloperAgent', () => {
  let agent: DeveloperAgent;

  beforeEach(() => {
    agent = new DeveloperAgent({
      id: 'test-dev-agent',
      name: 'Test Developer Agent',
      description: 'Test agent for development tasks',
      enableScheduling: false,
      enableEventTriggers: false
    });
  });

  afterEach(async () => {
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();

      const healthy = await agent.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should have correct agent type', () => {
      expect(agent.getAgentType()).toBe(AgentType.DEVELOPER);
    });

    it('should have correct capabilities', () => {
      const capabilities = agent.getCapabilities();
      expect(capabilities).toContain('deploy_application');
      expect(capabilities).toContain('run_tests');
      expect(capabilities).toContain('analyze_code_quality');
      expect(capabilities).toContain('check_dependencies');
    });

    it('should return agent configuration', () => {
      const config = agent.getConfig();
      expect(config.id).toBe('test-dev-agent');
      expect(config.name).toBe('Test Developer Agent');
      expect(config.type).toBe(AgentType.DEVELOPER);
    });
  });

  describe('Deployment', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should deploy application successfully', async () => {
      const result = await agent.deployApplication({
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev'
      });

      expect(result.deployment_id).toBe('dep-123');
      expect(result.status).toBe('in_progress');
    });

    it('should deploy with custom strategy', async () => {
      const result = await agent.deployApplication({
        application: 'test-app',
        version: '1.0.0',
        environment: 'prod',
        strategy: 'blue-green'
      });

      expect(result.deployment_id).toBeDefined();
    });
  });

  describe('Testing', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should run unit tests successfully', async () => {
      const result = await agent.runTests({
        type: 'unit',
        parallel: true
      });

      expect(result.total).toBe(100);
      expect(result.passed).toBe(98);
      expect(result.failed).toBe(2);
    });

    it('should run tests with coverage', async () => {
      const result = await agent.runTests({
        type: 'unit',
        parallel: true,
        coverage: true
      });

      expect(result.coverage).toBeDefined();
      expect(result.coverage.percentage).toBe(85);
    });

    it('should check test coverage', async () => {
      const result = await agent.checkCoverage({
        threshold: 80
      });

      expect(result.percentage).toBe(85);
      expect(result.meets_threshold).toBe(true);
    });
  });

  describe('Code Quality', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should analyze code quality', async () => {
      const result = await agent.analyzeCodeQuality({
        target: 'src/'
      });

      expect(result.quality_score).toBe(85);
      expect(result.issues_found).toBe(5);
    });

    it('should check dependencies', async () => {
      const result = await agent.checkDependencies({
        target: '.'
      });

      expect(result.total_dependencies).toBe(50);
      expect(result.outdated_dependencies).toBe(5);
      expect(result.outdated_packages).toHaveLength(2);
    });
  });

  describe('Rollback', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should rollback deployment', async () => {
      const result = await agent.rollbackDeployment({
        deploymentId: 'dep-123'
      });

      expect(result.status).toBe('success');
    });
  });

  describe('Execution', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should execute deploy action', async () => {
      const result = await agent.execute({
        action: 'deploy',
        application: 'test-app',
        version: '1.0.0',
        environment: 'dev'
      });

      expect(result.status).toBe('completed');
      expect(result.result).toBeDefined();
    });

    it('should execute run_tests action', async () => {
      const result = await agent.execute({
        action: 'run_tests',
        type: 'unit'
      });

      expect(result.status).toBe('completed');
      expect(result.result.total).toBe(100);
    });

    it('should handle unknown action', async () => {
      await expect(async () => {
        await agent.execute({
          action: 'unknown_action'
        });
      }).rejects.toThrow('Unknown action: unknown_action');
    });

    it('should track execution history', async () => {
      await agent.execute({
        action: 'deploy',
        application: 'test-app',
        version: '1.0.0'
      });

      await agent.execute({
        action: 'run_tests',
        type: 'unit'
      });

      const history = agent.getExecutionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('completed');
    });

    it('should limit execution history', async () => {
      await agent.execute({ action: 'run_tests', type: 'unit' });
      await agent.execute({ action: 'run_tests', type: 'unit' });
      await agent.execute({ action: 'run_tests', type: 'unit' });

      const history = agent.getExecutionHistory(2);
      expect(history).toHaveLength(2);
    });
  });

  describe('Health Check', () => {
    it('should return false when not initialized', async () => {
      const healthy = await agent.healthCheck();
      expect(healthy).toBe(false);
    });

    it('should return true when initialized', async () => {
      await agent.initialize();
      const healthy = await agent.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await agent.initialize();
      await agent.shutdown();

      const healthy = await agent.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
