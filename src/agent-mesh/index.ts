/**
 * Agent Mesh - Inter-Agent Communication & Collective Learning System
 *
 * The central orchestration layer that enables agents to:
 * 1. Discover and address each other through the Agent Registry
 * 2. Communicate through the Message Bus (file-based or BullMQ)
 * 3. Share knowledge through Collective Memory (file-based or PostgreSQL+pgvector)
 * 4. Learn from each other through the Learning Engine
 * 5. Resolve disagreements through Conflict Resolution
 * 6. Track all activity through the Audit Log
 * 7. Publish and subscribe to events via the Event Bus
 *
 * Architecture:
 *
 *   +-----------+    +-----------+    +-----------+
 *   |  Agent A  |    |  Agent B  |    |  Agent C  |
 *   +-----+-----+    +-----+-----+    +-----+-----+
 *         |                |                |
 *         +--------+-------+-------+--------+
 *                  |               |
 *         +--------v--------+  +---v-----------+
 *         |   Message Bus   |  | Agent Registry |
 *         +--------+--------+  +---+------------+
 *                  |               |
 *         +--------v--------+     |
 *         | Learning Engine +-----+
 *         +--------+--------+
 *                  |
 *    +-------------v-----------+
 *    |   Memory Service        |
 *    |   (File or PostgreSQL)  |
 *    +-------------+-----------+
 *                  |
 *    +-------------v-----------+
 *    |   Event Bus             |
 *    |   (File or BullMQ)      |
 *    +-------------+-----------+
 *                  |
 *    +-------------v-----------+
 *    | Conflict Resolution     |
 *    +-------------+-----------+
 *                  |
 *    +-------------v-----------+
 *    |      Audit Log          |
 *    +-------------------------+
 *
 * Provider Selection:
 *   STORAGE=file|postgres     (default: file)
 *   EVENT_BUS=file|bullmq     (default: file)
 */

import { AgentRegistry } from './registry/agent-registry';
import { MessageBus, SendMessageOptions } from './bus/message-bus';
import { CollectiveMemory, AddKnowledgeOptions, SearchKnowledgeOptions } from './memory/collective-memory';
import { LearningEngine } from './learning/learning-engine';
import { ConflictResolver } from './protocols/conflict-resolution';
import { AuditLog } from './audit/audit-log';
import {
  AgentId,
  AgentProfile,
  AgentMessage,
  CollectiveKnowledge,
  LearningEvent,
  LearningTrigger,
  KnowledgeCategory,
  ConflictRecord,
  ConflictPosition,
  AgentMeshConfig,
  DEFAULT_MESH_CONFIG,
} from './types';

// New Phase 1 imports
import { loadPlatformConfig, PlatformConfig } from './config';
import { MemoryService } from './memory/memory-service';
import { FileMemoryProvider } from './memory/providers/file-memory-provider';
import { EventBus, MeshEvent, EventMetadata, EventHandler, Subscription } from './bus/event-bus';
import { FileEventBusProvider } from './bus/providers/file-event-bus-provider';

// Re-export types
export * from './types';
export { AgentRegistry } from './registry/agent-registry';
export { MessageBus } from './bus/message-bus';
export { CollectiveMemory } from './memory/collective-memory';
export { LearningEngine } from './learning/learning-engine';
export { ConflictResolver } from './protocols/conflict-resolution';
export { AuditLog } from './audit/audit-log';

// Re-export new Phase 1 types and interfaces
export { PlatformConfig, loadPlatformConfig, StorageProvider, EventBusProvider } from './config';
export { MemoryService, StoreKnowledgeInput, SearchKnowledgeOptions as MemorySearchOptions } from './memory/memory-service';
export { EventBus, MeshEvent, EventMetadata, EventHandler, Subscription } from './bus/event-bus';
export { FileMemoryProvider } from './memory/providers/file-memory-provider';
export { FileEventBusProvider } from './bus/providers/file-event-bus-provider';
export { DatabasePool, createDatabasePool } from './database';
export { EmbeddingService, createEmbeddingService } from './embedding';

/**
 * Main AgentMesh class - unified facade for the entire inter-agent system
 *
 * Now supports provider-based configuration:
 * - MemoryService: file-based or PostgreSQL+pgvector
 * - EventBus: file-based or BullMQ
 */
export class AgentMesh {
  readonly registry: AgentRegistry;
  readonly messageBus: MessageBus;
  readonly collectiveMemory: CollectiveMemory;
  readonly learningEngine: LearningEngine;
  readonly conflictResolver: ConflictResolver;
  readonly auditLog: AuditLog;

  // New Phase 1 components
  readonly memoryService: MemoryService;
  readonly eventBus: EventBus;
  readonly platformConfig: PlatformConfig;

  private config: AgentMeshConfig;
  private initialized: boolean = false;

  constructor(config: Partial<AgentMeshConfig> = {}) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.platformConfig = loadPlatformConfig();

    // Initialize all components
    this.registry = new AgentRegistry(this.config);
    this.collectiveMemory = new CollectiveMemory(this.config);
    this.auditLog = new AuditLog(this.config);
    this.messageBus = new MessageBus(this.registry, this.config);
    this.learningEngine = new LearningEngine(
      this.collectiveMemory,
      this.messageBus,
      this.registry,
      this.config
    );
    this.conflictResolver = new ConflictResolver(
      this.registry,
      this.collectiveMemory,
      this.config
    );

    // Initialize provider-based components
    // Memory Service: default to file-based provider
    this.memoryService = new FileMemoryProvider(this.config);

    // Event Bus: default to file-based provider
    this.eventBus = new FileEventBusProvider(this.config);
  }

  /**
   * Initialize the entire agent mesh
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[AgentMesh] Already initialized');
      return;
    }

    console.log('[AgentMesh] Initializing...');
    console.log(`[AgentMesh] Storage provider: ${this.platformConfig.storage}`);
    console.log(`[AgentMesh] Event bus provider: ${this.platformConfig.eventBus}`);

    // Initialize core components (always needed)
    await this.registry.initialize();
    await this.collectiveMemory.initialize();
    await this.auditLog.initialize();
    await this.messageBus.initialize();
    await this.learningEngine.initialize();
    await this.conflictResolver.initialize();

    // Initialize provider-based components
    await this.initializeProviders();

    this.initialized = true;
    console.log('[AgentMesh] Initialization complete');

    // Record initialization in audit
    await this.auditLog.record('agent-registered', 'conductor', {
      event: 'Agent mesh initialized',
      agentCount: this.registry.getAllAgents().length,
      storageProvider: this.platformConfig.storage,
      eventBusProvider: this.platformConfig.eventBus,
    });
  }

  /**
   * Initialize the storage and event bus providers based on configuration.
   */
  private async initializeProviders(): Promise<void> {
    // Initialize memory service provider
    if (this.platformConfig.storage === 'postgres') {
      try {
        const { createDatabasePool } = await import('./database');
        const { createEmbeddingService } = await import('./embedding');
        const { PostgresMemoryProvider } = await import('./memory/providers/postgres-memory-provider');

        const pool = await createDatabasePool(this.platformConfig.database);
        const embedding = createEmbeddingService(this.platformConfig.embedding);
        const postgresProvider = new PostgresMemoryProvider(pool, embedding);
        await postgresProvider.initialize();

        // Replace the default file-based provider
        (this as any).memoryService = postgresProvider;
        console.log('[AgentMesh] Using PostgreSQL memory provider with pgvector');
      } catch (err) {
        console.warn(
          '[AgentMesh] Failed to initialize PostgreSQL provider, falling back to file-based:',
          (err as Error).message
        );
        await this.memoryService.initialize();
      }
    } else {
      await this.memoryService.initialize();
    }

    // Initialize event bus provider
    if (this.platformConfig.eventBus === 'bullmq') {
      try {
        const { BullMQEventBusProvider } = await import('./bus/providers/bullmq-event-bus-provider');
        let pool = undefined;

        // If we have a postgres pool, pass it for event persistence
        if (this.platformConfig.storage === 'postgres') {
          try {
            const { createDatabasePool } = await import('./database');
            pool = await createDatabasePool(this.platformConfig.database);
          } catch {
            // Event persistence without DB is OK
          }
        }

        const bullmqProvider = new BullMQEventBusProvider(this.platformConfig.redis, pool);
        await bullmqProvider.initialize();

        (this as any).eventBus = bullmqProvider;
        console.log('[AgentMesh] Using BullMQ event bus provider');
      } catch (err) {
        console.warn(
          '[AgentMesh] Failed to initialize BullMQ provider, falling back to file-based:',
          (err as Error).message
        );
        await this.eventBus.initialize();
      }
    } else {
      await this.eventBus.initialize();
    }
  }

  // ================================================================
  // Communication Methods (unchanged for backward compatibility)
  // ================================================================

  /**
   * Send a message from one agent to another
   */
  async sendMessage(options: SendMessageOptions): Promise<AgentMessage> {
    this.ensureInitialized();

    const message = await this.messageBus.send(options);

    // Audit
    await this.auditLog.record(
      'message-sent',
      options.sender,
      {
        messageId: message.id,
        type: options.type,
        subject: options.subject,
        receiver: options.receiver,
      },
      {
        targetAgentId: options.receiver === 'all' ? undefined : options.receiver as AgentId,
        messageId: message.id,
      }
    );

    // Also publish to event bus
    await this.eventBus.publish('agent.message-sent', {
      messageId: message.id,
      sender: options.sender,
      receiver: options.receiver,
      type: options.type,
      subject: options.subject,
    }, {
      sourceAgent: options.sender,
    });

    return message;
  }

  /**
   * Read messages from an agent's inbox
   */
  async readMessages(
    agentId: AgentId,
    options?: { priority?: any; type?: any; limit?: number }
  ): Promise<AgentMessage[]> {
    this.ensureInitialized();
    return this.messageBus.readInbox(agentId, options);
  }

  /**
   * Acknowledge (complete) a message
   */
  async acknowledgeMessage(
    agentId: AgentId,
    messageId: string
  ): Promise<void> {
    this.ensureInitialized();
    await this.messageBus.acknowledge(agentId, messageId);

    await this.auditLog.record('message-processed', agentId, {
      messageId,
      action: 'acknowledged',
    }, { messageId });
  }

  /**
   * Request help from another agent
   */
  async requestHelp(
    fromAgent: AgentId,
    toAgent: AgentId,
    subject: string,
    details: string,
    context?: Partial<import('./types').MessageContext>
  ): Promise<AgentMessage> {
    return this.sendMessage({
      type: 'request',
      priority: 'high',
      sender: fromAgent,
      receiver: toAgent,
      subject: `Help Request: ${subject}`,
      content: details,
      context,
    });
  }

  /**
   * Broadcast a notification to all agents
   */
  async broadcast(
    fromAgent: AgentId,
    subject: string,
    content: string,
    priority: import('./types').MessagePriority = 'normal'
  ): Promise<AgentMessage> {
    return this.sendMessage({
      type: 'broadcast',
      priority,
      sender: fromAgent,
      receiver: 'all',
      subject,
      content,
    });
  }

  // ================================================================
  // Discovery Methods (unchanged)
  // ================================================================

  findAgentForTopic(topic: string): AgentProfile[] {
    this.ensureInitialized();
    return this.registry.findBestAgentForTopic(topic);
  }

  getAgent(agentId: AgentId): AgentProfile | undefined {
    this.ensureInitialized();
    return this.registry.getAgent(agentId);
  }

  getAvailableAgents(): AgentProfile[] {
    this.ensureInitialized();
    return this.registry.getAvailableAgents();
  }

  // ================================================================
  // Learning Methods (unchanged)
  // ================================================================

  async reportLearning(
    sourceAgent: AgentId,
    trigger: LearningTrigger,
    title: string,
    description: string,
    category: KnowledgeCategory,
    context?: {
      projectId?: string;
      workItemId?: string;
      phase?: string;
    }
  ): Promise<LearningEvent> {
    this.ensureInitialized();

    const event = await this.learningEngine.captureLearning(
      trigger,
      sourceAgent,
      { title, description, category },
      context
    );

    await this.auditLog.record('learning-created', sourceAgent, {
      learningId: event.id,
      title,
      category,
      targetAgents: event.targetAgents,
    });

    // Publish learning event to event bus
    await this.eventBus.publish('learning.discovered', {
      learningId: event.id,
      title,
      category,
      sourceAgent,
      targetAgents: event.targetAgents,
    }, {
      sourceAgent,
    });

    return event;
  }

  async analyzeForLearnings(
    agentId: AgentId,
    output: string,
    context?: { projectId?: string; workItemId?: string; phase?: string }
  ): Promise<LearningEvent[]> {
    this.ensureInitialized();
    return this.learningEngine.analyzeForLearnings(agentId, output, context);
  }

  async getAgentBriefing(agentId: AgentId): Promise<string> {
    this.ensureInitialized();
    return this.learningEngine.generateAgentBriefing(agentId);
  }

  // ================================================================
  // Knowledge Methods (now uses MemoryService)
  // ================================================================

  /**
   * Add knowledge to the collective memory.
   * Uses the configured MemoryService provider.
   */
  async addKnowledge(options: AddKnowledgeOptions): Promise<CollectiveKnowledge> {
    this.ensureInitialized();

    // Use MemoryService if we have a non-file provider
    if (this.platformConfig.storage === 'postgres') {
      const knowledge = await this.memoryService.storeKnowledge({
        category: options.category,
        title: options.title,
        content: options.content,
        confidence: options.confidence,
        sourceAgent: options.sourceAgent,
        applicableAgents: options.applicableAgents,
        tags: options.tags,
        evidence: options.evidence,
      });

      await this.auditLog.record('knowledge-updated', options.sourceAgent, {
        knowledgeId: knowledge.id,
        title: options.title,
        category: options.category,
        provider: 'postgres',
      });

      return knowledge;
    }

    // Fall back to original CollectiveMemory for file-based
    const knowledge = await this.collectiveMemory.addKnowledge(options);

    await this.auditLog.record('knowledge-updated', options.sourceAgent, {
      knowledgeId: knowledge.id,
      title: options.title,
      category: options.category,
      provider: 'file',
    });

    return knowledge;
  }

  /**
   * Search collective knowledge.
   * Uses the configured MemoryService provider.
   */
  async searchKnowledge(options?: SearchKnowledgeOptions): Promise<CollectiveKnowledge[]> {
    this.ensureInitialized();

    if (this.platformConfig.storage === 'postgres') {
      return this.memoryService.searchKnowledge({
        query: options?.query,
        category: options?.category,
        agent: options?.agent,
        confidence: options?.confidence,
        tags: options?.tags,
        limit: options?.limit,
        includeDeprecated: options?.includeDeprecated,
        hybrid: true,
      });
    }

    return this.collectiveMemory.search(options);
  }

  // ================================================================
  // Event Bus Methods (new in Phase 1)
  // ================================================================

  /**
   * Publish an event to the event bus.
   */
  async publishEvent(
    topic: string,
    payload: Record<string, unknown>,
    metadata?: EventMetadata
  ): Promise<MeshEvent> {
    this.ensureInitialized();
    return this.eventBus.publish(topic, payload, metadata);
  }

  /**
   * Subscribe to events on the event bus.
   */
  async subscribeToEvents(
    pattern: string,
    handler: EventHandler
  ): Promise<Subscription> {
    this.ensureInitialized();
    return this.eventBus.subscribe(pattern, handler);
  }

  /**
   * Unsubscribe from events.
   */
  async unsubscribeFromEvents(subscriptionId: string): Promise<void> {
    this.ensureInitialized();
    return this.eventBus.unsubscribe(subscriptionId);
  }

  /**
   * Replay events from a topic within a time range.
   */
  async replayEvents(topic: string, from: Date, to: Date): Promise<MeshEvent[]> {
    this.ensureInitialized();
    return this.eventBus.replay(topic, from, to);
  }

  // ================================================================
  // Conflict Resolution Methods (unchanged)
  // ================================================================

  async registerConflict(
    agents: AgentId[],
    subject: string,
    positions: ConflictPosition[]
  ): Promise<ConflictRecord> {
    this.ensureInitialized();

    const conflict = await this.conflictResolver.registerConflict(
      agents,
      subject,
      positions
    );

    await this.auditLog.record('conflict-detected', agents[0], {
      conflictId: conflict.id,
      subject,
      agents,
    });

    // Publish to event bus
    await this.eventBus.publish('conflict.raised', {
      conflictId: conflict.id,
      subject,
      agents,
    });

    return conflict;
  }

  async resolveConflict(conflictId: string): Promise<ConflictRecord | null> {
    this.ensureInitialized();

    const result = await this.conflictResolver.resolveConflict(conflictId);

    if (result?.status === 'resolved') {
      await this.auditLog.record(
        'conflict-resolved',
        result.resolution?.resolvedBy === 'user'
          ? 'conductor'
          : (result.resolution?.resolvedBy as AgentId),
        {
          conflictId: result.id,
          method: result.resolution?.method,
          outcome: result.resolution?.outcome,
        }
      );

      // Publish to event bus
      await this.eventBus.publish('conflict.resolved', {
        conflictId: result.id,
        method: result.resolution?.method,
        outcome: result.resolution?.outcome,
      });
    }

    return result;
  }

  // ================================================================
  // Health & Monitoring Methods
  // ================================================================

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
  }> {
    this.ensureInitialized();

    const agents = this.registry.getAllAgents();
    const offlineCount = agents.filter((a) => a.status === 'offline').length;
    const index = await this.collectiveMemory.getIndex();
    const auditStats = await this.auditLog.getStats(1);

    // Check circuit breakers
    const openBreakers: string[] = [];
    for (const agent of agents) {
      const cb = this.messageBus.getCircuitBreakerState(agent.id);
      if (cb && cb.state === 'open') {
        openBreakers.push(agent.id);
      }
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (openBreakers.length > 0 || offlineCount > 2) {
      status = 'degraded';
    }
    if (offlineCount > agents.length / 2 || auditStats.successRate < 0.5) {
      status = 'unhealthy';
    }

    // Get event bus stats
    const eventBusStats = this.eventBus.getStats();

    // Get memory service stats
    let memoryStats;
    try {
      memoryStats = await this.memoryService.getStats();
    } catch {
      memoryStats = { provider: 'unknown', totalItems: 0 };
    }

    return {
      status,
      components: {
        registry: {
          totalAgents: agents.length,
          available: agents.filter((a) => a.status === 'available').length,
          busy: agents.filter((a) => a.status === 'busy').length,
          offline: offlineCount,
        },
        collectiveMemory: {
          totalKnowledge: index.totalItems,
          categories: Object.keys(index.categories).length,
        },
        memoryService: memoryStats,
        messageBus: {
          circuitBreakers: {
            open: openBreakers,
            totalOpen: openBreakers.length,
          },
        },
        eventBus: eventBusStats,
        audit: {
          eventsLast24h: auditStats.totalEvents,
          successRate: `${(auditStats.successRate * 100).toFixed(1)}%`,
          recentErrors: auditStats.recentErrors.length,
        },
      },
    };
  }

  async generateAuditReport(days: number = 7): Promise<string> {
    this.ensureInitialized();
    return this.auditLog.generateReport(days);
  }

  async generateKnowledgeReport(): Promise<string> {
    this.ensureInitialized();

    if (this.platformConfig.storage === 'postgres') {
      return this.memoryService.exportReport();
    }

    return this.collectiveMemory.exportReport();
  }

  async cleanup(): Promise<{ messages: any; audit: number }> {
    this.ensureInitialized();
    const messages = await this.messageBus.cleanup();
    const audit = await this.auditLog.cleanup();
    return { messages, audit };
  }

  /**
   * Gracefully shutdown all components.
   */
  async shutdown(): Promise<void> {
    console.log('[AgentMesh] Shutting down...');

    try {
      await this.eventBus.shutdown();
    } catch {
      // Ignore shutdown errors
    }

    try {
      await this.memoryService.shutdown();
    } catch {
      // Ignore shutdown errors
    }

    this.initialized = false;
    console.log('[AgentMesh] Shutdown complete');
  }

  // ================================================================
  // Private Methods
  // ================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'AgentMesh not initialized. Call initialize() first.'
      );
    }
  }
}

/**
 * Create and initialize an AgentMesh instance
 */
export async function createAgentMesh(
  config: Partial<AgentMeshConfig> = {}
): Promise<AgentMesh> {
  const mesh = new AgentMesh(config);
  await mesh.initialize();
  return mesh;
}
