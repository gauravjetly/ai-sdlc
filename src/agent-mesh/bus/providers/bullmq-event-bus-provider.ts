/**
 * BullMQ Event Bus Provider
 *
 * Implements the EventBus interface using Redis-backed BullMQ queues.
 * Provides real-time pub/sub with persistence, retry, and dead-letter queues.
 *
 * Architecture:
 * - One BullMQ Queue per top-level topic (task, workflow, learning, etc.)
 * - Workers process events and dispatch to matching subscribers
 * - Events are persisted to PostgreSQL for replay capability
 * - Dead letter queue for permanently failed events
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EventBus,
  EventHandler,
  EventMetadata,
  MeshEvent,
  Subscription,
  EventBusStats,
} from '../event-bus';
import { RedisConfig } from '../../config';
import { DatabasePool } from '../../database';

export class BullMQEventBusProvider implements EventBus {
  private redisConfig: RedisConfig;
  private pool: DatabasePool | null;
  private subscriptions: Map<string, Subscription> = new Map();
  private publishedCount: number = 0;
  private topics: Set<string> = new Set();

  // BullMQ instances (dynamically imported)
  private queues: Map<string, unknown> = new Map();
  private workers: Map<string, unknown> = new Map();
  private QueueClass: any = null;
  private WorkerClass: any = null;

  constructor(redisConfig: RedisConfig, pool?: DatabasePool) {
    this.redisConfig = redisConfig;
    this.pool = pool || null;
  }

  async initialize(): Promise<void> {
    // Dynamically import BullMQ to avoid requiring it when not configured
    try {
      const bullmq = await import('bullmq');
      this.QueueClass = bullmq.Queue;
      this.WorkerClass = bullmq.Worker;
    } catch (err) {
      throw new Error(
        '[BullMQEventBus] BullMQ package not installed. Run: npm install bullmq'
      );
    }

    // Create default topic queues
    const topLevelTopics = ['task', 'workflow', 'learning', 'conflict', 'agent', 'system'];
    for (const topic of topLevelTopics) {
      await this.ensureQueue(topic);
    }

    console.log('[BullMQEventBus] Initialized with Redis at ' +
      `${this.redisConfig.host}:${this.redisConfig.port}`);
  }

  async publish(
    topic: string,
    payload: Record<string, unknown>,
    metadata: EventMetadata = {}
  ): Promise<MeshEvent> {
    const event: MeshEvent = {
      id: uuidv4(),
      topic,
      payload,
      metadata: {
        traceId: metadata.traceId || uuidv4(),
        sourceAgent: metadata.sourceAgent,
        workflowId: metadata.workflowId,
        taskId: metadata.taskId,
        priority: metadata.priority || 'normal',
        correlationId: metadata.correlationId,
      },
      timestamp: new Date().toISOString(),
    };

    // Determine the top-level queue
    const topLevelTopic = topic.split('.')[0];
    const queue = await this.ensureQueue(topLevelTopic);

    // Add job to BullMQ queue
    const priorityMap: Record<string, number> = {
      critical: 1,
      high: 2,
      normal: 3,
      low: 4,
    };

    await (queue as any).add(topic, event, {
      priority: priorityMap[metadata.priority || 'normal'] || 3,
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    // Persist to PostgreSQL for replay
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO events (id, topic, payload, source_agent, trace_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            event.id,
            event.topic,
            JSON.stringify(event.payload),
            event.metadata.sourceAgent || null,
            event.metadata.traceId || null,
            event.timestamp,
          ]
        );
      } catch (err) {
        console.warn('[BullMQEventBus] Failed to persist event:', (err as Error).message);
      }
    }

    this.publishedCount++;
    this.topics.add(topic);

    return event;
  }

  async subscribe(pattern: string, handler: EventHandler): Promise<Subscription> {
    const subscription: Subscription = {
      id: uuidv4(),
      pattern,
      handler,
    };

    this.subscriptions.set(subscription.id, subscription);

    // Ensure a worker exists for the top-level topic
    const topLevelTopic = pattern.split('.')[0].replace('*', '');
    if (topLevelTopic) {
      await this.ensureWorker(topLevelTopic);
    }

    console.log(`[BullMQEventBus] Subscribed to "${pattern}" (${subscription.id})`);
    return subscription;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  async replay(topic: string, from: Date, to: Date): Promise<MeshEvent[]> {
    if (!this.pool) {
      console.warn('[BullMQEventBus] No database pool for replay. Events not available.');
      return [];
    }

    const result = await this.pool.query<{
      id: string;
      topic: string;
      payload: string;
      source_agent: string | null;
      trace_id: string | null;
      created_at: string;
    }>(
      `SELECT id, topic, payload, source_agent, trace_id, created_at::text
       FROM events
       WHERE topic = $1 AND created_at >= $2 AND created_at <= $3
       ORDER BY created_at ASC`,
      [topic, from.toISOString(), to.toISOString()]
    );

    return result.rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      metadata: {
        sourceAgent: (row.source_agent as any) || undefined,
        traceId: row.trace_id || undefined,
      },
      timestamp: row.created_at,
    }));
  }

  async getByTraceId(traceId: string): Promise<MeshEvent[]> {
    if (!this.pool) return [];

    const result = await this.pool.query<{
      id: string;
      topic: string;
      payload: string;
      source_agent: string | null;
      trace_id: string | null;
      created_at: string;
    }>(
      `SELECT id, topic, payload, source_agent, trace_id, created_at::text
       FROM events
       WHERE trace_id = $1
       ORDER BY created_at ASC`,
      [traceId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      metadata: {
        sourceAgent: (row.source_agent as any) || undefined,
        traceId: row.trace_id || undefined,
      },
      timestamp: row.created_at,
    }));
  }

  getStats(): EventBusStats {
    return {
      provider: 'bullmq',
      subscriberCount: this.subscriptions.size,
      topics: Array.from(this.topics),
      publishedCount: this.publishedCount,
    };
  }

  async shutdown(): Promise<void> {
    // Close all workers
    for (const [name, worker] of this.workers) {
      try {
        await (worker as any).close();
      } catch {
        // Ignore close errors
      }
    }
    this.workers.clear();

    // Close all queues
    for (const [name, queue] of this.queues) {
      try {
        await (queue as any).close();
      } catch {
        // Ignore close errors
      }
    }
    this.queues.clear();

    this.subscriptions.clear();
    console.log('[BullMQEventBus] Shut down');
  }

  // ---- Private Methods ----

  private getRedisConnection(): Record<string, unknown> {
    return {
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password || undefined,
      db: this.redisConfig.db,
      maxRetriesPerRequest: this.redisConfig.maxRetriesPerRequest,
    };
  }

  private async ensureQueue(topLevelTopic: string): Promise<unknown> {
    if (this.queues.has(topLevelTopic)) {
      return this.queues.get(topLevelTopic)!;
    }

    const queue = new this.QueueClass(`agent-mesh:${topLevelTopic}`, {
      connection: this.getRedisConnection(),
    });

    this.queues.set(topLevelTopic, queue);
    return queue;
  }

  private async ensureWorker(topLevelTopic: string): Promise<void> {
    if (this.workers.has(topLevelTopic)) return;

    const worker = new this.WorkerClass(
      `agent-mesh:${topLevelTopic}`,
      async (job: any) => {
        const event: MeshEvent = job.data;

        // Dispatch to matching subscribers
        for (const [, sub] of this.subscriptions) {
          if (this.matchesPattern(event.topic, sub.pattern)) {
            try {
              await sub.handler(event);
            } catch (err) {
              console.error(
                `[BullMQEventBus] Subscriber ${sub.id} error for ${event.topic}:`,
                (err as Error).message
              );
              throw err; // Rethrow for BullMQ retry
            }
          }
        }
      },
      {
        connection: this.getRedisConnection(),
        concurrency: 5,
      }
    );

    worker.on('failed', (job: any, err: Error) => {
      console.error(
        `[BullMQEventBus] Job ${job?.id} failed for topic ${job?.name}:`,
        err.message
      );
    });

    this.workers.set(topLevelTopic, worker);
  }

  /**
   * Match a topic against a subscription pattern.
   * Supports wildcards: "task.*" matches "task.completed", etc.
   */
  private matchesPattern(topic: string, pattern: string): boolean {
    if (pattern === topic) return true;

    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+');
    const regex = new RegExp(`^${regexStr}$`);

    return regex.test(topic);
  }
}
