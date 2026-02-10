/**
 * Analytics Components
 * Design: UX-20260210-1430
 *
 * Modern, compact analytics dashboard components for tool adoption metrics.
 */

export { ToolAdoptionDashboard, calculateMetrics, generateInsights } from './ToolAdoptionDashboard';
export { MetricsStrip } from './MetricsStrip';
export { ToolCard } from './ToolCard';
export { InsightsPanel } from './InsightsPanel';

export type {
  ToolAdoptionData,
  ToolAdoptionDashboardProps,
  DashboardMetrics,
  ToolMetric,
  Insight,
} from './types';

export { TOOL_COLORS, METRIC_COLORS } from './types';
