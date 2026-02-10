# ADR-023: State Management Strategy

**Status**: APPROVED
**Date**: 2026-02-02
**Deciders**: Architect Agent (Jets)
**Context**: SDLC-20260202-2108

## Context

The Infrastructure Designer has complex state requirements:
- Workflow state (current layer, step, completion status)
- Design data (nodes, edges, positions)
- Layer data (network config, platform config, devops config)
- Environment configs (dev, staging, prod overrides)
- UI state (loading, saving, errors)

We need a state management solution that handles this complexity while remaining maintainable.

## Decision Drivers

1. **Complexity**: Multiple related state slices that need to stay in sync
2. **Performance**: Avoid unnecessary re-renders with large node counts
3. **Persistence**: State must sync to backend for durability
4. **Developer Experience**: Easy to understand and debug
5. **Bundle Size**: Minimize client-side dependencies

## Considered Options

### Option 1: Redux Toolkit
- Industry standard for complex state
- DevTools for debugging
- Middleware for side effects

**Pros**: Powerful, well-documented, team familiarity
**Cons**: Boilerplate, overkill for this scope, adds bundle size

### Option 2: Zustand
- Lightweight state management
- Simple API, minimal boilerplate
- Good TypeScript support

**Pros**: Simple, performant, small bundle
**Cons**: Less structured than Redux, fewer debugging tools

### Option 3: React Context + useReducer
- Built into React, no external deps
- Familiar patterns
- Full control over implementation

**Pros**: No dependencies, customizable, React-native patterns
**Cons**: Requires manual optimization, no built-in DevTools

### Option 4: TanStack Query + Context
- TanStack Query for server state
- Context for UI state only
- Clear separation of concerns

**Pros**: Excellent server sync, caching, background updates
**Cons**: Learning curve, potential over-engineering

## Decision

**Selected: Option 3 - React Context + useReducer with Custom Hooks**

Given the specific requirements of the Infrastructure Designer:
1. State is primarily UI-driven with periodic server sync
2. We already have Prisma backend for persistence
3. Team is familiar with React patterns
4. Bundle size matters for performance

### Implementation Architecture

```typescript
// State structure
interface DesignWizardState {
  workflow: WorkflowState;
  design: DesignState;
  layers: LayersState;
  environments: EnvironmentsState;
  ui: UIState;
}

// Reducer actions
type DesignWizardAction =
  | { type: 'INIT_WORKFLOW'; payload: { workflow: Workflow; design: Design } }
  | { type: 'SET_CURRENT_LAYER'; payload: LayerType }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_LAYER_DATA'; payload: { layer: LayerType; data: Partial<LayerData> } }
  | { type: 'UPDATE_DESIGN_DATA'; payload: Partial<DesignData> }
  | { type: 'ADD_NODE'; payload: DesignNode }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<DesignNode> } }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'SET_ENVIRONMENT'; payload: Environment }
  | { type: 'UPDATE_ENVIRONMENT_CONFIG'; payload: { env: Environment; config: Partial<EnvironmentConfig> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: ValidationError[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'MARK_LAYER_COMPLETE'; payload: LayerType }
  | { type: 'MARK_LAYER_DEPLOYED'; payload: LayerType };

// Context Provider
const DesignWizardContext = createContext<DesignWizardContextValue | null>(null);

// Custom hook with memoized selectors
function useDesignWizard() {
  const context = useContext(DesignWizardContext);
  if (!context) throw new Error('useDesignWizard must be used within DesignWizardProvider');
  return context;
}

// Selective subscriptions for performance
function useCurrentLayer() {
  const { workflow } = useDesignWizard();
  return workflow.currentLayer;
}

function useLayerData(layer: LayerType) {
  const { layers } = useDesignWizard();
  return layers[layer];
}
```

### Performance Optimizations

1. **Context Splitting**: Separate contexts for rarely-changing state
```typescript
// Workflow context (changes rarely)
const WorkflowContext = createContext<WorkflowState>(null);

// Design context (changes frequently)
const DesignContext = createContext<DesignState>(null);
```

2. **Memoized Selectors**: Use useMemo for derived state
```typescript
const networkNodes = useMemo(
  () => designData.nodes.filter(n => n.layer === 'network'),
  [designData.nodes]
);
```

3. **Debounced Persistence**: Auto-save with 500ms debounce
```typescript
const debouncedSave = useMemo(
  () => debounce(saveToServer, 500),
  [saveToServer]
);

useEffect(() => {
  if (hasChanges) {
    debouncedSave(state);
  }
}, [state, hasChanges]);
```

## Consequences

### Positive
- No additional dependencies
- Full control over optimization
- Familiar patterns for React developers
- Easy to understand state flow
- Testable with standard React testing tools

### Negative
- Manual optimization required (we've addressed this above)
- No built-in DevTools (can use React DevTools)
- More code than Zustand/Redux Toolkit

### Migration Path
If complexity grows beyond Context capabilities:
1. Add Zustand for global state
2. Keep Context for component-local state
3. Migration is straightforward due to similar patterns

## Related Decisions
- ADR-022: Wizard Integration Approach (consumer of this state)
- ADR-024: Layer Dependency Graph (uses layer state)

## Notes
- Create `contexts/DesignWizardContext.tsx` as single source of truth
- All state mutations go through dispatch
- Async actions (API calls) handled in custom hooks, not in reducer
- Consider adding React Query for server state caching in future
