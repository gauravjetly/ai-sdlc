# Architecture Design: Platform Architect Wizard

**Document ID**: ARCH-PLATFORM-WIZARD-20260202
**Version**: 1.0
**Status**: APPROVED
**Author**: Architect (Jets) Agent
**Date**: 2026-02-02

---

## 1. Executive Summary

This document defines the architecture for the Platform Architect Wizard, a 5-step wizard interface for configuring AWS platform-layer resources. The design follows established patterns from the Network Architect Wizard while introducing platform-specific validation and cost estimation capabilities.

---

## 2. Architecture Overview

### 2.1 Component Hierarchy

```
webapp/src/
├── components/
│   └── visualDesigner/
│       └── wizard/
│           ├── roles/
│           │   ├── NetworkArchitectWizard.tsx (existing)
│           │   └── PlatformArchitectWizard.tsx (NEW)
│           ├── steps/
│           │   ├── network/ (existing)
│           │   └── platform/ (NEW)
│           │       ├── IAMRolesPoliciesStep.tsx
│           │       ├── ComputeServicesStep.tsx
│           │       ├── DatabaseServicesStep.tsx
│           │       ├── StorageServicesStep.tsx
│           │       └── PlatformValidationStep.tsx
│           ├── shared/ (reuse existing)
│           └── hooks/
│               ├── useNetworkValidation.ts (existing)
│               └── usePlatformValidation.ts (NEW)
├── types/
│   ├── network.ts (existing)
│   └── platform.ts (NEW)
└── contexts/
    └── DesignWizardContext.tsx (existing, no changes needed)
```

### 2.2 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     DesignWizardContext                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ layers: {                                                   │ │
│  │   network: { status, data: NetworkLayerData }               │ │
│  │   platform: { status, data: PlatformLayerData } ← NEW DATA  │ │
│  │   devops: { status, data: DevOpsLayerData }                 │ │
│  │ }                                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PlatformArchitectWizard                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Step 1     │  │ Step 2     │  │ Step 3     │  │ Step 4     │ │
│  │ IAM Roles  │→ │ Compute    │→ │ Database   │→ │ Storage    │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                                                         │        │
│                                                         ▼        │
│                                               ┌────────────────┐ │
│                                               │ Step 5         │ │
│                                               │ Validation     │ │
│                                               └────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   usePlatformValidation Hook                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • IAM Policy Validation (JSON syntax, grammar, security)   │ │
│  │ • Resource Dependency Validation (subnets, security groups)│ │
│  │ • Cost Estimation (AWS pricing calculation)                 │ │
│  │ • Security Best Practices (encryption, least privilege)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 PlatformArchitectWizard (Orchestrator)

**File**: `webapp/src/components/visualDesigner/wizard/roles/PlatformArchitectWizard.tsx`

**Responsibilities**:
- Orchestrate 5-step wizard flow
- Manage platform layer state (iam, compute, database, storage)
- Coordinate validation across steps
- Generate ReactFlow nodes on completion
- Integrate with DesignWizardContext

**Props Interface**:
```typescript
interface PlatformArchitectWizardProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  onSave?: () => Promise<void>;
}
```

**State Management**:
```typescript
// Local state for each configuration section
const [iam, setIAM] = useState<IAMConfig>(existingData?.iam || DEFAULT_IAM_CONFIG);
const [compute, setCompute] = useState<ComputeConfig>(existingData?.compute || DEFAULT_COMPUTE_CONFIG);
const [database, setDatabase] = useState<DatabaseConfig>(existingData?.database || DEFAULT_DATABASE_CONFIG);
const [storage, setStorage] = useState<StorageConfig>(existingData?.storage || DEFAULT_STORAGE_CONFIG);
const [stepErrors, setStepErrors] = useState<ValidationError[]>([]);
const [validationResult, setValidationResult] = useState<PlatformValidationResult | null>(null);
```

### 3.2 IAMRolesPoliciesStep

**File**: `webapp/src/components/visualDesigner/wizard/steps/platform/IAMRolesPoliciesStep.tsx`

**Responsibilities**:
- Display list of configured IAM roles
- Add/Edit/Delete IAM roles
- Configure trust policies
- Attach managed policies (searchable)
- Define custom inline policies with JSON editor
- Create instance profiles
- Real-time policy validation

**Key UI Components**:
- RoleCard: Displays role summary with attached policies
- TrustPolicyEditor: Modal for configuring trust relationships
- ManagedPolicyPicker: Searchable list of AWS managed policies
- PolicyEditor: JSON editor with syntax highlighting and validation
- InstanceProfileToggle: Option to create instance profile

**Data Structure**:
```typescript
interface IAMConfig {
  roles: IAMRole[];
  instanceProfiles: InstanceProfile[];
}

interface IAMRole {
  id: string;
  name: string;
  description: string;
  assumeRolePolicy: TrustPolicy;
  managedPolicies: string[];  // ARNs
  inlinePolicies: InlinePolicy[];
  tags: Tag[];
}
```

### 3.3 ComputeServicesStep

**File**: `webapp/src/components/visualDesigner/wizard/steps/platform/ComputeServicesStep.tsx`

**Responsibilities**:
- Configure EKS clusters and node groups
- Configure EC2 instances
- Configure Auto Scaling Groups
- Configure Launch Templates
- Select subnets/security groups from Network Layer
- Assign IAM roles/instance profiles from IAM step

**Key UI Components**:
- ComputeResourceTabs: EKS | EC2 | Auto Scaling
- EKSClusterCard: Cluster configuration with node groups
- EC2InstanceCard: Instance configuration
- ASGCard: Auto Scaling Group configuration
- SubnetPicker: Dropdown showing Network Layer subnets
- SecurityGroupPicker: Multi-select security groups
- InstanceTypePicker: Searchable instance type selector

**Data Structure**:
```typescript
interface ComputeConfig {
  eksClusters: EKSCluster[];
  ec2Instances: EC2Instance[];
  autoScalingGroups: AutoScalingGroup[];
  launchTemplates: LaunchTemplate[];
}

interface EKSCluster {
  id: string;
  name: string;
  version: string;
  subnetIds: string[];
  securityGroupIds: string[];
  endpointPublicAccess: boolean;
  endpointPrivateAccess: boolean;
  nodeGroups: EKSNodeGroup[];
  tags: Tag[];
}
```

### 3.4 DatabaseServicesStep

**File**: `webapp/src/components/visualDesigner/wizard/steps/platform/DatabaseServicesStep.tsx`

**Responsibilities**:
- Configure RDS instances
- Select database engine and version
- Configure storage and backup
- Enable Multi-AZ and encryption
- Create DB subnet groups from Network Layer subnets
- Assign security groups

**Key UI Components**:
- DatabaseCard: RDS instance summary
- EngineSelector: Database engine picker with versions
- InstanceClassPicker: RDS instance class selector
- StorageConfiguration: Storage type, size, autoscaling
- BackupConfiguration: Retention, window settings
- SubnetGroupEditor: Multi-select subnets for DB subnet group

**Data Structure**:
```typescript
interface DatabaseConfig {
  rdsInstances: RDSInstance[];
  subnetGroups: DBSubnetGroup[];
  parameterGroups: DBParameterGroup[];
}

interface RDSInstance {
  id: string;
  identifier: string;
  engine: DatabaseEngine;
  engineVersion: string;
  instanceClass: string;
  allocatedStorage: number;
  storageType: StorageType;
  multiAZ: boolean;
  encrypted: boolean;
  kmsKeyId?: string;
  subnetGroupName: string;
  securityGroupIds: string[];
  backupRetentionPeriod: number;
  tags: Tag[];
}
```

### 3.5 StorageServicesStep

**File**: `webapp/src/components/visualDesigner/wizard/steps/platform/StorageServicesStep.tsx`

**Responsibilities**:
- Configure S3 buckets
- Configure EBS volumes
- Configure EFS file systems
- Configure encryption and versioning
- Configure lifecycle policies

**Key UI Components**:
- StorageResourceTabs: S3 | EBS | EFS
- S3BucketCard: Bucket configuration
- EBSVolumeCard: Volume configuration
- EFSFileSystemCard: EFS configuration with mount targets
- EncryptionToggle: Enable/disable with KMS key selection
- LifecycleRuleEditor: Configure S3 lifecycle rules

**Data Structure**:
```typescript
interface StorageConfig {
  s3Buckets: S3Bucket[];
  ebsVolumes: EBSVolume[];
  efsFileSystems: EFSFileSystem[];
}

interface S3Bucket {
  id: string;
  name: string;
  versioningEnabled: boolean;
  encryptionType: 'SSE-S3' | 'SSE-KMS' | 'SSE-C';
  kmsKeyId?: string;
  publicAccessBlock: PublicAccessBlock;
  lifecycleRules: LifecycleRule[];
  tags: Tag[];
}
```

### 3.6 PlatformValidationStep

**File**: `webapp/src/components/visualDesigner/wizard/steps/platform/PlatformValidationStep.tsx`

**Responsibilities**:
- Run comprehensive validation
- Display validation results by category
- Show cost estimation
- Provide navigation to fix issues
- Generate final approval status

**Key UI Components**:
- ValidationSummaryCard: Pass/Fail counts by severity
- ValidationCategoryAccordion: Expandable sections (IAM, Compute, DB, Storage)
- ValidationFinding: Individual finding with fix button
- CostEstimationCard: Breakdown by service with total
- SecurityScoreCard: Security posture summary

---

## 4. Type Definitions

### 4.1 Platform Types File

**File**: `webapp/src/types/platform.ts`

```typescript
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
  roleArn?: string;
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
  region?: string;
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
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  costEstimate: CostEstimate;
  securityScore: SecurityScore;
}

export interface ValidationError {
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
  overall: number;  // 0-100
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
// Shared Types
// =============================================

export interface Tag {
  key: string;
  value: string;
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

// AWS Managed Policies (commonly used)
export const COMMON_MANAGED_POLICIES = [
  { arn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy', name: 'AmazonEKSClusterPolicy' },
  { arn: 'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy', name: 'AmazonEKSWorkerNodePolicy' },
  { arn: 'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy', name: 'AmazonEKS_CNI_Policy' },
  { arn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly', name: 'AmazonEC2ContainerRegistryReadOnly' },
  { arn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess', name: 'AmazonS3ReadOnlyAccess' },
  { arn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess', name: 'AmazonS3FullAccess' },
  { arn: 'arn:aws:iam::aws:policy/AmazonRDSFullAccess', name: 'AmazonRDSFullAccess' },
  { arn: 'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy', name: 'CloudWatchAgentServerPolicy' },
];

// Instance Types by Category
export const EC2_INSTANCE_TYPES = {
  'General Purpose': [
    { type: 't3.micro', vcpu: 2, memory: 1, price: 0.0104 },
    { type: 't3.small', vcpu: 2, memory: 2, price: 0.0208 },
    { type: 't3.medium', vcpu: 2, memory: 4, price: 0.0416 },
    { type: 't3.large', vcpu: 2, memory: 8, price: 0.0832 },
    { type: 'm5.large', vcpu: 2, memory: 8, price: 0.096 },
    { type: 'm5.xlarge', vcpu: 4, memory: 16, price: 0.192 },
    { type: 'm5.2xlarge', vcpu: 8, memory: 32, price: 0.384 },
  ],
  'Compute Optimized': [
    { type: 'c5.large', vcpu: 2, memory: 4, price: 0.085 },
    { type: 'c5.xlarge', vcpu: 4, memory: 8, price: 0.17 },
    { type: 'c5.2xlarge', vcpu: 8, memory: 16, price: 0.34 },
  ],
  'Memory Optimized': [
    { type: 'r5.large', vcpu: 2, memory: 16, price: 0.126 },
    { type: 'r5.xlarge', vcpu: 4, memory: 32, price: 0.252 },
    { type: 'r5.2xlarge', vcpu: 8, memory: 64, price: 0.504 },
  ],
};

// RDS Instance Classes
export const RDS_INSTANCE_CLASSES = {
  'Burstable': [
    { class: 'db.t3.micro', vcpu: 2, memory: 1, price: 0.017 },
    { class: 'db.t3.small', vcpu: 2, memory: 2, price: 0.034 },
    { class: 'db.t3.medium', vcpu: 2, memory: 4, price: 0.068 },
  ],
  'Standard': [
    { class: 'db.m5.large', vcpu: 2, memory: 8, price: 0.171 },
    { class: 'db.m5.xlarge', vcpu: 4, memory: 16, price: 0.342 },
    { class: 'db.m5.2xlarge', vcpu: 8, memory: 32, price: 0.684 },
  ],
  'Memory Optimized': [
    { class: 'db.r5.large', vcpu: 2, memory: 16, price: 0.24 },
    { class: 'db.r5.xlarge', vcpu: 4, memory: 32, price: 0.48 },
    { class: 'db.r5.2xlarge', vcpu: 8, memory: 64, price: 0.96 },
  ],
};

// Database Engines and Versions
export const DATABASE_ENGINES = {
  postgres: {
    name: 'PostgreSQL',
    versions: ['16.1', '15.4', '14.9', '13.12', '12.16'],
    defaultPort: 5432,
  },
  mysql: {
    name: 'MySQL',
    versions: ['8.0.35', '8.0.34', '5.7.44'],
    defaultPort: 3306,
  },
  mariadb: {
    name: 'MariaDB',
    versions: ['10.11.6', '10.6.16', '10.5.23'],
    defaultPort: 3306,
  },
};

// Kubernetes Versions
export const EKS_VERSIONS = ['1.29', '1.28', '1.27', '1.26'];
```

---

## 5. Validation Hook Design

### 5.1 usePlatformValidation Hook

**File**: `webapp/src/components/visualDesigner/wizard/hooks/usePlatformValidation.ts`

**Responsibilities**:
- Validate IAM policies (JSON syntax, grammar, security)
- Validate compute resource placement
- Validate database configuration
- Validate storage security settings
- Calculate cost estimates
- Check security best practices

**Interface**:
```typescript
export interface UsePlatformValidationResult {
  // Full validation
  validate: (config: PlatformLayerData, networkData: NetworkLayerData) => PlatformValidationResult;

  // Component-level validation
  validateIAMConfig: (iam: IAMConfig) => ValidationError[];
  validateIAMPolicy: (policy: PolicyDocument | TrustPolicy) => ValidationError[];
  validateComputeConfig: (compute: ComputeConfig, networkData: NetworkLayerData) => ValidationError[];
  validateDatabaseConfig: (database: DatabaseConfig, networkData: NetworkLayerData) => ValidationError[];
  validateStorageConfig: (storage: StorageConfig) => ValidationError[];

  // Cost estimation
  estimateCosts: (config: PlatformLayerData) => CostEstimate;

  // Security assessment
  assessSecurity: (config: PlatformLayerData) => SecurityScore;

  // Error helpers
  getErrorsForCategory: (errors: ValidationError[], category: string) => ValidationError[];
  getErrorsForResource: (errors: ValidationError[], resourceId: string) => ValidationError[];
}
```

---

## 6. Integration Points

### 6.1 Network Layer Integration

The Platform Wizard reads from the completed Network Layer to:
- Get available subnets for compute/database placement
- Get available security groups for assignment
- Validate resources are placed in correct subnet types (public/private)

**Access Pattern**:
```typescript
// In PlatformArchitectWizard
const { layers } = useDesignWizard();
const networkData = layers.network.data?.config as NetworkLayerData;

// Pass to validation
const result = validate(platformData, networkData);
```

### 6.2 Context Integration

Updates platform layer data in DesignWizardContext:
```typescript
useEffect(() => {
  const platformData: PlatformLayerData = {
    iam,
    compute,
    database,
    storage,
    validationResult: validationResult || undefined,
  };

  updateLayerData('platform', {
    config: platformData,
    nodes: [],
    edges: [],
  });
}, [iam, compute, database, storage, validationResult, updateLayerData]);
```

### 6.3 Node Generation

On wizard completion, generate ReactFlow nodes for visual representation:
```typescript
const generatePlatformNodes = useCallback(() => {
  // IAM Roles
  iam.roles.forEach((role, i) => {
    addNode({
      id: `iam-role-${role.id}`,
      type: 'iamRoleNode',
      position: { x: 50, y: 50 + i * 100 },
      data: { name: role.name, policyCount: role.inlinePolicies.length + role.managedPolicies.length },
      layer: 'platform',
    });
  });

  // EKS Clusters
  compute.eksClusters.forEach((cluster, i) => {
    addNode({
      id: `eks-${cluster.id}`,
      type: 'eksClusterNode',
      position: { x: 300, y: 50 + i * 150 },
      data: { name: cluster.name, version: cluster.version, nodeGroups: cluster.nodeGroups.length },
      layer: 'platform',
    });
  });

  // RDS Instances
  database.rdsInstances.forEach((db, i) => {
    addNode({
      id: `rds-${db.id}`,
      type: 'rdsNode',
      position: { x: 550, y: 50 + i * 120 },
      data: { identifier: db.identifier, engine: db.engine, multiAZ: db.multiAZ },
      layer: 'platform',
    });
  });

  // S3 Buckets
  storage.s3Buckets.forEach((bucket, i) => {
    addNode({
      id: `s3-${bucket.id}`,
      type: 's3BucketNode',
      position: { x: 800, y: 50 + i * 80 },
      data: { name: bucket.name, encrypted: bucket.encryptionType !== 'NONE' },
      layer: 'platform',
    });
  });
}, [iam, compute, database, storage, addNode]);
```

---

## 7. Security Considerations

### 7.1 IAM Policy Validation

**Security Checks**:
1. **Overly Permissive Actions**: Warn on `"Action": "*"` or `"Action": "s3:*"`
2. **Overly Permissive Resources**: Warn on `"Resource": "*"`
3. **Missing Conditions**: Suggest conditions for sensitive actions
4. **Trust Policy Review**: Validate trusted principals are expected

### 7.2 Encryption Defaults

**All storage defaults to encrypted**:
- S3: SSE-S3 encryption enabled by default
- EBS: Encryption enabled by default
- EFS: Encryption at rest enabled by default
- RDS: Encryption enabled by default

### 7.3 Network Isolation

**Validation ensures**:
- EC2 instances in private subnets (warning if public)
- RDS instances never publicly accessible by default
- EKS control plane with private endpoint enabled

---

## 8. Cost Estimation Logic

### 8.1 Compute Costs

```typescript
function estimateComputeCosts(compute: ComputeConfig): number {
  let total = 0;

  // EC2 Instances (hourly * 730 hours/month)
  compute.ec2Instances.forEach(instance => {
    const pricePerHour = getEC2Price(instance.instanceType);
    total += pricePerHour * 730;
  });

  // EKS Clusters ($0.10/hour)
  total += compute.eksClusters.length * 0.10 * 730;

  // EKS Node Groups
  compute.eksClusters.forEach(cluster => {
    cluster.nodeGroups.forEach(ng => {
      const pricePerHour = getEC2Price(ng.instanceTypes[0]);
      total += pricePerHour * ng.scalingConfig.desiredSize * 730;
    });
  });

  return total;
}
```

### 8.2 Database Costs

```typescript
function estimateDatabaseCosts(database: DatabaseConfig): number {
  let total = 0;

  database.rdsInstances.forEach(db => {
    // Instance cost
    const instancePrice = getRDSPrice(db.instanceClass, db.engine);
    let instanceCost = instancePrice * 730;

    // Multi-AZ doubles the cost
    if (db.multiAZ) {
      instanceCost *= 2;
    }

    // Storage cost ($0.115/GB-month for gp2)
    const storageCost = db.allocatedStorage * 0.115;

    total += instanceCost + storageCost;
  });

  return total;
}
```

### 8.3 Storage Costs

```typescript
function estimateStorageCosts(storage: StorageConfig): number {
  let total = 0;

  // S3 (estimated at $0.023/GB-month for standard)
  // Note: Actual cost depends on usage, this is estimate only

  // EBS Volumes
  storage.ebsVolumes.forEach(vol => {
    const pricePerGB = getEBSPrice(vol.volumeType);
    total += vol.size * pricePerGB;
  });

  // EFS (estimated at $0.30/GB-month)
  // Note: Actual cost depends on usage

  return total;
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Component | Test Focus |
|-----------|------------|
| IAMRolesPoliciesStep | Policy JSON validation, role CRUD |
| ComputeServicesStep | Instance type selection, subnet validation |
| DatabaseServicesStep | Engine selection, backup validation |
| StorageServicesStep | Encryption defaults, bucket naming |
| PlatformValidationStep | Validation result display, navigation |
| usePlatformValidation | All validation rules, cost calculation |

### 9.2 Integration Tests

| Test Scenario | Description |
|---------------|-------------|
| Complete Wizard Flow | Walk through all 5 steps with valid data |
| Network Integration | Verify subnet/SG selection from Network Layer |
| Validation Failures | Verify error display and navigation |
| Cost Calculation | Verify cost estimates match expected |

### 9.3 Coverage Target

- **Target**: >85% code coverage
- **Critical Paths**: 100% coverage for validation logic

---

## 10. File Deliverables

| File | Purpose |
|------|---------|
| `webapp/src/types/platform.ts` | TypeScript type definitions |
| `webapp/src/components/visualDesigner/wizard/roles/PlatformArchitectWizard.tsx` | Wizard orchestrator |
| `webapp/src/components/visualDesigner/wizard/steps/platform/IAMRolesPoliciesStep.tsx` | IAM configuration step |
| `webapp/src/components/visualDesigner/wizard/steps/platform/ComputeServicesStep.tsx` | Compute configuration step |
| `webapp/src/components/visualDesigner/wizard/steps/platform/DatabaseServicesStep.tsx` | Database configuration step |
| `webapp/src/components/visualDesigner/wizard/steps/platform/StorageServicesStep.tsx` | Storage configuration step |
| `webapp/src/components/visualDesigner/wizard/steps/platform/PlatformValidationStep.tsx` | Validation step |
| `webapp/src/components/visualDesigner/wizard/steps/platform/index.ts` | Step exports |
| `webapp/src/components/visualDesigner/wizard/hooks/usePlatformValidation.ts` | Validation hook |
| `webapp/src/components/visualDesigner/wizard/utils/platformValidation.ts` | Validation utilities |
| `webapp/src/components/visualDesigner/wizard/utils/costEstimation.ts` | Cost calculation utilities |

---

## 11. ADRs Created

- ADR-022: Platform Wizard Component Architecture
- ADR-023: IAM Policy Validation Strategy
- ADR-024: Platform Cost Estimation Approach

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Architect (Jets) | Initial architecture document |
