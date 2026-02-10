/**
 * AgentMemory Entity
 *
 * Represents a persistent memory entry for an agent, enabling
 * context retention across executions.
 */

import { v4 as uuidv4 } from 'uuid';

export interface AgentMemoryProps {
  id?: string;
  agentId: string;
  contextKey: string;
  contextValue: Record<string, unknown>;
  sizeBytes?: number;
  accessCount?: number;
  lastAccessedAt?: Date;
  expiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemoryStats {
  totalEntries: number;
  totalSizeBytes: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  mostAccessedKey: string | null;
  expiredCount: number;
}

export class AgentMemory {
  readonly id: string;
  readonly agentId: string;
  readonly contextKey: string;
  private _contextValue: Record<string, unknown>;
  private _sizeBytes: number;
  private _accessCount: number;
  private _lastAccessedAt: Date;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AgentMemoryProps) {
    this.id = props.id || uuidv4();
    this.agentId = props.agentId;
    this.contextKey = props.contextKey;
    this._contextValue = props.contextValue;
    this._sizeBytes = props.sizeBytes || this.calculateSize(props.contextValue);
    this._accessCount = props.accessCount || 0;
    this._lastAccessedAt = props.lastAccessedAt || new Date();
    this.expiresAt = props.expiresAt || null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  get contextValue(): Record<string, unknown> {
    return this._contextValue;
  }

  get sizeBytes(): number {
    return this._sizeBytes;
  }

  get accessCount(): number {
    return this._accessCount;
  }

  get lastAccessedAt(): Date {
    return this._lastAccessedAt;
  }

  private validate(): void {
    if (!this.agentId || this.agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }

    if (!this.contextKey || this.contextKey.trim().length === 0) {
      throw new Error('Context key is required');
    }

    if (this.contextKey.length > 500) {
      throw new Error('Context key must be 500 characters or less');
    }

    // Max 50MB per entry
    const maxEntrySize = 50 * 1024 * 1024;
    if (this._sizeBytes > maxEntrySize) {
      throw new Error(`Memory entry exceeds maximum size of 50MB (${this._sizeBytes} bytes)`);
    }
  }

  /**
   * Access the memory entry (increments access count, updates timestamp)
   */
  access(): Record<string, unknown> {
    this._accessCount += 1;
    this._lastAccessedAt = new Date();
    return this._contextValue;
  }

  /**
   * Update the stored value
   */
  update(newValue: Record<string, unknown>): void {
    this._contextValue = newValue;
    this._sizeBytes = this.calculateSize(newValue);
    this._lastAccessedAt = new Date();

    const maxEntrySize = 50 * 1024 * 1024;
    if (this._sizeBytes > maxEntrySize) {
      throw new Error(`Updated memory entry exceeds maximum size of 50MB`);
    }
  }

  /**
   * Check if the memory entry has expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return this.expiresAt < new Date();
  }

  /**
   * Check if the entry is stale (not accessed in given number of days)
   */
  isStale(staleDays: number = 30): boolean {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    return this._lastAccessedAt < staleDate;
  }

  /**
   * Calculate the approximate size of a JSON value in bytes
   */
  private calculateSize(value: Record<string, unknown>): number {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return 0;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      agentId: this.agentId,
      contextKey: this.contextKey,
      contextValue: this._contextValue,
      sizeBytes: this._sizeBytes,
      accessCount: this._accessCount,
      lastAccessedAt: this._lastAccessedAt.toISOString(),
      expiresAt: this.expiresAt?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
