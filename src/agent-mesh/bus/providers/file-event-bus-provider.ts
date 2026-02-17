/**
 * File-Based Event Bus Provider
 *
 * Wraps the existing MessageBus to implement the EventBus interface.
 * Events are stored as JSON files in topic directories.
 * This preserves backward compatibility with the original file-based system.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  EventBus,
  EventHandler,
  EventMetadata,
  MeshEvent,
  Subscription,
  EventBusStats,
} from '../event-bus';
import { AgentMeshConfig, DEFAULT_MESH_CONFIG } from '../../types';

export class FileEventBusProvider implements EventBus {
  private basePath: string;
  private eventsPath: string;
  private config: AgentMeshConfig;
  private subscriptions: Map<string, Subscription> = new Map();
  private publishedCount: number = 0;
  private topics: Set<string> = new Set();

  constructor(config: Partial<AgentMeshConfig> = {}) {
    this.config = { ...DEFAULT_MESH_CONFIG, ...config };
    this.basePath = this.config.basePath.replace('~', os.homedir());
    this.eventsPath = path.join(this.basePath, 'events');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.eventsPath, { recursive: true });
    console.log('[FileEventBus] Initialized');
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

    // Store the event in a topic directory
    const topicDir = path.join(this.eventsPath, topic.replace(/\./g, '/'));
    await fs.mkdir(topicDir, { recursive: true });

    const fileName = `${event.timestamp.replace(/[:.]/g, '-')}-${event.id}.json`;
    await fs.writeFile(
      path.join(topicDir, fileName),
      JSON.stringify(event, null, 2),
      'utf-8'
    );

    this.publishedCount++;
    this.topics.add(topic);

    // Notify matching subscribers (synchronous delivery for file-based)
    for (const [, sub] of this.subscriptions) {
      if (this.matchesPattern(topic, sub.pattern)) {
        try {
          await sub.handler(event);
        } catch (err) {
          console.error(
            `[FileEventBus] Subscriber ${sub.id} error for topic ${topic}:`,
            (err as Error).message
          );
        }
      }
    }

    return event;
  }

  async subscribe(pattern: string, handler: EventHandler): Promise<Subscription> {
    const subscription: Subscription = {
      id: uuidv4(),
      pattern,
      handler,
    };
    this.subscriptions.set(subscription.id, subscription);
    console.log(`[FileEventBus] Subscribed to "${pattern}" (${subscription.id})`);
    return subscription;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  async replay(topic: string, from: Date, to: Date): Promise<MeshEvent[]> {
    const events: MeshEvent[] = [];
    const topicDir = path.join(this.eventsPath, topic.replace(/\./g, '/'));

    try {
      const files = await fs.readdir(topicDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const content = await fs.readFile(
          path.join(topicDir, file),
          'utf-8'
        );
        const event: MeshEvent = JSON.parse(content);
        const eventTime = new Date(event.timestamp);

        if (eventTime >= from && eventTime <= to) {
          events.push(event);
        }
      }
    } catch {
      // Topic directory may not exist
    }

    return events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async getByTraceId(traceId: string): Promise<MeshEvent[]> {
    const events: MeshEvent[] = [];

    try {
      const topicDirs = await this.getAllTopicDirs(this.eventsPath);

      for (const dir of topicDirs) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const content = await fs.readFile(
            path.join(dir, file),
            'utf-8'
          );
          const event: MeshEvent = JSON.parse(content);

          if (event.metadata.traceId === traceId) {
            events.push(event);
          }
        }
      }
    } catch {
      // Events directory may not exist
    }

    return events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  getStats(): EventBusStats {
    return {
      provider: 'file',
      subscriberCount: this.subscriptions.size,
      topics: Array.from(this.topics),
      publishedCount: this.publishedCount,
    };
  }

  async shutdown(): Promise<void> {
    this.subscriptions.clear();
  }

  // ---- Private Methods ----

  /**
   * Match a topic against a subscription pattern.
   * Supports wildcards: "task.*" matches "task.completed", "task.failed", etc.
   */
  private matchesPattern(topic: string, pattern: string): boolean {
    if (pattern === topic) return true;

    // Convert pattern to regex
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+');
    const regex = new RegExp(`^${regexStr}$`);

    return regex.test(topic);
  }

  /**
   * Recursively find all directories under the events path.
   */
  private async getAllTopicDirs(dir: string): Promise<string[]> {
    const dirs: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          dirs.push(fullPath);
          const subDirs = await this.getAllTopicDirs(fullPath);
          dirs.push(...subDirs);
        }
      }
    } catch {
      // Directory may not exist
    }

    return dirs;
  }
}
