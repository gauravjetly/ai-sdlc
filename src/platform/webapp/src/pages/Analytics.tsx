import React from 'react';
import { Box, Typography } from '@mui/material';
import { ToolAdoptionDashboard } from '../components/analytics/ToolAdoptionDashboard';

/**
 * Analytics Page
 *
 * Displays tool adoption analytics with modern, compact design
 */
function Analytics() {
  // Mock data for now - in production, fetch from API
  const mockData = {
    metrics: {
      totalUsers: 4700,
      mostPopularTool: 'Microsoft 365 Copilot',
      growthPercent: 12.5,
      multiToolPercent: 41.8,
      avgToolsPerUser: 1.8,
    },
    tools: [
      {
        id: 'claude-desktop',
        name: 'Claude Desktop',
        icon: '🖥️',
        totalUsers: 793,
        exclusiveUsers: 380,
        growthPercent: 8.2,
        adoptionLevel: 'growing' as const,
        trend: [650, 680, 720, 793],
      },
      {
        id: 'claude-code',
        name: 'Claude Code',
        icon: '💻',
        totalUsers: 929,
        exclusiveUsers: 552,
        growthPercent: 15.2,
        adoptionLevel: 'high' as const,
        trend: [720, 780, 850, 929],
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        icon: '🤖',
        totalUsers: 308,
        exclusiveUsers: 250,
        growthPercent: -2.5,
        adoptionLevel: 'low' as const,
        trend: [340, 320, 315, 308],
      },
      {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        icon: '🚀',
        totalUsers: 841,
        exclusiveUsers: 781,
        growthPercent: 6.8,
        adoptionLevel: 'growing' as const,
        trend: [750, 780, 810, 841],
      },
      {
        id: 'microsoft-365-copilot',
        name: 'Microsoft 365 Copilot',
        icon: '📊',
        totalUsers: 1825,
        exclusiveUsers: 1767,
        growthPercent: 18.4,
        adoptionLevel: 'high' as const,
        trend: [1420, 1560, 1680, 1825],
      },
    ],
    insights: [
      {
        type: 'leader' as const,
        message: 'Microsoft 365 Copilot leads with 38.8% adoption',
        severity: 'info' as const,
      },
      {
        type: 'growth' as const,
        message: 'Claude Code has highest growth: +15.2% WoW',
        severity: 'success' as const,
      },
      {
        type: 'opportunity' as const,
        message: '41.8% use only one tool - opportunity for cross-selling',
        severity: 'info' as const,
      },
      {
        type: 'warning' as const,
        message: 'ChatGPT showing decline: -2.5% WoW',
        severity: 'warning' as const,
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  return (
    <Box>
      <ToolAdoptionDashboard
        data={mockData}
        loading={false}
        error={null}
      />
    </Box>
  );
}

export default Analytics;
