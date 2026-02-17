/**
 * Phase 3: WebSocket & Event System Tests
 *
 * Tests for the integration event emitter and WebSocket server.
 */

import {
  IntegrationEventEmitter,
  IntegrationEvent,
  getIntegrationEmitter,
  resetIntegrationEmitter,
} from '../websocket/event-emitter';
import {
  IntegrationWebSocketServer,
  WebSocketClient,
} from '../websocket/websocket-server';

/**
 * Create a mock WebSocket client for testing.
 */
function createMockClient(id: string, subscriptions: string[] = []): WebSocketClient & { messages: string[] } {
  const messages: string[] = [];
  let connected = true;

  return {
    id,
    messages,
    subscriptions,
    connectedAt: new Date().toISOString(),
    send(data: string) {
      if (!connected) throw new Error('Not connected');
      messages.push(data);
    },
    isConnected() {
      return connected;
    },
    close() {
      connected = false;
    },
  };
}

describe('Phase 3: Integration Event Emitter', () => {
  let emitter: IntegrationEventEmitter;

  beforeEach(() => {
    emitter = new IntegrationEventEmitter();
  });

  describe('emit', () => {
    it('should emit events with type and data', () => {
      const events: IntegrationEvent[] = [];
      emitter.on('classification', (event) => events.push(event));

      emitter.emit('classification', {
        type: 'code-change',
        complexity: 'medium',
        confidence: 0.88,
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('classification');
      expect(events[0].data.type).toBe('code-change');
      expect(events[0].sequence).toBe(1);
    });

    it('should assign incrementing sequence numbers', () => {
      const events: IntegrationEvent[] = [];
      emitter.onAll((event) => events.push(event));

      emitter.emit('classification', { id: '1' });
      emitter.emit('routing', { id: '2' });
      emitter.emit('governance_decision', { id: '3' });

      expect(events[0].sequence).toBe(1);
      expect(events[1].sequence).toBe(2);
      expect(events[2].sequence).toBe(3);
    });

    it('should include ISO timestamp', () => {
      const events: IntegrationEvent[] = [];
      emitter.onAll((event) => events.push(event));

      emitter.emit('classification', {});

      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('on (type-specific listeners)', () => {
    it('should only fire for matching event type', () => {
      const classificationEvents: IntegrationEvent[] = [];
      const routingEvents: IntegrationEvent[] = [];

      emitter.on('classification', (e) => classificationEvents.push(e));
      emitter.on('routing', (e) => routingEvents.push(e));

      emitter.emit('classification', { id: '1' });
      emitter.emit('routing', { id: '2' });

      expect(classificationEvents.length).toBe(1);
      expect(routingEvents.length).toBe(1);
    });
  });

  describe('onAll (all events)', () => {
    it('should fire for all event types', () => {
      const allEvents: IntegrationEvent[] = [];
      emitter.onAll((event) => allEvents.push(event));

      emitter.emit('classification', {});
      emitter.emit('routing', {});
      emitter.emit('governance_decision', {});

      expect(allEvents.length).toBe(3);
    });
  });

  describe('off/offAll', () => {
    it('should remove specific listener', () => {
      const events: IntegrationEvent[] = [];
      const listener = (e: IntegrationEvent) => events.push(e);

      emitter.on('classification', listener);
      emitter.emit('classification', {});

      emitter.off('classification', listener);
      emitter.emit('classification', {});

      expect(events.length).toBe(1);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events in order', () => {
      emitter.emit('classification', { id: '1' });
      emitter.emit('routing', { id: '2' });
      emitter.emit('governance_decision', { id: '3' });

      const recent = emitter.getRecentEvents(2);

      expect(recent.length).toBe(2);
      expect(recent[0].type).toBe('routing');
      expect(recent[1].type).toBe('governance_decision');
    });

    it('should limit buffer size', () => {
      const smallEmitter = new IntegrationEventEmitter(5);

      for (let i = 0; i < 10; i++) {
        smallEmitter.emit('classification', { i });
      }

      const recent = smallEmitter.getRecentEvents(10);
      expect(recent.length).toBe(5);
    });
  });

  describe('global singleton', () => {
    afterEach(() => {
      resetIntegrationEmitter();
    });

    it('should return the same instance', () => {
      const emitter1 = getIntegrationEmitter();
      const emitter2 = getIntegrationEmitter();

      expect(emitter1).toBe(emitter2);
    });

    it('should reset the instance', () => {
      const emitter1 = getIntegrationEmitter();
      resetIntegrationEmitter();
      const emitter2 = getIntegrationEmitter();

      expect(emitter1).not.toBe(emitter2);
    });
  });
});

describe('Phase 3: WebSocket Server', () => {
  let emitter: IntegrationEventEmitter;
  let server: IntegrationWebSocketServer;

  beforeEach(() => {
    emitter = new IntegrationEventEmitter();
    server = new IntegrationWebSocketServer(emitter, {
      sendRecentOnConnect: true,
      recentEventCount: 10,
      heartbeatIntervalMs: 0, // Disable heartbeat for tests
    });
  });

  afterEach(() => {
    server.stop();
  });

  describe('start/stop', () => {
    it('should start and stop the server', () => {
      expect(server.isRunning()).toBe(false);

      server.start();
      expect(server.isRunning()).toBe(true);

      server.stop();
      expect(server.isRunning()).toBe(false);
    });
  });

  describe('client management', () => {
    it('should add and remove clients', () => {
      server.start();

      const client = createMockClient('client-1');
      server.addClient(client);

      expect(server.getClientCount()).toBe(1);

      server.removeClient('client-1');
      expect(server.getClientCount()).toBe(0);
    });
  });

  describe('broadcast', () => {
    it('should broadcast events to all connected clients', () => {
      server.start();

      const client1 = createMockClient('client-1');
      const client2 = createMockClient('client-2');

      server.addClient(client1);
      server.addClient(client2);

      // Emit an event -- should be broadcast to both clients
      emitter.emit('classification', {
        type: 'code-change',
        complexity: 'medium',
      });

      expect(client1.messages.length).toBe(1);
      expect(client2.messages.length).toBe(1);

      const msg = JSON.parse(client1.messages[0]);
      expect(msg.type).toBe('classification');
      expect(msg.data.type).toBe('code-change');
    });

    it('should send recent events on connect', () => {
      server.start();

      // Emit events before client connects
      emitter.emit('classification', { id: '1' });
      emitter.emit('routing', { id: '2' });

      const client = createMockClient('client-1');
      server.addClient(client);

      // Client should receive recent events
      expect(client.messages.length).toBe(2);
    });

    it('should filter by client subscriptions', () => {
      server.start();

      // Pre-emit events so recent events are cleared
      const client1 = createMockClient('client-1', ['classification']);
      const client2 = createMockClient('client-2', ['routing']);

      server.addClient(client1);
      server.addClient(client2);

      // Clear messages from recent events on connect
      client1.messages.length = 0;
      client2.messages.length = 0;

      emitter.emit('classification', { id: '1' });

      expect(client1.messages.length).toBe(1);
      expect(client2.messages.length).toBe(0);
    });

    it('should clean up disconnected clients', () => {
      server.start();

      const client = createMockClient('client-1');
      server.addClient(client);

      client.close(); // Disconnect

      emitter.emit('classification', {}); // Trigger cleanup

      expect(server.getClientCount()).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should track server statistics', () => {
      server.start();

      const client = createMockClient('client-1');
      server.addClient(client);

      emitter.emit('classification', {});
      emitter.emit('routing', {});

      const stats = server.getStats();

      expect(stats.connectedClients).toBe(1);
      expect(stats.totalBroadcasts).toBe(2);
      expect(stats.totalMessagesSent).toBe(2);
      expect(stats.running).toBe(true);
    });
  });
});
