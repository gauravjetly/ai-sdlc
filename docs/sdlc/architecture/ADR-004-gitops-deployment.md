# ADR-004: GitOps-First Kubernetes Deployment

## Status
Accepted (Revised)

## Date
2026-01-29 (Original)
2026-01-29 (Revised - Pipeline-Agnostic Pivot)

## Context

The platform requires a Kubernetes deployment strategy that ensures consistency, auditability, and reliability across all environments. Originally, we selected ArgoCD as the sole GitOps tool. User feedback indicates:

- **Tool diversity**: Some teams prefer Flux over ArgoCD
- **Fallback needs**: Teams need non-GitOps options for certain scenarios
- **Learning curve**: Different organizations have different levels of GitOps maturity
- **Architecture preferences**: ArgoCD (centralized) vs Flux (distributed)

### Original Options Considered

1. **ArgoCD only** - Centralized GitOps with rich UI (original choice)
2. **Flux only** - Distributed GitOps, Kubernetes-native
3. **Helm push** - Traditional push-based deployment
4. **kubectl apply** - Direct manifest application

### Revised Approach

Implement a **GitOps-First** strategy with **multiple deployment adapters**, prioritizing ArgoCD and Flux while supporting Helm and kubectl as alternatives.

## Decision

We will implement **GitOps-First Kubernetes Deployment** using adapters for multiple deployment tools:

| Deployment Tool | Priority | Method | Use Case |
|----------------|----------|--------|----------|
| **ArgoCD** | Primary (GitOps) | Pull | Teams wanting rich UI, centralized management |
| **Flux** | Primary (GitOps) | Pull | Multi-tenant clusters, distributed control |
| **Helm** | Alternative | Push | Complex charts, air-gapped environments |
| **kubectl** | Fallback | Push | Simple deployments, debugging, emergency |

### Core Principles

1. **GitOps by Default**: New deployments use ArgoCD or Flux
2. **Git as Source of Truth**: All configuration stored in Git
3. **Declarative Configuration**: Desired state, not imperative commands
4. **Continuous Reconciliation**: Automatic drift detection and correction
5. **Adapter Flexibility**: Teams can use their preferred tool

## Rationale

### Why GitOps-First

| Criterion | GitOps (ArgoCD/Flux) | Push (Helm/kubectl) |
|-----------|---------------------|---------------------|
| Auditability | Excellent (Git history) | Requires extra logging |
| Drift detection | Automatic, continuous | Manual or none |
| Rollback | Git revert | Manual intervention |
| Credential exposure | Minimal (pull model) | Higher (push model) |
| Disaster recovery | Apply from Git | Requires backup/restore |
| Consistency | Guaranteed | Depends on discipline |

### ArgoCD vs Flux Comparison

| Feature | ArgoCD | Flux |
|---------|--------|------|
| **Architecture** | Centralized controller | Distributed controllers |
| **UI** | Rich built-in web UI | CLI + optional web UIs |
| **Multi-cluster** | Built-in, excellent | Via Kustomizations |
| **Helm Support** | Native | Via Helm Controller |
| **Image Automation** | Via Image Updater | Built-in |
| **RBAC** | Fine-grained, custom | Kubernetes RBAC |
| **Notifications** | Built-in | Via Notification Controller |
| **Resource Footprint** | ~500MB RAM | ~200MB RAM |
| **Best For** | Teams wanting rich UI, visibility | GitOps purists, multi-tenant |

### Trade-offs Accepted

- **GitOps Learning Curve**: Teams must adopt GitOps practices
- **Sync Delays**: Pull model has inherent delay (typically 1-5 minutes)
- **Secret Management**: Requires External Secrets or Sealed Secrets
- **Emergency Changes**: Must go through Git (mitigated by emergency process)

## Implementation

### Kubernetes Deploy Interface

```typescript
// adapters/kubernetes/interface.ts

export interface KubernetesDeployInput {
  cluster: string;
  namespace: string;
  manifests: ManifestSource;
  image?: string;
  strategy: DeploymentStrategy;
  canary?: CanaryConfig;
}

export interface ManifestSource {
  type: 'git' | 'inline' | 'helm-repo';
  repo?: string;
  path?: string;
  chart?: string;
  values?: Record<string, unknown>;
}

export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate';

export interface KubernetesDeployOutput {
  status: 'success' | 'failed' | 'in_progress' | 'rolled_back';
  serviceUrls: string[];
  revision: string;
  rollbackRevision?: string;
}

export interface KubernetesDeployAdapter {
  readonly name: string;
  readonly version: string;
  readonly method: 'gitops' | 'push';

  initialize(config: AdapterConfig): Promise<void>;
  validate(input: KubernetesDeployInput): Promise<ValidationResult>;
  deploy(input: KubernetesDeployInput): Promise<KubernetesDeployOutput>;
  rollback(revision: string): Promise<KubernetesDeployOutput>;
  getStatus(namespace: string): Promise<DeploymentStatus>;
  waitForReady(timeout: number): Promise<boolean>;

  // GitOps-specific (ArgoCD/Flux only)
  sync?(): Promise<SyncResult>;
  refresh?(): Promise<void>;
}
```

### ArgoCD Adapter Implementation

```typescript
// adapters/kubernetes/argocd/adapter.ts

export class ArgoCDAdapter implements KubernetesDeployAdapter {
  readonly name = 'argocd';
  readonly version = '2.9.0';
  readonly method = 'gitops' as const;

  private client: ArgoClient;

  async initialize(config: AdapterConfig): Promise<void> {
    this.client = new ArgoClient({
      server: config.argoServer,
      token: config.argoToken,
      insecure: config.insecure || false
    });
  }

  async deploy(input: KubernetesDeployInput): Promise<KubernetesDeployOutput> {
    // Create or update ArgoCD Application
    const app = await this.client.upsertApplication({
      metadata: {
        name: `${input.namespace}-app`,
        namespace: 'argocd'
      },
      spec: {
        project: 'default',
        source: {
          repoURL: input.manifests.repo,
          targetRevision: 'HEAD',
          path: input.manifests.path,
          kustomize: input.image ? {
            images: [input.image]
          } : undefined
        },
        destination: {
          server: input.cluster,
          namespace: input.namespace
        },
        syncPolicy: {
          automated: {
            prune: true,
            selfHeal: true
          },
          syncOptions: [
            'CreateNamespace=true',
            'PruneLast=true',
            'ApplyOutOfSyncOnly=true'
          ]
        }
      }
    });

    // Trigger immediate sync
    await this.sync();

    // Wait for healthy state
    const ready = await this.waitForReady(300);

    return {
      status: ready ? 'success' : 'failed',
      serviceUrls: await this.getServiceUrls(input.namespace),
      revision: app.status?.sync?.revision || 'unknown'
    };
  }

  async sync(): Promise<SyncResult> {
    return this.client.syncApplication();
  }

  async refresh(): Promise<void> {
    return this.client.refreshApplication();
  }

  async rollback(revision: string): Promise<KubernetesDeployOutput> {
    await this.client.rollback(revision);
    return this.getDeploymentStatus();
  }
}
```

### Flux Adapter Implementation

```typescript
// adapters/kubernetes/flux/adapter.ts

export class FluxAdapter implements KubernetesDeployAdapter {
  readonly name = 'flux';
  readonly version = '2.2.0';
  readonly method = 'gitops' as const;

  private k8s: KubernetesClient;

  async initialize(config: AdapterConfig): Promise<void> {
    this.k8s = new KubernetesClient(config.kubeconfig);
  }

  async deploy(input: KubernetesDeployInput): Promise<KubernetesDeployOutput> {
    // Create GitRepository source
    await this.k8s.apply({
      apiVersion: 'source.toolkit.fluxcd.io/v1',
      kind: 'GitRepository',
      metadata: {
        name: `${input.namespace}-repo`,
        namespace: 'flux-system'
      },
      spec: {
        interval: '1m',
        url: input.manifests.repo,
        ref: { branch: 'main' }
      }
    });

    // Create Kustomization
    await this.k8s.apply({
      apiVersion: 'kustomize.toolkit.fluxcd.io/v1',
      kind: 'Kustomization',
      metadata: {
        name: `${input.namespace}-kustomization`,
        namespace: 'flux-system'
      },
      spec: {
        interval: '5m',
        path: input.manifests.path,
        prune: true,
        sourceRef: {
          kind: 'GitRepository',
          name: `${input.namespace}-repo`
        },
        targetNamespace: input.namespace,
        images: input.image ? [{
          name: '*',
          newName: input.image.split(':')[0],
          newTag: input.image.split(':')[1]
        }] : undefined,
        healthChecks: [
          {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: input.namespace,
            namespace: input.namespace
          }
        ]
      }
    });

    // Trigger reconciliation
    await this.sync();

    const ready = await this.waitForReady(300);

    return {
      status: ready ? 'success' : 'failed',
      serviceUrls: await this.getServiceUrls(input.namespace),
      revision: await this.getCurrentRevision()
    };
  }

  async sync(): Promise<SyncResult> {
    // Annotate to trigger immediate reconciliation
    await this.k8s.annotate(
      'kustomizations',
      `${this.namespace}-kustomization`,
      'flux-system',
      { 'reconcile.fluxcd.io/requestedAt': new Date().toISOString() }
    );
    return { status: 'syncing' };
  }
}
```

### Helm Adapter (Push-based Alternative)

```typescript
// adapters/kubernetes/helm/adapter.ts

export class HelmAdapter implements KubernetesDeployAdapter {
  readonly name = 'helm';
  readonly version = '3.14.0';
  readonly method = 'push' as const;

  async deploy(input: KubernetesDeployInput): Promise<KubernetesDeployOutput> {
    const args = [
      'upgrade', '--install',
      input.namespace,
      input.manifests.chart || input.manifests.path,
      '--namespace', input.namespace,
      '--create-namespace',
      '--wait',
      '--timeout', '10m'
    ];

    if (input.image) {
      args.push('--set', `image.repository=${input.image.split(':')[0]}`);
      args.push('--set', `image.tag=${input.image.split(':')[1]}`);
    }

    if (input.manifests.values) {
      args.push('-f', await this.writeValuesFile(input.manifests.values));
    }

    await this.exec('helm', args);

    return {
      status: 'success',
      serviceUrls: await this.getServiceUrls(input.namespace),
      revision: await this.getHelmRevision(input.namespace)
    };
  }

  async rollback(revision: string): Promise<KubernetesDeployOutput> {
    await this.exec('helm', ['rollback', this.releaseName, revision]);
    return this.getDeploymentStatus();
  }
}
```

### GitOps Repository Structure

```
k8s-configs/
+-- services/
|   +-- api-gateway/
|   |   +-- base/
|   |   |   +-- deployment.yaml
|   |   |   +-- service.yaml
|   |   |   +-- kustomization.yaml
|   |   +-- overlays/
|   |       +-- dev/
|   |       |   +-- kustomization.yaml
|   |       |   +-- patches/
|   |       +-- test/
|   |       +-- uat/
|   |       +-- prod/
|   +-- user-service/
|   +-- order-service/
|
+-- infrastructure/
|   +-- namespaces/
|   +-- network-policies/
|   +-- resource-quotas/
|
+-- argocd-apps/                  # ArgoCD Application definitions
|   +-- applicationset.yaml
|
+-- flux-configs/                 # Flux Kustomization definitions
    +-- clusters/
        +-- dev/
        +-- prod/
```

### ArgoCD ApplicationSet Configuration

```yaml
# argocd-apps/applicationset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - list:
              elements:
                - service: api-gateway
                - service: user-service
                - service: order-service
          - list:
              elements:
                - env: dev
                  cluster: https://kubernetes.default.svc
                  autoSync: true
                - env: test
                  cluster: https://test-cluster.example.com
                  autoSync: true
                - env: uat
                  cluster: https://uat-cluster.example.com
                  autoSync: false   # Manual approval
                - env: prod
                  cluster: https://prod-cluster.example.com
                  autoSync: false   # Manual approval

  template:
    metadata:
      name: '{{service}}-{{env}}'
      labels:
        service: '{{service}}'
        environment: '{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/k8s-configs.git
        targetRevision: HEAD
        path: 'services/{{service}}/overlays/{{env}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{service}}'
      syncPolicy:
        automated:
          prune: '{{autoSync}}'
          selfHeal: '{{autoSync}}'
        syncOptions:
          - CreateNamespace=true
          - PruneLast=true
          - ServerSideApply=true
      ignoreDifferences:
        - group: apps
          kind: Deployment
          jsonPointers:
            - /spec/replicas   # Ignore HPA-managed replicas
```

### Workflow DSL Usage

```yaml
# Platform workflow using GitOps deployment
stages:
  - name: deploy-kubernetes
    type: kubernetes-deploy
    adapter: "{{ inputs.k8s_deploy_method }}"  # argocd, flux, helm, kubectl
    method: gitops
    inputs:
      cluster: "${stages.provision-infrastructure.outputs.eks_endpoint}"
      namespace: "{{ inputs.service_name }}-{{ inputs.environment }}"
      manifests:
        source: git
        repo: "https://github.com/org/k8s-configs"
        path: "services/{{ inputs.service_name }}/overlays/{{ inputs.environment }}"
      image: "${stages.build-container.outputs.image_uri}"
      strategy: "{{ inputs.environment == 'prod' ? 'canary' : 'rolling' }}"
```

## Consequences

### Positive

- GitOps provides complete audit trail via Git history
- Automatic drift detection and self-healing
- Easy rollback by reverting Git commits
- Consistent deployments across environments
- Reduced credential exposure (pull-based model)
- Disaster recovery is as simple as applying from Git
- Teams can choose their preferred GitOps tool

### Negative

- Learning curve for teams new to GitOps
- Sync delay (typically 1-5 minutes)
- Cannot make ad-hoc changes without going through Git
- Requires secret management solution (External Secrets, Sealed Secrets)

### Neutral

- ArgoCD recommended for teams wanting rich UI
- Flux recommended for multi-tenant or distributed setups
- Helm and kubectl available for specific use cases
- Emergency process allows bypassing normal flow

## Emergency Change Process

For urgent production fixes that cannot wait for normal GitOps flow:

1. Create branch from main with `[EMERGENCY]` prefix
2. Make minimal fix commit
3. Create PR with single approver (normally requires 2)
4. Merge triggers ArgoCD/Flux sync within 3 minutes
5. **OR** use Helm/kubectl adapter for immediate push deployment
6. Create follow-up ticket for proper fix and review

## Migration Path

For teams currently using push-based deployments:

1. **Week 1-2**: Install ArgoCD or Flux, configure repositories
2. **Week 3-4**: Migrate dev environment to GitOps
3. **Week 5-6**: Migrate test/uat environments
4. **Week 7-8**: Migrate production with careful monitoring
5. **Ongoing**: Keep Helm adapter available as fallback

## References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Flux Documentation](https://fluxcd.io/docs/)
- [GitOps Principles](https://opengitops.dev/)
- [External Secrets Operator](https://external-secrets.io/)

---

*ADR-004 (Revised) | AWS DevOps Platform - Pipeline-Agnostic Architecture*
