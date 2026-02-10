# ADR-003: Workflow Abstraction with Pipeline Engine Adapters

## Status
Accepted (Revised)

## Date
2026-01-29 (Original)
2026-01-29 (Revised - Pipeline-Agnostic Pivot)

## Context

The platform requires a workflow orchestration system that executes complex DevOps pipelines for provisioning, deployment, scaling, and operations. Originally, we selected AWS Step Functions with Lambda for tight AWS integration. However, user feedback indicates:

- **Kubernetes-native preference**: Many teams prefer Argo Workflows for K8s-native execution
- **GitHub ecosystem**: Teams using GitHub prefer GitHub Actions for tight integration
- **Portability concerns**: Organizations want to avoid pipeline vendor lock-in
- **Tool familiarity**: Different teams have expertise in different pipeline tools

### Original Options Considered

1. **Lambda + Step Functions** - Serverless functions orchestrated by state machines (original choice)
2. **ECS Tasks** - Containerized workers triggered by events
3. **Kubernetes Jobs** - K8s-native batch processing
4. **Argo Workflows** - Cloud-native workflow engine for Kubernetes
5. **GitHub Actions** - GitHub-integrated CI/CD

### Revised Approach

Implement a **Workflow Abstraction Layer** with a platform-native DSL that **transpiles** to multiple pipeline engines.

## Decision

We will implement a **Workflow Abstraction Layer** using a platform-native DSL that transpiles to supported pipeline engines:

| Pipeline Engine | Priority | Use Case |
|----------------|----------|----------|
| **Argo Workflows** | Primary | Kubernetes-native teams, complex DAGs, artifact management |
| **GitHub Actions** | Secondary | GitHub-centric teams, simpler workflows, marketplace integrations |

### Core Principles

1. **Write Once, Run Anywhere**: Users define workflows in platform DSL, run on any supported engine
2. **Adapter Pattern**: Each pipeline engine has a transpiler adapter
3. **Standard Interfaces**: Common input/output contracts across all engines
4. **Engine Selection**: Users choose engine based on environment or preference

## Rationale

### Why Argo Workflows as Primary

| Criterion | Argo Workflows | GitHub Actions | Step Functions |
|-----------|----------------|----------------|----------------|
| Kubernetes-native | Yes | No | No |
| Complex DAGs | Excellent | Good | Good |
| Artifact passing | Built-in | Via artifacts | Via S3 |
| Container-native | Yes | Yes | Requires Lambda |
| Self-hosted | Yes | Optional | No (AWS only) |
| Open source | Yes | No | No |
| Visual debugging | Yes | Yes | Yes |
| Cost model | K8s resources | Per-minute | Per-transition |

### Why GitHub Actions as Secondary

- Tight GitHub integration for source-to-deployment
- Large marketplace of reusable actions
- Familiar to most developers
- Good for simpler workflows and GitHub-centric organizations

### Workflow Abstraction Benefits

1. **No Vendor Lock-in**: Switch engines without rewriting workflows
2. **Team Flexibility**: Teams choose their preferred engine
3. **Unified Monitoring**: Platform monitors all engines uniformly
4. **Progressive Migration**: Move from one engine to another gradually
5. **Best Tool for Job**: Use different engines for different workflows

### Trade-offs Accepted

- **Transpiler Complexity**: Must maintain transpilers for each engine
- **Feature Subset**: DSL supports intersection of engine capabilities
- **Debugging**: May need to understand transpiled output for debugging
- **Latency**: Transpilation adds small overhead

## Implementation

### Platform Workflow DSL

```yaml
# Platform-native workflow definition
apiVersion: platform.devops/v1
kind: Workflow
metadata:
  name: deploy-microservice
  version: "1.0.0"

spec:
  # Engine selection (can be overridden at runtime)
  engine:
    primary: argo-workflows
    fallback: github-actions

  inputs:
    - name: service_name
      type: string
      required: true
    - name: environment
      type: enum
      values: [dev, test, uat, prod]

  stages:
    - name: build
      type: container-build
      adapter: docker
      inputs:
        source: "${git.ref}"
        image_name: "${inputs.service_name}"

    - name: test
      type: test
      parallel: true
      steps:
        - name: unit-tests
          command: "npm test"
        - name: integration-tests
          command: "npm run test:integration"

    - name: deploy
      type: kubernetes-deploy
      adapter: argocd
      depends_on: [build, test]
      inputs:
        cluster: "${env.cluster}"
        image: "${stages.build.outputs.image_uri}"
```

### Transpiler Architecture

```
+-----------------------------------------------------------------------------------+
|                           WORKFLOW ABSTRACTION LAYER                               |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +----------------+     +------------------+     +--------------------+            |
|  | WORKFLOW DSL   | --> |   AST PARSER     | --> |  VALIDATION ENGINE |            |
|  | (YAML/JSON)    |     |                  |     |  (Schema + Logic)  |            |
|  +----------------+     +------------------+     +--------------------+            |
|                                                           |                        |
|                                                           v                        |
|                                            +------------------------------+        |
|                                            |    ABSTRACT SYNTAX TREE      |        |
|                                            |    (Platform-agnostic)       |        |
|                                            +------------------------------+        |
|                                                           |                        |
|                                  +------------------------+------------------------+|
|                                  |                                                 ||
|                                  v                                                 v|
|                    +------------------------+                   +------------------------+
|                    |   ARGO WORKFLOWS       |                   |   GITHUB ACTIONS       |
|                    |   TRANSPILER           |                   |   TRANSPILER           |
|                    |                        |                   |                        |
|                    | - DAG builder          |                   | - Job builder          |
|                    | - Template generator   |                   | - Matrix generator     |
|                    | - Artifact mapper      |                   | - Action mapper        |
|                    | - Parameter resolver   |                   | - Secrets mapper       |
|                    +------------------------+                   +------------------------+
|                                  |                                                 |
|                                  v                                                 v
|                    +------------------------+                   +------------------------+
|                    |   Argo Workflow YAML   |                   |   GHA Workflow YAML    |
|                    |   (K8s CRD)            |                   |   (.github/workflows)  |
|                    +------------------------+                   +------------------------+
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

### Argo Workflows Transpiler Output

```yaml
# Transpiled from platform DSL to Argo Workflows
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: deploy-microservice-
spec:
  entrypoint: main
  arguments:
    parameters:
      - name: service_name
      - name: environment

  templates:
    - name: main
      dag:
        tasks:
          - name: build
            template: container-build
            arguments:
              parameters:
                - name: image_name
                  value: "{{workflow.parameters.service_name}}"

          - name: unit-tests
            template: run-tests
            arguments:
              parameters:
                - name: command
                  value: "npm test"

          - name: integration-tests
            template: run-tests
            arguments:
              parameters:
                - name: command
                  value: "npm run test:integration"

          - name: deploy
            dependencies: [build, unit-tests, integration-tests]
            template: k8s-deploy
            arguments:
              parameters:
                - name: image
                  value: "{{tasks.build.outputs.parameters.image_uri}}"

    - name: container-build
      inputs:
        parameters:
          - name: image_name
      container:
        image: platform/build-adapter:latest
        args: ["--adapter=docker", "--image={{inputs.parameters.image_name}}"]
      outputs:
        parameters:
          - name: image_uri
            valueFrom:
              path: /tmp/outputs/image_uri

    - name: run-tests
      inputs:
        parameters:
          - name: command
      container:
        image: node:20
        command: ["/bin/sh", "-c"]
        args: ["{{inputs.parameters.command}}"]

    - name: k8s-deploy
      inputs:
        parameters:
          - name: image
      container:
        image: platform/k8s-deploy-adapter:latest
        args: ["--adapter=argocd", "--image={{inputs.parameters.image}}"]
```

### GitHub Actions Transpiler Output

```yaml
# Transpiled from platform DSL to GitHub Actions
name: deploy-microservice

on:
  workflow_dispatch:
    inputs:
      service_name:
        description: 'Service name'
        required: true
      environment:
        description: 'Environment'
        type: choice
        options: [dev, test, uat, prod]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image_uri: ${{ steps.build.outputs.image_uri }}
    steps:
      - uses: actions/checkout@v4
      - name: Build Container
        id: build
        uses: platform/build-adapter-action@v1
        with:
          adapter: docker
          image_name: ${{ inputs.service_name }}

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Unit Tests
        run: npm test

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Integration Tests
        run: npm run test:integration

  deploy:
    needs: [build, unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        uses: platform/k8s-deploy-adapter-action@v1
        with:
          adapter: argocd
          image: ${{ needs.build.outputs.image_uri }}
```

### Engine Selection Logic

```typescript
// transpiler/engine-selector.ts

export class EngineSelector {
  selectEngine(workflow: Workflow, context: ExecutionContext): PipelineEngine {
    // 1. Explicit override
    if (context.engineOverride) {
      return context.engineOverride;
    }

    // 2. Environment-based selection
    if (context.environment === 'kubernetes') {
      return 'argo-workflows';
    }

    // 3. Repository-based selection
    if (context.repository?.provider === 'github') {
      return 'github-actions';
    }

    // 4. Workflow preference
    if (workflow.spec.engine?.primary) {
      return workflow.spec.engine.primary;
    }

    // 5. Organization default
    return context.organization?.defaultEngine || 'argo-workflows';
  }
}
```

### Adapter Container Images

Each adapter runs as a container in the pipeline:

```dockerfile
# Dockerfile for infrastructure adapter
FROM alpine:3.19

# Install all supported IaC tools
RUN apk add --no-cache \
    terraform \
    nodejs npm \
    python3 py3-pip

# Install Pulumi
RUN curl -fsSL https://get.pulumi.com | sh

# Install adapter runtime
COPY adapter-runtime /usr/local/bin/
COPY adapters/ /opt/adapters/

ENTRYPOINT ["adapter-runtime"]
```

## Consequences

### Positive

- Users write workflows once, run on any supported engine
- Teams choose their preferred pipeline engine
- No vendor lock-in for pipeline orchestration
- Platform provides unified monitoring across engines
- New engines can be added as transpiler adapters

### Negative

- Transpiler complexity and maintenance
- DSL limited to common features across engines
- Debugging may require understanding transpiled output
- Initial learning curve for platform DSL

### Neutral

- Argo Workflows is the recommended default for K8s environments
- GitHub Actions recommended for GitHub-centric workflows
- Step Functions retained for internal platform orchestration
- Transpilation happens at workflow submission time

## Comparison with Original Decision

| Aspect | Original (Step Functions) | Revised (Abstraction Layer) |
|--------|---------------------------|----------------------------|
| Engine | AWS Step Functions only | Argo Workflows + GitHub Actions |
| Lock-in | AWS-specific | Engine-agnostic |
| K8s Support | Limited | Native (Argo) |
| User Choice | None | Full engine selection |
| Complexity | Lower | Higher (but more flexible) |

## References

- [Argo Workflows Documentation](https://argoproj.github.io/argo-workflows/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Patterns](https://workflowpatterns.com/)

---

*ADR-003 (Revised) | AWS DevOps Platform - Pipeline-Agnostic Architecture*
