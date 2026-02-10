/**
 * TriggerService
 *
 * Application service for managing event-driven work triggers.
 * Handles trigger CRUD, event evaluation, and work item creation on trigger fire.
 */

import {
  WorkTrigger,
  WorkTriggerProps,
  TriggerAction,
} from '../../domain/entities/WorkTrigger';
import {
  TriggerConditionGroup,
  validateConditionGroup,
} from '../../domain/value-objects/TriggerCondition';
import { SchedulingService, CreateWorkItemDTO } from './SchedulingService';

export interface ITriggerRepository {
  save(trigger: WorkTrigger): Promise<void>;
  findById(id: string): Promise<WorkTrigger | null>;
  findAll(filters?: TriggerFilters): Promise<{ items: WorkTrigger[]; total: number }>;
  findByEventType(eventType: string): Promise<WorkTrigger[]>;
  update(trigger: WorkTrigger): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TriggerFilters {
  eventType?: string;
  enabled?: boolean;
  createdBy?: string;
  offset?: number;
  limit?: number;
}

export interface CreateTriggerDTO {
  name: string;
  description?: string;
  eventType: string;
  conditions: TriggerConditionGroup[];
  actions: TriggerAction[];
  rateLimitPerMin?: number;
  createdBy: string;
}

export interface PlatformEvent {
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
  source?: string;
}

// Circuit breaker state for triggers
interface CircuitBreakerState {
  failureCount: number;
  lastFailureAt: Date | null;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 50;
const CIRCUIT_BREAKER_RESET_MS = 300000; // 5 minutes
const GLOBAL_RATE_LIMIT_PER_MIN = 100;
const MAX_CASCADE_DEPTH = 3;

export class TriggerService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private globalFireTimes: Date[] = [];
  private currentCascadeDepth: number = 0;

  constructor(
    private readonly triggerRepository: ITriggerRepository,
    private readonly schedulingService: SchedulingService,
  ) {}

  /**
   * Create a new trigger
   */
  async createTrigger(dto: CreateTriggerDTO): Promise<WorkTrigger> {
    // Validate conditions
    for (const group of dto.conditions) {
      const errors = validateConditionGroup(group);
      if (errors.length > 0) {
        throw new Error(`Invalid trigger conditions: ${errors.join('; ')}`);
      }
    }

    // Validate actions
    if (dto.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    if (dto.actions.length > 20) {
      throw new Error('Maximum 20 actions per trigger');
    }

    const trigger = new WorkTrigger({
      name: dto.name,
      description: dto.description,
      eventType: dto.eventType,
      conditions: dto.conditions,
      actions: dto.actions,
      rateLimitPerMin: dto.rateLimitPerMin,
      createdBy: dto.createdBy,
    });

    await this.triggerRepository.save(trigger);
    return trigger;
  }

  /**
   * Get a trigger by ID
   */
  async getTrigger(id: string): Promise<WorkTrigger | null> {
    return this.triggerRepository.findById(id);
  }

  /**
   * List triggers with filters
   */
  async listTriggers(filters?: TriggerFilters): Promise<{ items: WorkTrigger[]; total: number }> {
    return this.triggerRepository.findAll(filters);
  }

  /**
   * Enable a trigger
   */
  async enableTrigger(id: string): Promise<WorkTrigger> {
    const trigger = await this.requireTrigger(id);
    trigger.enable();
    await this.triggerRepository.update(trigger);

    // Reset circuit breaker
    this.circuitBreakers.delete(id);

    return trigger;
  }

  /**
   * Disable a trigger
   */
  async disableTrigger(id: string): Promise<WorkTrigger> {
    const trigger = await this.requireTrigger(id);
    trigger.disable();
    await this.triggerRepository.update(trigger);
    return trigger;
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(id: string): Promise<void> {
    await this.requireTrigger(id);
    await this.triggerRepository.delete(id);
    this.circuitBreakers.delete(id);
  }

  /**
   * Evaluate an event against all matching triggers
   * Returns the work items created by fired triggers
   */
  async evaluateEvent(event: PlatformEvent): Promise<string[]> {
    // Check global rate limit
    if (!this.isWithinGlobalRateLimit()) {
      console.warn('Global trigger rate limit exceeded, skipping evaluation');
      return [];
    }

    // Check cascade depth
    if (this.currentCascadeDepth >= MAX_CASCADE_DEPTH) {
      console.warn(`Cascade depth limit (${MAX_CASCADE_DEPTH}) reached, skipping evaluation`);
      return [];
    }

    // Find triggers matching this event type
    const triggers = await this.triggerRepository.findByEventType(event.type);
    const createdWorkItemIds: string[] = [];

    this.currentCascadeDepth++;

    try {
      for (const trigger of triggers) {
        if (!trigger.enabled) {
          continue;
        }

        // Check circuit breaker
        if (this.isCircuitBreakerOpen(trigger.id)) {
          continue;
        }

        // Check per-trigger rate limit
        if (!trigger.isWithinRateLimit()) {
          continue;
        }

        try {
          // Evaluate trigger conditions against event data
          if (trigger.evaluate(event.data)) {
            // Trigger matched - create work items from actions
            const workItemIds = await this.fireTrigger(trigger, event);
            createdWorkItemIds.push(...workItemIds);

            // Record success and reset circuit breaker
            trigger.recordFire();
            await this.triggerRepository.update(trigger);
            this.resetCircuitBreaker(trigger.id);
          }
        } catch (error) {
          // Record failure for circuit breaker
          this.recordCircuitBreakerFailure(trigger.id);
          console.error(`Trigger ${trigger.id} evaluation failed:`, error);
        }
      }
    } finally {
      this.currentCascadeDepth--;
    }

    // Record global fire time
    this.globalFireTimes.push(new Date());

    return createdWorkItemIds;
  }

  /**
   * Fire a trigger, creating work items from its actions
   */
  private async fireTrigger(trigger: WorkTrigger, event: PlatformEvent): Promise<string[]> {
    const workItemIds: string[] = [];

    for (const action of trigger.actions) {
      try {
        const dto: CreateWorkItemDTO = {
          name: `${action.name} (triggered by: ${trigger.name})`,
          description: `Auto-created by trigger "${trigger.name}" on event "${event.type}"`,
          workType: 'single_app',
          scheduleType: 'immediate',
          priority: action.priority || 'NORMAL',
          agentAssignments: [
            {
              agentType: action.agentType,
              role: 'primary' as const,
              parameters: {
                ...action.parameters,
                triggerEventData: event.data,
              },
              useMemory: true,
              saveMemory: true,
            },
          ],
          metadata: {
            triggerId: trigger.id,
            triggerName: trigger.name,
            eventType: event.type,
            eventTimestamp: event.timestamp.toISOString(),
          },
          createdBy: trigger.createdBy,
        };

        const workItem = await this.schedulingService.createWorkItem(dto);
        workItemIds.push(workItem.id);
      } catch (error) {
        console.error(`Failed to create work item for trigger action "${action.name}":`, error);
      }
    }

    return workItemIds;
  }

  // Circuit breaker methods

  private isCircuitBreakerOpen(triggerId: string): boolean {
    const state = this.circuitBreakers.get(triggerId);
    if (!state || !state.isOpen) {
      return false;
    }

    // Check if circuit breaker should reset
    if (state.lastFailureAt) {
      const timeSinceLastFailure = Date.now() - state.lastFailureAt.getTime();
      if (timeSinceLastFailure > CIRCUIT_BREAKER_RESET_MS) {
        this.resetCircuitBreaker(triggerId);
        return false;
      }
    }

    return true;
  }

  private recordCircuitBreakerFailure(triggerId: string): void {
    const state = this.circuitBreakers.get(triggerId) || {
      failureCount: 0,
      lastFailureAt: null,
      isOpen: false,
    };

    state.failureCount++;
    state.lastFailureAt = new Date();

    if (state.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
      console.warn(`Circuit breaker opened for trigger ${triggerId} after ${state.failureCount} failures`);
    }

    this.circuitBreakers.set(triggerId, state);
  }

  private resetCircuitBreaker(triggerId: string): void {
    this.circuitBreakers.delete(triggerId);
  }

  private isWithinGlobalRateLimit(): boolean {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.globalFireTimes = this.globalFireTimes.filter(t => t > oneMinuteAgo);
    return this.globalFireTimes.length < GLOBAL_RATE_LIMIT_PER_MIN;
  }

  // Private helpers

  private async requireTrigger(id: string): Promise<WorkTrigger> {
    const trigger = await this.triggerRepository.findById(id);
    if (!trigger) {
      throw new Error(`Trigger not found: ${id}`);
    }
    return trigger;
  }
}
