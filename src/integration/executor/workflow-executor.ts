/**
 * Workflow Executor
 *
 * Executes SDLC workflows from routed requests. Manages phase execution,
 * progress tracking, and result formatting.
 *
 * @module executor/workflow-executor
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RoutingDecision, AgentId } from '../router/types';
import { RequestClassification, SDLCPhase } from '../classifier/types';

/**
 * Workflow status.
 */
export type WorkflowStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';

/**
 * Phase execution record.
 */
export interface PhaseExecution {
  phase: SDLCPhase;
  agent: AgentId;
  status: WorkflowStatus;
  startedAt: string | null;
  completedAt: string | null;
  output: string | null;
  error: string | null;
}

/**
 * Complete workflow record.
 */
export interface WorkflowRecord {
  id: string;
  description: string;
  classification: {
    type: string;
    complexity: string;
    urgency: string;
    confidence: number;
  };
  route: {
    strategy: string;
    phases: SDLCPhase[];
    agents: AgentId[];
    estimatedDuration: string;
  };
  governance: {
    level: number;
    allowed: boolean;
  };
  status: WorkflowStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  phases: PhaseExecution[];
  outputs: Record<string, string>;
}

/**
 * Agent-to-phase mapping.
 */
const PHASE_AGENT_MAP: Record<SDLCPhase, AgentId> = {
  'requirements': 'ba',
  'architecture': 'jets',
  'ux-design': 'ux' as AgentId,
  'implementation': 'engineer',
  'security': 'security',
  'testing': 'qa',
  'deployment': 'atlas',
  'acceptance': 'customer',
  'tracking': 'tracker',
  'cost-analysis': 'finops',
};

/**
 * WorkflowExecutor manages the execution of SDLC workflows.
 */
export class WorkflowExecutor {
  private readonly workflowDir: string;

  constructor(workflowDir?: string) {
    this.workflowDir = workflowDir || path.join(os.homedir(), '.aisdlc', 'registry', 'workflows');
    if (!fs.existsSync(this.workflowDir)) {
      fs.mkdirSync(this.workflowDir, { recursive: true });
    }
  }

  /**
   * Create a new workflow from a routing decision.
   */
  createWorkflow(
    description: string,
    classification: RequestClassification,
    route: RoutingDecision,
    governanceLevel: number,
  ): WorkflowRecord {
    const now = new Date();
    const id = `SDLC-${now.toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;

    const phases: PhaseExecution[] = route.phases.map(phase => ({
      phase,
      agent: PHASE_AGENT_MAP[phase] || 'engineer',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      output: null,
      error: null,
    }));

    const workflow: WorkflowRecord = {
      id,
      description,
      classification: {
        type: classification.type,
        complexity: classification.complexity,
        urgency: classification.urgency,
        confidence: classification.confidence,
      },
      route: {
        strategy: route.strategy,
        phases: route.phases,
        agents: route.agents,
        estimatedDuration: route.estimatedDuration,
      },
      governance: {
        level: governanceLevel,
        allowed: true,
      },
      status: 'pending',
      createdAt: now.toISOString(),
      startedAt: null,
      completedAt: null,
      phases,
      outputs: {},
    };

    this.saveWorkflow(workflow);
    return workflow;
  }

  /**
   * Start a workflow (mark as in-progress).
   */
  startWorkflow(workflowId: string): WorkflowRecord | null {
    const workflow = this.loadWorkflow(workflowId);
    if (!workflow) return null;

    workflow.status = 'in-progress';
    workflow.startedAt = new Date().toISOString();

    this.saveWorkflow(workflow);
    return workflow;
  }

  /**
   * Start a phase within a workflow.
   */
  startPhase(workflowId: string, phase: SDLCPhase): WorkflowRecord | null {
    const workflow = this.loadWorkflow(workflowId);
    if (!workflow) return null;

    const phaseExec = workflow.phases.find(p => p.phase === phase);
    if (!phaseExec) return null;

    phaseExec.status = 'in-progress';
    phaseExec.startedAt = new Date().toISOString();

    this.saveWorkflow(workflow);
    return workflow;
  }

  /**
   * Complete a phase within a workflow.
   */
  completePhase(workflowId: string, phase: SDLCPhase, output: string): WorkflowRecord | null {
    const workflow = this.loadWorkflow(workflowId);
    if (!workflow) return null;

    const phaseExec = workflow.phases.find(p => p.phase === phase);
    if (!phaseExec) return null;

    phaseExec.status = 'completed';
    phaseExec.completedAt = new Date().toISOString();
    phaseExec.output = output;
    workflow.outputs[phase] = output;

    // Check if all phases are done
    const allDone = workflow.phases.every(p => p.status === 'completed' || p.status === 'failed');
    if (allDone) {
      const anyFailed = workflow.phases.some(p => p.status === 'failed');
      workflow.status = anyFailed ? 'failed' : 'completed';
      workflow.completedAt = new Date().toISOString();
    }

    this.saveWorkflow(workflow);
    return workflow;
  }

  /**
   * Fail a phase within a workflow.
   */
  failPhase(workflowId: string, phase: SDLCPhase, error: string): WorkflowRecord | null {
    const workflow = this.loadWorkflow(workflowId);
    if (!workflow) return null;

    const phaseExec = workflow.phases.find(p => p.phase === phase);
    if (!phaseExec) return null;

    phaseExec.status = 'failed';
    phaseExec.completedAt = new Date().toISOString();
    phaseExec.error = error;

    // If a blocking phase fails, block the workflow
    workflow.status = 'blocked';

    this.saveWorkflow(workflow);
    return workflow;
  }

  /**
   * Get a workflow by ID.
   */
  getWorkflow(workflowId: string): WorkflowRecord | null {
    return this.loadWorkflow(workflowId);
  }

  /**
   * List all workflows, optionally filtered by status.
   */
  listWorkflows(status?: WorkflowStatus, limit = 50): WorkflowRecord[] {
    if (!fs.existsSync(this.workflowDir)) return [];

    const files = fs.readdirSync(this.workflowDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    const workflows: WorkflowRecord[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.workflowDir, file), 'utf-8');
        const workflow = JSON.parse(content) as WorkflowRecord;
        if (!status || workflow.status === status) {
          workflows.push(workflow);
        }
      } catch {
        // Skip corrupt files
      }
    }

    return workflows;
  }

  /**
   * Get the next phase to execute in a workflow.
   */
  getNextPhase(workflowId: string): PhaseExecution | null {
    const workflow = this.loadWorkflow(workflowId);
    if (!workflow) return null;

    return workflow.phases.find(p => p.status === 'pending') || null;
  }

  /**
   * Format a workflow for display.
   */
  formatWorkflowStatus(workflow: WorkflowRecord): string {
    const lines: string[] = [];
    lines.push(`Workflow: ${workflow.id}`);
    lines.push(`Description: ${workflow.description}`);
    lines.push(`Status: ${workflow.status}`);
    lines.push(`Strategy: ${workflow.route.strategy}`);
    lines.push(`Estimated: ${workflow.route.estimatedDuration}`);
    lines.push('');
    lines.push('Phases:');

    for (const phase of workflow.phases) {
      const icon = phase.status === 'completed' ? '[DONE]'
        : phase.status === 'in-progress' ? '[RUNNING]'
          : phase.status === 'failed' ? '[FAILED]'
            : '[PENDING]';
      lines.push(`  ${icon} ${phase.phase} (${phase.agent})`);
    }

    return lines.join('\n');
  }

  /**
   * Save a workflow to disk.
   */
  private saveWorkflow(workflow: WorkflowRecord): void {
    fs.writeFileSync(
      path.join(this.workflowDir, `${workflow.id}.json`),
      JSON.stringify(workflow, null, 2),
    );
  }

  /**
   * Load a workflow from disk.
   */
  private loadWorkflow(workflowId: string): WorkflowRecord | null {
    const filePath = path.join(this.workflowDir, `${workflowId}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as WorkflowRecord;
    } catch {
      return null;
    }
  }
}
