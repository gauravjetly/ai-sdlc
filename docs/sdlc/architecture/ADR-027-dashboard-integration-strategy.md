# ADR-027: Dashboard Integration Strategy

**Date**: 2026-02-10
**Status**: PROPOSED
**Deciders**: Jets (Architect Agent)
**Context**: ARCH-20260210-DASHBOARD-INTEGRATION

---

## Context

The AI-SDLC platform has two separate React applications that provide dashboard functionality:

1. **Main Dashboard** (`dashboard/index.html`) -- A 7,800-line single-file React application using embedded Babel transforms, served by a custom Node.js HTTP server on port 3030. It uses the Vintiq Harmony Design System with Figtree typography and CSS custom properties.

2. **Platform Webapp** (`src/platform/webapp/`) -- A modern Vite + React 18 + TypeScript + Material-UI 5 application served on port 3001. It contains two high-value components that need to be integrated into the main dashboard:
   - `MultiProjectDashboard` (scheduling/orchestration, 700+ lines)
   - `ToolAdoptionDashboard` (analytics, 500+ lines with sub-components)

Users currently must navigate to two different browser tabs to access all features. We need a unified experience at a single URL.

### Key Constraints

- The main dashboard is a single HTML file with inline React components (not a build-tooling-based project)
- The platform webapp uses TypeScript, Material-UI, and modern build tooling (Vite)
- The components use different design systems (Harmony vs Catalyst/Material-UI)
- Both applications have different API backend dependencies
- No authentication system exists (local development tool)
- AWS deployment is the eventual production target

---

## Decision

**Adopt a Reverse Proxy + Styled iframe hybrid approach.**

The main dashboard server at port 3030 will:
1. Continue serving its own HTML, APIs, and SSE as-is
2. Proxy requests prefixed with `/platform/*` to the Vite dev server at port 3001
3. Proxy requests prefixed with `/api/v1/*` to the platform API at port 3000
4. Embed platform webapp views in iframes within the main dashboard's content area
5. Use postMessage for cross-frame communication (theme sync, navigation)

The platform webapp will:
1. Detect an `?embed=true` query parameter
2. When embedded, hide its own sidebar and header, rendering only content
3. Listen for postMessage events from the parent for theme synchronization

---

## Alternatives Considered

### Option 1: Raw iframe Embedding (Without Proxy)

**Description**: Embed `http://localhost:3001/scheduling` directly in an iframe.

**Pros**:
- Simplest implementation
- Zero server changes

**Cons**:
- Cross-origin issues: `localhost:3030` embedding `localhost:3001` creates cross-origin iframes
- postMessage requires explicit origin whitelisting
- Cookies/localStorage not shared
- Vite HMR WebSocket connections may be blocked
- Browser security features (SameSite cookies, COEP) may interfere

**Rejected because**: Cross-origin complications introduce unnecessary fragility for what should be a simple integration.

### Option 2: Component Migration (Copy Components to Main Dashboard)

**Description**: Convert TypeScript components to JavaScript and embed them directly in `index.html`.

**Pros**:
- Single codebase, single deployment
- No iframes, no proxy
- Identical styling possible

**Cons**:
- Material-UI library (~1MB) would need to be loaded via CDN into the main dashboard
- TypeScript to JavaScript conversion loses type safety
- Material-UI styles would conflict with Harmony CSS
- Components depend on MUI ThemeProvider, `useTheme()`, `useMediaQuery()`, etc.
- Sub-components (MetricsStrip, ToolCard, InsightsPanel) have deep MUI integration
- Would need to duplicate and maintain two versions of every component
- React 18 Babel transform in the main dashboard does not support JSX fragments and other modern patterns used by the components

**Rejected because**: Material-UI and the existing Harmony CSS are incompatible. The migration effort would be enormous, error-prone, and create a maintenance nightmare.

### Option 3: Micro-Frontend with Module Federation

**Description**: Use Webpack Module Federation or Vite's federation plugin to share components at runtime.

**Pros**:
- True component sharing without iframes
- Independent builds and deployments
- Shared dependencies (React, Material-UI)

**Cons**:
- The main dashboard does NOT use a build system (raw HTML + Babel CDN) -- Module Federation requires both host and remote to use Webpack/Vite
- Would require completely restructuring the main dashboard to use a build system
- Complex configuration for shared dependency management
- Overkill for 2 embedded views
- Runtime errors when shared dependencies are incompatible

**Rejected because**: The main dashboard does not have a build system, which is a hard prerequisite for Module Federation. Retrofitting one would be a project in itself.

### Option 4: Full Component Port + API Proxy

**Description**: Rewrite the two dashboard components in the main dashboard's inline React style, with Harmony CSS instead of Material-UI.

**Pros**:
- Perfectly consistent UI
- No iframe quirks
- Single application

**Cons**:
- 1,200+ lines of TypeScript + Material-UI to rewrite in plain JSX + CSS
- Every Material-UI component (`Table`, `Dialog`, `Chip`, `Tooltip`, `Tabs`, etc.) must be replaced with hand-coded equivalents
- Sub-components (MetricsStrip, ToolCard, InsightsPanel) also need porting
- Future updates to the original components require manual sync
- Doubles the maintenance surface area

**Rejected because**: The effort-to-value ratio is poor. Material-UI provides rich functionality (accessibility, responsive design, theme-aware styling) that would need to be hand-coded.

### Option 5: Pure Reverse Proxy Routing (Different Pages)

**Description**: Use the dashboard server to route `/scheduling` directly to the platform webapp as a full-page navigation.

**Pros**:
- Clean URLs
- No iframe overhead

**Cons**:
- User leaves the main dashboard entirely when navigating to platform views
- Sidebar, top bar, and theme are all different (Catalyst sidebar replaces Harmony sidebar)
- No unified navigation experience
- Back button behavior is confusing

**Rejected because**: Full-page routing breaks the unified dashboard experience. The user sees a completely different application with different navigation.

---

## Consequences

### Positive

1. **Zero risk to existing dashboard** -- All 12 native views are completely untouched
2. **Independent development** -- Platform webapp and main dashboard are developed separately
3. **Technology isolation** -- Material-UI and Harmony CSS never conflict (iframe boundary)
4. **Same-origin proxy** -- Eliminates all CORS issues; iframes share origin with parent
5. **Extensible pattern** -- Adding future platform views requires 3 lines of code in the main dashboard
6. **Graceful degradation** -- If platform webapp is down, main dashboard works fine with a friendly error in embedded views
7. **Production-ready pattern** -- Proxy routing maps directly to ALB/CloudFront path-based routing on AWS

### Negative

1. **iframe limitations** -- iframes do not participate in the parent's scroll, keyboard shortcuts need postMessage bridging
2. **Additional server running** -- Requires 3 processes (dashboard, platform webapp, platform API) instead of 1
3. **Slight latency** -- Proxy adds ~1-5ms per request (negligible for local development)
4. **Visual inconsistency** -- Material-UI and Harmony look slightly different (different fonts, primary colors, border radii)

### Neutral

1. **Complexity is contained** -- The proxy code is ~50 lines in `server.js`; the embed mode is ~20 lines in `App.tsx`
2. **Memory overhead** -- Two iframe DOM trees are in memory when both views have been visited; this is well within browser capabilities

---

## Implementation Notes

1. The proxy should use Node.js `http.request()` (no external dependencies needed; the dashboard server is already a raw `http.createServer`)
2. WebSocket upgrade must be handled for Vite HMR in development
3. The `?embed=true` parameter should be appended by the proxy, not hardcoded in the iframe src
4. The EmbeddedView component should be defined in the `<script>` block of `index.html` alongside other components

---

## References

- [ARCH-20260210-DASHBOARD-INTEGRATION](/docs/sdlc/architecture/ARCH-20260210-DASHBOARD-INTEGRATION.md) -- Main architecture document
- [ADR-028](/docs/sdlc/architecture/ADR-028-routing-strategy.md) -- Routing strategy
- [ADR-029](/docs/sdlc/architecture/ADR-029-style-consistency.md) -- Style consistency
