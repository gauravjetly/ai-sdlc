/**
 * ToolCard Component
 * Design: UX-20260210-1430
 *
 * Compact tool metric card with progress bar and trend indicator.
 * Height: 40px per card
 * Shows: Tool name, user count, adoption %, trend sparkline
 *
 * Accessibility: Fully keyboard navigable, screen reader friendly
 */

import React from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { ToolMetric, TOOL_COLORS, METRIC_COLORS } from './types';

interface ToolCardProps {
  tool: ToolMetric;
  rank: number;
}

function TrendSparkline({ data, color }: { data: number[]; color: string }) {
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '2px',
        height: 20,
        width: 40,
      }}
      role="img"
      aria-label={`Trend data: ${data.join(', ')}`}
    >
      {data.map((val, i) => {
        const heightPercent = ((val - minVal) / range) * 100;
        const isRecent = i >= data.length - 1;

        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: `${Math.max(heightPercent, 10)}%`,
              bgcolor: isRecent ? color : `${color}66`,
              borderRadius: '1px 1px 0 0',
              transition: 'height 300ms ease, background-color 300ms ease',
              minHeight: 2,
            }}
          />
        );
      })}
    </Box>
  );
}

export function ToolCard({ tool, rank }: ToolCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const toolColor = TOOL_COLORS[tool.id];
  const displayColor = toolColor
    ? isDark ? toolColor.dark : toolColor.light
    : isDark ? '#9CA3AF' : '#6B7280';

  const growthColor =
    tool.growthPercent > 0
      ? isDark ? METRIC_COLORS.positive.dark : METRIC_COLORS.positive.light
      : tool.growthPercent < 0
      ? isDark ? METRIC_COLORS.negative.dark : METRIC_COLORS.negative.light
      : isDark ? '#9CA3AF' : '#6B7280';

  const adoptionLevel =
    tool.totalUsers > 1500 ? 'high' : tool.totalUsers > 800 ? 'medium' : 'low';

  return (
    <Box
      role="article"
      aria-label={`${tool.name}: ${tool.totalUsers.toLocaleString()} users, ${tool.adoptionPercent.toFixed(1)}% adoption`}
      tabIndex={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        borderRadius: 1,
        bgcolor: isDark ? '#111827' : '#FFFFFF',
        border: '1px solid',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        minHeight: 40,
        transition: 'all 150ms ease',
        '&:hover': {
          bgcolor: isDark ? '#1F2937' : '#F9FAFB',
          borderColor: displayColor,
          transform: 'translateX(2px)',
        },
        '&:focus': {
          outline: `3px solid ${displayColor}`,
          outlineOffset: '2px',
          borderColor: displayColor,
        },
        '&:focus:not(:focus-visible)': {
          outline: 'none',
        },
      }}
    >
      {/* Rank badge */}
      <Tooltip title={`Rank #${rank}`} arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: `${displayColor}20`,
            border: `2px solid ${displayColor}`,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: displayColor,
              lineHeight: 1,
            }}
          >
            {rank}
          </Typography>
        </Box>
      </Tooltip>

      {/* Tool name */}
      <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: '0.8rem',
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={tool.name}
        >
          {tool.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
          }}
        >
          {tool.exclusiveUsers.toLocaleString()} exclusive
        </Typography>
      </Box>

      {/* Progress bar */}
      <Tooltip
        title={`${tool.adoptionPercent.toFixed(1)}% adoption (${tool.totalUsers.toLocaleString()} users)`}
        arrow
      >
        <Box sx={{ flex: 1, minWidth: 100, maxWidth: 200 }}>
          <Box
            sx={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              bgcolor: isDark ? '#374151' : '#E5E7EB',
              overflow: 'hidden',
              position: 'relative',
            }}
            role="progressbar"
            aria-valuenow={tool.adoptionPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${tool.adoptionPercent.toFixed(1)}% adoption`}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${Math.min(tool.adoptionPercent, 100)}%`,
                bgcolor: displayColor,
                borderRadius: 3,
                transition: 'width 500ms ease-out',
                animation: 'progressSlide 500ms ease-out',
                '@keyframes progressSlide': {
                  from: { width: 0 },
                  to: { width: `${Math.min(tool.adoptionPercent, 100)}%` },
                },
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              color: 'text.secondary',
              mt: 0.25,
              display: 'block',
            }}
          >
            {tool.totalUsers.toLocaleString()} users
          </Typography>
        </Box>
      </Tooltip>

      {/* Trend sparkline */}
      {tool.trendData && tool.trendData.length > 0 && (
        <Tooltip
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', mb: 0.5 }}>
                Last 4 weeks
              </Typography>
              {tool.trendData.map((val, i) => (
                <Typography key={i} variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                  Week {i + 1}: {val.toLocaleString()}
                </Typography>
              ))}
            </Box>
          }
          arrow
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendSparkline data={tool.trendData} color={displayColor} />
          </Box>
        </Tooltip>
      )}

      {/* Growth indicator */}
      <Tooltip
        title={`${tool.growthPercent >= 0 ? 'Growth' : 'Decline'} of ${Math.abs(tool.growthPercent).toFixed(1)}% week-over-week`}
        arrow
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            minWidth: 60,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: `${growthColor}15`,
          }}
        >
          {tool.growthPercent > 0 ? (
            <TrendingUp sx={{ fontSize: 14, color: growthColor }} />
          ) : tool.growthPercent < 0 ? (
            <TrendingDown sx={{ fontSize: 14, color: growthColor }} />
          ) : (
            <TrendingFlat sx={{ fontSize: 14, color: growthColor }} />
          )}
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: growthColor,
              lineHeight: 1,
            }}
          >
            {tool.growthPercent >= 0 ? '+' : ''}
            {tool.growthPercent.toFixed(1)}%
          </Typography>
        </Box>
      </Tooltip>

      {/* Adoption level badge */}
      <Tooltip
        title={
          adoptionLevel === 'high'
            ? 'High adoption (>1500 users)'
            : adoptionLevel === 'medium'
            ? 'Medium adoption (800-1500 users)'
            : 'Low adoption (<800 users)'
        }
        arrow
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor:
              adoptionLevel === 'high'
                ? isDark ? METRIC_COLORS.positive.dark : METRIC_COLORS.positive.light
                : adoptionLevel === 'medium'
                ? isDark ? METRIC_COLORS.neutral.dark : METRIC_COLORS.neutral.light
                : isDark ? '#6B7280' : '#9CA3AF',
            flexShrink: 0,
          }}
          role="img"
          aria-label={`Adoption level: ${adoptionLevel}`}
        />
      </Tooltip>
    </Box>
  );
}

export default ToolCard;
