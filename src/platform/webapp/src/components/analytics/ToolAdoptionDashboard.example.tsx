/**
 * Example Usage: ToolAdoptionDashboard
 * Design: UX-20260210-1430
 *
 * This file demonstrates how to integrate the ToolAdoptionDashboard
 * component with real API data or mock data for development.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import { ToolAdoptionDashboard } from './ToolAdoptionDashboard';
import { ToolAdoptionData } from './types';

/**
 * Mock data generator for development/testing
 * Based on the screenshot data provided by the user
 */
export function generateMockData(): ToolAdoptionData {
  return {
    metrics: {
      totalUniqueUsers: 4696,
      mostPopularTool: 'Microsoft 365 Copilot',
      mostPopularToolUsers: 1825,
      growthPercent: 12.3,
      multiToolPercent: 58.2,
      avgToolsPerUser: 1.7,
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    },
    tools: [
      {
        id: 'microsoft-365-copilot',
        name: 'Microsoft 365 Copilot',
        totalUsers: 1825,
        exclusiveUsers: 1767,
        adoptionPercent: 38.8,
        growthPercent: 8.5,
        trendData: [1650, 1720, 1780, 1825],
      },
      {
        id: 'claude-code',
        name: 'Claude Code',
        totalUsers: 929,
        exclusiveUsers: 552,
        adoptionPercent: 19.8,
        growthPercent: 15.2,
        trendData: [750, 820, 880, 929],
      },
      {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        totalUsers: 841,
        exclusiveUsers: 781,
        adoptionPercent: 17.9,
        growthPercent: 5.3,
        trendData: [780, 800, 820, 841],
      },
      {
        id: 'claude-desktop',
        name: 'Claude Desktop',
        totalUsers: 793,
        exclusiveUsers: 380,
        adoptionPercent: 16.9,
        growthPercent: 10.1,
        trendData: [680, 720, 760, 793],
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        totalUsers: 308,
        exclusiveUsers: 250,
        adoptionPercent: 6.6,
        growthPercent: -2.5,
        trendData: [330, 320, 315, 308],
      },
    ],
    insights: [
      {
        type: 'leader',
        message: 'Microsoft 365 Copilot leads with 38.8% adoption',
        severity: 'info',
        metric: '1,825 users',
      },
      {
        type: 'growth',
        message: 'Claude Code has highest growth: +15.2% WoW',
        severity: 'success',
        metric: '+15.2%',
      },
      {
        type: 'opportunity',
        message: '41.8% of users use only one tool - opportunity for cross-tool adoption',
        severity: 'info',
      },
      {
        type: 'warning',
        message: 'ChatGPT showing decline: -2.5% WoW',
        severity: 'warning',
        metric: '-2.5%',
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Example 1: Basic Usage with Mock Data
 */
export function Example1_BasicUsage() {
  const mockData = generateMockData();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ToolAdoptionDashboard
        data={mockData}
        loading={false}
        error={null}
      />
    </Container>
  );
}

/**
 * Example 2: With API Integration
 */
export function Example2_APIIntegration() {
  const [data, setData] = useState<ToolAdoptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/v1/analytics/tool-adoption');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
      // Fallback to mock data for development
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ToolAdoptionDashboard
        data={data!}
        loading={loading}
        error={error}
        onRefresh={fetchData}
        showInsights={true}
      />
    </Container>
  );
}

/**
 * Example 3: Compact Mode (for embedding in other dashboards)
 */
export function Example3_CompactMode() {
  const mockData = generateMockData();

  return (
    <Box sx={{ p: 2, bgcolor: 'background.default' }}>
      <ToolAdoptionDashboard
        data={mockData}
        compactMode={true}
        showInsights={false}
      />
    </Box>
  );
}

/**
 * Example 4: Side-by-side comparison (multiple time periods)
 */
export function Example4_Comparison() {
  const currentPeriod = generateMockData();

  // Generate previous period with slight variations
  const previousPeriod: ToolAdoptionData = {
    ...currentPeriod,
    metrics: {
      ...currentPeriod.metrics,
      totalUniqueUsers: 4185,
      growthPercent: 8.1,
      periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    tools: currentPeriod.tools.map(tool => ({
      ...tool,
      totalUsers: Math.round(tool.totalUsers * 0.9),
      trendData: tool.trendData.map(v => Math.round(v * 0.9)),
    })),
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <ToolAdoptionDashboard
            data={previousPeriod}
            showInsights={false}
          />
        </Box>
        <Box>
          <ToolAdoptionDashboard
            data={currentPeriod}
            showInsights={true}
          />
        </Box>
      </Box>
    </Container>
  );
}

/**
 * Example 5: Integration with existing dashboard
 */
export function Example5_DashboardIntegration() {
  const mockData = generateMockData();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Other dashboard sections */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <h2>Platform Overview</h2>
          {/* Other content */}
        </Box>

        {/* Tool Adoption Section */}
        <ToolAdoptionDashboard
          data={mockData}
          showInsights={true}
          onRefresh={() => console.log('Refreshing...')}
        />

        {/* More dashboard sections */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <h2>User Activity</h2>
          {/* Other content */}
        </Box>
      </Box>
    </Container>
  );
}

/**
 * Backend API Integration Guide
 *
 * Expected API Endpoint: GET /api/v1/analytics/tool-adoption
 *
 * Response Format:
 * {
 *   "metrics": {
 *     "totalUniqueUsers": 4696,
 *     "mostPopularTool": "Microsoft 365 Copilot",
 *     "mostPopularToolUsers": 1825,
 *     "growthPercent": 12.3,
 *     "multiToolPercent": 58.2,
 *     "avgToolsPerUser": 1.7,
 *     "periodStart": "2026-02-03T00:00:00Z",
 *     "periodEnd": "2026-02-10T00:00:00Z"
 *   },
 *   "tools": [
 *     {
 *       "id": "microsoft-365-copilot",
 *       "name": "Microsoft 365 Copilot",
 *       "totalUsers": 1825,
 *       "exclusiveUsers": 1767,
 *       "adoptionPercent": 38.8,
 *       "growthPercent": 8.5,
 *       "trendData": [1650, 1720, 1780, 1825]
 *     }
 *     // ... more tools
 *   ],
 *   "insights": [
 *     {
 *       "type": "leader",
 *       "message": "Microsoft 365 Copilot leads with 38.8% adoption",
 *       "severity": "info",
 *       "metric": "1,825 users"
 *     }
 *     // ... more insights
 *   ],
 *   "lastUpdated": "2026-02-10T14:30:00Z"
 * }
 *
 * Calculation Notes:
 * - totalUniqueUsers: COUNT(DISTINCT user_id) across all tools
 * - exclusiveUsers: Users who use ONLY this tool
 * - multiToolPercent: (totalUsers - SUM(exclusiveUsers)) / totalUsers * 100
 * - avgToolsPerUser: SUM(tool_assignments) / totalUniqueUsers
 * - growthPercent: ((current_week - previous_week) / previous_week) * 100
 * - trendData: Weekly user counts for last 4 weeks
 */

export default Example1_BasicUsage;
