# AWS vs OCI Workflow Comparison

This document shows side-by-side comparison of the same application deployed to AWS and OCI.

## Key Differences

The ONLY differences are:
1. `target_cloud` field (aws vs oci)
2. `region` field (AWS region vs OCI region)
3. Cloud-specific configuration section (optional)

**Everything else is IDENTICAL!**

---

## AWS Deployment

File: `workflow-aws.yaml`

```yaml
workflow:
  name: fullstack-app
  target_cloud: aws           # 👈 AWS
  region: us-east-1           # 👈 AWS region

  # AWS-specific configuration (optional)
  aws:
    profile: default

  resources:
    # Virtual Network
    - type: virtual_network
      name: app-network
      cidr: 10.0.0.0/16
      enable_flow_logs: true

    # Kubernetes Cluster
    - type: kubernetes_cluster
      name: app-cluster
      version: v1.28
      network: app-network
      node_count: 3
      instance_type: medium_compute
      enable_autoscaling: true
      min_nodes: 2
      max_nodes: 10

    # Managed Database
    - type: managed_database
      name: app-database
      engine: postgresql
      version: "15"
      instance_class: medium_db
      storage_size_gb: 100
      network: app-network
      high_availability: true

    # Object Storage
    - type: object_storage
      name: app-assets
      versioning_enabled: true
      encryption_enabled: true

    # Container Deployment
    - type: container_deployment
      name: web-app
      cluster: app-cluster
      image: nginx:latest
      replicas: 5
      port: 8080
```

**Deploy to AWS**:
```bash
npm run build
node dist/cli/platform-cli.js deploy workflow-aws.yaml
```

---

## OCI Deployment

File: `workflow-oci.yaml`

```yaml
workflow:
  name: fullstack-app
  target_cloud: oci           # 👈 OCI
  region: us-ashburn-1        # 👈 OCI region

  # OCI-specific configuration (optional)
  oci:
    compartment_id: ${OCI_COMPARTMENT_ID}
    profile: DEFAULT

  resources:
    # Virtual Network (IDENTICAL to AWS)
    - type: virtual_network
      name: app-network
      cidr: 10.0.0.0/16
      enable_flow_logs: true

    # Kubernetes Cluster (IDENTICAL to AWS)
    - type: kubernetes_cluster
      name: app-cluster
      version: v1.28
      network: app-network
      node_count: 3
      instance_type: medium_compute
      enable_autoscaling: true
      min_nodes: 2
      max_nodes: 10

    # Managed Database (IDENTICAL to AWS)
    - type: managed_database
      name: app-database
      engine: postgresql
      version: "15"
      instance_class: medium_db
      storage_size_gb: 100
      network: app-network
      high_availability: true

    # Object Storage (IDENTICAL to AWS)
    - type: object_storage
      name: app-assets
      versioning_enabled: true
      encryption_enabled: true

    # Container Deployment (IDENTICAL to AWS)
    - type: container_deployment
      name: web-app
      cluster: app-cluster
      image: nginx:latest
      replicas: 5
      port: 8080
```

**Deploy to OCI**:
```bash
export OCI_COMPARTMENT_ID="your-compartment-ocid"
npm run build
node dist/cli/platform-cli.js deploy workflow-oci.yaml
```

---

## What Happens Behind the Scenes

### AWS Deployment

| Generic Resource | AWS Implementation |
|------------------|-------------------|
| `virtual_network` | Creates VPC with public/private subnets, Internet Gateway, Route Tables, Security Groups |
| `kubernetes_cluster` | Creates EKS cluster with managed node group |
| `managed_database` | Creates RDS PostgreSQL instance |
| `object_storage` | Creates S3 bucket with versioning and encryption |
| `container_deployment` | Deploys Kubernetes Deployment + Service + Ingress |

**Instance Mapping**:
- `medium_compute` → `m5.xlarge` (4 vCPUs, 16GB RAM)
- `medium_db` → `db.t3.medium` (2 vCPUs, 4GB RAM)

### OCI Deployment

| Generic Resource | OCI Implementation |
|------------------|-------------------|
| `virtual_network` | Creates VCN with public/private subnets, Internet Gateway, Route Tables, Security Lists |
| `kubernetes_cluster` | Creates OKE cluster with node pool |
| `managed_database` | Creates Autonomous Database (PostgreSQL-compatible) |
| `object_storage` | Creates Object Storage bucket with versioning and encryption |
| `container_deployment` | Deploys Kubernetes Deployment + Service + Ingress |

**Instance Mapping**:
- `medium_compute` → `VM.Standard2.4` (4 OCPUs, 60GB RAM)
- `medium_db` → `2 OCPUs` (Autonomous Database)

---

## Multi-Cloud Strategy

### Scenario 1: Primary AWS, Backup OCI

1. Deploy to AWS (primary):
   ```bash
   node dist/cli/platform-cli.js deploy workflow-aws.yaml
   ```

2. Deploy to OCI (disaster recovery):
   ```bash
   export OCI_COMPARTMENT_ID="dr-compartment-ocid"
   node dist/cli/platform-cli.js deploy workflow-oci.yaml
   ```

3. Set up data replication:
   - Database: Async replication AWS RDS → OCI Autonomous DB
   - Storage: S3 → OCI Object Storage sync

### Scenario 2: Multi-Region, Multi-Cloud

Deploy to both simultaneously for high availability:

```bash
# Deploy to AWS us-east-1
node dist/cli/platform-cli.js deploy workflow-aws-east.yaml &

# Deploy to AWS us-west-2
node dist/cli/platform-cli.js deploy workflow-aws-west.yaml &

# Deploy to OCI us-ashburn-1
node dist/cli/platform-cli.js deploy workflow-oci-ashburn.yaml &

# Deploy to OCI eu-frankfurt-1
node dist/cli/platform-cli.js deploy workflow-oci-frankfurt.yaml &

wait
```

### Scenario 3: Cost Optimization

Run workloads where they're cheapest:

```bash
# Development: OCI (cheaper for small workloads)
node dist/cli/platform-cli.js deploy workflow-oci-dev.yaml

# Production: AWS (better for our use case)
node dist/cli/platform-cli.js deploy workflow-aws-prod.yaml
```

---

## Migration Example

### Migrate from AWS to OCI

```bash
# 1. Export current AWS state
node dist/cli/platform-cli.js export workflow-aws.yaml > state-aws.json

# 2. Convert to OCI format
cat state-aws.json | jq '
  .target_cloud = "oci" |
  .region = "us-ashburn-1" |
  .oci = { compartment_id: env.OCI_COMPARTMENT_ID }
' > state-oci.json

# 3. Preview changes
node dist/cli/platform-cli.js plan state-oci.json

# 4. Deploy to OCI
node dist/cli/platform-cli.js apply state-oci.json

# 5. Verify and test

# 6. Switch traffic to OCI

# 7. Destroy AWS resources
node dist/cli/platform-cli.js destroy workflow-aws.yaml
```

---

## Cost Comparison

### AWS Costs (Monthly)

| Resource | Spec | Cost |
|----------|------|------|
| VPC | Standard | Free |
| EKS | Control plane | $73 |
| EC2 (3x m5.xlarge) | 4 vCPUs, 16GB | ~$400 |
| RDS PostgreSQL | db.t3.medium | ~$60 |
| S3 | 100GB storage | ~$2.30 |
| Data Transfer | 100GB out | ~$9 |
| **TOTAL** | | **~$544/month** |

### OCI Costs (Monthly)

| Resource | Spec | Cost |
|----------|------|------|
| VCN | Standard | Free |
| OKE | Control plane | Free |
| Compute (3x VM.Standard2.4) | 4 OCPUs, 60GB | ~$450 |
| Autonomous DB | 2 OCPUs | ~$280 |
| Object Storage | 100GB | ~$2.30 |
| Data Transfer | 100GB out | ~$0.85 |
| **TOTAL** | | **~$733/month** |

**Note**: Costs vary based on:
- Actual usage (compute hours, storage, data transfer)
- Reserved instances / committed use discounts
- Regional pricing differences
- Free tier usage

---

## Best Practices

### 1. Version Control Your Workflows

```bash
git add workflow-aws.yaml workflow-oci.yaml
git commit -m "Add multi-cloud deployment workflows"
git push
```

### 2. Use Environment-Specific Configs

```yaml
# workflow-dev.yaml
workflow:
  name: myapp-dev
  target_cloud: oci  # Cheaper for dev
  # ... small instance types

# workflow-prod.yaml
workflow:
  name: myapp-prod
  target_cloud: aws  # Production on AWS
  # ... large instance types with HA
```

### 3. Test Both Clouds

```bash
# CI/CD pipeline
npm run test:aws
npm run test:oci
npm run test:parity
```

### 4. Monitor Both Deployments

Set up unified monitoring:
- AWS CloudWatch + OCI Monitoring → Central dashboard
- Use same metrics and alerts
- Implement cross-cloud observability

---

## Troubleshooting

### Workflow Works on AWS but Fails on OCI

1. Check credentials:
   ```bash
   oci iam region list
   ```

2. Verify compartment access:
   ```bash
   oci iam compartment get --compartment-id $OCI_COMPARTMENT_ID
   ```

3. Check resource limits:
   ```bash
   oci limits resource-availability get --compartment-id $OCI_COMPARTMENT_ID --service-name compute
   ```

### Resource Names

Some clouds have different naming restrictions:

```yaml
# AWS: Flexible naming
name: my-app-network-2024

# OCI: Stricter for some resources
name: myappnetwork2024  # No dashes in some resources
```

**Solution**: Use alphanumeric names without special characters.

---

## Conclusion

With feature parity between AWS and OCI adapters:

✅ **Same workflow** deploys to both clouds
✅ **No cloud-specific syntax** in resource definitions
✅ **Easy migration** between clouds
✅ **Multi-cloud strategy** without rewriting configs
✅ **Cost optimization** by choosing best cloud per workload

**Next Steps**:
1. Try the [quick start](../docs/OCI-INTEGRATION.md#quick-start)
2. Run [feature parity tests](#feature-parity-validation)
3. Deploy your first multi-cloud application
