# ADR-011: Frontend Architecture (React + Material-UI)

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Frontend

---

## Context

The Vintiq Catalyst Interactive Control Center requires a modern, enterprise-grade frontend architecture that supports:

- Complex multi-step workflows (deployment wizards)
- Real-time data updates (deployment progress, agent status)
- Multi-tenant user interfaces
- Enterprise SSO integration
- Accessibility compliance (WCAG 2.1 AA)
- Support for 10,000+ concurrent users
- Sub-200ms perceived response times

The current implementation uses React 18.2 with Material-UI 5.x, React Router 6, and local component state with useState/useEffect hooks.

## Decision

We will enhance the current React + Material-UI stack with the following architectural decisions:

### 1. State Management: Redux Toolkit + RTK Query

**Chosen**: Redux Toolkit with RTK Query for server state

**Rationale**:
- RTK Query provides automatic caching, invalidation, and optimistic updates
- Redux DevTools for debugging in enterprise environments
- Normalized cache prevents data duplication
- Built-in support for WebSocket subscriptions
- Strong TypeScript support

### 2. Component Architecture: Feature-Based Organization

**Chosen**: Feature-slice pattern with domain-driven design

```
features/
  deployments/
    components/     # UI components
    hooks/          # Custom hooks
    api.ts          # RTK Query endpoints
    slice.ts        # Redux slice
    types.ts        # TypeScript types
```

### 3. Form Management: React Hook Form + Zod

**Chosen**: React Hook Form with Zod validation

**Rationale**:
- Uncontrolled inputs for performance
- Schema-based validation with Zod
- Seamless integration with MUI components
- Excellent TypeScript inference

### 4. Real-time Updates: WebSocket + SSE Fallback

**Chosen**: Native WebSocket with automatic reconnection and SSE fallback

**Rationale**:
- Lower latency than polling (current 3-second interval)
- Reduced server load
- Automatic reconnection with exponential backoff
- SSE fallback for environments blocking WebSocket

### 5. Code Splitting: Route-based with React.lazy

**Chosen**: Route-level code splitting with prefetching

```typescript
const DeploymentWizard = lazy(() => import('./features/deployments/pages/Wizard'));
```

## Alternatives Considered

### State Management Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Redux Toolkit** | DevTools, middleware, normalized cache | Boilerplate | **Selected** |
| Zustand | Simple, small bundle | No DevTools, less ecosystem | Rejected |
| Jotai | Atomic, minimal boilerplate | Less mature for enterprise | Rejected |
| MobX | Reactive, less boilerplate | Different paradigm, learning curve | Rejected |
| React Query alone | Excellent server state | No client state management | Rejected |

### Component Library Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Material-UI 5** | Enterprise-ready, accessible, Vintiq styling | Large bundle | **Selected** |
| Chakra UI | Excellent DX, accessible | Less enterprise adoption | Rejected |
| Ant Design | Feature-rich | Chinese-centric design | Rejected |
| Radix + Tailwind | Maximum flexibility | High implementation effort | Rejected |

### Form Library Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **React Hook Form** | Performance, TypeScript | Learning curve | **Selected** |
| Formik | Popular, simple | Re-renders, bundle size | Rejected |
| Final Form | Subscription-based | Less maintained | Rejected |

## Consequences

### Positive

1. **Performance**: RTK Query caching reduces API calls by ~60%
2. **Developer Experience**: Feature-based organization improves code discovery
3. **Debugging**: Redux DevTools provide production-grade debugging
4. **Testing**: Isolated features are easier to test
5. **Scalability**: Code splitting keeps initial bundle under 200KB
6. **Real-time**: WebSocket reduces latency from 3 seconds to <100ms

### Negative

1. **Learning Curve**: Team needs Redux Toolkit training
2. **Bundle Size**: Redux adds ~15KB to bundle (mitigated by tree-shaking)
3. **Complexity**: More setup than simple useState

### Neutral

1. **Migration Effort**: 2-3 weeks to refactor existing components

## Implementation Plan

### Phase 1: Foundation (Week 1)
- Set up Redux store with RTK Query
- Configure feature slice structure
- Add error boundaries and loading states

### Phase 2: Migration (Weeks 2-3)
- Migrate existing pages to feature slices
- Implement WebSocket manager
- Add React Hook Form to wizards

### Phase 3: Optimization (Week 4)
- Implement code splitting
- Add service worker for offline support
- Performance testing and optimization

## Technical Specifications

### Bundle Size Targets

| Bundle | Max Size | Compression |
|--------|----------|-------------|
| Initial | 200KB | Brotli |
| Vendor | 150KB | Brotli |
| Per-feature | 50KB | Brotli |

### Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |

## References

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [RTK Query Guide](https://redux-toolkit.js.org/rtk-query/overview)
- [React Hook Form](https://react-hook-form.com/)
- [Material-UI Documentation](https://mui.com/)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
