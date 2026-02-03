/**
 * Design Service
 * Business logic for managing visual designs
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import {
  Design,
  DesignVersion,
  CreateDesignRequest,
  UpdateDesignRequest,
  ListDesignsQuery,
  ListResponse,
  DesignData,
  DesignStatus,
  CostEstimate,
  LayerType,
} from '../types/designer.js';
import { templateService } from './TemplateService.js';

const logger = createLogger('DesignService');
const prisma = new PrismaClient();

export class DesignService {
  /**
   * Create a new design
   */
  async createDesign(data: CreateDesignRequest, userId?: string): Promise<Design> {
    logger.info('Creating design', { name: data.name, cloud: data.cloud });

    let designData: DesignData = { nodes: [], edges: [] };

    // If templateId provided, copy template data
    if (data.templateId) {
      const template = await templateService.getTemplateById(data.templateId);
      if (template) {
        designData = {
          nodes: template.templateData.nodes,
          edges: template.templateData.edges,
        };
        // Increment template usage
        await templateService.incrementUsage(data.templateId);
      }
    }

    const design = await prisma.visualDesign.create({
      data: {
        name: data.name,
        description: data.description,
        designData: designData as any,
        status: 'draft',
        cloud: data.cloud,
        region: data.region,
        environment: data.environment,
        currency: 'USD',
        createdBy: userId,
      },
    });

    // Create initial version
    await prisma.designVersion.create({
      data: {
        designId: design.id,
        versionNumber: 1,
        designData: designData as any,
        changeLog: 'Initial design',
        createdBy: userId,
      },
    });

    logger.info('Design created', { id: design.id, name: design.name });
    return this.mapToDesign(design);
  }

  /**
   * Get design by ID
   */
  async getDesignById(id: string): Promise<Design | null> {
    const design = await prisma.visualDesign.findUnique({
      where: { id },
    });

    if (!design) {
      return null;
    }

    return this.mapToDesign(design);
  }

  /**
   * Get design with related data
   */
  async getDesignWithRelations(id: string): Promise<{
    design: Design;
    versions: DesignVersion[];
    workflow?: any;
  } | null> {
    const design = await prisma.visualDesign.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
        workflow: true,
      },
    });

    if (!design) {
      return null;
    }

    return {
      design: this.mapToDesign(design),
      versions: design.versions.map((v) => ({
        id: v.id,
        designId: v.designId,
        versionNumber: v.versionNumber,
        designData: v.designData as DesignData,
        changeLog: v.changeLog || undefined,
        createdBy: v.createdBy || undefined,
        createdAt: v.createdAt,
      })),
      workflow: design.workflow,
    };
  }

  /**
   * List designs with filtering and pagination
   */
  async listDesigns(query: ListDesignsQuery, userId?: string): Promise<ListResponse<Design>> {
    const {
      status,
      environment,
      cloud,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.VisualDesignWhereInput = {
      AND: [
        status ? { status } : {},
        environment ? { environment } : {},
        cloud ? { cloud } : {},
        // Only show user's designs
        userId ? { createdBy: userId } : {},
      ],
    };

    // Get total count
    const total = await prisma.visualDesign.count({ where });

    // Get designs
    const designs = await prisma.visualDesign.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: designs.map(this.mapToDesign),
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
   * Update a design
   */
  async updateDesign(
    id: string,
    data: UpdateDesignRequest,
    userId?: string
  ): Promise<Design | null> {
    logger.info('Updating design', { id });

    const existing = await prisma.visualDesign.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    // Check ownership
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new Error('FORBIDDEN: Cannot update design owned by another user');
    }

    // If designData is being updated and createVersion is true, create a new version
    if (data.designData && data.createVersion) {
      const latestVersion = await prisma.designVersion.findFirst({
        where: { designId: id },
        orderBy: { versionNumber: 'desc' },
      });

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      await prisma.designVersion.create({
        data: {
          designId: id,
          versionNumber: newVersionNumber,
          designData: data.designData as any,
          changeLog: data.changeLog || `Version ${newVersionNumber}`,
          createdBy: userId,
        },
      });
    }

    const updated = await prisma.visualDesign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        designData: data.designData as any,
        environment: data.environment,
      },
    });

    logger.info('Design updated', { id });
    return this.mapToDesign(updated);
  }

  /**
   * Update design status
   */
  async updateDesignStatus(id: string, status: DesignStatus): Promise<Design | null> {
    logger.info('Updating design status', { id, status });

    const updated = await prisma.visualDesign.update({
      where: { id },
      data: {
        status,
        lastDeployedAt: status === 'deployed' ? new Date() : undefined,
      },
    });

    return this.mapToDesign(updated);
  }

  /**
   * Delete a design
   */
  async deleteDesign(id: string, userId?: string): Promise<boolean> {
    logger.info('Deleting design', { id });

    const existing = await prisma.visualDesign.findUnique({
      where: { id },
    });

    if (!existing) {
      return false;
    }

    // Check ownership
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new Error('FORBIDDEN: Cannot delete design owned by another user');
    }

    await prisma.visualDesign.delete({
      where: { id },
    });

    logger.info('Design deleted', { id });
    return true;
  }

  /**
   * Get design versions
   */
  async getDesignVersions(designId: string): Promise<DesignVersion[]> {
    const versions = await prisma.designVersion.findMany({
      where: { designId },
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      designId: v.designId,
      versionNumber: v.versionNumber,
      designData: v.designData as DesignData,
      changeLog: v.changeLog || undefined,
      createdBy: v.createdBy || undefined,
      createdAt: v.createdAt,
    }));
  }

  /**
   * Estimate monthly cost for a design
   */
  async estimateCost(id: string): Promise<CostEstimate | null> {
    const design = await this.getDesignById(id);
    if (!design) {
      return null;
    }

    const breakdown: CostEstimate['breakdown'] = [];
    const byLayer: Record<LayerType, number> = {
      network: 0,
      platform: 0,
      devops: 0,
      fullstack: 0,
    };
    const byService: Record<string, number> = {};

    // Calculate costs based on node types
    for (const node of design.designData.nodes) {
      const cost = this.getNodeCost(node.type, node.data);

      breakdown.push({
        resourceType: node.type,
        resourceName: node.data.name || node.id,
        count: 1,
        unitCost: cost,
        totalCost: cost,
        currency: 'USD',
      });

      byLayer[node.layer] = (byLayer[node.layer] || 0) + cost;
      byService[node.type] = (byService[node.type] || 0) + cost;
    }

    const totalMonthly = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    // Update design with cost estimate
    await prisma.visualDesign.update({
      where: { id },
      data: {
        estimatedMonthlyCost: totalMonthly,
      },
    });

    return {
      totalMonthly,
      currency: 'USD',
      breakdown,
      byLayer,
      byService,
      estimatedAt: new Date(),
    };
  }

  /**
   * Get estimated monthly cost for a node type
   */
  private getNodeCost(nodeType: string, data: Record<string, any>): number {
    // Base costs for AWS resources (monthly estimates)
    const baseCosts: Record<string, number> = {
      vpc: 0, // VPCs are free
      subnet: 0, // Subnets are free
      internet_gateway: 0, // IGWs are free
      nat_gateway: 32.4, // ~$0.045/hr
      security_group: 0, // Security groups are free
      route_table: 0, // Route tables are free
      eks_cluster: 72, // ~$0.10/hr for control plane
      eks_node_group: 150, // Varies by instance type
      rds_instance: 100, // Varies by instance type
      rds_aurora: 200, // Varies by instance type
      elasticache: 50, // Varies by instance type
      alb: 22.5, // ~$0.0225/hr + LCU charges
      nlb: 22.5, // ~$0.0225/hr + LCU charges
      s3_bucket: 5, // Varies by storage
      lambda_function: 10, // Varies by invocations
      iam_role: 0, // IAM is free
      codepipeline: 1, // $1 per active pipeline
      cloudwatch: 5, // Varies by metrics/logs
    };

    return baseCosts[nodeType] || 10; // Default $10 for unknown
  }

  /**
   * Map Prisma model to Design type
   */
  private mapToDesign(model: any): Design {
    return {
      id: model.id,
      name: model.name,
      description: model.description || undefined,
      designData: model.designData as DesignData,
      status: model.status,
      environment: model.environment || undefined,
      cloud: model.cloud || undefined,
      region: model.region || undefined,
      estimatedMonthlyCost: model.estimatedMonthlyCost || undefined,
      currency: model.currency,
      createdBy: model.createdBy || undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      lastDeployedAt: model.lastDeployedAt || undefined,
    };
  }
}

// Export singleton instance
export const designService = new DesignService();
