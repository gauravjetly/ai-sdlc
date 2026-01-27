/**
 * Embedding Service Tests
 */

import { EmbeddingService } from '../vector-db/embedding-service';

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    embeddingService = new EmbeddingService({
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
    });
  });

  describe('optimizeTextForEmbedding', () => {
    it('should remove excessive whitespace', () => {
      const text = 'This  has   too    many     spaces\n\n\n\nAnd newlines';
      const optimized = embeddingService.optimizeTextForEmbedding(text);

      expect(optimized).not.toContain('  ');
      expect(optimized).not.toContain('\n\n\n');
    });

    it('should truncate very long text', () => {
      const longText = 'a'.repeat(50000); // ~12500 tokens
      const optimized = embeddingService.optimizeTextForEmbedding(longText, 1000);

      expect(optimized.length).toBeLessThan(longText.length);
      expect(optimized).toContain('...');
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity correctly', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [1, 0, 0];

      const similarity = embeddingService.cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBe(1); // Identical vectors
    });

    it('should return 0 for orthogonal vectors', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];

      const similarity = embeddingService.cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBe(0);
    });

    it('should throw for mismatched dimensions', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [1, 0];

      expect(() => {
        embeddingService.cosineSimilarity(embedding1, embedding2);
      }).toThrow('Embeddings must have the same dimensions');
    });
  });

  describe('validateEmbedding', () => {
    it('should validate correct embedding', () => {
      const embedding = new Array(1536).fill(0.5);
      const isValid = embeddingService.validateEmbedding(embedding);

      expect(isValid).toBe(true);
    });

    it('should reject non-array', () => {
      const isValid = embeddingService.validateEmbedding('not an array' as any);

      expect(isValid).toBe(false);
    });

    it('should reject wrong dimensions', () => {
      const embedding = new Array(100).fill(0.5);
      const isValid = embeddingService.validateEmbedding(embedding);

      expect(isValid).toBe(false);
    });

    it('should reject NaN values', () => {
      const embedding = new Array(1536).fill(0.5);
      embedding[100] = NaN;
      const isValid = embeddingService.validateEmbedding(embedding);

      expect(isValid).toBe(false);
    });
  });
});
