/**
 * Async Processor
 *
 * Provides asynchronous processing for classification and workflow tasks
 * using an in-memory job queue. In production, this can be backed by BullMQ
 * for distributed processing with Redis.
 *
 * Part of Phase 3: Performance Optimization.
 *
 * @module performance/async-processor
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Job status in the queue.
 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * A job in the async processing queue.
 */
export interface AsyncJob<T = unknown> {
  /** Unique job identifier */
  id: string;
  /** Job type/category */
  type: string;
  /** Input data for the job */
  data: unknown;
  /** Current status */
  status: JobStatus;
  /** Result data (when completed) */
  result: T | null;
  /** Error message (when failed) */
  error: string | null;
  /** When the job was queued */
  queuedAt: string;
  /** When processing started */
  startedAt: string | null;
  /** When the job completed or failed */
  completedAt: string | null;
  /** Processing duration in ms */
  durationMs: number | null;
}

/**
 * Job processor function type.
 */
export type JobProcessor<TInput = unknown, TOutput = unknown> = (
  data: TInput,
) => Promise<TOutput>;

/**
 * Async processor configuration.
 */
export interface AsyncProcessorConfig {
  /** Maximum concurrent jobs. Default: 5 */
  concurrency?: number;
  /** Job timeout in ms. Default: 30000 (30s) */
  jobTimeoutMs?: number;
  /** Maximum queue size. Default: 100 */
  maxQueueSize?: number;
}

/**
 * Listener for job events.
 */
export type JobEventListener = (event: JobEvent) => void;

/**
 * Job lifecycle events.
 */
export interface JobEvent {
  type: 'queued' | 'started' | 'completed' | 'failed';
  job: AsyncJob;
  timestamp: string;
}

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_JOB_TIMEOUT_MS = 30000;
const DEFAULT_MAX_QUEUE_SIZE = 100;

/**
 * AsyncProcessor provides a simple in-memory job queue for
 * asynchronous classification and workflow processing.
 *
 * Features:
 * - Configurable concurrency
 * - Job timeout handling
 * - Event-driven job lifecycle
 * - Job status tracking
 * - Queue size limits
 */
export class AsyncProcessor {
  private readonly jobs: Map<string, AsyncJob> = new Map();
  private readonly processors: Map<string, JobProcessor> = new Map();
  private readonly listeners: JobEventListener[] = [];
  private readonly config: Required<AsyncProcessorConfig>;
  private activeJobs: number = 0;
  private readonly pendingQueue: string[] = [];

  constructor(config: AsyncProcessorConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? DEFAULT_CONCURRENCY,
      jobTimeoutMs: config.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS,
      maxQueueSize: config.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE,
    };
  }

  /**
   * Register a processor for a specific job type.
   *
   * @param type - The job type
   * @param processor - The processor function
   */
  registerProcessor<TInput, TOutput>(
    type: string,
    processor: JobProcessor<TInput, TOutput>,
  ): void {
    this.processors.set(type, processor as JobProcessor);
  }

  /**
   * Queue a job for async processing.
   *
   * @param type - The job type (must have a registered processor)
   * @param data - Input data for the job
   * @returns The job ID
   * @throws Error if queue is full or no processor registered
   */
  async queue<T = unknown>(type: string, data: T): Promise<string> {
    if (!this.processors.has(type)) {
      throw new Error(`No processor registered for job type '${type}'`);
    }

    if (this.jobs.size >= this.config.maxQueueSize) {
      throw new Error(`Job queue is full (max: ${this.config.maxQueueSize})`);
    }

    const id = uuidv4();
    const job: AsyncJob = {
      id,
      type,
      data,
      status: 'queued',
      result: null,
      error: null,
      queuedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      durationMs: null,
    };

    this.jobs.set(id, job);
    this.pendingQueue.push(id);

    this.emit({
      type: 'queued',
      job,
      timestamp: job.queuedAt,
    });

    // Process immediately if capacity allows
    this.processNext();

    return id;
  }

  /**
   * Get the result of a queued job.
   *
   * @param jobId - The job ID
   * @returns The job with current status and result
   * @throws Error if job not found
   */
  getResult<T = unknown>(jobId: string): AsyncJob<T> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }
    return job as AsyncJob<T>;
  }

  /**
   * Wait for a job to complete.
   *
   * @param jobId - The job ID
   * @param timeoutMs - Maximum wait time. Default: jobTimeoutMs
   * @returns The completed job result
   * @throws Error if job fails or times out
   */
  async waitForResult<T = unknown>(jobId: string, timeoutMs?: number): Promise<T> {
    const timeout = timeoutMs ?? this.config.jobTimeoutMs;
    const start = Date.now();

    return new Promise<T>((resolve, reject) => {
      const check = (): void => {
        const job = this.jobs.get(jobId);
        if (!job) {
          reject(new Error(`Job '${jobId}' not found`));
          return;
        }

        if (job.status === 'completed') {
          resolve(job.result as T);
          return;
        }

        if (job.status === 'failed') {
          reject(new Error(`Job '${jobId}' failed: ${job.error}`));
          return;
        }

        if (Date.now() - start > timeout) {
          reject(new Error(`Job '${jobId}' timed out after ${timeout}ms`));
          return;
        }

        setTimeout(check, 50);
      };

      check();
    });
  }

  /**
   * Get all jobs with their current status.
   */
  getAllJobs(): AsyncJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs filtered by status.
   */
  getJobsByStatus(status: JobStatus): AsyncJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  /**
   * Register an event listener.
   */
  on(listener: JobEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  off(listener: JobEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get queue statistics.
   */
  getStats(): {
    totalJobs: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    activeJobs: number;
    concurrency: number;
  } {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'queued':
          queued++;
          break;
        case 'processing':
          processing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return {
      totalJobs: this.jobs.size,
      queued,
      processing,
      completed,
      failed,
      activeJobs: this.activeJobs,
      concurrency: this.config.concurrency,
    };
  }

  /**
   * Clear completed and failed jobs from the queue.
   */
  cleanup(): number {
    let cleaned = 0;
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Process the next job in the queue if capacity allows.
   */
  private processNext(): void {
    if (this.activeJobs >= this.config.concurrency) return;
    if (this.pendingQueue.length === 0) return;

    const jobId = this.pendingQueue.shift()!;
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') {
      // Job was removed or already processed, try next
      this.processNext();
      return;
    }

    this.activeJobs++;
    job.status = 'processing';
    job.startedAt = new Date().toISOString();

    this.emit({
      type: 'started',
      job,
      timestamp: job.startedAt,
    });

    const processor = this.processors.get(job.type)!;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (job.status === 'processing') {
        job.status = 'failed';
        job.error = `Job timed out after ${this.config.jobTimeoutMs}ms`;
        job.completedAt = new Date().toISOString();
        job.durationMs = Date.now() - new Date(job.startedAt!).getTime();
        this.activeJobs--;
        this.emit({ type: 'failed', job, timestamp: job.completedAt });
        this.processNext();
      }
    }, this.config.jobTimeoutMs);

    processor(job.data)
      .then((result) => {
        clearTimeout(timeoutId);
        if (job.status !== 'processing') return; // Already timed out

        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date().toISOString();
        job.durationMs = Date.now() - new Date(job.startedAt!).getTime();

        this.emit({ type: 'completed', job, timestamp: job.completedAt });
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (job.status !== 'processing') return; // Already timed out

        job.status = 'failed';
        job.error = err instanceof Error ? err.message : String(err);
        job.completedAt = new Date().toISOString();
        job.durationMs = Date.now() - new Date(job.startedAt!).getTime();

        this.emit({ type: 'failed', job, timestamp: job.completedAt });
      })
      .finally(() => {
        this.activeJobs--;
        this.processNext();
      });
  }

  /**
   * Emit an event to listeners.
   */
  private emit(event: JobEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors should not break processing
      }
    }
  }
}
