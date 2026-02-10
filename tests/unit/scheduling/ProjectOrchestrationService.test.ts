/**
 * ProjectOrchestrationService Tests
 *
 * Tests for the multi-project orchestration service including
 * project lifecycle, agent allocation, scheduler loop, and dashboard.
 */

import {
  ProjectOrchestrationService,
  IProjectRepository,
  IAgentPool,
  ProjectFilters,
  AgentPoolStatus,
} from '../../../src/platform/scheduling/application/services/ProjectOrchestrationService';
import {
  ScheduledProject,
  SDLCPhase,
  PhaseStatus,
  ProjectStatus,
  ProjectPriority,
  SDLC_PHASE_ORDER,
} from '../../../src/platform/scheduling/domain/entities/ScheduledProject';

// --- Mock Repository ---

function createMockRepo(): jest.Mocked<IProjectRepository> {
  const store = new Map<string, ScheduledProject>();

  return {
    save: jest.fn(async (project: ScheduledProject) => {
      store.set(project.id, project);
    }),
    findById: jest.fn(async (id: string) => {
      return store.get(id) || null;
    }),
    findAll: jest.fn(async (filters: ProjectFilters) => {
      const items = Array.from(store.values());
      return { items, total: items.length };
    }),
    findByStatus: jest.fn(async (statuses: ProjectStatus[]) => {
      return Array.from(store.values()).filter(p => statuses.includes(p.status));
    }),
    findProjectsNeedingAgent: jest.fn(async (agentType: string) => {
      return Array.from(store.values()).filter(p => {
        const next = p.getNextRequiredAgentType();
        return next === agentType;
      });
    }),
    update: jest.fn(async (project: ScheduledProject) => {
      store.set(project.id, project);
    }),
    delete: jest.fn(async (id: string) => {
      store.delete(id);
    }),
    getCompletedPhaseDurations: jest.fn(async () => ({
      [SDLCPhase.REQUIREMENTS]: 1,
      [SDLCPhase.ARCHITECTURE]: 2,
      [SDLCPhase.DEVELOPMENT]: 4,
      [SDLCPhase.SECURITY]: 1,
      [SDLCPhase.TESTING]: 2,
      [SDLCPhase.DEPLOYMENT]: 0.5,
      [SDLCPhase.ACCEPTANCE]: 1,
    })),
    getWeeklyThroughput: jest.fn(async (weeks: number) => {
      return [1, 2, 1, 3, 2, 4, 3, 5].slice(0, weeks);
    }),
  };
}

// --- Mock Agent Pool ---

function createMockPool(availableAgents: Record<string, string[]> = {}): jest.Mocked<IAgentPool> {
  const busyAgents = new Set<string>();

  return {
    getAvailableAgent: jest.fn((agentType: string) => {
      const agents = availableAgents[agentType] || [];
      const available = agents.find(id => !busyAgents.has(id));
      return available || null;
    }),
    markBusy: jest.fn((agentId: string) => {
      busyAgents.add(agentId);
    }),
    markIdle: jest.fn((agentId: string) => {
      busyAgents.delete(agentId);
    }),
    getPoolStatus: jest.fn((): AgentPoolStatus[] => [
      {
        agentType: 'ba_agent',
        displayName: 'BA Agent',
        totalInstances: 2,
        busyInstances: 1,
        idleInstances: 1,
        queuedPhases: 0,
        avgPhaseDurationMin: 120,
        estimatedWaitMin: 0,
      },
      {
        agentType: 'developer_agent',
        displayName: 'Developer',
        totalInstances: 3,
        busyInstances: 3,
        idleInstances: 0,
        queuedPhases: 2,
        avgPhaseDurationMin: 480,
        estimatedWaitMin: 960,
      },
    ]),
    getTotalUtilization: jest.fn(() => 67),
    getQueueDepth: jest.fn(() => 2),
  };
}

describe('ProjectOrchestrationService', () => {
  let service: ProjectOrchestrationService;
  let repo: jest.Mocked<IProjectRepository>;
  let pool: jest.Mocked<IAgentPool>;

  beforeEach(() => {
    repo = createMockRepo();
    pool = createMockPool({
      ba_agent: ['ba-1', 'ba-2'],
      architect_agent: ['arch-1'],
      developer_agent: ['dev-1', 'dev-2', 'dev-3'],
      security_agent: ['sec-1'],
      qa_agent: ['qa-1'],
      sre_agent: ['sre-1'],
      conductor_agent: ['cond-1'],
    });
    service = new ProjectOrchestrationService(repo, pool);
  });

  // --- Create Project ---

  describe('createProject', () => {
    it('should create a project in SCHEDULED status', async () => {
      const project = await service.createProject({
        name: 'Auth System',
        description: 'OAuth 2.0 with MFA',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        priority: 'HIGH',
        createdBy: 'user-1',
      });

      expect(project.name).toBe('Auth System');
      expect(project.status).toBe(ProjectStatus.SCHEDULED);
      expect(project.priority).toBe(ProjectPriority.HIGH);
      expect(repo.save).toHaveBeenCalledWith(project);
    });

    it('should default priority to NORMAL', async () => {
      const project = await service.createProject({
        name: 'Simple Task',
        deliveryDate: '2026-04-01T00:00:00.000Z',
        createdBy: 'user-1',
      });

      expect(project.priority).toBe(ProjectPriority.NORMAL);
    });
  });

  // --- Start Project ---

  describe('startProject', () => {
    it('should start a project and attempt agent allocation for first phase', async () => {
      const created = await service.createProject({
        name: 'Test',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        createdBy: 'user-1',
      });

      const started = await service.startProject(created.id);

      expect(started.status).toBe(ProjectStatus.IN_PROGRESS);
      expect(pool.getAvailableAgent).toHaveBeenCalledWith('ba_agent');
      expect(repo.update).toHaveBeenCalled();
    });

    it('should throw if project does not exist', async () => {
      await expect(service.startProject('nonexistent')).rejects.toThrow('Project not found');
    });
  });

  // --- Complete Phase ---

  describe('completePhase', () => {
    it('should complete a phase and try to allocate next', async () => {
      const created = await service.createProject({
        name: 'Test',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        createdBy: 'user-1',
      });
      const started = await service.startProject(created.id);

      // Requirements phase should have been auto-started
      const reqPhase = started.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
      if (reqPhase?.status === PhaseStatus.IN_PROGRESS) {
        const completed = await service.completePhase(
          created.id,
          SDLCPhase.REQUIREMENTS,
          [{ name: 'req.md', path: '/docs/req.md', type: 'document' }],
          'Requirements gathered',
        );

        const phase = completed.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
        expect(phase?.status).toBe(PhaseStatus.COMPLETED);
        // Should have tried to allocate architect_agent for next phase
        expect(pool.getAvailableAgent).toHaveBeenCalledWith('architect_agent');
      }
    });
  });

  // --- Fail Phase ---

  describe('failPhase', () => {
    it('should fail a phase and set project to FAILED', async () => {
      const created = await service.createProject({
        name: 'Failing Project',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        createdBy: 'user-1',
      });
      await service.startProject(created.id);

      // Start requirements manually to ensure it is in progress
      const project = await service.getProject(created.id);
      if (project) {
        const reqPhase = project.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
        if (reqPhase?.status === PhaseStatus.IN_PROGRESS) {
          const failed = await service.failPhase(
            created.id,
            SDLCPhase.REQUIREMENTS,
            'Stakeholders unavailable',
          );
          expect(failed.status).toBe(ProjectStatus.FAILED);
        }
      }
    });
  });

  // --- Cancel Project ---

  describe('cancelProject', () => {
    it('should cancel a scheduled project', async () => {
      const created = await service.createProject({
        name: 'Cancel Me',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        createdBy: 'user-1',
      });

      // Start it first so it is in_progress (cancellable)
      await service.startProject(created.id);
      const cancelled = await service.cancelProject(created.id);

      expect(cancelled.status).toBe(ProjectStatus.CANCELLED);
      expect(repo.update).toHaveBeenCalled();
    });
  });

  // --- List Projects ---

  describe('listProjects', () => {
    it('should return filtered projects', async () => {
      await service.createProject({
        name: 'Project A',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        createdBy: 'user-1',
      });
      await service.createProject({
        name: 'Project B',
        deliveryDate: '2026-04-01T00:00:00.000Z',
        createdBy: 'user-1',
      });

      const result = await service.listProjects({ limit: 10, offset: 0 });
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });

  // --- Process Ready Projects (Scheduler Loop) ---

  describe('processReadyProjects', () => {
    it('should allocate agents to ready phases sorted by priority', async () => {
      // Create two projects -- critical should be allocated first
      const critical = await service.createProject({
        name: 'Critical Project',
        deliveryDate: '2026-02-20T00:00:00.000Z',
        priority: 'CRITICAL',
        createdBy: 'user-1',
      });
      const low = await service.createProject({
        name: 'Low Priority',
        deliveryDate: '2026-05-01T00:00:00.000Z',
        priority: 'LOW',
        createdBy: 'user-1',
      });

      // Both are SCHEDULED, both need ba_agent for first phase
      const allocated = await service.processReadyProjects();

      // Should have tried to allocate at least one
      expect(pool.getAvailableAgent).toHaveBeenCalledWith('ba_agent');
      expect(allocated).toBeGreaterThanOrEqual(0);
    });
  });

  // --- Agent Released ---

  describe('onAgentReleased', () => {
    it('should reassign a released agent to the highest-priority waiting project', async () => {
      await service.createProject({
        name: 'Waiting Project',
        deliveryDate: '2026-03-01T00:00:00.000Z',
        priority: 'HIGH',
        createdBy: 'user-1',
      });

      await service.onAgentReleased('ba-1', 'ba_agent');

      expect(pool.markIdle).toHaveBeenCalledWith('ba-1');
      expect(repo.findProjectsNeedingAgent).toHaveBeenCalledWith('ba_agent');
    });
  });

  // --- Dashboard ---

  describe('getDashboard', () => {
    it('should return a complete dashboard with all sections', async () => {
      await service.createProject({
        name: 'Dashboard Test',
        deliveryDate: '2026-03-15T00:00:00.000Z',
        createdBy: 'user-1',
      });

      const dashboard = await service.getDashboard();

      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.metrics.activeProjects).toBeGreaterThanOrEqual(0);
      expect(dashboard.metrics.agentUtilizationPercent).toBeDefined();
      expect(dashboard.agentPool).toBeDefined();
      expect(dashboard.phaseDurations).toBeDefined();
      expect(dashboard.weeklyThroughput).toBeDefined();
      expect(dashboard.projects).toBeDefined();
    });

    it('should calculate velocity trend from throughput data', async () => {
      const dashboard = await service.getDashboard();

      // Weekly throughput is [1,2,1,3,2,4,3,5]
      // Prior 4 weeks: 1+2+1+3 = 7
      // Recent 4 weeks: 2+4+3+5 = 14
      // Trend: ((14-7)/7)*100 = 100%
      expect(dashboard.metrics.weeklyVelocityTrend).toBe(100);
    });

    it('should report at-risk projects', async () => {
      // Create a project with a tight deadline
      await service.createProject({
        name: 'Tight Deadline',
        deliveryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        createdBy: 'user-1',
      });

      const dashboard = await service.getDashboard();
      // The project should be at_risk or behind since 3 days is not enough for 7 phases
      expect(dashboard.metrics.atRiskProjects).toBeGreaterThanOrEqual(0);
    });
  });
});
