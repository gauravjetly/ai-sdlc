/**
 * AWS Cloud Provider
 * Real AWS SDK operations - NO MOCK DATA
 */

import {
  EC2Client,
  CreateVpcCommand,
  DescribeVpcsCommand,
  DeleteVpcCommand,
  CreateSubnetCommand,
  CreateInternetGatewayCommand,
  AttachInternetGatewayCommand,
  CreateRouteTableCommand,
  CreateRouteCommand,
  AssociateRouteTableCommand,
} from '@aws-sdk/client-ec2';
import {
  EKSClient,
  CreateClusterCommand,
  DescribeClusterCommand,
  DeleteClusterCommand,
  CreateNodegroupCommand,
} from '@aws-sdk/client-eks';
import {
  RDSClient,
  CreateDBInstanceCommand,
  DescribeDBInstancesCommand,
  DeleteDBInstanceCommand,
} from '@aws-sdk/client-rds';
import { createLogger } from '../../../utils/logger.js';
import { ICloudProvider } from '../types.js';
import type { VPCConfig, ClusterConfig, DatabaseConfig } from '../types.js';

const logger = createLogger('AWSProvider');

export class AWSProvider implements ICloudProvider {
  private ec2Client: EC2Client;
  private eksClient: EKSClient;
  private rdsClient: RDSClient;

  constructor(region: string) {
    this.ec2Client = new EC2Client({ region });
    this.eksClient = new EKSClient({ region });
    this.rdsClient = new RDSClient({ region });
    logger.info('AWS Provider initialized', { region });
  }

  /**
   * Create VPC with subnets, internet gateway, and route tables
   */
  async createVPC(config: VPCConfig): Promise<any> {
    try {
      logger.info('Creating VPC', { name: config.name, cidrBlock: config.cidrBlock });

      // 1. Create VPC
      const createVpcResponse = await this.ec2Client.send(
        new CreateVpcCommand({
          CidrBlock: config.cidrBlock,
          TagSpecifications: [
            {
              ResourceType: 'vpc',
              Tags: [
                { Key: 'Name', Value: config.name },
                { Key: 'Environment', Value: config.environment },
                { Key: 'ManagedBy', Value: 'vintiq-catalyst' },
                ...Object.entries(config.tags || {}).map(([k, v]) => ({ Key: k, Value: v })),
              ],
            },
          ],
        })
      );

      const vpcId = createVpcResponse.Vpc!.VpcId!;
      logger.info('VPC created', { vpcId });

      // 2. Create Internet Gateway
      const igwResponse = await this.ec2Client.send(
        new CreateInternetGatewayCommand({
          TagSpecifications: [
            {
              ResourceType: 'internet-gateway',
              Tags: [{ Key: 'Name', Value: `${config.name}-igw` }],
            },
          ],
        })
      );
      const igwId = igwResponse.InternetGateway!.InternetGatewayId!;

      // Attach to VPC
      await this.ec2Client.send(
        new AttachInternetGatewayCommand({
          VpcId: vpcId,
          InternetGatewayId: igwId,
        })
      );

      // 3. Create subnets
      const azs = config.availabilityZones || [`${config.region}a`, `${config.region}b`];
      const subnets = [];

      for (let i = 0; i < azs.length; i++) {
        const subnetCidr = this.calculateSubnetCidr(config.cidrBlock, i);
        const subnetResponse = await this.ec2Client.send(
          new CreateSubnetCommand({
            VpcId: vpcId,
            CidrBlock: subnetCidr,
            AvailabilityZone: azs[i],
            TagSpecifications: [
              {
                ResourceType: 'subnet',
                Tags: [
                  { Key: 'Name', Value: `${config.name}-subnet-${i + 1}` },
                  { Key: 'Type', Value: 'public' },
                ],
              },
            ],
          })
        );

        subnets.push({
          id: subnetResponse.Subnet!.SubnetId!,
          cidrBlock: subnetCidr,
          availabilityZone: azs[i],
          type: 'public',
        });
      }

      // 4. Create route table
      const rtResponse = await this.ec2Client.send(
        new CreateRouteTableCommand({
          VpcId: vpcId,
          TagSpecifications: [
            {
              ResourceType: 'route-table',
              Tags: [{ Key: 'Name', Value: `${config.name}-rt` }],
            },
          ],
        })
      );
      const rtId = rtResponse.RouteTable!.RouteTableId!;

      // Add internet route
      await this.ec2Client.send(
        new CreateRouteCommand({
          RouteTableId: rtId,
          DestinationCidrBlock: '0.0.0.0/0',
          GatewayId: igwId,
        })
      );

      // Associate subnets with route table
      for (const subnet of subnets) {
        await this.ec2Client.send(
          new AssociateRouteTableCommand({
            RouteTableId: rtId,
            SubnetId: subnet.id,
          })
        );
      }

      logger.info('VPC setup complete', { vpcId, subnets: subnets.length });

      return {
        vpcId,
        cidrBlock: config.cidrBlock,
        subnets,
        internetGatewayId: igwId,
        routeTableId: rtId,
      };
    } catch (error: any) {
      logger.error('Failed to create VPC', { error: error.message });
      throw new Error(`AWS VPC creation failed: ${error.message}`);
    }
  }

  async getVPC(vpcId: string): Promise<any> {
    const response = await this.ec2Client.send(
      new DescribeVpcsCommand({ VpcIds: [vpcId] })
    );
    return response.Vpcs?.[0];
  }

  async deleteVPC(vpcId: string): Promise<void> {
    await this.ec2Client.send(new DeleteVpcCommand({ VpcId: vpcId }));
  }

  /**
   * Create EKS cluster
   */
  async createCluster(config: ClusterConfig): Promise<any> {
    try {
      logger.info('Creating EKS cluster', { name: config.name });

      const createClusterResponse = await this.eksClient.send(
        new CreateClusterCommand({
          name: config.name,
          version: config.kubernetesVersion || '1.28',
          roleArn: process.env.EKS_CLUSTER_ROLE_ARN!,
          resourcesVpcConfig: {
            subnetIds: config.subnetIds,
            securityGroupIds: config.securityGroupIds,
          },
          tags: {
            Environment: config.environment,
            ManagedBy: 'vintiq-catalyst',
            ...config.tags,
          },
        })
      );

      const clusterArn = createClusterResponse.cluster!.arn!;
      logger.info('EKS cluster created', { clusterArn });

      // Wait for cluster to be active (in production, use waiter)
      // For now, return immediately

      return {
        clusterArn,
        name: config.name,
        status: 'creating',
      };
    } catch (error: any) {
      logger.error('Failed to create EKS cluster', { error: error.message });
      throw new Error(`AWS EKS creation failed: ${error.message}`);
    }
  }

  async getCluster(clusterName: string): Promise<any> {
    const response = await this.eksClient.send(
      new DescribeClusterCommand({ name: clusterName })
    );
    return response.cluster;
  }

  async deleteCluster(clusterName: string): Promise<void> {
    await this.eksClient.send(new DeleteClusterCommand({ name: clusterName }));
  }

  /**
   * Create RDS database instance
   */
  async createDatabase(config: DatabaseConfig): Promise<any> {
    try {
      logger.info('Creating RDS instance', { name: config.name });

      const response = await this.rdsClient.send(
        new CreateDBInstanceCommand({
          DBInstanceIdentifier: config.name,
          DBInstanceClass: config.instanceClass,
          Engine: config.engine,
          EngineVersion: config.engineVersion,
          MasterUsername: config.masterUsername,
          MasterUserPassword: config.masterPassword,
          AllocatedStorage: config.storageGb,
          VpcSecurityGroupIds: config.securityGroupIds,
          DBSubnetGroupName: `${config.name}-subnet-group`,
          MultiAZ: config.multiAz,
          PubliclyAccessible: config.publiclyAccessible,
          BackupRetentionPeriod: config.backupRetentionDays || 7,
          Tags: [
            { Key: 'Environment', Value: config.environment },
            { Key: 'ManagedBy', Value: 'vintiq-catalyst' },
            ...Object.entries(config.tags || {}).map(([k, v]) => ({ Key: k, Value: v })),
          ],
        })
      );

      logger.info('RDS instance created', { dbInstanceArn: response.DBInstance!.DBInstanceArn });

      return {
        dbInstanceArn: response.DBInstance!.DBInstanceArn,
        dbInstanceIdentifier: config.name,
        endpoint: response.DBInstance!.Endpoint,
        status: 'creating',
      };
    } catch (error: any) {
      logger.error('Failed to create RDS instance', { error: error.message });
      throw new Error(`AWS RDS creation failed: ${error.message}`);
    }
  }

  async getDatabase(dbInstanceIdentifier: string): Promise<any> {
    const response = await this.rdsClient.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceIdentifier })
    );
    return response.DBInstances?.[0];
  }

  async deleteDatabase(dbInstanceIdentifier: string): Promise<void> {
    await this.rdsClient.send(
      new DeleteDBInstanceCommand({
        DBInstanceIdentifier: dbInstanceIdentifier,
        SkipFinalSnapshot: true,
      })
    );
  }

  // Helper methods
  private calculateSubnetCidr(vpcCidr: string, index: number): string {
    // Simple CIDR calculation for demo
    // In production, use a proper CIDR library
    const [network, prefix] = vpcCidr.split('/');
    const parts = network.split('.');
    parts[2] = String(parseInt(parts[2]) + index);
    return `${parts.join('.')}/24`;
  }
}
