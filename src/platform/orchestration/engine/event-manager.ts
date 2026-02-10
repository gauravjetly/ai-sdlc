/**
 * Event Manager
 *
 * Manages event-driven triggers and event handlers
 */

import { EventEmitter } from 'events';
import { PlatformEvent, EventHandler } from '../types/orchestration-types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('EventManager');

export class EventManager extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventHistory: PlatformEvent[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for multiple agents
  }

  /**
   * Register an event handler
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);

    // Register with EventEmitter
    this.on(eventType, async (event: PlatformEvent) => {
      try {
        await handler(event);
      } catch (error: any) {
        logger.error(`Event handler failed for ${eventType}:`, {
          error: error.message,
          event
        });
      }
    });

    logger.info(`Event handler registered for: ${eventType}`);
  }

  /**
   * Unregister a specific handler
   */
  unregisterHandler(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.off(eventType, handler as any);
        logger.info(`Event handler unregistered for: ${eventType}`);
      }
    }
  }

  /**
   * Unregister all handlers for an event type
   */
  unregisterAllHandlers(eventType: string): void {
    this.handlers.delete(eventType);
    this.removeAllListeners(eventType);
    logger.info(`All event handlers unregistered for: ${eventType}`);
  }

  /**
   * Publish an event
   */
  async publishEvent(event: PlatformEvent): Promise<void> {
    logger.info(`Publishing event: ${event.type}`, {
      eventType: event.type,
      timestamp: event.timestamp
    });

    // Add to history
    this.addToHistory(event);

    // Emit the event (handlers will be called asynchronously)
    this.emit(event.type, event);

    // Also emit a wildcard event for global listeners
    this.emit('*', event);
  }

  /**
   * Publish event synchronously and wait for all handlers
   */
  async publishEventSync(event: PlatformEvent): Promise<void> {
    logger.info(`Publishing event (sync): ${event.type}`, {
      eventType: event.type,
      timestamp: event.timestamp
    });

    // Add to history
    this.addToHistory(event);

    // Get handlers
    const handlers = this.handlers.get(event.type) || [];

    // Execute all handlers
    const handlerPromises = handlers.map(handler =>
      handler(event).catch(error => {
        logger.error(`Event handler failed for ${event.type}:`, {
          error: error.message,
          event
        });
      })
    );

    await Promise.all(handlerPromises);
  }

  /**
   * Get event history
   */
  getEventHistory(eventType?: string, limit?: number): PlatformEvent[] {
    let history = eventType
      ? this.eventHistory.filter(e => e.type === eventType)
      : this.eventHistory;

    // Sort by timestamp descending (most recent first)
    history = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  /**
   * List all registered event types
   */
  listEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    logger.info('Event history cleared');
  }

  // ============================================
  // Pre-defined Platform Events
  // ============================================

  /**
   * Deployment completed event
   */
  async deploymentComplete(deploymentId: string, metadata: any): Promise<void> {
    await this.publishEvent({
      type: 'deployment.complete',
      timestamp: new Date(),
      data: { deploymentId, ...metadata }
    });
  }

  /**
   * Deployment failed event
   */
  async deploymentFailed(deploymentId: string, reason: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'deployment.failed',
      timestamp: new Date(),
      data: { deploymentId, reason, ...metadata }
    });
  }

  /**
   * Alert fired event
   */
  async alertFired(alertId: string, severity: string, message: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'alert.fired',
      timestamp: new Date(),
      data: { alertId, severity, message, ...metadata }
    });
  }

  /**
   * Test failed event
   */
  async testFailed(testId: string, reason: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'test.failed',
      timestamp: new Date(),
      data: { testId, reason, ...metadata }
    });
  }

  /**
   * Test passed event
   */
  async testPassed(testId: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'test.passed',
      timestamp: new Date(),
      data: { testId, ...metadata }
    });
  }

  /**
   * Security vulnerability detected event
   */
  async vulnerabilityDetected(vulnerabilityId: string, severity: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'security.vulnerability_detected',
      timestamp: new Date(),
      data: { vulnerabilityId, severity, ...metadata }
    });
  }

  /**
   * Cost threshold exceeded event
   */
  async costThresholdExceeded(threshold: number, actual: number, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'cost.threshold_exceeded',
      timestamp: new Date(),
      data: { threshold, actual, ...metadata }
    });
  }

  /**
   * Health check failed event
   */
  async healthCheckFailed(serviceId: string, reason: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'health.check_failed',
      timestamp: new Date(),
      data: { serviceId, reason, ...metadata }
    });
  }

  /**
   * Rollback initiated event
   */
  async rollbackInitiated(deploymentId: string, reason: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'rollback.initiated',
      timestamp: new Date(),
      data: { deploymentId, reason, ...metadata }
    });
  }

  /**
   * Approval required event
   */
  async approvalRequired(requestId: string, type: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'approval.required',
      timestamp: new Date(),
      data: { requestId, type, ...metadata }
    });
  }

  /**
   * Approval granted event
   */
  async approvalGranted(requestId: string, approver: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'approval.granted',
      timestamp: new Date(),
      data: { requestId, approver, ...metadata }
    });
  }

  /**
   * Approval rejected event
   */
  async approvalRejected(requestId: string, approver: string, reason: string, metadata?: any): Promise<void> {
    await this.publishEvent({
      type: 'approval.rejected',
      timestamp: new Date(),
      data: { requestId, approver, reason, ...metadata }
    });
  }

  /**
   * Add event to history
   */
  private addToHistory(event: PlatformEvent): void {
    this.eventHistory.push(event);

    // Keep only the most recent events
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}
