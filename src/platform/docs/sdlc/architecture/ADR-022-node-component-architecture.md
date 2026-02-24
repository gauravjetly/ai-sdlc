# ADR-022: Node Component Architecture

**ID**: ADR-022
**Status**: Accepted
**Date**: 2026-02-02
**Author**: Architect Agent (Jets)
**SDLC**: SDLC-20260202-2330

---

## Context

The Vintiq Catalyst Visual Designer needs to support 20+ AWS service node components. We need to decide on the component architecture that:

1. Enables code reuse across node types
2. Maintains type safety
3. Supports extensibility for future services
4. Ensures consistent UI/UX across all nodes
5. Optimizes for performance with large canvases

## Decision

We will implement a **Plugin-Based Composition Architecture** with the following key decisions:

### 1. BaseNode Composition (Not Inheritance)

**Decision**: Use composition with a shared BaseNode component rather than class inheritance.

**Rationale**:
- React functional components work better with composition
- Easier to test individual pieces
- More flexible for customization
- Better TypeScript type inference

```typescript
// Composition approach
export const SecurityGroupNode = memo(function SecurityGroupNode(props: NodeProps<SecurityGroupNodeData>) {
  return (
    <BaseNode {...props} metadata={securityGroupMetadata}>
      {(data) => <SecurityGroupContent data={data} />}
    </BaseNode>
  );
});
```

### 2. Central Node Registry Pattern

**Decision**: Implement a singleton NodeRegistry that all nodes register with.

**Rationale**:
- Single source of truth for available nodes
- Easy to extend with new node types
- Enables dynamic node type discovery
- Supports runtime registration (plugins)

### 3. Typed Connection Handles

**Decision**: Use typed handles with a central validation system rather than free-form connections.

**Rationale**:
- Prevents invalid connections at design time
- Self-documenting connection rules
- Better error messages for users
- Enables intelligent connection suggestions

### 4. Property Panel Separation

**Decision**: Keep property editing in a separate panel (not inline) with node-specific property components.

**Rationale**:
- Keeps nodes visually clean
- More space for complex configurations
- Consistent editing experience
- Better mobile/tablet support

### 5. Terraform Generation via Strategy Pattern

**Decision**: Each node type has its own Terraform generator implementing a common interface.

**Rationale**:
- Encapsulates generation logic with node
- Easy to test individually
- Supports multiple output formats (Terraform, CloudFormation)
- Clear separation of concerns

## Consequences

### Positive

- High code reuse (>70% shared code in BaseNode)
- Type-safe connections prevent runtime errors
- Easy to add new node types (add files, register)
- Consistent user experience across all nodes
- Performance optimized with memo and virtualization

### Negative

- More boilerplate per node type
- Learning curve for new contributors
- Central registry is a potential bottleneck
- Property panels require more implementation effort

### Neutral

- Node-specific styling requires category color system
- Testing requires both unit and integration approaches
- Documentation needs to cover registry pattern

## Alternatives Considered

### 1. Class Inheritance

```typescript
class SecurityGroupNode extends AWSNode { ... }
```

**Rejected**: Doesn't work well with React functional components and hooks.

### 2. Higher-Order Components

```typescript
const SecurityGroupNode = withAWSNode(SecurityGroupNodeInner);
```

**Rejected**: Type inference is worse, harder to debug.

### 3. Schema-Driven Nodes

```typescript
const SecurityGroupNode = createNode(securityGroupSchema);
```

**Rejected**: Too rigid, harder to customize individual nodes.

## References

- React Composition vs Inheritance: https://reactjs.org/docs/composition-vs-inheritance.html
- ReactFlow Custom Nodes: https://reactflow.dev/docs/guides/custom-nodes/
- AWS Architecture Icons: https://aws.amazon.com/architecture/icons/
