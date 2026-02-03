/**
 * BaseNode Component
 * Base component for all custom node types in the Visual Designer
 */

import React, { memo, ReactNode } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Box, Typography, Chip, Paper } from '@mui/material';
import {
  CheckCircle as DeployedIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import { LayerType } from '../../../contexts/DesignWizardContext';

// Layer colors
export const LAYER_COLORS: Record<LayerType | 'fullstack', string> = {
  network: '#2196F3',
  platform: '#4CAF50',
  devops: '#FF9800',
  fullstack: '#9C27B0',
};

// Status icons
const STATUS_ICONS: Record<string, ReactNode> = {
  deployed: <DeployedIcon sx={{ fontSize: 14, color: 'success.main' }} />,
  error: <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />,
  pending: <PendingIcon sx={{ fontSize: 14, color: 'text.secondary' }} />,
};

export interface BaseNodeData {
  label: string;
  layer?: LayerType;
  status?: 'pending' | 'deployed' | 'error';
  config?: Record<string, any>;
  connectionCount?: {
    inputs: number;
    outputs: number;
  };
}

export interface BaseNodeProps extends NodeProps<BaseNodeData> {
  icon: ReactNode;
  serviceName: string;
  color?: string;
  handles?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
}

/**
 * Base node component with consistent styling
 */
function BaseNodeComponent({
  id,
  data,
  selected,
  icon,
  serviceName,
  color,
  handles = { top: true, right: true, bottom: true, left: true },
}: BaseNodeProps) {
  const layer = data.layer || 'platform';
  const layerColor = color || LAYER_COLORS[layer];
  const status = data.status || 'pending';

  return (
    <Paper
      elevation={selected ? 4 : 1}
      sx={{
        minWidth: 180,
        maxWidth: 220,
        borderRadius: 2,
        overflow: 'hidden',
        border: selected ? `2px solid ${layerColor}` : '1px solid #e0e0e0',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          bgcolor: layerColor,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {STATUS_ICONS[status]}
          <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 18 }}>
            {icon}
          </Box>
        </Box>
        <Chip
          label={layer}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            textTransform: 'capitalize',
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ p: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.label}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block' }}
        >
          {serviceName}
        </Typography>
      </Box>

      {/* Footer with connection info */}
      {data.connectionCount && (
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            bgcolor: 'grey.50',
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            In: {data.connectionCount.inputs}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Out: {data.connectionCount.outputs}
          </Typography>
        </Box>
      )}

      {/* Handles */}
      {handles.top && (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{
            background: layerColor,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />
      )}
      {handles.right && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{
            background: layerColor,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />
      )}
      {handles.bottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{
            background: layerColor,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />
      )}
      {handles.left && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{
            background: layerColor,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />
      )}
    </Paper>
  );
}

export const BaseNode = memo(BaseNodeComponent);

export default BaseNode;
