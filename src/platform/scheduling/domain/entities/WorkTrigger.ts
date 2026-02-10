/**
 * WorkTrigger Entity
 *
 * Represents an event-driven trigger that automatically creates
 * one or more work items when matching conditions are met.
 */

import { v4 as uuidv4 } from 'uuid';
import { TriggerCondition, TriggerConditionGroup } from '../value-objects/TriggerCondition';

export interface TriggerAction {
  name: string;
  agentType: string;
  taskType: string;
  parameters: Record<string, unknown>;
  priority?: string;
}

export interface WorkTriggerProps {
  id?: string;
  name: string;
  description?: string;
  eventType: string;
  conditions: TriggerConditionGroup[];
  actions: TriggerAction[];
  enabled?: boolean;
  rateLimitPerMin?: number;
  lastFiredAt?: Date;
  fireCount?: number;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkTrigger {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly eventType: string;
  readonly conditions: TriggerConditionGroup[];
  readonly actions: TriggerAction[];
  private _enabled: boolean;
  readonly rateLimitPerMin: number;
  private _lastFiredAt: Date | null;
  private _fireCount: number;
  private _recentFireTimes: Date[];
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: WorkTriggerProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.description = props.description || '';
    this.eventType = props.eventType;
    this.conditions = props.conditions;
    this.actions = props.actions;
    this._enabled = props.enabled !== false;
    this.rateLimitPerMin = props.rateLimitPerMin || 10;
    this._lastFiredAt = props.lastFiredAt || null;
    this._fireCount = props.fireCount || 0;
    this._recentFireTimes = [];
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get lastFiredAt(): Date | null {
    return this._lastFiredAt;
  }

  get fireCount(): number {
    return this._fireCount;
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Trigger name is required');
    }

    if (!this.eventType || this.eventType.trim().length === 0) {
      throw new Error('Event type is required');
    }

    if (this.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    if (this.actions.length > 20) {
      throw new Error('Maximum 20 actions per trigger');
    }

    if (this.rateLimitPerMin < 1 || this.rateLimitPerMin > 100) {
      throw new Error('Rate limit must be between 1 and 100 per minute');
    }
  }

  /**
   * Enable the trigger
   */
  enable(): void {
    this._enabled = true;
  }

  /**
   * Disable the trigger
   */
  disable(): void {
    this._enabled = false;
  }

  /**
   * Evaluate whether an event matches this trigger's conditions
   */
  evaluate(eventData: Record<string, unknown>): boolean {
    if (!this._enabled) {
      return false;
    }

    if (this.conditions.length === 0) {
      return true;
    }

    // Conditions groups are ORed together
    return this.conditions.some(group => this.evaluateGroup(group, eventData));
  }

  /**
   * Check if the trigger is within its rate limit
   */
  isWithinRateLimit(): boolean {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this._recentFireTimes = this._recentFireTimes.filter(t => t > oneMinuteAgo);
    return this._recentFireTimes.length < this.rateLimitPerMin;
  }

  /**
   * Record a trigger fire event
   */
  recordFire(): void {
    this._lastFiredAt = new Date();
    this._fireCount += 1;
    this._recentFireTimes.push(new Date());
  }

  /**
   * Evaluate a condition group against event data
   */
  private evaluateGroup(group: TriggerConditionGroup, eventData: Record<string, unknown>): boolean {
    if (group.operator === 'AND') {
      return group.conditions.every(cond => this.evaluateCondition(cond, eventData));
    }
    return group.conditions.some(cond => this.evaluateCondition(cond, eventData));
  }

  /**
   * Evaluate a single condition against event data
   */
  private evaluateCondition(condition: TriggerCondition, eventData: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(eventData, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value));
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > Number(condition.value);
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue as string);
      case 'regex':
        try {
          const regex = new RegExp(String(condition.value));
          return typeof fieldValue === 'string' && regex.test(fieldValue);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Safely get a nested value from an object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      eventType: this.eventType,
      conditions: this.conditions,
      actions: this.actions,
      enabled: this._enabled,
      rateLimitPerMin: this.rateLimitPerMin,
      lastFiredAt: this._lastFiredAt?.toISOString() || null,
      fireCount: this._fireCount,
      createdBy: this.createdBy,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
