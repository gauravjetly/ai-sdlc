/**
 * WorkExecution Entity
 *
 * Tracks the execution lifecycle of a scheduled work item,
 * including progress, logs, and produced artifacts.
 */

import { v4 as uuidv4 } from 'uuid';

export enum ExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export interface ExecutionArtifact {
  name: string;
  path: string;
  type: string;
  sizeBytes?: number;
}

export interface WorkExecutionProps {
  id?: string;
  workItemId: string;
  agentId: string;
  status?: ExecutionStatus;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  logs?: string;
  artifacts?: ExecutionArtifact[];
  memorySnapshot?: Record<string, unknown>;
  errorMessage?: string;
  retryCount?: number;
}

export class WorkExecution {
  readonly id: string;
  readonly workItemId: string;
  readonly agentId: string;
  private _status: ExecutionStatus;
  private _progress: number;
  readonly startedAt: Date;
  private _completedAt: Date | null;
  private _logs: string[];
  private _artifacts: ExecutionArtifact[];
  private _memorySnapshot: Record<string, unknown> | null;
  private _errorMessage: string | null;
  private _retryCount: number;

  constructor(props: WorkExecutionProps) {
    this.id = props.id || uuidv4();
    this.workItemId = props.workItemId;
    this.agentId = props.agentId;
    this._status = props.status || ExecutionStatus.QUEUED;
    this._progress = props.progress || 0;
    this.startedAt = props.startedAt || new Date();
    this._completedAt = props.completedAt || null;
    this._logs = props.logs ? props.logs.split('\n') : [];
    this._artifacts = props.artifacts || [];
    this._memorySnapshot = props.memorySnapshot || null;
    this._errorMessage = props.errorMessage || null;
    this._retryCount = props.retryCount || 0;
  }

  get status(): ExecutionStatus {
    return this._status;
  }

  get progress(): number {
    return this._progress;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get logs(): string {
    return this._logs.join('\n');
  }

  get artifacts(): ExecutionArtifact[] {
    return [...this._artifacts];
  }

  get memorySnapshot(): Record<string, unknown> | null {
    return this._memorySnapshot;
  }

  get errorMessage(): string | null {
    return this._errorMessage;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get durationMs(): number | null {
    if (!this._completedAt) {
      return Date.now() - this.startedAt.getTime();
    }
    return this._completedAt.getTime() - this.startedAt.getTime();
  }

  /**
   * Start the execution
   */
  start(): void {
    if (this._status !== ExecutionStatus.QUEUED) {
      throw new Error(`Cannot start execution in status: ${this._status}`);
    }
    this._status = ExecutionStatus.RUNNING;
    this.addLog('INFO', 'Execution started');
  }

  /**
   * Update execution progress (0-100)
   */
  updateProgress(progress: number, message?: string): void {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    this._progress = progress;
    if (message) {
      this.addLog('INFO', `Progress ${progress}%: ${message}`);
    }
  }

  /**
   * Mark execution as completed
   */
  complete(artifacts?: ExecutionArtifact[]): void {
    if (this._status !== ExecutionStatus.RUNNING) {
      throw new Error(`Cannot complete execution in status: ${this._status}`);
    }
    this._status = ExecutionStatus.COMPLETED;
    this._progress = 100;
    this._completedAt = new Date();
    if (artifacts) {
      this._artifacts.push(...artifacts);
    }
    this.addLog('INFO', 'Execution completed successfully');
  }

  /**
   * Mark execution as failed
   */
  fail(errorMessage: string): void {
    this._status = ExecutionStatus.FAILED;
    this._errorMessage = errorMessage;
    this._completedAt = new Date();
    this.addLog('ERROR', `Execution failed: ${errorMessage}`);
  }

  /**
   * Mark execution as cancelled
   */
  cancel(): void {
    if (this._status === ExecutionStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed execution');
    }
    this._status = ExecutionStatus.CANCELLED;
    this._completedAt = new Date();
    this.addLog('WARN', 'Execution cancelled');
  }

  /**
   * Mark execution as timed out
   */
  timeout(): void {
    this._status = ExecutionStatus.TIMEOUT;
    this._completedAt = new Date();
    this.addLog('ERROR', 'Execution timed out');
  }

  /**
   * Increment retry count
   */
  incrementRetry(): void {
    this._retryCount += 1;
    this.addLog('WARN', `Retry attempt ${this._retryCount}`);
  }

  /**
   * Save agent memory snapshot at time of execution
   */
  saveMemorySnapshot(snapshot: Record<string, unknown>): void {
    this._memorySnapshot = snapshot;
  }

  /**
   * Add an artifact produced by the execution
   */
  addArtifact(artifact: ExecutionArtifact): void {
    this._artifacts.push(artifact);
    this.addLog('INFO', `Artifact produced: ${artifact.name} (${artifact.path})`);
  }

  /**
   * Add a log entry
   */
  addLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    this._logs.push(`${timestamp} [${level}] ${message}`);
  }

  /**
   * Check if the execution is in a terminal state
   */
  isTerminal(): boolean {
    return [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.CANCELLED,
      ExecutionStatus.TIMEOUT,
    ].includes(this._status);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      workItemId: this.workItemId,
      agentId: this.agentId,
      status: this._status,
      progress: this._progress,
      startedAt: this.startedAt.toISOString(),
      completedAt: this._completedAt?.toISOString() || null,
      logs: this.logs,
      artifacts: this._artifacts,
      memorySnapshot: this._memorySnapshot,
      errorMessage: this._errorMessage,
      retryCount: this._retryCount,
      durationMs: this.durationMs,
    };
  }
}
