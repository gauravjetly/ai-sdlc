# ADR-029: Design System Alignment and Style Consistency

**Date**: 2026-02-10
**Status**: PROPOSED
**Deciders**: Jets (Architect Agent)
**Context**: ARCH-20260210-DASHBOARD-INTEGRATION

---

## Context

The two dashboard applications use different design systems:

### Main Dashboard: Deltek Harmony Design System
- **Typography**: Figtree (Google Fonts), 400/500/600/700 weights
- **Primary Color**: `#1742F6` (Deltek Blue)
- **Navy**: `#081581`
- **Background**: `#F1F5FA`
- **Card Background**: `#FFFFFF`
- **Border Color**: `#dde3eb`
- **Border Radius**: 4px (sm), 6px (md), 8px (lg), 12px (xl)
- **Shadows**: Subtle (`0 1px 3px rgba(0,0,0,0.08)`)
- **Dark Mode**: Supported via `[data-theme="dark"]` CSS selector
- **Gradient**: `linear-gradient(90deg, #08E9EB 0%, #FF5DF2 34%, #3895FF 72%, #7A62FF 94%)`

### Platform Webapp: Deltek Catalyst Theme (Material-UI)
- **Typography**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Primary Color**: `#00A3E0` (Deltek Cyan)
- **Secondary**: `#002B49` (Navy)
- **Background**: `#F8F9FA`
- **Card Background**: `#FFFFFF`
- **Border Radius**: 10px (buttons), 10px (cards/paper)
- **Shadows**: Moderate (`0 4px 6px rgba(0,0,0,0.1)`)
- **Dark Mode**: Not implemented (MUI supports it via palette mode switch)
- **Hover Effects**: Transform + shadow transitions on buttons

### The Problem

Both applications carry Deltek branding but look noticeably different:
1. Different primary colors (Blue `#1742F6` vs Cyan `#00A3E0`)
2. Different fonts (Figtree vs system stack)
3. Different border radii (8px vs 10px)
4. Different shadow intensities
5. Dark mode only in main dashboard

When embedding the platform webapp in an iframe within the main dashboard, users will notice these visual inconsistencies.

---

## Decision

**Accept controlled visual diversity with theme synchronization, and provide a convergence path for future unification.**

The strategy has three tiers:

### Tier 1: Mandatory (Implement Now)

**Dark/Light Mode Synchronization**

Both applications must be in the same mode (dark or light). The parent dashboard controls the theme, and the iframe receives updates via postMessage.

```
Parent toggles dark mode
  -> postMessage({ type: 'theme-change', theme: 'dark' })
  -> iframe updates MUI theme to dark palette
```

Implementation in the platform webapp:

```typescript
// Create both themes
const lightTheme = createTheme({ palette: { mode: 'light', ... } });
const darkTheme = createTheme({ palette: { mode: 'dark', ... } });

// In App.tsx
const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
const activeTheme = themeMode === 'dark' ? darkTheme : lightTheme;

// Listen for parent theme changes
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data.type === 'theme-change') {
      setThemeMode(event.data.theme);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

**Background Transparency in Embed Mode**

When embedded, the platform webapp should use transparent backgrounds so the parent's background shows through (or match it explicitly):

```typescript
// In embed mode, override background
bgcolor: isEmbedded ? 'transparent' : 'background.default'
```

### Tier 2: Recommended (Implement in Phase 4)

**Align Key Visual Properties**

Update the platform webapp's MUI theme to be closer to Harmony:

| Property | Current (Catalyst) | Aligned (Harmony-like) |
|----------|-------------------|----------------------|
| Border Radius (cards) | 10px | 8px |
| Border Radius (buttons) | 8px | 6px |
| Box Shadow | `0 4px 6px rgba(0,0,0,0.1)` | `0 1px 3px rgba(0,0,0,0.08)` |
| Background | `#F8F9FA` | `#F1F5FA` |

These are small changes that make a big perceptual difference. They do NOT require changing the primary color or font, which would be more disruptive.

```typescript
// Harmony-aligned MUI theme overrides
components: {
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #dde3eb',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
},
```

### Tier 3: Future (Optional Long-Term Convergence)

**Shared Design Token File**

Create a single source of truth for design tokens:

```
shared/design-tokens.json
{
  "color": {
    "primary": "#1742F6",
    "primaryLight": "#e8ecf8",
    "navy": "#081581",
    "success": "#00875a",
    "warning": "#ff9800",
    "error": "#d32f2f"
  },
  "typography": {
    "fontFamily": "'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  "spacing": {
    "borderRadiusSm": "4px",
    "borderRadiusMd": "6px",
    "borderRadiusLg": "8px"
  },
  "shadow": {
    "sm": "0 1px 3px rgba(0,0,0,0.08)",
    "md": "0 2px 8px rgba(0,0,0,0.1)",
    "lg": "0 4px 16px rgba(0,0,0,0.12)"
  }
}
```

The main dashboard generates CSS custom properties from this file:
```css
:root {
  --color-primary: #1742F6;
  /* ... */
}
```

The platform webapp generates a MUI theme from this file:
```typescript
import tokens from '../shared/design-tokens.json';
const theme = createTheme({
  palette: { primary: { main: tokens.color.primary } },
  // ...
});
```

This ensures both applications converge to identical visual output while using their respective rendering systems.

---

## Alternatives Considered

### Alternative A: Force Material-UI to Match Harmony Exactly

Create a MUI theme that exactly replicates Harmony, including font imports, exact color matches, and identical spacing.

**Pros**: Pixel-perfect consistency.

**Cons**:
- Figtree font must be loaded inside the iframe (additional network request)
- Many MUI default behaviors (ripple effects, elevation, typography scale) would look out of place with Harmony conventions
- Significant theme customization effort
- Would make the platform webapp look different when used standalone vs embedded
- MUI component patterns (dialogs, tables) are inherently different from hand-coded HTML

**Rejected because**: Forcing Material-UI to perfectly emulate a hand-coded CSS system is fighting the framework. The result would be fragile and hard to maintain.

### Alternative B: Force Main Dashboard to Use Material-UI

Load Material-UI into the main dashboard and gradually convert all components.

**Pros**: Single design system across both apps.

**Cons**:
- Loading Material-UI via CDN in a Babel-transformed HTML file is fragile
- Would need to add ~1MB of MUI JavaScript to the main dashboard
- Every existing component would need Material-UI conversion
- The inline React pattern (no build step) conflicts with MUI's CSS-in-JS
- This is essentially a complete rewrite of the dashboard

**Rejected because**: This is a much larger project than the integration task at hand.

### Alternative C: Ignore Differences Entirely

Embed the iframe as-is with no visual alignment.

**Pros**: Zero effort.

**Cons**:
- Jarring visual discontinuity when switching views
- Dark mode in main dashboard, light mode in iframe
- Professional appearance diminished

**Rejected because**: At minimum, dark/light mode synchronization is required for a professional experience.

---

## Consequences

### Positive

1. **Low implementation effort** -- Tier 1 (mandatory) requires only ~30 lines of code
2. **Non-disruptive** -- Both applications keep their existing design systems
3. **Dark mode works everywhere** -- Users get consistent dark/light experience
4. **Clear convergence path** -- Tier 3 provides a roadmap to full unification when desired
5. **iframe boundary is a feature** -- CSS isolation prevents style leaks between the two systems

### Negative

1. **Minor visual differences remain** -- Different fonts, primary colors, and border radii are noticeable to attentive users
2. **Two design systems to maintain** -- Until full convergence (Tier 3), both Harmony CSS and Catalyst MUI theme exist
3. **Dark mode for platform webapp is new work** -- The MUI dark palette must be defined (currently only light mode exists)

### Neutral

1. Users may not notice minor differences -- both are professional, clean, and Deltek-branded
2. The iframe boundary naturally explains any visual context switch to users

---

## Visual Comparison Matrix

```
+------------------+-------------------+-------------------+
| Element          | Main Dashboard    | Platform Webapp   |
|                  | (Harmony)         | (Catalyst/MUI)    |
+------------------+-------------------+-------------------+
| Font             | Figtree           | System Stack      |
| Primary Color    | #1742F6 (Blue)    | #00A3E0 (Cyan)    |
| Background       | #F1F5FA           | #F8F9FA           |
| Cards            | White, 8px, thin  | White, 10px,      |
|                  | shadow, border    | moderate shadow   |
| Buttons          | Custom CSS, 6px   | MUI Button, 8px   |
|                  | radius            | radius, elevation |
| Tables           | Custom CSS grid   | MUI Table, striped|
| Charts           | CSS-based         | Recharts (SVG)    |
| Icons            | SVG images (brand)| MUI Icons (SVG)   |
| Dark Mode        | CSS vars          | MUI palette       |
+------------------+-------------------+-------------------+

Verdict: Both are clean, professional, Deltek-branded.
         Differences are subtle, not jarring.
         Dark mode sync is the critical alignment point.
```

---

## Implementation Checklist

### Tier 1 (Day 3 -- Mandatory)

- [ ] Create dark theme variant for platform webapp MUI
- [ ] Add postMessage listener in platform webapp for theme changes
- [ ] Send theme state from main dashboard EmbeddedView component
- [ ] Set transparent background in embed mode
- [ ] Test dark mode consistency

### Tier 2 (Week 2 -- Recommended)

- [ ] Align MUI border radius to 8px
- [ ] Align MUI shadows to Harmony values
- [ ] Align background color to `#F1F5FA`
- [ ] Add subtle border to MUI cards matching Harmony

### Tier 3 (Future -- Optional)

- [ ] Create shared design tokens JSON
- [ ] Generate CSS custom properties from tokens
- [ ] Generate MUI theme from tokens
- [ ] Add Figtree font import to platform webapp
- [ ] Full visual audit and alignment

---

## References

- [ARCH-20260210-DASHBOARD-INTEGRATION](/docs/sdlc/architecture/ARCH-20260210-DASHBOARD-INTEGRATION.md) -- Main architecture document
- [ADR-027](/docs/sdlc/architecture/ADR-027-dashboard-integration-strategy.md) -- Integration approach
- [ADR-028](/docs/sdlc/architecture/ADR-028-routing-strategy.md) -- Routing strategy
- Deltek Harmony Design System -- `dashboard/index.html` CSS variables
- Material-UI Theming -- `src/platform/webapp/src/styles/theme.ts`
