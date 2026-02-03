/**
 * NodeHeader Component
 * Renders the header section of a node with icon, name, and service type
 */

import React, { memo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { AWSServiceType } from '../types';
import { NODE_CATEGORY_COLORS } from '../constants/nodeColors';
import { NodeCategory } from '../types';

export interface NodeHeaderProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  serviceType: AWSServiceType;
  category: NodeCategory;
}

export const NodeHeader = memo(function NodeHeader({
  name,
  icon,
  color,
  serviceType,
  category,
}: NodeHeaderProps) {
  const colors = NODE_CATEGORY_COLORS[category];

  return (
    <Box
      sx={{
        background: colors.gradient,
        color: 'white',
        px: 1.5,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 40,
      }}
    >
      <Tooltip title={serviceType} arrow placement="top">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 0.5,
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            '& svg': {
              fontSize: 18,
            },
          }}
        >
          {icon}
        </Box>
      </Tooltip>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {name || 'Unnamed'}
      </Typography>
    </Box>
  );
});

export default NodeHeader;
