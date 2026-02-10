# Multi-Cloud DevOps Platform

**Write Once, Deploy Anywhere** - A cloud-agnostic DevOps automation platform that enables you to define infrastructure workflows once and deploy them to AWS, OCI, Azure, or GCP.

## Features

- ✅ **Cloud-Agnostic Workflows** - YAML-based DSL that works across all major clouds
- ✅ **Provider Abstraction** - Normalized resource types that map to cloud-specific implementations
- ✅ **Kubernetes-Native** - First-class support for EKS, OKE, AKS, GKE
- ✅ **Type-Safe** - Full TypeScript implementation with strict typing
- ✅ **Validated** - Comprehensive workflow validation before deployment
- ✅ **State Management** - Track all deployed resources
- ✅ **CLI-First** - Simple command-line interface

## Quick Start

### Install

```bash
cd src/platform
npm install
npm run build
npm link  # Makes 'platform' command available globally
```

### Deploy Hello World

```bash
platform deploy ../../workflows/hello-world.yaml
```

This workflow:
1. Creates a virtual network (VPC on AWS)
2. Provisions a Kubernetes cluster (EKS on AWS)
3. Deploys nginx container with 2 replicas

### Check Status

```bash
platform status deploy-hello-world
platform resources deploy-hello-world
```

### Cleanup

```bash
platform destroy deploy-hello-world
```

## Workflow Example

```yaml
workflow:
  name: my-application
  target_cloud: aws  # or oci, azure, gcp
  region: us-east-1

  resources:
    # Virtual Network
    - type: virtual_network
      name: app-network
      cidr: "10.0.0.0/16"

    # Kubernetes Cluster
    - type: kubernetes_cluster
      name: app-cluster
      version: "1.28"
      instance_type: medium_compute
      node_count: 3
      network: app-network

    # Container Deployment
    - type: container_deployment
      name: web-app
      cluster: app-cluster
      image: "my-app:v1.0.0"
      replicas: 3
      port: 8080
```

## Supported Resources

| Resource Type | AWS | OCI (Future) | Azure (Future) | GCP (Future) |
|--------------|-----|--------------|----------------|--------------|
| `virtual_network` | VPC | VCN | VNet | VPC |
| `kubernetes_cluster` | EKS | OKE | AKS | GKE |
| `container_deployment` | EKS | OKE | AKS | GKE |
| `managed_database` | RDS | Base DB | Azure SQL | Cloud SQL |
| `object_storage` | S3 | Object Storage | Blob Storage | Cloud Storage |

## Normalized Instance Types

No more remembering cloud-specific instance types!

```yaml
instance_type: medium_compute
```

Maps to:
- **AWS**: m5.xlarge (4 vCPU, 16GB RAM)
- **OCI**: VM.Standard2.4 (4 OCPU, 60GB RAM)
- **Azure**: Standard_D4s_v3 (4 vCPU, 16GB RAM)
- **GCP**: n2-standard-4 (4 vCPU, 16GB RAM)

Available types:
- `small_compute` - 2 vCPU, 4-8GB RAM
- `medium_compute` - 4 vCPU, 16-60GB RAM
- `large_compute` - 16 vCPU, 64-240GB RAM
- `small_memory_optimized` - Memory-optimized instances
- `gpu_compute` - GPU-enabled instances

## CLI Commands

```bash
# Deploy workflow
platform deploy <workflow-file.yaml>

# Check deployment status
platform status <workflow-name>

# List all resources
platform resources <workflow-name>

# List all deployments
platform list

# Destroy deployment
platform destroy <workflow-name>

# Show help
platform help
```

## Environment Variables

```bash
# AWS
export AWS_REGION=us-east-1
export AWS_PROFILE=default
# OR
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret

# OCI (Future)
export OCI_REGION=us-ashburn-1
export OCI_USER_OCID=ocid1.user...
export OCI_TENANCY_OCID=ocid1.tenancy...
export OCI_COMPARTMENT_ID=ocid1.compartment...
```

## Development

### Project Structure

```
src/platform/
├── cloud-abstraction/
│   ├── types/              # Type definitions
│   │   ├── cloud-types.ts
│   │   └── workflow-types.ts
│   ├── dsl/                # Workflow DSL
│   │   ├── workflow-parser.ts
│   │   └── workflow-validator.ts
│   ├── adapters/           # Cloud adapters
│   │   ├── base-adapter.ts
│   │   ├── aws-adapter.ts
│   │   └── adapter-factory.ts
│   └── resources/          # Resource management
│       └── workflow-executor.ts
├── state/                  # State management
│   └── state-manager.ts
├── cli/                    # CLI tool
│   └── platform-cli.ts
└── utils/                  # Utilities

tests/
├── unit/                   # Unit tests
└── integration/            # Integration tests
```

### Run Tests

```bash
# All tests
npm test

# With coverage
npm test:coverage

# Watch mode
npm test:watch

# Lint
npm run lint

# Type check
npm run type-check
```

### Coverage Requirements

- Domain layer: >90%
- Application layer: >80%
- Presentation layer: >70%

## Architecture Principles

### 1. Single Responsibility
Each class/module has one reason to change.

### 2. Open/Closed
Open for extension (new adapters), closed for modification.

### 3. Liskov Substitution
All adapters are interchangeable through the base interface.

### 4. Interface Segregation
Specific interfaces for each resource type.

### 5. Dependency Inversion
High-level modules depend on abstractions, not concrete implementations.

## Workflow Validation

The validator checks:

✅ Workflow structure and required fields
✅ Resource type validity
✅ Naming conventions (lowercase, hyphens)
✅ CIDR format for networks
✅ Resource dependencies (references)
✅ Duplicate resource names
✅ Cloud provider support

## State Management

State files are stored in `.platform-state/`:

```json
{
  "workflow_name": "my-app",
  "status": "deployed",
  "cloud": "aws",
  "region": "us-east-1",
  "resources": [
    {
      "type": "kubernetes_cluster",
      "name": "my-eks",
      "id": "eks-abc123",
      "status": "available"
    }
  ],
  "created_at": "2026-01-29T12:00:00Z",
  "updated_at": "2026-01-29T12:15:00Z"
}
```

## Error Handling

Errors follow a standard format:

```typescript
{
  field: 'workflow.resources[0].cidr',
  message: 'Invalid CIDR format',
  code: 'INVALID_CIDR_FORMAT'
}
```

All adapter methods return `Promise<ResourceResult>` with:
- Success: Resource details
- Failure: Throws descriptive error

## Logging

Structured logging with:
- ✓ Success indicators
- ✗ Failure indicators
- ⚠ Warnings
- Clear progress messages

## MVP Status

### Implemented ✅
- Cloud abstraction layer
- Workflow DSL parser & validator
- AWS adapter (simulated)
- CLI tool
- State management
- Unit tests
- Documentation

### Next Phase 🚧
- Real AWS SDK integration
- Actual EKS provisioning
- Real kubectl deployment
- OCI adapter
- Integration tests

## Contributing

1. Follow TypeScript strict mode
2. Write tests for new features
3. Update documentation
4. Follow SOLID principles
5. Use conventional commits

## License

ISC

## Support

- Documentation: `docs/` directory
- Examples: `workflows/` directory
- Tests: `tests/` directory

---

**Built with TypeScript, designed for the cloud** ☁️
