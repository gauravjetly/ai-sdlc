/**
 * Unit Tests for WorkTrigger Entity
 */

import { WorkTrigger } from '../../../src/platform/scheduling/domain/entities/WorkTrigger';

function createTestTrigger(overrides: Partial<any> = {}): WorkTrigger {
  return new WorkTrigger({
    name: 'Test Trigger',
    description: 'Test trigger description',
    eventType: 'deployment.completed',
    conditions: [
      {
        operator: 'AND' as const,
        conditions: [
          { field: 'environment', operator: 'eq' as const, value: 'production' },
        ],
      },
    ],
    actions: [
      {
        name: 'Create Monitoring',
        agentType: 'sre_agent',
        taskType: 'setup_monitoring',
        parameters: {},
      },
    ],
    createdBy: 'test-user',
    ...overrides,
  });
}

describe('WorkTrigger', () => {
  describe('Construction', () => {
    it('should create a valid trigger', () => {
      const trigger = createTestTrigger();
      expect(trigger.id).toBeDefined();
      expect(trigger.name).toBe('Test Trigger');
      expect(trigger.eventType).toBe('deployment.completed');
      expect(trigger.enabled).toBe(true);
      expect(trigger.fireCount).toBe(0);
    });

    it('should throw if name is empty', () => {
      expect(() => createTestTrigger({ name: '' })).toThrow('Trigger name is required');
    });

    it('should throw if event type is empty', () => {
      expect(() => createTestTrigger({ eventType: '' })).toThrow('Event type is required');
    });

    it('should throw if no actions', () => {
      expect(() => createTestTrigger({ actions: [] })).toThrow('At least one action is required');
    });

    it('should throw if more than 20 actions', () => {
      const actions = Array.from({ length: 21 }, (_, i) => ({
        name: `Action ${i}`,
        agentType: 'developer_agent',
        taskType: 'task',
        parameters: {},
      }));
      expect(() => createTestTrigger({ actions })).toThrow('Maximum 20 actions per trigger');
    });
  });

  describe('Enable/Disable', () => {
    it('should enable a disabled trigger', () => {
      const trigger = createTestTrigger({ enabled: false });
      expect(trigger.enabled).toBe(false);
      trigger.enable();
      expect(trigger.enabled).toBe(true);
    });

    it('should disable an enabled trigger', () => {
      const trigger = createTestTrigger();
      trigger.disable();
      expect(trigger.enabled).toBe(false);
    });
  });

  describe('Condition Evaluation', () => {
    it('should match when conditions are met (eq operator)', () => {
      const trigger = createTestTrigger();
      const result = trigger.evaluate({ environment: 'production' });
      expect(result).toBe(true);
    });

    it('should not match when conditions are not met', () => {
      const trigger = createTestTrigger();
      const result = trigger.evaluate({ environment: 'staging' });
      expect(result).toBe(false);
    });

    it('should match when no conditions (always fire)', () => {
      const trigger = createTestTrigger({ conditions: [] });
      const result = trigger.evaluate({});
      expect(result).toBe(true);
    });

    it('should not evaluate disabled triggers', () => {
      const trigger = createTestTrigger({ enabled: false });
      const result = trigger.evaluate({ environment: 'production' });
      expect(result).toBe(false);
    });

    it('should support neq operator', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'environment', operator: 'neq', value: 'staging' },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ environment: 'production' })).toBe(true);
      expect(trigger.evaluate({ environment: 'staging' })).toBe(false);
    });

    it('should support contains operator', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'name', operator: 'contains', value: 'auth' },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ name: 'auth-service' })).toBe(true);
      expect(trigger.evaluate({ name: 'payment-service' })).toBe(false);
    });

    it('should support gt and lt operators', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'replicas', operator: 'gt', value: 3 },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ replicas: 5 })).toBe(true);
      expect(trigger.evaluate({ replicas: 2 })).toBe(false);
    });

    it('should support in operator', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'environment', operator: 'in', value: ['production', 'staging'] },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ environment: 'production' })).toBe(true);
      expect(trigger.evaluate({ environment: 'dev' })).toBe(false);
    });

    it('should support nested field paths', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'data.deployment.env', operator: 'eq', value: 'production' },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ data: { deployment: { env: 'production' } } })).toBe(true);
      expect(trigger.evaluate({ data: { deployment: { env: 'staging' } } })).toBe(false);
    });

    it('should handle OR condition groups', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'environment', operator: 'eq', value: 'production' },
              { field: 'environment', operator: 'eq', value: 'staging' },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ environment: 'production' })).toBe(true);
      expect(trigger.evaluate({ environment: 'staging' })).toBe(true);
      expect(trigger.evaluate({ environment: 'dev' })).toBe(false);
    });

    it('should handle multiple AND conditions', () => {
      const trigger = createTestTrigger({
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'environment', operator: 'eq', value: 'production' },
              { field: 'status', operator: 'eq', value: 'success' },
            ],
          },
        ],
      });
      expect(trigger.evaluate({ environment: 'production', status: 'success' })).toBe(true);
      expect(trigger.evaluate({ environment: 'production', status: 'failed' })).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should be within rate limit initially', () => {
      const trigger = createTestTrigger();
      expect(trigger.isWithinRateLimit()).toBe(true);
    });

    it('should track fire count', () => {
      const trigger = createTestTrigger();
      trigger.recordFire();
      trigger.recordFire();
      expect(trigger.fireCount).toBe(2);
      expect(trigger.lastFiredAt).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields', () => {
      const trigger = createTestTrigger();
      const json = trigger.toJSON();

      expect(json.id).toBeDefined();
      expect(json.name).toBe('Test Trigger');
      expect(json.eventType).toBe('deployment.completed');
      expect(json.enabled).toBe(true);
      expect(json.fireCount).toBe(0);
      expect(json.actions).toHaveLength(1);
    });
  });
});
