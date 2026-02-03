/**
 * NodeCostBadge Component
 * Displays the estimated monthly cost of a node
 */

import React, { memo } from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';

export interface NodeCostBadgeProps {
  cost: number;
  currency?: string;
}

/**
 * Format cost with appropriate precision
 */
function formatCost(cost: number): string {
  if (cost >= 1000) {
    return `$${(cost / 1000).toFixed(1)}k`;
  }
  if (cost >= 100) {
    return `$${Math.round(cost)}`;
  }
  if (cost >= 10) {
    return `$${cost.toFixed(1)}`;
  }
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  }
  if (cost > 0) {
    return `$${cost.toFixed(3)}`;
  }
  return '$0';
}

/**
 * Get color based on cost tier
 */
function getCostColor(cost: number): string {
  if (cost >= 500) return '#E53935'; // High cost - red
  if (cost >= 100) return '#FB8C00'; // Medium cost - orange
  if (cost >= 10) return '#FFC107'; // Low-medium cost - amber
  return '#43A047'; // Low cost - green
}

export const NodeCostBadge = memo(function NodeCostBadge({
  cost,
  currency = 'USD',
}: NodeCostBadgeProps) {
  const formattedCost = formatCost(cost);
  const color = getCostColor(cost);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 4,
        right: 4,
        zIndex: 10,
      }}
    >
      <Tooltip
        title={
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Estimated Monthly Cost
            </Typography>
            <Typography variant="body2">
              ${cost.toFixed(2)} {currency}/month
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Actual costs may vary
            </Typography>
          </Box>
        }
        arrow
        placement="top"
      >
        <Chip
          size="small"
          icon={<MoneyIcon sx={{ fontSize: 14 }} />}
          label={`${formattedCost}/mo`}
          sx={{
            height: 20,
            fontSize: '0.675rem',
            bgcolor: `${color}15`,
            color: color,
            border: `1px solid ${color}40`,
            '& .MuiChip-icon': {
              color: color,
              ml: 0.5,
            },
            '& .MuiChip-label': {
              px: 0.5,
            },
          }}
        />
      </Tooltip>
    </Box>
  );
});

export default NodeCostBadge;
