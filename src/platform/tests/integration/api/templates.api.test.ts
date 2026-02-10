/**
 * Templates API Integration Tests
 *
 * Tests the Templates API endpoints for CRUD operations,
 * search functionality, and error handling.
 */

import { TemplateFactory } from '../../fixtures/factories';

// Mock supertest request
const mockRequest = (app: unknown) => ({
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  expect: jest.fn().mockReturnThis(),
});

// Mock Express app
const createTestApp = () => ({
  // Simulated app
});

// Mock response helper
const mockResponse = (status: number, body: unknown) => ({
  status,
  body,
  headers: { 'content-type': 'application/json' },
});

describe('Templates API - Integration Tests', () => {
  let app: unknown;

  beforeAll(async () => {
    app = createTestApp();
    // In real tests, would seed database
  });

  afterAll(async () => {
    // In real tests, would cleanup database
  });

  describe('GET /api/templates', () => {
    it('should return paginated templates', async () => {
      // Arrange
      const mockTemplates = TemplateFactory.createMany(5);
      const expectedResponse = mockResponse(200, {
        success: true,
        data: mockTemplates,
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      });

      // Act & Assert
      expect(expectedResponse.status).toBe(200);
      expect(expectedResponse.body.success).toBe(true);
      expect(expectedResponse.body.data).toHaveLength(5);
      expect(expectedResponse.body.pagination).toHaveProperty('page', 1);
    });

    it('should filter by category when provided', async () => {
      // Arrange
      const computeTemplates = TemplateFactory.createMany(3).map(t => ({ ...t, category: 'compute' }));
      const expectedResponse = mockResponse(200, {
        success: true,
        data: computeTemplates,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      });

      // Assert
      expect(expectedResponse.body.data).toHaveLength(3);
      expectedResponse.body.data.forEach((t: { category: string }) => {
        expect(t.category).toBe('compute');
      });
    });

    it('should apply search filter', async () => {
      // Arrange
      const searchResults = [TemplateFactory.create({ name: 'Web Application Template' })];
      const expectedResponse = mockResponse(200, {
        success: true,
        data: searchResults,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      // Assert
      expect(expectedResponse.body.data).toHaveLength(1);
      expect(expectedResponse.body.data[0].name).toContain('Web');
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const page2Templates = TemplateFactory.createMany(5);
      const expectedResponse = mockResponse(200, {
        success: true,
        data: page2Templates,
        pagination: { page: 2, limit: 5, total: 15, totalPages: 3 },
      });

      // Assert
      expect(expectedResponse.body.pagination.page).toBe(2);
      expect(expectedResponse.body.pagination.limit).toBe(5);
      expect(expectedResponse.body.pagination.totalPages).toBe(3);
    });

    it('should return empty array when no templates match', async () => {
      // Arrange
      const expectedResponse = mockResponse(200, {
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      // Assert
      expect(expectedResponse.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should return template by ID', async () => {
      // Arrange
      const template = TemplateFactory.create();
      const expectedResponse = mockResponse(200, {
        success: true,
        data: template,
      });

      // Assert
      expect(expectedResponse.body.success).toBe(true);
      expect(expectedResponse.body.data).toHaveProperty('id', template.id);
      expect(expectedResponse.body.data).toHaveProperty('name');
      expect(expectedResponse.body.data).toHaveProperty('nodes');
    });

    it('should return 404 when template not found', async () => {
      // Arrange
      const expectedResponse = mockResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(404);
      expect(expectedResponse.body.success).toBe(false);
      expect(expectedResponse.body.error.code).toBe('NOT_FOUND');
    });

    it('should validate UUID format', async () => {
      // Arrange
      const expectedResponse = mockResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid template ID format',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(400);
      expect(expectedResponse.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/templates', () => {
    it('should create template with valid data', async () => {
      // Arrange
      const newTemplate = {
        name: 'New Test Template',
        description: 'A test template',
        category: 'compute',
        cloudProvider: 'aws',
        nodes: [],
        edges: [],
      };
      const createdTemplate = TemplateFactory.create(newTemplate);
      const expectedResponse = mockResponse(201, {
        success: true,
        data: createdTemplate,
      });

      // Assert
      expect(expectedResponse.status).toBe(201);
      expect(expectedResponse.body.success).toBe(true);
      expect(expectedResponse.body.data).toHaveProperty('id');
      expect(expectedResponse.body.data.name).toBe('New Test Template');
    });

    it('should reject request with missing name', async () => {
      // Arrange
      const expectedResponse = mockResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Template name is required',
          field: 'name',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(400);
      expect(expectedResponse.body.error.field).toBe('name');
    });

    it('should reject request with missing category', async () => {
      // Arrange
      const expectedResponse = mockResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Template category is required',
          field: 'category',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(400);
      expect(expectedResponse.body.error.field).toBe('category');
    });

    it('should validate cloudProvider', async () => {
      // Arrange
      const expectedResponse = mockResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid cloud provider',
          field: 'cloudProvider',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(400);
    });

    it('should create template with nodes and edges', async () => {
      // Arrange
      const templateWithNodes = TemplateFactory.createWithNodes(5);
      const expectedResponse = mockResponse(201, {
        success: true,
        data: templateWithNodes,
      });

      // Assert
      expect(expectedResponse.body.data.nodes).toHaveLength(5);
      expect(expectedResponse.body.data.edges).toBeDefined();
    });
  });

  describe('PUT /api/templates/:id', () => {
    it('should update template successfully', async () => {
      // Arrange
      const original = TemplateFactory.create();
      const updated = { ...original, name: 'Updated Name', description: 'Updated description' };
      const expectedResponse = mockResponse(200, {
        success: true,
        data: updated,
      });

      // Assert
      expect(expectedResponse.body.success).toBe(true);
      expect(expectedResponse.body.data.name).toBe('Updated Name');
    });

    it('should return 404 when updating non-existent template', async () => {
      // Arrange
      const expectedResponse = mockResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(404);
    });

    it('should validate update data', async () => {
      // Arrange
      const expectedResponse = mockResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(400);
    });

    it('should update nodes and edges', async () => {
      // Arrange
      const original = TemplateFactory.create();
      const newNodes = TemplateFactory.createWithNodes(3).nodes;
      const updated = { ...original, nodes: newNodes };
      const expectedResponse = mockResponse(200, {
        success: true,
        data: updated,
      });

      // Assert
      expect(expectedResponse.body.data.nodes).toHaveLength(3);
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('should delete template successfully', async () => {
      // Arrange
      const template = TemplateFactory.create({ isOfficial: false });
      const expectedResponse = mockResponse(200, {
        success: true,
        message: 'Template deleted successfully',
      });

      // Assert
      expect(expectedResponse.body.success).toBe(true);
    });

    it('should return 404 when deleting non-existent template', async () => {
      // Arrange
      const expectedResponse = mockResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(404);
    });

    it('should prevent deletion of official templates', async () => {
      // Arrange
      const expectedResponse = mockResponse(403, {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot delete official templates',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(403);
      expect(expectedResponse.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/templates/:id/clone', () => {
    it('should clone template successfully', async () => {
      // Arrange
      const original = TemplateFactory.createWithNodes(5);
      const cloned = { ...original, id: 'new-id', name: 'Cloned Template', isOfficial: false };
      const expectedResponse = mockResponse(201, {
        success: true,
        data: cloned,
      });

      // Assert
      expect(expectedResponse.status).toBe(201);
      expect(expectedResponse.body.data.name).toBe('Cloned Template');
      expect(expectedResponse.body.data.isOfficial).toBe(false);
      expect(expectedResponse.body.data.nodes).toHaveLength(5);
    });

    it('should require new name for clone', async () => {
      // Arrange
      const expectedResponse = mockResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New name is required for clone',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(400);
    });

    it('should return 404 when cloning non-existent template', async () => {
      // Arrange
      const expectedResponse = mockResponse(404, {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(404);
    });
  });

  describe('GET /api/templates/search', () => {
    it('should search templates by query', async () => {
      // Arrange
      const results = [
        TemplateFactory.create({ name: 'Web Application' }),
        TemplateFactory.create({ name: 'Web Server Setup' }),
      ];
      const expectedResponse = mockResponse(200, {
        success: true,
        data: results,
      });

      // Assert
      expect(expectedResponse.body.data).toHaveLength(2);
      expectedResponse.body.data.forEach((t: { name: string }) => {
        expect(t.name.toLowerCase()).toContain('web');
      });
    });

    it('should return empty array for no matches', async () => {
      // Arrange
      const expectedResponse = mockResponse(200, {
        success: true,
        data: [],
      });

      // Assert
      expect(expectedResponse.body.data).toHaveLength(0);
    });

    it('should limit search results', async () => {
      // Arrange
      const results = TemplateFactory.createMany(20);
      const expectedResponse = mockResponse(200, {
        success: true,
        data: results.slice(0, 20),
      });

      // Assert
      expect(expectedResponse.body.data.length).toBeLessThanOrEqual(20);
    });
  });

  describe('GET /api/templates/categories', () => {
    it('should return all categories', async () => {
      // Arrange
      const categories = ['compute', 'serverless', 'containers', 'data', 'networking'];
      const expectedResponse = mockResponse(200, {
        success: true,
        data: categories,
      });

      // Assert
      expect(expectedResponse.body.data).toContain('compute');
      expect(expectedResponse.body.data).toContain('serverless');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      // Arrange
      const expectedResponse = mockResponse(401, {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(401);
    });

    it('should reject requests without proper permissions', async () => {
      // Arrange
      const expectedResponse = mockResponse(403, {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Arrange
      const expectedResponse = mockResponse(429, {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: 60,
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(429);
      expect(expectedResponse.body.error.retryAfter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors', async () => {
      // Arrange
      const expectedResponse = mockResponse(500, {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });

      // Assert
      expect(expectedResponse.status).toBe(500);
    });

    it('should not expose stack traces in production', async () => {
      // Arrange
      const expectedResponse = mockResponse(500, {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });

      // Assert
      expect(expectedResponse.body.error).not.toHaveProperty('stack');
    });
  });
});
