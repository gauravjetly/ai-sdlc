/**
 * Agent Mesh Integration Tests
 *
 * Tests the complete inter-agent communication and
 * collective learning system.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { AgentMesh, createAgentMesh, AgentMeshConfig } from '../index';

// Use temporary directory for tests
const TEST_BASE = path.join(os.tmpdir(), 'agent-mesh-test-' + Date.now());

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
  mesh = await createAgentMesh(TEST_CONFIG);
});

afterAll(async () => {
  // Clean up temp directory
  await fs.rm(TEST_BASE, { recursive: true, force: true });
});

describe('Agent Registry', () => {
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

  test('should generate communication matrix', () => {
    const matrix = mesh.registry.getCommunicationMatrix();
    expect(Object.keys(matrix).length).toBe(12);
  });
});

describe('Message Bus', () => {
  test('should send a message between agents', async () => {
    const message = await mesh.sendMessage({
      type: 'request',
      priority: 'high',
      sender: 'engineer',
      receiver: 'security',
      subject: 'Security review needed',
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
    expect(messages[0].sender).toBe('engineer');
  });

  test('should acknowledge a message', async () => {
    const messages = await mesh.readMessages('security');
    const firstMessage = messages[0];

    await mesh.acknowledgeMessage('security', firstMessage.id);

    const remaining = await mesh.readMessages('security');
    expect(remaining.find((m) => m.id === firstMessage.id)).toBeUndefined();
  });

  test('should broadcast to all agents', async () => {
    const message = await mesh.broadcast(
      'conductor',
      'System maintenance',
      'Scheduled maintenance in 1 hour'
    );

    expect(message.receiver).toBe('all');

    // Check that all other agents received the message
    const baMessages = await mesh.readMessages('ba');
    expect(baMessages.some((m) => m.subject === 'System maintenance')).toBe(true);
  });

  test('should respect priority ordering', async () => {
    // Clear engineer inbox first
    const existing = await mesh.readMessages('engineer');
    for (const msg of existing) {
      await mesh.acknowledgeMessage('engineer', msg.id);
    }

    // Send messages with different priorities
    await mesh.sendMessage({
      type: 'notification',
      priority: 'low',
      sender: 'tracker',
      receiver: 'engineer',
      subject: 'Weekly report available',
      content: 'Check the weekly report',
    });

    await mesh.sendMessage({
      type: 'request',
      priority: 'critical',
      sender: 'security',
      receiver: 'engineer',
      subject: 'Critical vulnerability found',
      content: 'SQL injection in user endpoint',
    });

    const messages = await mesh.readMessages('engineer');
    expect(messages[0].priority).toBe('critical');
  });

  test('should detect message loops', async () => {
    const correlationId = 'test-loop-detection';

    // Send messages to max depth
    for (let i = 0; i < 5; i++) {
      await mesh.sendMessage({
        type: 'notification',
        sender: 'conductor',
        receiver: 'ba',
        subject: `Loop test ${i}`,
        content: 'Testing loop detection',
        correlationId,
      });
    }

    // The 6th should fail (loopDetectionDepth is 5 in test config)
    await expect(
      mesh.sendMessage({
        type: 'notification',
        sender: 'conductor',
        receiver: 'ba',
        subject: 'Loop test overflow',
        content: 'This should fail',
        correlationId,
      })
    ).rejects.toThrow(/Loop detected/);
  });
});

describe('Collective Memory', () => {
  test('should add knowledge', async () => {
    const knowledge = await mesh.addKnowledge({
      category: 'best-practice',
      title: 'Always validate API inputs',
      content: 'Every API endpoint must validate and sanitize all inputs before processing.',
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
    expect(results[0].title).toContain('validate');
  });

  test('should merge duplicate knowledge', async () => {
    // Add similar knowledge from different agent
    const knowledge = await mesh.addKnowledge({
      category: 'best-practice',
      title: 'Always validate API inputs',
      content: 'Additional insight: Use JSON Schema for complex validation.',
      confidence: 'established',
      sourceAgent: 'engineer',
      applicableAgents: ['engineer', 'qa'],
      tags: ['validation', 'json-schema'],
    });

    // Should have merged (same title)
    expect(knowledge.sourceAgents).toContain('security');
    expect(knowledge.sourceAgents).toContain('engineer');
    expect(knowledge.evidenceCount).toBeGreaterThanOrEqual(1);
  });

  test('should search by agent applicability', async () => {
    const results = await mesh.searchKnowledge({
      agent: 'engineer',
    });

    // All results should be applicable to engineer
    for (const result of results) {
      expect(result.applicableAgents).toContain('engineer');
    }
  });
});

describe('Learning Engine', () => {
  test('should capture and propagate a learning', async () => {
    const event = await mesh.reportLearning(
      'security',
      'security-finding',
      'JWT tokens should use RS256',
      'RS256 is preferred over HS256 for JWT signing because it uses asymmetric keys, allowing token verification without the signing key.',
      'security-insight'
    );

    expect(event.id).toBeDefined();
    expect(event.sourceAgent).toBe('security');
    expect(event.propagated).toBe(true);
    expect(event.targetAgents.length).toBeGreaterThan(0);
  });

  test('should generate agent briefing', async () => {
    const briefing = await mesh.getAgentBriefing('engineer');
    expect(briefing.length).toBeGreaterThan(0);
    expect(briefing).toContain('Collective Intelligence Briefing');
  });

  test('should analyze output for learnings', async () => {
    const output = `
      Found SQL injection vulnerability in the user search endpoint.
      The query parameter was being concatenated directly into the SQL string.
      Fixed by using parameterized queries.
      Also added input validation with express-validator.
    `;

    const events = await mesh.analyzeForLearnings('security', output);
    expect(events.length).toBeGreaterThan(0);
  });
});

describe('Conflict Resolution', () => {
  test('should register and resolve a conflict', async () => {
    const conflict = await mesh.registerConflict(
      ['engineer', 'security'],
      'Authentication token storage method',
      [
        {
          agentId: 'engineer',
          position: 'Store tokens in localStorage for simplicity',
          reasoning: 'Easier to implement, faster access',
          confidence: 0.6,
          evidence: ['Common in React apps'],
        },
        {
          agentId: 'security',
          position: 'Store tokens in httpOnly cookies',
          reasoning: 'Prevents XSS attacks from accessing tokens',
          confidence: 0.9,
          evidence: ['OWASP recommendation', 'RFC 6819'],
        },
      ]
    );

    expect(conflict.id).toBeDefined();
    expect(conflict.status).toBe('open');

    // Resolve it
    const resolved = await mesh.resolveConflict(conflict.id);
    expect(resolved).toBeDefined();
    expect(resolved!.status).toBe('resolved');
    expect(resolved!.resolution).toBeDefined();

    // Security should win due to expertise weighting + higher confidence
    expect(resolved!.resolution!.outcome).toContain('httpOnly');
  });
});

describe('Audit Log', () => {
  test('should record and search audit entries', async () => {
    // The previous tests should have generated audit entries
    const report = await mesh.generateAuditReport(1);
    expect(report).toContain('Agent Mesh Audit Report');
    expect(report).toContain('message-sent');
  });
});

describe('Health Check', () => {
  test('should report healthy status', async () => {
    const health = await mesh.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.components.registry.totalAgents).toBe(12);
  });
});

describe('Request Help Pattern', () => {
  test('should send help request from one agent to another', async () => {
    const message = await mesh.requestHelp(
      'engineer',
      'ask-tom',
      'Build failure on TypeScript compilation',
      'Getting TS2345 error in src/auth/handler.ts line 42. Cannot assign type string to number.',
      { relatedFiles: ['src/auth/handler.ts'] }
    );

    expect(message.type).toBe('request');
    expect(message.priority).toBe('high');
    expect(message.receiver).toBe('ask-tom');

    // Ask Tom should have it in inbox
    const inbox = await mesh.readMessages('ask-tom');
    expect(inbox.some((m) => m.subject.includes('Build failure'))).toBe(true);
  });
});
