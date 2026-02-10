/**
 * Cloud Resource Service Types
 * Real cloud operations - NO MOCK DATA
 */

export interface VPCConfig {
  name: string;
  cidrBlock: string;
  region: string;
  environment: string;
  cloud: 'aws' | 'oci';
  availabilityZones?: string[];
  enableDnsSupport?: boolean;
  enableDnsHostnames?: boolean;
  tags?: Record<string, string>;
  createdBy?: string;
}

export interface VPCResource {
  id: string; // Database ID
  resourceId: string; // AWS VPC ID (vpc-xxx) or OCI VCNID
  name: string;
  cidrBlock: string;
  region: string;
  cloud: 'aws' | 'oci';
  subnets: SubnetInfo[];
  internetGatewayId?: string;
  routeTableId?: string;
  status: ResourceStatus;
  createdAt: Date;
}

export interface SubnetInfo {
  id: string;
  cidrBlock: string;
  availabilityZone: string;
  type: 'public' | 'private';
}

export interface ClusterConfig {
  name: string;
  region: string;
  environment: string;
  cloud: 'aws' | 'oci';
  vpcId: string;
  subnetIds: string[];
  securityGroupIds?: string[];
  kubernetesVersion?: string;
  instanceType?: string;
  minNodes?: number;
  maxNodes?: number;
  desiredNodes?: number;
  tags?: Record<string, string>;
  createdBy?: string;
}

export interface ClusterResource {
  id: string;
  resourceId: string; // EKS ARN or OKE ID
  name: string;
  endpoint: string;
  certificateAuthority?: string;
  version: string;
  status: ResourceStatus;
  nodeGroups: NodeGroupInfo[];
  createdAt: Date;
}

export interface NodeGroupInfo {
  id: string;
  name: string;
  instanceType: string;
  desiredSize: number;
  minSize: number;
  maxSize: number;
  status: string;
}

export interface DatabaseConfig {
  name: string;
  region: string;
  environment: string;
  cloud: 'aws' | 'oci';
  engine: 'postgres' | 'mysql';
  engineVersion?: string;
  instanceClass: string;
  storageGb: number;
  masterUsername: string;
  masterPassword: string;
  vpcId: string;
  subnetIds: string[];
  securityGroupIds?: string[];
  multiAz?: boolean;
  publiclyAccessible?: boolean;
  backupRetentionDays?: number;
  tags?: Record<string, string>;
  createdBy?: string;
}

export interface DatabaseResource {
  id: string;
  resourceId: string; // RDS ARN or OCI DB ID
  name: string;
  endpoint: string;
  port: number;
  engine: string;
  version: string;
  instanceClass: string;
  status: ResourceStatus;
  createdAt: Date;
}

export type ResourceStatus =
  | 'creating'
  | 'active'
  | 'updating'
  | 'deleting'
  | 'deleted'
  | 'failed';

export interface ResourceFilters {
  cloud?: 'aws' | 'oci';
  region?: string;
  environment?: string;
  resourceType?: string;
  status?: ResourceStatus;
}

export interface ICloudResourceService {
  // VPC operations
  createVPC(config: VPCConfig): Promise<VPCResource>;
  getVPC(resourceId: string): Promise<VPCResource>;
  deleteVPC(resourceId: string): Promise<void>;

  // Cluster operations
  createCluster(config: ClusterConfig): Promise<ClusterResource>;
  getCluster(resourceId: string): Promise<ClusterResource>;
  deleteCluster(resourceId: string): Promise<void>;

  // Database operations
  createDatabase(config: DatabaseConfig): Promise<DatabaseResource>;
  getDatabase(resourceId: string): Promise<DatabaseResource>;
  deleteDatabase(resourceId: string): Promise<void>;

  // Generic operations
  listResources(filters?: ResourceFilters): Promise<any[]>;
  getResourceStatus(resourceId: string): Promise<{ status: ResourceStatus; message: string }>;
}

export interface ICloudProvider {
  createVPC(config: VPCConfig): Promise<any>;
  getVPC(vpcId: string): Promise<any>;
  deleteVPC(vpcId: string): Promise<void>;
  createCluster(config: ClusterConfig): Promise<any>;
  getCluster(clusterId: string): Promise<any>;
  deleteCluster(clusterId: string): Promise<void>;
  createDatabase(config: DatabaseConfig): Promise<any>;
  getDatabase(dbId: string): Promise<any>;
  deleteDatabase(dbId: string): Promise<void>;
}
