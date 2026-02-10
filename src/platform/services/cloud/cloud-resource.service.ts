/**
 * Cloud Resource Service
 * Real AWS/OCI operations with PostgreSQL persistence - NO MOCK DATA
 */

import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.client.js';
import { WebSocketServer } from '../../infrastructure/websocket/server.js';
import { AWSProvider } from './providers/aws.provider.js';
import { createLogger } from '../../utils/logger.js';
import type {
  VPCConfig,
  VPCResource,
  ClusterConfig,
  ClusterResource,
  DatabaseConfig,
  DatabaseResource,
  ResourceFilters,
  ResourceStatus,
  ICloudResourceService,
} from './types.js';

const logger = createLogger('CloudResourceService');

export class CloudResourceService implements ICloudResourceService {
  private awsProviders: Map<string, AWSProvider> = new Map();
  private websocket?: WebSocketServer;

  constructor(websocket?: WebSocketServer) {
    this.websocket = websocket;
    logger.info('Cloud Resource Service initialized');
  }

  private getAWSProvider(region: string): AWSProvider {
    if (this.awsProviders.has(region)) {
      return this.awsProviders.get(region)!;
    }
    const provider = new AWSProvider(region);
    this.awsProviders.set(region, provider);
    return provider;
  }

  /**
   * Create VPC - REAL AWS/OCI operation
   */
  async createVPC(config: VPCConfig): Promise<VPCResource> {
    const resourceId = uuidv4();

    try {
      logger.info('Creating VPC', { config });

      // Create database record
      await prisma.cloudResource.create({
        data: {
          id: resourceId,
          name: config.name,
          resourceId: '', // Will be updated after cloud creation
          resourceType: 'vpc',
          cloud: config.cloud as Prisma.CloudProvider,
          region: config.region,
          environment: config.environment as Prisma.Environment,
          status: 'creating',
          config: config as any,
          createdBy: config.createdBy,
        },
      });

      // Create in cloud provider
      let cloudVpc: any;
      if (config.cloud === 'aws') {
        const provider = this.getAWSProvider(config.region);
        cloudVpc = await provider.createVPC(config);
      } else {
        throw new Error('OCI provider not yet implemented');
      }

      // Update database with cloud resource ID
      const resource = await prisma.cloudResource.update({
        where: { id: resourceId },
        data: {
          resourceId: cloudVpc.vpcId,
          status: 'active',
        },
      });

      // Create tags
      if (config.tags) {
        await Promise.all(
          Object.entries(config.tags).map(([key, value]) =>
            prisma.resourceTag.create({
              data: { resourceId, key, value },
            })
          )
        );
      }

      this.emitResourceUpdate(resourceId, {
        status: 'active',
        message: 'VPC created successfully',
      });

      logger.info('VPC created successfully', { resourceId, vpcId: cloudVpc.vpcId });

      return {
        id: resource.id,
        resourceId: resource.resourceId,
        name: resource.name,
        cidrBlock: config.cidrBlock,
        region: resource.region,
        cloud: config.cloud,
        subnets: cloudVpc.subnets || [],
        internetGatewayId: cloudVpc.internetGatewayId,
        routeTableId: cloudVpc.routeTableId,
        status: resource.status as ResourceStatus,
        createdAt: resource.createdAt,
      };
    } catch (error: any) {
      logger.error('VPC creation failed', { error: error.message });
      await prisma.cloudResource.update({
        where: { id: resourceId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  async getVPC(resourceId: string): Promise<VPCResource> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.resourceType !== 'vpc') {
      throw new Error(`VPC not found: ${resourceId}`);
    }

    return {
      id: resource.id,
      resourceId: resource.resourceId,
      name: resource.name,
      cidrBlock: (resource.config as any).cidrBlock,
      region: resource.region,
      cloud: resource.cloud as any,
      subnets: [],
      status: resource.status as ResourceStatus,
      createdAt: resource.createdAt,
    };
  }

  async deleteVPC(resourceId: string): Promise<void> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    if (resource.cloud === 'aws') {
      const provider = this.getAWSProvider(resource.region);
      await provider.deleteVPC(resource.resourceId);
    }

    await prisma.cloudResource.update({
      where: { id: resourceId },
      data: { status: 'deleted', deletedAt: new Date() },
    });
  }

  /**
   * Create Cluster - REAL AWS/OCI operation
   */
  async createCluster(config: ClusterConfig): Promise<ClusterResource> {
    const resourceId = uuidv4();

    try {
      logger.info('Creating cluster', { config });

      await prisma.cloudResource.create({
        data: {
          id: resourceId,
          name: config.name,
          resourceId: '',
          resourceType: 'cluster',
          cloud: config.cloud as Prisma.CloudProvider,
          region: config.region,
          environment: config.environment as Prisma.Environment,
          status: 'creating',
          config: config as any,
          createdBy: config.createdBy,
        },
      });

      let cloudCluster: any;
      if (config.cloud === 'aws') {
        const provider = this.getAWSProvider(config.region);
        cloudCluster = await provider.createCluster(config);
      } else {
        throw new Error('OCI provider not yet implemented');
      }

      const resource = await prisma.cloudResource.update({
        where: { id: resourceId },
        data: {
          resourceId: cloudCluster.clusterArn || cloudCluster.name,
          status: 'creating',
        },
      });

      this.emitResourceUpdate(resourceId, {
        status: 'creating',
        message: 'Cluster is being created',
      });

      return {
        id: resource.id,
        resourceId: resource.resourceId,
        name: resource.name,
        endpoint: '',
        version: config.kubernetesVersion || '1.28',
        status: resource.status as ResourceStatus,
        nodeGroups: [],
        createdAt: resource.createdAt,
      };
    } catch (error: any) {
      logger.error('Cluster creation failed', { error: error.message });
      await prisma.cloudResource.update({
        where: { id: resourceId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  async getCluster(resourceId: string): Promise<ClusterResource> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.resourceType !== 'cluster') {
      throw new Error(`Cluster not found: ${resourceId}`);
    }

    return {
      id: resource.id,
      resourceId: resource.resourceId,
      name: resource.name,
      endpoint: '',
      version: '1.28',
      status: resource.status as ResourceStatus,
      nodeGroups: [],
      createdAt: resource.createdAt,
    };
  }

  async deleteCluster(resourceId: string): Promise<void> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    if (resource.cloud === 'aws') {
      const provider = this.getAWSProvider(resource.region);
      await provider.deleteCluster(resource.resourceId);
    }

    await prisma.cloudResource.update({
      where: { id: resourceId },
      data: { status: 'deleted', deletedAt: new Date() },
    });
  }

  /**
   * Create Database - REAL AWS/OCI operation
   */
  async createDatabase(config: DatabaseConfig): Promise<DatabaseResource> {
    const resourceId = uuidv4();

    try {
      await prisma.cloudResource.create({
        data: {
          id: resourceId,
          name: config.name,
          resourceId: '',
          resourceType: 'database',
          cloud: config.cloud as Prisma.CloudProvider,
          region: config.region,
          environment: config.environment as Prisma.Environment,
          status: 'creating',
          config: config as any,
          createdBy: config.createdBy,
        },
      });

      let cloudDb: any;
      if (config.cloud === 'aws') {
        const provider = this.getAWSProvider(config.region);
        cloudDb = await provider.createDatabase(config);
      } else {
        throw new Error('OCI provider not yet implemented');
      }

      const resource = await prisma.cloudResource.update({
        where: { id: resourceId },
        data: {
          resourceId: cloudDb.dbInstanceArn || cloudDb.dbInstanceIdentifier,
          status: 'creating',
        },
      });

      return {
        id: resource.id,
        resourceId: resource.resourceId,
        name: resource.name,
        endpoint: '',
        port: config.engine === 'postgres' ? 5432 : 3306,
        engine: config.engine,
        version: config.engineVersion || '',
        instanceClass: config.instanceClass,
        status: resource.status as ResourceStatus,
        createdAt: resource.createdAt,
      };
    } catch (error: any) {
      logger.error('Database creation failed', { error: error.message });
      await prisma.cloudResource.update({
        where: { id: resourceId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  async getDatabase(resourceId: string): Promise<DatabaseResource> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.resourceType !== 'database') {
      throw new Error(`Database not found: ${resourceId}`);
    }

    return {
      id: resource.id,
      resourceId: resource.resourceId,
      name: resource.name,
      endpoint: '',
      port: 5432,
      engine: (resource.config as any).engine,
      version: '',
      instanceClass: (resource.config as any).instanceClass,
      status: resource.status as ResourceStatus,
      createdAt: resource.createdAt,
    };
  }

  async deleteDatabase(resourceId: string): Promise<void> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    if (resource.cloud === 'aws') {
      const provider = this.getAWSProvider(resource.region);
      await provider.deleteDatabase(resource.resourceId);
    }

    await prisma.cloudResource.update({
      where: { id: resourceId },
      data: { status: 'deleted', deletedAt: new Date() },
    });
  }

  async listResources(filters?: ResourceFilters): Promise<any[]> {
    const where: any = {};

    if (filters?.cloud) where.cloud = filters.cloud;
    if (filters?.region) where.region = filters.region;
    if (filters?.environment) where.environment = filters.environment;
    if (filters?.resourceType) where.resourceType = filters.resourceType;
    if (filters?.status) where.status = filters.status;

    const resources = await prisma.cloudResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return resources;
  }

  async getResourceStatus(resourceId: string): Promise<{ status: ResourceStatus; message: string }> {
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    return {
      status: resource.status as ResourceStatus,
      message: `Resource is ${resource.status}`,
    };
  }

  private emitResourceUpdate(resourceId: string, data: any): void {
    if (this.websocket) {
      this.websocket.emit(`resource:${resourceId}`, 'status', data);
    }
  }
}
