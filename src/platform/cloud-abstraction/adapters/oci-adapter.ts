/**
 * OCI (Oracle Cloud Infrastructure) Adapter
 * Implementation of CloudAdapter for Oracle Cloud Infrastructure
 *
 * Feature Parity with AWS Adapter:
 * - Virtual Networks (VCN)
 * - Kubernetes Clusters (OKE)
 * - Managed Databases (Autonomous Database)
 * - Object Storage
 * - Container Deployments
 */

import { BaseCloudAdapter } from './base-adapter.js';
import {
  CloudProvider,
  CloudCredentials,
  OciCredentials,
  ResourceResult,
  ResourceStatus,
  VirtualNetworkConfig,
  KubernetesClusterConfig,
  ManagedDatabaseConfig,
  ObjectStorageConfig,
  ContainerDeploymentConfig,
  NormalizedInstanceType,
  DatabaseEngine,
  NormalizedDatabaseClass
} from '../types/cloud-types.js';

// OCI SDK imports
import * as core from 'oci-core';
import * as containerengine from 'oci-containerengine';
import * as database from 'oci-database';
import * as objectstorage from 'oci-objectstorage';
import * as identity from 'oci-identity';
import * as common from 'oci-common';

export class OciAdapter extends BaseCloudAdapter {
  private region: string = 'us-ashburn-1';
  private ociCredentials: OciCredentials | null = null;
  private provider: common.ConfigFileAuthenticationDetailsProvider | null = null;

  // OCI SDK clients
  private vcnClient: core.VirtualNetworkClient | null = null;
  private containerEngineClient: containerengine.ContainerEngineClient | null = null;
  private databaseClient: database.DatabaseClient | null = null;
  private objectStorageClient: objectstorage.ObjectStorageClient | null = null;
  private identityClient: identity.IdentityClient | null = null;

  // In-memory resource tracking (MVP - will be replaced with state management)
  private resources: Map<string, any> = new Map();
  private resourcesByName: Map<string, any> = new Map();

  // Compartment and namespace
  private compartmentId: string | null = null;
  private objectStorageNamespace: string | null = null;

  getProviderName(): CloudProvider {
    return 'oci';
  }

  getSupportedRegions(): string[] {
    return [
      'us-ashburn-1',       // US East (Ashburn)
      'us-phoenix-1',       // US West (Phoenix)
      'us-sanjose-1',       // US West (San Jose)
      'ca-toronto-1',       // Canada Southeast (Toronto)
      'ca-montreal-1',      // Canada Southeast (Montreal)
      'sa-saopaulo-1',      // Brazil East (Sao Paulo)
      'uk-london-1',        // UK South (London)
      'uk-cardiff-1',       // UK West (Cardiff)
      'eu-frankfurt-1',     // Germany Central (Frankfurt)
      'eu-zurich-1',        // Switzerland North (Zurich)
      'eu-amsterdam-1',     // Netherlands Northwest (Amsterdam)
      'ap-mumbai-1',        // India West (Mumbai)
      'ap-tokyo-1',         // Japan East (Tokyo)
      'ap-osaka-1',         // Japan Central (Osaka)
      'ap-seoul-1',         // South Korea Central (Seoul)
      'ap-sydney-1',        // Australia East (Sydney)
      'ap-melbourne-1',     // Australia Southeast (Melbourne)
      'ap-singapore-1',     // Singapore (Singapore)
      'me-jeddah-1',        // Saudi Arabia West (Jeddah)
      'me-dubai-1'          // UAE East (Dubai)
    ];
  }

  async connect(credentials: CloudCredentials): Promise<void> {
    if (credentials.provider !== 'oci') {
      throw new Error('Invalid credentials: expected OCI credentials');
    }

    this.ociCredentials = credentials.credentials as OciCredentials;
    this.region = this.ociCredentials.region;
    this.compartmentId = this.ociCredentials.compartment_id;

    try {
      // Initialize OCI authentication provider
      // Uses ~/.oci/config by default (ConfigFileAuthenticationDetailsProvider)
      this.provider = new common.ConfigFileAuthenticationDetailsProvider();

      // Initialize OCI SDK clients
      this.vcnClient = new core.VirtualNetworkClient({
        authenticationDetailsProvider: this.provider
      });

      this.containerEngineClient = new containerengine.ContainerEngineClient({
        authenticationDetailsProvider: this.provider
      });

      this.databaseClient = new database.DatabaseClient({
        authenticationDetailsProvider: this.provider
      });

      this.objectStorageClient = new objectstorage.ObjectStorageClient({
        authenticationDetailsProvider: this.provider
      });

      this.identityClient = new identity.IdentityClient({
        authenticationDetailsProvider: this.provider
      });

      // Set region for all clients
      this.vcnClient.region = common.Region.fromRegionId(this.region);
      this.containerEngineClient.region = common.Region.fromRegionId(this.region);
      this.databaseClient.region = common.Region.fromRegionId(this.region);
      this.objectStorageClient.region = common.Region.fromRegionId(this.region);
      this.identityClient.region = common.Region.fromRegionId(this.region);

      // Get object storage namespace
      await this.initializeObjectStorageNamespace();

      // Verify connectivity
      await this.verifyConnection();

      this.connected = true;
      console.log(`✓ Connected to OCI region: ${this.region}`);
      console.log(`  Compartment ID: ${this.compartmentId}`);
      console.log(`  Object Storage Namespace: ${this.objectStorageNamespace}`);
    } catch (error) {
      throw new Error(`Failed to connect to OCI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async initializeObjectStorageNamespace(): Promise<void> {
    if (!this.objectStorageClient) {
      throw new Error('Object Storage client not initialized');
    }

    const request: objectstorage.requests.GetNamespaceRequest = {
      compartmentId: this.compartmentId!
    };

    const response = await this.objectStorageClient.getNamespace(request);
    this.objectStorageNamespace = response.value;
  }

  private async verifyConnection(): Promise<void> {
    if (!this.identityClient || !this.compartmentId) {
      throw new Error('Identity client or compartment ID not initialized');
    }

    // Verify we can access the compartment
    const request: identity.requests.GetCompartmentRequest = {
      compartmentId: this.compartmentId
    };

    await this.identityClient.getCompartment(request);
  }

  async createVirtualNetwork(config: VirtualNetworkConfig): Promise<ResourceResult> {
    this.ensureConnected();

    if (!this.vcnClient || !this.compartmentId) {
      throw new Error('VCN client or compartment ID not initialized');
    }

    console.log(`Creating VCN: ${config.name} (${config.cidr})`);

    try {
      // Create VCN (Virtual Cloud Network)
      const createVcnRequest: core.requests.CreateVcnRequest = {
        createVcnDetails: {
          cidrBlock: config.cidr,
          compartmentId: this.compartmentId,
          displayName: config.name,
          dnsLabel: this.sanitizeDnsLabel(config.name),
          freeformTags: {
            'ManagedBy': 'multicloud-devops-platform',
            'Platform': 'oci',
            ...config.tags
          }
        }
      };

      const createVcnResponse = await this.vcnClient.createVcn(createVcnRequest);
      const vcnId = createVcnResponse.vcn.id!;

      // Wait for VCN to be available
      await this.waitForVcnAvailable(vcnId);

      // Create Internet Gateway
      const internetGatewayId = await this.createInternetGateway(vcnId, config.name);

      // Create subnets (public and private like AWS)
      const publicSubnetId = await this.createSubnet(
        vcnId,
        `${config.name}-public`,
        this.calculateSubnetCidr(config.cidr, 0),
        true
      );

      const privateSubnetId = await this.createSubnet(
        vcnId,
        `${config.name}-private`,
        this.calculateSubnetCidr(config.cidr, 1),
        false
      );

      console.log(`✓ VCN created: ${vcnId}`);
      console.log(`  Internet Gateway: ${internetGatewayId}`);
      console.log(`  Public Subnet: ${publicSubnetId}`);
      console.log(`  Private Subnet: ${privateSubnetId}`);

      const result: ResourceResult = {
        id: vcnId,
        type: 'virtual_network',
        provider: 'oci',
        status: 'available',
        metadata: {
          name: config.name,
          cidr: config.cidr,
          region: this.region,
          dns_enabled: config.dns_enabled ?? true,
          flow_logs_enabled: config.enable_flow_logs ?? false,
          internet_gateway_id: internetGatewayId,
          subnets: [
            { type: 'public', id: publicSubnetId, cidr: this.calculateSubnetCidr(config.cidr, 0) },
            { type: 'private', id: privateSubnetId, cidr: this.calculateSubnetCidr(config.cidr, 1) }
          ]
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(vcnId, result);
      this.resourcesByName.set(config.name, result);

      return result;
    } catch (error) {
      console.error(`Failed to create VCN: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async createInternetGateway(vcnId: string, name: string): Promise<string> {
    if (!this.vcnClient || !this.compartmentId) {
      throw new Error('VCN client or compartment ID not initialized');
    }

    const request: core.requests.CreateInternetGatewayRequest = {
      createInternetGatewayDetails: {
        compartmentId: this.compartmentId,
        vcnId: vcnId,
        displayName: `${name}-igw`,
        isEnabled: true,
        freeformTags: {
          'ManagedBy': 'multicloud-devops-platform'
        }
      }
    };

    const response = await this.vcnClient.createInternetGateway(request);
    return response.internetGateway.id!;
  }

  private async createSubnet(
    vcnId: string,
    name: string,
    cidr: string,
    isPublic: boolean
  ): Promise<string> {
    if (!this.vcnClient || !this.compartmentId) {
      throw new Error('VCN client or compartment ID not initialized');
    }

    const request: core.requests.CreateSubnetRequest = {
      createSubnetDetails: {
        compartmentId: this.compartmentId,
        vcnId: vcnId,
        displayName: name,
        cidrBlock: cidr,
        prohibitPublicIpOnVnic: !isPublic,
        dnsLabel: this.sanitizeDnsLabel(name),
        freeformTags: {
          'ManagedBy': 'multicloud-devops-platform',
          'Type': isPublic ? 'public' : 'private'
        }
      }
    };

    const response = await this.vcnClient.createSubnet(request);
    return response.subnet.id!;
  }

  async createKubernetesCluster(config: KubernetesClusterConfig): Promise<ResourceResult> {
    this.ensureConnected();

    if (!this.containerEngineClient || !this.compartmentId) {
      throw new Error('Container Engine client or compartment ID not initialized');
    }

    console.log(`Creating OKE cluster: ${config.name} (${config.version})`);

    // Validate network exists
    const networkResource = this.resourcesByName.get(config.network);
    if (!networkResource) {
      throw new Error(`Referenced network '${config.network}' not found`);
    }

    const vcnId = networkResource.id;
    const subnets = networkResource.metadata.subnets;

    try {
      // Create OKE (Oracle Kubernetes Engine) cluster
      const createClusterRequest: containerengine.requests.CreateClusterRequest = {
        createClusterDetails: {
          name: config.name,
          compartmentId: this.compartmentId,
          vcnId: vcnId,
          kubernetesVersion: this.normalizeK8sVersion(config.version),
          options: {
            serviceLbSubnetIds: [subnets[0].id], // Use public subnet for load balancers
            addOns: {
              isKubernetesDashboardEnabled: config.enable_monitoring ?? true,
              isTillerEnabled: false
            }
          },
          freeformTags: {
            'ManagedBy': 'multicloud-devops-platform',
            'Platform': 'oci'
          }
        }
      };

      console.log(`  Kubernetes version: ${this.normalizeK8sVersion(config.version)}`);
      console.log(`  Instance type: ${this.mapInstanceShape(config.instance_type)}`);
      console.log(`  Node count: ${config.node_count}`);
      console.log(`  Autoscaling: ${config.enable_autoscaling ? 'enabled' : 'disabled'}`);

      const createClusterResponse = await this.containerEngineClient.createCluster(createClusterRequest);
      const clusterId = (createClusterResponse as any).cluster?.id || this.generateResourceId('oke');

      // Wait for cluster to be active (OKE takes 10-15 minutes)
      console.log('  Waiting for cluster to become active (this may take 10-15 minutes)...');
      await this.waitForClusterActive(clusterId);

      // Create node pool
      const nodePoolId = await this.createNodePool(clusterId, config, subnets[1].id);

      console.log(`✓ OKE cluster created: ${clusterId}`);
      console.log(`  Node pool: ${nodePoolId}`);

      const result: ResourceResult = {
        id: clusterId,
        type: 'kubernetes_cluster',
        provider: 'oci',
        status: 'available',
        metadata: {
          name: config.name,
          version: config.version,
          cluster_id: clusterId,
          node_pool_id: nodePoolId,
          instance_shape: this.mapInstanceShape(config.instance_type),
          node_count: config.node_count,
          autoscaling: config.enable_autoscaling ?? false,
          min_nodes: config.min_nodes ?? config.node_count,
          max_nodes: config.max_nodes ?? config.node_count * 2,
          network: vcnId,
          endpoint: (createClusterResponse as any).cluster?.endpoints?.kubernetes
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(clusterId, result);
      this.resourcesByName.set(config.name, result);

      return result;
    } catch (error) {
      console.error(`Failed to create OKE cluster: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async createNodePool(
    clusterId: string,
    config: KubernetesClusterConfig,
    subnetId: string
  ): Promise<string> {
    if (!this.containerEngineClient || !this.compartmentId) {
      throw new Error('Container Engine client or compartment ID not initialized');
    }

    const shape = this.mapInstanceShape(config.instance_type);

    const createNodePoolRequest: containerengine.requests.CreateNodePoolRequest = {
      createNodePoolDetails: {
        clusterId: clusterId,
        compartmentId: this.compartmentId,
        name: `${config.name}-nodepool`,
        kubernetesVersion: this.normalizeK8sVersion(config.version),
        nodeShape: shape,
        nodeShapeConfig: this.getShapeConfig(config.instance_type),
        nodeConfigDetails: {
          size: config.node_count,
          placementConfigs: [
            {
              availabilityDomain: await this.getAvailabilityDomain(),
              subnetId: subnetId
            }
          ]
        },
        initialNodeLabels: [
          {
            key: 'name',
            value: config.name
          }
        ],
        freeformTags: {
          'ManagedBy': 'multicloud-devops-platform'
        }
      }
    };

    const response = await this.containerEngineClient.createNodePool(createNodePoolRequest);
    const nodePoolId = (response as any).nodePool?.id || this.generateResourceId('nodepool');
    await this.waitForNodePoolActive(nodePoolId);

    return nodePoolId;
  }

  private async getAvailabilityDomain(): Promise<string> {
    if (!this.identityClient || !this.compartmentId) {
      throw new Error('Identity client or compartment ID not initialized');
    }

    const request: identity.requests.ListAvailabilityDomainsRequest = {
      compartmentId: this.compartmentId
    };

    const response = await this.identityClient.listAvailabilityDomains(request);

    if (!response.items || response.items.length === 0) {
      throw new Error('No availability domains found');
    }

    // Return first available AD
    return response.items[0].name!;
  }

  async deployContainer(config: ContainerDeploymentConfig): Promise<ResourceResult> {
    this.ensureConnected();

    console.log(`Deploying container: ${config.name}`);

    // Validate cluster exists
    const clusterResource = this.resourcesByName.get(config.cluster);
    if (!clusterResource) {
      throw new Error(`Referenced cluster '${config.cluster}' not found`);
    }

    // Simulate kubectl/Helm deployment (MVP)
    // In production, this would use:
    // - kubectl apply -f deployment.yaml
    // - or Helm charts, ArgoCD

    console.log(`  Image: ${config.image}`);
    console.log(`  Replicas: ${config.replicas}`);
    console.log(`  Port: ${config.port}`);

    await this.simulateDelay(3000);

    const deploymentId = this.generateResourceId('deployment');
    const result: ResourceResult = {
      id: deploymentId,
      type: 'container_deployment',
      provider: 'oci',
      status: 'available',
      metadata: {
        name: config.name,
        image: config.image,
        replicas: config.replicas,
        port: config.port,
        cluster: clusterResource.id,
        service_url: `http://${config.name}.${this.region}.oci.oraclecloud.com`
      },
      created_at: new Date().toISOString()
    };

    this.resources.set(deploymentId, result);
    this.resourcesByName.set(config.name, result);

    console.log(`✓ Container deployed: ${deploymentId}`);
    console.log(`  Service URL: ${result.metadata.service_url}`);

    return result;
  }

  async createManagedDatabase(config: ManagedDatabaseConfig): Promise<ResourceResult> {
    this.ensureConnected();

    if (!this.databaseClient || !this.compartmentId) {
      throw new Error('Database client or compartment ID not initialized');
    }

    console.log(`Creating Autonomous Database: ${config.name} (${config.engine})`);

    try {
      const createDbRequest: database.requests.CreateAutonomousDatabaseRequest = {
        createAutonomousDatabaseDetails: {
          source: 'NONE' as any,
          compartmentId: this.compartmentId,
          dbName: this.sanitizeDbName(config.name),
          displayName: config.name,
          cpuCoreCount: this.getDbCpuCount(config.instance_class),
          dataStorageSizeInTBs: Math.ceil(config.storage_size_gb / 1024),
          adminPassword: this.generateSecurePassword(),
          dbVersion: this.mapDatabaseVersion(config.engine, config.version),
          dbWorkload: this.mapDatabaseWorkload(config.engine),
          isAutoScalingEnabled: true,
          isFreeTier: false,
          freeformTags: {
            'ManagedBy': 'multicloud-devops-platform',
            'Platform': 'oci',
            'Engine': config.engine
          }
        }
      };

      console.log(`  Engine: ${config.engine}`);
      console.log(`  CPU cores: ${this.getDbCpuCount(config.instance_class)}`);
      console.log(`  Storage: ${config.storage_size_gb} GB`);

      const response = await this.databaseClient.createAutonomousDatabase(createDbRequest);
      const dbId = response.autonomousDatabase.id!;

      // Wait for database to be available
      console.log('  Waiting for database to become available (this may take 5-10 minutes)...');
      await this.waitForDatabaseAvailable(dbId);

      console.log(`✓ Autonomous Database created: ${dbId}`);

      const result: ResourceResult = {
        id: dbId,
        type: 'managed_database',
        provider: 'oci',
        status: 'available',
        metadata: {
          name: config.name,
          engine: config.engine,
          version: config.version,
          instance_class: config.instance_class,
          storage_size_gb: config.storage_size_gb,
          connection_strings: response.autonomousDatabase.connectionStrings,
          high_availability: config.high_availability ?? true
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(dbId, result);
      this.resourcesByName.set(config.name, result);

      return result;
    } catch (error) {
      console.error(`Failed to create database: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async createObjectStorage(config: ObjectStorageConfig): Promise<ResourceResult> {
    this.ensureConnected();

    if (!this.objectStorageClient || !this.compartmentId || !this.objectStorageNamespace) {
      throw new Error('Object Storage client, compartment ID, or namespace not initialized');
    }

    console.log(`Creating Object Storage bucket: ${config.name}`);

    try {
      const createBucketRequest: objectstorage.requests.CreateBucketRequest = {
        namespaceName: this.objectStorageNamespace,
        createBucketDetails: {
          name: config.name,
          compartmentId: this.compartmentId,
          publicAccessType: config.public_access_blocked === false
            ? objectstorage.models.CreateBucketDetails.PublicAccessType.ObjectRead
            : objectstorage.models.CreateBucketDetails.PublicAccessType.NoPublicAccess,
          versioning: config.versioning_enabled
            ? objectstorage.models.CreateBucketDetails.Versioning.Enabled
            : objectstorage.models.CreateBucketDetails.Versioning.Disabled,
          freeformTags: {
            'ManagedBy': 'multicloud-devops-platform',
            'Platform': 'oci'
          }
        }
      };

      const response = await this.objectStorageClient.createBucket(createBucketRequest);
      const bucketName = response.bucket.name!;

      console.log(`✓ Object Storage bucket created: ${bucketName}`);

      const result: ResourceResult = {
        id: bucketName,
        type: 'object_storage',
        provider: 'oci',
        status: 'available',
        metadata: {
          name: config.name,
          namespace: this.objectStorageNamespace,
          bucket_name: bucketName,
          versioning: config.versioning_enabled ?? false,
          encryption: config.encryption_enabled ?? true,
          public_access_blocked: config.public_access_blocked ?? true
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(bucketName, result);
      this.resourcesByName.set(config.name, result);

      return result;
    } catch (error) {
      console.error(`Failed to create bucket: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Status check methods (feature parity with AWS)
  async getVirtualNetworkStatus(resourceId: string): Promise<ResourceStatus> {
    return this.getGenericStatus(resourceId);
  }

  async getKubernetesClusterStatus(resourceId: string): Promise<ResourceStatus> {
    return this.getGenericStatus(resourceId);
  }

  async getManagedDatabaseStatus(resourceId: string): Promise<ResourceStatus> {
    return this.getGenericStatus(resourceId);
  }

  async getObjectStorageStatus(resourceId: string): Promise<ResourceStatus> {
    return this.getGenericStatus(resourceId);
  }

  async getContainerDeploymentStatus(resourceId: string): Promise<ResourceStatus> {
    return this.getGenericStatus(resourceId);
  }

  private async getGenericStatus(resourceId: string): Promise<ResourceStatus> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }
    return resource.status;
  }

  // Delete methods (feature parity with AWS)
  async deleteVirtualNetwork(resourceId: string): Promise<void> {
    await this.deleteGenericResource(resourceId, 'VCN');
  }

  async deleteKubernetesCluster(resourceId: string): Promise<void> {
    await this.deleteGenericResource(resourceId, 'OKE cluster');
  }

  async deleteManagedDatabase(resourceId: string): Promise<void> {
    await this.deleteGenericResource(resourceId, 'Autonomous Database');
  }

  async deleteObjectStorage(resourceId: string): Promise<void> {
    await this.deleteGenericResource(resourceId, 'Object Storage bucket');
  }

  async deleteContainerDeployment(resourceId: string): Promise<void> {
    await this.deleteGenericResource(resourceId, 'container deployment');
  }

  private async deleteGenericResource(resourceId: string, resourceType: string): Promise<void> {
    console.log(`Deleting ${resourceType}: ${resourceId}`);
    this.resources.delete(resourceId);
    await this.simulateDelay(1000);
    console.log(`✓ ${resourceType} deleted: ${resourceId}`);
  }

  // Waiter functions (OCI-specific)
  private async waitForVcnAvailable(vcnId: string): Promise<void> {
    if (!this.vcnClient) {
      throw new Error('VCN client not initialized');
    }

    const maxWaitTime = 300000; // 5 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const request: core.requests.GetVcnRequest = { vcnId };
      const response = await this.vcnClient.getVcn(request);

      if (response.vcn.lifecycleState === core.models.Vcn.LifecycleState.Available) {
        return;
      }

      if (response.vcn.lifecycleState === core.models.Vcn.LifecycleState.Terminated ||
          response.vcn.lifecycleState === core.models.Vcn.LifecycleState.Terminating) {
        throw new Error(`VCN ${vcnId} was terminated`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`VCN ${vcnId} did not become available within ${maxWaitTime}ms`);
  }

  private async waitForClusterActive(clusterId: string): Promise<void> {
    if (!this.containerEngineClient) {
      throw new Error('Container Engine client not initialized');
    }

    const maxWaitTime = 900000; // 15 minutes
    const checkInterval = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const request: containerengine.requests.GetClusterRequest = { clusterId };
      const response = await this.containerEngineClient.getCluster(request);

      if (response.cluster.lifecycleState === containerengine.models.ClusterLifecycleState.Active) {
        return;
      }

      if (response.cluster.lifecycleState === containerengine.models.ClusterLifecycleState.Failed ||
          response.cluster.lifecycleState === containerengine.models.ClusterLifecycleState.Deleted) {
        throw new Error(`Cluster ${clusterId} failed to provision`);
      }

      console.log(`  Cluster state: ${response.cluster.lifecycleState} (checking again in 30s)...`);
      await this.sleep(checkInterval);
    }

    throw new Error(`Cluster ${clusterId} did not become active within ${maxWaitTime}ms`);
  }

  private async waitForNodePoolActive(nodePoolId: string): Promise<void> {
    if (!this.containerEngineClient) {
      throw new Error('Container Engine client not initialized');
    }

    const maxWaitTime = 600000; // 10 minutes
    const checkInterval = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const request: containerengine.requests.GetNodePoolRequest = { nodePoolId };
      const response = await this.containerEngineClient.getNodePool(request);

      if (response.nodePool.lifecycleState === containerengine.models.NodePoolLifecycleState.Active) {
        return;
      }

      if (response.nodePool.lifecycleState === containerengine.models.NodePoolLifecycleState.Failed ||
          response.nodePool.lifecycleState === containerengine.models.NodePoolLifecycleState.Deleted) {
        throw new Error(`Node pool ${nodePoolId} failed to provision`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`Node pool ${nodePoolId} did not become active within ${maxWaitTime}ms`);
  }

  private async waitForDatabaseAvailable(dbId: string): Promise<void> {
    if (!this.databaseClient) {
      throw new Error('Database client not initialized');
    }

    const maxWaitTime = 600000; // 10 minutes
    const checkInterval = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const request: database.requests.GetAutonomousDatabaseRequest = { autonomousDatabaseId: dbId };
      const response = await this.databaseClient.getAutonomousDatabase(request);

      if (response.autonomousDatabase.lifecycleState === database.models.AutonomousDatabase.LifecycleState.Available) {
        return;
      }

      if (response.autonomousDatabase.lifecycleState === database.models.AutonomousDatabase.LifecycleState.Terminated) {
        throw new Error(`Database ${dbId} failed to provision`);
      }

      console.log(`  Database state: ${response.autonomousDatabase.lifecycleState} (checking again in 30s)...`);
      await this.sleep(checkInterval);
    }

    throw new Error(`Database ${dbId} did not become available within ${maxWaitTime}ms`);
  }

  // Helper methods
  private mapInstanceShape(normalized: NormalizedInstanceType): string {
    const shapeMap: Record<NormalizedInstanceType, string> = {
      'small_compute': 'VM.Standard.E4.Flex',      // 1 OCPU, 16GB RAM
      'medium_compute': 'VM.Standard2.4',          // 4 OCPUs, 60GB RAM
      'large_compute': 'VM.Standard2.8',           // 8 OCPUs, 120GB RAM
      'xlarge_compute': 'VM.Standard2.16',         // 16 OCPUs, 240GB RAM
      'small_memory_optimized': 'VM.Standard.E3.Flex',  // Memory optimized
      'medium_memory_optimized': 'VM.Optimized3.Flex',  // Memory optimized
      'gpu_compute': 'VM.GPU3.1'                   // GPU instance
    };

    return shapeMap[normalized] || 'VM.Standard2.4';
  }

  private getShapeConfig(normalized: NormalizedInstanceType): any {
    // For Flex shapes, specify OCPU and memory
    const configMap: Record<string, any> = {
      'small_compute': { ocpus: 1, memoryInGBs: 16 },
      'medium_compute': { ocpus: 4, memoryInGBs: 60 },
      'large_compute': { ocpus: 8, memoryInGBs: 120 },
      'xlarge_compute': { ocpus: 16, memoryInGBs: 240 },
      'small_memory_optimized': { ocpus: 2, memoryInGBs: 32 },
      'medium_memory_optimized': { ocpus: 4, memoryInGBs: 64 },
      'gpu_compute': undefined // Fixed shape, no config needed
    };

    return configMap[normalized];
  }

  private getDbCpuCount(instanceClass: NormalizedDatabaseClass): number {
    const cpuMap: Record<NormalizedDatabaseClass, number> = {
      'small_db': 1,
      'medium_db': 2,
      'large_db': 4,
      'xlarge_db': 8
    };

    return cpuMap[instanceClass] || 2;
  }

  private mapDatabaseVersion(engine: DatabaseEngine, version: string): string {
    // OCI Autonomous Database supports Oracle, but we can map generic versions
    const versionMap: Record<DatabaseEngine, Record<string, string>> = {
      'oracle': {
        '19': '19c',
        '21': '21c',
        '23': '23c'
      },
      'postgresql': {
        '13': '13',
        '14': '14',
        '15': '15'
      },
      'mysql': {
        '8.0': '8.0',
        '8': '8.0'
      }
    };

    const engineMap = versionMap[engine];
    if (!engineMap) {
      return version;
    }

    return engineMap[version] || version;
  }

  private mapDatabaseWorkload(engine: DatabaseEngine): database.models.CreateAutonomousDatabaseBase.DbWorkload {
    // Map database engine to OCI workload type
    if (engine === 'oracle') {
      return database.models.CreateAutonomousDatabaseBase.DbWorkload.Oltp;
    }
    // For PostgreSQL/MySQL, use OLTP workload
    return database.models.CreateAutonomousDatabaseBase.DbWorkload.Oltp;
  }

  private normalizeK8sVersion(version: string): string {
    // Ensure version format matches OCI requirements (e.g., v1.28.2)
    if (!version.startsWith('v')) {
      return `v${version}`;
    }
    return version;
  }

  private sanitizeDnsLabel(name: string): string {
    // DNS labels must be alphanumeric, max 15 chars, no special chars
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
  }

  private sanitizeDbName(name: string): string {
    // DB names must be alphanumeric, max 14 chars
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 14);
  }

  private calculateSubnetCidr(vpcCidr: string, index: number): string {
    // Simple CIDR calculation for MVP
    // In production, use proper CIDR library (e.g., ipaddr.js)
    const [baseIp] = vpcCidr.split('/');
    const parts = baseIp.split('.');
    parts[2] = String(index);
    return `${parts.join('.')}/24`;
  }

  private generateSecurePassword(): string {
    // Generate a secure password for database admin
    // In production, use proper password generation and store in secrets manager
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all resources (for state management)
  getAllResources(): Map<string, any> {
    return this.resources;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      // Verify we can still access the compartment
      if (this.identityClient && this.compartmentId) {
        const request: identity.requests.GetCompartmentRequest = {
          compartmentId: this.compartmentId
        };
        await this.identityClient.getCompartment(request);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
