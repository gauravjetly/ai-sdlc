/**
 * ToolAdoptionDashboard Component
 * Design: UX-20260210-1430
 *
 * Modern, compact analytics dashboard for tool adoption metrics.
 * Inspired by MultiProjectDashboard design patterns.
 *
 * Features:
 * - Compact metrics strip (48px) with 5 key KPIs
 * - Expandable tool breakdown with progress bars
 * - AI-generated insights panel
 * - Fully responsive and accessible (WCAG 2.1 AAA)
 *
 * Layout:
 * 1. Metrics Strip (48px) - Always visible
 * 2. Tool Breakdown (Collapsible, 32-200px)
 * 3. Insights Panel (Optional, 60px)
 *
 * Total compact height: ~180px
 * Total expanded height: ~340px
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Collapse,
  Skeleton,
  Alert,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { MetricsStrip } from './MetricsStrip';
import { ToolCard } from './ToolCard';
import { InsightsPanel } from './InsightsPanel';
import { ToolAdoptionDashboardProps, ToolAdoptionData } from './types';

/**
 * Helper function to calculate metrics from raw tool data
 * This can be used when backend doesn't provide pre-calculated metrics
 */
export function calculateMetrics(
  tools: ToolAdoptionData['tools']
): ToolAdoptionData['metrics'] {
  const totalUsers = tools.reduce((sum, tool) => sum + tool.totalUsers, 0);
  const totalExclusive = tools.reduce((sum, tool) => sum + tool.exclusiveUsers, 0);
  const multiToolUsers = totalUsers - totalExclusive;
  const multiToolPercent = totalUsers > 0 ? (multiToolUsers / totalUsers) * 100 : 0;

  const mostPopular = tools.reduce((prev, current) =>
    current.totalUsers > prev.totalUsers ? current : prev
  );

  const avgGrowth =
    tools.reduce((sum, tool) => sum + tool.growthPercent, 0) / (tools.length || 1);

  const totalToolAssignments = totalUsers + multiToolUsers; // Approximate
  const avgToolsPerUser = totalUsers > 0 ? totalToolAssignments / totalUsers : 0;

  return {
    totalUniqueUsers: totalUsers,
    mostPopularTool: mostPopular.name,
    mostPopularToolUsers: mostPopular.totalUsers,
    growthPercent: avgGrowth,
    multiToolPercent,
    avgToolsPerUser,
    periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

/**
 * Helper function to generate insights from data
 * This provides default insights when backend doesn't provide them
 */
export function generateInsights(data: ToolAdoptionData): ToolAdoptionData['insights'] {
  const insights: ToolAdoptionData['insights'] = [];

  // Leader insight
  insights.push({
    type: 'leader',
    message: `${data.metrics.mostPopularTool} leads with ${data.metrics.mostPopularToolUsers.toLocaleString()} users (${((data.metrics.mostPopularToolUsers / data.metrics.totalUniqueUsers) * 100).toFixed(1)}% adoption)`,
    severity: 'info',
  });

  // Growth insight
  const fastestGrowing = data.tools.reduce((prev, current) =>
    current.growthPercent > prev.growthPercent ? current : prev
  );
  if (fastestGrowing.growthPercent > 0) {
    insights.push({
      type: 'growth',
      message: `${fastestGrowing.name} has highest growth: ${fastestGrowing.growthPercent.toFixed(1)}% WoW`,
      severity: 'success',
      metric: `+${fastestGrowing.growthPercent.toFixed(1)}%`,
    });
  }

  // Multi-tool opportunity
  if (data.metrics.multiToolPercent < 40) {
    insights.push({
      type: 'opportunity',
      message: `${(100 - data.metrics.multiToolPercent).toFixed(0)}% of users use only one tool - opportunity for cross-tool adoption`,
      severity: 'info',
    });
  }

  // Low adoption warning
  const lowAdoptionTools = data.tools.filter(t => t.totalUsers < 500);
  if (lowAdoptionTools.length > 0) {
    insights.push({
      type: 'warning',
      message: `${lowAdoptionTools.length} tool${lowAdoptionTools.length > 1 ? 's' : ''} with low adoption (<500 users): ${lowAdoptionTools.map(t => t.name).join(', ')}`,
      severity: 'warning',
    });
  }

  return insights;
}

export function ToolAdoptionDashboard({
  data,
  loading = false,
  error = null,
  onRefresh,
  compactMode = false,
  showInsights = true,
}: ToolAdoptionDashboardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [toolBreakdownExpanded, setToolBreakdownExpanded] = useState(!compactMode);
  const [insightsPanelExpanded, setInsightsPanelExpanded] = useState(showInsights);

  // Auto-collapse in compact mode
  useEffect(() => {
    if (compactMode) {
      setToolBreakdownExpanded(false);
      setInsightsPanelExpanded(false);
    }
  }, [compactMode]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setToolBreakdownExpanded((prev) => !prev);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setInsightsPanelExpanded((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRefresh?.();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onRefresh]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={32} sx={{ borderRadius: 1 }} />
        {showInsights && <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />}
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRefresh && (
            <Button color="inherit" size="small" onClick={onRefresh}>
              Retry
            </Button>
          )
        }
      >
        {error.message || 'Failed to load tool adoption data'}
      </Alert>
    );
  }

  // No data state
  if (!data) {
    return (
      <Alert severity="info">
        No tool adoption data available. Data will appear here once users start using tools.
      </Alert>
    );
  }

  // Sort tools by total users (descending)
  const sortedTools = [...data.tools].sort((a, b) => b.totalUsers - a.totalUsers);

  // Generate insights if not provided
  const insights = data.insights || generateInsights(data);

  return (
    <Box
      role="region"
      aria-label="Tool Adoption Analytics Dashboard"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        width: '100%',
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: 'text.primary',
            }}
          >
            Tool Adoption Analytics
          </Typography>
          <Tooltip
            title="Metrics show unique users across all tools. Multi-tool percentage indicates users who use multiple tools."
            arrow
          >
            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
          </Tooltip>
        </Box>

        {onRefresh && (
          <Tooltip title="Refresh data (R)" arrow>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{ width: 28, height: 28 }}
              aria-label="Refresh data"
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Metrics Strip */}
      <MetricsStrip metrics={data.metrics} />

      {/* Tool Breakdown Section */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: isDark ? '#374151' : '#E5E7EB',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: isDark ? '#111827' : '#FFFFFF',
        }}
      >
        {/* Section header */}
        <Box
          onClick={() => setToolBreakdownExpanded(!toolBreakdownExpanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            cursor: 'pointer',
            bgcolor: isDark ? '#1F2937' : '#F9FAFB',
            borderBottom: toolBreakdownExpanded ? '1px solid' : 'none',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            transition: 'background-color 150ms ease',
            '&:hover': {
              bgcolor: isDark ? '#374151' : '#F3F4F6',
            },
          }}
          role="button"
          aria-expanded={toolBreakdownExpanded}
          aria-controls="tool-breakdown-content"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setToolBreakdownExpanded(!toolBreakdownExpanded);
            }
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'text.primary',
            }}
          >
            Tool Breakdown
            <Typography
              component="span"
              sx={{
                ml: 1,
                fontSize: '0.7rem',
                color: 'text.secondary',
                fontWeight: 400,
              }}
            >
              ({sortedTools.length} tools)
            </Typography>
          </Typography>

          <IconButton
            size="small"
            sx={{ width: 24, height: 24 }}
            aria-label={toolBreakdownExpanded ? 'Collapse tool breakdown' : 'Expand tool breakdown'}
          >
            {toolBreakdownExpanded ? (
              <CollapseIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>

        {/* Tool cards */}
        <Collapse in={toolBreakdownExpanded} timeout={200}>
          <Box
            id="tool-breakdown-content"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1.5,
            }}
          >
            {sortedTools.map((tool, index) => (
              <ToolCard key={tool.id} tool={tool} rank={index + 1} />
            ))}
          </Box>
        </Collapse>
      </Box>

      {/* Insights Panel */}
      {showInsights && insights && insights.length > 0 && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: isDark ? '#111827' : '#FFFFFF',
          }}
        >
          {/* Section header */}
          <Box
            onClick={() => setInsightsPanelExpanded(!insightsPanelExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              cursor: 'pointer',
              bgcolor: isDark ? '#1F2937' : '#F9FAFB',
              borderBottom: insightsPanelExpanded ? '1px solid' : 'none',
              borderColor: isDark ? '#374151' : '#E5E7EB',
              transition: 'background-color 150ms ease',
              '&:hover': {
                bgcolor: isDark ? '#374151' : '#F3F4F6',
              },
            }}
            role="button"
            aria-expanded={insightsPanelExpanded}
            aria-controls="insights-panel-content"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setInsightsPanelExpanded(!insightsPanelExpanded);
              }
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: '0.8rem',
                color: 'text.primary',
              }}
            >
              Insights
              <Typography
                component="span"
                sx={{
                  ml: 1,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  fontWeight: 400,
                }}
              >
                ({insights.length} recommendations)
              </Typography>
            </Typography>

            <IconButton
              size="small"
              sx={{ width: 24, height: 24 }}
              aria-label={insightsPanelExpanded ? 'Collapse insights' : 'Expand insights'}
            >
              {insightsPanelExpanded ? (
                <CollapseIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Box>

          <Collapse in={insightsPanelExpanded} timeout={200}>
            <Box id="insights-panel-content">
              <InsightsPanel insights={insights} maxVisible={3} />
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Last updated timestamp */}
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.65rem',
          color: 'text.secondary',
          fontStyle: 'italic',
          textAlign: 'right',
        }}
      >
        Last updated: {new Date(data.lastUpdated).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Typography>

      {/* Keyboard shortcuts hint */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.6rem',
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          Keyboard: T (toggle tools) • I (toggle insights) • R (refresh)
        </Typography>
      </Box>
    </Box>
  );
}

export default ToolAdoptionDashboard;
