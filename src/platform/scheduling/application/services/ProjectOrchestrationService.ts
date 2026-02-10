/**
 * ProjectOrchestrationService
 *
 * Manages the multi-project lifecycle. Creates projects, advances phases,
 * allocates agents from the shared pool, and computes delivery health.
 */

import {
  ScheduledProject,
  ScheduledProjectProps,
  SDLCPhase,
  SDLC_PHASE_ORDER,
  PHASE_AGENT_MAP,
  PhaseStatus,
  ProjectStatus,
  ProjectPriority,
  DeliveryHealth,
  PhaseArtifact,
} from '../../domain/entities/ScheduledProject';
import { ProjectNotFoundError } from '../../domain/errors';

// --- Repository Interface ---

export interface IProjectRepository {
  save(project: ScheduledProject): Promise<void>;
  findById(id: string): Promise<ScheduledProject | null>;
  findAll(filters: ProjectFilters): Promise<{ items: ScheduledProject[]; total: number }>;
  findByStatus(statuses: ProjectStatus[]): Promise<ScheduledProject[]>;
  findProjectsNeedingAgent(agentType: string): Promise<ScheduledProject[]>;
  update(project: ScheduledProject): Promise<void>;
  delete(id: string): Promise<void>;
  getCompletedPhaseDurations(): Promise<Record<SDLCPhase, number>>; // avg days per phase
  getWeeklyThroughput(weeks: number): Promise<number[]>;
}

export interface ProjectFilters {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  tags?: string[];
  createdBy?: string;
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// --- DTOs ---

export interface CreateProjectDTO {
  name: string;
  description?: string;
  deliveryDate: string; // ISO date
  scheduledStartDate?: string;
  priority?: string;
  tags?: string[];
  estimatedEffortHours?: number;
  createdBy: string;
}

export interface AgentPoolStatus {
  agentType: string;
  displayName: string;
  totalInstances: number;
  busyInstances: number;
  idleInstances: number;
  queuedPhases: number;
  avgPhaseDurationMin: number;
  estimatedWaitMin: number;
}

export interface MultiProjectDashboard {
  metrics: {
    activeProjects: number;
    atRiskProjects: number;
    agentUtilizationPercent: number;
    avgPhaseDurationDays: number;
    weeklyVelocityTrend: number; // percentage change
  };
  projects: Array<{
    id: string;
    name: string;
    priority: string;
    deliveryDate: string;
    deliveryHealth: DeliveryHealth;
    estimatedCompletion: string;
    phases: Array<{
      phase: string;
      status: string;
      agentId: string | null;
    }>;
  }>;
  agentPool: AgentPoolStatus[];
  phaseDurations: Record<string, number>; // phase -> avg days
  weeklyThroughput: number[];
}

// --- Agent Pool Interface ---

export interface IAgentPool {
  getAvailableAgent(agentType: string): string | null;
  markBusy(agentId: string, projectId: string, phase: SDLCPhase): void;
  markIdle(agentId: string): void;
  getPoolStatus(): AgentPoolStatus[];
  getTotalUtilization(): number; // 0-100
  getQueueDepth(agentType: string): number;
}

// --- Lock Manager Interface ---

export interface ILockManager {
  acquire(
    resourceKey: string,
    holderId: string,
    config?: unknown
  ): Promise<{ isAcquired(): boolean; lockId: string | null }>;
  release(lockResult: { isAcquired(): boolean; lockId: string | null }): Promise<boolean>;
}

// --- Logger Interface ---

export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// --- Service ---

export class ProjectOrchestrationService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly agentPool: IAgentPool,
    private readonly lockManager?: ILockManager,
    private readonly logger?: ILogger,
  ) {}

  /**
   * Create a new SDLC project
   */
  async createProject(dto: CreateProjectDTO): Promise<ScheduledProject> {
    const project = new ScheduledProject({
      name: dto.name,
      description: dto.description,
      deliveryDate: new Date(dto.deliveryDate),
      scheduledStartDate: dto.scheduledStartDate ? new Date(dto.scheduledStartDate) : null,
      priority: (dto.priority as ProjectPriority) || ProjectPriority.NORMAL,
      tags: dto.tags,
      estimatedEffortHours: dto.estimatedEffortHours,
      createdBy: dto.createdBy,
    });

    // If no scheduled start date, schedule immediately
    if (!dto.scheduledStartDate) {
      project.schedule();
    } else {
      project.schedule();
    }

    await this.projectRepo.save(project);
    return project;
  }

  /**
   * Start a project (begin its first phase if an agent is available)
   */
  async startProject(projectId: string): Promise<ScheduledProject> {
    const project = await this.requireProject(projectId);
    project.start();

    // Try to allocate agent for first phase
    await this.tryAllocateNextPhase(project);

    await this.projectRepo.update(project);
    return project;
  }

  /**
   * Complete the current phase and advance to next
   */
  async completePhase(
    projectId: string,
    phase: SDLCPhase,
    artifacts?: PhaseArtifact[],
    notes?: string,
  ): Promise<ScheduledProject> {
    const project = await this.requireProject(projectId);
    project.completePhase(phase, artifacts, notes);

    // Try to allocate agent for next phase
    await this.tryAllocateNextPhase(project);

    await this.projectRepo.update(project);
    return project;
  }

  /**
   * Fail a phase
   */
  async failPhase(projectId: string, phase: SDLCPhase, error: string): Promise<ScheduledProject> {
    const project = await this.requireProject(projectId);
    project.failPhase(phase, error);
    await this.projectRepo.update(project);
    return project;
  }

  /**
   * Cancel a project
   */
  async cancelProject(projectId: string): Promise<ScheduledProject> {
    const project = await this.requireProject(projectId);
    project.cancel();
    await this.projectRepo.update(project);
    return project;
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<ScheduledProject | null> {
    return this.projectRepo.findById(id);
  }

  /**
   * List projects with filters
   */
  async listProjects(filters: ProjectFilters): Promise<{ items: ScheduledProject[]; total: number }> {
    return this.projectRepo.findAll(filters);
  }

  /**
   * Main scheduler loop: process all projects that need agent allocation.
   * Called periodically (every 30 seconds) by the scheduling engine.
   * Uses distributed locking to prevent race conditions.
   */
  async processReadyProjects(): Promise<number> {
    const activeProjects = await this.projectRepo.findByStatus([
      ProjectStatus.SCHEDULED,
      ProjectStatus.IN_PROGRESS,
    ]);

    // Sort by allocation score (highest first)
    const sorted = activeProjects
      .filter(p => p.getNextReadyPhase() !== null)
      .sort((a, b) => b.computeAllocationScore() - a.computeAllocationScore());

    let allocated = 0;
    for (const project of sorted) {
      const nextPhase = project.getNextReadyPhase();
      if (!nextPhase) continue;

      const agentType = PHASE_AGENT_MAP[nextPhase];
      const agentId = this.agentPool.getAvailableAgent(agentType);

      if (agentId) {
        // Try to allocate with distributed lock
        const success = await this.allocateAgentWithLock(
          project,
          nextPhase,
          agentId,
          agentType
        );

        if (success) {
          allocated++;
        }
      }
    }

    return allocated;
  }

  /**
   * When an agent finishes and is released, re-run allocation for waiting projects
   * Uses distributed locking to prevent race conditions.
   */
  async onAgentReleased(agentId: string, agentType: string): Promise<void> {
    this.agentPool.markIdle(agentId);

    // Find the highest-priority project waiting for this agent type
    const waitingProjects = await this.projectRepo.findProjectsNeedingAgent(agentType);
    const sorted = waitingProjects.sort((a, b) =>
      b.computeAllocationScore() - a.computeAllocationScore()
    );

    if (sorted.length > 0) {
      const project = sorted[0];
      const nextPhase = project.getNextReadyPhase();
      if (nextPhase) {
        // Try to allocate with distributed lock
        await this.allocateAgentWithLock(
          project,
          nextPhase,
          agentId,
          agentType
        );
      }
    }
  }

  /**
   * Get the complete multi-project dashboard
   */
  async getDashboard(): Promise<MultiProjectDashboard> {
    const allProjects = await this.projectRepo.findAll({
      limit: 100,
      sortBy: 'priority',
      sortOrder: 'desc',
    });

    const avgDurations = await this.projectRepo.getCompletedPhaseDurations();
    const weeklyThroughput = await this.projectRepo.getWeeklyThroughput(8);

    const activeCount = allProjects.items.filter(p =>
      [ProjectStatus.IN_PROGRESS, ProjectStatus.SCHEDULED].includes(p.status)
    ).length;

    const projectSummaries = allProjects.items.map(p => {
      const health = p.calculateDeliveryHealth(avgDurations);
      const estCompletion = p.getEstimatedCompletionDate(avgDurations);
      return {
        id: p.id,
        name: p.name,
        priority: p.priority,
        deliveryDate: p.deliveryDate.toISOString(),
        deliveryHealth: health,
        estimatedCompletion: estCompletion.toISOString(),
        phases: p.phases.map(ph => ({
          phase: ph.phase,
          status: ph.status,
          agentId: ph.assignedAgentId,
        })),
      };
    });

    const atRiskCount = projectSummaries.filter(p =>
      p.deliveryHealth === 'at_risk' || p.deliveryHealth === 'behind'
    ).length;

    const poolStatus = this.agentPool.getPoolStatus();
    const utilization = this.agentPool.getTotalUtilization();

    // Calculate average phase duration across all phases
    const durationValues = Object.values(avgDurations).filter(v => v > 0);
    const avgPhaseDays = durationValues.length > 0
      ? durationValues.reduce((s, v) => s + v, 0) / durationValues.length
      : 0;

    // Calculate velocity trend (last 4 weeks vs previous 4 weeks)
    let velocityTrend = 0;
    if (weeklyThroughput.length >= 8) {
      const recent = weeklyThroughput.slice(4, 8).reduce((s, v) => s + v, 0);
      const prior = weeklyThroughput.slice(0, 4).reduce((s, v) => s + v, 0);
      if (prior > 0) {
        velocityTrend = Math.round(((recent - prior) / prior) * 100);
      }
    }

    return {
      metrics: {
        activeProjects: activeCount,
        atRiskProjects: atRiskCount,
        agentUtilizationPercent: Math.round(utilization),
        avgPhaseDurationDays: Math.round(avgPhaseDays * 10) / 10,
        weeklyVelocityTrend: velocityTrend,
      },
      projects: projectSummaries,
      agentPool: poolStatus,
      phaseDurations: avgDurations as unknown as Record<string, number>,
      weeklyThroughput,
    };
  }

  // --- Private ---

  private async tryAllocateNextPhase(project: ScheduledProject): Promise<boolean> {
    const nextPhase = project.getNextReadyPhase();
    if (!nextPhase) return false;

    const agentType = PHASE_AGENT_MAP[nextPhase];
    const agentId = this.agentPool.getAvailableAgent(agentType);

    if (agentId) {
      return await this.allocateAgentWithLock(project, nextPhase, agentId, agentType);
    }
    return false;
  }

  /**
   * Allocate agent with distributed locking to prevent race conditions
   */
  private async allocateAgentWithLock(
    project: ScheduledProject,
    phase: SDLCPhase,
    agentId: string,
    agentType: string
  ): Promise<boolean> {
    // If no lock manager, proceed without locking (backward compatibility)
    if (!this.lockManager) {
      this.logger?.warn('No lock manager configured - proceeding without locking', {
        projectId: project.id,
        phase,
        agentId,
      });
      return await this.performAllocation(project, phase, agentId);
    }

    // Build lock key for this agent
    const lockKey = `agent:${agentId}`;
    const holderId = `project:${project.id}:${phase}`;

    try {
      // Acquire lock with short TTL (agent allocation is fast)
      const lockResult = await this.lockManager.acquire(lockKey, holderId);

      if (!lockResult.isAcquired()) {
        this.logger?.warn('Failed to acquire lock for agent allocation', {
          projectId: project.id,
          phase,
          agentId,
          lockStatus: lockResult,
        });
        return false;
      }

      this.logger?.debug('Lock acquired for agent allocation', {
        projectId: project.id,
        phase,
        agentId,
        lockId: lockResult.lockId,
      });

      try {
        // Perform allocation within lock
        const success = await this.performAllocation(project, phase, agentId);
        return success;
      } finally {
        // Always release lock
        await this.lockManager.release(lockResult);
      }
    } catch (error) {
      this.logger?.error('Agent allocation with lock failed', {
        projectId: project.id,
        phase,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Perform the actual agent allocation (called within lock)
   */
  private async performAllocation(
    project: ScheduledProject,
    phase: SDLCPhase,
    agentId: string
  ): Promise<boolean> {
    try {
      // Double-check agent is still available (another scheduler might have grabbed it)
      const currentAgent = this.agentPool.getAvailableAgent(PHASE_AGENT_MAP[phase]);
      if (currentAgent !== agentId) {
        this.logger?.warn('Agent no longer available', {
          projectId: project.id,
          phase,
          requestedAgentId: agentId,
          currentAgentId: currentAgent,
        });
        return false;
      }

      // Allocate agent
      project.startPhase(phase, agentId);
      this.agentPool.markBusy(agentId, project.id, phase);

      if (project.status === ProjectStatus.SCHEDULED) {
        project.start();
      }

      await this.projectRepo.update(project);

      this.logger?.info('Agent allocated successfully', {
        projectId: project.id,
        phase,
        agentId,
      });

      return true;
    } catch (error) {
      this.logger?.error('Agent allocation failed', {
        projectId: project.id,
        phase,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private async requireProject(id: string): Promise<ScheduledProject> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new ProjectNotFoundError(id);
    return project;
  }
}
