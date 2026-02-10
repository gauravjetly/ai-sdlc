/**
 * AWS Adapter Integration Tests
 *
 * IMPORTANT: These tests create REAL AWS resources and incur costs.
 * Only run when you have:
 * 1. Valid AWS credentials configured
 * 2. Sufficient AWS permissions
 * 3. Budget allocated for testing
 *
 * To run tests:
 * - Set AWS_INTEGRATION_TEST=true environment variable
 * - Configure AWS credentials via environment variables or AWS CLI
 * - npm run test:integration
 *
 * Expected cost: $10-50 depending on resource creation time
 */

import { AwsAdapter } from '../../cloud-abstraction/adapters/aws-adapter';
import {
  CloudCredentials,
  VirtualNetworkConfig,
  KubernetesClusterConfig,
  ObjectStorageConfig,
  ManagedDatabaseConfig
} from '../../cloud-abstraction/types/cloud-types';

// Skip tests if AWS_INTEGRATION_TEST is not set
const runIntegrationTests = process.env.AWS_INTEGRATION_TEST === 'true';
const describeIf = (condition: boolean) => condition ? describe : describe.skip;

// Test configuration
const TEST_REGION = process.env.AWS_TEST_REGION || 'us-east-1';
const TEST_PREFIX = 'ai-platform-test';
const CLEANUP_TIMEOUT = 600000; // 10 minutes

// Resource IDs for cleanup
const createdResources: {
  vpc?: string;
  cluster?: string;
  database?: string;
  bucket?: string;
} = {};

describeIf(runIntegrationTests)('AWS Adapter Integration Tests', () => {
  let adapter: AwsAdapter;

  beforeAll(async () => {
    console.log('='.repeat(80));
    console.log('AWS INTEGRATION TEST SUITE');
    console.log('='.repeat(80));
    console.log('WARNING: These tests create REAL AWS resources and incur costs');
    console.log(`Region: ${TEST_REGION}`);
    console.log('='.repeat(80));

    adapter = new AwsAdapter();

    // Initialize adapter with credentials
    const credentials: CloudCredentials = {
      provider: 'aws',
      credentials: {
        region: TEST_REGION,
        // Will use default credential chain (env vars, AWS CLI, etc.)
      }
    };

    await adapter.connect(credentials);
  }, 30000);

  afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('CLEANUP: Deleting all test resources');
    console.log('='.repeat(80));

    try {
      // Delete resources in reverse order of dependencies
      if (createdResources.cluster) {
        console.log(`Deleting EKS cluster: ${createdResources.cluster}`);
        await adapter.deleteKubernetesCluster(createdResources.cluster);
      }

      if (createdResources.database) {
        console.log(`Deleting RDS database: ${createdResources.database}`);
        await adapter.deleteManagedDatabase(createdResources.database);
      }

      if (createdResources.bucket) {
        console.log(`Deleting S3 bucket: ${createdResources.bucket}`);
        await adapter.deleteObjectStorage(createdResources.bucket);
      }

      if (createdResources.vpc) {
        console.log(`Deleting VPC: ${createdResources.vpc}`);
        await adapter.deleteVirtualNetwork(createdResources.vpc);
      }

      console.log('='.repeat(80));
      console.log('CLEANUP COMPLETE');
      console.log('='.repeat(80));
    } catch (error) {
      console.error('Cleanup failed:', error);
      console.error('⚠ MANUAL CLEANUP REQUIRED - Check AWS Console');
    }
  }, CLEANUP_TIMEOUT);

  describe('Connection and Authentication', () => {
    it('should connect to AWS with valid credentials', async () => {
      expect(adapter).toBeDefined();
      const healthCheck = await adapter.healthCheck();
      expect(healthCheck).toBe(true);
    });

    it('should return supported regions', () => {
      const regions = adapter.getSupportedRegions();
      expect(regions).toContain('us-east-1');
      expect(regions).toContain('us-west-2');
      expect(regions).toContain('eu-west-1');
    });

    it('should return correct provider name', () => {
      expect(adapter.getProviderName()).toBe('aws');
    });
  });

  describe('VPC (Virtual Network) Operations', () => {
    it('should create a real VPC with subnets and internet gateway', async () => {
      const config: VirtualNetworkConfig = {
        name: `${TEST_PREFIX}-vpc`,
        cidr: '10.100.0.0/16',
        region: TEST_REGION,
        dns_enabled: true,
        tags: {
          'Purpose': 'integration-test',
          'AutoDelete': 'true'
        }
      };

      const result = await adapter.createVirtualNetwork(config);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^vpc-/);
      expect(result.type).toBe('virtual_network');
      expect(result.status).toBe('available');
      expect(result.provider).toBe('aws');
      expect(result.metadata.name).toBe(config.name);
      expect(result.metadata.cidr).toBe(config.cidr);
      expect(result.metadata.subnets).toHaveLength(2);
      expect(result.metadata.internetGatewayId).toMatch(/^igw-/);

      createdResources.vpc = result.id;

      console.log(`✓ VPC created: ${result.id}`);
    }, 120000); // 2 minutes

    it('should check VPC status', async () => {
      expect(createdResources.vpc).toBeDefined();

      const status = await adapter.getVirtualNetworkStatus(createdResources.vpc!);
      expect(status).toBe('available');

      console.log(`✓ VPC status: ${status}`);
    });
  });

  describe('S3 (Object Storage) Operations', () => {
    it('should create a real S3 bucket with encryption', async () => {
      const bucketName = `${TEST_PREFIX}-${Date.now()}-test`;

      const config: ObjectStorageConfig = {
        name: bucketName,
        versioning_enabled: true,
        encryption_enabled: true,
        public_access_blocked: true
      };

      const result = await adapter.createObjectStorage(config);

      expect(result).toBeDefined();
      expect(result.id).toBe(bucketName);
      expect(result.type).toBe('object_storage');
      expect(result.status).toBe('available');
      expect(result.metadata.encryption).toBe(true);
      expect(result.metadata.versioning).toBe(true);

      createdResources.bucket = result.id;

      console.log(`✓ S3 bucket created: ${result.id}`);
    }, 60000);

    it('should check S3 bucket status', async () => {
      expect(createdResources.bucket).toBeDefined();

      const status = await adapter.getObjectStorageStatus(createdResources.bucket!);
      expect(status).toBe('available');

      console.log(`✓ S3 bucket status: ${status}`);
    });
  });

  describe('RDS (Managed Database) Operations', () => {
    it('should create a real RDS PostgreSQL database', async () => {
      // Skip if VPC not created
      if (!createdResources.vpc) {
        console.log('⚠ Skipping RDS test - VPC not available');
        return;
      }

      const config: ManagedDatabaseConfig = {
        name: `${TEST_PREFIX}-db`.replace(/-/g, ''), // RDS doesn't allow hyphens
        engine: 'postgresql',
        version: '15.4',
        instance_class: 'small_db',
        storage_size_gb: 20,
        network: `${TEST_PREFIX}-vpc`,
        encryption_enabled: true,
        backup_retention_days: 1,
        high_availability: false
      };

      const result = await adapter.createManagedDatabase(config);

      expect(result).toBeDefined();
      expect(result.id).toBe(config.name);
      expect(result.type).toBe('managed_database');
      expect(result.status).toBe('available');
      expect(result.metadata.engine).toBe('postgresql');
      expect(result.metadata.endpoint).toBeDefined();

      createdResources.database = result.id;

      console.log(`✓ RDS database created: ${result.id}`);
      console.log(`  Endpoint: ${result.metadata.endpoint}:${result.metadata.port}`);
    }, 600000); // 10 minutes for RDS creation

    it('should check RDS database status', async () => {
      if (!createdResources.database) {
        return;
      }

      const status = await adapter.getManagedDatabaseStatus(createdResources.database!);
      expect(status).toBe('available');

      console.log(`✓ RDS database status: ${status}`);
    });
  });

  describe('EKS (Kubernetes Cluster) Operations', () => {
    it.skip('should create a real EKS cluster', async () => {
      // SKIP BY DEFAULT - EKS creation takes 15-20 minutes and costs more
      // To run: change it.skip to it

      if (!createdResources.vpc) {
        console.log('⚠ Skipping EKS test - VPC not available');
        return;
      }

      const config: KubernetesClusterConfig = {
        name: `${TEST_PREFIX}-eks`,
        version: '1.28',
        network: `${TEST_PREFIX}-vpc`,
        node_count: 2,
        instance_type: 'small_compute',
        enable_autoscaling: true,
        min_nodes: 2,
        max_nodes: 4
      };

      const result = await adapter.createKubernetesCluster(config);

      expect(result).toBeDefined();
      expect(result.id).toBe(config.name);
      expect(result.type).toBe('kubernetes_cluster');
      expect(result.status).toBe('available');
      expect(result.metadata.endpoint).toBeDefined();
      expect(result.metadata.certificateAuthority).toBeDefined();

      createdResources.cluster = result.id;

      console.log(`✓ EKS cluster created: ${result.id}`);
      console.log(`  Endpoint: ${result.metadata.endpoint}`);
    }, 1200000); // 20 minutes

    it.skip('should check EKS cluster status', async () => {
      if (!createdResources.cluster) {
        return;
      }

      const status = await adapter.getKubernetesClusterStatus(createdResources.cluster!);
      expect(status).toBe('available');

      console.log(`✓ EKS cluster status: ${status}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid VPC CIDR gracefully', async () => {
      const config: VirtualNetworkConfig = {
        name: `${TEST_PREFIX}-invalid-vpc`,
        cidr: 'invalid-cidr',
        region: TEST_REGION
      };

      await expect(adapter.createVirtualNetwork(config)).rejects.toThrow();
    });

    it('should handle duplicate S3 bucket name gracefully', async () => {
      if (!createdResources.bucket) {
        return;
      }

      const config: ObjectStorageConfig = {
        name: createdResources.bucket // Try to create with same name
      };

      await expect(adapter.createObjectStorage(config)).rejects.toThrow();
    });

    it('should handle non-existent resource status check', async () => {
      const status = await adapter.getVirtualNetworkStatus('vpc-nonexistent');
      expect(status).toBe('failed');
    });
  });

  describe('Resource Listing', () => {
    it('should list all created resources', () => {
      const resources = adapter.getAllResources();

      expect(resources).toBeDefined();
      expect(resources.size).toBeGreaterThan(0);

      console.log(`\nCreated resources summary:`);
      resources.forEach((resource, id) => {
        console.log(`  - ${resource.type}: ${id} (${resource.status})`);
      });
    });
  });
});

// Helper function to run cleanup manually if needed
export async function manualCleanup() {
  console.log('Manual cleanup function - use this if automated cleanup fails');
  console.log('Resources to clean up:', createdResources);

  // Instructions for manual cleanup
  console.log('\nManual cleanup steps:');
  if (createdResources.cluster) {
    console.log(`1. Delete EKS cluster: aws eks delete-cluster --name ${createdResources.cluster} --region ${TEST_REGION}`);
  }
  if (createdResources.database) {
    console.log(`2. Delete RDS database: aws rds delete-db-instance --db-instance-identifier ${createdResources.database} --skip-final-snapshot`);
  }
  if (createdResources.bucket) {
    console.log(`3. Empty and delete S3 bucket: aws s3 rb s3://${createdResources.bucket} --force`);
  }
  if (createdResources.vpc) {
    console.log(`4. Delete VPC: aws ec2 delete-vpc --vpc-id ${createdResources.vpc}`);
  }
}
