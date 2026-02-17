/**
 * Phase 1 Foundation Enhancement Tests
 *
 * Tests for the new Phase 1 components:
 * 1. Configuration system
 * 2. MemoryService abstraction with FileMemoryProvider
 * 3. EventBus abstraction with FileEventBusProvider
 * 4. Embedding service (no-op mode for testing)
 * 5. Backward compatibility (all original tests must still pass)
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { AgentMesh, createAgentMesh, AgentMeshConfig } from '../index';
import { loadPlatformConfig, PlatformConfig } from '../config';
import { FileMemoryProvider } from '../memory/providers/file-memory-provider';
import { FileEventBusProvider } from '../bus/providers/file-event-bus-provider';
import { createEmbeddingService } from '../embedding';
import { MeshEvent } from '../bus/event-bus';

// Use temporary directory for tests
const TEST_BASE = path.join(os.tmpdir(), 'agent-mesh-phase1-test-' + Date.now());

const TEST_CONFIG: Partial<AgentMeshConfig> = {
  basePath: TEST_BASE,
  messageTTL: 3600,
  maxRetries: 2,
  loopDetectionDepth: 5,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 1000,
};

let mesh: AgentMesh;

beforeAll(async () => {
  // Ensure STORAGE=file and EVENT_BUS=file for these tests
  process.env.STORAGE = 'file';
  process.env.EVENT_BUS = 'file';

  mesh = await createAgentMesh(TEST_CONFIG);
});

afterAll(async () => {
  await mesh.shutdown();
  await fs.rm(TEST_BASE, { recursive: true, force: true });
  delete process.env.STORAGE;
  delete process.env.EVENT_BUS;
});

// ================================================================
// Configuration Tests
// ================================================================

describe('Platform Configuration', () => {
  test('should load default configuration', () => {
    const config = loadPlatformConfig();
    expect(config.storage).toBe('file');
    expect(config.eventBus).toBe('file');
    expect(config.database.host).toBe('localhost');
    expect(config.database.port).toBe(5432);
    expect(config.redis.host).toBe('localhost');
    expect(config.redis.port).toBe(6379);
    expect(config.embedding.model).toBe('text-embedding-3-large');
    expect(config.embedding.dimensions).toBe(3072);
  });

  test('should respect environment variable overrides', () => {
    const originalStorage = process.env.STORAGE;
    process.env.STORAGE = 'postgres';

    const config = loadPlatformConfig();
    expect(config.storage).toBe('postgres');

    process.env.STORAGE = originalStorage || 'file';
  });
});

// ================================================================
// Memory Service (File Provider) Tests
// ================================================================

describe('FileMemoryProvider', () => {
  let memoryProvider: FileMemoryProvider;

  beforeAll(async () => {
    memoryProvider = new FileMemoryProvider({
      ...TEST_CONFIG,
      basePath: path.join(TEST_BASE, 'memory-provider-test'),
    } as AgentMeshConfig);
    await memoryProvider.initialize();
  });

  test('should store and retrieve knowledge', async () => {
    const knowledge = await memoryProvider.storeKnowledge({
      category: 'best-practice',
      title: 'Use parameterized queries for SQL',
      content: 'Always use parameterized queries to prevent SQL injection.',
      confidence: 'proven',
      sourceAgent: 'security',
      applicableAgents: ['engineer', 'qa'],
      tags: ['security', 'sql', 'injection'],
    });

    expect(knowledge.id).toBeDefined();
    expect(knowledge.title).toBe('Use parameterized queries for SQL');
    expect(knowledge.confidence).toBe('proven');
  });

  test('should search knowledge by query', async () => {
    const results = await memoryProvider.searchKnowledge({
      query: 'SQL injection',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('parameterized');
  });

  test('should search knowledge by agent', async () => {
    const results = await memoryProvider.searchKnowledge({
      agent: 'engineer',
    });

    for (const result of results) {
      expect(result.applicableAgents).toContain('engineer');
    }
  });

  test('should get stats', async () => {
    const stats = await memoryProvider.getStats();
    expect(stats.provider).toBe('file');
    expect(stats.totalItems).toBeGreaterThan(0);
  });

  test('should export report', async () => {
    const report = await memoryProvider.exportReport();
    expect(report).toContain('Collective Knowledge Report');
  });
});

// ================================================================
// Event Bus (File Provider) Tests
// ================================================================

describe('FileEventBusProvider', () => {
  let eventBus: FileEventBusProvider;

  beforeAll(async () => {
    eventBus = new FileEventBusProvider({
      ...TEST_CONFIG,
      basePath: path.join(TEST_BASE, 'eventbus-test'),
    } as AgentMeshConfig);
    await eventBus.initialize();
  });

  afterAll(async () => {
    await eventBus.shutdown();
  });

  test('should publish events', async () => {
    const event = await eventBus.publish('task.completed', {
      taskId: 'test-task-1',
      agentId: 'engineer',
      status: 'success',
    }, {
      sourceAgent: 'engineer',
    });

    expect(event.id).toBeDefined();
    expect(event.topic).toBe('task.completed');
    expect(event.payload.taskId).toBe('test-task-1');
    expect(event.metadata.sourceAgent).toBe('engineer');
    expect(event.timestamp).toBeDefined();
  });

  test('should deliver events to exact-match subscribers', async () => {
    const received: MeshEvent[] = [];

    await eventBus.subscribe('task.started', async (event) => {
      received.push(event);
    });

    await eventBus.publish('task.started', {
      taskId: 'test-task-2',
    });

    expect(received.length).toBe(1);
    expect(received[0].topic).toBe('task.started');
  });

  test('should deliver events to wildcard subscribers', async () => {
    const received: MeshEvent[] = [];

    await eventBus.subscribe('workflow.*', async (event) => {
      received.push(event);
    });

    await eventBus.publish('workflow.created', { workflowId: 'wf-1' });
    await eventBus.publish('workflow.completed', { workflowId: 'wf-1' });

    expect(received.length).toBe(2);
    expect(received[0].topic).toBe('workflow.created');
    expect(received[1].topic).toBe('workflow.completed');
  });

  test('should not deliver events to non-matching subscribers', async () => {
    const received: MeshEvent[] = [];

    await eventBus.subscribe('learning.*', async (event) => {
      received.push(event);
    });

    await eventBus.publish('task.failed', { taskId: 'test-task-3' });

    expect(received.length).toBe(0);
  });

  test('should unsubscribe', async () => {
    const received: MeshEvent[] = [];

    const sub = await eventBus.subscribe('system.*', async (event) => {
      received.push(event);
    });

    await eventBus.publish('system.health', { status: 'ok' });
    expect(received.length).toBe(1);

    await eventBus.unsubscribe(sub.id);

    await eventBus.publish('system.health', { status: 'ok' });
    expect(received.length).toBe(1); // Should not increase
  });

  test('should replay events by topic and time range', async () => {
    const from = new Date(Date.now() - 60000); // 1 minute ago
    const to = new Date(Date.now() + 60000); // 1 minute from now

    const events = await eventBus.replay('task.completed', from, to);
    expect(events.length).toBeGreaterThan(0);
  });

  test('should get event bus stats', () => {
    const stats = eventBus.getStats();
    expect(stats.provider).toBe('file');
    expect(stats.publishedCount).toBeGreaterThan(0);
    expect(stats.subscriberCount).toBeGreaterThan(0);
  });
});

// ================================================================
// Embedding Service Tests
// ================================================================

describe('Embedding Service (No-Op Mode)', () => {
  test('should create no-op service when no API key provided', () => {
    const service = createEmbeddingService({
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3072,
      apiKey: undefined,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    expect(service.getDimensions()).toBe(3072);
  });

  test('should return zero vectors from no-op service', async () => {
    const service = createEmbeddingService({
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3072,
      apiKey: undefined,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    const embedding = await service.embed('test text');
    expect(embedding.length).toBe(3072);
    expect(embedding.every((v) => v === 0)).toBe(true);
  });

  test('should batch embed from no-op service', async () => {
    const service = createEmbeddingService({
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3072,
      apiKey: undefined,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
    });

    const embeddings = await service.embedBatch(['text1', 'text2', 'text3']);
    expect(embeddings.length).toBe(3);
    for (const emb of embeddings) {
      expect(emb.length).toBe(3072);
    }
  });
});

// ================================================================
// AgentMesh Integration with New Components Tests
// ================================================================

describe('AgentMesh with Phase 1 Components', () => {
  test('should expose platformConfig', () => {
    expect(mesh.platformConfig).toBeDefined();
    expect(mesh.platformConfig.storage).toBe('file');
    expect(mesh.platformConfig.eventBus).toBe('file');
  });

  test('should expose memoryService', () => {
    expect(mesh.memoryService).toBeDefined();
  });

  test('should expose eventBus', () => {
    expect(mesh.eventBus).toBeDefined();
  });

  test('should publish and receive events through AgentMesh', async () => {
    const received: MeshEvent[] = [];

    await mesh.subscribeToEvents('task.*', async (event) => {
      received.push(event);
    });

    await mesh.publishEvent('task.completed', {
      taskId: 'mesh-task-1',
      result: 'success',
    }, {
      sourceAgent: 'engineer',
    });

    expect(received.length).toBe(1);
    expect(received[0].topic).toBe('task.completed');
    expect(received[0].payload.taskId).toBe('mesh-task-1');
  });

  test('should include event bus stats in health check', async () => {
    const health = await mesh.healthCheck();
    expect(health.components.eventBus).toBeDefined();
    expect(health.components.eventBus.provider).toBe('file');
    expect(health.components.memoryService).toBeDefined();
    expect(health.components.memoryService.provider).toBe('file');
  });

  test('should gracefully shutdown', async () => {
    // Create a temporary mesh for shutdown test
    const tempMesh = await createAgentMesh({
      basePath: path.join(TEST_BASE, 'shutdown-test'),
    });

    await tempMesh.shutdown();
    // Should not throw
  });
});

// ================================================================
// BACKWARD COMPATIBILITY (Regression Tests)
// All original agent-mesh.test.ts tests ported here
// ================================================================

describe('BACKWARD COMPATIBILITY: Agent Registry', () => {
  test('should initialize with default agents', () => {
    const agents = mesh.registry.getAllAgents();
    expect(agents.length).toBe(12);
  });

  test('should find agents by capability', () => {
    const securityAgents = mesh.registry.findByCapability('security-review');
    expect(securityAgents.length).toBe(1);
    expect(securityAgents[0].id).toBe('security');
  });

  test('should find agents by expertise', () => {
    const agents = mesh.registry.findByExpertise('TypeScript');
    expect(agents.some((a) => a.id === 'engineer')).toBe(true);
  });

  test('should find best agent for a topic', () => {
    const agents = mesh.registry.findBestAgentForTopic(
      'security vulnerability in authentication'
    );
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0].id).toBe('security');
  });

  test('should check communication permissions', () => {
    expect(mesh.registry.canCommunicate('conductor', 'ba')).toBe(true);
    expect(mesh.registry.canCommunicate('ba', 'conductor')).toBe(true);
  });
});

describe('BACKWARD COMPATIBILITY: Message Bus', () => {
  test('should send a message between agents', async () => {
    const message = await mesh.sendMessage({
      type: 'request',
      priority: 'high',
      sender: 'engineer',
      receiver: 'security',
      subject: 'Security review needed (backward compat test)',
      content: 'Please review the auth implementation',
    });

    expect(message.id).toBeDefined();
    expect(message.sender).toBe('engineer');
    expect(message.receiver).toBe('security');
    expect(message.status).toBe('delivered');
  });

  test('should read messages from inbox', async () => {
    const messages = await mesh.readMessages('security');
    expect(messages.length).toBeGreaterThan(0);
  });

  test('should broadcast to all agents', async () => {
    const message = await mesh.broadcast(
      'conductor',
      'Backward compat broadcast test',
      'Testing backward compatibility'
    );
    expect(message.receiver).toBe('all');
  });
});

describe('BACKWARD COMPATIBILITY: Collective Memory', () => {
  test('should add knowledge', async () => {
    const knowledge = await mesh.addKnowledge({
      category: 'best-practice',
      title: 'Backward compat: Always validate API inputs',
      content: 'Every API endpoint must validate and sanitize all inputs.',
      confidence: 'proven',
      sourceAgent: 'security',
      applicableAgents: ['engineer', 'qa'],
      tags: ['security', 'api', 'validation'],
    });

    expect(knowledge.id).toBeDefined();
    expect(knowledge.confidence).toBe('proven');
  });

  test('should search knowledge', async () => {
    const results = await mesh.searchKnowledge({
      query: 'API validation',
    });

    expect(results.length).toBeGreaterThan(0);
  });
});

describe('BACKWARD COMPATIBILITY: Learning Engine', () => {
  test('should capture and propagate a learning', async () => {
    const event = await mesh.reportLearning(
      'security',
      'security-finding',
      'Backward compat: JWT RS256 test',
      'RS256 is preferred over HS256 for JWT signing.',
      'security-insight'
    );

    expect(event.id).toBeDefined();
    expect(event.sourceAgent).toBe('security');
    expect(event.propagated).toBe(true);
  });

  test('should generate agent briefing', async () => {
    const briefing = await mesh.getAgentBriefing('engineer');
    expect(briefing.length).toBeGreaterThan(0);
  });
});

describe('BACKWARD COMPATIBILITY: Conflict Resolution', () => {
  test('should register and attempt to resolve a conflict', async () => {
    const conflict = await mesh.registerConflict(
      ['engineer', 'security'],
      'Backward compat: Auth token storage',
      [
        {
          agentId: 'engineer',
          position: 'Store tokens in localStorage',
          reasoning: 'Easier to implement',
          confidence: 0.6,
          evidence: ['Common in React apps'],
        },
        {
          agentId: 'security',
          position: 'Store tokens in httpOnly cookies',
          reasoning: 'Prevents XSS attacks',
          confidence: 0.9,
          evidence: ['OWASP recommendation'],
        },
      ]
    );

    expect(conflict.id).toBeDefined();

    const resolved = await mesh.resolveConflict(conflict.id);
    expect(resolved).toBeDefined();
    // The conflict resolver may either resolve or escalate depending
    // on the expertise weighting algorithm. Both are valid outcomes.
    expect(['resolved', 'escalated']).toContain(resolved!.status);
  });
});

describe('BACKWARD COMPATIBILITY: Health Check', () => {
  test('should report healthy status', async () => {
    const health = await mesh.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.components.registry.totalAgents).toBe(12);
  });
});

describe('BACKWARD COMPATIBILITY: Audit Log', () => {
  test('should generate audit report', async () => {
    const report = await mesh.generateAuditReport(1);
    expect(report).toContain('Agent Mesh Audit Report');
  });
});
