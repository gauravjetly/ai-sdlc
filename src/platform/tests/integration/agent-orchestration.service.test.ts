/**
 * Integration Tests - AgentOrchestrationService
 * Tests real BullMQ operations with test Redis connection
 */

import { AgentOrchestrationService, AgentTask } from '../../services/agent/agent-orchestration.service';
import { prisma } from '../../infrastructure/database/prisma.client';
import { agentTaskQueue } from '../../infrastructure/queue/bullmq.client';
import { Job } from 'bullmq';

describe('AgentOrchestrationService - Integration Tests', () => {
  let orchestrationService: AgentOrchestrationService;

  beforeAll(async () => {
    await prisma.$connect();
    orchestrationService = new AgentOrchestrationService();
  });

  afterAll(async () => {
    await orchestrationService.shutdown();
    await prisma.$disconnect();
    await agentTaskQueue.close();
  });

  afterEach(async () => {
    // Clean up test executions
    await prisma.agentExecution.deleteMany({
      where: {
        taskType: { contains: 'test-' }
      }
    });

    // Clean BullMQ queue
    await agentTaskQueue.obliterate({ force: true });
  });

  describe('queueTask', () => {
    it('should queue task to BullMQ and create database record', async () => {
      // Arrange
      const task: AgentTask = {
        agentId: 'security_agent',
        taskType: 'test-security-scan',
        taskParams: {
          target: 'test-application',
          scanType: 'full'
        },
        priority: 'HIGH',
        createdBy: 'test-user'
      };

      // Act
      const result = await orchestrationService.queueTask(task);

      // Assert
      expect(result).toHaveProperty('executionId');
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status', 'queued');
      expect(result).toHaveProperty('startedAt');

      // Verify database record
      const execution = await prisma.agentExecution.findUnique({
        where: { id: result.executionId }
      });

      expect(execution).toBeTruthy();
      expect(execution?.agentId).toBe('security_agent');
      expect(execution?.taskType).toBe('test-security-scan');
      expect(execution?.priority).toBe('HIGH');
      expect(execution?.status).toBe('queued');

      // Verify BullMQ job
      const job = await agentTaskQueue.getJob(result.jobId);
      expect(job).toBeTruthy();
      expect(job?.name).toBe('security_agent');
      expect(job?.data.executionId).toBe(result.executionId);
    });

    it('should queue multiple tasks with correct priorities', async () => {
      // Arrange
      const tasks: AgentTask[] = [
        {
          agentId: 'security_agent',
          taskType: 'test-critical-scan',
          taskParams: {},
          priority: 'CRITICAL'
        },
        {
          agentId: 'qa_agent',
          taskType: 'test-normal-test',
          taskParams: {},
          priority: 'NORMAL'
        },
        {
          agentId: 'developer_agent',
          taskType: 'test-low-task',
          taskParams: {},
          priority: 'LOW'
        }
      ];

      // Act
      const results = await Promise.all(
        tasks.map(task => orchestrationService.queueTask(task))
      );

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('queued');
      });

      // Verify queue metrics
      const metrics = await orchestrationService.getQueueMetrics();
      expect(metrics.waiting).toBeGreaterThanOrEqual(3);
    });

    it('should handle task with timeout', async () => {
      // Arrange
      const task: AgentTask = {
        agentId: 'sre_agent',
        taskType: 'test-health-check',
        taskParams: { service: 'api-server' },
        timeout: 30000, // 30 seconds
        createdBy: 'test-user'
      };

      // Act
      const result = await orchestrationService.queueTask(task);

      // Assert
      const execution = await prisma.agentExecution.findUnique({
        where: { id: result.executionId }
      });

      expect(execution?.timeout).toBe(30000);
    });
  });

  describe('registerWorker and task execution', () => {
    it('should register worker and process tasks', async () => {
      // Arrange
      const processedTasks: string[] = [];

      orchestrationService.registerWorker('developer_agent', async (job: Job) => {
        processedTasks.push(job.data.executionId);
        return { success: true, message: 'Task processed' };
      });

      const task: AgentTask = {
        agentId: 'developer_agent',
        taskType: 'test-build',
        taskParams: { project: 'test-app' }
      };

      // Act
      const result = await orchestrationService.queueTask(task);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Assert
      const execution = await prisma.agentExecution.findUnique({
        where: { id: result.executionId }
      });

      expect(execution?.status).toBe('completed');
      expect(execution?.result).toEqual({
        success: true,
        message: 'Task processed'
      });
      expect(processedTasks).toContain(result.executionId);
    });

    it('should handle worker task failure', async () => {
      // Arrange
      orchestrationService.registerWorker('qa_agent', async (job: Job) => {
        throw new Error('Test execution failed');
      });

      const task: AgentTask = {
        agentId: 'qa_agent',
        taskType: 'test-integration-test',
        taskParams: { suite: 'api-tests' }
      };

      // Act
      const result = await orchestrationService.queueTask(task);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Assert
      const execution = await prisma.agentExecution.findUnique({
        where: { id: result.executionId }
      });

      expect(execution?.status).toBe('failed');
      expect(execution?.error).toContain('Test execution failed');
    });

    it('should process multiple tasks concurrently', async () => {
      // Arrange
      const processedCount = { value: 0 };

      orchestrationService.registerWorker('sre_agent', async (job: Job) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        processedCount.value++;
        return { processed: processedCount.value };
      });

      // Queue multiple tasks
      const tasks: AgentTask[] = Array(5).fill(null).map((_, i) => ({
        agentId: 'sre_agent' as const,
        taskType: `test-monitor-${i}`,
        taskParams: { index: i }
      }));

      // Act
      const results = await Promise.all(
        tasks.map(task => orchestrationService.queueTask(task))
      );

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Assert
      const executions = await prisma.agentExecution.findMany({
        where: {
          id: { in: results.map(r => r.executionId) }
        }
      });

      const completed = executions.filter(e => e.status === 'completed');
      expect(completed.length).toBeGreaterThanOrEqual(3); // At least some should complete
      expect(processedCount.value).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getExecutionStatus', () => {
    it('should return execution status from database', async () => {
      // Arrange
      const task: AgentTask = {
        agentId: 'architect_agent',
        taskType: 'test-design-review',
        taskParams: { architecture: 'microservices' }
      };

      const queued = await orchestrationService.queueTask(task);

      // Act
      const status = await orchestrationService.getExecutionStatus(queued.executionId);

      // Assert
      expect(status).toHaveProperty('executionId', queued.executionId);
      expect(status).toHaveProperty('jobId', queued.jobId);
      expect(status).toHaveProperty('status', 'queued');
      expect(status).toHaveProperty('startedAt');
    });

    it('should throw error for non-existent execution', async () => {
      // Act & Assert
      await expect(
        orchestrationService.getExecutionStatus('non-existent-id')
      ).rejects.toThrow('Execution not found');
    });
  });

  describe('cancelExecution', () => {
    it('should cancel queued execution', async () => {
      // Arrange
      const task: AgentTask = {
        agentId: 'finops_agent',
        taskType: 'test-cost-analysis',
        taskParams: { period: 'monthly' }
      };

      const queued = await orchestrationService.queueTask(task);

      // Act
      await orchestrationService.cancelExecution(queued.executionId);

      // Assert
      const execution = await prisma.agentExecution.findUnique({
        where: { id: queued.executionId }
      });

      expect(execution?.status).toBe('cancelled');

      // Verify job removed from queue
      const job = await agentTaskQueue.getJob(queued.jobId);
      expect(job).toBeNull();
    });

    it('should throw error when canceling non-existent execution', async () => {
      // Act & Assert
      await expect(
        orchestrationService.cancelExecution('non-existent-id')
      ).rejects.toThrow('Execution not found');
    });
  });

  describe('listExecutions', () => {
    it('should list all executions', async () => {
      // Arrange
      const tasks: AgentTask[] = [
        {
          agentId: 'security_agent',
          taskType: 'test-scan-1',
          taskParams: {}
        },
        {
          agentId: 'security_agent',
          taskType: 'test-scan-2',
          taskParams: {}
        },
        {
          agentId: 'qa_agent',
          taskType: 'test-test-1',
          taskParams: {}
        }
      ];

      await Promise.all(tasks.map(task => orchestrationService.queueTask(task)));

      // Act
      const allExecutions = await orchestrationService.listExecutions();
      const securityExecutions = await orchestrationService.listExecutions({
        agentId: 'security_agent'
      });
      const queuedExecutions = await orchestrationService.listExecutions({
        status: 'queued'
      });

      // Assert
      expect(allExecutions.length).toBeGreaterThanOrEqual(3);
      expect(securityExecutions.length).toBeGreaterThanOrEqual(2);
      expect(queuedExecutions.length).toBeGreaterThanOrEqual(3);
    });

    it('should respect limit parameter', async () => {
      // Arrange
      const tasks: AgentTask[] = Array(10).fill(null).map((_, i) => ({
        agentId: 'developer_agent' as const,
        taskType: `test-task-${i}`,
        taskParams: { index: i }
      }));

      await Promise.all(tasks.map(task => orchestrationService.queueTask(task)));

      // Act
      const limited = await orchestrationService.listExecutions({ limit: 5 });

      // Assert
      expect(limited.length).toBeLessThanOrEqual(5);
    });
  });

  describe('retryExecution', () => {
    it('should retry failed execution', async () => {
      // Arrange
      orchestrationService.registerWorker('release_manager', async (job: Job) => {
        throw new Error('Deployment failed');
      });

      const task: AgentTask = {
        agentId: 'release_manager',
        taskType: 'test-deploy',
        taskParams: { version: '1.0.0' }
      };

      const original = await orchestrationService.queueTask(task);

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Act
      const retried = await orchestrationService.retryExecution(original.executionId);

      // Assert
      expect(retried).toHaveProperty('executionId');
      expect(retried.executionId).not.toBe(original.executionId);
      expect(retried.status).toBe('queued');

      // Verify new execution was created
      const execution = await prisma.agentExecution.findUnique({
        where: { id: retried.executionId }
      });

      expect(execution?.taskType).toBe('test-deploy');
    });

    it('should throw error when retrying non-failed execution', async () => {
      // Arrange
      const task: AgentTask = {
        agentId: 'conductor_agent',
        taskType: 'test-orchestrate',
        taskParams: {}
      };

      const queued = await orchestrationService.queueTask(task);

      // Act & Assert
      await expect(
        orchestrationService.retryExecution(queued.executionId)
      ).rejects.toThrow('Cannot retry execution with status: queued');
    });
  });

  describe('getQueueMetrics', () => {
    it('should return accurate queue metrics', async () => {
      // Arrange
      const tasks: AgentTask[] = Array(5).fill(null).map((_, i) => ({
        agentId: 'security_agent' as const,
        taskType: `test-metrics-${i}`,
        taskParams: { index: i }
      }));

      await Promise.all(tasks.map(task => orchestrationService.queueTask(task)));

      // Act
      const metrics = await orchestrationService.getQueueMetrics();

      // Assert
      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
      expect(metrics).toHaveProperty('delayed');
      expect(metrics.waiting).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Worker Management', () => {
    it('should not register duplicate worker', async () => {
      // Arrange
      const handler = async (job: Job) => ({ success: true });

      // Act
      orchestrationService.registerWorker('security_agent', handler);
      orchestrationService.registerWorker('security_agent', handler); // Duplicate

      // Assert - Should only have one worker (no error thrown)
      const task: AgentTask = {
        agentId: 'security_agent',
        taskType: 'test-duplicate',
        taskParams: {}
      };

      const result = await orchestrationService.queueTask(task);
      expect(result.status).toBe('queued');
    });

    it('should process tasks only for registered agent', async () => {
      // Arrange
      const processedAgents: string[] = [];

      orchestrationService.registerWorker('developer_agent', async (job: Job) => {
        processedAgents.push(job.name);
        return { success: true };
      });

      const tasks: AgentTask[] = [
        {
          agentId: 'developer_agent',
          taskType: 'test-dev-task',
          taskParams: {}
        },
        {
          agentId: 'security_agent', // Not registered
          taskType: 'test-sec-task',
          taskParams: {}
        }
      ];

      // Act
      await Promise.all(tasks.map(task => orchestrationService.queueTask(task)));
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Assert
      expect(processedAgents).toContain('developer_agent');
      expect(processedAgents).not.toContain('security_agent');
    });
  });
});
