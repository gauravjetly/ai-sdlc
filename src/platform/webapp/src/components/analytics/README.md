# Analytics Components

Modern, compact analytics dashboard for tool adoption metrics.

## Design Documentation

- **UX Research**: `/docs/sdlc/ux/UX-RESEARCH-20260210-1430.md`
- **Integration Guide**: `/docs/sdlc/ux/TOOL-ADOPTION-INTEGRATION-GUIDE.md`
- **Visual Mockup**: `/docs/sdlc/ux/TOOL-ADOPTION-VISUAL-MOCKUP.md`
- **Design ID**: UX-20260210-1430

## Quick Start

```tsx
import { ToolAdoptionDashboard } from '@/components/analytics';

function MyPage() {
  const { data, loading, error, refetch } = useToolAdoptionData();

  return (
    <ToolAdoptionDashboard
      data={data}
      loading={loading}
      error={error}
      onRefresh={refetch}
    />
  );
}
```

## Components

### ToolAdoptionDashboard

Main dashboard component with metrics strip, tool breakdown, and insights.

**Props**:
- `data: ToolAdoptionData` - Dashboard data (required)
- `loading?: boolean` - Shows loading skeleton
- `error?: Error | null` - Shows error alert
- `onRefresh?: () => void` - Refresh callback
- `compactMode?: boolean` - Starts collapsed
- `showInsights?: boolean` - Show/hide insights panel

**Example**:
```tsx
<ToolAdoptionDashboard
  data={data}
  showInsights={true}
  onRefresh={() => console.log('Refreshing...')}
/>
```

### MetricsStrip

Compact horizontal metrics bar (48px height).

**Example**:
```tsx
<MetricsStrip metrics={data.metrics} />
```

### ToolCard

Individual tool metric card with progress bar and trend.

**Example**:
```tsx
<ToolCard tool={toolData} rank={1} />
```

### InsightsPanel

AI-generated insights with severity indicators.

**Example**:
```tsx
<InsightsPanel insights={data.insights} maxVisible={3} />
```

## Data Structure

```typescript
interface ToolAdoptionData {
  metrics: {
    totalUniqueUsers: number;
    mostPopularTool: string;
    mostPopularToolUsers: number;
    growthPercent: number;
    multiToolPercent: number;
    avgToolsPerUser: number;
    periodStart: string;
    periodEnd: string;
  };
  tools: {
    id: string;
    name: string;
    totalUsers: number;
    exclusiveUsers: number;
    adoptionPercent: number;
    growthPercent: number;
    trendData: number[];
  }[];
  insights?: {
    type: 'leader' | 'growth' | 'warning' | 'opportunity';
    message: string;
    severity: 'info' | 'success' | 'warning' | 'error';
    metric?: string;
  }[];
  lastUpdated: string;
}
```

## Mock Data

For development and testing:

```tsx
import { generateMockData } from './ToolAdoptionDashboard.example';

const mockData = generateMockData();
```

## Keyboard Shortcuts

- `T` - Toggle tool breakdown
- `I` - Toggle insights panel
- `R` - Refresh data
- `Tab` - Navigate between elements
- `Enter`/`Space` - Activate buttons

## Accessibility

- WCAG 2.1 AAA compliant
- Full keyboard navigation
- Screen reader friendly
- High contrast colors (7:1 ratio)
- Focus indicators (3px solid outline)

## Performance

- Bundle size: ~15KB gzipped
- Initial render: <100ms
- Animation duration: <300ms
- Interaction response: <16ms (60fps)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Files

```
analytics/
├── README.md                           # This file
├── index.ts                            # Public exports
├── types.ts                            # TypeScript interfaces
├── ToolAdoptionDashboard.tsx           # Main component
├── ToolAdoptionDashboard.example.tsx   # Usage examples
├── MetricsStrip.tsx                    # Metrics bar
├── ToolCard.tsx                        # Tool metric card
├── InsightsPanel.tsx                   # AI insights
└── __tests__/                          # Unit tests
```

## Migration from Bar Chart

See integration guide for full migration instructions.

**Quick replace**:
```tsx
// Before
<BarChart data={tools} xKey="name" yKey="users" height={400} />

// After
<ToolAdoptionDashboard data={transformedData} />
```

## Support

File issues with:
1. Component version
2. Browser/device info
3. Screenshots
4. Expected vs actual behavior

## License

Internal use only - Part of AI-SDLC Platform
