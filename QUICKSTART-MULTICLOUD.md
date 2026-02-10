# Multi-Cloud DevOps Platform - Quick Start

Get started in **5 minutes** with the Multi-Cloud DevOps Platform MVP!

## Prerequisites

- Node.js 18+ (20+ recommended)
- Git

## Installation

```bash
# Clone the repository
cd aisdlc-2.1.0/src/platform

# Install dependencies
npm install

# Build TypeScript
npm run build

# Make CLI available globally (optional)
npm link
```

## Your First Deployment

### 1. Create a Workflow

The platform includes a sample workflow at `workflows/hello-world.yaml`:

```yaml
workflow:
  name: deploy-hello-world
  target_cloud: aws
  region: us-east-1

  resources:
    - type: virtual_network
      name: hello-vpc
      cidr: "10.0.0.0/16"

    - type: kubernetes_cluster
      name: hello-eks
      version: "1.28"
      instance_type: small_compute
      node_count: 2
      network: hello-vpc

    - type: container_deployment
      name: hello-app
      cluster: hello-eks
      image: "nginx:latest"
      replicas: 2
      port: 80
```

### 2. Deploy the Workflow

```bash
# Set AWS credentials (simulated for MVP)
export AWS_REGION=us-east-1
export AWS_PROFILE=default

# Deploy workflow
platform deploy workflows/hello-world.yaml
```

**Output**:
```
============================================================
Starting workflow: deploy-hello-world
Target cloud: aws
Region: us-east-1
============================================================

✓ Connected to AWS region: us-east-1

[virtual_network] Creating: hello-vpc
Creating VPC: hello-vpc (10.0.0.0/16)
✓ VPC created: vpc-abc123
✓ [virtual_network] Created: hello-vpc

[kubernetes_cluster] Creating: hello-eks
Creating EKS cluster: hello-eks (1.28)
  Instance type: t3.medium
  Node count: 2
✓ EKS cluster created: eks-xyz789
✓ [kubernetes_cluster] Created: hello-eks

[container_deployment] Creating: hello-app
Deploying container: hello-app
  Image: nginx:latest
  Replicas: 2
✓ Container deployed: deployment-def456
  Service URL: http://hello-app.us-east-1.elb.amazonaws.com
✓ [container_deployment] Created: hello-app

============================================================
Workflow SUCCESS
Resources created: 3
Resources failed: 0
Execution time: 10.01s
============================================================

✓ State saved: .platform-state/deploy-hello-world.json
```

### 3. Check Status

```bash
# View workflow status
platform status deploy-hello-world

# List all resources
platform resources deploy-hello-world

# List all deployments
platform list
```

### 4. Clean Up

```bash
# Destroy workflow (removes state in MVP)
platform destroy deploy-hello-world
```

## Create Your Own Workflow

### Example: Full Stack Application

Create `workflows/my-app.yaml`:

```yaml
workflow:
  name: deploy-my-app
  target_cloud: aws
  region: us-east-1

  resources:
    # Network layer
    - type: virtual_network
      name: app-network
      cidr: "10.0.0.0/16"

    # Kubernetes cluster
    - type: kubernetes_cluster
      name: app-cluster
      version: "1.28"
      instance_type: medium_compute  # 4 vCPU, 16GB RAM
      node_count: 3
      network: app-network

    # Frontend application
    - type: container_deployment
      name: frontend
      cluster: app-cluster
      image: "my-company/frontend:v1.0.0"
      replicas: 3
      port: 80

    # Backend API
    - type: container_deployment
      name: backend-api
      cluster: app-cluster
      image: "my-company/backend-api:v1.0.0"
      replicas: 5
      port: 8080

    # Worker service
    - type: container_deployment
      name: worker
      cluster: app-cluster
      image: "my-company/worker:v1.0.0"
      replicas: 2
      port: 9000
```

Deploy:
```bash
platform deploy workflows/my-app.yaml
```

## Normalized Instance Types

No more remembering cloud-specific instance types!

```yaml
instance_type: medium_compute
```

Maps to:
- **AWS**: m5.xlarge (4 vCPU, 16GB RAM)
- **OCI** (Future): VM.Standard2.4 (4 OCPU, 60GB RAM)
- **Azure** (Future): Standard_D4s_v3
- **GCP** (Future): n2-standard-4

Available types:
- `small_compute` - 2 vCPU, 4-8GB RAM
- `medium_compute` - 4 vCPU, 16-60GB RAM
- `large_compute` - 16 vCPU, 64-240GB RAM
- `xlarge_compute` - 24 vCPU, 96-320GB RAM
- `small_memory_optimized` - Memory-optimized
- `gpu_compute` - GPU-enabled

## CLI Commands Reference

```bash
# Deploy a workflow
platform deploy <workflow-file.yaml>

# Check deployment status
platform status <workflow-name>

# List resources for a workflow
platform resources <workflow-name>

# List all deployed workflows
platform list

# Destroy a deployment
platform destroy <workflow-name>

# Show help
platform help
```

## Environment Variables

### AWS
```bash
export AWS_REGION=us-east-1
export AWS_PROFILE=default

# OR use access keys
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

### OCI (Future)
```bash
export OCI_REGION=us-ashburn-1
export OCI_USER_OCID=ocid1.user...
export OCI_TENANCY_OCID=ocid1.tenancy...
export OCI_COMPARTMENT_ID=ocid1.compartment...
```

## Workflow Validation

The platform validates workflows before deployment:

✅ Workflow structure and syntax
✅ Resource type validity
✅ Naming conventions (lowercase, hyphens)
✅ CIDR format for networks
✅ Resource dependencies
✅ Duplicate resource names
✅ Cloud provider support

**Example validation error**:
```
✗ Workflow validation failed:

  - [INVALID_CIDR_FORMAT] workflow.resources[0].cidr: Invalid CIDR format. Expected format: 10.0.0.0/16
  - [INVALID_REFERENCE] workflow.resources[1].network: Referenced network 'my-vpc' does not exist
```

## Supported Resources (MVP)

| Resource Type | Description | AWS | OCI (Future) |
|--------------|-------------|-----|--------------|
| `virtual_network` | Virtual network with subnets | VPC | VCN |
| `kubernetes_cluster` | Managed Kubernetes cluster | EKS | OKE |
| `container_deployment` | Container application | EKS | OKE |

**Coming Soon**:
- `managed_database` - PostgreSQL, MySQL, Oracle
- `object_storage` - S3, Object Storage
- `load_balancer` - ALB, Load Balancer
- `cache` - ElastiCache, OCI Cache

## State Management

Deployment state is stored in `.platform-state/`:

```
.platform-state/
├── deploy-hello-world.json
├── deploy-my-app.json
└── ...
```

Each state file contains:
- Workflow metadata
- Resource IDs and status
- Cloud provider and region
- Creation and update timestamps

## MVP vs Production

### MVP (Current)
- ✅ Cloud abstraction layer
- ✅ Workflow DSL parser
- ✅ AWS adapter (simulated)
- ✅ CLI tool
- ✅ State management
- ✅ Unit tests

### Phase 2 (Next)
- 🚧 Real AWS SDK integration
- 🚧 Actual EKS provisioning
- 🚧 Real kubectl deployment
- 🚧 OCI adapter
- 🚧 Integration tests

### Production (Future)
- 🎯 Terraform/Pulumi integration
- 🎯 ArgoCD/Flux deployment
- 🎯 Observability stack
- 🎯 Auto-scaling
- 🎯 Backup automation

## Troubleshooting

### "Command not found: platform"

If `platform` command is not found after `npm link`:

```bash
# Run directly with node
cd src/platform
node dist/cli/platform-cli.js deploy ../../workflows/hello-world.yaml

# Or add to your PATH
export PATH="$PATH:$(pwd)/dist/cli"
```

### Validation Errors

Common issues:
- **Invalid workflow name**: Must start with lowercase letter, use hyphens (not underscores)
- **Invalid CIDR**: Must be format like "10.0.0.0/16"
- **Missing reference**: Referenced resources (network, cluster) must be defined before use
- **Duplicate names**: Each resource must have a unique name

### AWS Credentials

For MVP, any valid format works (simulated):
```bash
export AWS_PROFILE=default
# OR
export AWS_ACCESS_KEY_ID=any-value
export AWS_SECRET_ACCESS_KEY=any-value
```

## Documentation

- **MVP Guide**: `docs/MVP-GUIDE.md` - Comprehensive MVP documentation
- **README**: `src/platform/README.md` - Platform overview
- **Completion Summary**: `docs/MVP-COMPLETION-SUMMARY.md` - MVP delivery details
- **Architecture**: `docs/sdlc/architecture/ARCH-20260129-0140.md` - Full architecture
- **Requirements**: `docs/sdlc/requirements/REQ-MULTICLOUD-20260129.md` - Requirements spec

## Example Workflows

### Simple Web App
```yaml
workflow:
  name: simple-web-app
  target_cloud: aws
  region: us-east-1

  resources:
    - type: virtual_network
      name: web-network
      cidr: "10.0.0.0/16"

    - type: kubernetes_cluster
      name: web-cluster
      version: "1.28"
      instance_type: small_compute
      node_count: 2
      network: web-network

    - type: container_deployment
      name: webapp
      cluster: web-cluster
      image: "nginx:alpine"
      replicas: 2
      port: 80
```

### Microservices Application
```yaml
workflow:
  name: microservices-app
  target_cloud: aws
  region: us-west-2

  resources:
    - type: virtual_network
      name: microservices-net
      cidr: "10.1.0.0/16"

    - type: kubernetes_cluster
      name: microservices-cluster
      version: "1.28"
      instance_type: medium_compute
      node_count: 5
      network: microservices-net

    - type: container_deployment
      name: api-gateway
      cluster: microservices-cluster
      image: "company/api-gateway:latest"
      replicas: 3
      port: 8080

    - type: container_deployment
      name: auth-service
      cluster: microservices-cluster
      image: "company/auth-service:latest"
      replicas: 2
      port: 8081

    - type: container_deployment
      name: user-service
      cluster: microservices-cluster
      image: "company/user-service:latest"
      replicas: 3
      port: 8082

    - type: container_deployment
      name: order-service
      cluster: microservices-cluster
      image: "company/order-service:latest"
      replicas: 5
      port: 8083
```

## Next Steps

1. **Try the hello-world workflow** - See it in action
2. **Create your own workflow** - Deploy your application
3. **Explore the documentation** - Learn about architecture and features
4. **Provide feedback** - Help shape Phase 2 development

## Support

- **Documentation**: `docs/` directory
- **Examples**: `workflows/` directory
- **Tests**: `tests/` directory for examples

## Architecture Highlights

### Cloud Abstraction Pattern
Write workflows once, deploy to any cloud:
```yaml
# Same workflow works on AWS, OCI, Azure, GCP
workflow:
  target_cloud: ${CLOUD_PROVIDER}  # Just change this!
  resources:
    - type: kubernetes_cluster      # Generic type
      instance_type: medium_compute # Normalized size
```

### Adapter Pattern
Easily add new cloud providers:
```typescript
class OciAdapter extends BaseCloudAdapter {
  // Implement CloudAdapter interface
  // Automatic feature parity with AWS
}
```

### SOLID Design
- **S**ingle Responsibility: Each class has one job
- **O**pen/Closed: Open for extension (new clouds)
- **L**iskov Substitution: All adapters interchangeable
- **I**nterface Segregation: Specific interfaces
- **D**ependency Inversion: Depend on abstractions

---

**Welcome to the Multi-Cloud DevOps Platform!**

Deploy once, run anywhere. ☁️

---

*MVP Status: ✅ Complete - Ready for Phase 2*

*Built with TypeScript, designed for the cloud*
