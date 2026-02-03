/**
 * Platform Layer Type Definitions
 * Types for IAM, Compute, Database, and Storage configurations
 */

// =============================================
// Shared Types
// =============================================

export interface Tag {
  key: string;
  value: string;
}

// =============================================
// IAM Configuration Types
// =============================================

export interface IAMConfig {
  roles: IAMRole[];
  instanceProfiles: InstanceProfile[];
}

export interface IAMRole {
  id: string;
  name: string;
  description: string;
  path: string;
  assumeRolePolicy: TrustPolicy;
  managedPolicies: string[];
  inlinePolicies: InlinePolicy[];
  permissionsBoundary?: string;
  maxSessionDuration: number;
  tags: Tag[];
}

export interface TrustPolicy {
  Version: '2012-10-17';
  Statement: TrustPolicyStatement[];
}

export interface TrustPolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Principal: Principal;
  Action: string | string[];
  Condition?: Record<string, Record<string, string>>;
}

export interface Principal {
  Service?: string | string[];
  AWS?: string | string[];
  Federated?: string | string[];
}

export interface InlinePolicy {
  name: string;
  document: PolicyDocument;
}

export interface PolicyDocument {
  Version: '2012-10-17';
  Statement: PolicyStatement[];
}

export interface PolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
}

export interface InstanceProfile {
  id: string;
  name: string;
  roleId: string;
}

// =============================================
// Compute Configuration Types
// =============================================

export interface ComputeConfig {
  eksClusters: EKSCluster[];
  ec2Instances: EC2Instance[];
  autoScalingGroups: AutoScalingGroup[];
  launchTemplates: LaunchTemplate[];
}

export interface EKSCluster {
  id: string;
  name: string;
  version: string;
  roleId?: string;
  subnetIds: string[];
  securityGroupIds: string[];
  endpointPublicAccess: boolean;
  endpointPrivateAccess: boolean;
  publicAccessCidrs: string[];
  logging: EKSLogging;
  nodeGroups: EKSNodeGroup[];
  tags: Tag[];
}

export interface EKSLogging {
  api: boolean;
  audit: boolean;
  authenticator: boolean;
  controllerManager: boolean;
  scheduler: boolean;
}

export interface EKSNodeGroup {
  id: string;
  name: string;
  instanceTypes: string[];
  scalingConfig: ScalingConfig;
  subnetIds: string[];
  roleId?: string;
  launchTemplateId?: string;
  labels: Record<string, string>;
  taints: NodeTaint[];
  tags: Tag[];
}

export interface ScalingConfig {
  desiredSize: number;
  minSize: number;
  maxSize: number;
}

export interface NodeTaint {
  key: string;
  value?: string;
  effect: 'NO_SCHEDULE' | 'NO_EXECUTE' | 'PREFER_NO_SCHEDULE';
}

export interface EC2Instance {
  id: string;
  name: string;
  instanceType: string;
  amiId: string;
  subnetId: string;
  securityGroupIds: string[];
  instanceProfileId?: string;
  keyName?: string;
  userData?: string;
  ebsOptimized: boolean;
  monitoring: boolean;
  rootVolume: EBSVolumeSpec;
  additionalVolumes: EBSVolumeSpec[];
  tags: Tag[];
}

export interface EBSVolumeSpec {
  deviceName: string;
  volumeType: EBSVolumeType;
  size: number;
  iops?: number;
  throughput?: number;
  encrypted: boolean;
  kmsKeyId?: string;
  deleteOnTermination: boolean;
}

export type EBSVolumeType = 'gp2' | 'gp3' | 'io1' | 'io2' | 'st1' | 'sc1' | 'standard';

export interface AutoScalingGroup {
  id: string;
  name: string;
  launchTemplateId: string;
  subnetIds: string[];
  scalingConfig: ScalingConfig;
  healthCheckType: 'EC2' | 'ELB';
  healthCheckGracePeriod: number;
  scalingPolicies: ScalingPolicy[];
  tags: Tag[];
}

export interface ScalingPolicy {
  id: string;
  name: string;
  policyType: 'TargetTrackingScaling' | 'StepScaling' | 'SimpleScaling';
  targetValue?: number;
  metricType?: 'ASGAverageCPUUtilization' | 'ASGAverageNetworkIn' | 'ALBRequestCountPerTarget';
}

export interface LaunchTemplate {
  id: string;
  name: string;
  instanceType: string;
  amiId: string;
  securityGroupIds: string[];
  instanceProfileId?: string;
  keyName?: string;
  userData?: string;
  ebsOptimized: boolean;
  blockDeviceMappings: EBSVolumeSpec[];
  tags: Tag[];
}

// =============================================
// Database Configuration Types
// =============================================

export interface DatabaseConfig {
  rdsInstances: RDSInstance[];
  subnetGroups: DBSubnetGroup[];
  parameterGroups: DBParameterGroup[];
}

export interface RDSInstance {
  id: string;
  identifier: string;
  engine: DatabaseEngine;
  engineVersion: string;
  instanceClass: string;
  allocatedStorage: number;
  maxAllocatedStorage?: number;
  storageType: RDSStorageType;
  iops?: number;
  multiAZ: boolean;
  availabilityZone?: string;
  subnetGroupId: string;
  securityGroupIds: string[];
  publiclyAccessible: boolean;
  masterUsername: string;
  databaseName?: string;
  port: number;
  encrypted: boolean;
  kmsKeyId?: string;
  backupRetentionPeriod: number;
  preferredBackupWindow?: string;
  preferredMaintenanceWindow?: string;
  autoMinorVersionUpgrade: boolean;
  performanceInsightsEnabled: boolean;
  parameterGroupId?: string;
  deletionProtection: boolean;
  tags: Tag[];
}

export type DatabaseEngine =
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'oracle-ee'
  | 'oracle-se2'
  | 'sqlserver-ex'
  | 'sqlserver-web'
  | 'sqlserver-se'
  | 'sqlserver-ee';

export type RDSStorageType = 'gp2' | 'gp3' | 'io1' | 'magnetic';

export interface DBSubnetGroup {
  id: string;
  name: string;
  description: string;
  subnetIds: string[];
  tags: Tag[];
}

export interface DBParameterGroup {
  id: string;
  name: string;
  family: string;
  description: string;
  parameters: Record<string, string>;
  tags: Tag[];
}

// =============================================
// Storage Configuration Types
// =============================================

export interface StorageConfig {
  s3Buckets: S3Bucket[];
  ebsVolumes: EBSVolume[];
  efsFileSystems: EFSFileSystem[];
}

export interface S3Bucket {
  id: string;
  name: string;
  versioningEnabled: boolean;
  mfaDelete: boolean;
  encryptionType: S3EncryptionType;
  kmsKeyId?: string;
  publicAccessBlock: PublicAccessBlock;
  corsRules: CORSRule[];
  lifecycleRules: LifecycleRule[];
  loggingEnabled: boolean;
  loggingBucket?: string;
  loggingPrefix?: string;
  tags: Tag[];
}

export type S3EncryptionType = 'SSE-S3' | 'SSE-KMS' | 'NONE';

export interface PublicAccessBlock {
  blockPublicAcls: boolean;
  ignorePublicAcls: boolean;
  blockPublicPolicy: boolean;
  restrictPublicBuckets: boolean;
}

export interface CORSRule {
  allowedHeaders?: string[];
  allowedMethods: ('GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD')[];
  allowedOrigins: string[];
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

export interface LifecycleRule {
  id: string;
  enabled: boolean;
  prefix?: string;
  transitions: LifecycleTransition[];
  expiration?: {
    days?: number;
    expiredObjectDeleteMarker?: boolean;
  };
  noncurrentVersionTransitions: LifecycleTransition[];
  noncurrentVersionExpiration?: {
    noncurrentDays: number;
  };
}

export interface LifecycleTransition {
  days: number;
  storageClass: 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'GLACIER_IR' | 'DEEP_ARCHIVE';
}

export interface EBSVolume {
  id: string;
  name: string;
  volumeType: EBSVolumeType;
  size: number;
  iops?: number;
  throughput?: number;
  encrypted: boolean;
  kmsKeyId?: string;
  availabilityZone: string;
  snapshotId?: string;
  tags: Tag[];
}

export interface EFSFileSystem {
  id: string;
  name: string;
  performanceMode: 'generalPurpose' | 'maxIO';
  throughputMode: 'bursting' | 'provisioned' | 'elastic';
  provisionedThroughputInMibps?: number;
  encrypted: boolean;
  kmsKeyId?: string;
  lifecyclePolicy?: 'AFTER_7_DAYS' | 'AFTER_14_DAYS' | 'AFTER_30_DAYS' | 'AFTER_60_DAYS' | 'AFTER_90_DAYS';
  mountTargets: EFSMountTarget[];
  accessPoints: EFSAccessPoint[];
  tags: Tag[];
}

export interface EFSMountTarget {
  id: string;
  subnetId: string;
  securityGroupIds: string[];
}

export interface EFSAccessPoint {
  id: string;
  name: string;
  posixUser?: {
    uid: number;
    gid: number;
    secondaryGids?: number[];
  };
  rootDirectory?: {
    path: string;
    creationInfo?: {
      ownerUid: number;
      ownerGid: number;
      permissions: string;
    };
  };
  tags: Tag[];
}

// =============================================
// Validation Types
// =============================================

export interface PlatformValidationResult {
  isValid: boolean;
  errors: PlatformValidationError[];
  warnings: PlatformValidationError[];
  info: PlatformValidationError[];
  costEstimate: CostEstimate;
  securityScore: SecurityScore;
}

export interface PlatformValidationError {
  code: string;
  message: string;
  path?: string;
  resourceId?: string;
  resourceType?: string;
  severity: 'error' | 'warning' | 'info';
  category: 'iam' | 'compute' | 'database' | 'storage' | 'security' | 'cost';
  fix?: {
    step: number;
    field: string;
    action?: string;
  };
}

export interface CostEstimate {
  monthly: {
    total: number;
    byService: Record<string, number>;
    byResource: CostBreakdown[];
  };
  currency: 'USD';
}

export interface CostBreakdown {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  monthlyCost: number;
  details: string;
}

export interface SecurityScore {
  overall: number;
  categories: {
    iam: number;
    encryption: number;
    networkIsolation: number;
    backupRecovery: number;
  };
  findings: SecurityFinding[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resourceId: string;
  recommendation: string;
}

// =============================================
// Complete Platform Layer Data
// =============================================

export interface PlatformLayerData {
  iam: IAMConfig;
  compute: ComputeConfig;
  database: DatabaseConfig;
  storage: StorageConfig;
  validationResult?: PlatformValidationResult;
}

// =============================================
// Constants
// =============================================

export const DEFAULT_IAM_CONFIG: IAMConfig = {
  roles: [],
  instanceProfiles: [],
};

export const DEFAULT_COMPUTE_CONFIG: ComputeConfig = {
  eksClusters: [],
  ec2Instances: [],
  autoScalingGroups: [],
  launchTemplates: [],
};

export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  rdsInstances: [],
  subnetGroups: [],
  parameterGroups: [],
};

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  s3Buckets: [],
  ebsVolumes: [],
  efsFileSystems: [],
};

export const DEFAULT_PUBLIC_ACCESS_BLOCK: PublicAccessBlock = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
};

export const DEFAULT_EKS_LOGGING: EKSLogging = {
  api: true,
  audit: true,
  authenticator: true,
  controllerManager: true,
  scheduler: true,
};

export const DEFAULT_SCALING_CONFIG: ScalingConfig = {
  desiredSize: 2,
  minSize: 1,
  maxSize: 4,
};

export const DEFAULT_ROOT_VOLUME: EBSVolumeSpec = {
  deviceName: '/dev/xvda',
  volumeType: 'gp3',
  size: 20,
  encrypted: true,
  deleteOnTermination: true,
};

// =============================================
// AWS Managed Policies (commonly used)
// =============================================

export const COMMON_MANAGED_POLICIES = [
  { arn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy', name: 'AmazonEKSClusterPolicy', description: 'Allows EKS to manage clusters' },
  { arn: 'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy', name: 'AmazonEKSWorkerNodePolicy', description: 'Allows EKS worker nodes to connect to EKS clusters' },
  { arn: 'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy', name: 'AmazonEKS_CNI_Policy', description: 'Provides VPC CNI plugin permissions' },
  { arn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly', name: 'AmazonEC2ContainerRegistryReadOnly', description: 'Read-only access to ECR' },
  { arn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess', name: 'AmazonS3ReadOnlyAccess', description: 'Read-only access to S3' },
  { arn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess', name: 'AmazonS3FullAccess', description: 'Full access to S3' },
  { arn: 'arn:aws:iam::aws:policy/AmazonRDSFullAccess', name: 'AmazonRDSFullAccess', description: 'Full access to RDS' },
  { arn: 'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy', name: 'CloudWatchAgentServerPolicy', description: 'Allows CloudWatch agent to write metrics and logs' },
  { arn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore', name: 'AmazonSSMManagedInstanceCore', description: 'Enables Systems Manager functionality' },
];

// =============================================
// AWS Service Principals for Trust Policies
// =============================================

export const SERVICE_PRINCIPALS = [
  { service: 'ec2.amazonaws.com', name: 'EC2', description: 'Amazon EC2 instances' },
  { service: 'eks.amazonaws.com', name: 'EKS', description: 'Amazon EKS service' },
  { service: 'rds.amazonaws.com', name: 'RDS', description: 'Amazon RDS service' },
  { service: 'lambda.amazonaws.com', name: 'Lambda', description: 'AWS Lambda functions' },
  { service: 'ecs.amazonaws.com', name: 'ECS', description: 'Amazon ECS service' },
  { service: 'ecs-tasks.amazonaws.com', name: 'ECS Tasks', description: 'Amazon ECS tasks' },
  { service: 's3.amazonaws.com', name: 'S3', description: 'Amazon S3 service' },
];

// =============================================
// Instance Types by Category
// =============================================

export interface InstanceTypeInfo {
  type: string;
  vcpu: number;
  memory: number;
  price: number;
}

export const EC2_INSTANCE_TYPES: Record<string, InstanceTypeInfo[]> = {
  'General Purpose': [
    { type: 't3.micro', vcpu: 2, memory: 1, price: 0.0104 },
    { type: 't3.small', vcpu: 2, memory: 2, price: 0.0208 },
    { type: 't3.medium', vcpu: 2, memory: 4, price: 0.0416 },
    { type: 't3.large', vcpu: 2, memory: 8, price: 0.0832 },
    { type: 't3.xlarge', vcpu: 4, memory: 16, price: 0.1664 },
    { type: 'm5.large', vcpu: 2, memory: 8, price: 0.096 },
    { type: 'm5.xlarge', vcpu: 4, memory: 16, price: 0.192 },
    { type: 'm5.2xlarge', vcpu: 8, memory: 32, price: 0.384 },
    { type: 'm5.4xlarge', vcpu: 16, memory: 64, price: 0.768 },
  ],
  'Compute Optimized': [
    { type: 'c5.large', vcpu: 2, memory: 4, price: 0.085 },
    { type: 'c5.xlarge', vcpu: 4, memory: 8, price: 0.17 },
    { type: 'c5.2xlarge', vcpu: 8, memory: 16, price: 0.34 },
    { type: 'c5.4xlarge', vcpu: 16, memory: 32, price: 0.68 },
  ],
  'Memory Optimized': [
    { type: 'r5.large', vcpu: 2, memory: 16, price: 0.126 },
    { type: 'r5.xlarge', vcpu: 4, memory: 32, price: 0.252 },
    { type: 'r5.2xlarge', vcpu: 8, memory: 64, price: 0.504 },
    { type: 'r5.4xlarge', vcpu: 16, memory: 128, price: 1.008 },
  ],
};

// =============================================
// RDS Instance Classes
// =============================================

export interface RDSInstanceClassInfo {
  class: string;
  vcpu: number;
  memory: number;
  price: number;
}

export const RDS_INSTANCE_CLASSES: Record<string, RDSInstanceClassInfo[]> = {
  'Burstable': [
    { class: 'db.t3.micro', vcpu: 2, memory: 1, price: 0.017 },
    { class: 'db.t3.small', vcpu: 2, memory: 2, price: 0.034 },
    { class: 'db.t3.medium', vcpu: 2, memory: 4, price: 0.068 },
    { class: 'db.t3.large', vcpu: 2, memory: 8, price: 0.136 },
  ],
  'Standard': [
    { class: 'db.m5.large', vcpu: 2, memory: 8, price: 0.171 },
    { class: 'db.m5.xlarge', vcpu: 4, memory: 16, price: 0.342 },
    { class: 'db.m5.2xlarge', vcpu: 8, memory: 32, price: 0.684 },
    { class: 'db.m5.4xlarge', vcpu: 16, memory: 64, price: 1.368 },
  ],
  'Memory Optimized': [
    { class: 'db.r5.large', vcpu: 2, memory: 16, price: 0.24 },
    { class: 'db.r5.xlarge', vcpu: 4, memory: 32, price: 0.48 },
    { class: 'db.r5.2xlarge', vcpu: 8, memory: 64, price: 0.96 },
    { class: 'db.r5.4xlarge', vcpu: 16, memory: 128, price: 1.92 },
  ],
};

// =============================================
// Database Engines and Versions
// =============================================

export interface DatabaseEngineInfo {
  name: string;
  versions: string[];
  defaultPort: number;
  parameterFamily: (version: string) => string;
}

export const DATABASE_ENGINES: Record<DatabaseEngine, DatabaseEngineInfo> = {
  postgres: {
    name: 'PostgreSQL',
    versions: ['16.1', '15.4', '14.9', '13.12', '12.16'],
    defaultPort: 5432,
    parameterFamily: (v) => `postgres${v.split('.')[0]}`,
  },
  mysql: {
    name: 'MySQL',
    versions: ['8.0.35', '8.0.34', '5.7.44'],
    defaultPort: 3306,
    parameterFamily: (v) => `mysql${v.split('.').slice(0, 2).join('.')}`,
  },
  mariadb: {
    name: 'MariaDB',
    versions: ['10.11.6', '10.6.16', '10.5.23'],
    defaultPort: 3306,
    parameterFamily: (v) => `mariadb${v.split('.').slice(0, 2).join('.')}`,
  },
  'oracle-ee': {
    name: 'Oracle Enterprise Edition',
    versions: ['19.0.0.0.ru-2023-10.rur-2023-10.r1'],
    defaultPort: 1521,
    parameterFamily: () => 'oracle-ee-19',
  },
  'oracle-se2': {
    name: 'Oracle Standard Edition 2',
    versions: ['19.0.0.0.ru-2023-10.rur-2023-10.r1'],
    defaultPort: 1521,
    parameterFamily: () => 'oracle-se2-19',
  },
  'sqlserver-ex': {
    name: 'SQL Server Express',
    versions: ['15.00.4316.3.v1', '14.00.3451.2.v1'],
    defaultPort: 1433,
    parameterFamily: () => 'sqlserver-ex-15.0',
  },
  'sqlserver-web': {
    name: 'SQL Server Web',
    versions: ['15.00.4316.3.v1', '14.00.3451.2.v1'],
    defaultPort: 1433,
    parameterFamily: () => 'sqlserver-web-15.0',
  },
  'sqlserver-se': {
    name: 'SQL Server Standard',
    versions: ['15.00.4316.3.v1', '14.00.3451.2.v1'],
    defaultPort: 1433,
    parameterFamily: () => 'sqlserver-se-15.0',
  },
  'sqlserver-ee': {
    name: 'SQL Server Enterprise',
    versions: ['15.00.4316.3.v1', '14.00.3451.2.v1'],
    defaultPort: 1433,
    parameterFamily: () => 'sqlserver-ee-15.0',
  },
};

// =============================================
// Kubernetes Versions
// =============================================

export const EKS_VERSIONS = ['1.29', '1.28', '1.27', '1.26', '1.25'];

// =============================================
// EBS Volume Type Pricing (per GB-month)
// =============================================

export const EBS_PRICING: Record<EBSVolumeType, number> = {
  gp2: 0.10,
  gp3: 0.08,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.015,
  standard: 0.05,
};

// =============================================
// Helper Functions
// =============================================

export function createDefaultTrustPolicy(servicePrincipal: string): TrustPolicy {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: servicePrincipal },
        Action: 'sts:AssumeRole',
      },
    ],
  };
}

export function createEmptyPolicyDocument(): PolicyDocument {
  return {
    Version: '2012-10-17',
    Statement: [],
  };
}

export function getEC2Price(instanceType: string): number {
  for (const category of Object.values(EC2_INSTANCE_TYPES)) {
    const found = category.find((t) => t.type === instanceType);
    if (found) return found.price;
  }
  return 0.10; // Default fallback
}

export function getRDSPrice(instanceClass: string): number {
  for (const category of Object.values(RDS_INSTANCE_CLASSES)) {
    const found = category.find((c) => c.class === instanceClass);
    if (found) return found.price;
  }
  return 0.10; // Default fallback
}
