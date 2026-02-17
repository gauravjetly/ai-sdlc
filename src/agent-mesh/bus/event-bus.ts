/**
 * Event Bus Interface
 *
 * Abstraction layer for event-driven agent communication.
 * Supports two providers:
 *   - FileEventBusProvider: Uses existing file-based MessageBus
 *   - BullMQEventBusProvider: Uses Redis-backed BullMQ queues
 *
 * Provider is selected by the EVENT_BUS environment variable.
 */

import { AgentId } from '../types';

export interface EventMetadata {
  traceId?: string;
  sourceAgent?: AgentId;
  workflowId?: string;
  taskId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  correlationId?: string;
}

export interface MeshEvent {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  metadata: EventMetadata;
  timestamp: string;
}

export type EventHandler = (event: MeshEvent) => Promise<void>;

export interface Subscription {
  id: string;
  pattern: string;
  handler: EventHandler;
}

export interface EventBusStats {
  provider: 'file' | 'bullmq';
  subscriberCount: number;
  topics: string[];
  publishedCount: number;
}

/**
 * EventBus interface - the contract that both providers implement.
 */
export interface EventBus {
  /**
   * Initialize the event bus.
   */
  initialize(): Promise<void>;

  /**
   * Publish an event to a topic.
   */
  publish(topic: string, payload: Record<string, unknown>, metadata?: EventMetadata): Promise<MeshEvent>;

  /**
   * Subscribe to events matching a pattern (supports wildcards like "task.*").
   */
  subscribe(pattern: string, handler: EventHandler): Promise<Subscription>;

  /**
   * Unsubscribe from events.
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Replay events from a topic within a time range.
   */
  replay(topic: string, from: Date, to: Date): Promise<MeshEvent[]>;

  /**
   * Get events by trace ID.
   */
  getByTraceId(traceId: string): Promise<MeshEvent[]>;

  /**
   * Get statistics about the event bus.
   */
  getStats(): EventBusStats;

  /**
   * Shutdown the event bus.
   */
  shutdown(): Promise<void>;
}
