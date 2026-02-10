# Multi-Cloud DevOps Platform - MVP Guide

## Overview

This is the MVP (Proof of Concept) for the AI-Native Multi-Cloud DevOps Platform. It validates the cloud abstraction architecture by providing:

1. **Cloud Abstraction Layer** - Provider-agnostic resource types
2. **Workflow DSL** - YAML-based workflow definitions
3. **AWS Adapter** - Implementation for Amazon Web Services
4. **CLI Tool** - Command-line interface for deployment
5. **State Management** - Track deployed resources

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKFLOW DSL (YAML)                         │
│  Provider-agnostic resource definitions (virtual_network, etc)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PARSER & VALIDATOR                   │
│  Parse YAML, validate schema, check dependencies                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       WORKFLOW EXECUTOR                          │
│  Orchestrate resource creation through adapters                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUD ADAPTER                             │
│  AWS Adapter (MVP) → EKS, VPC, containers                       │
│  OCI Adapter (Future) → OKE, VCN, containers                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUD PROVIDER                            │
│  Amazon Web Services (MVP focus)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js 18+ (20+ recommended)
- AWS CLI configured (for AWS deployment)
- Git

### Setup

```bash
# Navigate to platform directory
cd src/platform

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link CLI globally (optional)
npm link
```

## Quick Start

### 1. Create a Workflow

Create `workflows/my-app.yaml`:

```yaml
workflow:
  name: deploy-my-app
  target_cloud: aws
  region: us-east-1

  resources:
    - type: virtual_network
      name: my-vpc
      cidr: "10.0.0.0/16"

    - type: kubernetes_cluster
      name: my-eks
      version: "1.28"
      instance_type: small_compute
      node_count: 2
      network: my-vpc

    - type: container_deployment
      name: my-app
      cluster: my-eks
      image: "nginx:latest"
      replicas: 2
      port: 80
```

### 2. Deploy Workflow

```bash
# Set AWS credentials
export AWS_REGION=us-east-1
export AWS_PROFILE=default  # or use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

# Deploy workflow
platform deploy workflows/my-app.yaml
```

### 3. Check Status

```bash
# View deployment status
platform status deploy-my-app

# List resources
platform resources deploy-my-app

# List all deployments
platform list
```

### 4. Destroy Resources

```bash
# Clean up (removes state only in MVP)
platform destroy deploy-my-app
```

## Resource Types

### Virtual Network

Creates a cloud-agnostic virtual network.

- **AWS**: VPC with public/private subnets
- **OCI** (Future): VCN with public/private subnets

```yaml
- type: virtual_network
  name: my-network
  cidr: "10.0.0.0/16"
```

### Kubernetes Cluster

Creates a managed Kubernetes cluster.

- **AWS**: Amazon EKS
- **OCI** (Future): Oracle Container Engine (OKE)

```yaml
- type: kubernetes_cluster
  name: my-cluster
  version: "1.28"
  instance_type: small_compute  # or medium_compute, large_compute
  node_count: 2
  network: my-network
```

### Container Deployment

Deploys a containerized application to Kubernetes.

```yaml
- type: container_deployment
  name: my-app
  cluster: my-cluster
  image: "nginx:latest"
  replicas: 2
  port: 80
```

### Managed Database (Future)

```yaml
- type: managed_database
  name: my-db
  engine: postgresql
  version: "14"
  instance_class: small_db
  storage_size_gb: 20
  network: my-network
```

### Object Storage (Future)

```yaml
- type: object_storage
  name: my-bucket
  versioning_enabled: true
  encryption_enabled: true
```

## Instance Type Mappings

Normalized instance types map to cloud-specific sizes:

| Normalized Type | AWS Instance | OCI Shape (Future) | vCPU | Memory |
|-----------------|--------------|-------------------|------|--------|
| `small_compute` | t3.medium | VM.Standard.E4.Flex(2) | 2 | 4-8 GB |
| `medium_compute` | m5.xlarge | VM.Standard2.4 | 4 | 16-60 GB |
| `large_compute` | m5.4xlarge | VM.Standard2.16 | 16 | 64-240 GB |
| `small_memory_optimized` | r5.large | VM.Standard.E4.Flex(2) | 2 | 16-32 GB |
| `gpu_compute` | p3.2xlarge | VM.GPU3.1 | 8 | 61-90 GB |

## Validation Rules

The validator enforces:

### Workflow Level
- Workflow name must start with lowercase letter
- Name can only contain lowercase letters, numbers, hyphens
- Target cloud must be: aws, oci, azure, gcp
- Region must be specified
- At least one resource must be defined

### Resource Level
- Resource names must be unique
- Resource names must follow naming convention
- Required fields must be present for each type

### Virtual Network
- CIDR must be valid format (e.g., "10.0.0.0/16")

### Kubernetes Cluster
- Version must be specified
- Node count must be >= 1
- Must reference a virtual network

### Container Deployment
- Must reference a kubernetes cluster
- Image must be specified
- Replicas should be >= 1

### References
- Referenced resources (network, cluster) must exist in workflow

## State Management

State is stored locally in `.platform-state/` directory:

```
.platform-state/
├── workflow-name-1.json
├── workflow-name-2.json
└── workflow-name-3.json
```

Each state file contains:

```json
{
  "workflow_name": "deploy-my-app",
  "status": "deployed",
  "cloud": "aws",
  "region": "us-east-1",
  "resources": [
    {
      "type": "virtual_network",
      "name": "my-vpc",
      "id": "vpc-abc123",
      "status": "available",
      "metadata": { ... }
    }
  ],
  "created_at": "2026-01-29T12:00:00Z",
  "updated_at": "2026-01-29T12:15:00Z"
}
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Watch mode
npm test:watch
```

### Test Structure

```
tests/
├── unit/
│   ├── workflow-parser.test.ts
│   ├── workflow-validator.test.ts
│   └── aws-adapter.test.ts
└── integration/
    └── workflow-execution.test.ts
```

### Coverage Requirements

- **Domain Layer**: >90% coverage
- **Application Layer**: >80% coverage
- **Presentation Layer**: >70% coverage

## MVP Limitations

### Current Scope
✅ Workflow DSL parser and validator
✅ AWS adapter (simulated for MVP)
✅ CLI tool for deployment
✅ State management
✅ Unit tests

### Not Yet Implemented
❌ **Actual AWS SDK integration** - Currently simulated
❌ **OCI adapter** - Planned for Phase 2
❌ **Real Kubernetes deployment** - Currently simulated
❌ **Real infrastructure provisioning** - Currently simulated
❌ **Terraform/CloudFormation integration** - Planned
❌ **ArgoCD/Flux deployment** - Planned
❌ **Multi-region support** - Future
❌ **Cost tracking** - Future
❌ **Observability integration** - Future

## Production Roadmap

### Phase 1: MVP (Week 1) ✅
- ✅ Cloud abstraction layer
- ✅ Workflow DSL
- ✅ AWS adapter (simulated)
- ✅ CLI tool
- ✅ State management

### Phase 2: Real AWS Integration (Weeks 2-3)
- [ ] Integrate AWS SDK v3
- [ ] Real VPC creation
- [ ] Real EKS cluster provisioning
- [ ] Real kubectl deployment
- [ ] Integration tests with AWS

### Phase 3: OCI Support (Weeks 4-6)
- [ ] OCI SDK integration
- [ ] OCI adapter implementation
- [ ] Feature parity validation
- [ ] Cross-cloud testing

### Phase 4: Production Features (Weeks 7-12)
- [ ] Terraform/Pulumi integration
- [ ] ArgoCD/Flux deployment
- [ ] Observability stack
- [ ] Auto-scaling
- [ ] Backup automation
- [ ] Security scanning

## Troubleshooting

### Command Not Found

```bash
# If 'platform' command not found
npm link

# Or run directly
node cli/platform-cli.js deploy workflows/hello-world.yaml
```

### AWS Credentials

```bash
# Set AWS credentials
export AWS_REGION=us-east-1
export AWS_PROFILE=default

# Or use access keys
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

### Validation Errors

Check:
- Workflow name format (lowercase, hyphens only)
- CIDR format (e.g., "10.0.0.0/16")
- Resource references (network, cluster names)
- Required fields for each resource type

## Architecture Decisions

See `docs/sdlc/architecture/` for:
- ADR-001: Cloud Abstraction Pattern
- ADR-002: Workflow DSL Design
- ADR-003: Adapter Framework
- ADR-004: State Management

## Contributing

1. Follow TypeScript strict mode
2. Write unit tests for new features (>80% coverage)
3. Update documentation
4. Follow SOLID principles
5. Use layered architecture

## Support

For issues or questions:
- Check `docs/` directory
- Review architecture documents
- Check test cases for examples

---

**MVP Status**: ✅ Complete - Ready for real AWS integration

**Next Step**: Integrate AWS SDK v3 and implement real resource provisioning
