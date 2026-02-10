/**
 * Orchestrator Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { Orchestrator } from '../../orchestration/engine/orchestrator';
import { DeveloperAgent } from '../../orchestration/agents/example-developer-agent';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  const testConfigDir = path.join(__dirname, 'test-config');

  beforeEach(async () => {
    orchestrator = new Orchestrator();

    // Register test agent
    const devAgent = new DeveloperAgent();
    orchestrator.getAgentRegistry().register(devAgent);

    // Create test config directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(async () => {
    if (orchestrator.getState().running) {
      await orchestrator.stop();
    }

    // Clean up test config
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Lifecycle Management', () => {
    it('should start and stop orchestrator', async () => {
      expect(orchestrator.getState().running).toBe(false);

      await orchestrator.start();
      expect(orchestrator.getState().running).toBe(true);

      await orchestrator.stop();
      expect(orchestrator.getState().running).toBe(false);
    });

    it('should not start if already running', async () => {
      await orchestrator.start();
      await orchestrator.start(); // Should log warning

      expect(orchestrator.getState().running).toBe(true);

      await orchestrator.stop();
    });

    it('should initialize registered agents on start', async () => {
      const registry = orchestrator.getAgentRegistry();
      expect(registry.count()).toBeGreaterThan(0);

      await orchestrator.start();

      // Agents should be initialized
      const healthCheck = await registry.healthCheckAll();
      expect(healthCheck.size).toBeGreaterThan(0);

      await orchestrator.stop();
    });
  });

  describe('Agent Execution', () => {
    it('should execute agent directly', async () => {
      await orchestrator.start();

      const result = await orchestrator.executeAgent('developer-agent', {
        action: 'deploy',
        environment: 'dev'
      });

      expect(result.status).toBe('completed');
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);

      await orchestrator.stop();
    }, 10000);

    it('should throw error for unknown agent', async () => {
      await orchestrator.start();

      await expect(
        orchestrator.executeAgent('unknown-agent', {})
      ).rejects.toThrow('Agent not found');

      await orchestrator.stop();
    });

    it('should track active executions', async () => {
      await orchestrator.start();

      const stateBefore = orchestrator.getState();
      const activeExecutionsBefore = stateBefore.activeExecutions;

      // Start execution (will increment active count)
      const executionPromise = orchestrator.executeAgent('developer-agent', {
        action: 'build',
        branch: 'main'
      });

      await executionPromise;

      const stateAfter = orchestrator.getState();
      expect(stateAfter.totalExecutions).toBeGreaterThan(stateBefore.totalExecutions);

      await orchestrator.stop();
    }, 10000);
  });

  describe('Workflow Execution', () => {
    it('should execute workflow', async () => {
      await orchestrator.start();

      // Register a test workflow
      const workflowEngine = orchestrator.getWorkflowEngine();
      workflowEngine.registerWorkflow({
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Deploy',
            agentId: 'developer-agent',
            action: 'deploy',
            parameters: {
              environment: 'dev'
            }
          }
        ]
      });

      const result = await orchestrator.executeWorkflow('test-workflow', {
        application: 'test-app'
      });

      expect(result.status).toBe('completed');
      expect(result.steps).toHaveLength(1);

      await orchestrator.stop();
    }, 10000);
  });

  describe('Schedule Loading', () => {
    it('should load schedules from config file', async () => {
      const scheduleConfig = {
        schedules: [
          {
            name: 'test-job',
            agentId: 'developer-agent',
            cron: '0 9 * * *',
            enabled: true,
            parameters: {
              action: 'update_dependencies'
            }
          }
        ]
      };

      const configPath = path.join(testConfigDir, 'schedules.yaml');
      fs.writeFileSync(configPath, JSON.stringify(scheduleConfig));

      await orchestrator.start(configPath);

      const state = orchestrator.getState();
      expect(state.scheduledJobs).toBe(1);

      await orchestrator.stop();
    });

    it('should handle invalid schedule config', async () => {
      const invalidConfig = {
        invalid: 'config'
      };

      const configPath = path.join(testConfigDir, 'invalid.yaml');
      fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

      await expect(
        orchestrator.start(configPath)
      ).rejects.toThrow();
    });
  });

  describe('Workflow Loading', () => {
    it('should load workflows from directory', async () => {
      const workflowsDir = path.join(testConfigDir, 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });

      const workflow = {
        workflow: {
          id: 'loaded-workflow',
          name: 'Loaded Workflow',
          description: 'Workflow loaded from file',
          steps: []
        }
      };

      fs.writeFileSync(
        path.join(workflowsDir, 'test-workflow.yaml'),
        JSON.stringify(workflow)
      );

      await orchestrator.loadWorkflows(workflowsDir);

      const state = orchestrator.getState();
      expect(state.workflows).toBe(1);

      const loadedWorkflow = orchestrator.getWorkflowEngine().getWorkflow('loaded-workflow');
      expect(loadedWorkflow).toBeDefined();
      expect(loadedWorkflow?.name).toBe('Loaded Workflow');
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      await orchestrator.start();

      const health = await orchestrator.healthCheck();

      expect(health.orchestrator).toBe(true);
      expect(health.scheduler).toBe(true);
      expect(health.agents.size).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should report unhealthy when not running', async () => {
      const health = await orchestrator.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.orchestrator).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should track orchestrator state', async () => {
      const initialState = orchestrator.getState();
      expect(initialState.running).toBe(false);
      expect(initialState.totalExecutions).toBe(0);

      await orchestrator.start();

      const runningState = orchestrator.getState();
      expect(runningState.running).toBe(true);
      expect(runningState.startTime).toBeDefined();

      await orchestrator.stop();
    });
  });

  describe('Sub-component Access', () => {
    it('should provide access to scheduler', () => {
      const scheduler = orchestrator.getScheduler();
      expect(scheduler).toBeDefined();
    });

    it('should provide access to event manager', () => {
      const eventManager = orchestrator.getEventManager();
      expect(eventManager).toBeDefined();
    });

    it('should provide access to workflow engine', () => {
      const workflowEngine = orchestrator.getWorkflowEngine();
      expect(workflowEngine).toBeDefined();
    });

    it('should provide access to agent registry', () => {
      const agentRegistry = orchestrator.getAgentRegistry();
      expect(agentRegistry).toBeDefined();
    });
  });
});
