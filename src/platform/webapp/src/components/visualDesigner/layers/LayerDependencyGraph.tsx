/**
 * LayerDependencyGraph Component
 * Visual representation of layer dependencies with status indicators
 */

import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Tooltip, useTheme, alpha } from '@mui/material';
import {
  CloudQueue as NetworkIcon,
  Storage as PlatformIcon,
  Speed as DevOpsIcon,
  CheckCircle as DeployedIcon,
  Schedule as CompleteIcon,
  Error as FailedIcon,
  RadioButtonUnchecked as PendingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useDesignWizard } from '../../../contexts/DesignWizardContext';
import {
  LayerType,
  LayerStatus,
  LAYER_CONFIG,
  STATUS_COLORS,
  LAYER_ORDER,
} from '../../../types/layers';

interface LayerDependencyGraphProps {
  /** Handler for node click */
  onNodeClick?: (layer: LayerType) => void;
  /** Whether to show animations */
  animated?: boolean;
  /** Graph orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Size preset */
  size?: 'small' | 'medium' | 'large';
  /** Currently deploying layer */
  deployingLayer?: LayerType;
}

interface GraphNodeProps {
  layer: LayerType;
  status: LayerStatus;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  isDeploying: boolean;
  onClick?: () => void;
  hasWarning?: boolean;
}

interface GraphEdgeProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  sourceStatus: LayerStatus;
  targetStatus: LayerStatus;
  orientation: 'horizontal' | 'vertical';
  animated: boolean;
  hasWarning?: boolean;
}

// Size configurations
const SIZE_CONFIG = {
  small: { nodeRadius: 24, iconSize: 16, fontSize: 10, width: 280, height: 80 },
  medium: { nodeRadius: 36, iconSize: 24, fontSize: 12, width: 420, height: 120 },
  large: { nodeRadius: 48, iconSize: 32, fontSize: 14, width: 560, height: 160 },
};

/**
 * SVG Graph Node component
 */
function GraphNode({
  layer,
  status,
  x,
  y,
  size,
  isDeploying,
  onClick,
  hasWarning,
}: GraphNodeProps) {
  const theme = useTheme();
  const config = LAYER_CONFIG[layer];
  const sizeConfig = SIZE_CONFIG[size];

  const getStatusIcon = () => {
    switch (status) {
      case 'deployed':
        return <DeployedIcon sx={{ fontSize: sizeConfig.iconSize }} />;
      case 'complete':
        return <CompleteIcon sx={{ fontSize: sizeConfig.iconSize }} />;
      case 'failed':
        return <FailedIcon sx={{ fontSize: sizeConfig.iconSize }} />;
      default:
        return <PendingIcon sx={{ fontSize: sizeConfig.iconSize }} />;
    }
  };

  const getLayerIcon = () => {
    switch (layer) {
      case 'network':
        return <NetworkIcon sx={{ fontSize: sizeConfig.iconSize * 0.8 }} />;
      case 'platform':
        return <PlatformIcon sx={{ fontSize: sizeConfig.iconSize * 0.8 }} />;
      case 'devops':
        return <DevOpsIcon sx={{ fontSize: sizeConfig.iconSize * 0.8 }} />;
      default:
        return null;
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Deploying animation ring */}
      {isDeploying && (
        <circle
          r={sizeConfig.nodeRadius + 6}
          fill="none"
          stroke={config.color}
          strokeWidth={2}
          opacity={0.5}
        >
          <animate
            attributeName="r"
            values={`${sizeConfig.nodeRadius + 4};${sizeConfig.nodeRadius + 12};${sizeConfig.nodeRadius + 4}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.2;0.5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Main node circle */}
      <circle
        r={sizeConfig.nodeRadius}
        fill={alpha(config.color, 0.15)}
        stroke={STATUS_COLORS[status]}
        strokeWidth={3}
      />

      {/* Layer icon (centered) */}
      <foreignObject
        x={-sizeConfig.iconSize / 2}
        y={-sizeConfig.iconSize / 2 - 4}
        width={sizeConfig.iconSize}
        height={sizeConfig.iconSize}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
          }}
        >
          {getLayerIcon()}
        </Box>
      </foreignObject>

      {/* Status icon (bottom right) */}
      <foreignObject
        x={sizeConfig.nodeRadius * 0.4}
        y={sizeConfig.nodeRadius * 0.3}
        width={sizeConfig.iconSize}
        height={sizeConfig.iconSize}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: STATUS_COLORS[status],
            bgcolor: 'background.paper',
            borderRadius: '50%',
            width: sizeConfig.iconSize,
            height: sizeConfig.iconSize,
          }}
        >
          {getStatusIcon()}
        </Box>
      </foreignObject>

      {/* Warning indicator */}
      {hasWarning && (
        <foreignObject
          x={-sizeConfig.nodeRadius - 4}
          y={-sizeConfig.nodeRadius - 4}
          width={sizeConfig.iconSize}
          height={sizeConfig.iconSize}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF9800',
            }}
          >
            <WarningIcon sx={{ fontSize: sizeConfig.iconSize * 0.7 }} />
          </Box>
        </foreignObject>
      )}

      {/* Label */}
      <text
        y={sizeConfig.nodeRadius + sizeConfig.fontSize + 4}
        textAnchor="middle"
        fontSize={sizeConfig.fontSize}
        fontWeight={500}
        fill={theme.palette.text.primary}
      >
        {config.title.replace(' Layer', '')}
      </text>
    </g>
  );
}

/**
 * SVG Graph Edge component
 */
function GraphEdge({
  fromX,
  fromY,
  toX,
  toY,
  sourceStatus,
  targetStatus,
  orientation,
  animated,
  hasWarning,
}: GraphEdgeProps) {
  const isActive = sourceStatus === 'deployed' || sourceStatus === 'complete';
  const strokeColor = isActive ? '#4CAF50' : '#9E9E9E';
  const strokeWidth = isActive ? 2 : 1.5;

  // Calculate path for curved arrow
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  const path =
    orientation === 'horizontal'
      ? `M ${fromX} ${fromY} L ${toX} ${toY}`
      : `M ${fromX} ${fromY} L ${toX} ${toY}`;

  // Arrow head
  const arrowSize = 6;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowX1 = toX - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrowY1 = toY - arrowSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = toX - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = toY - arrowSize * Math.sin(angle + Math.PI / 6);

  return (
    <g>
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={hasWarning ? '#FF9800' : strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isActive ? 'none' : '4 4'}
        opacity={isActive ? 1 : 0.5}
      />

      {/* Animated flow indicator */}
      {animated && isActive && (
        <circle r={3} fill={strokeColor}>
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href={`#path-${fromX}-${toX}`} />
          </animateMotion>
        </circle>
      )}

      {/* Arrow head */}
      <polygon
        points={`${toX},${toY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={hasWarning ? '#FF9800' : strokeColor}
        opacity={isActive ? 1 : 0.5}
      />

      {/* Warning icon on edge */}
      {hasWarning && (
        <foreignObject
          x={midX - 8}
          y={midY - 8}
          width={16}
          height={16}
        >
          <Tooltip title="Validation warning on dependency">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF9800',
                bgcolor: 'background.paper',
                borderRadius: '50%',
                width: 16,
                height: 16,
              }}
            >
              <WarningIcon sx={{ fontSize: 12 }} />
            </Box>
          </Tooltip>
        </foreignObject>
      )}
    </g>
  );
}

/**
 * LayerDependencyGraph main component
 */
export function LayerDependencyGraph({
  onNodeClick,
  animated = true,
  orientation = 'horizontal',
  size = 'medium',
  deployingLayer,
}: LayerDependencyGraphProps) {
  const { layers, validationErrors } = useDesignWizard();
  const sizeConfig = SIZE_CONFIG[size];

  // Calculate node positions
  const nodePositions = useMemo(() => {
    const padding = sizeConfig.nodeRadius + 20;

    if (orientation === 'horizontal') {
      const spacing = (sizeConfig.width - padding * 2) / (LAYER_ORDER.length - 1);
      return LAYER_ORDER.map((layer, index) => ({
        layer,
        x: padding + index * spacing,
        y: sizeConfig.height / 2,
      }));
    } else {
      const spacing = (sizeConfig.height - padding * 2) / (LAYER_ORDER.length - 1);
      return LAYER_ORDER.map((layer, index) => ({
        layer,
        x: sizeConfig.width / 2,
        y: padding + index * spacing,
      }));
    }
  }, [orientation, size, sizeConfig]);

  // Calculate edges
  const edges = useMemo(() => {
    const result = [];
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const from = nodePositions[i];
      const to = nodePositions[i + 1];

      // Calculate edge start/end points (on node perimeter)
      let fromX, fromY, toX, toY;
      if (orientation === 'horizontal') {
        fromX = from.x + sizeConfig.nodeRadius;
        fromY = from.y;
        toX = to.x - sizeConfig.nodeRadius;
        toY = to.y;
      } else {
        fromX = from.x;
        fromY = from.y + sizeConfig.nodeRadius;
        toX = to.x;
        toY = to.y - sizeConfig.nodeRadius;
      }

      result.push({
        from: from.layer,
        to: to.layer,
        fromX,
        fromY,
        toX,
        toY,
      });
    }
    return result;
  }, [nodePositions, orientation, sizeConfig.nodeRadius]);

  // Check for validation warnings
  const getLayerWarning = useCallback(
    (layer: LayerType): boolean => {
      return validationErrors.some(
        (error) => error.path?.startsWith(layer) && error.severity === 'warning'
      );
    },
    [validationErrors]
  );

  const getEdgeWarning = useCallback(
    (from: LayerType, to: LayerType): boolean => {
      // Check if there are cross-layer validation issues
      return validationErrors.some(
        (error) =>
          (error.path?.startsWith(from) || error.path?.startsWith(to)) &&
          error.severity === 'error'
      );
    },
    [validationErrors]
  );

  return (
    <Box
      sx={{
        width: sizeConfig.width,
        height: sizeConfig.height + 30, // Extra space for labels
        position: 'relative',
      }}
    >
      <svg
        width={sizeConfig.width}
        height={sizeConfig.height + 30}
        viewBox={`0 0 ${sizeConfig.width} ${sizeConfig.height + 30}`}
      >
        {/* Render edges first (behind nodes) */}
        {edges.map(({ from, to, fromX, fromY, toX, toY }) => (
          <GraphEdge
            key={`${from}-${to}`}
            fromX={fromX}
            fromY={fromY}
            toX={toX}
            toY={toY}
            sourceStatus={layers[from]?.status || 'pending'}
            targetStatus={layers[to]?.status || 'pending'}
            orientation={orientation}
            animated={animated && deployingLayer === to}
            hasWarning={getEdgeWarning(from, to)}
          />
        ))}

        {/* Render nodes */}
        {nodePositions.map(({ layer, x, y }) => (
          <GraphNode
            key={layer}
            layer={layer}
            status={layers[layer]?.status || 'pending'}
            x={x}
            y={y}
            size={size}
            isDeploying={deployingLayer === layer}
            onClick={onNodeClick ? () => onNodeClick(layer) : undefined}
            hasWarning={getLayerWarning(layer)}
          />
        ))}
      </svg>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          mt: 1,
          fontSize: '0.7rem',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS.pending }} />
          <Typography variant="caption">Pending</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS.complete }} />
          <Typography variant="caption">Complete</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS.deployed }} />
          <Typography variant="caption">Deployed</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS.failed }} />
          <Typography variant="caption">Failed</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default LayerDependencyGraph;
