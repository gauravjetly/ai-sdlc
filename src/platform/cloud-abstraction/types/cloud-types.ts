/**
 * Cloud Abstraction Types
 * Platform-agnostic type definitions for multi-cloud resources
 */

export type CloudProvider = 'aws' | 'oci' | 'azure' | 'gcp';

export type ResourceType =
  | 'virtual_network'
  | 'kubernetes_cluster'
  | 'compute'
  | 'managed_database'
  | 'object_storage'
  | 'container_deployment';

export type NormalizedInstanceType =
  | 'small_compute'
  | 'medium_compute'
  | 'large_compute'
  | 'xlarge_compute'
  | 'small_memory_optimized'
  | 'medium_memory_optimized'
  | 'gpu_compute';

export type DatabaseEngine = 'postgresql' | 'mysql' | 'oracle';

export type NormalizedDatabaseClass =
  | 'small_db'
  | 'medium_db'
  | 'large_db'
  | 'xlarge_db';

// Virtual Network Configuration
export interface VirtualNetworkConfig {
  name: string;
  cidr: string;
  region: string;
  enable_flow_logs?: boolean;
  dns_enabled?: boolean;
  tags?: Record<string, string>;
}

// Kubernetes Cluster Configuration
export interface KubernetesClusterConfig {
  name: string;
  version: string;
  network: string; // Reference to virtual network
  node_count: number;
  instance_type: NormalizedInstanceType;
  enable_autoscaling?: boolean;
  min_nodes?: number;
  max_nodes?: number;
  enable_logging?: boolean;
  enable_monitoring?: boolean;
}

// Managed Database Configuration
export interface ManagedDatabaseConfig {
  name: string;
  engine: DatabaseEngine;
  version: string;
  instance_class: NormalizedDatabaseClass;
  storage_size_gb: number;
  network: string;
  high_availability?: boolean;
  backup_retention_days?: number;
  encryption_enabled?: boolean;
}

// Object Storage Configuration
export interface ObjectStorageConfig {
  name: string;
  versioning_enabled?: boolean;
  encryption_enabled?: boolean;
  public_access_blocked?: boolean;
  lifecycle_policies?: LifecyclePolicy[];
}

export interface LifecyclePolicy {
  name: string;
  transition_days: number;
  target_storage_class: 'warm' | 'cold' | 'delete';
}

// Container Deployment Configuration
export interface ContainerDeploymentConfig {
  name: string;
  cluster: string; // Reference to kubernetes cluster
  image: string;
  replicas: number;
  port: number;
  environment_variables?: Record<string, string>;
  resource_limits?: ResourceLimits;
}

export interface ResourceLimits {
  cpu: string; // e.g., "500m", "1"
  memory: string; // e.g., "512Mi", "1Gi"
}

// Resource Result (returned after creation)
export interface ResourceResult {
  id: string;
  type: ResourceType;
  provider: CloudProvider;
  status: ResourceStatus;
  metadata: Record<string, any>;
  created_at: string;
}

export type ResourceStatus =
  | 'creating'
  | 'available'
  | 'updating'
  | 'deleting'
  | 'deleted'
  | 'failed';

// Cloud Credentials
export interface CloudCredentials {
  provider: CloudProvider;
  credentials: AwsCredentials | OciCredentials;
}

export interface AwsCredentials {
  region: string;
  access_key_id?: string;
  secret_access_key?: string;
  session_token?: string;
  profile?: string; // For AWS CLI profile
}

export interface OciCredentials {
  region: string;
  user_ocid: string;
  tenancy_ocid: string;
  fingerprint: string;
  private_key_path: string;
  compartment_id: string;
}

// Error types
export interface CloudError {
  code: string;
  message: string;
  provider: CloudProvider;
  details?: Record<string, any>;
}

// Standard tags for all resources
export interface StandardTags {
  'platform:managed_by': string;
  'platform:version': string;
  'platform:cloud_provider': CloudProvider;
  'app:name': string;
  'app:environment': 'dev' | 'test' | 'uat' | 'prod';
  'app:component': string;
  'cost:center': string;
  'cost:project': string;
  'owner:team': string;
  'owner:email': string;
}
