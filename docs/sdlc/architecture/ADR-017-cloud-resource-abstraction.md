# ADR-017: Cloud Resource Abstraction

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Infrastructure

---

## Context

The Deltek Catalyst platform manages cloud resources across multiple providers:

- **Current**: AWS, OCI
- **Planned**: Azure, GCP

Resources to manage:
- Virtual networks (VPC/VCN)
- Kubernetes clusters (EKS/OKE/AKS/GKE)
- Databases (RDS/Autonomous DB/Cloud SQL)
- Object storage (S3/Object Storage/Blob/GCS)
- Load balancers
- DNS records

Requirements:
- Unified API for multi-cloud operations
- Provider-specific optimizations where needed
- Cost comparison across providers
- Consistent resource lifecycle management
- Audit trail for all operations

## Decision

**We will implement a Cloud Abstraction Layer** using the Strategy pattern with Terraform as the execution engine.

### 1. Architecture Pattern: Strategy + Adapter

```
+------------------------------------------------------------------+
|                    CLOUD ABSTRACTION ARCHITECTURE                 |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    Unified Cloud API                        |  |
|  |  POST /infrastructure/clusters                              |  |
|  |  { "provider": "aws", "type": "kubernetes", ... }          |  |
|  +------------------------------------------------------------+  |
|                              |                                    |
|                              v                                    |
|  +------------------------------------------------------------+  |
|  |                Cloud Resource Service                       |  |
|  |  - Validate request                                         |  |
|  |  - Select provider adapter                                  |  |
|  |  - Execute operation                                        |  |
|  |  - Track state                                              |  |
|  +------------------------------------------------------------+  |
|         |              |              |              |            |
|         v              v              v              v            |
|  +-----------+  +-----------+  +-----------+  +-----------+      |
|  |    AWS    |  |    OCI    |  |   Azure   |  |    GCP    |      |
|  |  Adapter  |  |  Adapter  |  |  Adapter  |  |  Adapter  |      |
|  +-----------+  +-----------+  +-----------+  +-----------+      |
|         |              |              |              |            |
|         v              v              v              v            |
|  +------------------------------------------------------------+  |
|  |                  Terraform Executor                         |  |
|  |  - Generate HCL from templates                              |  |
|  |  - Plan and apply                                           |  |
|  |  - State management                                         |  |
|  +------------------------------------------------------------+  |
|         |              |              |              |            |
|         v              v              v              v            |
|  +-----------+  +-----------+  +-----------+  +-----------+      |
|  | AWS APIs  |  | OCI APIs  |  |Azure APIs |  | GCP APIs  |      |
|  +-----------+  +-----------+  +-----------+  +-----------+      |
|                                                                   |
+------------------------------------------------------------------+
```

### 2. Unified Resource Model

**Chosen**: Generic resource model with provider-specific extensions

```typescript
interface CloudResource {
  id: string;
  tenantId: string;
  name: string;
  type: ResourceType;
  provider: CloudProvider;
  region: string;
  status: ResourceStatus;
  configuration: ResourceConfiguration;
  providerSpecific?: ProviderSpecificConfig;
  metadata: ResourceMetadata;
  createdAt: Date;
  updatedAt: Date;
}

type ResourceType =
  | 'network'      // VPC/VCN
  | 'cluster'      // Kubernetes
  | 'database'     // Managed DB
  | 'storage'      // Object storage
  | 'loadbalancer' // Load balancer
  | 'dns';         // DNS records

type CloudProvider = 'aws' | 'oci' | 'azure' | 'gcp';

interface ResourceConfiguration {
  // Common fields
  size: 'small' | 'medium' | 'large' | 'xlarge';

  // Type-specific configs
  network?: NetworkConfig;
  cluster?: ClusterConfig;
  database?: DatabaseConfig;
  storage?: StorageConfig;
}

interface ClusterConfig {
  version: string;
  nodeCount: number;
  nodeSize: string;
  autoScaling: {
    enabled: boolean;
    minNodes: number;
    maxNodes: number;
  };
  addons: string[];
}
```

### 3. Provider Adapter Interface

**Chosen**: Interface-based adapters with common operations

```typescript
interface CloudProviderAdapter {
  provider: CloudProvider;

  // Network operations
  createNetwork(config: NetworkConfig): Promise<CloudResource>;
  deleteNetwork(resourceId: string): Promise<void>;
  getNetwork(resourceId: string): Promise<CloudResource>;

  // Cluster operations
  createCluster(config: ClusterConfig): Promise<CloudResource>;
  deleteCluster(resourceId: string): Promise<void>;
  scaleCluster(resourceId: string, nodeCount: number): Promise<CloudResource>;
  upgradeCluster(resourceId: string, version: string): Promise<CloudResource>;

  // Database operations
  createDatabase(config: DatabaseConfig): Promise<CloudResource>;
  deleteDatabase(resourceId: string): Promise<void>;

  // Storage operations
  createStorage(config: StorageConfig): Promise<CloudResource>;
  deleteStorage(resourceId: string): Promise<void>;

  // Cost estimation
  estimateCost(config: ResourceConfiguration): Promise<CostEstimate>;

  // Health check
  checkHealth(resourceId: string): Promise<HealthStatus>;
}
```

### 4. Execution Strategy: Terraform

**Chosen**: Terraform for IaC execution with state isolation

```
Terraform Workspace Structure:
  terraform/
  ├── modules/
  │   ├── aws/
  │   │   ├── vpc/
  │   │   ├── eks/
  │   │   ├── rds/
  │   │   └── s3/
  │   ├── oci/
  │   │   ├── vcn/
  │   │   ├── oke/
  │   │   ├── autonomous-db/
  │   │   └── object-storage/
  │   ├── azure/
  │   │   └── ...
  │   └── gcp/
  │       └── ...
  └── workspaces/
      └── {tenant_id}/
          └── {resource_id}/
              ├── main.tf
              ├── variables.tf
              ├── terraform.tfvars
              └── terraform.tfstate (S3 backend)
```

## Alternatives Considered

### Execution Engine

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Terraform** | Multi-cloud, mature, state mgmt | HCL complexity | **Selected** |
| Pulumi | Real programming languages | Less mature | Future consideration |
| Direct SDK | Maximum flexibility | Per-provider code | Rejected |
| Crossplane | Kubernetes-native | Learning curve | Future consideration |
| CloudFormation | Native AWS | AWS-only | Rejected |

### Abstraction Level

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Thin abstraction** | Provider-specific features | More complex API | **Selected** |
| Thick abstraction | Simple API | Lowest common denominator | Rejected |
| No abstraction | Full flexibility | Inconsistent experience | Rejected |

## Consequences

### Positive

1. **Multi-cloud**: Single API for all providers
2. **Consistency**: Same workflow across providers
3. **Auditability**: All operations tracked via Terraform
4. **Cost Comparison**: Easy to compare provider costs
5. **Extensibility**: Add new providers via adapters

### Negative

1. **Complexity**: Additional layer of abstraction
2. **Feature Lag**: New provider features need adapter updates
3. **Terraform Dependency**: Tied to Terraform lifecycle

### Mitigations

1. **Provider-Specific Passthrough**: Allow raw provider configs
2. **Modular Updates**: Update provider modules independently
3. **Alternative Executors**: Design for executor swapping

## Implementation Details

### Cloud Resource Service

```typescript
// src/domain/services/CloudResourceService.ts
export class CloudResourceService {
  constructor(
    private adapterFactory: CloudAdapterFactory,
    private terraformExecutor: TerraformExecutor,
    private resourceRepository: IResourceRepository,
    private eventBus: EventBus
  ) {}

  async createResource(
    tenantId: string,
    request: CreateResourceRequest
  ): Promise<CloudResource> {
    // 1. Validate request
    await this.validateRequest(request);

    // 2. Check quota
    await this.checkQuota(tenantId, request.type);

    // 3. Get provider adapter
    const adapter = this.adapterFactory.getAdapter(request.provider);

    // 4. Estimate cost
    const costEstimate = await adapter.estimateCost(request.configuration);

    // 5. Create resource record (pending)
    const resource = await this.resourceRepository.create({
      tenantId,
      name: request.name,
      type: request.type,
      provider: request.provider,
      region: request.region,
      status: 'provisioning',
      configuration: request.configuration,
      costEstimate,
    });

    // 6. Execute provisioning (async)
    this.executeProvisioning(resource, adapter);

    // 7. Publish event
    await this.eventBus.publish(new ResourceCreationStartedEvent(resource));

    return resource;
  }

  private async executeProvisioning(
    resource: CloudResource,
    adapter: CloudProviderAdapter
  ): Promise<void> {
    try {
      // Generate Terraform configuration
      const tfConfig = await adapter.generateTerraformConfig(resource);

      // Execute Terraform
      const result = await this.terraformExecutor.apply({
        workspaceId: `${resource.tenantId}/${resource.id}`,
        configuration: tfConfig,
        variables: this.extractVariables(resource),
      });

      // Update resource with provider details
      await this.resourceRepository.update(resource.id, {
        status: 'active',
        externalId: result.outputs.resource_id,
        providerSpecific: result.outputs,
      });

      await this.eventBus.publish(new ResourceCreatedEvent(resource));
    } catch (error) {
      await this.resourceRepository.update(resource.id, {
        status: 'failed',
        error: error.message,
      });

      await this.eventBus.publish(new ResourceCreationFailedEvent(resource, error));
    }
  }

  async deleteResource(tenantId: string, resourceId: string): Promise<void> {
    const resource = await this.resourceRepository.findById(resourceId);

    if (!resource || resource.tenantId !== tenantId) {
      throw new NotFoundError('Resource not found');
    }

    // Update status
    await this.resourceRepository.update(resourceId, { status: 'deleting' });

    // Execute Terraform destroy
    await this.terraformExecutor.destroy({
      workspaceId: `${tenantId}/${resourceId}`,
    });

    // Soft delete resource
    await this.resourceRepository.softDelete(resourceId);

    await this.eventBus.publish(new ResourceDeletedEvent(resource));
  }
}
```

### AWS Adapter Example

```typescript
// src/infrastructure/cloud/aws/AWSAdapter.ts
export class AWSAdapter implements CloudProviderAdapter {
  provider: CloudProvider = 'aws';

  constructor(
    private eksClient: EKSClient,
    private rdsClient: RDSClient,
    private ec2Client: EC2Client,
    private pricingClient: PricingClient
  ) {}

  async createCluster(config: ClusterConfig): Promise<TerraformConfig> {
    return {
      module: 'aws/eks',
      variables: {
        cluster_name: config.name,
        kubernetes_version: config.version,
        node_groups: [{
          name: 'default',
          instance_types: [this.mapNodeSize(config.nodeSize)],
          desired_size: config.nodeCount,
          min_size: config.autoScaling.minNodes,
          max_size: config.autoScaling.maxNodes,
        }],
        addons: config.addons.map(addon => ({
          name: addon,
          version: 'latest',
        })),
      },
    };
  }

  async estimateCost(config: ResourceConfiguration): Promise<CostEstimate> {
    // Query AWS Pricing API
    const pricing = await this.pricingClient.send(
      new GetProductsCommand({
        ServiceCode: this.getServiceCode(config),
        Filters: this.getPricingFilters(config),
      })
    );

    return {
      provider: 'aws',
      monthly: this.calculateMonthlyCost(pricing, config),
      hourly: this.calculateHourlyCost(pricing, config),
      currency: 'USD',
      breakdown: this.getBreakdown(pricing, config),
    };
  }

  private mapNodeSize(size: string): string {
    const sizeMap: Record<string, string> = {
      small: 't3.medium',
      medium: 'm5.large',
      large: 'm5.xlarge',
      xlarge: 'm5.2xlarge',
    };
    return sizeMap[size] || 't3.medium';
  }
}
```

### Terraform Executor

```typescript
// src/infrastructure/terraform/TerraformExecutor.ts
export class TerraformExecutor {
  constructor(
    private stateBackend: TerraformStateBackend,
    private logger: Logger
  ) {}

  async apply(params: TerraformApplyParams): Promise<TerraformResult> {
    const workDir = await this.prepareWorkspace(params);

    try {
      // Initialize
      await this.execute(workDir, ['init', '-backend-config', this.getBackendConfig(params.workspaceId)]);

      // Plan
      const planOutput = await this.execute(workDir, ['plan', '-out', 'plan.tfplan', '-json']);
      await this.validatePlan(planOutput);

      // Apply
      const applyOutput = await this.execute(workDir, ['apply', '-auto-approve', 'plan.tfplan', '-json']);

      // Get outputs
      const outputs = await this.execute(workDir, ['output', '-json']);

      return {
        success: true,
        outputs: JSON.parse(outputs),
        logs: applyOutput,
      };
    } catch (error) {
      this.logger.error('Terraform apply failed', { error, workspaceId: params.workspaceId });
      throw new TerraformError(error.message);
    } finally {
      await this.cleanupWorkspace(workDir);
    }
  }

  async destroy(params: TerraformDestroyParams): Promise<void> {
    const workDir = await this.prepareWorkspace(params);

    try {
      await this.execute(workDir, ['init', '-backend-config', this.getBackendConfig(params.workspaceId)]);
      await this.execute(workDir, ['destroy', '-auto-approve', '-json']);
    } catch (error) {
      this.logger.error('Terraform destroy failed', { error, workspaceId: params.workspaceId });
      throw new TerraformError(error.message);
    } finally {
      await this.cleanupWorkspace(workDir);
    }
  }

  private async execute(cwd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('terraform', args, { cwd });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data; });
      child.stderr.on('data', (data) => { stderr += data; });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr));
        }
      });
    });
  }
}
```

### Cost Comparison Endpoint

```typescript
// POST /api/v1/infrastructure/compare-costs
async compareCosts(request: CostComparisonRequest): Promise<CostComparison> {
  const providers: CloudProvider[] = ['aws', 'oci', 'azure', 'gcp'];
  const estimates: CostEstimate[] = [];

  for (const provider of providers) {
    const adapter = this.adapterFactory.getAdapter(provider);
    const estimate = await adapter.estimateCost(request.configuration);
    estimates.push(estimate);
  }

  return {
    configuration: request.configuration,
    estimates,
    recommendation: this.getRecommendation(estimates, request.preferences),
    comparedAt: new Date(),
  };
}
```

## References

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [OCI SDK](https://docs.oracle.com/en-us/iaas/tools/typescript/latest/)
- [Multi-Cloud Design Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/technology-choices/multicloud)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
