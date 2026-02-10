/**
 * ScheduledProject Entity Tests
 *
 * Tests for the multi-project SDLC domain entity including
 * lifecycle management, phase progression, and delivery health.
 */

import {
  ScheduledProject,
  SDLCPhase,
  PhaseStatus,
  ProjectStatus,
  ProjectPriority,
  SDLC_PHASE_ORDER,
  PHASE_AGENT_MAP,
} from '../../../src/platform/scheduling/domain/entities/ScheduledProject';

function createTestProject(overrides: Record<string, any> = {}): ScheduledProject {
  return new ScheduledProject({
    name: 'Test Project',
    description: 'A test SDLC project',
    deliveryDate: new Date('2026-03-15'),
    priority: ProjectPriority.NORMAL,
    createdBy: 'test-user',
    ...overrides,
  });
}

describe('ScheduledProject', () => {
  // --- Construction ---

  describe('construction', () => {
    it('should create a project with 7 SDLC phases in DRAFT status', () => {
      const project = createTestProject();

      expect(project.name).toBe('Test Project');
      expect(project.status).toBe(ProjectStatus.DRAFT);
      expect(project.phases).toHaveLength(7);
      expect(project.phases.map(p => p.phase)).toEqual(SDLC_PHASE_ORDER);
      expect(project.phases.every(p => p.status === PhaseStatus.PENDING)).toBe(true);
    });

    it('should assign a UUID if no id provided', () => {
      const project = createTestProject();
      expect(project.id).toBeDefined();
      expect(project.id.length).toBeGreaterThan(0);
    });

    it('should use provided id when given', () => {
      const project = createTestProject({ id: 'custom-id-123' });
      expect(project.id).toBe('custom-id-123');
    });

    it('should default priority to NORMAL', () => {
      const project = new ScheduledProject({
        name: 'Minimal',
        deliveryDate: new Date('2026-04-01'),
        createdBy: 'test',
      });
      expect(project.priority).toBe(ProjectPriority.NORMAL);
    });

    it('should throw on empty name', () => {
      expect(() => createTestProject({ name: '' })).toThrow('Project name is required');
    });

    it('should throw on name exceeding 200 characters', () => {
      expect(() => createTestProject({ name: 'x'.repeat(201) })).toThrow(
        'Project name must be 200 characters or less',
      );
    });

    it('should throw on missing delivery date', () => {
      expect(() => new ScheduledProject({
        name: 'No Date',
        deliveryDate: null as any,
        createdBy: 'test',
      })).toThrow('Delivery date is required');
    });
  });

  // --- Lifecycle ---

  describe('lifecycle transitions', () => {
    it('should transition from DRAFT to SCHEDULED', () => {
      const project = createTestProject();
      project.schedule();
      expect(project.status).toBe(ProjectStatus.SCHEDULED);
    });

    it('should transition from SCHEDULED to IN_PROGRESS', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      expect(project.status).toBe(ProjectStatus.IN_PROGRESS);
    });

    it('should throw when scheduling a non-DRAFT project', () => {
      const project = createTestProject();
      project.schedule();
      expect(() => project.schedule()).toThrow('Cannot schedule project in status: scheduled');
    });

    it('should throw when starting a non-SCHEDULED project', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      expect(() => project.start()).toThrow('Cannot start project in status: in_progress');
    });

    it('should cancel a project and skip in-progress phases', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');
      project.cancel();

      expect(project.status).toBe(ProjectStatus.CANCELLED);
      expect(project.completedAt).not.toBeNull();
      const reqPhase = project.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
      expect(reqPhase?.status).toBe(PhaseStatus.SKIPPED);
    });

    it('should throw when cancelling a completed project', () => {
      const project = createTestProject();
      project.schedule();
      project.start();

      // Complete all 7 phases
      for (const phase of SDLC_PHASE_ORDER) {
        project.startPhase(phase, `agent-${phase}`);
        project.completePhase(phase);
      }

      expect(project.status).toBe(ProjectStatus.COMPLETED);
      expect(() => project.cancel()).toThrow('Cannot cancel a completed project');
    });
  });

  // --- Phase Management ---

  describe('phase management', () => {
    it('should start the first phase', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');

      const reqPhase = project.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
      expect(reqPhase?.status).toBe(PhaseStatus.IN_PROGRESS);
      expect(reqPhase?.assignedAgentId).toBe('ba-agent-1');
      expect(reqPhase?.startedAt).not.toBeNull();
    });

    it('should not allow starting a phase if previous phase is not completed', () => {
      const project = createTestProject();
      project.schedule();
      project.start();

      expect(() => project.startPhase(SDLCPhase.ARCHITECTURE, 'arch-agent-1')).toThrow(
        'Previous phase requirements must be completed before starting architecture',
      );
    });

    it('should complete a phase and record duration', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');

      project.completePhase(SDLCPhase.REQUIREMENTS, [
        { name: 'requirements.md', path: '/docs/req.md', type: 'document' },
      ], 'Phase completed successfully');

      const reqPhase = project.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
      expect(reqPhase?.status).toBe(PhaseStatus.COMPLETED);
      expect(reqPhase?.completedAt).not.toBeNull();
      expect(reqPhase?.outputArtifacts).toHaveLength(1);
      expect(reqPhase?.notes).toBe('Phase completed successfully');
      expect(reqPhase?.durationMinutes).not.toBeNull();
      expect(reqPhase?.assignedAgentId).toBeNull(); // agent released
    });

    it('should fail a phase and set project to FAILED', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');
      project.failPhase(SDLCPhase.REQUIREMENTS, 'Missing stakeholder input');

      const reqPhase = project.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
      expect(reqPhase?.status).toBe(PhaseStatus.FAILED);
      expect(reqPhase?.notes).toContain('Failed: Missing stakeholder input');
      expect(project.status).toBe(ProjectStatus.FAILED);
    });

    it('should complete project when all phases are done', () => {
      const project = createTestProject();
      project.schedule();
      project.start();

      for (const phase of SDLC_PHASE_ORDER) {
        project.startPhase(phase, `agent-${phase}`);
        project.completePhase(phase);
      }

      expect(project.status).toBe(ProjectStatus.COMPLETED);
      expect(project.completedAt).not.toBeNull();
      expect(project.progressPercent).toBe(100);
    });

    it('should block a project', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');
      project.block('Waiting for stakeholder approval');

      expect(project.status).toBe(ProjectStatus.BLOCKED);
      const reqPhase = project.phases.find(p => p.phase === SDLCPhase.REQUIREMENTS);
      expect(reqPhase?.status).toBe(PhaseStatus.BLOCKED);
    });
  });

  // --- Query Methods ---

  describe('query methods', () => {
    it('should return the next ready phase', () => {
      const project = createTestProject();
      expect(project.getNextReadyPhase()).toBe(SDLCPhase.REQUIREMENTS);

      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');

      // While in-progress, next is null (previous not done yet)
      expect(project.getNextReadyPhase()).toBeNull();

      project.completePhase(SDLCPhase.REQUIREMENTS);
      expect(project.getNextReadyPhase()).toBe(SDLCPhase.ARCHITECTURE);
    });

    it('should return null when all phases are done', () => {
      const project = createTestProject();
      project.schedule();
      project.start();

      for (const phase of SDLC_PHASE_ORDER) {
        project.startPhase(phase, `agent-${phase}`);
        project.completePhase(phase);
      }

      expect(project.getNextReadyPhase()).toBeNull();
    });

    it('should return the correct agent type for next phase', () => {
      const project = createTestProject();
      expect(project.getNextRequiredAgentType()).toBe('ba_agent');

      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-agent-1');
      project.completePhase(SDLCPhase.REQUIREMENTS);

      expect(project.getNextRequiredAgentType()).toBe('architect_agent');
    });

    it('should calculate progress percentage correctly', () => {
      const project = createTestProject();
      expect(project.progressPercent).toBe(0);

      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-1');
      project.completePhase(SDLCPhase.REQUIREMENTS);
      expect(project.progressPercent).toBe(14); // 1/7 = ~14%

      project.startPhase(SDLCPhase.ARCHITECTURE, 'arch-1');
      project.completePhase(SDLCPhase.ARCHITECTURE);
      expect(project.progressPercent).toBe(29); // 2/7 = ~29%
    });

    it('should report currentPhase correctly', () => {
      const project = createTestProject();
      expect(project.currentPhase).toBe(SDLCPhase.REQUIREMENTS); // first pending

      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-1');
      expect(project.currentPhase).toBe(SDLCPhase.REQUIREMENTS); // in progress

      project.completePhase(SDLCPhase.REQUIREMENTS);
      expect(project.currentPhase).toBe(SDLCPhase.ARCHITECTURE); // next pending
    });
  });

  // --- Delivery Health ---

  describe('delivery health', () => {
    const avgDurations: Record<SDLCPhase, number> = {
      [SDLCPhase.REQUIREMENTS]: 1,
      [SDLCPhase.ARCHITECTURE]: 2,
      [SDLCPhase.DEVELOPMENT]: 4,
      [SDLCPhase.SECURITY]: 1,
      [SDLCPhase.TESTING]: 2,
      [SDLCPhase.DEPLOYMENT]: 0.5,
      [SDLCPhase.ACCEPTANCE]: 1,
    };

    it('should be on_track when ample time remains', () => {
      const project = createTestProject({
        deliveryDate: new Date(Date.now() + 60 * 86400000), // 60 days from now
      });
      project.schedule();
      project.start();

      expect(project.calculateDeliveryHealth(avgDurations)).toBe('on_track');
    });

    it('should be at_risk when estimated completion is near deadline', () => {
      // Total remaining = 11.5 days, deadline in 12 days
      const project = createTestProject({
        deliveryDate: new Date(Date.now() + 12 * 86400000),
      });
      project.schedule();
      project.start();

      const health = project.calculateDeliveryHealth(avgDurations);
      expect(['on_track', 'at_risk']).toContain(health);
    });

    it('should be behind when estimated completion exceeds deadline + buffer', () => {
      // Total remaining = 11.5 days, deadline in 5 days
      const project = createTestProject({
        deliveryDate: new Date(Date.now() + 5 * 86400000),
      });
      project.schedule();
      project.start();

      expect(project.calculateDeliveryHealth(avgDurations)).toBe('behind');
    });

    it('should be completed for completed projects', () => {
      const project = createTestProject();
      project.schedule();
      project.start();

      for (const phase of SDLC_PHASE_ORDER) {
        project.startPhase(phase, `agent-${phase}`);
        project.completePhase(phase);
      }

      expect(project.calculateDeliveryHealth(avgDurations)).toBe('completed');
    });
  });

  // --- Allocation Score ---

  describe('allocation score', () => {
    it('should give higher score to CRITICAL projects', () => {
      const critical = createTestProject({
        priority: ProjectPriority.CRITICAL,
        deliveryDate: new Date(Date.now() + 30 * 86400000),
      });
      const low = createTestProject({
        priority: ProjectPriority.LOW,
        deliveryDate: new Date(Date.now() + 30 * 86400000),
      });

      expect(critical.computeAllocationScore()).toBeGreaterThan(low.computeAllocationScore());
    });

    it('should give higher score to projects with closer deadlines', () => {
      const urgent = createTestProject({
        priority: ProjectPriority.NORMAL,
        deliveryDate: new Date(Date.now() + 3 * 86400000),
      });
      const distant = createTestProject({
        priority: ProjectPriority.NORMAL,
        deliveryDate: new Date(Date.now() + 60 * 86400000),
      });

      expect(urgent.computeAllocationScore()).toBeGreaterThan(distant.computeAllocationScore());
    });
  });

  // --- Serialization ---

  describe('serialization', () => {
    it('should serialize to JSON with all fields', () => {
      const project = createTestProject();
      const json = project.toJSON();

      expect(json.id).toBe(project.id);
      expect(json.name).toBe('Test Project');
      expect(json.status).toBe('draft');
      expect(json.priority).toBe('NORMAL');
      expect(json.progressPercent).toBe(0);
      expect(json.phases).toHaveLength(7);
      expect(json.createdAt).toBeDefined();
    });

    it('should serialize phase dates as ISO strings', () => {
      const project = createTestProject();
      project.schedule();
      project.start();
      project.startPhase(SDLCPhase.REQUIREMENTS, 'ba-1');

      const json = project.toJSON();
      const reqPhase = (json.phases as any[]).find((p: any) => p.phase === 'requirements');

      expect(reqPhase.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(reqPhase.completedAt).toBeNull();
    });
  });

  // --- PHASE_AGENT_MAP ---

  describe('PHASE_AGENT_MAP', () => {
    it('should map all 7 phases to agent types', () => {
      expect(Object.keys(PHASE_AGENT_MAP)).toHaveLength(7);
      expect(PHASE_AGENT_MAP[SDLCPhase.REQUIREMENTS]).toBe('ba_agent');
      expect(PHASE_AGENT_MAP[SDLCPhase.ARCHITECTURE]).toBe('architect_agent');
      expect(PHASE_AGENT_MAP[SDLCPhase.DEVELOPMENT]).toBe('developer_agent');
      expect(PHASE_AGENT_MAP[SDLCPhase.SECURITY]).toBe('security_agent');
      expect(PHASE_AGENT_MAP[SDLCPhase.TESTING]).toBe('qa_agent');
      expect(PHASE_AGENT_MAP[SDLCPhase.DEPLOYMENT]).toBe('sre_agent');
      expect(PHASE_AGENT_MAP[SDLCPhase.ACCEPTANCE]).toBe('conductor_agent');
    });
  });
});
