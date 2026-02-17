/**
 * WebSocket Module
 *
 * Phase 3: Real-time event broadcasting for dashboard integration.
 *
 * @module websocket
 */

export {
  IntegrationEventEmitter,
  getIntegrationEmitter,
  resetIntegrationEmitter,
} from './event-emitter';
export type {
  IntegrationEventType,
  IntegrationEvent,
  EventListener,
} from './event-emitter';

export { IntegrationWebSocketServer } from './websocket-server';
export type {
  WebSocketClient,
  WebSocketServerStats,
  WebSocketServerConfig,
} from './websocket-server';
