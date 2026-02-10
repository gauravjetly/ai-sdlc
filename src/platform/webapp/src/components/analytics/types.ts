/**
 * Type Definitions for Tool Adoption Analytics
 * Design: UX-20260210-1430
 */

export interface DashboardMetrics {
  totalUniqueUsers: number;
  mostPopularTool: string;
  mostPopularToolUsers: number;
  growthPercent: number;
  multiToolPercent: number;
  avgToolsPerUser: number;
  periodStart: string;
  periodEnd: string;
}

export interface ToolMetric {
  id: string;
  name: string;
  totalUsers: number;
  exclusiveUsers: number;
  adoptionPercent: number;
  growthPercent: number;
  trendData: number[]; // Last 4 weeks
  color?: string; // Optional custom color
}

export interface Insight {
  type: 'leader' | 'growth' | 'warning' | 'opportunity';
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  metric?: string;
}

export interface ToolAdoptionData {
  metrics: DashboardMetrics;
  tools: ToolMetric[];
  insights?: Insight[];
  lastUpdated: string;
}

export interface ToolAdoptionDashboardProps {
  data: ToolAdoptionData;
  loading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  compactMode?: boolean;
  showInsights?: boolean;
}

// Tool color mappings (WCAG AAA compliant)
export const TOOL_COLORS: Record<string, { light: string; dark: string }> = {
  'claude-desktop': { light: '#8B5CF6', dark: '#A78BFA' },
  'claude-code': { light: '#3B82F6', dark: '#60A5FA' },
  'chatgpt': { light: '#10B981', dark: '#34D399' },
  'github-copilot': { light: '#6366F1', dark: '#818CF8' },
  'microsoft-365-copilot': { light: '#F59E0B', dark: '#FBBF24' },
};

export const METRIC_COLORS = {
  positive: { light: '#10B981', dark: '#34D399' },
  negative: { light: '#EF4444', dark: '#F87171' },
  neutral: { light: '#3B82F6', dark: '#60A5FA' },
  warning: { light: '#F59E0B', dark: '#FBBF24' },
};
