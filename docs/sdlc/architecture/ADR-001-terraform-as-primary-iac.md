# ADR-001: Multi-IaC Tool Support with Adapter Pattern

## Status
Accepted (Revised)

## Date
2026-01-29 (Original)
2026-01-29 (Revised - Pipeline-Agnostic Pivot)

## Context

The AWS DevOps Platform requires Infrastructure as Code (IaC) capabilities to define, provision, and manage cloud resources. Originally, we considered selecting a single primary IaC tool. However, user feedback and enterprise requirements indicate that organizations have diverse tool preferences based on:

- **Team expertise**: Some teams are proficient in Terraform, others in Pulumi or CloudFormation
- **Cloud provider alignment**: AWS-native teams prefer CloudFormation
- **Kubernetes-native requirements**: Teams running everything on K8s prefer Crossplane
- **Language preferences**: Developer-centric teams prefer Pulumi's programmatic approach

### Original Options Considered

1. **Terraform** - HashiCorp's declarative IaC tool (original primary choice)
2. **AWS CloudFormation** - AWS-native IaC service
3. **AWS CDK** - Programmatic infrastructure using familiar languages
4. **Pulumi** - Multi-language IaC with state management
5. **Crossplane** - Kubernetes-native infrastructure provisioning

### Revised Approach

Instead of selecting a single tool, implement an **adapter pattern** that supports multiple IaC tools through a common interface.

## Decision

We will implement **Multi-IaC Tool Support** using the **Adapter Pattern**, allowing users to choose their preferred infrastructure provisioning tool while maintaining a consistent platform interface.

### Supported Tools

| Tool | Priority | Use Case |
|------|----------|----------|
| **Terraform** | Supported | General-purpose, large ecosystem, mature |
| **Pulumi** | Supported | Developer-friendly, programmatic, type-safe |
| **Crossplane** | Supported | Kubernetes-native, GitOps-friendly, continuous reconciliation |
| **CloudFormation** | Supported | AWS-native, deep AWS integration, no external state |

## Rationale

### Why Multi-IaC Support

| Criterion | Single Tool | Multi-IaC with Adapters |
|-----------|-------------|------------------------|
| Team flexibility | Low | High |
| Learning curve | Single | Per-team choice |
| Migration path | Requires migration | Use existing expertise |
| Tool evolution | Locked in | Adapt to new tools |
| Enterprise adoption | Resistance | Easier buy-in |
| Maintenance | Lower | Higher (but manageable) |

### Adapter Pattern Benefits

1. **User Choice**: Teams use tools they know and prefer
2. **Consistent Interface**: Platform provides uniform input/output contracts regardless of tool
3. **Incremental Adoption**: Organizations can standardize over time if desired
4. **Future-Proof**: New IaC tools can be added as adapters
5. **Testing Isolation**: Each adapter is independently testable

### Trade-offs Accepted

- **Increased Complexity**: Must maintain multiple adapters
- **Feature Parity Challenges**: Not all tools support identical features
- **Documentation Burden**: Must document each adapter's specifics
- **Testing Matrix**: More combinations to test

## Implementation

### Standard Infrastructure Interface

```typescript
// adapters/infrastructure/interface.ts

export interface InfrastructureInput {
  provider: 'aws' | 'azure' | 'gcp';
  resources: ResourceDefinition[];
  stateBackend?: StateBackendConfig;
  variables?: Record<string, unknown>;
}

export interface InfrastructureOutput {
  resourceIds: Record<string, string>;
  endpoints: Record<string, string>;
  metadata: Record<string, unknown>;
  stateLocation?: string;
}

export interface InfrastructureAdapter {
  readonly name: string;
  readonly version: string;
  readonly supportedProviders: string[];

  initialize(config: AdapterConfig): Promise<void>;
  validate(input: InfrastructureInput): Promise<ValidationResult>;
  plan(input: InfrastructureInput): Promise<PlanResult>;
  apply(input: InfrastructureInput): Promise<InfrastructureOutput>;
  destroy(input: InfrastructureInput): Promise<void>;
  detectDrift(): Promise<DriftReport>;
}
```

### Adapter Implementation Structure

```
adapters/
+-- infrastructure/
    +-- interface.ts              # Common interface
    +-- terraform/
    |   +-- adapter.ts            # Terraform implementation
    |   +-- state-manager.ts      # S3 + DynamoDB state
    |   +-- module-resolver.ts    # Module registry integration
    +-- pulumi/
    |   +-- adapter.ts            # Pulumi implementation
    |   +-- stack-manager.ts      # Pulumi stack operations
    |   +-- program-generator.ts  # Generate Pulumi programs
    +-- crossplane/
    |   +-- adapter.ts            # Crossplane implementation
    |   +-- composition-builder.ts # Build XR compositions
    |   +-- claim-manager.ts      # Manage resource claims
    +-- cloudformation/
        +-- adapter.ts            # CloudFormation implementation
        +-- stack-manager.ts      # CFN stack operations
        +-- template-generator.ts # Generate CFN templates
```

### Adapter Configuration

```yaml
# Platform configuration for IaC tool selection
apiVersion: platform.devops/v1
kind: IaCConfiguration
metadata:
  name: organization-defaults

spec:
  # Default selection rules
  selection_rules:
    - condition: "team.preference == 'terraform'"
      adapter: terraform
    - condition: "team.preference == 'native' && cloud == 'aws'"
      adapter: cloudformation
    - condition: "kubernetes_native == true"
      adapter: crossplane
    - condition: "team.language in ['python', 'typescript', 'go']"
      adapter: pulumi
    - default: terraform

  # Adapter-specific configurations
  adapters:
    terraform:
      version: ">=1.6.0"
      state_backend:
        type: s3
        bucket: "${org}-terraform-state"
        dynamodb_table: "terraform-locks"

    pulumi:
      version: ">=3.0.0"
      backend:
        type: s3
        bucket: "${org}-pulumi-state"

    crossplane:
      version: ">=1.14.0"
      providers:
        - name: provider-aws
          version: ">=0.47.0"

    cloudformation:
      capabilities:
        - CAPABILITY_IAM
        - CAPABILITY_NAMED_IAM
```

### Workflow DSL Usage

```yaml
# Users specify adapter in workflow definition
stages:
  - name: provision-infrastructure
    type: infrastructure
    adapter: "{{ inputs.iac_tool }}"  # terraform, pulumi, crossplane, cloudformation
    inputs:
      provider: aws
      resources:
        - type: vpc
          config:
            cidr: "10.0.0.0/16"
        - type: eks
          config:
            version: "1.29"
```

### Tool-Specific Considerations

#### Terraform
- State stored in S3 with DynamoDB locking
- Uses platform module registry
- Supports import and state manipulation

#### Pulumi
- State stored in S3 or Pulumi Cloud
- Generates TypeScript/Python programs
- Type-safe resource definitions

#### Crossplane
- State managed in Kubernetes cluster
- Continuous reconciliation (GitOps-native)
- Compositions for complex resources

#### CloudFormation
- State managed by AWS
- StackSets for multi-account deployment
- Native AWS service integration

## Consequences

### Positive

- Teams can use their preferred IaC tool
- Easier enterprise adoption with existing tooling
- Platform remains tool-agnostic
- Can add new tools without platform changes
- Each adapter can optimize for its tool's strengths

### Negative

- Must maintain multiple adapters
- Feature parity may vary between adapters
- More complex testing requirements
- Documentation must cover all adapters

### Neutral

- Default to Terraform if no preference specified
- Adapters versioned independently
- Cross-adapter resource references require careful design

## Migration from Original Decision

If previously using Terraform-only:

1. Existing Terraform modules continue to work
2. Terraform adapter is the default
3. Other adapters are additive, not replacing
4. Teams can gradually adopt alternative tools

## References

- [Terraform Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [Pulumi AWS Provider](https://www.pulumi.com/registry/packages/aws/)
- [Crossplane AWS Provider](https://marketplace.upbound.io/providers/upbound/provider-aws)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)

---

*ADR-001 (Revised) | AWS DevOps Platform - Pipeline-Agnostic Architecture*
