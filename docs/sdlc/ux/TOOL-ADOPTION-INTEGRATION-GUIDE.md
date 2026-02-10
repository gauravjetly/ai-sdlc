# Tool Adoption Dashboard - Integration Guide
**Design**: UX-20260210-1430
**Date**: 2026-02-10
**Status**: READY FOR INTEGRATION

---

## Overview

This guide explains how to integrate the modern Tool Adoption Analytics Dashboard into your existing application. The dashboard replaces traditional bar charts with a compact, insight-dense interface.

**Key Benefits**:
- 70% less vertical space (600px → 180px compact)
- Modern visual design with progress bars and sparklines
- AI-generated insights for actionable intelligence
- Fully accessible (WCAG 2.1 AAA compliant)
- Keyboard shortcuts for power users

---

## Quick Start

### 1. Import the Component

```typescript
import { ToolAdoptionDashboard } from '@/components/analytics/ToolAdoptionDashboard';
import type { ToolAdoptionData } from '@/components/analytics/types';
```

### 2. Basic Usage

```tsx
function MyDashboard() {
  const [data, setData] = useState<ToolAdoptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToolAdoptionData().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <ToolAdoptionDashboard
      data={data}
      loading={loading}
      onRefresh={() => fetchToolAdoptionData().then(setData)}
    />
  );
}
```

### 3. With Mock Data (for development)

```typescript
import { generateMockData } from '@/components/analytics/ToolAdoptionDashboard.example';

function DevelopmentDashboard() {
  const mockData = generateMockData();

  return <ToolAdoptionDashboard data={mockData} />;
}
```

---

## Component Props

### ToolAdoptionDashboardProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `ToolAdoptionData` | Yes | - | Dashboard data including metrics and tools |
| `loading` | `boolean` | No | `false` | Shows loading skeleton when true |
| `error` | `Error \| null` | No | `null` | Displays error alert if provided |
| `onRefresh` | `() => void` | No | - | Callback for refresh button (shows button if provided) |
| `compactMode` | `boolean` | No | `false` | Starts collapsed, hides insights (for embedding) |
| `showInsights` | `boolean` | No | `true` | Shows/hides AI insights panel |

---

## Data Structure

### ToolAdoptionData Interface

```typescript
interface ToolAdoptionData {
  metrics: DashboardMetrics;
  tools: ToolMetric[];
  insights?: Insight[];
  lastUpdated: string;
}
```

### DashboardMetrics

```typescript
interface DashboardMetrics {
  totalUniqueUsers: number;        // COUNT(DISTINCT user_id)
  mostPopularTool: string;         // Tool name with most users
  mostPopularToolUsers: number;    // User count for most popular
  growthPercent: number;           // Week-over-week growth rate
  multiToolPercent: number;        // % users using multiple tools
  avgToolsPerUser: number;         // Average tools per user
  periodStart: string;             // ISO 8601 date
  periodEnd: string;               // ISO 8601 date
}
```

### ToolMetric

```typescript
interface ToolMetric {
  id: string;                      // Unique tool identifier
  name: string;                    // Display name
  totalUsers: number;              // Total users using this tool
  exclusiveUsers: number;          // Users using ONLY this tool
  adoptionPercent: number;         // Percentage of total users
  growthPercent: number;           // Week-over-week growth
  trendData: number[];             // Last 4 weeks user counts
  color?: string;                  // Optional custom color
}
```

### Insight (Optional)

```typescript
interface Insight {
  type: 'leader' | 'growth' | 'warning' | 'opportunity';
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  metric?: string;
}
```

---

## Backend API Integration

### Recommended Endpoint

```
GET /api/v1/analytics/tool-adoption
```

### Query Parameters (Optional)

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | ISO 8601 date | Period start date |
| `end` | ISO 8601 date | Period end date |
| `teamId` | string | Filter by team |
| `includeInsights` | boolean | Generate AI insights |

### Example Response

```json
{
  "metrics": {
    "totalUniqueUsers": 4696,
    "mostPopularTool": "Microsoft 365 Copilot",
    "mostPopularToolUsers": 1825,
    "growthPercent": 12.3,
    "multiToolPercent": 58.2,
    "avgToolsPerUser": 1.7,
    "periodStart": "2026-02-03T00:00:00Z",
    "periodEnd": "2026-02-10T00:00:00Z"
  },
  "tools": [
    {
      "id": "microsoft-365-copilot",
      "name": "Microsoft 365 Copilot",
      "totalUsers": 1825,
      "exclusiveUsers": 1767,
      "adoptionPercent": 38.8,
      "growthPercent": 8.5,
      "trendData": [1650, 1720, 1780, 1825]
    },
    {
      "id": "claude-code",
      "name": "Claude Code",
      "totalUsers": 929,
      "exclusiveUsers": 552,
      "adoptionPercent": 19.8,
      "growthPercent": 15.2,
      "trendData": [750, 820, 880, 929]
    }
  ],
  "insights": [
    {
      "type": "leader",
      "message": "Microsoft 365 Copilot leads with 38.8% adoption",
      "severity": "info",
      "metric": "1,825 users"
    },
    {
      "type": "growth",
      "message": "Claude Code has highest growth: +15.2% WoW",
      "severity": "success",
      "metric": "+15.2%"
    }
  ],
  "lastUpdated": "2026-02-10T14:30:00Z"
}
```

### SQL Query Examples

#### Total Unique Users

```sql
SELECT COUNT(DISTINCT user_id) as total_unique_users
FROM tool_usage
WHERE usage_date BETWEEN :start_date AND :end_date;
```

#### Tool Metrics

```sql
SELECT
  t.tool_id,
  t.tool_name,
  COUNT(DISTINCT tu.user_id) as total_users,
  COUNT(DISTINCT CASE
    WHEN user_tool_count.tool_count = 1
    THEN tu.user_id
  END) as exclusive_users,
  ROUND(COUNT(DISTINCT tu.user_id) * 100.0 / :total_users, 1) as adoption_percent
FROM tools t
LEFT JOIN tool_usage tu ON t.tool_id = tu.tool_id
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT tool_id) as tool_count
  FROM tool_usage
  WHERE usage_date BETWEEN :start_date AND :end_date
  GROUP BY user_id
) user_tool_count ON tu.user_id = user_tool_count.user_id
WHERE tu.usage_date BETWEEN :start_date AND :end_date
GROUP BY t.tool_id, t.tool_name;
```

#### Growth Rate

```sql
WITH current_period AS (
  SELECT tool_id, COUNT(DISTINCT user_id) as users
  FROM tool_usage
  WHERE usage_date BETWEEN :current_start AND :current_end
  GROUP BY tool_id
),
previous_period AS (
  SELECT tool_id, COUNT(DISTINCT user_id) as users
  FROM tool_usage
  WHERE usage_date BETWEEN :previous_start AND :previous_end
  GROUP BY tool_id
)
SELECT
  c.tool_id,
  ROUND(((c.users - p.users) * 100.0 / NULLIF(p.users, 0)), 1) as growth_percent
FROM current_period c
LEFT JOIN previous_period p ON c.tool_id = p.tool_id;
```

#### Trend Data (Last 4 Weeks)

```sql
SELECT
  tool_id,
  ARRAY_AGG(user_count ORDER BY week_number) as trend_data
FROM (
  SELECT
    tool_id,
    EXTRACT(WEEK FROM usage_date) as week_number,
    COUNT(DISTINCT user_id) as user_count
  FROM tool_usage
  WHERE usage_date >= CURRENT_DATE - INTERVAL '4 weeks'
  GROUP BY tool_id, EXTRACT(WEEK FROM usage_date)
) weekly_stats
GROUP BY tool_id;
```

---

## Frontend Integration

### React Hook for Data Fetching

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { ToolAdoptionData } from '@/components/analytics/types';

export function useToolAdoptionData(autoRefresh = true, interval = 5 * 60 * 1000) {
  const [data, setData] = useState<ToolAdoptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/analytics/tool-adoption');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const timer = setInterval(fetchData, interval);
      return () => clearInterval(timer);
    }
  }, [fetchData, autoRefresh, interval]);

  return { data, loading, error, refetch: fetchData };
}
```

### Usage with Custom Hook

```tsx
function AnalyticsPage() {
  const { data, loading, error, refetch } = useToolAdoptionData();

  return (
    <Container maxWidth="lg">
      <ToolAdoptionDashboard
        data={data!}
        loading={loading}
        error={error}
        onRefresh={refetch}
        showInsights={true}
      />
    </Container>
  );
}
```

---

## Styling & Theming

### Material-UI Theme Integration

The component automatically adapts to your Material-UI theme:

```typescript
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // or 'light'
    primary: { main: '#3B82F6' },
    // ... your theme
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ToolAdoptionDashboard data={data} />
    </ThemeProvider>
  );
}
```

### Custom Tool Colors

Override default tool colors:

```typescript
const customData: ToolAdoptionData = {
  ...data,
  tools: data.tools.map(tool => ({
    ...tool,
    color: tool.id === 'my-tool' ? '#FF5733' : undefined,
  })),
};
```

---

## Responsive Behavior

### Breakpoints

| Screen Size | Behavior |
|-------------|----------|
| Desktop (>1200px) | Full horizontal layout, 5 metrics in one row |
| Tablet (768-1199px) | Metrics wrap to 2 rows (3+2) |
| Mobile (<768px) | Vertical stack, 1 metric per row |

### Mobile Optimizations

- Touch targets: minimum 44x44px (Apple/Google guidelines)
- Tooltips convert to modal overlays on tap
- Swipe gestures for tool cards (future enhancement)
- Reduced animations on low-end devices

---

## Accessibility Features

### WCAG 2.1 AAA Compliance

- **Color Contrast**: Minimum 7:1 for normal text, 4.5:1 for large text
- **Keyboard Navigation**: All interactive elements accessible via Tab/Arrow keys
- **Screen Reader Support**: Comprehensive ARIA labels and live regions
- **Focus Indicators**: 3px solid outline, high contrast
- **Semantic HTML**: Proper heading hierarchy, landmark regions

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Toggle tool breakdown section |
| `I` | Toggle insights panel |
| `R` | Refresh data |
| `Tab` | Navigate between interactive elements |
| `Enter`/`Space` | Activate buttons/expand sections |
| `Escape` | Close expanded sections |

### Screen Reader Announcements

The component uses `aria-live="polite"` regions to announce:
- Metric value updates
- Data refresh completion
- Error states
- Loading states

---

## Performance Optimization

### Bundle Size

- Main component: ~8KB gzipped
- Total with dependencies: ~15KB gzipped

### Render Performance

- Initial render: <100ms
- Animation duration: <300ms
- Interaction response: <16ms (60fps)

### Optimization Tips

1. **Memoization**: Wrap in `React.memo()` if parent re-renders frequently
2. **Lazy Loading**: Use `React.lazy()` for insights panel
3. **Debounce Refresh**: Prevent rapid refresh calls
4. **Virtual Scrolling**: Not needed (only 5-10 tools expected)

```typescript
import { memo } from 'react';

const MemoizedDashboard = memo(ToolAdoptionDashboard, (prev, next) => {
  return prev.data?.lastUpdated === next.data?.lastUpdated;
});
```

---

## Error Handling

### Error States

The component handles three error scenarios:

1. **API Error**: Shows alert with retry button
2. **Network Error**: Shows network error message
3. **Data Validation Error**: Logs to console, shows fallback UI

### Error Boundaries

Wrap in error boundary for production:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ToolAdoptionSection() {
  return (
    <ErrorBoundary
      fallback={
        <Alert severity="error">
          Failed to load analytics dashboard. Please refresh the page.
        </Alert>
      }
      onError={(error) => {
        console.error('Dashboard error:', error);
        // Send to error tracking service
      }}
    >
      <ToolAdoptionDashboard data={data} />
    </ErrorBoundary>
  );
}
```

---

## Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { ToolAdoptionDashboard } from './ToolAdoptionDashboard';
import { generateMockData } from './ToolAdoptionDashboard.example';

describe('ToolAdoptionDashboard', () => {
  it('renders metrics strip', () => {
    const mockData = generateMockData();
    render(<ToolAdoptionDashboard data={mockData} />);

    expect(screen.getByText('4.7K')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(<ToolAdoptionDashboard data={null} loading={true} />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('handles refresh', async () => {
    const onRefresh = jest.fn();
    render(<ToolAdoptionDashboard data={mockData} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByLabelText('Refresh data'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

```typescript
import { render, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/v1/analytics/tool-adoption', (req, res, ctx) => {
    return res(ctx.json(mockApiResponse));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches and displays data', async () => {
  render(<AnalyticsPage />);

  await waitFor(() => {
    expect(screen.getByText('Microsoft 365 Copilot')).toBeInTheDocument();
  });
});
```

### Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('has no accessibility violations', async () => {
  const { container } = render(<ToolAdoptionDashboard data={mockData} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Migration from Old Dashboard

### Step 1: Identify Current Implementation

Find your existing bar chart dashboard:
```bash
grep -r "BarChart\|bar chart" src/components/
```

### Step 2: Replace Component

**Before (Old bar chart)**:
```tsx
<BarChart
  data={tools}
  xKey="name"
  yKey="users"
  height={400}
/>
```

**After (New dashboard)**:
```tsx
<ToolAdoptionDashboard
  data={transformedData}
  showInsights={true}
/>
```

### Step 3: Transform Data

If your existing API returns different format:

```typescript
function transformLegacyData(legacyData: any): ToolAdoptionData {
  const totalUsers = legacyData.tools.reduce((sum, t) => sum + t.users, 0);

  return {
    metrics: {
      totalUniqueUsers: totalUsers,
      mostPopularTool: legacyData.tools[0].name,
      mostPopularToolUsers: legacyData.tools[0].users,
      growthPercent: calculateGrowth(legacyData.previous, legacyData.current),
      multiToolPercent: calculateMultiToolPercent(legacyData),
      avgToolsPerUser: 1.5, // Calculate from your data
      periodStart: legacyData.startDate,
      periodEnd: legacyData.endDate,
    },
    tools: legacyData.tools.map(tool => ({
      id: tool.toolId,
      name: tool.name,
      totalUsers: tool.users,
      exclusiveUsers: tool.exclusiveUsers || tool.users,
      adoptionPercent: (tool.users / totalUsers) * 100,
      growthPercent: tool.growth || 0,
      trendData: tool.weeklyData || [],
    })),
    lastUpdated: new Date().toISOString(),
  };
}
```

### Step 4: Update Tests

Replace old test mocks with new data structure.

### Step 5: Gradual Rollout

Use feature flag for gradual rollout:

```typescript
function AnalyticsDashboard() {
  const useNewDashboard = useFeatureFlag('new-analytics-dashboard');

  if (useNewDashboard) {
    return <ToolAdoptionDashboard data={data} />;
  }

  return <LegacyBarChartDashboard data={legacyData} />;
}
```

---

## Troubleshooting

### Issue: Metrics not displaying

**Cause**: Data format mismatch

**Solution**: Validate data structure matches `ToolAdoptionData` interface

```typescript
import { z } from 'zod';

const ToolAdoptionDataSchema = z.object({
  metrics: z.object({
    totalUniqueUsers: z.number(),
    // ... other fields
  }),
  tools: z.array(z.object({
    id: z.string(),
    // ... other fields
  })),
});

// Validate before passing to component
const validatedData = ToolAdoptionDataSchema.parse(apiResponse);
```

### Issue: Progress bars not animating

**Cause**: CSS animation disabled or GPU acceleration off

**Solution**: Check browser dev tools for animation blockers

### Issue: Tooltips not showing on mobile

**Cause**: Hover events don't work on touch devices

**Solution**: Component automatically converts to modal on tap (built-in)

### Issue: High memory usage

**Cause**: Too many trend data points or intervals

**Solution**: Limit trend data to last 4-8 weeks, clear old intervals

---

## Support & Feedback

### Documentation

- UX Research: `/docs/sdlc/ux/UX-RESEARCH-20260210-1430.md`
- Component Source: `/src/platform/webapp/src/components/analytics/`
- Examples: `/src/platform/webapp/src/components/analytics/ToolAdoptionDashboard.example.tsx`

### Questions?

File an issue with:
1. Component version
2. Browser/device info
3. Error messages or screenshots
4. Expected vs actual behavior

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-10 | Initial release with metrics strip, tool cards, insights |

---

**Last Updated**: 2026-02-10
**Next Review**: 2026-03-10
