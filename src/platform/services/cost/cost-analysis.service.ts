/**
 * Cost Analysis Service
 * Real AWS Cost Explorer integration with PostgreSQL persistence - NO MOCK DATA
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  GetRightsizingRecommendationCommand,
  Granularity,
  Metric,
  GroupDefinitionType,
} from '@aws-sdk/client-cost-explorer';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('CostAnalysis');

export interface CostQueryParams {
  startDate: Date;
  endDate: Date;
  cloud: 'aws' | 'oci' | 'azure' | 'gcp';
  region?: string;
  service?: string;
  environment?: string;
  granularity?: 'daily' | 'monthly';
}

export interface CostData {
  date: Date;
  cloud: 'aws' | 'oci' | 'azure' | 'gcp';
  region?: string;
  service: string;
  environment?: 'dev' | 'uat' | 'production' | 'dr';
  cost: number;
  currency: string;
}

export interface CostRecommendation {
  id: string;
  type: 'rightsizing' | 'reserved_instance' | 'storage_lifecycle' | 'unused_resource';
  resourceId?: string;
  resourceName: string;
  currentConfig: any;
  recommendedConfig: any;
  estimatedSavings: number;
  currency: string;
  risk: 'low' | 'medium' | 'high';
  action: string;
  autoApplyable: boolean;
  createdAt: Date;
}

export class CostAnalysisService {
  private costExplorerClients: Map<string, CostExplorerClient> = new Map();

  constructor() {
    logger.info('Cost Analysis Service initialized');
  }

  /**
   * Get AWS Cost Explorer client
   */
  private getCostExplorerClient(region: string): CostExplorerClient {
    if (this.costExplorerClients.has(region)) {
      return this.costExplorerClients.get(region)!;
    }

    const client = new CostExplorerClient({ region });
    this.costExplorerClients.set(region, client);
    return client;
  }

  /**
   * Fetch cost data from AWS Cost Explorer
   * REAL DATA - queries actual AWS billing
   */
  async fetchCostData(params: CostQueryParams): Promise<CostData[]> {
    try {
      logger.info('Fetching cost data', { params });

      if (params.cloud !== 'aws') {
        throw new Error(`Cloud provider ${params.cloud} not yet supported`);
      }

      // Use us-east-1 for Cost Explorer (global service)
      const client = this.getCostExplorerClient('us-east-1');

      // Format dates for AWS API (YYYY-MM-DD)
      const startDate = params.startDate.toISOString().split('T')[0];
      const endDate = params.endDate.toISOString().split('T')[0];

      // Build command
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Granularity: params.granularity === 'monthly' ? Granularity.MONTHLY : Granularity.DAILY,
        Metrics: [Metric.UNBLENDED_COST],
        GroupBy: [
          { Type: GroupDefinitionType.DIMENSION, Key: 'SERVICE' },
          ...(params.region ? [{ Type: GroupDefinitionType.DIMENSION, Key: 'REGION' }] : []),
        ],
        Filter: this.buildCostFilter(params),
      });

      const response = await client.send(command);

      if (!response.ResultsByTime || response.ResultsByTime.length === 0) {
        logger.warn('No cost data returned from AWS', { params });
        return [];
      }

      // Transform AWS response to our format
      const costData: CostData[] = [];

      for (const result of response.ResultsByTime) {
        const date = new Date(result.TimePeriod!.Start!);

        if (!result.Groups || result.Groups.length === 0) {
          // No groups, add total cost
          const cost = parseFloat(result.Total?.UnblendedCost?.Amount || '0');
          costData.push({
            date,
            cloud: params.cloud,
            region: params.region,
            service: 'Total',
            environment: params.environment as 'dev' | 'uat' | 'production' | 'dr' | undefined,
            cost,
            currency: result.Total?.UnblendedCost?.Unit || 'USD',
          });
          continue;
        }

        for (const group of result.Groups) {
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');

          if (cost === 0) continue;

          const service = group.Keys?.[0] || 'Unknown';
          const region = group.Keys?.[1] || params.region;

          costData.push({
            date,
            cloud: params.cloud,
            region,
            service,
            environment: params.environment as 'dev' | 'uat' | 'production' | 'dr' | undefined,
            cost,
            currency: group.Metrics?.UnblendedCost?.Unit || 'USD',
          });
        }
      }

      // Save to database
      await this.saveCostRecords(costData);

      logger.info('Cost data fetched successfully', { records: costData.length });
      return costData;
    } catch (error: any) {
      logger.error('Failed to fetch cost data', { error: error.message });
      throw new Error(`Failed to fetch cost data: ${error.message}`);
    }
  }

  /**
   * Get cost data from database
   */
  async getCostData(params: CostQueryParams): Promise<CostData[]> {
    const where: any = {
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
      cloud: params.cloud,
    };

    if (params.region) where.region = params.region;
    if (params.service) where.service = params.service;
    if (params.environment) where.environment = params.environment;

    const records = await prisma.costRecord.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return records.map((r) => ({
      date: r.date,
      cloud: r.cloud,
      region: r.region || undefined,
      service: r.service,
      environment: r.environment || undefined,
      cost: r.cost,
      currency: r.currency,
    }));
  }

  /**
   * Generate cost recommendations
   * REAL RECOMMENDATIONS - from AWS Cost Explorer
   */
  async generateRecommendations(cloud: 'aws' | 'oci' = 'aws'): Promise<CostRecommendation[]> {
    try {
      logger.info('Generating cost recommendations', { cloud });

      if (cloud !== 'aws') {
        throw new Error(`Cloud provider ${cloud} not yet supported`);
      }

      const client = this.getCostExplorerClient('us-east-1');

      // Get rightsizing recommendations
      const command = new GetRightsizingRecommendationCommand({
        Service: 'AmazonEC2',
      });

      const response = await client.send(command);

      if (!response.RightsizingRecommendations || response.RightsizingRecommendations.length === 0) {
        logger.info('No recommendations available from AWS');
        return [];
      }

      const recommendations: CostRecommendation[] = [];

      for (const rec of response.RightsizingRecommendations) {
        const currentInstance = rec.CurrentInstance;
        const modifyRec = rec.ModifyRecommendationDetail;

        if (!currentInstance || !modifyRec) continue;

        const estimatedSavings = parseFloat(
          modifyRec.TargetInstances?.[0]?.EstimatedMonthlySavings || '0'
        );

        if (estimatedSavings === 0) continue;

        const recommendation: CostRecommendation = {
          id: uuidv4(),
          type: 'rightsizing',
          resourceId: currentInstance.ResourceId,
          resourceName: currentInstance.ResourceId || 'Unknown',
          currentConfig: {
            instanceType: currentInstance.ResourceDetails?.EC2ResourceDetails?.InstanceType,
            region: currentInstance.ResourceDetails?.EC2ResourceDetails?.Region,
            platform: currentInstance.ResourceDetails?.EC2ResourceDetails?.Platform,
          },
          recommendedConfig: {
            instanceType: modifyRec.TargetInstances?.[0]?.ResourceDetails?.EC2ResourceDetails?.InstanceType,
            platform: modifyRec.TargetInstances?.[0]?.ResourceDetails?.EC2ResourceDetails?.Platform,
          },
          estimatedSavings,
          currency: 'USD',
          risk: this.calculateRisk(rec.RightsizingType),
          action: `Change instance type from ${currentInstance.ResourceDetails?.EC2ResourceDetails?.InstanceType} to ${modifyRec.TargetInstances?.[0]?.ResourceDetails?.EC2ResourceDetails?.InstanceType}`,
          autoApplyable: false,
          createdAt: new Date(),
        };

        recommendations.push(recommendation);
      }

      // Save to database
      await this.saveRecommendations(recommendations);

      logger.info('Recommendations generated', { count: recommendations.length });
      return recommendations;
    } catch (error: any) {
      logger.error('Failed to generate recommendations', { error: error.message });
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  /**
   * Get saved recommendations
   */
  async getRecommendations(filters?: {
    type?: string;
    applied?: boolean;
    minSavings?: number;
  }): Promise<CostRecommendation[]> {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.applied !== undefined) where.applied = filters.applied;
    if (filters?.minSavings) {
      where.estimatedSavings = { gte: filters.minSavings };
    }

    const records = await prisma.costRecommendation.findMany({
      where,
      orderBy: { estimatedSavings: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      type: r.type as any,
      resourceId: r.resourceId || undefined,
      resourceName: r.resourceName,
      currentConfig: r.currentConfig as any,
      recommendedConfig: r.recommendedConfig as any,
      estimatedSavings: r.estimatedSavings,
      currency: r.currency,
      risk: r.risk as any,
      action: r.action,
      autoApplyable: r.autoApplyable,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Apply a recommendation
   */
  async applyRecommendation(recommendationId: string): Promise<void> {
    const recommendation = await prisma.costRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    if (recommendation.applied) {
      throw new Error('Recommendation already applied');
    }

    // Mark as applied (actual resource modification would be done by another service)
    await prisma.costRecommendation.update({
      where: { id: recommendationId },
      data: {
        applied: true,
        appliedAt: new Date(),
      },
    });

    logger.info('Recommendation marked as applied', { recommendationId });
  }

  /**
   * Get cost forecast
   * REAL FORECAST - from AWS Cost Explorer
   */
  async getCostForecast(
    cloud: 'aws',
    days: number = 30
  ): Promise<{ date: Date; cost: number; currency: string }[]> {
    try {
      logger.info('Getting cost forecast', { cloud, days });

      const client = this.getCostExplorerClient('us-east-1');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const command = new GetCostForecastCommand({
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0],
        },
        Metric: Metric.UNBLENDED_COST,
        Granularity: Granularity.DAILY,
      });

      const response = await client.send(command);

      if (!response.ForecastResultsByTime) {
        return [];
      }

      return response.ForecastResultsByTime.map((result) => ({
        date: new Date(result.TimePeriod!.Start!),
        cost: parseFloat(result.MeanValue || '0'),
        currency: 'USD',
      }));
    } catch (error: any) {
      logger.error('Failed to get cost forecast', { error: error.message });
      throw new Error(`Failed to get cost forecast: ${error.message}`);
    }
  }

  // Helper methods

  private buildCostFilter(params: CostQueryParams): any {
    const filters: any[] = [];

    if (params.service) {
      filters.push({
        Dimensions: {
          Key: 'SERVICE',
          Values: [params.service],
        },
      });
    }

    if (params.region) {
      filters.push({
        Dimensions: {
          Key: 'REGION',
          Values: [params.region],
        },
      });
    }

    if (params.environment) {
      filters.push({
        Tags: {
          Key: 'Environment',
          Values: [params.environment],
        },
      });
    }

    if (filters.length === 0) return undefined;
    if (filters.length === 1) return filters[0];

    return { And: filters };
  }

  private async saveCostRecords(costData: CostData[]): Promise<void> {
    for (const data of costData) {
      await prisma.costRecord.upsert({
        where: {
          date_cloud_service_region: {
            date: data.date,
            cloud: data.cloud,
            service: data.service,
            region: data.region || '',
          },
        },
        create: {
          date: data.date,
          cloud: data.cloud,
          region: data.region || '',
          service: data.service,
          environment: data.environment,
          cost: data.cost,
          currency: data.currency,
        },
        update: {
          cost: data.cost,
        },
      });
    }
  }

  private async saveRecommendations(recommendations: CostRecommendation[]): Promise<void> {
    for (const rec of recommendations) {
      await prisma.costRecommendation.create({
        data: {
          id: rec.id,
          type: rec.type,
          resourceId: rec.resourceId,
          resourceName: rec.resourceName,
          currentConfig: rec.currentConfig as any,
          recommendedConfig: rec.recommendedConfig as any,
          estimatedSavings: rec.estimatedSavings,
          currency: rec.currency,
          risk: rec.risk,
          action: rec.action,
          autoApplyable: rec.autoApplyable,
        },
      });
    }
  }

  private calculateRisk(rightsizingType?: string): 'low' | 'medium' | 'high' {
    if (!rightsizingType) return 'medium';
    if (rightsizingType === 'Terminate') return 'high';
    if (rightsizingType === 'Modify') return 'medium';
    return 'low';
  }
}

export default CostAnalysisService;
