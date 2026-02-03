/**
 * Storage Node Data Types
 * Types for S3 Bucket, DynamoDB Table, ElastiCache Cluster, and EFS nodes
 */

import { BaseNodeData } from './base.types';

/**
 * S3 ACL Types
 */
export type S3ACL = 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';

/**
 * S3 Lifecycle Rule
 */
export interface S3LifecycleRule {
  id: string;
  enabled: boolean;
  prefix?: string;
  transitions: {
    days: number;
    storageClass: 'GLACIER' | 'GLACIER_IR' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA' | 'DEEP_ARCHIVE';
  }[];
  expiration?: {
    days?: number;
    expiredObjectDeleteMarker?: boolean;
  };
  noncurrentVersionTransitions?: {
    days: number;
    storageClass: string;
  }[];
  noncurrentVersionExpiration?: {
    days: number;
  };
}

/**
 * S3 CORS Rule
 */
export interface CORSRule {
  allowedHeaders: string[];
  allowedMethods: ('GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD')[];
  allowedOrigins: string[];
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

/**
 * S3 Bucket Node Data
 */
export interface S3BucketNodeData extends BaseNodeData {
  serviceType: 's3-bucket';
  category: 'storage';
  bucketName: string;
  acl: S3ACL;
  versioning: boolean;
  encryption: {
    enabled: boolean;
    algorithm: 'AES256' | 'aws:kms';
    kmsKeyId?: string;
  };
  lifecycleRules: S3LifecycleRule[];
  corsRules?: CORSRule[];
  websiteConfiguration?: {
    indexDocument: string;
    errorDocument?: string;
  };
  blockPublicAccess: {
    blockPublicAcls: boolean;
    ignorePublicAcls: boolean;
    blockPublicPolicy: boolean;
    restrictPublicBuckets: boolean;
  };
  loggingConfiguration?: {
    targetBucket: string;
    targetPrefix: string;
  };
  replicationConfiguration?: {
    role: string;
    rules: {
      id: string;
      status: 'Enabled' | 'Disabled';
      destination: {
        bucket: string;
        storageClass?: string;
      };
    }[];
  };
}

/**
 * DynamoDB Attribute Type
 */
export type DynamoDBAttributeType = 'S' | 'N' | 'B';

/**
 * DynamoDB Key Schema
 */
export interface DynamoDBKeySchema {
  name: string;
  type: DynamoDBAttributeType;
}

/**
 * DynamoDB Global Secondary Index
 */
export interface DynamoDBGSI {
  indexName: string;
  keySchema: {
    hashKey: DynamoDBKeySchema;
    rangeKey?: DynamoDBKeySchema;
  };
  projection: {
    type: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    nonKeyAttributes?: string[];
  };
  readCapacity?: number;
  writeCapacity?: number;
}

/**
 * DynamoDB Local Secondary Index
 */
export interface DynamoDBLSI {
  indexName: string;
  rangeKey: DynamoDBKeySchema;
  projection: {
    type: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    nonKeyAttributes?: string[];
  };
}

/**
 * DynamoDB Node Data
 */
export interface DynamoDBNodeData extends BaseNodeData {
  serviceType: 'dynamodb-table';
  category: 'storage';
  tableName: string;
  billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  readCapacity?: number;
  writeCapacity?: number;
  hashKey: DynamoDBKeySchema;
  rangeKey?: DynamoDBKeySchema;
  globalSecondaryIndexes: DynamoDBGSI[];
  localSecondaryIndexes: DynamoDBLSI[];
  encryption: {
    enabled: boolean;
    kmsKeyArn?: string;
  };
  pointInTimeRecovery: boolean;
  ttl?: {
    enabled: boolean;
    attributeName: string;
  };
  streamEnabled: boolean;
  streamViewType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
  tableClass: 'STANDARD' | 'STANDARD_INFREQUENT_ACCESS';
}

/**
 * ElastiCache Engine Types
 */
export type ElastiCacheEngine = 'redis' | 'memcached';

/**
 * ElastiCache Node Data
 */
export interface ElastiCacheNodeData extends BaseNodeData {
  serviceType: 'elasticache-cluster';
  category: 'storage';
  clusterId: string;
  engine: ElastiCacheEngine;
  engineVersion: string;
  nodeType: string;
  numCacheNodes: number;
  parameterGroupName?: string;
  subnetGroupName: string;
  securityGroupIds: string[];
  port: number;
  azMode?: 'single-az' | 'cross-az';
  preferredAvailabilityZones?: string[];
  snapshotRetentionLimit?: number;
  snapshotWindow?: string;
  maintenanceWindow?: string;
  autoMinorVersionUpgrade: boolean;
  transitEncryptionEnabled: boolean;
  atRestEncryptionEnabled: boolean;
  kmsKeyId?: string;
  // Redis-specific
  replicationGroupId?: string;
  numNodeGroups?: number;
  replicasPerNodeGroup?: number;
  automaticFailoverEnabled?: boolean;
  multiAZEnabled?: boolean;
  authToken?: string;
}

/**
 * EFS Performance Mode
 */
export type EFSPerformanceMode = 'generalPurpose' | 'maxIO';

/**
 * EFS Throughput Mode
 */
export type EFSThroughputMode = 'bursting' | 'provisioned' | 'elastic';

/**
 * EFS Mount Target
 */
export interface EFSMountTarget {
  id: string;
  subnetId: string;
  securityGroups: string[];
  ipAddress?: string;
}

/**
 * EFS Lifecycle Policy
 */
export interface EFSLifecyclePolicy {
  transitionToIA?: 'AFTER_7_DAYS' | 'AFTER_14_DAYS' | 'AFTER_30_DAYS' | 'AFTER_60_DAYS' | 'AFTER_90_DAYS';
  transitionToPrimaryStorageClass?: 'AFTER_1_ACCESS';
}

/**
 * EFS Node Data
 */
export interface EFSNodeData extends BaseNodeData {
  serviceType: 'efs-filesystem';
  category: 'storage';
  fileSystemId?: string;
  performanceMode: EFSPerformanceMode;
  throughputMode: EFSThroughputMode;
  provisionedThroughputInMibps?: number;
  encrypted: boolean;
  kmsKeyId?: string;
  lifecyclePolicies: EFSLifecyclePolicy[];
  mountTargets: EFSMountTarget[];
  accessPoints: EFSAccessPoint[];
  backupPolicy: 'ENABLED' | 'DISABLED';
}

/**
 * EFS Access Point
 */
export interface EFSAccessPoint {
  id: string;
  name?: string;
  rootDirectory: {
    path: string;
    creationInfo?: {
      ownerUid: number;
      ownerGid: number;
      permissions: string;
    };
  };
  posixUser?: {
    uid: number;
    gid: number;
    secondaryGids?: number[];
  };
}

/**
 * Default S3 Bucket data
 */
export const DEFAULT_S3_BUCKET_DATA: Partial<S3BucketNodeData> = {
  serviceType: 's3-bucket',
  category: 'storage',
  bucketName: '',
  acl: 'private',
  versioning: true,
  encryption: {
    enabled: true,
    algorithm: 'AES256',
  },
  lifecycleRules: [],
  blockPublicAccess: {
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: true,
    restrictPublicBuckets: true,
  },
  status: 'unconfigured',
  tags: {},
};

/**
 * Default DynamoDB data
 */
export const DEFAULT_DYNAMODB_DATA: Partial<DynamoDBNodeData> = {
  serviceType: 'dynamodb-table',
  category: 'storage',
  tableName: '',
  billingMode: 'PAY_PER_REQUEST',
  hashKey: {
    name: 'id',
    type: 'S',
  },
  globalSecondaryIndexes: [],
  localSecondaryIndexes: [],
  encryption: {
    enabled: true,
  },
  pointInTimeRecovery: true,
  streamEnabled: false,
  tableClass: 'STANDARD',
  status: 'unconfigured',
  tags: {},
};

/**
 * Default ElastiCache data
 */
export const DEFAULT_ELASTICACHE_DATA: Partial<ElastiCacheNodeData> = {
  serviceType: 'elasticache-cluster',
  category: 'storage',
  clusterId: '',
  engine: 'redis',
  engineVersion: '7.0',
  nodeType: 'cache.t3.micro',
  numCacheNodes: 1,
  subnetGroupName: '',
  securityGroupIds: [],
  port: 6379,
  autoMinorVersionUpgrade: true,
  transitEncryptionEnabled: true,
  atRestEncryptionEnabled: true,
  status: 'unconfigured',
  tags: {},
};

/**
 * Default EFS data
 */
export const DEFAULT_EFS_DATA: Partial<EFSNodeData> = {
  serviceType: 'efs-filesystem',
  category: 'storage',
  performanceMode: 'generalPurpose',
  throughputMode: 'elastic',
  encrypted: true,
  lifecyclePolicies: [
    { transitionToIA: 'AFTER_30_DAYS' },
  ],
  mountTargets: [],
  accessPoints: [],
  backupPolicy: 'ENABLED',
  status: 'unconfigured',
  tags: {},
};
