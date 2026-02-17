/**
 * Progress Tracker
 *
 * Tracks workflow execution progress and provides real-time status
 * updates. Used by both hooks and MCP tools.
 *
 * @module executor/progress-tracker
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkflowRecord, WorkflowStatus } from './workflow-executor';

/**
 * Progress event for real-time updates.
 */
export interface ProgressEvent {
  timestamp: string;
  workflowId: string;
  type: 'phase-start' | 'phase-complete' | 'phase-fail' | 'workflow-start' | 'workflow-complete' | 'workflow-fail';
  phase?: string;
  agent?: string;
  message: string;
  progress: number; // 0.0 to 1.0
}

/**
 * Aggregated progress statistics.
 */
export interface ProgressStats {
  totalWorkflows: number;
  activeWorkflows: number;
  completedToday: number;
  failedToday: number;
  averageDurationMs: number;
  phaseCompletionRate: Record<string, number>;
}

/**
 * ProgressTracker maintains a log of progress events and computes statistics.
 */
export class ProgressTracker {
  private readonly eventsDir: string;
  private readonly statsDir: string;

  constructor(baseDir?: string) {
    const base = baseDir || path.join(os.homedir(), '.aisdlc', 'registry');
    this.eventsDir = path.join(base, 'events');
    this.statsDir = path.join(base, 'stats');

    for (const dir of [this.eventsDir, this.statsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Record a progress event.
   */
  recordEvent(event: ProgressEvent): void {
    const dateDir = event.timestamp.split('T')[0];
    const fullDir = path.join(this.eventsDir, dateDir);

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const filename = `EVT-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(fullDir, filename),
      JSON.stringify(event, null, 2),
    );
  }

  /**
   * Get recent events for a workflow.
   */
  getWorkflowEvents(workflowId: string, limit = 100): ProgressEvent[] {
    const events: ProgressEvent[] = [];
    const today = new Date().toISOString().split('T')[0];
    const dateDir = path.join(this.eventsDir, today);

    if (!fs.existsSync(dateDir)) return events;

    const files = fs.readdirSync(dateDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files) {
      if (events.length >= limit) break;
      try {
        const content = fs.readFileSync(path.join(dateDir, file), 'utf-8');
        const event = JSON.parse(content) as ProgressEvent;
        if (event.workflowId === workflowId) {
          events.push(event);
        }
      } catch {
        // Skip corrupt files
      }
    }

    return events;
  }

  /**
   * Get recent events across all workflows.
   */
  getRecentEvents(limit = 50): ProgressEvent[] {
    const events: ProgressEvent[] = [];
    const today = new Date().toISOString().split('T')[0];
    const dateDir = path.join(this.eventsDir, today);

    if (!fs.existsSync(dateDir)) return events;

    const files = fs.readdirSync(dateDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dateDir, file), 'utf-8');
        events.push(JSON.parse(content) as ProgressEvent);
      } catch {
        // Skip corrupt files
      }
    }

    return events;
  }

  /**
   * Calculate workflow progress as a percentage.
   */
  calculateProgress(workflow: WorkflowRecord): number {
    if (workflow.phases.length === 0) return 0;

    const completed = workflow.phases.filter(
      p => p.status === 'completed' || p.status === 'failed',
    ).length;

    return completed / workflow.phases.length;
  }

  /**
   * Compute aggregate statistics for today.
   */
  computeStats(workflows: WorkflowRecord[]): ProgressStats {
    const today = new Date().toISOString().split('T')[0];

    const todayWorkflows = workflows.filter(w =>
      w.createdAt && w.createdAt.startsWith(today),
    );

    const activeWorkflows = workflows.filter(w =>
      w.status === 'pending' || w.status === 'in-progress',
    );

    const completedToday = todayWorkflows.filter(w =>
      w.status === 'completed',
    );

    const failedToday = todayWorkflows.filter(w =>
      w.status === 'failed' || w.status === 'blocked',
    );

    // Average duration of completed workflows
    const durations = completedToday
      .filter(w => w.startedAt && w.completedAt)
      .map(w => new Date(w.completedAt!).getTime() - new Date(w.startedAt!).getTime());

    const averageDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Phase completion rates
    const phaseCompletionRate: Record<string, number> = {};
    const phaseCounts: Record<string, { total: number; completed: number }> = {};

    for (const workflow of workflows) {
      for (const phase of workflow.phases) {
        if (!phaseCounts[phase.phase]) {
          phaseCounts[phase.phase] = { total: 0, completed: 0 };
        }
        phaseCounts[phase.phase].total++;
        if (phase.status === 'completed') {
          phaseCounts[phase.phase].completed++;
        }
      }
    }

    for (const [phase, counts] of Object.entries(phaseCounts)) {
      phaseCompletionRate[phase] = counts.total > 0
        ? counts.completed / counts.total
        : 0;
    }

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: activeWorkflows.length,
      completedToday: completedToday.length,
      failedToday: failedToday.length,
      averageDurationMs,
      phaseCompletionRate,
    };
  }
}
