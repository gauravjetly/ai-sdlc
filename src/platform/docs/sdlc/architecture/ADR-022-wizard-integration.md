# ADR-022: Wizard Integration Approach

**Status**: APPROVED
**Date**: 2026-02-02
**Deciders**: Architect Agent (Jets)
**Context**: SDLC-20260202-2108

## Context

The Infrastructure Designer needs to provide both a guided wizard experience for new users and a flexible visual designer for power users. We need to decide how these two interfaces interact.

## Decision Drivers

1. **User Experience**: New users need guidance, power users need flexibility
2. **State Consistency**: Both interfaces must show the same data
3. **Progressive Disclosure**: Start simple, allow complexity
4. **Code Reuse**: Avoid duplicating component logic

## Considered Options

### Option 1: Separate Pages (Modal Wizard)
- Wizard as a separate route/page
- User completes wizard, then redirected to designer
- No simultaneous access

**Pros**: Simple implementation, clear separation
**Cons**: Context switching, can't preview in designer while configuring

### Option 2: Wizard-as-Overlay (Drawer Pattern)
- Wizard opens as a drawer overlay on the designer
- Designer canvas visible but dimmed behind wizard
- Bidirectional sync between wizard and canvas

**Pros**: Preview while configuring, seamless transition, no context loss
**Cons**: More complex state management, potential UI clutter

### Option 3: Inline Wizard (Embedded Steps)
- Wizard steps embedded directly in designer UI
- Progress bar in header, steps in sidebar

**Pros**: Fully integrated experience
**Cons**: Complex layout, harder to maintain, mobile unfriendly

## Decision

**Selected: Option 2 - Wizard-as-Overlay (Drawer Pattern)**

The drawer pattern provides the best balance of guidance and flexibility:

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar                                                        │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │                             │
│                                   │      WIZARD DRAWER          │
│     VISUAL DESIGNER               │      (Overlay)              │
│     (Canvas - Dimmed)             │                             │
│                                   │   ┌─────────────────────┐  │
│     ┌─────────┐                   │   │ Step 1: VPC Config  │  │
│     │ VPC     │                   │   │ CIDR: [10.0.0.0/16] │  │
│     │ (auto)  │◄──────────────────┼───│ DNS:  [x] Enabled   │  │
│     └─────────┘                   │   │ ...                 │  │
│                                   │   └─────────────────────┘  │
│                                   │                             │
│                                   │   [Back] [Next: Subnets]   │
│                                   │                             │
└───────────────────────────────────┴─────────────────────────────┘
```

### Implementation Details

1. **Drawer Component**: Material UI Drawer with `variant="persistent"`
2. **Width**: 480px on desktop, full-screen on mobile
3. **Canvas Interaction**: Disabled while drawer open (view only)
4. **Real-time Sync**: Wizard changes immediately reflect on canvas
5. **Close Behavior**: Can close drawer anytime to inspect canvas

## Consequences

### Positive
- Users can see their infrastructure taking shape as they configure
- Power users can close wizard and work directly in canvas
- Reduces cognitive load by showing visual feedback
- Enables "guided then customized" workflow

### Negative
- Requires bidirectional state sync (Context handles this)
- Need to handle edge cases (closing mid-wizard, reopening)
- Canvas rendering must be performant even when dimmed

### Risks
- State desync between wizard and canvas (Mitigation: single source of truth in Context)
- Performance with many nodes (Mitigation: virtualization, lazy rendering)

## Related Decisions
- ADR-023: State Management Strategy (defines how state is shared)
- ADR-024: Layer Dependency Graph (defines layer navigation)

## Notes
- Implement wizard drawer as a separate component that receives context
- Add keyboard shortcut (Esc) to toggle drawer
- Consider tour/onboarding mode that highlights canvas elements
