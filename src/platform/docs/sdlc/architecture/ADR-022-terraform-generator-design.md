# ADR-022: Terraform Generator Design Pattern

**Status**: ACCEPTED
**Date**: 2026-02-03
**Deciders**: Architecture Team
**Related**: ARCH-20260203-0834

## Context

We need to generate production-ready Terraform code from 27 different AWS node types in the visual designer. Each node type has unique properties that map to specific Terraform resource attributes. The system must be extensible (easy to add new generators), consistent (all generators produce similar output structure), and maintainable.

## Decision

We will implement the Terraform Generator system using a combination of **Strategy Pattern** and **Template Method Pattern**:

### 1. Strategy Pattern for Generator Selection

```typescript
// GeneratorRegistry selects appropriate generator based on node type
const generator = registry.get(node.serviceType);
const output = generator.generate(node, context);
```

### 2. Template Method Pattern for Generation Workflow

```typescript
abstract class BaseGenerator<T> {
  // Template method - fixed workflow
  generate(node: T, context: GeneratorContext): GeneratorOutput {
    this.validateNode(node);                    // Step 1: Validate
    const deps = this.resolveDependencies();    // Step 2: Resolve deps
    return {
      mainTf: this.generateMainTF(node),        // Step 3: Generate main.tf
      variablesTf: this.generateVariablesTF(),  // Step 4: Generate variables.tf
      outputsTf: this.generateOutputsTF(),      // Step 5: Generate outputs.tf
      versionsTf: this.generateVersionsTF(),    // Step 6: Generate versions.tf
    };
  }

  // Abstract methods - implemented by subclasses
  protected abstract generateMainTF(node: T): string;
  protected abstract generateVariablesTF(): string;
  protected abstract generateOutputsTF(): string;
}
```

### 3. Builder Pattern for HCL Construction

```typescript
// Fluent API for building HCL blocks
const hcl = new HCLBuilder()
  .resource('aws_vpc', 'main')
    .attribute('cidr_block', 'var.cidr_block')
    .attribute('enable_dns_hostnames', true)
    .tags({ Name: 'var.vpc_name' })
  .build();
```

## Alternatives Considered

### Option A: Template-Based Generation (Rejected)

Use string templates (Handlebars/EJS) with variable substitution.

**Pros**:
- Simple to understand
- Easy to modify templates

**Cons**:
- Error-prone string manipulation
- Difficult to handle complex conditional logic
- No type safety
- Hard to validate output before rendering

### Option B: Direct String Concatenation (Rejected)

Build HCL strings directly in generator methods.

**Pros**:
- Maximum flexibility
- No additional dependencies

**Cons**:
- Inconsistent formatting
- Error-prone (missing quotes, brackets)
- Hard to maintain
- No structural validation

### Option C: AST-Based Generation (Deferred)

Use a proper HCL AST library to construct and serialize.

**Pros**:
- Perfect HCL syntax guaranteed
- Round-trip capability (parse and regenerate)

**Cons**:
- More complex implementation
- Performance overhead
- Overkill for our use case (one-way generation)

## Consequences

### Positive

1. **Consistent Output**: All generators produce identically structured modules
2. **Easy Extension**: Adding new generators requires implementing abstract methods only
3. **Type Safety**: TypeScript interfaces ensure correct property mapping
4. **Testability**: Each generator can be unit tested in isolation
5. **Maintainability**: Common logic in base class, specific logic in subclasses

### Negative

1. **Learning Curve**: Developers must understand the pattern hierarchy
2. **Abstraction Overhead**: Simple generators still need all methods implemented
3. **Debugging**: Errors in base class affect all generators

### Neutral

1. **Code Volume**: More classes/files than a simple approach
2. **Refactoring**: Changing base class affects all generators (can be positive or negative)

## Implementation Notes

### Generator Registration

```typescript
// Auto-registration using decorators
@RegisterGenerator('vpc')
class VPCGenerator extends BaseGenerator<VPCNodeData> { ... }

// Or explicit registration
GeneratorRegistry.getInstance().register('vpc', new VPCGenerator());
```

### Dependency Injection

```typescript
// Generators receive context, don't create their own dependencies
class EC2Generator extends BaseGenerator<EC2NodeData> {
  protected generateMainTF(node: EC2NodeData, context: GeneratorContext): string {
    // Use context.resolvedDependencies to reference other resources
    const sgRef = context.resolvedDependencies.get(node.securityGroupIds[0]);
    return `vpc_security_group_ids = [${sgRef.terraformReference}]`;
  }
}
```

## Validation

This decision will be validated by:

1. Successfully implementing all 27 generators
2. All generated HCL passing `terraform validate`
3. Achieving >85% test coverage
4. Generation performance <5s for 100-node designs

## References

- [Gang of Four Design Patterns](https://refactoring.guru/design-patterns)
- [HashiCorp Configuration Language](https://www.terraform.io/language)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
