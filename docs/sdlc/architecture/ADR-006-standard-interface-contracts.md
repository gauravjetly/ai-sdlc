# ADR-006: Standard Interface Contracts

## Status
Accepted

## Date
2026-01-29

## Context

The pipeline-agnostic DevOps platform uses adapters for multiple tools (IaC, Kubernetes deployment, container builds, etc.). For adapters to be truly interchangeable, they must all adhere to the same input/output contracts. Without standardized interfaces:

- Adapters may have incompatible inputs/outputs
- Switching adapters requires workflow changes
- Testing becomes inconsistent
- New adapter development lacks clear requirements

### Problem Statement

How do we ensure that:
1. All adapters for a given stage type are interchangeable?
2. Workflows don't need modification when switching adapters?
3. Adapter developers have clear implementation requirements?
4. Interface evolution is managed without breaking existing adapters?

## Decision

We will implement **Versioned Standard Interface Contracts** for each stage type, defined using JSON Schema with TypeScript bindings. All adapters must implement these contracts to be registered in the platform.

### Contract Structure

| Stage Type | Interface Version | Adapters |
|------------|-------------------|----------|
| **infrastructure** | v1.0.0 | terraform, pulumi, crossplane, cloudformation |
| **kubernetes-deploy** | v1.0.0 | argocd, flux, helm, kubectl |
| **container-build** | v1.0.0 | docker, kaniko, buildpacks |
| **security-scan** | v1.0.0 | trivy, checkov, snyk |
| **verification** | v1.0.0 | health-check, smoke-test, integration-test |

## Rationale

### Why Versioned Contracts

1. **Interchangeability**: Any adapter implementing a contract version can replace another
2. **Clear Requirements**: Adapter developers know exactly what to implement
3. **Evolution Management**: New versions don't break existing adapters
4. **Testing**: Contracts enable standardized adapter testing
5. **Documentation**: Contracts serve as authoritative interface documentation

### Contract Design Principles

1. **Minimal Required Fields**: Only truly essential fields are required
2. **Extensible**: Optional fields for advanced features
3. **Backward Compatible**: New versions must support old inputs
4. **Self-Documenting**: Descriptions embedded in schema
5. **Validated**: Runtime validation ensures compliance

## Implementation

### Contract Definition Format

Each contract is defined in three formats:
1. **JSON Schema**: For validation
2. **TypeScript Interface**: For type safety
3. **YAML Documentation**: For human readability

### Infrastructure Stage Contract (v1.0.0)

**JSON Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://platform.devops/schemas/infrastructure-v1.0.0.json",
  "title": "Infrastructure Stage Interface",
  "description": "Standard interface for infrastructure provisioning adapters",
  "type": "object",

  "definitions": {
    "input": {
      "type": "object",
      "required": ["provider", "resources"],
      "properties": {
        "provider": {
          "type": "string",
          "enum": ["aws", "azure", "gcp"],
          "description": "Cloud provider to provision resources in"
        },
        "resources": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/definitions/resourceDefinition"
          },
          "description": "List of resources to provision"
        },
        "stateBackend": {
          "$ref": "#/definitions/stateBackendConfig",
          "description": "State storage configuration (adapter-specific)"
        },
        "variables": {
          "type": "object",
          "additionalProperties": true,
          "description": "Variables to pass to the provisioning"
        },
        "tags": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "description": "Tags to apply to all resources"
        }
      }
    },

    "resourceDefinition": {
      "type": "object",
      "required": ["type", "config"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["vpc", "eks", "ecs", "rds", "s3", "lambda", "dynamodb", "elasticache", "alb", "waf"],
          "description": "Resource type to provision"
        },
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$",
          "description": "Logical name for the resource"
        },
        "config": {
          "type": "object",
          "description": "Resource-specific configuration"
        },
        "dependencies": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Names of resources this depends on"
        }
      }
    },

    "stateBackendConfig": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["s3", "gcs", "azureblob", "kubernetes", "local"]
        },
        "bucket": { "type": "string" },
        "prefix": { "type": "string" },
        "lockTable": { "type": "string" }
      }
    },

    "output": {
      "type": "object",
      "required": ["resourceIds", "endpoints"],
      "properties": {
        "resourceIds": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "description": "Map of resource names to their IDs"
        },
        "endpoints": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "description": "Map of resource names to their endpoints/URLs"
        },
        "metadata": {
          "type": "object",
          "additionalProperties": true,
          "description": "Additional metadata from the provisioning"
        },
        "stateLocation": {
          "type": "string",
          "description": "Location where state is stored"
        }
      }
    }
  }
}
```

**TypeScript Interface:**

```typescript
// interfaces/contracts/infrastructure.ts

export interface InfrastructureInput {
  provider: 'aws' | 'azure' | 'gcp';
  resources: ResourceDefinition[];
  stateBackend?: StateBackendConfig;
  variables?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface ResourceDefinition {
  type: ResourceType;
  name?: string;
  config: Record<string, unknown>;
  dependencies?: string[];
}

export type ResourceType =
  | 'vpc' | 'eks' | 'ecs' | 'rds' | 's3'
  | 'lambda' | 'dynamodb' | 'elasticache' | 'alb' | 'waf';

export interface StateBackendConfig {
  type: 's3' | 'gcs' | 'azureblob' | 'kubernetes' | 'local';
  bucket?: string;
  prefix?: string;
  lockTable?: string;
}

export interface InfrastructureOutput {
  resourceIds: Record<string, string>;
  endpoints: Record<string, string>;
  metadata?: Record<string, unknown>;
  stateLocation?: string;
}

export interface InfrastructureAdapter {
  readonly name: string;
  readonly version: string;
  readonly contractVersion: '1.0.0';
  readonly supportedProviders: string[];

  initialize(config: AdapterConfig): Promise<void>;
  validate(input: InfrastructureInput): Promise<ValidationResult>;
  plan(input: InfrastructureInput): Promise<PlanResult>;
  apply(input: InfrastructureInput): Promise<InfrastructureOutput>;
  destroy(input: InfrastructureInput): Promise<void>;
  detectDrift(): Promise<DriftReport>;
  getState(): Promise<StateInfo>;
}
```

### Kubernetes Deploy Stage Contract (v1.0.0)

**JSON Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://platform.devops/schemas/kubernetes-deploy-v1.0.0.json",
  "title": "Kubernetes Deploy Stage Interface",
  "description": "Standard interface for Kubernetes deployment adapters",
  "type": "object",

  "definitions": {
    "input": {
      "type": "object",
      "required": ["cluster", "manifests"],
      "properties": {
        "cluster": {
          "type": "string",
          "description": "Kubernetes cluster endpoint or context name"
        },
        "namespace": {
          "type": "string",
          "default": "default",
          "pattern": "^[a-z][a-z0-9-]*$",
          "description": "Target namespace for deployment"
        },
        "manifests": {
          "$ref": "#/definitions/manifestSource",
          "description": "Source of Kubernetes manifests"
        },
        "image": {
          "type": "string",
          "description": "Container image to deploy (overrides manifest image)"
        },
        "strategy": {
          "type": "string",
          "enum": ["rolling", "blue-green", "canary", "recreate"],
          "default": "rolling",
          "description": "Deployment strategy"
        },
        "canary": {
          "$ref": "#/definitions/canaryConfig",
          "description": "Canary deployment configuration"
        },
        "timeout": {
          "type": "integer",
          "default": 300,
          "description": "Deployment timeout in seconds"
        }
      }
    },

    "manifestSource": {
      "type": "object",
      "required": ["source"],
      "properties": {
        "source": {
          "type": "string",
          "enum": ["git", "inline", "helm-repo"],
          "description": "Source type for manifests"
        },
        "repo": {
          "type": "string",
          "format": "uri",
          "description": "Git repository or Helm repo URL"
        },
        "path": {
          "type": "string",
          "description": "Path within repository to manifests"
        },
        "chart": {
          "type": "string",
          "description": "Helm chart name"
        },
        "values": {
          "type": "object",
          "additionalProperties": true,
          "description": "Values to pass to Helm or Kustomize"
        },
        "targetRevision": {
          "type": "string",
          "default": "HEAD",
          "description": "Git branch, tag, or commit"
        }
      }
    },

    "canaryConfig": {
      "type": "object",
      "properties": {
        "steps": {
          "type": "array",
          "items": { "type": "integer", "minimum": 1, "maximum": 100 },
          "description": "Traffic percentage steps (e.g., [10, 25, 50, 100])"
        },
        "interval": {
          "type": "string",
          "pattern": "^[0-9]+[smh]$",
          "description": "Time between steps (e.g., '5m')"
        },
        "analysis": {
          "type": "object",
          "properties": {
            "metrics": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Metrics conditions (e.g., 'error_rate < 1%')"
            }
          }
        }
      }
    },

    "output": {
      "type": "object",
      "required": ["status", "revision"],
      "properties": {
        "status": {
          "type": "string",
          "enum": ["success", "failed", "in_progress", "rolled_back"],
          "description": "Deployment status"
        },
        "serviceUrls": {
          "type": "array",
          "items": { "type": "string", "format": "uri" },
          "description": "URLs of deployed services"
        },
        "revision": {
          "type": "string",
          "description": "Deployed revision (Git SHA or release version)"
        },
        "rollbackRevision": {
          "type": "string",
          "description": "Previous revision for rollback"
        }
      }
    }
  }
}
```

**TypeScript Interface:**

```typescript
// interfaces/contracts/kubernetes-deploy.ts

export interface KubernetesDeployInput {
  cluster: string;
  namespace?: string;
  manifests: ManifestSource;
  image?: string;
  strategy?: DeploymentStrategy;
  canary?: CanaryConfig;
  timeout?: number;
}

export interface ManifestSource {
  source: 'git' | 'inline' | 'helm-repo';
  repo?: string;
  path?: string;
  chart?: string;
  values?: Record<string, unknown>;
  targetRevision?: string;
}

export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate';

export interface CanaryConfig {
  steps?: number[];
  interval?: string;
  analysis?: {
    metrics?: string[];
  };
}

export interface KubernetesDeployOutput {
  status: 'success' | 'failed' | 'in_progress' | 'rolled_back';
  serviceUrls?: string[];
  revision: string;
  rollbackRevision?: string;
}

export interface KubernetesDeployAdapter {
  readonly name: string;
  readonly version: string;
  readonly contractVersion: '1.0.0';
  readonly method: 'gitops' | 'push';

  initialize(config: AdapterConfig): Promise<void>;
  validate(input: KubernetesDeployInput): Promise<ValidationResult>;
  deploy(input: KubernetesDeployInput): Promise<KubernetesDeployOutput>;
  rollback(revision: string): Promise<KubernetesDeployOutput>;
  getStatus(namespace: string): Promise<DeploymentStatus>;
  waitForReady(timeout: number): Promise<boolean>;

  // GitOps-specific (optional)
  sync?(): Promise<SyncResult>;
  refresh?(): Promise<void>;
}
```

### Container Build Stage Contract (v1.0.0)

**TypeScript Interface:**

```typescript
// interfaces/contracts/container-build.ts

export interface ContainerBuildInput {
  source: string;              // Git ref or local path
  dockerfile?: string;         // Dockerfile path (default: ./Dockerfile)
  context?: string;            // Build context (default: .)
  registry: string;            // Container registry URL
  imageName: string;           // Image name
  tags: string[];              // Image tags
  buildArgs?: Record<string, string>;
  target?: string;             // Multi-stage build target
  platform?: string;           // Target platform (e.g., linux/amd64)
  cache?: CacheConfig;
}

export interface CacheConfig {
  enabled: boolean;
  type?: 'registry' | 'local' | 'gha';
  location?: string;
}

export interface ContainerBuildOutput {
  imageUri: string;            // Full image URI with tag
  imageDigest: string;         // Image SHA256 digest
  manifest?: string;           // Image manifest
  buildTime: number;           // Build duration in seconds
}

export interface ContainerBuildAdapter {
  readonly name: string;
  readonly version: string;
  readonly contractVersion: '1.0.0';
  readonly supportedPlatforms: string[];

  initialize(config: AdapterConfig): Promise<void>;
  validate(input: ContainerBuildInput): Promise<ValidationResult>;
  build(input: ContainerBuildInput): Promise<ContainerBuildOutput>;
  push(imageUri: string): Promise<void>;
}
```

### Contract Registry

```typescript
// interfaces/registry.ts

export interface ContractRegistry {
  // Get contract schema
  getSchema(stageType: string, version: string): JSONSchema;

  // Validate input against contract
  validateInput(stageType: string, version: string, input: unknown): ValidationResult;

  // Validate output against contract
  validateOutput(stageType: string, version: string, output: unknown): ValidationResult;

  // Check adapter compatibility
  isAdapterCompatible(adapter: Adapter, contractVersion: string): boolean;

  // List available contracts
  listContracts(): ContractInfo[];

  // Get contract changelog
  getChangelog(stageType: string): VersionChange[];
}

export interface ContractInfo {
  stageType: string;
  currentVersion: string;
  supportedVersions: string[];
  adapters: string[];
}
```

### Version Evolution Rules

When evolving contracts:

1. **Patch Version (1.0.x)**: Bug fixes, documentation updates only
2. **Minor Version (1.x.0)**: New optional fields, backward compatible
3. **Major Version (x.0.0)**: Breaking changes, requires adapter updates

```yaml
# Version compatibility matrix
infrastructure:
  "1.0.0":
    adapters: [terraform@1.x, pulumi@1.x, crossplane@1.x, cloudformation@1.x]
  "1.1.0":  # Adds optional 'dryRun' field
    adapters: [terraform@1.2+, pulumi@1.1+, crossplane@1.1+, cloudformation@1.1+]
    backward_compatible: true

kubernetes-deploy:
  "1.0.0":
    adapters: [argocd@1.x, flux@1.x, helm@1.x, kubectl@1.x]
```

### Adapter Compliance Testing

```typescript
// testing/contract-compliance.ts

export class ContractComplianceTest {
  async testAdapter(
    adapter: Adapter,
    stageType: string,
    contractVersion: string
  ): Promise<ComplianceReport> {
    const contract = this.registry.getSchema(stageType, contractVersion);

    const results: TestResult[] = [];

    // Test 1: Adapter declares correct contract version
    results.push(await this.testContractDeclaration(adapter, contractVersion));

    // Test 2: Validate method accepts valid inputs
    for (const validInput of this.getValidInputs(stageType)) {
      results.push(await this.testValidInput(adapter, validInput));
    }

    // Test 3: Validate method rejects invalid inputs
    for (const invalidInput of this.getInvalidInputs(stageType)) {
      results.push(await this.testInvalidInput(adapter, invalidInput));
    }

    // Test 4: Output conforms to contract
    results.push(await this.testOutputConformance(adapter, stageType));

    // Test 5: Required methods implemented
    results.push(await this.testRequiredMethods(adapter, stageType));

    return {
      adapter: adapter.name,
      contractVersion,
      passed: results.every(r => r.passed),
      results
    };
  }
}
```

## Consequences

### Positive

- Clear contracts enable adapter interchangeability
- Workflows work unchanged when switching adapters
- New adapter development has clear requirements
- Automated compliance testing ensures quality
- Version management prevents breaking changes

### Negative

- Contract evolution requires careful coordination
- Some adapter-specific features may not fit contracts
- Initial contract design requires significant effort
- Adapters must implement full contract interface

### Neutral

- Contracts published to platform documentation
- Breaking changes require deprecation period
- Adapter developers can extend beyond contracts
- Contract compliance is enforced at registration

## References

- [JSON Schema Specification](https://json-schema.org/)
- [Semantic Versioning](https://semver.org/)
- [API Design Guidelines](https://cloud.google.com/apis/design)

---

*ADR-006 | AWS DevOps Platform - Pipeline-Agnostic Architecture*
