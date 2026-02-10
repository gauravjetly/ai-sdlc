/**
 * Unit Tests for ScheduledWorkItem Entity
 */

import {
  ScheduledWorkItem,
  WorkType,
  ScheduleType,
  WorkStatus,
  WorkPriority,
} from '../../../src/platform/scheduling/domain/entities/ScheduledWorkItem';
import { AgentAssignment } from '../../../src/platform/scheduling/domain/value-objects/AgentAssignment';

function createTestWorkItem(overrides: Partial<any> = {}): ScheduledWorkItem {
  const defaults = {
    name: 'Test Work Item',
    description: 'Test description',
    workType: WorkType.SINGLE_APP,
    scheduleType: ScheduleType.ONE_TIME,
    scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
    priority: WorkPriority.NORMAL,
    agentAssignments: [
      new AgentAssignment({
        agentType: 'developer_agent',
        role: 'primary',
        parameters: {},
      }),
    ],
    createdBy: 'test-user',
    ...overrides,
  };

  return new ScheduledWorkItem(defaults);
}

describe('ScheduledWorkItem', () => {
  describe('Construction', () => {
    it('should create a valid work item with required fields', () => {
      const workItem = createTestWorkItem();

      expect(workItem.id).toBeDefined();
      expect(workItem.name).toBe('Test Work Item');
      expect(workItem.status).toBe(WorkStatus.SCHEDULED);
      expect(workItem.priority).toBe(WorkPriority.NORMAL);
      expect(workItem.agentAssignments).toHaveLength(1);
    });

    it('should generate a UUID if none provided', () => {
      const workItem = createTestWorkItem();
      expect(workItem.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should use provided ID if given', () => {
      const workItem = createTestWorkItem({ id: 'custom-id' });
      expect(workItem.id).toBe('custom-id');
    });

    it('should throw if name is empty', () => {
      expect(() => createTestWorkItem({ name: '' })).toThrow('Work item name is required');
    });

    it('should throw if name exceeds 200 characters', () => {
      expect(() => createTestWorkItem({ name: 'a'.repeat(201) })).toThrow('Work item name must be 200 characters or less');
    });

    it('should throw if recurring schedule has no cron expression', () => {
      expect(() => createTestWorkItem({
        scheduleType: ScheduleType.RECURRING,
        cronExpression: undefined,
        scheduledAt: undefined,
      })).toThrow('Recurring schedules require a cron expression');
    });

    it('should throw if one-time schedule has no scheduled date', () => {
      expect(() => createTestWorkItem({
        scheduleType: ScheduleType.ONE_TIME,
        scheduledAt: undefined,
      })).toThrow('One-time schedules require a scheduled date/time');
    });

    it('should throw if no agent assignments', () => {
      expect(() => createTestWorkItem({ agentAssignments: [] })).toThrow('At least one agent assignment is required');
    });

    it('should accept recurring schedule with valid cron expression', () => {
      const workItem = createTestWorkItem({
        scheduleType: ScheduleType.RECURRING,
        cronExpression: '0 2 * * *',
        scheduledAt: undefined,
      });
      expect(workItem.cronSchedule).toBeDefined();
      expect(workItem.cronSchedule!.expression).toBe('0 2 * * *');
    });
  });

  describe('Status Transitions', () => {
    it('should start from scheduled status', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      expect(workItem.status).toBe(WorkStatus.RUNNING);
    });

    it('should complete from running status', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      workItem.complete();
      expect(workItem.status).toBe(WorkStatus.COMPLETED);
      expect(workItem.completedAt).toBeDefined();
    });

    it('should fail from running status', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      workItem.fail();
      expect(workItem.status).toBe(WorkStatus.FAILED);
    });

    it('should pause from scheduled status', () => {
      const workItem = createTestWorkItem();
      workItem.pause();
      expect(workItem.status).toBe(WorkStatus.PAUSED);
      expect(workItem.pausedAt).toBeDefined();
    });

    it('should resume from paused status', () => {
      const workItem = createTestWorkItem();
      workItem.pause();
      workItem.resume();
      expect(workItem.status).toBe(WorkStatus.SCHEDULED);
      expect(workItem.pausedAt).toBeNull();
    });

    it('should cancel from scheduled status', () => {
      const workItem = createTestWorkItem();
      workItem.cancel();
      expect(workItem.status).toBe(WorkStatus.CANCELLED);
    });

    it('should not allow starting a completed work item', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      workItem.complete();
      expect(() => workItem.start()).toThrow('Cannot start work item in status: completed');
    });

    it('should not allow cancelling a completed work item', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      workItem.complete();
      expect(() => workItem.cancel()).toThrow('Cannot cancel work item in status: completed');
    });

    it('should allow starting from paused status', () => {
      const workItem = createTestWorkItem();
      workItem.pause();
      workItem.start();
      expect(workItem.status).toBe(WorkStatus.RUNNING);
    });
  });

  describe('getNextRunTime', () => {
    it('should return scheduledAt for one-time schedules', () => {
      const scheduledDate = new Date(Date.now() + 86400000);
      const workItem = createTestWorkItem({ scheduledAt: scheduledDate });
      expect(workItem.getNextRunTime()).toEqual(scheduledDate);
    });

    it('should return null for completed one-time schedules', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      workItem.complete();
      expect(workItem.getNextRunTime()).toBeNull();
    });

    it('should return a future date for recurring schedules', () => {
      const workItem = createTestWorkItem({
        scheduleType: ScheduleType.RECURRING,
        cronExpression: '0 2 * * *',
        scheduledAt: undefined,
      });
      const nextRun = workItem.getNextRunTime();
      expect(nextRun).toBeDefined();
      expect(nextRun!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('isDue', () => {
    it('should return false for future scheduled items', () => {
      const workItem = createTestWorkItem({
        scheduledAt: new Date(Date.now() + 86400000),
      });
      expect(workItem.isDue()).toBe(false);
    });

    it('should return false for non-scheduled items', () => {
      const workItem = createTestWorkItem();
      workItem.start();
      expect(workItem.isDue()).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('should return false when no target date', () => {
      const workItem = createTestWorkItem();
      expect(workItem.isOverdue()).toBe(false);
    });

    it('should return true when past target date and still running', () => {
      const workItem = createTestWorkItem({
        targetCompletionDate: new Date(Date.now() - 86400000), // Yesterday
      });
      expect(workItem.isOverdue()).toBe(true);
    });

    it('should return false for completed items even if past target', () => {
      const workItem = createTestWorkItem({
        targetCompletionDate: new Date(Date.now() - 86400000),
      });
      workItem.start();
      workItem.complete();
      expect(workItem.isOverdue()).toBe(false);
    });
  });

  describe('getPrimaryAgent', () => {
    it('should return the primary agent assignment', () => {
      const workItem = createTestWorkItem();
      const primary = workItem.getPrimaryAgent();
      expect(primary).toBeDefined();
      expect(primary!.role).toBe('primary');
      expect(primary!.agentType).toBe('developer_agent');
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields', () => {
      const workItem = createTestWorkItem();
      const json = workItem.toJSON();

      expect(json.id).toBeDefined();
      expect(json.name).toBe('Test Work Item');
      expect(json.status).toBe('scheduled');
      expect(json.priority).toBe('NORMAL');
      expect(json.agentAssignments).toHaveLength(1);
    });
  });
});
