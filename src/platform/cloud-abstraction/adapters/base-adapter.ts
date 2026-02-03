/**
 * Base Cloud Adapter Interface
 * All cloud adapters must implement this interface
 */

import {
  CloudProvider,
  CloudCredentials,
  ResourceResult,
  ResourceStatus,
  VirtualNetworkConfig,
  KubernetesClusterConfig,
  ManagedDatabaseConfig,
  ObjectStorageConfig,
  ContainerDeploymentConfig
} from '../types/cloud-types.js';

export interface CloudAdapter {
  /**
   * Get adapter metadata
   */
  getProviderName(): CloudProvider;
  getSupportedRegions(): string[];

  /**
   * Initialize connection to cloud provider
   */
  connect(credentials: CloudCredentials): Promise<void>;

  /**
   * Network Operations
   */
  createVirtualNetwork(config: VirtualNetworkConfig): Promise<ResourceResult>;
  getVirtualNetworkStatus(resourceId: string): Promise<ResourceStatus>;
  deleteVirtualNetwork(resourceId: string): Promise<void>;

  /**
   * Kubernetes Operations
   */
  createKubernetesCluster(config: KubernetesClusterConfig): Promise<ResourceResult>;
  getKubernetesClusterStatus(resourceId: string): Promise<ResourceStatus>;
  deleteKubernetesCluster(resourceId: string): Promise<void>;

  /**
   * Database Operations
   */
  createManagedDatabase(config: ManagedDatabaseConfig): Promise<ResourceResult>;
  getManagedDatabaseStatus(resourceId: string): Promise<ResourceStatus>;
  deleteManagedDatabase(resourceId: string): Promise<void>;

  /**
   * Storage Operations
   */
  createObjectStorage(config: ObjectStorageConfig): Promise<ResourceResult>;
  getObjectStorageStatus(resourceId: string): Promise<ResourceStatus>;
  deleteObjectStorage(resourceId: string): Promise<void>;

  /**
   * Container Deployment Operations
   */
  deployContainer(config: ContainerDeploymentConfig): Promise<ResourceResult>;
  getContainerDeploymentStatus(resourceId: string): Promise<ResourceStatus>;
  deleteContainerDeployment(resourceId: string): Promise<void>;

  /**
   * Generic Resource Operations
   */
  getResourceStatus(resourceId: string): Promise<ResourceStatus>;
  destroyResource(resourceId: string): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

export abstract class BaseCloudAdapter implements CloudAdapter {
  protected connected: boolean = false;
  protected credentials: CloudCredentials | null = null;

  abstract getProviderName(): CloudProvider;
  abstract getSupportedRegions(): string[];
  abstract connect(credentials: CloudCredentials): Promise<void>;
  abstract createVirtualNetwork(config: VirtualNetworkConfig): Promise<ResourceResult>;
  abstract getVirtualNetworkStatus(resourceId: string): Promise<ResourceStatus>;
  abstract deleteVirtualNetwork(resourceId: string): Promise<void>;
  abstract createKubernetesCluster(config: KubernetesClusterConfig): Promise<ResourceResult>;
  abstract getKubernetesClusterStatus(resourceId: string): Promise<ResourceStatus>;
  abstract deleteKubernetesCluster(resourceId: string): Promise<void>;
  abstract createManagedDatabase(config: ManagedDatabaseConfig): Promise<ResourceResult>;
  abstract getManagedDatabaseStatus(resourceId: string): Promise<ResourceStatus>;
  abstract deleteManagedDatabase(resourceId: string): Promise<void>;
  abstract createObjectStorage(config: ObjectStorageConfig): Promise<ResourceResult>;
  abstract getObjectStorageStatus(resourceId: string): Promise<ResourceStatus>;
  abstract deleteObjectStorage(resourceId: string): Promise<void>;
  abstract deployContainer(config: ContainerDeploymentConfig): Promise<ResourceResult>;
  abstract getContainerDeploymentStatus(resourceId: string): Promise<ResourceStatus>;
  abstract deleteContainerDeployment(resourceId: string): Promise<void>;

  async getResourceStatus(_resourceId: string): Promise<ResourceStatus> {
    // Default implementation - can be overridden
    throw new Error('getResourceStatus not implemented for generic resources');
  }

  async destroyResource(_resourceId: string): Promise<void> {
    // Default implementation - can be overridden
    throw new Error('destroyResource not implemented for generic resources');
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Adapter not connected. Call connect() first.');
    }
  }

  protected generateResourceId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  protected generateTags(customTags?: Record<string, string>): Record<string, string> {
    return {
      'platform:managed_by': 'multicloud-devops-platform',
      'platform:version': '1.0.0',
      'platform:cloud_provider': this.getProviderName(),
      ...customTags
    };
  }
}
