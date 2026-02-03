/**
 * OCI Adapter Integration Tests
 *
 * NOTE: These tests require valid OCI credentials and will create real resources.
 * Set environment variable RUN_OCI_INTEGRATION_TESTS=true to run these tests.
 *
 * Prerequisites:
 * - Valid ~/.oci/config file with credentials
 * - OCI compartment with appropriate permissions
 * - Budget for test resource creation (~$50-100)
 */

import { OciAdapter } from '../../adapters/oci-adapter';
import { CloudCredentials } from '../../types/cloud-types';

// Only run if explicitly enabled
const SKIP_TESTS = process.env.RUN_OCI_INTEGRATION_TESTS !== 'true';

describe('OCI Adapter Integration Tests', () => {
  let adapter: OciAdapter;
  const testRegion = process.env.OCI_TEST_REGION || 'us-ashburn-1';
  const testCompartmentId = process.env.OCI_TEST_COMPARTMENT_ID || '';

  beforeAll(async () => {
    if (SKIP_TESTS) {
      console.log('⚠ Skipping OCI integration tests. Set RUN_OCI_INTEGRATION_TESTS=true to run.');
      return;
    }

    if (!testCompartmentId) {
      throw new Error('OCI_TEST_COMPARTMENT_ID environment variable is required');
    }

    adapter = new OciAdapter();

    const credentials: CloudCredentials = {
      provider: 'oci',
      credentials: {
        region: testRegion,
        user_ocid: '', // Will use config file
        tenancy_ocid: '', // Will use config file
        fingerprint: '', // Will use config file
        private_key_path: '', // Will use config file
        compartment_id: testCompartmentId
      }
    };

    await adapter.connect(credentials);
  });

  describe('Connection and Health', () => {
    test('should connect to OCI successfully', async () => {
      if (SKIP_TESTS) return;

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('oci');
    });

    test('should pass health check', async () => {
      if (SKIP_TESTS) return;

      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(true);
    });

    test('should return supported regions', () => {
      if (SKIP_TESTS) return;

      const regions = adapter.getSupportedRegions();
      expect(regions).toContain('us-ashburn-1');
      expect(regions).toContain('us-phoenix-1');
      expect(regions).toContain('eu-frankfurt-1');
      expect(regions.length).toBeGreaterThan(10);
    });
  });

  describe('Virtual Network Operations', () => {
    const vcnName = `test-vcn-${Date.now()}`;
    let vcnId: string;

    test('should create a VCN', async () => {
      if (SKIP_TESTS) return;

      const result = await adapter.createVirtualNetwork({
        name: vcnName,
        cidr: '10.0.0.0/16',
        region: testRegion,
        enable_flow_logs: false,
        dns_enabled: true
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('virtual_network');
      expect(result.provider).toBe('oci');
      expect(result.status).toBe('available');
      expect(result.metadata.name).toBe(vcnName);
      expect(result.metadata.cidr).toBe('10.0.0.0/16');

      vcnId = result.id;
    }, 300000); // 5 minute timeout

    test('should get VCN status', async () => {
      if (SKIP_TESTS || !vcnId) return;

      const status = await adapter.getVirtualNetworkStatus(vcnId);
      expect(status).toBe('available');
    });

    test('should delete VCN', async () => {
      if (SKIP_TESTS || !vcnId) return;

      await adapter.deleteVirtualNetwork(vcnId);

      // Verify deletion
      await expect(
        adapter.getVirtualNetworkStatus(vcnId)
      ).rejects.toThrow();
    }, 120000); // 2 minute timeout
  });

  describe('Object Storage Operations', () => {
    const bucketName = `test-bucket-${Date.now()}`.toLowerCase();
    let bucketId: string;

    test('should create an Object Storage bucket', async () => {
      if (SKIP_TESTS) return;

      const result = await adapter.createObjectStorage({
        name: bucketName,
        versioning_enabled: true,
        encryption_enabled: true,
        public_access_blocked: true
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('object_storage');
      expect(result.provider).toBe('oci');
      expect(result.status).toBe('available');
      expect(result.metadata.name).toBe(bucketName);

      bucketId = result.id;
    }, 60000); // 1 minute timeout

    test('should get bucket status', async () => {
      if (SKIP_TESTS || !bucketId) return;

      const status = await adapter.getObjectStorageStatus(bucketId);
      expect(status).toBe('available');
    });

    test('should delete bucket', async () => {
      if (SKIP_TESTS || !bucketId) return;

      await adapter.deleteObjectStorage(bucketId);

      // Verify deletion
      await expect(
        adapter.getObjectStorageStatus(bucketId)
      ).rejects.toThrow();
    }, 60000); // 1 minute timeout
  });

  describe('Kubernetes Cluster Operations', () => {
    const clusterName = `test-oke-${Date.now()}`;
    const vcnName = `test-vcn-for-oke-${Date.now()}`;
    let clusterId: string;
    let vcnId: string;

    beforeAll(async () => {
      if (SKIP_TESTS) return;

      // Create VCN first
      const vcnResult = await adapter.createVirtualNetwork({
        name: vcnName,
        cidr: '10.1.0.0/16',
        region: testRegion
      });

      vcnId = vcnResult.id;
    }, 300000);

    test('should create an OKE cluster', async () => {
      if (SKIP_TESTS) return;

      const result = await adapter.createKubernetesCluster({
        name: clusterName,
        version: 'v1.28.2',
        network: vcnName,
        node_count: 2,
        instance_type: 'small_compute',
        enable_autoscaling: false,
        enable_logging: true,
        enable_monitoring: true
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('kubernetes_cluster');
      expect(result.provider).toBe('oci');
      expect(result.status).toBe('available');
      expect(result.metadata.name).toBe(clusterName);

      clusterId = result.id;
    }, 1200000); // 20 minute timeout (OKE takes 10-15 minutes)

    test('should get cluster status', async () => {
      if (SKIP_TESTS || !clusterId) return;

      const status = await adapter.getKubernetesClusterStatus(clusterId);
      expect(status).toBe('available');
    });

    test('should delete cluster', async () => {
      if (SKIP_TESTS || !clusterId) return;

      await adapter.deleteKubernetesCluster(clusterId);

      // Verify deletion
      await expect(
        adapter.getKubernetesClusterStatus(clusterId)
      ).rejects.toThrow();
    }, 600000); // 10 minute timeout

    afterAll(async () => {
      if (SKIP_TESTS || !vcnId) return;

      // Clean up VCN
      await adapter.deleteVirtualNetwork(vcnId);
    }, 120000);
  });

  describe('Managed Database Operations', () => {
    const dbName = `TESTADB${Date.now()}`.substring(0, 14); // Max 14 chars
    let dbId: string;

    test('should create an Autonomous Database', async () => {
      if (SKIP_TESTS) return;

      const result = await adapter.createManagedDatabase({
        name: dbName,
        engine: 'oracle',
        version: '19c',
        instance_class: 'small_db',
        storage_size_gb: 20,
        network: '', // ADB doesn't require VCN in compartment mode
        high_availability: true,
        backup_retention_days: 7,
        encryption_enabled: true
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('managed_database');
      expect(result.provider).toBe('oci');
      expect(result.status).toBe('available');
      expect(result.metadata.name).toBe(dbName);

      dbId = result.id;
    }, 600000); // 10 minute timeout

    test('should get database status', async () => {
      if (SKIP_TESTS || !dbId) return;

      const status = await adapter.getManagedDatabaseStatus(dbId);
      expect(status).toBe('available');
    });

    test('should delete database', async () => {
      if (SKIP_TESTS || !dbId) return;

      await adapter.deleteManagedDatabase(dbId);

      // Verify deletion
      await expect(
        adapter.getManagedDatabaseStatus(dbId)
      ).rejects.toThrow();
    }, 120000); // 2 minute timeout
  });

  describe('Feature Parity with AWS', () => {
    test('should implement all required methods', () => {
      if (SKIP_TESTS) return;

      const requiredMethods = [
        'getProviderName',
        'getSupportedRegions',
        'connect',
        'healthCheck',
        'createVirtualNetwork',
        'getVirtualNetworkStatus',
        'deleteVirtualNetwork',
        'createKubernetesCluster',
        'getKubernetesClusterStatus',
        'deleteKubernetesCluster',
        'createManagedDatabase',
        'getManagedDatabaseStatus',
        'deleteManagedDatabase',
        'createObjectStorage',
        'getObjectStorageStatus',
        'deleteObjectStorage',
        'deployContainer',
        'getContainerDeploymentStatus',
        'deleteContainerDeployment',
        'getResourceStatus',
        'destroyResource'
      ];

      for (const method of requiredMethods) {
        expect(typeof (adapter as any)[method]).toBe('function');
      }
    });
  });
});

/**
 * Cross-Cloud Feature Parity Tests
 *
 * These tests verify that the same workflow can deploy to both AWS and OCI
 */
describe('Cross-Cloud Feature Parity', () => {
  test('should have matching method signatures', () => {
    if (SKIP_TESTS) return;

    const ociAdapter = new OciAdapter();

    // Verify method signatures match AWS adapter
    expect(typeof ociAdapter.createVirtualNetwork).toBe('function');
    expect(typeof ociAdapter.createKubernetesCluster).toBe('function');
    expect(typeof ociAdapter.createManagedDatabase).toBe('function');
    expect(typeof ociAdapter.createObjectStorage).toBe('function');
    expect(typeof ociAdapter.deployContainer).toBe('function');
  });

  test('should support same resource types as AWS', () => {
    if (SKIP_TESTS) return;

    const ociAdapter = new OciAdapter();

    // All methods should exist
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(ociAdapter));

    expect(methods).toContain('createVirtualNetwork');
    expect(methods).toContain('createKubernetesCluster');
    expect(methods).toContain('createManagedDatabase');
    expect(methods).toContain('createObjectStorage');
    expect(methods).toContain('deployContainer');
  });
});
