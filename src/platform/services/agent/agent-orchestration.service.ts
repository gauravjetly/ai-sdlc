/**
 * Agent Orchestration Service
 * Real BullMQ job queue with PostgreSQL persistence - NO MOCK DATA
 */

import { v4 as uuidv4 } from 'uuid';
import { Job, Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import { agentTaskQueue, redisConnection } from '../../infrastructure/queue/bullmq.client.js';
import { prisma } from '../../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../../infrastructure/websocket/server.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('AgentOrchestration');

export interface AgentTask {
  agentId: AgentType;
  taskType: string;
  taskParams: Record<string, any>;
  priority?: TaskPriority;
  timeout?: number; // milliseconds
  createdBy?: string;
}

export interface AgentExecutionResult {
  executionId: string;
  jobId: string;
  status: ExecutionStatus;
  result?: any;
  error?: string;
  logs?: string;
  startedAt: Date;
  completedAt?: Date;
}

export type AgentType =
  | 'security_agent'
  | 'developer_agent'
  | 'sre_agent'
  | 'qa_agent'
  | 'finops_agent'
  | 'release_manager'
  | 'architect_agent'
  | 'conductor_agent';

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export class AgentOrchestrationService {
  private workers: Map<AgentType, Worker> = new Map();
  private websocket?: WebSocketServer;

  constructor(websocket?: WebSocketServer) {
    this.websocket = websocket;
    logger.info('Agent Orchestration Service initialized');
  }

  /**
   * Queue a task for an agent
   * REAL QUEUE - adds to BullMQ and creates database record
   */
  async queueTask(task: AgentTask): Promise<AgentExecutionResult> {
    const executionId = uuidv4();

    try {
      logger.info('Queuing agent task', { executionId, task });

      // Add job to BullMQ queue
      const job = await agentTaskQueue.add(
        task.agentId,
        {
          executionId,
          ...task,
        },
        {
          jobId: executionId,
          priority: this.getPriorityValue(task.priority || 'NORMAL'),
        }
      );

      // Create database record
      const execution = await prisma.agentExecution.create({
        data: {
          id: executionId,
          agentId: task.agentId,
          jobId: job.id!,
          taskType: task.taskType,
          taskParams: task.taskParams as any,
          status: 'queued',
          priority: task.priority || 'NORMAL',
          timeout: task.timeout,
          createdBy: task.createdBy,
        },
      });

      // Emit WebSocket update
      this.emitExecutionUpdate(executionId, {
        status: 'queued',
        message: 'Task queued for execution',
      });

      logger.info('Task queued successfully', { executionId, jobId: job.id });

      return {
        executionId: execution.id,
        jobId: execution.jobId,
        status: execution.status as ExecutionStatus,
        startedAt: execution.startedAt,
      };
    } catch (error: any) {
      logger.error('Failed to queue task', { executionId, error: error.message });
      throw new Error(`Failed to queue task: ${error.message}`);
    }
  }

  /**
   * Register a worker for an agent type
   * REAL WORKER - processes jobs from BullMQ
   */
  registerWorker(
    agentId: AgentType,
    handler: (job: Job) => Promise<any>
  ): void {
    if (this.workers.has(agentId)) {
      logger.warn('Worker already registered', { agentId });
      return;
    }

    const worker = new Worker(
      'agent-tasks',
      async (job: Job) => {
        // Only process jobs for this agent
        if (job.name !== agentId) {
          return;
        }

        const executionId = job.data.executionId;
        logger.info('Processing agent task', { executionId, agentId, jobId: job.id });

        try {
          // Update status to running
          await this.updateExecutionStatus(executionId, 'running', 'Task is running');

          // Execute handler
          const result = await handler(job);

          // Update status to completed
          await this.updateExecutionStatus(executionId, 'completed', 'Task completed successfully', result);

          logger.info('Task completed successfully', { executionId });
          return result;
        } catch (error: any) {
          logger.error('Task execution failed', { executionId, error: error.message });

          // Update status to failed
          await this.updateExecutionStatus(
            executionId,
            'failed',
            `Task failed: ${error.message}`,
            null,
            error.message
          );

          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );

    worker.on('completed', (job) => {
      logger.info('Worker completed job', { agentId, jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      logger.error('Worker failed job', { agentId, jobId: job?.id, error: err.message });
    });

    this.workers.set(agentId, worker);
    logger.info('Worker registered', { agentId });
  }

  /**
   * Get execution status
   * REAL STATUS - queries database and BullMQ
   */
  async getExecutionStatus(executionId: string): Promise<AgentExecutionResult> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Check job status from BullMQ
    const job = await agentTaskQueue.getJob(execution.jobId);

    if (job) {
      const state = await job.getState();
      logger.debug('Job state from BullMQ', { executionId, state });
    }

    return {
      executionId: execution.id,
      jobId: execution.jobId,
      status: execution.status as ExecutionStatus,
      result: execution.result as any,
      error: execution.error || undefined,
      logs: execution.logs || undefined,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt || undefined,
    };
  }

  /**
   * Cancel an execution
   * REAL CANCELLATION - removes job from queue
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Remove job from queue
    const job = await agentTaskQueue.getJob(execution.jobId);
    if (job) {
      await job.remove();
    }

    // Update status
    await this.updateExecutionStatus(executionId, 'cancelled', 'Execution cancelled by user');

    logger.info('Execution cancelled', { executionId });
  }

  /**
   * List executions with filters
   */
  async listExecutions(
    filters?: {
      agentId?: AgentType;
      status?: ExecutionStatus;
      limit?: number;
    }
  ): Promise<AgentExecutionResult[]> {
    const where: any = {};

    if (filters?.agentId) where.agentId = filters.agentId;
    if (filters?.status) where.status = filters.status;

    const executions = await prisma.agentExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: filters?.limit || 100,
    });

    return executions.map((e) => ({
      executionId: e.id,
      jobId: e.jobId,
      status: e.status as ExecutionStatus,
      result: e.result as any,
      error: e.error || undefined,
      logs: e.logs || undefined,
      startedAt: e.startedAt,
      completedAt: e.completedAt || undefined,
    }));
  }

  /**
   * Get queue metrics
   * REAL METRICS - from BullMQ
   */
  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      agentTaskQueue.getWaitingCount(),
      agentTaskQueue.getActiveCount(),
      agentTaskQueue.getCompletedCount(),
      agentTaskQueue.getFailedCount(),
      agentTaskQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Retry failed execution
   */
  async retryExecution(executionId: string): Promise<AgentExecutionResult> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'failed') {
      throw new Error(`Cannot retry execution with status: ${execution.status}`);
    }

    // Re-queue the task
    return this.queueTask({
      agentId: execution.agentId as AgentType,
      taskType: execution.taskType,
      taskParams: execution.taskParams as Record<string, any>,
      priority: execution.priority as TaskPriority,
      timeout: execution.timeout || undefined,
      createdBy: execution.createdBy || undefined,
    });
  }

  /**
   * Cleanup workers on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down agent orchestration service');

    const workers = Array.from(this.workers.entries());
    for (const [agentId, worker] of workers) {
      await worker.close();
      logger.info('Worker closed', { agentId });
    }

    this.workers.clear();
  }

  // Helper methods

  private async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    message: string,
    result?: any,
    error?: string
  ): Promise<void> {
    const updateData: any = {
      status,
    };

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.completedAt = new Date();
    }

    if (result !== undefined) {
      updateData.result = result;
    }

    if (error) {
      updateData.error = error;
    }

    await prisma.agentExecution.update({
      where: { id: executionId },
      data: updateData,
    });

    // Emit WebSocket update
    this.emitExecutionUpdate(executionId, {
      status,
      message,
      result,
      error,
    });
  }

  private emitExecutionUpdate(executionId: string, data: any): void {
    if (this.websocket) {
      this.websocket.emit(`execution:${executionId}`, 'status', data);
    }
  }

  private getPriorityValue(priority: TaskPriority): number {
    const priorityMap: Record<TaskPriority, number> = {
      LOW: 10,
      NORMAL: 5,
      HIGH: 2,
      CRITICAL: 1,
    };
    return priorityMap[priority];
  }
}

export default AgentOrchestrationService;
