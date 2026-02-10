/**
 * MetricsStrip Component
 * Design: UX-20260210-1430
 *
 * Compact horizontal metrics bar showing 5 key adoption KPIs.
 * Inspired by MultiProjectDashboard metrics strip.
 *
 * Height: 48px
 * Responsive: Wraps on mobile (<768px)
 * Accessibility: WCAG 2.1 AAA compliant
 */

import React from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { DashboardMetrics, METRIC_COLORS } from './types';

interface MetricsStripProps {
  metrics: DashboardMetrics;
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function TrendIcon({ value }: { value: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (value > 0) {
    return (
      <TrendingUp
        sx={{
          fontSize: 14,
          color: isDark ? METRIC_COLORS.positive.dark : METRIC_COLORS.positive.light,
        }}
      />
    );
  } else if (value < 0) {
    return (
      <TrendingDown
        sx={{
          fontSize: 14,
          color: isDark ? METRIC_COLORS.negative.dark : METRIC_COLORS.negative.light,
        }}
      />
    );
  } else {
    return (
      <TrendingFlat
        sx={{
          fontSize: 14,
          color: isDark ? '#9CA3AF' : '#6B7280',
        }}
      />
    );
  }
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const chips = [
    {
      value: formatNumber(metrics.totalUniqueUsers),
      rawValue: metrics.totalUniqueUsers,
      label: 'Total Users',
      color: isDark ? METRIC_COLORS.neutral.dark : METRIC_COLORS.neutral.light,
      tooltip: `${metrics.totalUniqueUsers.toLocaleString()} total unique users across all tools`,
      icon: null,
    },
    {
      value: formatNumber(metrics.mostPopularToolUsers),
      rawValue: metrics.mostPopularToolUsers,
      label: metrics.mostPopularTool.replace(/^(microsoft-365-copilot|github-copilot|claude-desktop|claude-code|chatgpt)$/i,
        (match) => {
          const names: Record<string, string> = {
            'microsoft-365-copilot': 'M365',
            'github-copilot': 'GitHub',
            'claude-desktop': 'Desktop',
            'claude-code': 'Code',
            'chatgpt': 'ChatGPT'
          };
          return names[match.toLowerCase()] || match;
        }
      ),
      color: isDark ? METRIC_COLORS.positive.dark : METRIC_COLORS.positive.light,
      tooltip: `${metrics.mostPopularTool} is the most popular tool with ${metrics.mostPopularToolUsers.toLocaleString()} users`,
      icon: null,
    },
    {
      value: `${metrics.growthPercent >= 0 ? '+' : ''}${metrics.growthPercent.toFixed(1)}%`,
      rawValue: metrics.growthPercent,
      label: 'Growth',
      color:
        metrics.growthPercent > 0
          ? isDark ? METRIC_COLORS.positive.dark : METRIC_COLORS.positive.light
          : metrics.growthPercent < 0
          ? isDark ? METRIC_COLORS.negative.dark : METRIC_COLORS.negative.light
          : isDark ? '#9CA3AF' : '#6B7280',
      tooltip: `${metrics.growthPercent >= 0 ? 'Growth' : 'Decline'} of ${Math.abs(metrics.growthPercent).toFixed(1)}% week-over-week`,
      icon: <TrendIcon value={metrics.growthPercent} />,
    },
    {
      value: `${metrics.multiToolPercent.toFixed(0)}%`,
      rawValue: metrics.multiToolPercent,
      label: 'Multi-Tool',
      color: isDark ? '#A78BFA' : '#8B5CF6',
      tooltip: `${metrics.multiToolPercent.toFixed(1)}% of users use multiple tools (high engagement indicator)`,
      icon: null,
    },
    {
      value: metrics.avgToolsPerUser.toFixed(1),
      rawValue: metrics.avgToolsPerUser,
      label: 'Avg Tools',
      color: isDark ? '#60A5FA' : '#3B82F6',
      tooltip: `Average ${metrics.avgToolsPerUser.toFixed(2)} tools per user (platform stickiness)`,
      icon: null,
    },
  ];

  return (
    <Box
      role="region"
      aria-label="Tool Adoption Key Metrics"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 48,
        px: 2,
        py: 1,
        bgcolor: isDark ? '#1F2937' : '#F9FAFB',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        overflow: 'hidden',
        flexWrap: 'wrap',
      }}
    >
      {chips.map((chip, index) => (
        <Tooltip
          key={chip.label}
          title={chip.tooltip}
          arrow
          placement="top"
          enterDelay={500}
        >
          <Box
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${chip.label}: ${chip.value}`}
            tabIndex={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              bgcolor: isDark ? '#111827' : '#FFFFFF',
              border: '1px solid',
              borderColor: isDark ? '#374151' : '#E5E7EB',
              minWidth: 'fit-content',
              cursor: 'help',
              transition: 'all 150ms ease',
              '&:hover': {
                transform: 'scale(1.02)',
                borderColor: chip.color,
                boxShadow: `0 0 0 1px ${chip.color}33`,
              },
              '&:focus': {
                outline: `3px solid ${chip.color}`,
                outlineOffset: '2px',
                borderColor: chip.color,
              },
              '&:focus:not(:focus-visible)': {
                outline: 'none',
              },
            }}
          >
            {chip.icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.25 }}>
                {chip.icon}
              </Box>
            )}
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontWeight: 700,
                color: chip.color,
                fontSize: '0.875rem',
                lineHeight: 1,
                fontFeatureSettings: '"tnum"', // Tabular numbers
              }}
            >
              {chip.value}
            </Typography>
            <Typography
              variant="caption"
              component="span"
              sx={{
                color: 'text.secondary',
                fontSize: '0.7rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {chip.label}
            </Typography>
          </Box>
        </Tooltip>
      ))}

      {/* Period indicator */}
      <Box
        sx={{
          ml: 'auto',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          {new Date(metrics.periodStart).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}{' '}
          -{' '}
          {new Date(metrics.periodEnd).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Typography>
      </Box>
    </Box>
  );
}

export default MetricsStrip;
