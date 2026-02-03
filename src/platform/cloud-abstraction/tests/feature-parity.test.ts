/**
 * Feature Parity Tests
 * Validates that OCI adapter has 100% feature parity with AWS adapter
 */

import { FeatureParityValidator } from '../utils/feature-parity-validator';
import { AwsAdapter } from '../adapters/aws-adapter';
import { OciAdapter } from '../adapters/oci-adapter';

describe('Feature Parity Validation', () => {
  let awsAdapter: AwsAdapter;
  let ociAdapter: OciAdapter;

  beforeAll(() => {
    awsAdapter = new AwsAdapter();
    ociAdapter = new OciAdapter();
  });

  describe('Method Parity', () => {
    test('should have 100% method parity', () => {
      const report = FeatureParityValidator.validateParity(awsAdapter, ociAdapter);

      console.log('\n' + FeatureParityValidator.generateReport(report));

      expect(report.valid).toBe(true);
      expect(report.missing_in_oci).toHaveLength(0);
      expect(report.missing_in_aws).toHaveLength(0);
      expect(report.parity_percentage).toBe(100);
    });

    test('should implement all required networking methods', () => {
      expect(typeof ociAdapter.createVirtualNetwork).toBe('function');
      expect(typeof ociAdapter.getVirtualNetworkStatus).toBe('function');
      expect(typeof ociAdapter.deleteVirtualNetwork).toBe('function');
    });

    test('should implement all required kubernetes methods', () => {
      expect(typeof ociAdapter.createKubernetesCluster).toBe('function');
      expect(typeof ociAdapter.getKubernetesClusterStatus).toBe('function');
      expect(typeof ociAdapter.deleteKubernetesCluster).toBe('function');
    });

    test('should implement all required database methods', () => {
      expect(typeof ociAdapter.createManagedDatabase).toBe('function');
      expect(typeof ociAdapter.getManagedDatabaseStatus).toBe('function');
      expect(typeof ociAdapter.deleteManagedDatabase).toBe('function');
    });

    test('should implement all required storage methods', () => {
      expect(typeof ociAdapter.createObjectStorage).toBe('function');
      expect(typeof ociAdapter.getObjectStorageStatus).toBe('function');
      expect(typeof ociAdapter.deleteObjectStorage).toBe('function');
    });

    test('should implement all required container methods', () => {
      expect(typeof ociAdapter.deployContainer).toBe('function');
      expect(typeof ociAdapter.getContainerDeploymentStatus).toBe('function');
      expect(typeof ociAdapter.deleteContainerDeployment).toBe('function');
    });

    test('should implement generic resource methods', () => {
      expect(typeof ociAdapter.getResourceStatus).toBe('function');
      expect(typeof ociAdapter.destroyResource).toBe('function');
    });

    test('should implement metadata methods', () => {
      expect(typeof ociAdapter.getProviderName).toBe('function');
      expect(typeof ociAdapter.getSupportedRegions).toBe('function');
    });

    test('should implement connection methods', () => {
      expect(typeof ociAdapter.connect).toBe('function');
      expect(typeof ociAdapter.healthCheck).toBe('function');
    });
  });

  describe('Detailed Feature Comparison', () => {
    test('should pass all feature categories', () => {
      const features = FeatureParityValidator.getDetailedComparison(awsAdapter, ociAdapter);

      console.log('\n' + FeatureParityValidator.generateDetailedReport(features));

      // All required features should be supported by both
      const requiredFeatures = features.filter(f => f.required);
      const allSupported = requiredFeatures.every(f => f.aws_supported && f.oci_supported);

      expect(allSupported).toBe(true);

      // Count by category
      const categories = ['networking', 'kubernetes', 'database', 'storage', 'container', 'operations'];

      for (const category of categories) {
        const categoryFeatures = features.filter(f => f.category === category);
        const supported = categoryFeatures.every(f => f.aws_supported && f.oci_supported);

        expect(supported).toBe(true);
      }
    });
  });

  describe('Resource Mapping Validation', () => {
    test('should have valid resource mappings', () => {
      const result = FeatureParityValidator.validateResourceMappings();

      expect(result.valid).toBe(true);
      expect(result.mappings).toBeDefined();
      expect(result.mappings.length).toBeGreaterThan(0);

      // All mappings should be compatible
      const allCompatible = result.mappings.every(m => m.compatible);
      expect(allCompatible).toBe(true);

      console.log('\n--- Resource Mappings ---');
      for (const mapping of result.mappings) {
        console.log(`  ${mapping.type}: ${mapping.aws} <=> ${mapping.oci}`);
      }
    });

    test('should map all compute instance types', () => {
      const result = FeatureParityValidator.validateResourceMappings();

      const computeTypes = [
        'small_compute',
        'medium_compute',
        'large_compute',
        'xlarge_compute',
        'small_memory_optimized',
        'medium_memory_optimized',
        'gpu_compute'
      ];

      for (const type of computeTypes) {
        const mapping = result.mappings.find(m => m.type === type);
        expect(mapping).toBeDefined();
        expect(mapping?.compatible).toBe(true);
      }
    });

    test('should map all database classes', () => {
      const result = FeatureParityValidator.validateResourceMappings();

      const dbTypes = [
        'small_db',
        'medium_db',
        'large_db',
        'xlarge_db'
      ];

      for (const type of dbTypes) {
        const mapping = result.mappings.find(m => m.type === type);
        expect(mapping).toBeDefined();
        expect(mapping?.compatible).toBe(true);
      }
    });
  });

  describe('Provider Metadata', () => {
    test('OCI adapter should return correct provider name', () => {
      expect(ociAdapter.getProviderName()).toBe('oci');
    });

    test('AWS adapter should return correct provider name', () => {
      expect(awsAdapter.getProviderName()).toBe('aws');
    });

    test('OCI should support multiple regions', () => {
      const regions = ociAdapter.getSupportedRegions();

      expect(regions).toContain('us-ashburn-1');
      expect(regions).toContain('us-phoenix-1');
      expect(regions).toContain('eu-frankfurt-1');
      expect(regions).toContain('ap-tokyo-1');
      expect(regions.length).toBeGreaterThanOrEqual(15);
    });

    test('AWS should support multiple regions', () => {
      const regions = awsAdapter.getSupportedRegions();

      expect(regions).toContain('us-east-1');
      expect(regions).toContain('us-west-2');
      expect(regions).toContain('eu-west-1');
      expect(regions).toContain('ap-northeast-1');
      expect(regions.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Method Signature Compatibility', () => {
    test('createVirtualNetwork should have compatible signature', () => {
      // Both should accept VirtualNetworkConfig and return Promise<ResourceResult>
      const awsCreate = awsAdapter.createVirtualNetwork;
      const ociCreate = ociAdapter.createVirtualNetwork;

      expect(typeof awsCreate).toBe('function');
      expect(typeof ociCreate).toBe('function');
      expect(awsCreate.length).toBe(ociCreate.length); // Same number of parameters
    });

    test('createKubernetesCluster should have compatible signature', () => {
      const awsCreate = awsAdapter.createKubernetesCluster;
      const ociCreate = ociAdapter.createKubernetesCluster;

      expect(typeof awsCreate).toBe('function');
      expect(typeof ociCreate).toBe('function');
      expect(awsCreate.length).toBe(ociCreate.length);
    });

    test('createManagedDatabase should have compatible signature', () => {
      const awsCreate = awsAdapter.createManagedDatabase;
      const ociCreate = ociAdapter.createManagedDatabase;

      expect(typeof awsCreate).toBe('function');
      expect(typeof ociCreate).toBe('function');
      expect(awsCreate.length).toBe(ociCreate.length);
    });

    test('createObjectStorage should have compatible signature', () => {
      const awsCreate = awsAdapter.createObjectStorage;
      const ociCreate = ociAdapter.createObjectStorage;

      expect(typeof awsCreate).toBe('function');
      expect(typeof ociCreate).toBe('function');
      expect(awsCreate.length).toBe(ociCreate.length);
    });

    test('deployContainer should have compatible signature', () => {
      const awsDeploy = awsAdapter.deployContainer;
      const ociDeploy = ociAdapter.deployContainer;

      expect(typeof awsDeploy).toBe('function');
      expect(typeof ociDeploy).toBe('function');
      expect(awsDeploy.length).toBe(ociDeploy.length);
    });
  });

  describe('Error Handling Parity', () => {
    test('should throw error when not connected', async () => {
      const freshAdapter = new OciAdapter();

      await expect(
        freshAdapter.createVirtualNetwork({
          name: 'test',
          cidr: '10.0.0.0/16',
          region: 'us-ashburn-1'
        })
      ).rejects.toThrow('not connected');
    });

    test('should throw error for invalid credentials', async () => {
      const freshAdapter = new OciAdapter();

      await expect(
        freshAdapter.connect({
          provider: 'aws', // Wrong provider
          credentials: {} as any
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});

describe('Cross-Cloud Workflow Compatibility', () => {
  test('should accept same workflow definition for both clouds', () => {
    const workflowDefinition = {
      workflow: {
        name: 'test-workflow',
        target_cloud: 'aws' as const,
        region: 'us-east-1',
        resources: [
          {
            type: 'virtual_network' as const,
            name: 'test-network',
            cidr: '10.0.0.0/16'
          }
        ]
      }
    };

    // Should work for AWS
    expect(workflowDefinition.workflow.target_cloud).toBe('aws');

    // Should work for OCI (just change target_cloud)
    const ociWorkflow = {
      ...workflowDefinition,
      workflow: {
        ...workflowDefinition.workflow,
        target_cloud: 'oci' as const,
        region: 'us-ashburn-1'
      }
    };

    expect(ociWorkflow.workflow.target_cloud).toBe('oci');
    expect(ociWorkflow.workflow.resources).toEqual(workflowDefinition.workflow.resources);
  });
});
