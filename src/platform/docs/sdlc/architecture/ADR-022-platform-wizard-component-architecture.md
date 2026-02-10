# ADR-022: Platform Wizard Component Architecture

**Status**: Accepted
**Date**: 2026-02-02
**Author**: Architect (Jets) Agent

## Context

We need to build a Platform Architect Wizard that follows the existing patterns established by the Network Architect Wizard while introducing new capabilities for IAM, Compute, Database, and Storage configuration.

## Decision

We will follow the same architectural patterns as the Network Architect Wizard:

1. **Single Orchestrator Component**: `PlatformArchitectWizard.tsx` manages all step state
2. **Dedicated Step Components**: One component per wizard step
3. **Shared UI Components**: Reuse existing FormField, TagsEditor, StepActions
4. **Dedicated Validation Hook**: `usePlatformValidation.ts` for platform-specific validation
5. **Type-Safe Configuration**: Full TypeScript types in `platform.ts`

### Component Structure

```
wizard/
├── roles/
│   └── PlatformArchitectWizard.tsx  (orchestrator)
├── steps/
│   └── platform/
│       ├── IAMRolesPoliciesStep.tsx
│       ├── ComputeServicesStep.tsx
│       ├── DatabaseServicesStep.tsx
│       ├── StorageServicesStep.tsx
│       └── PlatformValidationStep.tsx
└── hooks/
    └── usePlatformValidation.ts
```

## Rationale

- **Consistency**: Following Network Wizard patterns reduces learning curve
- **Maintainability**: Single orchestrator simplifies state management
- **Testability**: Separate components are easier to unit test
- **Reusability**: Shared components reduce code duplication

## Consequences

### Positive
- Developers familiar with Network Wizard can quickly understand Platform Wizard
- State management is centralized and predictable
- Components can be developed and tested independently

### Negative
- Some code duplication between wizard orchestrators
- Large step components may need further decomposition

## Alternatives Considered

1. **Form Library (React Hook Form)**: Would add complexity for dynamic IAM policies
2. **State Machine (XState)**: Overkill for 5-step linear wizard
3. **Monolithic Component**: Would be hard to maintain and test
