# Multi-Cloud Abstraction Layer - Architecture Design

## Document Info
- **Created**: 2026-01-29
- **Project**: Universal DevOps Platform (AWS + OCI Phase 1)
- **Status**: Draft

---

## 1. Design Principles

### Core Principles
1. **Write Once, Deploy Anywhere**: Same workflow definition works on all clouds
2. **Full Feature Parity**: AWS and OCI provide identical capabilities
3. **No Cross-Cloud Dependencies**: Each app lives entirely in one cloud
4. **Hybrid Observability**: Unified app metrics, cloud-native infra metrics
5. **Fail-Safe Abstraction**: If abstraction fails, allow cloud-specific overrides

---

## 2. Cloud Abstraction Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKFLOW DSL LAYER                          │
│  Provider-agnostic resource definitions (virtual_network, etc)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  RESOURCE ABSTRACTION LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Network    │  │   Compute    │  │   Storage    │          │
│  │  Abstraction │  │ Abstraction  │  │ Abstraction  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Database   │  │  Monitoring  │  │   Identity   │          │
│  │ Abstraction  │  │ Abstraction  │  │ Abstraction  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CAPABILITY NEGOTIATION                        │
│  - Check cloud-specific feature availability                    │
│  - Map normalized sizes to cloud-specific instances             │
│  - Validate configuration compatibility                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Cloud Selector │
                    └─────────────────┘
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
      ┌───────────────┐               ┌───────────────┐
      │  AWS Adapter  │               │  OCI Adapter  │
      └───────────────┘               └───────────────┘
              ↓                               ↓
      ┌───────────────┐               ┌───────────────┐
      │      AWS      │               │      OCI      │
      └───────────────┘               └───────────────┘
```

---

## 3. Resource Abstraction Mappings

### 3.1 Network Resources

| Universal Type | AWS Implementation | OCI Implementation |
|----------------|--------------------|--------------------|
| `virtual_network` | VPC | Virtual Cloud Network (VCN) |
| `subnet.public` | Subnet with Internet Gateway | Subnet with Internet Gateway |
| `subnet.private` | Subnet with NAT Gateway | Subnet with NAT Gateway |
| `subnet.isolated` | Subnet (no internet) | Subnet (no internet) |
| `network_gateway` | NAT Gateway | NAT Gateway |
| `load_balancer` | Application Load Balancer | Load Balancer |
| `network_flow_logs` | VPC Flow Logs | VCN Flow Logs |
| `network_endpoint` | VPC Endpoint | Service Gateway |

**Abstraction Interface**:
```typescript
interface VirtualNetwork {
  cidr: string;
  subnets: Subnet[];
  enable_flow_logs: boolean;
  dns_enabled: boolean;
  tags: Record<string, string>;
}

interface Subnet {
  type: 'public' | 'private' | 'isolated';
  cidr: string;
  availability_zone: string;
  route_to_internet?: boolean;
}
```

---

### 3.2 Compute Resources

| Universal Type | AWS Implementation | OCI Implementation |
|----------------|--------------------|--------------------|
| `kubernetes_cluster` | Amazon EKS | Oracle Container Engine for Kubernetes (OKE) |
| `container_service` | Amazon ECS | OCI Container Instances |
| `serverless_function` | AWS Lambda | Oracle Functions |
| `virtual_machine` | EC2 Instance | Compute Instance |
| `instance_type.small_compute` | t3.medium (2vCPU, 4GB) | VM.Standard.E4.Flex (2 OCPU, 8GB) |
| `instance_type.medium_compute` | m5.xlarge (4vCPU, 16GB) | VM.Standard2.4 (4 OCPU, 60GB) |
| `instance_type.large_compute` | m5.4xlarge (16vCPU, 64GB) | VM.Standard2.16 (16 OCPU, 240GB) |
| `instance_type.gpu_compute` | p3.2xlarge (V100 GPU) | VM.GPU3.1 (V100 GPU) |

**Abstraction Interface**:
```typescript
interface KubernetesCluster {
  name: string;
  version: string;
  node_pools: NodePool[];
  enable_autoscaling: boolean;
  enable_logging: boolean;
  enable_monitoring: boolean;
  network: NetworkConfig;
}

interface NodePool {
  name: string;
  instance_type: NormalizedInstanceType;  // "small_compute", "medium_compute", etc.
  min_nodes: number;
  max_nodes: number;
  disk_size_gb: number;
}

type NormalizedInstanceType =
  | "small_compute"
  | "medium_compute"
  | "large_compute"
  | "xlarge_compute"
  | "small_memory_optimized"
  | "medium_memory_optimized"
  | "gpu_compute";
```

---

### 3.3 Storage Resources

| Universal Type | AWS Implementation | OCI Implementation |
|----------------|--------------------|--------------------|
| `object_storage` | Amazon S3 | Object Storage |
| `file_storage` | Amazon EFS | File Storage Service |
| `block_storage` | EBS Volume | Block Volume |
| `storage_class.hot` | S3 Standard | Standard Tier |
| `storage_class.warm` | S3 Intelligent-Tiering | InfrequentAccess Tier |
| `storage_class.cold` | S3 Glacier | Archive Storage |

**Abstraction Interface**:
```typescript
interface ObjectStorageBucket {
  name: string;
  versioning_enabled: boolean;
  encryption_enabled: boolean;
  lifecycle_policies: LifecyclePolicy[];
  public_access_blocked: boolean;
  access_logging: boolean;
}

interface LifecyclePolicy {
  name: string;
  transition_days: number;
  target_storage_class: "warm" | "cold" | "delete";
}
```

---

### 3.4 Database Resources

| Universal Type | AWS Implementation | OCI Implementation |
|----------------|--------------------|--------------------|
| `managed_database.postgresql` | RDS PostgreSQL | Database PostgreSQL |
| `managed_database.mysql` | RDS MySQL / Aurora MySQL | Database MySQL |
| `managed_database.oracle` | RDS Oracle | Autonomous Database / Base Database |
| `nosql_database` | DynamoDB | NoSQL Database |
| `cache_database` | ElastiCache Redis | OCI Cache (Redis) |
| `instance_class.small_db` | db.t3.medium | VM.Standard2.1 |
| `instance_class.medium_db` | db.r5.large | VM.Standard2.2 |
| `instance_class.large_db` | db.r5.4xlarge | VM.Standard2.8 |

**Abstraction Interface**:
```typescript
interface ManagedDatabase {
  engine: "postgresql" | "mysql" | "oracle";
  version: string;
  instance_class: NormalizedDatabaseClass;
  storage_size_gb: number;
  high_availability: boolean;  // Maps to Multi-AZ (AWS) or Data Guard (OCI)
  backup_retention_days: number;
  encryption_enabled: boolean;
  performance_insights: boolean;
}

type NormalizedDatabaseClass =
  | "small_db"
  | "medium_db"
  | "large_db"
  | "xlarge_db";
```

---

### 3.5 Identity & Access Management

| Universal Type | AWS Implementation | OCI Implementation |
|----------------|--------------------|--------------------|
| `service_identity` | IAM Role | Dynamic Group |
| `user_identity` | IAM User | OCI User |
| `access_policy` | IAM Policy | OCI Policy |
| `federated_auth` | SAML 2.0 via IAM | SAML 2.0 via Identity Federation |
| `secret_storage` | AWS Secrets Manager | Vault |

**Abstraction Interface**:
```typescript
interface ServiceIdentity {
  name: string;
  description: string;
  policies: AccessPolicy[];
  trust_entity: "kubernetes_service_account" | "compute_instance" | "serverless_function";
}

interface AccessPolicy {
  name: string;
  effect: "allow" | "deny";
  actions: string[];  // Normalized actions like "storage:read", "compute:manage"
  resources: string[];
}
```

---

### 3.6 Monitoring & Observability

| Universal Type | AWS Implementation | OCI Implementation |
|----------------|--------------------|--------------------|
| `metrics_backend` | CloudWatch | Monitoring Service |
| `logging_backend` | CloudWatch Logs | Logging Service |
| `tracing_backend` | X-Ray | Application Performance Monitoring |
| `alerting` | CloudWatch Alarms + SNS | Alarms + Notifications |
| `unified_app_metrics` | Prometheus/Grafana | Prometheus/Grafana |

**Abstraction Interface**:
```typescript
interface MetricAlert {
  name: string;
  metric_name: string;
  namespace: string;
  comparison_operator: ">" | "<" | ">=" | "<=";
  threshold: number;
  evaluation_periods: number;
  notification_channels: NotificationChannel[];
}

interface NotificationChannel {
  type: "email" | "slack" | "pagerduty" | "webhook";
  destination: string;
}
```

---

## 4. Cloud Adapter Interface

### Standard Adapter Contract

Every cloud adapter MUST implement:

```typescript
interface CloudAdapter {
  // Metadata
  getProviderName(): string;
  getSupportedRegions(): Region[];

  // Network operations
  createVirtualNetwork(config: VirtualNetwork): Promise<NetworkResource>;
  deleteVirtualNetwork(id: string): Promise<void>;

  // Compute operations
  createKubernetesCluster(config: KubernetesCluster): Promise<ClusterResource>;
  scaleNodePool(clusterId: string, poolName: string, nodeCount: number): Promise<void>;

  // Storage operations
  createObjectStorageBucket(config: ObjectStorageBucket): Promise<BucketResource>;

  // Database operations
  createManagedDatabase(config: ManagedDatabase): Promise<DatabaseResource>;

  // Monitoring operations
  createMetricAlert(config: MetricAlert): Promise<AlertResource>;
  queryMetrics(query: MetricQuery): Promise<MetricResult[]>;

  // Resource management
  getResource(id: string): Promise<Resource>;
  listResources(type: ResourceType): Promise<Resource[]>;
  deleteResource(id: string): Promise<void>;

  // Cost operations
  getCostForResource(id: string, timeRange: TimeRange): Promise<CostData>;

  // Capability check
  supportsFeature(feature: string): boolean;
  getFeatureMatrix(): FeatureMatrix;
}
```

---

## 5. Implementation: AWS Adapter

**File**: `src/cloud-adapters/aws/aws-adapter.ts`

```typescript
export class AWSAdapter implements CloudAdapter {

  async createVirtualNetwork(config: VirtualNetwork): Promise<NetworkResource> {
    // 1. Create VPC
    const vpc = await this.ec2.createVpc({
      CidrBlock: config.cidr,
      EnableDnsHostnames: config.dns_enabled,
      EnableDnsSupport: true,
      TagSpecifications: [{
        ResourceType: 'vpc',
        Tags: this.formatTags(config.tags)
      }]
    }).promise();

    // 2. Create Internet Gateway for public subnets
    const igw = await this.ec2.createInternetGateway().promise();
    await this.ec2.attachInternetGateway({
      VpcId: vpc.Vpc.VpcId,
      InternetGatewayId: igw.InternetGateway.InternetGatewayId
    }).promise();

    // 3. Create subnets
    const subnets = await Promise.all(
      config.subnets.map(subnet => this.createSubnet(vpc.Vpc.VpcId, subnet, igw))
    );

    // 4. Enable VPC Flow Logs if requested
    if (config.enable_flow_logs) {
      await this.enableFlowLogs(vpc.Vpc.VpcId);
    }

    return {
      id: vpc.Vpc.VpcId,
      provider: 'aws',
      type: 'virtual_network',
      config: config,
      metadata: {
        subnets: subnets,
        internet_gateway: igw.InternetGateway.InternetGatewayId
      }
    };
  }

  async createKubernetesCluster(config: KubernetesCluster): Promise<ClusterResource> {
    // 1. Create EKS cluster
    const cluster = await this.eks.createCluster({
      name: config.name,
      version: config.version,
      roleArn: await this.getEKSClusterRole(),
      resourcesVpcConfig: {
        subnetIds: config.network.subnet_ids,
        endpointPublicAccess: true,
        endpointPrivateAccess: true
      },
      logging: config.enable_logging ? {
        clusterLogging: [{
          types: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'],
          enabled: true
        }]
      } : undefined
    }).promise();

    // 2. Wait for cluster to be active
    await this.waitForClusterActive(cluster.cluster.name);

    // 3. Create node groups
    const nodeGroups = await Promise.all(
      config.node_pools.map(pool => this.createNodeGroup(cluster.cluster.name, pool))
    );

    return {
      id: cluster.cluster.arn,
      provider: 'aws',
      type: 'kubernetes_cluster',
      config: config,
      metadata: {
        endpoint: cluster.cluster.endpoint,
        certificate_authority: cluster.cluster.certificateAuthority.data,
        node_groups: nodeGroups
      }
    };
  }

  // Map normalized instance type to AWS instance type
  private mapInstanceType(normalized: NormalizedInstanceType): string {
    const mapping: Record<NormalizedInstanceType, string> = {
      "small_compute": "t3.medium",
      "medium_compute": "m5.xlarge",
      "large_compute": "m5.4xlarge",
      "xlarge_compute": "m5.12xlarge",
      "small_memory_optimized": "r5.large",
      "medium_memory_optimized": "r5.2xlarge",
      "gpu_compute": "p3.2xlarge"
    };

    return mapping[normalized] || "m5.xlarge";
  }
}
```

---

## 6. Implementation: OCI Adapter

**File**: `src/cloud-adapters/oci/oci-adapter.ts`

```typescript
export class OCIAdapter implements CloudAdapter {

  async createVirtualNetwork(config: VirtualNetwork): Promise<NetworkResource> {
    // 1. Create VCN
    const vcnRequest: CreateVcnDetails = {
      cidrBlock: config.cidr,
      compartmentId: this.compartmentId,
      displayName: config.tags.name,
      dnsLabel: this.sanitizeDnsLabel(config.tags.name),
      freeformTags: config.tags
    };

    const vcn = await this.networkClient.createVcn({ createVcnDetails: vcnRequest });

    // 2. Create Internet Gateway for public subnets
    const igw = await this.networkClient.createInternetGateway({
      createInternetGatewayDetails: {
        compartmentId: this.compartmentId,
        vcnId: vcn.vcn.id,
        displayName: `${config.tags.name}-igw`,
        isEnabled: true
      }
    });

    // 3. Create NAT Gateway for private subnets
    const natGw = await this.networkClient.createNatGateway({
      createNatGatewayDetails: {
        compartmentId: this.compartmentId,
        vcnId: vcn.vcn.id,
        displayName: `${config.tags.name}-nat`
      }
    });

    // 4. Create subnets
    const subnets = await Promise.all(
      config.subnets.map(subnet => this.createSubnet(vcn.vcn.id, subnet, igw, natGw))
    );

    // 5. Enable VCN Flow Logs if requested
    if (config.enable_flow_logs) {
      await this.enableFlowLogs(vcn.vcn.id);
    }

    return {
      id: vcn.vcn.id,
      provider: 'oci',
      type: 'virtual_network',
      config: config,
      metadata: {
        subnets: subnets,
        internet_gateway: igw.internetGateway.id,
        nat_gateway: natGw.natGateway.id
      }
    };
  }

  async createKubernetesCluster(config: KubernetesCluster): Promise<ClusterResource> {
    // 1. Create OKE cluster
    const cluster = await this.containerEngineClient.createCluster({
      createClusterDetails: {
        name: config.name,
        compartmentId: this.compartmentId,
        vcnId: config.network.vcn_id,
        kubernetesVersion: this.mapK8sVersion(config.version),
        options: {
          serviceLbSubnetIds: config.network.public_subnet_ids,
          addOns: {
            isKubernetesDashboardEnabled: false,
            isTillerEnabled: false
          }
        },
        clusterPodNetworkOptions: [{
          cniType: 'FLANNEL_OVERLAY'
        }]
      }
    });

    // 2. Wait for cluster to be active
    await this.waitForClusterActive(cluster.cluster.id);

    // 3. Create node pools
    const nodePools = await Promise.all(
      config.node_pools.map(pool => this.createNodePool(cluster.cluster.id, pool, config.network))
    );

    return {
      id: cluster.cluster.id,
      provider: 'oci',
      type: 'kubernetes_cluster',
      config: config,
      metadata: {
        endpoint: cluster.cluster.endpoints.kubernetes,
        node_pools: nodePools
      }
    };
  }

  // Map normalized instance type to OCI shape
  private mapInstanceType(normalized: NormalizedInstanceType): OCIShape {
    const mapping: Record<NormalizedInstanceType, OCIShape> = {
      "small_compute": { shape: "VM.Standard.E4.Flex", ocpus: 2, memoryInGBs: 8 },
      "medium_compute": { shape: "VM.Standard2.4", ocpus: 4, memoryInGBs: 60 },
      "large_compute": { shape: "VM.Standard2.16", ocpus: 16, memoryInGBs: 240 },
      "xlarge_compute": { shape: "VM.Standard2.24", ocpus: 24, memoryInGBs: 320 },
      "small_memory_optimized": { shape: "VM.Standard.E4.Flex", ocpus: 2, memoryInGBs: 32 },
      "medium_memory_optimized": { shape: "VM.Standard.E4.Flex", ocpus: 8, memoryInGBs: 128 },
      "gpu_compute": { shape: "VM.GPU3.1", ocpus: 6, memoryInGBs: 90 }
    };

    return mapping[normalized] || { shape: "VM.Standard2.4", ocpus: 4, memoryInGBs: 60 };
  }
}
```

---

## 7. Capability Negotiation

### Feature Matrix

```typescript
const FEATURE_MATRIX: Record<CloudProvider, FeatureSupport> = {
  aws: {
    kubernetes_cluster: { supported: true, service: "EKS", version: "1.28" },
    managed_database_postgresql: { supported: true, service: "RDS", versions: ["12", "13", "14", "15"] },
    serverless_function: { supported: true, service: "Lambda", runtimes: ["nodejs18", "python3.11"] },
    object_storage_versioning: { supported: true },
    database_automated_backup: { supported: true, max_retention_days: 35 },
    multi_az_deployment: { supported: true },
    spot_instances: { supported: true }
  },
  oci: {
    kubernetes_cluster: { supported: true, service: "OKE", version: "1.28" },
    managed_database_postgresql: { supported: true, service: "Base Database", versions: ["12", "13", "14"] },
    serverless_function: { supported: true, service: "Functions", runtimes: ["nodejs18", "python3.9"] },
    object_storage_versioning: { supported: true },
    database_automated_backup: { supported: true, max_retention_days: 60 },
    multi_az_deployment: { supported: true, name: "Availability Domain redundancy" },
    spot_instances: { supported: true, name: "Preemptible Instances" }
  }
};
```

### Capability Check Logic

```typescript
function validateWorkflow(workflow: Workflow, targetCloud: CloudProvider): ValidationResult {
  const features = FEATURE_MATRIX[targetCloud];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check each resource in workflow
  for (const stage of workflow.stages) {
    for (const resource of stage.resources) {
      const featureKey = resource.type;

      if (!features[featureKey]?.supported) {
        errors.push(`Feature '${featureKey}' not supported on ${targetCloud}`);
      }

      // Check version compatibility
      if (resource.config.version) {
        const supportedVersions = features[featureKey]?.versions || [];
        if (!supportedVersions.includes(resource.config.version)) {
          warnings.push(
            `Version ${resource.config.version} of ${featureKey} may not be supported. ` +
            `Supported versions: ${supportedVersions.join(', ')}`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 8. Cross-Cloud Resource Naming

### Naming Convention

To ensure consistency across clouds:

```typescript
interface ResourceNaming {
  // Pattern: <project>-<environment>-<resource_type>-<random_suffix>
  // Example: myapp-prod-k8s-a1b2c3

  project: string;        // "myapp"
  environment: string;    // "dev", "test", "prod"
  resource_type: string;  // "vcn", "k8s", "db", "storage"
  random_suffix: string;  // 6-char random (for uniqueness)
}

function generateResourceName(naming: ResourceNaming): string {
  return `${naming.project}-${naming.environment}-${naming.resource_type}-${naming.random_suffix}`;
}

// AWS: myapp-prod-k8s-a1b2c3
// OCI: myapp-prod-k8s-a1b2c3 (same name!)
```

### Tagging Strategy

Standard tags applied to ALL resources on ALL clouds:

```typescript
interface StandardTags {
  "platform:managed_by": "universal-devops-platform";
  "platform:version": string;
  "platform:cloud_provider": "aws" | "oci" | "azure" | "gcp";
  "app:name": string;
  "app:environment": "dev" | "test" | "uat" | "prod";
  "app:component": string;
  "cost:center": string;
  "cost:project": string;
  "owner:team": string;
  "owner:email": string;
}
```

---

## 9. Decision: Single Cloud per Application

**Implication**: Each application stack lives entirely within one cloud provider.

**Benefits**:
- ✅ No complex cross-cloud networking (VPN, peering)
- ✅ Lower latency (all components in same cloud)
- ✅ Simpler security model (no cross-cloud auth)
- ✅ Lower data egress costs
- ✅ Easier troubleshooting

**Implementation**:
```yaml
# Application is "pinned" to one cloud
application:
  name: customer-portal
  cloud_provider: aws  # All resources deployed to AWS

  resources:
    - virtual_network: { ... }
    - kubernetes_cluster: { ... }
    - managed_database: { ... }
    # All in AWS!
```

**Multi-Cloud for DR**:
```yaml
# Disaster recovery in different cloud
application:
  name: customer-portal
  primary_cloud: aws
  dr_cloud: oci
  dr_strategy: active_passive

  replication:
    database:
      method: logical_replication
      rpo_minutes: 15
    storage:
      method: periodic_sync
      schedule: "0 */6 * * *"  # Every 6 hours
```

---

## 10. Hybrid Observability Strategy

### Application-Level Metrics (Unified)

**Solution**: Prometheus + Grafana deployed on Kubernetes

```yaml
observability:
  application_metrics:
    backend: prometheus_grafana
    deployment:
      type: kubernetes_deployment
      namespace: monitoring
      high_availability: true

    scrape_configs:
      - job_name: 'application-metrics'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
```

**Benefits**:
- Same Grafana dashboards work on AWS or OCI
- Application teams see consistent metrics regardless of cloud
- No vendor lock-in for app metrics

### Infrastructure-Level Metrics (Cloud-Native)

**AWS**: CloudWatch
**OCI**: OCI Monitoring

```yaml
observability:
  infrastructure_metrics:
    backend: cloud_native  # Uses CloudWatch or OCI Monitoring

    metrics:
      - compute_cpu_utilization
      - network_bytes_in_out
      - storage_iops
      - database_connections
      - load_balancer_requests
```

**Benefits**:
- No additional cost (included with cloud services)
- Native integration with cloud services
- Lower maintenance burden

---

## 11. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- ✅ Workflow DSL parser and validator
- ✅ Resource abstraction interfaces
- ✅ AWS adapter (basic compute, network, storage)
- ✅ OCI adapter (basic compute, network, storage)
- ✅ Capability negotiation engine

### Phase 2: Core Services (Weeks 5-8)
- ✅ Kubernetes cluster provisioning (EKS + OKE)
- ✅ Managed database provisioning (RDS + OCI Database)
- ✅ CI/CD pipeline integration (Argo Workflows)
- ✅ Container registry (ECR + OCIR)

### Phase 3: Observability (Weeks 9-10)
- ✅ Prometheus + Grafana deployment automation
- ✅ Cloud-native metrics integration
- ✅ Unified logging (CloudWatch Logs + OCI Logging)
- ✅ Alerting setup

### Phase 4: Operations (Weeks 11-12)
- ✅ Auto-scaling configuration
- ✅ Backup automation
- ✅ Security patching
- ✅ Cost reporting

---

## Next Steps

1. Review and approve this cloud abstraction architecture
2. Create detailed requirements document (REQ-MULTICLOUD-*.md)
3. Build proof of concept: Same workflow deploying to AWS and OCI
4. Validate feature parity between clouds
5. Proceed to implementation

---

*Multi-Cloud Abstraction Design Complete*
