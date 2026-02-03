/**
 * NodeStatusBadge Component
 * Displays the configuration status of a node
 */

import React, { memo } from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as ConfiguredIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  RadioButtonUnchecked as UnconfiguredIcon,
  CloudDone as DeployedIcon,
} from '@mui/icons-material';
import { NodeStatus } from '../types';
import { NODE_STATUS_COLORS } from '../constants/nodeColors';

export interface NodeStatusBadgeProps {
  status: NodeStatus;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<NodeStatus, {
  label: string;
  icon: React.ReactNode;
  tooltip: string;
}> = {
  unconfigured: {
    label: 'Configure',
    icon: <UnconfiguredIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Node needs configuration',
  },
  configured: {
    label: 'Ready',
    icon: <ConfiguredIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Node is configured and ready',
  },
  warning: {
    label: 'Warning',
    icon: <WarningIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Node has validation warnings',
  },
  error: {
    label: 'Error',
    icon: <ErrorIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Node has configuration errors',
  },
  deployed: {
    label: 'Deployed',
    icon: <DeployedIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Node is deployed',
  },
};

export const NodeStatusBadge = memo(function NodeStatusBadge({
  status,
  size = 'small',
}: NodeStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const colors = NODE_STATUS_COLORS[status];

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 10,
      }}
    >
      <Tooltip title={config.tooltip} arrow placement="top">
        <Chip
          size={size}
          icon={config.icon as React.ReactElement}
          label={config.label}
          sx={{
            height: size === 'small' ? 20 : 24,
            fontSize: size === 'small' ? '0.675rem' : '0.75rem',
            bgcolor: colors.background,
            color: colors.color,
            '& .MuiChip-icon': {
              color: colors.color,
              ml: 0.5,
            },
            '& .MuiChip-label': {
              px: 0.75,
            },
          }}
        />
      </Tooltip>
    </Box>
  );
});

export default NodeStatusBadge;
