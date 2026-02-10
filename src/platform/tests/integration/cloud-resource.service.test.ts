/**
 * Integration Tests - CloudResourceService
 * Tests real AWS SDK operations with mocked AWS clients
 */

import { CloudResourceService } from '../../services/cloud/cloud-resource.service';
import { AWSProvider } from '../../services/cloud/providers/aws.provider';
import { prisma } from '../../infrastructure/database/prisma.client';
import { VPCConfig, ClusterConfig, DatabaseConfig } from '../../services/cloud/types';

// Mock AWS Provider
jest.mock('../../services/cloud/providers/aws.provider');

describe('CloudResourceService - Integration Tests', () => {
  let cloudResourceService: CloudResourceService;
  let mockAWSProvider: jest.Mocked<AWSProvider>;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    cloudResourceService = new CloudResourceService();

    // Setup AWS provider mock
    mockAWSProvider = {
      createVPC: jest.fn().mockResolvedValue({
        vpcId: 'vpc-test12345',
        subnets: [
          { subnetId: 'subnet-abc123', availabilityZone: 'us-east-1a' },
          { subnetId: 'subnet-def456', availabilityZone: 'us-east-1b' }
        ],
        internetGatewayId: 'igw-test789',
        routeTableId: 'rtb-test456'
      }),
      deleteVPC: jest.fn().mockResolvedValue(undefined),
      createCluster: jest.fn().mockResolvedValue({
        clusterArn: 'arn:aws:eks:us-east-1:123456789:cluster/test-cluster',
        name: 'test-cluster',
        endpoint: 'https://test-cluster.eks.amazonaws.com'
      }),
      deleteCluster: jest.fn().mockResolvedValue(undefined),
      createDatabase: jest.fn().mockResolvedValue({
        dbInstanceIdentifier: 'test-db',
        dbInstanceArn: 'arn:aws:rds:us-east-1:123456789:db:test-db',
        endpoint: 'test-db.abc123.us-east-1.rds.amazonaws.com'
      }),
      deleteDatabase: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock the private getAWSProvider method
    (cloudResourceService as any).getAWSProvider = jest.fn().mockReturnValue(mockAWSProvider);
  });

  afterEach(async () => {
    // Clean up test resources
    await prisma.cloudResource.deleteMany({
      where: {
        name: { contains: 'test-' }
      }
    });
    await prisma.resourceTag.deleteMany();
  });

  describe('VPC Operations', () => {
    it('should create VPC in AWS and database', async () => {
      // Arrange
      const config: VPCConfig = {
        name: 'test-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        cidrBlock: '10.0.0.0/16',
        enableDnsSupport: true,
        enableDnsHostnames: true,
        createdBy: 'test-user',
        tags: {
          Environment: 'dev',
          Project: 'test'
        }
      };

      // Act
      const result = await cloudResourceService.createVPC(config);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('resourceId', 'vpc-test12345');
      expect(result).toHaveProperty('name', 'test-vpc');
      expect(result).toHaveProperty('status', 'active');
      expect(result.subnets).toHaveLength(2);

      // Verify database record
      const resource = await prisma.cloudResource.findUnique({
        where: { id: result.id },
        include: { tags: true }
      });

      expect(resource).toBeTruthy();
      expect(resource?.resourceType).toBe('vpc');
      expect(resource?.cloud).toBe('aws');
      expect(resource?.region).toBe('us-east-1');
      expect(resource?.tags).toHaveLength(2);

      // Verify AWS API call
      expect(mockAWSProvider.createVPC).toHaveBeenCalledWith(config);
    });

    it('should handle VPC creation failure', async () => {
      // Arrange
      mockAWSProvider.createVPC.mockRejectedValueOnce(
        new Error('AWS API rate limit exceeded')
      );

      const config: VPCConfig = {
        name: 'test-failing-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        cidrBlock: '10.0.0.0/16',
        createdBy: 'test-user'
      };

      // Act & Assert
      await expect(cloudResourceService.createVPC(config)).rejects.toThrow(
        'AWS API rate limit exceeded'
      );

      // Verify database was updated with failed status
      const resources = await prisma.cloudResource.findMany({
        where: { name: 'test-failing-vpc' }
      });

      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0].status).toBe('failed');
    });

    it('should get VPC from database', async () => {
      // Arrange - Create VPC first
      const config: VPCConfig = {
        name: 'test-get-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        cidrBlock: '10.0.0.0/16',
        createdBy: 'test-user'
      };

      const created = await cloudResourceService.createVPC(config);

      // Act
      const vpc = await cloudResourceService.getVPC(created.id);

      // Assert
      expect(vpc).toHaveProperty('id', created.id);
      expect(vpc).toHaveProperty('resourceId', 'vpc-test12345');
      expect(vpc).toHaveProperty('name', 'test-get-vpc');
    });

    it('should delete VPC from AWS and database', async () => {
      // Arrange
      const config: VPCConfig = {
        name: 'test-delete-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        cidrBlock: '10.0.0.0/16',
        createdBy: 'test-user'
      };

      const created = await cloudResourceService.createVPC(config);

      // Act
      await cloudResourceService.deleteVPC(created.id);

      // Assert
      const deleted = await prisma.cloudResource.findUnique({
        where: { id: created.id }
      });

      expect(deleted?.status).toBe('deleted');
      expect(deleted?.deletedAt).toBeTruthy();
      expect(mockAWSProvider.deleteVPC).toHaveBeenCalledWith('vpc-test12345');
    });
  });

  describe('Cluster Operations', () => {
    it('should create EKS cluster in AWS and database', async () => {
      // Arrange
      const config: ClusterConfig = {
        name: 'test-cluster',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        kubernetesVersion: '1.28',
        nodeGroups: [
          {
            name: 'general',
            instanceType: 't3.medium',
            minSize: 2,
            maxSize: 5,
            desiredSize: 3
          }
        ],
        vpcId: 'vpc-test123',
        subnetIds: ['subnet-abc', 'subnet-def'],
        createdBy: 'test-user'
      };

      // Act
      const result = await cloudResourceService.createCluster(config);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('resourceId');
      expect(result).toHaveProperty('name', 'test-cluster');
      expect(result).toHaveProperty('status', 'creating');
      expect(result).toHaveProperty('version', '1.28');

      // Verify database
      const resource = await prisma.cloudResource.findUnique({
        where: { id: result.id }
      });

      expect(resource?.resourceType).toBe('cluster');
      expect(mockAWSProvider.createCluster).toHaveBeenCalledWith(config);
    });

    it('should get cluster from database', async () => {
      // Arrange
      const config: ClusterConfig = {
        name: 'test-get-cluster',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        kubernetesVersion: '1.28',
        vpcId: 'vpc-test123',
        subnetIds: ['subnet-abc'],
        createdBy: 'test-user'
      };

      const created = await cloudResourceService.createCluster(config);

      // Act
      const cluster = await cloudResourceService.getCluster(created.id);

      // Assert
      expect(cluster).toHaveProperty('id', created.id);
      expect(cluster).toHaveProperty('name', 'test-get-cluster');
      expect(cluster).toHaveProperty('version', '1.28');
    });

    it('should delete cluster from AWS and database', async () => {
      // Arrange
      const config: ClusterConfig = {
        name: 'test-delete-cluster',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        kubernetesVersion: '1.28',
        vpcId: 'vpc-test123',
        subnetIds: ['subnet-abc'],
        createdBy: 'test-user'
      };

      const created = await cloudResourceService.createCluster(config);

      // Act
      await cloudResourceService.deleteCluster(created.id);

      // Assert
      const deleted = await prisma.cloudResource.findUnique({
        where: { id: created.id }
      });

      expect(deleted?.status).toBe('deleted');
      expect(mockAWSProvider.deleteCluster).toHaveBeenCalled();
    });
  });

  describe('Database Operations', () => {
    it('should create RDS database in AWS and database', async () => {
      // Arrange
      const config: DatabaseConfig = {
        name: 'test-database',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        engine: 'postgres',
        engineVersion: '15.4',
        instanceClass: 'db.t3.medium',
        allocatedStorage: 100,
        storageType: 'gp3',
        masterUsername: 'admin',
        masterPassword: 'SecurePass123!',
        vpcId: 'vpc-test123',
        subnetIds: ['subnet-abc', 'subnet-def'],
        publiclyAccessible: false,
        multiAZ: true,
        backupRetentionPeriod: 7,
        createdBy: 'test-user'
      };

      // Act
      const result = await cloudResourceService.createDatabase(config);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('resourceId');
      expect(result).toHaveProperty('name', 'test-database');
      expect(result).toHaveProperty('engine', 'postgres');
      expect(result).toHaveProperty('port', 5432);
      expect(result).toHaveProperty('status', 'creating');

      // Verify database
      const resource = await prisma.cloudResource.findUnique({
        where: { id: result.id }
      });

      expect(resource?.resourceType).toBe('database');
      expect(mockAWSProvider.createDatabase).toHaveBeenCalledWith(config);
    });

    it('should get database from database', async () => {
      // Arrange
      const config: DatabaseConfig = {
        name: 'test-get-database',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        engine: 'postgres',
        instanceClass: 'db.t3.medium',
        allocatedStorage: 100,
        masterUsername: 'admin',
        masterPassword: 'SecurePass123!',
        createdBy: 'test-user'
      };

      const created = await cloudResourceService.createDatabase(config);

      // Act
      const database = await cloudResourceService.getDatabase(created.id);

      // Assert
      expect(database).toHaveProperty('id', created.id);
      expect(database).toHaveProperty('name', 'test-get-database');
      expect(database).toHaveProperty('engine', 'postgres');
    });

    it('should delete database from AWS and database', async () => {
      // Arrange
      const config: DatabaseConfig = {
        name: 'test-delete-database',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        engine: 'postgres',
        instanceClass: 'db.t3.medium',
        allocatedStorage: 100,
        masterUsername: 'admin',
        masterPassword: 'SecurePass123!',
        createdBy: 'test-user'
      };

      const created = await cloudResourceService.createDatabase(config);

      // Act
      await cloudResourceService.deleteDatabase(created.id);

      // Assert
      const deleted = await prisma.cloudResource.findUnique({
        where: { id: created.id }
      });

      expect(deleted?.status).toBe('deleted');
      expect(mockAWSProvider.deleteDatabase).toHaveBeenCalled();
    });
  });

  describe('List and Filter Resources', () => {
    it('should list all resources', async () => {
      // Arrange - Create multiple resources
      const vpcConfig: VPCConfig = {
        name: 'test-list-vpc',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'dev',
        cidrBlock: '10.0.0.0/16',
        createdBy: 'test-user'
      };

      const clusterConfig: ClusterConfig = {
        name: 'test-list-cluster',
        cloud: 'aws',
        region: 'us-east-1',
        environment: 'prod',
        kubernetesVersion: '1.28',
        vpcId: 'vpc-test123',
        subnetIds: ['subnet-abc'],
        createdBy: 'test-user'
      };

      await cloudResourceService.createVPC(vpcConfig);
      await cloudResourceService.createCluster(clusterConfig);

      // Act
      const allResources = await cloudResourceService.listResources();
      const devResources = await cloudResourceService.listResources({
        environment: 'dev'
      });
      const vpcResources = await cloudResourceService.listResources({
        resourceType: 'vpc'
      });

      // Assert
      expect(allResources.length).toBeGreaterThanOrEqual(2);
      expect(devResources.length).toBeGreaterThanOrEqual(1);
      expect(vpcResources.length).toBeGreaterThanOrEqual(1);
      expect(vpcResources.every(r => r.resourceType === 'vpc')).toBe(true);
    });

    it('should filter resources by multiple criteria', async () => {
      // Arrange
      const config: VPCConfig = {
        name: 'test-filter-vpc',
        cloud: 'aws',
        region: 'us-west-2',
        environment: 'staging',
        cidrBlock: '10.0.0.0/16',
        createdBy: 'test-user'
      };

      await cloudResourceService.createVPC(config);

      // Act
      const filtered = await cloudResourceService.listResources({
        cloud: 'aws',
        region: 'us-west-2',
        environment: 'staging',
        resourceType: 'vpc',
        status: 'active'
      });

      // Assert
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(resource => {
        expect(resource.cloud).toBe('aws');
        expect(resource.region).toBe('us-west-2');
        expect(resource.environment).toBe('staging');
        expect(resource.resourceType).toBe('vpc');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported cloud provider', async () => {
      // Arrange
      const config: VPCConfig = {
        name: 'test-oci-vpc',
        cloud: 'oci',
        region: 'us-ashburn-1',
        environment: 'dev',
        cidrBlock: '10.0.0.0/16',
        createdBy: 'test-user'
      };

      // Act & Assert
      await expect(cloudResourceService.createVPC(config)).rejects.toThrow(
        'OCI provider not yet implemented'
      );
    });

    it('should throw error when resource not found', async () => {
      // Act & Assert
      await expect(
        cloudResourceService.getVPC('non-existent-id')
      ).rejects.toThrow('VPC not found');

      await expect(
        cloudResourceService.getCluster('non-existent-id')
      ).rejects.toThrow('Cluster not found');

      await expect(
        cloudResourceService.getDatabase('non-existent-id')
      ).rejects.toThrow('Database not found');
    });
  });
});
