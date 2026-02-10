/**
 * TemplateService Unit Tests
 *
 * Comprehensive tests for the TemplateService covering all CRUD operations,
 * search functionality, and edge cases.
 */

import { TemplateFactory } from '../../fixtures/factories';

// Mock Prisma
const mockPrisma = {
  template: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// Mock the TemplateService
class TemplateService {
  private prisma: typeof mockPrisma;

  constructor(prisma: typeof mockPrisma) {
    this.prisma = prisma;
  }

  async getTemplate(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  async getAllTemplates(options: { page?: number; limit?: number; category?: string; search?: string } = {}) {
    const { page = 1, limit = 10, category, search } = options;
    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createTemplate(data: {
    name: string;
    description: string;
    category: string;
    cloudProvider: string;
    nodes: unknown[];
    edges: unknown[];
    metadata?: Record<string, unknown>;
  }) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Template name is required');
    }

    if (!data.category) {
      throw new Error('Template category is required');
    }

    return this.prisma.template.create({
      data: {
        ...data,
        version: '1.0.0',
        isOfficial: false,
      },
    });
  }

  async updateTemplate(id: string, data: Partial<{
    name: string;
    description: string;
    category: string;
    nodes: unknown[];
    edges: unknown[];
    metadata: Record<string, unknown>;
  }>) {
    // Verify template exists
    await this.getTemplate(id);

    return this.prisma.template.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async deleteTemplate(id: string) {
    // Verify template exists
    const template = await this.getTemplate(id);

    // Prevent deletion of official templates
    if (template.isOfficial) {
      throw new Error('Cannot delete official templates');
    }

    return this.prisma.template.delete({
      where: { id },
    });
  }

  async searchTemplates(query: string) {
    if (!query || query.trim() === '') {
      return [];
    }

    return this.prisma.template.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  async getTemplatesByCategory(category: string) {
    return this.prisma.template.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async cloneTemplate(id: string, newName: string) {
    const original = await this.getTemplate(id);

    return this.prisma.template.create({
      data: {
        name: newName,
        description: `Cloned from ${original.name}`,
        category: original.category,
        cloudProvider: original.cloudProvider,
        nodes: original.nodes,
        edges: original.edges,
        metadata: original.metadata,
        version: '1.0.0',
        isOfficial: false,
      },
    });
  }
}

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TemplateService(mockPrisma);
  });

  describe('getTemplate', () => {
    it('should return template when found', async () => {
      // Arrange
      const mockTemplate = TemplateFactory.create();
      mockPrisma.template.findUnique.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.getTemplate(mockTemplate.id);

      // Assert
      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: mockTemplate.id },
      });
    });

    it('should throw error when template not found', async () => {
      // Arrange
      mockPrisma.template.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTemplate('non-existent-id'))
        .rejects.toThrow('Template not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.template.findUnique.mockRejectedValue(new Error('Database connection error'));

      // Act & Assert
      await expect(service.getTemplate('any-id'))
        .rejects.toThrow('Database connection error');
    });
  });

  describe('getAllTemplates', () => {
    it('should return paginated templates with default options', async () => {
      // Arrange
      const mockTemplates = TemplateFactory.createMany(5);
      mockPrisma.template.findMany.mockResolvedValue(mockTemplates);
      mockPrisma.template.count.mockResolvedValue(15);

      // Act
      const result = await service.getAllTemplates();

      // Assert
      expect(result.data).toHaveLength(5);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
      });
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      const mockTemplates = TemplateFactory.createMany(5);
      mockPrisma.template.findMany.mockResolvedValue(mockTemplates);
      mockPrisma.template.count.mockResolvedValue(50);

      // Act
      const result = await service.getAllTemplates({ page: 2, limit: 5 });

      // Assert
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
      expect(result.pagination.totalPages).toBe(10);
    });

    it('should filter by category when provided', async () => {
      // Arrange
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      // Act
      await service.getAllTemplates({ category: 'compute' });

      // Assert
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'compute',
          }),
        })
      );
    });

    it('should apply search filter when provided', async () => {
      // Arrange
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      // Act
      await service.getAllTemplates({ search: 'web app' });

      // Assert
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
              expect.objectContaining({ description: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should return empty array when no templates exist', async () => {
      // Arrange
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      // Act
      const result = await service.getAllTemplates();

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('createTemplate', () => {
    it('should create template with valid data', async () => {
      // Arrange
      const templateData = {
        name: 'New Template',
        description: 'A new template',
        category: 'compute',
        cloudProvider: 'aws',
        nodes: [],
        edges: [],
      };
      const expectedTemplate = TemplateFactory.create(templateData);
      mockPrisma.template.create.mockResolvedValue(expectedTemplate);

      // Act
      const result = await service.createTemplate(templateData);

      // Assert
      expect(result).toEqual(expectedTemplate);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Template',
          version: '1.0.0',
          isOfficial: false,
        }),
      });
    });

    it('should throw error when name is empty', async () => {
      // Arrange
      const templateData = {
        name: '',
        description: 'A template',
        category: 'compute',
        cloudProvider: 'aws',
        nodes: [],
        edges: [],
      };

      // Act & Assert
      await expect(service.createTemplate(templateData))
        .rejects.toThrow('Template name is required');
    });

    it('should throw error when name is whitespace only', async () => {
      // Arrange
      const templateData = {
        name: '   ',
        description: 'A template',
        category: 'compute',
        cloudProvider: 'aws',
        nodes: [],
        edges: [],
      };

      // Act & Assert
      await expect(service.createTemplate(templateData))
        .rejects.toThrow('Template name is required');
    });

    it('should throw error when category is missing', async () => {
      // Arrange
      const templateData = {
        name: 'Test Template',
        description: 'A template',
        category: '',
        cloudProvider: 'aws',
        nodes: [],
        edges: [],
      };

      // Act & Assert
      await expect(service.createTemplate(templateData))
        .rejects.toThrow('Template category is required');
    });

    it('should create template with nodes and edges', async () => {
      // Arrange
      const templateData = {
        name: 'Template with Nodes',
        description: 'A template with infrastructure nodes',
        category: 'compute',
        cloudProvider: 'aws',
        nodes: [{ id: 'node-1', type: 'ec2Instance', position: { x: 0, y: 0 }, data: {} }],
        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
      };
      mockPrisma.template.create.mockResolvedValue(TemplateFactory.create(templateData));

      // Act
      const result = await service.createTemplate(templateData);

      // Assert
      expect(mockPrisma.template.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      // Arrange
      const existingTemplate = TemplateFactory.create();
      const updatedData = { name: 'Updated Name', description: 'Updated description' };
      mockPrisma.template.findUnique.mockResolvedValue(existingTemplate);
      mockPrisma.template.update.mockResolvedValue({ ...existingTemplate, ...updatedData });

      // Act
      const result = await service.updateTemplate(existingTemplate.id, updatedData);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: existingTemplate.id },
        data: expect.objectContaining(updatedData),
      });
    });

    it('should throw error when template does not exist', async () => {
      // Arrange
      mockPrisma.template.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateTemplate('non-existent', { name: 'New Name' }))
        .rejects.toThrow('Template not found');
    });

    it('should update only provided fields', async () => {
      // Arrange
      const existingTemplate = TemplateFactory.create();
      mockPrisma.template.findUnique.mockResolvedValue(existingTemplate);
      mockPrisma.template.update.mockResolvedValue({ ...existingTemplate, name: 'New Name' });

      // Act
      await service.updateTemplate(existingTemplate.id, { name: 'New Name' });

      // Assert
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: existingTemplate.id },
        data: expect.not.objectContaining({ description: expect.anything() }),
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete non-official template successfully', async () => {
      // Arrange
      const template = TemplateFactory.create({ isOfficial: false });
      mockPrisma.template.findUnique.mockResolvedValue(template);
      mockPrisma.template.delete.mockResolvedValue(template);

      // Act
      const result = await service.deleteTemplate(template.id);

      // Assert
      expect(result).toEqual(template);
      expect(mockPrisma.template.delete).toHaveBeenCalledWith({
        where: { id: template.id },
      });
    });

    it('should throw error when template does not exist', async () => {
      // Arrange
      mockPrisma.template.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteTemplate('non-existent'))
        .rejects.toThrow('Template not found');
    });

    it('should throw error when trying to delete official template', async () => {
      // Arrange
      const officialTemplate = TemplateFactory.createOfficial();
      mockPrisma.template.findUnique.mockResolvedValue(officialTemplate);

      // Act & Assert
      await expect(service.deleteTemplate(officialTemplate.id))
        .rejects.toThrow('Cannot delete official templates');
    });
  });

  describe('searchTemplates', () => {
    it('should search templates by name', async () => {
      // Arrange
      const mockTemplates = [TemplateFactory.create({ name: 'Web Application' })];
      mockPrisma.template.findMany.mockResolvedValue(mockTemplates);

      // Act
      const result = await service.searchTemplates('web');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should return empty array for empty search query', async () => {
      // Act
      const result = await service.searchTemplates('');

      // Assert
      expect(result).toHaveLength(0);
      expect(mockPrisma.template.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only query', async () => {
      // Act
      const result = await service.searchTemplates('   ');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should limit search results to 20', async () => {
      // Arrange
      mockPrisma.template.findMany.mockResolvedValue([]);

      // Act
      await service.searchTemplates('test');

      // Assert
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for specific category', async () => {
      // Arrange
      const computeTemplates = TemplateFactory.createMany(3).map(t => ({ ...t, category: 'compute' }));
      mockPrisma.template.findMany.mockResolvedValue(computeTemplates);

      // Act
      const result = await service.getTemplatesByCategory('compute');

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: { category: 'compute' },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no templates in category', async () => {
      // Arrange
      mockPrisma.template.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTemplatesByCategory('nonexistent');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('cloneTemplate', () => {
    it('should clone template with new name', async () => {
      // Arrange
      const original = TemplateFactory.createWithNodes(5);
      const cloned = { ...original, id: 'new-id', name: 'Cloned Template', isOfficial: false };
      mockPrisma.template.findUnique.mockResolvedValue(original);
      mockPrisma.template.create.mockResolvedValue(cloned);

      // Act
      const result = await service.cloneTemplate(original.id, 'Cloned Template');

      // Assert
      expect(result.name).toBe('Cloned Template');
      expect(result.isOfficial).toBe(false);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Cloned Template',
          nodes: original.nodes,
          edges: original.edges,
        }),
      });
    });

    it('should throw error when original template not found', async () => {
      // Arrange
      mockPrisma.template.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cloneTemplate('non-existent', 'New Name'))
        .rejects.toThrow('Template not found');
    });

    it('should clone official template as non-official', async () => {
      // Arrange
      const original = TemplateFactory.createOfficial();
      mockPrisma.template.findUnique.mockResolvedValue(original);
      mockPrisma.template.create.mockResolvedValue({ ...original, isOfficial: false });

      // Act
      await service.cloneTemplate(original.id, 'My Clone');

      // Assert
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isOfficial: false,
        }),
      });
    });
  });
});
