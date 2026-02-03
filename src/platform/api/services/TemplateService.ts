/**
 * Template Service
 * Business logic for managing design templates
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import {
  Template,
  TemplateVersion,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ListTemplatesQuery,
  ListResponse,
  TemplateData,
} from '../types/designer.js';

const logger = createLogger('TemplateService');
const prisma = new PrismaClient();

export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateRequest, userId?: string): Promise<Template> {
    logger.info('Creating template', { name: data.name, category: data.category });

    const template = await prisma.designTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        visibility: data.visibility || 'private',
        templateData: data.templateData as any,
        layerType: data.layerType,
        thumbnail: data.thumbnail,
        tags: data.tags || [],
        createdBy: userId,
        version: '1.0.0',
        usageCount: 0,
      },
    });

    // Create initial version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: '1.0.0',
        templateData: data.templateData as any,
        changeLog: 'Initial version',
      },
    });

    logger.info('Template created', { id: template.id, name: template.name });
    return this.mapToTemplate(template);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<Template | null> {
    const template = await prisma.designTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return null;
    }

    return this.mapToTemplate(template);
  }

  /**
   * List templates with filtering and pagination
   */
  async listTemplates(query: ListTemplatesQuery, userId?: string): Promise<ListResponse<Template>> {
    const {
      category,
      layerType,
      visibility,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.DesignTemplateWhereInput = {
      AND: [
        category ? { category } : {},
        layerType ? { layerType } : {},
        // Show public templates OR user's private templates
        visibility
          ? { visibility }
          : {
              OR: [
                { visibility: 'public' },
                { visibility: 'organization' },
                userId ? { createdBy: userId } : {},
              ],
            },
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        tags && tags.length > 0
          ? { tags: { hasSome: Array.isArray(tags) ? tags : [tags] } }
          : {},
      ],
    };

    // Get total count
    const total = await prisma.designTemplate.count({ where });

    // Get templates
    const templates = await prisma.designTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: templates.map(this.mapToTemplate),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    data: UpdateTemplateRequest,
    userId?: string
  ): Promise<Template | null> {
    logger.info('Updating template', { id });

    const existing = await prisma.designTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    // Check ownership
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new Error('FORBIDDEN: Cannot update template owned by another user');
    }

    // If templateData is being updated, create a new version
    let newVersion = existing.version;
    if (data.templateData) {
      newVersion = this.incrementVersion(existing.version);

      await prisma.templateVersion.create({
        data: {
          templateId: id,
          versionNumber: newVersion,
          templateData: data.templateData as any,
          changeLog: data.changeLog || `Updated to version ${newVersion}`,
        },
      });
    }

    const updated = await prisma.designTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        visibility: data.visibility,
        templateData: data.templateData as any,
        tags: data.tags,
        version: newVersion,
      },
    });

    logger.info('Template updated', { id, version: newVersion });
    return this.mapToTemplate(updated);
  }

  /**
   * Delete a template (soft delete by setting visibility)
   */
  async deleteTemplate(id: string, userId?: string): Promise<boolean> {
    logger.info('Deleting template', { id });

    const existing = await prisma.designTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return false;
    }

    // Check ownership
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new Error('FORBIDDEN: Cannot delete template owned by another user');
    }

    await prisma.designTemplate.delete({
      where: { id },
    });

    logger.info('Template deleted', { id });
    return true;
  }

  /**
   * Clone a template
   */
  async cloneTemplate(
    id: string,
    newName: string,
    visibility?: string,
    userId?: string
  ): Promise<Template | null> {
    logger.info('Cloning template', { id, newName });

    const existing = await prisma.designTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const clone = await prisma.designTemplate.create({
      data: {
        name: newName,
        description: existing.description,
        category: existing.category,
        visibility: (visibility as any) || 'private',
        templateData: existing.templateData,
        layerType: existing.layerType,
        thumbnail: existing.thumbnail,
        tags: existing.tags,
        createdBy: userId,
        version: '1.0.0',
        usageCount: 0,
      },
    });

    // Create initial version for clone
    await prisma.templateVersion.create({
      data: {
        templateId: clone.id,
        versionNumber: '1.0.0',
        templateData: existing.templateData,
        changeLog: `Cloned from template ${existing.name}`,
      },
    });

    logger.info('Template cloned', { originalId: id, newId: clone.id });
    return this.mapToTemplate(clone);
  }

  /**
   * Get template versions
   */
  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    const versions = await prisma.templateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      templateId: v.templateId,
      versionNumber: v.versionNumber,
      templateData: v.templateData as TemplateData,
      changeLog: v.changeLog || undefined,
      createdAt: v.createdAt,
    }));
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(id: string): Promise<void> {
    await prisma.designTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  /**
   * Map Prisma model to Template type
   */
  private mapToTemplate(model: any): Template {
    return {
      id: model.id,
      name: model.name,
      description: model.description || undefined,
      category: model.category,
      visibility: model.visibility,
      templateData: model.templateData as TemplateData,
      layerType: model.layerType || undefined,
      thumbnail: model.thumbnail || undefined,
      version: model.version,
      tags: model.tags,
      usageCount: model.usageCount,
      createdBy: model.createdBy || undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] += 1; // Increment patch version
    return parts.join('.');
  }
}

// Export singleton instance
export const templateService = new TemplateService();
