/**
 * SQLite Memory Provider Tests
 *
 * Tests knowledge storage and retrieval via SQLite.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SQLiteProvider } from '../src/sqlite/sqlite-provider';
import { SQLiteMemoryProvider } from '../src/sqlite/sqlite-memory-provider';

describe('SQLiteMemoryProvider', () => {
  let sqliteProvider: SQLiteProvider;
  let memoryProvider: SQLiteMemoryProvider;
  let dbPath: string;

  beforeEach(async () => {
    const tmpDir = path.join(os.tmpdir(), 'aisdlc-mem-test-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    dbPath = path.join(tmpDir, 'test-memory.db');

    sqliteProvider = new SQLiteProvider({ dbPath });
    await sqliteProvider.initialize();

    memoryProvider = new SQLiteMemoryProvider(sqliteProvider);
    await memoryProvider.initialize();
  });

  afterEach(async () => {
    await sqliteProvider.close();
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      fs.rmdirSync(path.dirname(dbPath));
    } catch { /* ignore */ }
  });

  describe('storeKnowledge', () => {
    it('should store a new knowledge item', async () => {
      const knowledge = await memoryProvider.storeKnowledge({
        category: 'architecture-decision',
        title: 'Use SQLite for Local Storage',
        content: 'SQLite provides zero-config database for local production.',
        confidence: 'established',
        sourceAgent: 'architect',
        applicableAgents: ['engineer', 'qa'],
        tags: ['database', 'local', 'sqlite'],
      });

      expect(knowledge.id).toBeDefined();
      expect(knowledge.title).toBe('Use SQLite for Local Storage');
      expect(knowledge.category).toBe('architecture-decision');
      expect(knowledge.confidence).toBe('established');
      expect(knowledge.sourceAgents).toContain('architect');
      expect(knowledge.applicableAgents).toContain('engineer');
      expect(knowledge.tags).toContain('sqlite');
    });

    it('should merge with existing knowledge on same title/category', async () => {
      const first = await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Repository Pattern',
        content: 'Use repository pattern for data access.',
        confidence: 'emerging',
        sourceAgent: 'architect',
        applicableAgents: ['engineer'],
        tags: ['pattern'],
      });

      const second = await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Repository Pattern',
        content: 'Updated: Use repository pattern with caching.',
        confidence: 'established',
        sourceAgent: 'engineer',
        applicableAgents: ['qa'],
        tags: ['pattern', 'caching'],
      });

      expect(second.id).toBe(first.id);
      expect(second.sourceAgents).toContain('architect');
      expect(second.sourceAgents).toContain('engineer');
      expect(second.applicableAgents).toContain('engineer');
      expect(second.applicableAgents).toContain('qa');
      expect(second.tags).toContain('caching');
    });

    it('should store knowledge with evidence', async () => {
      const knowledge = await memoryProvider.storeKnowledge({
        category: 'bug-resolution',
        title: 'Fix Race Condition in Worker',
        content: 'Use mutex to prevent concurrent access.',
        confidence: 'proven',
        sourceAgent: 'engineer',
        applicableAgents: ['qa'],
        tags: ['bug', 'concurrency'],
        evidence: {
          type: 'code-review',
          description: 'Found during PR #42 review',
          source: 'github',
        },
      });

      expect(knowledge.evidenceCount).toBe(1);
      expect(knowledge.evidence).toHaveLength(1);
      expect(knowledge.evidence[0].type).toBe('code-review');
    });
  });

  describe('searchKnowledge', () => {
    beforeEach(async () => {
      await memoryProvider.storeKnowledge({
        category: 'architecture-decision',
        title: 'Microservices Architecture',
        content: 'Use microservices for scalability and team autonomy.',
        confidence: 'proven',
        sourceAgent: 'architect',
        applicableAgents: ['engineer', 'atlas'],
        tags: ['architecture', 'microservices'],
      });

      await memoryProvider.storeKnowledge({
        category: 'security-finding',
        title: 'SQL Injection Prevention',
        content: 'Always use parameterized queries to prevent SQL injection.',
        confidence: 'proven',
        sourceAgent: 'security',
        applicableAgents: ['engineer'],
        tags: ['security', 'sql', 'injection'],
      });

      await memoryProvider.storeKnowledge({
        category: 'testing-strategy',
        title: 'Integration Test Strategy',
        content: 'Use Docker containers for integration testing.',
        confidence: 'established',
        sourceAgent: 'qa',
        applicableAgents: ['engineer', 'qa'],
        tags: ['testing', 'docker'],
      });
    });

    it('should return all knowledge without filters', async () => {
      const results = await memoryProvider.searchKnowledge({});
      expect(results.length).toBe(3);
    });

    it('should filter by category', async () => {
      const results = await memoryProvider.searchKnowledge({
        category: 'security-finding',
      });
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('SQL Injection Prevention');
    });

    it('should filter by confidence', async () => {
      const results = await memoryProvider.searchKnowledge({
        confidence: 'proven',
      });
      expect(results.length).toBe(2);
    });

    it('should search by keyword query', async () => {
      const results = await memoryProvider.searchKnowledge({
        query: 'microservices scalability',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Microservices Architecture');
    });

    it('should limit results', async () => {
      const results = await memoryProvider.searchKnowledge({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should filter by tags', async () => {
      const results = await memoryProvider.searchKnowledge({
        tags: ['docker'],
      });
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Integration Test Strategy');
    });
  });

  describe('getKnowledge', () => {
    it('should retrieve knowledge by ID', async () => {
      const stored = await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Test Pattern',
        content: 'Test content',
        confidence: 'emerging',
        sourceAgent: 'engineer',
        applicableAgents: [],
        tags: [],
      });

      const retrieved = await memoryProvider.getKnowledge(stored.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe('Test Pattern');
    });

    it('should return null for non-existent ID', async () => {
      const result = await memoryProvider.getKnowledge('nonexistent');
      expect(result).toBeNull();
    });

    it('should increment access count on retrieval', async () => {
      const stored = await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Access Count Test',
        content: 'Test',
        confidence: 'emerging',
        sourceAgent: 'engineer',
        applicableAgents: [],
        tags: [],
      });

      await memoryProvider.getKnowledge(stored.id);
      await memoryProvider.getKnowledge(stored.id);
      const result = await memoryProvider.getKnowledge(stored.id);

      expect(result!.accessCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('addEvidence', () => {
    it('should add evidence and update confidence', async () => {
      const knowledge = await memoryProvider.storeKnowledge({
        category: 'bug-resolution',
        title: 'Memory Leak Fix',
        content: 'Close database connections in finally block.',
        confidence: 'emerging',
        sourceAgent: 'engineer',
        applicableAgents: [],
        tags: [],
      });

      // Add 2 more evidence items to reach 'established'
      await memoryProvider.addEvidence(knowledge.id, {
        type: 'test',
        description: 'Verified in unit tests',
      });

      const updated = await memoryProvider.addEvidence(knowledge.id, {
        type: 'production',
        description: 'Confirmed fix in production',
      });

      expect(updated!.evidenceCount).toBe(2);
      expect(updated!.confidence).toBe('established');
    });

    it('should return null for non-existent knowledge', async () => {
      const result = await memoryProvider.addEvidence('nonexistent', {
        type: 'test',
        description: 'Test',
      });
      expect(result).toBeNull();
    });
  });

  describe('deprecateKnowledge', () => {
    it('should mark knowledge as deprecated', async () => {
      const knowledge = await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Old Pattern',
        content: 'Deprecated approach.',
        confidence: 'established',
        sourceAgent: 'architect',
        applicableAgents: [],
        tags: [],
      });

      await memoryProvider.deprecateKnowledge(knowledge.id, 'Superseded by new pattern');

      const result = await memoryProvider.getKnowledge(knowledge.id);
      expect(result!.status).toBe('deprecated');
      expect(result!.confidence).toBe('deprecated');
    });
  });

  describe('getAgentRelevantKnowledge', () => {
    it('should return knowledge relevant to a specific agent', async () => {
      await memoryProvider.storeKnowledge({
        category: 'security-finding',
        title: 'CORS Configuration',
        content: 'Always configure CORS headers.',
        confidence: 'proven',
        sourceAgent: 'security',
        applicableAgents: ['engineer'],
        tags: [],
      });

      await memoryProvider.storeKnowledge({
        category: 'testing-strategy',
        title: 'E2E Tests',
        content: 'Use Playwright for E2E testing.',
        confidence: 'established',
        sourceAgent: 'qa',
        applicableAgents: ['qa'],
        tags: [],
      });

      const engineerKnowledge = await memoryProvider.getAgentRelevantKnowledge('engineer');
      expect(engineerKnowledge.length).toBe(1);
      expect(engineerKnowledge[0].title).toBe('CORS Configuration');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Pattern 1',
        content: 'Content',
        confidence: 'emerging',
        sourceAgent: 'engineer',
        applicableAgents: [],
        tags: [],
      });

      await memoryProvider.storeKnowledge({
        category: 'code-pattern',
        title: 'Pattern 2',
        content: 'Content',
        confidence: 'emerging',
        sourceAgent: 'architect',
        applicableAgents: [],
        tags: [],
      });

      const stats = await memoryProvider.getStats();
      expect(stats.totalItems).toBe(2);
      expect(stats.categories['code-pattern']).toBe(2);
      expect(stats.provider).toBe('sqlite');
    });
  });

  describe('exportReport', () => {
    it('should generate a markdown report', async () => {
      await memoryProvider.storeKnowledge({
        category: 'architecture-decision',
        title: 'Test Decision',
        content: 'Test content',
        confidence: 'emerging',
        sourceAgent: 'architect',
        applicableAgents: [],
        tags: [],
      });

      const report = await memoryProvider.exportReport();
      expect(report).toContain('Knowledge Base Report');
      expect(report).toContain('SQLite');
      expect(report).toContain('architecture-decision');
    });
  });
});
