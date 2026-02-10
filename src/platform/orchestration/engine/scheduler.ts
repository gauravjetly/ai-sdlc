/**
 * Cron-based Scheduler
 *
 * Manages scheduled job execution using cron expressions
 */

import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { ScheduledJob, JobExecution } from '../types/orchestration-types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('Scheduler');

export class Scheduler {
  private jobs: Map<string, { task: cron.ScheduledTask; config: ScheduledJob }> = new Map();
  private executions: JobExecution[] = [];
  private maxExecutionHistory = 1000;
  private running = false;

  /**
   * Add a scheduled job
   */
  addJob(
    name: string,
    cronExpression: string,
    handler: () => Promise<void>,
    config?: Partial<ScheduledJob>
  ): void {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Remove existing job if present
    if (this.jobs.has(name)) {
      this.removeJob(name);
    }

    const jobConfig: ScheduledJob = {
      name,
      cron: cronExpression,
      agentId: config?.agentId || 'unknown',
      parameters: config?.parameters || {},
      enabled: config?.enabled !== false
    };

    const task = cron.schedule(
      cronExpression,
      async () => {
        if (!jobConfig.enabled) {
          logger.debug(`Job ${name} is disabled, skipping execution`);
          return;
        }

        await this.executeJob(name, handler, jobConfig);
      },
      {
        scheduled: false
      }
    );

    this.jobs.set(name, { task, config: jobConfig });
    logger.info(`Job scheduled: ${name} with cron: ${cronExpression}`);

    // Start immediately if scheduler is running
    if (this.running) {
      task.start();
    }
  }

  /**
   * Remove a scheduled job
   */
  removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.task.stop();
      this.jobs.delete(name);
      logger.info(`Job removed: ${name}`);
    }
  }

  /**
   * Enable a job
   */
  enableJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.config.enabled = true;
      logger.info(`Job enabled: ${name}`);
    }
  }

  /**
   * Disable a job
   */
  disableJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.config.enabled = false;
      logger.info(`Job disabled: ${name}`);
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info(`Starting scheduler with ${this.jobs.size} jobs...`);

    for (const [name, job] of this.jobs) {
      if (job.config.enabled) {
        job.task.start();
        logger.info(`Started job: ${name}`);
      } else {
        logger.info(`Job ${name} is disabled, not starting`);
      }
    }

    this.running = true;
    logger.info('Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.running) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping scheduler...');

    for (const [name, job] of this.jobs) {
      job.task.stop();
      logger.info(`Stopped job: ${name}`);
    }

    this.running = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Get execution history
   */
  getExecutionHistory(jobName?: string, limit?: number): JobExecution[] {
    let history = jobName
      ? this.executions.filter(e => e.jobName === jobName)
      : this.executions;

    // Sort by start time descending (most recent first)
    history = history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  /**
   * Get job statistics
   */
  getJobStats(jobName: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    lastExecution?: JobExecution;
  } {
    const executions = this.getExecutionHistory(jobName);

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0
      };
    }

    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;

    const durations = executions
      .filter(e => e.endTime)
      .map(e => e.endTime!.getTime() - e.startTime.getTime());

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageDuration,
      lastExecution: executions[0]
    };
  }

  /**
   * List all jobs
   */
  listJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(j => j.config);
  }

  /**
   * Get job configuration
   */
  getJob(name: string): ScheduledJob | undefined {
    return this.jobs.get(name)?.config;
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Execute a job
   */
  private async executeJob(
    name: string,
    handler: () => Promise<void>,
    config: ScheduledJob
  ): Promise<void> {
    const execution: JobExecution = {
      id: uuidv4(),
      jobName: name,
      startTime: new Date(),
      status: 'running'
    };

    this.addExecution(execution);

    logger.info(`Executing job: ${name}`, {
      executionId: execution.id,
      agentId: config.agentId
    });

    try {
      await handler();

      execution.status = 'completed';
      execution.endTime = new Date();

      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      logger.info(`Job completed: ${name}`, {
        executionId: execution.id,
        duration
      });

      // Update job config
      config.lastRun = execution.endTime;

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();

      logger.error(`Job failed: ${name}`, {
        executionId: execution.id,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Add execution to history
   */
  private addExecution(execution: JobExecution): void {
    this.executions.push(execution);

    // Keep only the most recent executions
    if (this.executions.length > this.maxExecutionHistory) {
      this.executions = this.executions.slice(-this.maxExecutionHistory);
    }
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executions = [];
    logger.info('Execution history cleared');
  }
}
