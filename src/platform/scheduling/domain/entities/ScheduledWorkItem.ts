/**
 * ScheduledWorkItem Entity
 *
 * Core domain entity representing a unit of work that is scheduled
 * for agent execution at a specified time or on a recurring basis.
 */

import { v4 as uuidv4 } from 'uuid';
import { CronSchedule } from '../value-objects/CronSchedule';
import { AgentAssignment } from '../value-objects/AgentAssignment';

export enum WorkType {
  SINGLE_APP = 'single_app',
  MULTI_APP = 'multi_app',
  WORKFLOW = 'workflow',
}

export enum ScheduleType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  TRIGGER_BASED = 'trigger_based',
  IMMEDIATE = 'immediate',
}

export enum WorkStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum WorkPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ScheduledWorkItemProps {
  id?: string;
  name: string;
  description?: string;
  workType: WorkType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  scheduledAt?: Date;
  targetCompletionDate?: Date;
  status?: WorkStatus;
  priority?: WorkPriority;
  agentAssignments: AgentAssignment[];
  templateId?: string;
  triggerId?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
}

export class ScheduledWorkItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly workType: WorkType;
  readonly scheduleType: ScheduleType;
  readonly cronSchedule: CronSchedule | null;
  readonly scheduledAt: Date | null;
  readonly targetCompletionDate: Date | null;
  private _status: WorkStatus;
  readonly priority: WorkPriority;
  readonly agentAssignments: AgentAssignment[];
  readonly templateId: string | null;
  readonly triggerId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  private _pausedAt: Date | null;
  private _completedAt: Date | null;

  constructor(props: ScheduledWorkItemProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.description = props.description || '';
    this.workType = props.workType;
    this.scheduleType = props.scheduleType;
    this.cronSchedule = props.cronExpression
      ? CronSchedule.create(props.cronExpression)
      : null;
    this.scheduledAt = props.scheduledAt || null;
    this.targetCompletionDate = props.targetCompletionDate || null;
    this._status = props.status || WorkStatus.SCHEDULED;
    this.priority = props.priority || WorkPriority.NORMAL;
    this.agentAssignments = props.agentAssignments;
    this.templateId = props.templateId || null;
    this.triggerId = props.triggerId || null;
    this.metadata = props.metadata || {};
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this._pausedAt = props.pausedAt || null;
    this._completedAt = props.completedAt || null;

    this.validate();
  }

  get status(): WorkStatus {
    return this._status;
  }

  get pausedAt(): Date | null {
    return this._pausedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  /**
   * Validate the work item's business rules
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Work item name is required');
    }

    if (this.name.length > 200) {
      throw new Error('Work item name must be 200 characters or less');
    }

    if (this.scheduleType === ScheduleType.RECURRING && !this.cronSchedule) {
      throw new Error('Recurring schedules require a cron expression');
    }

    if (this.scheduleType === ScheduleType.ONE_TIME && !this.scheduledAt) {
      throw new Error('One-time schedules require a scheduled date/time');
    }

    if (this.scheduledAt && this.scheduledAt < new Date() && this._status === WorkStatus.SCHEDULED) {
      throw new Error('Scheduled date must be in the future');
    }

    if (this.agentAssignments.length === 0) {
      throw new Error('At least one agent assignment is required');
    }
  }

  /**
   * Start execution of the work item
   */
  start(): void {
    if (this._status !== WorkStatus.SCHEDULED && this._status !== WorkStatus.PAUSED) {
      throw new Error(`Cannot start work item in status: ${this._status}`);
    }
    this._status = WorkStatus.RUNNING;
    this._pausedAt = null;
  }

  /**
   * Mark work item as completed
   */
  complete(): void {
    if (this._status !== WorkStatus.RUNNING) {
      throw new Error(`Cannot complete work item in status: ${this._status}`);
    }
    this._status = WorkStatus.COMPLETED;
    this._completedAt = new Date();
  }

  /**
   * Mark work item as failed
   */
  fail(): void {
    if (this._status !== WorkStatus.RUNNING) {
      throw new Error(`Cannot fail work item in status: ${this._status}`);
    }
    this._status = WorkStatus.FAILED;
    this._completedAt = new Date();
  }

  /**
   * Pause the work item schedule
   */
  pause(): void {
    if (this._status !== WorkStatus.SCHEDULED && this._status !== WorkStatus.RUNNING) {
      throw new Error(`Cannot pause work item in status: ${this._status}`);
    }
    this._status = WorkStatus.PAUSED;
    this._pausedAt = new Date();
  }

  /**
   * Resume a paused work item
   */
  resume(): void {
    if (this._status !== WorkStatus.PAUSED) {
      throw new Error(`Cannot resume work item in status: ${this._status}`);
    }
    this._status = WorkStatus.SCHEDULED;
    this._pausedAt = null;
  }

  /**
   * Cancel the work item
   */
  cancel(): void {
    if (this._status === WorkStatus.COMPLETED || this._status === WorkStatus.CANCELLED) {
      throw new Error(`Cannot cancel work item in status: ${this._status}`);
    }
    this._status = WorkStatus.CANCELLED;
    this._completedAt = new Date();
  }

  /**
   * Calculate the next run time for recurring schedules
   */
  getNextRunTime(): Date | null {
    if (this.scheduleType === ScheduleType.ONE_TIME) {
      return this._status === WorkStatus.SCHEDULED ? this.scheduledAt : null;
    }

    if (this.scheduleType === ScheduleType.RECURRING && this.cronSchedule) {
      return this.cronSchedule.getNextRunTime();
    }

    return null;
  }

  /**
   * Check if the work item is due for execution
   */
  isDue(): boolean {
    if (this._status !== WorkStatus.SCHEDULED) {
      return false;
    }

    const nextRun = this.getNextRunTime();
    if (!nextRun) {
      return false;
    }

    return nextRun <= new Date();
  }

  /**
   * Check if the work item is overdue relative to target completion date
   */
  isOverdue(): boolean {
    if (!this.targetCompletionDate) {
      return false;
    }

    if (this._status === WorkStatus.COMPLETED || this._status === WorkStatus.CANCELLED) {
      return false;
    }

    return this.targetCompletionDate < new Date();
  }

  /**
   * Get the primary agent assignment
   */
  getPrimaryAgent(): AgentAssignment | undefined {
    return this.agentAssignments.find(a => a.role === 'primary');
  }

  /**
   * Serialize to plain object for persistence
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      workType: this.workType,
      scheduleType: this.scheduleType,
      cronExpression: this.cronSchedule?.expression || null,
      scheduledAt: this.scheduledAt?.toISOString() || null,
      targetCompletionDate: this.targetCompletionDate?.toISOString() || null,
      status: this._status,
      priority: this.priority,
      agentAssignments: this.agentAssignments.map(a => a.toJSON()),
      templateId: this.templateId,
      triggerId: this.triggerId,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      pausedAt: this._pausedAt?.toISOString() || null,
      completedAt: this._completedAt?.toISOString() || null,
    };
  }
}
