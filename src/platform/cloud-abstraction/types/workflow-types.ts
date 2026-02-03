/**
 * Workflow DSL Types
 * Type definitions for the platform workflow language
 */

import {
  CloudProvider,
  VirtualNetworkConfig,
  KubernetesClusterConfig,
  ManagedDatabaseConfig,
  ObjectStorageConfig,
  ContainerDeploymentConfig
} from './cloud-types.js';

export interface WorkflowDefinition {
  workflow: WorkflowMetadata;
}

export interface WorkflowMetadata {
  name: string;
  target_cloud: CloudProvider;
  region: string;
  resources: ResourceDefinition[];
}

export interface ResourceDefinition {
  type: 'virtual_network' | 'kubernetes_cluster' | 'managed_database' | 'object_storage' | 'container_deployment';
  name: string;
  config?: VirtualNetworkConfig | KubernetesClusterConfig | ManagedDatabaseConfig | ObjectStorageConfig | ContainerDeploymentConfig;
  cidr?: string;
  version?: string;
  instance_type?: string;
  node_count?: number;
  network?: string;
  cluster?: string;
  image?: string;
  replicas?: number;
  port?: number;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface WorkflowExecutionResult {
  workflow_name: string;
  status: 'success' | 'partial' | 'failed';
  resources_created: Array<{
    type: string;
    name: string;
    id: string;
    status: string;
  }>;
  resources_failed: Array<{
    type: string;
    name: string;
    error: string;
  }>;
  execution_time_seconds: number;
  started_at: string;
  completed_at: string;
}
