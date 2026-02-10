/**
 * ScheduledProject Entity
 *
 * Represents a complete AISDLC project scheduled for delivery.
 * Each project follows the 7-phase lifecycle and is managed
 * by the agent pool orchestration system.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ProjectValidationError,
  ProjectNameTooLongError,
  InvalidPhaseCountError,
  InvalidProjectStateError,
  InvalidPhaseTransitionError,
  PhasePrerequisiteError,
  PhaseNotFoundError,
} from '../errors';

export enum SDLCPhase {
  REQUIREMENTS = 'requirements',
  ARCHITECTURE = 'architecture',
  DEVELOPMENT = 'development',
  SECURITY = 'security',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  ACCEPTANCE = 'acceptance',
}

export const SDLC_PHASE_ORDER: SDLCPhase[] = [
  SDLCPhase.REQUIREMENTS,
  SDLCPhase.ARCHITECTURE,
  SDLCPhase.DEVELOPMENT,
  SDLCPhase.SECURITY,
  SDLCPhase.TESTING,
  SDLCPhase.DEPLOYMENT,
  SDLCPhase.ACCEPTANCE,
];

export const PHASE_AGENT_MAP: Record<SDLCPhase, string> = {
  [SDLCPhase.REQUIREMENTS]: 'ba_agent',
  [SDLCPhase.ARCHITECTURE]: 'architect_agent',
  [SDLCPhase.DEVELOPMENT]: 'developer_agent',
  [SDLCPhase.SECURITY]: 'security_agent',
  [SDLCPhase.TESTING]: 'qa_agent',
  [SDLCPhase.DEPLOYMENT]: 'sre_agent',
  [SDLCPhase.ACCEPTANCE]: 'conductor_agent',
};

export enum PhaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export type DeliveryHealth = 'on_track' | 'at_risk' | 'behind' | 'completed' | 'unknown';

export interface PhaseArtifact {
  name: string;
  path: string;
  type: string;
}

export interface ProjectPhase {
  id: string;
  phase: SDLCPhase;
  status: PhaseStatus;
  assignedAgentId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  outputArtifacts: PhaseArtifact[];
  notes: string;
  durationMinutes: number | null;
}

export interface ScheduledProjectProps {
  id?: string;
  name: string;
  description?: string;
  deliveryDate: Date;
  scheduledStartDate?: Date | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  tags?: string[];
  estimatedEffortHours?: number;
  actualEffortHours?: number;
  phases?: ProjectPhase[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date | null;
}

export class ScheduledProject {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly deliveryDate: Date;
  readonly scheduledStartDate: Date | null;
  private _status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly tags: string[];
  readonly estimatedEffortHours: number;
  private _actualEffortHours: number;
  private _phases: ProjectPhase[];
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  private _completedAt: Date | null;

  constructor(props: ScheduledProjectProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.description = props.description || '';
    this.deliveryDate = props.deliveryDate;
    this.scheduledStartDate = props.scheduledStartDate || null;
    this._status = props.status || ProjectStatus.DRAFT;
    this.priority = props.priority || ProjectPriority.NORMAL;
    this.tags = props.tags || [];
    this.estimatedEffortHours = props.estimatedEffortHours || 0;
    this._actualEffortHours = props.actualEffortHours || 0;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this._completedAt = props.completedAt || null;

    // Initialize phases if not provided
    this._phases = props.phases || SDLC_PHASE_ORDER.map(phase => ({
      id: uuidv4(),
      phase,
      status: PhaseStatus.PENDING,
      assignedAgentId: null,
      startedAt: null,
      completedAt: null,
      outputArtifacts: [],
      notes: '',
      durationMinutes: null,
    }));

    this.validate();
  }

  // --- Getters ---

  get status(): ProjectStatus { return this._status; }
  get completedAt(): Date | null { return this._completedAt; }
  get actualEffortHours(): number { return this._actualEffortHours; }
  get phases(): readonly ProjectPhase[] { return this._phases; }

  get currentPhase(): SDLCPhase | null {
    const active = this._phases.find(p => p.status === PhaseStatus.IN_PROGRESS);
    if (active) return active.phase;
    const nextPending = this._phases.find(p => p.status === PhaseStatus.PENDING);
    return nextPending ? nextPending.phase : null;
  }

  get currentPhaseIndex(): number {
    const phase = this.currentPhase;
    if (!phase) return this._phases.length;
    return SDLC_PHASE_ORDER.indexOf(phase);
  }

  get progressPercent(): number {
    const completed = this._phases.filter(p =>
      p.status === PhaseStatus.COMPLETED || p.status === PhaseStatus.SKIPPED
    ).length;
    return Math.round((completed / this._phases.length) * 100);
  }

  get completedPhaseCount(): number {
    return this._phases.filter(p =>
      p.status === PhaseStatus.COMPLETED || p.status === PhaseStatus.SKIPPED
    ).length;
  }

  // --- Validation ---

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new ProjectValidationError('Project name is required', {
        field: 'name',
        constraint: 'required',
      });
    }
    if (this.name.length > 200) {
      throw new ProjectNameTooLongError(this.name.length, 200);
    }
    if (!this.deliveryDate) {
      throw new ProjectValidationError('Delivery date is required', {
        field: 'deliveryDate',
        constraint: 'required',
      });
    }
    if (this._phases.length !== 7) {
      throw new InvalidPhaseCountError(this._phases.length, 7);
    }
  }

  // --- Lifecycle Methods ---

  /**
   * Schedule the project for execution
   */
  schedule(): void {
    if (this._status !== ProjectStatus.DRAFT) {
      throw new InvalidProjectStateError(
        this.id,
        'Cannot schedule project',
        this._status,
        [ProjectStatus.DRAFT]
      );
    }
    this._status = ProjectStatus.SCHEDULED;
  }

  /**
   * Start the project (begins the first phase)
   */
  start(): void {
    if (this._status !== ProjectStatus.SCHEDULED && this._status !== ProjectStatus.DRAFT) {
      throw new InvalidProjectStateError(
        this.id,
        'Cannot start project',
        this._status,
        [ProjectStatus.SCHEDULED, ProjectStatus.DRAFT]
      );
    }
    this._status = ProjectStatus.IN_PROGRESS;
  }

  /**
   * Start a specific phase
   */
  startPhase(phase: SDLCPhase, agentId: string): void {
    const phaseRecord = this.getPhaseRecord(phase);
    if (phaseRecord.status !== PhaseStatus.PENDING) {
      throw new InvalidPhaseTransitionError(
        this.id,
        phase,
        phaseRecord.status,
        PhaseStatus.PENDING,
        'startPhase'
      );
    }

    // Verify previous phase is completed (except for first phase)
    const phaseIndex = SDLC_PHASE_ORDER.indexOf(phase);
    if (phaseIndex > 0) {
      const prevPhase = this._phases[phaseIndex - 1];
      if (prevPhase.status !== PhaseStatus.COMPLETED && prevPhase.status !== PhaseStatus.SKIPPED) {
        throw new PhasePrerequisiteError(
          this.id,
          phase,
          prevPhase.phase,
          prevPhase.status
        );
      }
    }

    phaseRecord.status = PhaseStatus.IN_PROGRESS;
    phaseRecord.assignedAgentId = agentId;
    phaseRecord.startedAt = new Date();

    if (this._status !== ProjectStatus.IN_PROGRESS) {
      this._status = ProjectStatus.IN_PROGRESS;
    }
  }

  /**
   * Complete a phase and produce artifacts
   */
  completePhase(phase: SDLCPhase, artifacts?: PhaseArtifact[], notes?: string): void {
    const phaseRecord = this.getPhaseRecord(phase);
    if (phaseRecord.status !== PhaseStatus.IN_PROGRESS) {
      throw new InvalidPhaseTransitionError(
        this.id,
        phase,
        phaseRecord.status,
        PhaseStatus.IN_PROGRESS,
        'completePhase'
      );
    }

    phaseRecord.status = PhaseStatus.COMPLETED;
    phaseRecord.completedAt = new Date();
    if (artifacts) {
      phaseRecord.outputArtifacts = artifacts;
    }
    if (notes) {
      phaseRecord.notes = notes;
    }

    // Calculate duration
    if (phaseRecord.startedAt) {
      phaseRecord.durationMinutes = Math.round(
        (phaseRecord.completedAt.getTime() - phaseRecord.startedAt.getTime()) / 60000
      );
      this._actualEffortHours += phaseRecord.durationMinutes / 60;
    }

    // Release agent
    phaseRecord.assignedAgentId = null;

    // Check if all phases are complete
    const allDone = this._phases.every(p =>
      p.status === PhaseStatus.COMPLETED || p.status === PhaseStatus.SKIPPED
    );
    if (allDone) {
      this._status = ProjectStatus.COMPLETED;
      this._completedAt = new Date();
    }
  }

  /**
   * Fail a phase
   */
  failPhase(phase: SDLCPhase, error: string): void {
    const phaseRecord = this.getPhaseRecord(phase);
    phaseRecord.status = PhaseStatus.FAILED;
    phaseRecord.completedAt = new Date();
    phaseRecord.notes = `Failed: ${error}`;
    phaseRecord.assignedAgentId = null;

    if (phaseRecord.startedAt) {
      phaseRecord.durationMinutes = Math.round(
        (phaseRecord.completedAt.getTime() - phaseRecord.startedAt.getTime()) / 60000
      );
    }

    this._status = ProjectStatus.FAILED;
  }

  /**
   * Block the project
   */
  block(reason: string): void {
    this._status = ProjectStatus.BLOCKED;
    const activePhase = this._phases.find(p => p.status === PhaseStatus.IN_PROGRESS);
    if (activePhase) {
      activePhase.status = PhaseStatus.BLOCKED;
      activePhase.notes = `Blocked: ${reason}`;
    }
  }

  /**
   * Cancel the project
   */
  cancel(): void {
    if (this._status === ProjectStatus.COMPLETED) {
      throw new InvalidProjectStateError(
        this.id,
        'Cannot cancel a completed project',
        this._status,
        [
          ProjectStatus.DRAFT,
          ProjectStatus.SCHEDULED,
          ProjectStatus.IN_PROGRESS,
          ProjectStatus.BLOCKED,
          ProjectStatus.FAILED,
        ]
      );
    }
    this._status = ProjectStatus.CANCELLED;
    this._completedAt = new Date();

    // Cancel any in-progress phases
    for (const phase of this._phases) {
      if (phase.status === PhaseStatus.IN_PROGRESS) {
        phase.status = PhaseStatus.SKIPPED;
        phase.assignedAgentId = null;
      }
    }
  }

  // --- Query Methods ---

  /**
   * Get the next phase that is ready to be started
   */
  getNextReadyPhase(): SDLCPhase | null {
    for (let i = 0; i < this._phases.length; i++) {
      const phase = this._phases[i];
      if (phase.status === PhaseStatus.PENDING) {
        if (i === 0) return phase.phase;
        const prev = this._phases[i - 1];
        if (prev.status === PhaseStatus.COMPLETED || prev.status === PhaseStatus.SKIPPED) {
          return phase.phase;
        }
        return null; // Previous phase not done yet
      }
    }
    return null;
  }

  /**
   * Get the agent type needed for the next ready phase
   */
  getNextRequiredAgentType(): string | null {
    const nextPhase = this.getNextReadyPhase();
    if (!nextPhase) return null;
    return PHASE_AGENT_MAP[nextPhase];
  }

  /**
   * Calculate delivery health based on historical averages
   */
  calculateDeliveryHealth(avgPhaseDurationDays: Record<SDLCPhase, number>): DeliveryHealth {
    if (this._status === ProjectStatus.COMPLETED) return 'completed';
    if (this._status === ProjectStatus.CANCELLED || this._status === ProjectStatus.FAILED) return 'unknown';

    const remainingPhases = this._phases.filter(p =>
      p.status === PhaseStatus.PENDING || p.status === PhaseStatus.IN_PROGRESS
    );

    const estimatedRemainingDays = remainingPhases.reduce((sum, p) => {
      return sum + (avgPhaseDurationDays[p.phase] || 2);
    }, 0);

    const now = new Date();
    const estimatedCompletion = new Date(now.getTime() + estimatedRemainingDays * 86400000);
    const bufferDays = 2;

    if (estimatedCompletion <= this.deliveryDate) return 'on_track';
    if (estimatedCompletion <= new Date(this.deliveryDate.getTime() + bufferDays * 86400000)) return 'at_risk';
    return 'behind';
  }

  /**
   * Get estimated completion date
   */
  getEstimatedCompletionDate(avgPhaseDurationDays: Record<SDLCPhase, number>): Date {
    const remainingPhases = this._phases.filter(p =>
      p.status === PhaseStatus.PENDING || p.status === PhaseStatus.IN_PROGRESS
    );

    const estimatedRemainingDays = remainingPhases.reduce((sum, p) => {
      return sum + (avgPhaseDurationDays[p.phase] || 2);
    }, 0);

    return new Date(Date.now() + estimatedRemainingDays * 86400000);
  }

  /**
   * Compute priority score for agent allocation.
   * Higher score = higher priority for agent assignment.
   */
  computeAllocationScore(): number {
    const priorityWeights: Record<ProjectPriority, number> = {
      [ProjectPriority.CRITICAL]: 40,
      [ProjectPriority.HIGH]: 30,
      [ProjectPriority.NORMAL]: 20,
      [ProjectPriority.LOW]: 10,
    };

    const daysUntilDeadline = Math.max(0,
      (this.deliveryDate.getTime() - Date.now()) / 86400000
    );
    const deadlineUrgency = Math.max(0, 30 - daysUntilDeadline); // urgency increases as deadline approaches

    // Earlier phases get a small bonus to clear pipeline stalls
    const phaseBonus = Math.max(0, 7 - this.currentPhaseIndex);

    return priorityWeights[this.priority] + deadlineUrgency + phaseBonus;
  }

  // --- Private Helpers ---

  private getPhaseRecord(phase: SDLCPhase): ProjectPhase {
    const record = this._phases.find(p => p.phase === phase);
    if (!record) {
      throw new PhaseNotFoundError(this.id, phase);
    }
    return record;
  }

  // --- Serialization ---

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      deliveryDate: this.deliveryDate.toISOString(),
      scheduledStartDate: this.scheduledStartDate?.toISOString() || null,
      status: this._status,
      priority: this.priority,
      tags: this.tags,
      estimatedEffortHours: this.estimatedEffortHours,
      actualEffortHours: this._actualEffortHours,
      currentPhase: this.currentPhase,
      currentPhaseIndex: this.currentPhaseIndex,
      progressPercent: this.progressPercent,
      completedPhaseCount: this.completedPhaseCount,
      phases: this._phases.map(p => ({
        ...p,
        startedAt: p.startedAt?.toISOString() || null,
        completedAt: p.completedAt?.toISOString() || null,
      })),
      createdBy: this.createdBy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this._completedAt?.toISOString() || null,
    };
  }
}
