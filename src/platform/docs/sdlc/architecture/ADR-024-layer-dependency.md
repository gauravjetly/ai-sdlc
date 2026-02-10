# ADR-024: Layer Dependency Graph

**Status**: APPROVED
**Date**: 2026-02-02
**Deciders**: Architect Agent (Jets)
**Context**: SDLC-20260202-2108

## Context

The Infrastructure Designer organizes resources into three layers:
1. **Network Layer**: VPC, subnets, security groups, gateways
2. **Platform Layer**: EKS, RDS, ElastiCache, load balancers
3. **DevOps Layer**: CI/CD, monitoring, secrets, logging

These layers have dependencies - Platform resources need Network resources to exist, and DevOps resources need Platform resources. We need to enforce this ordering in the UI and deployment process.

## Decision Drivers

1. **Deployment Order**: AWS resources must be created in dependency order
2. **User Guidance**: Prevent users from configuring out-of-order
3. **Terraform Modules**: Module references must be valid
4. **Rollback Safety**: Changes to lower layers may require upper layer rollback

## Considered Options

### Option 1: Strict Sequential (Locked Progression)
- Users must complete Layer N before accessing Layer N+1
- Cannot revisit completed layers without rollback

**Pros**: Guaranteed valid state, simple logic
**Cons**: Inflexible, frustrating for experienced users

### Option 2: Soft Dependencies (Warnings Only)
- Users can access any layer anytime
- Validation warnings if dependencies missing
- Deployment enforces order

**Pros**: Flexible, power-user friendly
**Cons**: Confusing validation messages, potential for invalid designs

### Option 3: Progressive Unlock with Edit Access
- Layers unlock progressively as previous layer completes
- Completed layers remain editable
- Editing lower layer triggers revalidation of upper layers

**Pros**: Balance of guidance and flexibility
**Cons**: Complex revalidation logic

## Decision

**Selected: Option 3 - Progressive Unlock with Edit Access**

### Layer State Machine

```
                    NETWORK LAYER
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
    │ PENDING │───►│ COMPLETE  │───►│DEPLOYED │
    └─────────┘    └───────────┘    └─────────┘
                         │
                    UNLOCKS
                         │
                         ▼
                   PLATFORM LAYER
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
    │ PENDING │───►│ COMPLETE  │───►│DEPLOYED │
    └─────────┘    └───────────┘    └─────────┘
                         │
                    UNLOCKS
                         │
                         ▼
                    DEVOPS LAYER
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
    │ PENDING │───►│ COMPLETE  │───►│DEPLOYED │
    └─────────┘    └───────────┘    └─────────┘
```

### Dependency Rules

```typescript
interface LayerDependency {
  layer: LayerType;
  requiredLayers: LayerType[];
  requiredStatus: 'complete' | 'deployed';
}

const LAYER_DEPENDENCIES: LayerDependency[] = [
  {
    layer: 'network',
    requiredLayers: [],
    requiredStatus: 'complete',
  },
  {
    layer: 'platform',
    requiredLayers: ['network'],
    requiredStatus: 'complete', // Network must be at least complete
  },
  {
    layer: 'devops',
    requiredLayers: ['platform'],
    requiredStatus: 'complete', // Platform must be at least complete
  },
];

// For deployment, stricter requirements
const DEPLOYMENT_DEPENDENCIES: LayerDependency[] = [
  {
    layer: 'network',
    requiredLayers: [],
    requiredStatus: 'deployed',
  },
  {
    layer: 'platform',
    requiredLayers: ['network'],
    requiredStatus: 'deployed', // Network must be deployed before platform deploy
  },
  {
    layer: 'devops',
    requiredLayers: ['platform'],
    requiredStatus: 'deployed', // Platform must be deployed before devops deploy
  },
];
```

### Edit Impact Detection

When a lower layer is edited after upper layers are configured:

```typescript
interface EditImpact {
  editedLayer: LayerType;
  affectedLayers: LayerType[];
  brokenReferences: ResourceReference[];
  requiredActions: ImpactAction[];
}

function detectEditImpact(
  editedLayer: LayerType,
  change: LayerChange,
  design: Design
): EditImpact {
  const affectedLayers = getUpperLayers(editedLayer);
  const brokenReferences: ResourceReference[] = [];

  for (const layer of affectedLayers) {
    const layerData = design.layers[layer];
    for (const node of layerData.nodes) {
      for (const ref of node.references) {
        if (ref.targetLayer === editedLayer) {
          if (isReferenceInvalid(ref, change)) {
            brokenReferences.push(ref);
          }
        }
      }
    }
  }

  return {
    editedLayer,
    affectedLayers,
    brokenReferences,
    requiredActions: brokenReferences.length > 0
      ? [{ type: 'REVALIDATE_UPPER_LAYERS' }]
      : [],
  };
}
```

### UI Behavior

| Scenario | Behavior |
|----------|----------|
| Network incomplete | Platform tab disabled with tooltip "Complete Network layer first" |
| Platform incomplete | DevOps tab disabled with tooltip |
| Edit Network (Platform complete) | Show warning dialog: "Platform layer may need updates" |
| Edit Network (Platform deployed) | Show warning dialog: "Platform layer will need redeployment" |
| Deploy Platform (Network not deployed) | Error: "Deploy Network layer first" |

### Terraform Module References

```hcl
# platform/main.tf
module "network" {
  source = "../network"
  # Network layer is deployed first, outputs available
}

resource "aws_eks_cluster" "main" {
  vpc_config {
    subnet_ids = module.network.private_subnet_ids  # Reference network output
    security_group_ids = [module.network.eks_security_group_id]
  }
}

# devops/main.tf
module "platform" {
  source = "../platform"
}

resource "aws_cloudwatch_dashboard" "main" {
  # Reference platform outputs
  dashboard_body = jsonencode({
    widgets = [{
      properties = {
        metrics = [["AWS/EKS", "cluster_status", "ClusterName", module.platform.eks_cluster_name]]
      }
    }]
  })
}
```

## Consequences

### Positive
- Clear progression path for new users
- Experienced users can still edit any layer
- Terraform module references always valid at deployment time
- Rollback considerations built into the model

### Negative
- Revalidation logic adds complexity
- Users may be confused by "impact" warnings
- Need to track reference graph between layers

### Mitigation
- Clear UI indicators for layer status
- Impact warnings show specific affected resources
- "Fix References" wizard to help resolve breaks

## Related Decisions
- ADR-022: Wizard Integration Approach
- ADR-023: State Management Strategy

## Notes
- Store layer dependency metadata in `DesignLayer.dependsOn` array
- Layer status transitions are atomic (all-or-nothing validation)
- Consider adding "dependency inspector" panel in advanced mode
