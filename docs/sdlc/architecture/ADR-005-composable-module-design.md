# ADR-005: Composable Module Design Pattern

## Status
Accepted

## Date
2026-01-29

## Context

The platform's core value proposition is providing reusable building blocks that teams can compose into complex infrastructure. We need a design pattern that makes modules truly reusable, testable, and composable while maintaining consistency and security.

### Options Considered

1. **Composable Modules** - Small, focused modules that compose together
2. **Monolithic Templates** - Large templates that include everything
3. **Copy-Paste Patterns** - Reference implementations to copy and modify
4. **Generator-Based** - CLI that generates customized infrastructure

## Decision

We will implement a **Composable Module Design Pattern** where each module is:
- **Single-Purpose**: Does one thing well
- **Composable**: Outputs connect to other modules' inputs
- **Testable**: Has automated tests
- **Versioned**: Follows semantic versioning
- **Documented**: Self-documenting with examples

## Rationale

### Design Pattern Comparison

| Criterion | Composable | Monolithic | Copy-Paste | Generator |
|-----------|------------|------------|------------|-----------|
| Reusability | Excellent | Poor | Moderate | Good |
| Testability | Excellent | Difficult | Varies | Good |
| Maintainability | Excellent | Difficult | Poor | Good |
| Flexibility | High | Low | High | Moderate |
| Learning curve | Moderate | Low | Low | Low |
| Consistency | High | High | Low | High |
| Version control | Simple | Complex | None | Varies |

### Key Factors

1. **True Reusability**: Composable modules can be combined in ways the original author didn't anticipate.

2. **Independent Testing**: Each module can be tested in isolation with predictable inputs/outputs.

3. **Independent Versioning**: Modules evolve independently. Consumers pin to specific versions.

4. **Reduced Blast Radius**: Changes to one module don't affect others unless interface changes.

5. **Clear Contracts**: Input variables and outputs form a clear API contract.

### Trade-offs Accepted

- **Composition Complexity**: Users must understand how modules connect
- **More Files**: Many small modules vs. few large ones
- **Dependency Management**: Must track inter-module dependencies
- **Interface Stability**: Changes to outputs can break consumers

## Implementation

### Module Design Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODULE DESIGN PRINCIPLES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SINGLE RESPONSIBILITY                                                    │
│     Each module manages ONE logical resource or closely related set          │
│                                                                              │
│     GOOD: vpc, eks, rds-postgresql                                          │
│     BAD:  vpc-with-eks-and-rds (too much)                                   │
│                                                                              │
│  2. EXPLICIT DEPENDENCIES                                                    │
│     All dependencies passed as input variables, never assumed                │
│                                                                              │
│     GOOD: variable "vpc_id" { type = string }                               │
│     BAD:  data "aws_vpc" "main" { default = true }                          │
│                                                                              │
│  3. CLEAR OUTPUTS                                                            │
│     Export everything another module might need                              │
│                                                                              │
│     GOOD: output "cluster_endpoint" { value = aws_eks_cluster.main.endpoint }│
│     BAD:  (no outputs, forcing data source lookups)                         │
│                                                                              │
│  4. SENSIBLE DEFAULTS                                                        │
│     Work out-of-the-box with secure, production-ready defaults              │
│                                                                              │
│     GOOD: variable "encryption_enabled" { default = true }                  │
│     BAD:  variable "encryption_enabled" { default = false }                 │
│                                                                              │
│  5. VALIDATION                                                               │
│     Validate inputs to fail fast with clear errors                          │
│                                                                              │
│     GOOD: validation { condition = can(regex(...)) }                        │
│     BAD:  (no validation, confusing downstream errors)                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Standard Module Structure

```
modules/
└── {category}/
    └── {module-name}/
        ├── README.md           # Documentation with examples
        ├── main.tf             # Primary resource definitions
        ├── variables.tf        # Input variables with validation
        ├── outputs.tf          # Output values
        ├── versions.tf         # Provider and Terraform version constraints
        ├── locals.tf           # Local values and computed expressions
        ├── data.tf             # Data sources (if needed)
        ├── iam.tf              # IAM resources (if module creates them)
        ├── examples/
        │   ├── basic/          # Minimal working example
        │   │   ├── main.tf
        │   │   └── terraform.tfvars.example
        │   └── complete/       # Full-featured example
        │       ├── main.tf
        │       └── terraform.tfvars.example
        └── tests/
            ├── unit/           # Unit tests (terraform validate, tflint)
            └── integration/    # Integration tests (terratest)
```

### Module Interface Contract

```hcl
# modules/compute/eks/variables.tf

#=============================================================================
# REQUIRED VARIABLES
# These must be provided by the caller
#=============================================================================

variable "cluster_name" {
  description = "Name of the EKS cluster. Must be unique within the AWS account."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,38}[a-z0-9]$", var.cluster_name))
    error_message = "Cluster name must be 2-40 characters, start with letter, alphanumeric and hyphens only."
  }
}

variable "vpc_id" {
  description = "ID of the VPC where the EKS cluster will be deployed."
  type        = string

  validation {
    condition     = can(regex("^vpc-[a-f0-9]{8,17}$", var.vpc_id))
    error_message = "VPC ID must be a valid vpc-* identifier."
  }
}

variable "subnet_ids" {
  description = "List of subnet IDs for the EKS cluster. Minimum 2 subnets in different AZs required."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability."
  }
}

#=============================================================================
# OPTIONAL VARIABLES
# These have sensible defaults for production use
#=============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster."
  type        = string
  default     = "1.29"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|3[0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.27 or higher."
  }
}

variable "enable_cluster_encryption" {
  description = "Enable envelope encryption for Kubernetes secrets using KMS."
  type        = bool
  default     = true  # Secure default
}

variable "enable_public_access" {
  description = "Enable public access to the Kubernetes API endpoint."
  type        = bool
  default     = false  # Secure default: private only
}

variable "node_groups" {
  description = "Map of node group configurations."
  type = map(object({
    instance_types  = list(string)
    min_size        = number
    max_size        = number
    desired_size    = number
    capacity_type   = optional(string, "ON_DEMAND")
    disk_size       = optional(number, 50)
    labels          = optional(map(string), {})
    taints          = optional(list(object({
      key    = string
      value  = optional(string)
      effect = string
    })), [])
  }))
  default = {
    default = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
  }

  validation {
    condition = alltrue([
      for ng in var.node_groups : ng.min_size <= ng.desired_size && ng.desired_size <= ng.max_size
    ])
    error_message = "Node group sizes must satisfy: min_size <= desired_size <= max_size."
  }
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/compute/eks/outputs.tf

#=============================================================================
# CLUSTER OUTPUTS
# Primary identifiers and endpoints
#=============================================================================

output "cluster_id" {
  description = "The unique identifier of the EKS cluster."
  value       = aws_eks_cluster.main.id
}

output "cluster_arn" {
  description = "The ARN of the EKS cluster."
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "The endpoint URL for the Kubernetes API server."
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for cluster authentication."
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

#=============================================================================
# SECURITY OUTPUTS
# For connecting other resources securely
#=============================================================================

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster."
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "node_security_group_id" {
  description = "Security group ID attached to the EKS worker nodes."
  value       = aws_security_group.node.id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN of the EKS cluster."
  value       = aws_iam_role.cluster.arn
}

output "node_iam_role_arn" {
  description = "IAM role ARN of the EKS worker nodes."
  value       = aws_iam_role.node.arn
}

#=============================================================================
# IRSA OUTPUTS
# For setting up IAM Roles for Service Accounts
#=============================================================================

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider for IRSA."
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider (without https://)."
  value       = replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}

#=============================================================================
# NODE GROUP OUTPUTS
# For referencing node groups
#=============================================================================

output "node_groups" {
  description = "Map of node group attributes."
  value = {
    for k, v in aws_eks_node_group.workers : k => {
      arn           = v.arn
      status        = v.status
      capacity_type = v.capacity_type
      scaling_config = {
        min_size     = v.scaling_config[0].min_size
        max_size     = v.scaling_config[0].max_size
        desired_size = v.scaling_config[0].desired_size
      }
    }
  }
}

#=============================================================================
# KUBECONFIG OUTPUT
# For easy cluster access configuration
#=============================================================================

output "kubeconfig_command" {
  description = "AWS CLI command to update kubeconfig."
  value       = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${data.aws_region.current.name}"
}
```

### Module Composition Example

```hcl
# environments/tenant-a/prod/main.tf

# Foundation Layer
module "vpc" {
  source  = "git::https://github.com/org/terraform-modules.git//networking/vpc?ref=v2.1.0"

  name        = "tenant-a-prod"
  cidr_block  = "10.1.0.0/16"
  az_count    = 3
  environment = "prod"

  enable_nat_gateway    = true
  single_nat_gateway    = false  # HA for prod
  enable_vpc_endpoints  = true

  tags = local.common_tags
}

# Compute Layer (depends on VPC)
module "eks" {
  source  = "git::https://github.com/org/terraform-modules.git//compute/eks?ref=v3.0.0"

  cluster_name = "tenant-a-prod"
  vpc_id       = module.vpc.vpc_id                    # Composed from VPC output
  subnet_ids   = module.vpc.private_subnet_ids        # Composed from VPC output

  kubernetes_version = "1.29"

  node_groups = {
    general = {
      instance_types = ["m6i.xlarge"]
      min_size       = 3
      max_size       = 20
      desired_size   = 5
    }
    spot = {
      instance_types = ["m6i.xlarge", "m5.xlarge"]
      min_size       = 0
      max_size       = 10
      desired_size   = 2
      capacity_type  = "SPOT"
    }
  }

  tags = local.common_tags
}

# Data Layer (depends on VPC)
module "rds" {
  source  = "git::https://github.com/org/terraform-modules.git//data/rds-postgresql?ref=v2.0.0"

  identifier = "tenant-a-prod"
  vpc_id     = module.vpc.vpc_id                      # Composed from VPC output
  subnet_ids = module.vpc.database_subnet_ids         # Composed from VPC output

  # Allow access from EKS nodes
  allowed_security_group_ids = [module.eks.node_security_group_id]  # Composed from EKS output

  engine_version    = "15.4"
  instance_class    = "db.r6i.xlarge"
  allocated_storage = 100
  multi_az          = true

  tags = local.common_tags
}

# Cache Layer (depends on VPC and EKS)
module "redis" {
  source  = "git::https://github.com/org/terraform-modules.git//data/elasticache-redis?ref=v1.5.0"

  cluster_id = "tenant-a-prod"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Allow access from EKS nodes
  allowed_security_group_ids = [module.eks.node_security_group_id]

  node_type              = "cache.r6g.large"
  num_cache_nodes        = 3
  automatic_failover     = true

  tags = local.common_tags
}

# Observability (depends on all above)
module "monitoring" {
  source  = "git::https://github.com/org/terraform-modules.git//observability/cloudwatch-stack?ref=v1.2.0"

  environment = "prod"
  tenant_id   = "tenant-a"

  eks_cluster_name = module.eks.cluster_id
  rds_identifier   = module.rds.identifier

  alert_email = "ops@tenant-a.com"

  tags = local.common_tags
}
```

### Composite Modules

For common patterns, provide composite modules that wire together base modules:

```hcl
# modules/composite/microservice-stack/main.tf

# This composite module creates a complete microservice deployment environment

module "vpc" {
  source = "../../networking/vpc"
  # ... configuration
}

module "eks" {
  source     = "../../compute/eks"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  # ... configuration
}

module "rds" {
  source     = "../../data/rds-postgresql"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]
  # ... configuration
}

module "redis" {
  source     = "../../data/elasticache-redis"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]
  # ... configuration
}

module "monitoring" {
  source           = "../../observability/cloudwatch-stack"
  eks_cluster_name = module.eks.cluster_id
  rds_identifier   = module.rds.identifier
  # ... configuration
}
```

### Module Testing Strategy

```go
// tests/integration/eks_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestEksModule(t *testing.T) {
    t.Parallel()

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../../modules/compute/eks/examples/basic",
        Vars: map[string]interface{}{
            "cluster_name": "test-cluster",
        },
    })

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Verify outputs
    clusterEndpoint := terraform.Output(t, terraformOptions, "cluster_endpoint")
    assert.Contains(t, clusterEndpoint, "eks.amazonaws.com")

    clusterSecurityGroupId := terraform.Output(t, terraformOptions, "cluster_security_group_id")
    assert.Regexp(t, "^sg-[a-f0-9]+$", clusterSecurityGroupId)
}
```

## Consequences

### Positive

- Modules are genuinely reusable across projects
- Clear contracts make integration predictable
- Independent testing catches issues early
- Versioning enables safe upgrades
- Composition allows building complex infrastructure from simple parts

### Negative

- More modules to maintain
- Users must understand composition patterns
- Interface changes can break consumers
- Requires good documentation

### Neutral

- Module registry required for version management
- CI/CD needed for module publishing
- Semantic versioning discipline required

## Module Catalog Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `networking` | Network infrastructure | vpc, transit-gateway, route53 |
| `compute` | Compute resources | eks, ecs, lambda, ec2-asg |
| `data` | Data stores | rds-postgresql, dynamodb, elasticache |
| `security` | Security resources | iam-roles, kms, waf, security-groups |
| `integration` | Integration services | api-gateway, eventbridge, sqs, sns |
| `observability` | Monitoring and logging | cloudwatch-alarms, dashboards, xray |
| `cicd` | CI/CD resources | codepipeline, codebuild, ecr |
| `composite` | Pre-composed patterns | microservice-stack, web-application |

## References

- [Terraform Module Best Practices](https://www.terraform.io/language/modules/develop)
- [Terratest](https://terratest.gruntwork.io/)
- [Semantic Versioning](https://semver.org/)

---

*ADR-005 | AWS DevOps Platform*
