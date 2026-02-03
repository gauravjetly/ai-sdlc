/**
 * Workflow Executor
 * Executes workflow definitions by orchestrating cloud adapter operations
 */

import { CloudAdapter } from '../adapters/base-adapter.js';
import { AdapterFactory } from '../adapters/adapter-factory.js';
import {
  WorkflowDefinition,
  WorkflowExecutionResult,
  ResourceDefinition
} from '../types/workflow-types.js';
import {
  CloudCredentials,
  ResourceResult,
  VirtualNetworkConfig,
  KubernetesClusterConfig,
  ManagedDatabaseConfig,
  ObjectStorageConfig,
  ContainerDeploymentConfig
} from '../types/cloud-types.js';

export class WorkflowExecutor {
  private adapter: CloudAdapter;
  private resourceResults: Map<string, ResourceResult> = new Map();

  constructor(private workflow: WorkflowDefinition, private credentials: CloudCredentials) {
    this.adapter = AdapterFactory.createAdapter(workflow.workflow.target_cloud);
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const started_at = new Date().toISOString();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting workflow: ${this.workflow.workflow.name}`);
    console.log(`Target cloud: ${this.workflow.workflow.target_cloud}`);
    console.log(`Region: ${this.workflow.workflow.region}`);
    console.log(`${'='.repeat(60)}\n`);

    const resources_created: Array<any> = [];
    const resources_failed: Array<any> = [];

    try {
      // Connect to cloud provider
      await this.adapter.connect(this.credentials);

      // Execute resources in order
      for (const resource of this.workflow.workflow.resources) {
        try {
          console.log(`\n[${resource.type}] Creating: ${resource.name}`);
          const result = await this.createResource(resource);

          this.resourceResults.set(resource.name, result);
          resources_created.push({
            type: resource.type,
            name: resource.name,
            id: result.id,
            status: result.status
          });

          console.log(`✓ [${resource.type}] Created: ${resource.name} (${result.id})`);
        } catch (error: any) {
          console.error(`✗ [${resource.type}] Failed: ${resource.name}`);
          console.error(`  Error: ${error.message}`);

          resources_failed.push({
            type: resource.type,
            name: resource.name,
            error: error.message
          });
        }
      }
    } catch (error: any) {
      console.error(`\nWorkflow execution failed: ${error.message}`);
      throw error;
    }

    const endTime = Date.now();
    const completed_at = new Date().toISOString();
    const execution_time_seconds = (endTime - startTime) / 1000;

    const status = resources_failed.length === 0
      ? 'success'
      : resources_created.length > 0
        ? 'partial'
        : 'failed';

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Workflow ${status.toUpperCase()}`);
    console.log(`Resources created: ${resources_created.length}`);
    console.log(`Resources failed: ${resources_failed.length}`);
    console.log(`Execution time: ${execution_time_seconds.toFixed(2)}s`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      workflow_name: this.workflow.workflow.name,
      status,
      resources_created,
      resources_failed,
      execution_time_seconds,
      started_at,
      completed_at
    };
  }

  /**
   * Create a resource based on its type
   */
  private async createResource(resource: ResourceDefinition): Promise<ResourceResult> {
    switch (resource.type) {
      case 'virtual_network':
        return await this.adapter.createVirtualNetwork({
          name: resource.name,
          cidr: resource.cidr!,
          region: this.workflow.workflow.region,
          enable_flow_logs: false,
          dns_enabled: true,
          tags: { name: resource.name }
        } as VirtualNetworkConfig);

      case 'kubernetes_cluster':
        return await this.adapter.createKubernetesCluster({
          name: resource.name,
          version: resource.version!,
          network: resource.network!,
          node_count: resource.node_count || 2,
          instance_type: (resource.instance_type as any) || 'small_compute',
          enable_autoscaling: false,
          enable_logging: true,
          enable_monitoring: true
        } as KubernetesClusterConfig);

      case 'container_deployment':
        return await this.adapter.deployContainer({
          name: resource.name,
          cluster: resource.cluster!,
          image: resource.image!,
          replicas: resource.replicas || 2,
          port: resource.port || 80
        } as ContainerDeploymentConfig);

      case 'managed_database':
        return await this.adapter.createManagedDatabase({
          name: resource.name,
          engine: (resource as any).engine || 'postgresql',
          version: resource.version || '14',
          instance_class: (resource as any).instance_class || 'small_db',
          storage_size_gb: (resource as any).storage_size_gb || 20,
          network: resource.network!
        } as ManagedDatabaseConfig);

      case 'object_storage':
        return await this.adapter.createObjectStorage({
          name: resource.name,
          versioning_enabled: false,
          encryption_enabled: true,
          public_access_blocked: true
        } as ObjectStorageConfig);

      default:
        throw new Error(`Unsupported resource type: ${resource.type}`);
    }
  }

  /**
   * Get resource results
   */
  getResourceResults(): Map<string, ResourceResult> {
    return this.resourceResults;
  }

  /**
   * Get adapter instance (for state access)
   */
  getAdapter(): CloudAdapter {
    return this.adapter;
  }
}
