/**
 * Workflow Engine Tests
 */

import { WorkflowEngine } from '../../orchestration/engine/workflow-engine';
import { AgentRegistry } from '../../orchestration/agents/agent-registry';
import { DeveloperAgent } from '../../orchestration/agents/example-developer-agent';
import { Workflow } from '../../orchestration/types/orchestration-types';

describe('WorkflowEngine', () => {
  let workflowEngine: WorkflowEngine;
  let agentRegistry: AgentRegistry;

  beforeEach(async () => {
    agentRegistry = new AgentRegistry();

    // Register test agent
    const devAgent = new DeveloperAgent();
    await devAgent.initialize();
    agentRegistry.register(devAgent);

    workflowEngine = new WorkflowEngine(agentRegistry);
  });

  describe('Workflow Management', () => {
    it('should register a workflow', () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: []
      };

      workflowEngine.registerWorkflow(workflow);

      const retrieved = workflowEngine.getWorkflow('test-workflow');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Workflow');
    });

    it('should list all workflows', () => {
      const workflow1: Workflow = {
        id: 'workflow-1',
        name: 'Workflow 1',
        description: 'First workflow',
        steps: []
      };

      const workflow2: Workflow = {
        id: 'workflow-2',
        name: 'Workflow 2',
        description: 'Second workflow',
        steps: []
      };

      workflowEngine.registerWorkflow(workflow1);
      workflowEngine.registerWorkflow(workflow2);

      const workflows = workflowEngine.listWorkflows();
      expect(workflows).toHaveLength(2);
    });

    it('should unregister a workflow', () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: []
      };

      workflowEngine.registerWorkflow(workflow);
      expect(workflowEngine.listWorkflows()).toHaveLength(1);

      workflowEngine.unregisterWorkflow('test-workflow');
      expect(workflowEngine.listWorkflows()).toHaveLength(0);
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a simple workflow', async () => {
      const workflow: Workflow = {
        id: 'simple-workflow',
        name: 'Simple Workflow',
        description: 'A simple test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Deploy',
            agentId: 'developer-agent',
            action: 'deploy',
            parameters: {
              environment: 'dev',
              strategy: 'rolling'
            }
          }
        ]
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('simple-workflow', {
        application: 'test-app',
        version: '1.0.0'
      });

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(1);
      expect(execution.steps[0].status).toBe('completed');
    }, 10000);

    it('should execute multi-step workflow', async () => {
      const workflow: Workflow = {
        id: 'multi-step-workflow',
        name: 'Multi-Step Workflow',
        description: 'Workflow with multiple steps',
        steps: [
          {
            id: 'step-1',
            name: 'Build',
            agentId: 'developer-agent',
            action: 'build',
            parameters: {
              branch: 'main'
            }
          },
          {
            id: 'step-2',
            name: 'Test',
            agentId: 'developer-agent',
            action: 'test',
            parameters: {
              test_suite: 'all'
            }
          },
          {
            id: 'step-3',
            name: 'Deploy',
            agentId: 'developer-agent',
            action: 'deploy',
            parameters: {
              environment: 'dev'
            }
          }
        ]
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('multi-step-workflow');

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(3);
      expect(execution.steps.every(s => s.status === 'completed')).toBe(true);
    }, 20000);

    it('should handle workflow failure', async () => {
      const workflow: Workflow = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        description: 'Workflow that should fail',
        steps: [
          {
            id: 'step-1',
            name: 'Invalid Action',
            agentId: 'developer-agent',
            action: 'invalid_action',
            parameters: {}
          }
        ]
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('failing-workflow');

      expect(execution.status).toBe('failed');
      expect(execution.steps[0].status).toBe('failed');
      expect(execution.error).toBeDefined();
    }, 10000);

    it('should continue on failure when configured', async () => {
      const workflow: Workflow = {
        id: 'continue-on-failure',
        name: 'Continue on Failure',
        description: 'Workflow that continues despite failures',
        steps: [
          {
            id: 'step-1',
            name: 'Failing Step',
            agentId: 'developer-agent',
            action: 'invalid_action',
            parameters: {},
            continueOnFailure: true
          },
          {
            id: 'step-2',
            name: 'Success Step',
            agentId: 'developer-agent',
            action: 'build',
            parameters: {
              branch: 'main'
            }
          }
        ]
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('continue-on-failure');

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(2);
      expect(execution.steps[0].status).toBe('failed');
      expect(execution.steps[1].status).toBe('completed');
    }, 15000);

    it('should retry failed steps', async () => {
      let attemptCount = 0;

      // Mock agent that fails first 2 times
      const mockAgent = {
        config: {
          id: 'flaky-agent',
          name: 'Flaky Agent',
          description: 'Agent that fails initially',
          type: 'developer',
          capabilities: ['flaky_action'],
          enabled: true,
          config: {}
        },
        initialize: async () => {},
        healthCheck: async () => true,
        execute: async () => {
          attemptCount++;
          if (attemptCount < 3) {
            return {
              id: 'exec-1',
              agentId: 'flaky-agent',
              startTime: new Date(),
              status: 'failed',
              parameters: {},
              error: 'Flaky error'
            };
          }
          return {
            id: 'exec-1',
            agentId: 'flaky-agent',
            startTime: new Date(),
            endTime: new Date(),
            status: 'completed',
            parameters: {},
            result: { success: true }
          };
        }
      };

      agentRegistry.register(mockAgent as any);

      const workflow: Workflow = {
        id: 'retry-workflow',
        name: 'Retry Workflow',
        description: 'Workflow with retry logic',
        steps: [
          {
            id: 'step-1',
            name: 'Flaky Step',
            agentId: 'flaky-agent',
            action: 'flaky_action',
            parameters: {},
            retryPolicy: {
              maxAttempts: 3,
              backoffMs: 100
            }
          }
        ]
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('retry-workflow');

      expect(execution.status).toBe('completed');
      expect(execution.steps[0].status).toBe('completed');
      expect(execution.steps[0].attempts).toBe(3);
      expect(attemptCount).toBe(3);
    }, 15000);

    it('should interpolate context variables', async () => {
      const workflow: Workflow = {
        id: 'context-workflow',
        name: 'Context Workflow',
        description: 'Workflow using context interpolation',
        steps: [
          {
            id: 'step-1',
            name: 'Build',
            agentId: 'developer-agent',
            action: 'build',
            parameters: {
              branch: 'main'
            }
          },
          {
            id: 'step-2',
            name: 'Deploy with Build ID',
            agentId: 'developer-agent',
            action: 'deploy',
            parameters: {
              environment: 'dev',
              build_id: '{{ context.buildId }}'
            }
          }
        ]
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('context-workflow', {
        buildId: 'build-123'
      });

      expect(execution.status).toBe('completed');
      expect(execution.context.buildId).toBe('build-123');
    }, 15000);
  });

  describe('Execution Management', () => {
    it('should track workflow executions', async () => {
      const workflow: Workflow = {
        id: 'tracked-workflow',
        name: 'Tracked Workflow',
        description: 'Workflow to track executions',
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
      };

      workflowEngine.registerWorkflow(workflow);

      await workflowEngine.execute('tracked-workflow');
      await workflowEngine.execute('tracked-workflow');

      const executions = workflowEngine.listExecutions('tracked-workflow');
      expect(executions).toHaveLength(2);
    }, 15000);

    it('should retrieve specific execution', async () => {
      const workflow: Workflow = {
        id: 'retrieve-workflow',
        name: 'Retrieve Workflow',
        description: 'Workflow for retrieval test',
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
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('retrieve-workflow');

      const retrieved = workflowEngine.getExecution(execution.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(execution.id);
    }, 10000);

    it('should cancel running execution', async () => {
      const workflow: Workflow = {
        id: 'cancelable-workflow',
        name: 'Cancelable Workflow',
        description: 'Workflow that can be cancelled',
        steps: []
      };

      workflowEngine.registerWorkflow(workflow);

      const execution = await workflowEngine.execute('cancelable-workflow');

      const cancelled = await workflowEngine.cancelExecution(execution.id);

      expect(cancelled).toBe(true);
      const retrieved = workflowEngine.getExecution(execution.id);
      expect(retrieved?.status).toBe('cancelled');
    }, 10000);
  });
});
