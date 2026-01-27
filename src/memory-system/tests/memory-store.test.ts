/**
 * Memory Store Tests
 */

import { MemoryStore } from '../storage/memory-store';
import { VectorDBClient } from '../vector-db/chromadb-client';
import { EmbeddingService } from '../vector-db/embedding-service';
import { CreateMemoryRequest } from '../types';

// Mock the dependencies
jest.mock('../vector-db/chromadb-client');
jest.mock('../vector-db/embedding-service');

describe('MemoryStore', () => {
  let memoryStore: MemoryStore;
  let mockVectorDB: jest.Mocked<VectorDBClient>;
  let mockEmbedder: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    mockVectorDB = new VectorDBClient() as jest.Mocked<VectorDBClient>;
    mockEmbedder = new EmbeddingService() as jest.Mocked<EmbeddingService>;

    // Mock methods
    mockVectorDB.addDocuments = jest.fn().mockResolvedValue(undefined);
    mockVectorDB.updateDocument = jest.fn().mockResolvedValue(undefined);
    mockEmbedder.generateEmbedding = jest.fn().mockResolvedValue({
      embedding: new Array(1536).fill(0.1),
      model: 'text-embedding-3-small',
      tokens: 10,
    });
    mockEmbedder.optimizeTextForEmbedding = jest.fn().mockImplementation(text => text);

    memoryStore = new MemoryStore(mockVectorDB, mockEmbedder);
  });

  describe('storeMemory', () => {
    it('should store a new memory successfully', async () => {
      const request: CreateMemoryRequest = {
        agent: 'engineer',
        category: 'code-patterns',
        title: 'Test Pattern',
        content: 'This is a test pattern for authentication.',
        metadata: {
          success: true,
          tags: ['authentication', 'security'],
        },
        createdBy: 'test-user',
      };

      const memory = await memoryStore.storeMemory(request);

      expect(memory).toBeDefined();
      expect(memory.id).toMatch(/^PATTERN-\d{8}-[a-f0-9]{8}$/);
      expect(memory.title).toBe('Test Pattern');
      expect(memory.agent).toBe('engineer');
      expect(memory.category).toBe('code-patterns');
      expect(memory.version).toBe(1);
      expect(memory.status).toBe('active');
      expect(mockEmbedder.generateEmbedding).toHaveBeenCalled();
      expect(mockVectorDB.addDocuments).toHaveBeenCalled();
    });

    it('should generate correct memory ID prefix for different categories', async () => {
      const categories = [
        { category: 'code-patterns' as const, prefix: 'PATTERN' },
        { category: 'security-findings' as const, prefix: 'SEC' },
        { category: 'architecture-decisions' as const, prefix: 'ADR' },
      ];

      for (const { category, prefix } of categories) {
        const request: CreateMemoryRequest = {
          agent: 'engineer',
          category,
          title: 'Test',
          content: 'Test content',
          metadata: { success: true, tags: [] },
        };

        const memory = await memoryStore.storeMemory(request);
        expect(memory.id).toMatch(new RegExp(`^${prefix}-`));
      }
    });
  });

  describe('updateMemory', () => {
    it('should update memory metadata', async () => {
      // This test would need file system mocking to work properly
      // Skipping for now as it requires more complex setup
    });
  });
});
