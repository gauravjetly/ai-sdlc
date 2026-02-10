/**
 * SchedulingService
 *
 * Core application service for managing scheduled work items.
 * Coordinates between domain entities, persistence, and the scheduling queue.
 */

import {
  ScheduledWorkItem,
  ScheduledWorkItemProps,
  WorkStatus,
  ScheduleType,
  WorkPriority,
} from '../../domain/entities/ScheduledWorkItem';
import { WorkExecution, ExecutionStatus } from '../../domain/entities/WorkExecution';
import { AgentAssignment, AgentRole } from '../../domain/value-objects/AgentAssignment';
import { CronSchedule } from '../../domain/value-objects/CronSchedule';

/**
 * Repository interface for ScheduledWorkItem persistence
 */
export interface IScheduledWorkRepository {
  save(workItem: ScheduledWorkItem): Promise<void>;
  findById(id: string): Promise<ScheduledWorkItem | null>;
  findAll(filters: WorkItemFilters): Promise<{ items: ScheduledWorkItem[]; total: number }>;
  findDueItems(): Promise<ScheduledWorkItem[]>;
  update(workItem: ScheduledWorkItem): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Repository interface for WorkExecution persistence
 */
export interface IWorkExecutionRepository {
  save(execution: WorkExecution): Promise<void>;
  findById(id: string): Promise<WorkExecution | null>;
  findByWorkItemId(workItemId: string): Promise<WorkExecution[]>;
  findAll(filters: ExecutionFilters): Promise<{ items: WorkExecution[]; total: number }>;
  update(execution: WorkExecution): Promise<void>;
}

/**
 * Queue interface for scheduling job execution
 */
export interface ISchedulingQueue {
  enqueue(workItemId: string, delayMs?: number): Promise<string>;
  cancel(jobId: string): Promise<void>;
  getQueueStats(): Promise<QueueStats>;
}

export interface WorkItemFilters {
  status?: WorkStatus[];
  scheduleType?: ScheduleType;
  priority?: WorkPriority;
  createdBy?: string;
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionFilters {
  workItemId?: string;
  agentId?: string;
  status?: ExecutionStatus[];
  offset?: number;
  limit?: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface CreateWorkItemDTO {
  name: string;
  description?: string;
  workType: string;
  scheduleType: string;
  cronExpression?: string;
  scheduledAt?: string;
  targetCompletionDate?: string;
  priority?: string;
  agentAssignments: Array<{
    agentType: string;
    role: AgentRole;
    parameters?: Record<string, unknown>;
    useMemory?: boolean;
    saveMemory?: boolean;
  }>;
  templateId?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface DashboardData {
  summary: {
    scheduled: number;
    running: number;
    completed: number;
    failed: number;
    paused: number;
  };
  recentItems: ScheduledWorkItem[];
  upcomingItems: ScheduledWorkItem[];
  activeExecutions: WorkExecution[];
  queueStats: QueueStats;
}

export class SchedulingService {
  constructor(
    private readonly workRepository: IScheduledWorkRepository,
    private readonly executionRepository: IWorkExecutionRepository,
    private readonly schedulingQueue: ISchedulingQueue,
  ) {}

  /**
   * Create a new scheduled work item
   */
  async createWorkItem(dto: CreateWorkItemDTO): Promise<ScheduledWorkItem> {
    // Build agent assignments
    const assignments = dto.agentAssignments.map(
      a => new AgentAssignment({
        agentType: a.agentType,
        role: a.role,
        parameters: a.parameters,
        useMemory: a.useMemory,
        saveMemory: a.saveMemory,
      }),
    );

    // Create domain entity (validates business rules)
    const workItem = new ScheduledWorkItem({
      name: dto.name,
      description: dto.description,
      workType: dto.workType as ScheduledWorkItemProps['workType'],
      scheduleType: dto.scheduleType as ScheduledWorkItemProps['scheduleType'],
      cronExpression: dto.cronExpression,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      targetCompletionDate: dto.targetCompletionDate ? new Date(dto.targetCompletionDate) : undefined,
      priority: (dto.priority as WorkPriority) || WorkPriority.NORMAL,
      agentAssignments: assignments,
      templateId: dto.templateId,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    });

    // Persist
    await this.workRepository.save(workItem);

    // Schedule for execution
    await this.scheduleExecution(workItem);

    return workItem;
  }

  /**
   * Get a work item by ID
   */
  async getWorkItem(id: string): Promise<ScheduledWorkItem | null> {
    return this.workRepository.findById(id);
  }

  /**
   * List work items with filters
   */
  async listWorkItems(filters: WorkItemFilters): Promise<{ items: ScheduledWorkItem[]; total: number }> {
    return this.workRepository.findAll(filters);
  }

  /**
   * Pause a work item
   */
  async pauseWorkItem(id: string): Promise<ScheduledWorkItem> {
    const workItem = await this.requireWorkItem(id);
    workItem.pause();
    await this.workRepository.update(workItem);
    return workItem;
  }

  /**
   * Resume a paused work item
   */
  async resumeWorkItem(id: string): Promise<ScheduledWorkItem> {
    const workItem = await this.requireWorkItem(id);
    workItem.resume();
    await this.workRepository.update(workItem);

    // Re-schedule execution
    await this.scheduleExecution(workItem);

    return workItem;
  }

  /**
   * Cancel a work item
   */
  async cancelWorkItem(id: string): Promise<ScheduledWorkItem> {
    const workItem = await this.requireWorkItem(id);
    workItem.cancel();
    await this.workRepository.update(workItem);
    return workItem;
  }

  /**
   * Delete a work item
   */
  async deleteWorkItem(id: string): Promise<void> {
    const workItem = await this.requireWorkItem(id);
    if (workItem.status === WorkStatus.RUNNING) {
      throw new Error('Cannot delete a running work item. Cancel it first.');
    }
    await this.workRepository.delete(id);
  }

  /**
   * Execute a work item (called by the queue worker)
   */
  async executeWorkItem(workItemId: string): Promise<WorkExecution> {
    const workItem = await this.requireWorkItem(workItemId);
    const primaryAgent = workItem.getPrimaryAgent();

    if (!primaryAgent) {
      throw new Error('No primary agent assigned to work item');
    }

    // Create execution record
    const execution = new WorkExecution({
      workItemId: workItem.id,
      agentId: primaryAgent.agentType,
    });

    // Start execution
    workItem.start();
    execution.start();

    await this.workRepository.update(workItem);
    await this.executionRepository.save(execution);

    return execution;
  }

  /**
   * Complete a work execution
   */
  async completeExecution(executionId: string, artifacts?: Array<{ name: string; path: string; type: string }>): Promise<void> {
    const execution = await this.requireExecution(executionId);
    execution.complete(artifacts);
    await this.executionRepository.update(execution);

    // Update work item status
    const workItem = await this.requireWorkItem(execution.workItemId);
    workItem.complete();
    await this.workRepository.update(workItem);

    // If recurring, schedule next execution
    if (workItem.scheduleType === ScheduleType.RECURRING) {
      await this.scheduleExecution(workItem);
    }
  }

  /**
   * Fail a work execution
   */
  async failExecution(executionId: string, errorMessage: string): Promise<void> {
    const execution = await this.requireExecution(executionId);
    execution.fail(errorMessage);
    await this.executionRepository.update(execution);

    const workItem = await this.requireWorkItem(execution.workItemId);
    workItem.fail();
    await this.workRepository.update(workItem);
  }

  /**
   * Get execution history for a work item
   */
  async getExecutionHistory(workItemId: string): Promise<WorkExecution[]> {
    return this.executionRepository.findByWorkItemId(workItemId);
  }

  /**
   * Get dashboard data
   */
  async getDashboard(userId?: string): Promise<DashboardData> {
    const filters: WorkItemFilters = userId ? { createdBy: userId } : {};

    const [scheduled, running, completed, failed, paused] = await Promise.all([
      this.workRepository.findAll({ ...filters, status: [WorkStatus.SCHEDULED], limit: 0 }),
      this.workRepository.findAll({ ...filters, status: [WorkStatus.RUNNING], limit: 0 }),
      this.workRepository.findAll({ ...filters, status: [WorkStatus.COMPLETED], limit: 0 }),
      this.workRepository.findAll({ ...filters, status: [WorkStatus.FAILED], limit: 0 }),
      this.workRepository.findAll({ ...filters, status: [WorkStatus.PAUSED], limit: 0 }),
    ]);

    const recentResult = await this.workRepository.findAll({
      ...filters,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit: 10,
    });

    const upcomingResult = await this.workRepository.findAll({
      ...filters,
      status: [WorkStatus.SCHEDULED],
      sortBy: 'scheduledAt',
      sortOrder: 'asc',
      limit: 10,
    });

    const activeResult = await this.executionRepository.findAll({
      status: [ExecutionStatus.RUNNING],
      limit: 20,
    });

    const queueStats = await this.schedulingQueue.getQueueStats();

    return {
      summary: {
        scheduled: scheduled.total,
        running: running.total,
        completed: completed.total,
        failed: failed.total,
        paused: paused.total,
      },
      recentItems: recentResult.items,
      upcomingItems: upcomingResult.items,
      activeExecutions: activeResult.items,
      queueStats,
    };
  }

  /**
   * Process due work items (called periodically by the scheduler)
   */
  async processDueItems(): Promise<number> {
    const dueItems = await this.workRepository.findDueItems();
    let processedCount = 0;

    for (const item of dueItems) {
      try {
        await this.schedulingQueue.enqueue(item.id);
        processedCount++;
      } catch (error) {
        // Log error but continue processing other items
        console.error(`Failed to enqueue work item ${item.id}:`, error);
      }
    }

    return processedCount;
  }

  // Private helpers

  private async scheduleExecution(workItem: ScheduledWorkItem): Promise<void> {
    const nextRun = workItem.getNextRunTime();

    if (!nextRun) {
      return;
    }

    const delayMs = Math.max(0, nextRun.getTime() - Date.now());
    await this.schedulingQueue.enqueue(workItem.id, delayMs);
  }

  private async requireWorkItem(id: string): Promise<ScheduledWorkItem> {
    const workItem = await this.workRepository.findById(id);
    if (!workItem) {
      throw new Error(`Work item not found: ${id}`);
    }
    return workItem;
  }

  private async requireExecution(id: string): Promise<WorkExecution> {
    const execution = await this.executionRepository.findById(id);
    if (!execution) {
      throw new Error(`Execution not found: ${id}`);
    }
    return execution;
  }
}
