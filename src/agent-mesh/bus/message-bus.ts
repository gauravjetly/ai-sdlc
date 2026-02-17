/**
 * Agent Message Bus
 *
 * File-based message bus for inter-agent communication.
 * Designed to work within the Claude Code + Task tool architecture
 * where agents communicate through persistent file storage.
 *
 * Architecture:
 * - Each agent has an inbox directory
 * - Messages are JSON files written to the receiver's inbox
 * - Agents poll their inbox or are invoked with inbox contents
 * - A central message log provides audit trail
 * - Circuit breakers prevent message storms
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentId,
  AgentMessage,
  MessageType,
  MessagePriority,
  MessageStatus,
  MessageContext,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
  CircuitBreakerState,
} from '../types';
import { AgentRegistry } from '../registry/agent-registry';

export interface SendMessageOptions {
  type: MessageType;
  priority?: MessagePriority;
  sender: AgentId;
  receiver: AgentId | 'all';
  subject: string;
  content: string;
  context?: Partial<MessageContext>;
  parentMessageId?: string;
  correlationId?: string;
  ttl?: number;
  requiresAck?: boolean;
}

export class MessageBus {
  private basePath: string;
  private config: AgentMeshConfig;
  private registry: AgentRegistry;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private messageChainDepth: Map<string, number> = new Map();

  constructor(registry: AgentRegistry, config: Partial<AgentMeshConfig> = {}) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.basePath = this.config.basePath.replace('~', os.homedir());
    this.registry = registry;
  }

  /**
   * Initialize the message bus directory structure
   */
  async initialize(): Promise<void> {
    const dirs = [
      path.join(this.basePath, 'bus', 'inboxes'),
      path.join(this.basePath, 'bus', 'outboxes'),
      path.join(this.basePath, 'bus', 'processed'),
      path.join(this.basePath, 'bus', 'failed'),
      path.join(this.basePath, 'bus', 'log'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Create inbox for each registered agent
    const agents = this.registry.getAllAgents();
    for (const agent of agents) {
      await fs.mkdir(
        path.join(this.basePath, 'bus', 'inboxes', agent.id),
        { recursive: true }
      );
      await fs.mkdir(
        path.join(this.basePath, 'bus', 'outboxes', agent.id),
        { recursive: true }
      );
    }

    // Initialize circuit breakers
    for (const agent of agents) {
      this.circuitBreakers.set(agent.id, {
        agentId: agent.id,
        state: 'closed',
        failureCount: 0,
        resetTimeout: this.config.circuitBreakerResetMs,
        threshold: this.config.circuitBreakerThreshold,
      });
    }

    console.log('[MessageBus] Initialized with inboxes for', agents.length, 'agents');
  }

  /**
   * Send a message to an agent or broadcast to all
   */
  async send(options: SendMessageOptions): Promise<AgentMessage> {
    // Validate sender exists
    const senderProfile = this.registry.getAgent(options.sender);
    if (!senderProfile) {
      throw new Error(`Sender agent '${options.sender}' not found in registry`);
    }

    // Check loop detection
    const correlationId = options.correlationId || uuidv4();
    const chainDepth = this.messageChainDepth.get(correlationId) || 0;
    if (chainDepth >= this.config.loopDetectionDepth) {
      throw new Error(
        `Loop detected: message chain depth ${chainDepth} exceeds max ${this.config.loopDetectionDepth} ` +
        `for correlation ${correlationId}`
      );
    }

    // Create message
    const message: AgentMessage = {
      id: uuidv4(),
      correlationId,
      parentMessageId: options.parentMessageId,
      timestamp: new Date().toISOString(),
      type: options.type,
      priority: options.priority || 'normal',
      status: 'pending',
      sender: options.sender,
      receiver: options.receiver,
      subject: options.subject,
      content: options.content,
      context: {
        sdlcPhase: options.context?.sdlcPhase,
        workItemId: options.context?.workItemId,
        projectId: options.context?.projectId,
        relatedFiles: options.context?.relatedFiles || [],
        relatedAgents: options.context?.relatedAgents || [],
        tags: options.context?.tags || [],
      },
      metadata: {
        traceId: uuidv4(),
        spanId: uuidv4(),
        learningGenerated: false,
        conflictDetected: false,
      },
      ttl: options.ttl || this.config.messageTTL,
      requiresAck: options.requiresAck || false,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    // Track chain depth
    this.messageChainDepth.set(correlationId, chainDepth + 1);

    if (options.receiver === 'all') {
      // Broadcast to all agents except sender
      await this.broadcast(message);
    } else {
      // Send to specific agent
      await this.deliverToAgent(message, options.receiver);
    }

    // Log to outbox
    await this.logToOutbox(message);

    // Log to central message log
    await this.logMessage(message);

    return message;
  }

  /**
   * Read messages from an agent's inbox
   */
  async readInbox(
    agentId: AgentId,
    options: {
      priority?: MessagePriority;
      type?: MessageType;
      limit?: number;
      includeExpired?: boolean;
    } = {}
  ): Promise<AgentMessage[]> {
    const inboxPath = path.join(this.basePath, 'bus', 'inboxes', agentId);

    try {
      const files = await fs.readdir(inboxPath);
      const messages: AgentMessage[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(inboxPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const message: AgentMessage = JSON.parse(content);

        // Check expiry
        if (!options.includeExpired && this.isExpired(message)) {
          await this.moveToFailed(agentId, file, 'expired');
          continue;
        }

        // Apply filters
        if (options.priority && message.priority !== options.priority) continue;
        if (options.type && message.type !== options.type) continue;

        messages.push(message);
      }

      // Sort by priority (critical first) then by timestamp
      const priorityOrder: Record<MessagePriority, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
      };

      messages.sort((a, b) => {
        const priDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priDiff !== 0) return priDiff;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      // Apply limit
      if (options.limit) {
        return messages.slice(0, options.limit);
      }

      return messages;
    } catch (error) {
      console.error(`[MessageBus] Failed to read inbox for ${agentId}:`, error);
      return [];
    }
  }

  /**
   * Acknowledge a message (mark as processed)
   */
  async acknowledge(agentId: AgentId, messageId: string): Promise<void> {
    const inboxPath = path.join(this.basePath, 'bus', 'inboxes', agentId);
    const processedPath = path.join(this.basePath, 'bus', 'processed');

    try {
      const files = await fs.readdir(inboxPath);
      for (const file of files) {
        if (file.includes(messageId)) {
          const srcPath = path.join(inboxPath, file);
          const destPath = path.join(processedPath, file);

          // Read, update status, move
          const content = await fs.readFile(srcPath, 'utf-8');
          const message: AgentMessage = JSON.parse(content);
          message.status = 'completed';

          await fs.writeFile(destPath, JSON.stringify(message, null, 2), 'utf-8');
          await fs.unlink(srcPath);

          // Reset circuit breaker on success
          this.resetCircuitBreaker(agentId);

          console.log(`[MessageBus] Message ${messageId} acknowledged by ${agentId}`);
          return;
        }
      }
    } catch (error) {
      console.error(`[MessageBus] Failed to acknowledge message:`, error);
    }
  }

  /**
   * Report a message processing failure
   */
  async reportFailure(
    agentId: AgentId,
    messageId: string,
    reason: string
  ): Promise<void> {
    const inboxPath = path.join(this.basePath, 'bus', 'inboxes', agentId);

    try {
      const files = await fs.readdir(inboxPath);
      for (const file of files) {
        if (file.includes(messageId)) {
          const filePath = path.join(inboxPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const message: AgentMessage = JSON.parse(content);

          message.retryCount += 1;
          message.status = 'failed';

          if (message.retryCount < message.maxRetries) {
            // Retry: update and keep in inbox
            message.status = 'pending';
            await fs.writeFile(filePath, JSON.stringify(message, null, 2), 'utf-8');
            console.log(
              `[MessageBus] Message ${messageId} retry ${message.retryCount}/${message.maxRetries}`
            );
          } else {
            // Max retries exceeded: move to failed
            await this.moveToFailed(agentId, file, reason);

            // Increment circuit breaker failure count
            this.recordCircuitBreakerFailure(agentId);
          }
          return;
        }
      }
    } catch (error) {
      console.error(`[MessageBus] Failed to report failure:`, error);
    }
  }

  /**
   * Get inbox count for an agent
   */
  async getInboxCount(agentId: AgentId): Promise<number> {
    const inboxPath = path.join(this.basePath, 'bus', 'inboxes', agentId);
    try {
      const files = await fs.readdir(inboxPath);
      return files.filter((f) => f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get all messages for a correlation ID (conversation thread)
   */
  async getThread(correlationId: string): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = [];

    // Check log directory
    const logPath = path.join(this.basePath, 'bus', 'log');
    try {
      const files = await fs.readdir(logPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(path.join(logPath, file), 'utf-8');
        const message: AgentMessage = JSON.parse(content);
        if (message.correlationId === correlationId) {
          messages.push(message);
        }
      }
    } catch {
      // Log directory may not exist yet
    }

    return messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Get circuit breaker state for an agent
   */
  getCircuitBreakerState(agentId: AgentId): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(agentId);
  }

  /**
   * Clean up expired messages across all inboxes
   */
  async cleanup(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;

    const agents = this.registry.getAllAgents();
    for (const agent of agents) {
      const inboxPath = path.join(this.basePath, 'bus', 'inboxes', agent.id);
      try {
        const files = await fs.readdir(inboxPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const filePath = path.join(inboxPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const message: AgentMessage = JSON.parse(content);

          if (this.isExpired(message)) {
            await this.moveToFailed(agent.id, file, 'expired');
            cleaned++;
          }
        }
      } catch (error) {
        errors++;
      }
    }

    console.log(`[MessageBus] Cleanup: ${cleaned} expired, ${errors} errors`);
    return { cleaned, errors };
  }

  // ---- Private Methods ----

  private async deliverToAgent(
    message: AgentMessage,
    receiverId: AgentId
  ): Promise<void> {
    // Check circuit breaker
    const cb = this.circuitBreakers.get(receiverId);
    if (cb && cb.state === 'open') {
      const timeSinceLastFailure = cb.lastFailure
        ? Date.now() - new Date(cb.lastFailure).getTime()
        : Infinity;

      if (timeSinceLastFailure > cb.resetTimeout) {
        // Transition to half-open
        cb.state = 'half-open';
      } else {
        throw new Error(
          `Circuit breaker OPEN for agent '${receiverId}'. ` +
          `${cb.failureCount} failures recorded.`
        );
      }
    }

    // Check communication permission
    if (!this.registry.canCommunicate(message.sender, receiverId)) {
      throw new Error(
        `Agent '${message.sender}' is not permitted to send to '${receiverId}'`
      );
    }

    // Write message to receiver's inbox
    const inboxPath = path.join(this.basePath, 'bus', 'inboxes', receiverId);
    const fileName = `${message.priority}-${message.timestamp.replace(/[:.]/g, '-')}-${message.id}.json`;
    const filePath = path.join(inboxPath, fileName);

    message.status = 'delivered';
    await fs.writeFile(filePath, JSON.stringify(message, null, 2), 'utf-8');

    console.log(
      `[MessageBus] ${message.sender} -> ${receiverId}: ${message.subject} [${message.type}]`
    );
  }

  private async broadcast(message: AgentMessage): Promise<void> {
    const agents = this.registry.getAvailableAgents();

    for (const agent of agents) {
      if (agent.id === message.sender) continue; // Don't send to self

      try {
        const broadcastMessage = {
          ...message,
          id: uuidv4(), // Unique ID per recipient
          receiver: agent.id as AgentId,
        };
        await this.deliverToAgent(broadcastMessage, agent.id);
      } catch (error) {
        console.warn(
          `[MessageBus] Failed to broadcast to ${agent.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  private async logToOutbox(message: AgentMessage): Promise<void> {
    const outboxPath = path.join(
      this.basePath,
      'bus',
      'outboxes',
      message.sender
    );
    const fileName = `${message.timestamp.replace(/[:.]/g, '-')}-${message.id}.json`;
    await fs.writeFile(
      path.join(outboxPath, fileName),
      JSON.stringify(message, null, 2),
      'utf-8'
    );
  }

  private async logMessage(message: AgentMessage): Promise<void> {
    const logPath = path.join(this.basePath, 'bus', 'log');
    const fileName = `${message.timestamp.replace(/[:.]/g, '-')}-${message.id}.json`;
    await fs.writeFile(
      path.join(logPath, fileName),
      JSON.stringify(message, null, 2),
      'utf-8'
    );
  }

  private async moveToFailed(
    agentId: AgentId,
    fileName: string,
    reason: string
  ): Promise<void> {
    const srcPath = path.join(this.basePath, 'bus', 'inboxes', agentId, fileName);
    const failedPath = path.join(this.basePath, 'bus', 'failed');

    try {
      const content = await fs.readFile(srcPath, 'utf-8');
      const message: AgentMessage = JSON.parse(content);
      message.status = 'failed';

      const failedFileName = `${reason}-${fileName}`;
      await fs.writeFile(
        path.join(failedPath, failedFileName),
        JSON.stringify(message, null, 2),
        'utf-8'
      );
      await fs.unlink(srcPath);
    } catch {
      // File may already be moved
    }
  }

  private isExpired(message: AgentMessage): boolean {
    const created = new Date(message.timestamp).getTime();
    const now = Date.now();
    return now - created > message.ttl * 1000;
  }

  private recordCircuitBreakerFailure(agentId: AgentId): void {
    const cb = this.circuitBreakers.get(agentId);
    if (!cb) return;

    cb.failureCount += 1;
    cb.lastFailure = new Date().toISOString();

    if (cb.failureCount >= cb.threshold) {
      cb.state = 'open';
      console.warn(
        `[MessageBus] Circuit breaker OPENED for ${agentId} after ${cb.failureCount} failures`
      );
    }
  }

  private resetCircuitBreaker(agentId: AgentId): void {
    const cb = this.circuitBreakers.get(agentId);
    if (!cb) return;

    cb.state = 'closed';
    cb.failureCount = 0;
    cb.lastSuccess = new Date().toISOString();
  }
}
