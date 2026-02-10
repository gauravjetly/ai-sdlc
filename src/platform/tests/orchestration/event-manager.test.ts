/**
 * Event Manager Tests
 */

import { EventManager } from '../../orchestration/engine/event-manager';
import { PlatformEvent } from '../../orchestration/types/orchestration-types';

describe('EventManager', () => {
  let eventManager: EventManager;

  beforeEach(() => {
    eventManager = new EventManager();
  });

  afterEach(() => {
    eventManager.removeAllListeners();
  });

  describe('Event Handler Registration', () => {
    it('should register event handler', () => {
      const handler = jest.fn(async () => {});

      eventManager.registerHandler('test.event', handler);

      expect(eventManager.listEventTypes()).toContain('test.event');
      expect(eventManager.getHandlerCount('test.event')).toBe(1);
    });

    it('should register multiple handlers for same event', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});

      eventManager.registerHandler('test.event', handler1);
      eventManager.registerHandler('test.event', handler2);

      expect(eventManager.getHandlerCount('test.event')).toBe(2);
    });

    it('should unregister event handler', () => {
      const handler = jest.fn(async () => {});

      eventManager.registerHandler('test.event', handler);
      expect(eventManager.getHandlerCount('test.event')).toBe(1);

      eventManager.unregisterHandler('test.event', handler);
      expect(eventManager.getHandlerCount('test.event')).toBe(0);
    });

    it('should unregister all handlers for event type', () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});

      eventManager.registerHandler('test.event', handler1);
      eventManager.registerHandler('test.event', handler2);
      expect(eventManager.getHandlerCount('test.event')).toBe(2);

      eventManager.unregisterAllHandlers('test.event');
      expect(eventManager.getHandlerCount('test.event')).toBe(0);
    });
  });

  describe('Event Publishing', () => {
    it('should publish event and trigger handler', async () => {
      const handler = jest.fn(async (event: PlatformEvent) => {
        expect(event.type).toBe('test.event');
        expect(event.data).toEqual({ message: 'test' });
      });

      eventManager.registerHandler('test.event', handler);

      await eventManager.publishEvent({
        type: 'test.event',
        timestamp: new Date(),
        data: { message: 'test' }
      });

      // Give async handlers time to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalled();
    });

    it('should trigger multiple handlers for same event', async () => {
      const handler1 = jest.fn(async () => {});
      const handler2 = jest.fn(async () => {});

      eventManager.registerHandler('test.event', handler1);
      eventManager.registerHandler('test.event', handler2);

      await eventManager.publishEvent({
        type: 'test.event',
        timestamp: new Date(),
        data: {}
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should publish event synchronously and wait for handlers', async () => {
      const executionOrder: number[] = [];

      const handler1 = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(1);
      });

      const handler2 = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        executionOrder.push(2);
      });

      eventManager.registerHandler('test.event', handler1);
      eventManager.registerHandler('test.event', handler2);

      await eventManager.publishEventSync({
        type: 'test.event',
        timestamp: new Date(),
        data: {}
      });

      expect(executionOrder.length).toBe(2);
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle errors in event handlers gracefully', async () => {
      const failingHandler = jest.fn(async () => {
        throw new Error('Handler failed');
      });

      const successHandler = jest.fn(async () => {});

      eventManager.registerHandler('test.event', failingHandler);
      eventManager.registerHandler('test.event', successHandler);

      // Should not throw
      await expect(
        eventManager.publishEvent({
          type: 'test.event',
          timestamp: new Date(),
          data: {}
        })
      ).resolves.not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('Event History', () => {
    it('should record published events', async () => {
      await eventManager.publishEvent({
        type: 'test.event',
        timestamp: new Date(),
        data: { message: 'test' }
      });

      const history = eventManager.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('test.event');
    });

    it('should filter history by event type', async () => {
      await eventManager.publishEvent({
        type: 'event.type1',
        timestamp: new Date(),
        data: {}
      });

      await eventManager.publishEvent({
        type: 'event.type2',
        timestamp: new Date(),
        data: {}
      });

      const history = eventManager.getEventHistory('event.type1');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('event.type1');
    });

    it('should limit history results', async () => {
      for (let i = 0; i < 10; i++) {
        await eventManager.publishEvent({
          type: 'test.event',
          timestamp: new Date(),
          data: { index: i }
        });
      }

      const history = eventManager.getEventHistory(undefined, 5);
      expect(history).toHaveLength(5);
    });

    it('should clear event history', async () => {
      await eventManager.publishEvent({
        type: 'test.event',
        timestamp: new Date(),
        data: {}
      });

      let history = eventManager.getEventHistory();
      expect(history.length).toBeGreaterThan(0);

      eventManager.clearHistory();

      history = eventManager.getEventHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Pre-defined Events', () => {
    it('should publish deployment complete event', async () => {
      const handler = jest.fn(async (event: PlatformEvent) => {
        expect(event.type).toBe('deployment.complete');
        expect(event.data.deploymentId).toBe('deploy-123');
      });

      eventManager.registerHandler('deployment.complete', handler);

      await eventManager.deploymentComplete('deploy-123', { environment: 'prod' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalled();
    });

    it('should publish alert fired event', async () => {
      const handler = jest.fn(async (event: PlatformEvent) => {
        expect(event.type).toBe('alert.fired');
        expect(event.data.severity).toBe('critical');
      });

      eventManager.registerHandler('alert.fired', handler);

      await eventManager.alertFired('alert-123', 'critical', 'System down');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalled();
    });

    it('should publish test failed event', async () => {
      const handler = jest.fn(async (event: PlatformEvent) => {
        expect(event.type).toBe('test.failed');
        expect(event.data.testId).toBe('test-123');
      });

      eventManager.registerHandler('test.failed', handler);

      await eventManager.testFailed('test-123', 'Assertion failed');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalled();
    });
  });
});
