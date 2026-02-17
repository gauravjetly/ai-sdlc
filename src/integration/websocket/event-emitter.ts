/**
 * Integration Event Emitter
 *
 * Centralized event system for the integration layer.
 * All components emit events through this system, which are then
 * broadcast to connected WebSocket clients.
 *
 * Part of Phase 3: Advanced Dashboard Features.
 *
 * @module websocket/event-emitter
 */

/**
 * Types of integration events.
 */
export type IntegrationEventType =
  | 'classification'
  | 'routing'
  | 'governance_decision'
  | 'approval_needed'
  | 'approval_approved'
  | 'approval_rejected'
  | 'workflow_started'
  | 'workflow_phase_changed'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'bypass_token_used'
  | 'metrics_update'
  | 'config_changed'
  | 'system_health';

/**
 * An integration event for broadcast.
 */
export interface IntegrationEvent {
  /** Event type */
  type: IntegrationEventType;
  /** Event data */
  data: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
  /** Event sequence number */
  sequence: number;
}

/**
 * Event listener function type.
 */
export type EventListener = (event: IntegrationEvent) => void;

/**
 * IntegrationEventEmitter is the central event bus for all integration events.
 * WebSocket server and dashboard subscribe to this emitter for real-time updates.
 */
export class IntegrationEventEmitter {
  private readonly listeners: Map<string, EventListener[]> = new Map();
  private readonly allListeners: EventListener[] = [];
  private sequence: number = 0;
  private readonly recentEvents: IntegrationEvent[] = [];
  private readonly maxRecentEvents: number;

  constructor(maxRecentEvents: number = 100) {
    this.maxRecentEvents = maxRecentEvents;
  }

  /**
   * Emit an event to all registered listeners.
   *
   * @param type - The event type
   * @param data - The event data
   * @returns The created event
   */
  emit(type: IntegrationEventType, data: Record<string, unknown>): IntegrationEvent {
    this.sequence++;

    const event: IntegrationEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
      sequence: this.sequence,
    };

    // Store in recent events buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(type) ?? [];
    for (const listener of typeListeners) {
      try {
        listener(event);
      } catch {
        // Listener errors should not break event emission
      }
    }

    // Notify "all events" listeners
    for (const listener of this.allListeners) {
      try {
        listener(event);
      } catch {
        // Listener errors should not break event emission
      }
    }

    return event;
  }

  /**
   * Subscribe to a specific event type.
   *
   * @param type - The event type to listen for
   * @param listener - The listener function
   */
  on(type: IntegrationEventType, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  /**
   * Subscribe to all events.
   *
   * @param listener - The listener function
   */
  onAll(listener: EventListener): void {
    this.allListeners.push(listener);
  }

  /**
   * Unsubscribe from a specific event type.
   *
   * @param type - The event type
   * @param listener - The listener to remove
   */
  off(type: IntegrationEventType, listener: EventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Unsubscribe from all events.
   *
   * @param listener - The listener to remove
   */
  offAll(listener: EventListener): void {
    const index = this.allListeners.indexOf(listener);
    if (index !== -1) {
      this.allListeners.splice(index, 1);
    }
  }

  /**
   * Get recent events (for new client catchup).
   *
   * @param count - Number of recent events to return. Default: 50
   * @returns Recent events in chronological order
   */
  getRecentEvents(count: number = 50): IntegrationEvent[] {
    return this.recentEvents.slice(-count);
  }

  /**
   * Get the current sequence number.
   */
  getSequence(): number {
    return this.sequence;
  }

  /**
   * Remove all listeners.
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.allListeners.length = 0;
  }

  /**
   * Get listener count for a specific type.
   */
  listenerCount(type?: IntegrationEventType): number {
    if (type) {
      return (this.listeners.get(type)?.length ?? 0) + this.allListeners.length;
    }
    let total = this.allListeners.length;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }
}

/**
 * Singleton event emitter instance for the integration system.
 */
let globalEmitter: IntegrationEventEmitter | null = null;

/**
 * Get the global integration event emitter instance.
 */
export function getIntegrationEmitter(): IntegrationEventEmitter {
  if (!globalEmitter) {
    globalEmitter = new IntegrationEventEmitter();
  }
  return globalEmitter;
}

/**
 * Reset the global emitter (for testing).
 */
export function resetIntegrationEmitter(): void {
  if (globalEmitter) {
    globalEmitter.removeAllListeners();
  }
  globalEmitter = null;
}
