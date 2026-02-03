/**
 * AWS Cloud Adapter - Real AWS SDK v3 Integration
 * Implementation of CloudAdapter for Amazon Web Services
 */

import {
  EC2Client,
  CreateVpcCommand,
  DescribeVpcsCommand,
  CreateSubnetCommand,
  CreateInternetGatewayCommand,
  AttachInternetGatewayCommand,
  CreateRouteTableCommand,
  CreateRouteCommand,
  AssociateRouteTableCommand,
  DeleteVpcCommand,
  DeleteSubnetCommand,
  DeleteInternetGatewayCommand,
  DetachInternetGatewayCommand,
  DeleteRouteTableCommand,
  ModifyVpcAttributeCommand
} from '@aws-sdk/client-ec2';

import {
  EKSClient,
  CreateClusterCommand,
  DescribeClusterCommand,
  DeleteClusterCommand,
  CreateNodegroupCommand,
  DescribeNodegroupCommand,
  DeleteNodegroupCommand
} from '@aws-sdk/client-eks';

import {
  RDSClient,
  CreateDBInstanceCommand,
  DescribeDBInstancesCommand,
  DeleteDBInstanceCommand
} from '@aws-sdk/client-rds';

import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutBucketVersioningCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand
} from '@aws-sdk/client-s3';

import {
  STSClient,
  GetCallerIdentityCommand
} from '@aws-sdk/client-sts';

import {
  IAMClient,
  CreateRoleCommand,
  AttachRolePolicyCommand,
  GetRoleCommand
} from '@aws-sdk/client-iam';

import { BaseCloudAdapter } from './base-adapter.js';
import {
  CloudProvider,
  CloudCredentials,
  AwsCredentials,
  ResourceResult,
  ResourceStatus,
  VirtualNetworkConfig,
  KubernetesClusterConfig,
  ManagedDatabaseConfig,
  ObjectStorageConfig,
  ContainerDeploymentConfig,
  NormalizedInstanceType,
  NormalizedDatabaseClass
} from '../types/cloud-types.js';

interface VpcMetadata {
  vpcId: string;
  subnetIds: string[];
  internetGatewayId?: string;
  routeTableIds: string[];
}

export class AwsAdapter extends BaseCloudAdapter {
  private region: string = 'us-east-1';
  private awsCredentials: AwsCredentials | null = null;

  // AWS SDK Clients
  private ec2Client!: EC2Client;
  private eksClient!: EKSClient;
  private rdsClient!: RDSClient;
  private s3Client!: S3Client;
  private stsClient!: STSClient;
  private iamClient!: IAMClient;

  // In-memory resource tracking (will be replaced with state management)
  private resources: Map<string, ResourceResult> = new Map();
  private resourcesByName: Map<string, ResourceResult> = new Map();
  private vpcMetadata: Map<string, VpcMetadata> = new Map();

  getProviderName(): CloudProvider {
    return 'aws';
  }

  getSupportedRegions(): string[] {
    return [
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2',
      'eu-west-1',
      'eu-central-1',
      'ap-southeast-1',
      'ap-northeast-1'
    ];
  }

  async connect(credentials: CloudCredentials): Promise<void> {
    if (credentials.provider !== 'aws') {
      throw new Error('Invalid credentials: expected AWS credentials');
    }

    this.awsCredentials = credentials.credentials as AwsCredentials;
    this.region = this.awsCredentials.region;

    // Validate credentials are provided
    if (!this.awsCredentials.access_key_id && !this.awsCredentials.profile) {
      console.log('⚠ No explicit credentials provided, using default AWS credential chain');
    }

    // Initialize AWS SDK clients
    const awsConfig: any = {
      region: this.region
    };

    // Add credentials if provided
    if (this.awsCredentials.access_key_id && this.awsCredentials.secret_access_key) {
      awsConfig.credentials = {
        accessKeyId: this.awsCredentials.access_key_id,
        secretAccessKey: this.awsCredentials.secret_access_key,
        sessionToken: this.awsCredentials.session_token
      };
    }

    this.ec2Client = new EC2Client(awsConfig);
    this.eksClient = new EKSClient(awsConfig);
    this.rdsClient = new RDSClient(awsConfig);
    this.s3Client = new S3Client(awsConfig);
    this.stsClient = new STSClient(awsConfig);
    this.iamClient = new IAMClient(awsConfig);

    // Verify credentials by calling STS GetCallerIdentity
    try {
      const identity = await this.stsClient.send(new GetCallerIdentityCommand({}));
      this.connected = true;
      console.log(`✓ Connected to AWS region: ${this.region}`);
      console.log(`  Account: ${identity.Account}`);
      console.log(`  User: ${identity.UserId}`);
    } catch (error: any) {
      throw new Error(`Failed to connect to AWS: ${error.message}`);
    }
  }

  async createVirtualNetwork(config: VirtualNetworkConfig): Promise<ResourceResult> {
    this.ensureConnected();

    console.log(`Creating VPC: ${config.name} (${config.cidr})`);

    try {
      // Create VPC
      const createVpcResponse = await this.ec2Client.send(
        new CreateVpcCommand({
          CidrBlock: config.cidr,
          TagSpecifications: [{
            ResourceType: 'vpc',
            Tags: [
              { Key: 'Name', Value: config.name },
              { Key: 'ManagedBy', Value: 'ai-platform' },
              { Key: 'CreatedAt', Value: new Date().toISOString() },
              ...this.convertTagsToArray(config.tags)
            ]
          }]
        })
      );

      const vpcId = createVpcResponse.Vpc!.VpcId!;
      console.log(`  VPC created: ${vpcId}`);

      // Enable DNS hostnames and support
      await this.ec2Client.send(
        new ModifyVpcAttributeCommand({
          VpcId: vpcId,
          EnableDnsHostnames: { Value: config.dns_enabled ?? true }
        })
      );

      await this.ec2Client.send(
        new ModifyVpcAttributeCommand({
          VpcId: vpcId,
          EnableDnsSupport: { Value: config.dns_enabled ?? true }
        })
      );

      // Wait for VPC to be available
      await this.waitForVpcAvailable(vpcId);

      // Create subnets (public and private)
      const subnets = await this.createSubnets(vpcId, config.cidr, config.name);
      console.log(`  Created ${subnets.length} subnets`);

      // Create and attach Internet Gateway
      let internetGatewayId: string | undefined;
      const createIgwResponse = await this.ec2Client.send(
        new CreateInternetGatewayCommand({
          TagSpecifications: [{
            ResourceType: 'internet-gateway',
            Tags: [{ Key: 'Name', Value: `${config.name}-igw` }]
          }]
        })
      );
      internetGatewayId = createIgwResponse.InternetGateway!.InternetGatewayId!;

      await this.ec2Client.send(
        new AttachInternetGatewayCommand({
          VpcId: vpcId,
          InternetGatewayId: internetGatewayId
        })
      );
      console.log(`  Internet Gateway attached: ${internetGatewayId}`);

      // Create route table for public subnet
      const routeTableIds = await this.createRouteTables(vpcId, subnets, internetGatewayId, config.name);

      // Store VPC metadata for cleanup
      this.vpcMetadata.set(vpcId, {
        vpcId,
        subnetIds: subnets.map(s => s.id),
        internetGatewayId,
        routeTableIds
      });

      const result: ResourceResult = {
        id: vpcId,
        type: 'virtual_network',
        provider: 'aws',
        status: 'available',
        metadata: {
          name: config.name,
          cidr: config.cidr,
          region: this.region,
          dns_enabled: config.dns_enabled ?? true,
          flow_logs_enabled: config.enable_flow_logs ?? false,
          subnets: subnets,
          internetGatewayId
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(vpcId, result);
      this.resourcesByName.set(config.name, result);
      console.log(`✓ VPC created successfully: ${vpcId}`);

      return result;

    } catch (error: any) {
      console.error(`✗ Failed to create VPC: ${error.message}`);
      throw this.handleAwsError('createVirtualNetwork', error);
    }
  }

  async createKubernetesCluster(config: KubernetesClusterConfig): Promise<ResourceResult> {
    this.ensureConnected();

    console.log(`Creating EKS cluster: ${config.name} (${config.version})`);
    console.log(`⚠ Note: EKS cluster creation typically takes 10-15 minutes`);

    try {
      // Validate network exists
      const networkResource = this.resourcesByName.get(config.network);
      if (!networkResource) {
        throw new Error(`Referenced network '${config.network}' not found`);
      }

      const vpcId = networkResource.id;
      const subnetIds = networkResource.metadata.subnets.map((s: any) => s.id);

      // Get or create EKS cluster role
      const clusterRoleArn = await this.getOrCreateEKSClusterRole();
      console.log(`  Using cluster role: ${clusterRoleArn}`);

      // Create EKS cluster
      const createClusterResponse = await this.eksClient.send(
        new CreateClusterCommand({
          name: config.name,
          version: config.version,
          roleArn: clusterRoleArn,
          resourcesVpcConfig: {
            subnetIds: subnetIds
          },
          tags: {
            'Name': config.name,
            'ManagedBy': 'ai-platform',
            'CreatedAt': new Date().toISOString()
          }
        })
      );

      const clusterName = createClusterResponse.cluster!.name!;
      console.log(`  EKS cluster creation initiated: ${clusterName}`);

      // Wait for cluster to be active
      await this.waitForClusterActive(clusterName);
      console.log(`  Cluster is now active`);

      // Get cluster details
      const clusterDetails = await this.eksClient.send(
        new DescribeClusterCommand({ name: clusterName })
      );

      // Create node group
      const nodeGroupName = await this.createNodeGroup(clusterName, config, subnetIds);
      console.log(`  Node group created: ${nodeGroupName}`);

      const result: ResourceResult = {
        id: clusterName,
        type: 'kubernetes_cluster',
        provider: 'aws',
        status: 'available',
        metadata: {
          name: config.name,
          version: config.version,
          endpoint: clusterDetails.cluster!.endpoint,
          certificateAuthority: clusterDetails.cluster!.certificateAuthority?.data,
          clusterArn: clusterDetails.cluster!.arn,
          instance_type: this.mapInstanceType(config.instance_type),
          node_count: config.node_count,
          autoscaling: config.enable_autoscaling ?? false,
          min_nodes: config.min_nodes ?? config.node_count,
          max_nodes: config.max_nodes ?? config.node_count * 2,
          network: vpcId,
          nodeGroupName
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(clusterName, result);
      this.resourcesByName.set(config.name, result);
      console.log(`✓ EKS cluster created successfully: ${clusterName}`);

      return result;

    } catch (error: any) {
      console.error(`✗ Failed to create EKS cluster: ${error.message}`);
      throw this.handleAwsError('createKubernetesCluster', error);
    }
  }

  async deployContainer(config: ContainerDeploymentConfig): Promise<ResourceResult> {
    this.ensureConnected();

    console.log(`Deploying container: ${config.name}`);
    console.log(`⚠ Container deployment requires kubectl configuration`);

    // Validate cluster exists
    const clusterResource = this.resourcesByName.get(config.cluster);
    if (!clusterResource) {
      throw new Error(`Referenced cluster '${config.cluster}' not found`);
    }

    // For MVP, we'll track the deployment intent
    // Real implementation would use kubectl or AWS EKS SDK
    const resourceId = this.generateResourceId('deployment');

    console.log(`  Image: ${config.image}`);
    console.log(`  Replicas: ${config.replicas}`);
    console.log(`  Port: ${config.port}`);

    const result: ResourceResult = {
      id: resourceId,
      type: 'container_deployment',
      provider: 'aws',
      status: 'available',
      metadata: {
        name: config.name,
        image: config.image,
        replicas: config.replicas,
        port: config.port,
        cluster: clusterResource.id,
        clusterEndpoint: clusterResource.metadata.endpoint,
        environment_variables: config.environment_variables,
        resource_limits: config.resource_limits,
        note: 'Deployment tracked - requires manual kubectl apply or CI/CD integration'
      },
      created_at: new Date().toISOString()
    };

    this.resources.set(resourceId, result);
    this.resourcesByName.set(config.name, result);
    console.log(`✓ Container deployment tracked: ${resourceId}`);

    return result;
  }

  async createManagedDatabase(config: ManagedDatabaseConfig): Promise<ResourceResult> {
    this.ensureConnected();

    console.log(`Creating RDS database: ${config.name} (${config.engine})`);
    console.log(`⚠ Note: RDS database creation typically takes 5-10 minutes`);

    try {
      // Validate network exists
      const networkResource = this.resourcesByName.get(config.network);
      if (!networkResource) {
        throw new Error(`Referenced network '${config.network}' not found`);
      }

      const dbInstanceClass = this.mapDatabaseClass(config.instance_class);
      const engineVersion = this.getEngineVersion(config.engine, config.version);

      const createDbResponse = await this.rdsClient.send(
        new CreateDBInstanceCommand({
          DBInstanceIdentifier: config.name,
          DBInstanceClass: dbInstanceClass,
          Engine: config.engine,
          EngineVersion: engineVersion,
          MasterUsername: 'admin', // Should be parameterized
          MasterUserPassword: this.generateSecurePassword(),
          AllocatedStorage: config.storage_size_gb,
          StorageEncrypted: config.encryption_enabled ?? true,
          BackupRetentionPeriod: config.backup_retention_days ?? 7,
          MultiAZ: config.high_availability ?? false,
          Tags: [
            { Key: 'Name', Value: config.name },
            { Key: 'ManagedBy', Value: 'ai-platform' }
          ]
        })
      );

      const dbInstanceId = createDbResponse.DBInstance!.DBInstanceIdentifier!;
      console.log(`  RDS instance creation initiated: ${dbInstanceId}`);

      // Wait for DB to be available
      await this.waitForDatabaseAvailable(dbInstanceId);

      // Get DB instance details
      const dbDetails = await this.rdsClient.send(
        new DescribeDBInstancesCommand({
          DBInstanceIdentifier: dbInstanceId
        })
      );

      const dbInstance = dbDetails.DBInstances![0];

      const result: ResourceResult = {
        id: dbInstanceId,
        type: 'managed_database',
        provider: 'aws',
        status: 'available',
        metadata: {
          name: config.name,
          engine: config.engine,
          version: engineVersion,
          instance_class: dbInstanceClass,
          storage_size_gb: config.storage_size_gb,
          endpoint: dbInstance.Endpoint?.Address,
          port: dbInstance.Endpoint?.Port,
          dbArn: dbInstance.DBInstanceArn
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(dbInstanceId, result);
      console.log(`✓ RDS database created successfully: ${dbInstanceId}`);
      console.log(`  Endpoint: ${result.metadata.endpoint}:${result.metadata.port}`);

      return result;

    } catch (error: any) {
      console.error(`✗ Failed to create RDS database: ${error.message}`);
      throw this.handleAwsError('createManagedDatabase', error);
    }
  }

  async createObjectStorage(config: ObjectStorageConfig): Promise<ResourceResult> {
    this.ensureConnected();

    console.log(`Creating S3 bucket: ${config.name}`);

    try {
      // Create S3 bucket
      const createBucketParams: any = {
        Bucket: config.name
      };

      // Add LocationConstraint for regions other than us-east-1
      if (this.region !== 'us-east-1') {
        createBucketParams.CreateBucketConfiguration = {
          LocationConstraint: this.region
        };
      }

      await this.s3Client.send(new CreateBucketCommand(createBucketParams));
      console.log(`  S3 bucket created: ${config.name}`);

      // Configure versioning
      if (config.versioning_enabled) {
        await this.s3Client.send(
          new PutBucketVersioningCommand({
            Bucket: config.name,
            VersioningConfiguration: {
              Status: 'Enabled'
            }
          })
        );
        console.log(`  Versioning enabled`);
      }

      // Configure encryption
      if (config.encryption_enabled ?? true) {
        await this.s3Client.send(
          new PutBucketEncryptionCommand({
            Bucket: config.name,
            ServerSideEncryptionConfiguration: {
              Rules: [{
                ApplyServerSideEncryptionByDefault: {
                  SSEAlgorithm: 'AES256'
                }
              }]
            }
          })
        );
        console.log(`  Encryption enabled`);
      }

      // Block public access
      if (config.public_access_blocked ?? true) {
        await this.s3Client.send(
          new PutPublicAccessBlockCommand({
            Bucket: config.name,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true
            }
          })
        );
        console.log(`  Public access blocked`);
      }

      const result: ResourceResult = {
        id: config.name,
        type: 'object_storage',
        provider: 'aws',
        status: 'available',
        metadata: {
          name: config.name,
          region: this.region,
          versioning: config.versioning_enabled ?? false,
          encryption: config.encryption_enabled ?? true,
          public_access_blocked: config.public_access_blocked ?? true,
          url: `https://${config.name}.s3.${this.region}.amazonaws.com`
        },
        created_at: new Date().toISOString()
      };

      this.resources.set(config.name, result);
      console.log(`✓ S3 bucket created successfully: ${config.name}`);

      return result;

    } catch (error: any) {
      console.error(`✗ Failed to create S3 bucket: ${error.message}`);
      throw this.handleAwsError('createObjectStorage', error);
    }
  }

  // Status check methods
  async getVirtualNetworkStatus(resourceId: string): Promise<ResourceStatus> {
    try {
      const response = await this.ec2Client.send(
        new DescribeVpcsCommand({ VpcIds: [resourceId] })
      );

      const state = response.Vpcs![0].State;
      return state === 'available' ? 'available' : 'creating';
    } catch (error) {
      return 'failed';
    }
  }

  async getKubernetesClusterStatus(resourceId: string): Promise<ResourceStatus> {
    try {
      const response = await this.eksClient.send(
        new DescribeClusterCommand({ name: resourceId })
      );

      const status = response.cluster!.status;
      const statusMap: Record<string, ResourceStatus> = {
        'CREATING': 'creating',
        'ACTIVE': 'available',
        'DELETING': 'deleting',
        'FAILED': 'failed',
        'UPDATING': 'updating'
      };

      return statusMap[status!] || 'creating';
    } catch (error) {
      return 'failed';
    }
  }

  async getManagedDatabaseStatus(resourceId: string): Promise<ResourceStatus> {
    try {
      const response = await this.rdsClient.send(
        new DescribeDBInstancesCommand({ DBInstanceIdentifier: resourceId })
      );

      const status = response.DBInstances![0].DBInstanceStatus;
      const statusMap: Record<string, ResourceStatus> = {
        'creating': 'creating',
        'available': 'available',
        'deleting': 'deleting',
        'failed': 'failed',
        'modifying': 'updating'
      };

      return statusMap[status!] || 'creating';
    } catch (error) {
      return 'failed';
    }
  }

  async getObjectStorageStatus(resourceId: string): Promise<ResourceStatus> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: resourceId }));
      return 'available';
    } catch (error) {
      return 'failed';
    }
  }

  async getContainerDeploymentStatus(resourceId: string): Promise<ResourceStatus> {
    const resource = this.resources.get(resourceId);
    return resource?.status || 'failed';
  }

  // Delete methods
  async deleteVirtualNetwork(resourceId: string): Promise<void> {
    console.log(`Deleting VPC: ${resourceId}`);

    try {
      const metadata = this.vpcMetadata.get(resourceId);

      if (metadata) {
        // Delete subnets
        for (const subnetId of metadata.subnetIds) {
          try {
            await this.ec2Client.send(new DeleteSubnetCommand({ SubnetId: subnetId }));
            console.log(`  Deleted subnet: ${subnetId}`);
          } catch (error) {
            console.warn(`  Failed to delete subnet ${subnetId}: ${error}`);
          }
        }

        // Detach and delete internet gateway
        if (metadata.internetGatewayId) {
          try {
            await this.ec2Client.send(
              new DetachInternetGatewayCommand({
                VpcId: resourceId,
                InternetGatewayId: metadata.internetGatewayId
              })
            );
            await this.ec2Client.send(
              new DeleteInternetGatewayCommand({
                InternetGatewayId: metadata.internetGatewayId
              })
            );
            console.log(`  Deleted internet gateway: ${metadata.internetGatewayId}`);
          } catch (error) {
            console.warn(`  Failed to delete internet gateway: ${error}`);
          }
        }

        // Delete route tables
        for (const routeTableId of metadata.routeTableIds) {
          try {
            await this.ec2Client.send(new DeleteRouteTableCommand({ RouteTableId: routeTableId }));
            console.log(`  Deleted route table: ${routeTableId}`);
          } catch (error) {
            console.warn(`  Failed to delete route table ${routeTableId}: ${error}`);
          }
        }
      }

      // Delete VPC
      await this.ec2Client.send(new DeleteVpcCommand({ VpcId: resourceId }));
      console.log(`✓ VPC deleted: ${resourceId}`);

      this.resources.delete(resourceId);
      this.vpcMetadata.delete(resourceId);

    } catch (error: any) {
      console.error(`✗ Failed to delete VPC: ${error.message}`);
      throw error;
    }
  }

  async deleteKubernetesCluster(resourceId: string): Promise<void> {
    console.log(`Deleting EKS cluster: ${resourceId}`);
    console.log(`⚠ Note: EKS cluster deletion typically takes 10-15 minutes`);

    try {
      const resource = this.resources.get(resourceId);

      // Delete node groups first
      if (resource?.metadata.nodeGroupName) {
        console.log(`  Deleting node group: ${resource.metadata.nodeGroupName}`);
        await this.eksClient.send(
          new DeleteNodegroupCommand({
            clusterName: resourceId,
            nodegroupName: resource.metadata.nodeGroupName
          })
        );

        // Wait for node group deletion
        await this.waitForNodeGroupDeleted(resourceId, resource.metadata.nodeGroupName);
      }

      // Delete cluster
      await this.eksClient.send(new DeleteClusterCommand({ name: resourceId }));
      console.log(`✓ EKS cluster deletion initiated: ${resourceId}`);

      this.resources.delete(resourceId);

    } catch (error: any) {
      console.error(`✗ Failed to delete EKS cluster: ${error.message}`);
      throw error;
    }
  }

  async deleteManagedDatabase(resourceId: string): Promise<void> {
    console.log(`Deleting RDS database: ${resourceId}`);

    try {
      await this.rdsClient.send(
        new DeleteDBInstanceCommand({
          DBInstanceIdentifier: resourceId,
          SkipFinalSnapshot: true,
          DeleteAutomatedBackups: true
        })
      );
      console.log(`✓ RDS database deletion initiated: ${resourceId}`);

      this.resources.delete(resourceId);

    } catch (error: any) {
      console.error(`✗ Failed to delete RDS database: ${error.message}`);
      throw error;
    }
  }

  async deleteObjectStorage(resourceId: string): Promise<void> {
    console.log(`Deleting S3 bucket: ${resourceId}`);

    try {
      // Empty bucket first
      const objects = await this.s3Client.send(
        new ListObjectsV2Command({ Bucket: resourceId })
      );

      if (objects.Contents && objects.Contents.length > 0) {
        console.log(`  Emptying bucket (${objects.Contents.length} objects)`);
        for (const object of objects.Contents) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: resourceId,
              Key: object.Key!
            })
          );
        }
      }

      // Delete bucket
      await this.s3Client.send(new DeleteBucketCommand({ Bucket: resourceId }));
      console.log(`✓ S3 bucket deleted: ${resourceId}`);

      this.resources.delete(resourceId);

    } catch (error: any) {
      console.error(`✗ Failed to delete S3 bucket: ${error.message}`);
      throw error;
    }
  }

  async deleteContainerDeployment(resourceId: string): Promise<void> {
    console.log(`Deleting container deployment: ${resourceId}`);
    this.resources.delete(resourceId);
    console.log(`✓ Container deployment deleted: ${resourceId}`);
  }

  // Helper methods
  private async waitForVpcAvailable(vpcId: string, maxWaitTime = 300000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 5000;

    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.ec2Client.send(
        new DescribeVpcsCommand({ VpcIds: [vpcId] })
      );

      const state = response.Vpcs![0].State;
      if (state === 'available') {
        return;
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`VPC ${vpcId} did not become available within ${maxWaitTime}ms`);
  }

  private async waitForClusterActive(clusterName: string, maxWaitTime = 1200000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 30000; // Check every 30 seconds

    console.log(`  Waiting for cluster to become active...`);

    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.eksClient.send(
        new DescribeClusterCommand({ name: clusterName })
      );

      const status = response.cluster!.status;
      console.log(`  Cluster status: ${status}`);

      if (status === 'ACTIVE') {
        return;
      }

      if (status === 'FAILED') {
        throw new Error(`Cluster ${clusterName} failed to create`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`Cluster ${clusterName} did not become active within ${maxWaitTime}ms`);
  }

  private async waitForDatabaseAvailable(dbInstanceId: string, maxWaitTime = 1200000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 30000;

    console.log(`  Waiting for database to become available...`);

    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.rdsClient.send(
        new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceId })
      );

      const status = response.DBInstances![0].DBInstanceStatus;
      console.log(`  Database status: ${status}`);

      if (status === 'available') {
        return;
      }

      if (status === 'failed') {
        throw new Error(`Database ${dbInstanceId} failed to create`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`Database ${dbInstanceId} did not become available within ${maxWaitTime}ms`);
  }

  private async waitForNodeGroupDeleted(clusterName: string, nodeGroupName: string, maxWaitTime = 600000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 30000;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.eksClient.send(
          new DescribeNodegroupCommand({
            clusterName,
            nodegroupName: nodeGroupName
          })
        );

        const status = response.nodegroup!.status;
        console.log(`  Node group status: ${status}`);

        if (status === 'DELETE_FAILED') {
          throw new Error(`Node group ${nodeGroupName} failed to delete`);
        }

        await this.sleep(checkInterval);
      } catch (error: any) {
        // If node group not found, it's been deleted
        if (error.name === 'ResourceNotFoundException') {
          console.log(`  Node group deleted successfully`);
          return;
        }
        throw error;
      }
    }

    throw new Error(`Node group ${nodeGroupName} did not delete within ${maxWaitTime}ms`);
  }

  private async createSubnets(vpcId: string, vpcCidr: string, vpcName: string): Promise<Array<{id: string, type: string, cidr: string}>> {
    const subnets = [];

    // Create public subnet
    const publicSubnetResponse = await this.ec2Client.send(
      new CreateSubnetCommand({
        VpcId: vpcId,
        CidrBlock: this.calculateSubnetCidr(vpcCidr, 0),
        TagSpecifications: [{
          ResourceType: 'subnet',
          Tags: [
            { Key: 'Name', Value: `${vpcName}-public-subnet` },
            { Key: 'Type', Value: 'public' }
          ]
        }]
      })
    );

    subnets.push({
      id: publicSubnetResponse.Subnet!.SubnetId!,
      type: 'public',
      cidr: this.calculateSubnetCidr(vpcCidr, 0)
    });

    // Create private subnet
    const privateSubnetResponse = await this.ec2Client.send(
      new CreateSubnetCommand({
        VpcId: vpcId,
        CidrBlock: this.calculateSubnetCidr(vpcCidr, 1),
        TagSpecifications: [{
          ResourceType: 'subnet',
          Tags: [
            { Key: 'Name', Value: `${vpcName}-private-subnet` },
            { Key: 'Type', Value: 'private' }
          ]
        }]
      })
    );

    subnets.push({
      id: privateSubnetResponse.Subnet!.SubnetId!,
      type: 'private',
      cidr: this.calculateSubnetCidr(vpcCidr, 1)
    });

    return subnets;
  }

  private async createRouteTables(
    vpcId: string,
    subnets: Array<{id: string, type: string}>,
    internetGatewayId: string,
    vpcName: string
  ): Promise<string[]> {
    const routeTableIds: string[] = [];

    // Create route table for public subnet
    const publicRouteTableResponse = await this.ec2Client.send(
      new CreateRouteTableCommand({
        VpcId: vpcId,
        TagSpecifications: [{
          ResourceType: 'route-table',
          Tags: [{ Key: 'Name', Value: `${vpcName}-public-rt` }]
        }]
      })
    );

    const publicRouteTableId = publicRouteTableResponse.RouteTable!.RouteTableId!;
    routeTableIds.push(publicRouteTableId);

    // Add route to internet gateway
    await this.ec2Client.send(
      new CreateRouteCommand({
        RouteTableId: publicRouteTableId,
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: internetGatewayId
      })
    );

    // Associate route table with public subnet
    const publicSubnet = subnets.find(s => s.type === 'public');
    if (publicSubnet) {
      await this.ec2Client.send(
        new AssociateRouteTableCommand({
          RouteTableId: publicRouteTableId,
          SubnetId: publicSubnet.id
        })
      );
    }

    return routeTableIds;
  }

  private async getOrCreateEKSClusterRole(): Promise<string> {
    const roleName = 'ai-platform-eks-cluster-role';

    try {
      // Try to get existing role
      const getRoleResponse = await this.iamClient.send(
        new GetRoleCommand({ RoleName: roleName })
      );
      return getRoleResponse.Role!.Arn!;
    } catch (error: any) {
      if (error.name === 'NoSuchEntity') {
        // Create role
        const assumeRolePolicy = {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'eks.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        };

        const createRoleResponse = await this.iamClient.send(
          new CreateRoleCommand({
            RoleName: roleName,
            AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
            Description: 'IAM role for EKS cluster managed by AI Platform'
          })
        );

        // Attach required policies
        await this.iamClient.send(
          new AttachRolePolicyCommand({
            RoleName: roleName,
            PolicyArn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy'
          })
        );

        // Wait for role to propagate
        await this.sleep(10000);

        return createRoleResponse.Role!.Arn!;
      }
      throw error;
    }
  }

  private async getOrCreateEKSNodeRole(): Promise<string> {
    const roleName = 'ai-platform-eks-node-role';

    try {
      const getRoleResponse = await this.iamClient.send(
        new GetRoleCommand({ RoleName: roleName })
      );
      return getRoleResponse.Role!.Arn!;
    } catch (error: any) {
      if (error.name === 'NoSuchEntity') {
        const assumeRolePolicy = {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ec2.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        };

        const createRoleResponse = await this.iamClient.send(
          new CreateRoleCommand({
            RoleName: roleName,
            AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
            Description: 'IAM role for EKS node group managed by AI Platform'
          })
        );

        // Attach required policies
        const policies = [
          'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
          'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
          'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'
        ];

        for (const policyArn of policies) {
          await this.iamClient.send(
            new AttachRolePolicyCommand({
              RoleName: roleName,
              PolicyArn: policyArn
            })
          );
        }

        // Wait for role to propagate
        await this.sleep(10000);

        return createRoleResponse.Role!.Arn!;
      }
      throw error;
    }
  }

  private async createNodeGroup(
    clusterName: string,
    config: KubernetesClusterConfig,
    subnetIds: string[]
  ): Promise<string> {
    const nodeGroupName = `${clusterName}-nodes`;
    const nodeRoleArn = await this.getOrCreateEKSNodeRole();

    console.log(`  Creating node group: ${nodeGroupName}`);

    const scalingConfig: any = {
      desiredSize: config.node_count,
      minSize: config.min_nodes ?? config.node_count,
      maxSize: config.max_nodes ?? config.node_count * 2
    };

    await this.eksClient.send(
      new CreateNodegroupCommand({
        clusterName,
        nodegroupName: nodeGroupName,
        scalingConfig,
        subnets: subnetIds,
        nodeRole: nodeRoleArn,
        instanceTypes: [this.mapInstanceType(config.instance_type)],
        tags: {
          'Name': nodeGroupName,
          'ManagedBy': 'ai-platform'
        }
      })
    );

    // Wait for node group to be active
    await this.waitForNodeGroupActive(clusterName, nodeGroupName);

    return nodeGroupName;
  }

  private async waitForNodeGroupActive(clusterName: string, nodeGroupName: string, maxWaitTime = 600000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 30000;

    console.log(`  Waiting for node group to become active...`);

    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.eksClient.send(
        new DescribeNodegroupCommand({
          clusterName,
          nodegroupName: nodeGroupName
        })
      );

      const status = response.nodegroup!.status;
      console.log(`  Node group status: ${status}`);

      if (status === 'ACTIVE') {
        return;
      }

      if (status === 'CREATE_FAILED') {
        throw new Error(`Node group ${nodeGroupName} failed to create`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`Node group ${nodeGroupName} did not become active within ${maxWaitTime}ms`);
  }

  private mapInstanceType(normalized: NormalizedInstanceType): string {
    const mapping: Record<NormalizedInstanceType, string> = {
      'small_compute': 't3.medium',
      'medium_compute': 'm5.xlarge',
      'large_compute': 'm5.4xlarge',
      'xlarge_compute': 'm5.12xlarge',
      'small_memory_optimized': 'r5.large',
      'medium_memory_optimized': 'r5.2xlarge',
      'gpu_compute': 'p3.2xlarge'
    };

    return mapping[normalized] || 'm5.xlarge';
  }

  private mapDatabaseClass(normalized: NormalizedDatabaseClass): string {
    const mapping: Record<NormalizedDatabaseClass, string> = {
      'small_db': 'db.t3.micro',
      'medium_db': 'db.t3.medium',
      'large_db': 'db.r5.large',
      'xlarge_db': 'db.r5.xlarge'
    };

    return mapping[normalized] || 'db.t3.medium';
  }

  private getEngineVersion(_engine: string, version: string): string {
    // Return the version as-is, could add validation here
    return version;
  }

  private calculateSubnetCidr(vpcCidr: string, index: number): string {
    const [baseIp] = vpcCidr.split('/');
    const parts = baseIp.split('.');
    parts[2] = String(index);
    return `${parts.join('.')}/24`;
  }

  private convertTagsToArray(tags?: Record<string, string>): Array<{Key: string, Value: string}> {
    if (!tags) return [];
    return Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
  }

  private generateSecurePassword(): string {
    const length = 20;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleAwsError(operation: string, error: any): Error {
    const errorCode = error.name || 'UnknownError';
    const errorMessage = error.message || 'An unknown error occurred';

    console.error(`AWS Error in ${operation}:`);
    console.error(`  Code: ${errorCode}`);
    console.error(`  Message: ${errorMessage}`);

    // Handle specific AWS errors
    if (errorCode === 'ThrottlingException') {
      return new Error(`AWS API throttling - please retry: ${errorMessage}`);
    }

    if (errorCode === 'UnauthorizedOperation' || errorCode === 'AccessDenied') {
      return new Error(`AWS credentials insufficient permissions: ${errorMessage}`);
    }

    if (errorCode === 'InvalidParameterException' || errorCode === 'InvalidParameterValue') {
      return new Error(`Invalid parameters: ${errorMessage}`);
    }

    return new Error(`AWS ${operation} failed: ${errorMessage}`);
  }

  // Get all resources (for state management)
  getAllResources(): Map<string, ResourceResult> {
    return this.resources;
  }
}
